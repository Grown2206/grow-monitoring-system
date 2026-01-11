import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import { api } from '../../utils/api';

/**
 * VPD Configuration Panel
 * Ermöglicht Anpassung aller VPD-Einstellungen
 */
const VPDConfigPanel = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/vpd/config');
      if (response.success) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error('❌ Error fetching VPD config:', error);
      setMessage({ type: 'error', text: 'Fehler beim Laden der Konfiguration' });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await api.put('/vpd/config', {
        growStage: config.growStage,
        aggressiveness: config.aggressiveness,
        fanLimits: config.fanLimits,
        updateInterval: config.updateInterval,
        hysteresis: config.hysteresis,
        emergency: config.emergency,
        customTarget: config.customTarget
      });
      if (response.success) {
        setMessage({ type: 'success', text: 'Konfiguration erfolgreich gespeichert!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('❌ Error saving VPD config:', error);
      setMessage({ type: 'error', text: 'Fehler beim Speichern der Konfiguration' });
    } finally {
      setSaving(false);
    }
  };

  const resetConfig = async () => {
    if (!confirm('Möchtest du die Konfiguration auf Standard zurücksetzen?')) return;

    setSaving(true);
    setMessage(null);
    try {
      const response = await api.post('/vpd/config/reset');
      if (response.success) {
        setMessage({ type: 'success', text: 'Konfiguration zurückgesetzt!' });
        fetchConfig(); // Reload config
      }
    } catch (error) {
      console.error('❌ Error resetting VPD config:', error);
      setMessage({ type: 'error', text: 'Fehler beim Zurücksetzen der Konfiguration' });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (parent, field, value) => {
    setConfig(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center text-gray-500">
        <AlertTriangle className="mx-auto mb-2" size={24} />
        <p>Konfiguration nicht verfügbar</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Settings size={20} />
          <h2 className="text-xl font-semibold">VPD Konfiguration</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetConfig}
            disabled={saving}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            <RotateCcw size={16} className="inline mr-1" />
            Zurücksetzen
          </button>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? (
              'Speichern...'
            ) : (
              <>
                <Save size={16} className="inline mr-1" />
                Speichern
              </>
            )}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
            : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Grow Stage */}
      <div>
        <label className="block text-sm font-medium mb-2">Wachstumsphase</label>
        <select
          value={config.growStage}
          onChange={(e) => updateField('growStage', e.target.value)}
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
        >
          <option value="seedling">Keimling (0.4-0.8 kPa)</option>
          <option value="vegetative">Vegetativ (0.8-1.2 kPa)</option>
          <option value="flowering">Blüte (1.0-1.5 kPa)</option>
          <option value="late_flowering">Späte Blüte (1.2-1.6 kPa)</option>
        </select>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Bestimmt den optimalen VPD-Zielbereich
        </p>
      </div>

      {/* Aggressiveness */}
      <div>
        <label className="block text-sm font-medium mb-2">Regelungs-Aggressivität</label>
        <div className="grid grid-cols-3 gap-2">
          {['gentle', 'normal', 'aggressive'].map((level) => (
            <button
              key={level}
              onClick={() => updateField('aggressiveness', level)}
              className={`p-3 rounded-lg border-2 transition-all ${
                config.aggressiveness === level
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="text-sm font-medium capitalize">{level}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {level === 'gentle' && '±5% pro Schritt'}
                {level === 'normal' && '±10% pro Schritt'}
                {level === 'aggressive' && '±15% pro Schritt'}
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Wie schnell soll auf VPD-Änderungen reagiert werden?
        </p>
      </div>

      {/* Fan Limits */}
      <div>
        <label className="block text-sm font-medium mb-2">Lüfter-Grenzen</label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Minimum (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={config.fanLimits.min}
              onChange={(e) => updateNestedField('fanLimits', 'min', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Maximum (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={config.fanLimits.max}
              onChange={(e) => updateNestedField('fanLimits', 'max', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 mt-1"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Lüftergeschwindigkeit wird zwischen diesen Werten geregelt
        </p>
      </div>

      {/* Update Interval */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Update-Intervall: {config.updateInterval} Sekunden
        </label>
        <input
          type="range"
          min="10"
          max="300"
          step="10"
          value={config.updateInterval}
          onChange={(e) => updateField('updateInterval', parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>10s</span>
          <span>300s</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Wie oft soll VPD geprüft werden?
        </p>
      </div>

      {/* Hysteresis */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Hysterese-Schwellenwert: {config.hysteresis.threshold} kPa
        </label>
        <input
          type="range"
          min="0.01"
          max="0.5"
          step="0.01"
          value={config.hysteresis.threshold}
          onChange={(e) => updateNestedField('hysteresis', 'threshold', parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>0.01 kPa</span>
          <span>0.5 kPa</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Minimale VPD-Änderung für Aktion (verhindert zu häufiges Schalten)
        </p>
      </div>

      {/* Emergency Thresholds */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="font-medium mb-4">Notfall-Modi</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Kritisch niedrig (kPa)
            </label>
            <input
              type="number"
              min="0.1"
              max="2.0"
              step="0.1"
              value={config.emergency.criticalLowVPD.threshold}
              onChange={(e) => updateNestedField('emergency', 'criticalLowVPD', {
                ...config.emergency.criticalLowVPD,
                threshold: parseFloat(e.target.value)
              })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Kritisch hoch (kPa)
            </label>
            <input
              type="number"
              min="0.1"
              max="3.0"
              step="0.1"
              value={config.emergency.criticalHighVPD.threshold}
              onChange={(e) => updateNestedField('emergency', 'criticalHighVPD', {
                ...config.emergency.criticalHighVPD,
                threshold: parseFloat(e.target.value)
              })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VPDConfigPanel;
