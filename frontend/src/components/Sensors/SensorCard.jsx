import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { Droplets, Activity, Thermometer, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';

/**
 * Sensor Card
 * Zeigt aktuelle EC, pH und Temperatur-Werte
 */
const SensorCard = () => {
  const { nutrientSensors } = useSocket();
  const [sensorData, setSensorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch sensor data from API
  const fetchSensorData = async () => {
    try {
      const response = await api.get('/sensors/current');
      if (response.data.success) {
        setSensorData(response.data.data);
      }
    } catch (error) {
      console.error('❌ Error fetching sensor data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh
  const triggerRefresh = async () => {
    setRefreshing(true);
    try {
      await api.post('/sensors/read');
      setTimeout(() => {
        fetchSensorData();
        setRefreshing(false);
      }, 2000); // Wait for sensor to read
    } catch (error) {
      console.error('❌ Error triggering refresh:', error);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSensorData();
    const interval = setInterval(fetchSensorData, 30000); // Every 30s
    return () => clearInterval(interval);
  }, []);

  // Use real-time data from Socket.io if available
  const currentEC = nutrientSensors.ec || sensorData?.ec?.value || 0;
  const currentPH = nutrientSensors.ph || sensorData?.ph?.value || 0;
  const currentTemp = nutrientSensors.temp || sensorData?.temperature || 0;
  const reservoirLevel = nutrientSensors.reservoirLevel_percent || sensorData?.reservoir?.level || 0;

  const calibrated = sensorData?.calibrated || { ec: false, ph: false };
  const alerts = sensorData?.alerts || [];

  // Status colors
  const getECColor = (ec) => {
    if (ec < 0.8) return 'text-yellow-500';
    if (ec > 2.5) return 'text-red-500';
    return 'text-green-500';
  };

  const getPHColor = (ph) => {
    if (ph < 5.5) return 'text-yellow-500';
    if (ph > 6.5) return 'text-orange-500';
    if (ph < 5.0 || ph > 7.0) return 'text-red-500';
    return 'text-green-500';
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Droplets className="text-blue-500" size={24} />
          <h2 className="text-xl font-semibold">EC / pH Sensoren</h2>
        </div>

        {/* Refresh Button */}
        <button
          onClick={triggerRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-4 space-y-2">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                alert.severity === 'critical'
                  ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
              }`}
            >
              <AlertTriangle size={16} />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Readings */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* EC */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">EC</span>
            {calibrated.ec ? (
              <CheckCircle size={16} className="text-green-500" title="Kalibriert" />
            ) : (
              <AlertTriangle size={16} className="text-yellow-500" title="Nicht kalibriert" />
            )}
          </div>
          <div className={`text-3xl font-bold ${getECColor(currentEC)}`}>
            {currentEC.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            mS/cm ({Math.round(currentEC * 500)} ppm)
          </div>
        </div>

        {/* pH */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">pH</span>
            {calibrated.ph ? (
              <CheckCircle size={16} className="text-green-500" title="Kalibriert" />
            ) : (
              <AlertTriangle size={16} className="text-yellow-500" title="Nicht kalibriert" />
            )}
          </div>
          <div className={`text-3xl font-bold ${getPHColor(currentPH)}`}>
            {currentPH.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Optimal: 5.5 - 6.5
          </div>
        </div>
      </div>

      {/* Secondary Info */}
      <div className="grid grid-cols-2 gap-4">
        {/* Temperature */}
        <div className="flex items-center gap-2">
          <Thermometer size={16} className="text-orange-500" />
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Temperatur</div>
            <div className="font-semibold">{currentTemp.toFixed(1)}°C</div>
          </div>
        </div>

        {/* Reservoir Level */}
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-blue-500" />
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Reservoir</div>
            <div className="font-semibold">{reservoirLevel.toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {/* Calibration Status */}
      {(!calibrated.ec || !calibrated.ph) && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            ⚠️ Sensoren nicht vollständig kalibriert. Für genaue Messungen bitte kalibrieren.
          </div>
        </div>
      )}

      {/* Last Update */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Letzte Aktualisierung: {new Date(sensorData?.timestamp || Date.now()).toLocaleTimeString('de-DE')}
      </div>
    </div>
  );
};

export default SensorCard;
