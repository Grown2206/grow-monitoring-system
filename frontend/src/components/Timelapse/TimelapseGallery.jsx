import React, { useState, useEffect } from 'react';
import { Camera, Trash2, Download, Calendar, Filter, Grid3x3, List, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';
import toast from '../../utils/toast';
import { useTheme } from '../../theme';

/**
 * Timelapse Gallery
 * Grid-Ansicht aller erfassten Snapshots
 */
const TimelapseGallery = ({ onCaptureSelect, theme: propTheme }) => {
  const { currentTheme } = useTheme();
  const theme = propTheme || currentTheme;
  const [captures, setCaptures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedCaptures, setSelectedCaptures] = useState([]);
  const [filters, setFilters] = useState({
    phase: 'all',
    sortBy: 'timestamp',
    sortOrder: 'desc'
  });

  useEffect(() => {
    fetchCaptures();
  }, [filters]);

  const fetchCaptures = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 100,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };

      if (filters.phase !== 'all') {
        params.phase = filters.phase;
      }

      const response = await api.get('/timelapse/captures', { params });

      if (response.data.success) {
        setCaptures(response.data.data.captures);
      }
    } catch (error) {
      console.error('❌ Error fetching captures:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteCapture = async (captureId) => {
    if (!confirm('Capture wirklich löschen?')) return;

    try {
      await api.delete(`/timelapse/captures/${captureId}`);
      setCaptures(captures.filter(c => c._id !== captureId));
      toast.success('Capture gelöscht');
    } catch (error) {
      console.error('Error deleting capture:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const toggleSelection = (captureId) => {
    if (selectedCaptures.includes(captureId)) {
      setSelectedCaptures(selectedCaptures.filter(id => id !== captureId));
    } else {
      setSelectedCaptures([...selectedCaptures, captureId]);
    }
  };

  const deleteSelected = async () => {
    if (selectedCaptures.length === 0) return;
    if (!confirm(`${selectedCaptures.length} Captures wirklich löschen?`)) return;

    setDeleting(true);
    try {
      await Promise.all(
        selectedCaptures.map(id => api.delete(`/timelapse/captures/${id}`))
      );
      setCaptures(captures.filter(c => !selectedCaptures.includes(c._id)));
      toast.success(`${selectedCaptures.length} Captures gelöscht`);
      setSelectedCaptures([]);
    } catch (error) {
      console.error('Error deleting captures:', error);
      toast.error('Fehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ color: theme.text.muted }}>
        <Loader2 size={32} className="animate-spin" style={{ color: theme.accent.color }} />
        <span className="text-sm">Lade Captures...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Camera style={{ color: theme.accent.color }} size={24} />
          <div>
            <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
              Capture Gallery
            </h3>
            <p className="text-sm" style={{ color: theme.text.secondary }}>
              {captures.length} Snapshots
              {selectedCaptures.length > 0 && (
                <span style={{ color: theme.accent.color }}> • {selectedCaptures.length} ausgewählt</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={fetchCaptures}
            disabled={loading}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: theme.bg.hover, color: theme.text.muted }}
            title="Aktualisieren"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* View Mode Toggle */}
          <div className="flex rounded-lg p-1" style={{ backgroundColor: theme.bg.hover }}>
            <button
              onClick={() => setViewMode('grid')}
              className="p-2 rounded"
              style={{
                backgroundColor: viewMode === 'grid' ? theme.bg.card : 'transparent',
                color: viewMode === 'grid' ? theme.text.primary : theme.text.muted
              }}
            >
              <Grid3x3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="p-2 rounded"
              style={{
                backgroundColor: viewMode === 'list' ? theme.bg.card : 'transparent',
                color: viewMode === 'list' ? theme.text.primary : theme.text.muted
              }}
            >
              <List size={18} />
            </button>
          </div>

          {/* Delete Selected */}
          {selectedCaptures.length > 0 && (
            <button
              onClick={deleteSelected}
              disabled={deleting}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#ef4444', color: '#fff' }}
            >
              {deleting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Trash2 size={18} />
              )}
              {selectedCaptures.length}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-3 p-4 rounded-xl border"
        style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}
      >
        <Filter size={18} style={{ color: theme.text.muted }} />

        <select
          value={filters.phase}
          onChange={(e) => setFilters({ ...filters, phase: e.target.value })}
          className="px-3 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: theme.bg.hover,
            borderColor: theme.border.default,
            color: theme.text.primary
          }}
        >
          <option value="all">Alle Phasen</option>
          <option value="seedling">Keimling</option>
          <option value="vegetative">Vegetativ</option>
          <option value="flowering">Blüte</option>
          <option value="harvest">Ernte</option>
        </select>

        <select
          value={filters.sortBy}
          onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
          className="px-3 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: theme.bg.hover,
            borderColor: theme.border.default,
            color: theme.text.primary
          }}
        >
          <option value="timestamp">Datum</option>
          <option value="fileSize">Dateigröße</option>
          <option value="quality.score">Qualität</option>
        </select>

        <button
          onClick={() =>
            setFilters({
              ...filters,
              sortOrder: filters.sortOrder === 'desc' ? 'asc' : 'desc'
            })
          }
          className="px-3 py-2 rounded-lg text-sm transition-colors"
          style={{
            backgroundColor: theme.bg.hover,
            color: theme.text.primary
          }}
        >
          {filters.sortOrder === 'desc' ? '↓ Neueste' : '↑ Älteste'}
        </button>
      </div>

      {/* Gallery Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {captures.map((capture) => (
            <div
              key={capture._id}
              className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                selectedCaptures.includes(capture._id)
                  ? 'border-emerald-500 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 hover:border-emerald-400'
              }`}
              onClick={() => {
                if (onCaptureSelect) {
                  onCaptureSelect(capture);
                } else {
                  toggleSelection(capture._id);
                }
              }}
            >
              {/* Thumbnail */}
              <img
                src={`http://localhost:3000/api${capture.thumbnailUrl}`}
                alt={`Capture ${capture.filename}`}
                className="w-full aspect-video object-cover"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="180"%3E%3Crect fill="%23374151" width="320" height="180"/%3E%3Ctext fill="white" font-size="14" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EKein Bild%3C/text%3E%3C/svg%3E';
                }}
              />

              {/* Overlay Info */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <div className="text-white text-xs space-y-1">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(capture.timestamp).toLocaleString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  {capture.phase && (
                    <div className="capitalize text-emerald-300">
                      {capture.phase}
                    </div>
                  )}
                </div>
              </div>

              {/* Selection Checkbox */}
              <div
                className={`absolute top-2 left-2 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                  selectedCaptures.includes(capture._id)
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'bg-white/80 border-white'
                }`}
              >
                {selectedCaptures.includes(capture._id) && (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </div>

              {/* Quick Actions */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`http://localhost:3000/api${capture.imageUrl}`, '_blank');
                  }}
                  className="p-1.5 bg-white/90 hover:bg-white rounded shadow-lg"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCapture(capture._id);
                  }}
                  className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded shadow-lg"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {captures.map((capture) => (
            <div
              key={capture._id}
              className={`flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border-2 cursor-pointer transition-all ${
                selectedCaptures.includes(capture._id)
                  ? 'border-emerald-500'
                  : 'border-gray-200 dark:border-gray-700 hover:border-emerald-400'
              }`}
              onClick={() => toggleSelection(capture._id)}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selectedCaptures.includes(capture._id)}
                onChange={() => {}}
                className="w-5 h-5"
              />

              {/* Thumbnail */}
              <img
                src={`http://localhost:3000/api${capture.thumbnailUrl}`}
                alt={capture.filename}
                className="w-20 h-12 object-cover rounded"
              />

              {/* Info */}
              <div className="flex-1">
                <div className="font-medium">{capture.filename}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(capture.timestamp).toLocaleString('de-DE')}
                  {capture.phase && ` • ${capture.phase}`}
                </div>
              </div>

              {/* Stats */}
              <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                <div>{capture.resolution.width}x{capture.resolution.height}</div>
                <div>{(capture.fileSize / (1024 * 1024)).toFixed(2)} MB</div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`http://localhost:3000/api${capture.imageUrl}`, '_blank');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCapture(capture._id);
                  }}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900 text-red-500 rounded"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {captures.length === 0 && (
        <div
          className="text-center py-12 rounded-xl border"
          style={{
            backgroundColor: theme.bg.card,
            borderColor: theme.border.default,
            color: theme.text.muted
          }}
        >
          <Camera size={48} className="mx-auto mb-4 opacity-50" />
          <p style={{ color: theme.text.secondary }}>Keine Captures gefunden</p>
          <p className="text-sm mt-1">Starte einen Snapshot oder aktiviere Auto-Capture</p>
        </div>
      )}
    </div>
  );
};

export default TimelapseGallery;
