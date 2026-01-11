import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { api } from '../../utils/api';

/**
 * Sensor History Chart
 * Zeigt EC und pH Verlauf über Zeit (Plus Temperatur-Fallback)
 */
const SensorHistoryChart = ({ compact = false }) => {
  const [historyData, setHistoryData] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(24); // hours

  useEffect(() => {
    fetchHistory();
  }, [timeRange]);

  const fetchHistory = async () => {
    try {
      const response = await api.get(`/sensors/history?hours=${timeRange}&limit=100`);
      if (response.data.success) {
        const { history, statistics: stats } = response.data.data;

        // FORMATIERUNG: Jetzt robuster für verschiedene Datenformate
        const formattedData = history.map(item => {
          // Versuche Temp aus verschiedenen Quellen zu lesen
          let tempVal = null;
          if (item.readings && item.readings.temp) tempVal = item.readings.temp;
          else if (item.temperature) tempVal = item.temperature;
          else if (item.readings && item.readings.temp_bottom) tempVal = item.readings.temp_bottom;

          return {
            time: new Date(item.timestamp).toLocaleTimeString('de-DE', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            ec: item.ec || (item.readings ? item.readings.ec : null),
            ph: item.ph || (item.readings ? item.readings.ph : null),
            temp: tempVal
          };
        });

        setHistoryData(formattedData);
        setStatistics(stats);
      }
    } catch (error) {
      console.error('❌ Error fetching sensor history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (historyData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center text-gray-500">
        <AlertTriangle className="mx-auto mb-2" size={24} />
        <p>Keine Sensor-Historie verfügbar</p>
        <p className="text-xs mt-1">Daten werden gesammelt...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-500" />
          <h3 className="text-lg font-semibold">EC & pH Verlauf</h3>
        </div>

        {/* Time Range Selector */}
        {!compact && (
          <div className="flex gap-2">
            {[1, 4, 12, 24, 48].map((hours) => (
              <button
                key={hours}
                onClick={() => setTimeRange(hours)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  timeRange === hours
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {hours}h
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Statistics Bar */}
      {statistics && !compact && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">EC Durchschnitt</div>
            <div className="text-lg font-semibold">{statistics.ec?.average || '--'} mS/cm</div>
            <div className="text-xs text-gray-500">
              Min: {statistics.ec?.min || 0} | Max: {statistics.ec?.max || 0}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">pH Durchschnitt</div>
            <div className="text-lg font-semibold">{statistics.ph?.average || '--'}</div>
            <div className="text-xs text-gray-500">
              Min: {statistics.ph?.min || 0} | Max: {statistics.ph?.max || 0}
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={compact ? 200 : 400}>
        <LineChart data={historyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="time"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            yAxisId="left"
            stroke="#3b82f6"
            style={{ fontSize: '12px' }}
            label={{ value: 'EC (mS/cm)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#8b5cf6"
            style={{ fontSize: '12px' }}
            domain={[0, 14]}
            label={{ value: 'pH', angle: 90, position: 'insideRight', style: { fontSize: '12px' } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
            labelStyle={{ fontWeight: 'bold' }}
          />
          {!compact && <Legend wrapperStyle={{ fontSize: '14px' }} iconType="line" />}

          {/* Target Range Lines */}
          <ReferenceLine yAxisId="left" y={0.8} stroke="#10b981" strokeDasharray="3 3" />
          <ReferenceLine yAxisId="left" y={2.5} stroke="#10b981" strokeDasharray="3 3" />
          <ReferenceLine yAxisId="right" y={5.5} stroke="#8b5cf6" strokeDasharray="3 3" />
          <ReferenceLine yAxisId="right" y={6.5} stroke="#8b5cf6" strokeDasharray="3 3" />

          {/* Data Lines */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="ec"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="EC (mS/cm)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="ph"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            name="pH"
          />
           <Line
            yAxisId="right" // Temp auf rechte Achse mappen oder eigene hinzufügen
            type="monotone"
            dataKey="temp"
            stroke="#f59e0b"
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
            name="Temp (°C)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SensorHistoryChart;