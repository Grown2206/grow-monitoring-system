# 🚀 Nährstoff-System Quick-Start (Single-Pump Setup)

## ✅ Was wurde implementiert?

### Backend (Vollständig)
- ✅ **3 MongoDB-Models**
  - `NutrientSchedule` - Zeitpläne für automatische Dosierung
  - `DosageLog` - Historie aller Dosierungen
  - `ReservoirState` - Live-Status von Reservoir & Sensoren

- ✅ **Controller & Routes**
  - `/api/nutrients/schedules` - CRUD für Zeitpläne
  - `/api/nutrients/dose` - Manuelle Dosierung
  - `/api/nutrients/reservoir` - Status & Auffüllen
  - `/api/nutrients/logs` - Historie
  - `/api/nutrients/stats` - Statistiken
  - `/api/nutrients/calibrate` - Sensor-Kalibrierung

### Frontend
- ✅ **API-Integration** (`frontend/src/utils/api.js`)
- ✅ **Dashboard-Komponente** (`NutrientDashboard.jsx`)
  - Live EC/pH/Temp-Anzeige
  - Reservoir-Füllstände
  - Manuelle Dosierung
  - Zeitplan-Übersicht

---

## 📦 Hardware-Einkaufsliste (Minimal-Setup)

| Artikel | Menge | Preis (ca.) | Link |
|---------|-------|-------------|------|
| **Peristaltische Pumpe 12V** | 1x | 15€ | [AliExpress](https://de.aliexpress.com/w/wholesale-peristaltic-pump-12v.html) |
| **5L Kanister (braun)** | 1x | 3€ | Amazon |
| **Silikon-Schlauch 4mm** | 2m | 5€ | Amazon |
| **Relais-Modul 1-Kanal** | 1x | 3€ | AliExpress |
| **EC-Sensor (optional)** | 1x | 15-80€ | Atlas Scientific oder Analog |
| **pH-Sensor (optional)** | 1x | 10-80€ | Atlas Scientific oder Analog |
| **Gesamt (Basic)** | | **~26€** | |
| **Gesamt (mit Sensoren)** | | **~180€** | |

---

## 🔧 Installation

### 1. Backend-Setup

Keine Extra-Installation nötig! Das System ist bereits integriert:

```bash
cd backend
npm install  # Falls noch nicht gemacht
npm run dev
```

Die Routes sind automatisch unter `/api/nutrients/*` verfügbar.

### 2. Frontend-Integration

Die Komponente ist bereit, muss nur noch in die App eingebunden werden:

**In `frontend/src/App.jsx`** ergänzen:

```jsx
import NutrientDashboard from './components/Nutrients/NutrientDashboard';

// Im navItems-Array ergänzen:
{ id: 'nutrients', icon: <Beaker size={20} />, label: 'Nährstoffe' },

// Im Render-Switch ergänzen:
{activeTab === 'nutrients' && <NutrientDashboard />}
```

**Icon importieren:**
```jsx
import { ..., Beaker } from 'lucide-react';
```

---

## 🎯 Erste Schritte

### 1. Erstelle einen Zeitplan (via API oder später im Frontend)

**POST** `http://localhost:3000/api/nutrients/schedules`

```json
{
  "name": "Standard Düngung",
  "type": "fixed",
  "schedule": {
    "enabled": true,
    "daysOfWeek": [1, 3, 5],
    "time": "09:00"
  },
  "dosage": {
    "singlePump": {
      "enabled": true,
      "ml_per_liter": 2,
      "pumpId": 1
    }
  },
  "waterVolume": {
    "liters": 10
  },
  "safety": {
    "maxDosagesPerDay": 2
  }
}
```

### 2. Teste manuelle Dosierung

**POST** `http://localhost:3000/api/nutrients/dose`

```json
{
  "waterVolume_liters": 5,
  "ml_per_liter": 2,
  "notes": "Test-Dosierung"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dosageLog": { ... },
    "reservoirState": { ... }
  },
  "message": "Erfolgreich 10ml dosiert"
}
```

### 3. Prüfe Reservoir-Status

**GET** `http://localhost:3000/api/nutrients/reservoir`

```json
{
  "success": true,
  "data": {
    "main": {
      "ec": 1.2,
      "ph": 6.0,
      "temp": 21.5
    },
    "reservoirs": [{
      "pumpId": 1,
      "name": "5-in-1 Dünger",
      "volume_ml": 4800,
      "level_percent": 96
    }]
  },
  "warnings": []
}
```

---

## 🤖 ESP32-Integration

### MQTT-Topics

```cpp
// ESP32 subscribt auf:
"grow/esp32/nutrients/command"

// ESP32 published auf:
"grow/esp32/nutrients/status"
"grow/esp32/nutrients/sensors"
```

### Command-Format (Backend → ESP32)

```json
{
  "action": "dose",
  "dosage": [{
    "pumpId": 1,
    "volume_ml": 20,
    "flowRate_ml_per_min": 100
  }],
  "measureAfter": true,
  "mixAfter_seconds": 120
}
```

### Status-Response (ESP32 → Backend)

```json
{
  "status": "completed",
  "ec": 1.25,
  "ph": 6.1,
  "temp": 21.8,
  "duration_seconds": 12
}
```

### Arduino-Code (Vereinfacht)

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

#define PUMP_PIN 25

WiFiClient espClient;
PubSubClient mqtt(espClient);

void setup() {
  pinMode(PUMP_PIN, OUTPUT);

  // WiFi + MQTT verbinden
  mqtt.setServer("mqtt_broker", 1883);
  mqtt.setCallback(mqttCallback);
  mqtt.subscribe("grow/esp32/nutrients/command");
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<512> doc;
  deserializeJson(doc, payload, length);

  if (doc["action"] == "dose") {
    int ml = doc["dosage"][0]["volume_ml"];
    int flowRate = doc["dosage"][0]["flowRate_ml_per_min"];

    dosePump(ml, flowRate);

    // Response senden
    publishStatus("completed");
  }
}

void dosePump(int ml, int flowRate) {
  int duration_ms = (ml / (float)flowRate) * 60 * 1000;

  digitalWrite(PUMP_PIN, HIGH);
  delay(duration_ms);
  digitalWrite(PUMP_PIN, LOW);

  Serial.printf("Dosiert: %dml in %ds\n", ml, duration_ms/1000);
}

void publishStatus(String status) {
  StaticJsonDocument<256> doc;
  doc["status"] = status;
  doc["timestamp"] = millis();

  char buffer[256];
  serializeJson(doc, buffer);
  mqtt.publish("grow/esp32/nutrients/status", buffer);
}
```

---

## 📊 Frontend-Nutzung

### Dashboard öffnen
1. Frontend starten: `npm run dev`
2. Im Browser: `http://localhost:5173`
3. Tab "Nährstoffe" auswählen

### Manuelle Dosierung
1. Button "Jetzt Dosieren" klicken
2. Wasser-Menge eingeben (z.B. 10L)
3. ml/L eingeben (z.B. 2ml/L)
4. Optional: Notiz hinzufügen
5. "Dosieren" klicken

### Zeitplan erstellen (kommt in v2.0)
Aktuell nur via API möglich. UI-Editor folgt!

---

## 🐛 Troubleshooting

### Pumpe läuft nicht
1. **Relais-Check**: LED leuchtet? → Relais OK
2. **Stromversorgung**: 12V angeschlossen?
3. **MQTT**: ESP32 erhält Command?
   ```bash
   mosquitto_sub -h localhost -t "grow/esp32/nutrients/#" -v
   ```

### Backend-Error: "Reservoir nicht gefunden"
```bash
# Initialisiere Reservoir-State manuell:
POST http://localhost:3000/api/nutrients/reservoir
{
  "reservoirs": [{
    "pumpId": 1,
    "name": "5-in-1 Dünger",
    "volume_ml": 5000,
    "capacity_ml": 5000
  }]
}
```

### Frontend zeigt keine Daten
1. Backend läuft? → `http://localhost:3000/api/nutrients/reservoir`
2. CORS-Fehler? → `.env` prüfen: `FRONTEND_URL=http://localhost:5173`
3. Console öffnen → Fehlermeldung?

---

## ✨ Nächste Schritte

### Phase 1: Hardware aufbauen
- [ ] Pumpe mit Relais verbinden
- [ ] Schläuche verlegen (Kanister → Reservoir)
- [ ] ESP32-Code flashen
- [ ] Test mit Wasser (KEINE Nährstoffe!)

### Phase 2: Kalibrierung
- [ ] Flow-Rate bestimmen (Wieviel ml/Min pumpt die Pumpe?)
- [ ] EC/pH-Sensoren kalibrieren
- [ ] Test-Dosierung mit echten Nährstoffen

### Phase 3: Automatisierung
- [ ] Ersten Zeitplan erstellen
- [ ] 1 Woche beobachten
- [ ] Adaptive Dosierung aktivieren

### Phase 4: Erweiterung (Optional)
- [ ] Multi-Pump-Setup (Basis A+B, pH, CalMag)
- [ ] Profil-Bibliothek (BioBizz, AN, etc.)
- [ ] Community-Features
- [ ] Mobile-App

---

## 📚 API-Dokumentation

### Alle Endpoints

```
GET    /api/nutrients/schedules          # Alle Zeitpläne
GET    /api/nutrients/schedules/:id      # Einzelner Zeitplan
POST   /api/nutrients/schedules          # Zeitplan erstellen
PUT    /api/nutrients/schedules/:id      # Zeitplan ändern
DELETE /api/nutrients/schedules/:id      # Zeitplan löschen
POST   /api/nutrients/schedules/:id/toggle  # An/Aus

POST   /api/nutrients/dose               # Manuelle Dosierung

GET    /api/nutrients/reservoir          # Status
PUT    /api/nutrients/reservoir/refill   # Auffüllen
PUT    /api/nutrients/reservoir/water-change  # Wasserwechsel

GET    /api/nutrients/logs               # Historie
GET    /api/nutrients/stats              # Statistiken

POST   /api/nutrients/calibrate          # Sensor kalibrieren
```

Vollständige Dokumentation: `docs/NUTRIENT_AUTOMATION.md`

---

## 💡 Pro-Tipps

1. **Starte mit Wasser**: Teste erst mit reinem Wasser, bevor du echte Nährstoffe nutzt!

2. **Flow-Rate kalibrieren**:
   ```
   1. Pumpe 60 Sekunden laufen lassen
   2. Ausgelaufene Menge messen
   3. Das ist deine flowRate_ml_per_min
   ```

3. **Sicherheit**:
   - Max 2 Dosierungen/Tag (schützt vor Überdüngung)
   - Warnungen bei Reservoir < 20%
   - Plausibilitäts-Check (keine 500ml auf 10L!)

4. **Wartung**:
   - EC-Sensor: Alle 2 Wochen kalibrieren
   - pH-Sensor: Wöchentlich kalibrieren
   - Pumpen-Schläuche: Monatlich durchspülen

---

**Status**: ✅ Ready to Test
**Version**: 1.0 (Single-Pump)
**Erstellt**: 2026-01-02

Viel Erfolg! 🌱💧
