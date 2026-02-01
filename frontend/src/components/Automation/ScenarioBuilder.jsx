import React, { useState, useEffect } from 'react';
import {
  Sparkles, Sun, Moon, Droplets, Thermometer, Wind, Fan,
  Timer, Zap, ChevronRight, Check, X, Plus, Play, Pause,
  Clock, ArrowRight, Leaf, AlertTriangle, Target, Layers,
  Copy, Save, Wand2, Settings2
} from 'lucide-react';
import { api } from '../../utils/api';
import toast from '../../utils/toast';

/**
 * ScenarioBuilder - Vorgefertigte Szenarien + Visueller Flow Builder
 * Macht Automation zugänglich für Einsteiger
 */

// Vorgefertigte Szenarien-Templates
const SCENARIO_TEMPLATES = [
  {
    id: 'day-night-cycle',
    name: 'Tag/Nacht-Zyklus',
    icon: Sun,
    color: '#f59e0b',
    category: 'light',
    description: '18/6 Licht-Zyklus für Vegetationsphase',
    rules: [
      {
        name: 'Licht AN - Morgens',
        conditions: [{ type: 'time', timeMode: 'at', startTime: '06:00' }],
        actions: [{ type: 'device', device: 'light', action: 'on' }]
      },
      {
        name: 'Licht AUS - Abends',
        conditions: [{ type: 'time', timeMode: 'at', startTime: '00:00' }],
        actions: [{ type: 'device', device: 'light', action: 'off' }]
      }
    ]
  },
  {
    id: 'flowering-12-12',
    name: 'Blüte 12/12',
    icon: Moon,
    color: '#8b5cf6',
    category: 'light',
    description: '12/12 Licht-Zyklus für Blütephase',
    rules: [
      {
        name: 'Licht AN - 8 Uhr',
        conditions: [{ type: 'time', timeMode: 'at', startTime: '08:00' }],
        actions: [{ type: 'device', device: 'light', action: 'on' }]
      },
      {
        name: 'Licht AUS - 20 Uhr',
        conditions: [{ type: 'time', timeMode: 'at', startTime: '20:00' }],
        actions: [{ type: 'device', device: 'light', action: 'off' }]
      }
    ]
  },
  {
    id: 'temp-control',
    name: 'Temperatur-Kontrolle',
    icon: Thermometer,
    color: '#ef4444',
    category: 'climate',
    description: 'Hält Temperatur im optimalen Bereich (22-28°C)',
    rules: [
      {
        name: 'Lüfter AN bei Hitze',
        conditions: [{ type: 'sensor', sensor: 'temp', operator: '>', value: 28 }],
        actions: [{ type: 'device', device: 'fan', action: 'on' }]
      },
      {
        name: 'Heizung AN bei Kälte',
        conditions: [{ type: 'sensor', sensor: 'temp', operator: '<', value: 20 }],
        actions: [{ type: 'device', device: 'heater', action: 'on' }]
      },
      {
        name: 'Heizung/Lüfter AUS bei Optimaltemperatur',
        conditions: [
          { type: 'sensor', sensor: 'temp', operator: '>=', value: 22, logicOperator: 'AND' },
          { type: 'sensor', sensor: 'temp', operator: '<=', value: 26 }
        ],
        actions: [
          { type: 'device', device: 'fan', action: 'off' },
          { type: 'device', device: 'heater', action: 'off' }
        ]
      }
    ]
  },
  {
    id: 'humidity-control',
    name: 'Luftfeuchte-Kontrolle',
    icon: Droplets,
    color: '#3b82f6',
    category: 'climate',
    description: 'Hält Luftfeuchte im optimalen Bereich (50-70%)',
    rules: [
      {
        name: 'Entfeuchter AN bei hoher RLF',
        conditions: [{ type: 'sensor', sensor: 'humidity', operator: '>', value: 70 }],
        actions: [{ type: 'device', device: 'dehumidifier', action: 'on' }]
      },
      {
        name: 'Befeuchter AN bei niedriger RLF',
        conditions: [{ type: 'sensor', sensor: 'humidity', operator: '<', value: 50 }],
        actions: [{ type: 'device', device: 'humidifier', action: 'on' }]
      }
    ]
  },
  {
    id: 'vpd-optimization',
    name: 'VPD-Optimierung',
    icon: Target,
    color: '#10b981',
    category: 'climate',
    description: 'Optimaler VPD-Bereich (0.8-1.2 kPa)',
    rules: [
      {
        name: 'VPD zu hoch - mehr Feuchtigkeit',
        conditions: [{ type: 'sensor', sensor: 'vpd', operator: '>', value: 1.4 }],
        actions: [{ type: 'device', device: 'humidifier', action: 'on' }]
      },
      {
        name: 'VPD zu niedrig - weniger Feuchtigkeit',
        conditions: [{ type: 'sensor', sensor: 'vpd', operator: '<', value: 0.6 }],
        actions: [{ type: 'device', device: 'dehumidifier', action: 'on' }]
      }
    ]
  },
  {
    id: 'irrigation-cycle',
    name: 'Bewässerungs-Zyklus',
    icon: Droplets,
    color: '#06b6d4',
    category: 'water',
    description: 'Automatische Bewässerung alle 4 Stunden',
    rules: [
      {
        name: 'Bewässerung Morgens',
        conditions: [{ type: 'time', timeMode: 'at', startTime: '06:00' }],
        actions: [{ type: 'device', device: 'pump', action: 'on', duration: 30 }]
      },
      {
        name: 'Bewässerung Mittags',
        conditions: [{ type: 'time', timeMode: 'at', startTime: '12:00' }],
        actions: [{ type: 'device', device: 'pump', action: 'on', duration: 30 }]
      },
      {
        name: 'Bewässerung Abends',
        conditions: [{ type: 'time', timeMode: 'at', startTime: '18:00' }],
        actions: [{ type: 'device', device: 'pump', action: 'on', duration: 30 }]
      }
    ]
  },
  {
    id: 'night-fan',
    name: 'Nachtlüftung',
    icon: Fan,
    color: '#64748b',
    category: 'climate',
    description: 'Sanfte Luftzirkulation während der Nacht',
    rules: [
      {
        name: 'Nachtlüftung aktiv',
        conditions: [{ type: 'time', timeMode: 'between', startTime: '00:00', endTime: '06:00' }],
        actions: [{ type: 'device', device: 'fan', action: 'on', speed: 30 }]
      }
    ]
  }
];

