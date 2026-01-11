# 🚀 Implementierungsplan - Nächste Features

**Reihenfolge:** 3 → 1 → 2 (Auto-VPD → EC/pH Sensoren → Timelapse)

---

## 🌡️ Feature 1: Auto-VPD-Steuerung

**Priorität:** ⭐⭐⭐⭐⭐
**Aufwand:** ~4-6 Stunden
**Komplexität:** Mittel

### Was ist VPD?

**Vapor Pressure Deficit** = Dampfdruckdefizit
Optimal: 0.8-1.2 kPa (Veg), 1.0-1.5 kPa (Bloom)

VPD = (1 - RH/100) × SVP
Wobei SVP = Sättigungsdampfdruck bei gegebener Temperatur

### Was brauchen wir?

#### **Backend:**
1. **VPD-Berechnungs-Service** (`backend/src/services/vpdService.js`)
   - Berechne aktuelles VPD aus Temp/Humidity
   - Bestimme Ziel-VPD basierend auf Grow-Phase
   - PID-Controller für sanfte Regelung

2. **Automation-Controller erweitern** (`backend/src/services/automationService.js`)
   - VPD-basierte Lüfter-Steuerung
   - Hysterese-Kontrolle (verhindert zu häufiges Schalten)
   - Notfall-Modi bei extremen Werten

3. **VPD-Konfigurations-API** (`backend/src/routes/vpdRoutes.js`)
   - GET/POST `/api/vpd/config` - Zielwerte konfigurieren
   - GET `/api/vpd/current` - Aktuelles VPD
   - GET `/api/vpd/history` - VPD-Verlauf

#### **Frontend:**
1. **VPD-Dashboard-Card** (`frontend/src/components/Dashboard/VPDCard.jsx`)
   - Zeigt aktuelles VPD mit Farb-Indikator
   - Zielbereich visualisieren (grüner Balken)
   - Status: Optimal / Zu hoch / Zu niedrig

2. **VPD-Konfigurations-Panel** (in Settings)
   - Slider für Ziel-VPD (0.4 - 2.0 kPa)
   - Toggle: Auto-VPD an/aus
   - Aggressivität: Sanft / Normal / Aggressiv

3. **VPD-Chart** (in Analytics)
   - Verlauf über Zeit
   - Markierung optimaler Bereich

#### **ESP32 Firmware:**
- ✅ Bereits implementiert: PWM Lüfter-Steuerung
- ✅ Bereits implementiert: Temp/Humidity Sensoren
- Nur Backend muss PWM-Commands senden

### Implementierungs-Schritte

**Step 1: VPD-Service (Backend)**
```javascript
// backend/src/services/vpdService.js
class VPDService {
  calculateVPD(temp, humidity) {
    // SVP-Formel (Antoine-Gleichung)
    const svp = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
    const vpd = svp * (1 - humidity / 100);
    return vpd;
  }

  getTargetVPD(growStage) {
    // Vegetativ: 0.8-1.2, Blüte: 1.0-1.5
    const targets = {
      seedling: { min: 0.4, max: 0.8 },
      vegetative: { min: 0.8, max: 1.2 },
      flowering: { min: 1.0, max: 1.5 },
      late_flowering: { min: 1.2, max: 1.6 }
    };
    return targets[growStage] || targets.vegetative;
  }

  calculateFanSpeed(currentVPD, targetVPD, currentFanSpeed) {
    // PID-Controller
    const error = currentVPD - targetVPD.max;

    if (error > 0.3) return 100; // Zu hoch → volle Power
    if (error > 0.1) return Math.min(currentFanSpeed + 10, 80);
    if (error < -0.3) return 30; // Zu niedrig → Minimum
    if (error < -0.1) return Math.max(currentFanSpeed - 10, 30);

    return currentFanSpeed; // Im optimalen Bereich
  }
}
```

**Step 2: Automation-Service erweitern**
```javascript
// In backend/src/services/automationService.js
setInterval(async () => {
  const sensorData = await SensorLog.findOne().sort({ timestamp: -1 });
  const config = await AutomationConfig.findOne();

  if (config.vpdControl.enabled) {
    const currentVPD = vpdService.calculateVPD(
      sensorData.temp,
      sensorData.humidity
    );

    const targetVPD = vpdService.getTargetVPD(config.growStage);
    const newFanSpeed = vpdService.calculateFanSpeed(
      currentVPD,
      targetVPD,
      sensorData.fanPWM
    );

    // Command an ESP32 senden
    mqttClient.publish('grow_drexl_v2/command', JSON.stringify({
      action: 'set_fan_pwm',
      value: newFanSpeed
    }));
  }
}, 30000); // Alle 30 Sekunden prüfen
```

