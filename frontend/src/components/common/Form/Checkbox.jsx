import React from 'react';
import { Check } from 'lucide-react';
import { useTheme } from '../../../theme';

/**
 * Themed Checkbox Component
 * Reusable checkbox with label and helper text
 *
 * @param {string} label - Checkbox label
 * @param {boolean} checked - Checked state
 * @param {function} onChange - Change handler
 * @param {string} helper - Helper text
 * @param {boolean} disabled - Disabled state
 */
export function Checkbox({ label, checked, onChange, helper, disabled = false, className = '' }) {
  const { currentTheme } = useTheme();

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{
          borderColor: checked ? currentTheme.colors.primary : currentTheme.border.default,
          backgroundColor: checked ? currentTheme.colors.primary : 'transparent'
        }}
      >
        {checked && <Check size={14} color="#ffffff" strokeWidth={3} />}
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

export default Checkbox;
