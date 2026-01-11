# Grow Monitoring System - Deployment Guide

Dieses Dokument beschreibt die Produktiv-Installation des Grow Monitoring Systems.

## 📋 Voraussetzungen

### Hardware
- **Minimum**: 2GB RAM, 10GB freier Speicher, ARM64/AMD64 CPU
- **Empfohlen**: 4GB RAM, 50GB freier Speicher (für Timelapse-Archiv)
- **Raspberry Pi**: 4 oder neuer (mit 4GB+ RAM)

### Software
- Docker Engine 20.10+ und Docker Compose 2.0+
- (Optional) CasaOS für einfachere Installation
- (Optional) Git für Updates

### Netzwerk
- Ports die freigegeben werden müssen:
  - `8080` (HTTP Web UI)
  - `8443` (HTTPS Web UI, optional)
  - `1883` (MQTT Broker)
  - `9001` (MQTT WebSocket)
  - `3001` (Grafana)

---

## 🚀 Installation

### Option 1: CasaOS (Empfohlen für Heimserver)

1. **CasaOS App Store öffnen**

2. **Custom App installieren**:
   - Click auf "Install a customized app"
   - Import `casaos.yml` aus diesem Repository
   - Konfiguriere Umgebungsvariablen im UI

3. **Umgebungsvariablen setzen**:
   - `MONGO_INITDB_ROOT_PASSWORD`: Sicheres MongoDB Passwort
   - `GRAFANA_ADMIN_PASSWORD`: Sicheres Grafana Passwort
   - `JWT_SECRET`: Min. 32 Zeichen langer Secret Key

4. **Installation starten** und auf Deployment warten (~5 Minuten)

5. **Web UI öffnen**: `http://your-casaos-ip:8080`

---

### Option 2: Docker Compose (Manuell)

#### Schritt 1: Repository klonen

```bash
git clone https://github.com/your-repo/grow-monitoring-system.git
cd grow-monitoring-system
```

#### Schritt 2: Umgebungsvariablen konfigurieren

```bash
# Kopiere Example-Datei
cp .env.production.example .env.production

# Bearbeite mit deinem Editor
nano .env.production
```

**Wichtige Variablen** (siehe `.env.production.example` für alle):

```env
# MongoDB
MONGO_INITDB_ROOT_PASSWORD=dein-sicheres-passwort

# JWT
JWT_SECRET=super-secret-key-min-32-characters-long

# Grafana
GF_SECURITY_ADMIN_PASSWORD=grafana-admin-password

# VAPID Keys (für Push Notifications)
VAPID_PUBLIC_KEY=dein-public-key
VAPID_PRIVATE_KEY=dein-private-key
VAPID_SUBJECT=mailto:deine-email@example.com
```

**VAPID Keys generieren**:
```bash
# Falls noch nicht installiert
npm install -g web-push

# Keys generieren
npx web-push generate-vapid-keys
```

#### Schritt 3: Docker Images bauen

```bash
# Alle Images bauen
docker-compose -f docker-compose.production.yml build

# Oder nur spezifische Services
docker-compose -f docker-compose.production.yml build backend frontend
```

#### Schritt 4: Container starten

```bash
# Im Hintergrund starten
docker-compose -f docker-compose.production.yml up -d

# Logs anschauen
docker-compose -f docker-compose.production.yml logs -f

# Nur bestimmte Services
docker-compose -f docker-compose.production.yml logs -f backend
```

#### Schritt 5: Health Check

```bash
# Prüfe ob alle Container laufen
docker-compose -f docker-compose.production.yml ps

# Erwartete Ausgabe:
# - grow-nginx (healthy)
# - grow-frontend (healthy)
# - grow-backend (healthy)
# - grow-mongodb (healthy)
# - grow-mosquitto (healthy)
# - grow-prometheus (up)
# - grow-grafana (healthy)
```

#### Schritt 6: Web UI öffnen

- **Web UI**: `http://your-server-ip:8080`
- **Grafana**: `http://your-server-ip:3001` (Login: admin / dein-passwort)

---

## 🔒 HTTPS aktivieren (Optional)

### Mit Let's Encrypt (Empfohlen)

1. **Certbot installieren**:
```bash
sudo apt-get install certbot
```

2. **Zertifikat erstellen**:
```bash
sudo certbot certonly --standalone -d yourdomain.com
```

3. **Zertifikate kopieren**:
```bash
sudo mkdir -p /DATA/AppData/grow-system/nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /DATA/AppData/grow-system/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /DATA/AppData/grow-system/nginx/ssl/key.pem
```

