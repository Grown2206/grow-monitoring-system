const AutomationRule = require('../models/AutomationRule');
const mqttService = require('./mqttService');
const { TOPICS } = require('../config/mqtt');

/**
 * Automation Engine
 * Evaluiert und führt If-Then-Else Rules aus
 */
class AutomationEngine {
  constructor() {
    this.running = false;
    this.interval = null;
    this.checkIntervalMs = 5000; // Alle 5 Sekunden prüfen
    this.lastSensorData = {};
  }

  /**
   * Starte Automation Engine
   */
  start() {
    if (this.running) {
      console.log('⚠️  Automation Engine läuft bereits');
      return;
    }

    console.log('🤖 Automation Engine gestartet');
    this.running = true;

    this.interval = setInterval(() => {
      this.processRules();
    }, this.checkIntervalMs);
  }

  /**
   * Stoppe Automation Engine
   */
  stop() {
    if (!this.running) return;

    console.log('🛑 Automation Engine gestoppt');
    this.running = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Update Sensor Daten
   */
  updateSensorData(data) {
    this.lastSensorData = {
      ...this.lastSensorData,
      ...data,
      timestamp: new Date()
    };
  }

  /**
   * Verarbeite alle aktiven Rules
   */
  async processRules() {
    try {
      // Hole alle enabled Rules, sortiert nach Priorität
      const rules = await AutomationRule.find({ enabled: true })
        .sort({ priority: -1 })
        .populate('dependsOn')
        .populate('conflictsWith');

      for (const rule of rules) {
        await this.processRule(rule);
      }
    } catch (error) {
      console.error('❌ Fehler beim Verarbeiten der Rules:', error);
    }
  }

  /**
   * Verarbeite einzelne Rule
   */
  async processRule(rule) {
    try {
      // Prüfe ob Rule ausgeführt werden kann
      if (!rule.canExecute()) {
        return;
      }

      // Prüfe Dependencies
      if (rule.dependsOn && rule.dependsOn.length > 0) {
        for (const dep of rule.dependsOn) {
          if (!dep.enabled) {
            console.log(`⏸️  Rule "${rule.name}" übersprungen: Abhängigkeit "${dep.name}" nicht aktiv`);
            return;
          }
        }
      }

      // Prüfe Konflikte
      if (rule.conflictsWith && rule.conflictsWith.length > 0) {
        for (const conflict of rule.conflictsWith) {
          if (conflict.enabled && conflict.lastExecuted) {
            const timeSince = (Date.now() - conflict.lastExecuted.getTime()) / 1000;
            if (timeSince < 60) { // Wenn konfliktieren Rule in letzter Minute aktiv
              console.log(`⚠️  Rule "${rule.name}" übersprungen: Konflikt mit "${conflict.name}"`);
              rule.lastResult = 'skipped';
              await rule.save();
              return;
            }
          }
        }
      }

      // Evaluiere Conditions
      const conditionsMet = rule.evaluate(this.lastSensorData, new Date());

      // Test Mode: Nur loggen, nicht ausführen
      if (rule.testMode) {
        console.log(`🧪 [TEST] Rule "${rule.name}": Conditions ${conditionsMet ? 'erfüllt' : 'nicht erfüllt'}`);
        rule.testResults.push({
          timestamp: new Date(),
          conditions: this.lastSensorData,
          result: conditionsMet ? 'met' : 'not_met',
          actions: conditionsMet ? rule.actions.map(a => a.command) : rule.elseActions.map(a => a.command)
        });

        // Behalte nur letzte 100 Test-Results
        if (rule.testResults.length > 100) {
          rule.testResults = rule.testResults.slice(-100);
        }

        await rule.save();
        return;
      }

      // Wähle Actions basierend auf Conditions
      const actionsToExecute = conditionsMet ? rule.actions : rule.elseActions;

      if (!actionsToExecute || actionsToExecute.length === 0) {
        return;
      }

      // Führe Actions aus
      console.log(`✅ Rule "${rule.name}": Führe ${actionsToExecute.length} Aktionen aus (Conditions: ${conditionsMet ? 'erfüllt' : 'else'})`);

      for (const action of actionsToExecute) {
        await this.executeAction(action, rule.name);
      }

      // Update Rule Statistics
      rule.executionCount += 1;
      rule.lastExecuted = new Date();
      rule.lastResult = 'success';
      await rule.save();

    } catch (error) {
      console.error(`❌ Fehler bei Rule "${rule.name}":`, error);
      rule.lastResult = 'failed';
      await rule.save();
    }
  }

  /**
   * Führe einzelne Action aus
   */
  async executeAction(action, ruleName) {
    try {
      switch (action.type) {
        case 'mqtt':
          // ESP32 erwartet Format: { action: "set_relay", relay: "light", state: true }
          // oder: { action: "set_fan_pwm", value: 128 }
          let command = {};

          // Map action.command to ESP32 action format
          if (action.command === 'ON' || action.command === 'OFF') {
            command = {
              action: 'set_relay',
              relay: action.device, // z.B. "light", "fan_exhaust"
              state: action.command === 'ON'
            };
          } else if (action.command === 'PWM' || action.command === 'SET_PWM') {
            // PWM Steuerung (0-100 -> 0-255)
            const pwmValue = Math.round((action.value / 100) * 255);
            if (action.device === 'fan_exhaust' || action.device === 'fan') {
              command = {
                action: 'set_fan_pwm',
                value: pwmValue
              };
            } else if (action.device === 'light' || action.device === 'grow_light') {
              command = {
                action: 'set_light_pwm',
                value: pwmValue
              };
            }
          } else {
            // Fallback: Direkt durchreichen
            command = {
              action: action.command,
              device: action.device,
              value: action.value
            };
          }

          mqttService.publish(TOPICS.COMMAND, JSON.stringify(command));
          console.log(`📡 [${ruleName}] MQTT Command: ${JSON.stringify(command)}`);
          break;

        case 'delay':
          console.log(`⏱️  [${ruleName}] Delay: ${action.delay}s`);
          await new Promise(resolve => setTimeout(resolve, action.delay * 1000));
          break;

        case 'notification':
          console.log(`🔔 [${ruleName}] Notification: ${action.message}`);
          // Hier könnte Push-Notification gesendet werden
          break;

        case 'rule':
          console.log(`🔗 [${ruleName}] Regel-Aktion: ${action.targetRule} -> ${action.targetAction}`);
          const targetRule = await AutomationRule.findById(action.targetRule);
          if (targetRule) {
            if (action.targetAction === 'enable') targetRule.enabled = true;
            if (action.targetAction === 'disable') targetRule.enabled = false;
            if (action.targetAction === 'trigger') await this.processRule(targetRule);
            await targetRule.save();
          }
          break;

        default:
          console.log(`⚠️  Unbekannte Action: ${action.type}`);
      }
    } catch (error) {
      console.error(`❌ Fehler beim Ausführen der Action:`, error);
    }
  }

  /**
   * Simuliere Rule (Dry-Run)
   */
  async simulateRule(ruleId, sensorData = null) {
    const rule = await AutomationRule.findById(ruleId);
    if (!rule) {
      throw new Error('Rule nicht gefunden');
    }

    const testData = sensorData || this.lastSensorData;
    const conditionsMet = rule.evaluate(testData, new Date());

    return {
      ruleName: rule.name,
      conditionsMet,
      sensorData: testData,
      actionsToExecute: conditionsMet ? rule.actions : rule.elseActions,
      canExecute: rule.canExecute(),
      executionCount: rule.executionCount,
      lastExecuted: rule.lastExecuted
    };
  }
}

// Singleton Instance
const automationEngine = new AutomationEngine();

module.exports = automationEngine;
