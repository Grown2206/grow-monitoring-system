import React, { useState, useMemo } from 'react';
import { useTheme } from '../../theme';
import {
  BIOBIZZ_PRODUCTS, BIOBIZZ_SCHEDULE, GROWTH_PHASES, getPhaseForWeek
} from '../../constants/biobizz';
import { Calendar, Eye, EyeOff, Info, ChevronLeft, ChevronRight } from 'lucide-react';

export default function BioBizzSchedule({ currentWeek, currentPhase, inventory }) {
  const { currentTheme } = useTheme();
  const [showAll, setShowAll] = useState(true);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [mobileOffset, setMobileOffset] = useState(0);

  // Filter Produkte: nur die, die der User besitzt (oder alle zeigen)
  const visibleProducts = useMemo(() => {
    if (showAll) return BIOBIZZ_PRODUCTS;
    return BIOBIZZ_PRODUCTS.filter(p => inventory[p.id]?.owned);
  }, [showAll, inventory]);

  // Phasen-Gruppen fur Header
  const phaseGroups = useMemo(() => {
    const groups = [];
    let currentGroup = null;

    BIOBIZZ_SCHEDULE.forEach(s => {
      if (!currentGroup || currentGroup.phase !== s.phase) {
        currentGroup = { phase: s.phase, weeks: [s.week], phaseData: getPhaseForWeek(s.week) };
        groups.push(currentGroup);
      } else {
        currentGroup.weeks.push(s.week);
      }
    });
    return groups;
  }, []);

  // Intensitat berechnen (0-1) fur Zellen-Farbung
  const getIntensity = (ml) => {
    if (!ml) return 0;
    return Math.min(1, ml / 5); // 5 ml/L = 100% Intensitat
  };

  // Mobile: sichtbare Wochen
  const mobileWeeks = useMemo(() => {
    const center = Math.max(1, Math.min(16, currentWeek + mobileOffset));
    const start = Math.max(1, center - 2);
    const end = Math.min(16, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentWeek, mobileOffset]);

  return (
    <div className="rounded-3xl border shadow-2xl backdrop-blur-sm overflow-hidden"
      style={{ backgroundColor: `${currentTheme.bg.card}95`, borderColor: 'rgba(255,255,255,0.05)' }}>

      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: currentTheme.border.default }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
            <Calendar size={18} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: currentTheme.text.primary }}>
              BioBizz Dungeplan
            </h3>
            <p className="text-xs" style={{ color: currentTheme.text.muted }}>
              16-Wochen Zeitplan &bull; Light Mix &bull; Werte in ml/L
            </p>
          </div>
        </div>
        <button onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ backgroundColor: currentTheme.bg.hover, color: currentTheme.text.secondary }}>
          {showAll ? <Eye size={14} /> : <EyeOff size={14} />}
          {showAll ? 'Alle' : 'Nur vorhandene'}
        </button>
      </div>

      {/* Legende */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex flex-wrap gap-2">
          {GROWTH_PHASES.map(phase => (
            <div key={phase.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium"
              style={{
                backgroundColor: currentPhase?.id === phase.id ? `${phase.color}20` : currentTheme.bg.hover,
                color: phase.color,
                borderWidth: currentPhase?.id === phase.id ? 1 : 0,
                borderColor: `${phase.color}40`
              }}>
              <span>{phase.icon}</span>
              <span>{phase.name}</span>
              <span style={{ color: currentTheme.text.muted }}>W{phase.weeks[0]}-{phase.weeks[phase.weeks.length - 1]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden flex items-center justify-between px-5 py-2">
        <button onClick={() => setMobileOffset(o => o - 3)}
          disabled={mobileWeeks[0] <= 1}
          className="p-2 rounded-lg transition-colors disabled:opacity-30"
          style={{ backgroundColor: currentTheme.bg.hover, color: currentTheme.text.secondary }}>
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-bold" style={{ color: currentTheme.text.muted }}>
          Woche {mobileWeeks[0]} - {mobileWeeks[mobileWeeks.length - 1]}
        </span>
        <button onClick={() => setMobileOffset(o => o + 3)}
          disabled={mobileWeeks[mobileWeeks.length - 1] >= 16}
          className="p-2 rounded-lg transition-colors disabled:opacity-30"
          style={{ backgroundColor: currentTheme.bg.hover, color: currentTheme.text.secondary }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Matrix - Desktop */}
      <div className="hidden md:block overflow-x-auto px-5 pb-5">
        <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
          {/* Phasen-Header */}
          <thead>
            <tr>
              <th className="w-32" />
              {phaseGroups.map(group => (
                <th key={group.phase} colSpan={group.weeks.length}
                  className="text-center py-2 text-[10px] font-bold uppercase tracking-wider border-b"
                  style={{
                    color: group.phaseData.color,
                    borderColor: `${group.phaseData.color}30`,
                    backgroundColor: `${group.phaseData.color}08`
                  }}>
                  {group.phaseData.icon} {group.phaseData.name}
                </th>
              ))}
            </tr>
            {/* Wochen-Nummern */}
            <tr>
              <th className="text-left py-2 pr-3">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: currentTheme.text.muted }}>
                  Produkt
                </span>
              </th>
              {BIOBIZZ_SCHEDULE.map(s => {
                const isCurrentWeek = s.week === currentWeek;
                return (
                  <th key={s.week}
                    className={`text-center py-2 text-[10px] font-bold w-12 ${isCurrentWeek ? 'relative' : ''}`}
                    style={{
                      color: isCurrentWeek ? currentTheme.accent.color : currentTheme.text.muted,
                      backgroundColor: isCurrentWeek ? `${currentTheme.accent.color}10` : 'transparent'
                    }}>
                    W{s.week}
                    {isCurrentWeek && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                        style={{ backgroundColor: currentTheme.accent.color }} />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Produkt-Zeilen */}
          <tbody>
            {visibleProducts.map(product => (
              <tr key={product.id} className="group">
                <td className="py-1.5 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 rounded-full" style={{ backgroundColor: product.color }} />
                    <product.icon size={13} style={{ color: product.color }} />
                    <span className="text-xs font-medium truncate" style={{ color: product.color }}>
                      {product.shortName}
                    </span>
                  </div>
                </td>
                {BIOBIZZ_SCHEDULE.map(s => {
                  const ml = s.products[product.id];
                  const intensity = getIntensity(ml);
                  const isCurrentWeek = s.week === currentWeek;
                  const isHovered = hoveredCell?.product === product.id && hoveredCell?.week === s.week;

                  return (
                    <td key={s.week} className="text-center py-1.5 relative"
                      onMouseEnter={() => setHoveredCell({ product: product.id, week: s.week })}
                      onMouseLeave={() => setHoveredCell(null)}>
                      <div className={`mx-auto w-10 h-7 rounded-md flex items-center justify-center text-[11px] font-bold transition-all cursor-default ${isCurrentWeek ? 'ring-1' : ''}`}
                        style={{
                          backgroundColor: ml ? `${product.color}${Math.round(intensity * 35 + 5).toString(16).padStart(2, '0')}` : 'transparent',
                          color: ml ? product.color : `${currentTheme.text.muted}30`,
                          ringColor: isCurrentWeek ? currentTheme.accent.color : 'transparent',
                          transform: isHovered && ml ? 'scale(1.15)' : 'scale(1)',
                          boxShadow: isHovered && ml ? `0 0 12px ${product.color}30` : 'none'
                        }}>
                        {ml || '-'}
                      </div>

                      {/* Tooltip */}
                      {isHovered && ml && (
                        <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2.5 py-1.5 rounded-lg text-[10px] whitespace-nowrap shadow-xl border"
                          style={{
                            backgroundColor: currentTheme.bg.card,
                            borderColor: `${product.color}30`,
                            color: currentTheme.text.primary
                          }}>
                          <span style={{ color: product.color }} className="font-bold">{product.name}</span>
                          <span style={{ color: currentTheme.text.muted }}> &bull; {ml} ml/L</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* EC-Zielzeile */}
            <tr>
              <td className="py-2 pr-3 border-t" style={{ borderColor: currentTheme.border.default }}>
                <span className="text-[10px] font-bold uppercase" style={{ color: currentTheme.text.muted }}>EC Ziel</span>
              </td>
              {BIOBIZZ_SCHEDULE.map(s => (
                <td key={s.week} className="text-center py-2 border-t" style={{ borderColor: currentTheme.border.default }}>
                  <span className="text-[10px] font-mono" style={{ color: currentTheme.text.muted }}>
                    {s.ecTarget.min}-{s.ecTarget.max}
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Matrix - Mobile */}
      <div className="md:hidden px-5 pb-5">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2 pr-2">
                <span className="text-[10px] font-bold uppercase" style={{ color: currentTheme.text.muted }}>Produkt</span>
              </th>
              {mobileWeeks.map(w => {
                const isCurrentWeek = w === currentWeek;
                return (
                  <th key={w} className="text-center py-2 text-[10px] font-bold"
                    style={{ color: isCurrentWeek ? currentTheme.accent.color : currentTheme.text.muted }}>
                    W{w}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleProducts.map(product => (
              <tr key={product.id}>
                <td className="py-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-5 rounded-full" style={{ backgroundColor: product.color }} />
                    <span className="text-[11px] font-medium truncate" style={{ color: product.color }}>
                      {product.shortName}
                    </span>
                  </div>
                </td>
                {mobileWeeks.map(w => {
                  const schedule = BIOBIZZ_SCHEDULE.find(s => s.week === w);
                  const ml = schedule?.products[product.id];
                  const intensity = getIntensity(ml);
                  const isCurrentWeek = w === currentWeek;

                  return (
                    <td key={w} className="text-center py-1">
                      <div className={`mx-auto w-9 h-6 rounded flex items-center justify-center text-[10px] font-bold ${isCurrentWeek ? 'ring-1' : ''}`}
                        style={{
                          backgroundColor: ml ? `${product.color}${Math.round(intensity * 35 + 5).toString(16).padStart(2, '0')}` : 'transparent',
                          color: ml ? product.color : `${currentTheme.text.muted}30`,
                          ringColor: isCurrentWeek ? currentTheme.accent.color : 'transparent'
                        }}>
                        {ml || '-'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Wochen-Info Footer */}
      {currentWeek <= 16 && (
        <div className="px-5 pb-5">
          <div className="rounded-xl p-4 border" style={{
            backgroundColor: `${currentPhase?.color}08`,
            borderColor: `${currentPhase?.color}20`
          }}>
            <div className="flex items-start gap-2">
              <Info size={14} className="mt-0.5 flex-shrink-0" style={{ color: currentPhase?.color }} />
              <div>
                <span className="text-xs font-bold" style={{ color: currentPhase?.color }}>
                  Woche {currentWeek} - {currentPhase?.name}
                </span>
                <p className="text-[11px] mt-0.5" style={{ color: currentTheme.text.muted }}>
                  {BIOBIZZ_SCHEDULE.find(s => s.week === currentWeek)?.notes || 'Keine besonderen Hinweise.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
