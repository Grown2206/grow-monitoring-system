import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, Lightbulb, AlertTriangle, CheckCircle, X,
  ArrowRight, Clock, Thermometer, Droplets, Sun, Wind,
  TrendingUp, TrendingDown, Target, Zap, RefreshCcw,
  ChevronDown, ChevronUp, Bell, Settings, Leaf, Timer
} from 'lucide-react';
import { useTheme } from '../../theme';
import { useSensorAverages } from '../../hooks/useSensorAverages';
import { api } from '../../utils/api';
import toast from '../../utils/toast';

/**
 * SmartSuggestionsEngine - KI-basierte Empfehlungen
 * Analysiert Sensordaten und gibt kontextbezogene Vorschläge
 */

// Suggestion-Typen mit Prioritäten
const SUGGESTION_TYPES = {
  CRITICAL: { priority: 1, color: '#ef4444', icon: AlertTriangle, label: 'Kritisch' },
  WARNING: { priority: 2, color: '#f59e0b', icon: AlertTriangle, label: 'Warnung' },
  OPTIMIZATION: { priority: 3, color: '#10b981', icon: TrendingUp, label: 'Optimierung' },
  INFO: { priority: 4, color: '#3b82f6', icon: Lightbulb, label: 'Tipp' }
};

// Optimale Werte für verschiedene Grow-Phasen
const OPTIMAL_RANGES = {
  seedling: {
    temp: { min: 22, max: 25, optimal: 24 },
    humidity: { min: 65, max: 75, optimal: 70 },
    vpd: { min: 0.4, max: 0.8, optimal: 0.6 },
    dli: { min: 12, max: 18, optimal: 15 }
  },
  vegetative: {
    temp: { min: 22, max: 28, optimal: 25 },
    humidity: { min: 55, max: 70, optimal: 60 },
    vpd: { min: 0.8, max: 1.2, optimal: 1.0 },
    dli: { min: 35, max: 50, optimal: 40 }
  },
  flowering: {
    temp: { min: 20, max: 26, optimal: 24 },
    humidity: { min: 45, max: 55, optimal: 50 },
    vpd: { min: 1.0, max: 1.5, optimal: 1.2 },
    dli: { min: 40, max: 60, optimal: 50 }
  }
};

