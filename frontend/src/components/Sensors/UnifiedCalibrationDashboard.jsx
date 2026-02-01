import React, { useState, useEffect } from 'react';
import {
  Activity, Droplets, Beaker, Sprout, Calendar, Settings,
  CheckCircle, AlertCircle, Clock, Ruler, Camera, Wifi, WifiOff
} from 'lucide-react';
import { useTheme } from '../../theme';
import { useSocket } from '../../context/SocketContext';
import CalibrationWizard from './CalibrationWizard';
import SoilCalibrationWizard from '../SoilCalibrationWizard';
import TofCalibrationPanel from './TofCalibrationPanel';
import CameraCalibrationPanel from './CameraCalibrationPanel';
import { api } from '../../utils/api';
import { loadCalibration } from '../../utils/soilCalibration';

/**
 * Unified Calibration Dashboard
 * Zentrale Übersicht für ALLE Sensor-Kalibrierungen:
 * - EC-Sensor
 * - pH-Sensor
 * - 6x Bodensensoren
 * - 6x VL53L0X ToF Höhensensoren
 * - ESP32-CAM Kameras
 */
const UnifiedCalibrationDashboard = () => {
  const { currentTheme } = useTheme();
  const { sensorData } = useSocket();
  const [activeView, setActiveView] = useState('overview');
  const [ecCalibration, setEcCalibration] = useState(null);
  const [phCalibration, setPhCalibration] = useState(null);
  const [soilCalibration, setSoilCalibration] = useState(null);
  const [tofConfig, setTofConfig] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lade Kalibrierungsdaten
  useEffect(() => {
    fetchCalibrationData();
  }, []);

  const fetchCalibrationData = async () => {
    setLoading(true);
    try {
      // EC & pH Kalibrierung + ToF Config + Kameras parallel laden
      const [ecRes, phRes, tofRes, camRes] = await Promise.all([
        api.get('/sensors/calibration/ec').catch(() => ({ data: { success: false } })),
        api.get('/sensors/calibration/ph').catch(() => ({ data: { success: false } })),
        api.get('/sensors/tof/config').catch(() => ({ data: { success: false } })),
        api.get('/cameras/status/all').catch(() => ({ data: { success: false } }))
      ]);

      if (ecRes.data.success) setEcCalibration(ecRes.data.data);
      if (phRes.data.success) setPhCalibration(phRes.data.data);
      if (tofRes.data?.success) setTofConfig(tofRes.data.data);
      if (camRes.data?.success) setCameras(camRes.data.data || []);

      // Bodensensor Kalibrierung aus LocalStorage
      const soilCalib = loadCalibration();
      setSoilCalibration(soilCalib);
    } catch (error) {
      console.error('Fehler beim Laden der Kalibrierungsdaten:', error);
    } finally {
      setLoading(false);
    }
  };

  // Hilfsfunktion: Formatiere Datum
  const formatDate = (date) => {
    if (!date) return 'Nie';
    const d = new Date(date);
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Hilfsfunktion: Tage seit letzter Kalibrierung
  const daysSinceCalibration = (date) => {
    if (!date) return null;
    const now = new Date();
    const lastCal = new Date(date);
    const diff = Math.floor((now - lastCal) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Kalibrierungs-Status Badge
  const CalibrationStatus = ({ isValid, lastDate }) => {
    const days = daysSinceCalibration(lastDate);

    let status = 'uncalibrated';
    let color = 'gray';
    let text = 'Nicht kalibriert';

    if (isValid) {
      if (days === null) {
        status = 'valid';
        color = 'green';
        text = 'Kalibriert';
      } else if (days < 30) {
        status = 'valid';
        color = 'green';
        text = `Kalibriert (vor ${days}d)`;
      } else if (days < 60) {
        status = 'warning';
        color = 'yellow';
        text = `Prüfen (vor ${days}d)`;
      } else {
        status = 'expired';
        color = 'red';
        text = `Abgelaufen (vor ${days}d)`;
      }
    }

    const colorMap = {
      green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
      yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
      red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
      gray: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' }
    };

    const styles = colorMap[color];

    return (
      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${styles.bg} ${styles.text} ${styles.border}`}>
        {text}
      </div>
    );
  };

  // Kalibrierungs-Karte Komponente
  const CalibrationCard = ({ icon, title, subtitle, status, lastCalibration, onCalibrate }) => (
    <div
      className="rounded-xl border p-6 transition-all hover:shadow-lg cursor-pointer"
      style={{
        backgroundColor: currentTheme.bg.card,
        borderColor: currentTheme.border.default
      }}
      onClick={onCalibrate}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: currentTheme.accent.color + '20' }}
          >
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-lg" style={{ color: currentTheme.text.primary }}>
              {title}
            </h3>
            <p className="text-sm" style={{ color: currentTheme.text.secondary }}>
              {subtitle}
            </p>
          </div>
        </div>
        <CalibrationStatus isValid={status} lastDate={lastCalibration} />
      </div>

      <div className="flex items-center gap-2 text-sm" style={{ color: currentTheme.text.secondary }}>
        <Clock size={16} />
        <span>Letzte Kalibrierung: {formatDate(lastCalibration)}</span>
      </div>

      <div className="mt-4 pt-4 border-t" style={{ borderColor: currentTheme.border.default }}>
        <button
          className="w-full py-2 rounded-lg font-medium transition-colors"
          style={{
            backgroundColor: currentTheme.accent.color + '20',
            color: currentTheme.accent.color
          }}
          onClick={(e) => {
            e.stopPropagation();
            onCalibrate();
          }}
        >
          Kalibrierung starten →
        </button>
      </div>
    </div>
  );

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: currentTheme.accent.color }}></div>
          <p style={{ color: currentTheme.text.secondary }}>Lade Kalibrierungsdaten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: currentTheme.accent.color + '20' }}
          >
            <Settings size={28} style={{ color: currentTheme.accent.color }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: currentTheme.text.primary }}>
              Sensor Kalibrierung
            </h1>
            <p className="text-sm" style={{ color: currentTheme.text.secondary }}>
              Zentrale Verwaltung aller Sensoren
            </p>
          </div>
        </div>

        {/* Navigation zurück zur Übersicht */}
        {activeView !== 'overview' && (
          <button
            onClick={() => setActiveView('overview')}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: currentTheme.bg.hover,
              color: currentTheme.text.primary
            }}
          >
            ← Zurück zur Übersicht
          </button>
        )}
      </div>

      {/* Content */}
      {activeView === 'overview' ? (
        <div className="space-y-6">
          {/* Info Banner */}
          <div
            className="rounded-xl border p-4"
            style={{
              backgroundColor: currentTheme.accent.color + '10',
              borderColor: currentTheme.accent.color + '30'
            }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle size={20} style={{ color: currentTheme.accent.color }} />
              <div>
                <h3 className="font-semibold mb-1" style={{ color: currentTheme.text.primary }}>
                  Wichtig: Regelmäßige Kalibrierung
                </h3>
                <p className="text-sm" style={{ color: currentTheme.text.secondary }}>
                  EC- und pH-Sensoren sollten alle 30 Tage kalibriert werden. Bodensensoren bei Bedarf (z.B. nach Substratswechsel).
                </p>
              </div>
            </div>
          </div>

          {/* Nährstoff-Sensoren (EC & pH) */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: currentTheme.text.primary }}>
              <Beaker size={24} />
              Nährstoff-Sensoren
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CalibrationCard
                icon={<Droplets size={24} style={{ color: currentTheme.accent.color }} />}
                title="EC-Sensor"
                subtitle="Atlas Scientific EZO-EC"
                status={ecCalibration?.status?.isValid}
                lastCalibration={ecCalibration?.status?.lastCalibration}
                onCalibrate={() => setActiveView('calibrate-ec')}
              />
              <CalibrationCard
                icon={<Beaker size={24} style={{ color: currentTheme.accent.color }} />}
                title="pH-Sensor"
                subtitle="Atlas Scientific EZO-pH"
                status={phCalibration?.status?.isValid}
                lastCalibration={phCalibration?.status?.lastCalibration}
                onCalibrate={() => setActiveView('calibrate-ph')}
              />
            </div>
          </div>

          {/* Bodensensoren */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: currentTheme.text.primary }}>
              <Sprout size={24} />
              Bodenfeuchtigkeit-Sensoren
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((sensorNum) => {
                const sensorKey = `sensor${sensorNum}`;
                const sensorData = soilCalibration?.[sensorKey];
                const isCalibrated = sensorData?.min !== 1200 || sensorData?.max !== 4095;
                const lastCalib = sensorData?.lastCalibration;

                return (
                  <CalibrationCard
                    key={sensorNum}
                    icon={<Sprout size={20} style={{ color: currentTheme.accent.color }} />}
                    title={`Bodensensor ${sensorNum}`}
                    subtitle={`Min: ${sensorData?.min || 1200} / Max: ${sensorData?.max || 4095}`}
                    status={isCalibrated}
                    lastCalibration={lastCalib}
                    onCalibrate={() => setActiveView('calibrate-soil')}
                  />
                );
              })}
            </div>
          </div>

          {/* Höhensensoren (VL53L0X) */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: currentTheme.text.primary }}>
              <Ruler size={24} />
              Höhensensoren (VL53L0X)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((slot) => {
                const tofSensor = tofConfig?.sensors?.find(s => s.slot === slot);
                const liveHeight = sensorData?.heights?.[slot - 1];
                const isActive = liveHeight > 0;
                const heightCm = isActive ? (liveHeight / 10).toFixed(1) : null;

                return (
                  <div
                    key={`tof-${slot}`}
                    className="rounded-xl border p-6 transition-all hover:shadow-lg cursor-pointer"
                    style={{
                      backgroundColor: currentTheme.bg.card,
                      borderColor: isActive ? 'rgba(59, 130, 246, 0.3)' : currentTheme.border.default
                    }}
                    onClick={() => setActiveView('calibrate-tof')}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                          style={{
                            backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isActive ? '#3b82f6' : '#ef4444'
                          }}
                        >
                          {slot}
                        </div>
                        <div>
                          <h3 className="font-semibold" style={{ color: currentTheme.text.primary }}>
                            {tofSensor?.label || `Slot ${slot}`}
                          </h3>
                          <p className="text-xs" style={{ color: currentTheme.text.muted }}>
                            Montage: {tofSensor?.mountHeight_mm || 800}mm
                          </p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        isActive
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}>
                        {isActive ? `${heightCm} cm` : 'Kein Signal'}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t" style={{ borderColor: currentTheme.border.default }}>
                      <button
                        className="w-full py-2 rounded-lg font-medium transition-colors text-sm"
                        style={{
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          color: '#3b82f6'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveView('calibrate-tof');
                        }}
                      >
                        Kalibrierung starten →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kameras (ESP32-CAM) */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: currentTheme.text.primary }}>
              <Camera size={24} />
              Kameras (ESP32-CAM)
            </h2>
            {cameras.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cameras.map((cam) => {
                  const isOnline = cam.status === 'online';
                  const lastSeen = cam.lastSeen
                    ? new Date(cam.lastSeen).toLocaleString('de-DE')
                    : 'Nie';

                  return (
                    <div
                      key={cam.id || cam._id}
                      className="rounded-xl border p-6 transition-all hover:shadow-lg cursor-pointer"
                      style={{
                        backgroundColor: currentTheme.bg.card,
                        borderColor: isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.2)'
                      }}
                      onClick={() => setActiveView('calibrate-cam')}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="p-3 rounded-lg"
                            style={{ backgroundColor: (cam.color || '#10b981') + '20' }}
                          >
                            <Camera size={24} style={{ color: cam.color || '#10b981' }} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg" style={{ color: currentTheme.text.primary }}>
                              {cam.name || cam.cameraId}
                            </h3>
                            <p className="text-xs" style={{ color: currentTheme.text.muted }}>
                              {cam.ip || 'Keine IP'} • {cam.location || 'Kein Standort'}
                            </p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${
                          isOnline
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                          {isOnline ? 'Online' : 'Offline'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm" style={{ color: currentTheme.text.secondary }}>
                        <Clock size={16} />
                        <span>Letzter Heartbeat: {lastSeen}</span>
                      </div>

                      <div className="mt-4 pt-4 border-t" style={{ borderColor: currentTheme.border.default }}>
                        <button
                          className="w-full py-2 rounded-lg font-medium transition-colors"
                          style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            color: '#10b981'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveView('calibrate-cam');
                          }}
                        >
                          Diagnose & Konfiguration →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className="rounded-xl border p-6 text-center"
                style={{
                  backgroundColor: currentTheme.bg.card,
                  borderColor: currentTheme.border.default
                }}
              >
                <Camera className="mx-auto mb-3 opacity-30" size={40} style={{ color: currentTheme.text.muted }} />
                <p className="font-semibold mb-1" style={{ color: currentTheme.text.primary }}>Keine Kameras konfiguriert</p>
                <p className="text-sm" style={{ color: currentTheme.text.secondary }}>
                  Füge eine Kamera im Camera Studio hinzu
                </p>
              </div>
            )}
          </div>

          {/* Andere Sensoren (Info) */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: currentTheme.text.primary }}>
              <Activity size={24} />
              Weitere Sensoren
            </h2>
            <div
              className="rounded-xl border p-6"
              style={{
                backgroundColor: currentTheme.bg.card,
                borderColor: currentTheme.border.default
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: currentTheme.text.primary }}>Lichtsensor (BH1750)</h4>
                  <p style={{ color: currentTheme.text.secondary }}>Keine Kalibrierung erforderlich (Read-Only)</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: currentTheme.text.primary }}>Temperatur & Luftfeuchtigkeit (SHT31)</h4>
                  <p style={{ color: currentTheme.text.secondary }}>Werkskalibrierung, keine Nachkalibrierung nötig</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: currentTheme.text.primary }}>Tank-Füllstand</h4>
                  <p style={{ color: currentTheme.text.secondary }}>Keine Kalibrierung erforderlich</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: currentTheme.text.primary }}>Gas/CO2-Sensor (MQ-135)</h4>
                  <p style={{ color: currentTheme.text.secondary }}>Burn-in bereits durchgeführt</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: currentTheme.text.primary }}>TCA9548A I2C Multiplexer</h4>
                  <p style={{ color: currentTheme.text.secondary }}>Adresse 0x70 • Channels 0-5: VL53L0X, Channel 6: SHT31-Top</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: currentTheme.text.primary }}>Luftqualität (ENS160)</h4>
                  <p style={{ color: currentTheme.text.secondary }}>Integrierte Kalibrierung (24h Burn-in empfohlen). Misst eCO2, TVOC und AQI. Adresse 0x53 auf direktem I2C Bus.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: currentTheme.text.primary }}>Temperatur & Feuchte (AHT21)</h4>
                  <p style={{ color: currentTheme.text.secondary }}>Werkskalibriert (keine Nachkalibrierung nötig). Liefert Kompensationsdaten für ENS160. Adresse 0x38 auf direktem I2C Bus.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeView === 'calibrate-ec' ? (
        <div className="max-w-3xl mx-auto">
          <CalibrationWizard
            sensorType="ec"
            onComplete={() => {
              fetchCalibrationData();
              setActiveView('overview');
            }}
          />
        </div>
      ) : activeView === 'calibrate-ph' ? (
        <div className="max-w-3xl mx-auto">
          <CalibrationWizard
            sensorType="ph"
            onComplete={() => {
              fetchCalibrationData();
              setActiveView('overview');
            }}
          />
        </div>
      ) : activeView === 'calibrate-soil' ? (
        <div className="max-w-5xl mx-auto">
          <SoilCalibrationWizard currentSensorData={sensorData?.soil || [0, 0, 0, 0, 0, 0]} />
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                fetchCalibrationData();
                setActiveView('overview');
              }}
              className="px-6 py-3 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: currentTheme.accent.color,
                color: 'white'
              }}
            >
              Fertig - Zurück zur Übersicht
            </button>
          </div>
        </div>
      ) : activeView === 'calibrate-tof' ? (
        <div className="max-w-5xl mx-auto">
          <TofCalibrationPanel
            onComplete={() => {
              fetchCalibrationData();
              setActiveView('overview');
            }}
          />
        </div>
      ) : activeView === 'calibrate-cam' ? (
        <div className="max-w-5xl mx-auto">
          <CameraCalibrationPanel
            onComplete={() => {
              fetchCalibrationData();
              setActiveView('overview');
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

export default UnifiedCalibrationDashboard;