**Step 3: Frontend VPD-Card**
```jsx
// frontend/src/components/Dashboard/VPDCard.jsx
export default function VPDCard({ temp, humidity }) {
  const vpd = calculateVPD(temp, humidity);
  const status = vpd >= 0.8 && vpd <= 1.5 ? 'optimal' :
                 vpd < 0.8 ? 'too_low' : 'too_high';

  return (
    <div className="bg-slate-900 p-6 rounded-xl">
      <h3 className="text-slate-400 text-sm">VPD (Vapor Pressure Deficit)</h3>
      <div className="flex items-end gap-2 mt-2">
        <span className="text-4xl font-bold text-white">{vpd.toFixed(2)}</span>
        <span className="text-slate-500 mb-1">kPa</span>
      </div>

      <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${
            status === 'optimal' ? 'bg-emerald-500' :
            status === 'too_low' ? 'bg-blue-500' : 'bg-red-500'
          }`}
          style={{ width: `${Math.min((vpd / 2) * 100, 100)}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>0.4</span>
        <span className="text-emerald-400 font-bold">0.8 - 1.5 (Optimal)</span>
        <span>2.0</span>
      </div>

      <p className="text-xs text-slate-400 mt-3">
        {status === 'optimal' && '✅ Perfekter Bereich für Wachstum'}
        {status === 'too_low' && '⬇️ Zu niedrig - Erhöhe Temperatur oder senke Luftfeuchtigkeit'}
        {status === 'too_high' && '⬆️ Zu hoch - Senke Temperatur oder erhöhe Luftfeuchtigkeit'}
      </p>
    </div>
  );
}
```

**Step 4: Settings-Panel**
```jsx
// In frontend/src/components/Settings.jsx
<div className="bg-slate-900 p-6 rounded-xl">
  <h3 className="font-bold text-lg mb-4">🌡️ Auto-VPD-Steuerung</h3>

  <label className="flex items-center gap-3 mb-4">
    <input type="checkbox" checked={vpdEnabled} onChange={...} />
    <span>Automatische VPD-Optimierung aktivieren</span>
  </label>

  <div className="space-y-4">
    <div>
      <label className="text-sm text-slate-400">Wachstumsphase</label>
      <select className="w-full bg-slate-800 rounded-lg p-2 mt-1">
        <option value="vegetative">Vegetativ (0.8-1.2 kPa)</option>
        <option value="flowering">Blüte (1.0-1.5 kPa)</option>
        <option value="late_flowering">Späte Blüte (1.2-1.6 kPa)</option>
      </select>
    </div>

    <div>
      <label className="text-sm text-slate-400">Regelungs-Aggressivität</label>
      <input type="range" min="1" max="3" value={aggressiveness} />
      <div className="flex justify-between text-xs mt-1">
        <span>Sanft</span>
        <span>Normal</span>
        <span>Aggressiv</span>
      </div>
    </div>
  </div>
</div>
```

### Testing

1. **Backend testen:**
```bash
# VPD-Berechnung testen
curl http://localhost:3000/api/vpd/current

# Sollte zurückgeben:
# { "vpd": 1.15, "status": "optimal", "temp": 24, "humidity": 65 }
```

2. **Automation testen:**
- Luftfeuchtigkeit erhöhen (Spray-Flasche)
- VPD sollte sinken
- Lüfter sollte automatisch PWM reduzieren

3. **Frontend testen:**
- VPD-Card zeigt korrekten Wert
- Farbe ändert sich je nach Status
- Settings speichern funktioniert

---

## 🧪 Feature 2: EC/pH Sensoren Integration

**Priorität:** ⭐⭐⭐⭐⭐
**Aufwand:** ~8-12 Stunden
**Komplexität:** Hoch (Hardware)

### Benötigte Hardware

**Atlas Scientific EZO Modules:**
- **EZO-EC Circuit** (~80€) - EC/TDS Messung
- **EZO-pH Circuit** (~80€) - pH Messung
- **EC Probe K1.0** (~60€)
- **pH Probe** (~50€)
- **PT-1000 Temp Probe** (~30€) - Für Temperatur-Kompensation
- **Gesamt: ~300€**

**Alternative (Budget):**
- DFRobot Analog pH Sensor (~20€)
- TDS/EC Sensor Modul (~15€)
- **Gesamt: ~35€** (aber weniger genau)

### ESP32 Integration

**I2C-Modus (empfohlen):**
```cpp
// In firmware/ArduinoVersion/GrowSystem.ino/GrowSystem.ino.ino

#include <Wire.h>

// EZO I2C Adressen
#define EZO_EC_ADDR 0x64
#define EZO_PH_ADDR 0x63

float readEZO_EC() {
  Wire.beginTransmission(EZO_EC_ADDR);
  Wire.write("R");  // Read command
  Wire.endTransmission();

  delay(600);  // Warten auf Messung

  Wire.requestFrom(EZO_EC_ADDR, 20);
  String response = "";
  while(Wire.available()) {
    char c = Wire.read();
    if(c > 0) response += c;
  }

  return response.toFloat();
}

float readEZO_pH() {
  Wire.beginTransmission(EZO_PH_ADDR);
  Wire.write("R");
  Wire.endTransmission();

  delay(900);  // pH braucht länger

  Wire.requestFrom(EZO_PH_ADDR, 20);
  String response = "";
  while(Wire.available()) {
    char c = Wire.read();
    if(c > 0) response += c;
  }

  return response.toFloat();
}

void loop() {
  // In bestehender loop() ergänzen
  if (now - lastMsg > MSG_INTERVAL) {
    // Bestehender Code...

    // NEU: EC/pH lesen
    currentEC = readEZO_EC();
    currentPH = readEZO_pH();

    doc["ec"] = currentEC;
    doc["ph"] = currentPH;

    // Rest wie gehabt...
  }
}
```

**Kalibrierung:**
```cpp
// Kalibrierungs-Befehle über MQTT empfangen
void handleCalibrationCommand(JsonDocument& doc) {
  const char* sensor = doc["sensor"];  // "ec" oder "ph"
  const char* point = doc["point"];    // "low", "mid", "high"
  float value = doc["value"];

  if(strcmp(sensor, "ec") == 0) {
    String cmd = "Cal," + String(point) + "," + String(value);
    Wire.beginTransmission(EZO_EC_ADDR);
    Wire.write(cmd.c_str());
    Wire.endTransmission();
  }

  // Ähnlich für pH...
}
```

### Kalibrierungs-Wizard (Frontend)

```jsx
// frontend/src/components/Nutrients/CalibrationWizard.jsx
export default function CalibrationWizard() {
  const [step, setStep] = useState(1);
  const [sensor, setSensor] = useState('ec'); // 'ec' or 'ph'

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
      <div className="bg-slate-900 p-8 rounded-2xl max-w-2xl">
        <h2 className="text-2xl font-bold mb-6">
          {sensor === 'ec' ? 'EC-Sensor' : 'pH-Sensor'} Kalibrierung
        </h2>

        {step === 1 && (
          <div>
            <h3 className="font-bold mb-4">Schritt 1: Vorbereitung</h3>
            <ul className="space-y-2 text-sm">
              <li>✓ Spüle Sensor mit destilliertem Wasser</li>
              <li>✓ Bereite Kalibrierlösungen vor (1413µS, 12880µS)</li>
              <li>✓ Stelle sicher Sensor ist trocken</li>
            </ul>
            <video src="/calibration-ec.mp4" className="mt-4 rounded-lg" />
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="font-bold mb-4">Schritt 2: Low Point (1413 µS)</h3>
            <p className="text-sm mb-4">
              Tauche Sensor in die 1413µS Kalibrierlösung
            </p>
            <div className="text-4xl font-mono text-center my-6">
              Aktuell: {liveReading} µS
            </div>
            <button onClick={() => calibrate('low', 1413)}>
              Kalibrieren
            </button>
          </div>
        )}

        {/* Step 3: High Point, Step 4: Finish */}
      </div>
    </div>
  );
}
```

### Testing

1. **Ohne Hardware (simuliert):**
```bash
# Firmware kompiliert mit simulierten Werten
# Frontend zeigt Werte an
```

2. **Mit Hardware:**
- Sensoren in Kalibrierlösungen testen
- Genauigkeit prüfen (±5% EC, ±0.1 pH)
- Langzeit-Drift überwachen

---

## 📸 Feature 3: Timelapse-Generator

**Priorität:** ⭐⭐⭐⭐
**Aufwand:** ~6-8 Stunden
**Komplexität:** Mittel

### Was brauchen wir?

**Backend:**
1. **Snapshot-Service** (`backend/src/services/snapshotService.js`)
   - Cron-Job: Alle X Minuten Foto machen
   - Bilder in `/uploads/timelapse/YYYY-MM-DD/` speichern
   - Metadata tracken (Timestamp, Grow-Day)

2. **Video-Generator** (`backend/src/services/videoService.js`)
   - FFmpeg nutzen zum Zusammenstellen
   - Optionen: FPS, Auflösung, Musik
   - Output: MP4 mit H.264

3. **API-Endpoints:**
   - POST `/api/timelapse/start` - Timelapse starten
   - POST `/api/timelapse/stop` - Stoppen
   - POST `/api/timelapse/generate` - Video generieren
   - GET `/api/timelapse/snapshots` - Alle Snapshots
   - GET `/api/timelapse/videos` - Generierte Videos

**Frontend:**
1. **Timelapse-Dashboard** (`frontend/src/components/Timelapse/Dashboard.jsx`)
   - Start/Stop Buttons
   - Live-Vorschau (letztes Bild)
   - Snapshot-Galerie
   - Video-Generator-UI

2. **Video-Player**
   - Abspielen generierter Videos
   - Download-Button
   - Share-Optionen

### Implementierung

**Backend: Snapshot-Service**
```javascript
// backend/src/services/snapshotService.js
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

class SnapshotService {
  constructor() {
    this.isRunning = false;
    this.interval = 15; // Minuten
    this.job = null;
  }

  start(plantId, intervalMinutes = 15) {
    if (this.isRunning) return;

    this.interval = intervalMinutes;
    this.isRunning = true;

    // Cron: Alle X Minuten
    this.job = cron.schedule(`*/${intervalMinutes} * * * *`, async () => {
      await this.captureSnapshot(plantId);
    });

    console.log(`📸 Timelapse gestartet (alle ${intervalMinutes} Min)`);
  }

  async captureSnapshot(plantId) {
    try {
      // Frontend-Kamera triggern via Socket.io
      const { io } = require('../server');
      io.emit('captureSnapshot', { plantId });

      // Oder: ESP32-Cam direkt über HTTP
      // const response = await fetch('http://esp32-cam-ip/capture');
      // const buffer = await response.buffer();

      const date = new Date().toISOString().split('T')[0];
      const dir = path.join(__dirname, '../../uploads/timelapse', date);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const filename = `${Date.now()}.jpg`;
      // fs.writeFileSync(path.join(dir, filename), buffer);

      console.log(`📸 Snapshot gespeichert: ${filename}`);
    } catch (error) {
      console.error('Snapshot-Fehler:', error);
    }
  }

  stop() {
    if (this.job) {
      this.job.stop();
      this.isRunning = false;
      console.log('⏹️ Timelapse gestoppt');
    }
  }
}

module.exports = new SnapshotService();
```

**Backend: Video-Generator**
```javascript
// backend/src/services/videoService.js
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

class VideoService {
  async generateTimelapse(options) {
    const {
      inputDir,      // Verzeichnis mit Bildern
      outputPath,    // Output MP4 Pfad
      fps = 30,      // Frames per Second
      musicPath      // Optional: Hintergrundmusik
    } = options;

    return new Promise((resolve, reject) => {
      let command = ffmpeg()
        .input(path.join(inputDir, '*.jpg'))
        .inputFPS(fps)
        .videoCodec('libx264')
        .outputOptions([
          '-pix_fmt yuv420p',
          '-preset slow',
          '-crf 18'
        ])
        .size('1920x1080');

      // Musik hinzufügen
      if (musicPath && fs.existsSync(musicPath)) {
        command = command
          .input(musicPath)
          .audioCodec('aac')
          .audioChannels(2)
          .audioBitrate('192k');
      }

      command
        .output(outputPath)
        .on('start', (cmd) => {
          console.log('🎬 FFmpeg gestartet:', cmd);
        })
        .on('progress', (progress) => {
          console.log(`⏳ Progress: ${progress.percent}%`);
          // Via Socket.io an Frontend senden
          const { io } = require('../server');
          io.emit('videoProgress', { percent: progress.percent });
        })
        .on('end', () => {
          console.log('✅ Video fertig!');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('❌ FFmpeg Fehler:', err);
          reject(err);
        })
        .run();
    });
  }
}

module.exports = new VideoService();
```

**Frontend: Timelapse-Dashboard**
```jsx
// frontend/src/components/Timelapse/Dashboard.jsx
export default function TimelapseDashboard() {
  const [isRunning, setIsRunning] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [generatingVideo, setGeneratingVideo] = useState(false);

  const startTimelapse = async () => {
    await api.post('/timelapse/start', {
      plantId: selectedPlant,
      interval: 15  // Minuten
    });
    setIsRunning(true);
  };

  const stopTimelapse = async () => {
    await api.post('/timelapse/stop');
    setIsRunning(false);
  };

  const generateVideo = async () => {
    setGeneratingVideo(true);
    const result = await api.post('/timelapse/generate', {
      fps: 30,
      addMusic: true
    });
    setGeneratingVideo(false);
    alert(`Video erstellt: ${result.videoUrl}`);
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-slate-900 p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-4">📸 Timelapse Steuerung</h2>

        <div className="flex gap-4">
          {!isRunning ? (
            <button onClick={startTimelapse} className="btn-primary">
              ▶️ Timelapse Starten
            </button>
          ) : (
            <button onClick={stopTimelapse} className="btn-danger">
              ⏹️ Stoppen
            </button>
          )}

          <button
            onClick={generateVideo}
            disabled={snapshots.length < 10 || generatingVideo}
            className="btn-secondary"
          >
            {generatingVideo ? '⏳ Generiere...' : '🎬 Video Erstellen'}
          </button>
        </div>

        <div className="mt-4 text-sm text-slate-400">
          Status: {isRunning ? '🟢 Aktiv' : '⚪ Gestoppt'} |
          Snapshots: {snapshots.length} |
          Nächstes Foto: {nextSnapshotTime}
        </div>
      </div>

      {/* Snapshot Gallery */}
      <div className="bg-slate-900 p-6 rounded-xl">
        <h3 className="font-bold mb-4">Aufgenommene Bilder</h3>
        <div className="grid grid-cols-4 gap-4">
          {snapshots.map(snap => (
            <img
              key={snap.id}
              src={snap.url}
              className="rounded-lg aspect-video object-cover"
              alt={snap.timestamp}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Testing

1. **Snapshot-Test:**
```bash
# Timelapse starten
curl -X POST http://localhost:3000/api/timelapse/start

# Warten 30 Min → Sollte 2 Snapshots haben
ls uploads/timelapse/2026-01-02/

# Stoppen
curl -X POST http://localhost:3000/api/timelapse/stop
```

2. **Video-Test:**
```bash
# Manuell 20+ Testbilder in Ordner kopieren
# Video generieren
curl -X POST http://localhost:3000/api/timelapse/generate

# Sollte MP4 in /uploads/videos/ erstellen
```

---

## 📅 Zeitplan

**Woche 1:**
- ✅ Mo-Di: Auto-VPD-Steuerung (Backend)
- ✅ Mi: Auto-VPD-Steuerung (Frontend)
- ✅ Do: Testing & Feintuning

**Woche 2:**
- ✅ Mo-Di: EC/pH Hardware bestellen & vorbereiten
- ✅ Mi-Do: ESP32 Integration (I2C, Kalibrierung)
- ✅ Fr: Frontend Kalibrierungs-Wizard

**Woche 3:**
- ✅ Mo-Di: Timelapse Backend (Snapshot-Service)
- ✅ Mi: Video-Generator (FFmpeg)
- ✅ Do-Fr: Timelapse Frontend & Testing

---

## ✅ Success Criteria

**Feature 1 (Auto-VPD):**
- [ ] VPD wird korrekt berechnet und angezeigt
- [ ] Lüfter passt PWM automatisch an
- [ ] VPD bleibt im Zielbereich (±0.2 kPa)
- [ ] Keine zu häufigen Schaltvorgänge (max. 1x/Minute)

**Feature 2 (EC/pH):**
- [ ] Sensoren liefern stabile Werte
- [ ] Kalibrierung funktioniert per Frontend
- [ ] Abweichung < 5% (EC) und < 0.1 (pH)
- [ ] Werte im Nährstoff-Dashboard live angezeigt

**Feature 3 (Timelapse):**
- [ ] Snapshots werden automatisch gespeichert
- [ ] Video-Generierung funktioniert (mit/ohne Musik)
- [ ] Frontend zeigt Snapshot-Galerie
- [ ] Video kann heruntergeladen werden

---

**Erstellt:** 2026-01-02
**Nächster Review:** Nach Feature 1 Completion

Lass uns mit **Feature 1 (Auto-VPD)** starten! 🚀
