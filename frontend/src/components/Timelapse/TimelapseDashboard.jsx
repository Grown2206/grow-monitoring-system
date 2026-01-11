import React, { useState } from 'react';
import { Film, Camera, Settings, Video } from 'lucide-react';
import TimelapseGallery from './TimelapseGallery';
import TimelapsePlayer from './TimelapsePlayer';
import TimelapseSettings from './TimelapseSettings';

/**
 * Timelapse Dashboard
 * Hauptkomponente für Timelapse-Funktionalität
 */
const TimelapseDashboard = () => {
  const [activeView, setActiveView] = useState('gallery'); // 'gallery', 'videos', 'settings'

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
            <Film className="text-emerald-500" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Timelapse Generator</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Erfasse Snapshots und erstelle beeindruckende Zeitraffer-Videos
            </p>
          </div>
        </div>

        {/* Quick Action: Manual Capture */}
        <button
          onClick={() => {
            // Trigger manual capture (will be handled in settings)
            setActiveView('settings');
          }}
          className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
        >
          <Camera size={18} />
          Snapshot erfassen
        </button>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveView('gallery')}
          className={`flex-1 md:flex-none md:px-6 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeView === 'gallery'
              ? 'bg-white dark:bg-gray-700 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <Camera size={18} />
          <span className="hidden sm:inline">Capture Gallery</span>
          <span className="sm:hidden">Gallery</span>
        </button>

        <button
          onClick={() => setActiveView('videos')}
          className={`flex-1 md:flex-none md:px-6 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeView === 'videos'
              ? 'bg-white dark:bg-gray-700 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <Video size={18} />
          <span className="hidden sm:inline">Video Player</span>
          <span className="sm:hidden">Videos</span>
        </button>

        <button
          onClick={() => setActiveView('settings')}
          className={`flex-1 md:flex-none md:px-6 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeView === 'settings'
              ? 'bg-white dark:bg-gray-700 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <Settings size={18} />
          <span className="hidden sm:inline">Einstellungen</span>
          <span className="sm:hidden">Settings</span>
        </button>
      </div>

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        {activeView === 'gallery' && <TimelapseGallery />}
        {activeView === 'videos' && <TimelapsePlayer />}
        {activeView === 'settings' && <TimelapseSettings />}
      </div>

      {/* Info Box */}
      {activeView === 'gallery' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            📸 Wie funktioniert's?
          </h3>
          <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <p>
              <strong>1. Snapshots erfassen:</strong> Manuelle oder automatische Erfassung von Bildern
            </p>
            <p>
              <strong>2. Captures auswählen:</strong> Wähle den Zeitraum für dein Video
            </p>
            <p>
              <strong>3. Video generieren:</strong> Erstelle ein Zeitraffer-Video aus deinen Captures
            </p>
          </div>
        </div>
      )}

      {activeView === 'videos' && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
            🎬 Video-Generierung
          </h3>
          <div className="space-y-2 text-sm text-emerald-800 dark:text-emerald-200">
            <p>
              Videos werden im Hintergrund verarbeitet. Der Fortschritt wird in Echtzeit angezeigt.
            </p>
            <p>
              <strong>Tipp:</strong> Für beste Ergebnisse verwende Captures mit gleichmäßigem Intervall
              und konsistenten Lichtverhältnissen.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelapseDashboard;
