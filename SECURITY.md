# 🔒 Sicherheitsrichtlinien - Grow Monitoring System

## Übersicht

Dieses Dokument beschreibt die implementierten Sicherheitsmaßnahmen und Best Practices für das Grow Monitoring System v1.2+.

---

## 🛡️ Implementierte Sicherheitsfeatures

### 1. Authentifizierung & Autorisierung

#### JWT-Token Authentifizierung
- **Technologie**: JSON Web Tokens (JWT) mit bcryptjs für Passwort-Hashing
- **Token-Lebensdauer**: 7 Tage
- **Algorithmus**: HS256 (HMAC SHA-256)
- **Passwort-Anforderungen**:
  - Mindestlänge: 6 Zeichen
  - Automatisches Hashing mit bcrypt (10 Runden)
  - Passwörter werden NIEMALS im Klartext gespeichert

#### Geschützte Endpoints
Alle API-Endpoints außer folgenden erfordern einen gültigen JWT-Token:
- `POST /api/auth/register` - Registrierung
- `POST /api/auth/login` - Login
- `GET /api/notifications/public-key` - VAPID Public Key
- `GET /api/weather/*` - Wetter-Endpoints (optional auth)
- `GET /api/recipes` - Rezept-Listing (optional auth)

**Verwendung**:
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "secure123"}'

# Response enthält Token
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "...", "username": "testuser" }
}

# Geschützte Endpoints mit Token aufrufen
curl http://localhost:3000/api/plants \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 2. CORS (Cross-Origin Resource Sharing)

#### Konfiguration
- **Standard (Development)**: `http://localhost:5173`, `http://localhost:3000`
- **Produktion**: Nur explizit erlaubte Domains

#### Konfiguration in `.env`:
```env
FRONTEND_URL=http://localhost:5173,https://your-production-domain.com
```

#### Vorteile
✅ Verhindert unbefugten Zugriff von fremden Websites
✅ Erlaubt credentials (Cookies, Auth-Header)
✅ Konfigurierbar über Umgebungsvariablen

---

### 3. Rate Limiting

#### API Rate Limits
| Endpoint-Typ | Limit | Zeitfenster | Beschreibung |
|-------------|-------|-------------|--------------|
| **Allgemein** (`/api/*`) | 100 Requests | 15 Minuten | Schutz vor API-Missbrauch |
| **Auth** (`/api/auth/login`, `/api/auth/register`) | 5 Requests | 15 Minuten | Schutz vor Brute-Force |

#### Vorteile
✅ Verhindert Brute-Force Angriffe auf Login
✅ Schützt vor DoS (Denial of Service)
✅ Erfolgreiche Logins werden nicht gezählt

#### Response bei Überschreitung
```json
{
  "success": false,
  "message": "Zu viele Login-Versuche, bitte versuche es in 15 Minuten erneut"
}
```

---

### 4. Security Headers (Helmet)

Helmet setzt automatisch folgende HTTP-Header:

| Header | Wert | Zweck |
|--------|------|-------|
| `X-DNS-Prefetch-Control` | `off` | Verhindert DNS-Prefetching |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking-Schutz |
| `X-Content-Type-Options` | `nosniff` | MIME-Type Sniffing verhindern |
| `X-XSS-Protection` | `1; mode=block` | XSS-Filter aktivieren |
| `Strict-Transport-Security` | `max-age=15552000` | HTTPS erzwingen |

**Ausnahmen** (für Socket.io):
- `contentSecurityPolicy`: deaktiviert
- `crossOriginEmbedderPolicy`: deaktiviert

---

### 5. Input-Validierung

#### Joi Schema-Validierung
Alle Benutzereingaben werden vor der Verarbeitung validiert:

**Beispiele**:

**Registrierung**:
```javascript
{
  username: string, alphanum, 3-30 Zeichen
  password: string, min 6 Zeichen
  email: optional, gültige E-Mail
}
```

**Automation Config**:
```javascript
{
  lightStart: string, HH:MM Format
  lightDuration: number, 0-24 Stunden
  tempTarget: number, 10-40°C
  tempHysteresis: number, 0-10°C
  pumpInterval: number, 1-24 Stunden
  pumpDuration: number, 1-120 Sekunden
}
```

**Grow Recipe**:
```javascript
{
  name: string, 3-100 Zeichen
  type: enum ['Indica', 'Sativa', 'Hybrid', 'Autoflower', 'CBD']
  difficulty: enum ['Anfänger', 'Fortgeschritten', 'Experte']
  totalDays: number, 30-200 Tage
  phases: array[...]
}
```

#### Vorteile
✅ Verhindert ungültige Dateneingaben
✅ Automatische Fehler-Messages
✅ Type-Safety auf API-Ebene

---

### 6. NoSQL Injection Schutz

#### Sanitize Middleware
Entfernt gefährliche MongoDB-Operatoren aus Requests:

**Blockiert**:
```javascript
// Verhindert MongoDB Injection
{
  "username": { "$ne": null },  // ❌ Blockiert
  "password": { "$gt": "" }      // ❌ Blockiert
}
```

