const webPush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// VAPID Keys - sollten in .env gespeichert werden
// Generierung: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@grow-system.local';

// Prüfe ob VAPID Keys konfiguriert sind
let pushNotificationsEnabled = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    // Web-Push konfigurieren
    webPush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    pushNotificationsEnabled = true;
    console.log('✅ Push-Notifications Service aktiviert');
  } catch (error) {
    console.error('❌ Fehler bei VAPID-Konfiguration:', error.message);
    console.warn('⚠️  Push-Notifications deaktiviert - Bitte VAPID Keys in .env konfigurieren');
  }
} else {
  console.warn('⚠️  VAPID Keys nicht konfiguriert - Push-Notifications deaktiviert');
  console.log('💡 Generiere Keys mit: npx web-push generate-vapid-keys');
  console.log('💡 Füge sie dann zur .env Datei hinzu');
}

class PushNotificationService {
  /**
   * Speichert eine neue Push-Subscription
   */
  async saveSubscription(subscription, userAgent = null) {
    try {
      const existingSubscription = await PushSubscription.findOne({
        endpoint: subscription.endpoint
      });

      if (existingSubscription) {
        // Update existing
        existingSubscription.keys = subscription.keys;
        existingSubscription.active = true;
        existingSubscription.lastUsed = new Date();
        if (userAgent) {
          existingSubscription.deviceInfo = {
            userAgent,
            platform: this.detectPlatform(userAgent),
            createdAt: new Date()
          };
        }
        await existingSubscription.save();
        console.log('✅ Push-Subscription aktualisiert:', subscription.endpoint);
        return existingSubscription;
      }

      // Create new
      const newSubscription = new PushSubscription({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        deviceInfo: userAgent ? {
          userAgent,
          platform: this.detectPlatform(userAgent),
          createdAt: new Date()
        } : undefined
      });

      await newSubscription.save();
      console.log('✅ Neue Push-Subscription gespeichert:', subscription.endpoint);
      return newSubscription;
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Subscription:', error);
      throw error;
    }
  }

  /**
   * Entfernt eine Subscription
   */
  async removeSubscription(endpoint) {
    try {
      await PushSubscription.deleteOne({ endpoint });
      console.log('✅ Push-Subscription entfernt:', endpoint);
      return true;
    } catch (error) {
      console.error('❌ Fehler beim Entfernen der Subscription:', error);
      return false;
    }
  }

  /**
   * Sendet eine Push-Notification an alle aktiven Subscriptions
   */
  async sendToAll(payload, options = {}) {
    if (!pushNotificationsEnabled) {
      console.warn('⚠️  Push-Notifications nicht aktiviert - Überspringe Versand');
      return { successful: 0, failed: 0, total: 0, disabled: true };
    }

    try {
      const subscriptions = await PushSubscription.find({ active: true });
      console.log(`📤 Sende Push-Notification an ${subscriptions.length} Geräte...`);

      const results = await Promise.allSettled(
        subscriptions.map(sub => this.sendNotification(sub, payload, options))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`✅ ${successful} erfolgreich, ❌ ${failed} fehlgeschlagen`);

      return { successful, failed, total: subscriptions.length };
    } catch (error) {
      console.error('❌ Fehler beim Senden an alle:', error);
      throw error;
    }
  }

  /**
   * Sendet eine Push-Notification an eine einzelne Subscription
   */
  async sendNotification(subscription, payload, options = {}) {
    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: subscription.keys
      };

      const pushPayload = JSON.stringify({
        title: payload.title || 'Grow System',
        body: payload.body || '',
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/icon-72x72.png',
        tag: payload.tag || 'default',
        data: payload.data || {},
        actions: payload.actions || [],
        priority: payload.priority || 'normal',
        ...payload
      });

      const pushOptions = {
        TTL: options.ttl || 3600, // 1 Stunde
        urgency: options.urgency || 'normal', // very-low, low, normal, high
        ...options
      };

      await webPush.sendNotification(pushSubscription, pushPayload, pushOptions);

      // Update lastUsed
      await PushSubscription.updateOne(
        { endpoint: subscription.endpoint },
        { lastUsed: new Date() }
      );

