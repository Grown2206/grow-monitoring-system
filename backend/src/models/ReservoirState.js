const mongoose = require('mongoose');

/**
 * Reservoir-Status (Live-Zustand)
 * Speichert aktuellen Zustand von Haupt-Reservoir und Nährstoff-Kanistern
 */

const ReservoirStateSchema = new mongoose.Schema({
  // ==========================================
  // HAUPT-RESERVOIR (Gemischtes Wasser)
  // ==========================================
  main: {
    volume_liters: {
      type: Number,
      description: 'Aktueller Füllstand in Litern'
    },

    capacity_liters: {
      type: Number,
      default: 50,
      description: 'Maximale Kapazität'
    },

    // Messungen
    ec: {
      type: Number,
      description: 'Aktuelle EC in mS/cm'
    },

    ph: {
      type: Number,
      description: 'Aktueller pH-Wert'
    },

    temp: {
      type: Number,
      description: 'Wassertemperatur in °C'
    },

    // Wann wurde zuletzt aufgefüllt/gewechselt?
    lastRefill: {
      type: Date,
      description: 'Letztes komplettes Auffüllen'
    },

    lastChange: {
      type: Date,
      description: 'Letzter kompletter Wasserwechsel'
    },

    // Alter des Wassers (automatisch berechnet)
    age_days: {
      type: Number,
      description: 'Tage seit letztem Wechsel'
    }
  },

  // ==========================================
  // NÄHRSTOFF-RESERVOIRS (Kanister)
  // ==========================================
  reservoirs: [{
    pumpId: {
      type: Number,
      required: true,
      unique: true
    },

    name: {
      type: String,
      required: true,
      description: 'z.B. "5-in-1 Dünger"'
    },

    // Brand/Typ
    brand: {
      type: String,
      description: 'z.B. "BioBizz", "Advanced Nutrients"'
    },

    productName: {
      type: String,
      description: 'z.B. "Bio-Grow", "Sensi Bloom"'
    },

    // Füllstand
    volume_ml: {
      type: Number,
      required: true,
      default: 5000,
      description: 'Noch verfügbare Menge in ml'
    },

    capacity_ml: {
      type: Number,
      default: 5000,
      description: 'Maximale Kapazität (Standard 5L Kanister)'
    },

    // Prozentsatz (automatisch berechnet)
    level_percent: {
      type: Number,
      min: 0,
      max: 100
    },

    // Warnungen
    lowLevelWarning: {
      enabled: { type: Boolean, default: true },
      threshold_percent: { type: Number, default: 20 },
      isActive: { type: Boolean, default: false }
    },

    // Wartung
    lastRefill: {
      type: Date,
      description: 'Wann wurde aufgefüllt?'
    },

    expiryDate: {
      type: Date,
      description: 'Verfallsdatum des Düngers'
    },

    // Batch-Info
    batchNumber: {
      type: String,
      description: 'Chargen-Nummer für Qualitätskontrolle'
    }
  }],

  // ==========================================
  // SENSOR-KALIBRIERUNG
  // ==========================================
  calibration: {
    ec: {
      lastCalibration: { type: Date },
      drift_percent: {
        type: Number,
        default: 0,
        description: 'Abweichung in %'
      },
      calibrationValues: [{
        reference: { type: Number },  // Sollwert (z.B. 1.413 mS/cm)
        measured: { type: Number },   // Gemessener Wert
        timestamp: { type: Date }
      }]
    },

    ph: {
      lastCalibration: { type: Date },
      drift_percent: {
        type: Number,
        default: 0
      },
      calibrationValues: [{
        reference: { type: Number },  // Sollwert (z.B. 7.0)
        measured: { type: Number },
        timestamp: { type: Date }
      }]
    },

    // Erinnerung
    nextCalibration: {
      ec: { type: Date },
      ph: { type: Date }
    }
  },

  // ==========================================
  // SYSTEM-STATUS
  // ==========================================
  system: {
    pumpsOperational: {
      type: Boolean,
      default: true
    },

    sensorsOnline: {
      ec: { type: Boolean, default: false },
      ph: { type: Boolean, default: false },
      temp: { type: Boolean, default: false }
    },

    lastHeartbeat: {
      type: Date,
      description: 'Letztes Lebenszeichen vom ESP32'
    },

    errors: [{
      code: { type: String },
      message: { type: String },
      timestamp: { type: Date, default: Date.now }
    }]
  },

  // ==========================================
  // META
  // ==========================================
  notes: {
    type: String,
    description: 'Admin-Notizen'
  }

}, {
  timestamps: true
});

// ==========================================
// INDEXES
// ==========================================
ReservoirStateSchema.index({ 'reservoirs.pumpId': 1 });
ReservoirStateSchema.index({ updatedAt: -1 });

// ==========================================
// PRE-SAVE HOOKS
// ==========================================
ReservoirStateSchema.pre('save', function(next) {
  // Berechne Reservoir-Prozentsätze
  this.reservoirs.forEach(res => {
    if (res.capacity_ml > 0) {
      res.level_percent = Math.round((res.volume_ml / res.capacity_ml) * 100);
    }

    // Aktiviere Low-Level-Warning
    if (res.lowLevelWarning.enabled) {
      res.lowLevelWarning.isActive = res.level_percent < res.lowLevelWarning.threshold_percent;
    }
  });

  // Berechne Alter des Haupt-Wassers
  if (this.main.lastChange) {
    const now = new Date();
    const ageMS = now - this.main.lastChange;
    this.main.age_days = Math.floor(ageMS / (1000 * 60 * 60 * 24));
  }

  next();
});

