import React, { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../utils/api';
import toast from '../../utils/toast';
import {
  Ruler, Save, RotateCcw, CheckCircle, AlertTriangle,
  Loader2, Info, ArrowDown, Zap
} from 'lucide-react';

/**
 * TofCalibrationPanel
 * Kalibrierung der 6x VL53L0X ToF-Sensoren
 * - Montagehöhe pro Slot konfigurieren
 * - Live-Vorschau der berechneten Pflanzenhöhe
 * - Offset-Korrektur pro Sensor
 */
const TofCalibrationPanel = ({ onComplete }) => {
  const { currentTheme } = useTheme();
  const theme = currentTheme;
  const { sensorData } = useSocket();

  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSlot, setTestingSlot] = useState(null);
  const [liveHeights, setLiveHeights] = useState([]);
  const [liveTimestamp, setLiveTimestamp] = useState(null);

  // Formular-State: 6 Sensoren
  const [sensors, setSensors] = useState(
    Array.from({ length: 6 }, (_, i) => ({
      slot: i + 1,
      mountHeight_mm: 800,
      offset_mm: 0,
      label: `Slot ${i + 1}`,
      enabled: true
    }))
  );

  useEffect(() => {
    loadConfig();
  }, []);

  // Live-Heights aus WebSocket
  useEffect(() => {
    if (sensorData?.heights) {
      setLiveHeights(sensorData.heights);
    }
  }, [sensorData]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sensors/tof/config');
      if (res.data?.success && res.data.data?.sensors?.length > 0) {
        setSensors(res.data.data.sensors);
        setLiveHeights(res.data.data.liveHeights || []);
        setLiveTimestamp(res.data.data.liveTimestamp);
      }
      setConfig(res.data?.data);
    } catch (e) {
      console.error('Error loading ToF config:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await api.post('/sensors/tof/config', { sensors });
      if (res.data?.success) {
        toast.success('ToF-Konfiguration gespeichert');
        if (onComplete) onComplete();
      }
    } catch (error) {
      toast.error('Fehler beim Speichern: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSensors(
      Array.from({ length: 6 }, (_, i) => ({
        slot: i + 1,
        mountHeight_mm: 800,
        offset_mm: 0,
        label: `Slot ${i + 1}`,
        enabled: true
      }))
    );
    toast.success('Auf Standardwerte zurückgesetzt (800mm)');
  };

  const testSlot = async (slot) => {
    try {
      setTestingSlot(slot);
      const res = await api.post(`/sensors/tof/test/${slot}`);
      if (res.data?.success) {
        const d = res.data.data;
        if (d.valid) {
          toast.success(`Slot ${slot}: ${d.height_mm}mm (${(d.height_mm / 10).toFixed(1)} cm)`);
        } else {
          toast.error(`Slot ${slot}: Kein gültiger Wert (Sensor ${d.height_mm === -1 ? 'defekt' : 'nicht verbunden'})`);
        }
      }
    } catch (e) {
      toast.error('Test fehlgeschlagen');
    } finally {
      setTestingSlot(null);
    }
  };

  const updateSensor = (index, field, value) => {
    setSensors(prev => prev.map((s, i) =>
      i === index ? { ...s, [field]: field === 'label' ? value : Number(value) } : s
    ));
  };

  // Berechne Pflanzenhöhe für einen Slot
  const getPlantHeight = (slotIndex) => {
    const rawMM = liveHeights[slotIndex];
    if (!rawMM || rawMM <= 0) return null;
    // rawMM ist bereits die berechnete Pflanzenhöhe von der Firmware
    return (rawMM / 10).toFixed(1);
  };

  // Berechne Rohdistanz (mountHeight - plantHeight)
  const getRawDistance = (slotIndex) => {
    const rawMM = liveHeights[slotIndex];
    if (!rawMM || rawMM <= 0) return null;
    const sensor = sensors[slotIndex];
    return sensor.mountHeight_mm - rawMM; // Geschätzte Distanz zum Topf
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={32} style={{ color: theme.accent.color }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div
        className="rounded-xl border p-4 flex items-start gap-3"
        style={{
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          borderColor: 'rgba(59, 130, 246, 0.2)'
        }}
      >
        <Info size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-blue-400 mb-1">VL53L0X Höhensensoren</h4>
          <p className="text-sm" style={{ color: theme.text.secondary }}>
            Stelle die <strong>Montagehöhe</strong> für jeden Sensor ein. Das ist der Abstand vom Sensor zur
            Topfoberkante in mm. Die Pflanzenhöhe wird berechnet als: Montagehöhe - gemessene Distanz.
          </p>
          <p className="text-xs mt-2" style={{ color: theme.text.muted }}>
            TCA9548A Multiplexer (0x70) • Channels 0-5 • I2C Adresse 0x29
          </p>
        </div>
      </div>

      {/* Sensor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sensors.map((sensor, idx) => {
          const plantHeight = getPlantHeight(idx);
          const isActive = liveHeights[idx] > 0;
          const rawMM = liveHeights[idx];

          return (
            <div
              key={sensor.slot}
              className="rounded-xl border p-5 transition-all"
              style={{
                backgroundColor: theme.bg.card,
                borderColor: isActive ? 'rgba(59, 130, 246, 0.3)' : theme.border.default
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{
                      backgroundColor: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: isActive ? '#10b981' : '#ef4444'
                    }}
                  >
                    {sensor.slot}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={sensor.label}
                      onChange={(e) => updateSensor(idx, 'label', e.target.value)}
                      className="font-semibold bg-transparent border-none outline-none text-sm w-24"
                      style={{ color: theme.text.primary }}
                    />
                    <div className="flex items-center gap-1 text-xs" style={{ color: theme.text.muted }}>
                      {isActive ? (
                        <><CheckCircle size={10} className="text-emerald-400" /> Aktiv</>
                      ) : (
                        <><AlertTriangle size={10} className="text-red-400" /> Kein Signal</>
                      )}
                    </div>
                  </div>
                </div>

                {/* Test Button */}
                <button
                  onClick={() => testSlot(sensor.slot)}
                  disabled={testingSlot === sensor.slot}
                  className="p-2 rounded-lg transition-all hover:scale-105"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    color: '#3b82f6'
                  }}
                  title="Test-Messung"
                >
                  {testingSlot === sensor.slot ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Zap size={16} />
                  )}
                </button>
              </div>

              {/* Live-Wert */}
              <div className="text-center py-3 mb-4 rounded-xl" style={{
                backgroundColor: isActive ? 'rgba(59, 130, 246, 0.08)' : theme.bg.hover
              }}>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ArrowDown size={14} className="text-blue-400" />
                  <span className="text-xs font-medium" style={{ color: theme.text.muted }}>Pflanzenhöhe</span>
                </div>
                <p className="text-2xl font-black" style={{
                  color: isActive ? '#3b82f6' : theme.text.muted
                }}>
                  {plantHeight ? `${plantHeight} cm` : '--'}
                </p>
                {rawMM > 0 && (
                  <p className="text-[10px] mt-1" style={{ color: theme.text.muted }}>
                    Roh: {rawMM} mm
                  </p>
                )}
              </div>

              {/* Konfiguration */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: theme.text.muted }}>
                    Montagehöhe (mm)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="2000"
                    step="10"
                    value={sensor.mountHeight_mm}
                    onChange={(e) => updateSensor(idx, 'mountHeight_mm', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border outline-none transition-all focus:ring-2 focus:ring-blue-500"
                    style={{
                      backgroundColor: theme.bg.input || theme.bg.hover,
                      borderColor: theme.border.default,
                      color: theme.text.primary
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: theme.text.muted }}>
                    Offset-Korrektur (mm)
                  </label>
                  <input
                    type="number"
                    min="-100"
                    max="100"
                    step="1"
                    value={sensor.offset_mm}
                    onChange={(e) => updateSensor(idx, 'offset_mm', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border outline-none transition-all focus:ring-2 focus:ring-blue-500"
                    style={{
                      backgroundColor: theme.bg.input || theme.bg.hover,
                      borderColor: theme.border.default,
                      color: theme.text.primary
                    }}
                  />
                </div>

                {/* Enable Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sensor.enabled}
                    onChange={(e) => updateSensor(idx, 'enabled', e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-500"
                  />
                  <span className="text-xs" style={{ color: theme.text.muted }}>Sensor aktiv</span>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Timestamp */}
      {liveTimestamp && (
        <p className="text-center text-xs" style={{ color: theme.text.muted }}>
          Letzte Sensordaten: {new Date(liveTimestamp).toLocaleString('de-DE')}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all"
          style={{
            backgroundColor: theme.bg.hover,
            color: theme.text.secondary
          }}
        >
          <RotateCcw size={16} />
          Zurücksetzen
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 shadow-lg"
          style={{
            backgroundColor: theme.accent.color,
            color: '#fff',
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Konfiguration speichern
        </button>
      </div>
    </div>
  );
};

export default TofCalibrationPanel;
