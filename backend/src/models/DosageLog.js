const mongoose = require('mongoose');

/**
 * Dosierungs-Logbuch
 * Speichert jede durchgeführte Nährstoff-Dosierung
 */

const DosageLogSchema = new mongoose.Schema({
  // Verknüpfung
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NutrientSchedule',
    required: false  // Bei manueller Dosierung kein Schedule
  },

  plantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plant',
    required: false
  },

  // ==========================================
  // DOSIERUNGS-DETAILS
  // ==========================================
  dosage: {
    // Version 1.0: Single Pump
    singlePump: {
      pumpId: { type: Number, default: 1 },
      ml_dosed: { type: Number, required: true },
      duration_seconds: { type: Number },  // Wie lange Pumpe lief
      flowRate_ml_per_min: { type: Number, default: 100 }
    },

    // Version 2.0: Multi Pump (für Zukunft)
    multiPump: [{
      name: { type: String },
      pumpId: { type: Number },
      ml_dosed: { type: Number },
      duration_seconds: { type: Number }
    }],

    // Gesamt
    totalVolume_ml: {
      type: Number,
      required: true,
      description: 'Summe aller Nährstoffe'
    }
  },

  // ==========================================
  // WASSER-VOLUMEN
  // ==========================================
  waterVolume_liters: {
    type: Number,
    required: true,
    description: 'Wie viel Wasser wurde gedüngt'
  },

  // Konzentration (berechnet)
  concentration_ml_per_liter: {
    type: Number,
    description: 'ml Dünger pro Liter Wasser'
  },

  // ==========================================
  // SENSOR-MESSUNGEN (Vorher/Nachher)
  // ==========================================
  measurements: {
    before: {
      ec: { type: Number },
      ph: { type: Number },
      temp: { type: Number },
      timestamp: { type: Date }
    },

    after: {
      ec: { type: Number },
      ph: { type: Number },
      temp: { type: Number },
      timestamp: { type: Date }
    },

    // Differenzen (automatisch berechnet)
    delta: {
      ec: { type: Number },
      ph: { type: Number }
    }
  },

  // ==========================================
  // STATUS & FEHLER
  // ==========================================
  status: {
    type: String,
    enum: ['success', 'partial', 'failed', 'cancelled'],
    default: 'success',
    required: true
  },

  errors: [{
    code: { type: String },
    message: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],

  // ==========================================
  // TRIGGER-TYP
  // ==========================================
  triggeredBy: {
    type: {
      type: String,
      enum: ['schedule', 'adaptive', 'manual'],
      required: true
    },

    // Bei manuell: Welcher User?
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // Bei adaptiv: Welcher Sensor-Wert war Trigger?
    adaptiveTrigger: {
      reason: { type: String },  // "EC zu niedrig"
      value: { type: Number }    // Gemessener Wert
    }
  },

  // ==========================================
  // META
  // ==========================================
  notes: {
    type: String,
    description: 'Benutzer-Notizen zur Dosierung'
  },

  // ESP32-Feedback
  deviceFeedback: {
    reservoirLevelBefore_percent: { type: Number },
    reservoirLevelAfter_percent: { type: Number },
    pumpOperational: { type: Boolean, default: true },
    warnings: [{ type: String }]
  }

}, {
  timestamps: true  // createdAt, updatedAt
});

// ==========================================
// INDEXES
// ==========================================
DosageLogSchema.index({ scheduleId: 1, createdAt: -1 });
DosageLogSchema.index({ plantId: 1, createdAt: -1 });
DosageLogSchema.index({ status: 1 });
DosageLogSchema.index({ 'triggeredBy.type': 1 });
DosageLogSchema.index({ createdAt: -1 });  // Neueste zuerst

// ==========================================
// PRE-SAVE HOOK
// ==========================================
DosageLogSchema.pre('save', function(next) {
  // Berechne Konzentration
  if (this.dosage.totalVolume_ml && this.waterVolume_liters) {
    this.concentration_ml_per_liter = this.dosage.totalVolume_ml / this.waterVolume_liters;
  }

  // Berechne Deltas
  if (this.measurements.before.ec && this.measurements.after.ec) {
    this.measurements.delta.ec = this.measurements.after.ec - this.measurements.before.ec;
  }
  if (this.measurements.before.ph && this.measurements.after.ph) {
    this.measurements.delta.ph = this.measurements.after.ph - this.measurements.before.ph;
  }

  next();
});

// ==========================================
// STATISCHE METHODEN
// ==========================================

/**
 * Hole Dosierungs-Statistik für Zeitraum
 */
DosageLogSchema.statics.getStats = async function(startDate, endDate) {
  const logs = await this.find({
    createdAt: { $gte: startDate, $lte: endDate },
    status: 'success'
  });

  const totalDosages = logs.length;
  const totalVolume = logs.reduce((sum, log) => sum + log.dosage.totalVolume_ml, 0);
  const avgConcentration = logs.length > 0
    ? logs.reduce((sum, log) => sum + (log.concentration_ml_per_liter || 0), 0) / logs.length
    : 0;

  const avgECIncrease = logs
    .filter(log => log.measurements.delta.ec)
    .reduce((sum, log) => sum + log.measurements.delta.ec, 0) / (logs.length || 1);

  return {
    totalDosages,
    totalVolume_ml: totalVolume,
    totalVolume_liters: totalVolume / 1000,
    avgConcentration_ml_per_liter: avgConcentration,
    avgECIncrease
  };
};

/**
 * Hole letzte Dosierung für Schedule
 */
DosageLogSchema.statics.getLastDosage = async function(scheduleId) {
  return this.findOne({ scheduleId }).sort({ createdAt: -1 });
};

/**
 * Anzahl Dosierungen heute
 */
DosageLogSchema.statics.getTodayCount = async function(scheduleId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return this.countDocuments({
    scheduleId,
    createdAt: { $gte: today },
    status: 'success'
  });
};

module.exports = mongoose.model('DosageLog', DosageLogSchema);
