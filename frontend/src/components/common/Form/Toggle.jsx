import React from 'react';
import { useTheme } from '../../../theme';

/**
 * Themed Toggle Switch Component
 * Reusable toggle switch with label and helper text
 *
 * @param {string} label - Toggle label
 * @param {boolean} checked - Toggle state
 * @param {function} onChange - Change handler
 * @param {string} helper - Helper text
 * @param {boolean} disabled - Disabled state
 */
export function Toggle({ label, checked, onChange, helper, disabled = false, className = '' }) {
  const { currentTheme } = useTheme();

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{
          backgroundColor: checked ? currentTheme.colors.primary : currentTheme.bg.secondary
        }}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
          style={{ backgroundColor: '#ffffff' }}
        />
      </button>
      {(label || helper) && (
        <div className="flex-1">
          {label && (
            <label
              className="block text-sm font-medium cursor-pointer"
              style={{ color: currentTheme.text.primary }}
              onClick={() => !disabled && onChange(!checked)}
            >
              {label}
            </label>
          )}
          {helper && (
            <p
              className="text-sm opacity-60 mt-1"
              style={{ color: currentTheme.text.secondary }}
            >
              {helper}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default Toggle;
