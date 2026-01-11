# Quickstart Guide - Grow Monitoring System

Schnellstart-Anleitung für lokale Entwicklung und Docker-Deployment.

## Option 1: Lokale Entwicklung (Empfohlen für Testing)

### Voraussetzungen
- Node.js v18+ installiert
- MongoDB lokal installiert und gestartet
- Git

### 1. Repository klonen
```bash
git clone https://github.com/yourusername/grow-monitoring-system.git
cd grow-monitoring-system
```

### 2. Backend einrichten
```bash
cd backend
npm install
cp .env.example .env
```

Bearbeite `backend/.env`:
- Setze mindestens `JWT_SECRET` (min. 32 Zeichen)
- MongoDB-URI: `mongodb://localhost:27017/growdb`

```bash
npm start
# oder für Development mit Auto-Reload:
npm run dev
```

Backend läuft auf: **http://localhost:3000**

### 3. Frontend einrichten (neues Terminal)
```bash
cd frontend
npm install
cp .env.example .env
```

`frontend/.env` sollte so aussehen:
```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

```bash
npm run dev
```

Frontend läuft auf: **http://localhost:5173**

### 4. ESP32 Firmware flashen
1. Arduino IDE öffnen
2. `firmware/ArduinoVersion/GrowSystem.ino/GrowSystem.ino.ino` öffnen
3. WiFi-Credentials anpassen (Zeile 21-22)
4. ESP32 Dev Module auswählen
5. Upload

### 5. Fertig!
Öffne Browser: http://localhost:5173

---

## Option 2: Docker Deployment (Für Production)

### Voraussetzungen
- Docker + Docker Compose installiert

### 1. Repository klonen
```bash
git clone https://github.com/yourusername/grow-monitoring-system.git
cd grow-monitoring-system
```

### 2. VAPID Keys generieren
```bash
cd backend
npm install
npx web-push generate-vapid-keys
```

Kopiere die generierten Keys.

### 3. Umgebungsvariablen konfigurieren
```bash
# Im Root-Verzeichnis
cp .env.docker .env
```

Bearbeite `.env` und setze mindestens:
```env
JWT_SECRET=your-super-secret-jwt-key-min-32-chars  # Mindestens 32 Zeichen!
VAPID_PUBLIC_KEY=dein-public-key-von-schritt-2
VAPID_PRIVATE_KEY=dein-private-key-von-schritt-2
VAPID_SUBJECT=mailto:deine-email@example.com
```

Optional (für erweiterte Features):
```env
OPENWEATHER_API_KEY=xxx        # Wetter-Integration
GEMINI_API_KEY=xxx             # AI Consultant
DISCORD_WEBHOOK_URL=xxx        # Discord-Benachrichtigungen
```

Frontend-Build konfigurieren:
```bash
cd frontend
cp .env.example .env
```

Bearbeite `frontend/.env` (wird ins Build eingebaut):
```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
VITE_VAPID_PUBLIC_KEY=dein-public-key-von-schritt-2
```

**WICHTIG:** Der Frontend-Build benötigt diese Variablen zur Build-Zeit. Nach Änderungen muss neu gebaut werden!

### 4. Container bauen und starten
```bash
# Im Root-Verzeichnis
docker-compose up -d --build
```

Das erste Mal dauert ~5-10 Minuten (npm install + build).

**Was passiert:**
- MongoDB startet zuerst (Health-Check)
- Backend wartet auf MongoDB, dann installiert Dependencies
- Frontend wird gebaut (Vite Build) und in Nginx deployed
- Alle Services starten automatisch neu bei Fehlern

### 5. Status prüfen
```bash
docker-compose ps
```

Sollte zeigen:
```
NAME              STATUS
grow-mongodb      Up (healthy)
grow-backend      Up (healthy)
grow-frontend     Up
```

**Logs ansehen (falls Probleme):**
```bash
docker-compose logs -f backend   # Backend-Logs live
docker-compose logs -f frontend  # Frontend-Build-Logs
docker-compose logs -f mongodb   # MongoDB-Logs
```

**Health-Checks testen:**
```bash
# Backend API Health
curl http://localhost:3000/api/health

# Sollte zurückgeben:
# {"status":"OK","timestamp":"...","service":"grow-monitoring-backend","version":"1.2.0"}