4. **Container neustarten**:
```bash
docker-compose -f docker-compose.production.yml restart nginx
```

5. **HTTPS öffnen**: `https://yourdomain.com:8443`

### Mit selbst-signierten Zertifikaten

```bash
# Erstelle SSL Verzeichnis
mkdir -p /DATA/AppData/grow-system/nginx/ssl

# Generiere selbst-signiertes Zertifikat
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /DATA/AppData/grow-system/nginx/ssl/key.pem \
  -out /DATA/AppData/grow-system/nginx/ssl/cert.pem \
  -subj "/CN=localhost"

# Restart Nginx
docker-compose -f docker-compose.production.yml restart nginx
```

**Hinweis**: Browser werden eine Warnung anzeigen (selbst-signiert).

---

## 📊 Monitoring Setup

### Grafana Dashboards importieren

1. **Grafana öffnen**: `http://your-server-ip:3001`
2. **Login**: `admin` / `dein-passwort`
3. **Data Source hinzufügen**:
   - Configuration → Data Sources → Add data source
   - Wähle "Prometheus"
   - URL: `http://prometheus:9090`
   - Click "Save & Test"

4. **Dashboard importieren**:
   - Create → Import
   - Upload `monitoring/grafana-dashboard.json` (falls vorhanden)
   - Oder Dashboard ID eingeben: `1860` (Node Exporter Full)

### Alert Notifications einrichten

1. **Alerting → Notification channels**
2. **Add channel**:
   - **Type**: Webhook, Email, Telegram, etc.
   - **URL**: Deine Webhook URL
   - **Test** senden

---

## 🔄 Backups

### Automatisches Backup einrichten

1. **Backup Script ausführbar machen**:
```bash
chmod +x scripts/backup.sh
```

2. **Manuelles Backup testen**:
```bash
./scripts/backup.sh
```

3. **Cron Job einrichten** (täglich um 2 Uhr):
```bash
crontab -e

# Füge hinzu:
0 2 * * * /path/to/grow-monitoring-system/scripts/backup.sh >> /var/log/grow-backup.log 2>&1
```

### Manuelle Backups

**MongoDB Backup**:
```bash
docker exec grow-mongodb mongodump \
  --username=admin \
  --password=dein-passwort \
  --authenticationDatabase=admin \
  --db=growMonitoring \
  --out=/backups/mongodb/manual-backup
```

**Konfiguration Backup**:
```bash
tar -czf config-backup.tar.gz .env.production mosquitto/config nginx/conf.d
```

**Timelapse Backup**:
```bash
tar -czf timelapse-backup.tar.gz -C /DATA/AppData/grow-system timelapse
```

### Restore

**MongoDB Restore**:
```bash
docker exec grow-mongodb mongorestore \
  --username=admin \
  --password=dein-passwort \
  --authenticationDatabase=admin \
  --db=growMonitoring \
  /backups/mongodb/backup_20240115_120000/growMonitoring
```

---

## 🔧 Wartung

### Container Updates

```bash
# Stoppe alle Container
docker-compose -f docker-compose.production.yml down

# Pull neueste Images
git pull origin main

# Rebuild Images
docker-compose -f docker-compose.production.yml build

# Starte Container
docker-compose -f docker-compose.production.yml up -d

# Prüfe Logs
docker-compose -f docker-compose.production.yml logs -f
```

### Logs anschauen

```bash
# Alle Logs
docker-compose -f docker-compose.production.yml logs -f

# Nur Backend
docker-compose -f docker-compose.production.yml logs -f backend

# Nur letzte 100 Zeilen
docker-compose -f docker-compose.production.yml logs --tail=100 backend

# Logs in Datei speichern
docker-compose -f docker-compose.production.yml logs > logs.txt
```

### Datenbank Wartung

**MongoDB Shell öffnen**:
```bash
docker exec -it grow-mongodb mongosh \
  -u admin \
  -p dein-passwort \
  --authenticationDatabase admin \
  growMonitoring
```

**Datenbank Größe prüfen**:
```javascript
db.stats()
```

**Collection Counts**:
```javascript
db.sensors.countDocuments()
db.plants.countDocuments()
db.timelapse.countDocuments()
```

**Alte Daten löschen** (älter als 90 Tage):
```javascript
db.sensors.deleteMany({
  timestamp: { $lt: new Date(Date.now() - 90*24*60*60*1000) }
})
```

### Disk Space Management

**Timelapse Cleanup** (über 30 Tage):
```bash
find /DATA/AppData/grow-system/timelapse -type f -mtime +30 -delete
```

