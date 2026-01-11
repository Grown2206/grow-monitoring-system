import React, { useState, useEffect } from 'react';
import { recipesAPI } from '../../utils/api';
import { useAlert } from '../../context/AlertContext';
import RecipeEditor from './RecipeEditor';
import {
  Book, Plus, Download, Upload, Star, Copy, Trash2, Play,
  Filter, Search, Heart, TrendingUp, Clock, Leaf
} from 'lucide-react';

/**
 * Recipe Library
 * Vollständige Rezept-Bibliothek mit CRUD, Import/Export, Clone
 */
const RecipeLibrary = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, favorites, templates, custom
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const { showAlert } = useAlert();

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const response = await recipesAPI.getAll();
      if (response.success) {
        setRecipes(response.data);
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Rezepte:', error);
      showAlert('Fehler beim Laden der Rezepte', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async (id) => {
    try {
      const response = await recipesAPI.clone(id);
      if (response.success) {
        showAlert('Rezept erfolgreich geklont!', 'success');
        loadRecipes();
      }
    } catch (error) {
      showAlert('Fehler beim Klonen', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Rezept "${name}" wirklich löschen?`)) return;

    try {
      const response = await recipesAPI.delete(id);
      if (response.success) {
        showAlert('Rezept gelöscht', 'success');
        loadRecipes();
      }
    } catch (error) {
      showAlert('Fehler beim Löschen', 'error');
    }
  };

  const handleExport = async (id, name) => {
    try {
      const response = await recipesAPI.export(id);

      // Download als JSON-Datei
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^a-z0-9]/gi, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showAlert('Rezept exportiert!', 'success');
    } catch (error) {
      showAlert('Fehler beim Exportieren', 'error');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const recipeData = JSON.parse(text);

        const response = await recipesAPI.import(recipeData);
        if (response.success) {
          showAlert('Rezept erfolgreich importiert!', 'success');
          loadRecipes();
        }
      } catch (error) {
        showAlert('Fehler beim Importieren: Ungültiges Format', 'error');
      }
    };
    input.click();
  };

  const handleToggleFavorite = async (id) => {
    try {
      const response = await recipesAPI.toggleFavorite(id);
      if (response.success) {
        loadRecipes();
      }
    } catch (error) {
      showAlert('Fehler beim Favorisieren', 'error');
    }
  };

  const handleUse = async (id) => {
    try {
      const response = await recipesAPI.use(id);
      if (response.success) {
        showAlert('Rezept wird verwendet!', 'success');
        loadRecipes();
      }
    } catch (error) {
      showAlert('Fehler beim Verwenden', 'error');
    }
  };

  const filteredRecipes = recipes.filter(recipe => {
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'favorites' ? recipe.isFavorite :
      filter === 'templates' ? recipe.isTemplate :
      filter === 'custom' ? !recipe.isTemplate : true;

    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (recipe.strain && recipe.strain.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const typeColors = {
    Indica: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    Sativa: 'bg-green-500/20 text-green-300 border-green-500/30',
    Hybrid: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    Autoflower: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    CBD: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
            <Book className="text-emerald-500" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Rezept-Bibliothek</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredRecipes.length} Rezepte verfügbar
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleImport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload size={16} />
            Import
          </button>
          <button
            onClick={() => {
              setEditingRecipeId(null);
              setShowEditor(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus size={16} />
            Neues Rezept
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rezepte durchsuchen..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilter('favorites')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'favorites'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Favoriten
          </button>
          <button
            onClick={() => setFilter('templates')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'templates'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Vorlagen
          </button>
          <button
            onClick={() => setFilter('custom')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'custom'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Eigene
          </button>
        </div>
      </div>

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecipes.map((recipe) => (
          <div
            key={recipe._id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow"
          >
            {/* Recipe Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">{recipe.name}</h3>
                {recipe.strain && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{recipe.strain}</p>
                )}
              </div>
              <button
                onClick={() => handleToggleFavorite(recipe._id)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Heart
                  size={20}
                  className={recipe.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}
                />
              </button>
            </div>

            {/* Type Badge */}
            <div className="flex gap-2 mb-3">
              <span className={`px-2 py-1 rounded-md text-xs font-medium border ${typeColors[recipe.type] || 'bg-gray-500/20 text-gray-300'}`}>
                {recipe.type}
              </span>
              {recipe.isTemplate && (
                <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Vorlage
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Clock size={14} />
                <span>{recipe.totalDuration || 0} Tage</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <TrendingUp size={14} />
                <span>{recipe.uses || 0} Mal verwendet</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Leaf size={14} />
                <span>{recipe.difficulty || 'Unbekannt'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Star size={14} />
                <span>{recipe.likes || 0} Likes</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleUse(recipe._id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                <Play size={14} />
                Verwenden
              </button>
              <button
                onClick={() => handleClone(recipe._id)}
                className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                title="Klonen"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => handleExport(recipe._id, recipe.name)}
                className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                title="Exportieren"
              >
                <Download size={16} />
              </button>
              {!recipe.isTemplate && (
                <button
                  onClick={() => handleDelete(recipe._id, recipe.name)}
                  className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  title="Löschen"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredRecipes.length === 0 && (
        <div className="text-center py-12">
          <Book className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">Keine Rezepte gefunden</p>
        </div>
      )}

      {/* Recipe Editor Modal */}
      {showEditor && (
        <RecipeEditor
          recipeId={editingRecipeId}
          onClose={() => {
            setShowEditor(false);
            setEditingRecipeId(null);
          }}
          onSave={() => {
            loadRecipes();
          }}
        />
      )}
    </div>
  );
};

export default RecipeLibrary;
