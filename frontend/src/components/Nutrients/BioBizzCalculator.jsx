import React, { useState, useMemo } from 'react';
import { useTheme } from '../../theme';
import {
  BIOBIZZ_PRODUCTS, SUBSTRATE_MODIFIERS, BIOBIZZ_RULES,
  calculateDosage, getPhaseForWeek
} from '../../constants/biobizz';
import {
  Calculator, Minus, Plus, Beaker, Droplet, FlaskConical,
  Printer, Sparkles, ArrowRight, Loader2
} from 'lucide-react';
import toast from '../../utils/toast';

export default function BioBizzCalculator({ currentWeek, currentPhase, sensors, onDose, onLogDose }) {
  const { currentTheme } = useTheme();
  const [waterLiters, setWaterLiters] = useState(10);
  const [week, setWeek] = useState(currentWeek);
  const [substrate, setSubstrate] = useState('lightMix');
  const [logLoading, setLogLoading] = useState(false);

  const result = useMemo(() => calculateDosage(waterLiters, week, substrate), [waterLiters, week, substrate]);
  const phase = useMemo(() => getPhaseForWeek(week), [week]);

  const handleDose = () => {
    onDose({
      waterLiters,
      week,
      products: result.products,
      substrate
    });
  };

  const handleLogDose = async () => {
    if (logLoading) return;
    setLogLoading(true);
    try {
      const res = await onLogDose({
        waterVolumeLiters: waterLiters,
        week,
        products: result.products.map(p => ({
          productId: p.id, name: p.name, mlPerLiter: p.mlPerLiter
        })),
        substrate,
        notes: `BioBizz Woche ${week} | ${SUBSTRATE_MODIFIERS[substrate].label}`,
        triggerPump: false
      });
      if (res?.success) {
        toast.success(`Düngung Woche ${week} geloggt (${waterLiters}L)`);
      } else {
        toast.error(res?.error || 'Düngung konnte nicht geloggt werden');
      }
    } catch (err) {
      toast.error(`Fehler: ${err.message || 'Düngung konnte nicht gespeichert werden'}`);
    } finally {
      setLogLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border shadow-2xl backdrop-blur-sm overflow-hidden"
      style={{ backgroundColor: `${currentTheme.bg.card}95`, borderColor: 'rgba(255,255,255,0.05)' }}>

      {/* Header */}
      <div className="p-5 border-b" style={{ borderColor: currentTheme.border.default }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
            <Calculator size={18} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: currentTheme.text.primary }}>BioBizz Rechner</h3>
            <p className="text-xs" style={{ color: currentTheme.text.muted }}>
              Berechne die exakte Dosierung fur deinen Tank
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Eingabefelder */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tankgrosse */}
          <div className="rounded-xl p-4 border" style={{ backgroundColor: currentTheme.bg.main, borderColor: currentTheme.border.default }}>
            <label className="text-xs font-bold uppercase tracking-wider mb-3 block" style={{ color: currentTheme.text.muted }}>
              <Droplet size={12} className="inline mr-1" /> Tankgrosse
            </label>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setWaterLiters(Math.max(1, waterLiters - 1))}
                className="p-2 rounded-lg border transition-colors"
                style={{ backgroundColor: currentTheme.bg.hover, borderColor: currentTheme.border.default, color: currentTheme.text.secondary }}>
                <Minus size={14} />
              </button>
              <input type="number" value={waterLiters}
                onChange={e => setWaterLiters(Math.max(1, Math.min(100, parseFloat(e.target.value) || 1)))}
                className="flex-1 text-center text-2xl font-black rounded-lg py-1 border outline-none"
                style={{ backgroundColor: currentTheme.bg.input, borderColor: currentTheme.border.default, color: currentTheme.accent.color }}
              />
              <button onClick={() => setWaterLiters(Math.min(100, waterLiters + 1))}
                className="p-2 rounded-lg border transition-colors"
                style={{ backgroundColor: currentTheme.bg.hover, borderColor: currentTheme.border.default, color: currentTheme.text.secondary }}>
                <Plus size={14} />
              </button>
            </div>
            <div className="flex gap-1.5">
              {[5, 10, 20, 50].map(v => (
                <button key={v} onClick={() => setWaterLiters(v)}
                  className="flex-1 py-1 rounded-lg text-xs font-bold transition-all"
                  style={{
                    backgroundColor: waterLiters === v ? `${currentTheme.accent.color}20` : currentTheme.bg.hover,
                    color: waterLiters === v ? currentTheme.accent.color : currentTheme.text.muted,
                    borderWidth: 1,
                    borderColor: waterLiters === v ? `${currentTheme.accent.color}40` : 'transparent'
                  }}>
                  {v}L
                </button>
              ))}
            </div>
            <div className="text-[10px] text-center mt-1" style={{ color: currentTheme.text.muted }}>Liter</div>
          </div>

          {/* Grow-Woche */}
          <div className="rounded-xl p-4 border" style={{ backgroundColor: currentTheme.bg.main, borderColor: currentTheme.border.default }}>
            <label className="text-xs font-bold uppercase tracking-wider mb-3 block" style={{ color: currentTheme.text.muted }}>
              <FlaskConical size={12} className="inline mr-1" /> Grow-Woche
            </label>
            <input type="range" min="1" max="16" value={week}
              onChange={e => setWeek(parseInt(e.target.value))}
              className="w-full mb-2 accent-emerald-500"
              style={{ accentColor: phase.color }}
            />
            <div className="flex items-center justify-between">
              <button onClick={() => setWeek(Math.max(1, week - 1))}
                className="p-1.5 rounded-lg border transition-colors"
                style={{ backgroundColor: currentTheme.bg.hover, borderColor: currentTheme.border.default, color: currentTheme.text.secondary }}>
                <Minus size={12} />
              </button>
              <div className="text-center">
                <span className="text-2xl font-black" style={{ color: phase.color }}>{week}</span>
                <span className="text-sm font-medium ml-1" style={{ color: currentTheme.text.muted }}>/ 16</span>
                <div className="text-[10px] font-medium" style={{ color: phase.color }}>
                  {phase.icon} {phase.name}
                </div>
              </div>
              <button onClick={() => setWeek(Math.min(16, week + 1))}
                className="p-1.5 rounded-lg border transition-colors"
                style={{ backgroundColor: currentTheme.bg.hover, borderColor: currentTheme.border.default, color: currentTheme.text.secondary }}>
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Substrat */}
          <div className="rounded-xl p-4 border" style={{ backgroundColor: currentTheme.bg.main, borderColor: currentTheme.border.default }}>
            <label className="text-xs font-bold uppercase tracking-wider mb-3 block" style={{ color: currentTheme.text.muted }}>
              <Beaker size={12} className="inline mr-1" /> Substrat
            </label>
            <div className="space-y-2">
              {Object.entries(SUBSTRATE_MODIFIERS).map(([key, sub]) => (
                <button key={key} onClick={() => setSubstrate(key)}
                  className="w-full text-left p-2.5 rounded-lg border transition-all text-sm"
                  style={{
                    backgroundColor: substrate === key ? `${currentTheme.accent.color}10` : 'transparent',
                    borderColor: substrate === key ? `${currentTheme.accent.color}40` : currentTheme.border.default,
                    color: substrate === key ? currentTheme.accent.color : currentTheme.text.secondary
                  }}>
                  <div className="font-bold text-xs">{sub.label}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: currentTheme.text.muted }}>{sub.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ergebnis */}
        {result.products.length > 0 ? (
          <>
            {/* Produkt-Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {result.products.map(p => (
                <div key={p.id} className="rounded-xl p-3 border transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: `${p.color}08`, borderColor: `${p.color}20` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <p.icon size={14} style={{ color: p.color }} />
                    <span className="text-xs font-bold" style={{ color: p.color }}>{p.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black" style={{ color: p.color }}>
                      {p.totalMl.toFixed(1)}
                    </span>
                    <span className="text-xs" style={{ color: `${p.color}80` }}>ml</span>
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: currentTheme.text.muted }}>
                    {p.mlPerLiter} ml/L
                  </div>
                </div>
              ))}
            </div>

            {/* Zusammenfassung */}
            <div className="rounded-xl p-4 border" style={{
              background: `linear-gradient(135deg, ${currentTheme.accent.color}08, ${currentTheme.accent.color}03)`,
              borderColor: `${currentTheme.accent.color}20`
            }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: currentTheme.text.muted }}>
                    Gesamt Nahrstoffe
                  </div>
                  <div className="text-2xl font-black" style={{ color: currentTheme.accent.color }}>
                    {result.totalMl.toFixed(1)} ml
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: currentTheme.text.muted }}>
                    ml/L gesamt
                  </div>
                  <div className="text-2xl font-black" style={{ color: currentTheme.text.primary }}>
                    {(result.totalMl / waterLiters).toFixed(1)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: currentTheme.text.muted }}>
                    EC Zielbereich
                  </div>
                  <div className="text-2xl font-black" style={{ color: '#f59e0b' }}>
                    {result.ecTarget.min}-{result.ecTarget.max}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: currentTheme.text.muted }}>
                    pH Ziel
                  </div>
                  <div className="text-2xl font-black" style={{ color: '#3b82f6' }}>
                    {BIOBIZZ_RULES.phTarget.min}-{BIOBIZZ_RULES.phTarget.max}
                  </div>
                </div>
              </div>
            </div>

            {/* Hinweis */}
            {result.notes && (
              <div className="rounded-lg p-3 text-xs" style={{
                backgroundColor: `${phase.color}08`,
                color: currentTheme.text.muted
              }}>
                <span className="font-bold" style={{ color: phase.color }}>Tipp:</span> {result.notes}
              </div>
            )}

            {/* Aktionen */}
            <div className="flex gap-3">
              <button onClick={handleLogDose} disabled={logLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.01] border disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: currentTheme.bg.hover, borderColor: currentTheme.border.default, color: currentTheme.text.secondary }}>
                {logLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {logLoading ? 'Wird geloggt...' : 'Düngung loggen'}
              </button>
              <button onClick={handleDose}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.01] text-white shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${currentTheme.accent.color}, ${currentTheme.accent.dark || '#059669'})`,
                  boxShadow: `0 4px 15px ${currentTheme.accent.color}30`
                }}>
                <FlaskConical size={16} /> Jetzt Dosieren
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <Droplet className="mx-auto mb-3 opacity-20" size={40} style={{ color: currentTheme.text.muted }} />
            <p className="text-sm font-medium" style={{ color: currentTheme.text.muted }}>
              Flush-Woche - Nur sauberes Wasser verwenden
            </p>
            <p className="text-xs mt-1" style={{ color: currentTheme.text.muted }}>
              Keine Nahrstoffe in Woche {week}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
