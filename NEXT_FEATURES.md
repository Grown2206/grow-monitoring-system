# Geplante Features - Roadmap

**Datum**: 2026-01-03
**Status**: Bereit für Implementierung
**Branch**: vigorous-agnesi (oder neuer Branch)

---

## ✅ Bereits Implementiert

1. ✅ **Quick Actions vollständig implementieren**
   - Echte Hardware-Steuerung anbinden (Lüfter, Licht, Pumpen)
   - API-Endpoints für Schnellsteuerung
   - MQTT-Befehle für ESP32-Geräte
   - NOT-AUS Funktion

---

## 📋 Nächste Features (Priorität)

### 2. Rezept-Verwaltung Interface

**Beschreibung**: Vollständiges Interface zum Erstellen, Bearbeiten und Verwalten von Grow-Rezepten.

**Features**:
- ✨ Eigene Rezepte erstellen/bearbeiten
- 📥 Rezepte importieren/exportieren (JSON/YAML)
- 📋 Rezept-Vorlagen für verschiedene Sorten
- 🔄 Bestehende Rezepte klonen und anpassen
- 📊 Rezept-Bibliothek mit Community-Rezepten (optional)
- 🏷️ Tags und Kategorien (Auto, Photo, CBD, etc.)
- ⭐ Favoriten und Bewertungen

**Technische Details**:
- Backend: Recipe Controller erweitern (CRUD-Operationen)
- Frontend: Neues RecipeEditor-Komponent
- Validierung: Werte für Temp, Humidity, VPD, Nährstoffe
- Storage: MongoDB mit Recipe-Schema

**Akzeptanzkriterien**:
- [ ] Neues Rezept erstellen (Formular)
- [ ] Bestehendes Rezept bearbeiten
- [ ] Rezept löschen (mit Bestätigung)
- [ ] Rezept klonen
- [ ] JSON Export/Import
- [ ] Rezept-Vorschau vor Aktivierung

---

### 3. Erweiterte Automation-Features

**Beschreibung**: Mächtigere Automation-Regeln mit komplexen Bedingungen und Abhängigkeiten.

**Features**:
- 🔀 Bedingungs-Ketten (wenn X dann Y sonst Z)
- ⏱️ Zeitbasierte Regel-Verzögerungen (z.B. warte 5min, dann...)
- 🔗 Regel-Gruppen und Abhängigkeiten
- 🧪 Automation Testmodus/Simulation
- 📊 Regel-Performance-Tracking
- 🎯 Prioritäten und Konflikte lösen
- 📝 Regel-Templates für häufige Szenarien

**Technische Details**:
- Rule Engine erweitern mit State Machine
- Delay/Schedule System
- Rule Dependency Graph
- Simulation Mode (Dry-Run)
- Conflict Resolution Algorithm

**Akzeptanzkriterien**:
- [ ] If-Then-Else Logik in Rules
- [ ] Delay Actions (z.B. "wait 10min, then fan 100%")
- [ ] Rule Groups (Parent-Child Beziehungen)
- [ ] Test Mode (Rules simulieren ohne Hardware)
- [ ] Konflikt-Erkennung (2 Rules setzen Fan auf unterschiedliche Werte)

---

### 4. Pflanzen-Wachstums-Tracking

**Beschreibung**: Detailliertes Tracking des Pflanzenwachstums mit Fotos, Messungen und KI-Analyse.

**Features**:
- 📸 Foto-Timeline für jede Pflanze
- 📏 Wachstums-Messungen (Höhe, Breite, Blattanzahl)
- 💚 Gesundheits-Bewertungssystem (1-10)
- 🔍 Mangelerscheinungs-Erkennung mit Bild-KI
- 📊 Wachstums-Diagramme und Vergleiche
- 📅 Meilensteine (1. Blüte, Topping, etc.)
- 🏆 Harvest-Prognose basierend auf Wachstumsrate

**Technische Details**:
- Plant Growth Model (MongoDB)
- Image Upload und Storage
- OpenCV/TensorFlow für Bild-Analyse (optional)
- Growth Rate Calculation
- Milestone Tracking

**Akzeptanzkriterien**:
- [ ] Foto-Upload pro Pflanze
- [ ] Manuelle Messung eingeben (Höhe, Breite)
- [ ] Timeline-Ansicht mit allen Fotos
- [ ] Wachstums-Diagramm (Höhe über Zeit)
- [ ] Gesundheits-Score berechnen
- [ ] KI-Analyse für Mängel (optional)

---

### 5. Benachrichtigungen & Alarme

