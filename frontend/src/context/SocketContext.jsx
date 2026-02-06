import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sensorData, setSensorData] = useState({
    temp: 0, humidity: 0, lux: 0, tankLevel: 0, gasLevel: 0,
    soil: [0,0,0,0,0,0],
    heights: [0,0,0,0,0,0],
    // ENS160 + AHT21 Luftqualität
    ens160_eco2: 0, ens160_tvoc: 0, ens160_aqi: 0,
    aht21_temp: 0, aht21_humidity: 0
  });

  // Nährstoff-Sensor-Daten
  const [nutrientSensors, setNutrientSensors] = useState({
    ec: 0,
    ph: 0,
    temp: 0,
    reservoirLevel_percent: 0,
    totalDosed_ml: 0
  });

  // Nährstoff-Pumpen-Status
  const [nutrientStatus, setNutrientStatus] = useState({
    status: 'idle',
    pumpRunning: false,
    progress_percent: 0,
    elapsed_ms: 0
  });

  // Relay-Status (zentral statt in Controls.jsx)
  const [relayState, setRelayState] = useState({});

  // Letzte Sensordaten-Timestamp (für StatusBadge Freshness)
  const [lastSensorTimestamp, setLastSensorTimestamp] = useState(null);

  // Watchdog-Status (Sensor-Heartbeat + MQTT)
  const [watchdogStatus, setWatchdogStatus] = useState({
    esp32: 'unknown',        // 'ok', 'warning', 'critical', 'unknown'
    mqtt: false,             // MQTT-Broker verbunden?
    lastDataReceived: null,  // Timestamp letzte Sensordaten
    elapsedMs: null          // Millisekunden seit letzten Daten
  });

  // VPD-Daten (Vapor Pressure Deficit)
  const [vpdData, setVpdData] = useState({
    vpd: 0,
    current: { temp: 0, humidity: 0, timestamp: null },
    target: { min: 0.8, max: 1.2, optimal: 1.0 },
    analysis: {
      status: 'unknown',
      severity: 'ok',
      recommendation: '',
      inRange: false
    },
    autoControl: { enabled: false, growStage: 'vegetative' },
    fanSpeed: 50
  });

  useEffect(() => {
    // In Produktion: Verbinde über gleichen Host (Nginx reverse proxy)
    // In Entwicklung (localhost:5173): Verbinde direkt zu Backend auf :3000
    const isDev = window.location.port === '5173';
    const backendUrl = isDev
      ? `http://${window.location.hostname}:3000`
      : window.location.origin; // Nutzt gleichen Host+Port wie Frontend

    console.log("Verbinde zu Backend:", backendUrl);

    const newSocket = io(backendUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'], // Versuche beide Methoden
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => {
      console.log("✅ Socket verbunden mit ID:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log("❌ Socket getrennt");
      setIsConnected(false);
    });

    newSocket.on('sensorData', (data) => {
      setSensorData(prev => ({ ...prev, ...data }));
      setLastSensorTimestamp(Date.now());
    });

    // Nährstoff-Events
    newSocket.on('nutrientSensors', (data) => {
      console.log("🧪 Nährstoff-Sensordaten:", data);
      setNutrientSensors(prev => ({ ...prev, ...data }));
    });

    newSocket.on('nutrientStatus', (data) => {
      console.log("🧪 Nährstoff-Status:", data);
      setNutrientStatus(prev => ({ ...prev, ...data }));
    });

    // VPD-Events
    newSocket.on('vpdUpdate', (data) => {
      console.log("🌡️ VPD-Update:", data);
      setVpdData(prev => ({ ...prev, ...data }));
    });

    // Watchdog-Events (ESP32 Heartbeat + MQTT Status)
    newSocket.on('watchdogStatus', (data) => {
      setWatchdogStatus(prev => ({ ...prev, ...data }));
    });

    // Alert-Events (vom Watchdog oder Relay-Watchdog)
    newSocket.on('alert', (data) => {
      console.warn('⚠️ System-Alert:', data);
    });

    // Relay-Events (zentral für alle Komponenten)
    newSocket.on('relayUpdate', (data) => {
      if (data.relay && data.state !== undefined) {
        setRelayState(prev => ({ ...prev, [data.relay]: data.state }));
      }
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      sensorData,
      nutrientSensors,
      nutrientStatus,
      vpdData,
      relayState,
      watchdogStatus,
      lastSensorTimestamp
    }}>
      {children}
    </SocketContext.Provider>
  );
};