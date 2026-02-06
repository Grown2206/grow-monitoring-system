const SensorLog = require('../models/SensorLog');
const DeviceState = require('../models/DeviceState');

// ==========================================
// SENSOR-VALIDIERUNG
// Filtert ungültige Messwerte (Sensor-Ausfall → 0.0)
// ==========================================

/**
 * Validiert einen Temperaturwert
 * @returns {number|null} Validierter Wert oder null bei Ausfall
 */
const validateTemp = (value) => {
  if (value === undefined || value === null) return undefined;
  // Sensor-Ausfall: 0.0 bei SHT31 bedeutet meistens defekt
  if (value === 0 || value === 0.0) return null;
  // Plausibilitätsbereich: -10°C bis 60°C
  if (value < -10 || value > 60) return null;
  return value;
};

/**
 * Validiert einen Luftfeuchtigkeitswert
 * @returns {number|null} Validierter Wert oder null bei Ausfall
 */
const validateHumidity = (value) => {
  if (value === undefined || value === null) return undefined;
  if (value === 0 || value === 0.0) return null;
  if (value < 0 || value > 100) return null;
  return value;
};

/**
 * Validiert einen Lux-Wert
 * @returns {number|null} Validierter Wert oder null bei Ausfall
 */
const validateLux = (value) => {
  if (value === undefined || value === null) return undefined;
  if (value < 0 || value > 200000) return null;
  return value;
};

/**
 * Validiert einen Analog-Wert (Soil, Tank, Gas)
 * @returns {number|null} Validierter Wert oder null bei Ausfall
 */
const validateAnalog = (value, max = 4095) => {
  if (value === undefined || value === null) return undefined;
  if (value < 0 || value > max) return null;
  return value;
};

/**
 * Berechnet Sensor-Health-Flags basierend auf den validierten Daten
 */
const calculateSensorHealth = (validated) => ({
  bottom: validated.temp_bottom !== null && validated.humidity_bottom !== null,
  middle: validated.temp_middle !== null && validated.humidity_middle !== null,
  top: validated.temp_top !== null && validated.humidity_top !== null,
  light: validated.lux !== null && validated.lux !== undefined,
  air: validated.ens160_eco2 !== null && validated.ens160_eco2 !== undefined
});

// INTERNE Funktion zum Speichern (wird von MQTT/Sensor-Service aufgerufen)
const saveSensorData = async (dataPayload) => {
  try {
    if (!dataPayload) return;

    // Sensor-Validierung: Filtere ungültige Werte
    const validated = {
      temp_bottom: validateTemp(dataPayload.temp_bottom),
      temp_middle: validateTemp(dataPayload.temp_middle),
      temp_top: validateTemp(dataPayload.temp_top),
      humidity_bottom: validateHumidity(dataPayload.humidity_bottom),
      humidity_middle: validateHumidity(dataPayload.humidity_middle),
      humidity_top: validateHumidity(dataPayload.humidity_top),
      lux: validateLux(dataPayload.lux),
      ens160_eco2: dataPayload.ens160_eco2,
      ens160_tvoc: dataPayload.ens160_tvoc,
      ens160_aqi: dataPayload.ens160_aqi,
      aht21_temp: validateTemp(dataPayload.aht21_temp),
      aht21_humidity: validateHumidity(dataPayload.aht21_humidity)
    };

    // Durchschnittswerte neu berechnen (nur gültige Sensoren)
    const validTemps = [validated.temp_bottom, validated.temp_middle, validated.temp_top]
      .filter(t => t !== null && t !== undefined);
    const validHumidities = [validated.humidity_bottom, validated.humidity_middle, validated.humidity_top]
      .filter(h => h !== null && h !== undefined);

    const avgTemp = validTemps.length > 0
      ? validTemps.reduce((a, b) => a + b, 0) / validTemps.length
      : dataPayload.temp; // Fallback auf ESP32-Durchschnitt
    const avgHum = validHumidities.length > 0
      ? validHumidities.reduce((a, b) => a + b, 0) / validHumidities.length
      : dataPayload.humidity;

    // Sensor-Health berechnen
    const sensorHealth = calculateSensorHealth(validated);

    const newLog = new SensorLog({
      device: "esp32_main",
      readings: {
        // HAUPTWERTE (validiert, für Diagramme)
        temp: avgTemp,
        humidity: avgHum,

        // Einzel-Sensoren (validiert — null bei Ausfall statt 0.0)
        temp_bottom: validated.temp_bottom,
        temp_middle: validated.temp_middle,
        temp_top: validated.temp_top,

        humidity_bottom: validated.humidity_bottom,
        humidity_middle: validated.humidity_middle,
        humidity_top: validated.humidity_top,

        // Andere Sensoren (validiert)
        lux: validated.lux,
        tankLevel: validateAnalog(dataPayload.tank),
        gasLevel: validateAnalog(dataPayload.gas),
        soilMoisture: dataPayload.soil,

        // VL53L0X Pflanzenhöhen (mm)
        heights: dataPayload.heights,

        // ENS160 + AHT21 Luftqualität (validiert)
        ens160_eco2: validated.ens160_eco2,
        ens160_tvoc: validated.ens160_tvoc,
        ens160_aqi: validated.ens160_aqi,
        aht21_temp: validated.aht21_temp,
        aht21_humidity: validated.aht21_humidity
      },
      sensorHealth
    });

    await newLog.save();

    // PWM & RPM Daten separat speichern
    if (dataPayload.fanPWM !== undefined || dataPayload.lightPWM !== undefined || dataPayload.fanRPM !== undefined) {
      await DeviceState.updateState({
        pwm: {
          fan_exhaust: dataPayload.fanPWM || 0,
          grow_light: dataPayload.lightPWM || 0
        },
        feedback: {
          fan_exhaust_rpm: dataPayload.fanRPM || 0
        }
      });
    }

    // Log mit Health-Info
    const healthStatus = Object.values(sensorHealth).every(v => v) ? '✅' : '⚠️';
    console.log(`💾 Daten gespeichert ${healthStatus} (Temp Ø: ${avgTemp?.toFixed(1)}°C, Hum Ø: ${avgHum?.toFixed(1)}%)`);
    return true;

  } catch (error) {
    console.error('Fehler beim Speichern der Sensordaten:', error.message);
    return false;
  }
};