// ==========================================
// METHODEN
// ==========================================

/**
 * Reduziere Reservoir-Level nach Dosierung
 */
ReservoirStateSchema.methods.consumeNutrient = function(pumpId, volume_ml) {
  const reservoir = this.reservoirs.find(r => r.pumpId === pumpId);

  if (!reservoir) {
    throw new Error(`Reservoir mit PumpID ${pumpId} nicht gefunden!`);
  }

  if (reservoir.volume_ml < volume_ml) {
    throw new Error(`Nicht genug Nährstoff in Reservoir ${pumpId}! Verfügbar: ${reservoir.volume_ml}ml, Benötigt: ${volume_ml}ml`);
  }

  reservoir.volume_ml -= volume_ml;
  return reservoir.volume_ml;
};

/**
 * Auffüllen eines Reservoirs
 */
ReservoirStateSchema.methods.refillReservoir = function(pumpId, volume_ml) {
  const reservoir = this.reservoirs.find(r => r.pumpId === pumpId);

  if (!reservoir) {
    throw new Error(`Reservoir mit PumpID ${pumpId} nicht gefunden!`);
  }

  reservoir.volume_ml = Math.min(reservoir.volume_ml + volume_ml, reservoir.capacity_ml);
  reservoir.lastRefill = new Date();

  return reservoir.volume_ml;
};

/**
 * Prüfe ob Dosierung möglich ist
 */
ReservoirStateSchema.methods.canDose = function(pumpId, required_ml) {
  const reservoir = this.reservoirs.find(r => r.pumpId === pumpId);

  if (!reservoir) {
    return { ok: false, reason: 'Reservoir nicht gefunden' };
  }

  if (reservoir.volume_ml < required_ml) {
    return {
      ok: false,
      reason: `Nicht genug Nährstoff (${reservoir.volume_ml}ml verfügbar, ${required_ml}ml benötigt)`
    };
  }

  if (!this.system.pumpsOperational) {
    return { ok: false, reason: 'Pumpen nicht betriebsbereit' };
  }

  return { ok: true };
};

/**
 * Hole Warnungen
 */
ReservoirStateSchema.methods.getWarnings = function() {
  const warnings = [];

  // Low-Level-Warnungen
  this.reservoirs.forEach(res => {
    if (res.lowLevelWarning.isActive) {
      warnings.push({
        type: 'low_level',
        severity: 'warning',
        message: `${res.name} ist fast leer (${res.level_percent}%)`,
        pumpId: res.pumpId
      });
    }
  });

  // Kalibrierungs-Warnungen
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  if (this.calibration.ec.lastCalibration < twoWeeksAgo) {
    warnings.push({
      type: 'calibration_due',
      severity: 'info',
      message: 'EC-Sensor sollte kalibriert werden (>2 Wochen)'
    });
  }

  if (this.calibration.ph.lastCalibration < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) {
    warnings.push({
      type: 'calibration_due',
      severity: 'info',
      message: 'pH-Sensor sollte kalibriert werden (>1 Woche)'
    });
  }

  // Wasser-Alter
  if (this.main.age_days > 14) {
    warnings.push({
      type: 'water_age',
      severity: 'warning',
      message: `Wasser ist ${this.main.age_days} Tage alt. Wechsel empfohlen!`
    });
  }

  return warnings;
};

// ==========================================
// STATISCHE METHODEN
// ==========================================

/**
 * Hole oder erstelle aktuellen State
 */
ReservoirStateSchema.statics.getOrCreate = async function() {
  let state = await this.findOne().sort({ updatedAt: -1 });

  if (!state) {
    // Erstelle Initial-State
    state = new this({
      main: {
        capacity_liters: 50,
        lastChange: new Date()
      },
      reservoirs: [{
        pumpId: 1,
        name: '5-in-1 Dünger',
        brand: 'Generic',
        volume_ml: 5000,
        capacity_ml: 5000
      }],
      calibration: {
        nextCalibration: {
          ec: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          ph: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      }
    });
    await state.save();
  }

  return state;
};

/**
 * Update von ESP32
 */
ReservoirStateSchema.statics.updateFromESP32 = async function(data) {
  const state = await this.getOrCreate();

  // Update Messungen
  if (data.ec !== undefined) state.main.ec = data.ec;
  if (data.ph !== undefined) state.main.ph = data.ph;
  if (data.temp !== undefined) state.main.temp = data.temp;

  // Update Reservoir-Level (wenn ESP32 Level-Sensor hat)
  if (data.reservoirLevel) {
    const reservoir = state.reservoirs.find(r => r.pumpId === data.pumpId || 1);
    if (reservoir) {
      reservoir.volume_ml = data.reservoirLevel;
    }
  }

  // Heartbeat
  state.system.lastHeartbeat = new Date();
  state.system.sensorsOnline = {
    ec: data.ec !== undefined,
    ph: data.ph !== undefined,
    temp: data.temp !== undefined
  };

  await state.save();
  return state;
};

module.exports = mongoose.model('ReservoirState', ReservoirStateSchema);
