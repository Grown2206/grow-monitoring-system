const mongoose = require('mongoose');

const maintenanceAnalyticsSchema = new mongoose.Schema({
  deviceType: {
    type: String,
    enum: ['fan_exhaust', 'pump', 'light', 'humidifier', 'sensor', 'filter'],
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  metrics: {
    operatingHours: {
      type: Number,
      default: 0
    },
    cycleCount: {
      type: Number,
      default: 0
    },
    averageDutyCycle: {
      type: Number,
      default: 0
    },
    powerConsumption: {
      type: Number,
      default: 0
    },
    lastReading: {
      type: Number,
      default: 0
    }
  },
  healthScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  anomalyScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  predictions: {
    nextMaintenanceDate: Date,
    estimatedRemainingLife: Number, // in hours
    failureProbability: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    recommendedAction: {
      type: String,
      enum: ['none', 'monitor', 'schedule_maintenance', 'urgent_maintenance', 'replace'],
      default: 'none'
    }
  },
  anomalies: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['degradation', 'spike', 'drift', 'unusual_pattern']
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    description: String,
    value: Number
  }],
  maintenanceHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['inspection', 'cleaning', 'calibration', 'part_replacement', 'full_service']
    },
    description: String,
    performedBy: String,
    cost: Number,
    resolved: {
      type: Boolean,
      default: true
    }
  }],
  sensorBaseline: {
    mean: Number,
    stdDev: Number,
    min: Number,
    max: Number,
    trend: Number // slope of linear regression
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index für schnellere Suche
maintenanceAnalyticsSchema.index({ deviceType: 1, deviceId: 1 });
maintenanceAnalyticsSchema.index({ 'predictions.nextMaintenanceDate': 1 });
maintenanceAnalyticsSchema.index({ healthScore: 1 });
maintenanceAnalyticsSchema.index({ userId: 1 });

// Virtual für Wartungsstatus
maintenanceAnalyticsSchema.virtual('maintenanceStatus').get(function() {
  if (this.predictions.recommendedAction === 'urgent_maintenance' || this.predictions.recommendedAction === 'replace') {
    return 'urgent';
  }
  if (this.predictions.recommendedAction === 'schedule_maintenance') {
    return 'due_soon';
  }
  if (this.healthScore < 70) {
    return 'degraded';
  }
  return 'healthy';
});

// Virtual für Tage bis zur nächsten Wartung
maintenanceAnalyticsSchema.virtual('daysUntilMaintenance').get(function() {
  if (!this.predictions.nextMaintenanceDate) return null;
  const now = new Date();
  const diff = this.predictions.nextMaintenanceDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

maintenanceAnalyticsSchema.set('toJSON', { virtuals: true });
maintenanceAnalyticsSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MaintenanceAnalytics', maintenanceAnalyticsSchema);
