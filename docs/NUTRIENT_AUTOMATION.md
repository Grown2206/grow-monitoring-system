# 🧪 Automatische Nährstoff-Dosierung - Konzept & Implementierung

## 🎯 Übersicht

Automatisiertes Dünger-Management mit peristaltischen Pumpen, die nach vordefinierten Zeitplänen oder Sensordaten Nährstoffe ins Bewässerungssystem dosieren.

---

## 🔧 Hardware-Setup

### Komponenten

#### Peristaltische Pumpen (empfohlen)
- **Modell**: Kamoer KCS/KDS oder ähnliche 12V DC Pumpen
- **Anzahl**: 4-6 Pumpen (je nach Nährstoff-Line)
  - Pumpe 1: Basis-Dünger A (Grow/Bloom)
  - Pumpe 2: Basis-Dünger B (Micro)
  - Pumpe 3: pH Down
  - Pumpe 4: pH Up (optional)
  - Pumpe 5: CalMag / Additiv
  - Pumpe 6: Enzyme / Booster
- **Vorteile**:
  - Keine beweglichen Teile in Kontakt mit Flüssigkeit
  - Präzise Dosierung (±2%)
  - Selbstansaugend
  - Wartungsarm

#### Alternative: Standard-Pumpen
- **Modell**: 12V Mini-Tauchpumpen mit Flow-Sensor
- **Günstiger aber weniger präzise**

#### Sensoren
- **EC/PPM-Sensor**: Atlas Scientific EZO-EC (I2C/UART)
- **pH-Sensor**: Atlas Scientific EZO-pH (I2C/UART)
- **Wassertemperatur**: DS18B20 (wichtig für pH-Genauigkeit)
- **Level-Sensor**: Ultraschall HC-SR04 für Reservoir-Füllstand

#### Steuerung
- **ESP32**: Hat genug GPIOs und ADCs
- **Relais-Board**: 8-Kanal 12V für Pumpen
- **MOSFET-Board**: IRF520 für PWM-Steuerung (Pumpengeschwindigkeit)
- **I2C-Bus**: Für Atlas-Sensoren

#### Nährstoff-Reservoirs
- **5L Kanister**: Jeweils ein Kanister pro Nährstoff
- **Light-Protected**: Braune/schwarze Flaschen (UV-Schutz)
- **Schläuche**: Silikon 4mm (Lebensmittelqualität)

---

## 📊 Software-Architektur

### Backend-Struktur

```
backend/
├── src/
│   ├── models/
│   │   ├── NutrientSchedule.js      # Dosierungs-Zeitpläne
│   │   ├── NutrientProfile.js       # Dünger-Profile (BioBizz, AN, etc.)
│   │   ├── DosageLog.js             # Historie aller Dosierungen
│   │   └── ReservoirState.js        # Aktueller Zustand (Füllstand, EC, pH)
│   ├── controllers/
│   │   ├── nutrientController.js    # CRUD für Schedules & Profiles
│   │   └── dosageController.js      # Dosierungs-Logik
│   ├── services/
│   │   ├── pumpService.js           # Pumpen-Ansteuerung via MQTT
│   │   ├── sensorService.js         # EC/pH-Messungen verarbeiten
│   │   └── scheduleService.js       # Cron-Jobs für geplante Dosierung
│   └── routes/
│       └── nutrientRoutes.js        # API-Endpoints
```

### Frontend-Komponenten

```
frontend/src/components/
├── Nutrients/
│   ├── NutrientDashboard.jsx        # Hauptübersicht
│   ├── ScheduleEditor.jsx           # Zeitplan erstellen/bearbeiten
│   ├── ProfileLibrary.jsx           # Vordefinierte Rezepte
│   ├── ManualDosage.jsx             # Manuelle Dosierung
│   ├── CalibrationWizard.jsx        # EC/pH-Sensor kalibrieren
│   ├── ReservoirMonitor.jsx         # Füllstände & Warnungen
│   └── DosageHistory.jsx            # Logbuch
```

