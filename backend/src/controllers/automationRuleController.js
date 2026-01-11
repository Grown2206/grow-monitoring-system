const AutomationRule = require('../models/AutomationRule');
const automationEngine = require('../services/automationEngine');

/**
 * Hole alle Rules
 */
exports.getAll = async (req, res) => {
  try {
    const { enabled, group, tags } = req.query;

    const filter = {};
    if (enabled !== undefined) filter.enabled = enabled === 'true';
    if (group) filter.group = group;
    if (tags) filter.tags = { $in: tags.split(',') };

    const rules = await AutomationRule.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .populate('dependsOn', 'name enabled')
      .populate('conflictsWith', 'name enabled');

    res.json({
      success: true,
      count: rules.length,
      data: rules
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Rules:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Rules'
    });
  }
};

/**
 * Hole einzelne Rule
 */
exports.getById = async (req, res) => {
  try {
    const rule = await AutomationRule.findById(req.params.id)
      .populate('dependsOn')
      .populate('conflictsWith');

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Rule nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Rule:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Rule'
    });
  }
};

/**
 * Erstelle neue Rule
 */
exports.create = async (req, res) => {
  try {
    const ruleData = req.body;

    const rule = new AutomationRule(ruleData);
    await rule.save();

    res.status(201).json({
      success: true,
      message: 'Rule erfolgreich erstellt',
      data: rule
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Rule:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen der Rule'
    });
  }
};

/**
 * Aktualisiere Rule
 */
exports.update = async (req, res) => {
  try {
    const ruleData = req.body;

    const rule = await AutomationRule.findByIdAndUpdate(
      req.params.id,
      ruleData,
      { new: true, runValidators: true }
    );

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Rule nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Rule erfolgreich aktualisiert',
      data: rule
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Rule:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren der Rule'
    });
  }
};

/**
 * Lösche Rule
 */
exports.delete = async (req, res) => {
  try {
    const rule = await AutomationRule.findByIdAndDelete(req.params.id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Rule nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Rule erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Rule:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen der Rule'
    });
  }
};

/**
 * Toggle enabled Status
 */
exports.toggle = async (req, res) => {
  try {
    const rule = await AutomationRule.findById(req.params.id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Rule nicht gefunden'
      });
    }

    rule.enabled = !rule.enabled;
    await rule.save();

    res.json({
      success: true,
      message: rule.enabled ? 'Rule aktiviert' : 'Rule deaktiviert',
      data: rule
    });
  } catch (error) {
    console.error('Fehler beim Umschalten der Rule:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Umschalten der Rule'
    });
  }
};

/**
 * Simuliere Rule (Dry-Run)
 */
exports.simulate = async (req, res) => {
  try {
    const { sensorData } = req.body;

    const result = await automationEngine.simulateRule(req.params.id, sensorData);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Fehler bei der Simulation:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Simulation: ' + error.message
    });
  }
};

/**
 * Trigger Rule manuell
 */
exports.trigger = async (req, res) => {
  try {
    const rule = await AutomationRule.findById(req.params.id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Rule nicht gefunden'
      });
    }

    await automationEngine.processRule(rule);

    res.json({
      success: true,
      message: 'Rule erfolgreich ausgeführt',
      data: {
        executionCount: rule.executionCount,
        lastExecuted: rule.lastExecuted,
        lastResult: rule.lastResult
      }
    });
  } catch (error) {
    console.error('Fehler beim Triggern der Rule:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Triggern der Rule'
    });
  }
};

/**
 * Engine Status
 */
exports.getEngineStatus = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        running: automationEngine.running,
        checkInterval: automationEngine.checkIntervalMs,
        lastSensorData: automationEngine.lastSensorData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen des Engine-Status'
    });
  }
};

/**
 * Start/Stop Engine
 */
exports.toggleEngine = async (req, res) => {
  try {
    if (automationEngine.running) {
      automationEngine.stop();
    } else {
      automationEngine.start();
    }

    res.json({
      success: true,
      message: automationEngine.running ? 'Engine gestartet' : 'Engine gestoppt',
      data: { running: automationEngine.running }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Fehler beim Umschalten der Engine'
    });
  }
};

module.exports = exports;