// Suggestion Generator Funktionen
const generateSuggestions = (sensorData, phase = 'vegetative', history = []) => {
  const suggestions = [];
  const ranges = OPTIMAL_RANGES[phase];
  const now = new Date();
  const hour = now.getHours();

  // Temperatur Checks
  if (sensorData?.temp) {
    const temp = sensorData.temp;

    if (temp > 32) {
      suggestions.push({
        id: 'temp-critical-high',
        type: 'CRITICAL',
        title: 'Temperatur kritisch hoch!',
        description: `${temp.toFixed(1)}°C - Sofortige Abkühlung erforderlich`,
        metric: 'temp',
        currentValue: temp,
        optimalValue: ranges.temp.optimal,
        actions: [
          { label: 'Lüfter maximieren', action: 'fan-max' },
          { label: 'Licht dimmen', action: 'light-dim' }
        ],
        icon: Thermometer
      });
    } else if (temp > ranges.temp.max) {
      suggestions.push({
        id: 'temp-high',
        type: 'WARNING',
        title: 'Temperatur zu hoch',
        description: `${temp.toFixed(1)}°C liegt ${(temp - ranges.temp.max).toFixed(1)}° über dem Optimum`,
        metric: 'temp',
        currentValue: temp,
        optimalValue: ranges.temp.optimal,
        actions: [
          { label: 'Lüftung erhöhen', action: 'fan-increase' }
        ],
        icon: Thermometer
      });
    } else if (temp < ranges.temp.min) {
      suggestions.push({
        id: 'temp-low',
        type: 'WARNING',
        title: 'Temperatur zu niedrig',
        description: `${temp.toFixed(1)}°C liegt ${(ranges.temp.min - temp).toFixed(1)}° unter dem Minimum`,
        metric: 'temp',
        currentValue: temp,
        optimalValue: ranges.temp.optimal,
        actions: [
          { label: 'Heizung aktivieren', action: 'heater-on' }
        ],
        icon: Thermometer
      });
    }
  }

  // Luftfeuchte Checks
  if (sensorData?.humidity) {
    const hum = sensorData.humidity;

    if (hum > 80) {
      suggestions.push({
        id: 'humidity-critical-high',
        type: 'CRITICAL',
        title: 'Schimmelgefahr!',
        description: `${hum.toFixed(0)}% RLF - Sofortige Entfeuchtung nötig`,
        metric: 'humidity',
        currentValue: hum,
        optimalValue: ranges.humidity.optimal,
        actions: [
          { label: 'Entfeuchter AN', action: 'dehumidifier-on' },
          { label: 'Abluft maximieren', action: 'exhaust-max' }
        ],
        icon: Droplets
      });
    } else if (hum > ranges.humidity.max) {
      suggestions.push({
        id: 'humidity-high',
        type: 'WARNING',
        title: 'Luftfeuchte zu hoch',
        description: `${hum.toFixed(0)}% - Reduziere um ${(hum - ranges.humidity.optimal).toFixed(0)}%`,
        metric: 'humidity',
        currentValue: hum,
        optimalValue: ranges.humidity.optimal,
        actions: [
          { label: 'Entfeuchtung erhöhen', action: 'dehumidifier-increase' }
        ],
        icon: Droplets
      });
    } else if (hum < ranges.humidity.min) {
      suggestions.push({
        id: 'humidity-low',
        type: 'WARNING',
        title: 'Luftfeuchte zu niedrig',
        description: `${hum.toFixed(0)}% - Erhöhe um ${(ranges.humidity.min - hum).toFixed(0)}%`,
        metric: 'humidity',
        currentValue: hum,
        optimalValue: ranges.humidity.optimal,
        actions: [
          { label: 'Befeuchter aktivieren', action: 'humidifier-on' }
        ],
        icon: Droplets
      });
    }
  }

  // VPD Check
  if (sensorData?.temp && sensorData?.humidity) {
    const svp = 0.61078 * Math.exp((17.27 * sensorData.temp) / (sensorData.temp + 237.3));
    const vpd = svp * (1 - sensorData.humidity / 100);

    if (vpd < ranges.vpd.min) {
      suggestions.push({
        id: 'vpd-low',
        type: 'OPTIMIZATION',
        title: 'VPD optimierbar',
        description: `${vpd.toFixed(2)} kPa - Transpiration könnte höher sein`,
        metric: 'vpd',
        currentValue: vpd,
        optimalValue: ranges.vpd.optimal,
        actions: [
          { label: 'Temperatur erhöhen', action: 'temp-increase' },
          { label: 'Luftfeuchte senken', action: 'humidity-decrease' }
        ],
        icon: Wind
      });
    } else if (vpd > ranges.vpd.max) {
      suggestions.push({
        id: 'vpd-high',
        type: 'WARNING',
        title: 'VPD zu hoch',
        description: `${vpd.toFixed(2)} kPa - Pflanzen unter Stress`,
        metric: 'vpd',
        currentValue: vpd,
        optimalValue: ranges.vpd.optimal,
        actions: [
          { label: 'Luftfeuchte erhöhen', action: 'humidity-increase' }
        ],
        icon: Wind
      });
    } else if (Math.abs(vpd - ranges.vpd.optimal) < 0.1) {
      suggestions.push({
        id: 'vpd-perfect',
        type: 'INFO',
        title: 'VPD perfekt!',
        description: `${vpd.toFixed(2)} kPa - Ideale Bedingungen`,
        metric: 'vpd',
        currentValue: vpd,
        optimalValue: ranges.vpd.optimal,
        icon: Target
      });
    }
  }

  // Zeit-basierte Empfehlungen
  if (hour >= 6 && hour < 8) {
    suggestions.push({
      id: 'morning-routine',
      type: 'INFO',
      title: 'Morgenroutine',
      description: 'Ideale Zeit für Bewässerung und Pflanzenkontrolle',
      actions: [
        { label: 'Bewässerung starten', action: 'water' },
        { label: 'Foto aufnehmen', action: 'snapshot' }
      ],
      icon: Sun
    });
  }

  if (hour >= 20 && hour < 22) {
    suggestions.push({
      id: 'evening-check',
      type: 'INFO',
      title: 'Abend-Check',
      description: 'Zeit für den täglichen Grow-Report',
      actions: [
        { label: 'Report erstellen', action: 'report' }
      ],
      icon: Clock
    });
  }

  // Sortiere nach Priorität
  return suggestions.sort((a, b) => {
    return SUGGESTION_TYPES[a.type].priority - SUGGESTION_TYPES[b.type].priority;
  });
};

