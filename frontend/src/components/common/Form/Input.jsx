import React from 'react';
import { useTheme } from '../../../theme';

/**
 * Themed Input Component
 * Reusable text input with label, error, and helper text support
 *
 * @param {string} label - Input label
 * @param {string} error - Error message to display
 * @param {string} helper - Helper text
 * @param {object} ...props - Additional input props
 */
export function Input({ label, error, helper, className = '', ...props }) {
  const { currentTheme } = useTheme();

  return (
    <div className="space-y-1">
      {label && (
        <label
          className="block text-sm font-medium"
          style={{ color: currentTheme.text.primary }}
        >
          {label}
        </label>
      )}
      <input
        style={{
          backgroundColor: currentTheme.bg.input,
          borderColor: error ? currentTheme.colors.error : currentTheme.border.default,
          color: currentTheme.text.primary
        }}
        className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors ${className}`}
        {...props}
      />
      {error && (
        <p className="text-sm" style={{ color: currentTheme.colors.error }}>
          {error}
        </p>
      )}
      {helper && !error && (
        <p
          className="text-sm opacity-60"
          style={{ color: currentTheme.text.secondary }}
        >
          {helper}
        </p>
      )}
    </div>
  );
}

export default Input;
