import React, { useState, useEffect } from 'react';
import { recipesAPI } from '../../utils/api';
import { useAlert } from '../../context/AlertContext';
import { Save, X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Recipe Editor
 * Formular zum Erstellen und Bearbeiten von Grow-Rezepten
 */
const RecipeEditor = ({ recipeId = null, onClose, onSave }) => {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState(0);

  const [recipe, setRecipe] = useState({
    name: '',
    strain: '',
    type: 'Hybrid',
    difficulty: 'Anfänger',
    description: '',
    medium: 'Erde',
    nutrients: '',
    notes: '',
    tags: [],
    yieldEstimate: { min: 0, max: 0, unit: 'g/plant' },
    phases: [
      {
        name: 'Keimling',
        duration: 7,
        lightHours: 18,
        tempDay: { min: 20, target: 24, max: 26 },
        tempNight: { min: 18, target: 20, max: 22 },
        humidity: { min: 65, target: 70, max: 80 },
        vpd: { min: 0.4, target: 0.6, max: 0.8 },
        ec: { min: 0, target: 0.4, max: 0.8 },
        ph: { min: 5.8, target: 6.0, max: 6.5 },
        wateringInterval: 24,
        description: '',
        tips: []
      }
    ]
  });

  useEffect(() => {
    if (recipeId) {
      loadRecipe();
    }
  }, [recipeId]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      const response = await recipesAPI.getById(recipeId);
      if (response.success) {
        setRecipe(response.data);
      }
    } catch (error) {
      showAlert('Fehler beim Laden des Rezepts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validierung
    if (!recipe.name.trim()) {
      showAlert('Bitte gib einen Namen ein', 'error');
      return;
    }

    if (recipe.phases.length === 0) {
      showAlert('Mindestens eine Phase erforderlich', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = recipeId
        ? await recipesAPI.update(recipeId, recipe)
        : await recipesAPI.create(recipe);

      if (response.success) {
        showAlert(recipeId ? 'Rezept aktualisiert!' : 'Rezept erstellt!', 'success');
        onSave && onSave(response.data);
        onClose && onClose();
      }
    } catch (error) {
      showAlert('Fehler beim Speichern', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setRecipe(prev => ({ ...prev, [field]: value }));
  };

  const updatePhase = (index, field, value) => {
    setRecipe(prev => ({
      ...prev,
      phases: prev.phases.map((phase, i) =>
        i === index ? { ...phase, [field]: value } : phase
      )
    }));
  };

  const updatePhaseRange = (phaseIndex, field, subfield, value) => {
    setRecipe(prev => ({
      ...prev,
      phases: prev.phases.map((phase, i) =>
        i === phaseIndex
          ? { ...phase, [field]: { ...phase[field], [subfield]: parseFloat(value) || 0 } }
          : phase
      )
    }));
  };

  const addPhase = () => {
    const newPhase = {
      name: 'Vegetation',
      duration: 28,
      lightHours: 18,
      tempDay: { min: 22, target: 26, max: 28 },
      tempNight: { min: 18, target: 20, max: 22 },
      humidity: { min: 55, target: 60, max: 70 },
      vpd: { min: 0.8, target: 1.0, max: 1.2 },
      ec: { min: 0.8, target: 1.4, max: 1.8 },
      ph: { min: 5.8, target: 6.0, max: 6.5 },
      wateringInterval: 48,
      description: '',
      tips: []
    };
    setRecipe(prev => ({ ...prev, phases: [...prev.phases, newPhase] }));
    setExpandedPhase(recipe.phases.length);
  };

  const removePhase = (index) => {
    if (recipe.phases.length <= 1) {
      showAlert('Mindestens eine Phase erforderlich', 'error');
      return;
    }
    setRecipe(prev => ({
      ...prev,
      phases: prev.phases.filter((_, i) => i !== index)
    }));
  };

  const phaseTypes = ['Keimling', 'Vegetation', 'Blüte', 'Spülen', 'Trocknen'];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold">
            {recipeId ? 'Rezept bearbeiten' : 'Neues Rezept'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Grundinformationen */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Grundinformationen</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name *</label>
                <input
                  type="text"
                  value={recipe.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="z.B. Indica Photoperiode Standard"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Sorte (Strain)</label>
                <input
                  type="text"
                  value={recipe.strain}
                  onChange={(e) => updateField('strain', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="z.B. Northern Lights"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Typ</label>
                <select
                  value={recipe.type}
                  onChange={(e) => updateField('type', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Indica">Indica</option>
                  <option value="Sativa">Sativa</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Autoflower">Autoflower</option>
                  <option value="CBD">CBD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Schwierigkeit</label>
                <select
                  value={recipe.difficulty}
                  onChange={(e) => updateField('difficulty', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Anfänger">Anfänger</option>
                  <option value="Fortgeschritten">Fortgeschritten</option>
                  <option value="Experte">Experte</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Medium</label>
                <select
                  value={recipe.medium}
                  onChange={(e) => updateField('medium', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Erde">Erde</option>
                  <option value="Kokos">Kokos</option>
                  <option value="Hydro">Hydro</option>
                  <option value="Aero">Aero</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Nährstoffe</label>
                <input
                  type="text"
                  value={recipe.nutrients}
                  onChange={(e) => updateField('nutrients', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="z.B. BioBizz Starter Kit"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Beschreibung</label>
              <textarea
                value={recipe.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Beschreibe das Rezept..."
              />
            </div>
          </div>

          {/* Phasen */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Phasen</h3>
              <button
                onClick={addPhase}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus size={16} />
                Phase hinzufügen
              </button>
            </div>

            {recipe.phases.map((phase, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  onClick={() => setExpandedPhase(expandedPhase === index ? -1 : index)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold">Phase {index + 1}: {phase.name}</span>
                    <span className="text-sm text-gray-500">{phase.duration} Tage</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {recipe.phases.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removePhase(index);
                        }}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {expandedPhase === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {expandedPhase === index && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Phasenname</label>
                        <select
                          value={phase.name}
                          onChange={(e) => updatePhase(index, 'name', e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          {phaseTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Dauer (Tage)</label>
                        <input
                          type="number"
                          value={phase.duration}
                          onChange={(e) => updatePhase(index, 'duration', parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Lichtstunden</label>
                        <input
                          type="number"
                          value={phase.lightHours}
                          onChange={(e) => updatePhase(index, 'lightHours', parseInt(e.target.value) || 0)}
                          max="24"
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Gießintervall (Stunden)</label>
                        <input
                          type="number"
                          value={phase.wateringInterval}
                          onChange={(e) => updatePhase(index, 'wateringInterval', parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Temperatur Tag */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Temperatur Tag (°C)</label>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          value={phase.tempDay.min}
                          onChange={(e) => updatePhaseRange(index, 'tempDay', 'min', e.target.value)}
                          placeholder="Min"
                          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        />
                        <input
                          type="number"
                          value={phase.tempDay.target}
                          onChange={(e) => updatePhaseRange(index, 'tempDay', 'target', e.target.value)}
                          placeholder="Ziel"
                          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        />
                        <input
                          type="number"
                          value={phase.tempDay.max}
                          onChange={(e) => updatePhaseRange(index, 'tempDay', 'max', e.target.value)}
                          placeholder="Max"
                          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        />
                      </div>
                    </div>

                    {/* Weitere Parameter analog... */}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecipeEditor;
