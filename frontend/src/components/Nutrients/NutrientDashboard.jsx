import React, { useState, useEffect } from 'react';
import { nutrientsAPI } from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import {
  Beaker, Droplet, ThermometerSun, Calendar, Play, Settings,
  AlertTriangle, CheckCircle, RefreshCw, Droplets, TrendingUp,
  Package, Clock, Activity, BookOpen
} from 'lucide-react';

// Stat Card Komponente
const StatCard = ({ icon: Icon, label, value, unit, target, status }) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg hover:border-slate-700 transition-all">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 rounded-xl bg-emerald-500/10">
        <Icon size={24} className="text-emerald-400" />
      </div>
      {status && (
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          status === 'ok' ? 'bg-emerald-500/20 text-emerald-400' :
          status === 'warning' ? 'bg-amber-500/20 text-amber-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {status === 'ok' ? 'OK' : status === 'warning' ? 'Warnung' : 'Kritisch'}
        </span>
      )}
    </div>

    <div className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-2">
      {label}
    </div>

    <div className="flex items-baseline gap-2">
      <div className="text-4xl font-black text-white">
        {value !== null && value !== undefined ? value : '--'}
      </div>
      {unit && <div className="text-lg text-slate-500 font-bold">{unit}</div>}
    </div>

    {target && (
      <div className="mt-3 pt-3 border-t border-slate-800 text-sm text-slate-500">
        Ziel: <span className="text-emerald-400 font-bold">{target}</span> {unit}
      </div>
    )}
  </div>
);

// Reservoir Level Bar
const ReservoirLevel = ({ reservoir }) => {
  const percentage = reservoir.level_percent || 0;
  const isLow = percentage < 20;

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-slate-400" />
          <span className="text-sm font-bold text-white">{reservoir.name}</span>
        </div>
        <span className={`text-sm font-mono font-bold ${
          isLow ? 'text-red-400' : 'text-emerald-400'
        }`}>
          {reservoir.volume_ml}ml
        </span>
      </div>

      <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isLow ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
        <span>{percentage}%</span>
        <span>{reservoir.capacity_ml}ml</span>
      </div>
    </div>
  );
};

