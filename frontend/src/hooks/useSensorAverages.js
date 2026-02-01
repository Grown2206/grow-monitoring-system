import { useMemo } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Hook zur Berechnung der Sensor-Durchschnittswerte
 * Zentralisiert die Logik für Temperatur, Luftfeuchtigkeit und andere Sensorwerte
 */
export const useSensorAverages = () => {
  const { sensorData } = useSocket();

  const averages = useMemo(() => {
    if (!sensorData) {
      return { temp: 0, humidity: 0, soilTemp: 0, light: 0 };
    }

    // 1. Priorität: Fertiger Durchschnitt vom ESP32 (wenn > 0)
    if (sensorData.temp > 0 && sensorData.humidity > 0) {
      return {
        temp: sensorData.temp,
        humidity: sensorData.humidity,
        soilTemp: sensorData.soil_temp || 0,
        light: sensorData.lux || sensorData.light_intensity || 0
      };
    }

    // 2. Fallback: Manuelle Berechnung (nur Sensoren > 0 beachten!)
    const temps = [
      sensorData.temp_bottom,
      sensorData.temp_middle,
      sensorData.temp_top
    ].filter(t => t != null && t > 0);

    const humidities = [
      sensorData.humidity_bottom,
      sensorData.humidity_middle,
      sensorData.humidity_top
    ].filter(h => h != null && h > 0);

    const avgTemp = temps.length > 0
      ? temps.reduce((a, b) => a + b, 0) / temps.length
      : 0;

    const avgHumidity = humidities.length > 0
      ? humidities.reduce((a, b) => a + b, 0) / humidities.length
      : 0;

    return {
      temp: avgTemp,
      humidity: avgHumidity,
      soilTemp: sensorData.soil_temp || 0,
      light: sensorData.lux || sensorData.light_intensity || 0
    };
  }, [sensorData]);

  return {
    ...averages,
    sensorData, // Original-Daten auch zurückgeben
    isValid: averages.temp > 0 && averages.humidity > 0
  };
};

export default useSensorAverages;
