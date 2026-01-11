# 🌱 Grow Monitoring System v1.2 - Professional Edition

Ein vollständiges, IoT-basiertes Überwachungs- und Steuerungssystem für professionelle Indoor-Pflanzenzucht.
**ESP32** (Hardware) • **Node.js/Express** (Backend) • **React** (Frontend) • **MongoDB** (Datenbank)

[![Version](https://img.shields.io/badge/version-1.2.0-brightgreen.svg)](https://github.com/yourusername/grow-system)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/react-18.2.0-blue.svg)](https://reactjs.org)

---

## 🎯 Was ist neu in v1.2?

### 🚀 Major Features
- ✅ **Progressive Web App (PWA)** - Installierbar auf Smartphone/Tablet
- ✅ **Push-Notifications** - Echtzeit-Benachrichtigungen auf allen Geräten
- ✅ **Wetter-API Integration** - Indoor/Outdoor-Vergleich mit Grow-Empfehlungen
- ✅ **Grow-Rezepte & Templates** - 3 vordefinierte Anbau-Zeitpläne
- ✅ **Erweiterte KI-Analytics** - Anomalie-Erkennung, Predictive Analytics, Optimierungen
- ✅ **Kamera-Integration** - Pflanzenfotos direkt aus dem Browser

[**→ Zur vollständigen Feature-Liste**](#-features)

---

## 📸 Screenshots

| Dashboard | Grow-Rezepte | Analytics |
|-----------|--------------|-----------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Recipes](docs/screenshots/recipes.png) | ![Analytics](docs/screenshots/analytics.png) |

---

## ✨ Features

### 📊 Live-Monitoring
- **6x Bodenfeuchtigkeit** - Kapazitive Sensoren v1.2 pro Pflanze
- **Temperatur & Luftfeuchtigkeit** - SHT3x Präzisionssensor (I2C)
- **Lichtintensität** - BH1750 Luxmeter (I2C)
- **Wassertank-Level** - Analoger Füllstandssensor
- **Gas/CO2-Detektion** - MQ-Serie Sensor
- **VPD-Berechnung** - Vapor Pressure Deficit in Echtzeit
- **DLI-Tracking** - Daily Light Integral

### 🤖 Intelligente Automatisierung
- **Adaptive Bewässerung** - Basierend auf Bodenfeuchtigkeit (<30%)
  - 2 Pumpengruppen (Slot 1-3 + 4-6)
  - Cooldown-Perioden konfigurierbar
  - Manuelle Override-Funktion

- **Lichtsteuerung** - Zeitplan-basiert
  - Konfigurierbare Startzeit
  - Phasen-gerechte Dauer (12-24h)
  - Mitternachts-Überlauf-Handling

- **Klimakontrolle** - VPD-optimiert
  - Automatische Lüftersteuerung
  - Temperatur-Zielwerte
  - Hysterese-Kontrolle

- **Sicherheitssysteme**
  - Not-Aus bei Überhitzung (>40°C)
  - Gas/Rauch-Alarm (>3500 ppm)
  - Automatische System-Abschaltung

### 🧠 KI & Data Intelligence

#### AI Consultant (Google Gemini)
- Echtzeit-Analyse aller Sensordaten
- Pflanzenspezifische Empfehlungen
- Wachstumsphasen-Optimierung
- Problemdiagnose & Lösungen

#### Erweiterte Analytics **[NEU v1.2]**
- **Anomalie-Erkennung** - Z-Score basierte Ausreißer-Detektion
- **Spike-Detection** - Plötzliche Temperatur-/Feuchtigkeitsänderungen
- **Predictive Analytics** - 6h Vorhersagen via Lineare Regression
- **Trend-Analysen** - Steigend/Fallend/Stabil Erkennung
- **Optimierungsvorschläge** - VPD, Klima, Luftfeuchtigkeit

#### Historische Daten
- 24h Zeitreihen-Analyse
- 4h Moving Averages
- Interaktive Recharts-Diagramme
- PDF-Report-Generator (jsPDF)

### 🌱 Pflanzen-Management

- **6-Slot System** - Individuelle Profile pro Pflanze
- **Lebenszyklus-Tracking**
  - Keimling → Vegetation → Blüte → Trocknen → Geerntet
  - Automatische Datums-Berechnung
- **Strain-Datenbank** - Name, Breeder, Type (Feminized/Auto/Regular/CBD)
- **Gesundheits-Score** - 0-100% Bewertung
- **QR-Code Generator** - Für Pflanzenetiketten
- **Foto-Dokumentation** **[NEU v1.2]** - Kamera-Integration

### 📖 Grow-Rezepte & Templates **[NEU v1.2]**

3 vordefinierte professionelle Anbau-Zeitpläne:

#### 1. Standard Photoperiode (Indica-dominant)
- **Dauer:** 105 Tage (7d Keimling + 28d Veg + 56d Blüte + 14d Spülen)
- **Ertrag:** 400-600 g/m²
- **Schwierigkeit:** Anfänger
- Detaillierte Parameter pro Phase (Temp, Humidity, VPD, EC, pH)

#### 2. Autoflower Express
- **Dauer:** 70 Tage (7d + 21d + 42d)
- **Ertrag:** 50-150 g/Pflanze
- **Schwierigkeit:** Anfänger
- Konstantes 20h Licht-Regime

#### 3. Sativa Langstielig
- **Dauer:** 126 Tage (7d + 35d + 70d + 14d)
- **Ertrag:** 350-550 g/m²
- **Schwierigkeit:** Fortgeschritten
- Längere Vegetation für Struktur

**Features:**
- Phasen-basierte Zeitpläne
- VPD, EC, pH-Werte pro Phase
- Praktische Tipps & Tricks
- Like-System & Verwendungs-Counter
- CRUD via REST API

### 📱 Progressive Web App (PWA) **[NEU v1.2]**

- **App-Installation** - Auf Smartphone/Tablet installierbar
- **Offline-Funktionalität** - Service Worker mit Smart Caching
- **App-Shortcuts** - Schnellzugriff auf Dashboard, Pflanzen, Controls
- **Background Sync** - Automatische Daten-Synchronisation
- **Mobile-optimiert** - Responsive Design

### 🔔 Push-Notifications **[NEU v1.2]**

- **Web Push API** - Native Browser-Benachrichtigungen
- **Multi-Device Support** - Auf allen Geräten
- **Kategorien:**
  - Kritische Alarme (Temperatur, Gas)
  - Bewässerungs-Hinweise
  - Klima-Warnungen
  - Kalender-Erinnerungen
- **Statistiken** - Tracking aktiver Subscriptions

### 🌤️ Wetter-API Integration **[NEU v1.2]**

- **OpenWeather API** - Aktuelles Wetter & 5-Tage-Forecast
- **Indoor/Outdoor-Vergleich**
  - Temperatur-Differenz-Analyse
  - Luftfeuchtigkeit-Empfehlungen
  - Lüftungs-Optimierung
- **Grow-spezifische Tipps**
  - VPD-basierte Empfehlungen
  - Sonnenauf-/untergang für Lichtplanung
  - Luftdruck-Hinweise

### 📅 Kalender & Events

- **Grow-Kalender** - Zeitplanung für gesamten Zyklus
- **Event-Management** - Düngen, Umtopfen, Ernte
- **Düngeplan-Wizard** - Automatische Zeitplanerstellung
- **Next-Event-Anzeige** - Im Dashboard
- **iCal-Export** (geplant)

### ⚙️ Manuelle Steuerung

- **Einzelrelais-Kontrolle**
  - Licht (4 Pin)
  - Abluft-Lüfter (5 Pin)
  - Zuluft-Lüfter (optional)
  - Pumpe 1 (16 Pin) - Slots 1-3
  - Pumpe 2 (17 Pin) - Slots 4-6
- **Timer-Visualisierung** - Für zeitgesteuerte Aktionen
- **Aktivitäts-Log** - Alle manuellen Eingriffe
- **Stromverbrauch-Tracking** - Watt pro Gerät

### 🔧 System & Einstellungen

- **Automation-Config**
  - Lichtzeiten & Dauer
  - Temperatur-Zielwerte
  - Bewässerungs-Intervalle
  - VPD-Schwellwerte

- **Benachrichtigungen**
  - Push-Notifications (Web Push)
  - Discord Webhooks
  - Kategorie-Filter

- **Hardware-Kontrolle**
  - ESP32 Remote-Reboot
  - Factory Reset
  - System-Status & Uptime

- **Themes** - Dark/Forest/Ocean Mode

---

## 🛠️ Hardware Setup

### Controller
- **ESP32 DevKit V1** (WiFi + Dual-Core)
- **4-Kanal Relais-Modul** (5V)

### Sensoren
- **6x Kapazitive Bodenfeuchtesensoren v1.2**
  - Pins: 32, 33, 34, 35, 36, 39 (Analog)
- **SHT31 Temperatur/Luftfeuchtigkeit** (I2C 0x44)
- **BH1750 Lux-Sensor** (I2C 0x23)
- **Wasserstandssensor** (Analog Pin 25)
- **MQ-X Gas/CO2-Sensor** (Analog Pin 26)

### Aktoren
- **12V Wasserpumpe** (2x) - Über Relais
- **LED Grow-Light** - Über Relais (Pin 4)
- **Abluft-Lüfter** - Über Relais (Pin 5)

### Verkabelung
```
ESP32 → Relais-Modul:
  Pin 16 → Relais 1 (Pumpe 1)
  Pin 17 → Relais 2 (Pumpe 2)
  Pin 4  → Relais 3 (Licht)
  Pin 5  → Relais 4 (Lüfter)

ESP32 → Sensoren (I2C):
  Pin 21 → SDA (SHT31 + BH1750)
  Pin 22 → SCL (SHT31 + BH1750)
```

---

## 🚀 Installation & Setup

### Voraussetzungen
- **Node.js** v18+ ([Download](https://nodejs.org))
- **MongoDB** v6+ ([Download](https://www.mongodb.com/try/download/community))
- **Git** ([Download](https://git-scm.com))
- **Arduino IDE** oder **PlatformIO** (für ESP32)

### 1. Repository klonen
```bash
git clone https://github.com/yourusername/grow-monitoring-system.git
cd grow-monitoring-system
```

### 2. Backend einrichten

```bash
cd backend
npm install

# .env Datei erstellen
cp .env.example .env
```

**`.env` konfigurieren:**
```env
# MongoDB
DB_URI=mongodb://localhost:27017/growdb

# VAPID Keys für Push-Notifications (generieren mit)
# npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:your-email@example.com

# OpenWeather API (optional)
OPENWEATHER_API_KEY=your-api-key

# Google Gemini API (optional)
GEMINI_API_KEY=your-gemini-key

# Discord Webhook (optional)
DISCORD_WEBHOOK_URL=your-webhook-url
```

**Backend starten:**
```bash
npm start
# oder für Development:
npm run dev
```

**Erwartete Ausgabe:**
```
✅ Push-Notifications Service aktiviert
✅ 3 Rezept-Templates erfolgreich initialisiert
🔗 Verbinde zu öffentlichem Broker: mqtt://test.mosquitto.org
✅ MongoDB verbunden
🚀 Server läuft auf Port 3000
```

### 3. Frontend einrichten

```bash
cd frontend
npm install
npm run dev
```

**Browser öffnet automatisch:** `http://localhost:5173`

### 4. ESP32 Firmware flashen

**Arduino IDE:**
1. `firmware/ArduinoVersion/GrowSystem.ino/GrowSystem.ino.ino` öffnen
2. WiFi-Credentials anpassen (Zeile 21-22):
   ```cpp
   const char* WIFI_SSID = "DEIN-WLAN";
   const char* WIFI_PASSWORD = "DEIN-PASSWORT";
   ```
3. Bibliotheken installieren:
   - PubSubClient
   - ArduinoJson
   - Adafruit SHT31
   - BH1750
4. Board: "ESP32 Dev Module" auswählen
5. Upload

**Serieller Monitor (115200 Baud):**
```
Verbinde mit WLAN: DEIN-WLAN
.....
WLAN verbunden!
Verbinde mit MQTT (Cloud)...verbunden!
Daten gesendet an: grow_drexl_v2/data
```

---

## 📡 Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND (PWA)                     │
│                     localhost:5173                          │
│  • Dashboard  • Pflanzen  • Rezepte  • Analytics           │
│  • Kalender  • AI  • Controls  • Settings                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
         REST API │ WebSocket (Socket.io)
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                NODE.JS EXPRESS BACKEND                      │
│                     localhost:3000                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Controllers: Plants, Recipes, Analytics, Weather...  │  │
│  │ Services: AI, Push, Weather, Analytics, MQTT        │  │
│  │ Models: Plant, Recipe, Sensor, Subscription...      │  │
│  └──────────────────────────────────────────────────────┘  │
└────┬────────────────┬───────────────────┬─────────────┬────┘
     │                │                   │             │
  MongoDB      MQTT Broker          Gemini API    Web Push
  (Datenbank) (test.mosquitto)    (Google AI)   (Notifications)
     │                │
     │         ┌──────▼──────────────────────────────────────┐
     │         │          ESP32 FIRMWARE                     │
     │         │  • Sensor-Manager  • Network-Manager        │
     │         │  • Pump-Controller  • MQTT-Client           │
     │         └──────┬──────────────────────────────────────┘
     │                │
     │         ┌──────▼──────────────────────────────────────┐
     │         │           HARDWARE                          │
     │         │  • 6x Bodensensoren  • SHT31  • BH1750     │
     │         │  • 4x Relais  • Pumpen  • Licht  • Lüfter  │
     │         └─────────────────────────────────────────────┘
     │
  ┌──▼──────────────────────────────────────────────────────┐
  │              MONGODB DATENBANK                          │
  │  • Plants  • SensorLogs  • Recipes  • Events           │
  │  • PushSubscriptions  • CalendarEvents  • SystemLogs   │
  └─────────────────────────────────────────────────────────┘
```

---

## 🔌 API-Dokumentation

### Pflanzen
```http
GET    /api/plants           # Alle Pflanzen
PUT    /api/plants/:slotId   # Pflanze aktualisieren
```

### Grow-Rezepte
```http
GET    /api/recipes          # Alle Rezepte
GET    /api/recipes/:id      # Einzelnes Rezept
POST   /api/recipes          # Neues Rezept erstellen
PUT    /api/recipes/:id      # Rezept bearbeiten
DELETE /api/recipes/:id      # Rezept löschen
POST   /api/recipes/:id/use  # Rezept verwenden
POST   /api/recipes/:id/like # Rezept liken
```

### Analytics & AI
```http
GET    /api/analytics/anomalies      # Anomalie-Erkennung
GET    /api/analytics/predictions    # 6h Vorhersagen
GET    /api/analytics/optimizations  # Optimierungsvorschläge
POST   /api/ai/consult               # AI Analyse
```

### Wetter
```http
GET    /api/weather/current           # Aktuelles Wetter
GET    /api/weather/forecast          # 5-Tage-Forecast
GET    /api/weather/recommendations   # Indoor/Outdoor-Vergleich
```

### Push-Notifications
```http
POST   /api/notifications/subscribe    # Subscription erstellen
POST   /api/notifications/unsubscribe  # Subscription löschen
POST   /api/notifications/test         # Test-Notification
GET    /api/notifications/public-key   # VAPID Public Key
GET    /api/notifications/stats        # Statistiken
```

### Steuerung & System
```http
POST   /api/controls/relay   # Relais schalten
POST   /api/system/reboot    # ESP32 neu starten
POST   /api/system/reset     # Factory Reset
```

---

## 🔒 Sicherheit & Best Practices

### Produktion-Checkliste
- [ ] `.env` niemals in Git committen
- [ ] Starke `JWT_SECRET` generieren
- [ ] MongoDB mit Authentifizierung
- [ ] HTTPS mit Let's Encrypt
- [ ] Privaten MQTT-Broker nutzen (nicht test.mosquitto.org)
- [ ] CORS auf spezifische Domains beschränken
- [ ] API-Rate-Limiting aktivieren
- [ ] Firewall konfigurieren (Ports 3000, 27017)

### Empfohlene .gitignore
```
backend/.env
backend/node_modules
frontend/node_modules
frontend/dist
*.log
```

---

## 📦 Deployment

### Docker (empfohlen)
```bash
docker-compose up -d
```

### Manuell (VPS/Dedicated Server)
```bash
# PM2 für Backend
npm install -g pm2
cd backend
pm2 start src/server.js --name grow-backend

# Frontend Build
cd frontend
npm run build

# Nginx als Reverse Proxy
# siehe docs/nginx.conf
```

---

## 🧪 Testing

```bash
# Backend Tests
cd backend
npm test

# Frontend Tests
cd frontend
npm test

# E2E Tests
npm run test:e2e
```

---

## 🤝 Contributing

Contributions sind willkommen! Bitte:
1. Fork das Repository
2. Feature-Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request öffnen

---

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE)

---

## 🆘 Support & Community

- **Issues:** [GitHub Issues](https://github.com/yourusername/grow-system/issues)
- **Dokumentation:** [Wiki](https://github.com/yourusername/grow-system/wiki)
- **Setup-Guide:** [SETUP.md](SETUP.md)

---

## 🙏 Credits

- **Icons:** [Lucide React](https://lucide.dev)
- **Charts:** [Recharts](https://recharts.org)
- **AI:** [Google Gemini](https://ai.google.dev)
- **Weather:** [OpenWeather](https://openweathermap.org)
- **Push:** [Web-Push](https://github.com/web-push-libs/web-push)

---

## 📊 Changelog

### v1.2.0 (2026-01)
- ✨ Progressive Web App (PWA)
- ✨ Push-Notifications System
- ✨ Wetter-API Integration
- ✨ Grow-Rezepte & Templates
- ✨ Erweiterte KI-Analytics
- ✨ Kamera-Integration
- 🔧 VAPID Keys optional
- 🔧 Verbesserte Error-Handling
- 📚 Erweiterte Dokumentation

### v1.1.0 (2025-12)
- Initial Release

---

**Made with 🌱 for Growers, by Growers**
