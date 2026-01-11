import React from 'react';
import { Power } from 'lucide-react';

export default function RelaySwitch({ label, subLabel, isOn, onToggle, disabled, icon, color, warning }) {
  
  const handleClick = () => {
    // Sicherheitsabfrage bei Warnung (z.B. Pumpe an)
    if (!isOn && warning && !disabled) {
      if (!window.confirm(`${label} wirklich einschalten? Bitte Wasserstand prüfen!`)) return;
    }
    onToggle();
  };

  return (
    <div className={`
      relative p-4 rounded-xl border transition-all duration-300 flex items-center justify-between gap-4 group
      ${isOn 
        ? 'bg-slate-800/80 border-slate-600 shadow-md' 
        : 'bg-slate-950 border-slate-800 hover:border-slate-700'}
      ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
    `}>
      
      {/* Icon Container */}
      <div className={`
        p-3 rounded-lg transition-colors duration-300
        ${isOn ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-600'}
      `}>
        {icon || <Power size={24} />}
      </div>

      {/* Text Labels */}
      <div className="flex-1 min-w-0">
        <h4 className={`font-bold text-sm truncate ${isOn ? 'text-white' : 'text-slate-400'}`}>
          {label}
        </h4>
        {subLabel && (
          <p className="text-xs text-slate-500 truncate">{subLabel}</p>
        )}
      </div>

      {/* Schalter UI */}
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`
          relative w-12 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500
          ${isOn ? 'bg-emerald-600' : 'bg-slate-700'}
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300
            ${isOn ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>

      {/* Grüner Status-Punkt wenn an */}
      <div className={`
        absolute top-2 right-2 w-1.5 h-1.5 rounded-full transition-colors
        ${isOn ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'bg-slate-800'}
      `}></div>
    </div>
  );
}