---

## 💾 Datenmodelle

### 1. NutrientProfile (Dünger-Rezepte)

```javascript
const NutrientProfileSchema = new mongoose.Schema({
  name: { type: String, required: true },           // "BioBizz Light Mix - Veg Week 2"
  brand: { type: String },                          // "BioBizz", "Advanced Nutrients", etc.
  stage: {
    type: String,
    enum: ['seedling', 'veg', 'early_bloom', 'mid_bloom', 'late_bloom', 'flush'],
    required: true
  },
  weekNumber: { type: Number },                     // Woche 1-12

  // Dosierung pro 10L Wasser
  nutrients: [{
    name: { type: String, required: true },         // "Bio-Grow"
    ml_per_10L: { type: Number, required: true },   // 20ml
    pumpId: { type: Number },                       // Welche Pumpe (1-6)
    order: { type: Number }                         // Reihenfolge (wichtig!)
  }],

  // Zielwerte
  target_ec: { type: Number },                      // 1.2 mS/cm
  target_ph: { type: Number },                      // 6.0

  // Meta
  description: { type: String },
  isPublic: { type: Boolean, default: false },      // Community teilen
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  likes: { type: Number, default: 0 }
}, { timestamps: true });
```

### 2. NutrientSchedule (Zeitplan)

```javascript
const NutrientScheduleSchema = new mongoose.Schema({
  plantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plant' },
  name: { type: String, required: true },

  // Zeitplan-Typ
  type: {
    type: String,
    enum: ['fixed', 'adaptive', 'manual'],
    default: 'fixed'
  },

  // Fixed Schedule: Feste Zeiten
  schedule: {
    enabled: { type: Boolean, default: true },

    // Cron-Expression: "0 9 * * 1,3,5" = Mo, Mi, Fr um 9 Uhr
    cronExpression: { type: String },

    // Oder einfacher: Array von Wochentagen
    days: [{ type: Number, min: 0, max: 6 }],       // 0=Sonntag, 6=Samstag
    time: { type: String },                         // "09:00"
  },

  // Adaptive Schedule: Basierend auf Sensor-Werten
  adaptive: {
    enabled: { type: Boolean, default: false },

    // Dosiere wenn EC unter Schwellwert
    ec_threshold: { type: Number },                 // z.B. 1.0

    // Dosiere wenn pH außerhalb Range
    ph_min: { type: Number },                       // 5.8
    ph_max: { type: Number },                       // 6.2

    // Check-Intervall
    checkIntervalMinutes: { type: Number, default: 60 }
  },

  // Welches Profil wird verwendet?
  currentProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NutrientProfile'
  },

  // Wasser-Menge pro Dosierung
  waterVolume_liters: { type: Number, required: true, default: 10 },

  // Sicherheit
  maxDosagesPerDay: { type: Number, default: 2 },

  // Status
  isActive: { type: Boolean, default: true },
  lastRun: { type: Date },
  nextRun: { type: Date }
}, { timestamps: true });
```

### 3. DosageLog (Historie)

```javascript
const DosageLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'NutrientSchedule' },
  profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'NutrientProfile' },

  // Was wurde dosiert?
  nutrients: [{
    name: { type: String },
    ml_dosed: { type: Number },
    pumpId: { type: Number },
    duration_seconds: { type: Number }
  }],

  // Messungen vorher/nachher
  before: {
    ec: { type: Number },
    ph: { type: Number },
    temp: { type: Number }
  },
  after: {
    ec: { type: Number },
    ph: { type: Number },
    temp: { type: Number }
  },

  // Meta
  waterVolume_liters: { type: Number },
  totalVolume_ml: { type: Number },                 // Summe aller Nährstoffe

  status: {
    type: String,
    enum: ['success', 'partial', 'failed'],
    default: 'success'
  },
  errors: [{ type: String }],

  // Manuell oder automatisch?
  triggeredBy: {
    type: String,
    enum: ['schedule', 'adaptive', 'manual'],
    required: true
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
```

