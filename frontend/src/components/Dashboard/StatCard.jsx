import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { colors } from '../../theme';

export default function StatCard({ title, value, unit, icon, iconColor, iconBg, iconBorder, trend, avg, theme }) {
  return (
    <div
      className="p-4 md:p-5 rounded-xl shadow-lg transition-all hover:shadow-xl border"
      style={{
        backgroundColor: theme.bg.card,
        borderColor: theme.border.default
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