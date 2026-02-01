const express = require('express');
const router = express.Router();
const mqttService = require('../services/mqttService');
const { TOPICS } = require('../config/mqtt');

// Middleware Imports
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validateBody, validateQuery, validateObjectId, schemas } = require('../middleware/validation');

// Controller Imports
const authController = require('../controllers/authController');
const { getPlants, updatePlant } = require('../controllers/plantController');
const { getHistory } = require('../controllers/dataController');
const { getLogs, getEvents, createEvent, deleteEvent, getAutomationConfig, updateAutomationConfig, getDeviceStates } = require('../controllers/systemController');
const { getConsultation } = require('../controllers/aiController');
const notificationController = require('../controllers/notificationController');
const weatherController = require('../controllers/weatherController');
const analyticsController = require('../controllers/analyticsController');
const quickActionController = require('../controllers/quickActionController');
const nutrientRoutes = require('./nutrientRoutes');
const vpdRoutes = require('./vpdRoutes');
const sensorRoutes = require('./sensorRoutes');
const timelapseRoutes = require('./timelapseRoutes');
const cameraRoutes = require('./cameraRoutes');
const automationRuleController = require('../controllers/automationRuleController');
const plantGrowthController = require('../controllers/plantGrowthController');
const plantTrackingService = require('../services/plantTrackingService');
const calendarController = require('../controllers/calendarController');
const plantAnalysisService = require('../services/plantAnalysisService');
const maintenanceRoutes = require('./maintenanceRoutes');

// Config Speicher (Mockup für Laufzeit, wird bei Neustart zurückgesetzt - idealerweise DB nutzen)
let automationConfig = {
  lightStart: "06:00",
  lightDuration: 18,
  tempTarget: 24,
  tempHysteresis: 2,
  pumpInterval: 4,
  pumpDuration: 30
};
let webhookUrl = "";

// ==========================================
// 0. HEALTH CHECK (Public)
// ==========================================
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'grow-monitoring-backend',
    version: '1.2.0'
  });
});

// ==========================================
// 1. AUTHENTIFIZIERUNG (Public Routes)
// ==========================================
router.post('/auth/register', validateBody(schemas.register), authController.register);
router.post('/auth/login', validateBody(schemas.login), authController.login);
router.get('/auth/validate', authenticate, authController.validateToken);
router.post('/auth/refresh', authenticate, authController.refreshToken);

// ==========================================
// 2. PFLANZEN MANAGEMENT (Public - optional auth)
// ==========================================
router.get('/plants', optionalAuth, getPlants);
router.put('/plants/:slotId', optionalAuth, updatePlant);

// ==========================================
// 2. DATEN & HISTORIE (Public - optional auth)
// ==========================================
router.get('/history', optionalAuth, getHistory);
router.get('/logs', optionalAuth, getLogs);

// ==========================================
// 3. KALENDER & EVENTS (Public - optional auth)
// ==========================================
router.get('/calendar', optionalAuth, getEvents);
router.post('/calendar', optionalAuth, createEvent);
router.delete('/calendar/:id', optionalAuth, validateObjectId('id'), deleteEvent);

// ==========================================
// 4. AI CONSULTANT (Public - optional auth)
// ==========================================
router.post('/ai/consult', optionalAuth, getConsultation);

// ==========================================
// 5. EINSTELLUNGEN (Public - optional auth)
// ==========================================
// Automation Config abrufen (NEU: aus automationService)
router.get('/settings/automation', optionalAuth, getAutomationConfig);

// Automation Config speichern (NEU: in automationService)
router.post('/settings/automation', optionalAuth, updateAutomationConfig);

// Device States abrufen (NEU)
router.get('/settings/device-states', optionalAuth, getDeviceStates);

// Webhook abrufen
router.get('/settings/webhook', optionalAuth, (req, res) => {
  res.json({ url: webhookUrl });
});

// Webhook speichern
router.post('/settings/webhook', optionalAuth, (req, res) => {
  webhookUrl = req.body.url;
  console.log("✅ Webhook URL gespeichert:", webhookUrl);
  res.json({
    success: true,
    message: "Webhook gespeichert"
  });
});

