const mongoose = require('mongoose');

/**
 * System Configuration Model
 * Persistiert System-Einstellungen in MongoDB (statt nur im Memory)
 * Ersetzt den memory-basierten Config-Speicher in apiRoutes.js
 */
const SystemConfigSchema = new mongoose.Schema({
  // Config-Typ (für verschiedene Subsysteme)
  configType: {
    type: String,
    required: true,
    enum: ['automation', 'general', 'notification', 'vpd', 'lighting', 'irrigation'],
    unique: true,
    index: true
  },

  // Automation Config
  automation: {
    cooldownMinutes: { type: Number, default: 60 },
    dryThreshold: { type: Number, default: 30 },
    manualPauseMinutes: { type: Number, default: 30 },
    lightStartHour: { type: Number, default: 6 },
    lightDuration: { type: Number, default: 18 },
    vpdMin: { type: Number, default: 0.8 },
    vpdMax: { type: Number, default: 1.2 },
    maxTempSafe: { type: Number, default: 40.0 },
    maxGasSafe: { type: Number, default: 3500 },

    // Plant-specific settings
    plantSpecific: {
      enabled: { type: Boolean, default: false },
      individualThresholds: { type: Boolean, default: false },
      zoneBasedVPD: { type: Boolean, default: false }
    },

    // Growth stage-based light control
    growthStageLight: {
      enabled: { type: Boolean, default: false },
      seedling: {
        duration: { type: Number, default: 16 },
        intensity: { type: Number, default: 60 }
      },
      vegetative: {
        duration: { type: Number, default: 18 },
        intensity: { type: Number, default: 80 }
      },
      flowering: {
        duration: { type: Number, default: 12 },
        intensity: { type: Number, default: 100 }
      },
      harvest: {
        duration: { type: Number, default: 12 },
        intensity: { type: Number, default: 50 }
      }
    },

    // Zone-based VPD targets
    vpdZones: {
      bottom: {
        min: { type: Number, default: 0.8 },
        max: { type: Number, default: 1.0 }
      },
      middle: {
        min: { type: Number, default: 0.9 },
        max: { type: Number, default: 1.2 }
      },
      top: {
        min: { type: Number, default: 1.0 },
        max: { type: Number, default: 1.4 }
      }
    }
  },

  // General System Config (from old apiRoutes automationConfig)
  general: {
    lightStart: { type: String, default: "06:00" },
    lightDuration: { type: Number, default: 18 },
    tempTarget: { type: Number, default: 24 },
    tempHysteresis: { type: Number, default: 2 },
    pumpInterval: { type: Number, default: 4 },
    pumpDuration: { type: Number, default: 30 }
  },

  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    default: 'system'
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  collection: 'system_configs'
});

// Indexes
SystemConfigSchema.index({ configType: 1 });
SystemConfigSchema.index({ lastUpdated: -1 });

// Methods

/**
 * Get config by type or create default
 */
SystemConfigSchema.statics.getConfig = async function(configType) {
  let config = await this.findOne({ configType });

  if (!config) {
    // Create default config
    config = new this({ configType });
    await config.save();
  }

  return config;
};

/**
 * Update config (merges with existing)
 */
SystemConfigSchema.statics.updateConfig = async function(configType, updates, updatedBy = 'user') {
  const config = await this.getConfig(configType);

  // Merge updates
  Object.keys(updates).forEach(key => {
    if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
      // Deep merge for nested objects
      config[key] = { ...config[key], ...updates[key] };
    } else {
      config[key] = updates[key];
    }
  });

  config.lastUpdated = new Date();
  config.updatedBy = updatedBy;
  config.version += 1;

  await config.save();
  return config;
};

/**
 * Reset config to defaults
 */
SystemConfigSchema.methods.resetToDefaults = async function() {
  const defaultConfig = new this.constructor({ configType: this.configType });

  Object.keys(defaultConfig.toObject()).forEach(key => {
    if (key !== '_id' && key !== 'configType' && key !== '__v') {
      this[key] = defaultConfig[key];
    }
  });

  this.lastUpdated = new Date();
  this.updatedBy = 'system';
  this.version += 1;

  await this.save();
  return this;
};

/**
 * Pre-save middleware - update lastUpdated
 */
SystemConfigSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

const SystemConfig = mongoose.model('SystemConfig', SystemConfigSchema);

module.exports = SystemConfig;
