const mongoose = require('mongoose');

/**
 * VPD Configuration Model
 * Speichert Einstellungen für automatische VPD-Steuerung
 */
const VPDConfigSchema = new mongoose.Schema({
  // Ist Auto-VPD aktiviert?
  enabled: {
    type: Boolean,
    default: false
  },

  // Aktuelle Wachstumsphase
  growStage: {
    type: String,
    enum: ['seedling', 'vegetative', 'flowering', 'late_flowering'],
    default: 'vegetative'
  },

  // Custom Zielbereich (überschreibt Standard-Werte)
  customTarget: {
    enabled: {
      type: Boolean,
      default: false
    },
    min: {
      type: Number,
      min: 0.2,
      max: 2.5,
      default: 0.8
    },
    max: {
      type: Number,
      min: 0.2,
      max: 2.5,
      default: 1.2
    }
  },

  // Regelungs-Aggressivität
  aggressiveness: {
    type: String,
    enum: ['gentle', 'normal', 'aggressive'],
    default: 'normal',
    description: 'Wie schnell soll auf VPD-Änderungen reagiert werden?'
  },

  // Fan-PWM Limits
  fanLimits: {
    min: {
      type: Number,
      min: 0,
      max: 100,
      default: 30,
      description: 'Minimale Lüftergeschwindigkeit (%)'
    },
    max: {
      type: Number,
      min: 0,
      max: 100,
      default: 85,
      description: 'Maximale Lüftergeschwindigkeit (%)'
    }
  },

  // Update-Intervall (Sekunden)
  updateInterval: {
    type: Number,
    min: 10,
    max: 300,
    default: 30,
    description: 'Wie oft soll VPD geprüft werden? (Sekunden)'
  },

  // Hysterese-Schwellenwerte
  hysteresis: {
    enabled: {
      type: Boolean,
      default: true,
      description: 'Verhindert zu häufiges Schalten'
    },
    threshold: {
      type: Number,
      min: 0.01,
      max: 0.5,
      default: 0.05,
      description: 'Minimale VPD-Änderung für Aktion (kPa)'
    },
    minTimeBetweenChanges: {
      type: Number,
      min: 30,
      max: 600,
      default: 60,
      description: 'Minimale Zeit zwischen Fan-Änderungen (Sekunden)'
    }
  },

  // Notfall-Modi
  emergency: {
    enabled: {
      type: Boolean,
      default: true
    },
    criticalLowVPD: {
      threshold: {
        type: Number,
        default: 0.3,
        description: 'VPD unter diesem Wert = kritisch niedrig'
      },
      action: {
        type: String,
        enum: ['min_fan', 'disable', 'alert_only'],
        default: 'min_fan'
      }
    },
    criticalHighVPD: {
      threshold: {
        type: Number,
        default: 2.0,
        description: 'VPD über diesem Wert = kritisch hoch'
      },
      action: {
        type: String,
        enum: ['max_fan', 'disable', 'alert_only'],
        default: 'max_fan'
      }
    }
  },

  // Logging & Statistiken
  logging: {
    enabled: {
      type: Boolean,
      default: true
    },
    logChanges: {
      type: Boolean,
      default: true,
      description: 'Fan-Änderungen loggen?'
    },
    logInterval: {
      type: Number,
      default: 300,
      description: 'VPD-Werte alle X Sekunden loggen'
    }
  },

  // Letzte Aktivität
  lastUpdate: {
    timestamp: {
      type: Date,
      default: Date.now
    },
    fanSpeed: {
      type: Number,
      min: 0,
      max: 100
    },
    vpd: {
      type: Number
    },
    action: {
      type: String
    }
  },

  // Statistiken (für Performance-Tracking)
  statistics: {
    totalAdjustments: {
      type: Number,
      default: 0
    },
    averageVPD: {
      type: Number
    },
    timeInOptimalRange: {
      type: Number,
      default: 0,
      description: 'Zeit im optimalen Bereich (Minuten)'
    },
    lastReset: {
      type: Date,
      default: Date.now
    }
  },

  // Benachrichtigungen
  notifications: {
    enabled: {
      type: Boolean,
      default: true
    },
    onCritical: {
      type: Boolean,
      default: true,
      description: 'Benachrichtigung bei kritischen Werten'
    },
    onDisable: {
      type: Boolean,
      default: true,
      description: 'Benachrichtigung wenn Auto-VPD deaktiviert wird'
    }
  },

  // User (falls mehrere User das System nutzen)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Virtual: Aktueller Zielbereich
VPDConfigSchema.virtual('targetRange').get(function() {
  if (this.customTarget.enabled) {
    return {
      min: this.customTarget.min,
      max: this.customTarget.max,
      optimal: (this.customTarget.min + this.customTarget.max) / 2,
      source: 'custom'
    };
  }

  // Standard-Werte basierend auf Wachstumsphase
  const vpdService = require('../services/vpdService');
  return {
    ...vpdService.getTargetVPD(this.growStage),
    source: 'preset'
  };
});

// Methode: Update Statistiken
VPDConfigSchema.methods.updateStatistics = function(vpd, inOptimalRange) {
  this.statistics.totalAdjustments += 1;

  // Rolling Average (letzte 100 Werte)
  const weight = Math.min(this.statistics.totalAdjustments, 100);
  this.statistics.averageVPD = (
    (this.statistics.averageVPD || 0) * (weight - 1) + vpd
  ) / weight;

  // Zeit im optimalen Bereich
  if (inOptimalRange) {
    const elapsed = (Date.now() - this.lastUpdate.timestamp) / 1000 / 60; // Minuten
    this.statistics.timeInOptimalRange += elapsed;
  }
};

// Methode: Log Aktion
VPDConfigSchema.methods.logAction = function(vpd, fanSpeed, action) {
  this.lastUpdate = {
    timestamp: new Date(),
    fanSpeed,
    vpd,
    action
  };
};

// Methode: Reset Statistiken
VPDConfigSchema.methods.resetStatistics = function() {
  this.statistics = {
    totalAdjustments: 0,
    averageVPD: 0,
    timeInOptimalRange: 0,
    lastReset: new Date()
  };
};

// Static: Get or Create Config (Singleton-Pattern)
VPDConfigSchema.statics.getOrCreate = async function() {
  let config = await this.findOne();

  if (!config) {
    config = await this.create({
      enabled: false,
      growStage: 'vegetative'
    });
    console.log('✅ VPD-Config erstellt (Standard-Einstellungen)');
  }

  return config;
};

const VPDConfig = mongoose.model('VPDConfig', VPDConfigSchema);

module.exports = VPDConfig;