# Frontend Nginx
curl http://localhost

# Sollte HTML zurückgeben
```

### 6. Fertig!
Öffne Browser: **http://localhost**

**First-Time Setup:**
1. Erstelle optionalen Account (Login → Registrieren)
2. Füge erste Pflanze hinzu (Pflanzen → + Hinzufügen)
3. Konfiguriere Automation (Einstellungen → Automation)
4. ESP32 verbinden (siehe unten)

### 7. ESP32 verbinden (Hardware)
Die Docker-Umgebung nutzt den Public MQTT-Broker `test.mosquitto.org`.

**Arduino Firmware anpassen:**
```cpp
// In firmware/ArduinoVersion/.../config.h
const char* wifi_ssid = "dein-wifi";
const char* wifi_password = "dein-passwort";
const char* mqtt_server = "test.mosquitto.org";  // Default
const char* mqtt_topic = "grow_drexl_v2";        // Muss mit Backend übereinstimmen
```

Flashe die Firmware auf den ESP32, dann sollten Sensordaten im Dashboard erscheinen.

---

## Standardzugänge

### MongoDB
- Host: `localhost:27017`
- User: `admin`
- Passwort: `growsystem2024` (ändern für Production!)
- Datenbank: `growdb`

### Backend API
- URL: `http://localhost:3000/api`
- Health-Check: `http://localhost:3000/api/health`

### Frontend
- Lokal: `http://localhost:5173` (Development)
- Docker: `http://localhost` (Production)

---

## Erste Schritte in der App

### 1. Optional: Login erstellen
Die App funktioniert auch ohne Login! Für Multi-User:

- Klicke auf "Login" (oben rechts)
- Wähle "Registrieren"
- Erstelle Account

### 2. Pflanzen hinzufügen
- Gehe zu "Pflanzen" Tab
- Klicke auf "Pflanze hinzufügen"
- Fülle Informationen aus (Name, Strain, Phase)
- Speichern

### 3. Automatisierung konfigurieren
- Gehe zu "Einstellungen" Tab
- Wähle "Automation"
- Setze Lichtzeiten, Temperatur-Schwellwerte, Bewässerungsintervalle
- Speichern

### 4. Grow-Rezept verwenden
- Gehe zu "Rezepte" Tab
- Wähle ein Template (z.B. "Standard Photoperiode")
- Klicke "Verwenden"
- Folge dem Zeitplan

### 5. Dashboard beobachten
- Zurück zu "Dashboard"
- Echzeit-Sensordaten werden angezeigt
- Live-Charts zeigen Trends
- VPD-Berechnung läuft automatisch

---

## Wichtige Endpoints

### API-Dokumentation

**Pflanzen:**
```
GET    /api/plants
PUT    /api/plants/:slotId
```

**Sensordaten:**
```
GET    /api/history?hours=24
GET    /api/logs?limit=100
```

**Steuerung:**
```
POST   /api/controls/relay
Body: { pin: 4, state: true, duration: 30 }
```

**AI Consultant:**
```
POST   /api/ai/consult
Body: { question: "Warum sind meine Blätter gelb?" }
```

**Wetter:**
```
GET    /api/weather/current
GET    /api/weather/recommendations
```

---

## Troubleshooting

### Backend startet nicht
```bash
# Prüfe Logs
cd backend
npm run dev
```

Häufige Fehler:
- MongoDB nicht gestartet → `mongod` ausführen
- Port 3000 belegt → Andere App stoppen
- .env fehlt → `cp .env.example .env`

### Frontend zeigt "Verbindung fehlgeschlagen"
1. Ist Backend gestartet? → `curl http://localhost:3000/api/health`
2. CORS-Fehler? → Browser-Console (F12) prüfen
3. .env korrekt? → `VITE_API_URL` prüfen

### ESP32 verbindet nicht
1. Serieller Monitor öffnen (115200 Baud)
2. WiFi-Credentials korrekt?
3. MQTT-Broker erreichbar? → `test.mosquitto.org`
4. Backend erhält MQTT-Nachrichten? → Backend-Logs prüfen

### Docker-Container starten nicht
```bash
# Logs prüfen
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb

# Status aller Services
docker-compose ps
```

