import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { colors } from '../../theme';

export default function StatCard({ title, value, unit, icon, iconColor, iconBg, iconBorder, trend, avg, theme, optimalRange, numericValue }) {

  // Range-Bar Berechnung (nur wenn optimalRange + numericValue vorhanden)
  const hasRange = optimalRange && numericValue !== undefined && numericValue !== null;
  let isInRange = true;
  let markerPosition = 50;

  if (hasRange) {
    isInRange = numericValue >= optimalRange.min && numericValue <= optimalRange.max;

    const rangeStart = optimalRange.criticalMin ?? (optimalRange.min * 0.5);
    const rangeEnd = optimalRange.criticalMax ?? (optimalRange.max * 1.5);
    const totalRange = rangeEnd - rangeStart;

    if (totalRange > 0) {
      markerPosition = Math.max(0, Math.min(100, ((numericValue - rangeStart) / totalRange) * 100));
    }
  }

  // Zone-Breiten berechnen (für Farbbalken)
  const getZoneWidths = () => {
    if (!hasRange) return { low: 0, optimal: 100, high: 0 };
    const rangeStart = optimalRange.criticalMin ?? (optimalRange.min * 0.5);
    const rangeEnd = optimalRange.criticalMax ?? (optimalRange.max * 1.5);
    const totalRange = rangeEnd - rangeStart;
    if (totalRange <= 0) return { low: 0, optimal: 100, high: 0 };

    const lowWidth = ((optimalRange.min - rangeStart) / totalRange) * 100;
    const optWidth = ((optimalRange.max - optimalRange.min) / totalRange) * 100;
    const highWidth = 100 - lowWidth - optWidth;
    return { low: lowWidth, optimal: optWidth, high: highWidth };
  };

  const zones = getZoneWidths();

  return (
    <div
      className="p-4 md:p-5 rounded-xl shadow-lg transition-all hover:shadow-xl border"
      style={{
        backgroundColor: theme.bg.card,
        borderColor: hasRange && !isInRange ? 'rgba(239, 68, 68, 0.3)' : theme.border.default
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <div
          className="p-2 md:p-2.5 rounded-lg border"
          style={{
            backgroundColor: iconBg,
            borderColor: iconBorder
          }}
        >
          <div style={{ color: iconColor }}>{icon}</div>
        </div>
        {trend !== undefined && (
          <div
            className="flex items-center text-xs font-bold px-2 py-1 rounded-full"
            style={{
              backgroundColor: trend > 0
                ? 'rgba(16, 185, 129, 0.1)'
                : trend < 0
                ? 'rgba(239, 68, 68, 0.1)'
                : `rgba(${theme.accent.rgb}, 0.05)`,
              color: trend > 0
                ? colors.emerald[400]
                : trend < 0
                ? colors.red[400]
                : theme.text.secondary
            }}
          >
            {trend > 0 ? <TrendingUp size={12} className="mr-1"/> :
             trend < 0 ? <TrendingDown size={12} className="mr-1"/> :
             <Minus size={12} className="mr-1"/>}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div>
        <h3
          className="text-xs uppercase tracking-wider font-semibold mb-1.5 opacity-80"
          style={{ color: theme.text.secondary }}
        >
          {title}
        </h3>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl md:text-3xl font-bold" style={{ color: theme.text.primary }}>
            {value}
          </span>
          <span className="text-sm font-medium" style={{ color: theme.text.muted }}>
            {unit}
          </span>
        </div>

        {/* Range-Bar: Zeigt wo der Wert im Optimum liegt */}
        {hasRange && (
          <div className="mt-2 mb-1">
            <div className="relative h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.bg.hover }}>
              {/* Farbzonen: rot | grün | rot */}
              <div className="absolute inset-0 flex">
                <div style={{ width: `${zones.low}%`, backgroundColor: 'rgba(239,68,68,0.25)' }} />
                <div style={{ width: `${zones.optimal}%`, backgroundColor: 'rgba(16,185,129,0.25)' }} />
                <div style={{ width: `${zones.high}%`, backgroundColor: 'rgba(239,68,68,0.25)' }} />
              </div>
              {/* Positions-Marker */}
              <div
                className="absolute top-0 h-full w-1 rounded-full transition-all duration-500"
                style={{
                  left: `${markerPosition}%`,
                  backgroundColor: isInRange ? colors.emerald[400] : colors.red[400],
                  boxShadow: `0 0 4px ${isInRange ? colors.emerald[400] : colors.red[400]}`
                }}
              />
            </div>
            {/* Min/Max Labels */}
            <div className="flex justify-between text-[9px] mt-0.5 font-mono" style={{ color: theme.text.muted }}>
              <span>{optimalRange.min}{unit}</span>
              <span>{optimalRange.max}{unit}</span>
            </div>
          </div>
        )}

        {avg && (
          <div
            className="mt-3 text-xs font-mono border-t pt-2 flex items-center justify-between"
            style={{
              color: theme.text.muted,
              borderColor: `rgba(255, 255, 255, 0.1)`
            }}
          >
            <span>Ø 4h:</span>
            <span className="font-bold" style={{ color: theme.text.secondary }}>
              {avg} {unit}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
