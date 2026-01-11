const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
  endpoint: {
    type: String,
    required: true,
    unique: true
  },
  keys: {
    p256dh: {
      type: String,
      required: true
    },
    auth: {
      type: String,
      required: true
    }
  },
  userId: {
    type: String,
    default: 'default-user' // Für Multi-User später
  },
  deviceInfo: {
    userAgent: String,
    platform: String,
    createdAt: Date
  },
  active: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index für schnelle Abfragen
pushSubscriptionSchema.index({ userId: 1, active: 1 });
pushSubscriptionSchema.index({ endpoint: 1 });

// Cleanup inaktiver Subscriptions nach 90 Tagen
pushSubscriptionSchema.index({ lastUsed: 1 }, { expireAfterSeconds: 7776000 }); // 90 Tage

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
