const mongoose = require('mongoose');

/**
 * Snapshot Model
 * Speichert Kamera-Snapshots
 */
const SnapshotSchema = new mongoose.Schema({
  cameraId: {
    type: String,
    required: true,
    index: true
  },
  cameraName: {
    type: String,
    default: 'Unknown Camera'
  },
  filename: {
    type: String,
    required: true
  },
  filepath: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String
  },
  size: {
    type: Number,
    default: 0
  },
  width: {
    type: Number
  },
  height: {
    type: Number
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    brightness: Number,
    contrast: Number,
    quality: Number,
    flashUsed: Boolean
  },
  tags: [{
    type: String
  }],
  usedInTimelapse: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Virtuelle URL
SnapshotSchema.virtual('url').get(function() {
  return `/api/cameras/snapshots/${this._id}/image`;
});

// JSON-Transformation
SnapshotSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  }
});

// Indizes
SnapshotSchema.index({ cameraId: 1, timestamp: -1 });
SnapshotSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Snapshot', SnapshotSchema);
