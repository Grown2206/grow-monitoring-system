import React, { useState, useEffect } from 'react';
import {
  Zap, Camera, Droplets, Sun, Power, Bell, RefreshCcw,
  Thermometer, Fan, Settings, ChevronRight, Sparkles,
  Timer, Target, Activity, Loader2
} from 'lucide-react';
import { api, controlsAPI } from '../../utils/api';
import toast from '../../utils/toast';

/**
 * QuickActionsBar - Schnellzugriff auf häufige Aktionen
 * Glassmorphism Design mit animierten Interaktionen
 */
const QuickActionsBar = ({ theme, changeTab, onRefresh }) => {
  const [actions, setActions] = useState([]);
  const [loadingAction, setLoadingAction] = useState(null);
  const [relayStates, setRelayStates] = useState({});
  const [suggestions, setSuggestions] = useState([]);

  // Basis-Aktionen definieren
  const baseActions = [
    {
      id: 'snapshot',
      icon: Camera,
      label: 'Snapshot',
      color: '#8b5cf6',
      description: 'Kamera-Foto aufnehmen',
      action: async () => {
        // Trigger camera snapshot
        toast.success('Snapshot wird aufgenommen...');
        // In real implementation, call camera API
      }
    },
    {
      id: 'refresh',
      icon: RefreshCcw,
      label: 'Refresh',
      color: '#06b6d4',
      description: 'Daten aktualisieren',
      action: async () => {
        if (onRefresh) await onRefresh();
        toast.success('Daten aktualisiert');
      }
    },
    {
      id: 'light',
      icon: Sun,
      label: 'Licht',
      color: '#f59e0b',
      description: 'Beleuchtung toggle',
      isToggle: true,
      relayId: 'light'
    },
    {
      id: 'fan',
      icon: Fan,
      label: 'Lüfter',
      color: '#3b82f6',
      description: 'Ventilator toggle',
      isToggle: true,
      relayId: 'fan'
    },
    {
      id: 'pump',
      icon: Droplets,
      label: 'Pumpe',
      color: '#14b8a6',
      description: 'Wasserpumpe toggle',
      isToggle: true,
      relayId: 'pump'
    },
    {
      id: 'heater',
      icon: Thermometer,
      label: 'Heizung',
      color: '#ef4444',
      description: 'Heizung toggle',
      isToggle: true,
      relayId: 'heater'
    }
  ];

  useEffect(() => {
    loadRelayStates();
    generateSmartSuggestions();
  }, []);

  const loadRelayStates = async () => {
    try {
      const state = await controlsAPI.getDeviceState();
      if (state?.relays) {
        setRelayStates(state.relays);
      }
    } catch (e) {
      console.log('Relay states not available');
    }
  };

  const generateSmartSuggestions = () => {
    // Basierend auf Tageszeit und Kontext
    const hour = new Date().getHours();
    const newSuggestions = [];

    if (hour >= 6 && hour < 10) {
      newSuggestions.push({
        id: 'morning-light',
        text: 'Morgenlicht aktivieren',
        action: 'light',
        icon: Sun
      });
    }
    if (hour >= 20 || hour < 6) {
      newSuggestions.push({
        id: 'night-mode',
        text: 'Nachtmodus',
        action: 'night',
        icon: Timer
      });
    }

    setSuggestions(newSuggestions);
  };

  const handleAction = async (action) => {
    setLoadingAction(action.id);

    try {
      if (action.isToggle && action.relayId) {
        const currentState = relayStates[action.relayId];
        const newState = !currentState;

        // Toggle relay via API
        await controlsAPI.toggleRelay(action.relayId, newState);
        setRelayStates(prev => ({ ...prev, [action.relayId]: newState }));
        toast.success(`${action.label} ${newState ? 'eingeschaltet' : 'ausgeschaltet'}`);
      } else if (action.action) {
        await action.action();
      }
    } catch (e) {
      toast.error(`Fehler: ${e.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Glassmorphism Action Button
  const ActionButton = ({ action }) => {
    const Icon = action.icon;
    const isActive = action.isToggle && relayStates[action.relayId];
    const isLoading = loadingAction === action.id;

    return (
      <button
        onClick={() => handleAction(action)}
        disabled={isLoading}
        className="group relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 min-w-[80px]"
        style={{
          background: isActive
            ? `linear-gradient(135deg, ${action.color}30 0%, ${action.color}10 100%)`
            : `rgba(${theme.accent.rgb}, 0.05)`,
          border: `1px solid ${isActive ? action.color : theme.border.default}`,
          boxShadow: isActive
            ? `0 8px 32px ${action.color}30`
            : '0 4px 16px rgba(0,0,0,0.1)'
        }}
      >
        {/* Glow Effect */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at center, ${action.color}20 0%, transparent 70%)`
          }}
        />

        {/* Icon Container */}
        <div
          className="relative p-3 rounded-xl transition-all duration-300"
          style={{
            backgroundColor: isActive ? `${action.color}25` : `${action.color}15`,
            transform: isLoading ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        >
          {isLoading ? (
            <Loader2
              size={22}
              className="animate-spin"
              style={{ color: action.color }}
            />
          ) : (
            <Icon
              size={22}
              style={{ color: action.color }}
            />
          )}
        </div>

        {/* Label */}
        <span
          className="text-xs font-semibold"
          style={{ color: isActive ? action.color : theme.text.secondary }}
        >
          {action.label}
        </span>

        {/* Active Indicator */}
        {isActive && (
          <div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: action.color }}
          />
        )}
      </button>
    );
  };

  // Navigation Quick Links
  const QuickLink = ({ icon: Icon, label, tab, color }) => (
    <button
      onClick={() => changeTab(tab)}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 hover:scale-105"
      style={{
        background: `linear-gradient(135deg, ${color}15 0%, transparent 100%)`,
        border: `1px solid ${theme.border.default}`
      }}
    >
      <Icon size={16} style={{ color }} />
      <span className="text-sm font-medium" style={{ color: theme.text.secondary }}>
        {label}
      </span>
      <ChevronRight size={14} style={{ color: theme.text.muted }} />
    </button>
  );

  return (
    <div
      className="rounded-3xl overflow-hidden border"
      style={{
        background: `linear-gradient(135deg, ${theme.bg.card} 0%, rgba(${theme.accent.rgb}, 0.03) 100%)`,
        borderColor: theme.border.default,
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(20px)'
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 border-b flex items-center justify-between"
        style={{ borderColor: theme.border.light }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-xl"
            style={{ backgroundColor: `${theme.accent.color}15` }}
          >
            <Zap size={20} style={{ color: theme.accent.color }} />
          </div>
          <div>
            <h3
              className="font-bold text-sm"
              style={{ color: theme.text.primary }}
            >
              Quick Actions
            </h3>
            <p
              className="text-xs"
              style={{ color: theme.text.muted }}
            >
              Schnellzugriff auf häufige Aktionen
            </p>
          </div>
        </div>

        {/* Smart Suggestion Badge */}
        {suggestions.length > 0 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: `${theme.accent.color}15`,
              border: `1px solid ${theme.accent.color}30`
            }}
          >
            <Sparkles size={12} style={{ color: theme.accent.color }} />
            <span
              className="text-xs font-medium"
              style={{ color: theme.accent.color }}
            >
              {suggestions.length} Vorschlag{suggestions.length > 1 ? 'e' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Actions Grid */}
      <div className="p-4">
        <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
          {baseActions.map(action => (
            <ActionButton key={action.id} action={action} />
          ))}
        </div>
      </div>

      {/* Quick Navigation Links */}
      <div
        className="px-5 py-4 border-t"
        style={{ borderColor: theme.border.light }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Target size={14} style={{ color: theme.text.muted }} />
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: theme.text.muted }}
          >
            Schnellnavigation
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <QuickLink
            icon={Activity}
            label="Analyse"
            tab="analytics"
            color="#10b981"
          />
          <QuickLink
            icon={Settings}
            label="Automation"
            tab="automation"
            color="#8b5cf6"
          />
          <QuickLink
            icon={Bell}
            label="Alerts"
            tab="alerts"
            color="#f59e0b"
          />
          <QuickLink
            icon={Camera}
            label="Timelapse"
            tab="timelapse"
            color="#06b6d4"
          />
        </div>
      </div>

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <div
          className="px-5 py-4 border-t"
          style={{
            borderColor: theme.border.light,
            background: `linear-gradient(135deg, ${theme.accent.color}08 0%, transparent 100%)`
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} style={{ color: theme.accent.color }} />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: theme.accent.light }}
            >
              Smart Vorschläge
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map(suggestion => {
              const SugIcon = suggestion.icon;
              return (
                <button
                  key={suggestion.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${theme.accent.color}20 0%, ${theme.accent.color}10 100%)`,
                    border: `1px solid ${theme.accent.color}40`
                  }}
                >
                  <SugIcon size={14} style={{ color: theme.accent.color }} />
                  <span
                    className="text-sm font-medium"
                    style={{ color: theme.accent.light }}
                  >
                    {suggestion.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickActionsBar;
