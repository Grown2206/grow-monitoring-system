import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { controlsAPI } from '../utils/api';
import { useTheme } from '../theme';
import {
  Cpu, Wifi, Thermometer, Droplets, Database, Server, RefreshCw,
  Settings, CheckCircle2, AlertTriangle, XCircle, Activity, Sprout,
  Zap, Fan, Lightbulb, Wind, Gauge, Power, BarChart3, CircuitBoard
} from 'lucide-react';

const SensorStatus = ({ name, value, status, type, theme }) => (
  <div
    className="p-4 rounded-xl flex items-center justify-between group transition-all"
    style={{
      backgroundColor: theme.bg.main,
      border: `1px solid ${theme.border.default}`,
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = theme.border.light}
    onMouseLeave={e => e.currentTarget.style.borderColor = theme.border.default}
  >
    <div className="flex items-center gap-3">
      <div
        className="p-2 rounded-lg"
        style={{
          backgroundColor: status === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: status === 'ok' ? '#34d399' : '#f87171'
        }}
      >
        {type === 'temp' && <Thermometer size={18} />}
        {type === 'water' && <Droplets size={18} />}
        {type === 'soil' && <Sprout size={18} />}
        {type === 'system' && <Cpu size={18} />}
      </div>
      <div>
        <div className="text-sm font-bold" style={{ color: theme.text.primary }}>{name}</div>
        <div className="text-xs font-mono" style={{ color: theme.text.muted }}>ID: {Math.random().toString(16).substr(2, 6).toUpperCase()}</div>
      </div>
    </div>
    <div className="text-right">
      <div className="font-mono font-bold" style={{ color: theme.text.primary }}>{value}</div>
      <div
        className="text-[10px] uppercase font-bold tracking-wider"
        style={{ color: status === 'ok' ? '#10b981' : '#ef4444' }}
      >
        {status === 'ok' ? 'Online' : 'Fehler'}
      </div>
    </div>
  </div>
);

export default function Hardware() {
  const { sensorData, isConnected } = useSocket();
  const { currentTheme } = useTheme();
  const [calibrating, setCalibrating] = useState(false);
  const [deviceState, setDeviceState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('sensors'); // sensors | devices | gpio | system

  useEffect(() => {
    loadDeviceState();
    const interval = setInterval(loadDeviceState, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDeviceState = async () => {
    try {
      const state = await controlsAPI.getDeviceState();
      setDeviceState(state);
    } catch (error) {
      console.error('Failed to load device state:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalibrate = () => {
    setCalibrating(true);
    setTimeout(() => setCalibrating(false), 3000);
  };

  const TabButton = ({ id, label }) => (
    <button
      onClick={() => setActiveView(id)}
      className="px-4 py-2 text-sm font-bold rounded-lg transition-all"
      style={
        activeView === id
          ? { backgroundColor: currentTheme.accent.color, color: '#ffffff' }
          : { backgroundColor: currentTheme.bg.hover, color: currentTheme.text.secondary }
      }
      onMouseEnter={e => {
        if (activeView !== id) {
          e.currentTarget.style.color = currentTheme.text.primary;
          e.currentTarget.style.backgroundColor = currentTheme.border.light;
        }
      }}
      onMouseLeave={e => {
        if (activeView !== id) {
          e.currentTarget.style.color = currentTheme.text.secondary;
          e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
        }
      }}
    >
      {label}
    </button>
  );

  // Helper um sicherzustellen, dass Werte existieren
  const getVal = (val, fixed = 0, suffix = '') => {
    if (val === undefined || val === null) return '--';
    return typeof val === 'number' ? val.toFixed(fixed) + suffix : val;
  };

  // AQI Label Helper (UBA Skala 1-5)
  const getAQILabel = (aqi) => {
    switch(aqi) {
      case 1: return '1 - Excellent';
      case 2: return '2 - Good';
      case 3: return '3 - Moderate';
      case 4: return '4 - Poor';
      case 5: return '5 - Unhealthy';
      default: return '--';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="p-6 rounded-2xl shadow-xl" style={{ backgroundColor: currentTheme.bg.card, border: `1px solid ${currentTheme.border.default}` }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg animate-pulse" style={{ backgroundColor: currentTheme.bg.hover }} />
            <div className="h-6 w-48 rounded animate-pulse" style={{ backgroundColor: currentTheme.bg.hover }} />
          </div>
          <div className="h-4 w-64 rounded animate-pulse" style={{ backgroundColor: currentTheme.bg.hover }} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl animate-pulse" style={{ backgroundColor: currentTheme.bg.card, border: `1px solid ${currentTheme.border.default}` }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: currentTheme.bg.hover }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded" style={{ backgroundColor: currentTheme.bg.hover }} />
                  <div className="h-3 w-20 rounded" style={{ backgroundColor: currentTheme.bg.hover }} />
                </div>
                <div className="h-5 w-16 rounded" style={{ backgroundColor: currentTheme.bg.hover }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">

      {/* Header */}
      <div
        className="p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6"
        style={{
          backgroundColor: currentTheme.bg.card,
          border: `1px solid ${currentTheme.border.default}`
        }}
      >
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: currentTheme.text.primary }}>
            <Cpu style={{ color: '#3b82f6' }} /> System & Hardware
          </h2>
          <p className="text-sm mt-1" style={{ color: currentTheme.text.secondary }}>
            Status aller angeschlossenen Module und ESP32 Diagnose.
          </p>
        </div>
        <div
          className="flex items-center gap-4 px-4 py-2 rounded-xl"
          style={{
            backgroundColor: currentTheme.bg.main,
            border: `1px solid ${currentTheme.border.default}`
          }}
        >
          <div className="text-right">
            <div className="text-xs font-bold uppercase" style={{ color: currentTheme.text.muted }}>ESP32 Uptime</div>
            <div className="font-mono font-bold" style={{ color: '#34d399' }}>--:--:--</div>
          </div>
          <div className="h-8 w-px" style={{ backgroundColor: currentTheme.border.default }}></div>
          <div className="text-right">
            <div className="text-xs font-bold uppercase" style={{ color: currentTheme.text.muted }}>Verbindung</div>
            <div className="font-mono font-bold" style={{ color: isConnected ? '#34d399' : '#f87171' }}>
              {isConnected ? 'Aktiv' : 'Getrennt'}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-3 flex-wrap">
        <TabButton id="sensors" label="Sensoren Übersicht" />
        <TabButton id="devices" label="Hardware Steuerung" />
        <TabButton id="gpio" label="GPIO Live-Map" />
        <TabButton id="system" label="System Info" />
      </div>

      {/* Sensors View */}
      {activeView === 'sensors' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Sensor Liste */}
        <div className="space-y-4">
          <h3 className="font-bold flex items-center gap-2 mb-4" style={{ color: currentTheme.text.primary }}>
            <Activity size={18} style={{ color: '#10b981' }} /> Hauptsensoren
          </h3>

          <div className="pt-4 mb-6" style={{ borderTop: `1px solid ${currentTheme.border.default}` }}>
            <h3 className="font-bold flex items-center gap-2 mb-4" style={{ color: currentTheme.text.primary }}>
              <Thermometer size={18} style={{ color: '#10b981' }} /> SHT31 Temperatursensoren (Höhenverteilung)
            </h3>
            <div className="space-y-3">
              <SensorStatus
                name="SHT31 Unten"
                type="temp"
                value={`${getVal(sensorData?.temp_bottom, 1, '°C')} / ${getVal(sensorData?.humidity_bottom, 1, '%')}`}
                status={sensorData?.temp_bottom ? 'ok' : 'error'}
                theme={currentTheme}
              />
              <SensorStatus
                name="SHT31 Mitte"
                type="temp"
                value={`${getVal(sensorData?.temp_middle, 1, '°C')} / ${getVal(sensorData?.humidity_middle, 1, '%')}`}
                status={sensorData?.temp_middle ? 'ok' : 'error'}
                theme={currentTheme}
              />
              <SensorStatus
                name="SHT31 Oben"
                type="temp"
                value={`${getVal(sensorData?.temp_top, 1, '°C')} / ${getVal(sensorData?.humidity_top, 1, '%')}`}
                status={sensorData?.temp_top ? 'ok' : 'error'}
                theme={currentTheme}
              />
            </div>
          </div>

          <div className="pt-4" style={{ borderTop: `1px solid ${currentTheme.border.default}` }}>
            <h3 className="font-bold flex items-center gap-2 mb-4" style={{ color: currentTheme.text.primary }}>
              <Activity size={18} style={{ color: '#10b981' }} /> Zusatzsensoren
            </h3>
            <div className="space-y-3">
              <SensorStatus
                name="BH1750 (Licht)"
                type="system"
                value={`${getVal(sensorData?.lux, 0, ' lx')}`}
                status={sensorData?.lux >= 0 ? 'ok' : 'error'}
                theme={currentTheme}
              />
              <SensorStatus
                name="Wasserstand (Tank)"
                type="water"
                value={`${getVal(sensorData?.tankLevel, 0)} Raw`}
                status={sensorData?.tankLevel > 0 ? 'ok' : 'error'}
                theme={currentTheme}
              />
              <SensorStatus
                name="MQ-135 (CO2/Gas)"
                type="system"
                value={`${getVal(sensorData?.gasLevel, 0)} Raw`}
                status={sensorData?.gasLevel > 0 ? 'ok' : 'error'}
                theme={currentTheme}
              />
            </div>
          </div>

          {/* NEU: Bodenfeuchtesensoren */}
          <div className="pt-4 mt-6" style={{ borderTop: `1px solid ${currentTheme.border.default}` }}>
            <h3 className="font-bold flex items-center gap-2 mb-4" style={{ color: currentTheme.text.primary }}>
              <Sprout size={18} style={{ color: '#10b981' }} /> Bodenfeuchtigkeit (Kapazitiv)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const val = sensorData?.soil?.[index];
                // Status OK wenn Wert > 0 und plausibel (ADC max 4095)
                const isOk = val > 0 && val <= 4095;
                return (
                  <SensorStatus
                    key={index}
                    name={`Sensor ${index + 1}`}
                    type="soil"
                    value={`${getVal(val, 0)} Raw`}
                    status={isOk ? 'ok' : 'error'}
                    theme={currentTheme}
                  />
                );
              })}
            </div>
          </div>

          {/* ENS160 + AHT21 Luftqualität */}
          <div className="pt-4 mt-6" style={{ borderTop: `1px solid ${currentTheme.border.default}` }}>
            <h3 className="font-bold flex items-center gap-2 mb-4" style={{ color: currentTheme.text.primary }}>
              <Wind size={18} style={{ color: '#22d3ee' }} /> Luftqualität (ENS160 + AHT21)
            </h3>
            <div className="space-y-3">
              <SensorStatus
                name="ENS160 eCO2"
                type="system"
                value={`${getVal(sensorData?.ens160_eco2, 0, ' ppm')}`}
                status={sensorData?.ens160_eco2 > 0 ? 'ok' : 'error'}
                theme={currentTheme}
              />
              <SensorStatus
                name="ENS160 TVOC"
                type="system"
                value={`${getVal(sensorData?.ens160_tvoc, 0, ' ppb')}`}
                status={sensorData?.ens160_tvoc >= 0 ? 'ok' : 'error'}
                theme={currentTheme}
              />
              <SensorStatus
                name="ENS160 AQI"
                type="system"
                value={getAQILabel(sensorData?.ens160_aqi)}
                status={sensorData?.ens160_aqi > 0 && sensorData?.ens160_aqi <= 3 ? 'ok' : 'error'}
                theme={currentTheme}
              />
              <SensorStatus
                name="AHT21 Temperatur"
                type="temp"
                value={`${getVal(sensorData?.aht21_temp, 1, '°C')}`}
                status={sensorData?.aht21_temp > 0 ? 'ok' : 'error'}
                theme={currentTheme}
              />
              <SensorStatus
                name="AHT21 Luftfeuchtigkeit"
                type="water"
                value={`${getVal(sensorData?.aht21_humidity, 1, '%')}`}
                status={sensorData?.aht21_humidity > 0 ? 'ok' : 'error'}
                theme={currentTheme}
              />
            </div>
          </div>
        </div>

        {/* System Diagnose */}
        <div className="space-y-6">
          <div
            className="p-6 rounded-2xl shadow-lg"
            style={{
              backgroundColor: currentTheme.bg.card,
              border: `1px solid ${currentTheme.border.default}`
            }}
          >
            <h3 className="font-bold flex items-center gap-2 mb-6" style={{ color: currentTheme.text.primary }}>
              <Server size={18} style={{ color: '#a855f7' }} /> Backend Status
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: currentTheme.text.secondary }}>MQTT Broker</span>
                <span className="flex items-center gap-2 font-bold" style={{ color: '#34d399' }}>
                  <CheckCircle2 size={16} /> test.mosquitto.org
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: currentTheme.text.secondary }}>Datenbank (MongoDB)</span>
                <span className="flex items-center gap-2 font-bold" style={{ color: '#34d399' }}>
                  <CheckCircle2 size={16} /> Verbunden
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: currentTheme.text.secondary }}>WebSocket</span>
                <span className="flex items-center gap-2 font-bold" style={{ color: isConnected ? '#34d399' : '#f87171' }}>
                  {isConnected ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  {isConnected ? 'Verbunden' : 'Getrennt'}
                </span>
              </div>
            </div>
          </div>

          {/* Kalibrierung */}
          <div
            className="p-6 rounded-2xl shadow-lg"
            style={{
              backgroundColor: currentTheme.bg.card,
              border: `1px solid ${currentTheme.border.default}`
            }}
          >
            <h3 className="font-bold flex items-center gap-2 mb-4" style={{ color: currentTheme.text.primary }}>
              <Settings size={18} style={{ color: currentTheme.text.secondary }} /> Sensor Kalibrierung
            </h3>
            <p className="text-xs mb-4" style={{ color: currentTheme.text.muted }}>
              Zum Kalibrieren der Bodenfeuchtesensoren: Sensoren erst komplett trocknen, dann Wert speichern. Danach in Wasser stellen und erneut messen.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCalibrate}
                disabled={calibrating}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: currentTheme.bg.hover,
                  color: currentTheme.text.primary,
                  border: `1px solid ${currentTheme.border.light}`
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = currentTheme.border.light;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = currentTheme.bg.hover;
                }}
              >
                {calibrating ? <RefreshCw className="animate-spin" size={16}/> : 'Jetzt Kalibrieren'}
              </button>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Devices View */}
      {activeView === 'devices' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Relais Status */}
        <div
          className="p-6 rounded-2xl shadow-lg"
          style={{
            backgroundColor: currentTheme.bg.card,
            border: `1px solid ${currentTheme.border.default}`
          }}
        >
          <h3 className="font-bold flex items-center gap-2 mb-6" style={{ color: currentTheme.text.primary }}>
            <Power size={18} style={{ color: '#eab308' }} /> Relais Status
          </h3>
          <div className="space-y-3">
            {deviceState?.relays && Object.entries(deviceState.relays).map(([key, value]) => (
              <div
                key={key}
                className="flex justify-between items-center text-sm p-2 rounded-lg"
                style={{ backgroundColor: currentTheme.bg.main }}
              >
                <span className="capitalize" style={{ color: currentTheme.text.secondary }}>{key.replace(/_/g, ' ')}</span>
                <span className="flex items-center gap-2 font-bold" style={{ color: value ? '#34d399' : currentTheme.text.muted }}>
                  {value ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {value ? 'ON' : 'OFF'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* PWM Status */}
        <div
          className="p-6 rounded-2xl shadow-lg"
          style={{
            backgroundColor: currentTheme.bg.card,
            border: `1px solid ${currentTheme.border.default}`
          }}
        >
          <h3 className="font-bold flex items-center gap-2 mb-6" style={{ color: currentTheme.text.primary }}>
            <Zap size={18} style={{ color: '#a855f7' }} /> PWM Steuerung
          </h3>
          <div className="space-y-4">
            {/* Fan PWM */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm flex items-center gap-2" style={{ color: currentTheme.text.secondary }}>
                  <Fan size={14} /> Abluft PWM
                </span>
                <span className="font-mono font-bold" style={{ color: '#34d399' }}>
                  {getVal(deviceState?.pwm?.fan_exhaust, 0, '%')}
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: currentTheme.bg.main }}>
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
                  style={{ width: `${deviceState?.pwm?.fan_exhaust || 0}%` }}
                />
              </div>
            </div>

            {/* Light PWM */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm flex items-center gap-2" style={{ color: currentTheme.text.secondary }}>
                  <Lightbulb size={14} /> Grow Light PWM
                </span>
                <span className="font-mono font-bold" style={{ color: '#facc15' }}>
                  {getVal(deviceState?.pwm?.grow_light, 0, '%')}
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: currentTheme.bg.main }}>
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all"
                  style={{ width: `${deviceState?.pwm?.grow_light || 0}%` }}
                />
              </div>
            </div>

            {/* Fan RPM Feedback */}
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${currentTheme.border.default}` }}>
              <div className="flex justify-between items-center">
                <span className="text-sm flex items-center gap-2" style={{ color: currentTheme.text.secondary }}>
                  <Gauge size={14} /> Fan RPM
                </span>
                <span className="font-mono font-bold" style={{ color: '#34d399' }}>
                  {getVal(deviceState?.feedback?.fan_exhaust_rpm, 0, ' RPM')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RJ11 Grow Light Control */}
        <div
          className="p-6 rounded-2xl shadow-lg"
          style={{
            backgroundColor: currentTheme.bg.card,
            border: `1px solid ${currentTheme.border.default}`
          }}
        >
          <h3 className="font-bold flex items-center gap-2 mb-6" style={{ color: currentTheme.text.primary }}>
            <Lightbulb size={18} style={{ color: '#f59e0b' }} /> RJ11 Grow Light
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: currentTheme.bg.main }}>
              <span className="text-sm" style={{ color: currentTheme.text.secondary }}>Status</span>
              <span className="font-bold" style={{ color: deviceState?.rj11?.enabled ? '#34d399' : currentTheme.text.muted }}>
                {deviceState?.rj11?.enabled ? 'Aktiv' : 'Inaktiv'}
              </span>
            </div>

            <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: currentTheme.bg.main }}>
              <span className="text-sm" style={{ color: currentTheme.text.secondary }}>Modus</span>
              <span className="font-bold uppercase text-xs" style={{ color: '#c084fc' }}>
                {deviceState?.rj11?.mode || 'OFF'}
              </span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm" style={{ color: currentTheme.text.secondary }}>Dimm-Level</span>
                <span className="font-mono font-bold" style={{ color: '#fbbf24' }}>
                  {getVal(deviceState?.rj11?.dimLevel, 0, '%')}
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: currentTheme.bg.main }}>
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all"
                  style={{ width: `${deviceState?.rj11?.dimLevel || 0}%` }}
                />
              </div>
            </div>

            {/* Spektrum RGB */}
            {deviceState?.rj11?.spectrum && (
              <div className="pt-3 space-y-2" style={{ borderTop: `1px solid ${currentTheme.border.default}` }}>
                <div className="text-xs font-bold uppercase mb-2" style={{ color: currentTheme.text.muted }}>Spektrum</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: currentTheme.bg.main }}>
                    <div className="h-full" style={{ backgroundColor: '#ef4444', width: `${deviceState.rj11.spectrum.red}%` }} />
                  </div>
                  <span className="text-xs font-mono w-10" style={{ color: '#f87171' }}>{deviceState.rj11.spectrum.red}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: currentTheme.bg.main }}>
                    <div className="h-full" style={{ backgroundColor: '#3b82f6', width: `${deviceState.rj11.spectrum.blue}%` }} />
                  </div>
                  <span className="text-xs font-mono w-10" style={{ color: '#60a5fa' }}>{deviceState.rj11.spectrum.blue}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ffffff' }}></div>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: currentTheme.bg.main }}>
                    <div className="h-full" style={{ backgroundColor: '#ffffff', width: `${deviceState.rj11.spectrum.white}%` }} />
                  </div>
                  <span className="text-xs font-mono w-10" style={{ color: currentTheme.text.primary }}>{deviceState.rj11.spectrum.white}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        </div>
      )}

      {/* GPIO Live-Map View */}
      {activeView === 'gpio' && (
        <div className="space-y-6">
          {/* GPIO Pin-Belegung mit Live-Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Relais Outputs — Live */}
            <div className="p-5 rounded-2xl border" style={{ backgroundColor: currentTheme.bg.card, borderColor: currentTheme.border.default }}>
              <h4 className="font-bold mb-4 flex items-center gap-2 text-sm" style={{ color: currentTheme.text.primary }}>
                <Zap size={16} style={{ color: '#10b981' }} />
                Relais (Output) — Live
              </h4>
              <div className="space-y-2.5 text-sm font-mono">
                {[
                  { pin: 4, label: 'Hauptlicht', key: 'light' },
                  { pin: 5, label: 'Abluft', key: 'fan_exhaust' },
                  { pin: 2, label: 'Umluft', key: 'fan_circulation' },
                  { pin: 12, label: 'Heizung', key: 'heater' },
                  { pin: 14, label: 'Entfeuchter', key: 'dehumidifier' },
                  { pin: 16, label: 'Luftbefeuchter', key: 'pump_main' },
                  { pin: 17, label: 'Pumpe Tank LB', key: 'pump_mix' },
                  { pin: 13, label: 'Nährstoff-Pumpe', key: 'nutrient_pump' },
                ].map(r => {
                  const isOn = deviceState?.relays?.[r.key] || deviceState?.automation?.relays?.[r.key] || false;
                  return (
                    <div key={r.pin} className="flex justify-between items-center">
                      <span style={{ color: currentTheme.text.secondary }}>GPIO {r.pin}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: currentTheme.text.muted }}>{r.label}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold min-w-[42px] text-center"
                          style={{
                            backgroundColor: isOn ? 'rgba(34,197,94,0.2)' : currentTheme.bg.hover,
                            color: isOn ? '#34d399' : currentTheme.text.muted
                          }}>
                          {isOn ? 'HIGH' : 'LOW'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PWM Outputs — Live */}
            <div className="p-5 rounded-2xl border" style={{ backgroundColor: currentTheme.bg.card, borderColor: currentTheme.border.default }}>
              <h4 className="font-bold mb-4 flex items-center gap-2 text-sm" style={{ color: currentTheme.text.primary }}>
                <Activity size={16} style={{ color: '#3b82f6' }} />
                PWM (Output) — Live
              </h4>
              <div className="space-y-2.5 text-sm font-mono">
                {[
                  { pin: 18, label: 'Fan PWM (0-10V)', value: `${deviceState?.pwm?.fan_exhaust || 0}%`, active: (deviceState?.pwm?.fan_exhaust || 0) > 0, color: '#3b82f6' },
                  { pin: 23, label: 'RJ11 Light PWM', value: `${deviceState?.pwm?.grow_light || 0}%`, active: (deviceState?.pwm?.grow_light || 0) > 0, color: '#f59e0b' },
                  { pin: 27, label: 'RJ11 Enable', value: deviceState?.rj11?.enabled ? 'HIGH' : 'LOW', active: deviceState?.rj11?.enabled || false, color: '#10b981' },
                ].map(p => (
                  <div key={p.pin} className="flex justify-between items-center">
                    <span style={{ color: currentTheme.text.secondary }}>GPIO {p.pin}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: currentTheme.text.muted }}>{p.label}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold min-w-[42px] text-center"
                        style={{
                          backgroundColor: p.active ? `${p.color}33` : currentTheme.bg.hover,
                          color: p.active ? p.color : currentTheme.text.muted
                        }}>
                        {p.value}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Digital Input: Fan Tachometer */}
                <div className="pt-3 mt-3" style={{ borderTop: `1px solid ${currentTheme.border.default}` }}>
                  <div className="text-xs font-bold uppercase mb-2" style={{ color: currentTheme.text.muted }}>Digital Input</div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: currentTheme.text.secondary }}>GPIO 19</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: currentTheme.text.muted }}>Fan Tachometer</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold"
                        style={{ backgroundColor: 'rgba(34,211,238,0.2)', color: '#22d3ee' }}>
                        {getVal(deviceState?.feedback?.fan_exhaust_rpm, 0)} RPM
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analog Inputs — Live */}
            <div className="p-5 rounded-2xl border" style={{ backgroundColor: currentTheme.bg.card, borderColor: currentTheme.border.default }}>
              <h4 className="font-bold mb-4 flex items-center gap-2 text-sm" style={{ color: currentTheme.text.primary }}>
                <BarChart3 size={16} style={{ color: '#a855f7' }} />
                Analog (Input) — Live
              </h4>
              <div className="space-y-2.5 text-sm font-mono">
                {[
                  { pin: 36, label: 'Bodensensor 1', value: sensorData?.soil?.[0] || 0 },
                  { pin: 39, label: 'Bodensensor 2', value: sensorData?.soil?.[1] || 0 },
                  { pin: 34, label: 'Bodensensor 3', value: sensorData?.soil?.[2] || 0 },
                  { pin: 35, label: 'Bodensensor 4', value: sensorData?.soil?.[3] || 0 },
                  { pin: 32, label: 'Bodensensor 5', value: sensorData?.soil?.[4] || 0 },
                  { pin: 33, label: 'Bodensensor 6', value: sensorData?.soil?.[5] || 0 },
                  { pin: 25, label: 'Tank Füllstand', value: `${sensorData?.tankLevel || 0}%`, isTank: true },
                  { pin: 26, label: 'Gas (MQ-135)', value: sensorData?.gasLevel || 0 },
                ].map(a => (
                  <div key={a.pin} className="flex justify-between items-center">
                    <span style={{ color: currentTheme.text.secondary }}>GPIO {a.pin}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: currentTheme.text.muted }}>{a.label}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold min-w-[42px] text-center"
                        style={{ backgroundColor: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>
                        {a.isTank ? a.value : a.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* I2C Bus — Live Sensor-Status */}
            <div className="p-5 rounded-2xl border" style={{ backgroundColor: currentTheme.bg.card, borderColor: currentTheme.border.default }}>
              <h4 className="font-bold mb-4 flex items-center gap-2 text-sm" style={{ color: currentTheme.text.primary }}>
                <Settings size={16} style={{ color: '#f97316' }} />
                I2C Bus — Live Status
              </h4>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between mb-3" style={{ color: currentTheme.text.secondary }}>
                  <span>GPIO 21 <span className="text-xs" style={{ color: currentTheme.text.muted }}>(SDA)</span></span>
                  <span>GPIO 22 <span className="text-xs" style={{ color: currentTheme.text.muted }}>(SCL)</span></span>
                </div>
                <div className="space-y-2">
                  {[
                    { name: 'SHT31 Unten (0x44)', ok: !!sensorData?.temp_bottom, value: sensorData?.temp_bottom ? `${sensorData.temp_bottom.toFixed(1)}°C` : '--' },
                    { name: 'SHT31 Mitte (0x45)', ok: !!sensorData?.temp_middle, value: sensorData?.temp_middle ? `${sensorData.temp_middle.toFixed(1)}°C` : '--' },
                    { name: 'SHT31 Oben (0x46)', ok: !!sensorData?.temp_top, value: sensorData?.temp_top ? `${sensorData.temp_top.toFixed(1)}°C` : '--' },
                    { name: 'BH1750 (0x23)', ok: sensorData?.lux != null && sensorData?.lux >= 0, value: sensorData?.lux != null ? `${Math.round(sensorData.lux)} lx` : '--' },
                    { name: 'ENS160 (0x53)', ok: !!sensorData?.ens160_eco2, value: sensorData?.ens160_eco2 ? `${sensorData.ens160_eco2} ppm` : '--' },
                    { name: 'AHT21 (0x38)', ok: !!sensorData?.aht21_temp, value: sensorData?.aht21_temp ? `${sensorData.aht21_temp.toFixed(1)}°C` : '--' },
                    { name: 'TCA9548A (0x70)', ok: Array.isArray(sensorData?.heights) && sensorData.heights.some(h => h > 0), value: 'Multiplexer' },
                    { name: 'EZO-EC (0x64)', ok: false, value: '--' },
                    { name: 'EZO-pH (0x63)', ok: false, value: '--' },
                  ].map((dev, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ backgroundColor: currentTheme.bg.main }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dev.ok ? '#34d399' : '#ef4444' }} />
                        <span className="text-xs" style={{ color: currentTheme.text.secondary }}>{dev.name}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: dev.ok ? '#34d399' : currentTheme.text.muted }}>
                        {dev.ok ? dev.value : 'Offline'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* VL53L0X Höhensensoren via TCA9548A */}
            <div className="p-5 rounded-2xl border" style={{ backgroundColor: currentTheme.bg.card, borderColor: currentTheme.border.default }}>
              <h4 className="font-bold mb-4 flex items-center gap-2 text-sm" style={{ color: currentTheme.text.primary }}>
                <Gauge size={16} style={{ color: '#06b6d4' }} />
                VL53L0X Höhensensoren (I2C via TCA9548A)
              </h4>
              <div className="space-y-2 text-sm font-mono">
                {[0, 1, 2, 3, 4, 5].map(i => {
                  const h = sensorData?.heights?.[i];
                  const ok = h != null && h > 0;
                  return (
                    <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ backgroundColor: currentTheme.bg.main }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ok ? '#34d399' : '#ef4444' }} />
                        <span className="text-xs" style={{ color: currentTheme.text.secondary }}>Kanal {i} — Pflanze {i + 1}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: ok ? '#22d3ee' : currentTheme.text.muted }}>
                        {ok ? `${h} mm` : 'Offline'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reserviert */}
            <div className="p-5 rounded-2xl border" style={{ backgroundColor: currentTheme.bg.card, borderColor: currentTheme.border.default }}>
              <h4 className="font-bold mb-4 flex items-center gap-2 text-sm" style={{ color: currentTheme.text.primary }}>
                <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                Reserviert / System
              </h4>
              <div className="space-y-1.5 text-xs" style={{ color: currentTheme.text.muted }}>
                <div className="font-mono">GPIO 0 — Boot Mode (Strapping)</div>
                <div className="font-mono">GPIO 1 — UART TX (Serial)</div>
                <div className="font-mono">GPIO 3 — UART RX (Serial)</div>
                <div className="font-mono">GPIO 6-11 — SPI Flash (nicht verwenden)</div>
                <div className="font-mono">GPIO 15 — Nährstoff-Level (reserviert)</div>
              </div>
              <div className="mt-4 pt-3 text-xs" style={{ borderTop: `1px solid ${currentTheme.border.default}`, color: currentTheme.text.muted }}>
                <span className="font-bold" style={{ color: currentTheme.text.secondary }}>Zusammenfassung:</span>
                <div className="mt-1">8 Relais • 3 PWM • 9 ADC • 1 Digital • 9 I2C Devices</div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* System View */}
      {activeView === 'system' && (
        <div
          className="p-6 rounded-2xl shadow-xl"
          style={{
            background: `linear-gradient(135deg, ${currentTheme.bg.card}, ${currentTheme.bg.hover})`,
            border: `1px solid ${currentTheme.border.light}`
          }}
        >
        <h3 className="font-bold flex items-center gap-2 mb-6" style={{ color: currentTheme.text.primary }}>
          <Cpu size={18} style={{ color: '#3b82f6' }} /> ESP32 System Information
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            className="p-4 rounded-xl"
            style={{
              backgroundColor: `${currentTheme.bg.main}80`,
              border: `1px solid ${currentTheme.border.default}`
            }}
          >
            <div className="text-xs font-bold uppercase mb-1" style={{ color: currentTheme.text.muted }}>Chip Model</div>
            <div className="font-mono text-sm" style={{ color: currentTheme.text.primary }}>ESP32-WROOM-32</div>
          </div>
          <div
            className="p-4 rounded-xl"
            style={{
              backgroundColor: `${currentTheme.bg.main}80`,
              border: `1px solid ${currentTheme.border.default}`
            }}
          >
            <div className="text-xs font-bold uppercase mb-1" style={{ color: currentTheme.text.muted }}>CPU Freq</div>
            <div className="font-mono text-sm font-bold" style={{ color: '#34d399' }}>240 MHz</div>
          </div>
          <div
            className="p-4 rounded-xl"
            style={{
              backgroundColor: `${currentTheme.bg.main}80`,
              border: `1px solid ${currentTheme.border.default}`
            }}
          >
            <div className="text-xs font-bold uppercase mb-1" style={{ color: currentTheme.text.muted }}>Free Heap</div>
            <div className="font-mono text-sm font-bold" style={{ color: '#60a5fa' }}>--</div>
          </div>
          <div
            className="p-4 rounded-xl"
            style={{
              backgroundColor: `${currentTheme.bg.main}80`,
              border: `1px solid ${currentTheme.border.default}`
            }}
          >
            <div className="text-xs font-bold uppercase mb-1" style={{ color: currentTheme.text.muted }}>WiFi RSSI</div>
            <div className="font-mono text-sm font-bold" style={{ color: '#c084fc' }}>--</div>
          </div>
        </div>
        </div>
      )}

    </div>
  );
}
