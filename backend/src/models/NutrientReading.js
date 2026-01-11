const mongoose = require('mongoose');

/**
 * Nutrient Reading Model
 * Speichert EC und pH Messwerte über Zeit
 * Für Trend-Analyse und Alerts
 */
const NutrientReadingSchema = new mongoose.Schema({
  // EC Reading (Electrical Conductivity)
  ec: {
    value: {
      type: Number,
      required: true,
      min: 0,
      max: 20 // mS/cm (praktisches Maximum für Hydroponik)
    },
    unit: {
      type: String,
      enum: ['mS/cm', 'µS/cm', 'ppm'],
      default: 'mS/cm'
    },
    compensated: {
      type: Boolean,
      default: false,
      description: 'Temperature compensated?'
    }
  },

  // pH Reading
  ph: {
    value: {
      type: Number,
      required: true,
      min: 0,
      max: 14
    },
    temperature: {
      type: Number,
      description: 'Temperature at time of reading (°C)'
    }
  },

  // Temperature (from nutrient solution)
  temperature: {
    type: Number,
    min: 0,
    max: 50,
    description: 'Nutrient solution temperature (°C)'
  },

  // Reservoir Info
  reservoir: {
    id: {
      type: String,
      default: 'main'
    },
    level: {
      type: Number,
      min: 0,
      max: 100,
      description: 'Reservoir level (%)'
    },
    volume: {
      type: Number,
      description: 'Estimated volume (liters)'
    }
  },

  // Quality Flags
  quality: {
    ecValid: { type: Boolean, default: true },
    phValid: { type: Boolean, default: true },
    calibrated: { type: Boolean, default: false },
    anomaly: { type: Boolean, default: false }
  },

  // Alerts
  alerts: [{
    type: {
      type: String,
      enum: ['ec_low', 'ec_high', 'ph_low', 'ph_high', 'temp_high', 'level_low']
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical']
    },
    message: String,
    triggered: { type: Date, default: Date.now }
  }],

  // Source
  source: {
    type: String,
    enum: ['esp32', 'manual', 'api'],
    default: 'esp32'
  },

  // Metadata
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index für schnelle Zeitbereich-Abfragen
NutrientReadingSchema.index({ timestamp: -1 });
NutrientReadingSchema.index({ 'reservoir.id': 1, timestamp: -1 });

// Virtual: TDS (Total Dissolved Solids) in ppm
NutrientReadingSchema.virtual('tds').get(function() {
  // Conversion: 1 mS/cm ≈ 500-700 ppm (depends on solution)
  // Standard factor: 500 (0.5 conversion factor)
  return Math.round(this.ec.value * 500);
});

// Virtual: EC in µS/cm
NutrientReadingSchema.virtual('ecMicro').get(function() {
  if (this.ec.unit === 'mS/cm') {
    return this.ec.value * 1000;
  } else if (this.ec.unit === 'µS/cm') {
    return this.ec.value;
  } else {
    return this.ec.value / 0.5; // ppm to µS/cm
  }
});

// Methode: Check Thresholds
NutrientReadingSchema.methods.checkThresholds = function(thresholds) {
  this.alerts = [];

  // EC Thresholds
  if (this.ec.value < thresholds.ec.min) {
    this.alerts.push({
      type: 'ec_low',
      severity: this.ec.value < thresholds.ec.critical.min ? 'critical' : 'warning',
      message: `EC zu niedrig: ${this.ec.value} mS/cm (Min: ${thresholds.ec.min})`
    });
  } else if (this.ec.value > thresholds.ec.max) {
    this.alerts.push({
      type: 'ec_high',
      severity: this.ec.value > thresholds.ec.critical.max ? 'critical' : 'warning',
      message: `EC zu hoch: ${this.ec.value} mS/cm (Max: ${thresholds.ec.max})`
    });
  }

  // pH Thresholds
  if (this.ph.value < thresholds.ph.min) {
    this.alerts.push({
      type: 'ph_low',
      severity: this.ph.value < thresholds.ph.critical.min ? 'critical' : 'warning',
      message: `pH zu niedrig: ${this.ph.value} (Min: ${thresholds.ph.min})`
    });
  } else if (this.ph.value > thresholds.ph.max) {
    this.alerts.push({
      type: 'ph_high',
      severity: this.ph.value > thresholds.ph.critical.max ? 'critical' : 'warning',
      message: `pH zu hoch: ${this.ph.value} (Max: ${thresholds.ph.max})`
    });
  }

  // Temperature Threshold
  if (this.temperature && this.temperature > thresholds.temperature.max) {
    this.alerts.push({
      type: 'temp_high',
      severity: this.temperature > thresholds.temperature.critical ? 'critical' : 'warning',
      message: `Temperatur zu hoch: ${this.temperature}°C (Max: ${thresholds.temperature.max})`
    });
  }

  // Reservoir Level
  if (this.reservoir.level && this.reservoir.level < thresholds.reservoir.minLevel) {
    this.alerts.push({
      type: 'level_low',
      severity: this.reservoir.level < 10 ? 'critical' : 'warning',
      message: `Reservoir-Level niedrig: ${this.reservoir.level}%`
    });
  }

  return this.alerts.length > 0;
};

// Static: Get Recent Readings
NutrientReadingSchema.statics.getRecent = async function(hours = 24, limit = 100) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return await this.find({ timestamp: { $gte: cutoff } })
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static: Get Statistics
NutrientReadingSchema.statics.getStatistics = async function(hours = 24) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const readings = await this.find({ timestamp: { $gte: cutoff } });

  if (readings.length === 0) {
    return null;
  }

  const ecValues = readings.map(r => r.ec.value);
  const phValues = readings.map(r => r.ph.value);

  const ecAvg = ecValues.reduce((a, b) => a + b, 0) / ecValues.length;
  const phAvg = phValues.reduce((a, b) => a + b, 0) / phValues.length;

  const ecMin = Math.min(...ecValues);
  const ecMax = Math.max(...ecValues);
  const phMin = Math.min(...phValues);
  const phMax = Math.max(...phValues);

  // Standard Deviation
  const ecVariance = ecValues.reduce((sum, val) => sum + Math.pow(val - ecAvg, 2), 0) / ecValues.length;
  const phVariance = phValues.reduce((sum, val) => sum + Math.pow(val - phAvg, 2), 0) / phValues.length;

  const ecStdDev = Math.sqrt(ecVariance);
  const phStdDev = Math.sqrt(phVariance);

  return {
    ec: {
      average: Math.round(ecAvg * 100) / 100,
      min: Math.round(ecMin * 100) / 100,
      max: Math.round(ecMax * 100) / 100,
      stdDev: Math.round(ecStdDev * 100) / 100
    },
    ph: {
      average: Math.round(phAvg * 100) / 100,
      min: Math.round(phMin * 100) / 100,
      max: Math.round(phMax * 100) / 100,
      stdDev: Math.round(phStdDev * 100) / 100
    },
    dataPoints: readings.length,
    period: `${hours} Stunden`
  };
};

const NutrientReading = mongoose.model('NutrientReading', NutrientReadingSchema);

module.exports = NutrientReading;