**Beschreibung**: Umfassendes Benachrichtigungssystem für kritische Events und Erinnerungen.

**Features**:
- 📧 Email-Benachrichtigungen
- 📱 SMS-Alerts (Twilio/Vonage)
- 🔔 Browser-Push-Notifications
- 📊 Alarm-Historie und Bestätigung
- ⚙️ Individuelle Alarm-Schwellwerte pro Pflanze
- 🔕 Snooze-Funktion
- 📅 Erinnerungen (Gießen, Düngen, Ernten)
- 🎯 Eskalations-Stufen (Info → Warning → Critical)

**Technische Details**:
- Notification Service (Email: nodemailer, SMS: Twilio)
- Web Push API für Browser-Notifications
- Notification Queue (Priority)
- User Preferences (welche Notifications?)
- Acknowledgement System

**Akzeptanzkriterien**:
- [ ] Email bei kritischer Temperatur
- [ ] Browser-Notification bei VPD-Problem
- [ ] SMS bei Reservoir leer
- [ ] Benachrichtigungs-Historie anzeigen
- [ ] Notifications bestätigen/snoozen
- [ ] Einstellungen: welche Notifications aktivieren

---

### 6. Energie-Management

**Beschreibung**: Tracking und Optimierung des Stromverbrauchs.

**Features**:
- ⚡ Stromverbrauchs-Tracking (kWh)
- 💰 Kosten-Rechner (€/kWh konfigurierbar)
- 📊 Verbrauchs-Diagramme (Tag/Woche/Monat)
- 🌞 Optimale Zeitplanung für günstige Stromtarife
- ☀️ Solar-Integration Monitoring
- 🎯 Verbrauchs-Prognosen
- 💡 Spar-Tipps basierend auf Nutzung

**Technische Details**:
- Power Monitoring (Shelly Plug oder ähnlich)
- Cost Calculation Engine
- Time-of-Use Tariff Support
- Energy Model pro Gerät (Fan, Light, Pump)
- Optimization Algorithm

**Akzeptanzkriterien**:
- [ ] Aktueller Verbrauch anzeigen (W)
- [ ] Tages/Monats-Kosten berechnen
- [ ] Verbrauchs-History
- [ ] Empfehlungen zur Kostenreduktion
- [ ] Tarif-Optimierung (z.B. Licht nachts wenn Strom günstig)

---

### 7. Wasser-Management

**Beschreibung**: Umfassendes Tracking und Management der Wassernutzung.

**Features**:
- 💧 Wasserverbrauchs-Tracking
- 📊 Reservoir-Füllstand-Überwachung mit Alarmen
- 🔄 Automatische Nachfüll-Planung
- ⚠️ pH/EC-Drift Alarme
- 📈 Verbrauchs-Prognose (wann Reservoir leer?)
- 💰 Wasser-Kosten-Tracking
- 🌊 Mehrere Reservoirs unterstützen

**Technische Details**:
- Water Level Sensors Integration
- Flow Meter Support (optional)
- Refill Automation
- Drift Detection Algorithm
- Multi-Reservoir Management

**Akzeptanzkriterien**:
- [ ] Füllstand-Anzeige in %
- [ ] Alarm bei < 20%
- [ ] Verbrauchs-Historie
- [ ] Prognose: "Reservoir leer in X Tagen"
- [ ] Automatisches Nachfüllen triggern

---

### 8. Mobile-Optimierung

**Beschreibung**: Progressive Web App (PWA) für optimale Mobile-Erfahrung.

**Features**:
- 📱 Progressive Web App Setup
- 👆 Touch-optimierte Steuerung
- 📴 Offline-Modus (Service Worker)
- 🏠 Home Screen Installation
- 📲 Mobile-spezifische Layouts
- 🔄 Sync im Hintergrund
- 🌙 Dark Mode (automatisch)

**Technische Details**:
- Service Worker Registration
- Offline Cache Strategy
- Manifest.json
- Touch Event Handling
- Responsive Breakpoints optimieren

**Akzeptanzkriterien**:
- [ ] App installierbar auf Home Screen
- [ ] Funktioniert offline (cached Daten)
- [ ] Touch-Gesten (Swipe, etc.)
- [ ] Optimierte Layouts für Mobile
- [ ] Push Notifications auf Mobile

---

### 9. Daten-Export & Backup

**Beschreibung**: Umfassende Backup- und Export-Funktionen.

