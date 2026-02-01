const SensorLog = require('../models/SensorLog');
const DeviceState = require('../models/DeviceState');

// INTERNE Funktion zum Speichern (wird von MQTT/Sensor-Service aufgerufen)
const saveSensorData = async (dataPayload) => {
  try {
    if (!dataPayload) return;

    // WICHTIG: Wir nutzen die Durchschnittswerte, die der ESP32 bereits berechnet hat!
    // Falls der ESP32 'temp' sendet (v3.3), nutzen wir das.
    // Falls Sensoren 0.0 sind, ignorieren wir sie f�r die DB-Speicherung nicht (Rohdaten),
    // aber der Hauptwert 'temp' muss stimmen.
    
    const avgTemp = dataPayload.temp; // Der ESP32 sendet jetzt den korrekten Durchschnitt
    const avgHum = dataPayload.humidity; 

    const newLog = new SensorLog({
      device: "esp32_main",
      readings: {
        // HAUPTWERTE (Wichtig f�r Diagramme!)
        temp: avgTemp, 
        humidity: avgHum,

        // Einzel-Sensoren (Rohdaten f�r Details)
        temp_bottom: dataPayload.temp_bottom,
        temp_middle: dataPayload.temp_middle,
        temp_top: dataPayload.temp_top,
        
        humidity_bottom: dataPayload.humidity_bottom,
        humidity_middle: dataPayload.humidity_middle,
        humidity_top: dataPayload.humidity_top,

        // Andere Sensoren
        lux: dataPayload.lux,
        tankLevel: dataPayload.tank,
        gasLevel: dataPayload.gas,
        soilMoisture: dataPayload.soil,

        // VL53L0X Pflanzenhöhen (mm)
        heights: dataPayload.heights,

        // ENS160 + AHT21 Luftqualität
        ens160_eco2: dataPayload.ens160_eco2,
        ens160_tvoc: dataPayload.ens160_tvoc,
        ens160_aqi: dataPayload.ens160_aqi,
        aht21_temp: dataPayload.aht21_temp,
        aht21_humidity: dataPayload.aht21_humidity
      }
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

    console.log(`?? Daten gespeichert (Temp ?: ${avgTemp}�C, Hum ?: ${avgHum}%)`);
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

module.exports = {
  saveSensorData,
  getHistory
};