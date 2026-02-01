const { TOPICS } = require('../config/mqtt');
const SensorCalibration = require('../models/SensorCalibration');
const NutrientReading = require('../models/NutrientReading');
const SensorLog = require('../models/SensorLog');
const { client: mqttClient } = require('../services/mqttService');

/**
 * Sensor Controller
 * Handles API requests für EC/pH Sensoren (Atlas Scientific EZO)
 */

// Default Thresholds
const DEFAULT_THRESHOLDS = {
  ec: {
    min: 0.8,
    max: 2.5,
    critical: { min: 0.5, max: 3.5 }
  },
  ph: {
    min: 5.5,
    max: 6.5,
    critical: { min: 4.5, max: 7.5 }
  },
  temperature: {
    max: 28,
    critical: 32
  },
  reservoir: {
    minLevel: 20
  }
};

// ==========================================
// CURRENT READINGS
// ==========================================

/**
 * GET /api/sensors/current
 * Aktuelle Sensor-Werte (EC, pH, Temp)
 */
exports.getCurrent = async (req, res, next) => {
  try {
    // Letzter Reading-Eintrag
    const latestReading = await NutrientReading.findOne()
      .sort({ timestamp: -1 });

    if (!latestReading) {
      return res.json({
        success: true,
        data: {
          ec: { value: 0, unit: 'mS/cm' },
          ph: { value: 0 },
          temperature: 0,
          reservoir: { level: 0 },
          calibrated: false,
          timestamp: new Date()
        }
      });
    }

    // Calibration Status holen
    const ecCal = await SensorCalibration.getOrCreate('ec');
    const phCal = await SensorCalibration.getOrCreate('ph');

    res.json({
      success: true,
      data: {
        ec: latestReading.ec,
        ph: latestReading.ph,
        temperature: latestReading.temperature,
        reservoir: latestReading.reservoir,
        tds: latestReading.tds, // Virtual field
        calibrated: {
          ec: ecCal.status.isValid,
          ph: phCal.status.isValid
        },
        quality: latestReading.quality,
        alerts: latestReading.alerts,
        timestamp: latestReading.timestamp
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sensors/history
 * Sensor-Verlauf (Query: hours, limit)
 */
exports.getHistory = async (req, res, next) => {
  try {
    const { hours = 24, limit = 100 } = req.query;

    const readings = await NutrientReading.getRecent(hours, limit);

    // Format for frontend
    const history = readings.map(r => ({
      ec: r.ec.value,
      ph: r.ph.value,
      temperature: r.temperature,
      reservoir: r.reservoir,
      tds: r.tds,
      timestamp: r.timestamp
    }));

    // Statistics
    const stats = await NutrientReading.getStatistics(hours);

    res.json({
      success: true,
      data: {
        history: history.reverse(), // Chronological order
        statistics: stats,
        dataPoints: history.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CALIBRATION
// ==========================================

/**
 * GET /api/sensors/calibration/:type
 * Calibration-Status für EC oder pH
 */
exports.getCalibration = async (req, res, next) => {
  try {
    const { type } = req.params; // 'ec' or 'ph'

    if (!['ec', 'ph'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be "ec" or "ph"'
      });
    }

    const calibration = await SensorCalibration.getOrCreate(type);

    res.json({
      success: true,
      data: calibration
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sensors/calibration/:type/start
 * Start Calibration Process
 * Body: { point: 'dry'|'low'|'mid'|'high', referenceValue: number }
 */
exports.startCalibration = async (req, res, next) => {
  try {
    const { type } = req.params; // 'ec' or 'ph'
    const { point, referenceValue } = req.body;

    if (!['ec', 'ph'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be "ec" or "ph"'
      });
    }

    // Validate point
    const validECPoints = ['dry', 'low', 'high'];
    const validPHPoints = ['low', 'mid', 'high'];

    if (type === 'ec' && !validECPoints.includes(point)) {
      return res.status(400).json({
        success: false,
        message: `EC point must be one of: ${validECPoints.join(', ')}`
      });
    }

    if (type === 'ph' && !validPHPoints.includes(point)) {
      return res.status(400).json({
        success: false,
        message: `pH point must be one of: ${validPHPoints.join(', ')}`
      });
    }

    // Send MQTT command to ESP32
    const command = {
      action: 'calibrate_sensor',
      sensor: type,
      point,
      referenceValue: referenceValue || getDefaultReference(type, point)
    };

    mqttClient.publish(TOPICS.COMMAND, JSON.stringify(command));

    console.log(`🔬 Calibration started: ${type} ${point} (${command.referenceValue})`);

    res.json({
      success: true,
      message: `Calibration started for ${type} ${point} point`,
      command
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sensors/calibration/:type/save
 * Save Calibration Point
 * Body: { point: 'dry'|'low'|'mid'|'high', referenceValue: number, measuredValue: number }
 */
exports.saveCalibration = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { point, referenceValue, measuredValue, slope } = req.body;

    const calibration = await SensorCalibration.getOrCreate(type);

    if (type === 'ec') {
      if (point === 'dry') {
        calibration.ecCalibration.dry.calibrated = true;
        calibration.ecCalibration.dry.date = new Date();
        calibration.ecCalibration.dry.value = measuredValue;
      } else if (point === 'low') {
        calibration.ecCalibration.low.calibrated = true;
        calibration.ecCalibration.low.date = new Date();
        calibration.ecCalibration.low.referenceValue = referenceValue;
        calibration.ecCalibration.low.measuredValue = measuredValue;
      } else if (point === 'high') {
        calibration.ecCalibration.high.calibrated = true;
        calibration.ecCalibration.high.date = new Date();
        calibration.ecCalibration.high.referenceValue = referenceValue;
        calibration.ecCalibration.high.measuredValue = measuredValue;
      }

      if (slope) calibration.ecCalibration.slope = slope;
    } else if (type === 'ph') {
      if (point === 'low') {
        calibration.phCalibration.low.calibrated = true;
        calibration.phCalibration.low.date = new Date();
        calibration.phCalibration.low.referenceValue = referenceValue;
        calibration.phCalibration.low.measuredValue = measuredValue;
      } else if (point === 'mid') {
        calibration.phCalibration.mid.calibrated = true;
        calibration.phCalibration.mid.date = new Date();
        calibration.phCalibration.mid.referenceValue = referenceValue;
        calibration.phCalibration.mid.measuredValue = measuredValue;
      } else if (point === 'high') {
        calibration.phCalibration.high.calibrated = true;
        calibration.phCalibration.high.date = new Date();
        calibration.phCalibration.high.referenceValue = referenceValue;
        calibration.phCalibration.high.measuredValue = measuredValue;
      }

      if (slope) calibration.phCalibration.slope = slope;
    }

    // Add to history
    calibration.addCalibrationPoint(`${type}_${point}`, referenceValue, measuredValue, true);

    // Calculate quality
    calibration.calculateQuality();

    await calibration.save();

    console.log(`✅ Calibration saved: ${type} ${point}`);

    res.json({
      success: true,
      message: `Calibration point saved for ${type} ${point}`,
      data: calibration
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sensors/calibration/:type/reset
 * Reset Calibration
 */
exports.resetCalibration = async (req, res, next) => {
  try {
    const { type } = req.params;

    const calibration = await SensorCalibration.getOrCreate(type);
    calibration.resetCalibration();
    await calibration.save();

    // Send MQTT command to ESP32
    mqttClient.publish(TOPICS.COMMAND, JSON.stringify({
      action: 'reset_calibration',
      sensor: type
    }));

    console.log(`🔄 Calibration reset: ${type}`);

    res.json({
      success: true,
      message: `Calibration reset for ${type}`,
      data: calibration
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SENSOR COMMANDS
// ==========================================

/**
 * POST /api/sensors/read
 * Trigger Manual Sensor Reading
 */
exports.triggerReading = async (req, res, next) => {
  try {
    mqttClient.publish(TOPICS.COMMAND, JSON.stringify({
      action: 'read_sensors'
    }));

    console.log('📊 Manual sensor reading triggered');

    res.json({
      success: true,
      message: 'Sensor reading triggered'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sensors/temperature-compensation
 * Set Temperature Compensation
 * Body: { type: 'ec'|'ph', temperature: number }
 */
exports.setTemperatureCompensation = async (req, res, next) => {
  try {
    const { type, temperature } = req.body;

    if (!['ec', 'ph'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be "ec" or "ph"'
      });
    }

    if (temperature < 0 || temperature > 50) {
      return res.status(400).json({
        success: false,
        message: 'Temperature must be between 0 and 50°C'
      });
    }

    // Update calibration
    const calibration = await SensorCalibration.getOrCreate(type);
    calibration.temperatureCompensation.value = temperature;
    await calibration.save();

    // Send MQTT command
    mqttClient.publish(TOPICS.COMMAND, JSON.stringify({
      action: 'set_temp_compensation',
      sensor: type,
      temperature
    }));

    console.log(`🌡️ Temperature compensation set: ${type} → ${temperature}°C`);

    res.json({
      success: true,
      message: `Temperature compensation set for ${type}`,
      temperature
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// VL53L0X ToF CALIBRATION
// ==========================================

// In-Memory ToF Config (persisted to MongoDB)
let tofConfigCache = null;

/**
 * GET /api/sensors/tof/config
 * Lade ToF Sensor-Konfiguration (Montagehöhen)
 */
exports.getTofConfig = async (req, res, next) => {
  try {
    // Lade aus SensorCalibration Collection (type: 'tof')
    let config = await SensorCalibration.findOne({ sensorType: 'tof' });

    if (!config) {
      // Default-Konfiguration erstellen
      config = await SensorCalibration.create({
        sensorType: 'tof',
        tofConfig: {
          sensors: Array.from({ length: 6 }, (_, i) => ({
            slot: i + 1,
            mountHeight_mm: 800,
            offset_mm: 0,
            label: `Slot ${i + 1}`,
            enabled: true
          }))
        },
        status: { isValid: true, lastCalibration: new Date() }
      });
    }

    // Live-Höhendaten anhängen
    const latestLog = await SensorLog.findOne()
      .sort({ timestamp: -1 })
      .select('readings.heights timestamp')
      .lean();

    const liveHeights = latestLog?.readings?.heights || [];

    res.json({
      success: true,
      data: {
        sensors: config.tofConfig?.sensors || [],
        liveHeights,
        liveTimestamp: latestLog?.timestamp,
        lastCalibration: config.status?.lastCalibration,
        updatedAt: config.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sensors/tof/config
 * Speichere ToF Sensor-Konfiguration
 * Body: { sensors: [{ slot, mountHeight_mm, offset_mm, label, enabled }] }
 */
exports.saveTofConfig = async (req, res, next) => {
  try {
    const { sensors } = req.body;

    if (!sensors || !Array.isArray(sensors) || sensors.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'sensors must be an array of 6 entries'
      });
    }

    // Validierung
    for (const s of sensors) {
      if (s.mountHeight_mm < 100 || s.mountHeight_mm > 2000) {
        return res.status(400).json({
          success: false,
          error: `Montagehöhe für Slot ${s.slot} muss zwischen 100-2000mm liegen`
        });
      }
    }

    let config = await SensorCalibration.findOne({ sensorType: 'tof' });

    if (!config) {
      config = new SensorCalibration({ sensorType: 'tof' });
    }

    config.tofConfig = { sensors };
    config.status = { isValid: true, lastCalibration: new Date() };
    config.markModified('tofConfig');
    await config.save();

    // MQTT: Montagehöhen an ESP32 senden (optional, Firmware kann sie übernehmen)
    try {
      const heights = sensors.map(s => s.mountHeight_mm + (s.offset_mm || 0));
      mqttClient.publish(TOPICS.COMMAND, JSON.stringify({
        action: 'set_tof_mount_heights',
        heights
      }));
    } catch (e) {
      // MQTT optional
    }

    console.log('📏 ToF config saved:', sensors.map(s => `${s.slot}:${s.mountHeight_mm}mm`).join(', '));

    res.json({
      success: true,
      message: 'ToF Konfiguration gespeichert',
      data: config.tofConfig
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sensors/tof/test/:slot
 * Test-Messung: Lese aktuelle Höhe für einen Slot
 */
exports.testTofSensor = async (req, res, next) => {
  try {
    const slot = parseInt(req.params.slot);
    if (isNaN(slot) || slot < 1 || slot > 6) {
      return res.status(400).json({ success: false, error: 'Slot muss 1-6 sein' });
    }

    // Letzten SensorLog abfragen
    const latestLog = await SensorLog.findOne()
      .sort({ timestamp: -1 })
      .select('readings.heights timestamp')
      .lean();

    if (!latestLog || !latestLog.readings?.heights) {
      return res.json({
        success: true,
        data: { slot, height_mm: null, timestamp: null, message: 'Keine Sensordaten verfügbar' }
      });
    }

    const heightMM = latestLog.readings.heights[slot - 1];

    res.json({
      success: true,
      data: {
        slot,
        height_mm: heightMM !== undefined ? heightMM : null,
        valid: heightMM > 0,
        timestamp: latestLog.timestamp
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// HELPERS
// ==========================================

function getDefaultReference(type, point) {
  const defaults = {
    ec: {
      low: 1.413, // mS/cm (1413 µS/cm)
      high: 12.88 // mS/cm (12880 µS/cm)
    },
    ph: {
      low: 4.0,
      mid: 7.0,
      high: 10.0
    }
  };

  return defaults[type]?.[point] || 0;
}

module.exports = exports;