#### ObjectID Validierung
Alle MongoDB IDs werden validiert:
```javascript
// Ungültige ID
GET /api/recipes/invalid-id
→ 400 Bad Request: "Ungültige ID"

// Gültige ID
GET /api/recipes/507f1f77bcf86cd799439011
→ 200 OK
```

---

### 7. Zentrale Fehlerbehandlung

#### Error Handler Middleware
Alle Fehler werden einheitlich behandelt:

**Features**:
- MongoDB-Fehler → Benutzerfreundliche Messages
- JWT-Fehler → 401 Unauthorized
- Validierungs-Fehler → 400 mit Details
- Stack-Traces nur in Development

**Beispiel Response**:
```json
{
  "success": false,
  "message": "Benutzername 'admin' existiert bereits",
  "details": {
    "field": "username",
    "value": "admin"
  }
}
```

---

## 🚨 Bekannte Sicherheitsrisiken

### 1. MQTT Broker (KRITISCH für Produktion)

**Problem**:
Der Server nutzt standardmäßig `test.mosquitto.org` (öffentlicher MQTT-Broker)

**Risiko**:
- Jeder kann Sensordaten mitlesen
- Jeder kann Befehle an dein Grow-System senden

**Lösung für Produktion**:
```bash
# Eigenen MQTT Broker installieren (Mosquitto)
sudo apt-get install mosquitto mosquitto-clients

# Authentifizierung aktivieren
mosquitto_passwd -c /etc/mosquitto/passwd username

# Config anpassen
echo "allow_anonymous false" >> /etc/mosquitto/mosquitto.conf
echo "password_file /etc/mosquitto/passwd" >> /etc/mosquitto/mosquitto.conf

# In backend/src/services/mqttService.js ändern:
const client = mqtt.connect('mqtt://localhost:1883', {
  username: 'your-username',
  password: 'your-secure-password'
});
```

---

### 2. API Keys in .env

**Risiko**:
`.env` Datei enthält Secrets und darf NIEMALS committed werden

**Schutzmaßnahmen**:
✅ `.env` ist in `.gitignore` eingetragen
✅ `.env.example` enthält Platzhalter
⚠️ Prüfe vor jedem Commit: `git status`

---

### 3. HTTPS/TLS

**Problem**:
Entwicklungsserver läuft auf HTTP (unverschlüsselt)

**Lösung für Produktion**:
```bash
# Nginx mit Let's Encrypt SSL
sudo apt-get install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# Nginx Reverse Proxy Config
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📋 Security Checklist für Produktion

### Backend

- [ ] `JWT_SECRET` auf kryptografisch sicheren Wert ändern (min. 32 Zeichen)
- [ ] `NODE_ENV=production` setzen
- [ ] `FRONTEND_URL` auf echte Domain(s) setzen
- [ ] Eigenen MQTT Broker mit Authentifizierung verwenden
- [ ] MongoDB Authentifizierung aktivieren
- [ ] HTTPS/TLS mit SSL-Zertifikat konfigurieren
- [ ] Firewall konfigurieren (nur Port 443 öffentlich)
- [ ] Rate-Limits für Produktionslast anpassen
- [ ] Logging & Monitoring aktivieren (z.B. Winston + Sentry)
- [ ] Backups für MongoDB einrichten

### Frontend

- [ ] Service Worker `sw.js` für richtige Domain anpassen
- [ ] API-URL auf Produktions-Backend ändern
- [ ] VAPID Public Key aktualisieren
- [ ] Content Security Policy (CSP) konfigurieren
- [ ] Subresource Integrity (SRI) für CDN-Ressourcen

### Hardware/ESP32

- [ ] MQTT Broker-Adresse auf privaten Broker ändern
- [ ] MQTT Credentials konfigurieren
- [ ] WiFi Credentials nicht hardcoden (sondern per WiFiManager)
- [ ] OTA-Updates über HTTPS

---

## 🔐 Best Practices

### Passwörter
- ✅ Mindestens 6 Zeichen (besser 12+)
- ✅ Mix aus Groß-/Kleinbuchstaben, Zahlen, Sonderzeichen
- ✅ Keine bekannten Passwörter (z.B. "password123")
- ✅ Unterschiedliche Passwörter für verschiedene Accounts

### API-Keys
- ✅ Niemals in Code committen
- ✅ Umgebungsvariablen verwenden
- ✅ Regelmäßig rotieren
- ✅ Minimal notwendige Berechtigungen

### Updates
- ✅ Dependencies regelmäßig aktualisieren: `npm audit`
- ✅ Security-Patches zeitnah einspielen
- ✅ Node.js auf LTS-Version halten

---

## 📞 Sicherheitslücke gefunden?

Wenn du eine Sicherheitslücke findest:

1. **NICHT** öffentlich auf GitHub posten
2. **NICHT** in Production testen
3. **Kontaktiere** den Entwickler privat
4. Beschreibe die Lücke mit Steps-to-Reproduce
5. Warte auf Bestätigung vor Veröffentlichung (Responsible Disclosure)

---

## 📚 Weiterführende Ressourcen

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Checklist](https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)

---

**Version**: 1.2
**Letzte Aktualisierung**: Januar 2025
**Status**: ✅ Production-Ready (mit Checklist-Anpassungen)
