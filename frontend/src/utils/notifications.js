/**
 * Push Notification Utility für Grow System
 * Unterstützt Web Push API, Browser Notifications und In-App Notifications
 */

// VAPID Public Key (muss vom Backend generiert werden)
// Generierung: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = 'REPLACE_WITH_YOUR_VAPID_PUBLIC_KEY';

/**
 * Prüft ob Notifications unterstützt werden
 */
export function isNotificationSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Fordert Benachrichtigungs-Berechtigung an
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    console.warn('Notifications werden von diesem Browser nicht unterstützt');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission === 'granted';
  } catch (error) {
    console.error('Fehler beim Anfordern der Berechtigung:', error);
    return false;
  }
}

/**
 * Abonniert Push-Notifications
 */
export async function subscribeToPushNotifications() {
  if (!isNotificationSupported()) {
    throw new Error('Push Notifications werden nicht unterstützt');
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Prüfe ob bereits abonniert
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Konvertiere VAPID Key zu Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      console.log('Push-Subscription erstellt:', subscription);
    }

    // Sende Subscription an Backend
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });

    return subscription;
  } catch (error) {
    console.error('Fehler beim Abonnieren:', error);
    throw error;
  }
}

/**
 * Hebt Push-Notifications Abonnement auf
 */
export async function unsubscribeFromPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();

      // Informiere Backend
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });

      console.log('Push-Subscription beendet');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Fehler beim Abmelden:', error);
    return false;
  }
}

/**
 * Zeigt eine lokale Browser-Benachrichtigung
 */
export function showLocalNotification(title, options = {}) {
  if (!isNotificationSupported()) {
    console.warn('Notifications nicht unterstützt');
    return null;
  }

  if (Notification.permission === 'granted') {
    const defaultOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      timestamp: Date.now(),
      ...options
    };

    return new Notification(title, defaultOptions);
  } else {
    console.warn('Notification permission nicht granted');
    return null;
  }
}

/**
 * Erstellt Benachrichtigungen basierend auf Sensor-Daten
 */
export function checkSensorAlerts(data, settings = {}) {
  const alerts = [];

  // Temperatur-Checks
  if (data.temp > (settings.tempMax || 32)) {
    alerts.push({
      type: 'critical',
      title: '🌡️ Temperatur zu hoch!',
      body: `Aktuelle Temperatur: ${data.temp.toFixed(1)}°C`,
      tag: 'temp-high',
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'Anzeigen' },
        { action: 'dismiss', title: 'Ignorieren' }
      ]
    });
  }

  if (data.temp < (settings.tempMin || 18)) {
    alerts.push({
      type: 'warning',
      title: '❄️ Temperatur zu niedrig',
      body: `Aktuelle Temperatur: ${data.temp.toFixed(1)}°C`,
      tag: 'temp-low'
    });
  }

  // Luftfeuchtigkeit-Checks
  if (data.humidity > (settings.humidityMax || 70)) {
    alerts.push({
      type: 'warning',
      title: '💧 Luftfeuchtigkeit zu hoch',
      body: `Aktuelle Luftfeuchtigkeit: ${data.humidity.toFixed(0)}%`,
      tag: 'humidity-high'
    });
  }

  if (data.humidity < (settings.humidityMin || 40)) {
    alerts.push({
      type: 'warning',
      title: '🏜️ Luftfeuchtigkeit zu niedrig',
      body: `Aktuelle Luftfeuchtigkeit: ${data.humidity.toFixed(0)}%`,
      tag: 'humidity-low'
    });
  }

  // Wassertank-Level
  if (data.tank < (settings.tankMin || 500)) {
    alerts.push({
      type: 'info',
      title: '🚰 Wassertank fast leer',
      body: 'Bitte Wasser nachfüllen',
      tag: 'tank-low'
    });
  }

  // Gas-Warnung
  if (data.gas > (settings.gasMax || 3000)) {
    alerts.push({
      type: 'critical',
      title: '⚠️ Hohe Gas-Konzentration!',
      body: 'Bitte Belüftung prüfen',
      tag: 'gas-high',
      requireInteraction: true
    });
  }

  // Boden-Feuchtigkeit (Array von 6 Werten)
  if (data.soil && Array.isArray(data.soil)) {
    const drySoils = data.soil
      .map((value, index) => ({ value, slot: index + 1 }))
      .filter(s => s.value < (settings.soilMin || 30));

    if (drySoils.length > 0) {
      alerts.push({
        type: 'info',
        title: '🌱 Pflanzen benötigen Wasser',
        body: `Slot(s) ${drySoils.map(s => s.slot).join(', ')} sind trocken`,
        tag: 'soil-dry'
      });
    }
  }

  return alerts;
}

/**
 * Sendet Benachrichtigungen für erkannte Alerts
 */
export function sendAlertNotifications(alerts) {
  if (!alerts || alerts.length === 0) return;

  alerts.forEach(alert => {
    showLocalNotification(alert.title, {
      body: alert.body,
      tag: alert.tag,
      requireInteraction: alert.requireInteraction || false,
      actions: alert.actions || [],
      data: { type: alert.type }
    });
  });
}

/**
 * Hilfsfunktion: Konvertiert Base64 zu Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Installiert PWA (falls unterstützt)
 */
export function installPWA() {
  return new Promise((resolve, reject) => {
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
    });

    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('PWA installiert');
          resolve(true);
        } else {
          console.log('PWA Installation abgebrochen');
          resolve(false);
        }
        deferredPrompt = null;
      });
    } else {
      reject(new Error('PWA Installation nicht verfügbar'));
    }
  });
}

/**
 * Prüft ob die App als PWA läuft
 */
export function isRunningAsPWA() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export default {
  isNotificationSupported,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  showLocalNotification,
  checkSensorAlerts,
  sendAlertNotifications,
  installPWA,
  isRunningAsPWA
};
