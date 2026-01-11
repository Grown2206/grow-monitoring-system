const pushNotificationService = require('../services/pushNotificationService');

/**
 * Abonniert Push-Notifications
 */
exports.subscribe = async (req, res) => {
  try {
    const subscription = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Subscription-Daten'
      });
    }

    const userAgent = req.headers['user-agent'];
    const saved = await pushNotificationService.saveSubscription(subscription, userAgent);

    res.json({
      success: true,
      message: 'Push-Notifications aktiviert',
      subscriptionId: saved._id
    });
  } catch (error) {
    console.error('Fehler beim Abonnieren:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktivieren der Push-Notifications'
    });
  }
};

/**
 * Beendet Push-Notifications
 */
exports.unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Endpoint fehlt'
      });
    }

    await pushNotificationService.removeSubscription(endpoint);

    res.json({
      success: true,
      message: 'Push-Notifications deaktiviert'
    });
  } catch (error) {
    console.error('Fehler beim Abmelden:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Deaktivieren der Push-Notifications'
    });
  }
};

/**
 * Sendet eine Test-Notification
 */
exports.sendTest = async (req, res) => {
  try {
    const { title, body } = req.body;

    const result = await pushNotificationService.sendToAll({
      title: title || '🧪 Test-Benachrichtigung',
      body: body || 'Dies ist eine Test-Benachrichtigung vom Grow System',
      tag: 'test',
      icon: '/icons/icon-192x192.png',
      actions: [
        { action: 'view', title: 'Anzeigen' },
        { action: 'dismiss', title: 'OK' }
      ]
    });

    res.json({
      success: true,
      message: 'Test-Notification gesendet',
      result
    });
  } catch (error) {
    console.error('Fehler beim Senden der Test-Notification:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Senden der Test-Notification'
    });
  }
};

/**
 * Gibt VAPID Public Key zurück
 */
exports.getPublicKey = (req, res) => {
  try {
    const publicKey = pushNotificationService.getVapidPublicKey();
    res.json({
      success: true,
      publicKey
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Public Key:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen des Public Key'
    });
  }
};

/**
 * Gibt Statistiken über Push-Subscriptions zurück
 */
exports.getStats = async (req, res) => {
  try {
    const stats = await pushNotificationService.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Stats:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Statistiken'
    });
  }
};

/**
 * Bereinigt inaktive Subscriptions
 */
exports.cleanup = async (req, res) => {
  try {
    const daysOld = parseInt(req.query.days) || 90;
    const deletedCount = await pushNotificationService.cleanupInactiveSubscriptions(daysOld);

    res.json({
      success: true,
      message: `${deletedCount} inaktive Subscriptions gelöscht`,
      deletedCount
    });
  } catch (error) {
    console.error('Fehler beim Cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Cleanup'
    });
  }
};

module.exports = exports;
