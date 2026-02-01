import React, { useState, useMemo } from 'react';
import { useTheme } from '../../theme';
import { Skeleton } from '../ui';
import {
  ComposedChart, BarChart, Bar, Line, Area, LineChart, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, Scatter, ScatterChart
} from 'recharts';
import {
  Activity, TrendingUp, ArrowUpRight, ArrowDownRight, Minus, Loader2,
  BarChart3, GitCompare, Sprout
} from 'lucide-react';

const TABS = [
  { id: 'week', label: 'Wochenvergleich', icon: GitCompare },
  { id: 'trend', label: '30-Tage Verlauf', icon: TrendingUp },
  { id: 'growth', label: 'Pflanzenwachstum', icon: Sprout }
];

const METRICS = [
  { key: 'temp', label: 'Temperatur', unit: '°C', color: '#f59e0b' },
  { key: 'humidity', label: 'Feuchte', unit: '%', color: '#3b82f6' },
  { key: 'vpd', label: 'VPD', unit: 'kPa', color: '#a855f7' },
  { key: 'lux', label: 'Lux', unit: '', color: '#eab308' }
];

const PLANT_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4'];

export default function TrendsPanel({ monthTrends, weekComparison, currentDate, loading }) {
  const { currentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('week');
  const [weekMetric, setWeekMetric] = useState('temp');

  // ── Wochenvergleich Daten ──
  const weekData = useMemo(() => {
    if (!weekComparison) return [];
    const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    return dayNames.map((name, idx) => {
      const thisDay = weekComparison.thisWeek?.[idx];
      const lastDay = weekComparison.lastWeek?.[idx];
      return {
        day: name,
        thisWeek: thisDay?.[weekMetric] || null,
        lastWeek: lastDay?.[weekMetric] || null
      };
    });
  }, [weekComparison, weekMetric]);

  const weekDelta = useMemo(() => {
    if (!weekComparison) return null;
    const avg = (arr) => {
      const vals = arr?.map(d => d[weekMetric]).filter(v => v != null) || [];
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    const thisAvg = avg(weekComparison.thisWeek);
    const lastAvg = avg(weekComparison.lastWeek);
    if (thisAvg == null || lastAvg == null) return null;
    return { thisAvg, lastAvg, diff: thisAvg - lastAvg };
  }, [weekComparison, weekMetric]);

  // ── 30-Tage Trend Daten ──
  const trendData = useMemo(() => {
    if (!monthTrends?.days?.length) return [];
    return monthTrends.days.map((day, idx) => {
      const rolling = monthTrends.rollingAverages?.[idx];
      return {
        date: day.date.split('-')[2], // Nur Tag
        fullDate: day.date,
        temp: day.temp,
        humidity: day.humidity,
        vpd: day.vpd,
        dli: day.dli,
        stability: day.stability,
        temp7d: rolling?.temp7d,
        humidity7d: rolling?.humidity7d,
        vpd7d: rolling?.vpd7d,
        stability7d: rolling?.stability7d
      };
    });
  }, [monthTrends]);

  // ── Pflanzenwachstum Daten ──
  const growthData = useMemo(() => {
    if (!monthTrends?.growthLogs?.length) return { lines: [], plants: [] };
    const plantMap = {};
    monthTrends.growthLogs.forEach(log => {
      const name = log.plant?.name || `Slot ${log.plant?.slotId}`;
      const id = log.plant?._id || name;
      if (!plantMap[id]) plantMap[id] = { name, data: [] };
      plantMap[id].data.push({
        date: new Date(log.date).toISOString().split('T')[0].split('-')[2],
        height: log.height
      });
    });
    const plantList = Object.values(plantMap);
    // Merged data für LineChart
    const allDates = [...new Set(plantList.flatMap(p => p.data.map(d => d.date)))].sort();
    const merged = allDates.map(date => {
      const point = { date };
      plantList.forEach((plant, idx) => {
        const entry = plant.data.find(d => d.date === date);
        point[`plant${idx}`] = entry?.height || null;
      });
      return point;
    });
    return { lines: merged, plants: plantList };
  }, [monthTrends]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl p-3 border shadow-xl backdrop-blur-xl text-xs"
        style={{ backgroundColor: currentTheme.components?.tooltip?.bg || currentTheme.bg.card, borderColor: currentTheme.components?.tooltip?.border || currentTheme.border.default }}>
        <p className="font-bold mb-1" style={{ color: currentTheme.text.primary }}>{label}</p>
        {payload.map((p, i) => p.value != null && (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span style={{ color: currentTheme.text.muted }}>{p.name}:</span>
            <span className="font-bold" style={{ color: p.color }}>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const metricInfo = METRICS.find(m => m.key === weekMetric);

  return (
    <div className="rounded-3xl border shadow-2xl backdrop-blur-sm overflow-hidden"
      style={{ backgroundColor: `${currentTheme.bg.card}95`, borderColor: 'rgba(255,255,255,0.05)' }}>

      {/* Header + Tabs */}
      <div className="p-5 border-b" style={{ borderColor: currentTheme.border.default }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
            <Activity size={18} className="text-cyan-400" />
          </div>
          <h3 className="text-lg font-bold" style={{ color: currentTheme.text.primary }}>Trends & Vergleich</h3>
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: currentTheme.bg.hover }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all flex-1 justify-center ${activeTab === tab.id ? 'shadow-sm' : 'opacity-50 hover:opacity-80'}`}
              style={{ backgroundColor: activeTab === tab.id ? currentTheme.bg.card : 'transparent', color: currentTheme.text.secondary }}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin" size={32} style={{ color: currentTheme.accent.color }} />
          </div>
        ) : activeTab === 'week' ? (
          /* ═══ Wochenvergleich ═══ */
          <div className="space-y-4">
            {/* Metrik Toggle */}
            <div className="flex items-center gap-2">
              {METRICS.map(m => (
                <button key={m.key} onClick={() => setWeekMetric(m.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${weekMetric === m.key ? 'shadow-sm' : 'opacity-40 hover:opacity-70'}`}
                  style={{ backgroundColor: weekMetric === m.key ? `${m.color}20` : 'transparent', color: m.color, borderWidth: '1px', borderColor: weekMetric === m.key ? `${m.color}40` : 'transparent' }}>
                  {m.label}
                </button>
              ))}
            </div>

            {weekData.some(d => d.thisWeek != null || d.lastWeek != null) ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weekData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke={currentTheme.components?.chartGrid || 'rgba(255,255,255,0.05)'} vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: currentTheme.text.muted }} />
                    <YAxis tick={{ fontSize: 10, fill: currentTheme.text.muted }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar name="Diese Woche" dataKey="thisWeek" fill={metricInfo.color} radius={[4, 4, 0, 0]} />
                    <Bar name="Letzte Woche" dataKey="lastWeek" fill={`${metricInfo.color}40`} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Delta Cards */}
                {weekDelta && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-3 border text-center" style={{ backgroundColor: `${metricInfo.color}08`, borderColor: `${metricInfo.color}20` }}>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: `${metricInfo.color}80` }}>Diese Woche</div>
                      <div className="text-xl font-black" style={{ color: metricInfo.color }}>{weekDelta.thisAvg.toFixed(1)}{metricInfo.unit}</div>
                    </div>
                    <div className="rounded-xl p-3 border text-center" style={{ backgroundColor: currentTheme.bg.main, borderColor: currentTheme.border.default }}>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: currentTheme.text.muted }}>Differenz</div>
                      <div className="text-xl font-black flex items-center justify-center gap-1" style={{ color: weekDelta.diff > 0 ? '#10b981' : weekDelta.diff < 0 ? '#ef4444' : currentTheme.text.muted }}>
                        {weekDelta.diff > 0 ? <ArrowUpRight size={18} /> : weekDelta.diff < 0 ? <ArrowDownRight size={18} /> : <Minus size={18} />}
                        {Math.abs(weekDelta.diff).toFixed(1)}{metricInfo.unit}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12" style={{ color: currentTheme.text.muted }}>
                <GitCompare className="mx-auto mb-3 opacity-20" size={40} />
                <p className="text-sm">Keine Vergleichsdaten verfügbar</p>
              </div>
            )}
          </div>

        ) : activeTab === 'trend' ? (
          /* ═══ 30-Tage Verlauf ═══ */
          <div>
            {trendData.length > 0 ? (
              <div className="space-y-4">
                {/* Temp + Rolling Average */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: currentTheme.text.muted }}>Temperatur + 7d-Durchschnitt</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={trendData}>
                      <defs>
                        <linearGradient id="trendTempGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={currentTheme.components?.chartGrid || 'rgba(255,255,255,0.05)'} vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: currentTheme.text.muted }} interval={2} />
                      <YAxis tick={{ fontSize: 10, fill: currentTheme.text.muted }} domain={['auto', 'auto']} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area name="Temperatur" dataKey="temp" type="monotone" fill="url(#trendTempGrad)" stroke="#f59e0b" strokeWidth={1} dot={{ r: 2, fill: '#f59e0b' }} connectNulls />
                      <Line name="7d Ø Temp" dataKey="temp7d" type="monotone" stroke="#f59e0b" strokeWidth={3} dot={false} connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Stabilität */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: currentTheme.text.muted }}>Umgebungs-Stabilität</h4>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={currentTheme.components?.chartGrid || 'rgba(255,255,255,0.05)'} vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: currentTheme.text.muted }} interval={2} />
                      <YAxis tick={{ fontSize: 10, fill: currentTheme.text.muted }} domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar name="Stabilität" dataKey="stability" radius={[3, 3, 0, 0]}>
                        {trendData.map((d, i) => {
                          const c = d.stability >= 70 ? '#10b981' : d.stability >= 40 ? '#eab308' : '#ef4444';
                          return <rect key={i} fill={c} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-center py-12" style={{ color: currentTheme.text.muted }}>
                <TrendingUp className="mx-auto mb-3 opacity-20" size={40} />
                <p className="text-sm">Keine Trend-Daten verfügbar</p>
              </div>
            )}
          </div>

        ) : (
          /* ═══ Pflanzenwachstum ═══ */
          <div>
            {growthData.plants.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={growthData.lines}>
                    <CartesianGrid strokeDasharray="3 3" stroke={currentTheme.components?.chartGrid || 'rgba(255,255,255,0.05)'} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: currentTheme.text.muted }} />
                    <YAxis tick={{ fontSize: 10, fill: currentTheme.text.muted }} label={{ value: 'cm', position: 'insideTopLeft', fill: currentTheme.text.muted, fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    {growthData.plants.map((plant, idx) => (
                      <Line key={idx} name={plant.name} dataKey={`plant${idx}`} type="monotone"
                        stroke={PLANT_COLORS[idx % PLANT_COLORS.length]} strokeWidth={2.5}
                        dot={{ r: 3, fill: PLANT_COLORS[idx % PLANT_COLORS.length] }} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                {/* Legende */}
                <div className="flex flex-wrap gap-3 justify-center">
                  {growthData.plants.map((plant, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLANT_COLORS[idx % PLANT_COLORS.length] }} />
                      <span style={{ color: currentTheme.text.muted }}>{plant.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12" style={{ color: currentTheme.text.muted }}>
                <Sprout className="mx-auto mb-3 opacity-20" size={40} />
                <p className="text-sm">Keine Wachstumsdaten in diesem Monat</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