### 4. ReservoirState (Live-Status)

```javascript
const ReservoirStateSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },

  // Haupt-Reservoir (gemischtes Wasser)
  main: {
    volume_liters: { type: Number },
    ec: { type: Number },
    ph: { type: Number },
    temp: { type: Number },
    lastRefill: { type: Date }
  },

  // Nährstoff-Reservoirs
  reservoirs: [{
    pumpId: { type: Number, required: true },
    name: { type: String },                         // "Bio-Grow"
    volume_ml: { type: Number },                    // Noch verfügbar
    capacity_ml: { type: Number, default: 5000 },   // Maximale Kapazität
    lastRefill: { type: Date },

    // Warnung bei niedrigem Füllstand
    lowLevelWarning: { type: Boolean, default: false }
  }],

  // Kalibrierungs-Status
  calibration: {
    ec_last: { type: Date },
    ph_last: { type: Date },
    ec_drift: { type: Number },                     // Abweichung in %
    ph_drift: { type: Number }
  }
}, { timestamps: true });
```

---

## 🔄 MQTT-Kommunikation (ESP32 ↔ Backend)

### Topics

```
grow/esp32/nutrients/command       # Backend → ESP32
grow/esp32/nutrients/status        # ESP32 → Backend
grow/esp32/nutrients/sensors       # ESP32 → Backend (EC/pH)
grow/esp32/nutrients/pump_feedback # ESP32 → Backend (Pumpen-Status)
```

### Command-Struktur (Backend → ESP32)

```json
{
  "action": "dose",
  "dosage": [
    {
      "pumpId": 1,
      "volume_ml": 20,
      "flowRate_ml_per_min": 100
    },
    {
      "pumpId": 2,
      "volume_ml": 15,
      "flowRate_ml_per_min": 100
    }
  ],
  "sequence": true,              // Nacheinander dosieren (wichtig!)
  "waitBetween_seconds": 30,     // Wartezeit zwischen Pumpen
  "mixAfter_seconds": 120,       // Umwälzpumpe nach Dosierung
  "measureAfter": true           // EC/pH nach Dosierung messen
}
```

### Status-Response (ESP32 → Backend)

```json
{
  "timestamp": 1735819200000,
  "status": "dosing",            // idle, dosing, mixing, measuring
  "currentPump": 1,
  "progress_percent": 45,
  "ec": 1.23,
  "ph": 6.1,
  "temp": 21.5,
  "reservoirs": [
    { "pumpId": 1, "level_percent": 78 },
    { "pumpId": 2, "level_percent": 65 }
  ]
}
```

---

## 🎮 ESP32-Firmware (Pseudocode)

```cpp
// Pumpen-Konfiguration
struct Pump {
  int pin;
  int flowRate_ml_per_min;
  float volume_dosed_ml;
};

Pump pumps[6] = {
  {GPIO_25, 100, 0},  // Pumpe 1
  {GPIO_26, 100, 0},  // Pumpe 2
  // ...
};

// Dosierungs-Funktion
void dosePump(int pumpId, float volume_ml) {
  float duration_seconds = (volume_ml / pumps[pumpId].flowRate_ml_per_min) * 60;

  digitalWrite(pumps[pumpId].pin, HIGH);

  unsigned long startTime = millis();
  while (millis() - startTime < duration_seconds * 1000) {
    // Publish progress
    publishProgress(pumpId, (millis() - startTime) / (duration_seconds * 1000) * 100);
    delay(500);
  }

  digitalWrite(pumps[pumpId].pin, LOW);
  pumps[pumpId].volume_dosed_ml += volume_ml;

  publishStatus("pump_stopped", pumpId);
}

// EC/pH-Messung
void measureSensors() {
  float ec = readEC();      // Atlas Scientific EZO-EC
  float ph = readPH();      // Atlas Scientific EZO-pH
  float temp = readTemp();  // DS18B20

  publishSensorData(ec, ph, temp);
}

// MQTT-Handler
void handleCommand(JsonObject& cmd) {
  if (cmd["action"] == "dose") {
    JsonArray dosage = cmd["dosage"];

    for (JsonObject pump : dosage) {
      int pumpId = pump["pumpId"];
      float volume = pump["volume_ml"];

      dosePump(pumpId, volume);

      if (cmd["sequence"] == true) {
        delay(cmd["waitBetween_seconds"] * 1000);
      }
    }

    if (cmd["measureAfter"] == true) {
      delay(cmd["mixAfter_seconds"] * 1000);  // Warten bis gemischt
      measureSensors();
    }
  }
}
```

