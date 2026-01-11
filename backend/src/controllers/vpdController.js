const { TOPICS } = require('../config/mqtt');
const VPDConfig = require('../models/VPDConfig');
const SensorLog = require('../models/SensorLog');
const vpdService = require('../services/vpdService');

/**
 * VPD Controller
 * Handles API requests für VPD-Steuerung & Konfiguration
 */

// ==========================================
// CURRENT STATUS & DATA
// ==========================================

/**
 * GET /api/vpd/current
 * Aktuelles VPD mit Analyse
 */
exports.getCurrent = async (req, res, next) => {
  try {
    // Letzte Sensor-Daten holen
    const latestSensor = await SensorLog.findOne()
      .sort({ timestamp: -1 })
      .select('readings timestamp');

    if (!latestSensor || !latestSensor.readings) {
      return res.status(404).json({
        success: false,
        message: 'Keine Sensordaten verfügbar'
      });
    }

    const temp = latestSensor.readings.temp;
    const humidity = latestSensor.readings.humidity;

    if (temp === undefined || humidity === undefined) {
      return res.status(404).json({
        success: false,
        message: 'Temperatur oder Luftfeuchtigkeit nicht verfügbar'
      });
    }

    // VPD berechnen
    const vpd = vpdService.calculateVPD(temp, humidity);

    // Config holen für Zielbereich
    const config = await VPDConfig.getOrCreate();
    const targetRange = config.targetRange;

    // Analyse
    const analysis = vpdService.analyzeVPD(vpd, targetRange);

    // Optimale Werte berechnen
    const optimalTemp = vpdService.calculateOptimalTemp(
      targetRange.optimal,
      humidity
    );
    const optimalHumidity = vpdService.calculateOptimalHumidity(
      targetRange.optimal,
      temp
    );

    res.json({
      success: true,
      data: {
        vpd: Math.round(vpd * 100) / 100,
        current: {
          temp,
          humidity,
          timestamp: latestSensor.timestamp
        },
        target: targetRange,
        analysis,
        suggestions: {
          optimalTemp,
          optimalHumidity,
          message: analysis.recommendation
        },
        autoControl: {
          enabled: config.enabled,
          growStage: config.growStage
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/vpd/history
 * VPD-Verlauf der letzten X Stunden
 */
exports.getHistory = async (req, res, next) => {
  try {
    const { hours = 24, limit = 100 } = req.query;

    // Sensor-Daten der letzten X Stunden
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const sensorData = await SensorLog.find({
      timestamp: { $gte: cutoff }
    })
      .select('temp humidity timestamp')
      .sort({ timestamp: 1 })
      .limit(parseInt(limit));

    // VPD für jeden Datenpunkt berechnen
    const vpdHistory = sensorData.map(data => {
      const vpd = vpdService.calculateVPD(data.temp, data.humidity);
      return {
        vpd: Math.round(vpd * 100) / 100,
        temp: data.temp,
        humidity: data.humidity,
        timestamp: data.timestamp
      };
    });

    // Statistiken
    const config = await VPDConfig.getOrCreate();
    const targetRange = config.targetRange;

    const vpds = vpdHistory.map(h => h.vpd);
    const avg = vpds.reduce((a, b) => a + b, 0) / vpds.length;
    const inRange = vpdHistory.filter(h =>
      h.vpd >= targetRange.min && h.vpd <= targetRange.max
    ).length;

    res.json({
      success: true,
      data: {
        history: vpdHistory,
        statistics: {
          average: Math.round(avg * 100) / 100,
          percentInRange: Math.round((inRange / vpdHistory.length) * 100),
          dataPoints: vpdHistory.length,
          period: `${hours} Stunden`
        },
        targetRange
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/vpd/statistics
 * VPD-Statistiken & Performance
 */
exports.getStatistics = async (req, res, next) => {
  try {
    const { days = 7 } = req.query;

    const config = await VPDConfig.getOrCreate();
    const serviceStats = vpdService.getStatistics(days * 24);

    // Database-Stats
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const totalDataPoints = await SensorLog.countDocuments({
      timestamp: { $gte: cutoff }
    });

    res.json({
      success: true,
      data: {
        service: serviceStats,
        config: {
          totalAdjustments: config.statistics.totalAdjustments,
          averageVPD: Math.round(config.statistics.averageVPD * 100) / 100,
          timeInOptimalRange: Math.round(config.statistics.timeInOptimalRange),
          lastReset: config.statistics.lastReset
        },
        database: {
          totalDataPoints,
          period: `${days} Tage`
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CONFIGURATION
// ==========================================

/**
 * GET /api/vpd/config
 * Aktuelle VPD-Konfiguration
 */
exports.getConfig = async (req, res, next) => {
  try {
    const config = await VPDConfig.getOrCreate();

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/vpd/config
 * VPD-Konfiguration aktualisieren
 */
exports.updateConfig = async (req, res, next) => {
  try {
    const config = await VPDConfig.getOrCreate();

    // Erlaube nur bestimmte Felder
    const allowedUpdates = [
      'enabled',
      'growStage',
      'customTarget',
      'aggressiveness',
      'fanLimits',
      'updateInterval',
      'hysteresis',
      'emergency',
      'logging',
      'notifications'
    ];

    // Update nur erlaubte Felder
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        if (typeof req.body[key] === 'object' && !Array.isArray(req.body[key])) {
          // Nested object - merge
          config[key] = { ...config[key], ...req.body[key] };
        } else {
          config[key] = req.body[key];
        }
      }
    });

    await config.save();

    console.log(`✅ VPD-Config aktualisiert: ${JSON.stringify(req.body)}`);

    res.json({
      success: true,
      data: config,
      message: 'VPD-Konfiguration aktualisiert'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/vpd/config/reset
 * Konfiguration auf Standardwerte zurücksetzen
 */
exports.resetConfig = async (req, res, next) => {
  try {
    const config = await VPDConfig.getOrCreate();

    // Zurück zu Defaults
    config.enabled = false;
    config.growStage = 'vegetative';
    config.customTarget.enabled = false;
    config.aggressiveness = 'normal';
    config.fanLimits = { min: 30, max: 85 };
    config.updateInterval = 30;

    await config.save();

    console.log('🔄 VPD-Config auf Standard zurückgesetzt');

    res.json({
      success: true,
      data: config,
      message: 'Konfiguration zurückgesetzt'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/vpd/config/statistics/reset
 * Statistiken zurücksetzen
 */
exports.resetStatistics = async (req, res, next) => {
  try {
    const config = await VPDConfig.getOrCreate();
    config.resetStatistics();
    await config.save();

    console.log('🔄 VPD-Statistiken zurückgesetzt');

    res.json({
      success: true,
      message: 'Statistiken zurückgesetzt'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CONTROL
// ==========================================

/**
 * POST /api/vpd/enable
 * Auto-VPD aktivieren
 */
exports.enable = async (req, res, next) => {
  try {
    const config = await VPDConfig.getOrCreate();
    config.enabled = true;
    await config.save();

    console.log('✅ Auto-VPD aktiviert');

    res.json({
      success: true,
      message: 'Auto-VPD-Steuerung aktiviert'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/vpd/disable
 * Auto-VPD deaktivieren
 */
exports.disable = async (req, res, next) => {
  try {
    const config = await VPDConfig.getOrCreate();
    config.enabled = false;
    await config.save();

    console.log('⏹️ Auto-VPD deaktiviert');

    res.json({
      success: true,
      message: 'Auto-VPD-Steuerung deaktiviert'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/vpd/manual-adjust
 * Manuelle Fan-Anpassung (überschreibt Auto-VPD temporär)
 */
exports.manualAdjust = async (req, res, next) => {
  try {
    const { fanSpeed } = req.body;

    if (fanSpeed < 0 || fanSpeed > 100) {
      return res.status(400).json({
        success: false,
        message: 'Fan-Speed muss zwischen 0 und 100 liegen'
      });
    }

    // MQTT-Command an ESP32 senden
    const { client: mqttClient } = require('../services/mqttService');

    mqttClient.publish(TOPICS.COMMAND, JSON.stringify({
      action: 'set_fan_pwm',
      value: fanSpeed
    }));

    console.log(`🎛️ Manuelle Fan-Anpassung: ${fanSpeed}%`);

    res.json({
      success: true,
      message: `Lüfter auf ${fanSpeed}% gesetzt`
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// UTILITIES
// ==========================================

/**
 * POST /api/vpd/calculate
 * VPD für beliebige Temp/Humidity berechnen (Utility)
 */
exports.calculate = async (req, res, next) => {
  try {
    const { temp, humidity, growStage = 'vegetative' } = req.body;

    if (!temp || !humidity) {
      return res.status(400).json({
        success: false,
        message: 'Temperatur und Luftfeuchtigkeit erforderlich'
      });
    }

    const vpd = vpdService.calculateVPD(temp, humidity);
    const targetRange = vpdService.getTargetVPD(growStage);
    const analysis = vpdService.analyzeVPD(vpd, targetRange);

    res.json({
      success: true,
      data: {
        vpd: Math.round(vpd * 100) / 100,
        input: { temp, humidity },
        targetRange,
        analysis
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
