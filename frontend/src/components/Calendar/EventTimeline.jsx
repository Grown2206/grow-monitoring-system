import React, { useMemo } from 'react';
import { useTheme } from '../../theme';
import { MONTH_NAMES } from '../../hooks/useCalendarData';
import {
  Clock, Plus, Trash2, Droplets, FlaskConical, Scissors,
  TrendingUp, Sprout, Flower2, FileText, Activity
} from 'lucide-react';

const EVENT_ICONS = {
  water: Droplets,
  nutrient: FlaskConical,
  training: Scissors,
  lifecycle: Sprout,
  bloom: Flower2,
  harvest: Scissors,
  growth: TrendingUp,
  note: FileText
};

export default function EventTimeline({ events, plants, growthLogs, currentDate, getEventStyle, onDeleteEvent, onAddEvent }) {
  const { currentTheme } = useTheme();

  // Alle Events für den aktuellen Monat sammeln und nach Datum gruppieren
  const groupedEvents = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    let allEvents = [];

    // Manuelle Events
    const evtArray = Array.isArray(events) ? events : [];
    evtArray.forEach(e => {
      if (e.date?.startsWith(monthStr)) {
        allEvents.push({ ...e, source: 'manual', sortDate: new Date(e.date) });
      }
    });

    // Plant-Lifecycle Events
    (plants || []).forEach(plant => {
      if (plant.stage === 'Leer') return;
      if (plant.plantedDate?.startsWith(monthStr)) {
        allEvents.push({ id: `p-${plant.slotId}-start`, title: `${plant.name || `Slot ${plant.slotId}`} gepflanzt`, type: 'lifecycle', date: plant.plantedDate, source: 'auto', sortDate: new Date(plant.plantedDate) });
      }
      if (plant.bloomDate?.startsWith(monthStr)) {
        allEvents.push({ id: `p-${plant.slotId}-bloom`, title: `${plant.name || `Slot ${plant.slotId}`} Blütebeginn`, type: 'bloom', date: plant.bloomDate, source: 'auto', sortDate: new Date(plant.bloomDate) });
      }
      if (plant.harvestDate?.startsWith(monthStr)) {
        allEvents.push({ id: `p-${plant.slotId}-harv`, title: `${plant.name || `Slot ${plant.slotId}`} Ernte`, type: 'harvest', date: plant.harvestDate, source: 'auto', sortDate: new Date(plant.harvestDate) });
      }
    });

    // Growth Logs
    (growthLogs || []).forEach(log => {
      const logDate = new Date(log.date).toISOString().split('T')[0];
      if (logDate.startsWith(monthStr)) {
        allEvents.push({ id: `growth-${log._id}`, title: `${log.plantName} Messung`, type: 'growth', date: logDate, source: 'growth', sortDate: new Date(log.date), data: log });
      }
    });

    // Sortieren (neueste zuerst)
    allEvents.sort((a, b) => b.sortDate - a.sortDate);

    // Nach Datum gruppieren
    const groups = {};
    allEvents.forEach(e => {
      const dateStr = e.date?.split('T')[0] || e.date;
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(e);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 15); // Max 15 Tage
  }, [events, plants, growthLogs, currentDate]);

  const totalEvents = groupedEvents.reduce((sum, [, evts]) => sum + evts.length, 0);

  return (
    <div className="rounded-3xl border shadow-2xl backdrop-blur-sm overflow-hidden"
      style={{ backgroundColor: `${currentTheme.bg.card}95`, borderColor: 'rgba(255,255,255,0.05)' }}>

      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: currentTheme.border.default }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            <Clock size={18} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: currentTheme.text.primary }}>Aktivitäten</h3>
            <p className="text-xs" style={{ color: currentTheme.text.muted }}>
              {totalEvents} Einträge in {MONTH_NAMES[currentDate.getMonth()]}
            </p>
          </div>
        </div>
        <button onClick={onAddEvent}
          className="px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-105 shadow-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm">
          <Plus size={16} /> Neuer Eintrag
        </button>
      </div>

      <div className="p-5">
        {groupedEvents.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="mx-auto mb-3 opacity-20" size={40} style={{ color: currentTheme.text.muted }} />
            <p className="text-sm" style={{ color: currentTheme.text.muted }}>Keine Aktivitäten in diesem Monat</p>
            <button onClick={onAddEvent} className="mt-3 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105" style={{ backgroundColor: `${currentTheme.accent.color}15`, color: currentTheme.accent.color }}>
              Ersten Eintrag erstellen
            </button>
          </div>
        ) : (
          <div className="relative">
            {/* Vertikale Linie */}
            <div className="absolute left-[18px] top-2 bottom-2 w-0.5 rounded-full" style={{ backgroundColor: `${currentTheme.border.default}80` }} />

            <div className="space-y-6">
              {groupedEvents.map(([dateStr, dayEvents]) => {
                const date = new Date(dateStr);
                const dayLabel = `${date.getDate()}. ${MONTH_NAMES[date.getMonth()]}`;
                const isToday = new Date().toISOString().split('T')[0] === dateStr;

                return (
                  <div key={dateStr} className="relative">
                    {/* Datums-Label */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center border-2 text-xs font-bold ${isToday ? 'shadow-lg' : ''}`}
                        style={{
                          backgroundColor: isToday ? currentTheme.accent.color : currentTheme.bg.card,
                          borderColor: isToday ? currentTheme.accent.color : currentTheme.border.default,
                          color: isToday ? '#fff' : currentTheme.text.secondary
                        }}
                      >
                        {date.getDate()}
                      </div>
                      <span className="text-sm font-semibold" style={{ color: isToday ? currentTheme.accent.color : currentTheme.text.secondary }}>
                        {dayLabel} {isToday && <span className="text-[10px] ml-1 opacity-70">Heute</span>}
                      </span>
                    </div>

                    {/* Events */}
                    <div className="ml-12 space-y-2">
                      {dayEvents.map((evt, idx) => {
                        const style = getEventStyle(evt.type);
                        const Icon = EVENT_ICONS[evt.type] || Activity;
                        return (
                          <div key={evt.id || idx}
                            className="flex items-center justify-between p-3 rounded-xl border transition-all hover:scale-[1.01]"
                            style={{ backgroundColor: style.bg, borderColor: style.border }}>
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${style.text}20` }}>
                                <Icon size={14} style={{ color: style.text }} />
                              </div>
                              <div>
                                <span className="text-sm font-medium" style={{ color: style.text }}>{evt.title}</span>
                                {evt.description && (
                                  <p className="text-[10px] mt-0.5" style={{ color: `${style.text}80` }}>{evt.description}</p>
                                )}
                                {evt.data?.measurements?.height?.value && (
                                  <p className="text-[10px] mt-0.5" style={{ color: `${style.text}80` }}>
                                    Höhe: {evt.data.measurements.height.value} cm
                                  </p>
                                )}
                              </div>
                            </div>
                            {evt.source === 'manual' && (
                              <button onClick={() => onDeleteEvent(evt._id)}
                                className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors">
                                <Trash2 size={13} className="text-red-400" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
