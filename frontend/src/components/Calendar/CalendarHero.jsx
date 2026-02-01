import React, { useMemo } from 'react';
import { useTheme } from '../../theme';
import { MONTH_NAMES } from '../../hooks/useCalendarData';
import {
  Calendar as CalIcon, ChevronLeft, ChevronRight,
  Thermometer, Droplets, Wind, Sun, Sprout, Sparkles
} from 'lucide-react';

export default function CalendarHero({ currentDate, plants, monthTrends, stats, changeMonth }) {
  const { currentTheme } = useTheme();

  // Grow-Tag berechnen (vom frühesten plantedDate)
  const growInfo = useMemo(() => {
    const activePlants = (plants || []).filter(p => p._id && p.stage !== 'Leer' && p.plantedDate);
    if (activePlants.length === 0) return null;

    const earliest = activePlants
      .map(p => new Date(p.plantedDate))
      .sort((a, b) => a - b)[0];

    const dayCount = Math.floor((new Date() - earliest) / (1000 * 60 * 60 * 24));
    const phases = activePlants.map(p => p.stage);
    const currentPhase = phases.includes('Blüte') ? 'Blüte' : 'Vegetation';
    return { dayCount, currentPhase, plantCount: activePlants.length };
  }, [plants]);

  // Monatsdurchschnitte aus Trends
  const monthAvg = useMemo(() => {
    if (!monthTrends?.days?.length) return null;
    const days = monthTrends.days;
    const avg = (key) => {
      const vals = days.map(d => d[key]).filter(v => v != null);
      return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    };
    return {
      temp: avg('temp'),
      humidity: avg('humidity'),
      vpd: avg('vpd'),
      lightHours: avg('lightHours')
    };
  }, [monthTrends]);

  const heroStats = [
    {
      value: growInfo ? `Tag ${growInfo.dayCount}` : '--',
      label: growInfo ? growInfo.currentPhase : 'Kein Grow',
      color: '#10b981',
      icon: Sprout
    },
    {
      value: monthAvg?.temp != null ? `${monthAvg.temp.toFixed(1)}°` : '--',
      label: 'Ø Temperatur',
      color: '#f59e0b',
      icon: Thermometer
    },
    {
      value: monthAvg?.vpd != null ? `${monthAvg.vpd.toFixed(2)}` : '--',
      label: 'Ø VPD (kPa)',
      color: '#a855f7',
      icon: Wind
    },
    {
      value: monthAvg?.lightHours != null ? `${monthAvg.lightHours.toFixed(1)}h` : '--',
      label: 'Ø Lichtstunden',
      color: '#eab308',
      icon: Sun
    }
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl">
      {/* Animated BG */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-fuchsia-500/10 to-cyan-500/20" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div
        className="relative backdrop-blur-xl border shadow-2xl p-6 md:p-8"
        style={{ backgroundColor: `${currentTheme.bg.card}90`, borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          {/* Title & Nav */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl blur-lg opacity-50" />
              <div className="relative p-4 md:p-5 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-xl">
                <CalIcon size={32} className="text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:scale-110">
                  <ChevronLeft size={20} style={{ color: currentTheme.text.muted }} />
                </button>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: currentTheme.text.primary }}>
                  {MONTH_NAMES[currentDate.getMonth()]}
                  <span className="ml-3 text-xl md:text-2xl font-light opacity-50">{currentDate.getFullYear()}</span>
                </h1>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:scale-110">
                  <ChevronRight size={20} style={{ color: currentTheme.text.muted }} />
                </button>
              </div>
              <p className="text-sm flex items-center gap-2" style={{ color: currentTheme.text.muted }}>
                <Sparkles size={14} className="text-yellow-400" />
                {stats.total} Einträge &bull; {growInfo ? `${growInfo.plantCount} Pflanze${growInfo.plantCount > 1 ? 'n' : ''} aktiv` : 'Kein aktiver Grow'}
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full lg:w-auto">
            {heroStats.map((stat, idx) => (
              <div key={idx} className="relative group">
                <div className="absolute inset-0 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity" style={{ backgroundColor: stat.color }} />
                <div
                  className="relative p-3 md:p-4 rounded-2xl border backdrop-blur-sm text-center transition-all group-hover:scale-105"
                  style={{ backgroundColor: `${stat.color}12`, borderColor: `${stat.color}25` }}
                >
                  <stat.icon size={16} className="mx-auto mb-1.5" style={{ color: stat.color }} />
                  <div className="text-lg md:text-xl font-black" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-[10px] uppercase tracking-wider opacity-70" style={{ color: stat.color }}>{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