**Docker Cleanup**:
```bash
# Entferne ungenutzte Images
docker image prune -a

# Entferne ungenutzte Volumes
docker volume prune

# System-weite Cleanup
docker system prune -a --volumes
```

---

## 🐛 Troubleshooting

### Container startet nicht

**Logs checken**:
```bash
docker-compose -f docker-compose.production.yml logs backend
```

**Health Status prüfen**:
```bash
docker inspect grow-backend | grep -A 10 Health
```

**Container neu starten**:
```bash
docker-compose -f docker-compose.production.yml restart backend
```

### MongoDB Connection Error

**Prüfe ob MongoDB läuft**:
```bash
docker-compose -f docker-compose.production.yml ps mongodb
```

**Teste Connection**:
```bash
docker exec grow-backend node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected'))
  .catch(err => console.error('❌ Error:', err));
"
```

### MQTT Broker Probleme

**Mosquitto Logs**:
```bash
docker-compose -f docker-compose.production.yml logs mosquitto
```

**Teste MQTT Connection**:
```bash
# Subscribe (Terminal 1)
docker exec grow-mosquitto mosquitto_sub -t test/topic -v

# Publish (Terminal 2)
docker exec grow-mosquitto mosquitto_pub -t test/topic -m "Hello"
```

### Web UI lädt nicht

**Nginx Logs**:
```bash
docker-compose -f docker-compose.production.yml logs nginx
```

**Prüfe Port Bindings**:
```bash
docker port grow-nginx
```

**Firewall prüfen**:
```bash
sudo ufw status
sudo ufw allow 8080/tcp
```

### High CPU/Memory Usage

**Resource Usage anzeigen**:
```bash
docker stats

# Oder spezifischer
docker stats grow-backend grow-mongodb
```

**Memory Limits setzen** (in `docker-compose.production.yml`):
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

---

## 📱 Progressive Web App (PWA)

### Installation auf Smartphone

**Android (Chrome)**:
1. Öffne `http://your-server-ip:8080` in Chrome
2. Menu → "Add to Home screen"
3. Bestätige Installation

**iOS (Safari)**:
1. Öffne `http://your-server-ip:8080` in Safari
2. Share Button → "Add to Home Screen"
3. Bestätige Installation

### Push Notifications aktivieren

1. **In der App**: Settings → Notifications
2. **Click "Aktivieren"**
3. **Browser Permission** erlauben
4. **Test Notification** senden

---

## 🔐 Security Best Practices

### Empfohlene Einstellungen

1. **Starke Passwörter verwenden**:
   - MongoDB: Min. 16 Zeichen, gemischt
   - Grafana: Min. 12 Zeichen, gemischt
   - JWT Secret: Min. 32 Zeichen, random

2. **Firewall konfigurieren**:
```bash
# Nur notwendige Ports öffnen
sudo ufw allow 8080/tcp
sudo ufw allow 8443/tcp
sudo ufw allow 1883/tcp
sudo ufw enable
```

3. **HTTPS nutzen** (siehe HTTPS Sektion)

4. **Regelmäßige Updates**:
```bash
# Wöchentlich Updates checken
git pull origin main
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

5. **Backups automatisieren** (siehe Backup Sektion)

6. **MongoDB Access beschränken**:
   - Nur von Docker Network erreichbar
   - Keine Ports nach außen exposen

### Reverse Proxy mit Nginx Proxy Manager

Für erweiterte Funktionen (Subdomains, SSL Management):

1. **Nginx Proxy Manager installieren**
2. **Proxy Host erstellen**:
   - Domain: `grow.yourdomain.com`
   - Forward Hostname: `grow-nginx`
   - Forward Port: `80`
   - SSL: Request Let's Encrypt
3. **Access List** erstellen (optional für Passwortschutz)

---

## 📞 Support

### Community
- **GitHub Issues**: https://github.com/your-repo/grow-monitoring/issues
- **Discussions**: https://github.com/your-repo/grow-monitoring/discussions
- **Discord**: [Link einfügen]

### Dokumentation
- **API Docs**: `http://your-server:8080/api/docs`
- **Wiki**: https://github.com/your-repo/grow-monitoring/wiki

### Logs einreichen

Bei Problemen bitte folgende Infos bereitstellen:

```bash
# System Info
uname -a
docker --version
docker-compose --version

# Container Status
docker-compose -f docker-compose.production.yml ps

# Logs (letzte 100 Zeilen)
docker-compose -f docker-compose.production.yml logs --tail=100 > logs.txt
```

---

## 📝 Changelog

Siehe [CHANGELOG.md](CHANGELOG.md) für Versions-Historie.

## 📄 Lizenz

Siehe [LICENSE](LICENSE) für Details.
