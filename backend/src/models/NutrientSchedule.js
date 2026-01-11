const mongoose = require('mongoose');

/**
 * Nährstoff-Zeitplan für automatische Dosierung
 *
 * Version 1.0: Single-Pump Setup (5-in-1 Dünger)
 * Future: Multi-Pump Support (Basis A/B, pH, Additives)
 */

const NutrientScheduleSchema = new mongoose.Schema({
  // Verknüpfung mit Pflanze/Grow
  plantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plant',
    required: false  // Optional: Kann auch für gesamtes System gelten
  },

  name: {
    type: String,
    required: true,
    default: 'Standard Nährstoff-Plan'
  },

  // ==========================================
  // ZEITPLAN-TYP
  // ==========================================
  type: {
    type: String,
    enum: ['fixed', 'adaptive', 'manual'],
    default: 'fixed',
    description: 'fixed = Feste Zeiten, adaptive = EC-basiert, manual = Nur manuell'
  },

  // ==========================================
  // FIXED SCHEDULE (Zeitbasiert)
  // ==========================================
  schedule: {
    enabled: { type: Boolean, default: true },

    // Einfacher Ansatz: Wochentage + Uhrzeit
    daysOfWeek: {
      type: [Number],
      default: [1, 3, 5],  // Mo, Mi, Fr (0=Sonntag, 6=Samstag)
      validate: {
        validator: function(arr) {
          return arr.every(day => day >= 0 && day <= 6);
        },
        message: 'Wochentage müssen zwischen 0 (Sonntag) und 6 (Samstag) sein'
      }
    },

    time: {
      type: String,
      default: '09:00',
      match: /^([01]\d|2[0-3]):([0-5]\d)$/  // HH:MM Format
    },

    // Alternativ: Cron-Expression für Advanced-User
    cronExpression: {
      type: String,
      required: false  // Optional, überschreibt daysOfWeek + time wenn gesetzt
    }
  },

  // ==========================================
  // ADAPTIVE SCHEDULE (Sensor-basiert)
  // ==========================================
  adaptive: {
    enabled: { type: Boolean, default: false },

    // EC-Schwellwert
    ec_threshold: {
      type: Number,
      default: 1.0,
      description: 'Dosiere wenn EC unter diesem Wert fällt'
    },

    // pH-Range (optional für Zukunft)
    ph_min: { type: Number, default: 5.8 },
    ph_max: { type: Number, default: 6.2 },

    // Wie oft checken?
    checkIntervalMinutes: {
      type: Number,
      default: 60,  // Jede Stunde
      min: 15,      // Minimum 15 Min
      max: 1440     // Maximum 24h
    }
  },

  // ==========================================
  // DOSIERUNGS-KONFIGURATION
  // ==========================================
  dosage: {
    // Version 1.0: Nur eine Pumpe (5-in-1 Dünger)
    singlePump: {
      enabled: { type: Boolean, default: true },

      // ml pro Liter Wasser
      ml_per_liter: {
        type: Number,
        required: true,
        default: 2,  // z.B. 2ml/L
        min: 0.1,
        max: 50
      },

      // Pumpennummer (für Multi-Pump Zukunft)
      pumpId: {
        type: Number,
        default: 1
      }
    },

    // Version 2.0: Multi-Pump (für Zukunft vorbereitet)
    multiPump: {
      enabled: { type: Boolean, default: false },

      nutrients: [{
        name: { type: String },           // "Basis A", "CalMag", etc.
        ml_per_liter: { type: Number },
        pumpId: { type: Number },
        order: { type: Number }           // Reihenfolge wichtig!
      }]
    }
  },

  // ==========================================
  // WASSER-VOLUMEN
  // ==========================================
  waterVolume: {
    liters: {
      type: Number,
      required: true,
      default: 10,
      min: 1,
      max: 1000
    },

    // Berechnete Werte (werden automatisch gefüllt)
    totalNutrient_ml: { type: Number }  // Wird bei Save berechnet
  },

  // ==========================================
  // SICHERHEITS-LIMITS
  // ==========================================
  safety: {
    // Max Dosierungen pro Tag
    maxDosagesPerDay: {
      type: Number,
      default: 2,
      min: 1,
      max: 10
    },

    // Warnung bei zu hoher Dosierung
    warningThreshold_ml: {
      type: Number,
      default: 500,
      description: 'Warnung wenn Gesamt-Dosierung > X ml'
    },

    // Erlaube Dosierung nur wenn Reservoir-Level OK
    requireReservoirCheck: {
      type: Boolean,
      default: true
    }
  },

  // ==========================================
  // ZIELWERTE (für Monitoring)
  // ==========================================
  targets: {
    ec: {
      type: Number,
      required: false,
      description: 'Ziel-EC nach Dosierung (optional)'
    },
    ph: {
      type: Number,
      required: false,
      description: 'Ziel-pH (optional, für Zukunft)'
    }
  },

  // ==========================================
  // STATUS & META
  // ==========================================
  isActive: {
    type: Boolean,
    default: true,
    description: 'Zeitplan aktiv/pausiert'
  },

  lastRun: {
    type: Date,
    description: 'Letzte Dosierung'
  },

  nextRun: {
    type: Date,
    description: 'Nächste geplante Dosierung'
  },

  // Statistik
  stats: {
    totalDosages: { type: Number, default: 0 },
    totalVolume_ml: { type: Number, default: 0 },
    lastSuccess: { type: Date },
    lastFailure: { type: Date },
    failureCount: { type: Number, default: 0 }
  },

  // Meta
  notes: {
    type: String,
    description: 'Benutzer-Notizen'
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, {
  timestamps: true  // createdAt, updatedAt
});

// ==========================================
// INDEXES
// ==========================================
NutrientScheduleSchema.index({ plantId: 1 });
NutrientScheduleSchema.index({ isActive: 1 });
NutrientScheduleSchema.index({ nextRun: 1 });

// ==========================================
// VIRTUAL: Berechnete Dosierung
// ==========================================
NutrientScheduleSchema.virtual('calculatedDosage').get(function() {
  if (this.dosage.singlePump.enabled) {
    return this.dosage.singlePump.ml_per_liter * this.waterVolume.liters;
  }
  return 0;
});

// ==========================================
// PRE-SAVE HOOK: Berechne totalNutrient_ml
// ==========================================
NutrientScheduleSchema.pre('save', function(next) {
  if (this.dosage.singlePump.enabled) {
    this.waterVolume.totalNutrient_ml =
      this.dosage.singlePump.ml_per_liter * this.waterVolume.liters;
  }
  next();
});

// ==========================================
// METHODEN
// ==========================================

/**
 * Berechne nächste Ausführungszeit (für fixed schedule)
 */
NutrientScheduleSchema.methods.calculateNextRun = function() {
  if (!this.schedule.enabled || this.type !== 'fixed') {
    return null;
  }

  const now = new Date();
  const [hours, minutes] = this.schedule.time.split(':').map(Number);

  // Finde nächsten passenden Wochentag
  const currentDay = now.getDay();
  const sortedDays = this.schedule.daysOfWeek.sort((a, b) => a - b);

  let nextDay = sortedDays.find(day => {
    if (day > currentDay) return true;
    if (day === currentDay) {
      const scheduledTime = new Date(now);
      scheduledTime.setHours(hours, minutes, 0, 0);
      return scheduledTime > now;
    }
    return false;
  });

  // Kein Tag diese Woche gefunden → nehme ersten Tag nächste Woche
  if (!nextDay) {
    nextDay = sortedDays[0];
  }

  const nextRun = new Date(now);
  const daysUntilNext = (nextDay - currentDay + 7) % 7 || (nextDay === currentDay ? 0 : 7);
  nextRun.setDate(nextRun.getDate() + daysUntilNext);
  nextRun.setHours(hours, minutes, 0, 0);

  return nextRun;
};

/**
 * Prüfe ob Dosierung heute schon durchgeführt wurde
 */
NutrientScheduleSchema.methods.canDoseToday = async function() {
  const DosageLog = mongoose.model('DosageLog');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayCount = await DosageLog.countDocuments({
    scheduleId: this._id,
    timestamp: { $gte: today },
    status: 'success'
  });

  return todayCount < this.safety.maxDosagesPerDay;
};

/**
 * Validiere Dosierung (Sicherheits-Check)
 */
NutrientScheduleSchema.methods.validateDosage = function() {
  const totalML = this.calculatedDosage;

  if (totalML > this.safety.warningThreshold_ml) {
    return {
      valid: false,
      warning: true,
      message: `Dosierung (${totalML}ml) überschreitet Warnschwelle (${this.safety.warningThreshold_ml}ml)!`
    };
  }

  if (totalML === 0) {
    return {
      valid: false,
      warning: false,
      message: 'Dosierung ist 0ml!'
    };
  }

  return { valid: true };
};

// ==========================================
// STATISCHE METHODEN
// ==========================================

/**
 * Hole alle aktiven Zeitpläne die jetzt ausgeführt werden sollen
 */
NutrientScheduleSchema.statics.getDueSchedules = async function() {
  const now = new Date();

  return this.find({
    isActive: true,
    type: 'fixed',
    'schedule.enabled': true,
    nextRun: { $lte: now }
  }).populate('plantId');
};

/**
 * Hole Zeitpläne die adaptiv gecheckt werden sollen
 */
NutrientScheduleSchema.statics.getAdaptiveSchedules = async function() {
  return this.find({
    isActive: true,
    type: 'adaptive',
    'adaptive.enabled': true
  }).populate('plantId');
};

module.exports = mongoose.model('NutrientSchedule', NutrientScheduleSchema);
