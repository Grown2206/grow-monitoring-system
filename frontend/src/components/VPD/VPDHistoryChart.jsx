import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { vpdAPI } from '../../utils/api';

/**
 * VPD History Chart
 * Zeigt VPD-Verlauf über Zeit mit Zielbereich-Overlay
 */
const VPDHistoryChart = ({ compact = false }) => {
  const [historyData, setHistoryData] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [targetRange, setTargetRange] = useState({ min: 0.8, max: 1.2, optimal: 1.0 });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(24); // hours

  useEffect(() => {
    fetchHistory();
  }, [timeRange]);

  const fetchHistory = async () => {
    try {
      const response = await vpdAPI.getHistory({ hours: timeRange, limit: 100 });
      if (response.data.success) {
        const { history, statistics: stats, targetRange: target } = response.data.data;

        // Format data for recharts
        const formattedData = history.map(item => ({
          time: new Date(item.timestamp).toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          vpd: item.vpd,
          temp: item.temp,
          humidity: item.humidity,
          inRange: item.vpd >= target.min && item.vpd <= target.max
        }));

        setHistoryData(formattedData);
        setStatistics(stats);
        setTargetRange(target);
      }
    } catch (error) {
      console.error('❌ Error fetching VPD history:', error);
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
        <p>Keine VPD-Historie verfügbar</p>
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
          <h3 className="text-lg font-semibold">VPD Verlauf</h3>
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
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Durchschnitt</div>
            <div className="text-lg font-semibold">{statistics.average} kPa</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Im Zielbereich</div>
            <div className="text-lg font-semibold">{statistics.percentInRange}%</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Datenpunkte</div>
            <div className="text-lg font-semibold">{statistics.dataPoints}</div>
          </div>
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={compact ? 200 : 400}>
        <ComposedChart data={historyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="time"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            domain={[0, 'auto']}
            label={{ value: 'VPD (kPa)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
            labelStyle={{ fontWeight: 'bold' }}
          />
          {!compact && (
            <Legend
              wrapperStyle={{ fontSize: '14px' }}
              iconType="line"
            />
          )}

          {/* Target Range Area */}
          <ReferenceLine y={targetRange.min} stroke="#10b981" strokeDasharray="3 3" />
          <ReferenceLine y={targetRange.max} stroke="#10b981" strokeDasharray="3 3" />
          <ReferenceLine y={targetRange.optimal} stroke="#10b981" strokeWidth={2} label="Optimal" />

          {/* VPD Line */}
          <Line
            type="monotone"
            dataKey="vpd"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="VPD"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>VPD Wert</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-green-500 border-dashed"></div>
          <span>Zielbereich</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-green-500"></div>
          <span>Optimal</span>
        </div>
      </div>

      {/* Refresh Info */}
      {!compact && (
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
          <Clock size={14} />
          <span>Letzte Aktualisierung: {new Date().toLocaleTimeString('de-DE')}</span>
        </div>
      )}
    </div>
  );
};

export default VPDHistoryChart;
