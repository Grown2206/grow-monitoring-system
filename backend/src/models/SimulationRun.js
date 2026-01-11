const mongoose = require('mongoose');

const simulationRunSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  strain: {
    type: String,
    required: true
  },
  strainType: {
    type: String,
    enum: ['Indica', 'Sativa', 'Hybrid', 'Autoflower', 'CBD'],
    default: 'Hybrid'
  },
  parameters: {
    temperature: {
      type: Number,
      default: 24,
      min: 15,
      max: 35
    },
    humidity: {
      type: Number,
      default: 60,
      min: 30,
      max: 90
    },
    vpd: {
      type: Number,
      default: 1.0,
      min: 0.4,
      max: 2.0
    },
    lightHours: {
      type: Number,
      default: 18,
      min: 12,
      max: 24
    },
    ppfd: {
      type: Number,
      default: 600,
      min: 200,
      max: 1500
    },
    dli: {
      type: Number,
      default: 35,
      min: 15,
      max: 65
    },
    co2: {
      type: Number,
      default: 400,
      min: 400,
      max: 1500
    },
    nutrientEC: {
      type: Number,
      default: 1.8,
      min: 0.5,
      max: 3.0
    },
    pH: {
      type: Number,
      default: 6.0,
      min: 5.5,
      max: 7.0
    }
  },
  growPhases: [{
    phase: {
      type: String,
      enum: ['seedling', 'vegetative', 'flowering', 'late_flowering'],
      required: true
    },
    duration: {
      type: Number,
      required: true,
      min: 1
    },
    parameters: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  }],
  predictions: {
    totalDays: {
      type: Number,
      default: 0
    },
    yieldGrams: {
      min: {
        type: Number,
        default: 0
      },
      expected: {
        type: Number,
        default: 0
      },
      max: {
        type: Number,
        default: 0
      }
    },
    quality: {
      type: Number,
      min: 0,
      max: 100,
      default: 75
    },
    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    }
  },
  monteCarlo: {
    runs: {
      type: Number,
      default: 1000
    },
    results: [{
      yield: Number,
      probability: Number
    }],
    statistics: {
      mean: Number,
      median: Number,
      stdDev: Number,
      percentile5: Number,
      percentile95: Number
    }
  },
  costs: {
    electricity: {
      type: Number,
      default: 0
    },
    nutrients: {
      type: Number,
      default: 0
    },
    water: {
      type: Number,
      default: 0
    },
    substrate: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  roi: {
    investment: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    },
    profit: {
      type: Number,
      default: 0
    },
    roiPercentage: {
      type: Number,
      default: 0
    },
    breakEvenDays: {
      type: Number,
      default: 0
    },
    pricePerGram: {
      type: Number,
      default: 10
    }
  },
  optimizationSuggestions: [{
    parameter: String,
    currentValue: Number,
    suggestedValue: Number,
    expectedImprovement: String,
    reasoning: String
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [String]
}, {
  timestamps: true
});

// Index für schnellere Suche
simulationRunSchema.index({ userId: 1, createdAt: -1 });
simulationRunSchema.index({ strainType: 1 });
simulationRunSchema.index({ 'predictions.yieldGrams.expected': -1 });

// Virtual für durchschnittlichen Ertrag pro Tag
simulationRunSchema.virtual('yieldPerDay').get(function() {
  if (this.predictions.totalDays > 0) {
    return this.predictions.yieldGrams.expected / this.predictions.totalDays;
  }
  return 0;
});

// Virtual für Effizienz-Score
simulationRunSchema.virtual('efficiencyScore').get(function() {
  if (this.costs.total > 0) {
    return (this.predictions.yieldGrams.expected / this.costs.total) * 10;
  }
  return 0;
});

simulationRunSchema.set('toJSON', { virtuals: true });
simulationRunSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SimulationRun', simulationRunSchema);
