import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useTheme } from '../../../theme';

/**
 * Empty State Component
 * Displayed when no data is available
 *
 * @param {string} message - Message to display
 * @param {Component} icon - Optional icon component
 */
export function EmptyState({ message = 'Keine Daten verfügbar', icon: Icon = AlertCircle }) {
  const { currentTheme } = useTheme();

  return (
    <div
      className="flex flex-col items-center justify-center p-8 rounded-lg"
      style={{
        backgroundColor: currentTheme.bg.secondary,
        borderColor: currentTheme.border.default
      }}
    >
      <Icon size={48} style={{ color: currentTheme.text.secondary, opacity: 0.5 }} className="mb-3" />
      <p className="text-sm" style={{ color: currentTheme.text.secondary }}>
        {message}
      </p>
    </div>
  );
}

export default EmptyState;