---

## 🎨 Frontend-UI-Komponenten

### 1. NutrientDashboard.jsx

```jsx
import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Beaker, Droplet, Calendar, Play, Settings } from 'lucide-react';

export default function NutrientDashboard() {
  const [reservoirState, setReservoirState] = useState(null);
  const [schedule, setSchedule] = useState(null);

  return (
    <div className="space-y-6">

      {/* Live-Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<Droplet />}
          label="EC"
          value={reservoirState?.main.ec?.toFixed(2)}
          unit="mS/cm"
          target={schedule?.currentProfile?.target_ec}
        />
        <StatCard
          icon={<Beaker />}
          label="pH"
          value={reservoirState?.main.ph?.toFixed(1)}
          unit=""
          target={schedule?.currentProfile?.target_ph}
        />
        <StatCard
          icon={<ThermometerSun />}
          label="Temp"
          value={reservoirState?.main.temp?.toFixed(1)}
          unit="°C"
        />
      </div>

      {/* Reservoir-Füllstände */}
      <ReservoirLevels reservoirs={reservoirState?.reservoirs} />

      {/* Aktiver Zeitplan */}
      <ActiveSchedule schedule={schedule} />

      {/* Schnellaktionen */}
      <div className="flex gap-3">
        <button className="btn-primary">
          <Play size={16} /> Jetzt Dosieren
        </button>
        <button className="btn-secondary">
          <Calendar size={16} /> Zeitplan bearbeiten
        </button>
        <button className="btn-secondary">
          <Settings size={16} /> Kalibrieren
        </button>
      </div>

    </div>
  );
}
```

### 2. ScheduleEditor.jsx

```jsx
// Wizard-Style Editor
// Schritt 1: Pflanze wählen
// Schritt 2: Profil wählen (BioBizz Veg Week 3)
// Schritt 3: Zeitplan festlegen (Mo/Mi/Fr um 9 Uhr)
// Schritt 4: Wasser-Menge pro Dosierung
// Schritt 5: Überprüfung & Aktivierung
```

### 3. ProfileLibrary.jsx

```jsx
// Vordefinierte Rezepte durchsuchen
// Filter: Marke, Substrat-Typ, Phase
// Community-Rezepte mit Bewertungen
// Eigene Rezepte erstellen & teilen
```

---

## 📱 Manuelle Dosierung (Notfall-Modus)

### UI-Flow

1. **Wasser-Menge eingeben**: "Ich habe 15L Wasser vorbereitet"
2. **Profil wählen**: "BioBizz Light Mix - Veg Week 3"
3. **Anpassungen**: Nutzer kann ml/L individuell ändern
4. **Bestätigung**: Zeige Gesamtmenge aller Nährstoffe
5. **Start**: Backend startet Dosierung, Frontend zeigt Live-Progress
6. **Abschluss**: Zeige EC/pH nach Dosierung

---

## 🔒 Sicherheits-Features

### Backend-Validierung

