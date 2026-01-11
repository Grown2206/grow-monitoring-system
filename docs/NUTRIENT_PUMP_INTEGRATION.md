# Nährstoff-Pumpen Integration - Dokumentation

## Übersicht

Die Nährstoff-Pumpen-Funktionalität ist vollständig in das Grow Monitoring System integriert:

- **ESP32 Firmware** ✅
- **Backend MQTT Service** ✅
- **Backend API Endpoints** ✅
- **Frontend Socket.io Integration** ✅
- **Frontend UI Dashboard** ✅

## Hardware-Konfiguration

### ESP32 Pins
```cpp
#define PIN_NUTRIENT_PUMP 21     // Relais für Nährstoff-Pumpe
#define PIN_LEVEL_SENSOR 22      // Analog-Füllstands-Sensor
```

### Kalibrierung
Die Flow-Rate muss kalibriert werden!
```cpp
#define DEFAULT_FLOW_RATE 100    // ml/min (Standard-Wert)
```

**Kalibrierungs-Prozess:**
1. Pumpe 60 Sekunden laufen lassen
2. Tatsächlich gepumptes Volumen messen
3. Flow-Rate anpassen: `flowRate = gemesseneML / 1 Minute`

## MQTT Kommunikation

### Topics

| Topic | Richtung | Beschreibung |
|-------|----------|-------------|
| `grow/esp32/nutrients/command` | Backend → ESP32 | Befehle (dose, stop, measure) |
| `grow/esp32/nutrients/status` | ESP32 → Backend | Pumpen-Status & Progress |
| `grow/esp32/nutrients/sensors` | ESP32 → Backend | Sensor-Werte (EC, pH, Temp) |

### Command Beispiele

#### Dosierung starten
```json
{
  "action": "dose",
  "dosage": [{
    "pumpId": 1,
    "volume_ml": 50,
    "flowRate_ml_per_min": 100
  }],
  "measureAfter": true,
  "mixAfter_seconds": 120
}
```

#### Pumpe stoppen
```json
{
  "action": "stop"
}
```

#### Sensoren messen
```json
{
  "action": "measure"
}
```

### Status Responses

#### Während Dosierung
```json
{
  "status": "dosing",
  "pumpRunning": true,
  "progress_percent": 45,
  "elapsed_ms": 13500
}
```

#### Nach Abschluss
```json
{
  "status": "completed",
  "volume_ml": 50,
  "duration_seconds": 30,
  "ec": 1.2,
  "ph": 6.0,
  "temp": 22.5
}
```

## Backend API Endpoints

### Manuelle Dosierung
```http
POST /api/nutrients/dose
Content-Type: application/json

{
  "waterVolume_liters": 10,
  "ml_per_liter": 2,
  "notes": "Wöchentliche Düngung"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dosageLog": {...},
    "reservoirState": {...}
  },
  "message": "Erfolgreich 20ml dosiert"
}
```

### Reservoir-Status
```http
GET /api/nutrients/reservoir
```

### Zeitpläne
```http
GET  /api/nutrients/schedules
POST /api/nutrients/schedules
PUT  /api/nutrients/schedules/:id
DELETE /api/nutrients/schedules/:id
```

### Logs & Statistiken
```http
GET /api/nutrients/logs?limit=50&page=1
GET /api/nutrients/stats?startDate=2026-01-01&endDate=2026-01-31
```

### Kalibrierung
```http
POST /api/nutrients/calibrate
Content-Type: application/json

{
  "sensor": "ec",
  "referenceValue": 1.0,
  "measuredValue": 1.05
}
```

## Frontend Integration

### Socket.io Events

Das Frontend empfängt automatisch Real-time Updates:

```javascript
import { useSocket } from '../context/SocketContext';

function MyComponent() {
  const { nutrientSensors, nutrientStatus } = useSocket();

  // nutrientSensors:
  // { ec, ph, temp, reservoirLevel_percent, totalDosed_ml }

  // nutrientStatus:
  // { status, pumpRunning, progress_percent, elapsed_ms }
}
```

### NutrientDashboard Komponente

Unter `frontend/src/components/Nutrients/NutrientDashboard.jsx`:

**Features:**
- Live EC/pH/Temp Anzeige
- Real-time Dosierungs-Progress Bar
- Reservoir-Level Anzeige
- Manuelle Dosierungs-UI
- Zeitplan-Management
- Warnungen & Alerts

## Testing

### 1. Backend starten
```bash
cd backend
npm run dev
```

**Erwartete Ausgabe:**
```
✅ MQTT Verbunden (Cloud)
📡 Höre auf grow_drexl_v2/data
📡 Höre auf grow/esp32/nutrients/status
📡 Höre auf grow/esp32/nutrients/sensors
```

### 2. ESP32 flashen
```bash
cd firmware
pio run -t upload
pio device monitor
```

**Erwartete Ausgabe:**
```
WLAN verbunden!
Verbinde mit MQTT (Cloud)...verbunden!
Subscribed: Haupt-System + Nährstoffe
```

### 3. Frontend starten
```bash
cd frontend
npm run dev
```

Browser öffnet: `http://localhost:5173`

