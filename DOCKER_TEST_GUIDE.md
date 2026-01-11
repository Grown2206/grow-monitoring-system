# Docker Setup - Testing Guide

Diese Anleitung hilft dir, die Docker-Installation zu testen und sicherzustellen, dass alles funktioniert.

## Voraussetzungen

### Windows
- Docker Desktop for Windows installieren: https://www.docker.com/products/docker-desktop
- WSL2 aktiviert (wird automatisch von Docker Desktop installiert)
- Mindestens 8GB RAM
- 20GB freier Festplattenspeicher

### Linux
```bash
# Docker installieren
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose installieren
sudo apt-get install docker-compose-plugin

# User zur Docker-Gruppe hinzufügen
sudo usermod -aG docker $USER
# Logout/Login erforderlich!
```

### macOS
- Docker Desktop for Mac installieren: https://www.docker.com/products/docker-desktop
- Mindestens 8GB RAM
- 20GB freier Festplattenspeicher

---

## Schritt-für-Schritt Test

### 1. Docker Installation prüfen

```bash
# Docker-Version anzeigen
docker --version
# Sollte zeigen: Docker version 24.x.x oder höher

# Docker Compose-Version
docker-compose --version
# Sollte zeigen: Docker Compose version v2.x.x oder höher

# Docker läuft?
docker ps
# Sollte eine leere Tabelle zeigen (wenn keine Container laufen)
```

**Probleme?**
- Windows: Starte Docker Desktop
- Linux: `sudo systemctl start docker`
- macOS: Starte Docker Desktop

---

### 2. Projekt vorbereiten

```bash
# Gehe ins Projekt-Verzeichnis
cd /pfad/zum/grow-monitoring-system

# Prüfe ob docker-compose.yml existiert
ls -l docker-compose.yml

# Prüfe ob Dockerfiles existieren
ls -l backend/Dockerfile
ls -l frontend/Dockerfile
```

---

### 3. VAPID Keys generieren

```bash
# Ins Backend-Verzeichnis
cd backend

# Dependencies installieren (einmalig)
npm install

# VAPID Keys generieren
npx web-push generate-vapid-keys
```

**Ausgabe sollte so aussehen:**
```
=======================================
Public Key:
BDx...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Private Key:
xyz...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
=======================================
```

**Speichere beide Keys!** Du brauchst sie im nächsten Schritt.

---

### 4. Umgebungsvariablen konfigurieren

```bash
# Zurück ins Root-Verzeichnis
cd ..

# .env erstellen
cp .env.docker .env
```

**Bearbeite `.env`** (mit nano, vim, oder einem Editor):
```env
JWT_SECRET=mein-super-geheimer-jwt-key-mindestens-32-zeichen-lang
VAPID_PUBLIC_KEY=BDx...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xyz...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_SUBJECT=mailto:deine-email@example.com
```

**Frontend konfigurieren:**
```bash
cd frontend
cp .env.example .env
```

**Bearbeite `frontend/.env`:**
```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
VITE_VAPID_PUBLIC_KEY=BDx...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Wichtig:** Der `VITE_VAPID_PUBLIC_KEY` muss der gleiche sein wie im Backend!

---

### 5. Docker Images bauen (TEST)

Teste erst einmal nur das Backend-Image:

```bash
# Im Root-Verzeichnis
docker-compose build backend
```

**Erwartete Ausgabe:**
```
[+] Building 120.5s (12/12) FINISHED
...
=> => naming to docker.io/library/grow-backend
```

**Probleme?**
- `npm install` schlägt fehl → Prüfe Internetverbindung
- `Dockerfile not found` → Bist du im Root-Verzeichnis?

**Frontend-Image bauen:**
```bash
docker-compose build frontend
```

**Erwartete Ausgabe:**
```
[+] Building 180.2s (15/15) FINISHED
...
=> => naming to docker.io/library/grow-frontend
```

---

### 6. Container starten (OHNE -d zum Debuggen)

```bash
# Starte OHNE Daemon-Mode (Logs sichtbar)
docker-compose up
```

**Was du sehen solltest:**

1. **MongoDB startet:**
```
grow-mongodb    | [initandlisten] waiting for connections on port 27017
```

2. **Backend startet:**
```
grow-backend    | npm install...
grow-backend    | > grow-system-backend@1.0.0 start
grow-backend    | ✅ MongoDB connected
grow-backend    | ✅ MQTT verbunden: mqtt://test.mosquitto.org
grow-backend    | 🚀 Server läuft auf Port 3000
```

3. **Frontend startet:**
```
grow-frontend   | /docker-entrypoint.sh: Configuration complete; ready for start up
```

**Warte ca. 60-90 Sekunden** bis alle Services gestartet sind.

**Drücke NICHT Strg+C** - öffne ein neues Terminal für die Tests!

---

### 7. Health-Checks testen (in neuem Terminal)

```bash
# Backend API Health-Check
curl http://localhost:3000/api/health
```

**Erwartete Antwort:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-05T...",
  "service": "grow-monitoring-backend",
  "version": "1.2.0"
}
```

