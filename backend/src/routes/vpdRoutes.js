const express = require('express');
const router = express.Router();
const vpdController = require('../controllers/vpdController');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Optional: Authentifizierung aktivieren wenn gewünscht
// Aktuell ohne Auth für einfacheren Start
const auth = (req, res, next) => next();  // Bypass für Development

// ==========================================
// CURRENT STATUS & DATA
// ==========================================

/**
 * GET /api/vpd/current
 * Aktuelles VPD mit vollständiger Analyse
 */
router.get('/current', auth, vpdController.getCurrent);

/**
 * GET /api/vpd/history
 * VPD-Verlauf (Query: hours, limit)
 */
router.get('/history', auth, vpdController.getHistory);

/**
 * GET /api/vpd/statistics
 * Performance-Statistiken (Query: days)
 */
router.get('/statistics', auth, vpdController.getStatistics);

// ==========================================
// CONFIGURATION
// ==========================================

/**
 * GET /api/vpd/config
 * Aktuelle Konfiguration abrufen
 */
router.get('/config', auth, vpdController.getConfig);

/**
 * PUT /api/vpd/config
 * Konfiguration aktualisieren
 */
router.put('/config', auth, vpdController.updateConfig);

/**
 * POST /api/vpd/config/reset
 * Konfiguration zurücksetzen
 */
router.post('/config/reset', auth, vpdController.resetConfig);

/**
 * POST /api/vpd/config/statistics/reset
 * Statistiken zurücksetzen
 */
router.post('/config/statistics/reset', auth, vpdController.resetStatistics);

// ==========================================
// CONTROL
// ==========================================

/**
 * POST /api/vpd/enable
 * Auto-VPD aktivieren
 */
router.post('/enable', auth, vpdController.enable);

/**
 * POST /api/vpd/disable
 * Auto-VPD deaktivieren
 */
router.post('/disable', auth, vpdController.disable);

/**
 * POST /api/vpd/manual-adjust
 * Manuelle Fan-Anpassung
 * Body: { fanSpeed: 0-100 }
 */
router.post('/manual-adjust', auth, vpdController.manualAdjust);

// ==========================================
// UTILITIES
// ==========================================

/**
 * POST /api/vpd/calculate
 * VPD für beliebige Werte berechnen
 * Body: { temp, humidity, growStage? }
 */
router.post('/calculate', auth, vpdController.calculate);

module.exports = router;