```javascript
// Maximale Dosierung pro Tag
if (todayDosages >= schedule.maxDosagesPerDay) {
  throw new Error('Maximale Dosierungen pro Tag erreicht!');
}

// Plausibilitäts-Check
const totalVolume = nutrients.reduce((sum, n) => sum + n.ml_per_10L, 0);
if (totalVolume > 500) {  // >500ml auf 10L? Unrealistisch!
  throw new Error('Dosierung erscheint unrealistisch hoch!');
}

// Reservoir-Check
for (let nutrient of nutrients) {
  const reservoir = await getReservoirState(nutrient.pumpId);
  if (reservoir.volume_ml < nutrient.ml_dosed) {
    throw new Error(`Reservoir ${nutrient.name} fast leer!`);
  }
}
```

### Alarm-System

```javascript
// Warnungen bei:
- Reservoir < 20% → Push-Notification "Bio-Grow fast leer"
- EC-Sensor-Drift > 10% → "EC-Sensor kalibrieren"
- pH außerhalb 4.0-8.0 → "pH-Sensor defekt?"
- Dosierung fehlgeschlagen → "Pumpe 1 reagiert nicht"
```

---

## 📊 Analytics & Reporting

### Grafiken

1. **EC/pH-Verlauf**: Zeige Entwicklung über Zeit mit Dosierungs-Markern
2. **Nährstoff-Verbrauch**: Balkendiagramm pro Woche/Monat
3. **Kosten-Tracking**: "Diese Woche: 8,50€ für Dünger"
4. **Effizienz**: Vergleich von Grows (Ertrag pro ml Dünger)

### Export

- CSV-Export aller Dosierungen
- PDF-Report: "Nährstoff-Plan Grow #5"
- Rezept teilen: QR-Code → Community

---

## 🚀 Implementierungs-Phasen

### Phase 1: Grundlagen (Woche 1-2)
- [ ] Datenmodelle erstellen
- [ ] MQTT-Kommunikation ESP32 ↔ Backend
- [ ] Manuelle Dosierung (Frontend)
- [ ] EC/pH Live-Anzeige

### Phase 2: Automatisierung (Woche 3-4)
- [ ] Schedule-System (Cron-Jobs)
- [ ] Profil-Bibliothek (BioBizz, AN, etc.)
- [ ] Adaptive Dosierung (EC-basiert)
- [ ] Reservoir-Monitoring

### Phase 3: Advanced Features (Woche 5-6)
- [ ] Kalibrierungs-Wizard
- [ ] Community-Rezepte teilen
- [ ] Analytics & Reporting
- [ ] Mobile-Optimierung

### Phase 4: Premium Features (Later)
- [ ] ML-Optimierung (welches Rezept = bester Ertrag?)
- [ ] Multi-Reservoir-Support
- [ ] pH-Auto-Korrektur
- [ ] Integration mit Grow-Tagebuch

---

## 💰 Kosten-Kalkulation

### Hardware (Basic-Setup)

| Komponente | Preis | Link |
|------------|-------|------|
| 4x Peristaltik-Pumpe 12V | 4x 15€ = 60€ | AliExpress |
| Atlas EZO-EC | 80€ | Atlas Scientific |
| Atlas EZO-pH | 80€ | Atlas Scientific |
| pH-Elektrode | 50€ | Atlas Scientific |
| 4x 5L Kanister | 4x 3€ = 12€ | Amazon |
| Schläuche & Fittings | 20€ | Amazon |
| **Gesamt** | **~302€** | |

### Alternative (Budget)

| Komponente | Preis |
|------------|-------|
| 4x Mini-Pumpen 12V | 4x 5€ = 20€ |
| Analog EC-Sensor | 15€ |
| Analog pH-Sensor | 10€ |
| **Gesamt** | **~45€** |

**Hinweis**: Budget-Sensoren sind weniger genau und benötigen häufigere Kalibrierung!

---

## 🎯 Best Practices

### Dosierungs-Reihenfolge