// Einzelne Suggestion Card
const SuggestionCard = ({ suggestion, theme, onAction, onDismiss, expanded, onToggle }) => {
  const typeConfig = SUGGESTION_TYPES[suggestion.type];
  const Icon = suggestion.icon || typeConfig.icon;

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: theme.bg.card,
        borderColor: `${typeConfig.color}40`,
        boxShadow: `0 4px 20px ${typeConfig.color}15`
      }}
    >
      {/* Header */}
      <div
        className="p-4 flex items-center gap-3 cursor-pointer"
        onClick={onToggle}
      >
        <div
          className="p-2.5 rounded-xl"
          style={{ backgroundColor: `${typeConfig.color}20` }}
        >
          <Icon size={20} style={{ color: typeConfig.color }} />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4
              className="font-bold"
              style={{ color: theme.text.primary }}
            >
              {suggestion.title}
            </h4>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: `${typeConfig.color}20`,
                color: typeConfig.color
              }}
            >
              {typeConfig.label}
            </span>
          </div>
          <p
            className="text-sm mt-0.5"
            style={{ color: theme.text.muted }}
          >
            {suggestion.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {suggestion.currentValue && suggestion.optimalValue && (
            <div className="text-right mr-2">
              <div
                className="text-lg font-bold"
                style={{ color: typeConfig.color }}
              >
                {typeof suggestion.currentValue === 'number'
                  ? suggestion.currentValue.toFixed(1)
                  : suggestion.currentValue}
              </div>
              <div
                className="text-xs"
                style={{ color: theme.text.muted }}
              >
                Ziel: {suggestion.optimalValue}
              </div>
            </div>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/10"
          >
            <X size={16} style={{ color: theme.text.muted }} />
          </button>

          {expanded ? (
            <ChevronUp size={18} style={{ color: theme.text.muted }} />
          ) : (
            <ChevronDown size={18} style={{ color: theme.text.muted }} />
          )}
        </div>
      </div>

      {/* Expanded Actions */}
      {expanded && suggestion.actions && (
        <div
          className="px-4 pb-4 pt-2 border-t"
          style={{ borderColor: theme.border.light }}
        >
          <div className="flex flex-wrap gap-2">
            {suggestion.actions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => onAction(action)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all hover:scale-105"
                style={{
                  backgroundColor: idx === 0 ? typeConfig.color : theme.bg.hover,
                  color: idx === 0 ? '#fff' : theme.text.secondary,
                  border: idx === 0 ? 'none' : `1px solid ${theme.border.default}`
                }}
              >
                <Zap size={14} />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Haupt-Komponente
const SmartSuggestionsEngine = ({ className = '', compact = false }) => {
  const { currentTheme: theme } = useTheme();
  const { temp, humidity, sensorData } = useSensorAverages();
  const [suggestions, setSuggestions] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [growPhase, setGrowPhase] = useState('vegetative');
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Suggestions generieren wenn Sensordaten sich ändern
  useEffect(() => {
    const newSuggestions = generateSuggestions(
      { temp, humidity, lux: sensorData?.lux },
      growPhase
    );
    setSuggestions(newSuggestions.filter(s => !dismissed.includes(s.id)));
  }, [temp, humidity, sensorData, growPhase, dismissed]);

  const handleAction = async (action) => {
    toast.success(`Aktion ausgelöst: ${action.label}`);
    // Hier könnte die API-Integration erfolgen
  };

  const handleDismiss = (id) => {
    setDismissed([...dismissed, id]);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setDismissed([]);
    setTimeout(() => setRefreshing(false), 500);
  };

  // Angezeigte Suggestions (begrenzt wenn compact)
  const displayedSuggestions = compact && !showAll
    ? suggestions.slice(0, 3)
    : suggestions;

  // Kritische Suggestions zählen
  const criticalCount = suggestions.filter(s => s.type === 'CRITICAL').length;
  const warningCount = suggestions.filter(s => s.type === 'WARNING').length;

  if (suggestions.length === 0) {
    return (
      <div
        className={`rounded-2xl border p-6 text-center ${className}`}
        style={{
          backgroundColor: theme.bg.card,
          borderColor: theme.border.default
        }}
      >
        <div
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: '#10b98120' }}
        >
          <CheckCircle size={32} className="text-emerald-500" />
        </div>
        <h3
          className="font-bold text-lg mb-1"
          style={{ color: theme.text.primary }}
        >
          Alles optimal!
        </h3>
        <p
          className="text-sm"
          style={{ color: theme.text.muted }}
        >
          Keine Empfehlungen momentan - dein Grow läuft perfekt
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl border overflow-hidden ${className}`}
      style={{
        backgroundColor: theme.bg.card,
        borderColor: theme.border.default
      }}
    >
      {/* Header */}
      <div
        className="p-5 border-b flex items-center justify-between"
        style={{
          background: `linear-gradient(135deg, ${theme.accent.color}10 0%, transparent 100%)`,
          borderColor: theme.border.light
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl"
            style={{ backgroundColor: `${theme.accent.color}20` }}
          >
            <Sparkles size={22} style={{ color: theme.accent.color }} />
          </div>
          <div>
            <h3
              className="font-bold"
              style={{ color: theme.text.primary }}
            >
              Smart Empfehlungen
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {criticalCount > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: '#ef444420', color: '#ef4444' }}
                >
                  {criticalCount} kritisch
                </span>
              )}
              {warningCount > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}
                >
                  {warningCount} Warnungen
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Phase Selector */}
          <select
            value={growPhase}
            onChange={(e) => setGrowPhase(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: theme.bg.hover,
              color: theme.text.secondary,
              border: `1px solid ${theme.border.default}`
            }}
          >
            <option value="seedling">Sämling</option>
            <option value="vegetative">Veg</option>
            <option value="flowering">Blüte</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className={`p-2 rounded-lg transition-all ${refreshing ? 'animate-spin' : ''}`}
            style={{ backgroundColor: theme.bg.hover }}
          >
            <RefreshCcw size={18} style={{ color: theme.text.muted }} />
          </button>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="p-4 space-y-3">
        {displayedSuggestions.map(suggestion => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            theme={theme}
            onAction={handleAction}
            onDismiss={() => handleDismiss(suggestion.id)}
            expanded={expandedId === suggestion.id}
            onToggle={() => setExpandedId(
              expandedId === suggestion.id ? null : suggestion.id
            )}
          />
        ))}

        {/* Show More Button */}
        {compact && suggestions.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 text-center text-sm font-medium transition-all hover:bg-black/5 rounded-xl"
            style={{ color: theme.accent.color }}
          >
            {showAll ? 'Weniger anzeigen' : `+${suggestions.length - 3} weitere anzeigen`}
          </button>
        )}
      </div>
    </div>
  );
};

export default SmartSuggestionsEngine;
