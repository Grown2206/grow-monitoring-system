const express = require('express');
const router = express.Router();
const nutrientController = require('../controllers/nutrientController');
const { authenticate } = require('../middleware/auth');

// Optional: Authentifizierung aktivieren wenn gewünscht
// Aktuell ohne Auth für einfacheren Start
// const auth = authenticate;
const auth = (req, res, next) => next();  // Bypass für Development

// ==========================================
// SCHEDULES (Zeitpläne)
// ==========================================

// GET /api/nutrients/schedules - Alle Zeitpläne
router.get('/schedules', auth, nutrientController.getSchedules);

// GET /api/nutrients/schedules/:id - Einzelner Zeitplan
router.get('/schedules/:id', auth, nutrientController.getSchedule);

// POST /api/nutrients/schedules - Neuen Zeitplan erstellen
router.post('/schedules', auth, nutrientController.createSchedule);

// PUT /api/nutrients/schedules/:id - Zeitplan aktualisieren
router.put('/schedules/:id', auth, nutrientController.updateSchedule);

// DELETE /api/nutrients/schedules/:id - Zeitplan löschen
router.delete('/schedules/:id', auth, nutrientController.deleteSchedule);

// POST /api/nutrients/schedules/:id/toggle - Aktivieren/Deaktivieren
router.post('/schedules/:id/toggle', auth, nutrientController.toggleSchedule);

// ==========================================
// DOSIERUNG
// ==========================================

// POST /api/nutrients/dose - Manuelle Dosierung
router.post('/dose', auth, nutrientController.manualDose);

// ==========================================
// RESERVOIR
// ==========================================

// GET /api/nutrients/reservoir - Status abrufen
router.get('/reservoir', auth, nutrientController.getReservoirState);

// PUT /api/nutrients/reservoir/refill - Auffüllen
router.put('/reservoir/refill', auth, nutrientController.refillReservoir);

// PUT /api/nutrients/reservoir/water-change - Wasserwechsel
router.put('/reservoir/water-change', auth, nutrientController.waterChange);

// ==========================================
// LOGS & STATS
// ==========================================

// GET /api/nutrients/logs - Dosierungs-Historie
router.get('/logs', auth, nutrientController.getDosageLogs);

// GET /api/nutrients/stats - Statistiken
router.get('/stats', auth, nutrientController.getStats);

// ==========================================
// KALIBRIERUNG
// ==========================================

// POST /api/nutrients/calibrate - Sensor kalibrieren
router.post('/calibrate', auth, nutrientController.calibrateSensor);

module.exports = router;