const CATEGORIES = {
  light: { label: 'Beleuchtung', icon: Sun, color: '#f59e0b' },
  climate: { label: 'Klima', icon: Wind, color: '#10b981' },
  water: { label: 'Bewässerung', icon: Droplets, color: '#3b82f6' }
};

// Scenario Card Komponente
const ScenarioCard = ({ scenario, theme, onActivate, isActive }) => {
  const Icon = scenario.icon;

  return (
    <div
      className={`
        relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer
        hover:scale-[1.02] hover:shadow-xl
        ${isActive ? 'ring-2' : ''}
      `}
      style={{
        backgroundColor: theme.bg.card,
        borderColor: isActive ? scenario.color : theme.border.default,
        boxShadow: isActive ? `0 8px 32px ${scenario.color}30` : undefined
      }}
      onClick={() => onActivate(scenario)}
    >
      {/* Active Badge */}
      {isActive && (
        <div
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: scenario.color }}
        >
          <Check size={14} className="text-white" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className="p-3 rounded-xl"
          style={{ backgroundColor: `${scenario.color}20` }}
        >
          <Icon size={24} style={{ color: scenario.color }} />
        </div>
        <div className="flex-1">
          <h3
            className="font-bold text-lg"
            style={{ color: theme.text.primary }}
          >
            {scenario.name}
          </h3>
          <p
            className="text-sm mt-1"
            style={{ color: theme.text.muted }}
          >
            {scenario.description}
          </p>
        </div>
      </div>

      {/* Rules Preview */}
      <div className="space-y-2">
        {scenario.rules.slice(0, 2).map((rule, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 text-xs p-2 rounded-lg"
            style={{ backgroundColor: theme.bg.main }}
          >
            <Zap size={12} style={{ color: scenario.color }} />
            <span style={{ color: theme.text.secondary }}>{rule.name}</span>
          </div>
        ))}
        {scenario.rules.length > 2 && (
          <div
            className="text-xs text-center py-1"
            style={{ color: theme.text.muted }}
          >
            +{scenario.rules.length - 2} weitere Rules
          </div>
        )}
      </div>

      {/* Activate Button */}
      <button
        className="w-full mt-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
        style={{
          backgroundColor: isActive ? `${scenario.color}20` : theme.bg.hover,
          color: isActive ? scenario.color : theme.text.secondary,
          border: `1px solid ${isActive ? scenario.color : theme.border.default}`
        }}
      >
        {isActive ? (
          <>
            <Check size={16} />
            Aktiviert
          </>
        ) : (
          <>
            <Play size={16} />
            Aktivieren
          </>
        )}
      </button>
    </div>
  );
};

