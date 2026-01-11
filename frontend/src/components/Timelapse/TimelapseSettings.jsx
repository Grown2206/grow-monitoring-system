import React, { useState } from 'react';
import { Settings, Camera, Film, Trash2, Clock, HardDrive, Play, Calendar } from 'lucide-react';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../theme';
import settingsService from '../../services/settingsService';
import { Input, Select, SaveButton } from '../common/Form';
import { SettingsSection, StatCard } from '../common/Settings';
import useAsyncAction from '../../hooks/useAsyncAction';
import { confirmAction } from '../../hooks/useConfirm';

/**
 * Timelapse Settings
 * Konfiguration und Video-Generierung
 */
const TimelapseSettings = () => {
  const { showAlert } = useAlert();
  const { currentTheme } = useTheme();
  const { loading, execute } = useAsyncAction();
  const [statistics, setStatistics] = useState(null);

  // Video Generation Form
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    fps: 30,
    resolution: '1920x1080',
    format: 'mp4',
    codec: 'h264'
  });

  // Capture Settings
  const [captureSettings, setCaptureSettings] = useState({
    autoCapture: false,
    interval: '10', // minutes
    resolution: '1920x1080',
    quality: 90
  });

  // Cleanup Settings
  const [cleanupDays, setCleanupDays] = useState(30);

  React.useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const data = await settingsService.getTimelapseStats();
      setStatistics(data.data);
    } catch (error) {
      console.error('❌ Error fetching statistics:', error);
    }
  };

  const captureNow = async () => {
    await execute(async () => {
      const [width, height] = captureSettings.resolution.split('x');

      await settingsService.capturePhoto({
        resolution: { width: parseInt(width), height: parseInt(height) },
        quality: captureSettings.quality,
        tags: ['manual']
      });

      await fetchStatistics();
    }, '✅ Snapshot erfolgreich erfasst!');
  };

  const generateVideo = async () => {
    if (!videoForm.title || !videoForm.startDate || !videoForm.endDate) {
      showAlert('Bitte fülle alle Pflichtfelder aus', 'warning');
      return;
    }

    await execute(async () => {
      const [width, height] = videoForm.resolution.split('x');

      await settingsService.generateVideo({
        title: videoForm.title,
        description: videoForm.description,
        startDate: videoForm.startDate,
        endDate: videoForm.endDate,
        fps: parseInt(videoForm.fps),
        resolution: { width: parseInt(width), height: parseInt(height) },
        format: videoForm.format,
        codec: videoForm.codec
      });

      // Reset form
      setVideoForm({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        fps: 30,
        resolution: '1920x1080',
        format: 'mp4',
        codec: 'h264'
      });
    }, '✅ Video-Generierung gestartet! Dies kann einige Minuten dauern.');
  };

  const runCleanup = async () => {
    if (!confirmAction(`Alte Captures (älter als ${cleanupDays} Tage) wirklich löschen?`)) return;

    await execute(async () => {
      const result = await settingsService.cleanupCaptures(parseInt(cleanupDays));

      showAlert(
        `✅ ${result.data.deletedCount} Captures gelöscht, ${result.data.freedSpaceMB} MB freigegeben`,
        'success'
      );

      await fetchStatistics();
    });
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            value={statistics.captures.totalCaptures}
            label="Captures"
            icon={Camera}
          />
          <StatCard
            value={statistics.videos.total}
            label="Videos"
            icon={Film}
          />
          <StatCard
            value={statistics.totalStorageGB.toFixed(2)}
            label="GB Gesamt"
            icon={HardDrive}
          />
          <StatCard
            value={statistics.captures.unusedCaptures || 0}
            label="Ungenutzt"
            icon={Trash2}
          />
        </div>
      )}

      {/* Manual Capture */}
      <SettingsSection title="Manueller Snapshot" icon={Camera}>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Auflösung</label>
            <select
              value={captureSettings.resolution}
              onChange={(e) =>
                setCaptureSettings({ ...captureSettings, resolution: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="1920x1080">1920x1080 (Full HD)</option>
              <option value="1280x720">1280x720 (HD)</option>
              <option value="3840x2160">3840x2160 (4K)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Qualität (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={captureSettings.quality}
              onChange={(e) =>
                setCaptureSettings({ ...captureSettings, quality: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>

          <div className="flex items-end">
            <SaveButton
              onClick={captureNow}
              loading={loading}
              label="Jetzt erfassen"
              loadingLabel="Erfasse..."
              className="w-full"
            />
          </div>
        </div>

        <div
          className="rounded-lg p-4 text-sm border"
          style={{
            backgroundColor: `${currentTheme.colors.info}10`,
            borderColor: `${currentTheme.colors.info}30`
          }}
        >
          <p style={{ color: currentTheme.text.primary }}>
            💡 <strong>Hinweis:</strong> In der aktuellen Version werden Placeholder-Bilder erstellt.
            Für echte Kamera-Integration muss die Hardware angeschlossen werden.
          </p>
        </div>
      </SettingsSection>

      {/* Video Generation */}
      <SettingsSection title="Video Generierung" icon={Film}>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Titel *</label>
              <input
                type="text"
                value={videoForm.title}
                onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                placeholder="Mein Grow Timelapse"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Beschreibung</label>
              <input
                type="text"
                value={videoForm.description}
                onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                placeholder="Optional..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start-Datum *</label>
              <input
                type="datetime-local"
                value={videoForm.startDate}
                onChange={(e) => setVideoForm({ ...videoForm, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">End-Datum *</label>
              <input
                type="datetime-local"
                value={videoForm.endDate}
                onChange={(e) => setVideoForm({ ...videoForm, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">FPS</label>
              <input
                type="number"
                min="15"
                max="60"
                value={videoForm.fps}
                onChange={(e) => setVideoForm({ ...videoForm, fps: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Auflösung</label>
              <select
                value={videoForm.resolution}
                onChange={(e) => setVideoForm({ ...videoForm, resolution: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="1920x1080">1920x1080</option>
                <option value="1280x720">1280x720</option>
                <option value="3840x2160">3840x2160</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Format</label>
              <select
                value={videoForm.format}
                onChange={(e) => setVideoForm({ ...videoForm, format: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="mp4">MP4</option>
                <option value="webm">WebM</option>
                <option value="avi">AVI</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Codec</label>
              <select
                value={videoForm.codec}
                onChange={(e) => setVideoForm({ ...videoForm, codec: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="h264">H.264</option>
                <option value="h265">H.265</option>
                <option value="vp9">VP9</option>
              </select>
            </div>
          </div>

          <SaveButton
            onClick={generateVideo}
            loading={loading}
            disabled={!videoForm.title || !videoForm.startDate || !videoForm.endDate}
            label="Video Generieren"
            loadingLabel="Generiere Video..."
            className="w-full"
          />

          <div
            className="rounded-lg p-4 text-sm border"
            style={{
              backgroundColor: `${currentTheme.colors.warning}10`,
              borderColor: `${currentTheme.colors.warning}30`
            }}
          >
            <p style={{ color: currentTheme.text.primary }}>
              ⚠️ <strong>Wichtig:</strong> Die Video-Generierung kann je nach Anzahl der Captures
              mehrere Minuten dauern. Der Fortschritt wird im Video-Player angezeigt.
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* Cleanup */}
      <SettingsSection title="Speicher-Bereinigung" icon={Trash2}>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">
                Lösche ungenutzte Captures älter als (Tage)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={cleanupDays}
                onChange={(e) => setCleanupDays(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div className="flex items-end">
              <SaveButton
                onClick={runCleanup}
                loading={loading}
                label="Cleanup starten"
                className="whitespace-nowrap"
              />
            </div>
          </div>

          <div
            className="rounded-lg p-4 text-sm border"
            style={{
              backgroundColor: `${currentTheme.colors.warning}10`,
              borderColor: `${currentTheme.colors.warning}30`
            }}
          >
            <p style={{ color: currentTheme.text.primary }}>
              ⚠️ Nur Captures die nicht in Videos verwendet wurden werden gelöscht.
              Videos bleiben unberührt.
            </p>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
};

export default TimelapseSettings;
