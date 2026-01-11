# Docker Setup Guide - Grow Monitoring System

Komplette Anleitung zum Deployment mit Docker Compose.

## Voraussetzungen

- **Docker** v20.10+ ([Installation](https://docs.docker.com/get-docker/))
- **Docker Compose** v2.0+ (meist mit Docker mitgeliefert)
- **Git** (zum Klonen des Repositories)

## 1. Repository klonen

```bash
git clone https://github.com/yourusername/grow-monitoring-system.git
cd grow-monitoring-system
```

## 2. Umgebungsvariablen konfigurieren

### VAPID Keys generieren (für Push-Notifications)

```bash
cd backend
npm install  # Falls noch nicht geschehen
npx web-push generate-vapid-keys
```

Kopiere die generierten Keys.

### .env Datei erstellen

```bash
# Im Root-Verzeichnis (nicht backend/)
cp .env.docker .env
```

Bearbeite `.env` und fülle folgende Werte aus:

```env
# JWT Secret (generiere mit: openssl rand -base64 32)
JWT_SECRET=dein-generierter-jwt-secret-min-32-chars

# VAPID Keys (von oben)
VAPID_PUBLIC_KEY=dein-public-key
VAPID_PRIVATE_KEY=dein-private-key
VAPID_SUBJECT=mailto:deine-email@example.com

# Optional: OpenWeather API
OPENWEATHER_API_KEY=dein-api-key

# Optional: Google Gemini API
GEMINI_API_KEY=dein-gemini-key

# Optional: Discord Webhook
DISCORD_WEBHOOK_URL=dein-webhook-url
```

## 3. Frontend Build-Konfiguration

Bearbeite `frontend/.env` (wird beim Build verwendet):

```bash
cd frontend
cp .env.example .env
```

Setze die Backend-URL für Production:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
VITE_VAPID_PUBLIC_KEY=dein-public-key-hier
```

**Wichtig:** Für Production auf Server ersetze `localhost` durch deine Domain:
```env
VITE_API_URL=https://yourdomain.com/api
VITE_SOCKET_URL=https://yourdomain.com
```

## 4. Container starten

### Erste Installation (mit Build)

```bash
docker-compose up -d --build
```

Erwartete Ausgabe:
```
[+] Running 4/4
 ✔ Network grow-network            Created
 ✔ Container grow-mongodb           Started
 ✔ Container grow-backend           Started
 ✔ Container grow-frontend          Started
```

### Container-Status prüfen

```bash
docker-compose ps
```

Sollte zeigen:
```
NAME              STATUS         PORTS
grow-mongodb      Up (healthy)   0.0.0.0:27017->27017/tcp
grow-backend      Up (healthy)   0.0.0.0:3000->3000/tcp
grow-frontend     Up             0.0.0.0:80->80/tcp
```

### Logs anzeigen

```bash
# Alle Services
docker-compose logs -f

# Nur Backend
docker-compose logs -f backend

# Nur Frontend
docker-compose logs -f frontend

# Nur MongoDB
docker-compose logs -f mongodb
```

## 5. Anwendung öffnen

**Frontend:** http://localhost

**Backend API:** http://localhost:3000/api

**MongoDB:** localhost:27017
- User: `admin`
- Passwort: `growsystem2024`
- Datenbank: `growdb`

## 6. ESP32 Firmware konfigurieren

Die ESP32-Firmware muss auf die Backend-IP zeigen:

```cpp
// firmware/ArduinoVersion/GrowSystem.ino
const char* WIFI_SSID = "DEIN-WLAN";
const char* WIFI_PASSWORD = "DEIN-PASSWORT";

// Wenn Docker auf gleichem Netzwerk:
const char* BACKEND_URL = "http://192.168.1.XXX:3000";  // Deine Server-IP
```

MQTT bleibt auf Public Broker (test.mosquitto.org), es sei denn du installierst eigenen Broker.

## 7. Wartung & Management

### Container stoppen

```bash
docker-compose stop
```

### Container starten (ohne Rebuild)

```bash
docker-compose start
```

### Container neustarten

```bash
docker-compose restart
```

### Container vollständig entfernen

```bash
docker-compose down
```

### Container + Datenbanken entfernen (ACHTUNG: Datenverlust!)

```bash
docker-compose down -v
```

### Einzelnen Service neustarten

```bash
docker-compose restart backend
```

### Backend-Terminal öffnen

```bash
docker exec -it grow-backend sh
```

### MongoDB-Terminal öffnen

```bash
docker exec -it grow-mongodb mongosh
```

Im mongosh:
```javascript
use admin
db.auth('admin', 'growsystem2024')
use growdb
db.plants.find().pretty()
```

## 8. Updates deployen

### Code aktualisieren

```bash
git pull
docker-compose down
docker-compose up -d --build
```

### Nur Backend aktualisieren

```bash
docker-compose up -d --build --no-deps backend
```

### Nur Frontend aktualisieren

```bash
docker-compose up -d --build --no-deps frontend
```

## 9. Backup & Restore

### MongoDB Backup erstellen

```bash
docker exec grow-mongodb mongodump \
  -u admin \
  -p growsystem2024 \
  --authenticationDatabase admin \
  --db growdb \
  --out /data/backup

# Backup auf Host kopieren
docker cp grow-mongodb:/data/backup ./backup-$(date +%Y%m%d)
```

### MongoDB Restore

```bash
# Backup in Container kopieren
docker cp ./backup-20260105 grow-mongodb:/data/restore

# Restore durchführen
docker exec grow-mongodb mongorestore \
  -u admin \
  -p growsystem2024 \
  --authenticationDatabase admin \
  --db growdb \
  /data/restore/growdb
```

## 10. Production Deployment (VPS/Server)

### Sicherheits-Checkliste

1. **MongoDB Passwort ändern:**
   - Bearbeite `docker-compose.yml`, Zeile 13 + 37
   - Wähle starkes Passwort

2. **HTTPS einrichten:**
   - Installiere Nginx als Reverse Proxy
   - Let's Encrypt SSL-Zertifikat
   - Siehe: `docs/nginx-production.conf`

3. **Firewall konfigurieren:**
   ```bash
   # Nur HTTPS öffnen
   ufw allow 443/tcp
   ufw allow 80/tcp  # Für Let's Encrypt
   ufw enable
   ```

4. **Privaten MQTT-Broker installieren:**
   ```bash
   docker run -d --name mosquitto \
     -p 1883:1883 \
     -v mosquitto-data:/mosquitto/data \
     eclipse-mosquitto
   ```

   Dann in `docker-compose.yml` anpassen:
   ```yaml
   MQTT_BROKER_URL: mqtt://mosquitto:1883
   ```

5. **Auto-Start aktivieren:**
   ```bash
   # Docker-Compose als Systemd Service
   sudo nano /etc/systemd/system/grow-system.service
   ```

### Nginx Reverse Proxy Beispiel

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket (Socket.IO)
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 11. Troubleshooting

### Backend startet nicht

```bash
docker-compose logs backend
```

Häufige Fehler:
- MongoDB noch nicht bereit → Warte 30 Sekunden
- Fehlende Umgebungsvariablen → Prüfe `.env`
- Port 3000 belegt → Andere Anwendung stoppen

### Frontend zeigt "API nicht erreichbar"

1. Prüfe Backend-Status: `docker-compose ps`
2. Teste API direkt: `curl http://localhost:3000/api/health`
3. Prüfe `frontend/.env` → VITE_API_URL korrekt?
4. Browser-Console öffnen (F12) → CORS-Fehler?

### MongoDB Connection Error

```bash
docker-compose logs mongodb
```

Prüfe:
- Container läuft: `docker ps | grep mongo`
- Passwort korrekt in `docker-compose.yml`?
- Health-Check schlägt fehl → MongoDB-Version downgraden?

### Datenbank zurücksetzen

```bash
docker-compose down -v  # ACHTUNG: Löscht ALLE Daten
docker-compose up -d
```

## 12. Performance-Optimierung

### Ressourcen-Limits setzen

Bearbeite `docker-compose.yml`:

```yaml
services:
  mongodb:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Logs rotieren

```bash
# In docker-compose.yml bei jedem Service
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## Support

Bei Problemen:
- **GitHub Issues:** https://github.com/yourusername/grow-system/issues
- **Wiki:** https://github.com/yourusername/grow-system/wiki
- **Logs hochladen:** `docker-compose logs > debug.log`

---

**Made with 🌱 for Growers, by Growers**