// Visual Flow Preview
const FlowPreview = ({ scenario, theme }) => {
  if (!scenario) return null;

  return (
    <div
      className="p-5 rounded-2xl border"
      style={{
        backgroundColor: theme.bg.card,
        borderColor: theme.border.default
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Layers size={18} style={{ color: theme.accent.color }} />
        <h4 className="font-bold" style={{ color: theme.text.primary }}>
          Flow Vorschau: {scenario.name}
        </h4>
      </div>

      <div className="space-y-4">
        {scenario.rules.map((rule, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3"
          >
            {/* Condition Block */}
            <div
              className="flex-1 p-3 rounded-xl border"
              style={{
                backgroundColor: `${scenario.color}10`,
                borderColor: `${scenario.color}40`
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{ backgroundColor: scenario.color, color: '#fff' }}
                >
                  IF
                </span>
                <span className="text-sm" style={{ color: theme.text.secondary }}>
                  {rule.conditions.map(c => {
                    if (c.type === 'time') {
                      if (c.timeMode === 'at') return `Zeit = ${c.startTime}`;
                      return `${c.startTime} - ${c.endTime}`;
                    }
                    return `${c.sensor} ${c.operator} ${c.value}`;
                  }).join(' & ')}
                </span>
              </div>
            </div>

            {/* Arrow */}
            <ArrowRight size={20} style={{ color: theme.text.muted }} />

            {/* Action Block */}
            <div
              className="flex-1 p-3 rounded-xl border"
              style={{
                backgroundColor: '#10b98115',
                borderColor: '#10b98140'
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{ backgroundColor: '#10b981', color: '#fff' }}
                >
                  THEN
                </span>
                <span className="text-sm" style={{ color: theme.text.secondary }}>
                  {rule.actions.map(a => {
                    return `${a.device} ${a.action}${a.duration ? ` (${a.duration}s)` : ''}`;
                  }).join(', ')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Haupt-Komponente
const ScenarioBuilder = ({ theme, onClose, onApply }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [activeScenarios, setActiveScenarios] = useState([]);
  const [applying, setApplying] = useState(false);

  // Gefilterte Szenarien
  const filteredScenarios = selectedCategory === 'all'
    ? SCENARIO_TEMPLATES
    : SCENARIO_TEMPLATES.filter(s => s.category === selectedCategory);

  const handleActivateScenario = (scenario) => {
    setSelectedScenario(scenario);
  };

  const handleApplyScenario = async () => {
    if (!selectedScenario) return;

    setApplying(true);
    try {
      // Alle Rules des Szenarios erstellen
      for (const rule of selectedScenario.rules) {
        const ruleData = {
          name: `[${selectedScenario.name}] ${rule.name}`,
          description: `Auto-generiert von Szenario: ${selectedScenario.name}`,
          conditions: rule.conditions,
          actions: rule.actions,
          enabled: true,
          priority: 50
        };

        await api.post('/automation-rules', ruleData);
      }

      setActiveScenarios([...activeScenarios, selectedScenario.id]);
      toast.success(`Szenario "${selectedScenario.name}" aktiviert mit ${selectedScenario.rules.length} Rules`);

      if (onApply) onApply();
    } catch (error) {
      console.error('Fehler beim Anwenden des Szenarios:', error);
      toast.error('Szenario konnte nicht angewendet werden');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-4xl my-8 rounded-3xl border overflow-hidden"
        style={{
          backgroundColor: theme.bg.main,
          borderColor: theme.border.default
        }}
      >
        {/* Header */}
        <div
          className="p-6 border-b"
          style={{
            background: `linear-gradient(135deg, ${theme.accent.color}15 0%, transparent 100%)`,
            borderColor: theme.border.default
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="p-3 rounded-2xl"
                style={{ backgroundColor: `${theme.accent.color}20` }}
              >
                <Wand2 size={28} style={{ color: theme.accent.color }} />
              </div>
              <div>
                <h2
                  className="text-2xl font-bold"
                  style={{ color: theme.text.primary }}
                >
                  Szenarien-Builder
                </h2>
                <p
                  className="text-sm"
                  style={{ color: theme.text.muted }}
                >
                  Wähle vorgefertigte Szenarien oder erstelle eigene
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl transition-all hover:bg-black/10"
            >
              <X size={24} style={{ color: theme.text.muted }} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                selectedCategory === 'all' ? 'scale-105' : ''
              }`}
              style={{
                backgroundColor: selectedCategory === 'all'
                  ? theme.accent.color
                  : theme.bg.card,
                color: selectedCategory === 'all' ? '#fff' : theme.text.secondary,
                border: `1px solid ${selectedCategory === 'all' ? theme.accent.color : theme.border.default}`
              }}
            >
              Alle Szenarien
            </button>
            {Object.entries(CATEGORIES).map(([key, cat]) => {
              const CatIcon = cat.icon;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    selectedCategory === key ? 'scale-105' : ''
                  }`}
                  style={{
                    backgroundColor: selectedCategory === key
                      ? cat.color
                      : theme.bg.card,
                    color: selectedCategory === key ? '#fff' : theme.text.secondary,
                    border: `1px solid ${selectedCategory === key ? cat.color : theme.border.default}`
                  }}
                >
                  <CatIcon size={16} />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Scenarios Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {filteredScenarios.map(scenario => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                theme={theme}
                onActivate={handleActivateScenario}
                isActive={activeScenarios.includes(scenario.id)}
              />
            ))}
          </div>

          {/* Selected Scenario Preview */}
          {selectedScenario && (
            <>
              <FlowPreview scenario={selectedScenario} theme={theme} />

              {/* Apply Button */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setSelectedScenario(null)}
                  className="px-6 py-3 rounded-xl font-semibold transition-all"
                  style={{
                    backgroundColor: theme.bg.card,
                    color: theme.text.secondary,
                    border: `1px solid ${theme.border.default}`
                  }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleApplyScenario}
                  disabled={applying}
                  className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105 flex items-center gap-2 disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${theme.accent.color}, ${theme.accent.dark})`,
                    boxShadow: `0 8px 24px ${theme.accent.color}30`
                  }}
                >
                  {applying ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Wird angewendet...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Szenario anwenden
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScenarioBuilder;
