# 🏠 CasaOS Installation - Grow Monitoring System

Schritt-für-Schritt Anleitung für die Installation auf deinem CasaOS Server.

## ✅ Vorbereitung abgeschlossen

Dein System ist **bereit für Deployment**! Alle Konfigurationen sind gesetzt:

- ✅ `.env.production` mit sicheren Passwörtern
- ✅ VAPID Keys für Push-Benachrichtigungen generiert
- ✅ MongoDB, JWT, MQTT Credentials konfiguriert
- ✅ Grafana Passwort: `s,Z,k)4Z2]Mh*smkFD)7UpGg=`
- ✅ Docker Compose Production-Config
- ✅ CasaOS YAML bereit

## 📋 Deine Zugangsdaten

**MongoDB:**
- Username: `growadmin`
- Password: `wwuv5cjOwZOnKchA7nfPBc6GxrW6GEf`
- Database: `growdb`

**Grafana:**
- Username: `admin`
- Password: `s,Z,k)4Z2]Mh*smkFD)7UpGg=`
- URL: `http://YOUR-CASAOS-IP:3001`

**MQTT:**
- Username: `growuser`
- Password: `HD0m3GFplqbjwMMqdvrEA`
- Broker: `mqtt://YOUR-CASAOS-IP:1883`

**JWT Secret:**
- `16f27ef49c880ccfc07aa74a78f48d7dd159c7f8dd1f505fca657d3e930faa04`

## 🚀 Installation - Option 1: Via GitHub (Empfohlen)

### Schritt 1: Git Repository erstellen

**Auf deinem Windows PC:**

```bash
cd C:\Users\drexl\Documents\Anwendung\GrowMonitoringSystem

# Git initialisieren (falls noch nicht geschehen)
git init

# Alle Dateien zum Commit vorbereiten
git add .

# Ersten Commit erstellen
git commit -m "Initial commit - Grow Monitoring System ready for CasaOS"

# Branch in main umbenennen
git branch -M main
```

### Schritt 2: Auf GitHub pushen

1. **Gehe zu GitHub.com** und erstelle ein neues Repository:
   - Repository Name: `grow-monitoring-system`
   - Visibility: **Private** (wegen Credentials!)
   - NICHT initialisieren (kein README, .gitignore, License)

2. **Verbinde dein lokales Repository:**
   ```bash
   # Ersetze DEIN-USERNAME mit deinem GitHub Username
   git remote add origin https://github.com/DEIN-USERNAME/grow-monitoring-system.git

   # Push auf GitHub
   git push -u origin main
   ```

### Schritt 3: In CasaOS importieren

1. **Öffne CasaOS Web UI** (`http://YOUR-CASAOS-IP`)

2. **Gehe zu App Store**

3. **Click "Install a customized app"**

4. **URL eingeben:**
   ```
   https://raw.githubusercontent.com/DEIN-USERNAME/grow-monitoring-system/main/casaos.yml
   ```

5. **Environment Variables prüfen:**
   - CasaOS zeigt automatisch alle Variablen aus der YAML
   - Setze `MONGO_INITDB_ROOT_PASSWORD`
   - Setze `JWT_SECRET`
   - Setze `GRAFANA_ADMIN_PASSWORD`

6. **Click "Install"**

7. **Warte 5-10 Minuten** (Docker Images werden gebaut)

8. **Öffne App:** `http://YOUR-CASAOS-IP:8080`

---

## 🐳 Installation - Option 2: Direkt via Docker Compose

Falls du **nicht** auf GitHub pushen willst:

### Schritt 1: Dateien auf CasaOS übertragen

**Via SMB/SAMBA (empfohlen):**

1. Öffne Windows Explorer
2. Gebe ein: `\\YOUR-CASAOS-IP`
3. Login mit CasaOS Credentials
4. Navigiere zu `/DATA/AppData/`
5. Erstelle Ordner: `grow-system`
6. Kopiere ALLE Dateien rein

**Via SSH/SCP:**

```bash
# Von Windows PC aus (PowerShell)
scp -r C:\Users\drexl\Documents\Anwendung\GrowMonitoringSystem casaos@YOUR-CASAOS-IP:/DATA/AppData/grow-system
```

### Schritt 2: Docker Images bauen

**SSH in CasaOS:**

```bash
ssh casaos@YOUR-CASAOS-IP
cd /DATA/AppData/grow-system

# .env.production kopieren (falls nicht schon vorhanden)
cp .env.production.example .env.production

# Bearbeite .env.production und setze Passwörter
nano .env.production
```

**Docker Compose starten:**

```bash
# Baue alle Images
docker-compose -f docker-compose.production.yml build

# Starte alle Container
docker-compose -f docker-compose.production.yml up -d

# Prüfe Status
docker-compose -f docker-compose.production.yml ps

# Logs anschauen
docker-compose -f docker-compose.production.yml logs -f
```

### Schritt 3: Health Check

```bash
# Prüfe Backend API
curl http://localhost:3000/api/health

# Sollte zurückgeben:
# {"status":"OK","timestamp":"...","service":"grow-monitoring-backend","version":"1.2.0"}

# Prüfe Frontend
curl http://localhost:8080

# Sollte HTML zurückgeben
```

---

## 🔧 Nach der Installation

### 1. Web UI öffnen

- **Grow System:** `http://YOUR-CASAOS-IP:8080`
- **Grafana:** `http://YOUR-CASAOS-IP:3001`