Häufige Fehler:
- **.env nicht gesetzt** → `cp .env.docker .env` und Keys eintragen
- **MongoDB nicht bereit** → Warte 30-60 Sekunden (Health-Check)
- **Port 3000 belegt** → `netstat -ano | findstr :3000` (Windows) oder `lsof -i :3000` (Linux/Mac)
- **Port 80 belegt** → `netstat -ano | findstr :80` oder `lsof -i :80`
- **Build schlägt fehl** → `docker-compose build --no-cache backend`
- **Frontend .env fehlt** → `cd frontend && cp .env.example .env`

**Komplett neu starten:**
```bash
docker-compose down -v          # Alles löschen (inkl. Daten!)
docker-compose build --no-cache # Neu bauen ohne Cache
docker-compose up -d            # Starten
```

---

## Nützliche Befehle

### Logs anzeigen
```bash
# Lokal
cd backend && npm run dev  # Zeigt Backend-Logs

# Docker - Live-Logs verfolgen
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb

# Docker - Letzte 100 Zeilen
docker-compose logs --tail=100 backend

# Alle Container
docker-compose logs -f
```

### Datenbank zurücksetzen
```bash
# Lokal (MongoDB Shell)
mongosh
use growdb
db.dropDatabase()

# Docker - Nur Daten löschen
docker-compose down -v  # ACHTUNG: Löscht ALLE Daten
docker-compose up -d

# Docker - Container neu bauen (nach Code-Änderungen)
docker-compose up -d --build backend
```

### Container verwalten
```bash
# Status prüfen
docker-compose ps

# Container stoppen
docker-compose stop

# Container starten
docker-compose start

# Einzelnen Service neustarten
docker-compose restart backend
docker-compose restart frontend
docker-compose restart mongodb

# Alles stoppen und löschen (keine Daten)
docker-compose down

# Alles stoppen und löschen (inkl. Volumes = Daten!)
docker-compose down -v

# Rebuild nach Code-Änderungen
docker-compose up -d --build --force-recreate
```

### Container-Terminal öffnen
```bash
# Backend-Shell
docker exec -it grow-backend sh

# MongoDB-Shell
docker exec -it grow-mongodb mongosh

# Frontend-Shell (Nginx)
docker exec -it grow-frontend sh
```

### Health-Checks manuell testen
```bash
# Backend API
curl http://localhost:3000/api/health

# MongoDB (innerhalb Container)
docker exec grow-mongodb mongosh --eval "db.adminCommand('ping')"

# Frontend
curl -I http://localhost
```

### Ressourcen-Verbrauch prüfen
```bash
# Live-Statistiken
docker stats

# Disk-Usage
docker system df

# Volumes inspizieren
docker volume ls
docker volume inspect grow_mongodb_data
```

---

## Nächste Schritte

### Empfohlene Features konfigurieren

1. **Push-Notifications aktivieren:**
   - VAPID Keys generieren (siehe oben)
   - In `.env` eintragen
   - In App: Settings → Notifications → "Benachrichtigungen aktivieren"

2. **Wetter-API einrichten:**
   - OpenWeather API-Key holen: https://openweathermap.org/api
   - In `.env` eintragen: `OPENWEATHER_API_KEY=xxx`
   - App neu starten

3. **AI Consultant aktivieren:**
   - Google Gemini API-Key holen: https://ai.google.dev/
   - In `.env` eintragen: `GEMINI_API_KEY=xxx`
   - App neu starten

4. **Discord-Benachrichtigungen:**
   - Discord Webhook erstellen (Server Settings → Integrations)
   - In `.env` eintragen: `DISCORD_WEBHOOK_URL=xxx`

---

## Support & Dokumentation

- **Vollständige Dokumentation:** [README.md](README.md)
- **Docker-Anleitung:** [DOCKER_SETUP.md](DOCKER_SETUP.md)
- **Hardware-Setup:** [HARDWARE_REQUIREMENTS.md](HARDWARE_REQUIREMENTS.md)
- **Sicherheit:** [SECURITY.md](SECURITY.md)
- **GitHub Issues:** https://github.com/yourusername/grow-system/issues

---

**Made with 🌱 for Growers, by Growers**
