/**
 * Bodensensor Kalibrierungs-Utility
 *
 * Verwaltet individuelle Kalibrierungswerte für jeden der 6 Bodensensoren.
 * Jeder Sensor hat eigene Min/Max Werte für präzise Feuchtigkeitsmessung.
 */

const STORAGE_KEY = 'soil_sensor_calibration';

// Default-Kalibrierung (falls keine gespeichert)
const DEFAULT_CALIBRATION = {
  sensor1: { min: 1200, max: 4095, lastCalibration: null }, // min = nass, max = trocken
  sensor2: { min: 1200, max: 4095, lastCalibration: null },
  sensor3: { min: 1200, max: 4095, lastCalibration: null },
  sensor4: { min: 1200, max: 4095, lastCalibration: null },
  sensor5: { min: 1200, max: 4095, lastCalibration: null },
  sensor6: { min: 1200, max: 4095, lastCalibration: null },
};

/**
 * Lädt Kalibrierungsdaten aus LocalStorage
 */
export const loadCalibration = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validierung: Stelle sicher, dass alle 6 Sensoren vorhanden sind
      const calibration = { ...DEFAULT_CALIBRATION };
      for (let i = 1; i <= 6; i++) {
        const key = `sensor${i}`;
        if (parsed[key] && parsed[key].min !== undefined && parsed[key].max !== undefined) {
          calibration[key] = parsed[key];
        }
      }
      return calibration;
    }
  } catch (e) {
    console.error('Fehler beim Laden der Bodensensor-Kalibrierung:', e);
  }
  return DEFAULT_CALIBRATION;
};

/**
 * Speichert Kalibrierungsdaten in LocalStorage
 */
export const saveCalibration = (calibration) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(calibration));
    return true;
  } catch (e) {
    console.error('Fehler beim Speichern der Bodensensor-Kalibrierung:', e);
    return false;
  }
};

/**
 * Setzt Kalibrierung für einen spezifischen Sensor
 */
export const setSensorCalibration = (sensorIndex, min, max) => {
  if (sensorIndex < 1 || sensorIndex > 6) {
    throw new Error('Sensor Index muss zwischen 1 und 6 liegen');
  }

  const calibration = loadCalibration();
  calibration[`sensor${sensorIndex}`] = {
    min,
    max,
    lastCalibration: new Date().toISOString()
  };
  saveCalibration(calibration);
  return calibration;
};

/**
 * Konvertiert ADC-Rohwert zu Prozent für einen spezifischen Sensor
 *
 * @param {number} rawValue - ADC-Wert (0-4095)
 * @param {number} sensorIndex - Sensor Nummer (1-6)
 * @returns {number|null} - Feuchtigkeitswert in Prozent (0-100) oder null
 */
export const convertToPercent = (rawValue, sensorIndex) => {
  if (rawValue === null || rawValue === undefined) return null;

  // Wert ist bereits in Prozent (0-100)
  if (rawValue > 0 && rawValue <= 100) {
    return Math.max(0, Math.min(100, Math.round(rawValue)));
  }

  // Wert ist ADC (101-4095) - Konvertiere zu Prozent mit individueller Kalibrierung
  if (rawValue > 100 && rawValue <= 4095) {
    const calibration = loadCalibration();
    const sensorKey = `sensor${sensorIndex}`;
    const { min, max } = calibration[sensorKey] || DEFAULT_CALIBRATION[sensorKey];

    // Formel: 100% = nass (min), 0% = trocken (max)
    // Beispiel: rawValue=1200 (nass) → 100%, rawValue=4095 (trocken) → 0%
    let percent = ((max - rawValue) / (max - min)) * 100;

    // Begrenze auf 0-100%
    return Math.max(0, Math.min(100, Math.round(percent)));
  }

  // Ungültig oder 0 = keine Daten verfügbar
  return null;
};

/**
 * Setzt alle Sensoren auf Standard-Kalibrierung zurück
 */
export const resetCalibration = () => {
  saveCalibration(DEFAULT_CALIBRATION);
  return DEFAULT_CALIBRATION;
};

/**
 * Exportiert Kalibrierung als JSON-String (für Backup)
 */
export const exportCalibration = () => {
  const calibration = loadCalibration();
  return JSON.stringify(calibration, null, 2);
};

/**
 * Importiert Kalibrierung aus JSON-String
 */
export const importCalibration = (jsonString) => {
  try {
    const parsed = JSON.parse(jsonString);
    // Validierung
    for (let i = 1; i <= 6; i++) {
      const key = `sensor${i}`;
      if (!parsed[key] || typeof parsed[key].min !== 'number' || typeof parsed[key].max !== 'number') {
        throw new Error(`Ungültige Kalibrierung für ${key}`);
      }
    }
    saveCalibration(parsed);
    return true;
  } catch (e) {
    console.error('Fehler beim Importieren der Kalibrierung:', e);
    return false;
  }
};
