import React, { useState, useEffect } from 'react';
import { plantGrowthAPI } from '../../utils/api';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../theme';
import {
  TrendingUp, Calendar, Droplet, Thermometer, Wind, Heart,
  Camera, Activity, Award, Plus, Save, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

/**
 * Plant Growth Tracker
 * Tägliche Messungen und Wachstumstracking
 */
const PlantTracker = ({ plantId, plantName, initialDate }) => {
  const { currentTheme } = useTheme();
  const [logs, setLogs] = useState([]);
  const [currentLog, setCurrentLog] = useState(null);
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useAlert();

  // Update selectedDate wenn initialDate sich ändert
  useEffect(() => {
    if (initialDate) {
      setSelectedDate(new Date(initialDate));
    }
  }, [initialDate]);

  // Form State
  const [formData, setFormData] = useState({
    measurements: {
      height: { value: '', unit: 'cm' },
      width: { value: '', unit: 'cm' },
      stemDiameter: { value: '', unit: 'mm' },
      leafCount: '',
      nodeCount: '',
      internodeLength: ''
    },
    health: {
      overall: 5,
      leafColor: 'dunkelgrün',
      issues: []
    },
    environment: {
      avgTemperature: '',
      avgHumidity: '',
      avgVPD: '',
      avgSoilMoisture: '',
      lightHours: '',
      waterAmount: ''
    },
    nutrients: {
      ec: '',
      ph: '',
      given: false,
      amount: '',
      notes: ''
    },
    activities: [],
    photos: [],
    notes: '',
    milestones: []
  });

  useEffect(() => {
    loadData();
  }, [plantId]);

  useEffect(() => {
    loadLogForDate(selectedDate);
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [logsRes, statsRes, trendRes] = await Promise.all([
        plantGrowthAPI.getLogs(plantId, { limit: 30 }),
        plantGrowthAPI.getStats(plantId, 7),
        plantGrowthAPI.getGrowthTrend(plantId, 30)
      ]);

      if (logsRes.success) setLogs(logsRes.data);
      if (statsRes.success) setStats(statsRes.data);
      if (trendRes.success) setTrendData(trendRes.data);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      showAlert('Fehler beim Laden der Daten', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadLogForDate = async (date) => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const response = await plantGrowthAPI.getLogByDate(plantId, dateStr);

      if (response.success) {
        setCurrentLog(response.data);
        setFormData(response.data);
      } else {
        // Kein Log für diesen Tag - leeres Formular
        setCurrentLog(null);
        resetForm();
      }
    } catch (error) {
      // Kein Log vorhanden
      setCurrentLog(null);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      measurements: {
        height: { value: '', unit: 'cm' },
        width: { value: '', unit: 'cm' },
        stemDiameter: { value: '', unit: 'mm' },
        leafCount: '',
        nodeCount: '',
        internodeLength: ''
      },
      health: {
        overall: 5,
        leafColor: 'dunkelgrün',
        issues: []
      },
      environment: {
        avgTemperature: '',
        avgHumidity: '',
        avgVPD: '',
        avgSoilMoisture: '',
        lightHours: '',
        waterAmount: ''
      },
      nutrients: {
        ec: '',
        ph: '',
        given: false,
        amount: '',
        notes: ''
      },
      activities: [],
      photos: [],
      notes: '',
      milestones: []
    });
  };

  const handleSave = async () => {
    try {
      const response = await plantGrowthAPI.createOrUpdateLog(plantId, {
        ...formData,
        date: selectedDate.toISOString()
      });

      if (response.success) {
        showAlert('Messungen gespeichert!', 'success');
        setShowForm(false);
        loadData();
        loadLogForDate(selectedDate);
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      showAlert('Fehler beim Speichern', 'error');
    }
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const addActivity = (type) => {
    setFormData(prev => ({
      ...prev,
      activities: [...prev.activities, {
        type,
        description: '',
        time: new Date()
      }]
    }));
  };

  const updateMeasurement = (field, value) => {
    setFormData(prev => ({
      ...prev,
      measurements: {
        ...prev.measurements,
        [field]: typeof prev.measurements[field] === 'object'
          ? { ...prev.measurements[field], value: parseFloat(value) || '' }
          : parseFloat(value) || ''
      }
    }));
  };

  const updateEnvironment = (field, value) => {
    setFormData(prev => ({
      ...prev,
      environment: {
        ...prev.environment,
        [field]: parseFloat(value) || ''
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Plant Tracker</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{plantName}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Abbrechen' : 'Messung hinzufügen'}
        </button>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-center gap-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => changeDate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <Calendar className="text-emerald-500" size={20} />
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <button
          onClick={() => changeDate(1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div
            className="rounded-xl p-4 border"
            style={{
              backgroundColor: currentTheme.bg.card,
              borderColor: currentTheme.border.default
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp style={{ color: currentTheme.accent.color }} size={20} />
              <span className="text-sm" style={{ color: currentTheme.text.muted }}>Aktuelle Höhe</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: currentTheme.text.primary }}>
              {stats.current?.height ? `${stats.current.height.toFixed(1)} cm` : 'N/A'}
            </p>
            {stats.totalGrowth && (
              <p className="text-xs text-gray-500 mt-1">
                +{stats.totalGrowth.height.toFixed(1)} cm in {stats.totalGrowth.days} Tagen
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-blue-500" size={20} />
              <span className="text-sm text-gray-500">Aktuelle Breite</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.current?.width ? `${stats.current.width.toFixed(1)} cm` : 'N/A'}
            </p>
            {stats.totalGrowth && (
              <p className="text-xs text-gray-500 mt-1">
                +{stats.totalGrowth.width.toFixed(1)} cm in {stats.totalGrowth.days} Tagen
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Heart className="text-red-500" size={20} />
              <span className="text-sm text-gray-500">Gesundheit</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.current?.health ? `${stats.current.health}/10` : 'N/A'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Ø {stats.averages?.avgHealth ? stats.averages.avgHealth.toFixed(1) : 'N/A'}/10 (7 Tage)
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Droplet className="text-blue-500" size={20} />
              <span className="text-sm text-gray-500">Ø Bodenfeuchtigkeit</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.averages?.avgSoilMoisture ? `${stats.averages.avgSoilMoisture.toFixed(1)}%` : 'N/A'}
            </p>
            <p className="text-xs text-gray-500 mt-1">7 Tage Durchschnitt</p>
          </div>
        </div>
      )}

      {/* Growth Trend Chart */}
      {trendData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="text-emerald-500" size={20} />
            Wachstumsverlauf (30 Tage)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                stroke="#9CA3AF"
              />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                labelFormatter={(date) => new Date(date).toLocaleDateString('de-DE')}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="height"
                stroke="#10B981"
                name="Höhe (cm)"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="width"
                stroke="#3B82F6"
                name="Breite (cm)"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Measurement Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-6">
          <h3 className="font-bold text-lg">Messungen für {selectedDate.toLocaleDateString('de-DE')}</h3>

          {/* Measurements */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500" />
              Wachstums-Messungen
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Höhe (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.measurements.height.value}
                  onChange={(e) => updateMeasurement('height', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="z.B. 25.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Breite (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.measurements.width.value}
                  onChange={(e) => updateMeasurement('width', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="z.B. 30.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stammdicke (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.measurements.stemDiameter.value}
                  onChange={(e) => updateMeasurement('stemDiameter', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="z.B. 8.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Blattanzahl</label>
                <input
                  type="number"
                  value={formData.measurements.leafCount}
                  onChange={(e) => updateMeasurement('leafCount', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="z.B. 12"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Knotenanzahl</label>
                <input
                  type="number"
                  value={formData.measurements.nodeCount}
                  onChange={(e) => updateMeasurement('nodeCount', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="z.B. 6"
                />
              </div>
            </div>
          </div>

          {/* Health */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Heart size={18} className="text-red-500" />
              Gesundheit
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Gesamt (1-10)</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.health.overall}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    health: { ...prev.health, overall: parseInt(e.target.value) }
                  }))}
                  className="w-full"
                />
                <p className="text-center text-2xl font-bold text-emerald-500">{formData.health.overall}/10</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Blattfarbe</label>
                <select
                  value={formData.health.leafColor}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    health: { ...prev.health, leafColor: e.target.value }
                  }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="dunkelgrün">Dunkelgrün</option>
                  <option value="hellgrün">Hellgrün</option>
                  <option value="gelblich">Gelblich</option>
                  <option value="braun">Braun</option>
                  <option value="gefleckt">Gefleckt</option>
                </select>
              </div>
            </div>
          </div>

          {/* Environment */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Thermometer size={18} className="text-orange-500" />
              Umgebung (Durchschnittswerte)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Temperatur (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.environment.avgTemperature}
                  onChange={(e) => updateEnvironment('avgTemperature', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="z.B. 24.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Luftfeuchtigkeit (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.environment.avgHumidity}
                  onChange={(e) => updateEnvironment('avgHumidity', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="z.B. 65"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">VPD (kPa)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.environment.avgVPD}
                  onChange={(e) => updateEnvironment('avgVPD', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="z.B. 1.2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bodenfeuchtigkeit (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.environment.avgSoilMoisture}
                  onChange={(e) => updateEnvironment('avgSoilMoisture', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="z.B. 45"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lichtstunden</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.environment.lightHours}
                  onChange={(e) => updateEnvironment('lightHours', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="z.B. 18"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Wassermenge (ml)</label>
                <input
                  type="number"
                  value={formData.environment.waterAmount}
                  onChange={(e) => updateEnvironment('waterAmount', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="z.B. 500"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Notizen</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Besondere Beobachtungen..."
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Save size={16} />
              Speichern
            </button>
          </div>
        </div>
      )}

      {/* Current Log Display */}
      {!showForm && currentLog && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">
              Messung vom {new Date(currentLog.date).toLocaleDateString('de-DE')}
            </h3>
            <button
              onClick={() => setShowForm(true)}
              className="text-sm text-emerald-500 hover:text-emerald-600"
            >
              Bearbeiten
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {currentLog.measurements.height?.value && (
              <div>
                <p className="text-sm text-gray-500">Höhe</p>
                <p className="text-lg font-bold">{currentLog.measurements.height.value} cm</p>
              </div>
            )}
            {currentLog.measurements.width?.value && (
              <div>
                <p className="text-sm text-gray-500">Breite</p>
                <p className="text-lg font-bold">{currentLog.measurements.width.value} cm</p>
              </div>
            )}
            {currentLog.health.overall && (
              <div>
                <p className="text-sm text-gray-500">Gesundheit</p>
                <p className="text-lg font-bold">{currentLog.health.overall}/10</p>
              </div>
            )}
            {currentLog.environment.avgSoilMoisture && (
              <div>
                <p className="text-sm text-gray-500">Bodenfeuchtigkeit</p>
                <p className="text-lg font-bold">{currentLog.environment.avgSoilMoisture}%</p>
              </div>
            )}
          </div>

          {currentLog.notes && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">{currentLog.notes}</p>
            </div>
          )}
        </div>
      )}

      {!showForm && !currentLog && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Activity className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Keine Messungen für {selectedDate.toLocaleDateString('de-DE')}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Messung hinzufügen
          </button>
        </div>
      )}
    </div>
  );
};

export default PlantTracker;