      return { success: true };
    } catch (error) {
      // Subscription nicht mehr gültig - deaktivieren
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.warn('⚠️ Subscription ungültig, deaktiviere:', subscription.endpoint);
        await PushSubscription.updateOne(
          { endpoint: subscription.endpoint },
          { active: false }
        );
      } else {
        console.error('❌ Fehler beim Senden der Notification:', error);
      }
      throw error;
    }
  }

  /**
   * Sendet Sensor-Alerts als Push-Notifications
   */
  async sendSensorAlert(alertType, data) {
    const alerts = {
      'temp-high': {
        title: '🌡️ Temperatur-Warnung',
        body: `Temperatur zu hoch: ${data.temp}°C`,
        tag: 'temp-high',
        priority: 'high',
        requireInteraction: true,
        actions: [
          { action: 'view', title: 'Anzeigen' },
          { action: 'dismiss', title: 'OK' }
        ]
      },
      'temp-low': {
        title: '❄️ Temperatur-Warnung',
        body: `Temperatur zu niedrig: ${data.temp}°C`,
        tag: 'temp-low'
      },
      'humidity-high': {
        title: '💧 Luftfeuchtigkeit hoch',
        body: `Luftfeuchtigkeit: ${data.humidity}%`,
        tag: 'humidity-high'
      },
      'humidity-low': {
        title: '🏜️ Luftfeuchtigkeit niedrig',
        body: `Luftfeuchtigkeit: ${data.humidity}%`,
        tag: 'humidity-low'
      },
      'tank-low': {
        title: '🚰 Wassertank',
        body: 'Wassertank fast leer - bitte nachfüllen',
        tag: 'tank-low',
        priority: 'high'
      },
      'gas-high': {
        title: '⚠️ Gas-Warnung',
        body: 'Hohe Gas-Konzentration erkannt!',
        tag: 'gas-high',
        priority: 'high',
        requireInteraction: true
      },
      'soil-dry': {
        title: '🌱 Bewässerung',
        body: data.message || 'Pflanzen benötigen Wasser',
        tag: 'soil-dry'
      }
    };

    const alert = alerts[alertType];
    if (!alert) {
      console.warn('⚠️ Unbekannter Alert-Typ:', alertType);
      return;
    }

    return this.sendToAll(alert, {
      urgency: alert.priority === 'high' ? 'high' : 'normal'
    });
  }

  /**
   * Erkennt Plattform aus User-Agent
   */
  detectPlatform(userAgent) {
    if (!userAgent) return 'unknown';
    if (userAgent.includes('Android')) return 'android';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'ios';
    if (userAgent.includes('Windows')) return 'windows';
    if (userAgent.includes('Mac')) return 'mac';
    if (userAgent.includes('Linux')) return 'linux';
    return 'unknown';
  }

  /**
   * Gibt VAPID Public Key zurück (für Frontend)
   */
  getVapidPublicKey() {
    if (!pushNotificationsEnabled) {
      return null;
    }
    return VAPID_PUBLIC_KEY;
  }

  /**
   * Prüft ob Push-Notifications aktiviert sind
   */
  isEnabled() {
    return pushNotificationsEnabled;
  }

  /**
   * Bereinigt inaktive Subscriptions
   */
  async cleanupInactiveSubscriptions(daysOld = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await PushSubscription.deleteMany({
        active: false,
        lastUsed: { $lt: cutoffDate }
      });

      console.log(`🧹 ${result.deletedCount} inaktive Subscriptions gelöscht`);
      return result.deletedCount;
    } catch (error) {
      console.error('❌ Fehler beim Cleanup:', error);
      return 0;
    }
  }

  /**
   * Statistiken über Push-Subscriptions
   */
  async getStats() {
    try {
      const total = await PushSubscription.countDocuments();
      const active = await PushSubscription.countDocuments({ active: true });
      const inactive = total - active;

      const platforms = await PushSubscription.aggregate([
        { $match: { active: true } },
        { $group: { _id: '$deviceInfo.platform', count: { $sum: 1 } } }
      ]);

      return {
        total,
        active,
        inactive,
        platforms: platforms.reduce((acc, p) => {
          acc[p._id || 'unknown'] = p.count;
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Stats:', error);
      return null;
    }
  }
}

module.exports = new PushNotificationService();
