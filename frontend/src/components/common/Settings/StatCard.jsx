import React from 'react';
import { useTheme } from '../../../theme';

/**
 * Statistics Card Component
 * Reusable card for displaying statistics
 *
 * @param {string|number} value - Statistic value
 * @param {string} label - Statistic label
 * @param {Component} icon - Optional icon component
 * @param {string} trend - Optional trend indicator ('up', 'down', 'neutral')
 */
export function StatCard({ value, label, icon: Icon, trend, className = '' }) {
  const { currentTheme } = useTheme();

  const trendColors = {
    up: currentTheme.colors.success || '#10b981',
    down: currentTheme.colors.error || '#ef4444',
    neutral: currentTheme.text.secondary
  };

  return (
    <div
      className={`p-4 rounded-lg ${className}`}
      style={{
        backgroundColor: currentTheme.bg.secondary,
        borderColor: currentTheme.border.default
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-2xl font-bold" style={{ color: currentTheme.text.primary }}>
          {value}
        </div>
        {Icon && <Icon size={24} style={{ color: currentTheme.colors.primary, opacity: 0.6 }} />}
      </div>
      <div className="text-sm" style={{ color: currentTheme.text.secondary }}>
        {label}
      </div>
      {trend && (
        <div className="text-xs mt-1" style={{ color: trendColors[trend] }}>
          {trend === 'up' && '↑ Steigend'}
          {trend === 'down' && '↓ Fallend'}
          {trend === 'neutral' && '→ Stabil'}
        </div>
      )}
    </div>
  );
}

export default StatCard;
