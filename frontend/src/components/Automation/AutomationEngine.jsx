import React, { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import {
  Zap, Plus, Trash2, Edit2, Play, Pause, Copy, Clock, Thermometer,
  Droplets, Sun, Wind, Activity, History, ChevronDown, ChevronRight,
  Check, X, AlertTriangle, Settings
} from 'lucide-react';

const AutomationEngine = () => {
  const { currentTheme } = useTheme();
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  // Load from localStorage
  useEffect(() => {
    const savedRules = localStorage.getItem('automation-rules');
    const savedHistory = localStorage.getItem('automation-history');

    if (savedRules) {
      setRules(JSON.parse(savedRules));
    } else {
      // Initialize with default rules
      setRules(getDefaultRules());
    }

    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (rules.length > 0) {
      localStorage.setItem('automation-rules', JSON.stringify(rules));
    }
  }, [rules]);

  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('automation-history', JSON.stringify(history));
    }
  }, [history]);

  const getDefaultRules = () => [
    {
      id: 1,
      name: 'Lüfter erhöhen bei hoher Temperatur',
      enabled: true,
      conditions: [
        { sensor: 'temperature', operator: '>', value: 28, unit: '°C' }
      ],
      actions: [
        { type: 'set-fan', value: 100 }
      ],
      logic: 'AND',
      schedule: null,
      lastTriggered: null,
      triggerCount: 0,
      priority: 'high'
    },
    {
      id: 2,
      name: 'Luftfeuchtigkeit regulieren',
      enabled: true,
      conditions: [
        { sensor: 'humidity', operator: '<', value: 40, unit: '%' },
        { sensor: 'temperature', operator: '>', value: 24, unit: '°C' }
      ],
      actions: [
        { type: 'set-humidifier', value: 'on' }
      ],
      logic: 'AND',
      schedule: null,
      lastTriggered: null,
      triggerCount: 0,
      priority: 'medium'
    },
    {
      id: 3,
      name: 'Licht Zeitplan - Vegetative Phase',
      enabled: true,
      conditions: [],
      actions: [
        { type: 'set-light', value: 'on' }
      ],
      logic: 'AND',
      schedule: {
        type: 'daily',
        time: '06:00',
        days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
      },
      lastTriggered: null,
      triggerCount: 0,
      priority: 'high'
    },
    {
      id: 4,
      name: 'Licht aus - Nachtphase',
      enabled: true,
      conditions: [],
      actions: [
        { type: 'set-light', value: 'off' }
      ],
      logic: 'AND',
      schedule: {
        type: 'daily',
        time: '00:00',
        days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
      },
      lastTriggered: null,
      triggerCount: 0,
      priority: 'high'
    },
    {
      id: 5,
      name: 'VPD Optimierung',
      enabled: false,
      conditions: [
        { sensor: 'vpd', operator: '>', value: 1.5, unit: 'kPa' }
      ],
      actions: [
        { type: 'set-fan', value: 80 },
        { type: 'set-humidifier', value: 'on' }
      ],
      logic: 'AND',
      schedule: null,
      lastTriggered: null,
      triggerCount: 0,
      priority: 'medium'
    }
  ];

  const toggleRule = (ruleId) => {
    setRules(rules.map(r =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const deleteRule = (ruleId) => {
    setRules(rules.filter(r => r.id !== ruleId));
  };

  const duplicateRule = (ruleId) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const newRule = {
      ...rule,
      id: Date.now(),
      name: `${rule.name} (Kopie)`,
      enabled: false,
      lastTriggered: null,
      triggerCount: 0
    };

    setRules([...rules, newRule]);
  };

  const editRule = (ruleId) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      setEditingRule(rule);
      setShowRuleBuilder(true);
    }
  };

  const saveRule = (rule) => {
    if (editingRule) {
      // Update existing rule
      setRules(rules.map(r => r.id === rule.id ? rule : r));
    } else {
      // Add new rule
      setRules([...rules, { ...rule, id: Date.now(), triggerCount: 0, lastTriggered: null }]);
    }
    setShowRuleBuilder(false);
    setEditingRule(null);
  };

  const getSensorIcon = (sensor) => {
    switch (sensor) {
      case 'temperature': return <Thermometer size={16} />;
      case 'humidity': return <Droplets size={16} />;
      case 'light': return <Sun size={16} />;
      case 'vpd': return <Wind size={16} />;
      default: return <Activity size={16} />;
    }
  };

  const getSensorLabel = (sensor) => {
    const labels = {
      'temperature': 'Temperatur',
      'humidity': 'Luftfeuchtigkeit',
      'light': 'Licht',
      'vpd': 'VPD',
      'co2': 'CO₂',
      'ec': 'EC',
      'ph': 'pH'
    };
    return labels[sensor] || sensor;
  };

  const getActionLabel = (action) => {
    const labels = {
      'set-fan': 'Lüfter',
      'set-light': 'Licht',
      'set-humidifier': 'Luftbefeuchter',
      'set-heater': 'Heizung',
      'send-notification': 'Benachrichtigung',
      'trigger-snapshot': 'Snapshot'
    };
    return labels[action.type] || action.type;
  };

  const getOperatorSymbol = (operator) => {
    const symbols = {
      '>': '>',
      '<': '<',
      '>=': '≥',
      '<=': '≤',
      '==': '=',
      '!=': '≠'
    };
    return symbols[operator] || operator;
  };

  const activeRules = rules.filter(r => r.enabled);
  const inactiveRules = rules.filter(r => !r.enabled);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-2xl font-bold mb-1"
            style={{ color: currentTheme.text.primary }}
          >
            Automation Engine
          </h2>
          <p
            className="text-sm"
            style={{ color: currentTheme.text.secondary }}
          >
            {activeRules.length} von {rules.length} Regeln aktiv
          </p>
        </div>
        <button
          onClick={() => {
            setEditingRule(null);
            setShowRuleBuilder(true);
          }}
          className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all hover:brightness-110"
          style={{
            backgroundColor: currentTheme.accent.color,
            color: 'white'
          }}
        >
          <Plus size={20} />
          Neue Regel
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Aktive Regeln"
          value={activeRules.length}
          icon={<Zap size={20} />}
          color="#10b981"
          theme={currentTheme}
        />
        <StatCard
          title="Inaktive Regeln"
          value={inactiveRules.length}
          icon={<Pause size={20} />}
          color="#64748b"
          theme={currentTheme}
        />
        <StatCard
          title="Heute ausgeführt"
          value={history.filter(h => {
            const today = new Date().toDateString();
            return new Date(h.timestamp).toDateString() === today;
          }).length}
          icon={<Activity size={20} />}
          color="#3b82f6"
          theme={currentTheme}
        />
        <StatCard
          title="Gesamt ausgeführt"
          value={rules.reduce((sum, r) => sum + r.triggerCount, 0)}
          icon={<History size={20} />}
          color="#8b5cf6"
          theme={currentTheme}
        />
      </div>

      {/* Active Rules */}
      {activeRules.length > 0 && (
        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: currentTheme.bg.card,
            borderColor: currentTheme.border.default
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap size={20} style={{ color: '#10b981' }} />
            <h3
              className="text-lg font-bold"
              style={{ color: currentTheme.text.primary }}
            >
              Aktive Regeln
            </h3>
            <span
              className="ml-auto text-sm font-bold px-2 py-1 rounded"
              style={{
                backgroundColor: '#10b981' + '20',
                color: '#10b981'
              }}
            >
              {activeRules.length}
            </span>
          </div>
          <div className="space-y-3">
            {activeRules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={() => toggleRule(rule.id)}
                onEdit={() => editRule(rule.id)}
                onDelete={() => deleteRule(rule.id)}
                onDuplicate={() => duplicateRule(rule.id)}
                getSensorIcon={getSensorIcon}
                getSensorLabel={getSensorLabel}
                getActionLabel={getActionLabel}
                getOperatorSymbol={getOperatorSymbol}
                theme={currentTheme}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Rules */}
      {inactiveRules.length > 0 && (
        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: currentTheme.bg.card,
            borderColor: currentTheme.border.default
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Pause size={20} style={{ color: '#64748b' }} />
            <h3
              className="text-lg font-bold"
              style={{ color: currentTheme.text.primary }}
            >
              Inaktive Regeln
            </h3>
            <span
              className="ml-auto text-sm font-bold px-2 py-1 rounded"
              style={{
                backgroundColor: '#64748b' + '20',
                color: '#64748b'
              }}
            >
              {inactiveRules.length}
            </span>
          </div>
          <div className="space-y-3">
            {inactiveRules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={() => toggleRule(rule.id)}
                onEdit={() => editRule(rule.id)}
                onDelete={() => deleteRule(rule.id)}
                onDuplicate={() => duplicateRule(rule.id)}
                getSensorIcon={getSensorIcon}
                getSensorLabel={getSensorLabel}
                getActionLabel={getActionLabel}
                getOperatorSymbol={getOperatorSymbol}
                theme={currentTheme}
              />
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: currentTheme.bg.card,
            borderColor: currentTheme.border.default
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <History size={20} style={{ color: currentTheme.accent.color }} />
            <h3
              className="text-lg font-bold"
              style={{ color: currentTheme.text.primary }}
            >
              Automation History
            </h3>
          </div>
          <div className="space-y-2">
            {history.slice(0, 20).map((entry, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border flex items-center justify-between"
                style={{
                  backgroundColor: currentTheme.bg.hover,
                  borderColor: currentTheme.border.light
                }}
              >
                <div className="flex items-center gap-3">
                  <Check size={16} style={{ color: '#10b981' }} />
                  <div>
                    <div
                      className="text-sm font-medium"
                      style={{ color: currentTheme.text.primary }}
                    >
                      {entry.ruleName}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: currentTheme.text.muted }}
                    >
                      {entry.action}
                    </div>
                  </div>
                </div>
                <div
                  className="text-xs"
                  style={{ color: currentTheme.text.secondary }}
                >
                  {new Date(entry.timestamp).toLocaleString('de-DE')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rule Builder Modal */}
      {showRuleBuilder && (
        <RuleBuilder
          rule={editingRule}
          onSave={saveRule}
          onCancel={() => {
            setShowRuleBuilder(false);
            setEditingRule(null);
          }}
          getSensorIcon={getSensorIcon}
          getSensorLabel={getSensorLabel}
          theme={currentTheme}
        />
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color, theme }) => (
  <div
    className="p-4 rounded-xl border"
    style={{
      backgroundColor: theme.bg.card,
      borderColor: theme.border.default
    }}
  >
    <div className="flex items-center justify-between mb-2">
      <div
        className="p-2 rounded-lg"
        style={{
          backgroundColor: color + '20',
          color: color
        }}
      >
        {icon}
      </div>
      <div
        className="text-3xl font-bold"
        style={{ color: color }}
      >
        {value}
      </div>
    </div>
    <div
      className="text-sm font-medium"
      style={{ color: theme.text.secondary }}
    >
      {title}
    </div>
  </div>
);

// Rule Card Component
const RuleCard = ({
  rule,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  getSensorIcon,
  getSensorLabel,
  getActionLabel,
  getOperatorSymbol,
  theme
}) => {
  const [expanded, setExpanded] = useState(false);

  const priorityColors = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#64748b'
  };

  const priorityColor = priorityColors[rule.priority] || priorityColors.medium;

  return (
    <div
      className={`rounded-lg border transition-all ${expanded ? 'p-4' : 'p-3'}`}
      style={{
        backgroundColor: theme.bg.hover,
        borderColor: rule.enabled ? theme.accent.color + '40' : theme.border.light
      }}
    >
      <div className="flex items-start gap-3">
        {/* Toggle Button */}
        <button
          onClick={onToggle}
          className={`p-2 rounded-lg transition-all ${
            rule.enabled ? 'brightness-110' : ''
          }`}
          style={{
            backgroundColor: rule.enabled ? theme.accent.color : theme.bg.main,
            color: rule.enabled ? 'white' : theme.text.muted
          }}
        >
          {rule.enabled ? <Play size={16} /> : <Pause size={16} />}
        </button>

        <div className="flex-1">
          {/* Rule Name */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="font-medium"
              style={{ color: theme.text.primary }}
            >
              {rule.name}
            </div>
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: priorityColor }}
            />
          </div>

          {/* Conditions Summary */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {rule.conditions.length > 0 ? (
              <>
                {rule.conditions.map((cond, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: theme.bg.main,
                          color: theme.text.secondary
                        }}
                      >
                        {rule.logic}
                      </span>
                    )}
                    <div
                      className="text-xs px-2 py-1 rounded flex items-center gap-1"
                      style={{
                        backgroundColor: theme.bg.main,
                        color: theme.text.secondary
                      }}
                    >
                      {getSensorIcon(cond.sensor)}
                      <span>{getSensorLabel(cond.sensor)}</span>
                      <span className="font-bold">{getOperatorSymbol(cond.operator)}</span>
                      <span className="font-medium">{cond.value}{cond.unit}</span>
                    </div>
                  </React.Fragment>
                ))}
              </>
            ) : rule.schedule ? (
              <div
                className="text-xs px-2 py-1 rounded flex items-center gap-1"
                style={{
                  backgroundColor: theme.bg.main,
                  color: theme.text.secondary
                }}
              >
                <Clock size={14} />
                <span>{rule.schedule.type === 'daily' ? 'Täglich' : rule.schedule.type}</span>
                <span className="font-medium">um {rule.schedule.time}</span>
              </div>
            ) : (
              <span
                className="text-xs"
                style={{ color: theme.text.muted }}
              >
                Keine Bedingungen
              </span>
            )}
          </div>

          {/* Actions Summary */}
          <div className="flex items-center gap-2 flex-wrap">
            <ChevronRight size={14} style={{ color: theme.accent.color }} />
            {rule.actions.map((action, idx) => (
              <div
                key={idx}
                className="text-xs px-2 py-1 rounded"
                style={{
                  backgroundColor: theme.accent.color + '20',
                  color: theme.accent.color
                }}
              >
                {getActionLabel(action)}: {action.value}
              </div>
            ))}
          </div>

          {/* Stats */}
          {rule.triggerCount > 0 && (
            <div
              className="text-xs mt-2"
              style={{ color: theme.text.muted }}
            >
              Ausgeführt: {rule.triggerCount}× • Zuletzt:{' '}
              {rule.lastTriggered
                ? new Date(rule.lastTriggered).toLocaleString('de-DE')
                : 'Nie'}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg transition-all hover:brightness-110"
            style={{
              backgroundColor: theme.bg.main,
              color: theme.text.secondary
            }}
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDuplicate}
            className="p-2 rounded-lg transition-all hover:brightness-110"
            style={{
              backgroundColor: theme.bg.main,
              color: theme.text.secondary
            }}
          >
            <Copy size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg transition-all hover:brightness-110"
            style={{
              backgroundColor: theme.bg.main,
              color: '#ef4444'
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Rule Builder Component
const RuleBuilder = ({ rule, onSave, onCancel, getSensorIcon, getSensorLabel, theme }) => {
  const [name, setName] = useState(rule?.name || '');
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [priority, setPriority] = useState(rule?.priority || 'medium');
  const [conditions, setConditions] = useState(rule?.conditions || []);
  const [actions, setActions] = useState(rule?.actions || []);
  const [logic, setLogic] = useState(rule?.logic || 'AND');
  const [schedule, setSchedule] = useState(rule?.schedule || null);
  const [useSchedule, setUseSchedule] = useState(!!rule?.schedule);

  const addCondition = () => {
    setConditions([...conditions, { sensor: 'temperature', operator: '>', value: 25, unit: '°C' }]);
  };

  const removeCondition = (index) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index, field, value) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
  };

  const addAction = () => {
    setActions([...actions, { type: 'set-fan', value: 100 }]);
  };

  const removeAction = (index) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index, field, value) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], [field]: value };
    setActions(newActions);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (!useSchedule && conditions.length === 0) {
      alert('Bitte füge mindestens eine Bedingung hinzu oder aktiviere einen Zeitplan.');
      return;
    }
    if (actions.length === 0) {
      alert('Bitte füge mindestens eine Aktion hinzu.');
      return;
    }

    const newRule = {
      ...(rule || {}),
      name,
      enabled,
      priority,
      conditions: useSchedule ? [] : conditions,
      actions,
      logic,
      schedule: useSchedule ? schedule : null
    };
    onSave(newRule);
  };

  const sensorOptions = [
    { value: 'temperature', label: 'Temperatur', unit: '°C' },
    { value: 'humidity', label: 'Luftfeuchtigkeit', unit: '%' },
    { value: 'vpd', label: 'VPD', unit: 'kPa' },
    { value: 'light', label: 'Licht', unit: 'lx' },
    { value: 'co2', label: 'CO₂', unit: 'ppm' }
  ];

  const actionOptions = [
    { value: 'set-fan', label: 'Lüfter setzen', valueType: 'number', unit: '%' },
    { value: 'set-light', label: 'Licht', valueType: 'toggle' },
    { value: 'set-humidifier', label: 'Luftbefeuchter', valueType: 'toggle' },
    { value: 'set-heater', label: 'Heizung', valueType: 'toggle' },
    { value: 'send-notification', label: 'Benachrichtigung senden', valueType: 'text' },
    { value: 'trigger-snapshot', label: 'Snapshot erstellen', valueType: 'none' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border p-6"
        style={{
          backgroundColor: theme.bg.card,
          borderColor: theme.border.default
        }}
      >
        <h3
          className="text-xl font-bold mb-6"
          style={{ color: theme.text.primary }}
        >
          {rule ? 'Regel bearbeiten' : 'Neue Regel erstellen'}
        </h3>

        {/* Rule Name */}
        <div className="mb-6">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: theme.text.secondary }}
          >
            Regelname
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Lüfter bei hoher Temperatur"
            className="w-full px-4 py-2 rounded-lg border"
            style={{
              backgroundColor: theme.bg.hover,
              borderColor: theme.border.default,
              color: theme.text.primary
            }}
          />
        </div>

        {/* Priority */}
        <div className="mb-6">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: theme.text.secondary }}
          >
            Priorität
          </label>
          <div className="flex gap-2">
            {['low', 'medium', 'high'].map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  priority === p ? 'brightness-110' : ''
                }`}
                style={{
                  backgroundColor: priority === p ? theme.accent.color + '20' : theme.bg.hover,
                  borderColor: priority === p ? theme.accent.color : theme.border.default,
                  color: priority === p ? theme.accent.color : theme.text.secondary
                }}
              >
                {p === 'low' ? 'Niedrig' : p === 'medium' ? 'Mittel' : 'Hoch'}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule or Conditions Toggle */}
        <div className="mb-6">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: theme.text.secondary }}
          >
            Auslöser-Typ
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setUseSchedule(false)}
              className={`px-4 py-2 rounded-lg border transition-all ${
                !useSchedule ? 'brightness-110' : ''
              }`}
              style={{
                backgroundColor: !useSchedule ? theme.accent.color + '20' : theme.bg.hover,
                borderColor: !useSchedule ? theme.accent.color : theme.border.default,
                color: !useSchedule ? theme.accent.color : theme.text.secondary
              }}
            >
              Bedingungen
            </button>
            <button
              onClick={() => setUseSchedule(true)}
              className={`px-4 py-2 rounded-lg border transition-all ${
                useSchedule ? 'brightness-110' : ''
              }`}
              style={{
                backgroundColor: useSchedule ? theme.accent.color + '20' : theme.bg.hover,
                borderColor: useSchedule ? theme.accent.color : theme.border.default,
                color: useSchedule ? theme.accent.color : theme.text.secondary
              }}
            >
              Zeitplan
            </button>
          </div>
        </div>

        {/* Conditions */}
        {!useSchedule && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label
                className="block text-sm font-medium"
                style={{ color: theme.text.secondary }}
              >
                Bedingungen ({conditions.length})
              </label>
              <button
                onClick={addCondition}
                className="px-3 py-1 rounded-lg border text-sm flex items-center gap-1"
                style={{
                  backgroundColor: theme.bg.hover,
                  borderColor: theme.border.default,
                  color: theme.text.primary
                }}
              >
                <Plus size={14} />
                Hinzufügen
              </button>
            </div>
            <div className="space-y-3">
              {conditions.map((cond, idx) => {
                const sensorOpt = sensorOptions.find(s => s.value === cond.sensor);
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border flex items-center gap-2"
                    style={{
                      backgroundColor: theme.bg.hover,
                      borderColor: theme.border.light
                    }}
                  >
                    <select
                      value={cond.sensor}
                      onChange={(e) => {
                        const opt = sensorOptions.find(s => s.value === e.target.value);
                        updateCondition(idx, 'sensor', e.target.value);
                        updateCondition(idx, 'unit', opt?.unit || '');
                      }}
                      className="px-2 py-1 rounded border text-sm"
                      style={{
                        backgroundColor: theme.bg.main,
                        borderColor: theme.border.default,
                        color: theme.text.primary
                      }}
                    >
                      {sensorOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <select
                      value={cond.operator}
                      onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                      className="px-2 py-1 rounded border text-sm"
                      style={{
                        backgroundColor: theme.bg.main,
                        borderColor: theme.border.default,
                        color: theme.text.primary
                      }}
                    >
                      <option value=">">{'>'}</option>
                      <option value="<">{'<'}</option>
                      <option value=">=">{'>='}</option>
                      <option value="<=">{'<='}</option>
                      <option value="==">{'='}</option>
                      <option value="!=">{'≠'}</option>
                    </select>
                    <input
                      type="number"
                      value={cond.value}
                      onChange={(e) => updateCondition(idx, 'value', parseFloat(e.target.value))}
                      className="w-20 px-2 py-1 rounded border text-sm"
                      style={{
                        backgroundColor: theme.bg.main,
                        borderColor: theme.border.default,
                        color: theme.text.primary
                      }}
                    />
                    <span className="text-xs" style={{ color: theme.text.muted }}>{sensorOpt?.unit}</span>
                    <button
                      onClick={() => removeCondition(idx)}
                      className="ml-auto p-1 rounded hover:brightness-110"
                      style={{ color: '#ef4444' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
              {conditions.length === 0 && (
                <div
                  className="p-4 rounded-lg border text-center text-sm"
                  style={{
                    backgroundColor: theme.bg.hover,
                    borderColor: theme.border.light,
                    color: theme.text.muted
                  }}
                >
                  Keine Bedingungen hinzugefügt
                </div>
              )}
            </div>
            {conditions.length > 1 && (
              <div className="mt-3">
                <label className="text-xs font-medium mr-2" style={{ color: theme.text.muted }}>Logik:</label>
                <button
                  onClick={() => setLogic(logic === 'AND' ? 'OR' : 'AND')}
                  className="px-3 py-1 rounded-lg border text-xs"
                  style={{
                    backgroundColor: theme.bg.hover,
                    borderColor: theme.border.default,
                    color: theme.accent.color
                  }}
                >
                  {logic}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Schedule */}
        {useSchedule && (
          <div className="mb-6">
            <label
              className="block text-sm font-medium mb-3"
              style={{ color: theme.text.secondary }}
            >
              Zeitplan
            </label>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: theme.text.muted }}>Uhrzeit</label>
                <input
                  type="time"
                  value={schedule?.time || '06:00'}
                  onChange={(e) => setSchedule({ ...schedule, time: e.target.value, type: 'daily', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] })}
                  className="px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: theme.bg.hover,
                    borderColor: theme.border.default,
                    color: theme.text.primary
                  }}
                />
              </div>
              <div className="text-xs" style={{ color: theme.text.muted }}>
                Wird täglich zur angegebenen Uhrzeit ausgeführt
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label
              className="block text-sm font-medium"
              style={{ color: theme.text.secondary }}
            >
              Aktionen ({actions.length})
            </label>
            <button
              onClick={addAction}
              className="px-3 py-1 rounded-lg border text-sm flex items-center gap-1"
              style={{
                backgroundColor: theme.bg.hover,
                borderColor: theme.border.default,
                color: theme.text.primary
              }}
            >
              <Plus size={14} />
              Hinzufügen
            </button>
          </div>
          <div className="space-y-3">
            {actions.map((action, idx) => {
              const actionOpt = actionOptions.find(a => a.value === action.type);
              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg border flex items-center gap-2"
                  style={{
                    backgroundColor: theme.bg.hover,
                    borderColor: theme.border.light
                  }}
                >
                  <select
                    value={action.type}
                    onChange={(e) => updateAction(idx, 'type', e.target.value)}
                    className="flex-1 px-2 py-1 rounded border text-sm"
                    style={{
                      backgroundColor: theme.bg.main,
                      borderColor: theme.border.default,
                      color: theme.text.primary
                    }}
                  >
                    {actionOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {actionOpt?.valueType === 'number' && (
                    <>
                      <input
                        type="number"
                        value={action.value}
                        onChange={(e) => updateAction(idx, 'value', parseInt(e.target.value))}
                        className="w-20 px-2 py-1 rounded border text-sm"
                        style={{
                          backgroundColor: theme.bg.main,
                          borderColor: theme.border.default,
                          color: theme.text.primary
                        }}
                      />
                      <span className="text-xs" style={{ color: theme.text.muted }}>{actionOpt.unit}</span>
                    </>
                  )}
                  {actionOpt?.valueType === 'toggle' && (
                    <select
                      value={action.value}
                      onChange={(e) => updateAction(idx, 'value', e.target.value)}
                      className="px-2 py-1 rounded border text-sm"
                      style={{
                        backgroundColor: theme.bg.main,
                        borderColor: theme.border.default,
                        color: theme.text.primary
                      }}
                    >
                      <option value="on">Ein</option>
                      <option value="off">Aus</option>
                    </select>
                  )}
                  {actionOpt?.valueType === 'text' && (
                    <input
                      type="text"
                      value={action.value}
                      onChange={(e) => updateAction(idx, 'value', e.target.value)}
                      placeholder="Nachricht"
                      className="flex-1 px-2 py-1 rounded border text-sm"
                      style={{
                        backgroundColor: theme.bg.main,
                        borderColor: theme.border.default,
                        color: theme.text.primary
                      }}
                    />
                  )}
                  <button
                    onClick={() => removeAction(idx)}
                    className="ml-auto p-1 rounded hover:brightness-110"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
            {actions.length === 0 && (
              <div
                className="p-4 rounded-lg border text-center text-sm"
                style={{
                  backgroundColor: theme.bg.hover,
                  borderColor: theme.border.light,
                  color: theme.text.muted
                }}
              >
                Keine Aktionen hinzugefügt
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border transition-all hover:brightness-110"
            style={{
              backgroundColor: theme.bg.hover,
              borderColor: theme.border.default,
              color: theme.text.secondary
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg transition-all hover:brightness-110"
            style={{
              backgroundColor: name && actions.length > 0 ? theme.accent.color : theme.bg.hover,
              color: name && actions.length > 0 ? 'white' : theme.text.muted,
              cursor: name && actions.length > 0 ? 'pointer' : 'not-allowed'
            }}
            disabled={!name || actions.length === 0}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutomationEngine;
