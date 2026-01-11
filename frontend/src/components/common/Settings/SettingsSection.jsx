import React from 'react';
import { useTheme } from '../../../theme';

/**
 * Settings Section Component
 * Reusable card container for settings with optional icon and title
 *
 * @param {string} title - Section title
 * @param {Component} icon - Lucide icon component
 * @param {ReactNode} children - Section content
 * @param {string} className - Additional CSS classes
 */
export function SettingsSection({ title, icon: Icon, children, className = '' }) {
  const { currentTheme } = useTheme();

  return (
    <div
      className={`rounded-lg border p-6 ${className}`}
      style={{
        backgroundColor: currentTheme.bg.card,
        borderColor: currentTheme.border.default
      }}
    >
      {title && (
        <div className="flex items-center gap-3 mb-4">
          {Icon && <Icon size={24} style={{ color: currentTheme.colors.primary }} />}
          <h3 className="text-lg font-semibold" style={{ color: currentTheme.text.primary }}>
            {title}
          </h3>
        </div>
      )}
      {children}
    </div>
  );
}

export default SettingsSection;
