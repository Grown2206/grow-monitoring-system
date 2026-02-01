/*
 * ESP32-CAM Pro für Grow Monitoring System
 * Version 2.0 - Multi-Kamera Support mit erweitertem API
 *
 * Hardware: ESP32-CAM mit OV2640 (USB-C Development Board)
 * Features:
 * - MJPEG Live Stream (30 FPS)
 * - Einzelbild-Capture mit Qualitätseinstellungen
 * - Timelapse Auto-Upload
 * - RESTful API für Fernsteuerung
 * - LED Flash Control
 * - Kamera-Einstellungen über Web-Interface
 * - mDNS Discovery (growcam1.local, growcam2.local)
 * - OTA Updates
 * - Heartbeat/Status Reporting
 *
 * Pinout ESP32-CAM AI-Thinker:
 * - GPIO 0:  Boot Mode (LOW beim Upload!)
 * - GPIO 4:  LED Flash (eingebaut)
 * - GPIO 33: LED (optional)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <ArduinoOTA.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include "esp_camera.h"
#include "esp_timer.h"
#include "img_converters.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ==========================================
// KONFIGURATION - ANPASSEN!
// ==========================================
const char* WIFI_SSID = "WLAN-915420";
const char* WIFI_PASSWORD = "78118805138223696181";

// Backend Server
const char* BACKEND_HOST = "192.168.2.169";
const int BACKEND_PORT = 3000;

// Kamera-ID (cam1, cam2, cam3, etc.) - ANPASSEN pro Kamera!
#define CAM_ID "cam1"
const char* CAM_NAME = "GrowCam 1";

// mDNS Name (growcam1.local, growcam2.local)
const char* MDNS_NAME = "growcam1";

// Timelapse Standard-Einstellungen
#define DEFAULT_TIMELAPSE_INTERVAL 60000  // 60 Sekunden
#define DEFAULT_TIMELAPSE_ENABLED true

// LED Pins
#define LED_FLASH 4
#define LED_STATUS 33

// ==========================================
// KAMERA PINS (AI-Thinker ESP32-CAM)
// ==========================================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// ==========================================
// GLOBALE VARIABLEN
// ==========================================
WebServer server(80);
Preferences prefs;

// Timelapse
unsigned long timelapseInterval = DEFAULT_TIMELAPSE_INTERVAL;
bool timelapseEnabled = DEFAULT_TIMELAPSE_ENABLED;
unsigned long lastCapture = 0;
unsigned long captureCount = 0;

// Kamera-Einstellungen
int brightness = 0;      // -2 bis 2
int contrast = 0;        // -2 bis 2
int saturation = 0;      // -2 bis 2
int frameSize = 10;      // FRAMESIZE_UXGA = 10
int quality = 10;        // 0-63 (niedriger = besser)
bool flashEnabled = false;
bool hMirror = false;
bool vFlip = false;

// Status
unsigned long bootTime = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastBackendHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000; // 30 Sekunden
bool streamActive = false;
int streamClients = 0;

// ==========================================
// KAMERA INITIALISIERUNG
// ==========================================
bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_LATEST;

  // PSRAM verfügbar?
  if (psramFound()) {
    config.frame_size = FRAMESIZE_UXGA;  // 1600x1200
    config.jpeg_quality = 10;
    config.fb_count = 2;
    Serial.println("✅ PSRAM gefunden - Hohe Auflösung aktiviert");
  } else {
    config.frame_size = FRAMESIZE_SVGA;  // 800x600
    config.jpeg_quality = 12;
    config.fb_count = 1;
    Serial.println("⚠️ Kein PSRAM - Reduzierte Auflösung");
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Kamera Init fehlgeschlagen: 0x%x\n", err);
    return false;
  }

  // Standard-Einstellungen anwenden
  applyCameraSettings();

  return true;
}

// ==========================================
// KAMERA-EINSTELLUNGEN ANWENDEN
// ==========================================
void applyCameraSettings() {
  sensor_t *s = esp_camera_sensor_get();
  if (!s) return;

  s->set_brightness(s, brightness);
  s->set_contrast(s, contrast);
  s->set_saturation(s, saturation);
  s->set_framesize(s, (framesize_t)frameSize);
  s->set_quality(s, quality);
  s->set_hmirror(s, hMirror ? 1 : 0);
  s->set_vflip(s, vFlip ? 1 : 0);

  // Auto-Einstellungen
  s->set_whitebal(s, 1);
  s->set_awb_gain(s, 1);
  s->set_wb_mode(s, 0);
  s->set_exposure_ctrl(s, 1);
  s->set_gain_ctrl(s, 1);
  s->set_bpc(s, 1);
  s->set_wpc(s, 1);
  s->set_raw_gma(s, 1);
  s->set_lenc(s, 1);
}

// ==========================================
// EINSTELLUNGEN LADEN/SPEICHERN
// ==========================================
void loadSettings() {
  prefs.begin("camera", true);
  timelapseInterval = prefs.getULong("interval", DEFAULT_TIMELAPSE_INTERVAL);
  timelapseEnabled = prefs.getBool("enabled", DEFAULT_TIMELAPSE_ENABLED);
  brightness = prefs.getInt("brightness", 0);
  contrast = prefs.getInt("contrast", 0);
  saturation = prefs.getInt("saturation", 0);
  frameSize = prefs.getInt("frameSize", 10);
  quality = prefs.getInt("quality", 10);
  hMirror = prefs.getBool("hMirror", false);
  vFlip = prefs.getBool("vFlip", false);
  prefs.end();

  Serial.println("✅ Einstellungen geladen");
}

void saveSettings() {
  prefs.begin("camera", false);
  prefs.putULong("interval", timelapseInterval);
  prefs.putBool("enabled", timelapseEnabled);
  prefs.putInt("brightness", brightness);
  prefs.putInt("contrast", contrast);
  prefs.putInt("saturation", saturation);
  prefs.putInt("frameSize", frameSize);
  prefs.putInt("quality", quality);
  prefs.putBool("hMirror", hMirror);
  prefs.putBool("vFlip", vFlip);
  prefs.end();

  Serial.println("✅ Einstellungen gespeichert");
}

// ==========================================
// HEARTBEAT AN BACKEND SENDEN
// ==========================================
void sendHeartbeat() {
  WiFiClient client;

  if (!client.connect(BACKEND_HOST, BACKEND_PORT)) {
    return; // Stiller Fehler - Backend nicht erreichbar
  }

  // JSON Payload
  String json = "{";
  json += "\"cameraId\":\"" + String(CAM_ID) + "\",";
  json += "\"name\":\"" + String(CAM_NAME) + "\",";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
  json += "\"uptime\":" + String((millis() - bootTime) / 1000) + ",";
  json += "\"freeHeap\":" + String(ESP.getFreeHeap()) + ",";
  json += "\"captures\":" + String(captureCount) + ",";
  json += "\"streaming\":" + String(streamActive ? "true" : "false") + ",";
  json += "\"flash\":" + String(flashEnabled ? "true" : "false") + ",";
  json += "\"timelapse\":{";
  json += "\"enabled\":" + String(timelapseEnabled ? "true" : "false") + ",";
  json += "\"interval\":" + String(timelapseInterval / 1000);
  json += "}}";

  client.println("POST /api/cameras/heartbeat HTTP/1.1");
  client.println("Host: " + String(BACKEND_HOST) + ":" + String(BACKEND_PORT));
  client.println("Content-Type: application/json");
  client.println("Content-Length: " + String(json.length()));
  client.println("Connection: close");
  client.println();
  client.print(json);

  // Kurz auf Response warten
  unsigned long timeout = millis();
  while (client.available() == 0 && millis() - timeout < 2000) {
    delay(10);
  }

  client.stop();
}

// ==========================================
// FOTO AUFNEHMEN & HOCHLADEN
// ==========================================
bool captureAndUpload() {
  if (flashEnabled) {
    digitalWrite(LED_FLASH, HIGH);
    delay(100);
  }

  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("❌ Capture fehlgeschlagen");
    digitalWrite(LED_FLASH, LOW);
    return false;
  }

  if (flashEnabled) {
    digitalWrite(LED_FLASH, LOW);
  }

  Serial.printf("📸 Foto: %d bytes\n", fb->len);
  captureCount++;

  // Upload zum Backend
  WiFiClient client;

  if (!client.connect(BACKEND_HOST, BACKEND_PORT)) {
    Serial.println("❌ Backend nicht erreichbar");
    esp_camera_fb_return(fb);
    return false;
  }

  // HTTP POST Request - Raw JPEG Upload (Backend erwartet image/jpeg)
  client.println("POST /api/timelapse/upload HTTP/1.1");
  client.println("Host: " + String(BACKEND_HOST) + ":" + String(BACKEND_PORT));
  client.println("Content-Type: image/jpeg");
  client.println("X-Camera-ID: " + String(CAM_ID));
  client.println("X-Camera-Name: " + String(CAM_NAME));
  client.println("Content-Length: " + String(fb->len));
  client.println("Connection: close");
  client.println();

  // Raw JPEG Upload in Chunks
  size_t remaining = fb->len;
  uint8_t *p = fb->buf;
  while (remaining > 0) {
    size_t toSend = min((size_t)4096, remaining);
    client.write(p, toSend);
    p += toSend;
    remaining -= toSend;
    yield();
  }

  // Response lesen
  unsigned long timeout = millis();
  while (client.available() == 0 && millis() - timeout < 5000) {
    delay(10);
  }

  bool success = false;
  if (client.available()) {
    String response = client.readString();
    success = response.indexOf("200") > 0 || response.indexOf("201") > 0;
  }

  client.stop();
  esp_camera_fb_return(fb);

  if (success) {
    Serial.println("✅ Upload erfolgreich");
  } else {
    Serial.println("❌ Upload fehlgeschlagen");
  }

  return success;
}

// ==========================================
// WEB SERVER HANDLER
// ==========================================

// CORS Header hinzufügen
void addCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, X-Camera-ID");
}

// OPTIONS Handler für CORS Preflight
void handleOptions() {
  addCorsHeaders();
  server.send(204);
}

// Root - Web Interface
void handleRoot() {
  String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <title>)rawliteral" + String(CAM_NAME) + R"rawliteral(</title>
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #e4e4e7; min-height: 100vh; padding: 20px;
    }
    .container { max-width: 800px; margin: 0 auto; }
    .card { background: rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1); }
    h1 { color: #10b981; margin-bottom: 10px; }
    h2 { color: #e4e4e7; font-size: 18px; margin-bottom: 15px; }
    .stream-container { position: relative; border-radius: 12px; overflow: hidden; background: #000; }
    .stream-container img { width: 100%; display: block; }
    .status { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px; }
    .badge { padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge.online { background: rgba(16,185,129,0.2); color: #10b981; }
    .badge.info { background: rgba(59,130,246,0.2); color: #3b82f6; }
    .controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
    button {
      padding: 12px 20px; border: none; border-radius: 10px; font-weight: 600;
      cursor: pointer; transition: all 0.2s; font-size: 14px;
    }
    button.primary { background: #10b981; color: white; }
    button.primary:hover { background: #059669; transform: scale(1.02); }
    button.secondary { background: rgba(255,255,255,0.1); color: #e4e4e7; }
    button.secondary:hover { background: rgba(255,255,255,0.15); }
    .slider-group { margin-bottom: 15px; }
    .slider-group label { display: block; margin-bottom: 5px; font-size: 14px; color: #a1a1aa; }
    input[type="range"] { width: 100%; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .info-item { padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; }
    .info-item label { font-size: 11px; color: #71717a; text-transform: uppercase; }
    .info-item value { font-size: 16px; font-weight: 600; display: block; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>🌱 )rawliteral" + String(CAM_NAME) + R"rawliteral(</h1>
      <div class="status">
        <span class="badge online">● ONLINE</span>
        <span class="badge info">ID: )rawliteral" + String(CAM_ID) + R"rawliteral(</span>
        <span class="badge info">)rawliteral" + WiFi.localIP().toString() + R"rawliteral(</span>
      </div>
    </div>

    <div class="card">
      <h2>📹 Live Stream</h2>
      <div class="stream-container">
        <img id="stream" src="/stream" />
      </div>
      <div class="controls" style="margin-top: 15px;">
        <button class="primary" onclick="location.href='/capture'">📸 Snapshot</button>
        <button class="secondary" onclick="toggleFlash()">💡 Flash</button>
        <button class="secondary" onclick="triggerUpload()">☁️ Upload</button>
        <button class="secondary" onclick="location.reload()">🔄 Refresh</button>
      </div>
    </div>

    <div class="card">
      <h2>⚙️ Einstellungen</h2>
      <div class="slider-group">
        <label>Helligkeit: <span id="brightnessVal">)rawliteral" + String(brightness) + R"rawliteral(</span></label>
        <input type="range" min="-2" max="2" value=")rawliteral" + String(brightness) + R"rawliteral(" onchange="setSetting('brightness', this.value)">
      </div>
      <div class="slider-group">
        <label>Kontrast: <span id="contrastVal">)rawliteral" + String(contrast) + R"rawliteral(</span></label>
        <input type="range" min="-2" max="2" value=")rawliteral" + String(contrast) + R"rawliteral(" onchange="setSetting('contrast', this.value)">
      </div>
      <div class="slider-group">
        <label>Qualität: <span id="qualityVal">)rawliteral" + String(quality) + R"rawliteral(</span></label>
        <input type="range" min="4" max="63" value=")rawliteral" + String(quality) + R"rawliteral(" onchange="setSetting('quality', this.value)">
      </div>
      <div class="controls">
        <button class="secondary" onclick="setSetting('hmirror', 'toggle')">↔️ H-Mirror</button>
        <button class="secondary" onclick="setSetting('vflip', 'toggle')">↕️ V-Flip</button>
      </div>
    </div>

    <div class="card">
      <h2>📊 Status</h2>
      <div class="info-grid">
        <div class="info-item">
          <label>Timelapse</label>
          <value>)rawliteral" + String(timelapseEnabled ? "Aktiv" : "Aus") + R"rawliteral(</value>
        </div>
        <div class="info-item">
          <label>Interval</label>
          <value>)rawliteral" + String(timelapseInterval / 1000) + R"rawliteral(s</value>
        </div>
        <div class="info-item">
          <label>Captures</label>
          <value>)rawliteral" + String(captureCount) + R"rawliteral(</value>
        </div>
        <div class="info-item">
          <label>Uptime</label>
          <value id="uptime">-</value>
        </div>
      </div>
    </div>
  </div>

  <script>
    function setSetting(key, value) {
      fetch('/api/settings?' + key + '=' + value).then(r => r.json()).then(d => {
        console.log('Setting updated:', d);
        if (key === 'brightness') document.getElementById('brightnessVal').textContent = value;
        if (key === 'contrast') document.getElementById('contrastVal').textContent = value;
        if (key === 'quality') document.getElementById('qualityVal').textContent = value;
      });
    }
    function toggleFlash() {
      fetch('/api/flash/toggle').then(r => r.json()).then(d => console.log('Flash:', d));
    }
    function triggerUpload() {
      fetch('/api/capture/upload').then(r => r.json()).then(d => alert(d.success ? 'Upload OK!' : 'Upload fehlgeschlagen'));
    }
    function updateUptime() {
      fetch('/api/status').then(r => r.json()).then(d => {
        const secs = Math.floor(d.uptime / 1000);
        const mins = Math.floor(secs / 60);
        const hrs = Math.floor(mins / 60);
        document.getElementById('uptime').textContent = hrs + 'h ' + (mins % 60) + 'm';
      });
    }
    setInterval(updateUptime, 5000);
    updateUptime();
  </script>
</body>
</html>
)rawliteral";

  server.send(200, "text/html", html);
}

// MJPEG Stream
void handleStream() {
  WiFiClient client = server.client();
  streamClients++;
  streamActive = true;

  String response = "HTTP/1.1 200 OK\r\n";
  response += "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n";
  response += "Access-Control-Allow-Origin: *\r\n\r\n";
  server.sendContent(response);

  while (client.connected()) {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Frame capture failed");
      break;
    }

    client.printf("--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %d\r\n\r\n", fb->len);
    client.write(fb->buf, fb->len);
    client.print("\r\n");

    esp_camera_fb_return(fb);
    delay(33); // ~30 FPS
  }

  streamClients--;
  if (streamClients <= 0) {
    streamActive = false;
    streamClients = 0;
  }
}

// Einzelbild
void handleCapture() {
  addCorsHeaders();

  if (flashEnabled) {
    digitalWrite(LED_FLASH, HIGH);
    delay(100);
  }

  camera_fb_t *fb = esp_camera_fb_get();

  if (flashEnabled) {
    digitalWrite(LED_FLASH, LOW);
  }

  if (!fb) {
    server.send(500, "application/json", "{\"error\":\"Capture failed\"}");
    return;
  }

  server.sendHeader("Content-Disposition", "inline; filename=capture.jpg");
  server.send_P(200, "image/jpeg", (const char *)fb->buf, fb->len);
  esp_camera_fb_return(fb);
}

// API: Status
void handleApiStatus() {
  addCorsHeaders();

  StaticJsonDocument<512> doc;
  doc["id"] = CAM_ID;
  doc["name"] = CAM_NAME;
  doc["ip"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();
  doc["uptime"] = millis() - bootTime;
  doc["captures"] = captureCount;
  doc["streaming"] = streamActive;
  doc["streamClients"] = streamClients;
  doc["timelapse"]["enabled"] = timelapseEnabled;
  doc["timelapse"]["interval"] = timelapseInterval;
  doc["settings"]["brightness"] = brightness;
  doc["settings"]["contrast"] = contrast;
  doc["settings"]["quality"] = quality;
  doc["settings"]["flash"] = flashEnabled;
  doc["psram"] = psramFound();
  doc["freeHeap"] = ESP.getFreeHeap();

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// API: Einstellungen ändern
void handleApiSettings() {
  addCorsHeaders();

  if (server.hasArg("brightness")) {
    brightness = server.arg("brightness").toInt();
    brightness = constrain(brightness, -2, 2);
  }
  if (server.hasArg("contrast")) {
    contrast = server.arg("contrast").toInt();
    contrast = constrain(contrast, -2, 2);
  }
  if (server.hasArg("saturation")) {
    saturation = server.arg("saturation").toInt();
    saturation = constrain(saturation, -2, 2);
  }
  if (server.hasArg("quality")) {
    quality = server.arg("quality").toInt();
    quality = constrain(quality, 4, 63);
  }
  if (server.hasArg("framesize")) {
    frameSize = server.arg("framesize").toInt();
    frameSize = constrain(frameSize, 0, 13);
  }
  if (server.hasArg("hmirror")) {
    hMirror = server.arg("hmirror") == "toggle" ? !hMirror : (server.arg("hmirror") == "1");
  }
  if (server.hasArg("vflip")) {
    vFlip = server.arg("vflip") == "toggle" ? !vFlip : (server.arg("vflip") == "1");
  }
  if (server.hasArg("timelapse")) {
    timelapseEnabled = server.arg("timelapse") == "1";
  }
  if (server.hasArg("interval")) {
    timelapseInterval = server.arg("interval").toInt() * 1000;
    timelapseInterval = max(timelapseInterval, 10000UL); // Min 10 Sekunden
  }

  applyCameraSettings();
  saveSettings();

  StaticJsonDocument<256> doc;
  doc["success"] = true;
  doc["brightness"] = brightness;
  doc["contrast"] = contrast;
  doc["quality"] = quality;
  doc["hmirror"] = hMirror;
  doc["vflip"] = vFlip;
  doc["timelapse"] = timelapseEnabled;
  doc["interval"] = timelapseInterval / 1000;

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// API: Flash Toggle
void handleApiFlash() {
  addCorsHeaders();

  if (server.hasArg("state")) {
    flashEnabled = server.arg("state") == "1";
  } else {
    flashEnabled = !flashEnabled;
  }

  digitalWrite(LED_FLASH, flashEnabled ? HIGH : LOW);

  StaticJsonDocument<64> doc;
  doc["flash"] = flashEnabled;

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// API: Manueller Upload
void handleApiCaptureUpload() {
  addCorsHeaders();

  bool success = captureAndUpload();

  StaticJsonDocument<64> doc;
  doc["success"] = success;
  doc["captures"] = captureCount;

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// ==========================================
// SETUP
// ==========================================
void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  Serial.println("\n\n=== ESP32-CAM Pro - Grow Monitoring ===");
  Serial.printf("Kamera: %s (%s)\n", CAM_NAME, CAM_ID);

  // LED Pins
  pinMode(LED_FLASH, OUTPUT);
  pinMode(LED_STATUS, OUTPUT);
  digitalWrite(LED_FLASH, LOW);
  digitalWrite(LED_STATUS, LOW);

  // Einstellungen laden
  loadSettings();

  // Kamera initialisieren
  Serial.println("📷 Initialisiere Kamera...");
  if (!initCamera()) {
    Serial.println("❌ Kamera Init fehlgeschlagen - Neustart...");
    delay(1000);
    ESP.restart();
  }
  Serial.println("✅ Kamera bereit");

  // WiFi verbinden
  Serial.printf("📶 Verbinde mit %s...\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n❌ WiFi Verbindung fehlgeschlagen - Neustart...");
    delay(1000);
    ESP.restart();
  }

  Serial.println("\n✅ WiFi verbunden!");
  Serial.printf("📍 IP: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("📡 Signal: %d dBm\n", WiFi.RSSI());

  // mDNS starten
  if (MDNS.begin(MDNS_NAME)) {
    MDNS.addService("http", "tcp", 80);
    MDNS.addService("growcam", "tcp", 80);
    Serial.printf("✅ mDNS: http://%s.local\n", MDNS_NAME);
  }

  // OTA Updates
  ArduinoOTA.setHostname(MDNS_NAME);
  ArduinoOTA.onStart([]() { Serial.println("OTA Update startet..."); });
  ArduinoOTA.onEnd([]() { Serial.println("\nOTA Update fertig!"); });
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
  });
  ArduinoOTA.begin();

  // Web Server Routen
  server.on("/", handleRoot);
  server.on("/stream", handleStream);
  server.on("/capture", handleCapture);
  server.on("/api/status", handleApiStatus);
  server.on("/api/settings", handleApiSettings);
  server.on("/api/flash/toggle", handleApiFlash);
  server.on("/api/capture/upload", handleApiCaptureUpload);

  // CORS Preflight
  server.on("/api/status", HTTP_OPTIONS, handleOptions);
  server.on("/api/settings", HTTP_OPTIONS, handleOptions);

  server.begin();

  bootTime = millis();
  Serial.println("✅ Web Server gestartet");
  Serial.println("========================================");

  // LED blinken als Erfolgsmeldung
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_STATUS, HIGH);
    delay(100);
    digitalWrite(LED_STATUS, LOW);
    delay(100);
  }

  // Erste Aufnahme
  delay(2000);
  captureAndUpload();
}

// ==========================================
// LOOP
// ==========================================
void loop() {
  server.handleClient();
  ArduinoOTA.handle();

  // Timelapse Auto-Capture
  if (timelapseEnabled && (millis() - lastCapture > timelapseInterval)) {
    lastCapture = millis();
    captureAndUpload();
  }

  // Heartbeat LED (alle 5 Sekunden)
  if (millis() - lastHeartbeat > 5000) {
    lastHeartbeat = millis();
    digitalWrite(LED_STATUS, HIGH);
    delay(50);
    digitalWrite(LED_STATUS, LOW);
  }

  // Backend Heartbeat (alle 30 Sekunden)
  if (millis() - lastBackendHeartbeat > HEARTBEAT_INTERVAL) {
    lastBackendHeartbeat = millis();
    sendHeartbeat();
  }

  delay(10);
}
