import React, { useState, useEffect } from 'react';
import { Camera, Maximize2, RefreshCw, Power, Settings } from 'lucide-react';
import { colors } from '../../theme';

export default function CameraFeed({ theme }) {
  // Fallback theme für Backwards-Kompatibilität
  const defaultTheme = {
    bg: { card: '#0f172a', main: '#020617', hover: '#1e293b' },
    border: { default: '#1e293b' },
    text: { primary: '#f1f5f9', secondary: '#94a3b8', muted: '#64748b' }
  };
  const t = theme || defaultTheme;

  const [isOn, setIsOn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [cameraUrl, setCameraUrl] = useState('');
  const [streamError, setStreamError] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [tempUrl, setTempUrl] = useState('');

  // Lade Camera URL aus localStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem('camera_url') || '';
    setCameraUrl(savedUrl);
    setTempUrl(savedUrl);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setStreamError(false);
    // Trigger reload durch timestamp update
    const img = document.getElementById('camera-stream');
    if (img && cameraUrl) {
      img.src = `${cameraUrl}?t=${Date.now()}`;
    }
    setTimeout(() => setLoading(false), 1000);
  };

  const handleSaveUrl = () => {
    localStorage.setItem('camera_url', tempUrl);
    setCameraUrl(tempUrl);
    setShowConfig(false);
    setStreamError(false);
  };

  return (
    <div
      className="rounded-3xl p-5 md:p-6 shadow-xl flex flex-col h-full relative overflow-hidden group border"
      style={{
        backgroundColor: t.bg.card,
        borderColor: t.border.default
      }}
    >

      {/* Header */}
      <div className="flex justify-between items-center mb-4 z-10 relative">
        <h3
          className="font-bold flex items-center gap-2 text-base md:text-lg"
          style={{ color: t.text.primary }}
        >
          <Camera style={{ color: colors.blue[500] }} size={20} />
          Zelt Kamera
        </h3>
        <div className="flex items-center gap-2">
           <span
             className={`w-2 h-2 rounded-full ${isOn ? 'animate-pulse' : ''}`}
             style={{ backgroundColor: isOn ? colors.red[500] : t.border.default }}
           ></span>
           <span className="text-xs uppercase font-bold" style={{ color: t.text.muted }}>
             {isOn ? 'LIVE' : 'OFFLINE'}
           </span>
        </div>
      </div>

      {/* Feed Area */}
      <div
        className="flex-1 rounded-2xl relative overflow-hidden flex items-center justify-center border"
        style={{
          backgroundColor: '#000',
          borderColor: t.border.default
        }}
      >
        {isOn ? (
          <>
            {cameraUrl && !streamError ? (
              // Echte Kamera-Feed
              <>
                <img
                  id="camera-stream"
                  src={cameraUrl}
                  alt="Kamera Feed"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={() => setStreamError(true)}
                  onLoad={() => setStreamError(false)}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-40"></div>
              </>
            ) : (
              // Platzhalter wenn keine URL oder Fehler
              <>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-60"></div>
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `radial-gradient(${t.border.default} 1px, transparent 1px)`,
                    backgroundSize: '20px 20px'
                  }}
                ></div>
                <div className="text-center z-10 p-6">
                  <Camera size={48} className="mx-auto mb-2 opacity-50" style={{ color: t.border.default }} />
                  <p className="text-sm" style={{ color: t.text.muted }}>
                    {streamError ? 'Verbindung fehlgeschlagen' : 'Kein Signal von ESP32-CAM'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: t.border.default }}>
                    {cameraUrl ? 'Stream nicht erreichbar' : 'Klicke auf ⚙️ zum Konfigurieren'}
                  </p>
                  <button
                    onClick={() => setShowConfig(true)}
                    className="mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: colors.blue[600],
                      color: '#ffffff'
                    }}
                  >
                    <Settings size={16} className="inline mr-2" />
                    URL Konfigurieren
                  </button>
                </div>
              </>
            )}

            {/* Overlay Controls (Show on Hover) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
               <div className="flex gap-2">
                 <button
                   onClick={handleRefresh}
                   className="p-2 rounded-full text-white transition-colors"
                   style={{
                     backgroundColor: 'rgba(255, 255, 255, 0.1)'
                   }}
                   onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                   onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                 >
                   <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                 </button>
                 <button
                   onClick={() => setShowConfig(true)}
                   className="p-2 rounded-full text-white transition-colors"
                   style={{
                     backgroundColor: 'rgba(255, 255, 255, 0.1)'
                   }}
                   onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                   onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                 >
                   <Settings size={16} />
                 </button>
               </div>
               <div className="text-xs font-mono text-white/70">
                 {cameraUrl ? 'Stream Live' : 'Nicht konfiguriert'}
               </div>
               <button
                 className="p-2 rounded-full text-white transition-colors"
                 style={{
                   backgroundColor: 'rgba(255, 255, 255, 0.1)'
                 }}
                 onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                 onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
               >
                 <Maximize2 size={16} />
               </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center" style={{ color: t.text.muted }}>
            <Power size={32} className="mb-2 opacity-50" />
            <span>Kamera ausgeschaltet</span>
          </div>
        )}
      </div>

      {/* Power Toggle Absolute */}
      <button
        onClick={() => setIsOn(!isOn)}
        className="absolute top-5 md:top-6 right-5 md:right-6 p-2 rounded-xl transition-all z-20"
        style={{
          backgroundColor: isOn ? t.bg.hover : colors.blue[600],
          color: isOn ? t.text.secondary : '#ffffff',
          boxShadow: isOn ? 'none' : '0 10px 20px rgba(59, 130, 246, 0.5)'
        }}
        onMouseEnter={(e) => {
          if (isOn) e.currentTarget.style.color = t.text.primary;
        }}
        onMouseLeave={(e) => {
          if (isOn) e.currentTarget.style.color = t.text.secondary;
        }}
      >
        <Power size={18} />
      </button>

      {/* Konfigurations-Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl p-6 max-w-md w-full"
            style={{
              backgroundColor: t.bg.card,
              borderColor: t.border.default,
              border: '1px solid'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: t.text.primary }}>
                <Camera className="inline mr-2" size={20} />
                Kamera URL
              </h3>
              <button
                onClick={() => setShowConfig(false)}
                className="text-2xl leading-none"
                style={{ color: t.text.muted }}
              >
                ×
              </button>
            </div>

            <p className="text-sm mb-4" style={{ color: t.text.muted }}>
              Gib die URL deines ESP32-CAM Streams ein (z.B. http://192.168.1.100:81/stream)
            </p>

            <input
              type="text"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              placeholder="http://192.168.1.100:81/stream"
              className="w-full px-4 py-3 rounded-lg border mb-4 font-mono text-sm"
              style={{
                backgroundColor: t.bg.main,
                borderColor: t.border.default,
                color: t.text.primary
              }}
            />

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
              <p className="text-xs" style={{ color: colors.blue[400] }}>
                💡 <strong>Tipp:</strong> Für ESP32-CAM mit Arduino Sketch meist: <code className="bg-black/20 px-1 rounded">http://&lt;IP&gt;:81/stream</code>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfig(false)}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: t.bg.hover,
                  color: t.text.secondary
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveUrl}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: colors.emerald[600],
                  color: '#ffffff'
                }}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
