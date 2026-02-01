import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera, Video, Image, Film, Settings, Wifi, WifiOff,
  RefreshCw, Download, Maximize2, Minimize2, Play, Pause,
  Trash2, FolderOpen, Grid, List, Clock, Zap, Sun, Moon,
  ChevronLeft, ChevronRight, X, Plus, Save, Loader2,
  SlidersHorizontal, Eye, EyeOff, RotateCcw, FlipHorizontal,
  FlipVertical, Contrast, CircleDot
} from 'lucide-react';
import { useTheme } from '../../theme';
import { api } from '../../utils/api';
import toast from '../../utils/toast';

/**
 * CameraStudio - Professionelles Multi-Kamera Management
 * Features: Live-Streams, Snapshot-Galerie, Zeitraffer-Generator
 */

// Kamera-Konfiguration
const DEFAULT_CAMERAS = [
  { id: 'cam1', name: 'GrowCam 1', ip: '', color: '#10b981' },
  { id: 'cam2', name: 'GrowCam 2', ip: '', color: '#3b82f6' }
];

// Tab-Komponente
const Tab = ({ active, onClick, icon: Icon, label, badge }) => {
  const { currentTheme: theme } = useTheme();

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
        active ? 'scale-105' : ''
      }`}
      style={{
        backgroundColor: active ? theme.accent.color : theme.bg.hover,
        color: active ? '#fff' : theme.text.secondary
      }}
    >
      <Icon size={18} />
      {label}
      {badge && (
        <span
          className="ml-1 px-1.5 py-0.5 text-xs rounded-full"
          style={{
            backgroundColor: active ? 'rgba(255,255,255,0.2)' : theme.accent.color,
            color: active ? '#fff' : '#fff'
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
};

// Einzelne Kamera-Karte
const CameraCard = ({ camera, theme, onSettings, onSnapshot, onFullscreen, refreshKey }) => {
  const status = camera.status || 'offline';
  const [showControls, setShowControls] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const imgRef = useRef(null);

  // Stream-Error zurücksetzen bei Refresh oder Status-Änderung
  useEffect(() => {
    setStreamError(false);
  }, [refreshKey, status]);

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl"
      style={{
        backgroundColor: theme.bg.card,
        borderColor: status === 'online' ? camera.color : theme.border.default
      }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Header */}
      <div
        className="p-4 border-b flex items-center justify-between"
        style={{ borderColor: theme.border.light }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: status === 'online' ? '#10b981' : status === 'checking' ? '#f59e0b' : '#ef4444'
            }}
          />
          <div>
            <h3 className="font-bold" style={{ color: theme.text.primary }}>
              {camera.name}
            </h3>
            <p className="text-xs" style={{ color: theme.text.muted }}>
              {camera.ip || 'Nicht konfiguriert'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSettings(camera)}
            className="p-2 rounded-lg transition-all hover:scale-110"
            style={{ backgroundColor: theme.bg.hover }}
          >
            <Settings size={16} style={{ color: theme.text.muted }} />
          </button>
        </div>
      </div>

      {/* Stream Container */}
      <div className="relative aspect-video bg-black">
        {status === 'online' && camera.ip && !streamError ? (
          <>
            <img
              ref={imgRef}
              key={refreshKey}
              src={`http://${camera.ip}/stream?t=${refreshKey}`}
              alt={camera.name}
              className="w-full h-full object-contain"
              onError={() => setStreamError(true)}
            />

            {/* Overlay Controls */}
            <div
              className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${
                showControls ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                    style={{ backgroundColor: 'rgba(16, 185, 129, 0.8)' }}
                  >
                    <CircleDot size={10} className="animate-pulse" />
                    LIVE
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSnapshot(camera)}
                    className="p-2 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all"
                  >
                    <Camera size={16} className="text-white" />
                  </button>
                  <button
                    onClick={() => onFullscreen(camera)}
                    className="p-2 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all"
                  >
                    <Maximize2 size={16} className="text-white" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {status === 'checking' ? (
              <Loader2 size={32} className="animate-spin" style={{ color: theme.text.muted }} />
            ) : (
              <>
                <Camera size={48} style={{ color: theme.text.muted }} className="opacity-30 mb-2" />
                <p className="text-sm" style={{ color: theme.text.muted }}>
                  {camera.ip ? 'Kamera offline' : 'IP-Adresse eingeben'}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Snapshot-Galerie
const SnapshotGallery = ({ theme, snapshots, onDelete, onDownload, onCreateTimelapse }) => {
  const [viewMode, setViewMode] = useState('grid');
  const [selectedSnapshots, setSelectedSnapshots] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  const toggleSelect = (id) => {
    setSelectedSnapshots(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedSnapshots(snapshots.map(s => s.id));
  };

  const clearSelection = () => {
    setSelectedSnapshots([]);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'scale-110' : ''}`}
            style={{
              backgroundColor: viewMode === 'grid' ? theme.accent.color : theme.bg.hover,
              color: viewMode === 'grid' ? '#fff' : theme.text.secondary
            }}
          >
            <Grid size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'scale-110' : ''}`}
            style={{
              backgroundColor: viewMode === 'list' ? theme.accent.color : theme.bg.hover,
              color: viewMode === 'list' ? '#fff' : theme.text.secondary
            }}
          >
            <List size={18} />
          </button>

          <div className="h-6 w-px mx-2" style={{ backgroundColor: theme.border.default }} />

          <span className="text-sm" style={{ color: theme.text.muted }}>
            {snapshots.length} Bilder
          </span>
        </div>

        {selectedSnapshots.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: theme.accent.color }}>
              {selectedSnapshots.length} ausgewählt
            </span>
            <button
              onClick={() => onCreateTimelapse(selectedSnapshots)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ backgroundColor: theme.accent.color, color: '#fff' }}
            >
              <Film size={14} />
              Timelapse
            </button>
            <button
              onClick={() => onDelete(selectedSnapshots)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ backgroundColor: '#ef4444', color: '#fff' }}
            >
              <Trash2 size={14} />
              Löschen
            </button>
            <button
              onClick={clearSelection}
              className="p-1.5 rounded-lg"
              style={{ backgroundColor: theme.bg.hover }}
            >
              <X size={16} style={{ color: theme.text.muted }} />
            </button>
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      {snapshots.length === 0 ? (
        <div
          className="py-16 text-center rounded-2xl border-2 border-dashed"
          style={{ borderColor: theme.border.default }}
        >
          <Image size={48} style={{ color: theme.text.muted }} className="mx-auto mb-3 opacity-30" />
          <p style={{ color: theme.text.muted }}>Noch keine Snapshots vorhanden</p>
          <p className="text-sm mt-1" style={{ color: theme.text.muted }}>
            Nimm dein erstes Foto im Live-View auf
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3' : 'space-y-2'}>
          {snapshots.map(snapshot => (
            <div
              key={snapshot.id}
              className={`relative group rounded-xl overflow-hidden cursor-pointer transition-all ${
                selectedSnapshots.includes(snapshot.id) ? 'ring-2 ring-offset-2' : ''
              }`}
              style={{
                backgroundColor: theme.bg.hover,
                ringColor: theme.accent.color
              }}
              onClick={() => toggleSelect(snapshot.id)}
              onDoubleClick={() => setPreviewImage(snapshot)}
            >
              {viewMode === 'grid' ? (
                <>
                  <div className="aspect-square">
                    <img
                      src={snapshot.thumbnail || snapshot.url}
                      alt={snapshot.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Selection Checkbox */}
                  <div
                    className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedSnapshots.includes(snapshot.id) ? 'scale-100' : 'scale-0 group-hover:scale-100'
                    }`}
                    style={{
                      backgroundColor: selectedSnapshots.includes(snapshot.id) ? theme.accent.color : 'rgba(255,255,255,0.8)',
                      borderColor: theme.accent.color
                    }}
                  >
                    {selectedSnapshots.includes(snapshot.id) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>

                  {/* Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate">{snapshot.camera}</p>
                    <p className="text-xs text-white/70">{new Date(snapshot.timestamp).toLocaleString('de-DE')}</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 p-3">
                  <img
                    src={snapshot.thumbnail || snapshot.url}
                    alt={snapshot.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: theme.text.primary }}>{snapshot.camera}</p>
                    <p className="text-sm" style={{ color: theme.text.muted }}>
                      {new Date(snapshot.timestamp).toLocaleString('de-DE')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDownload(snapshot); }}
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: theme.bg.main }}
                  >
                    <Download size={16} style={{ color: theme.text.secondary }} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage.url}
            alt={previewImage.name}
            className="max-w-full max-h-full rounded-xl"
          />
          <button
            className="absolute top-4 right-4 p-3 rounded-xl bg-white/10 hover:bg-white/20"
            onClick={() => setPreviewImage(null)}
          >
            <X size={24} className="text-white" />
          </button>
        </div>
      )}
    </div>
  );
};

// Zeitraffer-Generator
const TimelapseGenerator = ({ theme, snapshots, onGenerate }) => {
  const [settings, setSettings] = useState({
    fps: 24,
    quality: 'high',
    resolution: '1080p',
    duration: 'auto'
  });
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleGenerate = async () => {
    setGenerating(true);
    setProgress(0);

    // Simulierte Progress-Updates
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    try {
      await onGenerate(settings);
      toast.success('Timelapse erfolgreich erstellt!');
    } catch (error) {
      toast.error('Timelapse-Erstellung fehlgeschlagen');
    } finally {
      setGenerating(false);
      clearInterval(interval);
    }
  };

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}
      >
        <div className="aspect-video bg-black flex items-center justify-center relative">
          {snapshots.length > 0 ? (
            <>
              <img
                src={snapshots[0]?.url}
                alt="Preview"
                className="w-full h-full object-contain opacity-50"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Film size={48} className="mx-auto mb-2 opacity-80" />
                  <p className="text-lg font-bold">{snapshots.length} Bilder</p>
                  <p className="text-sm opacity-70">
                    ≈ {Math.ceil(snapshots.length / settings.fps)} Sekunden bei {settings.fps} FPS
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center">
              <Film size={48} style={{ color: theme.text.muted }} className="mx-auto mb-2 opacity-30" />
              <p style={{ color: theme.text.muted }}>Wähle Bilder in der Galerie aus</p>
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div
        className="rounded-2xl border p-5 space-y-4"
        style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}
      >
        <h3 className="font-bold" style={{ color: theme.text.primary }}>
          Timelapse-Einstellungen
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-2" style={{ color: theme.text.muted }}>
              Framerate (FPS)
            </label>
            <select
              value={settings.fps}
              onChange={(e) => setSettings({ ...settings, fps: parseInt(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: theme.bg.main,
                borderColor: theme.border.default,
                color: theme.text.primary
              }}
            >
              <option value="12">12 FPS (Langsam)</option>
              <option value="24">24 FPS (Standard)</option>
              <option value="30">30 FPS (Flüssig)</option>
              <option value="60">60 FPS (Smooth)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: theme.text.muted }}>
              Qualität
            </label>
            <select
              value={settings.quality}
              onChange={(e) => setSettings({ ...settings, quality: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: theme.bg.main,
                borderColor: theme.border.default,
                color: theme.text.primary
              }}
            >
              <option value="low">Niedrig (schnell)</option>
              <option value="medium">Mittel</option>
              <option value="high">Hoch</option>
              <option value="max">Maximum</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: theme.text.muted }}>
              Auflösung
            </label>
            <select
              value={settings.resolution}
              onChange={(e) => setSettings({ ...settings, resolution: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: theme.bg.main,
                borderColor: theme.border.default,
                color: theme.text.primary
              }}
            >
              <option value="720p">720p (HD)</option>
              <option value="1080p">1080p (Full HD)</option>
              <option value="1440p">1440p (2K)</option>
              <option value="original">Original</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: theme.text.muted }}>
              Ausgabeformat
            </label>
            <select
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: theme.bg.main,
                borderColor: theme.border.default,
                color: theme.text.primary
              }}
            >
              <option value="mp4">MP4 (H.264)</option>
              <option value="webm">WebM (VP9)</option>
              <option value="gif">GIF (animiert)</option>
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={generating || snapshots.length < 2}
          className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(135deg, ${theme.accent.color}, ${theme.accent.dark})`
          }}
        >
          {generating ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Generiere... {progress}%
            </>
          ) : (
            <>
              <Film size={20} />
              Timelapse erstellen
            </>
          )}
        </button>

        {/* Progress Bar */}
        {generating && (
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: theme.bg.hover }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                backgroundColor: theme.accent.color
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Kamera-Einstellungen Modal
const CameraSettingsModal = ({ camera, theme, onClose, onSave }) => {
  const [settings, setSettings] = useState({
    ip: camera.ip || '',
    name: camera.name || '',
    brightness: 0,
    contrast: 0,
    quality: 10,
    timelapse: true,
    interval: 60
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Kamera-Einstellungen an ESP32 senden wenn online
      if (settings.ip) {
        try {
          await fetch(`http://${settings.ip}/api/settings?brightness=${settings.brightness}&contrast=${settings.contrast}&quality=${settings.quality}&timelapse=${settings.timelapse ? 1 : 0}&interval=${settings.interval}`);
        } catch (e) {
          console.log('Could not update camera settings');
        }
      }

      onSave({ ...camera, ...settings });
      toast.success('Einstellungen gespeichert');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl border overflow-hidden"
        style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}
      >
        {/* Header */}
        <div
          className="p-5 border-b flex items-center justify-between"
          style={{ borderColor: theme.border.default }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-xl"
              style={{ backgroundColor: `${camera.color}20` }}
            >
              <Settings size={20} style={{ color: camera.color }} />
            </div>
            <h3 className="font-bold" style={{ color: theme.text.primary }}>
              {camera.name} Einstellungen
            </h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/10">
            <X size={20} style={{ color: theme.text.muted }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm mb-2" style={{ color: theme.text.muted }}>
              Kamera-Name
            </label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: theme.bg.main,
                borderColor: theme.border.default,
                color: theme.text.primary
              }}
            />
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: theme.text.muted }}>
              IP-Adresse
            </label>
            <input
              type="text"
              value={settings.ip}
              onChange={(e) => setSettings({ ...settings, ip: e.target.value })}
              placeholder="192.168.2.100"
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: theme.bg.main,
                borderColor: theme.border.default,
                color: theme.text.primary
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2" style={{ color: theme.text.muted }}>
                Helligkeit ({settings.brightness})
              </label>
              <input
                type="range"
                min="-2"
                max="2"
                value={settings.brightness}
                onChange={(e) => setSettings({ ...settings, brightness: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: theme.text.muted }}>
                Kontrast ({settings.contrast})
              </label>
              <input
                type="range"
                min="-2"
                max="2"
                value={settings.contrast}
                onChange={(e) => setSettings({ ...settings, contrast: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: theme.text.muted }}>
              Timelapse Interval (Sekunden)
            </label>
            <input
              type="number"
              min="10"
              max="3600"
              value={settings.interval}
              onChange={(e) => setSettings({ ...settings, interval: parseInt(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: theme.bg.main,
                borderColor: theme.border.default,
                color: theme.text.primary
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span style={{ color: theme.text.secondary }}>Auto-Timelapse</span>
            <button
              onClick={() => setSettings({ ...settings, timelapse: !settings.timelapse })}
              className={`w-12 h-6 rounded-full transition-all ${settings.timelapse ? '' : 'opacity-50'}`}
              style={{ backgroundColor: settings.timelapse ? theme.accent.color : theme.bg.hover }}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  settings.timelapse ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-4 border-t flex justify-end gap-3"
          style={{ borderColor: theme.border.default }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium"
            style={{ backgroundColor: theme.bg.hover, color: theme.text.secondary }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2"
            style={{ backgroundColor: theme.accent.color }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
};

// Haupt-Komponente
const CameraStudio = () => {
  const { currentTheme: theme } = useTheme();
  const [activeTab, setActiveTab] = useState('live');
  const [cameras, setCameras] = useState(DEFAULT_CAMERAS);
  const [snapshots, setSnapshots] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [fullscreenCamera, setFullscreenCamera] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Kameras und Status vom Backend laden
  const loadCameraStatus = useCallback(async () => {
    try {
      const response = await api.get('/cameras/status/all');
      if (response.success && response.data && response.data.length > 0) {
        setCameras(response.data.map(cam => ({
          id: cam.cameraId,
          dbId: cam.id,
          name: cam.name,
          ip: cam.ip || '',
          color: cam.color || '#10b981',
          status: cam.status,
          lastSeen: cam.lastSeen,
          settings: cam.settings,
          stats: cam.stats
        })));
      }
    } catch (error) {
      console.log('Could not load camera status from backend');
    }
  }, []);

  useEffect(() => {
    loadCameraStatus();
    loadSnapshots();

    // Status alle 15 Sekunden aktualisieren
    const interval = setInterval(loadCameraStatus, 15000);
    return () => clearInterval(interval);
  }, [loadCameraStatus]);

  const loadSnapshots = async () => {
    try {
      const response = await api.get('/timelapse/captures');
      if (response.success && response.data) {
        setSnapshots(response.data.map((img, idx) => ({
          id: img._id || idx,
          url: img.url || `/api/timelapse/images/${img.filename}`,
          thumbnail: img.thumbnail || `/api/timelapse/thumbnails/${img.filename}`,
          camera: img.cameraName || 'cam1',
          timestamp: img.timestamp || img.createdAt,
          name: img.filename
        })));
      }
    } catch (error) {
      console.log('Could not load snapshots');
    }
  };

  const handleSnapshot = async (camera) => {
    if (!camera.ip) {
      toast.error('Keine IP-Adresse konfiguriert');
      return;
    }

    try {
      const response = await fetch(`http://${camera.ip}/capture`);
      const blob = await response.blob();

      // Download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${camera.id}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Snapshot gespeichert');

      // Galerie aktualisieren
      loadSnapshots();
    } catch (error) {
      toast.error('Snapshot fehlgeschlagen');
    }
  };

  const handleCameraUpdate = async (updatedCamera) => {
    setCameras(prev => prev.map(cam =>
      cam.id === updatedCamera.id ? updatedCamera : cam
    ));
    setSelectedCamera(null);

    // An Backend senden wenn DB-ID vorhanden
    if (updatedCamera.dbId) {
      try {
        await api.put(`/cameras/${updatedCamera.dbId}`, {
          name: updatedCamera.name,
          ip: updatedCamera.ip,
          color: updatedCamera.color
        });
      } catch (error) {
        console.log('Could not save camera to backend');
      }
    }
  };

  const handleDeleteSnapshots = async (ids) => {
    try {
      // API Call zum Löschen
      for (const id of ids) {
        await api.delete(`/timelapse/captures/${id}`);
      }
      setSnapshots(prev => prev.filter(s => !ids.includes(s.id)));
      toast.success(`${ids.length} Bilder gelöscht`);
    } catch (error) {
      toast.error('Löschen fehlgeschlagen');
    }
  };

  const handleCreateTimelapse = async (selectedIds) => {
    const selected = snapshots.filter(s => selectedIds.includes(s.id));
    setActiveTab('timelapse');
    // Timelapse-Generator erhält die ausgewählten Bilder
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div
        className="rounded-3xl p-6 border"
        style={{
          background: `linear-gradient(135deg, ${theme.accent.color}15 0%, transparent 100%)`,
          backgroundColor: theme.bg.card,
          borderColor: theme.border.default
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="p-4 rounded-2xl"
              style={{ backgroundColor: `${theme.accent.color}20` }}
            >
              <Video size={32} style={{ color: theme.accent.color }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                Camera Studio
              </h1>
              <p style={{ color: theme.text.muted }}>
                Multi-Kamera Streaming, Snapshots & Timelapse
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all hover:scale-105"
              style={{ backgroundColor: theme.bg.hover, color: theme.text.secondary }}
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <Tab
          active={activeTab === 'live'}
          onClick={() => setActiveTab('live')}
          icon={Video}
          label="Live View"
        />
        <Tab
          active={activeTab === 'gallery'}
          onClick={() => setActiveTab('gallery')}
          icon={Image}
          label="Galerie"
          badge={snapshots.length > 0 ? snapshots.length : null}
        />
        <Tab
          active={activeTab === 'timelapse'}
          onClick={() => setActiveTab('timelapse')}
          icon={Film}
          label="Timelapse"
        />
      </div>

      {/* Content */}
      {activeTab === 'live' && (
        <div className="grid md:grid-cols-2 gap-6">
          {cameras.map(camera => (
            <CameraCard
              key={camera.id}
              camera={camera}
              theme={theme}
              onSettings={() => setSelectedCamera(camera)}
              onSnapshot={() => handleSnapshot(camera)}
              onFullscreen={() => setFullscreenCamera(camera)}
              refreshKey={refreshKey}
            />
          ))}
        </div>
      )}

      {activeTab === 'gallery' && (
        <SnapshotGallery
          theme={theme}
          snapshots={snapshots}
          onDelete={handleDeleteSnapshots}
          onDownload={(snapshot) => {
            const a = document.createElement('a');
            a.href = snapshot.url;
            a.download = snapshot.name;
            a.click();
          }}
          onCreateTimelapse={handleCreateTimelapse}
        />
      )}

      {activeTab === 'timelapse' && (
        <TimelapseGenerator
          theme={theme}
          snapshots={snapshots}
          onGenerate={async (settings) => {
            // API Call für Timelapse-Generierung
            console.log('Generate timelapse with settings:', settings);
          }}
        />
      )}

      {/* Camera Settings Modal */}
      {selectedCamera && (
        <CameraSettingsModal
          camera={selectedCamera}
          theme={theme}
          onClose={() => setSelectedCamera(null)}
          onSave={handleCameraUpdate}
        />
      )}

      {/* Fullscreen Modal */}
      {fullscreenCamera && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setFullscreenCamera(null)}
        >
          <img
            src={`http://${fullscreenCamera.ip}/stream?t=${refreshKey}`}
            alt={fullscreenCamera.name}
            className="max-w-full max-h-full"
          />
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <h3 className="text-white text-xl font-bold">{fullscreenCamera.name}</h3>
            <button
              onClick={() => setFullscreenCamera(null)}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20"
            >
              <X size={24} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraStudio;
