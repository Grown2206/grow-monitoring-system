const mongoose = require('mongoose');

const DeviceStateSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  device: {
    type: String,
    required: true,
    default: "esp32_main"
  },
  // Relais Status (ON/OFF)
  relays: {
    light: { type: Boolean, default: false },
    fan_exhaust: { type: Boolean, default: false },
    fan_circulation: { type: Boolean, default: false },
    pump_main: { type: Boolean, default: false },
    pump_mix: { type: Boolean, default: false },
    nutrient_pump: { type: Boolean, default: false },
    heater: { type: Boolean, default: false },
    dehumidifier: { type: Boolean, default: false }
  },
  // PWM Werte (0-100%)
  pwm: {
    fan_exhaust: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    grow_light: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  // Tachometer Feedback (RPM)
  feedback: {
    fan_exhaust_rpm: { type: Number, default: 0 }
  },
  // RJ11 Grow Light Erweiterte Steuerung
  rj11: {
    enabled: { type: Boolean, default: false },
    dimLevel: { type: Number, default: 100, min: 0, max: 100 },
    mode: {
      type: String,
      enum: ['off', 'on', 'dim', 'auto'],
      default: 'off'
    },
    spectrum: {
      red: { type: Number, default: 100, min: 0, max: 100 },
      blue: { type: Number, default: 100, min: 0, max: 100 },
      white: { type: Number, default: 100, min: 0, max: 100 }
    }
  }
}, {
  timestamps: true // Automatische createdAt & updatedAt Felder
});

// Index für schnelle Abfragen
DeviceStateSchema.index({ timestamp: -1 });
DeviceStateSchema.index({ device: 1 });

// Statische Methode: Neuesten Status holen
DeviceStateSchema.statics.getLatest = async function() {
  return this.findOne({}).sort({ timestamp: -1 }).lean();
};

// Statische Methode: Status updaten/erstellen
DeviceStateSchema.statics.updateState = async function(updates) {
  const currentState = await this.getLatest() || {};

  const newState = new this({
    device: updates.device || "esp32_main",
    relays: { ...currentState.relays, ...updates.relays },
    pwm: { ...currentState.pwm, ...updates.pwm },
    feedback: { ...currentState.feedback, ...updates.feedback },
    rj11: { ...currentState.rj11, ...updates.rj11 }
  });

  return newState.save();
};

module.exports = mongoose.model('DeviceState', DeviceStateSchema);
