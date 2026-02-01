/*
 * ESP32-CAM für Grow Monitoring System
 * Version 1.1 - Timelapse & Live Stream (RAW TCP)
 *
 * Hardware: ESP32-CAM (AI-Thinker Module)
 * Features:
 * - Timelapse Fotos (Upload zum Backend)
 * - Live MJPEG Stream
 * - Einstellbare Bildqualität
 * - WiFi & OTA Updates
 *
 * Pinout ESP32-CAM AI-Thinker:
 * - GPIO 0: Boot Mode (LOW beim Upload!)
 * - GPIO 33: LED Flash (optional)
 * - GPIO 4: LED (eingebaut)
 */

#include <WiFi.h>
#include <WebServer.h>
#include "esp_camera.h"
#include "esp_timer.h"
#include "img_converters.h"
#include "Arduino.h"
#include "fb_gfx.h"
#include "soc/soc.h"           // Brownout detector deaktivieren
#include "soc/rtc_cntl_reg.h"  // Brownout detector deaktivieren
#include "esp_http_server.h"

// ==========================================
// KONFIGURATION
// ==========================================
const char* WIFI_SSID = "WLAN-915420";
const char* WIFI_PASSWORD = "78118805138223696181";

// Backend Server (CasaOS) - Direkt Port 3000 (ohne Nginx)
const char* BACKEND_HOST = "192.168.2.169";
const int BACKEND_PORT = 3000;
const char* BACKEND_PATH = "/api/timelapse/upload";
const char* CAM_NAME = "cam1";  // Eindeutige Kamera-ID (cam1, cam2, etc.)

// Timelapse Einstellungen
unsigned long TIMELAPSE_INTERVAL = 60000;  // 60 Sekunden (in Millisekunden)
unsigned long lastCapture = 0;
bool timelapseEnabled = true;

// LED Flash Pin (GPIO 33 bei AI-Thinker, GPIO 4 für eingebaute LED)
#define LED_FLASH 4
#define LED_BUILTIN 33

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

// Web Server für Stream
WebServer server(80);

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
  config.pin_sccb_sda= SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  // Bildqualität-Einstellungen
  if(psramFound()){
    config.frame_size = FRAMESIZE_UXGA;  // 1600x1200
    config.jpeg_quality = 10;             // 0-63, niedriger = besser
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_SVGA;   // 800x600
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  // Kamera initialisieren
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Kamera Init fehlgeschlagen: 0x%x\n", err);
    return false;
  }

  // Sensor-Einstellungen
  sensor_t * s = esp_camera_sensor_get();
  s->set_brightness(s, 0);     // -2 bis 2
  s->set_contrast(s, 0);       // -2 bis 2
  s->set_saturation(s, 0);     // -2 bis 2
  s->set_special_effect(s, 0); // 0 = Kein Effekt
  s->set_whitebal(s, 1);       // 0 = Aus, 1 = An
  s->set_awb_gain(s, 1);       // 0 = Aus, 1 = An
  s->set_wb_mode(s, 0);        // 0 = Auto
  s->set_exposure_ctrl(s, 1);  // 0 = Aus, 1 = An
  s->set_aec2(s, 0);           // 0 = Aus, 1 = An
  s->set_ae_level(s, 0);       // -2 bis 2
  s->set_aec_value(s, 300);    // 0 bis 1200
  s->set_gain_ctrl(s, 1);      // 0 = Aus, 1 = An
  s->set_agc_gain(s, 0);       // 0 bis 30
  s->set_gainceiling(s, (gainceiling_t)0);  // 0 bis 6
  s->set_bpc(s, 0);            // 0 = Aus, 1 = An
  s->set_wpc(s, 1);            // 0 = Aus, 1 = An
  s->set_raw_gma(s, 1);        // 0 = Aus, 1 = An
  s->set_lenc(s, 1);           // 0 = Aus, 1 = An
  s->set_hmirror(s, 0);        // 0 = Aus, 1 = An
  s->set_vflip(s, 0);          // 0 = Aus, 1 = An
  s->set_dcw(s, 1);            // 0 = Aus, 1 = An
  s->set_colorbar(s, 0);       // 0 = Aus, 1 = An

  return true;
}