// API Route: Gibt Sensor-Historie mit Pagination zurück
const getHistory = async (req, res, next) => {
  try {
    const {
      hours = 24,
      page = 1,
      limit = 500,
      sort = 'timestamp',
      order = 'asc'
    } = req.query;

    const parsedLimit = Math.min(parseInt(limit) || 500, 2000); // Max 2000 pro Seite
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const skip = (parsedPage - 1) * parsedLimit;
    const sortOrder = order === 'desc' ? -1 : 1;

    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
    const filter = { timestamp: { $gte: hoursAgo } };

    const [history, total] = await Promise.all([
      SensorLog.find(filter)
        .sort({ timestamp: sortOrder })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      SensorLog.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parsedLimit);

    res.json({
      success: true,
      data: history,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: totalPages,
        hasMore: parsedPage < totalPages
      },
      meta: {
        hours: parseInt(hours),
        from: hoursAgo,
        to: new Date(),
        count: history.length
      }
    });
  } catch (error) {
    console.error("❌ Fehler in getHistory:", error);
    next(error);
  }
};

// API Route: Aggregierte Sensor-Historie für Charts (serverseitiges Downsampling)
const getAggregatedHistory = async (req, res, next) => {
  try {
    const hours = Math.max(1, Math.min(parseInt(req.query.hours) || 24, 720)); // max 30 Tage
    const maxPoints = Math.max(60, Math.min(parseInt(req.query.points) || 300, 500));

    const now = new Date();
    const from = new Date(now.getTime() - hours * 60 * 60 * 1000);

    // Bucket-Größe berechnen: Zeitraum / gewünschte Punkte (in Millisekunden)
    const totalMs = hours * 60 * 60 * 1000;
    const bucketMs = Math.ceil(totalMs / maxPoints);

    const pipeline = [
      // 1. Nur Daten im Zeitraum
      { $match: { timestamp: { $gte: from, $lte: now } } },

      // 2. Bucket-Key berechnen: Timestamp auf Bucket-Größe runden
      { $addFields: {
        bucket: {
          $toDate: {
            $multiply: [
              { $floor: { $divide: [{ $toLong: '$timestamp' }, bucketMs] } },
              bucketMs
            ]
          }
        }
      }},

      // 3. Pro Bucket aggregieren
      { $group: {
        _id: '$bucket',
        timestamp: { $first: '$bucket' },
        count: { $sum: 1 },

        // Temperatur (3 SHT31 + Durchschnitt)
        temp: { $avg: '$readings.temp' },
        temp_min: { $min: '$readings.temp' },
        temp_max: { $max: '$readings.temp' },
        temp_bottom: { $avg: '$readings.temp_bottom' },
        temp_middle: { $avg: '$readings.temp_middle' },
        temp_top: { $avg: '$readings.temp_top' },

        // Luftfeuchtigkeit
        humidity: { $avg: '$readings.humidity' },
        humidity_min: { $min: '$readings.humidity' },
        humidity_max: { $max: '$readings.humidity' },
        humidity_bottom: { $avg: '$readings.humidity_bottom' },
        humidity_middle: { $avg: '$readings.humidity_middle' },
        humidity_top: { $avg: '$readings.humidity_top' },

        // Licht
        lux: { $avg: '$readings.lux' },

        // Tank & Gas
        tankLevel: { $avg: '$readings.tankLevel' },
        gasLevel: { $avg: '$readings.gasLevel' },

        // Bodenfeuchtigkeit (Array → Durchschnitt pro Slot)
        soilMoisture: { $first: '$readings.soilMoisture' },

        // ENS160 + AHT21
        ens160_eco2: { $avg: '$readings.ens160_eco2' },
        ens160_tvoc: { $avg: '$readings.ens160_tvoc' },
        aht21_temp: { $avg: '$readings.aht21_temp' },
        aht21_humidity: { $avg: '$readings.aht21_humidity' }
      }},

      // 4. Sortieren nach Zeit
      { $sort: { timestamp: 1 } },

      // 5. Felder bereinigen
      { $project: { _id: 0 } }
    ];

    const aggregated = await SensorLog.aggregate(pipeline);

    res.json({
      success: true,
      data: aggregated,
      meta: {
        hours,
        from,
        to: now,
        points: aggregated.length,
        bucketMs,
        bucketLabel: bucketMs >= 60000
          ? `${Math.round(bucketMs / 60000)} min`
          : `${Math.round(bucketMs / 1000)} sek`
      }
    });
  } catch (error) {
    console.error("❌ Fehler in getAggregatedHistory:", error);
    next(error);
  }
};

module.exports = {
  saveSensorData,
  getHistory,
  getAggregatedHistory
};