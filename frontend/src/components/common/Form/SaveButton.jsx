import React from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { useTheme } from '../../../theme';

/**
 * Save Button Component
 * Reusable save button with loading state
 *
 * @param {function} onClick - Click handler
 * @param {boolean} loading - Loading state
 * @param {boolean} disabled - Disabled state
 * @param {string} label - Button label (default: "Speichern")
 * @param {string} loadingLabel - Loading label (default: "Speichern...")
 */
export function SaveButton({
  onClick,
  loading = false,
  disabled = false,
  label = 'Speichern',
  loadingLabel = 'Speichern...',
  className = ''
}) {
  const { currentTheme } = useTheme();

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
      } ${className}`}
      style={{
        backgroundColor: currentTheme.colors.primary,
        color: '#ffffff'
      }}
    >
      {loading ? (
        <>
          <RefreshCw size={18} className="animate-spin" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          <Save size={18} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

export default SaveButton;
