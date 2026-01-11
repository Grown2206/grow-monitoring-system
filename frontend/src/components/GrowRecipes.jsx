import { useState, useEffect } from 'react';
import { BookOpen, Clock, TrendingUp, Heart, ChevronDown, ChevronUp, Thermometer, Droplets, Zap, Beaker } from 'lucide-react';
import { recipesAPI } from '../utils/api';

export default function GrowRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRecipes();
  }, [filter]);

  const fetchRecipes = async () => {
    try {
      const response = await recipesAPI.getAll();
      const data = response?.data || response || [];

      // Ensure it's an array
      const recipesArray = Array.isArray(data) ? data : [];

      // Filter wenn nötig
      const filtered = filter === 'all'
        ? recipesArray
        : recipesArray.filter(recipe => recipe.type === filter);

      setRecipes(filtered);
    } catch (error) {
      console.error('Fehler beim Laden der Rezepte:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseRecipe = async (recipeId) => {
    try {
      await recipesAPI.use(recipeId);
      alert('Rezept wird verwendet! Sie können es jetzt Ihren Pflanzen zuweisen.');
    } catch (error) {
      console.error('Fehler beim Verwenden des Rezepts:', error);
    }
  };

  const handleLikeRecipe = async (recipeId) => {
    try {
      await recipesAPI.like(recipeId);
      fetchRecipes(); // Reload
    } catch (error) {
      console.error('Fehler beim Liken:', error);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Anfänger': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Fortgeschritten': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Experte': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Indica': return 'bg-purple-500/20 text-purple-400';
      case 'Sativa': return 'bg-emerald-500/20 text-emerald-400';
      case 'Hybrid': return 'bg-blue-500/20 text-blue-400';
      case 'Autoflower': return 'bg-orange-500/20 text-orange-400';
      case 'CBD': return 'bg-cyan-500/20 text-cyan-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
          <BookOpen className="w-8 h-8 text-emerald-500" />
          Grow-Rezepte
        </h1>
        <p className="text-slate-400">
          Professionelle Anbau-Zeitpläne für verschiedene Sorten und Erfahrungsstufen
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
            filter === 'all'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Alle
        </button>
        {['Indica', 'Sativa', 'Hybrid', 'Autoflower', 'CBD'].map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filter === type
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.map((recipe) => (
          <div
            key={recipe._id}
            className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-emerald-500/50 transition-all cursor-pointer"
            onClick={() => setSelectedRecipe(recipe)}
          >
            {/* Card Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-lg text-white">{recipe.name}</h3>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getTypeColor(recipe.type)}`}>
                  {recipe.type}
                </span>
              </div>

              {recipe.strain && (
                <p className="text-sm text-slate-400 mb-3">Strain: {recipe.strain}</p>
              )}

              <p className="text-sm text-slate-300 mb-4 line-clamp-2">
                {recipe.description}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Clock className="w-3 h-3" />
                    Dauer
                  </div>
                  <div className="text-white font-semibold">{recipe.totalDuration} Tage</div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <TrendingUp className="w-3 h-3" />
                    Ertrag
                  </div>
                  <div className="text-white font-semibold text-sm">
                    {recipe.yieldEstimate?.min}-{recipe.yieldEstimate?.max}
                    {recipe.yieldEstimate?.unit === 'g/m²' ? 'g/m²' : 'g'}
                  </div>
                </div>
              </div>

              {/* Difficulty Badge */}
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium border ${getDifficultyColor(recipe.difficulty)}`}>
                {recipe.difficulty}
              </div>
            </div>

            {/* Card Footer */}
            <div className="px-6 py-3 bg-slate-900/30 border-t border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {recipe.likes || 0}
                </span>
                <span>{recipe.uses || 0} mal verwendet</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUseRecipe(recipe._id);
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors"
              >
                Verwenden
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedRecipe(null)}
        >
          <div
            className="bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 z-10">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedRecipe.name}</h2>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getTypeColor(selectedRecipe.type)}`}>
                      {selectedRecipe.type}
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getDifficultyColor(selectedRecipe.difficulty)}`}>
                      {selectedRecipe.difficulty}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRecipe(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <p className="text-slate-300 mb-6">{selectedRecipe.description}</p>

              {/* Overview Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-800 rounded-lg p-4 text-center">
                  <Clock className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{selectedRecipe.totalDuration}</div>
                  <div className="text-xs text-slate-400">Tage Gesamt</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <div className="text-lg font-bold text-white">
                    {selectedRecipe.yieldEstimate?.min}-{selectedRecipe.yieldEstimate?.max}
                  </div>
                  <div className="text-xs text-slate-400">{selectedRecipe.yieldEstimate?.unit}</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 text-center">
                  <Zap className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{selectedRecipe.phases?.length || 0}</div>
                  <div className="text-xs text-slate-400">Phasen</div>
                </div>
              </div>

              {/* Phases */}
              <h3 className="text-xl font-bold text-white mb-4">Wachstumsphasen</h3>
              <div className="space-y-3">
                {selectedRecipe.phases?.map((phase, index) => (
                  <div key={index} className="bg-slate-800 rounded-lg border border-slate-700">
                    <button
                      onClick={() => setExpandedPhase(expandedPhase === index ? null : index)}
                      className="w-full p-4 flex items-center justify-between hover:bg-slate-750 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-white">{phase.name}</div>
                          <div className="text-sm text-slate-400">{phase.duration} Tage · {phase.lightHours}h Licht</div>
                        </div>
                      </div>
                      {expandedPhase === index ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    {expandedPhase === index && (
                      <div className="p-4 pt-0 border-t border-slate-700">
                        <p className="text-slate-300 mb-4">{phase.description}</p>

                        {/* Phase Parameters */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          {phase.tempDay && (
                            <div className="bg-slate-900/50 rounded-lg p-3">
                              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                                <Thermometer className="w-3 h-3" />
                                Temp (Tag)
                              </div>
                              <div className="text-white font-semibold text-sm">
                                {phase.tempDay.target}°C
                              </div>
                              <div className="text-xs text-slate-500">
                                {phase.tempDay.min}-{phase.tempDay.max}°C
                              </div>
                            </div>
                          )}

                          {phase.humidity && (
                            <div className="bg-slate-900/50 rounded-lg p-3">
                              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                                <Droplets className="w-3 h-3" />
                                Luftf.
                              </div>
                              <div className="text-white font-semibold text-sm">
                                {phase.humidity.target}%
                              </div>
                              <div className="text-xs text-slate-500">
                                {phase.humidity.min}-{phase.humidity.max}%
                              </div>
                            </div>
                          )}

                          {phase.ec && (
                            <div className="bg-slate-900/50 rounded-lg p-3">
                              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                                <Beaker className="w-3 h-3" />
                                EC
                              </div>
                              <div className="text-white font-semibold text-sm">
                                {phase.ec.target}
                              </div>
                              <div className="text-xs text-slate-500">
                                {phase.ec.min}-{phase.ec.max}
                              </div>
                            </div>
                          )}

                          {phase.vpd && (
                            <div className="bg-slate-900/50 rounded-lg p-3">
                              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                                <Zap className="w-3 h-3" />
                                VPD
                              </div>
                              <div className="text-white font-semibold text-sm">
                                {phase.vpd.target} kPa
                              </div>
                              <div className="text-xs text-slate-500">
                                {phase.vpd.min}-{phase.vpd.max}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Tips */}
                        {phase.tips && phase.tips.length > 0 && (
                          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                            <div className="text-sm font-semibold text-blue-300 mb-2">💡 Tipps:</div>
                            <ul className="space-y-1">
                              {phase.tips.map((tip, i) => (
                                <li key={i} className="text-sm text-blue-200">• {tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => handleUseRecipe(selectedRecipe._id)}
                  className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Rezept verwenden
                </button>
                <button
                  onClick={() => handleLikeRecipe(selectedRecipe._id)}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Heart className="w-4 h-4" />
                  {selectedRecipe.likes || 0}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {recipes.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-400 mb-2">Keine Rezepte gefunden</h3>
          <p className="text-slate-500">Versuchen Sie einen anderen Filter</p>
        </div>
      )}
    </div>
  );
}
