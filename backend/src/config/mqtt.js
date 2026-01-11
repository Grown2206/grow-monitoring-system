/**
 * MQTT Configuration - Zentrale Topic-Definitionen
 * WICHTIG: Diese Topics MÜSSEN mit der Arduino/ESP32 Firmware übereinstimmen!
 */

// Basis-Prefix für alle Topics
const TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX || 'grow_drexl_v2';

// MQTT Topics
module.exports = {
  // Broker-URL
  BROKER_URL: process.env.MQTT_BROKER_URL || 'mqtt://test.mosquitto.org',

  // Topic-Definitionen
  TOPICS: {
    // Sensor-Daten vom ESP32 (eingehend)
    DATA: `${TOPIC_PREFIX}/data`,

    // Konfiguration an ESP32 (ausgehend)
    CONFIG: `${TOPIC_PREFIX}/config`,

    // Befehle an ESP32 (ausgehend)
    COMMAND: `${TOPIC_PREFIX}/command`,

    // Nährstoff-Status vom ESP32 (eingehend)
    NUTRIENT_STATUS: 'grow/esp32/nutrients/status',

    // Nährstoff-Sensoren (EC/pH) vom ESP32 (eingehend)
    NUTRIENT_SENSORS: 'grow/esp32/nutrients/sensors',
  },

  // MQTT Client Options
  OPTIONS: {
    reconnectPeriod: 5000,
    connectTimeout: 30000,
    clientId: `backend_drexl_${Math.random().toString(16).substr(2, 8)}`
  }
};