// ==========================================
// FOTO AUFNEHMEN & HOCHLADEN (RAW TCP)
// ==========================================
bool captureAndUpload() {
  // LED einschalten (optional)
  digitalWrite(LED_FLASH, HIGH);
  delay(100);

  // Foto aufnehmen
  camera_fb_t * fb = esp_camera_fb_get();
  if(!fb) {
    Serial.println("Kamera Capture fehlgeschlagen");
    digitalWrite(LED_FLASH, LOW);
    return false;
  }

  digitalWrite(LED_FLASH, LOW);

  Serial.printf("Foto aufgenommen: %d bytes\n", fb->len);

  // RAW TCP Upload zum Backend
  WiFiClient client;

  Serial.printf("📤 Verbinde zu %s:%d\n", BACKEND_HOST, BACKEND_PORT);

  if (!client.connect(BACKEND_HOST, BACKEND_PORT)) {
    Serial.println("❌ Verbindung fehlgeschlagen");
    esp_camera_fb_return(fb);
    return false;
  }

  Serial.println("✅ Verbunden, sende HTTP Request...");

  // HTTP POST Request erstellen
  String httpRequest = String("POST ") + BACKEND_PATH + " HTTP/1.1\r\n" +
                       "Host: " + BACKEND_HOST + ":" + BACKEND_PORT + "\r\n" +
                       "Content-Type: image/jpeg\r\n" +
                       "X-Camera-Name: " + CAM_NAME + "\r\n" +
                       "Content-Length: " + fb->len + "\r\n" +
                       "Connection: close\r\n\r\n";

  // Sende Header
  client.print(httpRequest);

  // Sende Bild-Daten direkt (ohne komplexes Chunking)
  Serial.printf("📤 Sende %d bytes...\n", fb->len);

  size_t totalSent = 0;
  const size_t chunkSize = 2048;

  for (size_t i = 0; i < fb->len; i += chunkSize) {
    size_t toSend = min(chunkSize, fb->len - i);

    size_t sent = 0;
    while (sent < toSend && client.connected()) {
      size_t written = client.write(fb->buf + i + sent, toSend - sent);
      sent += written;

      if (written == 0) {
        delay(10);  // Kurze Pause wenn Buffer voll
      }
    }

    totalSent += sent;

    // Progress Update alle 20KB
    if (totalSent % 20480 == 0) {
      Serial.printf("📤 Progress: %d%%\n", (totalSent * 100) / fb->len);
    }
  }

  Serial.printf("✅ Komplett gesendet: %d bytes\n", totalSent);

  // Warte auf Response
  unsigned long timeout = millis();
  while (client.available() == 0) {
    if (millis() - timeout > 10000) {
      Serial.println("❌ Response Timeout");
      client.stop();
      esp_camera_fb_return(fb);
      return false;
    }
    delay(10);
  }

  // Lese Response
  String response = "";
  while (client.available()) {
    response += client.readStringUntil('\n');
  }

  Serial.println("📥 Response: " + response);

  bool success = response.indexOf("200") > 0 || response.indexOf("OK") > 0;

  if(success) {
    Serial.println("✅ Foto erfolgreich hochgeladen");
  } else {
    Serial.println("❌ Upload fehlgeschlagen");
  }

  client.stop();
  esp_camera_fb_return(fb);

  return success;
}

// ==========================================
// MJPEG STREAM HANDLER
// ==========================================
void handleStream() {
  WiFiClient client = server.client();

  String response = "HTTP/1.1 200 OK\r\n";
  response += "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n\r\n";
  server.sendContent(response);

  while(client.connected()) {
    camera_fb_t * fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Frame capture failed");
      break;
    }

    client.print("--frame\r\n");
    client.print("Content-Type: image/jpeg\r\n\r\n");
    client.write(fb->buf, fb->len);
    client.print("\r\n");

    esp_camera_fb_return(fb);

    delay(30); // ~30 FPS
  }
}

// ==========================================
// EINZELBILD HANDLER
// ==========================================
void handleCapture() {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    server.send(500, "text/plain", "Camera capture failed");
    return;
  }

  server.sendHeader("Content-Disposition", "inline; filename=capture.jpg");
  server.send_P(200, "image/jpeg", (const char *)fb->buf, fb->len);

  esp_camera_fb_return(fb);
}

// ==========================================
// ROOT PAGE
// ==========================================
void handleRoot() {
  String html = "<!DOCTYPE html><html><head><title>ESP32-CAM - " + String(CAM_NAME) + "</title>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>body{font-family:Arial;text-align:center;margin:20px}";
  html += "img{max-width:100%;height:auto;border:2px solid #333}";
  html += "button{padding:10px 20px;margin:10px;font-size:16px;cursor:pointer}</style></head>";
  html += "<body><h1>ESP32-CAM: " + String(CAM_NAME) + "</h1>";
  html += "<h2>Live Stream</h2>";
  html += "<img src='/stream' /><br>";
  html += "<button onclick='location.reload()'>Refresh</button>";
  html += "<button onclick='window.location=\"/capture\"'>Capture Photo</button>";
  html += "<p>Timelapse: " + String(timelapseEnabled ? "Enabled" : "Disabled") + "</p>";
  html += "<p>Interval: " + String(TIMELAPSE_INTERVAL/1000) + "s</p>";
  html += "<p>Backend: " + String(BACKEND_HOST) + ":" + String(BACKEND_PORT) + "</p>";
  html += "</body></html>";

  server.send(200, "text/html", html);
}

// ==========================================
// SETUP
// ==========================================
void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Brownout detector deaktivieren

  Serial.begin(115200);
  Serial.println();
  Serial.println("=== ESP32-CAM Grow Monitoring System ===");

  // LED Pins
  pinMode(LED_FLASH, OUTPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_FLASH, LOW);
  digitalWrite(LED_BUILTIN, LOW);

  // Kamera initialisieren
  Serial.println("Initialisiere Kamera...");
  if(!initCamera()) {
    Serial.println("❌ Kamera Init fehlgeschlagen!");
    ESP.restart();
  }
  Serial.println("✅ Kamera bereit");

  // WiFi verbinden
  Serial.print("Verbinde mit WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n✅ WiFi verbunden!");
  Serial.print("IP-Adresse: ");
  Serial.println(WiFi.localIP());
  Serial.print("Stream URL: http://");
  Serial.print(WiFi.localIP());
  Serial.println("/stream");

  // Web Server Routen
  server.on("/", handleRoot);
  server.on("/stream", handleStream);
  server.on("/capture", handleCapture);

  server.begin();
  Serial.println("✅ Web Server gestartet");

  // Erste Aufnahme
  delay(2000);
  captureAndUpload();
}

// ==========================================
// LOOP
// ==========================================
void loop() {
  server.handleClient();

  // Timelapse Auto-Capture
  if(timelapseEnabled && (millis() - lastCapture > TIMELAPSE_INTERVAL)) {
    lastCapture = millis();
    captureAndUpload();
  }

  delay(10);
}
