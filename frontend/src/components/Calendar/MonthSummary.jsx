import React, { useMemo } from 'react';
import { useTheme } from '../../theme';
import { MONTH_NAMES } from '../../hooks/useCalendarData';
import {
  PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, Radar, Legend
} from 'recharts';
import {
  BarChart3, Award, AlertTriangle, Trophy, Milestone, Loader2
} from 'lucide-react';

const EVENT_COLORS = {
  water: { label: 'Wasser', color: '#3b82f6' },
  nutrient: { label: 'Nährstoffe', color: '#a855f7' },
  training: { label: 'Training', color: '#f97316' },
  growth: { label: 'Messungen', color: '#06b6d4' },
  lifecycle: { label: 'Lifecycle', color: '#10b981' },
  bloom: { label: 'Blüte', color: '#ec4899' },
  harvest: { label: 'Ernte', color: '#eab308' },
  note: { label: 'Notizen', color: '#94a3b8' }
};

export default function MonthSummary({ monthHeatmap, monthTrends, stats, events }) {
  const { currentTheme } = useTheme();

  // Event-Verteilung für Donut
  const pieData = useMemo(() => {
    const counts = {};
    const evtArray = Array.isArray(events) ? events : [];
    evtArray.forEach(e => {
      const type = e.type || 'note';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      name: EVENT_COLORS[type]?.label || type,
      value: count,
      color: EVENT_COLORS[type]?.color || '#94a3b8'
    })).filter(d => d.value > 0);
  }, [events]);

  // Bester / Schlechtester Tag
  const bestWorst = useMemo(() => {
    if (!monthTrends?.days?.length) return null;
    const daysWithStability = monthTrends.days.filter(d => d.stability != null && d.temp != null);
    if (daysWithStability.length < 2) return null;
    const sorted = [...daysWithStability].sort((a, b) => b.stability - a.stability);
    return {
      best: sorted[0],
      worst: sorted[sorted.length - 1]
    };
  }, [monthTrends]);

  // Radar-Chart: Ist vs Ziel
  const radarData = useMemo(() => {
    if (!monthTrends?.days?.length) return [];
    const days = monthTrends.days;
    const avg = (key) => {
      const vals = days.map(d => d[key]).filter(v => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };

    const avgStability = avg('stability');
    const avgTemp = avg('temp');
    const avgHum = avg('humidity');
    const avgVpd = avg('vpd');
    const avgDli = avg('dli');

    // Normierung: Alle auf 0-100 Skala
    return [
      { metric: 'Temp', actual: Math.min(100, Math.max(0, 100 - Math.abs(avgTemp - 24) * 10)), target: 90, label: `${avgTemp.toFixed(1)}°C` },
      { metric: 'Feuchte', actual: Math.min(100, Math.max(0, 100 - Math.abs(avgHum - 55) * 2.5)), target: 85, label: `${avgHum.toFixed(0)}%` },
      { metric: 'VPD', actual: Math.min(100, Math.max(0, 100 - Math.abs(avgVpd - 1.0) * 60)), target: 85, label: `${avgVpd.toFixed(2)} kPa` },
      { metric: 'DLI', actual: avgDli ? Math.min(100, (avgDli / 40) * 100) : 0, target: 80, label: avgDli ? `${avgDli.toFixed(1)} mol` : '--' },
      { metric: 'Stabilität', actual: avgStability, target: 80, label: `${avgStability.toFixed(0)}%` }
    ];
  }, [monthTrends]);

  // Meilensteine
  const milestones = useMemo(() => {
    if (!monthTrends?.growthLogs) return [];
    return monthTrends.growthLogs
      .filter(log => log.milestones?.length > 0)
      .flatMap(log => log.milestones.map(m => ({
        ...m,
        plantName: log.plant?.name || `Slot ${log.plant?.slotId}`,
        date: log.date
      })));
  }, [monthTrends]);

  return (
    <div className="rounded-3xl border shadow-2xl backdrop-blur-sm overflow-hidden"
      style={{ backgroundColor: `${currentTheme.bg.card}95`, borderColor: 'rgba(255,255,255,0.05)' }}>

      {/* Header */}
      <div className="p-5 border-b" style={{ borderColor: currentTheme.border.default }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            <BarChart3 size={18} className="text-purple-400" />
          </div>
          <h3 className="text-lg font-bold" style={{ color: currentTheme.text.primary }}>Monats-Zusammenfassung</h3>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Event Donut + Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Donut */}
          <div className="rounded-xl p-4 border" style={{ backgroundColor: currentTheme.bg.main, borderColor: currentTheme.border.default }}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: currentTheme.text.muted }}>Event-Verteilung</h4>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
                        {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-lg font-black" style={{ color: currentTheme.text.primary }}>{stats.total}</div>
                      <div className="text-[8px] uppercase" style={{ color: currentTheme.text.muted }}>Total</div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span style={{ color: currentTheme.text.muted }}>{d.name}</span>
                      </div>
                      <span className="font-bold" style={{ color: d.color }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm" style={{ color: currentTheme.text.muted }}>Keine Events</p>
              </div>
            )}
          </div>

          {/* Best/Worst Day */}
          <div className="space-y-3">
            {bestWorst ? (
              <>
                <div className="rounded-xl p-4 border" style={{ backgroundColor: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy size={14} className="text-emerald-400" />
                    <span className="text-xs font-bold uppercase text-emerald-400">Bester Tag</span>
                  </div>
                  <div className="text-lg font-black text-emerald-400">
                    {bestWorst.best.date.split('-')[2]}. {MONTH_NAMES[parseInt(bestWorst.best.date.split('-')[1]) - 1]}
                  </div>
                  <div className="text-[10px] text-emerald-400/70 mt-1">
                    {bestWorst.best.temp?.toFixed(1)}°C &bull; Stabilität: {bestWorst.best.stability}%
                  </div>
                </div>
                <div className="rounded-xl p-4 border" style={{ backgroundColor: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-red-400" />
                    <span className="text-xs font-bold uppercase text-red-400">Schlechtester Tag</span>
                  </div>
                  <div className="text-lg font-black text-red-400">
                    {bestWorst.worst.date.split('-')[2]}. {MONTH_NAMES[parseInt(bestWorst.worst.date.split('-')[1]) - 1]}
                  </div>
                  <div className="text-[10px] text-red-400/70 mt-1">
                    {bestWorst.worst.temp?.toFixed(1)}°C &bull; Stabilität: {bestWorst.worst.stability}%
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl p-6 border text-center" style={{ backgroundColor: currentTheme.bg.main, borderColor: currentTheme.border.default }}>
                <Award className="mx-auto mb-2 opacity-20" size={32} style={{ color: currentTheme.text.muted }} />
                <p className="text-sm" style={{ color: currentTheme.text.muted }}>Noch nicht genügend Daten für Vergleich</p>
              </div>
            )}
          </div>
        </div>

        {/* Radar Chart - Ziel vs Ist */}
        {radarData.length > 0 && radarData.some(d => d.actual > 0) && (
          <div className="rounded-xl p-4 border" style={{ backgroundColor: currentTheme.bg.main, borderColor: currentTheme.border.default }}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: currentTheme.text.muted }}>Monatsziele vs. Aktuell</h4>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke={currentTheme.components?.chartGrid || 'rgba(255,255,255,0.08)'} />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: currentTheme.text.muted }} />
                <Radar name="Ziel" dataKey="target" stroke="#6b728040" fill="#6b728015" strokeWidth={1} strokeDasharray="4 4" />
                <Radar name="Aktuell" dataKey="actual" stroke={currentTheme.accent.color} fill={`${currentTheme.accent.color}25`} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
            {/* Werte unter dem Chart */}
            <div className="flex justify-center gap-4 mt-2 text-[10px]">
              {radarData.map((d, i) => (
                <div key={i} className="text-center">
                  <div className="font-bold" style={{ color: currentTheme.accent.color }}>{d.label}</div>
                  <div style={{ color: currentTheme.text.muted }}>{d.metric}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meilensteine */}
        {milestones.length > 0 && (
          <div className="rounded-xl p-4 border" style={{ backgroundColor: currentTheme.bg.main, borderColor: currentTheme.border.default }}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: currentTheme.text.muted }}>
              <Milestone size={13} /> Wachstums-Meilensteine
            </h4>
            <div className="space-y-2">
              {milestones.slice(0, 5).map((m, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: currentTheme.bg.hover }}>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-400">🏆</span>
                    <span style={{ color: currentTheme.text.primary }}>{m.plantName}</span>
                    <span style={{ color: currentTheme.text.muted }}>{m.type}</span>
                  </div>
                  <span className="text-[10px]" style={{ color: currentTheme.text.muted }}>
                    {new Date(m.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
