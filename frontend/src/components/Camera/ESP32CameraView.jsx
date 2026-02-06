import React, { useState, useEffect } from 'react';
import { Camera, Wifi, WifiOff, RefreshCw, Play, Pause, Download, Maximize2 } from 'lucide-react';
import { useTheme } from '../../theme';

const ESP32CameraView = () => {
  const { currentTheme } = useTheme();

  const [cameras, setCameras] = useState([
    {
      id: 'cam1',
      name: 'Kamera 1',
      ip: '',
      streamUrl: '',
      status: 'offline',
      lastUpdate: null
    },
    {
      id: 'cam2',
      name: 'Kamera 2',
      ip: '',
      streamUrl: '',
      status: 'offline',
      lastUpdate: null
    }
  ]);

  const [fullscreenCam, setFullscreenCam] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Kamera IP-Adressen aktualisieren
  const updateCameraIP = (camId, ip) => {
    setCameras(prev => prev.map(cam =>
      cam.id === camId
        ? {
            ...cam,
            ip,
            streamUrl: ip ? `http://${ip}/stream` : ''
          }
        : cam
    ));
    // Im LocalStorage speichern
    localStorage.setItem(`camera_${camId}_ip`, ip);
  };

  // Kamera-Status überprüfen
  const checkCameraStatus = async (camera) => {
    if (!camera.ip) {
      return 'offline';
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Versuche Stream-URL statt Root, da einige ESP32 nur /stream haben
      const response = await fetch(`http://${camera.ip}/stream`, {
        method: 'HEAD',
        mode: 'no-cors', // Umgehe CORS für Status-Check
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      // Bei no-cors ist response.ok nicht verfügbar, daher prüfen wir type
      return response.type === 'opaque' ? 'online' : 'offline';
    } catch (error) {
      // Wenn Fetch fehlschlägt, versuche mit Image-Test
      try {
        return await new Promise((resolve) => {
          const img = new Image();
          const timeout = setTimeout(() => {
            img.src = '';
            resolve('offline');
          }, 3000);

          img.onload = () => {
            clearTimeout(timeout);
            resolve('online');
          };
          img.onerror = () => {
            clearTimeout(timeout);
            resolve('offline');
          };

          img.src = `http://${camera.ip}/capture?t=${Date.now()}`;
        });
      } catch {
        return 'offline';
      }
    }
  };

  // Alle Kameras überprüfen (ohne IP zu ändern!)
  const checkAllCameras = async () => {
    const updates = await Promise.all(
      cameras.map(async (cam) => {
        const status = await checkCameraStatus(cam);
        return {
          ...cam,
          status,
          lastUpdate: new Date()
        };
      })
    );
    // Nur Status und lastUpdate ändern, nicht die ganze Camera neu setzen
    setCameras(prev => prev.map((cam, index) => ({
      ...cam,
      status: updates[index].status,
      lastUpdate: updates[index].lastUpdate
    })));
  };

  // Beim Start IP-Adressen aus LocalStorage laden
  useEffect(() => {
    const cam1IP = localStorage.getItem('camera_cam1_ip');
    const cam2IP = localStorage.getItem('camera_cam2_ip');

    if (cam1IP) updateCameraIP('cam1', cam1IP);
    if (cam2IP) updateCameraIP('cam2', cam2IP);
  }, []);

  // Periodische Status-Überprüfung
  useEffect(() => {
    checkAllCameras();
    const interval = setInterval(checkAllCameras, 10000); // Alle 10 Sekunden
    return () => clearInterval(interval);
  }, [cameras.map(c => c.ip).join(',')]);

  // Stream neu laden
  const refreshStream = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Snapshot aufnehmen
  const takeSnapshot = async (camera) => {
    if (!camera.ip) return;

    try {
      const response = await fetch(`http://${camera.ip}/capture`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${camera.id}_snapshot_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Snapshot fehlgeschlagen:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-xl p-6 border"
        style={{
          backgroundColor: currentTheme.bg.hover,
          borderColor: currentTheme.border.light
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-lg"
              style={{ background: 'linear-gradient(to bottom right, #a855f7, #ec4899)' }}
            >
              <Camera style={{ color: '#ffffff' }} size={24} />
            </div>
            <div>
              <h2
                className="text-2xl font-bold"
                style={{ color: currentTheme.text.primary }}
              >
                ESP32-CAM Live View
              </h2>
              <p
                className="text-sm"
                style={{ color: currentTheme.text.secondary }}
              >
                Live-Streams von beiden Grow-Kameras
              </p>
            </div>
          </div>
          <button
            onClick={refreshStream}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#34d399',
              borderColor: 'rgba(16, 185, 129, 0.2)'
            }}
          >
            <RefreshCw size={18} />
            <span className="hidden sm:inline">Aktualisieren</span>
          </button>
        </div>
      </div>

      {/* Kamera Konfiguration */}
      <div className="grid md:grid-cols-2 gap-4">
        {cameras.map((camera) => (
          <div
            key={camera.id}
            className="rounded-xl p-4 border"
            style={{
              backgroundColor: currentTheme.bg.hover,
              borderColor: currentTheme.border.light
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3
                className="text-lg font-semibold"
                style={{ color: currentTheme.text.primary }}
              >
                {camera.name}
              </h3>
              <div
                className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border"
                style={camera.status === 'online'
                  ? { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.2)' }
                  : { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.2)' }
                }
              >
                {camera.status === 'online' ? <Wifi size={12} /> : <WifiOff size={12} />}
                {camera.status === 'online' ? 'ONLINE' : 'OFFLINE'}
              </div>
            </div>

            <div className="space-y-2">
              <label
                className="block text-sm"
                style={{ color: currentTheme.text.secondary }}
              >
                IP-Adresse
              </label>
              <input
                type="text"
                placeholder="z.B. 192.168.2.100"
                value={camera.ip}
                onChange={(e) => updateCameraIP(camera.id, e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none"
                style={{
                  backgroundColor: currentTheme.bg.input,
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: currentTheme.border.light,
                  color: currentTheme.text.primary
                }}
              />
              {camera.lastUpdate && (
                <p
                  className="text-xs"
                  style={{ color: currentTheme.text.muted }}
                >
                  Zuletzt geprüft: {camera.lastUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Live-Streams */}
      <div className="grid md:grid-cols-2 gap-6">
        {cameras.map((camera) => (
          <div
            key={camera.id}
            className="rounded-xl overflow-hidden border"
            style={{
              backgroundColor: currentTheme.bg.hover,
              borderColor: currentTheme.border.light
            }}
          >
            {/* Stream Header */}
            <div
              className="p-4 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${currentTheme.border.light}` }}
            >
              <div>
                <h3
                  className="font-semibold"
                  style={{ color: currentTheme.text.primary }}
                >
                  {camera.name}
                </h3>
                <p
                  className="text-xs"
                  style={{ color: currentTheme.text.secondary }}
                >
                  {camera.ip || 'Keine IP konfiguriert'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => takeSnapshot(camera)}
                  disabled={camera.status !== 'online'}
                  className="p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Snapshot aufnehmen"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    color: '#60a5fa'
                  }}
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => setFullscreenCam(camera)}
                  disabled={camera.status !== 'online'}
                  className="p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Vollbild"
                  style={{
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    color: '#c084fc'
                  }}
                >
                  <Maximize2 size={16} />
                </button>
              </div>
            </div>

            {/* Stream Container */}
            <div
              className="relative aspect-video"
              style={{ backgroundColor: currentTheme.bg.card }}
            >
              {camera.status === 'online' && camera.streamUrl ? (
                <img
                  key={refreshKey}
                  src={`${camera.streamUrl}?t=${refreshKey}`}
                  alt={`${camera.name} Live Stream`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    setCameras(prev => prev.map(c =>
                      c.id === camera.id ? { ...c, status: 'offline' } : c
                    ));
                  }}
                />
              ) : (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center"
                  style={{ color: currentTheme.text.muted }}
                >
                  <Camera size={48} className="mb-3 opacity-50" />
                  <p className="text-sm">
                    {camera.ip ? 'Kamera offline oder nicht erreichbar' : 'Bitte IP-Adresse eingeben'}
                  </p>
                </div>
              )}
            </div>

            {/* Stream Footer */}
            <div
              className="p-3 flex items-center justify-between text-xs"
              style={{
                backgroundColor: currentTheme.bg.card,
                color: currentTheme.text.secondary
              }}
            >
              <span>MJPEG Stream</span>
              {camera.status === 'online' && (
                <div className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: '#10b981' }}
                  ></div>
                  <span>Live</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Modal */}
      {fullscreenCam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
          onClick={() => setFullscreenCam(null)}
        >
          <div className="max-w-7xl w-full">
            <div className="mb-4 flex items-center justify-between">
              <h3
                className="text-2xl font-bold"
                style={{ color: currentTheme.text.primary }}
              >
                {fullscreenCam.name}
              </h3>
              <button
                onClick={() => setFullscreenCam(null)}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171'
                }}
              >
                Schliessen
              </button>
            </div>
            <img
              key={refreshKey}
              src={`${fullscreenCam.streamUrl}?t=${refreshKey}`}
              alt={`${fullscreenCam.name} Fullscreen`}
              className="w-full rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Hilfe-Bereich */}
      <div
        className="rounded-xl p-4 border"
        style={{
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'rgba(59, 130, 246, 0.2)'
        }}
      >
        <h3
          className="font-semibold mb-2 flex items-center gap-2"
          style={{ color: '#60a5fa' }}
        >
          <Camera size={18} />
          Schnellhilfe
        </h3>
        <div className="text-sm space-y-1" style={{ color: currentTheme.text.primary }}>
          <p>&#8226; Geben Sie die IP-Adresse Ihrer ESP32-CAM ein (zu finden in den seriellen Logs)</p>
          <p>&#8226; Die Kamera muss im gleichen Netzwerk sein wie dieser PC</p>
          <p>
            &#8226; Standard-Stream:{' '}
            <code
              className="px-2 py-1 rounded"
              style={{ backgroundColor: currentTheme.bg.hover }}
            >
              http://KAMERA-IP/stream
            </code>
          </p>
          <p>
            &#8226; Snapshot:{' '}
            <code
              className="px-2 py-1 rounded"
              style={{ backgroundColor: currentTheme.bg.hover }}
            >
              http://KAMERA-IP/capture
            </code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ESP32CameraView;
