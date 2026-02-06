/**
 * Sensor Watchdog Service
 *
 * Überwacht ob der ESP32 regelmäßig Sensordaten liefert.
 * Erkennt:
 * 1. ESP32 offline (keine Daten seit N Sekunden)
 * 2. MQTT-Broker offline
 * 3. Einzelne Sensor-Ausfälle (0.0-Werte)
 *
 * Sendet Alerts über Discord/Webhook + Socket.IO an Frontend.
 */

const { sendAlert } = require('./notificationService');

// ==========================================
// KONFIGURATION
// ==========================================

const THRESHOLDS = {
  // Heartbeat: Wann gilt der ESP32 als offline?
  WARNING_AFTER_MS:  60 * 1000,     // 60 Sekunden → WARNING
  CRITICAL_AFTER_MS: 5 * 60 * 1000, // 5 Minuten → CRITICAL

  // Alert-Cooldown: Nicht öfter als alle N Minuten den gleichen Alert senden
  ALERT_COOLDOWN_MS: 10 * 60 * 1000, // 10 Minuten

  // Umgebungsgrenzwerte
  TANK_LOW_PERCENT: 10,        // Tank fast leer
  HUMIDITY_MOLD_RISK: 85,      // Schimmelgefahr
  ECO2_HIGH_PPM: 2000,         // CO2 kritisch
  TEMP_MIN_FROST: 5,           // Frostgefahr
};

const CHECK_INTERVAL_MS = 30 * 1000; // Alle 30 Sekunden prüfen

// ==========================================
// STATE
// ==========================================

let lastDataReceived = 0;         // Timestamp der letzten Sensordaten
let lastDataPayload = null;       // Letzte empfangene Daten
let currentStatus = 'unknown';    // 'ok', 'warning', 'critical', 'unknown'
let mqttConnected = false;        // MQTT-Broker Status

// Alert-Cooldowns (verhindert Alert-Spam)
const lastAlertSent = {};

let checkInterval = null;
let emitToClientsFn = null;

// ==========================================
// CORE FUNCTIONS
// ==========================================

/**
 * Aufgerufen bei jedem eingehenden Sensor-Datenpaket
 */
const onSensorData = (data) => {
  lastDataReceived = Date.now();
  lastDataPayload = data;

  // Status auf OK setzen wenn vorher nicht OK war
  if (currentStatus !== 'ok') {
    const previousStatus = currentStatus;
    currentStatus = 'ok';
    console.log(`✅ Watchdog: ESP32 Daten empfangen (Status: ${previousStatus} → ok)`);
    broadcastStatus();
  }
};

/**
 * MQTT-Verbindungsstatus Update
 */
const onMQTTStatus = (connected) => {
  const wasConnected = mqttConnected;
  mqttConnected = connected;

  if (!connected && wasConnected) {
    console.warn('⚠️ Watchdog: MQTT-Broker Verbindung verloren');
    sendThrottledAlert('mqtt_disconnect', '⚠️ MQTT Verbindung verloren',
      'Die Verbindung zum MQTT-Broker wurde unterbrochen. Sensordaten und Steuerbefehle sind nicht verfügbar.',
      0xFFA500);
    broadcastStatus();
  } else if (connected && !wasConnected) {
    console.log('✅ Watchdog: MQTT-Broker wieder verbunden');
    broadcastStatus();
  }
};

/**
 * Periodischer Heartbeat-Check
 */
const checkHeartbeat = () => {
  if (lastDataReceived === 0) {
    // Noch nie Daten empfangen (frischer Start)
    if (currentStatus !== 'unknown') {
      currentStatus = 'unknown';
      broadcastStatus();
    }
    return;
  }

  const elapsed = Date.now() - lastDataReceived;

  if (elapsed >= THRESHOLDS.CRITICAL_AFTER_MS) {
    if (currentStatus !== 'critical') {
      currentStatus = 'critical';
      console.error(`🚨 Watchdog: ESP32 CRITICAL — seit ${Math.round(elapsed / 1000)}s keine Daten!`);
      sendThrottledAlert('esp32_critical', '🚨 ESP32 Offline (Kritisch)',
        `Keine Sensordaten seit **${Math.round(elapsed / 1000)} Sekunden**.\n\nBitte prüfen:\n- ESP32 Stromversorgung\n- WiFi-Verbindung\n- MQTT-Broker`,
        0xFF0000);
      broadcastStatus();
    }
  } else if (elapsed >= THRESHOLDS.WARNING_AFTER_MS) {
    if (currentStatus !== 'warning') {
      currentStatus = 'warning';
      console.warn(`⚠️ Watchdog: ESP32 WARNING — seit ${Math.round(elapsed / 1000)}s keine Daten`);
      broadcastStatus();
    }
  } else {
    if (currentStatus !== 'ok') {
      currentStatus = 'ok';
      broadcastStatus();
    }
  }

  // Zusätzliche Umgebungs-Checks wenn Daten vorhanden
  if (lastDataPayload && currentStatus === 'ok') {
    checkEnvironmentalAlerts(lastDataPayload);
  }
};

