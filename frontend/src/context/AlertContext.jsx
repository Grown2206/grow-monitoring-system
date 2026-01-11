import React, { createContext, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, X, Info, AlertTriangle } from 'lucide-react';

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState(null); // { message, type: 'success' | 'error' | 'warning' | 'info' }

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    // Unterschiedliche Timeouts je nach Wichtigkeit
    const timeoutDuration = type === 'error' ? 5000 : 3000;
    setTimeout(() => setAlert(null), timeoutDuration);
  };

  const getIcon = (type) => {
    switch(type) {
      case 'success': return <CheckCircle2 size={20} />;
      case 'error': return <AlertCircle size={20} />;
      case 'warning': return <AlertTriangle size={20} />;
      case 'info': return <Info size={20} />;
      default: return <CheckCircle2 size={20} />;
    }
  };

  const getStyles = (type) => {
    switch(type) {
      case 'success': return 'bg-slate-900 border-emerald-500/50 text-emerald-400';
      case 'error': return 'bg-slate-900 border-red-500/50 text-red-400';
      case 'warning': return 'bg-slate-900 border-amber-500/50 text-amber-400';
      case 'info': return 'bg-slate-900 border-blue-500/50 text-blue-400';
      default: return 'bg-slate-900 border-emerald-500/50 text-emerald-400';
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alert && (
        <div className="fixed bottom-4 right-4 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${getStyles(alert.type)}`}>
            {getIcon(alert.type)}
            <span className="font-medium text-slate-200">{alert.message}</span>
            <button onClick={() => setAlert(null)} className="ml-2 hover:bg-white/10 p-1 rounded transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};