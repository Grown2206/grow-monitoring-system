# 🚀 Setup-Anleitung für Grow Monitoring System v1.2

## Schnellstart

### 1. Backend-Konfiguration

#### a) VAPID Keys für Push-Notifications generieren

```bash
cd backend
npx web-push generate-vapid-keys
```

**Ausgabe wird sein:**
```
=======================================

Public Key:
BEl62iUYgUivxIkTjyKOYEPAY... (sehr langer String)

Private Key:
p4zHuB7vLPPqO6e... (sehr langer String)

=======================================
```

#### b) .env Datei erstellen

```bash
cp .env.example .env
```

Dann öffne `.env` und füge die Keys ein:

```env
# Server Configuration
PORT=3000

# MongoDB Configuration
DB_URI=mongodb://localhost:27017/growdb

# Google Gemini API (für AI Consultant)
GEMINI_API_KEY=dein-api-key

# VAPID Keys für Push-Notifications
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkTjyKOYEPAY... # Von npx web-push
VAPID_PRIVATE_KEY=p4zHuB7vLPPqO6e... # Von npx web-push
VAPID_SUBJECT=mailto:deine-email@example.com

# OpenWeather API (optional)
OPENWEATHER_API_KEY=dein-openweather-key
```

#### c) MongoDB starten

**Lokal:**
```bash
mongod
```

**Oder nutze MongoDB Atlas (Cloud):**
1. Kostenlos registrieren auf https://www.mongodb.com/cloud/atlas
2. Cluster erstellen
3. Connection String kopieren
4. In `.env` als `DB_URI` einfügen

#### d) Backend-Dependencies installieren & starten

```bash
cd backend
npm install
npm start
```

**Erwartete Ausgabe:**
```
✅ Push-Notifications Service aktiviert
✅ Grow-Rezept Templates erfolgreich initialisiert
🔗 Verbinde zu öffentlichem Broker: mqtt://test.mosquitto.org
✅ MongoDB verbunden
🚀 Server läuft!
```

---

### 2. Frontend starten

```bash
cd frontend
npm install
npm run dev
```

Browser öffnet sich automatisch auf `http://localhost:5173`

---

## 🆕 Neue Features nutzen

### PWA (Progressive Web App)

1. **Auf Smartphone installieren:**
   - Chrome/Edge: „Zum Startbildschirm hinzufügen"
   - Safari: Teilen → „Zum Home-Bildschirm"

2. **Offline-Modus:**
   - App funktioniert auch ohne Internet (eingeschränkt)

### Push-Notifications

1. In der App: **Settings → Benachrichtigungen**
2. Klicke auf **"Aktivieren"**
3. Browser fragt nach Berechtigung → **"Zulassen"**
4. Teste mit **"Test-Benachrichtigung senden"**

### Wetter-Integration

- Automatisch im Dashboard-Widget sichtbar
- Zeigt Indoor/Outdoor-Vergleich
- Gibt Grow-spezifische Tipps

### Grow-Rezepte

- Verfügbar über API: `GET /api/recipes`
- 3 vordefinierte Templates:
  - Standard Photoperiode (Indica)
  - Autoflower Express
  - Sativa Langstielig

### Kamera für Pflanzendoku

- In Pflanzen-Komponente integrierbar
- Nutzt Smartphone-Kamera
- Fotos können gespeichert/heruntergeladen werden

### Erweiterte Analytics

- **Anomalie-Erkennung:** `GET /api/analytics/anomalies`
- **Vorhersagen:** `GET /api/analytics/predictions`
- **Optimierungen:** `GET /api/analytics/optimizations`

---

## ⚙️ Optional: Weitere API-Keys

### OpenWeather API (Kostenlos)

1. Registrieren auf https://openweathermap.org
2. API-Key kopieren
3. In `.env` einfügen als `OPENWEATHER_API_KEY`

**Ohne Key:** System nutzt Mock-Daten

### Google Gemini API

1. Auf https://makersuite.google.com/app/apikey
2. API-Key erstellen
3. In `.env` als `GEMINI_API_KEY` einfügen

---

## 🔧 Troubleshooting

### Backend startet nicht

**Fehler: "Vapid public key should be 65 bytes"**
- ✅ **Gelöst:** System läuft jetzt auch ohne VAPID Keys
- Warnung erscheint, Push-Notifications sind deaktiviert
- Generiere Keys mit `npx web-push generate-vapid-keys`

**Fehler: "MongoDB connection failed"**
- Prüfe ob MongoDB läuft: `mongod`
- Oder nutze MongoDB Atlas (Cloud)

### Frontend verbindet nicht zu Backend

- Prüfe ob Backend läuft auf Port 3000
- In Browser-Konsole: Fehler anzeigen lassen
- CORS sollte aktiviert sein (ist default)

### Arduino/ESP32 sendet keine Daten

- Prüfe WiFi-Credentials in `.ino` Datei
- Prüfe MQTT-Broker Verbindung
- Serial Monitor öffnen (115200 Baud)

---

## 📦 Deployment

### Docker (empfohlen)

```bash
docker-compose up -d
```

### Manuell auf Server

1. Node.js installieren (v18+)
2. MongoDB installieren
3. Repository klonen
4. `.env` konfigurieren
5. `npm install` in backend + frontend
6. Frontend builden: `npm run build`
7. Backend starten: `npm start`
8. Nginx als Reverse Proxy

---

## 🔐 Sicherheit

**Wichtig für Produktion:**

1. ✅ VAPID Keys geheim halten (nicht in Git committen!)
2. ✅ `.env` in `.gitignore` (ist schon drin)
3. ✅ MongoDB mit Authentifizierung nutzen
4. ✅ HTTPS für Produktion (Let's Encrypt)
5. ✅ Firewall konfigurieren
6. ⚠️ MQTT auf privaten Broker umstellen (test.mosquitto.org ist öffentlich!)

---

## 📚 Weitere Dokumentation

- **API-Dokumentation:** Siehe `backend/src/routes/apiRoutes.js`
- **Komponenten:** Siehe `frontend/src/components/`
- **Services:** Siehe `backend/src/services/`

---

## 🆘 Support

Bei Fragen oder Problemen:
1. Prüfe die Browser-Konsole (F12)
2. Prüfe Backend-Logs
3. GitHub Issues erstellen

---

**Version:** 1.2.0
**Letztes Update:** Januar 2026
