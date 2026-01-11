import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { controlsAPI } from '../utils/api';
import {
  Cpu, Wifi, Thermometer, Droplets, Database, Server, RefreshCw,
  Settings, CheckCircle2, AlertTriangle, XCircle, Activity, Sprout,
  Zap, Fan, Lightbulb, Wind, Gauge, Power
} from 'lucide-react';

const SensorStatus = ({ name, value, status, type }) => (
  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition-all">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${status === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
        {type === 'temp' && <Thermometer size={18} />}
        {type === 'water' && <Droplets size={18} />}
        {type === 'soil' && <Sprout size={18} />}
        {type === 'system' && <Cpu size={18} />}
      </div>
      <div>
        <div className="text-sm font-bold text-slate-200">{name}</div>
        <div className="text-xs text-slate-500 font-mono">ID: {Math.random().toString(16).substr(2, 6).toUpperCase()}</div>
      </div>
    </div>
    <div className="text-right">
      <div className="font-mono font-bold text-white">{value}</div>
      <div className={`text-[10px] uppercase font-bold tracking-wider ${status === 'ok' ? 'text-emerald-500' : 'text-red-500'}`}>
        {status === 'ok' ? 'Online' : 'Fehler'}
      </div>
    </div>
  </div>
);

export default function Hardware() {
  const { sensorData, isConnected } = useSocket();
  const [calibrating, setCalibrating] = useState(false);
  const [deviceState, setDeviceState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('sensors'); // sensors | devices | system

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
      className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
        activeView === id
          ? 'bg-emerald-500 text-white'
          : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
      }`}
    >
      {label}
    </button>
  );

  // Helper um sicherzustellen, dass Werte existieren
  const getVal = (val, fixed = 0, suffix = '') => {
    if (val === undefined || val === null) return '--';
    return typeof val === 'number' ? val.toFixed(fixed) + suffix : val;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Cpu className="text-blue-500" /> System & Hardware
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Status aller angeschlossenen Module und ESP32 Diagnose.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
          <div className="text-right">
            <div className="text-xs text-slate-500 font-bold uppercase">ESP32 Uptime</div>
            <div className="font-mono text-emerald-400 font-bold">--:--:--</div>
          </div>
          <div className="h-8 w-px bg-slate-800"></div>
          <div className="text-right">
            <div className="text-xs text-slate-500 font-bold uppercase">Verbindung</div>
            <div className={`font-mono font-bold ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
              {isConnected ? 'Aktiv' : 'Getrennt'}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-3 flex-wrap">
        <TabButton id="sensors" label="Sensoren Übersicht" />
        <TabButton id="devices" label="Hardware Steuerung" />
        <TabButton id="system" label="System Info" />
      </div>

      {/* Sensors View */}
      {activeView === 'sensors' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Sensor Liste */}
        <div className="space-y-4">
          <h3 className="text-white font-bold flex items-center gap-2 mb-4">
            <Activity size={18} className="text-emerald-500" /> Hauptsensoren
          </h3>

          <div className="pt-4 mb-6 border-t border-slate-800">
            <h3 className="text-white font-bold flex items-center gap-2 mb-4">
              <Thermometer size={18} className="text-emerald-500" /> SHT31 Temperatursensoren (Höhenverteilung)
            </h3>
            <div className="space-y-3">
              <SensorStatus
                name="SHT31 Unten"
                type="temp"
                value={`${getVal(sensorData?.temp_bottom, 1, '°C')} / ${getVal(sensorData?.humidity_bottom, 1, '%')}`}
                status={sensorData?.temp_bottom ? 'ok' : 'error'}
              />
              <SensorStatus
                name="SHT31 Mitte"
                type="temp"
                value={`${getVal(sensorData?.temp_middle, 1, '°C')} / ${getVal(sensorData?.humidity_middle, 1, '%')}`}
                status={sensorData?.temp_middle ? 'ok' : 'error'}
              />
              <SensorStatus
                name="SHT31 Oben"
                type="temp"
                value={`${getVal(sensorData?.temp_top, 1, '°C')} / ${getVal(sensorData?.humidity_top, 1, '%')}`}
                status={sensorData?.temp_top ? 'ok' : 'error'}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-white font-bold flex items-center gap-2 mb-4">
              <Activity size={18} className="text-emerald-500" /> Zusatzsensoren
            </h3>
            <div className="space-y-3">
              <SensorStatus
                name="BH1750 (Licht)"
                type="system"
                value={`${getVal(sensorData?.lux, 0, ' lx')}`}
                status={sensorData?.lux >= 0 ? 'ok' : 'error'}
              />
              <SensorStatus
                name="Wasserstand (Tank)"
                type="water"
                value={`${getVal(sensorData?.tankLevel, 0)} Raw`}
                status={sensorData?.tankLevel > 0 ? 'ok' : 'error'}
              />
              <SensorStatus
                name="MQ-135 (CO2/Gas)"
                type="system"
                value={`${getVal(sensorData?.gasLevel, 0)} Raw`}
                status={sensorData?.gasLevel > 0 ? 'ok' : 'error'}
              />
            </div>
          </div>

          {/* NEU: Bodenfeuchtesensoren */}
          <div className="pt-4 mt-6 border-t border-slate-800">
            <h3 className="text-white font-bold flex items-center gap-2 mb-4">
              <Sprout size={18} className="text-emerald-500" /> Bodenfeuchtigkeit (Kapazitiv)
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
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* System Diagnose */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-white font-bold flex items-center gap-2 mb-6">
              <Server size={18} className="text-purple-500" /> Backend Status
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">MQTT Broker</span>
                <span className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle2 size={16} /> test.mosquitto.org
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Datenbank (MongoDB)</span>
                <span className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle2 size={16} /> Verbunden
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">WebSocket</span>
                <span className={`flex items-center gap-2 font-bold ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isConnected ? <CheckCircle2 size={16} /> : <XCircle size={16} />} 
                  {isConnected ? 'Verbunden' : 'Getrennt'}
                </span>
              </div>
            </div>
          </div>

          {/* Kalibrierung */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-white font-bold flex items-center gap-2 mb-4">
              <Settings size={18} className="text-slate-400" /> Sensor Kalibrierung
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Zum Kalibrieren der Bodenfeuchtesensoren: Sensoren erst komplett trocknen, dann Wert speichern. Danach in Wasser stellen und erneut messen.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCalibrate}
                disabled={calibrating}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl text-sm font-bold border border-slate-700 transition-all flex items-center justify-center gap-2"
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
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
          <h3 className="text-white font-bold flex items-center gap-2 mb-6">
            <Power size={18} className="text-yellow-500" /> Relais Status
          </h3>
          <div className="space-y-3">
            {deviceState?.relays && Object.entries(deviceState.relays).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center text-sm p-2 rounded-lg bg-slate-950">
                <span className="text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className={`flex items-center gap-2 font-bold ${value ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {value ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {value ? 'ON' : 'OFF'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* PWM Status */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
          <h3 className="text-white font-bold flex items-center gap-2 mb-6">
            <Zap size={18} className="text-purple-500" /> PWM Steuerung
          </h3>
          <div className="space-y-4">
            {/* Fan PWM */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-sm flex items-center gap-2">
                  <Fan size={14} /> Abluft PWM
                </span>
                <span className="text-emerald-400 font-mono font-bold">
                  {getVal(deviceState?.pwm?.fan_exhaust, 0, '%')}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
                  style={{ width: `${deviceState?.pwm?.fan_exhaust || 0}%` }}
                />
              </div>
            </div>

            {/* Light PWM */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-sm flex items-center gap-2">
                  <Lightbulb size={14} /> Grow Light PWM
                </span>
                <span className="text-yellow-400 font-mono font-bold">
                  {getVal(deviceState?.pwm?.grow_light, 0, '%')}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all"
                  style={{ width: `${deviceState?.pwm?.grow_light || 0}%` }}
                />
              </div>
            </div>

            {/* Fan RPM Feedback */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm flex items-center gap-2">
                  <Gauge size={14} /> Fan RPM
                </span>
                <span className="text-emerald-400 font-mono font-bold">
                  {getVal(deviceState?.feedback?.fan_exhaust_rpm, 0, ' RPM')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RJ11 Grow Light Control */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
          <h3 className="text-white font-bold flex items-center gap-2 mb-6">
            <Lightbulb size={18} className="text-amber-500" /> RJ11 Grow Light
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950">
              <span className="text-slate-400 text-sm">Status</span>
              <span className={`font-bold ${deviceState?.rj11?.enabled ? 'text-emerald-400' : 'text-slate-600'}`}>
                {deviceState?.rj11?.enabled ? 'Aktiv' : 'Inaktiv'}
              </span>
            </div>

            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950">
              <span className="text-slate-400 text-sm">Modus</span>
              <span className="text-purple-400 font-bold uppercase text-xs">
                {deviceState?.rj11?.mode || 'OFF'}
              </span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-sm">Dimm-Level</span>
                <span className="text-amber-400 font-mono font-bold">
                  {getVal(deviceState?.rj11?.dimLevel, 0, '%')}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all"
                  style={{ width: `${deviceState?.rj11?.dimLevel || 0}%` }}
                />
              </div>
            </div>

            {/* Spektrum RGB */}
            {deviceState?.rj11?.spectrum && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="text-xs text-slate-500 font-bold uppercase mb-2">Spektrum</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-950 overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${deviceState.rj11.spectrum.red}%` }} />
                  </div>
                  <span className="text-xs text-red-400 font-mono w-10">{deviceState.rj11.spectrum.red}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-950 overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${deviceState.rj11.spectrum.blue}%` }} />
                  </div>
                  <span className="text-xs text-blue-400 font-mono w-10">{deviceState.rj11.spectrum.blue}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-white"></div>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-950 overflow-hidden">
                    <div className="h-full bg-white" style={{ width: `${deviceState.rj11.spectrum.white}%` }} />
                  </div>
                  <span className="text-xs text-slate-300 font-mono w-10">{deviceState.rj11.spectrum.white}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        </div>
      )}

      {/* System View */}
      {activeView === 'system' && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
        <h3 className="text-white font-bold flex items-center gap-2 mb-6">
          <Cpu size={18} className="text-blue-500" /> ESP32 System Information
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="text-xs text-slate-500 font-bold uppercase mb-1">Chip Model</div>
            <div className="text-white font-mono text-sm">ESP32-WROOM-32</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="text-xs text-slate-500 font-bold uppercase mb-1">CPU Freq</div>
            <div className="text-emerald-400 font-mono text-sm font-bold">240 MHz</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="text-xs text-slate-500 font-bold uppercase mb-1">Free Heap</div>
            <div className="text-blue-400 font-mono text-sm font-bold">--</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="text-xs text-slate-500 font-bold uppercase mb-1">WiFi RSSI</div>
            <div className="text-purple-400 font-mono text-sm font-bold">--</div>
          </div>
        </div>
        </div>
      )}

    </div>
  );
}