### 4. Test-Dosierung

**Über Frontend:**
1. Navigiere zu "Nährstoff-Management"
2. Klicke "Jetzt Dosieren"
3. Eingabe: 10 Liter Wasser, 2ml/Liter
4. Beobachte Real-time Progress Bar

**Über API (curl):**
```bash
curl -X POST http://localhost:3000/api/nutrients/dose \
  -H "Content-Type: application/json" \
  -d '{
    "waterVolume_liters": 10,
    "ml_per_liter": 2,
    "notes": "Test"
  }'
```

**Über MQTT (mosquitto_pub):**
```bash
mosquitto_pub -h test.mosquitto.org \
  -t grow/esp32/nutrients/command \
  -m '{"action":"dose","dosage":[{"pumpId":1,"volume_ml":50,"flowRate_ml_per_min":100}],"measureAfter":true}'
```

### 5. Sensor-Messung testen

**Über API:**
```bash
# ESP32 soll Sensoren messen
curl -X POST http://localhost:3000/api/nutrients/measure
```

Oder via MQTT:
```bash
mosquitto_pub -h test.mosquitto.org \
  -t grow/esp32/nutrients/command \
  -m '{"action":"measure"}'
```

**Erwartetes Ergebnis:**
- Backend-Log: `🧪 Nährstoff-Sensordaten: {...}`
- Frontend: Live-Update der EC/pH/Temp Werte

## Troubleshooting

### Problem: Backend empfängt keine MQTT Messages

**Lösung:**
1. Prüfe MQTT-Broker Verbindung: `backend/src/services/mqttService.js`
2. Stelle sicher Topics stimmen überein (ESP32 ↔ Backend)
3. Prüfe Firewall (Port 1883)

### Problem: Frontend zeigt keine Live-Updates

**Lösung:**
1. Öffne Browser Console (F12)
2. Prüfe: `✅ Socket verbunden mit ID: ...`
3. Prüfe: `🧪 Nährstoff-Status: ...` messages
4. Falls keine Messages: Backend `io.emit()` prüfen

### Problem: Pumpe startet nicht

**Lösung:**
1. ESP32 Serial Monitor prüfen
2. Stelle sicher Relais-Pin korrekt (Pin 21)
3. Prüfe 12V Stromversorgung für Pumpe
4. Test mit manuellem `digitalWrite(21, HIGH)`

### Problem: Dosierungs-Dauer ungenau

**Lösung:**
1. Flow-Rate kalibrieren!
2. Tatsächlich gepumptes Volumen über 60 Sek messen
3. `DEFAULT_FLOW_RATE` anpassen

## Nächste Schritte

### Empfohlene Erweiterungen

1. **EC/pH Sensoren integrieren**
   - Atlas Scientific EZO-EC/pH Module
   - I2C oder UART Kommunikation
   - Automatische Kalibrierung

2. **Peristaltik-Pumpen für präzise Dosierung**
   - Stepper-Motor Steuerung
   - Genauere ml/min Kontrolle

3. **Mehrere Nährstoff-Reservoirs**
   - Micro, Bloom, CalMag, pH-Down separat
   - Komplexe Rezept-Dosierung

4. **Automatische Dosierung nach Schedule**
   - Cron-Jobs im Backend
   - `NutrientSchedule` Model aktivieren

5. **Datenbank-Logging verbessern**
   - Historische Trend-Analysen
   - Korrelation EC/pH mit Pflanzenwachstum

## Sicherheitshinweise

⚠️ **WICHTIG:**

- **Maximale Dosierung:** 500ml pro Command (Backend-Check)
- **Cooldown:** Nach Dosierung 5 Sek Pause
- **Timeout:** 3 Minuten max. Dosierungs-Dauer
- **Reservoir-Check:** Verhindert Dosierung bei leerem Reservoir
- **Emergency Stop:** `{"action": "stop"}` Command jederzeit möglich

## Produktions-Deployment

Für Produktion **WICHTIG**:

1. **Privater MQTT Broker** (nicht test.mosquitto.org!)
   ```bash
   docker run -d -p 1883:1883 eclipse-mosquitto
   ```

2. **MQTT Authentifizierung**
   ```javascript
   const client = mqtt.connect(BROKER_URL, {
     username: process.env.MQTT_USER,
     password: process.env.MQTT_PASS
   });
   ```

3. **SSL/TLS für MQTT**
   ```javascript
   const client = mqtt.connect('mqtts://broker.example.com:8883', {
     ca: fs.readFileSync('ca.crt'),
     cert: fs.readFileSync('client.crt'),
     key: fs.readFileSync('client.key')
   });
   ```

4. **Rate Limiting für API**
   - Bereits implementiert in `backend/src/server.js`
   - Production: 100 req/15min

## Support

Bei Fragen oder Problemen:
- GitHub Issues: `https://github.com/yourusername/grow-system/issues`
- Dokumentation: Siehe `CLAUDE.md` und `README.md`

---

**Status:** ✅ Vollständig integriert und funktionsfähig
**Version:** 2.4 (Januar 2026)
**Letzte Aktualisierung:** 2026-01-02
