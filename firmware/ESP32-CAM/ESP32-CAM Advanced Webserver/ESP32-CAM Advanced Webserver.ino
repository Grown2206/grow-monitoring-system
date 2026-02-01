/**
 * ESP32-CAM Advanced Webserver
 * * Hardware: AI Thinker ESP32-CAM + USB-C MB Adapter
 * Funktionen:
 * - MJPEG Video Stream
 * - Web-Oberfläche (HTML/CSS/JS)
 * - Steuerung der Blitz-LED (GPIO 4)
 * - Auflösung ändern
 * - Bild drehen (Flip/Mirror)
 */

#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"

// ==========================================
// 1. WLAN ZUGANGSDATEN (HIER ÄNDERN!)
// ==========================================
const char* ssid = "DEIN_WLAN_NAME";
const char* password = "DEIN_WLAN_PASSWORT";

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

// Die superhelle LED ist an GPIO 4
#define LAMP_PIN           4 

httpd_handle_t camera_httpd = NULL;

// ==========================================
// 3. HTML OBERFLÄCHE (In C++ eingebettet)
// ==========================================
const char PROGMEM index_html[] = R"rawliteral(
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ESP32-CAM Kontrolle</title>
    <style>
      body { font-family: sans-serif; background: #222; color: #fff; text-align: center; margin: 0; padding: 20px; }
      h2 { margin-bottom: 10px; }
      img { width: 100%; max-width: 640px; border: 4px solid #444; border-radius: 8px; }
      .btn-container { margin-top: 20px; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
      button { padding: 10px 20px; font-size: 16px; border: none; border-radius: 4px; cursor: pointer; transition: 0.2s; }
      button:active { transform: scale(0.98); }
      .btn-light { background: #f1c40f; color: #000; }
      .btn-res { background: #3498db; color: #fff; }
      .btn-flip { background: #e74c3c; color: #fff; }
    </style>
  </head>
  <body>
    <h2>ESP32-CAM Live</h2>
    <img src="/stream" id="stream">
    
    <div class="btn-container">
      <button class="btn-light" onclick="toggleLight()">Licht An/Aus</button>
    </div>
    <div class="btn-container">
      <button class="btn-res" onclick="setRes('low')">Niedrige Qualität (Schnell)</button>
      <button class="btn-res" onclick="setRes('high')">Hohe Qualität (Langsam)</button>
    </div>
    <div class="btn-container">
      <button class="btn-flip" onclick="setFlip()">Bild Drehen</button>
    </div>

    <script>
      let lightState = 0;
      let flipState = 0;

      function toggleLight() {
        lightState = !lightState;
        // 0-255 für PWM Helligkeit, hier einfach an (20) oder aus (0)
        // Zu hell kann heiß werden!
        let val = lightState ? 20 : 0; 
        fetch('/control?var=flash&val=' + val);
      }

      function setRes(type) {
        // 10 = VGA (Mittel), 5 = QVGA (Klein/Schnell), 13 = UXGA (Groß)
        let val = (type === 'high') ? 10 : 5; 
        fetch('/control?var=framesize&val=' + val);
      }

      function setFlip() {
        flipState = !flipState;
        fetch('/control?var=vflip&val=' + (flipState ? 1 : 0));
        fetch('/control?var=hmirror&val=' + (flipState ? 1 : 0));
      }
    </script>
  </body>
</html>
)rawliteral";

// ==========================================
// 4. HANDLER FUNKTIONEN
// ==========================================

// Liefert die HTML Seite aus
static esp_err_t index_handler(httpd_req_t *req){
  httpd_resp_set_type(req, "text/html");
  return httpd_resp_send(req, (const char *)index_html, strlen(index_html));
}

// Steuert Kamera-Einstellungen (Licht, Größe, Flip)
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

  // Logik für die Befehle
  if(!strcmp(variable, "framesize")) {
    if(s->pixformat == PIXFORMAT_JPEG) res = s->set_framesize(s, (framesize_t)val);
  }
  else if(!strcmp(variable, "vflip")) res = s->set_vflip(s, val);
  else if(!strcmp(variable, "hmirror")) res = s->set_hmirror(s, val);
  else if(!strcmp(variable, "flash")) {
    // Steuert die LED an GPIO 4
    ledcWrite(LEDC_CHANNEL_0, val); 
  }

  if(res){
    return httpd_resp_send_500(req);
  }

  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(req, NULL, 0);
}

// Der Video Stream Handler (MJPEG)
static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;
  size_t _jpg_buf_len = 0;
  uint8_t * _jpg_buf = NULL;
  char * part_buf[64];
  static int64_t last_frame = 0;
  if(!last_frame) last_frame = esp_timer_get_time();

  res = httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=123456789000000000000987654321");
  if (res != ESP_OK) return res;

  while(true){
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Kamera Capture fehlgeschlagen");
      res = ESP_FAIL;
    } else {
      if(fb->format != PIXFORMAT_JPEG){
        bool jpeg_converted = frame2jpg(fb, 80, &_jpg_buf, &_jpg_buf_len);
        esp_camera_fb_return(fb);
        fb = NULL;
        if(!jpeg_converted){
          Serial.println("JPEG Komprimierung fehlgeschlagen");
          res = ESP_FAIL;
        }
      } else {
        _jpg_buf_len = fb->len;
        _jpg_buf = fb->buf;
      }
    }
    if(res == ESP_OK){
      size_t hlen = snprintf((char *)part_buf, 64, "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", _jpg_buf_len);
      res = httpd_resp_send_chunk(req, (const char *)part_buf, hlen);
    }
    if(res == ESP_OK){
      res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
    }
    if(res == ESP_OK){
      res = httpd_resp_send_chunk(req, "\r\n--123456789000000000000987654321\r\n", 37);
    }
    if(fb){
      esp_camera_fb_return(fb);
      fb = NULL;
      _jpg_buf = NULL;
    } else if(_jpg_buf){
      free(_jpg_buf);
      _jpg_buf = NULL;
    }
    if(res != ESP_OK){
      break;
    }
  }
  return res;
}

// ==========================================
// 5. SERVER INIT
// ==========================================
void startCameraServer(){
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;

  httpd_uri_t index_uri = {
    .uri       = "/",
    .method    = HTTP_GET,
    .handler   = index_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t stream_uri = {
    .uri       = "/stream",
    .method    = HTTP_GET,
    .handler   = stream_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t cmd_uri = {
    .uri       = "/control",
    .method    = HTTP_GET,
    .handler   = cmd_handler,
    .user_ctx  = NULL
  };

  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &index_uri);
    httpd_register_uri_handler(camera_httpd, &stream_uri);
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

  // LED Konfiguration (PWM für Dimmen, um Überhitzung zu vermeiden)
  ledcSetup(LEDC_CHANNEL_0, 5000, 8);
  ledcAttachPin(LAMP_PIN, LEDC_CHANNEL_0);

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
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if(psramFound()){
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  // Kamera Init
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Kamera Fehler 0x%x", err);
    return;
  }

  // WLAN Verbindung
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WLAN Verbunden!");
  
  startCameraServer();

  Serial.print("Webseite bereit auf: http://");
  Serial.println(WiFi.localIP());
}

void loop() {
  // WLAN Reconnect Logik
  if(WiFi.status() != WL_CONNECTED) {
    delay(1000);
    WiFi.reconnect();
  }
  delay(1000);
}