import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../theme';
import { useSocket } from '../../context/SocketContext';
import { useAlert } from '../../context/AlertContext';
import { api, plantGrowthAPI } from '../../utils/api';
import { calculateVPD } from '../../utils/growMath';
import toast from '../../utils/toast';
import PlantCard from './PlantCard';
import PlantTracker from './PlantTracker';
import PlantHeightChart from './PlantHeightChart';
import PlantAnalysisPanel from './PlantAnalysisPanel';
import {
  Leaf, Sprout, Flower2, TrendingUp, Heart, Ruler,
  BarChart3, Brain, Grid3X3, Eye, Activity, AlertCircle,
  ArrowUp, Droplets, Loader2, RefreshCw, ChevronRight
} from 'lucide-react';

/**
 * PlantManagement - Redesigned Pflanzen-Tab
 *
 * Features:
 * - Hero Header mit Live-Stats (Aktive Pflanzen, Ø Gesundheit, Ø Höhe, Wachstum/Tag)
 * - View-Toggle: Grid | Wachstum | Analyse
 * - PlantCardGrid mit Live-Höhe aus WebSocket
 * - Wachstumskurven (PlantHeightChart)
 * - AI-Analyse Panel (PlantAnalysisPanel)
 * - Kein manuelles Tracking nötig - alles automatisch
 */
