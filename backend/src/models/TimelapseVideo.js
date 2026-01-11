const mongoose = require('mongoose');

/**
 * Timelapse Video Model
 * Speichert Metadaten für generierte Timelapse-Videos
 */
const TimelapseVideoSchema = new mongoose.Schema({
  // Video-Informationen
  filename: {
    type: String,
    required: true,
    unique: true
  },
  filePath: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,

  // Zeitraum
  dateRange: {
    start: {
      type: Date,
      required: true,
      index: true
    },
    end: {
      type: Date,
      required: true,
      index: true
    }
  },

  // Video-Eigenschaften
  duration: {
    type: Number, // in Sekunden
    required: true
  },
  fps: {
    type: Number,
    default: 30
  },
  resolution: {
    width: { type: Number, default: 1920 },
    height: { type: Number, default: 1080 }
  },
  fileSize: {
    type: Number, // in bytes
    required: true
  },
  format: {
    type: String,
    enum: ['mp4', 'avi', 'webm', 'mov'],
    default: 'mp4'
  },
  codec: {
    type: String,
    enum: ['h264', 'h265', 'vp9'],
    default: 'h264'
  },

  // Erstellungs-Details
  frameCount: {
    type: Number,
    required: true
  },
  captureInterval: {
    type: String, // z.B. "10 minutes", "1 hour"
    default: 'variable'
  },
  speedMultiplier: {
    type: Number, // z.B. 100x = 1 Tag = 14.4 Minuten Video
    default: 100
  },

  // Verwendete Captures
  captures: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimelapseCapture'
  }],

  // Kontext
  plant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plant'
  },
  growCycle: String,
  phases: [{
    type: String,
    enum: ['seedling', 'vegetative', 'flowering', 'harvest']
  }],

  // Video-Effekte
  effects: {
    stabilization: {
      type: Boolean,
      default: false
    },
    colorCorrection: {
      type: Boolean,
      default: false
    },
    watermark: {
      type: Boolean,
      default: false
    },
    transitions: {
      type: String,
      enum: ['none', 'fade', 'crossfade'],
      default: 'none'
    }
  },

  // Verarbeitung
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  processingProgress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  processingLog: [String],
  errorMessage: String,

  // Statistiken
  views: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },

  // Metadaten
  tags: [{
    type: String,
    index: true
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
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

// Indizes
TimelapseVideoSchema.index({ createdAt: -1, isDeleted: 1 });
TimelapseVideoSchema.index({ plant: 1, createdAt: -1 });
TimelapseVideoSchema.index({ status: 1, isDeleted: 1 });

// Virtual: Dateigröße in MB
TimelapseVideoSchema.virtual('fileSizeMB').get(function() {
  return (this.fileSize / (1024 * 1024)).toFixed(2);
});

// Virtual: Dauer formatiert (mm:ss)
TimelapseVideoSchema.virtual('durationFormatted').get(function() {
  const minutes = Math.floor(this.duration / 60);
  const seconds = Math.floor(this.duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Virtual: URL für Frontend
TimelapseVideoSchema.virtual('videoUrl').get(function() {
  return `/api/timelapse/videos/${this.filename}`;
});

// Virtual: Download URL
TimelapseVideoSchema.virtual('downloadUrl').get(function() {
  return `/api/timelapse/videos/${this.filename}/download`;
});

// Virtual: Zeitraum in Tagen
TimelapseVideoSchema.virtual('daysSpanned').get(function() {
  const diff = this.dateRange.end - this.dateRange.start;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Statische Methode: Videos nach Status
TimelapseVideoSchema.statics.getByStatus = async function(status) {
  return this.find({ status, isDeleted: false })
    .sort({ createdAt: -1 })
    .populate('plant', 'name strain')
    .lean();
};

// Statische Methode: Statistiken
TimelapseVideoSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        totalDuration: { $sum: '$duration' },
        totalViews: { $sum: '$views' }
      }
    }
  ]);

  const summary = {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    totalSizeGB: 0,
    totalDurationHours: 0,
    totalViews: 0
  };

  stats.forEach(stat => {
    summary.total += stat.count;
    summary[stat._id] = stat.count;
    summary.totalSizeGB += stat.totalSize / (1024 * 1024 * 1024);
    summary.totalDurationHours += stat.totalDuration / 3600;
    summary.totalViews += stat.totalViews;
  });

  return summary;
};

// Instance Methode: Update Processing Progress
TimelapseVideoSchema.methods.updateProgress = async function(progress, logMessage) {
  this.processingProgress = progress;
  if (logMessage) {
    this.processingLog.push(`[${new Date().toISOString()}] ${logMessage}`);
  }
  return this.save();
};

// Instance Methode: Complete Processing
TimelapseVideoSchema.methods.complete = async function(fileSize, duration) {
  this.status = 'completed';
  this.processingProgress = 100;
  this.fileSize = fileSize;
  this.duration = duration;
  this.processingLog.push(`[${new Date().toISOString()}] ✅ Video erfolgreich generiert`);
  return this.save();
};

// Instance Methode: Mark as Failed
TimelapseVideoSchema.methods.fail = async function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  this.processingLog.push(`[${new Date().toISOString()}] ❌ Fehler: ${errorMessage}`);
  return this.save();
};

// Instance Methode: Increment View Counter
TimelapseVideoSchema.methods.incrementViews = async function() {
  this.views += 1;
  return this.save();
};

// Instance Methode: Soft Delete
TimelapseVideoSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  return this.save();
};

module.exports = mongoose.model('TimelapseVideo', TimelapseVideoSchema);