### 2. Erste Schritte

1. **Push-Benachrichtigungen aktivieren:**
   - Settings → Notifications
   - Click "Aktivieren"
   - Browser Permission erlauben

2. **ESP32 verbinden:**
   - ESP32 Code öffnen
   - MQTT Server IP setzen: `YOUR-CASAOS-IP`
   - WiFi Credentials eintragen
   - Flashen

3. **Kamera hinzufügen (optional):**
   - Dashboard → Cameras → Add Camera
   - Stream URL eingeben

4. **Grafana Dashboard einrichten:**
   - Login mit `admin` / `s,Z,k)4Z2]Mh*smkFD)7UpGg=`
   - Data Source hinzufügen: Prometheus (`http://prometheus:9090`)
   - Dashboard importieren (ID: 1860 für Node Exporter)

### 3. Backup einrichten

**Automatisches Backup (täglich 2 Uhr):**

```bash
ssh casaos@YOUR-CASAOS-IP

# Backup Script ausführbar machen
chmod +x /DATA/AppData/grow-system/scripts/backup.sh

# Cron Job einrichten
crontab -e

# Füge hinzu:
0 2 * * * /DATA/AppData/grow-system/scripts/backup.sh >> /var/log/grow-backup.log 2>&1
```

---

## 📱 PWA Installation (Smartphone)

### Android (Chrome/Edge):

1. Öffne `http://YOUR-CASAOS-IP:8080` in Chrome
2. Menu → "Add to Home screen"
3. Bestätige Installation
4. App-Icon erscheint auf dem Homescreen

### iOS (Safari):

1. Öffne `http://YOUR-CASAOS-IP:8080` in Safari
2. Share Button → "Add to Home Screen"
3. Bestätige Installation

---

## 🔍 Troubleshooting

### Container startet nicht

```bash
# Status prüfen
docker-compose -f docker-compose.production.yml ps

# Logs anschauen
docker-compose -f docker-compose.production.yml logs backend
docker-compose -f docker-compose.production.yml logs mongodb

# Container neu starten
docker-compose -f docker-compose.production.yml restart
```

### MongoDB Connection Error

```bash
# MongoDB Status
docker-compose -f docker-compose.production.yml logs mongodb

# Prüfe ob MongoDB läuft
docker exec grow-mongodb mongosh --eval "db.adminCommand('ping')"
```

### Port bereits belegt

```bash
# Prüfe welcher Prozess Port 8080 nutzt
netstat -tlnp | grep 8080

# Stoppe den Prozess oder ändere Port in docker-compose.production.yml:
# ports:
#   - "8081:80"  # Statt 8080
```

### Web UI lädt nicht

```bash
# Nginx Logs
docker-compose -f docker-compose.production.yml logs nginx

# Browser Cache löschen (Ctrl+Shift+R)

# Firewall prüfen (CasaOS)
sudo ufw status
sudo ufw allow 8080/tcp
```

---

## 📊 Container Übersicht

Nach erfolgreicher Installation laufen folgende Container:

| Container | Port | Beschreibung |
|-----------|------|--------------|
| `grow-nginx` | 8080, 8443 | Web Server & Reverse Proxy |
| `grow-frontend` | - | React Frontend (via Nginx) |
| `grow-backend` | 3000 | Node.js API Server |
| `grow-mongodb` | 27017 | Datenbank |
| `grow-mosquitto` | 1883, 9001 | MQTT Broker |
| `grow-prometheus` | 9090 | Metrics Collection |
| `grow-grafana` | 3001 | Monitoring Dashboard |

**Gesamter Speicherbedarf:** ~2-3GB (mit Images)

**RAM Bedarf:** ~1-2GB (laufend)

---

## 🔄 Updates durchführen

### Via Git Pull (wenn auf GitHub):

```bash
ssh casaos@YOUR-CASAOS-IP
cd /DATA/AppData/grow-system

# Neue Version holen
git pull origin main

# Rebuild & Restart
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

### Manuell:

1. Neue Dateien auf CasaOS kopieren
2. Container neu bauen (siehe oben)

---

## 🛡️ Sicherheitshinweise

1. **Ändere Passwörter** nach dem ersten Login:
   - Grafana: Settings → Change Password
   - MongoDB: Via mongosh

2. **Aktiviere HTTPS** für produktiven Einsatz:
   - Siehe `DEPLOYMENT.md` → HTTPS Sektion
   - Nutze Let's Encrypt

3. **Firewall konfigurieren:**
   ```bash
   sudo ufw allow 8080/tcp
   sudo ufw allow 1883/tcp
   sudo ufw allow 3001/tcp
   sudo ufw enable
   ```

4. **Regelmäßige Backups:**
   - Automatisches Backup läuft täglich
   - Backups in: `/DATA/AppData/grow-system/backups/`
   - Retention: 30 Tage

---

## 📞 Support

Bei Problemen:

1. **Logs prüfen:**
   ```bash
   docker-compose -f docker-compose.production.yml logs -f
   ```

2. **Health Check:**
   ```bash
   curl http://localhost:3000/api/health
   ```

3. **Container neu starten:**
   ```bash
   docker-compose -f docker-compose.production.yml restart
   ```

4. **Komplett neu starten:**
   ```bash
   docker-compose -f docker-compose.production.yml down
   docker-compose -f docker-compose.production.yml up -d
   ```

---

**Happy Growing! 🌱**
