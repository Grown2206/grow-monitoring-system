const { TOPICS } = require('../config/mqtt');
const { publishMessage } = require('../services/mqttService');

// MQTT Topics
const TOPIC_COMMAND = TOPICS.COMMAND;

/**
 * Quick Action Controller
 * Handles immediate hardware control commands
 */

// Set Fan Speed (0-100%)
exports.setFan = async (req, res) => {
  try {
    const { speed } = req.body;

    if (speed === undefined || speed < 0 || speed > 100) {
      return res.status(400).json({
        success: false,
        message: 'Speed must be between 0 and 100'
      });
    }

    // Send MQTT command to ESP32
    const command = {
      type: 'fan',
      value: speed,
      timestamp: Date.now()
    };

    publishMessage(TOPIC_COMMAND, JSON.stringify(command));

    console.log(`🌀 Quick Action: Fan → ${speed}%`);

    res.json({
      success: true,
      message: `Lüfter auf ${speed}% gesetzt`,
      command
    });
  } catch (error) {
    console.error('❌ Fan control error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Lüfter-Steuerung',
      error: error.message
    });
  }
};

// Toggle Light (on/off/toggle)
exports.setLight = async (req, res) => {
  try {
    const { value } = req.body;

    if (!['on', 'off', 'toggle'].includes(value)) {
      return res.status(400).json({
        success: false,
        message: 'Value must be "on", "off", or "toggle"'
      });
    }

    // Send MQTT command to ESP32
    const command = {
      type: 'light',
      value: value,
      timestamp: Date.now()
    };

    publishMessage(TOPIC_COMMAND, JSON.stringify(command));

    console.log(`💡 Quick Action: Light → ${value}`);

    res.json({
      success: true,
      message: `Licht ${value === 'on' ? 'eingeschaltet' : value === 'off' ? 'ausgeschaltet' : 'umgeschaltet'}`,
      command
    });
  } catch (error) {
    console.error('❌ Light control error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Licht-Steuerung',
      error: error.message
    });
  }
};

// Control Humidifier (on/off)
exports.setHumidifier = async (req, res) => {
  try {
    const { value } = req.body;

    if (!['on', 'off'].includes(value)) {
      return res.status(400).json({
        success: false,
        message: 'Value must be "on" or "off"'
      });
    }

    // Send MQTT command to ESP32
    const command = {
      type: 'humidifier',
      value: value,
      timestamp: Date.now()
    };

    publishMessage(TOPIC_COMMAND, JSON.stringify(command));

    console.log(`💧 Quick Action: Humidifier → ${value}`);

    res.json({
      success: true,
      message: `Luftbefeuchter ${value === 'on' ? 'eingeschaltet' : 'ausgeschaltet'}`,
      command
    });
  } catch (error) {
    console.error('❌ Humidifier control error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Luftbefeuchter-Steuerung',
      error: error.message
    });
  }
};

// Optimize VPD (auto-adjust fan and humidifier)
exports.optimizeVPD = async (req, res) => {
  try {
    const { currentVPD, targetVPD } = req.body;

    if (!currentVPD || !targetVPD) {
      return res.status(400).json({
        success: false,
        message: 'currentVPD and targetVPD are required'
      });
    }

    // Calculate adjustments
    const vpdDiff = currentVPD - targetVPD.max;
    let fanSpeed = 50;
    let humidifier = 'off';

    if (vpdDiff > 0.5) {
      // VPD too high - increase humidity, moderate fan
      fanSpeed = 70;
      humidifier = 'on';
    } else if (vpdDiff > 0.2) {
      // VPD slightly high - increase humidity
      fanSpeed = 60;
      humidifier = 'on';
    } else if (vpdDiff < -0.2) {
      // VPD too low - increase fan to lower humidity
      fanSpeed = 90;
      humidifier = 'off';
    }

    // Send commands
    const fanCommand = {
      type: 'fan',
      value: fanSpeed,
      timestamp: Date.now()
    };

    const humidifierCommand = {
      type: 'humidifier',
      value: humidifier,
      timestamp: Date.now()
    };

    publishMessage(TOPIC_COMMAND, JSON.stringify(fanCommand));
    setTimeout(() => {
      publishMessage(TOPIC_COMMAND, JSON.stringify(humidifierCommand));
    }, 100);

    console.log(`🌿 Quick Action: VPD Optimization → Fan: ${fanSpeed}%, Humidifier: ${humidifier}`);

    res.json({
      success: true,
      message: `VPD optimiert (${currentVPD.toFixed(2)} → ${targetVPD.max} kPa)`,
      actions: {
        fan: fanSpeed,
        humidifier: humidifier
      }
    });
  } catch (error) {
    console.error('❌ VPD optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei VPD-Optimierung',
      error: error.message
    });
  }
};

// Manual Nutrient Dosing
exports.doseNutrients = async (req, res) => {
  try {
    const { duration } = req.body;

    // Duration in seconds (default: 30s)
    const pumpDuration = duration || 30;

    if (pumpDuration < 1 || pumpDuration > 300) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be between 1 and 300 seconds'
      });
    }

    // Send MQTT command to ESP32
    const command = {
      type: 'pump',
      action: 'dose',
      duration: pumpDuration,
      timestamp: Date.now()
    };

    publishMessage(TOPIC_COMMAND, JSON.stringify(command));

    console.log(`💧 Quick Action: Nutrient Dosing → ${pumpDuration}s`);

    res.json({
      success: true,
      message: `Nährstoff-Dosierung gestartet (${pumpDuration}s)`,
      command
    });
  } catch (error) {
    console.error('❌ Nutrient dosing error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Nährstoff-Dosierung',
      error: error.message
    });
  }
};

// Emergency Stop - Turn everything off
exports.emergencyStop = async (req, res) => {
  try {
    const commands = [
      { type: 'light', value: 'off' },
      { type: 'fan', value: 0 },
      { type: 'humidifier', value: 'off' },
      { type: 'pump', action: 'stop' }
    ];

    // Send all stop commands
    commands.forEach((cmd, index) => {
      setTimeout(() => {
        publishMessage(TOPIC_COMMAND, JSON.stringify({
          ...cmd,
          timestamp: Date.now()
        }));
      }, index * 100);
    });

    console.log('🚨 Quick Action: EMERGENCY STOP - All systems off');

    res.json({
      success: true,
      message: 'NOT-AUS aktiviert - Alle Systeme gestoppt',
      commands
    });
  } catch (error) {
    console.error('❌ Emergency stop error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei NOT-AUS',
      error: error.message
    });
  }
};

// Get Quick Action History (last 50 actions)
let actionHistory = [];
const MAX_HISTORY = 50;

exports.logAction = (action) => {
  actionHistory.unshift({
    ...action,
    timestamp: Date.now()
  });

  // Keep only last 50 actions
  if (actionHistory.length > MAX_HISTORY) {
    actionHistory = actionHistory.slice(0, MAX_HISTORY);
  }
};

exports.getHistory = (req, res) => {
  res.json({
    success: true,
    history: actionHistory
  });
};
