import React, { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import { plantGrowthAPI } from '../../utils/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts';
import { TrendingUp, Loader2, BarChart3 } from 'lucide-react';

/**
 * Plant Height Chart - Wachstumskurven über Zeit
 * Zeigt Höhen-/Breitenverlauf pro Pflanze aus PlantGrowthLog
 */
const PlantHeightChart = ({ plants = [], days = 30 }) => {
  const { currentTheme } = useTheme();
  const theme = currentTheme;
  const [trendData, setTrendData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [chartType, setChartType] = useState('height'); // 'height' | 'width' | 'both'

  const activePlants = plants.filter(p => p.stage !== 'Leer' && p.stage !== 'Geerntet' && p._id);

  useEffect(() => {
    loadTrends();
  }, [plants, days]);

  const loadTrends = async () => {
    if (activePlants.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const results = {};

      await Promise.all(
        activePlants.map(async (plant) => {
          try {
            const res = await plantGrowthAPI.getGrowthTrend(plant._id, days);
            if (res.success && res.data?.length > 0) {
              results[plant._id] = {
                name: plant.name || `Slot ${plant.slotId}`,
                slotId: plant.slotId,
                data: res.data
              };
            }
          } catch (e) {
            // Skip plants without data
          }
        })
      );

      setTrendData(results);

      // Auto-select first plant with data
      const firstKey = Object.keys(results)[0];
      if (firstKey && !selectedPlant) {
        setSelectedPlant(firstKey);
      }
    } catch (error) {
      console.error('Error loading trends:', error);
    } finally {
      setLoading(false);
    }
  };

  // Merge all plant data into one dataset for comparison
  const getMergedData = () => {
    const dateMap = {};

    Object.entries(trendData).forEach(([plantId, plantInfo]) => {
      plantInfo.data.forEach(entry => {
        const dateStr = new Date(entry.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        if (!dateMap[dateStr]) {
          dateMap[dateStr] = { date: dateStr, _rawDate: entry.date };
        }
        dateMap[dateStr][`height_${plantInfo.slotId}`] = entry.height;
        dateMap[dateStr][`width_${plantInfo.slotId}`] = entry.width;
      });
    });

    return Object.values(dateMap).sort((a, b) => new Date(a._rawDate) - new Date(b._rawDate));
  };

  // Single plant data
  const getSinglePlantData = () => {
    if (!selectedPlant || !trendData[selectedPlant]) return [];
    return trendData[selectedPlant].data.map(entry => ({
      date: new Date(entry.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      height: entry.height,
      width: entry.width,
      health: entry.health
    }));
  };

  const PLANT_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div
        className="rounded-2xl p-6 border flex items-center justify-center h-64"
        style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}
      >
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  if (Object.keys(trendData).length === 0) {
    return (
      <div
        className="rounded-2xl p-6 border text-center"
        style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}
      >
        <BarChart3 className="mx-auto mb-3 opacity-30" size={48} style={{ color: theme.text.muted }} />
        <p style={{ color: theme.text.muted }}>Noch keine Wachstumsdaten vorhanden</p>
        <p className="text-sm mt-1" style={{ color: theme.text.muted }}>
          Daten werden automatisch nach dem ersten Tag gesammelt
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}
    >
      {/* Header */}
      <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3"
        style={{ borderColor: theme.border.default }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-emerald-500" />
          <h3 className="font-bold" style={{ color: theme.text.primary }}>
            Wachstumsverlauf
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Plant Selector */}
          <div className="flex gap-1 bg-black/20 rounded-lg p-1">
            <button
              onClick={() => setSelectedPlant(null)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                !selectedPlant
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Alle
            </button>
            {Object.entries(trendData).map(([plantId, info]) => (
              <button
                key={plantId}
                onClick={() => setSelectedPlant(plantId)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  selectedPlant === plantId
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {info.name}
              </button>
            ))}
          </div>

          {/* Chart Type Toggle */}
          <div className="flex gap-1 bg-black/20 rounded-lg p-1">
            {['height', 'width', 'both'].map(type => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  chartType === type
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {type === 'height' ? 'Höhe' : type === 'width' ? 'Breite' : 'Beide'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        <ResponsiveContainer width="100%" height={300}>
          {selectedPlant ? (
            // Single plant view
            <AreaChart data={getSinglePlantData()}>
              <defs>
                <linearGradient id="heightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="widthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border.default} />
              <XAxis dataKey="date" stroke={theme.text.muted} tick={{ fontSize: 11 }} />
              <YAxis stroke={theme.text.muted} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.bg.card,
                  border: `1px solid ${theme.border.default}`,
                  borderRadius: '12px',
                  color: theme.text.primary
                }}
              />
              <Legend />
              {(chartType === 'height' || chartType === 'both') && (
                <Area
                  type="monotone"
                  dataKey="height"
                  stroke="#10b981"
                  fill="url(#heightGrad)"
                  strokeWidth={2}
                  name="Höhe (cm)"
                  dot={{ r: 3, fill: '#10b981' }}
                />
              )}
              {(chartType === 'width' || chartType === 'both') && (
                <Area
                  type="monotone"
                  dataKey="width"
                  stroke="#3b82f6"
                  fill="url(#widthGrad)"
                  strokeWidth={2}
                  name="Breite (cm)"
                  dot={{ r: 3, fill: '#3b82f6' }}
                />
              )}
            </AreaChart>
          ) : (
            // All plants comparison
            <LineChart data={getMergedData()}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border.default} />
              <XAxis dataKey="date" stroke={theme.text.muted} tick={{ fontSize: 11 }} />
              <YAxis stroke={theme.text.muted} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.bg.card,
                  border: `1px solid ${theme.border.default}`,
                  borderRadius: '12px',
                  color: theme.text.primary
                }}
              />
              <Legend />
              {Object.entries(trendData).map(([plantId, info], idx) => (
                <React.Fragment key={plantId}>
                  {(chartType === 'height' || chartType === 'both') && (
                    <Line
                      type="monotone"
                      dataKey={`height_${info.slotId}`}
                      stroke={PLANT_COLORS[idx % PLANT_COLORS.length]}
                      strokeWidth={2}
                      name={`${info.name} (Höhe)`}
                      dot={false}
                      connectNulls
                    />
                  )}
                  {(chartType === 'width' || chartType === 'both') && (
                    <Line
                      type="monotone"
                      dataKey={`width_${info.slotId}`}
                      stroke={PLANT_COLORS[idx % PLANT_COLORS.length]}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name={`${info.name} (Breite)`}
                      dot={false}
                      connectNulls
                    />
                  )}
                </React.Fragment>
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PlantHeightChart;
