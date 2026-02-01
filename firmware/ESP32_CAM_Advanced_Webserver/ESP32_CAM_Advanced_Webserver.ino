/**
 * ESP32-CAM Snapshot Modus (Alle 20 Sekunden)
 * * Hardware: AI Thinker ESP32-CAM + USB-C MB Adapter
 * * Strategie: Statt Video-Stream wird per JavaScript alle 20s ein Einzelbild geladen.
 * * Vorteil: Massive Entlastung für WLAN und CPU. Viel stabiler.
 * * Fixes: Kompatibilität mit ESP32 Core 3.0+ (ledcAttach, httpd_uri_t Init)
 */

#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"

// ==========================================
// 1. WLAN ZUGANGSDATEN (HIER ÄNDERN!)
// ==========================================
const char* ssid = "WLAN-915420";
const char* password = "78118805138223696181";


// ==========================================
// 2. PIN DEFINITIONEN (AI THINKER)
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

#define LAMP_PIN           4 

httpd_handle_t camera_httpd = NULL;

// ==========================================
// 3. HTML OBERFLÄCHE (Snapshot Version)
// ==========================================
const char PROGMEM index_html[] = R"rawliteral(
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ESP32-CAM Monitor</title>
    <style>
      body { font-family: sans-serif; background: #1a1a1a; color: #eee; text-align: center; margin: 0; padding: 20px; }
      h2 { margin-bottom: 5px; }
      #img-container { position: relative; display: inline-block; margin-bottom: 10px; }
      img { width: 100%; max-width: 800px; height: auto; border: 2px solid #555; border-radius: 4px; background: #000; }
      
      .info-bar { margin-bottom: 20px; font-size: 14px; color: #aaa; }
      
      .btn-container { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
      button { padding: 10px 20px; font-size: 16px; border: none; border-radius: 4px; cursor: pointer; color: #fff; font-weight: bold; }
      button:active { transform: scale(0.96); }
      
      .btn-refresh { background: #27ae60; width: 100%; max-width: 300px; padding: 15px; margin-bottom: 20px; }
      .btn-light { background: #f1c40f; color: #000; }
      .btn-set { background: #2980b9; }
      
      #loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                 background: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px; display: none; }
    </style>
  </head>
  <body>
    <h2>Grow Monitor</h2>
    <div class="info-bar">
      Aktualisierung alle 20s | Letztes Bild: <span id="timestamp">--:--:--</span>
    </div>

    <div id="img-container">
      <img src="" id="photo">
      <div id="loading">Lade...</div>
    </div>
    
    <div>
      <button class="btn-refresh" onclick="refreshImage()">Jetzt manuell aktualisieren</button>
    </div>

    <div class="btn-container">
      <button class="btn-light" onclick="toggleLight()">Licht An/Aus</button>
    </div>
    
    <div class="btn-container">
      <button class="btn-set" onclick="setRes(8)">Mittel (VGA)</button>
      <button class="btn-set" onclick="setRes(10)">Groß (UXGA)</button>
      <button class="btn-set" onclick="setFlip()">Drehen</button>
    </div>

    <script>
      // Alle 20 Sekunden (20000 ms) neues Bild holen
      setInterval(refreshImage, 20000);

      window.onload = function() {
        refreshImage(); // Erstes Bild beim Start
      };

      function refreshImage() {
        var img = document.getElementById("photo");
        var loadText = document.getElementById("loading");
        
        loadText.style.display = "block";
        
        // Timestamp hinzufügen um Browser-Cache zu umgehen
        var newSrc = "/capture?t=" + new Date().getTime();
        
        img.onload = function() {
          loadText.style.display = "none";
          var now = new Date();
          document.getElementById("timestamp").innerText = now.toLocaleTimeString();
        };
        
        img.onerror = function() {
           loadText.style.display = "none";
           loadText.innerText = "Fehler";
        };

        img.src = newSrc;
      }

      function sendCmd(query) {
        fetch(query).then(r => console.log('Cmd sent'));
      }

      let lightState = 0;
      function toggleLight() {
        lightState = !lightState;
        // Lichtstärke 20 (von 255) reicht meist
        sendCmd('/control?var=flash&val=' + (lightState ? 20 : 0));
        // Kleines Delay, dann Bild aktualisieren damit man sieht ob Licht an ist
        setTimeout(refreshImage, 500); 
      }

      function setRes(val) {
        sendCmd('/control?var=framesize&val=' + val);
        setTimeout(refreshImage, 1000);
      }
      
      let flip = 0;
      function setFlip() {
        flip = !flip;
        sendCmd('/control?var=vflip&val=' + (flip ? 1 : 0));
        sendCmd('/control?var=hmirror&val=' + (flip ? 1 : 0));
        setTimeout(refreshImage, 500);
      }
    </script>
  </body>
</html>
)rawliteral";

// ==========================================
// 4. HANDLER FUNKTIONEN
// ==========================================

static esp_err_t index_handler(httpd_req_t *req){
  httpd_resp_set_type(req, "text/html");
  return httpd_resp_send(req, (const char *)index_html, strlen(index_html));
}

// Einzelbild aufnehmen und senden (Capture Handler)
static esp_err_t capture_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;

  // Foto schießen
  fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }
  
  // Bild senden
  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
  
  // Puffer freigeben
  esp_camera_fb_return(fb);
  
  return res;
}

static esp_err_t cmd_handler(httpd_req_t *req){
  char* buf;
  size_t buf_len;
  char variable[32] = {0,};
  char value[32] = {0,};

  buf_len = httpd_req_get_url_query_len(req) + 1;
  if (buf_len > 1) {
    buf = (char*)malloc(buf_len);
    if(!buf){
      httpd_resp_send_500(req);
      return ESP_FAIL;
    }
    if (httpd_req_get_url_query_str(req, buf, buf_len) == ESP_OK) {
      if (httpd_query_key_value(buf, "var", variable, sizeof(variable)) == ESP_OK &&
          httpd_query_key_value(buf, "val", value, sizeof(value)) == ESP_OK) {
      } else {
        free(buf);
        httpd_resp_send_404(req);
        return ESP_FAIL;
      }
    } else {
      free(buf);
      httpd_resp_send_404(req);
      return ESP_FAIL;
    }
    free(buf);
  } else {
    httpd_resp_send_404(req);
    return ESP_FAIL;
  }

  int val = atoi(value);
  sensor_t * s = esp_camera_sensor_get();
  int res = 0;

  if(!strcmp(variable, "framesize")) {
    if(s->pixformat == PIXFORMAT_JPEG) res = s->set_framesize(s, (framesize_t)val);
  }
  else if(!strcmp(variable, "vflip")) res = s->set_vflip(s, val);
  else if(!strcmp(variable, "hmirror")) res = s->set_hmirror(s, val);
  else if(!strcmp(variable, "flash")) {
    // FIX für ESP32 Core 3.0: ledcWrite nutzt jetzt PIN nummer, nicht channel
    ledcWrite(LAMP_PIN, val); 
  }

  if(res){
    return httpd_resp_send_500(req);
  }
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(req, NULL, 0);
}

// ==========================================
// 5. SERVER INIT
// ==========================================
void startCameraServer(){
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;

  // FIX: Saubere Initialisierung mit {} verhindert "missing initializer" Fehler
  httpd_uri_t index_uri = {};
  index_uri.uri       = "/";
  index_uri.method    = HTTP_GET;
  index_uri.handler   = index_handler;
  index_uri.user_ctx  = NULL;

  httpd_uri_t capture_uri = {};
  capture_uri.uri       = "/capture";
  capture_uri.method    = HTTP_GET;
  capture_uri.handler   = capture_handler;
  capture_uri.user_ctx  = NULL;

  httpd_uri_t cmd_uri = {};
  cmd_uri.uri       = "/control";
  cmd_uri.method    = HTTP_GET;
  cmd_uri.handler   = cmd_handler;
  cmd_uri.user_ctx  = NULL;

  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &index_uri);
    httpd_register_uri_handler(camera_httpd, &capture_uri);
    httpd_register_uri_handler(camera_httpd, &cmd_uri);
  }
}

// ==========================================
// 6. SETUP & LOOP
// ==========================================
void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println();

  // LED Setup (ESP32 v3.0+)
  // ledcAttach(pin, freq, resolution)
  ledcAttach(LAMP_PIN, 5000, 8);

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
  // FIX: sccb statt sscb für neue Library Versionen
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if(psramFound()){
    config.frame_size = FRAMESIZE_VGA; 
    config.jpeg_quality = 10; 
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_CIF;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Kamera Fehler 0x%x", err);
    return;
  }

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWLAN Verbunden!");
  
  startCameraServer();

  Serial.print("Snapshot-Server bereit auf: http://");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Der Server läuft asynchron.
  if(WiFi.status() != WL_CONNECTED) {
    delay(1000);
    WiFi.reconnect();
  }
  delay(2000);
}