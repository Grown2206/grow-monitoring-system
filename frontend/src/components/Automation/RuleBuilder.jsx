import React, { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import { api } from '../../utils/api';
import toast from '../../utils/toast';
import {
  X, Plus, Trash2, Thermometer, Droplets, Sun, Wind, Clock,
  Zap, Activity, Save, AlertCircle, Lightbulb, Fan, Droplet,
  Beaker, Flame, Snowflake, ChevronDown, Loader2
} from 'lucide-react';
import { getAllControllableDevices } from '../../constants/devices';

// Condition types - sensor or time-based
const CONDITION_TYPES = [
  { value: 'sensor', label: 'Sensor-Bedingung', icon: Activity },
  { value: 'time', label: 'Zeit / Timer', icon: Clock }
];

const SENSOR_OPTIONS = [
  { value: 'temp_bottom', label: 'Temperatur Unten', icon: Thermometer, unit: '°C' },
  { value: 'temp_middle', label: 'Temperatur Mitte', icon: Thermometer, unit: '°C' },
  { value: 'temp_top', label: 'Temperatur Oben', icon: Thermometer, unit: '°C' },
  { value: 'humidity_bottom', label: 'Luftfeuchtigkeit Unten', icon: Droplets, unit: '%' },
  { value: 'humidity_middle', label: 'Luftfeuchtigkeit Mitte', icon: Droplets, unit: '%' },
  { value: 'humidity_top', label: 'Luftfeuchtigkeit Oben', icon: Droplets, unit: '%' },
  { value: 'vpd', label: 'VPD (berechnet)', icon: Activity, unit: 'kPa' },
  { value: 'light', label: 'Lichtstärke', icon: Sun, unit: 'lux' },
  { value: 'soil_1', label: 'Bodenfeuchtigkeit 1', icon: Droplet, unit: '%' },
  { value: 'soil_2', label: 'Bodenfeuchtigkeit 2', icon: Droplet, unit: '%' },
  { value: 'soil_3', label: 'Bodenfeuchtigkeit 3', icon: Droplet, unit: '%' },
  { value: 'soil_4', label: 'Bodenfeuchtigkeit 4', icon: Droplet, unit: '%' },
  { value: 'soil_5', label: 'Bodenfeuchtigkeit 5', icon: Droplet, unit: '%' },
  { value: 'soil_6', label: 'Bodenfeuchtigkeit 6', icon: Droplet, unit: '%' }
];

// Time-based condition modes
const TIME_MODES = [
  { value: 'between', label: 'Zwischen Uhrzeiten' },
  { value: 'before', label: 'Vor Uhrzeit' },
  { value: 'after', label: 'Nach Uhrzeit' }
];

const OPERATOR_OPTIONS = [
  { value: '>', label: 'größer als (>)' },
  { value: '<', label: 'kleiner als (<)' },
  { value: '>=', label: 'größer oder gleich (>=)' },
  { value: '<=', label: 'kleiner oder gleich (<=)' },
  { value: '==', label: 'gleich (==)' },
  { value: '!=', label: 'ungleich (!=)' },
  { value: 'between', label: 'zwischen (zwischen)' }
];

const COMMAND_OPTIONS = [
  { value: 'ON', label: 'EIN' },
  { value: 'OFF', label: 'AUS' },
  { value: 'PWM', label: 'PWM (0-100%)' }
];

const RuleBuilder = ({ rule = null, onSave, onCancel }) => {
  const { currentTheme } = useTheme();
  const theme = currentTheme;
  const [devices, setDevices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    enabled: true,
    priority: 50,
    cooldown: 300,
    conditions: [{
      type: 'sensor',
      sensor: 'temp_top',
      operator: '>',
      value: 28,
      logicOperator: 'AND'
    }],
    actions: [{
      type: 'mqtt',
      device: '',
      command: 'ON',
      value: 100
    }],
    elseActions: []
  });

  // Normalisiere Zeit-Bedingungen (timeStart/timeEnd -> startTime/endTime)
  const normalizeConditions = (conditions) => {
    if (!conditions || !Array.isArray(conditions)) return [{
      type: 'sensor',
      sensor: 'temp_top',
      operator: '>',
      value: 28,
      logicOperator: 'AND'
    }];

    return conditions.map(cond => {
      if (cond.type === 'time') {
        return {
          ...cond,
          startTime: cond.startTime || cond.timeStart || '06:00',
          endTime: cond.endTime || cond.timeEnd || '18:00',
          timeMode: cond.timeMode || 'between'
        };
      }
      return cond;
    });
  };

  useEffect(() => {
    // Lade Geräte-Liste von Backend
    loadDevices();

    // Wenn Regel bearbeitet wird, lade Daten
    if (rule) {
      setFormData({
        ...rule,
        conditions: normalizeConditions(rule.conditions),
        actions: rule.actions || [{
          type: 'mqtt',
          device: '',
          command: 'ON',
          value: 100
        }],
        elseActions: rule.elseActions || []
      });
    }
  }, [rule]);

  const loadDevices = async () => {
    try {
      const response = await api.get('/devices');
      if (response.success) {
        setDevices(response.data.devices);
      } else {
        // Fallback auf lokale Konstanten
        setDevices(getAllControllableDevices());
      }
    } catch (error) {
      console.error('Fehler beim Laden der Geräte:', error);
      // Fallback auf lokale Konstanten
      setDevices(getAllControllableDevices());
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addCondition = (conditionType = 'sensor') => {
    const newCondition = conditionType === 'time'
      ? {
          type: 'time',
          timeMode: 'between',
          startTime: '06:00',
          endTime: '18:00',
          logicOperator: 'AND'
        }
      : {
          type: 'sensor',
          sensor: 'temp_top',
          operator: '>',
          value: 25,
          logicOperator: 'AND'
        };

    setFormData(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition]
    }));
  };

  const updateCondition = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map((cond, i) =>
        i === index ? { ...cond, [field]: value } : cond
      )
    }));
  };

  const removeCondition = (index) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  const addAction = (isElse = false) => {
    const field = isElse ? 'elseActions' : 'actions';
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], {
        type: 'mqtt',
        device: '',
        command: 'ON',
        value: 100
      }]
    }));
  };

  const updateAction = (index, field, value, isElse = false) => {
    const actionField = isElse ? 'elseActions' : 'actions';
    setFormData(prev => ({
      ...prev,
      [actionField]: prev[actionField].map((action, i) =>
        i === index ? { ...action, [field]: value } : action
      )
    }));
  };

  const removeAction = (index, isElse = false) => {
    const field = isElse ? 'elseActions' : 'actions';
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validierung
    if (!formData.name.trim()) {
      toast.error('Bitte gib einen Namen für die Rule ein');
      return;
    }
    if (formData.conditions.length === 0) {
      toast.error('Mindestens eine Bedingung ist erforderlich');
      return;
    }
    if (formData.actions.length === 0) {
      toast.error('Mindestens eine Aktion ist erforderlich');
      return;
    }
    if (formData.actions.some(a => !a.device)) {
      toast.error('Bitte wähle für alle Aktionen ein Gerät aus');
      return;
    }

    setSaving(true);
    try {
      if (rule) {
        await api.put(`/automation-rules/${rule._id}`, formData);
      } else {
        await api.post('/automation-rules', formData);
      }
      onSave();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error('Rule konnte nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  const getDeviceIcon = (deviceId) => {
    const device = devices.find(d => d.value === deviceId);
    if (!device) return Zap;

    switch (device.icon) {
      case 'Lightbulb': return Lightbulb;
      case 'Fan': return Fan;
      case 'Wind': return Wind;
      case 'Droplets': return Droplet;
      case 'Beaker': return Beaker;
      case 'Thermometer': return Flame;
      case 'Droplet': return Snowflake;
      default: return Zap;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div
        className="max-w-4xl w-full rounded-2xl shadow-2xl my-8"
        style={{ backgroundColor: currentTheme.bg.card }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: currentTheme.border.default }}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: `${currentTheme.accent.color}20` }}>
              <Zap size={24} style={{ color: currentTheme.accent.color }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: currentTheme.text.primary }}>
                {rule ? 'Rule bearbeiten' : 'Neue Automation Rule'}
              </h2>
              <p className="text-sm" style={{ color: currentTheme.text.secondary }}>
                If-Then-Else Logik für automatische Steuerung
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-opacity-10"
            style={{ color: currentTheme.text.muted }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: currentTheme.text.primary }}>
                Rule Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: currentTheme.bg.main,
                  borderColor: currentTheme.border.default,
                  color: currentTheme.text.primary
                }}
                placeholder="z.B. Temperatur-Notfall: Licht aus"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: currentTheme.text.primary }}>
                Beschreibung (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: currentTheme.bg.main,
                  borderColor: currentTheme.border.default,
                  color: currentTheme.text.primary
                }}
                rows={2}
                placeholder="Was macht diese Rule?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: currentTheme.text.primary }}>
                  Priorität (0-100)
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => updateField('priority', parseInt(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: currentTheme.bg.main,
                    borderColor: currentTheme.border.default,
                    color: currentTheme.text.primary
                  }}
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: currentTheme.text.primary }}>
                  Cooldown (Sekunden)
                </label>
                <input
                  type="number"
                  value={formData.cooldown}
                  onChange={(e) => updateField('cooldown', parseInt(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: currentTheme.bg.main,
                    borderColor: currentTheme.border.default,
                    color: currentTheme.text.primary
                  }}
                  min={0}
                />
              </div>
            </div>
          </div>

          {/* Conditions (IF) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: currentTheme.text.primary }}>
                <AlertCircle size={20} style={{ color: currentTheme.accent.color }} />
                IF (Bedingungen)
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addCondition('sensor')}
                  className="px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1"
                  style={{
                    backgroundColor: `${currentTheme.accent.color}20`,
                    color: currentTheme.accent.color
                  }}
                >
                  <Activity size={14} /> Sensor
                </button>
                <button
                  type="button"
                  onClick={() => addCondition('time')}
                  className="px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1"
                  style={{
                    backgroundColor: '#8b5cf620',
                    color: '#8b5cf6'
                  }}
                >
                  <Clock size={14} /> Timer
                </button>
              </div>
            </div>

            {formData.conditions.map((condition, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border space-y-3"
                style={{
                  backgroundColor: currentTheme.bg.hover,
                  borderColor: condition.type === 'time' ? '#8b5cf640' : currentTheme.border.default
                }}
              >
                {/* Condition Type Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
                    style={{
                      backgroundColor: condition.type === 'time' ? '#8b5cf620' : `${currentTheme.accent.color}20`,
                      color: condition.type === 'time' ? '#8b5cf6' : currentTheme.accent.color
                    }}
                  >
                    {condition.type === 'time' ? (
                      <><Clock size={12} /> Zeit-Bedingung</>
                    ) : (
                      <><Activity size={12} /> Sensor-Bedingung</>
                    )}
                  </span>
                </div>

                {/* Time-based Condition UI */}
                {condition.type === 'time' ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.text.secondary }}>
                        Modus
                      </label>
                      <select
                        value={condition.timeMode || 'between'}
                        onChange={(e) => updateCondition(index, 'timeMode', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{
                          backgroundColor: currentTheme.bg.card,
                          borderColor: currentTheme.border.default,
                          color: currentTheme.text.primary
                        }}
                      >
                        {TIME_MODES.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.text.secondary }}>
                        {condition.timeMode === 'between' ? 'Startzeit' : 'Uhrzeit'}
                      </label>
                      <input
                        type="time"
                        value={condition.startTime || '06:00'}
                        onChange={(e) => updateCondition(index, 'startTime', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{
                          backgroundColor: currentTheme.bg.card,
                          borderColor: currentTheme.border.default,
                          color: currentTheme.text.primary
                        }}
                      />
                    </div>
                    {condition.timeMode === 'between' && (
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.text.secondary }}>
                          Endzeit
                        </label>
                        <input
                          type="time"
                          value={condition.endTime || '18:00'}
                          onChange={(e) => updateCondition(index, 'endTime', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border text-sm"
                          style={{
                            backgroundColor: currentTheme.bg.card,
                            borderColor: currentTheme.border.default,
                            color: currentTheme.text.primary
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  /* Sensor-based Condition UI */
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.text.secondary }}>
                        Sensor
                      </label>
                      <select
                        value={condition.sensor}
                        onChange={(e) => updateCondition(index, 'sensor', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{
                          backgroundColor: currentTheme.bg.card,
                          borderColor: currentTheme.border.default,
                          color: currentTheme.text.primary
                        }}
                      >
                        {SENSOR_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.text.secondary }}>
                        Operator
                      </label>
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{
                          backgroundColor: currentTheme.bg.card,
                          borderColor: currentTheme.border.default,
                          color: currentTheme.text.primary
                        }}
                      >
                        {OPERATOR_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.text.secondary }}>
                        Wert
                      </label>
                      <input
                        type="number"
                        value={condition.value}
                        onChange={(e) => updateCondition(index, 'value', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{
                          backgroundColor: currentTheme.bg.card,
                          borderColor: currentTheme.border.default,
                          color: currentTheme.text.primary
                        }}
                        step="0.1"
                      />
                    </div>
                  </div>
                )}

                {index < formData.conditions.length - 1 && (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.text.secondary }}>
                      Verknüpfung
                    </label>
                    <select
                      value={condition.logicOperator || 'AND'}
                      onChange={(e) => updateCondition(index, 'logicOperator', e.target.value)}
                      className="w-32 px-3 py-2 rounded-lg border text-sm"
                      style={{
                        backgroundColor: currentTheme.bg.card,
                        borderColor: currentTheme.border.default,
                        color: currentTheme.text.primary
                      }}
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => removeCondition(index)}
                  className="px-3 py-1 rounded-lg text-sm flex items-center gap-1"
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 size={14} /> Entfernen
                </button>
              </div>
            ))}
          </div>

          {/* Actions (THEN) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: currentTheme.text.primary }}>
                <Zap size={20} style={{ color: '#10b981' }} />
                THEN (Aktionen wenn TRUE)
              </h3>
              <button
                type="button"
                onClick={() => addAction(false)}
                className="px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1"
                style={{ backgroundColor: '#10b98120', color: '#10b981' }}
              >
                <Plus size={16} /> Aktion
              </button>
            </div>

            {formData.actions.map((action, index) => {
              const Icon = getDeviceIcon(action.device);
              const selectedDevice = devices.find(d => d.value === action.device);

              return (
                <div
                  key={index}
                  className="p-4 rounded-lg border space-y-3"
                  style={{
                    backgroundColor: currentTheme.bg.hover,
                    borderColor: currentTheme.border.default
                  }}
                >
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.text.secondary }}>
                        Gerät
                      </label>
                      <div className="relative">
                        <select
                          value={action.device}
                          onChange={(e) => updateAction(index, 'device', e.target.value, false)}
                          className="w-full px-3 py-2 pl-9 rounded-lg border text-sm appearance-none"
                          style={{
                            backgroundColor: currentTheme.bg.card,
                            borderColor: currentTheme.border.default,
                            color: currentTheme.text.primary
                          }}
                          required
                        >
                          <option value="">-- Wählen --</option>
                          {devices.map(dev => (
                            <option key={dev.value} value={dev.value}>
                              {dev.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Icon size={16} style={{ color: selectedDevice?.color || currentTheme.text.muted }} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.text.secondary }}>
                        Befehl
                      </label>
                      <select
                        value={action.command}
                        onChange={(e) => updateAction(index, 'command', e.target.value, false)}
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{
                          backgroundColor: currentTheme.bg.card,
                          borderColor: currentTheme.border.default,
                          color: currentTheme.text.primary
                        }}
                      >
                        {COMMAND_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    {action.command === 'PWM' && (
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.text.secondary }}>
                          PWM (%)
                        </label>
                        <input
                          type="number"
                          value={action.value || 100}
                          onChange={(e) => updateAction(index, 'value', parseInt(e.target.value), false)}
                          className="w-full px-3 py-2 rounded-lg border text-sm"
                          style={{
                            backgroundColor: currentTheme.bg.card,
                            borderColor: currentTheme.border.default,
                            color: currentTheme.text.primary
                          }}
                          min={0}
                          max={100}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeAction(index, false)}
                    className="px-3 py-1 rounded-lg text-sm flex items-center gap-1"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={14} /> Entfernen
                  </button>
                </div>
              );
            })}
          </div>

          {/* ELSE Actions (optional) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: currentTheme.text.primary }}>
                <Zap size={20} style={{ color: '#f59e0b' }} />
                ELSE (Aktionen wenn FALSE - Optional)
              </h3>
              <button
                type="button"
                onClick={() => addAction(true)}
                className="px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1"
                style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}
              >
                <Plus size={16} /> Else-Aktion
              </button>
            </div>

            {formData.elseActions.map((action, index) => {
              const Icon = getDeviceIcon(action.device);
              const selectedDevice = devices.find(d => d.value === action.device);

              return (
                <div
                  key={index}
                  className="p-4 rounded-lg border space-y-3"
                  style={{
                    backgroundColor: currentTheme.bg.hover,
                    borderColor: currentTheme.border.default
                  }}
                >
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.text.secondary }}>
                        Gerät
                      </label>
                      <div className="relative">
                        <select
                          value={action.device}
                          onChange={(e) => updateAction(index, 'device', e.target.value, true)}
                          className="w-full px-3 py-2 pl-9 rounded-lg border text-sm appearance-none"
                          style={{
                            backgroundColor: currentTheme.bg.card,
                            borderColor: currentTheme.border.default,
                            color: currentTheme.text.primary
                          }}
                          required
                        >
                          <option value="">-- Wählen --</option>
                          {devices.map(dev => (
                            <option key={dev.value} value={dev.value}>
                              {dev.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Icon size={16} style={{ color: selectedDevice?.color || currentTheme.text.muted }} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.text.secondary }}>
                        Befehl
                      </label>
                      <select
                        value={action.command}
                        onChange={(e) => updateAction(index, 'command', e.target.value, true)}
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{
                          backgroundColor: currentTheme.bg.card,
                          borderColor: currentTheme.border.default,
                          color: currentTheme.text.primary
                        }}
                      >
                        {COMMAND_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    {action.command === 'PWM' && (
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.text.secondary }}>
                          PWM (%)
                        </label>
                        <input
                          type="number"
                          value={action.value || 100}
                          onChange={(e) => updateAction(index, 'value', parseInt(e.target.value), true)}
                          className="w-full px-3 py-2 rounded-lg border text-sm"
                          style={{
                            backgroundColor: currentTheme.bg.card,
                            borderColor: currentTheme.border.default,
                            color: currentTheme.text.primary
                          }}
                          min={0}
                          max={100}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeAction(index, true)}
                    className="px-3 py-1 rounded-lg text-sm flex items-center gap-1"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={14} /> Entfernen
                  </button>
                </div>
              );
            })}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t" style={{ borderColor: currentTheme.border.default }}>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 rounded-lg font-medium"
            style={{
              backgroundColor: currentTheme.bg.hover,
              color: currentTheme.text.secondary
            }}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            style={{
              backgroundColor: theme.accent.color,
              color: '#ffffff'
            }}
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Speichern...
              </>
            ) : (
              <>
                <Save size={18} />
                {rule ? 'Aktualisieren' : 'Erstellen'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RuleBuilder;
