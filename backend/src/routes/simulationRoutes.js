const express = require('express');
const router = express.Router();
const simulationController = require('../controllers/simulationController');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Öffentliche Route für Presets
router.get('/presets', simulationController.getPresets);

// Öffentliche Route für öffentliche Simulationen
router.get('/public', simulationController.getPublicSimulations);

// Simulation erstellen (optional auth - funktioniert mit und ohne Login)
router.post('/run', optionalAuth, simulationController.runSimulation);

// Parameter optimieren (optional auth)
router.post('/optimize', optionalAuth, simulationController.optimizeParameters);

// Simulationen vergleichen (optional auth)
router.post('/compare', optionalAuth, simulationController.compareSimulations);

// Geschützte Routen (erfordern Authentifizierung)
router.use(authenticate);

// Einzelne Simulation abrufen
router.get('/:id', simulationController.getSimulation);

// Simulation aktualisieren (Name, Tags, Sichtbarkeit)
router.patch('/:id', simulationController.updateSimulation);

// Simulation löschen
router.delete('/:id', simulationController.deleteSimulation);

// User-Simulationen abrufen (mit Pagination und Filterung)
router.get('/', simulationController.getUserSimulations);

// Statistiken abrufen
router.get('/stats/overview', simulationController.getStatistics);

module.exports = router;
