const WebSocket = require('ws');
const { saveSensorData } = require('../controllers/dataController');
const { checkAutomationRules } = require('../services/automationService');

let esp32Socket = null;
let clients = [];

const setupWebSocket = (server) => {
  const wss = new WebSocket.Server({ server });

  // Hilfsfunktion: Nachricht an alle Frontends senden
  const broadcast = (data) => {
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  wss.on('connection', (ws) => {
    // console.log('[WS] Neuer Client verbunden');

    ws.on('message', async (message) => {
      try {
        const msg = JSON.parse(message);

        // --- FALL 1: Sensordaten vom ESP32 ---
        if (msg.type === 'sensor_update') {
          // ESP32 Socket speichern falls noch nicht bekannt
          if (!esp32Socket) esp32Socket = ws;

          // 1. In Datenbank speichern
          await saveSensorData(msg.data);

          // 2. Automatisierung & Sicherheit prüfen
          // Wir übergeben jetzt auch die 'broadcast' Funktion, damit Alarme ans Frontend gehen
          checkAutomationRules(msg.data, esp32Socket, broadcast);

          // 3. An alle Frontend-Clients weiterleiten (Live Update)
          broadcast(msg);
        }
        
        // --- FALL 2: Authentifizierung vom ESP32 ---
        else if (msg.type === 'auth' && msg.device === 'esp32_main') {
          esp32Socket = ws;
          console.log('✅ ESP32 verbunden & bereit.');
        }

        // --- FALL 3: Befehl vom Frontend (Licht, Pumpe etc.) ---
        else if (msg.command) {
          console.log(`[CMD] Sende an ESP32: ${msg.command} -> ${msg.state}`);
          
          if (esp32Socket && esp32Socket.readyState === WebSocket.OPEN) {
            esp32Socket.send(JSON.stringify(msg));
          } else {
            console.warn('⚠️ Befehl konnte nicht gesendet werden: ESP32 offline.');
          }
        }

      } catch (e) {
        console.error('WS Error:', e);
      }
    });

    ws.on('close', () => {
      if (ws === esp32Socket) {
        esp32Socket = null;
        console.log('❌ ESP32 getrennt!');
      }
      clients = clients.filter(c => c !== ws);
    });

    clients.push(ws);
  });
};

module.exports = setupWebSocket;