/**
 * Umgebungs-Alerts prüfen (Tank, Humidity, CO2)
 */
const checkEnvironmentalAlerts = (data) => {
  // Tank fast leer
  if (data.tankLevel !== undefined && data.tankLevel > 0 && data.tankLevel < THRESHOLDS.TANK_LOW_PERCENT) {
    sendThrottledAlert('tank_low', '💧 Wassertank fast leer',
      `Tankfüllstand: **${data.tankLevel}%**\n\nBitte Tank nachfüllen um Bewässerungsausfall zu vermeiden.`,
      0xFFA500);
  }

  // Schimmelgefahr (hohe Luftfeuchtigkeit)
  const humidities = [data.humidity_bottom, data.humidity_middle, data.humidity_top].filter(h => h > 0);
  const maxHumidity = humidities.length > 0 ? Math.max(...humidities) : 0;
  if (maxHumidity > THRESHOLDS.HUMIDITY_MOLD_RISK) {
    sendThrottledAlert('humidity_high', '🍄 Schimmelgefahr — Hohe Luftfeuchtigkeit',
      `Maximale Luftfeuchtigkeit: **${maxHumidity.toFixed(1)}%** (Grenzwert: ${THRESHOLDS.HUMIDITY_MOLD_RISK}%)\n\nAbluft/Entfeuchter prüfen!`,
      0xFFA500);
  }

  // CO2 kritisch
  if (data.eco2 && data.eco2 > THRESHOLDS.ECO2_HIGH_PPM) {
    sendThrottledAlert('eco2_high', '💨 CO2-Level kritisch',
      `eCO2: **${data.eco2} ppm** (Grenzwert: ${THRESHOLDS.ECO2_HIGH_PPM} ppm)\n\nBelüftung prüfen!`,
      0xFF6600);
  }

  // Frostgefahr
  const temps = [data.temp_bottom, data.temp_middle, data.temp_top].filter(t => t > -40 && t !== 0);
  const minTemp = temps.length > 0 ? Math.min(...temps) : null;
  if (minTemp !== null && minTemp < THRESHOLDS.TEMP_MIN_FROST) {
    sendThrottledAlert('temp_frost', '❄️ Frostgefahr',
      `Minimale Temperatur: **${minTemp.toFixed(1)}°C** (Grenzwert: ${THRESHOLDS.TEMP_MIN_FROST}°C)\n\nHeizung prüfen!`,
      0x0088FF);
  }

  // Alle Sensoren ausgefallen (alle Temps === 0)
  const allTempsZero = [data.temp_bottom, data.temp_middle, data.temp_top]
    .every(t => t === undefined || t === null || t === 0);
  if (allTempsZero && data.temp !== undefined) {
    sendThrottledAlert('sensors_offline', '📡 Alle Temperatursensoren ausgefallen',
      'Alle 3 SHT31-Sensoren melden 0°C — wahrscheinlich I2C-Bus-Problem.\n\nVerkabelung und Pull-up-Widerstände prüfen!',
      0xFF0000);
  }
};

/**
 * Alert mit Cooldown senden (verhindert Spam)
 */
const sendThrottledAlert = (alertKey, title, message, color) => {
  const now = Date.now();
  const lastSent = lastAlertSent[alertKey] || 0;

  if (now - lastSent < THRESHOLDS.ALERT_COOLDOWN_MS) {
    return; // Cooldown noch aktiv
  }

  lastAlertSent[alertKey] = now;
  sendAlert(title, message, color);
};

/**
 * Status an Frontend broadcasten
 */
const broadcastStatus = () => {
  if (emitToClientsFn) {
    emitToClientsFn('watchdogStatus', getStatus());
  }
};

/**
 * Gibt den aktuellen Watchdog-Status zurück
 */
const getStatus = () => ({
  esp32: currentStatus,
  mqtt: mqttConnected,
  lastDataReceived: lastDataReceived || null,
  elapsedMs: lastDataReceived > 0 ? Date.now() - lastDataReceived : null,
});

// ==========================================
// LIFECYCLE
// ==========================================

const start = (emitClients) => {
  emitToClientsFn = emitClients;
  checkInterval = setInterval(checkHeartbeat, CHECK_INTERVAL_MS);
  console.log('🐕 Sensor-Watchdog gestartet');
  console.log(`   Warning nach ${THRESHOLDS.WARNING_AFTER_MS / 1000}s, Critical nach ${THRESHOLDS.CRITICAL_AFTER_MS / 1000}s`);
};

const stop = () => {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  console.log('🐕 Sensor-Watchdog gestoppt');
};

module.exports = {
  onSensorData,
  onMQTTStatus,
  getStatus,
  start,
  stop,
  THRESHOLDS
};