1. **Basis-Dünger A** → 30 Sek warten
2. **Basis-Dünger B** → 30 Sek warten
3. **Additive (CalMag, etc.)** → 30 Sek warten
4. **pH-Korrektur** (falls nötig)
5. **Umwälzen** (2-5 Min)
6. **Messung** (EC/pH)

**Warum?** Nährstoffe können ausflocken wenn zu schnell gemischt!

### Kalibrierungs-Intervalle

- **EC-Sensor**: Alle 2 Wochen mit Kalibrierlösung (1.413 mS/cm)
- **pH-Sensor**: Wöchentlich mit pH 4.0 & 7.0 Lösung
- **Temperatur**: Einmalig mit Referenz-Thermometer

### Lagerung

- **Konzentrierte Dünger**: Dunkel, kühl (15-25°C)
- **Verdünnte Lösung**: Max. 7 Tage (Bakterien!)
- **pH-Elektrode**: In KCl-Lagerlösung, NIEMALS trocken!

---

## 📚 Nährstoff-Bibliothek (Vorschläge)

### BioBizz (Organisch)

```javascript
{
  name: "BioBizz - Veg Week 1-2",
  nutrients: [
    { name: "Bio-Grow", ml_per_10L: 10, pumpId: 1 },
    { name: "Root-Juice", ml_per_10L: 10, pumpId: 3 }
  ],
  target_ec: 0.8,
  target_ph: 6.2
}
```

### Advanced Nutrients (Mineralisch)

```javascript
{
  name: "Advanced Nutrients - Bloom Week 5",
  nutrients: [
    { name: "Micro", ml_per_10L: 20, pumpId: 1 },
    { name: "Grow", ml_per_10L: 10, pumpId: 2 },
    { name: "Bloom", ml_per_10L: 30, pumpId: 3 },
    { name: "Big Bud", ml_per_10L: 20, pumpId: 4 }
  ],
  target_ec: 2.2,
  target_ph: 5.8
}
```

### General Hydroponics (Flora-Serie)

```javascript
{
  name: "GH Flora - Drain-to-Waste Veg",
  nutrients: [
    { name: "FloraMicro", ml_per_10L: 12.5, pumpId: 1 },
    { name: "FloraGro", ml_per_10L: 12.5, pumpId: 2 },
    { name: "FloraBloom", ml_per_10L: 5, pumpId: 3 }
  ],
  target_ec: 1.5,
  target_ph: 5.8
}
```

---

## 🐛 Troubleshooting

### Pumpe läuft nicht

- GPIO-Pin korrekt? (pinMode OUTPUT)
- Relais defekt? (LED leuchtet?)
- 12V-Netzteil angeschlossen?
- Schlauch geknickt?

### EC-Wert steigt nicht

- Pumpe läuft zu kurz? (Flow-Rate falsch kalibriert)
- Sensor defekt? (Vergleich mit Referenz-Messung)
- Nährstoff zu alt? (Ausflocken möglich)

### pH instabil

- Temperatur schwankt? (pH ist temperaturabhängig!)
- Sensor trocken gewesen? (Elektrode kaputt)
- Organische Dünger? (pH driftet natürlich)

---

## 🎓 Next Steps

1. **Hardware bestellen** → 1-2 Wochen Lieferzeit
2. **ESP32-Firmware erweitern** → Pumpen-Steuerung
3. **Backend-Models erstellen** → Datenbank vorbereiten
4. **Frontend bauen** → Dashboard & Scheduler
5. **Testen mit Wasser** → Erst ohne Pflanzen!
6. **Kalibrierung** → EC/pH-Sensoren justieren
7. **Go Live** 🚀

---

**Pro-Tipp**: Starte mit **manueller Dosierung** um das System zu testen, bevor du Automatisierung aktivierst. Nichts ist schlimmer als Überdüngung wegen Bug! 😅

---

*Erstellt: 2026-01-02*
*Version: 1.0*
