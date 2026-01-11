import React from 'react';
import { useTheme } from '../../../theme';

/**
 * Themed Select Component
 * Reusable select dropdown with label, error, and helper text support
 *
 * @param {string} label - Select label
 * @param {string} error - Error message to display
 * @param {string} helper - Helper text
 * @param {array} options - Array of {value, label} objects
 * @param {object} ...props - Additional select props
 */
export function Select({ label, error, helper, options = [], className = '', ...props }) {
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
      <select
        style={{
          backgroundColor: currentTheme.bg.input,
          borderColor: error ? currentTheme.colors.error : currentTheme.border.default,
          color: currentTheme.text.primary
        }}
        className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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

export default Select;
