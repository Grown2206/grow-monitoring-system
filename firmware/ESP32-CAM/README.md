# ESP32-CAM Firmware für Grow Monitoring System

## Hardware
- **ESP32-CAM AI-Thinker Module** (mit OV2640 Kamera)
- **FTDI Programmer** (oder USB-TTL Adapter) für Upload

## Features
- ✅ Automatische Timelapse-Aufnahmen (alle 60 Sekunden)
- ✅ Live MJPEG Stream im Browser
- ✅ Foto-Upload zum Backend
- ✅ Einstellbare Bildqualität (bis 1600x1200)
- ✅ Web-Interface zur Kontrolle

## Upload-Anleitung

### 1. Arduino IDE Vorbereitung

**Board installieren:**
1. File → Preferences → Additional Boards Manager URLs:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
2. Tools → Board → Boards Manager → "ESP32" suchen und installieren

**Tools Einstellungen:**
- Board: "AI Thinker ESP32-CAM"
- CPU Frequency: "240MHz"
- Flash Frequency: "80MHz"
- Flash Mode: "QIO"
- Flash Size: "4MB (3MB APP / 1MB SPIFFS)"
- Partition Scheme: "Huge APP (3MB No OTA/1MB SPIFFS)"
- PSRAM: "Enabled"
- Upload Speed: "115200"
- Port: Dein COM-Port

### 2. Hardware-Verbindung (FTDI)

**WICHTIG:** ESP32-CAM hat **KEINEN USB-Anschluss**!

```
FTDI/USB-TTL  →  ESP32-CAM
-----------     ----------
5V (VCC)    →  5V
GND         →  GND
TX          →  U0R (RX)
RX          →  U0T (TX)
```

**Für Upload-Modus:**
- Verbinde **GPIO 0** mit **GND** (mit Jumper)
- Drücke **Reset-Button**
- Jetzt Upload starten
- **DANACH:** Jumper entfernen und Reset drücken

### 3. Konfiguration anpassen

Öffne `GrowCam.ino` und ändere:

```cpp
const char* WIFI_SSID = "DEIN-WIFI";
const char* WIFI_PASSWORD = "DEIN-PASSWORT";

const char* BACKEND_URL = "http://192.168.2.169:8080/api/timelapse/upload";
const char* CAM_NAME = "cam1";  // cam1, cam2, etc.

unsigned long TIMELAPSE_INTERVAL = 60000;  // Millisekunden
```

### 4. Upload & Test

1. GPIO 0 → GND verbinden
2. Reset drücken
3. Upload starten in Arduino IDE
4. Warten bis "Done uploading"
5. GPIO 0 → GND trennen
6. Reset drücken

**Serial Monitor öffnen (115200 baud):**

```
=== ESP32-CAM Grow Monitoring System ===
Initialisiere Kamera...
✅ Kamera bereit
Verbinde mit WiFi: WLAN-915420
✅ WiFi verbunden!
IP-Adresse: 192.168.2.xxx
Stream URL: http://192.168.2.xxx/stream
✅ Web Server gestartet
Foto aufgenommen: 45678 bytes
✅ Foto erfolgreich hochgeladen
```

## Web-Interface

Öffne im Browser: **http://[ESP32-CAM-IP]/**

- **Live Stream** ansehen
- **Einzelfoto** aufnehmen
- **Status** checken

## Troubleshooting

### Kamera Init fehlgeschlagen
- **Lösung:** Stromversorgung prüfen! ESP32-CAM braucht min. 500mA
- Verwende externes 5V Netzteil statt USB-Power

### Brownout Detector triggered
- **Lösung:** Besseres Netzteil (2A empfohlen)
- Kondensator (100µF) zwischen 5V und GND

### Upload fehlgeschlagen
- **Lösung:** GPIO 0 mit GND verbinden BEVOR Upload startet
- Reset drücken während GPIO 0 → GND

### Foto-Upload fehlschlägt
- **Lösung:** Backend URL prüfen
- Firewall auf CasaOS Server checken
- Backend Logs checken: `sudo docker compose logs backend`

## LED Pins

- **GPIO 4**: Eingebaute LED (weiß)
- **GPIO 33**: Flash LED (hell, optional extern)

Zum Testen:
```cpp
digitalWrite(LED_FLASH, HIGH);  // LED an
delay(1000);
digitalWrite(LED_FLASH, LOW);   // LED aus
```

## Mehrere Kameras

Für 2 ESP32-CAMs:

**Kamera 1:**
```cpp
const char* CAM_NAME = "cam1";
```

**Kamera 2:**
```cpp
const char* CAM_NAME = "cam2";
```

Jede Kamera bekommt automatisch eine eigene IP!

## Nächste Schritte

1. **Backend Endpoint** erstellen: `/api/timelapse/upload`
2. **Fotos speichern** in MongoDB
3. **Timelapse-Video** generieren aus Bildern
4. **Multi-Camera View** im Dashboard
