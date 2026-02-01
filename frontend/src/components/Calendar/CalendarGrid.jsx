import React, { useState, useMemo } from 'react';
import { useTheme } from '../../theme';
import { getDaysInMonth, WEEK_DAYS, MONTH_NAMES } from '../../hooks/useCalendarData';
import { Skeleton } from '../ui';
import {
  Target, Plus, Layers, Droplets, FlaskConical, TrendingUp, Sprout,
  Thermometer, Activity, Heart
} from 'lucide-react';

const METRIC_OPTIONS = [
  { value: 'quality', label: 'Qualität', icon: Activity },
  { value: 'temp', label: 'Temperatur', icon: Thermometer },
  { value: 'humidity', label: 'Feuchte', icon: Droplets },
  { value: 'health', label: 'Gesundheit', icon: Heart }
];

export default function CalendarGrid({
  currentDate, selectedDate, monthHeatmap, filterType, setFilterType,
  getEventsForDay, getEventStyle, handleDayClick, goToToday, onAddEvent, loading
}) {
  const { currentTheme } = useTheme();
  const [hoveredDay, setHoveredDay] = useState(null);
  const [heatmapMetric, setHeatmapMetric] = useState('quality');

  const { days, firstDay } = getDaysInMonth(currentDate);

  // Berechne Min/Max für Metrik-Skalierung
  const metricRange = useMemo(() => {
    const vals = Object.values(monthHeatmap || {});
    if (!vals.length) return { minTemp: 18, maxTemp: 30, minHum: 40, maxHum: 80 };
    const temps = vals.map(v => v.avgTemp).filter(v => v != null);
    const hums = vals.map(v => v.avgHum).filter(v => v != null);
    return {
      minTemp: temps.length ? Math.min(...temps) : 18,
      maxTemp: temps.length ? Math.max(...temps) : 30,
      minHum: hums.length ? Math.min(...hums) : 40,
      maxHum: hums.length ? Math.max(...hums) : 80
    };
  }, [monthHeatmap]);

  const getHeatmapColor = (dayStr) => {
    const data = monthHeatmap[dayStr];
    if (!data?.hasData) return null;

    switch (heatmapMetric) {
      case 'temp': {
        if (!data.avgTemp) return null;
        const range = metricRange.maxTemp - metricRange.minTemp || 1;
        const ratio = (data.avgTemp - metricRange.minTemp) / range;
        if (data.avgTemp >= 20 && data.avgTemp <= 28) return 'rgba(16,185,129,0.2)'; // optimal
        if (ratio < 0.3) return 'rgba(59,130,246,0.2)'; // kalt
        return 'rgba(239,68,68,0.2)'; // warm
      }
      case 'humidity': {
        if (!data.avgHum) return null;
        if (data.avgHum >= 45 && data.avgHum <= 65) return 'rgba(16,185,129,0.2)';
        if (data.avgHum < 45) return 'rgba(234,179,8,0.2)';
        return 'rgba(59,130,246,0.2)';
      }
      case 'health': {
        const scores = data.healthScores;
        if (!scores?.length) return data.hasData ? 'rgba(100,116,139,0.1)' : null;
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avg >= 7) return 'rgba(16,185,129,0.25)';
        if (avg >= 5) return 'rgba(234,179,8,0.2)';
        return 'rgba(239,68,68,0.2)';
      }
      default: { // quality
        if (data.dataPoints > 500) return 'rgba(16,185,129,0.15)';
        if (data.dataPoints > 100) return 'rgba(234,179,8,0.1)';
        return 'rgba(100,116,139,0.08)';
      }
    }
  };

  // Metrik-Bar Höhe (0-100%) für einen Tag
  const getMetricBar = (dayStr) => {
    const data = monthHeatmap[dayStr];
    if (!data?.hasData) return { height: 0, color: 'transparent' };

    let ratio = 0;
    let color = currentTheme.accent.color;
    switch (heatmapMetric) {
      case 'temp':
        if (data.avgTemp) {
          ratio = Math.max(0, Math.min(1, (data.avgTemp - (metricRange.minTemp - 2)) / ((metricRange.maxTemp + 2) - (metricRange.minTemp - 2))));
          color = data.avgTemp >= 20 && data.avgTemp <= 28 ? '#10b981' : '#f59e0b';
        }
        break;
      case 'humidity':
        if (data.avgHum) {
          ratio = Math.max(0, Math.min(1, data.avgHum / 100));
          color = data.avgHum >= 45 && data.avgHum <= 65 ? '#3b82f6' : '#f59e0b';
        }
        break;
      case 'health': {
        const s = data.healthScores;
        if (s?.length) {
          const avg = s.reduce((a, b) => a + b, 0) / s.length;
          ratio = avg / 10;
          color = avg >= 7 ? '#10b981' : avg >= 5 ? '#eab308' : '#ef4444';
        }
        break;
      }
      default:
        ratio = Math.min(1, (data.dataPoints || 0) / 1000);
        color = currentTheme.accent.color;
    }
    return { height: Math.round(ratio * 100), color };
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  };

  const filters = [
    { value: 'all', label: 'Alle', icon: Layers, color: currentTheme.accent.color },
    { value: 'water', label: 'Wasser', icon: Droplets, color: '#3b82f6' },
    { value: 'nutrient', label: 'Nährstoffe', icon: FlaskConical, color: '#a855f7' },
    { value: 'growth', label: 'Messungen', icon: TrendingUp, color: '#06b6d4' },
    { value: 'lifecycle', label: 'Events', icon: Sprout, color: '#10b981' }
  ];

  if (loading) {
    return (
      <div className="rounded-3xl p-6 border" style={{ backgroundColor: `${currentTheme.bg.card}90`, borderColor: currentTheme.border.default }}>
        <Skeleton className="h-10 w-64 mb-4" />
        <div className="grid grid-cols-7 gap-2">
          {[...Array(35)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div
        className="flex flex-wrap justify-between items-center gap-3 p-4 rounded-2xl border backdrop-blur-sm"
        style={{ backgroundColor: `${currentTheme.bg.card}80`, borderColor: currentTheme.border.default }}
      >
        <div className="flex items-center gap-2">
          <button onClick={goToToday}
            className="px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-105 shadow-lg text-sm"
            style={{ background: `linear-gradient(135deg, ${currentTheme.accent.color}, ${currentTheme.accent.color}cc)`, color: '#fff' }}
          >
            <Target size={14} /> Heute
          </button>
          {/* Metrik Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: currentTheme.bg.hover }}>
            {METRIC_OPTIONS.map(m => (
              <button key={m.value} onClick={() => setHeatmapMetric(m.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${heatmapMetric === m.value ? 'shadow-sm' : 'opacity-50 hover:opacity-80'}`}
                style={{
                  backgroundColor: heatmapMetric === m.value ? currentTheme.bg.card : 'transparent',
                  color: currentTheme.text.secondary
                }}
              >
                <m.icon size={12} /> <span className="hidden md:inline">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {filters.map(f => (
            <button key={f.value} onClick={() => setFilterType(f.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filterType === f.value ? 'shadow-lg scale-105' : 'opacity-50 hover:opacity-100'}`}
              style={{
                backgroundColor: filterType === f.value ? `${f.color}20` : 'transparent',
                color: f.color,
                borderWidth: '1px',
                borderColor: filterType === f.value ? f.color : 'transparent'
              }}
            >
              <f.icon size={12} /> <span className="hidden sm:inline">{f.label}</span>
            </button>
          ))}
        </div>

        <button onClick={onAddEvent}
          className="px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-105 shadow-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm"
        >
          <Plus size={16} /> Neuer Eintrag
        </button>
      </div>

      {/* Calendar Grid */}
      <div
        className="rounded-3xl p-4 md:p-6 border shadow-2xl backdrop-blur-sm"
        style={{ backgroundColor: `${currentTheme.bg.card}90`, borderColor: 'rgba(255,255,255,0.05)' }}
      >
        {/* Week Headers */}
        <div className="grid grid-cols-7 mb-3">
          {WEEK_DAYS.map((d, idx) => (
            <div key={d} className={`text-center py-2 text-xs font-bold uppercase tracking-wider ${idx >= 5 ? 'opacity-40' : ''}`} style={{ color: currentTheme.text.muted }}>
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1.5 md:gap-2">
          {[...Array(firstDay)].map((_, i) => (
            <div key={`e-${i}`} className="aspect-square rounded-xl opacity-10" style={{ backgroundColor: currentTheme.bg.hover }} />
          ))}

          {[...Array(days)].map((_, i) => {
            const day = i + 1;
            const dayEvents = getEventsForDay(day);
            const today = isToday(day);
            const isSelected = selectedDate && day === selectedDate.getDate() && currentDate.getMonth() === selectedDate.getMonth();
            const isHovered = hoveredDay === day;
            const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const heatColor = getHeatmapColor(dayStr);
            const bar = getMetricBar(dayStr);
            const heatData = monthHeatmap[dayStr];

            return (
              <div key={day}
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`relative aspect-square p-1.5 md:p-2 rounded-xl md:rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden
                  ${today ? 'ring-2 ring-offset-1 ring-offset-transparent' : ''}
                  ${isSelected ? 'scale-105 shadow-xl z-10' : 'hover:scale-[1.03]'}
                `}
                style={{
                  backgroundColor: heatColor || (today ? `${currentTheme.accent.color}10` : isSelected ? `${currentTheme.accent.color}08` : isHovered ? `${currentTheme.bg.hover}60` : 'transparent'),
                  borderWidth: '1px',
                  borderColor: today ? currentTheme.accent.color : isSelected ? `${currentTheme.accent.color}40` : heatColor ? 'rgba(255,255,255,0.03)' : 'transparent',
                  ringColor: today ? currentTheme.accent.color : 'transparent'
                }}
                title={heatData?.hasData ? `${heatData.dataPoints} Datenpunkte${heatData.avgTemp ? ` • Ø ${heatData.avgTemp.toFixed(1)}°C` : ''}${heatData.avgHum ? ` • Ø ${heatData.avgHum.toFixed(0)}%` : ''}` : ''}
              >
                {/* Metrik-Bar (Hintergrund) */}
                {bar.height > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 rounded-b-xl transition-all duration-500" style={{
                    height: `${bar.height * 0.4}%`,
                    backgroundColor: `${bar.color}15`,
                    borderTop: `2px solid ${bar.color}30`
                  }} />
                )}

                {/* Day Number */}
                <div className="relative flex justify-between items-start mb-0.5">
                  <span
                    className={`text-xs md:text-sm font-bold w-6 h-6 flex items-center justify-center rounded-lg transition-all ${today ? 'shadow-lg' : ''}`}
                    style={{
                      backgroundColor: today ? currentTheme.accent.color : 'transparent',
                      color: today ? '#fff' : isSelected ? currentTheme.accent.color : currentTheme.text.secondary
                    }}
                  >
                    {day}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="flex items-center justify-center w-4 h-4 md:w-5 md:h-5 rounded-full text-[9px] md:text-[10px] font-bold"
                      style={{ background: `linear-gradient(135deg, ${currentTheme.accent.color}, ${currentTheme.accent.color}aa)`, color: '#fff' }}
                    >
                      {dayEvents.length}
                    </div>
                  )}
                </div>

                {/* Event Dots */}
                <div className="relative flex-1 overflow-hidden">
                  <div className="flex flex-wrap gap-0.5">
                    {dayEvents.slice(0, 5).map((evt, idx) => {
                      const style = getEventStyle(evt.type);
                      return (
                        <div key={idx} className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" style={{ backgroundColor: style.text }} />
                      );
                    })}
                  </div>
                  {/* Desktop: Zeige ersten Event-Titel */}
                  {dayEvents.length > 0 && (
                    <div className="hidden lg:block mt-1">
                      <div className="text-[9px] truncate" style={{ color: getEventStyle(dayEvents[0].type).text }}>
                        {dayEvents[0].title}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
