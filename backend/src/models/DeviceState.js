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

// Statische Methode: Status updaten/erstellen (upsert - max 1 Dokument pro Device)
DeviceStateSchema.statics.updateState = async function(updates) {
  const device = updates.device || "esp32_main";

  // Build $set object für verschachtelte Felder
  const setObj = { timestamp: new Date() };
  if (updates.relays) {
    for (const [key, val] of Object.entries(updates.relays)) {
      setObj[`relays.${key}`] = val;
    }
  }
  if (updates.pwm) {
    for (const [key, val] of Object.entries(updates.pwm)) {
      setObj[`pwm.${key}`] = val;
    }
  }
  if (updates.feedback) {
    for (const [key, val] of Object.entries(updates.feedback)) {
      setObj[`feedback.${key}`] = val;
    }
  }
  if (updates.rj11) {
    for (const [key, val] of Object.entries(updates.rj11)) {
      setObj[`rj11.${key}`] = val;
    }
  }

  return this.findOneAndUpdate(
    { device },
    { $set: setObj },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

module.exports = mongoose.model('DeviceState', DeviceStateSchema);
