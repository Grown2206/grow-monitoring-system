import React from 'react';
import { useTheme } from '../../theme';
import toast from '../../utils/toast';
import useCalendarData from '../../hooks/useCalendarData';
import CalendarHero from './CalendarHero';
import CalendarGrid from './CalendarGrid';
import DayDetailPanel from './DayDetailPanel';
import TrendsPanel from './TrendsPanel';
import MonthSummary from './MonthSummary';
import EventTimeline from './EventTimeline';
import {
  Plus, X
} from 'lucide-react';

export default function CalendarPage({ onNavigateToTracker }) {
  const { currentTheme } = useTheme();
  const cal = useCalendarData();

  const handleAdd = async () => {
    const ok = await cal.handleAddEvent();
    if (ok) toast.success('Eintrag erstellt');
    else if (cal.newEvent.title) toast.error('Fehler beim Erstellen');
    else toast.error('Bitte gib einen Titel ein');
  };

  const handleDelete = async (id) => {
    if (!confirm('Event löschen?')) return;
    const ok = await cal.handleDeleteEvent(id);
    if (ok) toast.success('Eintrag gelöscht');
    else toast.error('Fehler beim Löschen');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Hero */}
      <CalendarHero
        currentDate={cal.currentDate}
        plants={cal.plants}
        monthTrends={cal.monthTrends}
        stats={cal.getMonthStats()}
        changeMonth={cal.changeMonth}
      />

      {/* Kalender-Grid */}
      <CalendarGrid
        currentDate={cal.currentDate}
        selectedDate={cal.selectedDate}
        monthHeatmap={cal.monthHeatmap}
        filterType={cal.filterType}
        setFilterType={cal.setFilterType}
        getEventsForDay={cal.getEventsForDay}
        getEventStyle={cal.getEventStyle}
        handleDayClick={cal.handleDayClick}
        goToToday={cal.goToToday}
        onAddEvent={() => {
          cal.setNewEvent({ ...cal.newEvent, date: cal.selectedDate ? cal.selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0] });
          cal.setShowAddModal(true);
        }}
        loading={cal.loading.month}
      />

      {/* Tages-Detail (erscheint bei Auswahl) */}
      {cal.selectedDate && (
        <DayDetailPanel
          selectedDate={cal.selectedDate}
          dayDetail={cal.dayDetail}
          dailySummary={cal.dailySummary}
          events={cal.getEventsForDay(cal.selectedDate.getDate())}
          getEventStyle={cal.getEventStyle}
          loading={cal.loading.day}
          onClose={() => cal.setSelectedDate(null)}
          onDeleteEvent={handleDelete}
          onNavigateToTracker={onNavigateToTracker}
          plants={cal.plants}
        />
      )}

      {/* Trends + Monatszusammenfassung */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TrendsPanel
          monthTrends={cal.monthTrends}
          weekComparison={cal.weekComparison}
          currentDate={cal.currentDate}
          loading={cal.loading.trends || cal.loading.week}
        />
        <MonthSummary
          monthHeatmap={cal.monthHeatmap}
          monthTrends={cal.monthTrends}
          stats={cal.getMonthStats()}
          events={cal.events}
          plants={cal.plants}
        />
      </div>

      {/* Event-Timeline */}
      <EventTimeline
        events={cal.events}
        plants={cal.plants}
        growthLogs={cal.growthLogs}
        currentDate={cal.currentDate}
        getEventStyle={cal.getEventStyle}
        onDeleteEvent={handleDelete}
        onAddEvent={() => cal.setShowAddModal(true)}
      />

      {/* ═══ Add Event Modal ═══ */}
      {cal.showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl border backdrop-blur-xl animate-in zoom-in-95 duration-300"
            style={{ backgroundColor: `${currentTheme.bg.card}f5`, borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
                  <Plus size={20} className="text-white" />
                </div>
                <h3 className="text-xl font-bold" style={{ color: currentTheme.text.primary }}>Neuer Eintrag</h3>
              </div>
              <button onClick={() => cal.setShowAddModal(false)} className="p-2 rounded-xl hover:bg-white/10 transition-colors" style={{ color: currentTheme.text.muted }}>
                <X size={20} />
              </button>
            </div>

            {/* Quick Select */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { label: 'Gießen', type: 'water', title: 'Gießen' },
                { label: 'CalMag', type: 'water', title: 'Gießen mit CalMag' },
                { label: 'Düngen', type: 'nutrient', title: 'Düngen' },
                { label: 'pH Korrektur', type: 'nutrient', title: 'pH Korrektur' },
                { label: 'LST', type: 'training', title: 'LST Training' },
                { label: 'Entlauben', type: 'training', title: 'Entlauben' },
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => cal.setNewEvent({ ...cal.newEvent, title: q.title, type: q.type })}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:scale-105"
                  style={{
                    backgroundColor: cal.getEventStyle(q.type).bg,
                    color: cal.getEventStyle(q.type).text,
                    borderColor: cal.getEventStyle(q.type).border
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase mb-2 block" style={{ color: currentTheme.text.muted }}>Titel</label>
                <input
                  autoFocus type="text"
                  className="w-full rounded-xl p-3.5 border outline-none focus:ring-2 transition-all"
                  style={{ backgroundColor: currentTheme.bg.input || currentTheme.bg.main, borderColor: currentTheme.border.default, color: currentTheme.text.primary }}
                  placeholder="z.B. Gießen mit CalMag"
                  value={cal.newEvent.title}
                  onChange={e => cal.setNewEvent({ ...cal.newEvent, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase mb-2 block" style={{ color: currentTheme.text.muted }}>Datum</label>
                  <input
                    type="date"
                    className="w-full rounded-xl p-3.5 border outline-none focus:ring-2 transition-all"
                    style={{ backgroundColor: currentTheme.bg.input || currentTheme.bg.main, borderColor: currentTheme.border.default, color: currentTheme.text.primary }}
                    value={cal.newEvent.date}
                    onChange={e => cal.setNewEvent({ ...cal.newEvent, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase mb-2 block" style={{ color: currentTheme.text.muted }}>Typ</label>
                  <select
                    className="w-full rounded-xl p-3.5 border outline-none focus:ring-2 transition-all"
                    style={{ backgroundColor: currentTheme.bg.input || currentTheme.bg.main, borderColor: currentTheme.border.default, color: currentTheme.text.primary }}
                    value={cal.newEvent.type}
                    onChange={e => cal.setNewEvent({ ...cal.newEvent, type: e.target.value })}
                  >
                    <option value="water">💧 Gießen</option>
                    <option value="nutrient">🧪 Düngen</option>
                    <option value="training">✂️ Training</option>
                    <option value="note">📝 Notiz</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase mb-2 block" style={{ color: currentTheme.text.muted }}>Notizen</label>
                <textarea
                  className="w-full rounded-xl p-3.5 border outline-none focus:ring-2 transition-all resize-none"
                  style={{ backgroundColor: currentTheme.bg.input || currentTheme.bg.main, borderColor: currentTheme.border.default, color: currentTheme.text.primary }}
                  rows={3} placeholder="Zusätzliche Details..."
                  value={cal.newEvent.notes}
                  onChange={e => cal.setNewEvent({ ...cal.newEvent, notes: e.target.value })}
                />
              </div>
              <button onClick={handleAdd} className="w-full py-3.5 rounded-xl font-bold shadow-xl transition-all hover:scale-105 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                Eintrag speichern
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${currentTheme.accent.color}40; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${currentTheme.accent.color}60; }
      `}</style>
    </div>
  );
}
