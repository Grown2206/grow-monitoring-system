const mongoose = require('mongoose');

/**
 * Timelapse Capture Model
 * Speichert Metadaten für jeden erfassten Snapshot
 */
const TimelapseCaptureSchema = new mongoose.Schema({
  // Datei-Informationen
  filename: {
    type: String,
    required: true,
    unique: true
  },
  filePath: {
    type: String,
    required: true
  },
  thumbnailPath: {
    type: String
  },

  // Aufnahme-Details
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  captureSource: {
    type: String,
    enum: ['webcam', 'ip_camera', 'usb_camera', 'esp32_cam', 'manual'],
    default: 'webcam'
  },

  // Bild-Eigenschaften
  resolution: {
    width: { type: Number, default: 1920 },
    height: { type: Number, default: 1080 }
  },
  fileSize: {
    type: Number, // in bytes
    default: 0
  },
  format: {
    type: String,
    enum: ['jpg', 'jpeg', 'png', 'webp'],
    default: 'jpg'
  },

  // Kontext-Informationen
  plant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plant'
  },
  growCycle: {
    type: String
  },
  growDay: {
    type: Number // Tag seit Keimung/Vegetations-Start
  },

  // Sensor-Daten zum Zeitpunkt der Aufnahme
  environmentSnapshot: {
    temperature: Number,
    humidity: Number,
    vpd: Number,
    lightIntensity: Number,
    co2: Number,
    ec: Number,
    ph: Number
  },

  // Kategorisierung
  tags: [{
    type: String,
    index: true
  }],
  phase: {
    type: String,
    enum: ['seedling', 'vegetative', 'flowering', 'harvest', 'other'],
    index: true
  },

  // Verarbeitung
  usedInTimelapse: {
    type: Boolean,
    default: false,
    index: true
  },
  timelapseVideos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimelapseVideo'
  }],

  // Qualitätssicherung
  quality: {
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    issues: [{
      type: String,
      enum: ['blur', 'overexposed', 'underexposed', 'out_of_focus', 'obstruction']
    }]
  },

  // Metadaten
  notes: String,
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indizes für Performance
TimelapseCaptureSchema.index({ timestamp: -1, isDeleted: 1 });
TimelapseCaptureSchema.index({ plant: 1, timestamp: -1 });
TimelapseCaptureSchema.index({ phase: 1, timestamp: -1 });
TimelapseCaptureSchema.index({ usedInTimelapse: 1, isDeleted: 1 });

// Virtual: Aufnahme-Datum formatiert
TimelapseCaptureSchema.virtual('formattedDate').get(function() {
  return this.timestamp.toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Virtual: Dateigröße in MB
TimelapseCaptureSchema.virtual('fileSizeMB').get(function() {
  return (this.fileSize / (1024 * 1024)).toFixed(2);
});

// Virtual: URL für Frontend
TimelapseCaptureSchema.virtual('imageUrl').get(function() {
  return `/api/timelapse/images/${this.filename}`;
});

TimelapseCaptureSchema.virtual('thumbnailUrl').get(function() {
  return this.thumbnailPath ? `/api/timelapse/thumbnails/${this.filename}` : this.imageUrl;
});

// Statische Methode: Captures nach Zeitraum
TimelapseCaptureSchema.statics.getByDateRange = async function(startDate, endDate, options = {}) {
  const query = {
    timestamp: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    isDeleted: false
  };

  if (options.plant) query.plant = options.plant;
  if (options.phase) query.phase = options.phase;
  if (options.tags && options.tags.length > 0) query.tags = { $in: options.tags };

  return this.find(query)
    .sort({ timestamp: 1 })
    .populate('plant', 'name strain')
    .lean();
};

// Statische Methode: Statistiken
TimelapseCaptureSchema.statics.getStatistics = async function(dateRange) {
  const match = { isDeleted: false };

  if (dateRange) {
    match.timestamp = {
      $gte: new Date(dateRange.start),
      $lte: new Date(dateRange.end)
    };
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalCaptures: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        usedInTimelapse: {
          $sum: { $cond: ['$usedInTimelapse', 1, 0] }
        },
        averageQuality: { $avg: '$quality.score' },
        byPhase: {
          $push: {
            phase: '$phase',
            timestamp: '$timestamp'
          }
        }
      }
    },
    {
      $project: {
        totalCaptures: 1,
        totalSizeGB: { $divide: ['$totalSize', 1024 * 1024 * 1024] },
        usedInTimelapse: 1,
        unusedCaptures: { $subtract: ['$totalCaptures', '$usedInTimelapse'] },
        averageQuality: { $round: ['$averageQuality', 2] }
      }
    }
  ]);

  return stats[0] || {
    totalCaptures: 0,
    totalSizeGB: 0,
    usedInTimelapse: 0,
    unusedCaptures: 0,
    averageQuality: 0
  };
};

// Instance Methode: Soft Delete
TimelapseCaptureSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  return this.save();
};

// Instance Methode: Markiere als verwendet
TimelapseCaptureSchema.methods.markUsed = async function(videoId) {
  this.usedInTimelapse = true;
  if (videoId && !this.timelapseVideos.includes(videoId)) {
    this.timelapseVideos.push(videoId);
  }
  return this.save();
};

module.exports = mongoose.model('TimelapseCapture', TimelapseCaptureSchema);
