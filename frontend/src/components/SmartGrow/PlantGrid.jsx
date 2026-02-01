import { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import { useSocket } from '../../context/SocketContext';
import { calculateVPD } from '../../utils/growMath';
import { api } from '../../utils/api';
import toast from '../../utils/toast';
import DigitalTwin from './DigitalTwin';
import {
  Settings, Edit, Trash2, Plus, ChevronDown, ChevronUp,
  Activity, TrendingUp, AlertTriangle, Info, RefreshCw, Link2,
  Loader2, Save, Database
} from 'lucide-react';

// Kalibrierung für kapazitive Bodenfeuchtesensoren
// Typische Werte: trocken ~3500, nass ~1500 (invertiert!)
const SOIL_MOISTURE_CALIBRATION = {
  dry: 3500,   // Sensorwert wenn trocken (Luft)
  wet: 1500,   // Sensorwert wenn nass (Wasser)
};

// Konvertiere Rohwert zu Prozent (0-100%)
const calibrateSoilMoisture = (rawValue) => {
  if (rawValue === undefined || rawValue === null) return null;

  // Wenn der Wert bereits kalibriert ist (zwischen 0-100)
  if (rawValue >= 0 && rawValue <= 100) {
    return rawValue;
  }

  // Kalibriere Rohwert (invertiert: höherer Wert = trockener)
  const { dry, wet } = SOIL_MOISTURE_CALIBRATION;
  const percent = ((dry - rawValue) / (dry - wet)) * 100;

  // Begrenzen auf 0-100%
  return Math.max(0, Math.min(100, Math.round(percent)));
};

function PlantGrid() {
  const { currentTheme } = useTheme();
  const theme = currentTheme;
  const { sensorData } = useSocket();
  const [plants, setPlants] = useState([]);
  const [expandedPlant, setExpandedPlant] = useState(null);
  const [syncedWithDB, setSyncedWithDB] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(null); // plant id being saved

  // Lade Pflanzen aus der Datenbank
  const loadPlantsFromDB = async (showToast = false) => {
    if (showToast) setSyncing(true);
    setLoading(true);

    try {
      const dbPlants = await api.getPlants();

      // Konvertiere DB-Pflanzen in das PlantGrid-Format
      const mappedPlants = dbPlants.filter(p => p.stage !== 'Leer').map((p, idx) => {
        // Position mapping basierend auf slotId
        const positions = ['bottom', 'bottom', 'bottom', 'middle', 'middle', 'top'];
        const zones = ['left', 'center', 'right', 'left', 'right', 'center'];

        // Konvertiere Stage zu growthStage
        const stageMap = {
          'Keimling': 'seedling',
          'Vegetation': 'vegetative',
          'Blüte': 'flowering',
          'Ernte': 'harvest',
          'Geerntet': 'harvest'
        };

        return {
          id: p._id || p.slotId,
          slotIndex: (p.slotId || idx + 1) - 1,
          name: p.name || `Pflanze ${p.slotId || idx + 1}`,
          position: positions[(p.slotId || idx + 1) - 1] || 'middle',
          zone: zones[(p.slotId || idx + 1) - 1] || 'center',
          growthStage: stageMap[p.stage] || 'vegetative',
          strain: p.strain || 'Unbekannt',
          plantedDate: p.plantedDate || new Date().toISOString(),
          healthScore: 85,
          notes: p.notes || '',
          dbId: p._id // Referenz zur DB-ID
        };
      });

      if (mappedPlants.length > 0) {
        setPlants(mappedPlants);
        setSyncedWithDB(true);
        localStorage.setItem('digital-twin-plants', JSON.stringify(mappedPlants));
        if (showToast) toast.success(`${mappedPlants.length} Pflanzen synchronisiert`);
      } else {
        // Fallback auf localStorage oder Default-Pflanzen
        loadFallbackPlants();
        if (showToast) toast.info('Keine Pflanzen in DB - Lokale Daten geladen');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Pflanzen aus DB:', error);
      loadFallbackPlants();
      if (showToast) toast.error('DB-Sync fehlgeschlagen - Lokale Daten geladen');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  // Fallback: Lokale Pflanzen laden
  const loadFallbackPlants = () => {
    const savedPlants = localStorage.getItem('digital-twin-plants');
    if (savedPlants) {
      setPlants(JSON.parse(savedPlants));
      setSyncedWithDB(false);
    } else {
      // Standard 6 Pflanzen erstellen
      const defaultPlants = [
        {
          id: 1,
          slotIndex: 0,
          name: 'Pflanze 1 (Unten Links)',
          position: 'bottom',
          zone: 'left',
          growthStage: 'vegetative',
          strain: 'Northern Lights',
          plantedDate: new Date().toISOString(),
          healthScore: 85,
          notes: ''
        },
        {
          id: 2,
          slotIndex: 1,
          name: 'Pflanze 2 (Unten Mitte)',
          position: 'bottom',
          zone: 'center',
          growthStage: 'vegetative',
          strain: 'Blue Dream',
          plantedDate: new Date().toISOString(),
          healthScore: 85,
          notes: ''
        },
        {
          id: 3,
          slotIndex: 2,
          name: 'Pflanze 3 (Unten Rechts)',
          position: 'bottom',
          zone: 'right',
          growthStage: 'flowering',
          strain: 'OG Kush',
          plantedDate: new Date().toISOString(),
          healthScore: 85,
          notes: ''
        },
        {
          id: 4,
          slotIndex: 3,
          name: 'Pflanze 4 (Mitte Links)',
          position: 'middle',
          zone: 'left',
          growthStage: 'vegetative',
          strain: 'White Widow',
          plantedDate: new Date().toISOString(),
          healthScore: 85,
          notes: ''
        },
        {
          id: 5,
          slotIndex: 4,
          name: 'Pflanze 5 (Mitte Rechts)',
          position: 'middle',
          zone: 'right',
          growthStage: 'seedling',
          strain: 'Amnesia Haze',
          plantedDate: new Date().toISOString(),
          healthScore: 85,
          notes: ''
        },
        {
          id: 6,
          slotIndex: 5,
          name: 'Pflanze 6 (Oben Mitte)',
          position: 'top',
          zone: 'center',
          growthStage: 'flowering',
          strain: 'Gorilla Glue',
          plantedDate: new Date().toISOString(),
          healthScore: 85,
          notes: ''
        }
      ];
      setPlants(defaultPlants);
      localStorage.setItem('digital-twin-plants', JSON.stringify(defaultPlants));
    }
  };

  // Initialisiere: Versuche zuerst DB, dann Fallback
  useEffect(() => {
    loadPlantsFromDB();
  }, []);

  // Speichere Pflanzen bei Änderungen
  useEffect(() => {
    if (plants.length > 0) {
      localStorage.setItem('digital-twin-plants', JSON.stringify(plants));
    }
  }, [plants]);

  // Hole Sensordaten für eine spezifische Pflanze basierend auf Position
  const getPlantSensorData = (plant) => {
    if (!sensorData) return { temp: 24, humidity: 50, soilTemp: 22, light: 0 };

    let temp, humidity;

    // Wähle Sensor basierend auf Position
    switch (plant.position) {
      case 'bottom':
        temp = sensorData.temp_bottom || sensorData.temp || 24;
        humidity = sensorData.humidity_bottom || sensorData.humidity || 50;
        break;
      case 'middle':
        temp = sensorData.temp_middle || sensorData.temp || 24;
        humidity = sensorData.humidity_middle || sensorData.humidity || 50;
        break;
      case 'top':
        temp = sensorData.temp_top || sensorData.temp || 24;
        humidity = sensorData.humidity_top || sensorData.humidity || 50;
        break;
      default:
        temp = sensorData.temp || 24;
        humidity = sensorData.humidity || 50;
    }

    return {
      temp: temp > 0 ? temp : 24,
      humidity: humidity > 0 ? humidity : 50,
      soilTemp: sensorData.soil_temp || 22,
      light: sensorData.lux || sensorData.light_intensity || 0
    };
  };

  // Berechne Health Score UND Bodenfeuchte für jede Pflanze basierend auf echten Sensordaten
  useEffect(() => {
    if (!sensorData || plants.length === 0) return;

    const updatedPlants = plants.map(plant => {
      const plantData = getPlantSensorData(plant);

      // Hole ECHTE Bodenfeuchte aus sensorData.soil oder sensorData.soilMoisture Array
      const soilMoistureArray = Array.isArray(sensorData.soil)
        ? sensorData.soil
        : (Array.isArray(sensorData.soilMoisture) ? sensorData.soilMoisture : []);
      const rawSoilMoisture = soilMoistureArray[plant.slotIndex];
      const soilMoisture = calibrateSoilMoisture(rawSoilMoisture) || 0;

      let health = 100;
      const vpd = calculateVPD(plantData.temp, plantData.humidity);

      // Temperature penalties
      if (plantData.temp < 18) health -= 30;
      else if (plantData.temp < 20) health -= 15;
      else if (plantData.temp > 32) health -= 30;
      else if (plantData.temp > 28) health -= 10;

      // Humidity penalties
      if (plantData.humidity < 30) health -= 20;
      else if (plantData.humidity < 40) health -= 10;
      else if (plantData.humidity > 80) health -= 20;
      else if (plantData.humidity > 70) health -= 10;

      // VPD penalties
      if (vpd < 0.4 || vpd > 1.6) health -= 25;
      else if (vpd < 0.6 || vpd > 1.4) health -= 15;

      // Light penalties
      if (plantData.light < 20 && plant.growthStage !== 'seedling') health -= 15;

      // Soil moisture penalties
      if (soilMoisture < 20) health -= 30;
      else if (soilMoisture < 30) health -= 20;
      else if (soilMoisture > 85) health -= 15;

      return {
        ...plant,
        healthScore: Math.max(0, Math.min(100, health)),
        soilMoisture: soilMoisture, // Kalibrierte Prozentwerte
        soilMoistureRaw: rawSoilMoisture // Rohwert für Anzeige
      };
    });

    setPlants(updatedPlants);
  }, [sensorData]);

  const updatePlant = async (id, updates, saveToDb = false) => {
    setPlants(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

    // Optional: Speichere in DB
    if (saveToDb) {
      const plant = plants.find(p => p.id === id);
      if (plant?.dbId) {
        setSaving(id);
        try {
          // Stage-Mapping rückwärts
          const stageMap = {
            'seedling': 'Keimling',
            'vegetative': 'Vegetation',
            'flowering': 'Blüte',
            'harvest': 'Ernte'
          };

          await api.updatePlant(plant.dbId, {
            stage: stageMap[updates.growthStage] || plant.growthStage,
            strain: updates.strain || plant.strain,
            notes: updates.notes || plant.notes
          });
          toast.success('Pflanze gespeichert');
        } catch (error) {
          toast.error('Speichern fehlgeschlagen');
          console.error('Fehler beim Speichern:', error);
        } finally {
          setSaving(null);
        }
      }
    }
  };

  // Speichere einzelne Pflanze in DB
  const savePlantToDB = async (plant) => {
    if (!plant.dbId) {
      toast.warning('Keine DB-Verknüpfung');
      return;
    }

    setSaving(plant.id);
    try {
      const stageMap = {
        'seedling': 'Keimling',
        'vegetative': 'Vegetation',
        'flowering': 'Blüte',
        'harvest': 'Ernte'
      };

      await api.updatePlant(plant.dbId, {
        stage: stageMap[plant.growthStage],
        strain: plant.strain,
        notes: plant.notes
      });
      toast.success(`${plant.name} gespeichert`);
    } catch (error) {
      toast.error('Speichern fehlgeschlagen');
      console.error('Fehler beim Speichern:', error);
    } finally {
      setSaving(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandedPlant(expandedPlant === id ? null : id);
  };

  const getHealthColor = (health) => {
    if (health >= 85) return '#10b981';
    if (health >= 70) return '#3b82f6';
    if (health >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getDaysGrowing = (plantedDate) => {
    const days = Math.floor((new Date() - new Date(plantedDate)) / (1000 * 60 * 60 * 24));
    return days;
  };

  // Loading Skeleton
  const StatSkeleton = () => (
    <div
      className="p-4 rounded-lg border animate-pulse"
      style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}
    >
      <div className="h-4 rounded w-24 mb-2" style={{ backgroundColor: theme.bg.hover }} />
      <div className="h-8 rounded w-16" style={{ backgroundColor: theme.bg.hover }} />
    </div>
  );

  const PlantCardSkeleton = () => (
    <div
      className="rounded-xl border overflow-hidden animate-pulse"
      style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}
    >
      <div className="px-5 py-4 border-b" style={{ borderColor: theme.border.default }}>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.bg.hover }} />
          <div>
            <div className="h-5 rounded w-32 mb-1" style={{ backgroundColor: theme.bg.hover }} />
            <div className="h-4 rounded w-24" style={{ backgroundColor: theme.bg.hover }} />
          </div>
        </div>
      </div>
      <div className="h-[550px]" style={{ backgroundColor: theme.bg.hover }} />
      <div className="px-5 py-4 border-t grid grid-cols-2 gap-3" style={{ borderColor: theme.border.default }}>
        <div className="h-12 rounded" style={{ backgroundColor: theme.bg.hover }} />
        <div className="h-12 rounded" style={{ backgroundColor: theme.bg.hover }} />
      </div>
    </div>
  );

  // Initial Loading
  if (loading && plants.length === 0) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <StatSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <PlantCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header mit Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: theme.bg.card,
            borderColor: theme.border.default
          }}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm" style={{ color: theme.text.secondary }}>
              Gesamt Pflanzen
            </div>
            {syncedWithDB ? (
              <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                <Database size={10} />
                Sync
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' }}>
                Lokal
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="text-3xl font-bold" style={{ color: theme.text.primary }}>
              {plants.length}
            </div>
            <button
              onClick={() => loadPlantsFromDB(true)}
              disabled={syncing}
              className="p-2 rounded-lg transition-colors hover:bg-white/10 disabled:opacity-50"
              title="Mit Datenbank synchronisieren"
            >
              {syncing ? (
                <Loader2 size={16} className="animate-spin" style={{ color: theme.accent.color }} />
              ) : (
                <RefreshCw size={16} style={{ color: theme.text.muted }} />
              )}
            </button>
          </div>
        </div>

        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: theme.bg.card,
            borderColor: theme.border.default
          }}
        >
          <div className="text-sm" style={{ color: theme.text.secondary }}>
            Gesunde Pflanzen
          </div>
          <div className="text-3xl font-bold mt-1" style={{ color: '#10b981' }}>
            {plants.filter(p => p.healthScore >= 85).length}
          </div>
        </div>

        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: theme.bg.card,
            borderColor: theme.border.default
          }}
        >
          <div className="text-sm" style={{ color: theme.text.secondary }}>
            Ø Health Score
          </div>
          <div className="text-3xl font-bold mt-1" style={{ color: theme.accent.color }}>
            {plants.length > 0
              ? Math.round(plants.reduce((sum, p) => sum + p.healthScore, 0) / plants.length)
              : 0}%
          </div>
        </div>

        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: theme.bg.card,
            borderColor: theme.border.default
          }}
        >
          <div className="text-sm" style={{ color: theme.text.secondary }}>
            Kritisch
          </div>
          <div className="text-3xl font-bold mt-1" style={{ color: '#ef4444' }}>
            {plants.filter(p => p.healthScore < 50).length}
          </div>
        </div>
      </div>

      {/* 2 Spalten Grid für bessere Sichtbarkeit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {plants.map((plant) => (
          <div
            key={plant.id}
            className="rounded-xl border overflow-hidden transition-all hover:shadow-xl"
            style={{
              backgroundColor: theme.bg.card,
              borderColor: expandedPlant === plant.id
                ? theme.accent.color
                : theme.border.default,
              borderWidth: expandedPlant === plant.id ? '2px' : '1px'
            }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 border-b flex items-center justify-between cursor-pointer"
              style={{ borderColor: theme.border.default }}
              onClick={() => toggleExpand(plant.id)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full relative"
                  style={{ backgroundColor: getHealthColor(plant.healthScore) }}
                >
                  {plant.healthScore < 50 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-base flex items-center gap-2" style={{ color: theme.text.primary }}>
                    {plant.name}
                    {plant.dbId && (
                      <Database size={12} style={{ color: theme.text.muted }} title="In DB gespeichert" />
                    )}
                  </div>
                  <div className="text-sm" style={{ color: theme.text.secondary }}>
                    {plant.strain} • Tag {getDaysGrowing(plant.plantedDate)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Soil Moisture Quick Badge */}
                {plant.soilMoisture !== undefined && (
                  <div
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{
                      backgroundColor: plant.soilMoisture < 30 ? 'rgba(239, 68, 68, 0.2)' : plant.soilMoisture < 40 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: plant.soilMoisture < 30 ? '#ef4444' : plant.soilMoisture < 40 ? '#fbbf24' : '#10b981'
                    }}
                  >
                    💧 {plant.soilMoisture}%
                  </div>
                )}
                <button className="p-1">
                  {expandedPlant === plant.id ? (
                    <ChevronUp size={20} style={{ color: theme.text.secondary }} />
                  ) : (
                    <ChevronDown size={20} style={{ color: theme.text.secondary }} />
                  )}
                </button>
              </div>
            </div>

            {/* Digital Twin - Kompakt */}
            <div className="relative overflow-hidden rounded-lg" style={{ height: '550px' }}>
              <DigitalTwin
                growthStage={plant.growthStage}
                healthScore={plant.healthScore}
                soilMoisture={plant.soilMoisture || 60}
                realHeight={sensorData?.heights?.[plant.slotIndex] > 0 ? sensorData.heights[plant.slotIndex] / 10 : null}
              />
            </div>

            {/* Quick Stats */}
            <div
              className="px-5 py-4 border-t grid grid-cols-4 gap-3"
              style={{ borderColor: theme.border.default }}
            >
              <div>
                <div className="text-xs font-medium" style={{ color: theme.text.secondary }}>
                  Health
                </div>
                <div className="text-xl font-bold mt-1" style={{ color: getHealthColor(plant.healthScore) }}>
                  {plant.healthScore}%
                </div>
              </div>
              <div>
                <div className="text-xs font-medium" style={{ color: theme.text.secondary }}>
                  Stadium
                </div>
                <div className="text-base font-bold mt-1" style={{ color: theme.text.primary }}>
                  {plant.growthStage === 'seedling' && '🌱 Keimling'}
                  {plant.growthStage === 'vegetative' && '🌿 Vegetativ'}
                  {plant.growthStage === 'flowering' && '🌺 Blüte'}
                  {plant.growthStage === 'harvest' && '🌾 Ernte'}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium" style={{ color: theme.text.secondary }}>
                  Höhe (Live)
                </div>
                <div className="text-xl font-bold mt-1" style={{ color: '#3b82f6' }}>
                  {sensorData?.heights?.[plant.slotIndex] > 0
                    ? `${(sensorData.heights[plant.slotIndex] / 10).toFixed(1)} cm`
                    : '--'
                  }
                </div>
              </div>
              <div>
                <div className="text-xs font-medium" style={{ color: theme.text.secondary }}>
                  Position
                </div>
                <div className="text-sm font-medium mt-1" style={{ color: theme.text.primary }}>
                  {plant.position === 'top' ? '⬆ Oben' : plant.position === 'middle' ? '↔ Mitte' : '⬇ Unten'}
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedPlant === plant.id && (
              <div
                className="px-4 py-4 border-t space-y-3"
                style={{
                  borderColor: theme.border.default,
                  backgroundColor: theme.bg.hover
                }}
              >
                {/* Sensordaten */}
                <div>
                  <div className="text-sm font-semibold mb-3" style={{ color: theme.text.secondary }}>
                    SENSORDATEN ({plant.position.toUpperCase()})
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: theme.bg.card }}>
                      <span className="font-medium" style={{ color: theme.text.secondary }}>Temp:</span>
                      <span className="font-bold text-base" style={{ color: theme.text.primary }}>
                        {getPlantSensorData(plant).temp.toFixed(1)}°C
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: theme.bg.card }}>
                      <span className="font-medium" style={{ color: theme.text.secondary }}>RH:</span>
                      <span className="font-bold text-base" style={{ color: theme.text.primary }}>
                        {getPlantSensorData(plant).humidity.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded col-span-2" style={{
                      backgroundColor: theme.bg.card,
                      borderLeft: `4px solid ${plant.soilMoisture < 30 ? '#ef4444' : plant.soilMoisture < 40 ? '#f59e0b' : '#10b981'}`
                    }}>
                      <span className="font-medium flex items-center gap-2" style={{ color: theme.text.secondary }}>
                        💧 Bodenfeuchte:
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-lg" style={{
                          color: plant.soilMoisture < 30 ? '#ef4444' : plant.soilMoisture < 40 ? '#f59e0b' : theme.text.primary
                        }}>
                          {plant.soilMoisture}%
                        </span>
                        {plant.soilMoistureRaw !== undefined && plant.soilMoistureRaw > 100 && (
                          <span className="text-xs ml-2" style={{ color: theme.text.muted }}>
                            (Raw: {plant.soilMoistureRaw})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wachstumsstadium Selector */}
                <div>
                  <label className="text-xs font-semibold mb-2 block" style={{ color: theme.text.secondary }}>
                    WACHSTUMSSTADIUM
                  </label>
                  <select
                    value={plant.growthStage}
                    onChange={(e) => updatePlant(plant.id, { growthStage: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: theme.bg.card,
                      borderColor: theme.border.default,
                      color: theme.text.primary
                    }}
                  >
                    <option value="seedling">🌱 Keimling</option>
                    <option value="vegetative">🌿 Vegetativ</option>
                    <option value="flowering">🌺 Blüte</option>
                    <option value="harvest">🌾 Erntereif</option>
                  </select>
                </div>

                {/* Name bearbeiten */}
                <div>
                  <label className="text-xs font-semibold mb-2 block" style={{ color: theme.text.secondary }}>
                    SORTE / STRAIN
                  </label>
                  <input
                    type="text"
                    value={plant.strain}
                    onChange={(e) => updatePlant(plant.id, { strain: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: theme.bg.card,
                      borderColor: theme.border.default,
                      color: theme.text.primary
                    }}
                  />
                </div>

                {/* Notizen */}
                <div>
                  <label className="text-xs font-semibold mb-2 block" style={{ color: theme.text.secondary }}>
                    NOTIZEN
                  </label>
                  <textarea
                    value={plant.notes}
                    onChange={(e) => updatePlant(plant.id, { notes: e.target.value })}
                    rows="2"
                    className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                    style={{
                      backgroundColor: theme.bg.card,
                      borderColor: theme.border.default,
                      color: theme.text.primary
                    }}
                    placeholder="Notizen zur Pflanze..."
                  />
                </div>

                {/* Save Button */}
                {plant.dbId && (
                  <button
                    onClick={() => savePlantToDB(plant)}
                    disabled={saving === plant.id}
                    className="w-full py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: theme.accent.color,
                      color: '#fff'
                    }}
                  >
                    {saving === plant.id ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Speichere...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        In Datenbank speichern
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PlantGrid;
