const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Authentifizierung für Sensor-Kalibrierung
const auth = optionalAuth;  // optionalAuth erlaubt Zugriff auch ohne Token, loggt aber User

// ==========================================
// CURRENT READINGS & HISTORY
// ==========================================

/**
 * GET /api/sensors/current
 * Aktuelle Sensor-Werte (EC, pH, Temp)
 */
router.get('/current', auth, sensorController.getCurrent);

/**
 * GET /api/sensors/history
 * Sensor-Verlauf (Query: hours, limit)
 */
router.get('/history', auth, sensorController.getHistory);

// ==========================================
// CALIBRATION
// ==========================================

/**
 * GET /api/sensors/calibration/:type
 * Calibration-Status für EC oder pH
 */
router.get('/calibration/:type', auth, sensorController.getCalibration);

/**
 * POST /api/sensors/calibration/:type/start
 * Start Calibration Process
 * Body: { point: 'dry'|'low'|'mid'|'high', referenceValue: number }
 */
router.post('/calibration/:type/start', auth, sensorController.startCalibration);

/**
 * POST /api/sensors/calibration/:type/save
 * Save Calibration Point
 * Body: { point: 'dry'|'low'|'mid'|'high', referenceValue: number, measuredValue: number }
 */
router.post('/calibration/:type/save', auth, sensorController.saveCalibration);

/**
 * POST /api/sensors/calibration/:type/reset
 * Reset Calibration
 */
router.post('/calibration/:type/reset', auth, sensorController.resetCalibration);

// ==========================================
// VL53L0X ToF CALIBRATION
// ==========================================

router.get('/tof/config', auth, sensorController.getTofConfig);
router.post('/tof/config', auth, sensorController.saveTofConfig);
router.post('/tof/test/:slot', auth, sensorController.testTofSensor);

// ==========================================
// SENSOR COMMANDS
// ==========================================

/**
 * POST /api/sensors/read
 * Trigger Manual Sensor Reading
 */
router.post('/read', auth, sensorController.triggerReading);

/**
 * POST /api/sensors/temperature-compensation
 * Set Temperature Compensation
 * Body: { type: 'ec'|'ph', temperature: number }
 */
router.post('/temperature-compensation', auth, sensorController.setTemperatureCompensation);

module.exports = router;
