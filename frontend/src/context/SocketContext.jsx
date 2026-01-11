import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sensorData, setSensorData] = useState({
    temp: 0, humidity: 0, lux: 0, tankLevel: 0, gasLevel: 0,
    soil: [0,0,0,0,0,0]
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
    // Automatische Erkennung der Backend-URL
    // Wenn Frontend auf localhost:5173 läuft, suche Backend auf localhost:3000
    const backendUrl = `http://${window.location.hostname}:3000`;
    
    console.log("Verbinde zu Backend:", backendUrl);

    const newSocket = io(backendUrl, {
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
      // console.log("Neue Sensordaten:", data); // Debugging
      setSensorData(prev => ({ ...prev, ...data }));
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
      vpdData
    }}>
      {children}
    </SocketContext.Provider>
  );
};