import React, { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import { api } from '../../utils/api';
import toast from '../../utils/toast';
import {
  Camera, Wifi, WifiOff, Loader2, RefreshCw, Zap,
  Image, Settings, CheckCircle, AlertCircle, Clock,
  Eye, HardDrive, Brain
} from 'lucide-react';

/**
 * CameraCalibrationPanel
 * ESP32-CAM Diagnose & Konfiguration
 * - Verbindungstest (Ping + Latenz)
 * - Live-Preview
 * - Auflösung/Flash Steuerung
 * - Snapshot-Statistik
 * - Gemini API-Key Status
 */
const CameraCalibrationPanel = ({ onComplete }) => {
  const { currentTheme } = useTheme();
  const theme = currentTheme;

  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState({});
  const [diagLoading, setDiagLoading] = useState({});
  const [previewUrl, setPreviewUrl] = useState({});
  const [previewLoading, setPreviewLoading] = useState({});

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      setLoading(true);
      const res = await api.get('/cameras/status/all');
      if (res.data?.success) {
        setCameras(res.data.data || []);
        // Auto-diagnostics für alle Kameras
        for (const cam of (res.data.data || [])) {
          loadDiagnostics(cam.id);
        }
      }
    } catch (e) {
      console.error('Error loading cameras:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadDiagnostics = async (camId) => {
    try {
      setDiagLoading(prev => ({ ...prev, [camId]: true }));
      const res = await api.get(`/cameras/${camId}/diagnostics`);
      if (res.data?.success) {
        setDiagnostics(prev => ({ ...prev, [camId]: res.data.data }));
      }
    } catch (e) {
      console.error('Error loading diagnostics:', e);
    } finally {
      setDiagLoading(prev => ({ ...prev, [camId]: false }));
    }
  };

  const capturePreview = async (cam) => {
    if (!cam.ip) {
      toast.error('Keine IP konfiguriert');
      return;
    }
    try {
      setPreviewLoading(prev => ({ ...prev, [cam.id]: true }));
      // Snapshot über Backend aufnehmen
      const res = await api.post(`/cameras/${cam.id}/snapshot`);
      if (res.data?.success && res.data.data?.snapshotId) {
        const imgUrl = `/api/cameras/snapshots/${res.data.data.snapshotId}/image`;
        setPreviewUrl(prev => ({ ...prev, [cam.id]: imgUrl }));
        toast.success('Snapshot aufgenommen');
      }
    } catch (e) {
      toast.error('Snapshot fehlgeschlagen');
    } finally {
      setPreviewLoading(prev => ({ ...prev, [cam.id]: false }));
    }
  };

  const toggleFlash = async (cam, state) => {
    try {
      await api.post(`/cameras/${cam.id}/flash`, { state });
      toast.success(state ? 'Flash an' : 'Flash aus');
    } catch (e) {
      toast.error('Flash konnte nicht umgeschaltet werden');
    }
  };

  const formatLastSeen = (date) => {
    if (!date) return 'Nie';
    const diff = Math.round((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return `vor ${diff}s`;
    if (diff < 3600) return `vor ${Math.round(diff / 60)}min`;
    return new Date(date).toLocaleString('de-DE');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={32} style={{ color: theme.accent.color }} />
      </div>
    );
  }

  if (cameras.length === 0) {
    return (
      <div className="text-center py-12">
        <Camera className="mx-auto mb-4 opacity-30" size={48} style={{ color: theme.text.muted }} />
        <p className="font-semibold mb-2" style={{ color: theme.text.primary }}>Keine Kameras konfiguriert</p>
        <p className="text-sm" style={{ color: theme.text.muted }}>
          Füge eine Kamera im Camera Studio hinzu
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div
        className="rounded-xl border p-4 flex items-start gap-3"
        style={{
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          borderColor: 'rgba(16, 185, 129, 0.2)'
        }}
      >
        <Camera size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-emerald-400 mb-1">ESP32-CAM Diagnose</h4>
          <p className="text-sm" style={{ color: theme.text.secondary }}>
            Verbindungstest, Live-Preview, Auflösung und Flash-Steuerung.
            Die Kameras senden alle 30 Sekunden einen Heartbeat.
          </p>
        </div>
      </div>

      {/* Camera Cards */}
      <div className="space-y-6">
        {cameras.map(cam => {
          const diag = diagnostics[cam.id];
          const isOnline = cam.status === 'online';
          const isLoading = diagLoading[cam.id];

          return (
            <div
              key={cam.id}
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: theme.bg.card,
                borderColor: isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.2)'
              }}
            >
              {/* Camera Header */}
              <div
                className="p-5 flex items-center justify-between border-b"
                style={{ borderColor: theme.border.default }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: (cam.color || '#10b981') + '20' }}
                  >
                    <Camera size={20} style={{ color: cam.color || '#10b981' }} />
                  </div>
                  <div>
                    <h3 className="font-bold" style={{ color: theme.text.primary }}>
                      {cam.name || cam.cameraId}
                    </h3>
                    <div className="flex items-center gap-3 text-xs" style={{ color: theme.text.muted }}>
                      <span>{cam.ip || 'Keine IP'}</span>
                      <span>|</span>
                      <span className="flex items-center gap-1">
                        {isOnline ? (
                          <><Wifi size={10} className="text-emerald-400" /> Online</>
                        ) : (
                          <><WifiOff size={10} className="text-red-400" /> Offline</>
                        )}
                      </span>
                      <span>|</span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatLastSeen(cam.lastSeen)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadDiagnostics(cam.id)}
                    disabled={isLoading}
                    className="p-2 rounded-lg transition-all"
                    style={{ backgroundColor: theme.bg.hover, color: theme.text.muted }}
                    title="Diagnose neu laden"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  </button>
                </div>
              </div>

              {/* Diagnostics Content */}
              <div className="p-5">
                {!diag ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="animate-spin text-slate-400" size={24} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Stats */}
                    <div className="space-y-4">
                      {/* Connection Status */}
                      <div className="grid grid-cols-2 gap-3">
                        <DiagCard
                          label="Verbindung"
                          value={diag.connection.status === 'online' ? 'Online' : 'Offline'}
                          icon={diag.connection.status === 'online' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                          color={diag.connection.status === 'online' ? '#10b981' : '#ef4444'}
                          theme={theme}
                        />
                        <DiagCard
                          label="Ping"
                          value={diag.ping?.reachable ? `${diag.ping.latency_ms}ms` : 'N/A'}
                          icon={<Zap size={16} />}
                          color={diag.ping?.reachable ? '#3b82f6' : '#94a3b8'}
                          theme={theme}
                        />
                        <DiagCard
                          label="Snapshots (24h)"
                          value={diag.snapshots.last24h}
                          icon={<Image size={16} />}
                          color="#f59e0b"
                          theme={theme}
                          subtitle={`${diag.snapshots.total} gesamt`}
                        />
                        <DiagCard
                          label="Gemini AI"
                          value={diag.geminiConfigured ? 'Aktiv' : 'Nicht konfiguriert'}
                          icon={<Brain size={16} />}
                          color={diag.geminiConfigured ? '#a855f7' : '#94a3b8'}
                          theme={theme}
                        />
                      </div>

                      {/* Flash Controls */}
                      {isOnline && (
                        <div
                          className="rounded-xl p-4 border"
                          style={{ backgroundColor: theme.bg.hover, borderColor: theme.border.default }}
                        >
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"
                            style={{ color: theme.text.primary }}
                          >
                            <Settings size={14} /> Steuerung
                          </h4>
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleFlash(cam, true)}
                              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20"
                            >
                              Flash AN
                            </button>
                            <button
                              onClick={() => toggleFlash(cam, false)}
                              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 border border-slate-500/20"
                            >
                              Flash AUS
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Preview */}
                    <div>
                      <div
                        className="rounded-xl border overflow-hidden"
                        style={{ borderColor: theme.border.default }}
                      >
                        <div className="p-3 border-b flex items-center justify-between"
                          style={{ borderColor: theme.border.default, backgroundColor: theme.bg.hover }}
                        >
                          <span className="text-sm font-medium flex items-center gap-2"
                            style={{ color: theme.text.primary }}
                          >
                            <Eye size={14} /> Live-Vorschau
                          </span>
                          <button
                            onClick={() => capturePreview(cam)}
                            disabled={previewLoading[cam.id] || !isOnline}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{
                              backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.1)' : theme.bg.card,
                              color: isOnline ? '#10b981' : theme.text.muted
                            }}
                          >
                            {previewLoading[cam.id] ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Camera size={12} />
                            )}
                            Aufnehmen
                          </button>
                        </div>

                        <div className="aspect-video bg-black flex items-center justify-center">
                          {previewUrl[cam.id] ? (
                            <img
                              src={previewUrl[cam.id]}
                              alt="Camera Preview"
                              className="w-full h-full object-contain"
                              onError={() => setPreviewUrl(prev => ({ ...prev, [cam.id]: null }))}
                            />
                          ) : (
                            <div className="text-center">
                              <Camera className="mx-auto mb-2 opacity-20" size={40} style={{ color: '#64748b' }} />
                              <p className="text-xs text-slate-500">
                                {isOnline ? 'Klicke "Aufnehmen" für Preview' : 'Kamera offline'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Last Snapshot Info */}
                      {diag.snapshots.lastSnapshot && (
                        <p className="text-xs mt-2 text-center" style={{ color: theme.text.muted }}>
                          Letzter Snapshot: {new Date(diag.snapshots.lastSnapshot).toLocaleString('de-DE')}
                          {diag.snapshots.lastFileSize && ` (${(diag.snapshots.lastFileSize / 1024).toFixed(0)} KB)`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Diagnose-Karte Subkomponente
const DiagCard = ({ label, value, icon, color, theme, subtitle }) => (
  <div
    className="rounded-xl p-3 border"
    style={{
      backgroundColor: `${color}08`,
      borderColor: `${color}20`
    }}
  >
    <div className="flex items-center gap-1.5 mb-1" style={{ color }}>
      {icon}
      <span className="text-[10px] font-medium uppercase">{label}</span>
    </div>
    <p className="text-lg font-bold" style={{ color }}>{value}</p>
    {subtitle && (
      <p className="text-[10px] mt-0.5" style={{ color: `${color}80` }}>{subtitle}</p>
    )}
  </div>
);

export default CameraCalibrationPanel;
