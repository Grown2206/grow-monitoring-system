import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { nutrientsAPI, api } from '../utils/api';
import {
  BIOBIZZ_PRODUCTS, BIOBIZZ_SCHEDULE, GROWTH_PHASES, BIOBIZZ_RULES,
  calculateGrowWeek, getPhaseForWeek, getScheduleForWeek, calculateDosage
} from '../constants/biobizz';

const INVENTORY_KEY = 'biobizz-inventory';

function loadInventory() {
  try {
    const saved = localStorage.getItem(INVENTORY_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) { /* ignore */ }
  // Default: alle Produkte mit leerer Flasche
  const inv = {};
  BIOBIZZ_PRODUCTS.forEach(p => {
    inv[p.id] = { owned: false, bottleSize: 1000, currentMl: 0 };
  });
  return inv;
}

export default function useNutrientData() {
  const { nutrientSensors, nutrientStatus, sensorData } = useSocket();

  // ── State ──
  const [plants, setPlants] = useState([]);
  const [reservoir, setReservoir] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState(loadInventory);
  const [loading, setLoading] = useState({
    initial: true, reservoir: false, logs: false, stats: false
  });

  const refreshTimer = useRef(null);

  // ── Inventar persistieren ──
  const updateInventory = useCallback((newInventory) => {
    setInventory(newInventory);
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(newInventory));
  }, []);

  const updateProductInventory = useCallback((productId, updates) => {
    setInventory(prev => {
      const next = { ...prev, [productId]: { ...prev[productId], ...updates } };
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // ── Daten laden ──
  const loadData = useCallback(async () => {
    try {
      const [plantsRes, resData, schedData] = await Promise.all([
        api.getPlants().catch(() => []),
        nutrientsAPI.getReservoir().catch(() => null),
        nutrientsAPI.getSchedules().catch(() => ({ data: [] }))
      ]);

      const plantsArray = Array.isArray(plantsRes) ? plantsRes : (plantsRes?.data || []);
      setPlants(plantsArray);
      setReservoir(resData?.data || resData);
      const schedsArray = Array.isArray(schedData) ? schedData : (schedData?.data || []);
      setSchedules(schedsArray);
    } catch (e) {
      console.error('Nutrient data load error:', e);
    } finally {
      setLoading(l => ({ ...l, initial: false }));
    }
  }, []);

  const loadLogs = useCallback(async (params = { limit: 50 }) => {
    setLoading(l => ({ ...l, logs: true }));
    try {
      const res = await nutrientsAPI.getLogs(params);
      const logsArray = Array.isArray(res) ? res : (res?.data || []);
      setLogs(logsArray);
    } catch (e) {
      console.error('Logs load error:', e);
    } finally {
      setLoading(l => ({ ...l, logs: false }));
    }
  }, []);

  const loadStats = useCallback(async (startDate, endDate) => {
    setLoading(l => ({ ...l, stats: true }));
    try {
      const res = await nutrientsAPI.getStats(startDate, endDate);
      setStats(res?.data || res);
    } catch (e) {
      console.error('Stats load error:', e);
    } finally {
      setLoading(l => ({ ...l, stats: false }));
    }
  }, []);

  // Initial load + refresh
  useEffect(() => {
    loadData();
    refreshTimer.current = setInterval(loadData, 60000);
    return () => clearInterval(refreshTimer.current);
  }, [loadData]);

  // ── Auto-Detect Grow-Woche ──
  const activePlants = useMemo(() =>
    plants.filter(p => p.stage && p.stage !== 'Leer' && p.stage !== 'Geerntet'),
    [plants]
  );

  const currentWeek = useMemo(() => {
    if (activePlants.length === 0) return 1;
    // alteste Pflanze bestimmt die Woche
    const dates = activePlants
      .map(p => p.plantedDate)
      .filter(Boolean)
      .map(d => new Date(d));
    if (dates.length === 0) return 1;
    const earliest = new Date(Math.min(...dates));
    const week = calculateGrowWeek(earliest);
    return Math.min(week, 16);
  }, [activePlants]);

  const currentPhase = useMemo(() => getPhaseForWeek(currentWeek), [currentWeek]);

  const currentSchedule = useMemo(() => getScheduleForWeek(currentWeek), [currentWeek]);

  // ── Live Sensor Werte ──
  const currentEC = nutrientSensors?.ec || reservoir?.main?.ec || 0;
  const currentPH = nutrientSensors?.ph || reservoir?.main?.ph || 0;
  const currentTemp = nutrientSensors?.temp || reservoir?.main?.temp || 0;
  const currentTankLevel = nutrientSensors?.reservoirLevel_percent ||
    (sensorData?.tankLevel ? Math.round(sensorData.tankLevel / 40.95) : 0);
  const avgSoilMoisture = useMemo(() => {
    const soils = sensorData?.soil || [];
    const valid = soils.filter(v => v > 0);
    return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
  }, [sensorData?.soil]);

  // ── Status-Helfer ──
  const getECStatus = useCallback(() => {
    if (!currentEC) return 'unknown';
    const target = currentSchedule?.ecTarget;
    if (target) {
      if (currentEC < target.min * 0.7) return 'low';
      if (currentEC > target.max * 1.3) return 'high';
    }
    if (currentEC < 0.4) return 'low';
    if (currentEC > 2.8) return 'high';
    return 'ok';
  }, [currentEC, currentSchedule]);

  const getPHStatus = useCallback(() => {
    if (!currentPH) return 'unknown';
    if (currentPH < BIOBIZZ_RULES.phTarget.min - 0.3) return 'low';
    if (currentPH > BIOBIZZ_RULES.phTarget.max + 0.3) return 'high';
    if (currentPH < BIOBIZZ_RULES.phTarget.min) return 'warning-low';
    if (currentPH > BIOBIZZ_RULES.phTarget.max) return 'warning-high';
    return 'ok';
  }, [currentPH]);

  // ── Empfehlungen ──
  const recommendations = useMemo(() => {
    const recs = [];
    const ecStatus = getECStatus();
    const phStatus = getPHStatus();

    // EC Probleme
    if (ecStatus === 'high') {
      recs.push({
        id: 'ec-high', priority: 'critical', type: 'ec',
        title: 'EC-Wert zu hoch',
        message: `EC ${currentEC.toFixed(2)} mS/cm liegt uber dem Zielbereich. Flush oder Verdunnung empfohlen.`,
        action: 'flush'
      });
    } else if (ecStatus === 'low') {
      recs.push({
        id: 'ec-low', priority: 'warning', type: 'ec',
        title: 'EC-Wert zu niedrig',
        message: `EC ${currentEC.toFixed(2)} mS/cm liegt unter dem Zielbereich. Dungung erhohen.`,
        action: 'feed'
      });
    }

    // pH Probleme
    if (phStatus === 'low' || phStatus === 'warning-low') {
      recs.push({
        id: 'ph-low', priority: phStatus === 'low' ? 'critical' : 'warning', type: 'ph',
        title: 'pH-Wert zu niedrig',
        message: `pH ${currentPH.toFixed(1)} - Zielbereich ist ${BIOBIZZ_RULES.phTarget.min}-${BIOBIZZ_RULES.phTarget.max}. pH-Up verwenden.`,
        action: 'ph-correct'
      });
    } else if (phStatus === 'high' || phStatus === 'warning-high') {
      recs.push({
        id: 'ph-high', priority: phStatus === 'high' ? 'critical' : 'warning', type: 'ph',
        title: 'pH-Wert zu hoch',
        message: `pH ${currentPH.toFixed(1)} - Zielbereich ist ${BIOBIZZ_RULES.phTarget.min}-${BIOBIZZ_RULES.phTarget.max}. pH-Down verwenden.`,
        action: 'ph-correct'
      });
    }

    // Flush-Warnung
    const hasHarvestSoon = activePlants.some(p => {
      if (!p.harvestDate) return false;
      const daysToHarvest = (new Date(p.harvestDate) - new Date()) / (1000 * 60 * 60 * 24);
      return daysToHarvest > 0 && daysToHarvest <= 14;
    });
    if (hasHarvestSoon && currentWeek < 15) {
      recs.push({
        id: 'flush-soon', priority: 'warning', type: 'phase',
        title: 'Flush bald starten',
        message: 'Ernte in weniger als 2 Wochen. Flush-Phase (nur Wasser) starten.',
        action: 'flush'
      });
    }

    // Tank Level
    if (currentTankLevel > 0 && currentTankLevel < 20) {
      recs.push({
        id: 'tank-low', priority: 'warning', type: 'tank',
        title: 'Tank fast leer',
        message: `Tank-Fullstand nur ${currentTankLevel}%. Bitte auffullen.`,
        action: 'refill'
      });
    }

    // Bodenfeuchtigkeit
    if (avgSoilMoisture > 0 && avgSoilMoisture < 30) {
      recs.push({
        id: 'soil-dry', priority: 'info', type: 'soil',
        title: 'Boden trocken',
        message: `Durchschnittliche Bodenfeuchtigkeit bei ${avgSoilMoisture}%. Bewasserung empfohlen.`,
        action: 'water'
      });
    }

    // Inventar niedrig
    const weekProducts = currentSchedule?.products || {};
    Object.entries(weekProducts).forEach(([prodId, ml]) => {
      if (ml && inventory[prodId]) {
        const inv = inventory[prodId];
        if (inv.owned && inv.currentMl < inv.bottleSize * 0.2) {
          const product = BIOBIZZ_PRODUCTS.find(p => p.id === prodId);
          recs.push({
            id: `inv-low-${prodId}`, priority: 'info', type: 'inventory',
            title: `${product?.name || prodId} fast leer`,
            message: `Nur noch ${inv.currentMl}ml ubrig. Nachbestellen empfohlen.`,
            action: 'restock'
          });
        }
      }
    });

    // Sortiere nach Prioritat
    const order = { critical: 0, warning: 1, info: 2 };
    return recs.sort((a, b) => (order[a.priority] || 2) - (order[b.priority] || 2));
  }, [getECStatus, getPHStatus, currentEC, currentPH, currentTankLevel, avgSoilMoisture, activePlants, currentWeek, currentSchedule, inventory]);

  // ── Aktionen ──
  const handleManualDose = useCallback(async (waterVolume, mlPerLiter, notes) => {
    try {
      const res = await nutrientsAPI.manualDose(waterVolume, mlPerLiter, notes);
      await loadData();
      return { success: true, data: res };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, [loadData]);

  const handleBioBizzDose = useCallback(async (doseData) => {
    try {
      const res = await nutrientsAPI.doseWithBioBizz(doseData);
      await loadData();
      return { success: true, data: res };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, [loadData]);

  const handleToggleSchedule = useCallback(async (id) => {
    try {
      await nutrientsAPI.toggleSchedule(id);
      await loadData();
    } catch (e) {
      console.error('Toggle error:', e);
    }
  }, [loadData]);

  return {
    // Sensor-Daten
    sensors: {
      ec: currentEC,
      ph: currentPH,
      temp: currentTemp,
      tankLevel: currentTankLevel,
      soilMoisture: avgSoilMoisture,
      soilSlots: sensorData?.soil || [],
      pumpRunning: nutrientStatus?.pumpRunning || false,
      pumpProgress: nutrientStatus?.progress_percent || 0,
      pumpElapsed: nutrientStatus?.elapsed_ms || 0
    },

    // Pflanzen-Kontext
    plants: activePlants,
    allPlants: plants,
    currentWeek,
    currentPhase,
    currentSchedule,

    // Backend-Daten
    schedules,
    reservoir,
    logs,
    stats,
    loading,

    // BioBizz
    inventory,
    updateInventory,
    updateProductInventory,
    recommendations,
    calculateDosage,

    // Aktionen
    loadData,
    loadLogs,
    loadStats,
    handleManualDose,
    handleBioBizzDose,
    handleToggleSchedule,

    // Status-Helfer
    getECStatus,
    getPHStatus
  };
}
