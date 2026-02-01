import React, { useState } from 'react';
import { Film, Camera, Settings, Video, Loader2, Image } from 'lucide-react';
import { useTheme } from '../../theme';
import { api } from '../../utils/api';
import toast from '../../utils/toast';
import TimelapseGallery from './TimelapseGallery';
import TimelapsePlayer from './TimelapsePlayer';
import TimelapseSettings from './TimelapseSettings';

/**
 * Timelapse Dashboard
 * Hauptkomponente für Timelapse-Funktionalität
 */
const TimelapseDashboard = () => {
  const { currentTheme } = useTheme();
  const theme = currentTheme;
  const [activeView, setActiveView] = useState('gallery'); // 'gallery', 'videos', 'settings'
  const [capturing, setCapturing] = useState(false);

  // Manual snapshot capture
  const captureSnapshot = async () => {
    setCapturing(true);
    try {
      await api.post('/timelapse/capture');
      toast.success('Snapshot erfasst!');
      // Refresh gallery if on that view
      if (activeView === 'gallery') {
        // Will auto-refresh via TimelapseGallery
      }
    } catch (error) {
      console.error('Capture error:', error);
      toast.error('Snapshot fehlgeschlagen');
    } finally {
      setCapturing(false);
    }
  };

  // Tab style helper
  const getTabStyle = (isActive) => ({
    backgroundColor: isActive ? theme.bg.card : 'transparent',
    color: isActive ? theme.text.primary : theme.text.muted,
    borderColor: isActive ? theme.border.default : 'transparent'
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-xl"
            style={{ backgroundColor: `${theme.accent.color}20` }}
          >
            <Film style={{ color: theme.accent.color }} size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: theme.text.primary }}>
              Timelapse Generator
            </h1>
            <p className="text-sm" style={{ color: theme.text.secondary }}>
              Erfasse Snapshots und erstelle Zeitraffer-Videos
            </p>
          </div>
        </div>

        {/* Quick Action: Manual Capture */}
        <button
          onClick={captureSnapshot}
          disabled={capturing}
          className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50"
          style={{
            backgroundColor: theme.accent.color,
            color: '#fff'
          }}
        >
          {capturing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Erfasse...
            </>
          ) : (
            <>
              <Camera size={18} />
              Snapshot
            </>
          )}
        </button>
      </div>

      {/* View Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ backgroundColor: theme.bg.hover }}
      >
        <button
          onClick={() => setActiveView('gallery')}
          className="flex-1 md:flex-none md:px-6 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
          style={getTabStyle(activeView === 'gallery')}
        >
          <Image size={18} />
          <span className="hidden sm:inline">Gallery</span>
        </button>

        <button
          onClick={() => setActiveView('videos')}
          className="flex-1 md:flex-none md:px-6 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
          style={getTabStyle(activeView === 'videos')}
        >
          <Video size={18} />
          <span className="hidden sm:inline">Videos</span>
        </button>

        <button
          onClick={() => setActiveView('settings')}
          className="flex-1 md:flex-none md:px-6 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
          style={getTabStyle(activeView === 'settings')}
        >
          <Settings size={18} />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>

      {/* Content */}
      <div>
        {activeView === 'gallery' && <TimelapseGallery theme={theme} />}
        {activeView === 'videos' && <TimelapsePlayer theme={theme} />}
        {activeView === 'settings' && <TimelapseSettings theme={theme} />}
      </div>

      {/* Info Box */}
      {activeView === 'gallery' && (
        <div
          className="rounded-xl p-5 border"
          style={{
            backgroundColor: `${theme.accent.color}10`,
            borderColor: `${theme.accent.color}30`
          }}
        >
          <h3 className="text-base font-semibold mb-3" style={{ color: theme.text.primary }}>
            Wie funktioniert's?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm" style={{ color: theme.text.secondary }}>
            <div className="flex items-start gap-2">
              <span className="text-lg">1.</span>
              <div>
                <strong style={{ color: theme.text.primary }}>Snapshots erfassen</strong>
                <p className="mt-1">Manuell oder automatisch Bilder aufnehmen</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">2.</span>
              <div>
                <strong style={{ color: theme.text.primary }}>Zeitraum auswählen</strong>
                <p className="mt-1">Captures für dein Video selektieren</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">3.</span>
              <div>
                <strong style={{ color: theme.text.primary }}>Video generieren</strong>
                <p className="mt-1">Zeitraffer-Video erstellen und downloaden</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'videos' && (
        <div
          className="rounded-xl p-5 border"
          style={{
            backgroundColor: theme.bg.card,
            borderColor: theme.border.default
          }}
        >
          <h3 className="text-base font-semibold mb-2" style={{ color: theme.text.primary }}>
            Video-Generierung
          </h3>
          <p className="text-sm" style={{ color: theme.text.secondary }}>
            Videos werden im Hintergrund verarbeitet. Für beste Ergebnisse verwende
            Captures mit gleichmäßigem Intervall und konsistenten Lichtverhältnissen.
          </p>
        </div>
      )}
    </div>
  );
};

export default TimelapseDashboard;
