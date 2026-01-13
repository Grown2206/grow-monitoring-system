import React, { useState, useEffect } from 'react';
import { Camera, Wifi, WifiOff, RefreshCw, Play, Pause, Download, Maximize2 } from 'lucide-react';

const ESP32CameraView = () => {
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
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-lg">
              <Camera className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">ESP32-CAM Live View</h2>
              <p className="text-slate-400 text-sm">Live-Streams von beiden Grow-Kameras</p>
            </div>
          </div>
          <button
            onClick={refreshStream}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/20"
          >
            <RefreshCw size={18} />
            <span className="hidden sm:inline">Aktualisieren</span>
          </button>
        </div>
      </div>

      {/* Kamera Konfiguration */}
      <div className="grid md:grid-cols-2 gap-4">
        {cameras.map((camera) => (
          <div key={camera.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">{camera.name}</h3>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                camera.status === 'online'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {camera.status === 'online' ? <Wifi size={12} /> : <WifiOff size={12} />}
                {camera.status === 'online' ? 'ONLINE' : 'OFFLINE'}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-slate-400">IP-Adresse</label>
              <input
                type="text"
                placeholder="z.B. 192.168.2.100"
                value={camera.ip}
                onChange={(e) => updateCameraIP(camera.id, e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              {camera.lastUpdate && (
                <p className="text-xs text-slate-500">
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
          <div key={camera.id} className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700/50">
            {/* Stream Header */}
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">{camera.name}</h3>
                <p className="text-xs text-slate-400">{camera.ip || 'Keine IP konfiguriert'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => takeSnapshot(camera)}
                  disabled={camera.status !== 'online'}
                  className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Snapshot aufnehmen"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => setFullscreenCam(camera)}
                  disabled={camera.status !== 'online'}
                  className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Vollbild"
                >
                  <Maximize2 size={16} />
                </button>
              </div>
            </div>

            {/* Stream Container */}
            <div className="relative aspect-video bg-slate-900">
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
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                  <Camera size={48} className="mb-3 opacity-50" />
                  <p className="text-sm">
                    {camera.ip ? 'Kamera offline oder nicht erreichbar' : 'Bitte IP-Adresse eingeben'}
                  </p>
                </div>
              )}
            </div>

            {/* Stream Footer */}
            <div className="p-3 bg-slate-900/50 flex items-center justify-between text-xs text-slate-400">
              <span>MJPEG Stream</span>
              {camera.status === 'online' && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
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
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setFullscreenCam(null)}
        >
          <div className="max-w-7xl w-full">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">{fullscreenCam.name}</h3>
              <button
                onClick={() => setFullscreenCam(null)}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
              >
                Schließen
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
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
          <Camera size={18} />
          Schnellhilfe
        </h3>
        <div className="text-sm text-slate-300 space-y-1">
          <p>• Geben Sie die IP-Adresse Ihrer ESP32-CAM ein (zu finden in den seriellen Logs)</p>
          <p>• Die Kamera muss im gleichen Netzwerk sein wie dieser PC</p>
          <p>• Standard-Stream: <code className="bg-slate-800 px-2 py-1 rounded">http://KAMERA-IP/stream</code></p>
          <p>• Snapshot: <code className="bg-slate-800 px-2 py-1 rounded">http://KAMERA-IP/capture</code></p>
        </div>
      </div>
    </div>
  );
};

export default ESP32CameraView;