const PlantManagement = ({ trackerState, onResetTracker }) => {
  const { currentTheme } = useTheme();
  const theme = currentTheme;
  const { sensorData } = useSocket();
  const { showAlert } = useAlert();

  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'growth' | 'analysis'
  const [filter, setFilter] = useState('all');
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [showTracker, setShowTracker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [liveHeights, setLiveHeights] = useState([]);
  const [statsData, setStatsData] = useState(null);

  // Load plants
  useEffect(() => {
    loadPlants();
  }, []);

  // React to external tracker state (from Calendar)
  useEffect(() => {
    if (trackerState?.plant) {
      setSelectedPlant(trackerState.plant);
      setSelectedDate(trackerState.date || new Date());
      setShowTracker(true);
    }
  }, [trackerState]);

  // Load live heights from WebSocket
  useEffect(() => {
    if (sensorData?.heights) {
      setLiveHeights(sensorData.heights);
    }
  }, [sensorData]);

  // Load growth stats for active plants
  useEffect(() => {
    if (plants.length > 0) {
      loadGrowthStats();
    }
  }, [plants]);

  const loadPlants = async () => {
    try {
      setError(null);
      const data = await api.getPlants();
      const fullSlots = Array.from({ length: 6 }, (_, i) => {
        const existing = data.find(p => p.slotId === i + 1);
        return existing || { slotId: i + 1, stage: 'Leer', name: '', strain: '' };
      });
      setPlants(fullSlots);
    } catch (error) {
      console.error('Fehler beim Laden der Pflanzen:', error);
      setError('Fehler beim Laden der Pflanzen');
      showAlert('Fehler beim Laden der Pflanzen', 'error');
      setPlants(Array.from({ length: 6 }, (_, i) => ({
        slotId: i + 1, stage: 'Leer', name: '', strain: ''
      })));
    } finally {
      setLoading(false);
    }
  };

  const loadGrowthStats = async () => {
    try {
      const activePlants = plants.filter(p => p._id && p.stage !== 'Leer' && p.stage !== 'Geerntet');
      if (activePlants.length === 0) return;

      const statsResults = await Promise.all(
        activePlants.map(async (plant) => {
          try {
            const res = await plantGrowthAPI.getStats(plant._id, 7);
            return res.success ? { plantId: plant._id, ...res.data } : null;
          } catch { return null; }
        })
      );

      const validStats = statsResults.filter(Boolean);
      if (validStats.length > 0) {
        // Calculate aggregated stats
        const heights = validStats.map(s => s.current?.height).filter(Boolean);
        const healths = validStats.map(s => s.current?.health).filter(Boolean);
        const growthRates = validStats.map(s => s.dailyGrowthRate?.height).filter(Boolean);

        setStatsData({
          avgHeight: heights.length > 0 ? heights.reduce((a, b) => a + b, 0) / heights.length : null,
          avgHealth: healths.length > 0 ? healths.reduce((a, b) => a + b, 0) / healths.length : null,
          avgGrowthRate: growthRates.length > 0 ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length : null,
          perPlant: validStats
        });
      }
    } catch (error) {
      console.error('Error loading growth stats:', error);
    }
  };

  // Filter logic
  const filteredPlants = plants.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'veg') return p.stage === 'Vegetation' || p.stage === 'Keimling';
    if (filter === 'bloom') return p.stage === 'Blüte';
    return true;
  });

  const activePlants = plants.filter(p => p.stage !== 'Leer' && p.stage !== 'Geerntet');
  const activeCount = activePlants.length;
  const bloomCount = plants.filter(p => p.stage === 'Blüte').length;
  const vegCount = plants.filter(p => p.stage === 'Vegetation' || p.stage === 'Keimling').length;

  // Get live height for a slot (mm → cm, -1 = ungültig)
  const getLiveHeight = (slotId) => {
    if (!liveHeights || liveHeights.length === 0) return null;
    const heightMM = liveHeights[slotId - 1];
    if (heightMM === undefined || heightMM <= 0) return null;
    return Math.round(heightMM / 10 * 10) / 10; // mm → cm, 1 decimal
  };

  // Tracker view
  if (showTracker && selectedPlant) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300 pb-20">
        <button
          onClick={() => {
            setShowTracker(false);
            setSelectedPlant(null);
            setSelectedDate(null);
            if (onResetTracker) onResetTracker();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
          style={{ color: theme.text.secondary }}
        >
          ← Zurück zu Pflanzen
        </button>
        <PlantTracker
          plantId={selectedPlant._id}
          plantName={selectedPlant.name || `Slot ${selectedPlant.slotId}`}
          initialDate={selectedDate}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0" size={24} />
          <div className="flex-1">
            <div className="font-semibold text-red-400">Fehler</div>
            <div className="text-sm text-red-300">{error}</div>
          </div>
          <button
            onClick={loadPlants}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* HERO HEADER */}
      {/* ═══════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden rounded-2xl border p-6 md:p-8"
        style={{
          background: `linear-gradient(135deg, ${theme.bg.card}, rgba(16, 185, 129, 0.08))`,
          borderColor: 'rgba(16, 185, 129, 0.15)'
        }}
      >
        {/* Animated blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/8 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Title */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3" style={{ color: theme.text.primary }}>
              <Leaf className="text-emerald-500" size={28} />
              Grow Management
            </h2>
            <p className="mt-2 max-w-lg text-sm" style={{ color: theme.text.muted }}>
              Automatisches Pflanzen-Tracking • VL53L0X Höhenmessung • Gemini AI Analyse
            </p>
          </div>

          {/* Stats Badges */}
          <div className="flex flex-wrap gap-3">
            <StatBadge
              label="Aktiv"
              value={activeCount}
              color="#10b981"
              theme={theme}
            />
            <StatBadge
              label="Blüte"
              value={bloomCount}
              color="#a855f7"
              theme={theme}
            />
            <StatBadge
              label="Ø Gesundheit"
              value={statsData?.avgHealth ? `${statsData.avgHealth.toFixed(1)}/10` : '--'}
              color="#f59e0b"
              theme={theme}
            />
            <StatBadge
              label="Ø Höhe"
              value={statsData?.avgHeight ? `${statsData.avgHeight.toFixed(1)} cm` : '--'}
              color="#3b82f6"
              theme={theme}
            />
            {statsData?.avgGrowthRate && (
              <StatBadge
                label="Wachstum/Tag"
                value={`+${statsData.avgGrowthRate.toFixed(1)} cm`}
                color="#10b981"
                icon={<ArrowUp size={12} />}
                theme={theme}
              />
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* VIEW TOGGLE + FILTER BAR */}
      {/* ═══════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* View Mode Toggle */}
        <div
          className="flex gap-1 rounded-xl p-1 border"
          style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}
        >
          {[
            { id: 'grid', icon: <Grid3X3 size={16} />, label: 'Pflanzen' },
            { id: 'growth', icon: <TrendingUp size={16} />, label: 'Wachstum' },
            { id: 'analysis', icon: <Brain size={16} />, label: 'AI-Analyse' }
          ].map(view => (
            <button
              key={view.id}
              onClick={() => setViewMode(view.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === view.id
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : ''
              }`}
              style={viewMode !== view.id ? { color: theme.text.muted } : {}}
            >
              {view.icon}
              <span className="hidden sm:inline">{view.label}</span>
            </button>
          ))}
        </div>

        {/* Filter (only in grid view) */}
        {viewMode === 'grid' && (
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                filter === 'all' ? 'bg-slate-200 text-slate-900' : ''
              }`}
              style={filter !== 'all' ? {
                backgroundColor: theme.bg.card,
                color: theme.text.muted,
                border: `1px solid ${theme.border.default}`
              } : {}}
            >
              Alle ({plants.length})
            </button>
            <button
              onClick={() => setFilter('veg')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                filter === 'veg' ? 'bg-emerald-600 text-white' : ''
              }`}
              style={filter !== 'veg' ? {
                backgroundColor: theme.bg.card,
                color: theme.text.muted,
                border: `1px solid ${theme.border.default}`
              } : {}}
            >
              <Sprout size={14} /> Wachstum ({vegCount})
            </button>
            <button
              onClick={() => setFilter('bloom')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                filter === 'bloom' ? 'bg-purple-600 text-white' : ''
              }`}
              style={filter !== 'bloom' ? {
                backgroundColor: theme.bg.card,
                color: theme.text.muted,
                border: `1px solid ${theme.border.default}`
              } : {}}
            >
              <Flower2 size={14} /> Blüte ({bloomCount})
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* LIVE HEIGHT BAR (compact, always visible when heights available) */}
      {/* ═══════════════════════════════════════════ */}
      {liveHeights.length > 0 && activePlants.length > 0 && viewMode === 'grid' && (
        <div
          className="rounded-2xl border p-4"
          style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Ruler size={16} className="text-blue-400" />
            <span className="text-sm font-medium" style={{ color: theme.text.secondary }}>
              Live-Höhenmessung (VL53L0X)
            </span>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {plants.map(plant => {
              const height = getLiveHeight(plant.slotId);
              const isActive = plant.stage !== 'Leer' && plant.stage !== 'Geerntet';

              return (
                <div
                  key={plant.slotId}
                  className={`rounded-xl p-3 text-center transition-all ${isActive ? 'border' : 'opacity-30'}`}
                  style={{
                    backgroundColor: isActive ? theme.bg.hover : 'transparent',
                    borderColor: height ? 'rgba(59, 130, 246, 0.3)' : theme.border.default
                  }}
                >
                  <p className="text-xs mb-1" style={{ color: theme.text.muted }}>
                    {plant.name || `Slot ${plant.slotId}`}
                  </p>
                  <p className="text-lg font-bold" style={{
                    color: height ? '#3b82f6' : theme.text.muted
                  }}>
                    {height ? `${height} cm` : '--'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* CONTENT BY VIEW MODE */}
      {/* ═══════════════════════════════════════════ */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-[350px] rounded-2xl animate-pulse border"
              style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}
            />
          ))}
        </div>
      ) : (
        <>
          {/* GRID VIEW */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPlants.map(plant => (
                <div key={plant.slotId} className="relative group">
                  <PlantCard
                    plant={plant}
                    onUpdate={loadPlants}
                    moistureRaw={sensorData?.soil?.[plant.slotId - 1]}
                  />
                  {/* Live Height Badge */}
                  {getLiveHeight(plant.slotId) && (
                    <div className="absolute top-3 left-3 bg-blue-500/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-lg">
                      <Ruler size={12} />
                      {getLiveHeight(plant.slotId)} cm
                    </div>
                  )}
                  {/* Tracker Button */}
                  {plant._id && plant.stage !== 'Leer' && (
                    <button
                      onClick={() => {
                        setSelectedPlant(plant);
                        setShowTracker(true);
                      }}
                      className="absolute top-3 right-3 p-2 bg-emerald-600/90 backdrop-blur-sm text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-700 flex items-center gap-1.5 shadow-lg"
                      title="Wachstum Details"
                    >
                      <TrendingUp size={14} />
                      <span className="text-xs font-medium">Details</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* GROWTH VIEW */}
          {viewMode === 'growth' && (
            <div className="space-y-6">
              <PlantHeightChart plants={plants} days={30} />

              {/* Growth Rate Summary */}
              {statsData?.perPlant && (
                <div
                  className="rounded-2xl border p-4"
                  style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}
                >
                  <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
                    <Activity size={18} className="text-emerald-400" />
                    Wachstumsraten (7 Tage)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {activePlants.map(plant => {
                      const plantStats = statsData.perPlant.find(s => s.plantId === plant._id);
                      if (!plantStats) return null;

                      return (
                        <div
                          key={plant._id}
                          className="rounded-xl p-4 border"
                          style={{ backgroundColor: theme.bg.hover, borderColor: theme.border.default }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-sm" style={{ color: theme.text.primary }}>
                              {plant.name || `Slot ${plant.slotId}`}
                            </h4>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              color: '#10b981'
                            }}>
                              {plant.stage}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs" style={{ color: theme.text.muted }}>Höhe</p>
                              <p className="text-lg font-bold" style={{ color: theme.text.primary }}>
                                {plantStats.current?.height?.toFixed(1) || '--'} cm
                              </p>
                            </div>
                            <div>
                              <p className="text-xs" style={{ color: theme.text.muted }}>Wachstum/Tag</p>
                              <p className="text-lg font-bold text-emerald-400">
                                {plantStats.dailyGrowthRate?.height
                                  ? `+${plantStats.dailyGrowthRate.height.toFixed(1)} cm`
                                  : '--'
                                }
                              </p>
                            </div>
                            <div>
                              <p className="text-xs" style={{ color: theme.text.muted }}>Breite</p>
                              <p className="text-lg font-bold" style={{ color: theme.text.primary }}>
                                {plantStats.current?.width?.toFixed(1) || '--'} cm
                              </p>
                            </div>
                            <div>
                              <p className="text-xs" style={{ color: theme.text.muted }}>Gesundheit</p>
                              <p className="text-lg font-bold" style={{
                                color: (plantStats.current?.health || 0) >= 7 ? '#10b981' :
                                       (plantStats.current?.health || 0) >= 5 ? '#f59e0b' : '#ef4444'
                              }}>
                                {plantStats.current?.health ? `${plantStats.current.health}/10` : '--'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ANALYSIS VIEW */}
          {viewMode === 'analysis' && (
            <PlantAnalysisPanel plants={plants} />
          )}
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════
// STAT BADGE COMPONENT
// ═══════════════════════════════════════════
const StatBadge = ({ label, value, color, icon, theme }) => (
  <div
    className="text-center px-4 py-2.5 rounded-xl border backdrop-blur-sm"
    style={{
      backgroundColor: `${color}08`,
      borderColor: `${color}20`
    }}
  >
    <div className="flex items-center justify-center gap-1 text-xl font-bold" style={{ color }}>
      {icon}
      {value}
    </div>
    <div className="text-xs mt-0.5 uppercase tracking-wider" style={{ color: `${color}90` }}>
      {label}
    </div>
  </div>
);

export default PlantManagement;