// Active Schedule Card
const ActiveScheduleCard = ({ schedule, onToggle, onEdit }) => {
  if (!schedule) return null;

  return (
    <div className="bg-gradient-to-br from-emerald-900/20 to-green-900/20 border border-emerald-800/50 p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="text-emerald-400" size={24} />
          <div>
            <h3 className="font-bold text-white">{schedule.name}</h3>
            <p className="text-xs text-emerald-400">
              {schedule.type === 'fixed' ? 'Zeitplan-basiert' : 'Adaptiv (EC-basiert)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(schedule._id)}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              schedule.isActive
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {schedule.isActive ? 'Aktiv' : 'Pausiert'}
          </button>
          <button
            onClick={() => onEdit(schedule)}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {schedule.type === 'fixed' && schedule.schedule.enabled && (
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-emerald-800/30">
          <div>
            <div className="text-xs text-slate-500 mb-1">Zeitplan</div>
            <div className="text-sm font-mono text-white">
              {schedule.schedule.time} Uhr
            </div>
            <div className="text-xs text-emerald-400 mt-1">
              {['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
                .filter((_, i) => schedule.schedule.daysOfWeek.includes(i))
                .join(', ')}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Dosierung</div>
            <div className="text-sm font-mono text-white">
              {schedule.dosage.singlePump.ml_per_liter} ml/L
            </div>
            <div className="text-xs text-emerald-400 mt-1">
              für {schedule.waterVolume.liters}L Wasser
            </div>
          </div>
        </div>
      )}

      {schedule.nextRun && (
        <div className="mt-4 pt-4 border-t border-emerald-800/30 flex items-center gap-2 text-sm">
          <Clock size={16} className="text-emerald-400" />
          <span className="text-slate-400">Nächste Dosierung:</span>
          <span className="text-white font-mono">
            {new Date(schedule.nextRun).toLocaleString('de-DE')}
          </span>
        </div>
      )}
    </div>
  );
};

// Main Component
export default function NutrientDashboard() {
  const { nutrientSensors, nutrientStatus } = useSocket();
  const [reservoir, setReservoir] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showManualDose, setShowManualDose] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState(null);

  // Manuelle Dosierung State
  const [manualForm, setManualForm] = useState({
    waterVolume: 10,
    mlPerLiter: 2,
    notes: ''
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Alle 30 Sek
    return () => clearInterval(interval);
  }, []);

  // Load active recipe from Smart Grow Control
  useEffect(() => {
    const savedRecipe = localStorage.getItem('active-grow-recipe');
    if (savedRecipe) {
      setActiveRecipe(JSON.parse(savedRecipe));
    }
  }, []);

  const loadData = async () => {
    try {
      const [resData, schedData] = await Promise.all([
        nutrientsAPI.getReservoir(),
        nutrientsAPI.getSchedules()
      ]);

      setReservoir(resData.data || resData);
      setSchedules(schedData.data || schedData);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSchedule = async (id) => {
    try {
      await nutrientsAPI.toggleSchedule(id);
      await loadData();
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  const handleManualDose = async () => {
    try {
      setLoading(true);
      await nutrientsAPI.manualDose(
        manualForm.waterVolume,
        manualForm.mlPerLiter,
        manualForm.notes
      );
      await loadData();
      setShowManualDose(false);
      alert('Dosierung erfolgreich!');
    } catch (error) {
      console.error('Dosage error:', error);
      alert('Fehler: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const activeSchedule = schedules.find(s => s.isActive);

  // Merge socket data with reservoir data (socket has priority for real-time values)
  const currentEC = nutrientSensors.ec || reservoir?.main?.ec || 0;
  const currentPH = nutrientSensors.ph || reservoir?.main?.ph || 0;
  const currentTemp = nutrientSensors.temp || reservoir?.main?.temp || 0;
  const currentReservoirLevel = nutrientSensors.reservoirLevel_percent || reservoir?.main?.level_percent || 0;

  const getECStatus = () => {
    if (!currentEC) return 'unknown';
    if (currentEC < 0.8) return 'low';
    if (currentEC > 2.5) return 'high';
    return 'ok';
  };

  const getPHStatus = () => {
    if (!currentPH) return 'unknown';
    if (currentPH < 5.5) return 'low';
    if (currentPH > 6.5) return 'high';
    return 'ok';
  };

  if (loading && !reservoir) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Beaker className="text-emerald-500" /> Nährstoff-Management
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Automatische Dosierung & Reservoir-Überwachung
          </p>
        </div>

        <button
          onClick={() => setShowManualDose(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all"
        >
          <Play size={18} />
          Jetzt Dosieren
        </button>
      </div>

      {/* Live-Messungen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Droplet}
          label="EC-Wert"
          value={currentEC ? currentEC.toFixed(2) : '--'}
          unit="mS/cm"
          target={activeSchedule?.targets?.ec}
          status={getECStatus() === 'ok' ? 'ok' : 'warning'}
        />
        <StatCard
          icon={Beaker}
          label="pH-Wert"
          value={currentPH ? currentPH.toFixed(1) : '--'}
          unit=""
          target={activeSchedule?.targets?.ph}
          status={getPHStatus() === 'ok' ? 'ok' : 'warning'}
        />
        <StatCard
          icon={ThermometerSun}
          label="Temperatur"
          value={currentTemp ? currentTemp.toFixed(1) : '--'}
          unit="°C"
          status="ok"
        />
      </div>

      {/* Live-Status der Pumpe */}
      {nutrientStatus.pumpRunning && (
        <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="text-emerald-400 animate-pulse" size={20} />
              <h3 className="font-bold text-emerald-400">Dosierung läuft...</h3>
            </div>
            <span className="text-2xl font-black text-emerald-400">
              {nutrientStatus.progress_percent || 0}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-300"
              style={{ width: `${nutrientStatus.progress_percent || 0}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Verstrichene Zeit: {((nutrientStatus.elapsed_ms || 0) / 1000).toFixed(1)}s
          </div>
        </div>
      )}

      {/* Recipe Integration - Smart Grow Control Link */}
      {activeRecipe && (
        <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-800/50 p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <BookOpen className="text-purple-400" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white">Aktives Rezept: {activeRecipe.name}</h3>
              <p className="text-xs text-purple-400">Verknüpft mit Smart Grow Control Center</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-slate-950/50 p-3 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Ziel EC</div>
              <div className="text-lg font-bold text-purple-400">
                {activeRecipe.nutrients?.week1?.ec || '1.2-1.8'} mS/cm
              </div>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Ziel pH</div>
              <div className="text-lg font-bold text-purple-400">5.8-6.2</div>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Phase</div>
              <div className="text-lg font-bold text-purple-400 capitalize">
                {activeRecipe.phase || 'Vegetativ'}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-purple-800/30 flex items-center gap-2 text-sm text-purple-300">
            <TrendingUp size={16} />
            <span>Nährstoffplan wird automatisch von der Automation-Engine gesteuert</span>
          </div>
        </div>
      )}

      {/* Warnungen */}
      {reservoir?.warnings && reservoir.warnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-amber-400" size={20} />
            <h3 className="font-bold text-amber-400">Warnungen</h3>
          </div>
          <div className="space-y-2">
            {reservoir.warnings.map((warning, idx) => (
              <div key={idx} className="text-sm text-amber-200 flex items-start gap-2">
                <span>•</span>
                <span>{warning.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aktiver Zeitplan */}
      {activeSchedule && (
        <ActiveScheduleCard
          schedule={activeSchedule}
          onToggle={handleToggleSchedule}
          onEdit={() => alert('Edit-Feature kommt bald!')}
        />
      )}

      {/* Reservoir-Füllstände */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Package size={20} className="text-emerald-500" />
          Nährstoff-Reservoirs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reservoir?.reservoirs?.map((res, idx) => (
            <ReservoirLevel key={idx} reservoir={res} />
          ))}
        </div>
      </div>

      {/* Manuelle Dosierung Modal */}
      {showManualDose && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Manuelle Dosierung</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 block mb-2">Wasser-Menge (Liter)</label>
                <input
                  type="number"
                  value={manualForm.waterVolume}
                  onChange={e => setManualForm({...manualForm, waterVolume: parseFloat(e.target.value)})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white"
                  min="1"
                  max="100"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-2">Dosierung (ml pro Liter)</label>
                <input
                  type="number"
                  value={manualForm.mlPerLiter}
                  onChange={e => setManualForm({...manualForm, mlPerLiter: parseFloat(e.target.value)})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white"
                  min="0.1"
                  max="50"
                  step="0.1"
                />
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                <div className="text-sm text-slate-400">Gesamt-Dosierung:</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {(manualForm.waterVolume * manualForm.mlPerLiter).toFixed(1)} ml
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-2">Notizen (optional)</label>
                <textarea
                  value={manualForm.notes}
                  onChange={e => setManualForm({...manualForm, notes: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white"
                  rows="2"
                  placeholder="z.B. Veg Woche 3"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowManualDose(false)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold"
              >
                Abbrechen
              </button>
              <button
                onClick={handleManualDose}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
                Dosieren
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
