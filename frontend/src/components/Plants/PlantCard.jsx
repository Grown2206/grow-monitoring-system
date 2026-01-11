import React, { useState, useEffect } from 'react';
import {
  Droplets, Calendar, Edit2, Save, X, Sprout, Flower2,
  Ruler, Activity, Beaker, Timer, TrendingUp, Award,
  AlertCircle, CheckCircle, ThermometerSun, Wind, Search,
  Sparkles, Info, Leaf, Clock, Target
} from 'lucide-react';
import { api } from '../../utils/api';
import { searchStrains, getStrainByName, getDifficultyInfo } from '../../services/strainDatabase';
import { convertToPercent } from '../../utils/soilCalibration';
import { useTheme } from '../../theme';

// NEU: moistureRaw als Prop empfangen
export default function PlantCard({ plant, onUpdate, moistureRaw }) {
  const { currentTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...plant });

  // Strain Search State
  const [strainQuery, setStrainQuery] = useState('');
  const [strainResults, setStrainResults] = useState([]);
  const [selectedStrainData, setSelectedStrainData] = useState(null);
  const [showStrainSearch, setShowStrainSearch] = useState(false);

  // Suche Strain wenn Query sich ändert
  useEffect(() => {
    if (strainQuery.length >= 2) {
      const results = searchStrains(strainQuery);
      setStrainResults(results);
    } else {
      setStrainResults([]);
    }
  }, [strainQuery]);

  // Auto-Fill Strain Daten
  const selectStrain = (strain) => {
    setSelectedStrainData(strain);
    setFormData({
      ...formData,
      strain: strain.name,
      breeder: strain.breeder,
      type: strain.type === 'CBD' ? 'CBD' : strain.type === 'Autoflower' ? 'Autoflower' : 'Feminized',
      expectedFloweringDays: strain.floweringTime.avg,
      expectedYield: strain.yield.indoor.max,
      thc: strain.thc.avg,
      cbd: strain.cbd.avg,
      difficulty: strain.difficulty,
      genetics: strain.genetics
    });
    setStrainQuery('');
    setStrainResults([]);
    setShowStrainSearch(false);
  };

  // Nutze zentrale Kalibrierungs-Funktion (SlotId = Sensor Index)
  const moisturePct = convertToPercent(moistureRaw, plant.slotId) || 0;

  const getDaysSince = (date) => {
    if (!date) return 0;
    const diff = new Date() - new Date(date);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const daysOld = getDaysSince(plant.germinationDate || plant.plantedDate);
  const daysInBloom = plant.bloomDate ? getDaysSince(plant.bloomDate) : 0;

  // Berechnungen für erweiterte Metriken
  const growthRate = plant.height && daysOld > 0 ? (plant.height / daysOld).toFixed(2) : 0;

  // Geschätztes Erntedatum (Veg 30d + Bloom 60d = ~90d total für Photos, 75d für Autos)
  const estimatedTotalDays = plant.type === 'Autoflower' ? 75 : 90;
  const estimatedHarvestDate = plant.germinationDate
    ? new Date(new Date(plant.germinationDate).getTime() + estimatedTotalDays * 24 * 60 * 60 * 1000)
    : null;
  const daysUntilHarvest = estimatedHarvestDate ? Math.max(0, getDaysSince(new Date()) - getDaysSince(estimatedHarvestDate)) : 0;

  // Yield Estimation - Verwende expectedYield aus DB wenn vorhanden, sonst Schätzung
  const estimatedYield = plant.expectedYield
    ? `${plant.expectedYield}g`
    : (plant.stage === 'Blüte' || plant.stage === 'Trocknen' ? '125-250g' : 'TBD');

  // Health Status
  const getHealthStatus = (health) => {
    if (!health) return { label: 'Unbekannt', color: 'text-slate-500', icon: AlertCircle };
    if (health >= 90) return { label: 'Exzellent', color: 'text-emerald-400', icon: CheckCircle };
    if (health >= 75) return { label: 'Gut', color: 'text-emerald-500', icon: CheckCircle };
    if (health >= 50) return { label: 'OK', color: 'text-yellow-500', icon: AlertCircle };
    return { label: 'Problematisch', color: 'text-red-400', icon: AlertCircle };
  };

  const healthStatus = getHealthStatus(plant.health);

  const handleSave = async () => {
    try {
      await api.updatePlant(plant.slotId, formData);
      setIsEditing(false);
      onUpdate(); 
    } catch (e) {
      console.error("Fehler beim Speichern:", e);
      alert("Fehler beim Speichern der Pflanze.");
    }
  };

  if (isEditing) {
    const difficultyInfo = formData.difficulty ? getDifficultyInfo(formData.difficulty) : null;

    return (
      <div
        className="p-6 rounded-2xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border"
        style={{
          backgroundColor: currentTheme.bg.card,
          borderColor: currentTheme.accent.color
        }}
      >
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button
            onClick={() => setIsEditing(false)}
            className="p-2 rounded-full transition-colors"
            style={{
              color: currentTheme.text.muted,
              ':hover': { backgroundColor: currentTheme.bg.hover }
            }}
          >
            <X size={20}/>
          </button>
        </div>

        <h3
          className="text-lg font-bold mb-6 flex items-center gap-2"
          style={{ color: currentTheme.accent.color }}
        >
          <Edit2 size={18} /> Pflanze bearbeiten (Slot {plant.slotId})
        </h3>

        {/* Strain Database Search */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-purple-400" size={20} />
            <h4 className="font-bold text-white">Strain Datenbank</h4>
            <span className="text-xs text-purple-300 bg-purple-900/30 px-2 py-0.5 rounded-full">15+ Sorten</span>
          </div>

          <div className="relative">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  value={strainQuery}
                  onChange={(e) => {
                    setStrainQuery(e.target.value);
                    setShowStrainSearch(true);
                  }}
                  onFocus={() => setShowStrainSearch(true)}
                  placeholder="Suche: Blue Dream, OG Kush, Northern Lights..."
                  className="w-full pl-10 pr-3 py-2 rounded-lg outline-none border focus:ring-2"
                  style={{
                    backgroundColor: currentTheme.bg.input,
                    borderColor: currentTheme.border.default,
                    color: currentTheme.text.primary
                  }}
                />
              </div>
            </div>

            {showStrainSearch && strainResults.length > 0 && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowStrainSearch(false)} />
                <div className="absolute top-full mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-30 max-h-60 overflow-y-auto">
                  {strainResults.map((strain) => (
                    <button
                      key={strain.id}
                      onClick={() => selectStrain(strain)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white">{strain.name}</div>
                          <div className="text-xs text-slate-400">{strain.breeder} • {strain.type}</div>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded">THC {strain.thc.avg}%</span>
                          <span className="px-2 py-1 bg-emerald-900/30 text-emerald-300 rounded">{strain.floweringTime.avg}d</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {selectedStrainData && (
            <div className="mt-3 p-3 bg-slate-950/50 rounded-lg border border-slate-700">
              <div className="flex items-start gap-3">
                <Info className="text-blue-400 flex-shrink-0" size={18} />
                <div className="text-xs text-slate-300 space-y-1">
                  <div><strong>Genetik:</strong> {selectedStrainData.genetics}</div>
                  <div className="flex gap-3">
                    <span>THC: {selectedStrainData.thc.avg}%</span>
                    <span>CBD: {selectedStrainData.cbd.avg}%</span>
                    <span>Blüte: {selectedStrainData.floweringTime.avg} Tage</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {selectedStrainData.effects.slice(0, 3).map(effect => (
                      <span key={effect} className="px-2 py-0.5 bg-purple-900/30 text-purple-300 rounded text-xs">{effect}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Basic Info */}
          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase font-bold" style={{ color: currentTheme.text.muted }}>Name</label>
              <input
                className="w-full rounded p-2 outline-none border"
                style={{
                  backgroundColor: currentTheme.bg.input,
                  borderColor: currentTheme.border.default,
                  color: currentTheme.text.primary
                }}
                value={formData.name || ''}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="z.B. Northern Lights #1"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Sorte (Strain)</label>
              <input
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none"
                value={formData.strain || ''}
                onChange={e => setFormData({...formData, strain: e.target.value})}
                placeholder="z.B. OG Kush"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Breeder (Züchter)</label>
              <input
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none"
                value={formData.breeder || ''}
                onChange={e => setFormData({...formData, breeder: e.target.value})}
                placeholder="z.B. RQS"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Typ</label>
              <select
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none"
                value={formData.type || 'Feminized'}
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="Feminized">Feminized (Photoperiodisch)</option>
                <option value="Autoflower">Autoflower</option>
                <option value="Regular">Regular</option>
                <option value="CBD">CBD</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Genetik</label>
              <input
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none text-sm"
                value={formData.genetics || ''}
                onChange={e => setFormData({...formData, genetics: e.target.value})}
                placeholder="z.B. Indica x Sativa"
              />
            </div>
          </div>

          {/* Growth Info */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Aktuelle Phase</label>
              <select
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none"
                value={formData.stage || 'Leer'}
                onChange={e => setFormData({...formData, stage: e.target.value})}
              >
                <option value="Leer">-- Leer --</option>
                <option value="Keimling">Keimling</option>
                <option value="Vegetation">Vegetation</option>
                <option value="Blüte">Blüte</option>
                <option value="Trocknen">Trocknen</option>
                <option value="Geerntet">Geerntet</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold">Keimdatum</label>
                <input
                  type="date"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none text-xs"
                  value={formData.germinationDate ? formData.germinationDate.split('T')[0] : ''}
                  onChange={e => setFormData({...formData, germinationDate: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold">Blütestart</label>
                <input
                  type="date"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none text-xs"
                  value={formData.bloomDate ? formData.bloomDate.split('T')[0] : ''}
                  onChange={e => setFormData({...formData, bloomDate: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold">Höhe (cm)</label>
                <input
                  type="number"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none"
                  value={formData.height || ''}
                  onChange={e => setFormData({...formData, height: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold">Gesundheit %</label>
                <input
                  type="number" max="100" min="0"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none"
                  value={formData.health || ''}
                  onChange={e => setFormData({...formData, health: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1">
                <Target size={12} /> Schwierigkeit
              </label>
              <select
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none"
                value={formData.difficulty || 'moderate'}
                onChange={e => setFormData({...formData, difficulty: e.target.value})}
              >
                <option value="easy">Anfänger (Easy)</option>
                <option value="moderate">Mittel (Moderate)</option>
                <option value="difficult">Schwer (Difficult)</option>
              </select>
              {difficultyInfo && (
                <div className={`text-xs mt-1 ${difficultyInfo.color}`}>{difficultyInfo.desc}</div>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-4 bg-slate-950/50 rounded-xl border border-slate-800">
          <div>
            <label className="text-xs text-slate-500 uppercase font-bold">THC %</label>
            <input
              type="number" step="0.1" min="0" max="35"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-purple-500 outline-none"
              value={formData.thc || ''}
              onChange={e => setFormData({...formData, thc: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase font-bold">CBD %</label>
            <input
              type="number" step="0.1" min="0" max="25"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none"
              value={formData.cbd || ''}
              onChange={e => setFormData({...formData, cbd: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1">
              <Clock size={12} /> Blütetage
            </label>
            <input
              type="number" min="40" max="90"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-amber-500 outline-none"
              value={formData.expectedFloweringDays || ''}
              onChange={e => setFormData({...formData, expectedFloweringDays: parseInt(e.target.value) || 0})}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1">
              <Award size={12} /> Yield (g)
            </label>
            <input
              type="number" min="0" max="1000"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none"
              value={formData.expectedYield || ''}
              onChange={e => setFormData({...formData, expectedYield: parseInt(e.target.value) || 0})}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <label className="text-xs text-slate-500 uppercase font-bold">Notizen</label>
          <textarea
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 outline-none text-sm h-20"
            value={formData.notes || ''}
            onChange={e => setFormData({...formData, notes: e.target.value})}
            placeholder="Düngeschema, Probleme, Beobachtungen..."
          />
        </div>

        <button onClick={handleSave} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
          <Save size={20} /> Änderungen Speichern
        </button>
      </div>
    );
  }

  const isEmpty = plant.stage === 'Leer';

  return (
    <div className={`
      relative overflow-hidden rounded-2xl border transition-all duration-300 group
      ${isEmpty 
        ? 'bg-slate-900/50 border-slate-800 border-dashed hover:border-slate-700 hover:bg-slate-800/50' 
        : 'bg-slate-900 border-slate-800 hover:border-emerald-500/30 shadow-lg hover:shadow-emerald-900/10'}
    `}>
      
      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => { setFormData({...plant}); setIsEditing(true); }}
          className="p-2 bg-slate-800/80 backdrop-blur text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-lg border border-slate-700"
        >
          <Edit2 size={16} />
        </button>
      </div>

      {isEmpty ? (
        <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-600 cursor-pointer" onClick={() => setIsEditing(true)}>
          <div className="p-4 rounded-full bg-slate-800/50 mb-4 group-hover:scale-110 transition-transform">
             <Sprout size={32} />
          </div>
          <h3 className="font-medium text-lg">Slot {plant.slotId} Leer</h3>
          <p className="text-sm">Klicken zum Bepflanzen</p>
        </div>
      ) : (
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            {/* Health Ring Icon */}
            <div className="relative flex-shrink-0">
              <svg className="absolute -top-1 -left-1 w-14 h-14 transform -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="26"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-slate-800"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="26"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={`${(plant.health || 0) * 1.63} 163`}
                  className={plant.health >= 75 ? 'text-emerald-400' : plant.health >= 50 ? 'text-yellow-400' : 'text-red-400'}
                  strokeLinecap="round"
                />
              </svg>
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center shadow-lg relative z-10
                ${plant.stage === 'Blüte' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'}
              `}>
                {plant.stage === 'Blüte' ? <Flower2 size={24} /> : <Sprout size={24} />}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {plant.type} • {plant.breeder}
                </div>
                <healthStatus.icon size={14} className={`${healthStatus.color} flex-shrink-0`} />
              </div>
              <h3 className="text-xl font-bold text-white leading-tight mb-1 truncate">{plant.name}</h3>
              <div className="text-sm text-emerald-400 font-medium truncate">{plant.strain}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <Timer size={14} /> Alter
              </div>
              <div className="font-mono font-bold text-slate-200">
                {daysOld} <span className="text-xs font-normal text-slate-500">Tage</span>
              </div>
            </div>

            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                {plant.stage === 'Blüte' ? <Flower2 size={14} className="text-purple-400"/> : <Sprout size={14} className="text-emerald-400"/>} Phase
              </div>
              <div className="font-bold text-slate-200 truncate">
                {plant.stage} {plant.stage === 'Blüte' && <span className="text-xs text-purple-400 ml-1">(Tag {daysInBloom})</span>}
              </div>
            </div>

            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <Ruler size={14} /> Höhe
              </div>
              <div className="font-mono font-bold text-slate-200">
                {plant.height || 0} <span className="text-xs font-normal text-slate-500">cm</span>
              </div>
            </div>

            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 relative overflow-hidden">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 z-10 relative">
                <Droplets size={14} className="text-blue-400" /> Boden
              </div>
              <div className="font-bold text-blue-300 z-10 relative">
                {moisturePct}%
              </div>
              <div className="absolute bottom-0 left-0 h-1 bg-blue-500/50" style={{width: `${moisturePct}%`}}></div>
            </div>
          </div>

          {/* Erweiterte Metriken */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-emerald-950/30 p-2 rounded-lg border border-emerald-800/30 text-center">
              <div className="text-xs text-emerald-500 mb-1 flex items-center justify-center gap-1">
                <TrendingUp size={12} /> Rate
              </div>
              <div className="text-sm font-bold text-emerald-300">
                {growthRate} <span className="text-xs text-slate-500">cm/d</span>
              </div>
            </div>

            <div className="bg-purple-950/30 p-2 rounded-lg border border-purple-800/30 text-center">
              <div className="text-xs text-purple-400 mb-1 flex items-center justify-center gap-1">
                <Award size={12} /> Yield
              </div>
              <div className="text-sm font-bold text-purple-300">
                {estimatedYield}
              </div>
            </div>

            <div className="bg-blue-950/30 p-2 rounded-lg border border-blue-800/30 text-center">
              <div className="text-xs text-blue-400 mb-1 flex items-center justify-center gap-1">
                <Activity size={12} /> Health
              </div>
              <div className={`text-sm font-bold ${healthStatus.color}`}>
                {plant.health || 0}%
              </div>
            </div>
          </div>

          {/* Erntedatum */}
          {estimatedHarvestDate && (
            <div className="bg-amber-950/20 border border-amber-800/30 p-3 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-amber-500 mb-1">Erwartete Ernte</div>
                  <div className="font-mono text-sm text-amber-300">
                    {estimatedHarvestDate.toLocaleDateString('de-DE')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-amber-400">{Math.abs(daysUntilHarvest)}</div>
                  <div className="text-xs text-amber-500/70">Tage</div>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4">
             <div className="flex justify-between text-xs text-slate-500 mb-2">
               <span>Fortschritt (Geschätzt)</span>
               <span>~85 Tage total</span>
             </div>
             <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${plant.stage === 'Blüte' ? 'bg-purple-500' : 'bg-emerald-500'}`} 
                  style={{width: `${Math.min((daysOld / 85) * 100, 100)}%`}}
                ></div>
             </div>
          </div>

          {plant.notes && (
            <div className="bg-yellow-500/5 border border-yellow-500/10 p-3 rounded-lg text-xs text-slate-400 italic truncate">
              "{plant.notes}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}