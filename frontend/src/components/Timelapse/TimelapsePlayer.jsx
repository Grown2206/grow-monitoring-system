import React, { useState, useEffect } from 'react';
import { Play, Pause, Download, Trash2, Film, Calendar, Clock, Eye, TrendingUp, Loader2, RefreshCw, X } from 'lucide-react';
import { api } from '../../utils/api';
import { useTheme } from '../../theme';
import toast from '../../utils/toast';

/**
 * Timelapse Player
 * Video-Player für generierte Timelapse-Videos
 */
const TimelapsePlayer = ({ theme: propTheme }) => {
  const { currentTheme } = useTheme();
  const theme = propTheme || currentTheme;
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'completed', 'processing'

  useEffect(() => {
    fetchVideos();
    const interval = setInterval(fetchVideos, 5000); // Poll for processing updates
    return () => clearInterval(interval);
  }, [filterStatus]);

  const fetchVideos = async () => {
    try {
      const params = filterStatus !== 'all' ? { status: filterStatus } : {};
      const response = await api.get('/timelapse/videos', { params });

      if (response.data.success) {
        setVideos(response.data.data.videos);
      }
    } catch (error) {
      console.error('❌ Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteVideo = async (videoId) => {
    if (!confirm('Video wirklich löschen?')) return;

    try {
      await api.delete(`/timelapse/videos/${videoId}`);
      setVideos(videos.filter(v => v._id !== videoId));
      if (selectedVideo?._id === videoId) {
        setSelectedVideo(null);
      }
      toast.success('Video gelöscht');
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const downloadVideo = (video) => {
    window.open(`http://localhost:3000/api${video.downloadUrl}`, '_blank');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-500 bg-green-100 dark:bg-green-900';
      case 'processing':
        return 'text-blue-500 bg-blue-100 dark:bg-blue-900';
      case 'pending':
        return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900';
      case 'failed':
        return 'text-red-500 bg-red-100 dark:bg-red-900';
      default:
        return 'text-gray-500 bg-gray-100 dark:bg-gray-900';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Fertig';
      case 'processing':
        return 'Wird erstellt...';
      case 'pending':
        return 'Ausstehend';
      case 'failed':
        return 'Fehler';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ color: theme.text.muted }}>
        <Loader2 size={32} className="animate-spin" style={{ color: theme.accent.color }} />
        <span className="text-sm">Lade Videos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Film style={{ color: theme.accent.color }} size={24} />
          <div>
            <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
              Timelapse Videos
            </h3>
            <p className="text-sm" style={{ color: theme.text.secondary }}>
              {videos.length} Videos
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <button
            onClick={fetchVideos}
            disabled={loading}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: theme.bg.hover, color: theme.text.muted }}
            title="Aktualisieren"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {['all', 'completed', 'processing'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: filterStatus === status ? theme.accent.color : theme.bg.hover,
                color: filterStatus === status ? '#fff' : theme.text.secondary
              }}
            >
              {status === 'all' ? 'Alle' : getStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      {/* Video Player (if video selected) */}
      {selectedVideo && selectedVideo.status === 'completed' && (
        <div
          className="rounded-xl border p-6"
          style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold" style={{ color: theme.text.primary }}>
                  {selectedVideo.title}
                </h2>
                {selectedVideo.description && (
                  <p className="text-sm mt-1" style={{ color: theme.text.secondary }}>
                    {selectedVideo.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: theme.text.muted }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Video Element */}
            <video
              controls
              autoPlay
              className="w-full rounded-lg bg-black"
              poster={`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'%3E%3Crect fill='%23000' width='1920' height='1080'/%3E%3C/svg%3E`}
            >
              <source
                src={`http://localhost:3000/api/timelapse/videos/${selectedVideo.filename}/stream`}
                type="video/mp4"
              />
              Dein Browser unterstützt das Video-Tag nicht.
            </video>

            {/* Video Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500 dark:text-gray-400">Dauer</div>
                <div className="font-medium">{selectedVideo.durationFormatted}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Frames</div>
                <div className="font-medium">{selectedVideo.frameCount}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Auflösung</div>
                <div className="font-medium">
                  {selectedVideo.resolution.width}x{selectedVideo.resolution.height}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Größe</div>
                <div className="font-medium">{selectedVideo.fileSizeMB} MB</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => downloadVideo(selectedVideo)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
              >
                <Download size={18} />
                Download
              </button>
              <button
                onClick={() => deleteVideo(selectedVideo._id)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                <Trash2 size={18} />
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <div
            key={video._id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => video.status === 'completed' && setSelectedVideo(video)}
          >
            {/* Thumbnail / Status */}
            <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
              {video.status === 'completed' ? (
                <div className="text-white text-center">
                  <Play size={48} className="mx-auto mb-2 opacity-75" />
                  <div className="text-sm opacity-75">Click to Play</div>
                </div>
              ) : video.status === 'processing' ? (
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto mb-2"></div>
                  <div className="text-sm">{video.processingProgress}%</div>
                </div>
              ) : (
                <div className="text-white text-center opacity-50">
                  <Film size={48} className="mx-auto mb-2" />
                  <div className="text-sm">{getStatusLabel(video.status)}</div>
                </div>
              )}

              {/* Status Badge */}
              <div
                className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                  video.status
                )}`}
              >
                {getStatusLabel(video.status)}
              </div>
            </div>

            {/* Info */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold truncate">{video.title}</h3>
                {video.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                    {video.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(video.dateRange.start).toLocaleDateString('de-DE')}
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  {video.durationFormatted || 'N/A'}
                </div>
                <div className="flex items-center gap-1">
                  <Film size={12} />
                  {video.frameCount} Frames
                </div>
                <div className="flex items-center gap-1">
                  <Eye size={12} />
                  {video.views} Views
                </div>
              </div>

              {/* Actions */}
              {video.status === 'completed' && (
                <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadVideo(video);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded hover:bg-emerald-200 dark:hover:bg-emerald-800 text-sm"
                  >
                    <Download size={14} />
                    Download
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteVideo(video._id);
                    }}
                    className="px-3 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              {/* Processing Progress Bar */}
              {video.status === 'processing' && (
                <div className="pt-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${video.processingProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {video.status === 'failed' && video.errorMessage && (
                <div className="text-xs text-red-500 dark:text-red-400">
                  Fehler: {video.errorMessage}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {videos.length === 0 && (
        <div
          className="text-center py-12 rounded-xl border"
          style={{
            backgroundColor: theme.bg.card,
            borderColor: theme.border.default,
            color: theme.text.muted
          }}
        >
          <Film size={48} className="mx-auto mb-4 opacity-50" />
          <p style={{ color: theme.text.secondary }}>Keine Videos gefunden</p>
          <p className="text-sm mt-1">
            {filterStatus === 'all'
              ? 'Erstelle dein erstes Timelapse-Video'
              : `Keine Videos mit Status "${getStatusLabel(filterStatus)}"`}
          </p>
        </div>
      )}
    </div>
  );
};

export default TimelapsePlayer;
