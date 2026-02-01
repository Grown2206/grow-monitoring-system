const mongoose = require('mongoose');

/**
 * Automation Rule Model
 * If-Then-Else Regeln für erweiterte Automation
 */

const conditionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['sensor', 'time', 'schedule', 'manual', 'state'],
    required: true
  },
  sensor: String,              // z.B. 'temperature', 'humidity', 'vpd'
  operator: {
    type: String,
    enum: ['>', '<', '>=', '<=', '==', '!=', 'between'],
    default: '>'
  },
  value: mongoose.Schema.Types.Mixed,  // Kann Number, String, Array sein
  value2: Number,              // Für 'between' operator
  // Time condition fields (both naming conventions supported)
  timeStart: String,           // HH:MM (legacy)
  timeEnd: String,             // HH:MM (legacy)
  startTime: String,           // HH:MM (new)
  endTime: String,             // HH:MM (new)
  timeMode: {                  // Modus für Zeit-Bedingung
    type: String,
    enum: ['between', 'before', 'after'],
    default: 'between'
  },
  days: [Number],              // 0-6 (Sonntag-Samstag)
  logicOperator: {
    type: String,
    enum: ['AND', 'OR'],
    default: 'AND'
  }
}, { _id: false });

const actionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['mqtt', 'delay', 'notification', 'state', 'rule'],
    required: true
  },
  device: String,              // z.B. 'fan', 'light', 'pump'
  command: String,             // z.B. 'set_pwm', 'toggle'
  value: mongoose.Schema.Types.Mixed,
  delay: Number,               // in Sekunden
  message: String,
  targetRule: String,          // Für type='rule'
  targetAction: String         // 'enable', 'disable', 'trigger'
}, { _id: false });

const automationRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,

  // If-Then-Else Structure
  conditions: [conditionSchema],    // If
  actions: [actionSchema],          // Then
  elseActions: [actionSchema],      // Else (optional)

  // Rule Settings
  enabled: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 50,        // 0-100, höher = wichtiger
    min: 0,
    max: 100
  },
  cooldown: {
    type: Number,
    default: 0,         // Sekunden zwischen Ausführungen
    min: 0
  },
  maxExecutions: {
    type: Number,
    default: 0          // 0 = unbegrenzt
  },

  // State & Statistics
  executionCount: {
    type: Number,
    default: 0
  },
  lastExecuted: Date,
  lastResult: {
    type: String,
    enum: ['success', 'failed', 'skipped', null],
    default: null
  },

  // Dependencies
  dependsOn: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AutomationRule'
  }],
  conflictsWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AutomationRule'
  }],

  // Grouping & Tags
  group: String,
  tags: [String],

  // Simulation Mode
  testMode: {
    type: Boolean,
    default: false
  },
  testResults: [{
    timestamp: Date,
    conditions: mongoose.Schema.Types.Mixed,
    result: String,
    actions: [String]
  }]
}, {
  timestamps: true
});

// Indizes
automationRuleSchema.index({ enabled: 1, priority: -1 });
automationRuleSchema.index({ group: 1 });
automationRuleSchema.index({ tags: 1 });

// Methods
automationRuleSchema.methods.evaluate = function(sensorData, currentTime) {
  // Evaluiere alle Bedingungen
  let conditionsMet = true;

  for (const condition of this.conditions) {
    const result = evaluateCondition(condition, sensorData, currentTime);

    if (condition.logicOperator === 'AND') {
      conditionsMet = conditionsMet && result;
    } else {
      conditionsMet = conditionsMet || result;
    }
  }

  return conditionsMet;
};

automationRuleSchema.methods.canExecute = function() {
  // Prüfe Cooldown
  if (this.cooldown > 0 && this.lastExecuted) {
    const timeSince = (Date.now() - this.lastExecuted.getTime()) / 1000;
    if (timeSince < this.cooldown) {
      return false;
    }
  }

  // Prüfe Max Executions
  if (this.maxExecutions > 0 && this.executionCount >= this.maxExecutions) {
    return false;
  }

  return this.enabled;
};

function evaluateCondition(condition, sensorData, currentTime) {
  switch (condition.type) {
    case 'sensor':
      const sensorValue = sensorData[condition.sensor];
      if (sensorValue === undefined) return false;

      switch (condition.operator) {
        case '>': return sensorValue > condition.value;
        case '<': return sensorValue < condition.value;
        case '>=': return sensorValue >= condition.value;
        case '<=': return sensorValue <= condition.value;
        case '==': return sensorValue == condition.value;
        case '!=': return sensorValue != condition.value;
        case 'between':
          return sensorValue >= condition.value && sensorValue <= condition.value2;
        default: return false;
      }

    case 'time':
      const now = currentTime || new Date();
      const currentHM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Support both naming conventions (startTime/endTime and timeStart/timeEnd)
      const startT = condition.startTime || condition.timeStart;
      const endT = condition.endTime || condition.timeEnd;
      const mode = condition.timeMode || 'between';

      if (!startT) return false;

      switch (mode) {
        case 'between':
          if (!endT) return false;
          // Handle overnight time ranges (e.g., 22:00 - 06:00)
          if (startT > endT) {
            return currentHM >= startT || currentHM <= endT;
          }
          return currentHM >= startT && currentHM <= endT;
        case 'before':
          return currentHM < startT;
        case 'after':
          return currentHM >= startT;
        default:
          return false;
      }

    case 'schedule':
      if (!condition.days || condition.days.length === 0) return true;
      const day = (currentTime || new Date()).getDay();
      return condition.days.includes(day);

    default:
      return false;
  }
}

module.exports = mongoose.model('AutomationRule', automationRuleSchema);
