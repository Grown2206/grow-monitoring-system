import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { Activity, Droplet, Wind, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { vpdAPI } from '../../utils/api';

/**
 * VPD Dashboard Card
 * Zeigt aktuelles VPD mit farbcodiertem Status, Zielbereich und Empfehlungen
 */
const VPDCard = () => {
  const { sensorData } = useSocket();
  const [vpdData, setVpdData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoEnabled, setAutoEnabled] = useState(false);

  // Fetch VPD data from API
  const fetchVPDData = async () => {
    try {
      const response = await vpdAPI.getCurrent();
      if (response.data.success) {
        setVpdData(response.data.data);
        setAutoEnabled(response.data.data.autoControl?.enabled || false);
      }
    } catch (error) {
      // Nur loggen wenn es kein "nicht verfügbar" Fehler ist
      if (!error.message?.includes('nicht verfügbar')) {
        console.error('❌ Error fetching VPD data:', error);
      }
      // Bei Fehler: Fallback auf Socket-Daten wenn verfügbar
      if (sensorData?.temp && sensorData?.humidity) {
        const svp = 0.61078 * Math.exp((17.27 * sensorData.temp) / (sensorData.temp + 237.3));
        const vpd = svp * (1 - sensorData.humidity / 100);
        setVpdData({
          vpd: vpd,
          current: { temp: sensorData.temp, humidity: sensorData.humidity },
          target: { min: 0.8, max: 1.2, optimal: 1.0 },
          analysis: {
            status: vpd >= 0.8 && vpd <= 1.2 ? 'optimal' : vpd < 0.8 ? 'low' : 'high',
            inRange: vpd >= 0.8 && vpd <= 1.2,
            recommendation: null
          },
          autoControl: { enabled: false, growStage: 'vegetative' }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and every 30 seconds
  useEffect(() => {
    fetchVPDData();
    const interval = setInterval(fetchVPDData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Toggle auto-VPD control
  const toggleAutoVPD = async () => {
    try {
      const response = autoEnabled ? await vpdAPI.disable() : await vpdAPI.enable();
      if (response.data.success) {
        setAutoEnabled(!autoEnabled);
        fetchVPDData(); // Refresh data
      }
    } catch (error) {
      console.error('❌ Error toggling auto-VPD:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!vpdData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <AlertTriangle className="mx-auto mb-2" size={24} />
          <p>VPD-Daten nicht verfügbar</p>
        </div>
      </div>
    );
  }

  const { vpd, current, target, analysis, autoControl } = vpdData;

  // Status color mapping
  const statusColors = {
    optimal: 'text-green-500',
    low: 'text-yellow-500',
    high: 'text-orange-500',
    critical_low: 'text-red-500',
    critical_high: 'text-red-500',
    unknown: 'text-gray-500'
  };

  const statusBgColors = {
    optimal: 'bg-green-100 dark:bg-green-900',
    low: 'bg-yellow-100 dark:bg-yellow-900',
    high: 'bg-orange-100 dark:bg-orange-900',
    critical_low: 'bg-red-100 dark:bg-red-900',
    critical_high: 'bg-red-100 dark:bg-red-900',
    unknown: 'bg-gray-100 dark:bg-gray-900'
  };

  const statusIcons = {
    optimal: <CheckCircle size={20} />,
    low: <AlertTriangle size={20} />,
    high: <AlertTriangle size={20} />,
    critical_low: <AlertTriangle size={20} />,
    critical_high: <AlertTriangle size={20} />,
    unknown: <Activity size={20} />
  };

  const statusLabels = {
    optimal: 'Optimal',
    low: 'Zu niedrig',
    high: 'Zu hoch',
    critical_low: 'Kritisch niedrig',
    critical_high: 'Kritisch hoch',
    unknown: 'Unbekannt'
  };

  const growStageLabels = {
    seedling: 'Keimling',
    vegetative: 'Vegetativ',
    flowering: 'Blüte',
    late_flowering: 'Späte Blüte'
  };

  // Calculate percentage within range for visual gauge
  const vpdPercent = Math.min(100, Math.max(0,
    ((vpd - target.min) / (target.max - target.min)) * 100
  ));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Droplet className="text-blue-500" size={24} />
          <h2 className="text-xl font-semibold">VPD Control</h2>
        </div>

        {/* Auto-Control Toggle */}
        <button
          onClick={toggleAutoVPD}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            autoEnabled
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          {autoEnabled ? 'Auto: AN' : 'Auto: AUS'}
        </button>
      </div>

      {/* Current VPD Display */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-bold">{vpd.toFixed(2)}</span>
          <span className="text-gray-500 dark:text-gray-400">kPa</span>
        </div>

        {/* Status Badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${statusBgColors[analysis.status]} ${statusColors[analysis.status]}`}>
          {statusIcons[analysis.status]}
          <span className="font-medium">{statusLabels[analysis.status]}</span>
        </div>
      </div>

      {/* Visual Gauge */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>{target.min} kPa</span>
          <span>Optimal</span>
          <span>{target.max} kPa</span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              analysis.inRange ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ width: `${vpdPercent}%` }}
          />
        </div>
      </div>

      {/* Current Conditions */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-orange-500" />
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Temperatur</div>
            <div className="font-semibold">{current.temp || sensorData.temp}°C</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Droplet size={16} className="text-blue-500" />
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Luftfeuchtigkeit</div>
            <div className="font-semibold">{current.humidity || sensorData.humidity}%</div>
          </div>
        </div>
      </div>

      {/* Target Range Info */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Zielbereich</span>
          <span className="text-sm font-medium">{growStageLabels[autoControl.growStage]}</span>
        </div>
        <div className="text-sm font-mono">
          {target.min.toFixed(1)} - {target.max.toFixed(1)} kPa
          <span className="text-gray-500 dark:text-gray-400 ml-2">(Optimal: {target.optimal.toFixed(1)})</span>
        </div>
      </div>

      {/* Recommendation */}
      {analysis.recommendation && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <TrendingUp size={16} className="text-blue-500 mt-0.5" />
            <div>
              <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                Empfehlung
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {analysis.recommendation}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fan Speed Indicator (if auto-enabled) */}
      {autoEnabled && vpdData.fanSpeed !== undefined && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wind size={16} className="text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Lüftergeschwindigkeit</span>
            </div>
            <span className="font-semibold">{vpdData.fanSpeed}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${vpdData.fanSpeed}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VPDCard;