**Frontend testen:**
```bash
curl -I http://localhost
```

**Erwartete Antwort:**
```
HTTP/1.1 200 OK
Server: nginx/1.25.x
Content-Type: text/html
...
```

**Browser-Test:**
Öffne http://localhost in deinem Browser.

**Du solltest sehen:**
- Grow Monitoring System Dashboard
- Temperatur/Humidity Charts
- Navigation (Dashboard, Pflanzen, Analytics, etc.)

---

### 8. Container-Status prüfen

```bash
docker-compose ps
```

**Erwartete Ausgabe:**
```
NAME              IMAGE            STATUS              PORTS
grow-mongodb      mongo:6          Up (healthy)        27017/tcp
grow-backend      grow-backend     Up (healthy)        3000/tcp
grow-frontend     grow-frontend    Up                  80/tcp
```

**Alle sollten "Up" sein** - idealerweise "(healthy)".

---

### 9. Logs überprüfen

```bash
# Backend-Logs
docker-compose logs backend --tail=50

# Sollte zeigen:
# ✅ MongoDB connected
# ✅ MQTT verbunden
# 🚀 Server läuft auf Port 3000
```

```bash
# Frontend-Logs
docker-compose logs frontend --tail=50

# Sollte zeigen:
# Configuration complete; ready for start up
```

```bash
# MongoDB-Logs
docker-compose logs mongodb --tail=20

# Sollte zeigen:
# waiting for connections on port 27017
```

---

### 10. Funktionstest in der Web-App

1. **Öffne http://localhost**

2. **Registrieren (optional):**
   - Klicke rechts oben auf "Login"
   - Wähle "Registrieren"
   - Erstelle Account: `test@test.com` / `Test1234!`

3. **Pflanze hinzufügen:**
   - Gehe zu "Pflanzen" Tab
   - Klicke "+ Pflanze hinzufügen"
   - Name: "Test Plant"
   - Strain: "Test Strain"
   - Phase: "Vegetativ"
   - Speichern

4. **Automation testen:**
   - Gehe zu "Einstellungen" → "Automation"
   - Ändere Lichtstart: 08:00
   - Lichtdauer: 16h
   - Speichern

5. **Backend-Logs prüfen:**
```bash
docker-compose logs backend --tail=20

# Sollte zeigen:
# ✅ Neue Config an ESP gesendet: { lightStart: '08:00', ... }
```

---

### 11. Stoppen und neu starten

**Im ersten Terminal (wo docker-compose up läuft):**
Drücke **Strg+C**

```
Gracefully stopping... (press Ctrl+C again to force)
[+] Stopping 3/3
✔ Container grow-frontend  Stopped
✔ Container grow-backend   Stopped
✔ Container grow-mongodb   Stopped
```

**Im Hintergrund starten (Daemon-Mode):**
```bash
docker-compose up -d
```

**Status prüfen:**
```bash
docker-compose ps
# Alle sollten "Up" sein

# Logs live verfolgen
docker-compose logs -f
```