// ==========================================
// 6. STEUERUNG & SYSTEM (Public - optional auth)
// ==========================================
// Relais manuell schalten
router.post('/controls/relay', optionalAuth, (req, res) => {
  const { relay, state } = req.body;

  if (!relay || state === undefined) {
    return res.status(400).json({
      success: false,
      message: "Fehlende Parameter (relay, state)"
    });
  }

  // MQTT Befehl bauen
  const command = {
    action: 'set_relay',
    relay: relay,
    state: state
  };

  mqttService.publish(TOPICS.COMMAND, JSON.stringify(command));

  // Automation Service informieren über manuellen Eingriff
  const { notifyManualAction, updateDeviceState } = require('../services/automationService');
  notifyManualAction();
  updateDeviceState('relay', relay, state);

  console.log(`⚡ Relais Befehl gesendet: ${relay} -> ${state ? 'AN' : 'AUS'}`);
  res.json({
    success: true,
    message: "Befehl gesendet",
    command
  });
});

// PWM Steuerung - Abluftfilter
router.post('/controls/fan-pwm', optionalAuth, (req, res) => {
  const { value } = req.body;

  if (value === undefined || value < 0 || value > 100) {
    return res.status(400).json({
      success: false,
      message: "PWM Wert muss zwischen 0-100 liegen"
    });
  }

  const command = {
    action: 'set_fan_pwm',
    value: parseInt(value)
  };

  mqttService.publish(TOPICS.COMMAND, JSON.stringify(command));

  console.log(`🌀 Fan PWM gesetzt: ${value}%`);
  res.json({
    success: true,
    message: "Fan PWM gesetzt",
    value: parseInt(value)
  });
});

// PWM Steuerung - RJ11 Grow Light
router.post('/controls/light-pwm', optionalAuth, (req, res) => {
  const { value } = req.body;

  if (value === undefined || value < 0 || value > 100) {
    return res.status(400).json({
      success: false,
      message: "PWM Wert muss zwischen 0-100 liegen"
    });
  }

  const command = {
    action: 'set_light_pwm',
    value: parseInt(value)
  };

  mqttService.publish(TOPICS.COMMAND, JSON.stringify(command));

  console.log(`💡 Light PWM gesetzt: ${value}%`);
  res.json({
    success: true,
    message: "Light PWM gesetzt",
    value: parseInt(value)
  });
});

