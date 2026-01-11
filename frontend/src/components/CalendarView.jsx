import React, { useState, useEffect } from 'react';
import { api, plantGrowthAPI } from '../utils/api';
import { useTheme } from '../theme';
import {
  ChevronLeft, ChevronRight, Plus, Droplets, FlaskConical,
  Scissors, Sprout, Flower2, Calendar as CalIcon, Trash2, X, Moon,
  TrendingUp, Thermometer, Wind, Heart, Leaf, LayoutGrid, List,
  Filter, Download, Eye, Activity, Sun, CloudRain
} from 'lucide-react';

export default function CalendarView({ onNavigateToTracker }) {
  const { currentTheme } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);
  const [events, setEvents] = useState([]);
  const [plants, setPlants] = useState([]);
  const [growthLogs, setGrowthLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'timeline'
  const [filterType, setFilterType] = useState('all'); // 'all', 'water', 'nutrient', 'growth', etc.

  // Form State für neue Events
  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'water',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsData, plantsData] = await Promise.all([
        api.getEvents(),
        api.getPlants()
      ]);
      setEvents(eventsData || []);
      setPlants(plantsData || []);

      // Lade Growth Logs für alle aktiven Pflanzen
      const activePlants = plantsData.filter(p => p._id && p.stage !== 'Leer');
      const logsPromises = activePlants.map(plant =>
        plantGrowthAPI.getLogs(plant._id, { limit: 90 }).catch(err => ({ success: false, data: [] }))
      );
      const logsResults = await Promise.all(logsPromises);

      // Kombiniere alle Logs
      const allLogs = logsResults.flatMap((res, idx) =>
        res.success ? res.data.map(log => ({
          ...log,
          plantName: activePlants[idx].name || `Slot ${activePlants[idx].slotId}`,
          plantId: activePlants[idx]._id,
          plantSlot: activePlants[idx].slotId
        })) : []
      );

      setGrowthLogs(allLogs);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- KALENDER LOGIK ---
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    return { days, firstDay: adjustedFirstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentDate);
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const handleAddEvent = async () => {
    if (!newEvent.title) return;
    try {
      await api.createEvent(newEvent);
      setShowAddModal(false);
      setNewEvent({ title: '', type: 'water', date: new Date().toISOString().split('T')[0], notes: '' });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (confirm('Event löschen?')) {
      await api.deleteEvent(id);
      loadData();
    }
  };

  // --- DATEN ZUSAMMENFÜHREN ---
  const getEventsForDay = (day) => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = checkDate.toISOString().split('T')[0];

    let dailyEvents = [];

    // 1. Manuelle Events aus DB
    const dbEvents = events.filter(e => e.date && e.date.startsWith(dateStr));
    dailyEvents = [...dailyEvents, ...dbEvents.map(e => ({ ...e, source: 'manual' }))];

    // 2. Automatische Pflanzen-Events
    plants.forEach(plant => {
      if (plant.stage === 'Leer') return;

      if (plant.plantedDate && plant.plantedDate.startsWith(dateStr)) {
        dailyEvents.push({
          id: `p-${plant.slotId}-start`,
          title: plant.name || `Slot ${plant.slotId}`,
          type: 'lifecycle',
          icon: <Sprout size={14}/>,
          source: 'auto',
          plant: plant
        });
      }
      if (plant.bloomDate && plant.bloomDate.startsWith(dateStr)) {
        dailyEvents.push({
          id: `p-${plant.slotId}-bloom`,
          title: plant.name || `Slot ${plant.slotId}`,
          type: 'bloom',
          icon: <Flower2 size={14}/>,
          source: 'auto',
          plant: plant
        });
      }
      if (plant.harvestDate && plant.harvestDate.startsWith(dateStr)) {
        dailyEvents.push({
          id: `p-${plant.slotId}-harv`,
          title: plant.name || `Slot ${plant.slotId}`,
          type: 'harvest',
          icon: <Scissors size={14}/>,
          source: 'auto',
          plant: plant
        });
      }
    });

    // 3. Plant Growth Logs
    const logsForDay = growthLogs.filter(log => {
      const logDate = new Date(log.date).toISOString().split('T')[0];
      return logDate === dateStr;
    });

    logsForDay.forEach(log => {
      dailyEvents.push({
        id: `growth-${log._id}`,
        title: log.plantName,
        type: 'growth',
        icon: <TrendingUp size={14}/>,
        data: log,
        source: 'growth'
      });
    });

    // Filter nach Typ
    if (filterType !== 'all') {
      dailyEvents = dailyEvents.filter(e => e.type === filterType);
    }

    return dailyEvents;
  };

  // Event-Styling
  const getEventStyle = (type) => {
    switch(type) {
      case 'water': return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40', glow: 'shadow-blue-500/10' };
      case 'nutrient': return { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40', glow: 'shadow-purple-500/10' };
      case 'training': return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40', glow: 'shadow-orange-500/10' };
      case 'lifecycle': return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40', glow: 'shadow-emerald-500/10' };
      case 'bloom': return { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/40', glow: 'shadow-pink-500/10' };
      case 'harvest': return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40', glow: 'shadow-yellow-500/10' };
      case 'growth': return { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/40', glow: 'shadow-cyan-500/10' };
      default: return { bg: 'bg-slate-700/20', text: 'text-slate-400', border: 'border-slate-600/40', glow: '' };
    }
  };

  // Stats berechnen
  const getMonthStats = () => {
    const monthEvents = [];
    for (let day = 1; day <= days; day++) {
      monthEvents.push(...getEventsForDay(day));
    }

    return {
      total: monthEvents.length,
      water: monthEvents.filter(e => e.type === 'water').length,
      nutrient: monthEvents.filter(e => e.type === 'nutrient').length,
      growth: monthEvents.filter(e => e.type === 'growth').length,
      lifecycle: monthEvents.filter(e => ['lifecycle', 'bloom', 'harvest'].includes(e.type)).length
    };
  };

  const stats = getMonthStats();

  // Detail View für ausgewählten Tag
  const handleDayClick = (day) => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const eventsForDay = getEventsForDay(day);
    setSelectedDate(checkDate);
    setSelectedDayDetails(eventsForDay);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">

      {/* Header mit Statistiken */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 border shadow-xl"
        style={{
          backgroundColor: currentTheme.bg.card,
          borderColor: currentTheme.border.default
        }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div
              className="p-4 rounded-2xl shadow-lg"
              style={{
                backgroundColor: `${currentTheme.accent.color}20`,
                color: currentTheme.accent.color
              }}
            >
              <CalIcon size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-1" style={{ color: currentTheme.text.primary }}>
                {monthNames[currentDate.getMonth()]} <span style={{ color: currentTheme.text.muted }}>{currentDate.getFullYear()}</span>
              </h2>
              <p className="text-sm" style={{ color: currentTheme.text.muted }}>
                Grow Kalender · {stats.total} Einträge diesen Monat
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full lg:w-auto">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.water}</div>
              <div className="text-xs text-blue-400/70">Bewässerung</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-purple-400">{stats.nutrient}</div>
              <div className="text-xs text-purple-400/70">Nährstoffe</div>
            </div>
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-cyan-400">{stats.growth}</div>
              <div className="text-xs text-cyan-400/70">Messungen</div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats.lifecycle}</div>
              <div className="text-xs text-emerald-400/70">Meilensteine</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div
        className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 rounded-xl border"
        style={{
          backgroundColor: currentTheme.bg.card,
          borderColor: currentTheme.border.default
        }}
      >
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 rounded-lg transition-colors"
            style={{
              backgroundColor: `${currentTheme.accent.color}10`,
              color: currentTheme.text.muted
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: `${currentTheme.accent.color}20`,
              color: currentTheme.accent.color
            }}
          >
            Heute
          </button>
          <button
            onClick={() => changeMonth(1)}
            className="p-2 rounded-lg transition-colors"
            style={{
              backgroundColor: `${currentTheme.accent.color}10`,
              color: currentTheme.text.muted
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { value: 'all', label: 'Alle', icon: <Filter size={14} /> },
            { value: 'water', label: 'Wasser', icon: <Droplets size={14} /> },
            { value: 'nutrient', label: 'Nährstoffe', icon: <FlaskConical size={14} /> },
            { value: 'growth', label: 'Messungen', icon: <TrendingUp size={14} /> },
            { value: 'lifecycle', label: 'Meilensteine', icon: <Sprout size={14} /> }
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => setFilterType(filter.value)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                filterType === filter.value
                  ? 'shadow-lg'
                  : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                backgroundColor: filterType === filter.value ? currentTheme.accent.color : `${currentTheme.accent.color}20`,
                color: filterType === filter.value ? '#fff' : currentTheme.accent.color
              }}
            >
              {filter.icon}
              {filter.label}
            </button>
          ))}
        </div>

        {/* Aktionen */}
        <button
          onClick={() => {
            setNewEvent({ ...newEvent, date: new Date().toISOString().split('T')[0] });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow-lg transition-all hover:scale-105"
          style={{
            backgroundColor: currentTheme.accent.color,
            color: '#fff'
          }}
        >
          <Plus size={18} /> Eintrag
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* Hauptkalender */}
        <div
          className="xl:col-span-3 rounded-2xl p-6 border shadow-xl"
          style={{
            backgroundColor: currentTheme.bg.card,
            borderColor: currentTheme.border.default
          }}
        >
          {/* Wochentage */}
          <div className="grid grid-cols-7 mb-4 gap-2">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
              <div
                key={day}
                className="text-center text-sm font-bold uppercase tracking-wider py-2"
                style={{ color: currentTheme.text.muted }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Tage Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Leere Zellen */}
            {[...Array(firstDay)].map((_, i) => (
              <div
                key={`empty-${i}`}
                className="h-28 md:h-32 rounded-xl border opacity-30"
                style={{
                  backgroundColor: `${currentTheme.bg.base}80`,
                  borderColor: currentTheme.border.default
                }}
              ></div>
            ))}

            {/* Tage */}
            {[...Array(days)].map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday = day === new Date().getDate() &&
                            currentDate.getMonth() === new Date().getMonth() &&
                            currentDate.getFullYear() === new Date().getFullYear();

              return (
                <div
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`
                    relative h-28 md:h-32 p-2 rounded-xl border transition-all cursor-pointer group
                    ${isToday ? 'ring-2 shadow-lg' : 'hover:shadow-md'}
                  `}
                  style={{
                    backgroundColor: isToday ? `${currentTheme.accent.color}10` : currentTheme.bg.base,
                    borderColor: isToday ? currentTheme.accent.color : currentTheme.border.default,
                    ringColor: isToday ? currentTheme.accent.color : 'transparent'
                  }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? 'shadow-lg' : ''
                      }`}
                      style={{
                        backgroundColor: isToday ? currentTheme.accent.color : 'transparent',
                        color: isToday ? '#fff' : currentTheme.text.muted
                      }}
                    >
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <div
                        className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${currentTheme.accent.color}30`,
                          color: currentTheme.accent.color
                        }}
                      >
                        {dayEvents.length}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[75%] pr-1 custom-scrollbar">
                    {dayEvents.slice(0, 3).map((evt, idx) => {
                      const style = getEventStyle(evt.type);
                      return (
                        <div
                          key={idx}
                          onClick={(e) => {
                            if (evt.type === 'growth' && evt.data && onNavigateToTracker) {
                              e.stopPropagation();
                              const plant = plants.find(p => p._id === evt.data.plant);
                              if (plant) {
                                onNavigateToTracker(plant, new Date(evt.data.date));
                              }
                            }
                          }}
                          className={`text-xs px-2 py-1 rounded-lg border flex items-center gap-1.5 truncate transition-all ${style.bg} ${style.text} ${style.border} ${
                            evt.type === 'growth' ? 'cursor-pointer hover:scale-105' : ''
                          }`}
                          title={evt.title}
                        >
                          {evt.icon}
                          <span className="truncate">{evt.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div
                        className="text-xs text-center py-1 rounded-lg"
                        style={{
                          backgroundColor: `${currentTheme.accent.color}10`,
                          color: currentTheme.accent.color
                        }}
                      >
                        +{dayEvents.length - 3} mehr
                      </div>
                    )}
                  </div>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 backdrop-blur-[1px] rounded-xl">
                    <Eye size={20} style={{ color: currentTheme.accent.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Ausgewählter Tag Details */}
          {selectedDate && selectedDayDetails && (
            <div
              className="rounded-2xl p-5 border shadow-lg"
              style={{
                backgroundColor: currentTheme.bg.card,
                borderColor: currentTheme.border.default
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold" style={{ color: currentTheme.text.primary }}>
                  {selectedDate.getDate()}. {monthNames[selectedDate.getMonth()]}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: currentTheme.text.muted }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                {selectedDayDetails.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: currentTheme.text.muted }}>
                    Keine Einträge an diesem Tag
                  </p>
                ) : (
                  selectedDayDetails.map((evt, idx) => {
                    const style = getEventStyle(evt.type);
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border ${style.bg} ${style.border}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={style.text}>{evt.icon}</div>
                            <span className={`font-medium text-sm ${style.text}`}>
                              {evt.title}
                            </span>
                          </div>
                          {evt.source === 'manual' && (
                            <button
                              onClick={() => handleDeleteEvent(evt._id)}
                              className="p-1 rounded hover:bg-red-500/20 transition-colors"
                              style={{ color: '#ef4444' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        {/* Growth Log Details */}
                        {evt.type === 'growth' && evt.data && (
                          <div className="mt-2 space-y-1 text-xs" style={{ color: currentTheme.text.muted }}>
                            {evt.data.measurements?.height?.value && (
                              <div className="flex items-center gap-2">
                                <TrendingUp size={12} />
                                <span>Höhe: {evt.data.measurements.height.value} cm</span>
                              </div>
                            )}
                            {evt.data.environment?.avgTemperature && (
                              <div className="flex items-center gap-2">
                                <Thermometer size={12} />
                                <span>Ø Temp: {evt.data.environment.avgTemperature}°C</span>
                              </div>
                            )}
                            {evt.data.environment?.avgHumidity && (
                              <div className="flex items-center gap-2">
                                <Droplets size={12} />
                                <span>Ø Luftf.: {evt.data.environment.avgHumidity}%</span>
                              </div>
                            )}
                            {evt.data.health?.overall && (
                              <div className="flex items-center gap-2">
                                <Heart size={12} />
                                <span>Gesundheit: {evt.data.health.overall}/10</span>
                              </div>
                            )}
                            <button
                              onClick={() => {
                                if (onNavigateToTracker) {
                                  const plant = plants.find(p => p._id === evt.data.plant);
                                  if (plant) {
                                    onNavigateToTracker(plant, new Date(evt.data.date));
                                  }
                                }
                              }}
                              className="mt-2 w-full py-1.5 px-3 rounded-lg font-medium text-xs transition-all hover:scale-105"
                              style={{
                                backgroundColor: currentTheme.accent.color,
                                color: '#fff'
                              }}
                            >
                              Details öffnen →
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Aktive Pflanzen */}
          <div
            className="rounded-2xl p-5 border shadow-lg"
            style={{
              backgroundColor: currentTheme.bg.card,
              borderColor: currentTheme.border.default
            }}
          >
            <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: currentTheme.text.primary }}>
              <Leaf size={18} style={{ color: currentTheme.accent.color }} />
              Aktive Pflanzen
            </h3>

            <div className="space-y-2">
              {plants.filter(p => p._id && p.stage !== 'Leer').length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: currentTheme.text.muted }}>
                  Keine aktiven Pflanzen
                </p>
              ) : (
                plants
                  .filter(p => p._id && p.stage !== 'Leer')
                  .map(plant => {
                    const plantLogs = growthLogs.filter(log => log.plantId === plant._id);
                    const latestLog = plantLogs[0];

                    return (
                      <div
                        key={plant._id}
                        className="p-3 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                        style={{
                          backgroundColor: currentTheme.bg.base,
                          borderColor: currentTheme.border.default
                        }}
                        onClick={() => {
                          if (onNavigateToTracker && latestLog) {
                            onNavigateToTracker(plant, new Date(latestLog.date));
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium" style={{ color: currentTheme.text.primary }}>
                            {plant.name || `Slot ${plant.slotId}`}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: plant.stage === 'Blüte' ? '#ec4899' : '#10b981',
                              color: '#fff'
                            }}
                          >
                            {plant.stage}
                          </span>
                        </div>
                        <div className="text-xs space-y-1" style={{ color: currentTheme.text.muted }}>
                          <div>Strain: {plant.strain || 'N/A'}</div>
                          <div>Messungen: {plantLogs.length}</div>
                          {latestLog && latestLog.measurements?.height?.value && (
                            <div>Letzte Höhe: {latestLog.measurements.height.value} cm</div>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Legende */}
          <div
            className="rounded-2xl p-5 border shadow-lg"
            style={{
              backgroundColor: currentTheme.bg.card,
              borderColor: currentTheme.border.default
            }}
          >
            <h3 className="font-bold mb-3 text-sm uppercase tracking-wider" style={{ color: currentTheme.text.primary }}>
              Legende
            </h3>
            <div className="space-y-2 text-sm" style={{ color: currentTheme.text.muted }}>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Pflanzen Zyklus
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span> Bewässerung
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span> Nährstoffe
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500"></span> Training
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-500"></span> Messungen
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span> Ernte
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl border transform transition-all animate-in zoom-in-95 duration-200"
            style={{
              backgroundColor: currentTheme.bg.card,
              borderColor: currentTheme.border.default
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold" style={{ color: currentTheme.text.primary }}>
                Neuer Eintrag
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: currentTheme.text.muted }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase mb-2 block" style={{ color: currentTheme.text.muted }}>
                  Titel
                </label>
                <input
                  autoFocus
                  type="text"
                  className="w-full rounded-xl p-3 border outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: currentTheme.bg.base,
                    borderColor: currentTheme.border.default,
                    color: currentTheme.text.primary
                  }}
                  placeholder="z.B. Gießen mit CalMag"
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase mb-2 block" style={{ color: currentTheme.text.muted }}>
                    Datum
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl p-3 border outline-none focus:ring-2 transition-all"
                    style={{
                      backgroundColor: currentTheme.bg.base,
                      borderColor: currentTheme.border.default,
                      color: currentTheme.text.primary
                    }}
                    value={newEvent.date}
                    onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase mb-2 block" style={{ color: currentTheme.text.muted }}>
                    Typ
                  </label>
                  <select
                    className="w-full rounded-xl p-3 border outline-none focus:ring-2 transition-all appearance-none"
                    style={{
                      backgroundColor: currentTheme.bg.base,
                      borderColor: currentTheme.border.default,
                      color: currentTheme.text.primary
                    }}
                    value={newEvent.type}
                    onChange={e => setNewEvent({...newEvent, type: e.target.value})}
                  >
                    <option value="water">💧 Gießen</option>
                    <option value="nutrient">🧪 Düngen</option>
                    <option value="training">✂️ Training</option>
                    <option value="note">📝 Notiz</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase mb-2 block" style={{ color: currentTheme.text.muted }}>
                  Notizen (optional)
                </label>
                <textarea
                  className="w-full rounded-xl p-3 border outline-none focus:ring-2 transition-all resize-none"
                  style={{
                    backgroundColor: currentTheme.bg.base,
                    borderColor: currentTheme.border.default,
                    color: currentTheme.text.primary
                  }}
                  rows={3}
                  placeholder="Zusätzliche Details..."
                  value={newEvent.notes}
                  onChange={e => setNewEvent({...newEvent, notes: e.target.value})}
                />
              </div>

              <button
                onClick={handleAddEvent}
                className="w-full py-3 rounded-xl font-bold shadow-lg transition-all hover:scale-105"
                style={{
                  backgroundColor: currentTheme.accent.color,
                  color: '#fff'
                }}
              >
                Eintrag speichern
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
