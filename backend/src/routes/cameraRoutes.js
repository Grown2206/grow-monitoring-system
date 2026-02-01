const express = require('express');
const router = express.Router();
const cameraController = require('../controllers/cameraController');
const { optionalAuth } = require('../middleware/auth');

/**
 * Camera Management Routes
 * Multi-Kamera Support mit Snapshot-Galerie und Timelapse
 */

// ==========================================
// KAMERA-VERWALTUNG
// ==========================================

// Alle Kameras abrufen
router.get('/', optionalAuth, cameraController.getCameras);

// Kamera hinzufügen
router.post('/', optionalAuth, cameraController.addCamera);

// Kamera aktualisieren
router.put('/:id', optionalAuth, cameraController.updateCamera);

// Kamera löschen
router.delete('/:id', optionalAuth, cameraController.deleteCamera);

// Kamera-Status abrufen (Ping/Health-Check)
router.get('/:id/status', optionalAuth, cameraController.getCameraStatus);

// Heartbeat von ESP32-CAM empfangen
router.post('/heartbeat', cameraController.receiveHeartbeat);

// Alle Kamera-Status abrufen (für Frontend-Polling)
router.get('/status/all', optionalAuth, cameraController.getAllCameraStatus);

// ==========================================
// SNAPSHOTS
// ==========================================

// Alle Snapshots abrufen
router.get('/snapshots', optionalAuth, cameraController.getSnapshots);

// Snapshot von Kamera aufnehmen
router.post('/:id/snapshot', optionalAuth, cameraController.takeSnapshot);

// Snapshot löschen
router.delete('/snapshots/:snapshotId', optionalAuth, cameraController.deleteSnapshot);

// Mehrere Snapshots löschen
router.post('/snapshots/delete-batch', optionalAuth, cameraController.deleteSnapshots);

// Snapshot-Bild abrufen
router.get('/snapshots/:snapshotId/image', cameraController.getSnapshotImage);

// ==========================================
// TIMELAPSE
// ==========================================

// Timelapse aus Snapshots generieren
router.post('/timelapse/generate', optionalAuth, cameraController.generateTimelapse);

// Timelapse-Status abrufen
router.get('/timelapse/status/:jobId', optionalAuth, cameraController.getTimelapseStatus);

// Alle Timelapse-Videos abrufen
router.get('/timelapse/videos', optionalAuth, cameraController.getTimelapseVideos);

// Timelapse-Video löschen
router.delete('/timelapse/videos/:videoId', optionalAuth, cameraController.deleteTimelapseVideo);

// ==========================================
// KAMERA-EINSTELLUNGEN
// ==========================================

// Einstellungen von Kamera abrufen
router.get('/:id/settings', optionalAuth, cameraController.getCameraSettings);

// Einstellungen an Kamera senden
router.post('/:id/settings', optionalAuth, cameraController.updateCameraSettings);

// Flash toggle
router.post('/:id/flash', optionalAuth, cameraController.toggleFlash);

// ==========================================
// DIAGNOSTICS
// ==========================================

// Kamera-Diagnose (Ping, Settings, Speicher, Snapshots)
router.get('/:id/diagnostics', optionalAuth, cameraController.getCameraDiagnostics);

module.exports = router;
