const mongoose = require('mongoose');

const SystemLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'error', 'success'],
    default: 'info'
  },
  source: String, // z.B. "Automation", "User", "ESP32"
  message: String
});

// Auto-Delete nach 30 Tagen (Optional, um DB sauber zu halten)
SystemLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('SystemLog', SystemLogSchema);