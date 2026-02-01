import { useState, useEffect, useCallback, useRef } from 'react';
import { api, plantGrowthAPI, calendarAPI } from '../utils/api';

export default function useCalendarData() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [plants, setPlants] = useState([]);
  const [growthLogs, setGrowthLogs] = useState([]);
  const [monthHeatmap, setMonthHeatmap] = useState({});
  const [dailySummary, setDailySummary] = useState(null);
  const [dayDetail, setDayDetail] = useState(null);
  const [weekComparison, setWeekComparison] = useState(null);
  const [monthTrends, setMonthTrends] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '', type: 'water', date: new Date().toISOString().split('T')[0], notes: ''
  });

  const [loading, setLoading] = useState({
    month: true, day: false, trends: false, week: false
  });

  const cache = useRef({});

  // ── Monatsdaten laden ──
  const loadMonthData = useCallback(async () => {
    setLoading(l => ({ ...l, month: true }));
    try {
      const [eventsRes, plantsData] = await Promise.all([
        api.getEvents(),
        api.getPlants()
      ]);
      // getEvents gibt {success, data: []} zurück, getPlants gibt direkt Array zurück
      const eventsArray = Array.isArray(eventsRes) ? eventsRes : (eventsRes?.data || []);
      const plantsArray = Array.isArray(plantsData) ? plantsData : (plantsData?.data || []);
      setEvents(eventsArray);
      setPlants(plantsArray);

      const activePlants = plantsArray.filter(p => p._id && p.stage !== 'Leer');
      const logsPromises = activePlants.map(plant =>
        plantGrowthAPI.getLogs(plant._id, { limit: 90 }).catch(() => ({ success: false, data: [] }))
      );
      const logsResults = await Promise.all(logsPromises);
      const allLogs = logsResults.flatMap((res, idx) =>
        res.success ? res.data.map(log => ({
          ...log,
          plantName: activePlants[idx].name || `Slot ${activePlants[idx].slotId}`,
          plantId: activePlants[idx]._id,
          plantSlot: activePlants[idx].slotId
        })) : []
      );
      setGrowthLogs(allLogs);

      // Heatmap laden
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const heatRes = await calendarAPI.getMonthSummary(year, month).catch(() => null);
      if (heatRes?.success) setMonthHeatmap(heatRes.data || {});

      // Monatstrends laden
      const trendKey = `trends-${year}-${month}`;
      if (cache.current[trendKey]) {
        setMonthTrends(cache.current[trendKey]);
      } else {
        setLoading(l => ({ ...l, trends: true }));
        const trendRes = await calendarAPI.getMonthTrends(year, month).catch(() => null);
        if (trendRes?.success) {
          setMonthTrends(trendRes.data);
          cache.current[trendKey] = trendRes.data;
        }
        setLoading(l => ({ ...l, trends: false }));
      }

      // Wochenvergleich laden
      const week = getISOWeek(new Date());
      const weekKey = `week-${year}-${week}`;
      if (cache.current[weekKey]) {
        setWeekComparison(cache.current[weekKey]);
      } else {
        setLoading(l => ({ ...l, week: true }));
        const weekRes = await calendarAPI.getWeekComparison(year, week).catch(() => null);
        if (weekRes?.success) {
          setWeekComparison(weekRes.data);
          cache.current[weekKey] = weekRes.data;
        }
        setLoading(l => ({ ...l, week: false }));
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kalenderdaten:', error);
    } finally {
      setLoading(l => ({ ...l, month: false }));
    }
  }, [currentDate]);

  useEffect(() => { loadMonthData(); }, [loadMonthData]);

  // ── Tages-Detail laden ──
  const loadDayDetail = useCallback(async (dateStr) => {
    const cacheKey = `day-${dateStr}`;
    if (cache.current[cacheKey]) {
      setDayDetail(cache.current[cacheKey]);
      setDailySummary(cache.current[`summary-${dateStr}`] || null);
      return;
    }
    setLoading(l => ({ ...l, day: true }));
    try {
      const [detailRes, summaryRes] = await Promise.all([
        calendarAPI.getDayDetail(dateStr).catch(() => null),
        calendarAPI.getDailySummary(dateStr).catch(() => null)
      ]);
      if (detailRes?.success) {
        setDayDetail(detailRes.data);
        cache.current[cacheKey] = detailRes.data;
      }
      if (summaryRes?.success) {
        setDailySummary(summaryRes.data);
        cache.current[`summary-${dateStr}`] = summaryRes.data;
      }
    } catch (e) {
      setDayDetail(null);
      setDailySummary(null);
    } finally {
      setLoading(l => ({ ...l, day: false }));
    }
  }, []);

  // ── Tag auswählen ──
  const handleDayClick = useCallback((day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(date);
    const dateStr = date.toISOString().split('T')[0];
    loadDayDetail(dateStr);
  }, [currentDate, loadDayDetail]);

  // ── Events für einen Tag ──
  const getEventsForDay = useCallback((day) => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = checkDate.toISOString().split('T')[0];
    let dailyEvents = [];

    const eventsArray = Array.isArray(events) ? events : [];
    const dbEvents = eventsArray.filter(e => e.date && e.date.startsWith(dateStr));
    dailyEvents.push(...dbEvents.map(e => ({ ...e, source: 'manual' })));

    plants.forEach(plant => {
      if (plant.stage === 'Leer') return;
      if (plant.plantedDate?.startsWith(dateStr)) {
        dailyEvents.push({ id: `p-${plant.slotId}-start`, title: plant.name || `Slot ${plant.slotId}`, type: 'lifecycle', source: 'auto', plant });
      }
      if (plant.bloomDate?.startsWith(dateStr)) {
        dailyEvents.push({ id: `p-${plant.slotId}-bloom`, title: plant.name || `Slot ${plant.slotId}`, type: 'bloom', source: 'auto', plant });
      }
      if (plant.harvestDate?.startsWith(dateStr)) {
        dailyEvents.push({ id: `p-${plant.slotId}-harv`, title: plant.name || `Slot ${plant.slotId}`, type: 'harvest', source: 'auto', plant });
      }
    });

    const logsForDay = growthLogs.filter(log => new Date(log.date).toISOString().split('T')[0] === dateStr);
    logsForDay.forEach(log => {
      dailyEvents.push({ id: `growth-${log._id}`, title: log.plantName, type: 'growth', data: log, source: 'growth' });
    });

    if (filterType !== 'all') {
      dailyEvents = dailyEvents.filter(e => e.type === filterType);
    }
    return dailyEvents;
  }, [currentDate, events, plants, growthLogs, filterType]);

  // ── Event Styles ──
  const getEventStyle = (type) => {
    const styles = {
      water: { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
      nutrient: { bg: 'rgba(168,85,247,0.15)', text: '#c084fc', border: 'rgba(168,85,247,0.3)' },
      training: { bg: 'rgba(249,115,22,0.15)', text: '#fb923c', border: 'rgba(249,115,22,0.3)' },
      lifecycle: { bg: 'rgba(16,185,129,0.15)', text: '#34d399', border: 'rgba(16,185,129,0.3)' },
      bloom: { bg: 'rgba(236,72,153,0.15)', text: '#f472b6', border: 'rgba(236,72,153,0.3)' },
      harvest: { bg: 'rgba(234,179,8,0.15)', text: '#fbbf24', border: 'rgba(234,179,8,0.3)' },
      growth: { bg: 'rgba(6,182,212,0.15)', text: '#22d3ee', border: 'rgba(6,182,212,0.3)' },
      note: { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8', border: 'rgba(100,116,139,0.3)' }
    };
    return styles[type] || styles.note;
  };

  // ── Monatsstatistiken ──
  const getMonthStats = useCallback(() => {
    const { days } = getDaysInMonth(currentDate);
    const monthEvents = [];
    for (let d = 1; d <= days; d++) monthEvents.push(...getEventsForDay(d));
    return {
      total: monthEvents.length,
      water: monthEvents.filter(e => e.type === 'water').length,
      nutrient: monthEvents.filter(e => e.type === 'nutrient').length,
      growth: monthEvents.filter(e => e.type === 'growth').length,
      lifecycle: monthEvents.filter(e => ['lifecycle', 'bloom', 'harvest'].includes(e.type)).length
    };
  }, [currentDate, getEventsForDay]);

  // ── Event erstellen / löschen ──
  const handleAddEvent = async () => {
    if (!newEvent.title) return false;
    try {
      await api.createEvent(newEvent);
      setShowAddModal(false);
      setNewEvent({ title: '', type: 'water', date: new Date().toISOString().split('T')[0], notes: '' });
      loadMonthData();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const handleDeleteEvent = async (id) => {
    try {
      await api.deleteEvent(id);
      loadMonthData();
      return true;
    } catch (e) { return false; }
  };

  // ── Navigation ──
  const changeMonth = (offset) => {
    setSelectedDate(null);
    setDayDetail(null);
    setDailySummary(null);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  return {
    currentDate, selectedDate, setSelectedDate,
    events, plants, growthLogs, monthHeatmap,
    dailySummary, dayDetail, weekComparison, monthTrends,
    filterType, setFilterType,
    showAddModal, setShowAddModal, newEvent, setNewEvent,
    loading,
    changeMonth, goToToday, handleDayClick,
    getEventsForDay, getEventStyle, getMonthStats,
    handleAddEvent, handleDeleteEvent, loadMonthData
  };
}

// ── Hilfsfunktionen ──
export function getDaysInMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  return { days, firstDay: adjustedFirstDay };
}

export function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
export const WEEK_DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
