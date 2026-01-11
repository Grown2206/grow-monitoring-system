const mongoose = require('mongoose');

/**
 * Plant Growth Log Model
 * Speichert tägliche Wachstumsdaten und Messungen
 */

const plantGrowthLogSchema = new mongoose.Schema({
  plant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plant',
    required: true
  },

  // Datum
  date: {
    type: Date,
    required: true,
    default: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    }
  },

  // Wachstums-Messungen
  measurements: {
    height: {
      value: Number,      // cm
      unit: { type: String, default: 'cm' }
    },
    width: {
      value: Number,      // cm
      unit: { type: String, default: 'cm' }
    },
    stemDiameter: {
      value: Number,      // mm
      unit: { type: String, default: 'mm' }
    },
    leafCount: Number,
    nodeCount: Number,
    internodeLength: Number  // cm - Durchschnitt
  },

  // Gesundheits-Status
  health: {
    overall: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    },
    leafColor: {
      type: String,
      enum: ['dunkelgrün', 'hellgrün', 'gelblich', 'braun', 'gefleckt'],
      default: 'dunkelgrün'
    },
    issues: [{
      type: {
        type: String,
        enum: [
          'Nährstoffmangel',
          'Verbrennung',
          'Schädlinge',
          'Krankheit',
          'Überwässerung',
          'Unterwässerung',
          'Lichtstress',
          'Hitzestress',
          'pH Problem',
          'Sonstiges'
        ]
      },
      severity: {
        type: String,
        enum: ['leicht', 'mittel', 'schwer']
      },
      description: String,
      resolved: {
        type: Boolean,
        default: false
      }
    }]
  },

  // Umgebungsdaten (Durchschnittswerte des Tages)
  environment: {
    avgTemperature: Number,
    avgHumidity: Number,
    avgVPD: Number,
    avgSoilMoisture: Number,
    lightHours: Number,
    waterAmount: Number      // ml gegossen
  },

  // Nährstoffe
  nutrients: {
    ec: Number,
    ph: Number,
    given: {
      type: Boolean,
      default: false
    },
    amount: Number,          // ml Nährlösung
    notes: String
  },

  // Aktivitäten
  activities: [{
    type: {
      type: String,
      enum: [
        'Bewässern',
        'Düngen',
        'Training (LST)',
        'Training (HST)',
        'Topping',
        'Defoliation',
        'Umtopfen',
        'pH Korrektur',
        'Schädlingsbekämpfung',
        'Sonstiges'
      ]
    },
    description: String,
    time: {
      type: Date,
      default: Date.now
    }
  }],

  // Fotos
  photos: [{
    url: String,
    caption: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Notizen
  notes: String,

  // Meilensteine
  milestones: [{
    type: {
      type: String,
      enum: [
        'Gekeimt',
        'Erste echte Blätter',
        'Vegetatives Wachstum begonnen',
        'Pre-Flower',
        'Blüte begonnen',
        'Trichome milchig',
        'Ernte',
        'Sonstiges'
      ]
    },
    achieved: {
      type: Boolean,
      default: true
    },
    notes: String
  }],

  // Wachstumsrate (automatisch berechnet)
  growthRate: {
    heightChange: Number,    // cm pro Tag
    widthChange: Number      // cm pro Tag
  }

}, {
  timestamps: true
});

// Compound Index für eindeutige Tageseinträge pro Pflanze
plantGrowthLogSchema.index({ plant: 1, date: 1 }, { unique: true });
plantGrowthLogSchema.index({ date: -1 });

// Berechne Wachstumsrate vor dem Speichern
plantGrowthLogSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('measurements.height') || this.isModified('measurements.width')) {
    // Hole letzten Eintrag
    const yesterday = new Date(this.date);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastLog = await this.constructor.findOne({
      plant: this.plant,
      date: { $lt: this.date }
    }).sort({ date: -1 });

    if (lastLog) {
      const daysDiff = Math.max(1, (this.date - lastLog.date) / (1000 * 60 * 60 * 24));

      if (this.measurements.height?.value && lastLog.measurements.height?.value) {
        this.growthRate.heightChange =
          (this.measurements.height.value - lastLog.measurements.height.value) / daysDiff;
      }

      if (this.measurements.width?.value && lastLog.measurements.width?.value) {
        this.growthRate.widthChange =
          (this.measurements.width.value - lastLog.measurements.width.value) / daysDiff;
      }
    }
  }

  next();
});

// Statische Methode: Hole Wachstumstrend
plantGrowthLogSchema.statics.getGrowthTrend = async function(plantId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await this.find({
    plant: plantId,
    date: { $gte: startDate }
  }).sort({ date: 1 });

  return logs;
};

// Statische Methode: Berechne Durchschnittswerte
plantGrowthLogSchema.statics.getAverages = async function(plantId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await this.aggregate([
    {
      $match: {
        plant: new mongoose.Types.ObjectId(plantId),
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        avgHeight: { $avg: '$measurements.height.value' },
        avgWidth: { $avg: '$measurements.width.value' },
        avgHealth: { $avg: '$health.overall' },
        avgTemp: { $avg: '$environment.avgTemperature' },
        avgHumidity: { $avg: '$environment.avgHumidity' },
        avgVPD: { $avg: '$environment.avgVPD' },
        avgSoilMoisture: { $avg: '$environment.avgSoilMoisture' },
        totalWater: { $sum: '$environment.waterAmount' },
        issueCount: { $sum: { $size: '$health.issues' } }
      }
    }
  ]);

  return result[0] || {};
};

module.exports = mongoose.model('PlantGrowthLog', plantGrowthLogSchema);
