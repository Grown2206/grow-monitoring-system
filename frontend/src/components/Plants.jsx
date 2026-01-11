import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import PlantCard from './Plants/PlantCard';
import PlantTracker from './Plants/PlantTracker';
import { Plus, Sprout, Flower2, Leaf, TrendingUp, AlertCircle } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAlert } from '../context/AlertContext';

export default function Plants({ trackerState, onResetTracker }) {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showTracker, setShowTracker] = useState(false);

  const { sensorData } = useSocket();
  const { showAlert } = useAlert();

  useEffect(() => {
    loadPlants();
  }, []);

  // Reagiere auf externen trackerState (von Kalender)
  useEffect(() => {
    if (trackerState && trackerState.plant) {
      setSelectedPlant(trackerState.plant);
      setSelectedDate(trackerState.date || new Date());
      setShowTracker(true);
    }
  }, [trackerState]);

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
      console.error("Fehler beim Laden der Pflanzen:", error);
      setError("Fehler beim Laden der Pflanzen. Bitte versuche es erneut.");
      showAlert('Fehler beim Laden der Pflanzen', 'error');
      // Fallback: Zeige leere Slots
      setPlants(Array.from({ length: 6 }, (_, i) => ({
        slotId: i + 1,
        stage: 'Leer',
        name: '',
        strain: ''
      })));
    } finally {
      setLoading(false);
    }
  };

  const filteredPlants = plants.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'veg') return p.stage === 'Vegetation' || p.stage === 'Keimling';
    if (filter === 'bloom') return p.stage === 'Blüte';
    return true; 
  });

  const activeCount = plants.filter(p => p.stage !== 'Leer' && p.stage !== 'Geerntet').length;
  const bloomCount = plants.filter(p => p.stage === 'Blüte').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0" size={24} />
          <div>
            <div className="font-semibold text-red-400">Fehler</div>
            <div className="text-sm text-red-300">{error}</div>
          </div>
          <button
            onClick={loadPlants}
            className="ml-auto px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {/* Dashboard Header */}
      <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 border border-emerald-500/20 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
             <Leaf className="text-emerald-500" /> Grow Management
          </h2>
          <p className="text-slate-400 mt-2 max-w-lg">
            Verwalte deine Ladies. Dokumentiere Wachstum, Blütephase und Zucht-Details für maximalen Ertrag.
          </p>
        </div>

        <div className="flex gap-4 relative z-10">
           <div className="text-center px-4 py-2 bg-slate-950/50 rounded-xl border border-slate-800">
              <div className="text-2xl font-bold text-white">{activeCount}</div>
              <div className="text-xs text-slate-500 uppercase">Aktiv</div>
           </div>
           <div className="text-center px-4 py-2 bg-slate-950/50 rounded-xl border border-slate-800">
              <div className="text-2xl font-bold text-purple-400">{bloomCount}</div>
              <div className="text-xs text-purple-500/70 uppercase">Blüte</div>
           </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button 
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${filter === 'all' ? 'bg-slate-200 text-slate-900' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-600'}`}
        >
          Alle Pflanzen
        </button>
        <button 
          onClick={() => setFilter('veg')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${filter === 'veg' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-emerald-500/50'}`}
        >
          <Sprout size={16}/> Wachstum
        </button>
        <button 
          onClick={() => setFilter('bloom')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${filter === 'bloom' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-purple-500/50'}`}
        >
          <Flower2 size={16}/> Blüte
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           {[1,2,3].map(i => (
             <div key={i} className="h-[350px] bg-slate-900/50 rounded-2xl animate-pulse border border-slate-800"></div>
           ))}
        </div>
      ) : showTracker && selectedPlant ? (
        <div>
          <button
            onClick={() => {
              setShowTracker(false);
              setSelectedPlant(null);
              setSelectedDate(null);
              if (onResetTracker) onResetTracker();
            }}
            className="mb-4 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            ← Zurück zu Pflanzen
          </button>
          <PlantTracker
            plantId={selectedPlant._id}
            plantName={selectedPlant.name || `Slot ${selectedPlant.slotId}`}
            initialDate={selectedDate}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPlants.map((plant) => (
            <div key={plant.slotId} className="relative group">
              <PlantCard
                plant={plant}
                onUpdate={loadPlants}
                // NEU: Live-Wert übergeben (Array Index ist slotId - 1)
                // sensorData.soil sollte ein Array [val1, val2, ...] sein
                moistureRaw={sensorData?.soil?.[plant.slotId - 1]}
              />
              {plant._id && plant.stage !== 'Leer' && (
                <button
                  onClick={() => {
                    setSelectedPlant(plant);
                    setShowTracker(true);
                  }}
                  className="absolute top-2 right-2 p-2 bg-emerald-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-700 flex items-center gap-2"
                  title="Wachstum tracken"
                >
                  <TrendingUp size={16} />
                  Tracker
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}