**Features**:
- 💾 Komplettes System-Backup/Restore
- 📊 Grow-Logs als CSV/PDF exportieren
- 📈 Datenvisualisierungs-Exports (Charts als PNG)
- ☁️ Cloud-Backup Integration (Google Drive, Dropbox)
- 📅 Automatische Backups (täglich/wöchentlich)
- 🔐 Verschlüsselte Backups
- 📤 Daten teilen (anonymisiert)

**Technische Details**:
- Backup Service (MongoDB Dump)
- Export Templates (CSV, PDF via puppeteer)
- Cloud Storage APIs
- Encryption (AES-256)
- Scheduled Backups (cron)

**Akzeptanzkriterien**:
- [ ] Manuelles Backup erstellen
- [ ] Backup wiederherstellen
- [ ] CSV-Export (Sensor-Daten)
- [ ] PDF-Report generieren
- [ ] Automatische Backups konfigurieren

---

### 10. Community-Features

**Beschreibung**: Social Features zum Austausch mit anderen Growern.

**Features**:
- 🌍 Rezepte mit Community teilen
- 📊 Grow-Ergebnisse vergleichen (Yield, Duration)
- ⭐ Sorten-Bewertungen und Reviews
- 💬 Diskussionsforum/Chat
- 📚 Growing-Tipps Wiki
- 🏆 Leaderboards (bester Yield, etc.)
- 👥 Freunde/Follower System

**Technische Details**:
- User Profiles
- Recipe Sharing (Public/Private)
- Rating System
- Comment/Forum System
- Moderation Tools
- Social Graph (Followers)

**Akzeptanzkriterien**:
- [ ] Rezept öffentlich teilen
- [ ] Andere Rezepte browsen
- [ ] Rezepte bewerten (1-5 Sterne)
- [ ] Kommentare schreiben
- [ ] Eigene Ergebnisse teilen

---

### 11. Erweiterte KI-Features

**Beschreibung**: Fortgeschrittene KI-Funktionen für Optimierung und Vorhersage.

**Features**:
- 🤖 Erntezeit-Vorhersage (ML-Modell)
- 🔮 Yield-Prognose basierend auf Wachstum
- 🎯 Automatische Rezept-Optimierung
- 📸 Bild-Erkennung (Schädlinge, Mängel)
- 💡 Intelligente Empfehlungen
- 📊 Pattern Recognition (was funktioniert gut?)
- 🧬 Strain-Empfehlungen basierend auf Bedingungen

**Technische Details**:
- Machine Learning Modelle (TensorFlow.js)
- Training auf historischen Daten
- Computer Vision (Bildanalyse)
- Recommendation Engine
- A/B Testing für Rezepte

**Akzeptanzkriterien**:
- [ ] Erntezeit-Prognose anzeigen
- [ ] Yield-Vorhersage in g
- [ ] Schädlings-Erkennung aus Foto
- [ ] Rezept-Vorschlag basierend auf Umgebung
- [ ] Lern-Feedback ("War die Prognose korrekt?")

---

## 🎯 Empfohlene Reihenfolge

Basierend auf Priorität und Abhängigkeiten:

**Phase 1: Core Features (1-2 Wochen)**
1. Rezept-Verwaltung Interface → Foundation für alles andere
2. Benachrichtigungen & Alarme → Wichtig für Betrieb
3. Wasser-Management → Praktischer Nutzen

**Phase 2: Tracking & Optimization (1-2 Wochen)**
4. Pflanzen-Wachstums-Tracking → Langzeit-Daten
5. Energie-Management → Kosten sparen
6. Erweiterte Automation → Mehr Kontrolle

**Phase 3: User Experience (1 Woche)**
7. Mobile-Optimierung → Bessere Nutzbarkeit
8. Daten-Export & Backup → Sicherheit

**Phase 4: Community & AI (Optional)**
9. Community-Features → Social Aspect
10. Erweiterte KI-Features → Future Tech

---

## 📝 Nächste Session

Beim nächsten Mal einfach sagen:
- "Lass uns Feature 2 implementieren" (Rezept-Verwaltung)
- "Ich möchte Feature 5 machen" (Benachrichtigungen)
- Oder komplett eigenes Feature nennen!

Diese Datei bleibt erhalten und ist deine Roadmap. 🚀

---

## 🔧 Technischer Stack (Reminder)

- **Backend**: Node.js, Express, MongoDB, MQTT
- **Frontend**: React, Vite, Tailwind CSS, lucide-react
- **Hardware**: ESP32, Sensoren (DHT22, EC, pH), Relais
- **Services**: Socket.IO (Real-time), nodemailer (Email), Twilio (SMS)

Viel Erfolg mit den nächsten Features! 💪
