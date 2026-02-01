import React, { useMemo } from 'react';
import { useTheme } from '../../theme';
import { MONTH_NAMES } from '../../hooks/useCalendarData';
import { Skeleton } from '../ui';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell
} from 'recharts';
import {
  X, Thermometer, Droplets, Wind, Sun, Beaker, Gauge, Trash2,
  TrendingUp, Sprout, Flower2, Scissors, Activity, CloudRain, Loader2
} from 'lucide-react';

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

export default function DayDetailPanel({
  selectedDate, dayDetail, dailySummary, events, getEventStyle,
  loading, onClose, onDeleteEvent, onNavigateToTracker, plants
}) {
  const { currentTheme } = useTheme();

  const dateLabel = selectedDate
    ? `${selectedDate.getDate()}. ${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
    : '';

  // Chart-Daten aufbereiten
  const chartData = useMemo(() => {
    if (!dayDetail?.hours?.length) return [];
    // Erstelle volles 24h-Array
    const fullHours = Array.from({ length: 24 }, (_, h) => {
      const data = dayDetail.hours.find(d => d.hour === h);
      return {
        hour: HOUR_LABELS[h],
        temp: data?.temp || null,
        humidity: data?.humidity || null,
        vpd: data?.vpd || null,
        lux: data?.lux || null,
        eco2: data?.eco2 || null
      };
    });
    return fullHours;
  }, [dayDetail]);

  const env = dailySummary?.environment;

  const summaryCards = [
    {
      label: 'Temperatur', icon: Thermometer, color: '#f59e0b',
      value: env?.avgTemp != null ? `${env.avgTemp}°C` : '--',
      sub: env?.minTemp != null ? `${env.minTemp.toFixed(1)}° – ${env.maxTemp?.toFixed(1)}°` : null
    },
    {
      label: 'Luftfeuchtigkeit', icon: Droplets, color: '#3b82f6',
      value: env?.avgHumidity != null ? `${env.avgHumidity}%` : '--',
      sub: null
    },
    {
      label: 'VPD', icon: Wind, color: '#a855f7',
      value: env?.avgVPD != null ? `${env.avgVPD} kPa` : '--',
      sub: env?.avgVPD != null ? (env.avgVPD >= 0.8 && env.avgVPD <= 1.2 ? 'Optimal' : env.avgVPD < 0.8 ? 'Zu niedrig' : 'Zu hoch') : null
    },
    {
      label: 'Lichtstunden', icon: Sun, color: '#eab308',
      value: env?.lightHours != null ? `${env.lightHours}h` : '--',
      sub: env?.maxLux ? `max ${env.maxLux} lux` : null
    },
    {
      label: 'CO₂ (eCO2)', icon: CloudRain, color: '#06b6d4',
      value: dayDetail?.hours?.length ? (() => {
        const eco2s = dayDetail.hours.map(h => h.eco2).filter(v => v != null);
        return eco2s.length ? `${Math.round(eco2s.reduce((a, b) => a + b, 0) / eco2s.length)} ppm` : '--';
      })() : '--',
      sub: null
    },
    {
      label: 'Tank / Gas', icon: Gauge, color: '#10b981',
      value: env?.tankLevel != null ? `${Math.round(env.tankLevel / 40.95)}%` : '--',
      sub: env?.gasLevel != null ? `Gas: ${env.gasLevel}` : null
    }
  ];

  // Pflanzen-Höhen für BarChart
  const heightData = useMemo(() => {
    const heights = dailySummary?.plants?.heights || [];
    return heights.map((h, idx) => ({
      name: `S${idx + 1}`,
      height: h > 0 ? Math.round(h / 10) : 0,
      raw: h
    })).filter(d => d.height > 0);
  }, [dailySummary]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl p-3 border shadow-xl backdrop-blur-xl text-xs"
        style={{ backgroundColor: currentTheme.components?.tooltip?.bg || currentTheme.bg.card, borderColor: currentTheme.components?.tooltip?.border || currentTheme.border.default }}>
        <p className="font-bold mb-1.5" style={{ color: currentTheme.text.primary }}>{label}</p>
        {payload.map((p, i) => p.value != null && (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span style={{ color: currentTheme.text.muted }}>{p.name}:</span>
            <span className="font-bold" style={{ color: p.color }}>{p.value}{p.name === 'Temp' ? '°C' : p.name === 'Feuchte' ? '%' : p.name === 'VPD' ? ' kPa' : ''}</span>
          </div>
        ))}
      </div>
    );
  };

  const eventIcons = { lifecycle: Sprout, bloom: Flower2, harvest: Scissors, growth: TrendingUp, water: Droplets, nutrient: Beaker, training: Scissors };

  return (
    <div className="animate-in slide-in-from-top duration-500 rounded-3xl border shadow-2xl backdrop-blur-sm overflow-hidden"
      style={{ backgroundColor: `${currentTheme.bg.card}95`, borderColor: 'rgba(255,255,255,0.05)' }}>

      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: currentTheme.border.default }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
            <Activity size={18} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-black" style={{ color: currentTheme.text.primary }}>{dateLabel}</h3>
            <p className="text-xs" style={{ color: currentTheme.text.muted }}>
              {dailySummary?.dataPoints || 0} Datenpunkte &bull; {events?.length || 0} Events
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors" style={{ color: currentTheme.text.muted }}>
          <X size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin" size={32} style={{ color: currentTheme.accent.color }} />
        </div>
      ) : (
        <div className="p-5 space-y-6">
          {/* 24h Chart */}
          {chartData.some(d => d.temp != null) && (
            <div>
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: currentTheme.text.secondary }}>
                <Thermometer size={14} className="text-orange-400" />
                24-Stunden Umgebungsverlauf
              </h4>
              <div className="rounded-2xl p-3 border" style={{ backgroundColor: `${currentTheme.bg.main}80`, borderColor: currentTheme.border.default }}>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={currentTheme.components?.chartGrid || 'rgba(255,255,255,0.05)'} vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: currentTheme.text.muted }} tickLine={false} interval={2} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: currentTheme.text.muted }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: currentTheme.text.muted }} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine yAxisId="left" y={24} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.4} label={{ value: '24°C', position: 'left', fill: '#10b98160', fontSize: 9 }} />
                    <Area yAxisId="left" name="Temp" dataKey="temp" type="monotone" stroke="#f59e0b" fill="url(#tempGrad)" strokeWidth={2} dot={false} connectNulls />
                    <Area yAxisId="right" name="Feuchte" dataKey="humidity" type="monotone" stroke="#3b82f6" fill="url(#humGrad)" strokeWidth={2} dot={false} connectNulls />
                    <Line yAxisId="left" name="VPD" dataKey="vpd" type="monotone" stroke="#a855f7" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-6 mt-2 text-xs">
                  {[{ label: 'Temperatur', color: '#f59e0b' }, { label: 'Luftfeuchtigkeit', color: '#3b82f6' }, { label: 'VPD', color: '#a855f7' }].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 rounded" style={{ backgroundColor: l.color }} />
                      <span style={{ color: currentTheme.text.muted }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {summaryCards.map((card, idx) => (
              <div key={idx} className="rounded-xl p-3 border transition-all hover:scale-105"
                style={{ backgroundColor: `${card.color}08`, borderColor: `${card.color}20` }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <card.icon size={13} style={{ color: card.color }} />
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: `${card.color}cc` }}>{card.label}</span>
                </div>
                <div className="text-lg font-black" style={{ color: card.color }}>{card.value}</div>
                {card.sub && <div className="text-[10px] mt-0.5" style={{ color: `${card.color}80` }}>{card.sub}</div>}
              </div>
            ))}
          </div>

          {/* Pflanzen-Höhen + Events nebeneinander */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Heights Chart */}
            {heightData.length > 0 && (
              <div className="rounded-xl p-4 border" style={{ backgroundColor: currentTheme.bg.main, borderColor: currentTheme.border.default }}>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: currentTheme.text.muted }}>Pflanzenhöhen (cm)</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={heightData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={currentTheme.components?.chartGrid || 'rgba(255,255,255,0.05)'} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: currentTheme.text.muted }} />
                    <YAxis tick={{ fontSize: 10, fill: currentTheme.text.muted }} />
                    <Bar dataKey="height" radius={[6, 6, 0, 0]}>
                      {heightData.map((_, i) => (
                        <Cell key={i} fill={`${currentTheme.accent.color}${i % 2 === 0 ? 'cc' : '88'}`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Events */}
            {events?.length > 0 && (
              <div className="rounded-xl p-4 border" style={{ backgroundColor: currentTheme.bg.main, borderColor: currentTheme.border.default }}>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: currentTheme.text.muted }}>Tages-Events</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                  {events.map((evt, idx) => {
                    const style = getEventStyle(evt.type);
                    const Icon = eventIcons[evt.type] || Activity;
                    return (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border" style={{ backgroundColor: style.bg, borderColor: style.border }}>
                        <div className="flex items-center gap-2">
                          <Icon size={14} style={{ color: style.text }} />
                          <span className="text-sm font-medium" style={{ color: style.text }}>{evt.title}</span>
                        </div>
                        {evt.source === 'manual' && (
                          <button onClick={() => onDeleteEvent(evt._id)} className="p-1 rounded-lg hover:bg-red-500/20 transition-colors">
                            <Trash2 size={13} className="text-red-400" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Growth Logs */}
          {dailySummary?.plants?.growthLogs?.length > 0 && (
            <div className="rounded-xl p-4 border" style={{ backgroundColor: currentTheme.bg.main, borderColor: currentTheme.border.default }}>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: currentTheme.text.muted }}>Pflanzen-Status</h4>
              <div className="space-y-2">
                {dailySummary.plants.growthLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border"
                    style={{ backgroundColor: currentTheme.bg.hover, borderColor: currentTheme.border.default }}>
                    <span className="text-sm font-medium" style={{ color: currentTheme.text.primary }}>
                      {log.plant?.name || `Slot ${log.plant?.slotId}`}
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      {log.height && <span className="text-blue-400 font-bold">{log.height} cm</span>}
                      {log.health && (
                        <span className={`font-bold ${log.health >= 7 ? 'text-emerald-400' : log.health >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                          ♥ {log.health}/10
                        </span>
                      )}
                      {log.leafColor && <span style={{ color: currentTheme.text.muted }}>🍃 {log.leafColor}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