// RJ11 Light Enable/Disable
router.post('/controls/light-enable', optionalAuth, (req, res) => {
  const { enabled } = req.body;

  if (enabled === undefined) {
    return res.status(400).json({
      success: false,
      message: "Fehlender Parameter (enabled)"
    });
  }

  const command = {
    action: 'set_light_enable',
    enabled: !!enabled
  };

  mqttService.publish(TOPICS.COMMAND, JSON.stringify(command));

  console.log(`💡 RJ11 Light: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  res.json({
    success: true,
    message: `Light ${enabled ? 'aktiviert' : 'deaktiviert'}`,
    enabled: !!enabled
  });
});

// Device Status abrufen (PWM, RPM, etc.)
router.get('/controls/device-state', optionalAuth, async (req, res, next) => {
  try {
    const DeviceState = require('../models/DeviceState');
    const { getDeviceStates } = require('../services/automationService');

    const dbState = await DeviceState.getLatest();
    const automationState = getDeviceStates();

    res.json({
      success: true,
      data: {
        ...(dbState || {
          relays: {},
          pwm: { fan_exhaust: 0, grow_light: 0 },
          feedback: { fan_exhaust_rpm: 0 },
          rj11: { enabled: false, dimLevel: 100, mode: 'off' }
        }),
        automation: automationState
      }
    });
  } catch (error) {
    next(error);
  }
});

// ESP Neustart (Reboot)
router.post('/system/reboot', optionalAuth, (req, res) => {
  mqttService.publish(TOPICS.COMMAND, JSON.stringify({ action: 'reboot' }));
  console.log("🔄 Reboot Befehl gesendet");
  res.json({
    success: true,
    message: "Reboot initiiert"
  });
});

// ESP Factory Reset
router.post('/system/reset', optionalAuth, (req, res) => {
  mqttService.publish(TOPICS.COMMAND, JSON.stringify({ action: 'factory_reset' }));
  console.log("⚠️ Factory Reset Befehl gesendet");
  res.json({
    success: true,
    message: "Reset initiiert"
  });
});

// Device Definitions (für Automation UI)
router.get('/devices', optionalAuth, (req, res) => {
  const { getAllControllableDevices, DEVICE_DEFINITIONS } = require('../config/devices');

  res.json({
    success: true,
    data: {
      devices: getAllControllableDevices(),
      definitions: DEVICE_DEFINITIONS
    }
  });
});

// ==========================================
// 7. PUSH-NOTIFICATIONS (Public - optional auth)
// ==========================================
router.post('/notifications/subscribe', optionalAuth, notificationController.subscribe);
router.post('/notifications/unsubscribe', optionalAuth, notificationController.unsubscribe);
router.post('/notifications/test', optionalAuth, notificationController.sendTest);
router.get('/notifications/public-key', notificationController.getPublicKey); // Public
router.get('/notifications/stats', optionalAuth, notificationController.getStats);
router.post('/notifications/cleanup', optionalAuth, notificationController.cleanup);

// ==========================================
// 8. WETTER-API (Public mit optionalAuth)
// ==========================================
router.get('/weather/current', optionalAuth, weatherController.getCurrent);
router.get('/weather/forecast', optionalAuth, weatherController.getForecast);
router.get('/weather/recommendations', optionalAuth, weatherController.getRecommendations);

// ==========================================
// 9. ANALYTICS & AI (Public - optional auth)
// ==========================================
router.get('/analytics/anomalies', optionalAuth, analyticsController.getAnomalies);
router.get('/analytics/predictions', optionalAuth, analyticsController.getPredictions);
router.get('/analytics/optimizations', optionalAuth, analyticsController.getOptimizations);

// ==========================================
// 11. NÄHRSTOFF-MANAGEMENT (Public - optional auth)
// ==========================================
router.use('/nutrients', nutrientRoutes);

// ==========================================
// 12. VPD-STEUERUNG (Public - optional auth)
// ==========================================
router.use('/vpd', vpdRoutes);

// ==========================================
// 13. EC/pH SENSOREN (Public - optional auth)
// ==========================================
router.use('/sensors', sensorRoutes);

// ==========================================
// 14. TIMELAPSE (Public - optional auth)
// ==========================================
router.use('/timelapse', timelapseRoutes);

// ==========================================
// 15. KAMERA-MANAGEMENT (Public - optional auth)
// ==========================================
router.use('/cameras', cameraRoutes);

// ==========================================
// 16. QUICK ACTIONS (Public - optional auth)
// ==========================================
router.post('/quick-actions/fan', optionalAuth, quickActionController.setFan);
router.post('/quick-actions/light', optionalAuth, quickActionController.setLight);
router.post('/quick-actions/humidifier', optionalAuth, quickActionController.setHumidifier);
router.post('/quick-actions/vpd-optimize', optionalAuth, quickActionController.optimizeVPD);
router.post('/quick-actions/nutrients', optionalAuth, quickActionController.doseNutrients);
router.post('/quick-actions/emergency-stop', optionalAuth, quickActionController.emergencyStop);
router.get('/quick-actions/history', optionalAuth, quickActionController.getHistory);

// ==========================================
// AUTOMATION RULES (If-Then-Else)
// ==========================================
router.get('/automation-rules', optionalAuth, automationRuleController.getAll);
router.get('/automation-rules/:id', optionalAuth, validateObjectId('id'), automationRuleController.getById);
router.post('/automation-rules', optionalAuth, automationRuleController.create);
router.put('/automation-rules/:id', optionalAuth, validateObjectId('id'), automationRuleController.update);
router.delete('/automation-rules/:id', optionalAuth, validateObjectId('id'), automationRuleController.delete);
router.post('/automation-rules/:id/toggle', optionalAuth, validateObjectId('id'), automationRuleController.toggle);
router.post('/automation-rules/:id/simulate', optionalAuth, validateObjectId('id'), automationRuleController.simulate);
router.post('/automation-rules/:id/trigger', optionalAuth, validateObjectId('id'), automationRuleController.trigger);
router.get('/automation-engine/status', optionalAuth, automationRuleController.getEngineStatus);
router.post('/automation-engine/toggle', optionalAuth, automationRuleController.toggleEngine);

// ==========================================
// 13. PLANT GROWTH TRACKING
// ==========================================
router.post('/plants/:plantId/growth-log', optionalAuth, validateObjectId('plantId'), plantGrowthController.createOrUpdate);
router.get('/plants/:plantId/growth-log', optionalAuth, validateObjectId('plantId'), plantGrowthController.getLogs);
router.get('/plants/:plantId/growth-log/:date', optionalAuth, validateObjectId('plantId'), plantGrowthController.getLogByDate);
router.get('/plants/:plantId/growth-trend', optionalAuth, validateObjectId('plantId'), plantGrowthController.getGrowthTrend);
router.get('/plants/:plantId/growth-stats', optionalAuth, validateObjectId('plantId'), plantGrowthController.getStats);
router.get('/plants/:plantId/milestones', optionalAuth, validateObjectId('plantId'), plantGrowthController.getMilestones);
router.delete('/growth-log/:logId', optionalAuth, validateObjectId('logId'), plantGrowthController.deleteLog);
router.post('/growth-log/:logId/photo', optionalAuth, validateObjectId('logId'), plantGrowthController.addPhoto);
router.post('/growth-log/:logId/activity', optionalAuth, validateObjectId('logId'), plantGrowthController.addActivity);

// Plant Tracking Service Control (unified: replaces growth-logger)
router.post('/growth-logger/trigger', optionalAuth, async (req, res) => {
  try {
    await plantTrackingService.triggerNow();
    const status = plantTrackingService.getStatus();
    res.json({
      success: true,
      message: 'Plant tracking manually triggered',
      lastRun: status.lastDailySave
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error triggering plant tracking'
    });
  }
});

router.get('/growth-logger/status', optionalAuth, (req, res) => {
  const status = plantTrackingService.getStatus();
  res.json({
    success: true,
    data: {
      running: status.isRunning,
      lastRun: status.lastDailySave,
      checkIntervalHours: 24, // Daily
      trackedPlants: status.trackedPlants,
      dataPoints: status.dataPoints,
      collectionIntervalMinutes: status.collectionIntervalMinutes
    }
  });
});

// ==========================================
// PLANT HEIGHT & ANALYSIS (VL53L0X + Gemini)
// ==========================================

// Aktuelle Höhendaten (letzter SensorLog)
router.get('/plants/heights', optionalAuth, async (req, res) => {
  try {
    const SensorLog = require('../models/SensorLog');
    const latestLog = await SensorLog.findOne()
      .sort({ timestamp: -1 })
      .select('readings.heights timestamp')
      .lean();

    if (!latestLog || !latestLog.readings?.heights) {
      return res.json({
        success: true,
        data: { heights: [], timestamp: null }
      });
    }

    res.json({
      success: true,
      data: {
        heights: latestLog.readings.heights,
        timestamp: latestLog.timestamp
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manuelle Gemini-Analyse auslösen
router.post('/plants/analysis/trigger', optionalAuth, async (req, res) => {
  try {
    const results = await plantAnalysisService.analyzeAllPlants();
    res.json({
      success: true,
      message: 'Plant analysis completed',
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analyse-Status abrufen
router.get('/plants/analysis/status', optionalAuth, (req, res) => {
  const status = plantAnalysisService.getStatus();
  res.json({ success: true, data: status });
});

// ==========================================
// KALENDER DAILY/MONTH SUMMARY
// ==========================================
router.get('/calendar/daily-summary/:date', optionalAuth, calendarController.getDailySummary);
router.get('/calendar/month-summary/:year/:month', optionalAuth, calendarController.getMonthSummary);
router.get('/calendar/day-detail/:date', optionalAuth, calendarController.getDayDetail);
router.get('/calendar/week-comparison/:year/:week', optionalAuth, calendarController.getWeekComparison);
router.get('/calendar/trends/:year/:month', optionalAuth, calendarController.getMonthTrends);

// ==========================================
// PREDICTIVE MAINTENANCE (KI-basiert)
// ==========================================
router.use('/maintenance', maintenanceRoutes);

module.exports = router;
