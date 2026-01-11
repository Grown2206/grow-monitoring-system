const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const maintenanceController = require('../controllers/maintenanceController');

/**
 * Predictive Maintenance Routes
 * Alle Routes verwenden optionalAuth - funktionieren mit und ohne Login
 */

// Dashboard Übersicht
router.get('/dashboard', optionalAuth, maintenanceController.getDashboard);

// Alle Geräte-Analytics
router.get('/analytics', optionalAuth, maintenanceController.getAllDeviceAnalytics);

// Spezifisches Gerät
router.get('/analytics/:deviceType/:deviceId', optionalAuth, maintenanceController.getDeviceAnalytics);

// Analytics aktualisieren
router.post('/analytics/:deviceType/:deviceId/update', optionalAuth, maintenanceController.updateDeviceAnalytics);

// Wartungs-Historie hinzufügen
router.post('/analytics/:deviceType/:deviceId/maintenance', optionalAuth, maintenanceController.addMaintenanceRecord);

// Standard-Geräte initialisieren
router.post('/initialize', optionalAuth, maintenanceController.initializeStandardDevices);

module.exports = router;
