const mongoose = require('mongoose');

/**
 * Camera Model
 * Speichert Kamera-Konfigurationen
 */
const CameraSchema = new mongoose.Schema({
  cameraId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    default: 'GrowCam'
  },
  ip: {
    type: String,
    trim: true,
    default: ''
  },
  color: {
    type: String,
    default: '#10b981'
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'unknown'],
    default: 'unknown'
  },
  lastSeen: {
    type: Date
  },
  settings: {
    brightness: { type: Number, default: 0, min: -2, max: 2 },
    contrast: { type: Number, default: 0, min: -2, max: 2 },
    saturation: { type: Number, default: 0, min: -2, max: 2 },
    quality: { type: Number, default: 10, min: 4, max: 63 },
    frameSize: { type: Number, default: 10 },
    hMirror: { type: Boolean, default: false },
    vFlip: { type: Boolean, default: false },
    timelapse: {
      enabled: { type: Boolean, default: true },
      interval: { type: Number, default: 60 } // Sekunden
    }
  },
  stats: {
    totalSnapshots: { type: Number, default: 0 },
    totalUploads: { type: Number, default: 0 },
    lastSnapshot: { type: Date }
  }
}, {
  timestamps: true
});

// Indizes
CameraSchema.index({ cameraId: 1 });
CameraSchema.index({ status: 1 });

module.exports = mongoose.model('Camera', CameraSchema);
