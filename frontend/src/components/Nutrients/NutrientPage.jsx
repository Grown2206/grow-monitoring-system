import React, { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import useNutrientData from '../../hooks/useNutrientData';
import { BIOBIZZ_PRODUCTS, calculateDosage } from '../../constants/biobizz';
import NutrientHero from './NutrientHero';
import LiveSensorPanel from './LiveSensorPanel';
import BioBizzSchedule from './BioBizzSchedule';
import BioBizzCalculator from './BioBizzCalculator';
import DosingHistory from './DosingHistory';
import ProductInventory from './ProductInventory';
import RecommendationEngine from './RecommendationEngine';
import {
  Calendar, Calculator, History, Package, Loader2, X, Play, Plus, Minus,
  FlaskConical, Sparkles, RefreshCw, Activity
} from 'lucide-react';

const TABS = [
  { id: 'schedule', label: 'Dungeplan', icon: Calendar },
  { id: 'calculator', label: 'Rechner', icon: Calculator },
  { id: 'history', label: 'Historie', icon: History },
  { id: 'inventory', label: 'Inventar', icon: Package }
];

export default function NutrientPage() {
  const { currentTheme } = useTheme();
  const data = useNutrientData();
  const [activeTab, setActiveTab] = useState('schedule');
  const [showDoseModal, setShowDoseModal] = useState(false);
  const [dosePreset, setDosePreset] = useState(null);

  // ManualDose-Modal offnen mit optionalen Preset-Daten
  const handleOpenDoseModal = (preset = null) => {
    setDosePreset(preset);
    setShowDoseModal(true);
  };

  if (data.loading.initial) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={32} style={{ color: currentTheme.accent.color }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Hero */}
      <NutrientHero
        sensors={data.sensors}
        currentWeek={data.currentWeek}
        currentPhase={data.currentPhase}
        plants={data.plants}
        onDose={() => handleOpenDoseModal()}
      />

      {/* Live Sensor Strip */}
      <LiveSensorPanel
        sensors={data.sensors}
        getECStatus={data.getECStatus}
        getPHStatus={data.getPHStatus}
        currentSchedule={data.currentSchedule}
      />

      {/* Pump-Status Banner */}
      {data.sensors.pumpRunning && (
        <div className="rounded-2xl p-4 border" style={{
          background: `linear-gradient(135deg, ${currentTheme.accent.color}15, ${currentTheme.accent.color}08)`,
          borderColor: `${currentTheme.accent.color}40`
        }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="animate-pulse" size={20} style={{ color: currentTheme.accent.color }} />
              <span className="font-bold" style={{ color: currentTheme.accent.color }}>Dosierung lauft...</span>
            </div>
            <span className="text-2xl font-black" style={{ color: currentTheme.accent.color }}>
              {data.sensors.pumpProgress}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${currentTheme.accent.color}20` }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${data.sensors.pumpProgress}%`, backgroundColor: currentTheme.accent.color }} />
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: currentTheme.bg.hover }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${activeTab === tab.id ? 'shadow-sm' : 'opacity-50 hover:opacity-80'}`}
            style={{
              backgroundColor: activeTab === tab.id ? currentTheme.bg.card : 'transparent',
              color: activeTab === tab.id ? currentTheme.accent.color : currentTheme.text.secondary
            }}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'schedule' && (
        <BioBizzSchedule
          currentWeek={data.currentWeek}
          currentPhase={data.currentPhase}
          inventory={data.inventory}
        />
      )}

      {activeTab === 'calculator' && (
        <BioBizzCalculator
          currentWeek={data.currentWeek}
          currentPhase={data.currentPhase}
          sensors={data.sensors}
          onDose={handleOpenDoseModal}
          onLogDose={data.handleBioBizzDose}
        />
      )}

      {activeTab === 'history' && (
        <DosingHistory
          loadLogs={data.loadLogs}
          loadStats={data.loadStats}
          logs={data.logs}
          stats={data.stats}
          loading={data.loading}
        />
      )}

      {activeTab === 'inventory' && (
        <ProductInventory
          inventory={data.inventory}
          updateProductInventory={data.updateProductInventory}
          currentWeek={data.currentWeek}
        />
      )}

      {/* Empfehlungen (immer sichtbar) */}
      {data.recommendations.length > 0 && (
        <RecommendationEngine
          recommendations={data.recommendations}
          onAction={(action) => {
            if (action === 'feed' || action === 'flush') handleOpenDoseModal();
          }}
        />
      )}

      {/* BioBizz Dose Modal */}
      {showDoseModal && (
        <DoseModal
          preset={dosePreset}
          currentWeek={data.currentWeek}
          sensors={data.sensors}
          onDose={data.handleBioBizzDose}
          onClose={() => { setShowDoseModal(false); setDosePreset(null); }}
        />
      )}
    </div>
  );
}

// ── Dose Modal ─────────────────────────────────────────────────
function DoseModal({ preset, currentWeek, sensors, onDose, onClose }) {
  const { currentTheme } = useTheme();
  const [waterVolume, setWaterVolume] = useState(preset?.waterLiters || 10);
  const [week, setWeek] = useState(preset?.week || currentWeek);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState(preset?.products || []);

  // Berechne Produkte wenn sich Woche/Volumen andert und kein Preset da ist
  useEffect(() => {
    if (!preset?.products) {
      const result = calculateDosage(waterVolume, week);
      setProducts(result.products);
    }
  }, [waterVolume, week, preset]);

  const totalMl = products.reduce((sum, p) => sum + (p.totalMl || 0), 0);

  const handleDose = async () => {
    setLoading(true);
    const result = await onDose({
      waterVolumeLiters: waterVolume,
      week,
      products: products.map(p => ({
        productId: p.id,
        name: p.name,
        mlPerLiter: p.mlPerLiter
      })),
      substrate: 'lightMix',
      notes,
      triggerPump: false
    });
    setLoading(false);
    if (result.success) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="rounded-2xl border shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: currentTheme.bg.card, borderColor: currentTheme.border.default }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: currentTheme.border.default }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${currentTheme.accent.color}20` }}>
              <FlaskConical size={20} style={{ color: currentTheme.accent.color }} />
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: currentTheme.text.primary }}>BioBizz Dosierung</h3>
              <p className="text-xs" style={{ color: currentTheme.text.muted }}>Woche {week} - Dungung loggen</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: currentTheme.text.muted }}>
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Wasser + Woche */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: currentTheme.text.muted }}>Wasser (Liter)</label>
              <input type="number" value={waterVolume}
                onChange={e => setWaterVolume(parseFloat(e.target.value) || 1)}
                className="w-full rounded-lg px-3 py-2 text-sm border outline-none transition-colors"
                style={{ backgroundColor: currentTheme.bg.input, borderColor: currentTheme.border.default, color: currentTheme.text.primary }}
                min="1" max="100" />
              <div className="flex gap-1.5 mt-1.5">
                {[5, 10, 20, 50].map(v => (
                  <button key={v} onClick={() => setWaterVolume(v)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold transition-all"
                    style={{
                      backgroundColor: waterVolume === v ? `${currentTheme.accent.color}20` : currentTheme.bg.hover,
                      color: waterVolume === v ? currentTheme.accent.color : currentTheme.text.muted
                    }}>
                    {v}L
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: currentTheme.text.muted }}>Grow-Woche</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setWeek(Math.max(1, week - 1))}
                  className="p-2 rounded-lg border transition-colors"
                  style={{ backgroundColor: currentTheme.bg.hover, borderColor: currentTheme.border.default, color: currentTheme.text.secondary }}>
                  <Minus size={14} />
                </button>
                <span className="text-xl font-black flex-1 text-center" style={{ color: currentTheme.accent.color }}>{week}</span>
                <button onClick={() => setWeek(Math.min(16, week + 1))}
                  className="p-2 rounded-lg border transition-colors"
                  style={{ backgroundColor: currentTheme.bg.hover, borderColor: currentTheme.border.default, color: currentTheme.text.secondary }}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Produkte */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: currentTheme.text.muted }}>
              Produkte ({products.length})
            </h4>
            <div className="space-y-1.5">
              {products.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg border"
                  style={{ backgroundColor: `${p.color}08`, borderColor: `${p.color}20` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-sm font-medium" style={{ color: p.color }}>{p.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold" style={{ color: currentTheme.text.primary }}>
                      {p.totalMl?.toFixed(1)} ml
                    </span>
                    <span className="text-[10px] ml-1" style={{ color: currentTheme.text.muted }}>
                      ({p.mlPerLiter} ml/L)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gesamt */}
          <div className="rounded-xl p-3 border" style={{
            backgroundColor: `${currentTheme.accent.color}08`,
            borderColor: `${currentTheme.accent.color}20`
          }}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: currentTheme.text.muted }}>Gesamt-Dosierung:</span>
              <span className="text-2xl font-black" style={{ color: currentTheme.accent.color }}>
                {totalMl.toFixed(1)} ml
              </span>
            </div>
            <div className="text-[10px] mt-1" style={{ color: currentTheme.text.muted }}>
              fur {waterVolume}L Wasser = {(totalMl / waterVolume).toFixed(1)} ml/L gesamt
            </div>
          </div>

          {/* Aktuelle Sensorwerte */}
          {(sensors.ec > 0 || sensors.ph > 0) && (
            <div className="flex gap-3">
              {sensors.ec > 0 && (
                <div className="flex-1 rounded-lg p-2 text-center border"
                  style={{ backgroundColor: currentTheme.bg.hover, borderColor: currentTheme.border.default }}>
                  <div className="text-[10px]" style={{ color: currentTheme.text.muted }}>Aktuell EC</div>
                  <div className="text-sm font-bold" style={{ color: '#f59e0b' }}>{sensors.ec.toFixed(2)}</div>
                </div>
              )}
              {sensors.ph > 0 && (
                <div className="flex-1 rounded-lg p-2 text-center border"
                  style={{ backgroundColor: currentTheme.bg.hover, borderColor: currentTheme.border.default }}>
                  <div className="text-[10px]" style={{ color: currentTheme.text.muted }}>Aktuell pH</div>
                  <div className="text-sm font-bold" style={{ color: '#3b82f6' }}>{sensors.ph.toFixed(1)}</div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: currentTheme.text.muted }}>Notizen</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm border outline-none resize-none"
              style={{ backgroundColor: currentTheme.bg.input, borderColor: currentTheme.border.default, color: currentTheme.text.primary }}
              rows="2" placeholder="z.B. Pflanzen sehen gesund aus..." />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t" style={{ borderColor: currentTheme.border.default }}>
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
            style={{ backgroundColor: currentTheme.bg.hover, color: currentTheme.text.secondary }}>
            Abbrechen
          </button>
          <button onClick={handleDose} disabled={loading || products.length === 0}
            className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all text-white"
            style={{
              background: `linear-gradient(135deg, ${currentTheme.accent.color}, ${currentTheme.accent.dark || currentTheme.accent.color})`,
              opacity: loading || products.length === 0 ? 0.5 : 1
            }}>
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
            Dungung loggen
          </button>
        </div>
      </div>
    </div>
  );
}
