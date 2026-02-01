import React from 'react';
import { useTheme } from '../../theme';
import { FlaskConical, Droplet, Beaker, Calendar, Zap, Leaf } from 'lucide-react';

export default function NutrientHero({ sensors, currentWeek, currentPhase, plants, onDose }) {
  const { currentTheme } = useTheme();

  const stats = [
    {
      icon: Droplet,
      label: 'EC-Wert',
      value: sensors.ec > 0 ? sensors.ec.toFixed(2) : '--',
      unit: 'mS/cm',
      color: '#f59e0b',
      status: sensors.ec > 0 ? (sensors.ec > 2.5 ? 'high' : sensors.ec < 0.4 ? 'low' : 'ok') : null
    },
    {
      icon: Beaker,
      label: 'pH-Wert',
      value: sensors.ph > 0 ? sensors.ph.toFixed(1) : '--',
      unit: '',
      color: '#3b82f6',
      status: sensors.ph > 0 ? (sensors.ph < 5.8 ? 'low' : sensors.ph > 6.8 ? 'high' : 'ok') : null
    },
    {
      icon: Calendar,
      label: 'Grow-Woche',
      value: currentWeek,
      unit: `/ 16`,
      color: currentPhase?.color || '#10b981',
      status: null
    },
    {
      icon: Leaf,
      label: 'Phase',
      value: currentPhase?.name || '--',
      unit: '',
      color: currentPhase?.color || '#10b981',
      status: null,
      isText: true
    }
  ];

  return (
    <div className="relative rounded-3xl overflow-hidden border shadow-2xl"
      style={{ borderColor: 'rgba(255,255,255,0.1)' }}>

      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-teal-500/10 to-cyan-500/15" />
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-teal-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Content */}
      <div className="relative backdrop-blur-xl p-6 md:p-8"
        style={{ backgroundColor: `${currentTheme.bg.card}85` }}>

        {/* Title Row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 shadow-lg"
              style={{ boxShadow: '0 0 30px rgba(16,185,129,0.2)' }}>
              <FlaskConical size={28} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black" style={{ color: currentTheme.text.primary }}>
                BioBizz Nahrstoffe
              </h2>
              <p className="text-sm mt-0.5" style={{ color: currentTheme.text.muted }}>
                {currentPhase?.icon} {currentPhase?.name || 'Kein aktiver Grow'} &bull; Woche {currentWeek} von 16
                {plants.length > 0 && ` &bull; ${plants.length} aktive Pflanze${plants.length > 1 ? 'n' : ''}`}
              </p>
            </div>
          </div>

          <button onClick={onDose}
            className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all hover:scale-105 text-white"
            style={{
              background: `linear-gradient(135deg, ${currentTheme.accent.color}, ${currentTheme.accent.dark || '#059669'})`,
              boxShadow: `0 4px 20px ${currentTheme.accent.color}40`
            }}>
            <Zap size={16} /> Jetzt Dungen
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat, idx) => (
            <div key={idx}
              className="relative group rounded-xl p-4 border transition-all hover:scale-[1.02]"
              style={{
                backgroundColor: `${stat.color}08`,
                borderColor: `${stat.color}20`,
                boxShadow: `0 0 0 0 ${stat.color}00`
              }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${stat.color}15` }}>
                  <stat.icon size={14} style={{ color: stat.color }} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: `${stat.color}aa` }}>
                  {stat.label}
                </span>
                {stat.status && (
                  <div className={`ml-auto w-2 h-2 rounded-full ${
                    stat.status === 'ok' ? 'bg-emerald-400' :
                    stat.status === 'high' ? 'bg-red-400' :
                    'bg-amber-400'
                  }`} style={{ boxShadow: `0 0 6px ${stat.status === 'ok' ? '#10b981' : stat.status === 'high' ? '#ef4444' : '#f59e0b'}` }} />
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`font-black ${stat.isText ? 'text-lg' : 'text-2xl'}`} style={{ color: stat.color }}>
                  {stat.value}
                </span>
                {stat.unit && (
                  <span className="text-xs font-medium" style={{ color: `${stat.color}80` }}>{stat.unit}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Dose Button */}
        <button onClick={onDose}
          className="md:hidden w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm shadow-lg transition-all text-white"
          style={{
            background: `linear-gradient(135deg, ${currentTheme.accent.color}, ${currentTheme.accent.dark || '#059669'})`,
            boxShadow: `0 4px 20px ${currentTheme.accent.color}40`
          }}>
          <Zap size={16} /> Jetzt Dungen
        </button>
      </div>
    </div>
  );
}