**Stoppen:**
```bash
docker-compose down
```

---

## Häufige Probleme & Lösungen

### Problem: "port is already allocated"
```
Error: Bind for 0.0.0.0:3000 failed: port is already allocated
```

**Lösung:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/macOS
lsof -ti:3000 | xargs kill -9
```

### Problem: "npm install" schlägt fehl
```
npm ERR! network request to https://registry.npmjs.org failed
```

**Lösung:**
- Internetverbindung prüfen
- Proxy-Einstellungen prüfen
- Docker Desktop neu starten
- Cache löschen: `docker-compose build --no-cache backend`

### Problem: MongoDB startet nicht
```
grow-mongodb exited with code 1
```

**Lösung:**
```bash
# Volumes löschen und neu starten
docker-compose down -v
docker-compose up -d
```

### Problem: Frontend zeigt "Cannot connect to API"
```
Network Error: Failed to fetch
```

**Lösung:**
1. Ist Backend erreichbar? `curl http://localhost:3000/api/health`
2. Frontend .env korrekt? → `VITE_API_URL=http://localhost:3000/api`
3. Browser-Console prüfen (F12)
4. CORS-Fehler? → Backend-Logs prüfen

### Problem: "no space left on device"
```
Error: no space left on device
```

**Lösung:**
```bash
# Docker aufräumen
docker system prune -a --volumes
# ACHTUNG: Löscht ALLE ungenutzten Container, Images und Volumes!
```

---

## Erweiterte Tests

### Test 1: API-Endpoints direkt testen

```bash
# Health-Check
curl http://localhost:3000/api/health

# Pflanzen abrufen
curl http://localhost:3000/api/plants

# History abrufen
curl http://localhost:3000/api/history?hours=24

# Automation abrufen
curl http://localhost:3000/api/settings/automation
```

### Test 2: MongoDB direkt verbinden

```bash
# MongoDB-Shell öffnen
docker exec -it grow-mongodb mongosh -u admin -p growsystem2024

# In der mongosh:
use growdb
show collections
db.plants.find()
exit
```

### Test 3: Backend-Container inspizieren

```bash
# Shell im Backend-Container
docker exec -it grow-backend sh

# Im Container:
ls -la
cat .env
npm list
exit
```

### Test 4: Ressourcen-Verbrauch

```bash
# Live-Statistiken
docker stats

# Erwarteter Verbrauch:
# grow-mongodb:  ~100-200 MB RAM
# grow-backend:  ~150-300 MB RAM
# grow-frontend: ~20-50 MB RAM
```

---

## Production-Deployment Tipps

### Security
1. **MongoDB-Passwort ändern** in `docker-compose.yml`
2. **JWT_SECRET ändern** zu starkem, zufälligem String
3. **Ports einschränken** (nur 80 exposieren, nicht 3000/27017)
4. **Eigenen MQTT-Broker nutzen** (nicht test.mosquitto.org)

### Performance
1. **Resource Limits setzen** in `docker-compose.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
```

2. **Logs rotieren**:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Monitoring
1. **Docker-Logs automatisch prüfen:**
```bash
# Cron-Job einrichten
0 */6 * * * docker-compose -f /pfad/zu/docker-compose.yml ps
```

2. **Health-Checks automatisch testen:**
```bash
# Monitoring-Script (z.B. in /usr/local/bin/check-grow.sh)
#!/bin/bash
curl -f http://localhost:3000/api/health || docker-compose restart backend
```

---

## Nächste Schritte

✅ Docker läuft einwandfrei?
→ **Siehe QUICKSTART.md für ESP32-Setup**

✅ Du willst Daten persistent speichern?
→ **Volumes sind bereits konfiguriert** (grow_mongodb_data)

✅ Du willst Production-Deployment?
→ **Siehe DOCKER_SETUP.md für erweiterte Konfiguration**

✅ Du willst eigenen MQTT-Broker?
→ **Siehe MQTT_SETUP.md** (falls vorhanden)

---

**Viel Erfolg mit deinem Grow Monitoring System! 🌱**
