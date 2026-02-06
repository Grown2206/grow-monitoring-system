const mqtt = require('mqtt');
const EventEmitter = require('events');
const { BROKER_URL, TOPICS, OPTIONS } = require('../config/mqtt');

// Event Emitter für Sensor-Daten (entkoppelt Automation)
// Andere Services können auf 'sensorData' Events hören
const sensorDataEmitter = new EventEmitter();

// Sensor-Watchdog importieren (Heartbeat-Überwachung)
let sensorWatchdog = null;
try {
  sensorWatchdog = require('./watchdogService');
} catch (e) { /* Watchdog optional */ }

console.log(`Verbinde zu MQTT Broker: ${BROKER_URL}`);
const client = mqtt.connect(BROKER_URL, OPTIONS);

client.on('connect', () => {
  console.log('✅ MQTT Verbunden');
  if (sensorWatchdog) sensorWatchdog.onMQTTStatus(true);

  // Abonniere alle Topics
  client.subscribe(TOPICS.DATA, (err) => {
    if(!err) console.log(`📡 Höre auf ${TOPICS.DATA}`);
  });
  client.subscribe(TOPICS.NUTRIENT_STATUS, (err) => {
    if(!err) console.log(`📡 Höre auf ${TOPICS.NUTRIENT_STATUS}`);
  });
  client.subscribe(TOPICS.NUTRIENT_SENSORS, (err) => {
    if(!err) console.log(`📡 Höre auf ${TOPICS.NUTRIENT_SENSORS}`);
  });
});

client.on('error', (err) => {
  console.error('❌ MQTT Fehler:', err.message);
});

client.on('offline', () => {
  console.warn('⚠️ MQTT Broker offline — Versuche Reconnect...');
  if (sensorWatchdog) sensorWatchdog.onMQTTStatus(false);
});

client.on('close', () => {
  console.warn('⚠️ MQTT Verbindung geschlossen');
  if (sensorWatchdog) sensorWatchdog.onMQTTStatus(false);
});

// Lazy-Load io instance to avoid circular dependency
let io = null;
const getIO = () => {
  if (!io) {
    try {
      const server = require('../server');
      io = server.io;
    } catch (e) {
      // Server not yet initialized
    }
  }
  return io;
};

client.on('message', async (topic, message) => {
  if (topic === TOPICS.DATA) {
    try {
      const data = JSON.parse(message.toString());

      // Daten in DB speichern
      try {
        const { saveSensorData } = require('../controllers/dataController');
        if (typeof saveSensorData === 'function') {
          await saveSensorData(data);
          // console.log("Sensordaten empfangen & gespeichert");
        }
      } catch (e) { console.error("Controller Error:", e.message); }

      // Watchdog: Sensor-Heartbeat aktualisieren
      if (sensorWatchdog) sensorWatchdog.onSensorData(data);

      // Broadcast an alle Socket.io Clients
      const socketIO = getIO();
      if (socketIO) {
        socketIO.emit('sensorData', data);
      }

      // Emit sensor data event für Automation Service
      // Event Emitter Pattern entkoppelt mqttService von automationService
      sensorDataEmitter.emit('sensorData', {
        data,
        publishCommand: (cmd) => {
          // Callback-Funktion zum Senden von MQTT-Befehlen
          client.publish(TOPICS.COMMAND, JSON.stringify(cmd));
        },
        emitToClients: (event, payload) => {
          // Callback-Funktion zum Senden an Socket.io Clients
          if (socketIO) {
            socketIO.emit(event, payload);
          }
        }
      });
    } catch (e) { console.error("JSON Parse Error:", e.message); }
  }
  else if (topic === TOPICS.NUTRIENT_STATUS) {
    try {
      const data = JSON.parse(message.toString());
      console.log('🧪 Nährstoff-Status:', data);

      // Broadcast an alle Socket.io Clients für Live-Updates
      const socketIO = getIO();
      if (socketIO) {
        socketIO.emit('nutrientStatus', data);
      }
    } catch (e) { console.error("Nutrient Status Parse Error:", e.message); }
  }
  else if (topic === TOPICS.NUTRIENT_SENSORS) {
    try {
      const data = JSON.parse(message.toString());
      console.log('🧪 Nährstoff-Sensoren:', data);

      // Save to database if EC/pH data is present
      if (data.ec !== undefined && data.ph !== undefined) {
        try {
          const NutrientReading = require('../models/NutrientReading');

          const reading = new NutrientReading({
            ec: {
              value: data.ec,
              unit: data.ecUnit || 'mS/cm',
              compensated: data.tempCompensated || false
            },
            ph: {
              value: data.ph,
              temperature: data.temp || data.temperature
            },
            temperature: data.temp || data.temperature || 25,
            reservoir: {
              id: data.reservoirId || 'main',
              level: data.reservoirLevel_percent || data.reservoirLevel || 0,
              volume: data.reservoirVolume
            },
            quality: {
              ecValid: data.ecValid !== false,
              phValid: data.phValid !== false,
              calibrated: data.calibrated || false
            },
            source: 'esp32'
          });

          // Check thresholds
          const DEFAULT_THRESHOLDS = {
            ec: { min: 0.8, max: 2.5, critical: { min: 0.5, max: 3.5 } },
            ph: { min: 5.5, max: 6.5, critical: { min: 4.5, max: 7.5 } },
            temperature: { max: 28, critical: 32 },
            reservoir: { minLevel: 20 }
          };
          reading.checkThresholds(DEFAULT_THRESHOLDS);

          await reading.save();
          console.log(`💾 EC/pH Reading saved: EC=${data.ec} pH=${data.ph}`);
        } catch (dbError) {
          console.error('❌ Error saving nutrient reading:', dbError.message);
        }
      }

      // Broadcast an alle Socket.io Clients
      const socketIO = getIO();
      if (socketIO) {
        socketIO.emit('nutrientSensors', data);
      }
    } catch (e) { console.error("Nutrient Sensors Parse Error:", e.message); }
  }
});

const publish = (topic, message) => {
  if (client.connected) {
    client.publish(topic, typeof message === 'object' ? JSON.stringify(message) : message);
  }
};

module.exports = {
  client,
  publish,
  sensorDataEmitter  // Export emitter für event-basierte Kommunikation
};