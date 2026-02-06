/*
 * GROW MONITORING SYSTEM v2.6 - 3x SHT31 SENSOREN
 * Für Arduino IDE mit ESP32 Core 3.0+
 *
 * NEUE FEATURES:
 * - 3 SHT31 Sensoren für Höhenverteilung (Unten/Mitte/Oben)
 * - Durchschnittsberechnung im ESP32 (filtert 0-Werte)
 * - Bessere Klimaüberwachung
 * - I2C auf Standard Pins (21/22) wiederhergestellt
 *
 * Benötigte Bibliotheken:
 * - PubSubClient (für MQTT)
 * - ArduinoJson (v7 kompatibel)
 * - Adafruit SHT31
 * - BH1750
 * - VL53L0X (Pololu) - ToF Distanz-Sensoren für Pflanzenhöhe
 * - ScioSense_ENS160 - Luftqualität (eCO2, TVOC, AQI)
 * - Adafruit AHTX0 - AHT21 Temperatur & Luftfeuchtigkeit
 *
 * HARDWARE SETUP FÜR 3 SHT31 SENSOREN:
 * I2C Bus: GPIO 21 (SDA), GPIO 22 (SCL)
 *
 * Option 1 (Empfohlen): 2 Sensoren auf Standard I2C Bus
 *   - SHT31 #1 (Unten): Adresse 0x44 (ADDR Pin auf GND)
 *   - SHT31 #2 (Mitte): Adresse 0x45 (ADDR Pin auf VDD)
 *   - SHT31 #3 (Oben): Benötigt I2C Multiplexer (TCA9548A) ODER zweiten I2C Bus
 *
 * Option 2: Zweiter I2C Bus (Wire1)
 *   - ESP32 unterstützt 2 I2C Busse (Wire und Wire1)
 *   - Wire1.begin(SDA_PIN, SCL_PIN) für dritten Sensor
 *   - Dann: sht31_top.begin(0x44, &Wire1)
 *
 * Option 3: I2C Multiplexer TCA9548A
 *   - Alle 3 Sensoren können Adresse 0x44 verwenden
 *   - Multiplexer wählt aktiven Sensor aus
 *
 * PIN ÄNDERUNGEN (v2.6):
 * - Nährstoff-Pumpe: Pin 21 → Pin 13
 * - Level-Sensor: Pin 22 → Pin 15
 * - I2C jetzt auf Standard Pins (21/22)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <esp_task_wdt.h>   // Hardware Watchdog Timer
#include <Wire.h>
#include <Adafruit_SHT31.h>
#include <BH1750.h>
#include <ArduinoJson.h>
#include <VL53L0X.h>
#include <ScioSense_ENS160.h>   // ENS160 Luftqualitäts-Sensor (eCO2, TVOC, AQI)
#include <Adafruit_AHTX0.h>     // AHT21 Temperatur & Luftfeuchtigkeit

// ==========================================
// 1. KONFIGURATION
// ==========================================
const char* WIFI_SSID = "WLAN-915420";
const char* WIFI_PASSWORD = "78118805138223696181";

// MQTT Broker auf CasaOS Server (192.168.2.169)
const char* MQTT_SERVER = "192.168.2.169";
const int MQTT_PORT = 1883;

// EINZIGARTIGE TOPICS (MÜSSEN MIT BACKEND ÜBEREINSTIMMEN)
const char* MQTT_TOPIC_DATA = "grow_drexl_v2/data";
const char* MQTT_TOPIC_CONFIG = "grow_drexl_v2/config";
const char* MQTT_TOPIC_COMMAND = "grow_drexl_v2/command";

// NÄHRSTOFF-TOPICS
const char* MQTT_TOPIC_NUTRIENT_CMD = "grow/esp32/nutrients/command";
const char* MQTT_TOPIC_NUTRIENT_STATUS = "grow/esp32/nutrients/status";
const char* MQTT_TOPIC_NUTRIENT_SENSORS = "grow/esp32/nutrients/sensors";

// ==========================================
// 2. PIN DEFINITIONEN
// ==========================================
// WICHTIG: Pin 21 & 22 sind für I2C reserviert!
// I2C: SDA = GPIO 21, SCL = GPIO 22

// Analog Sensoren (Input Only Pins)
const int PINS_SOIL_MOISTURE[6] = { 36, 39, 34, 35, 32, 33 }; // Bodenfeuchtigkeit 1-6
#define PIN_TANK_LEVEL 25        // Wassertank Füllstand
#define PIN_GAS_SENSOR 26        // CO2/Gas Sensor (MQ-135)

// Relais Pins (ON/OFF)
#define PIN_PUMP_1 16            // Pumpe Gruppe 1 (Pflanzen 1-3)
#define PIN_PUMP_2 17            // Pumpe Gruppe 2 (Pflanzen 4-6)
#define PIN_LIGHT 4              // Hauptlicht (ON/OFF)
#define PIN_FAN 5                // Abluft (ON/OFF)
#define PIN_FAN_CIRCULATION 2    // Umluft (ON/OFF)
#define PIN_HEATER 12            // Heizung (ON/OFF)
#define PIN_DEHUMIDIFIER 14      // Entfeuchter (ON/OFF)

// PWM Pins (Erweiterte Steuerung)
#define PIN_FAN_PWM 18       // PWM für Abluftfilter (zu 0-10V Converter)
#define PIN_FAN_TACH 19      // Tachometer Input (FG Signal)

// RJ11 Grow Light Pins
#define PIN_RJ11_PWM 23      // PWM Dimming
#define PIN_RJ11_ENABLE 27   // Enable/Disable

// Nährstoff-Pumpe (auf freie Pins verlegt)
#define PIN_NUTRIENT_PUMP 13     // Relais für Nährstoff-Pumpe (vorher 21)
#define PIN_LEVEL_SENSOR 15      // Analog-Füllstands-Sensor (vorher 22)

// I2C Bus Pins (Standard für ESP32)
// SDA = GPIO 21 (jetzt wieder frei für I2C!)
// SCL = GPIO 22 (jetzt wieder frei für I2C!) 

// ==========================================
// 3. OBJEKTE & GLOBALE VARIABLEN
// ==========================================
WiFiClient espClient;
PubSubClient client(espClient);

// 3 SHT31 Sensoren für Höhenverteilung (Unten, Mitte, Oben)
// I2C Adressen: 0x44, 0x45 (Standard), weitere mit ADDR Pin Konfiguration
Adafruit_SHT31 sht31_bottom = Adafruit_SHT31();  // Sensor Unten (0x44)
Adafruit_SHT31 sht31_middle = Adafruit_SHT31();  // Sensor Mitte  (0x45)
Adafruit_SHT31 sht31_top = Adafruit_SHT31();     // Sensor Oben   (0x44 auf zweitem I2C Bus oder anderer Adresse)

// Status-Flags für SHT31 Sensoren (verhindert Crash bei nicht initialisierten Sensoren)
bool sht31_bottom_ok = false;
bool sht31_middle_ok = false;
bool sht31_top_ok = false;

BH1750 lightMeter;

// ENS160 + AHT21 Luftqualitäts-Sensor (Combo Board)
// Direkt auf I2C Bus (kein Multiplexer nötig)
// ENS160: 0x53 (Combo Board Default), AHT21: 0x38
ScioSense_ENS160 ens160(ENS160_I2CADDR_1);  // 0x53
Adafruit_AHTX0 aht21;
bool ens160_ok = false;
bool aht21_ok = false;

// ==========================================
// TCA9548A I2C MULTIPLEXER + VL53L0X ToF SENSOREN
// ==========================================
#define TCA9548A_ADDR 0x70

// 6x VL53L0X für Pflanzenhöhen-Messung
#define NUM_TOF_SENSORS 6
VL53L0X tofSensors[NUM_TOF_SENSORS];
bool tofSensorOk[NUM_TOF_SENSORS] = {false};
int plantHeight_mm[NUM_TOF_SENSORS] = {0};  // Berechnete Pflanzenhöhe in mm

// Montage-Höhe: Abstand Sensor → Topf-Oberfläche in mm
// MUSS nach Installation kalibriert werden!
// Kann auch als Array definiert werden falls Sensoren auf unterschiedlichen Höhen
int TOF_MOUNT_HEIGHT_MM[NUM_TOF_SENSORS] = {800, 800, 800, 800, 800, 800};

// TCA9548A Channel-Zuordnung
// Ch 0-5: VL53L0X Sensoren (Pflanze 1-6)
// Ch 6:   SHT31-Top (0x44)
// Ch 7:   Frei (Erweiterung, z.B. VL53L1X)

unsigned long lastMsg = 0;
#define MSG_INTERVAL 5000

// PWM Konfiguration
#define PWM_FREQ 25000        // 25 kHz PWM Frequenz
#define PWM_RESOLUTION 8      // 8-bit (0-255)

// HINWEIS: In ESP32 Core 3.0 werden "Channels" nicht mehr manuell definiert.
// Wir nutzen direkt die Pins. Die Definitionen für PWM_CHANNEL_... wurden entfernt.

// Aktuelle PWM Werte (0-100%)
int fanPWMValue = 0;
int lightPWMValue = 0;

// Tachometer
volatile unsigned long fanTachPulses = 0;
unsigned long lastTachCheck = 0;
int fanRPM = 0;

// Nährstoff-Pumpen-Variablen
bool nutrientPumpRunning = false;
unsigned long nutrientPumpStartTime = 0;
unsigned long nutrientPumpDuration = 0;
float totalDosed_ml = 0;
#define DEFAULT_FLOW_RATE 100    // ml/min (muss kalibriert werden!)

// Sensor-Werte (simuliert wenn keine Sensoren vorhanden)
float currentEC = 0.0;
float currentPH = 0.0;
int reservoirLevel_percent = 100;

// ==========================================
// 4. FUNKTIONEN
// ==========================================

// Tachometer Interrupt Handler
void IRAM_ATTR tachISR() {
  // FIX: Warnung bei volatile ++ behoben
  fanTachPulses = fanTachPulses + 1;
}

// PWM Wert setzen (0-100%)
void setFanPWM(int percent) {
  fanPWMValue = constrain(percent, 0, 100);
  int dutyCycle = map(fanPWMValue, 0, 100, 0, 255);
  
  // FIX: Nutzung von PIN statt CHANNEL (ESP32 v3.0)
  ledcWrite(PIN_FAN_PWM, dutyCycle);
  
  Serial.print("Fan PWM gesetzt: ");
  Serial.print(fanPWMValue);
  Serial.println("%");
}

// RJ11 Light PWM setzen (0-100%)
void setLightPWM(int percent) {
  lightPWMValue = constrain(percent, 0, 100);
  int dutyCycle = map(lightPWMValue, 0, 100, 0, 255);
  
  // FIX: Nutzung von PIN statt CHANNEL (ESP32 v3.0)
  ledcWrite(PIN_RJ11_PWM, dutyCycle);
  
  Serial.print("Light PWM gesetzt: ");
  Serial.print(lightPWMValue);
  Serial.println("%");
}

// RJ11 Light Enable/Disable
void setLightEnable(bool enabled) {
  digitalWrite(PIN_RJ11_ENABLE, enabled ? HIGH : LOW);
  Serial.print("RJ11 Light: ");
  Serial.println(enabled ? "ENABLED" : "DISABLED");
}

// ==========================================
// TCA9548A MULTIPLEXER FUNKTIONEN
// ==========================================

// I2C Multiplexer Channel auswählen
void tcaSelect(uint8_t channel) {
  if (channel > 7) return;
  Wire.beginTransmission(TCA9548A_ADDR);
  Wire.write(1 << channel);
  Wire.endTransmission();
}

// Alle Channels deaktivieren (verhindert Bus-Konflikte)
void tcaDisable() {
  Wire.beginTransmission(TCA9548A_ADDR);
  Wire.write(0);
  Wire.endTransmission();
}

// Pflanzenhöhen via VL53L0X ToF Sensoren messen
void readPlantHeights() {
  for (int i = 0; i < NUM_TOF_SENSORS; i++) {
    if (!tofSensorOk[i]) {
      plantHeight_mm[i] = -1;  // Sensor nicht verfügbar
      continue;
    }

    tcaSelect(i);
    delay(5);

    int distance = tofSensors[i].readRangeContinuousMillimeters();

    if (tofSensors[i].timeoutOccurred() || distance > 2000 || distance <= 0) {
      plantHeight_mm[i] = -1;  // Ungültige Messung
    } else {
      // Pflanzenhöhe = Montage-Höhe minus gemessene Distanz
      plantHeight_mm[i] = TOF_MOUNT_HEIGHT_MM[i] - distance;
      if (plantHeight_mm[i] < 0) plantHeight_mm[i] = 0;
    }
  }
  tcaDisable();
}

// RPM aus Tachometer berechnen
void updateFanRPM() {
  unsigned long now = millis();
  if (now - lastTachCheck >= 1000) { // Jede Sekunde
    // Annahme: 2 Pulse pro Umdrehung (typisch für PC-Lüfter)
    fanRPM = (fanTachPulses * 60) / 2;
    fanTachPulses = 0;
    lastTachCheck = now;
  }
}

// ==========================================
// NÄHRSTOFF-PUMPEN FUNKTIONEN
// ==========================================

// Sensoren lesen (simuliert - später durch echte Sensoren ersetzen)
void readNutrientSensors() {
  // Füllstands-Sensor (Analog 0-4095)
  int levelRaw = analogRead(PIN_LEVEL_SENSOR);
  reservoirLevel_percent = map(levelRaw, 0, 4095, 0, 100);

  // EC/pH simuliert (später: Atlas Scientific Integration)
  currentEC = 1.2 + random(-10, 10) / 100.0;
  currentPH = 6.0 + random(-5, 5) / 100.0;
}

// Nährstoff-Pumpe starten
void startNutrientPump() {
  digitalWrite(PIN_NUTRIENT_PUMP, HIGH);
  nutrientPumpRunning = true;
  nutrientPumpStartTime = millis();

  Serial.println("▶ Nährstoff-Pumpe GESTARTET");

  // Status publishen
  JsonDocument doc;
  doc["status"] = "dosing";
  doc["pumpRunning"] = true;
  doc["timestamp"] = millis();

  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(MQTT_TOPIC_NUTRIENT_STATUS, buffer);
}

// Nährstoff-Pumpe stoppen
void stopNutrientPump() {
  digitalWrite(PIN_NUTRIENT_PUMP, LOW);
  nutrientPumpRunning = false;

  unsigned long elapsed = millis() - nutrientPumpStartTime;
  float dosed_ml = (elapsed / 1000.0 / 60.0) * DEFAULT_FLOW_RATE;
  totalDosed_ml += dosed_ml;

  Serial.printf("■ Nährstoff-Pumpe GESTOPPT (%.1f ml dosiert)\n", dosed_ml);

  // Status publishen
  JsonDocument doc;
  doc["status"] = "idle";
  doc["pumpRunning"] = false;
  doc["timestamp"] = millis();

  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(MQTT_TOPIC_NUTRIENT_STATUS, buffer);
}

// Dosierungs-Command verarbeiten
void handleNutrientDoseCommand(JsonDocument& doc) {
  Serial.println("=== Nährstoff-Dosierungs-Command empfangen ===");

  // Sicherheits-Check: Pumpe läuft bereits?
  if (nutrientPumpRunning) {
    Serial.println("✗ Pumpe läuft bereits!");
    JsonDocument errorDoc;
    errorDoc["status"] = "error";
    errorDoc["error"] = "Pump already running";
    char buffer[256];
    serializeJson(errorDoc, buffer);
    client.publish(MQTT_TOPIC_NUTRIENT_STATUS, buffer);
    return;
  }

  // Parameter extrahieren
  JsonArray dosageArray = doc["dosage"];
  if (dosageArray.size() == 0) {
    Serial.println("✗ Keine Dosierungs-Daten!");
    return;
  }

  JsonObject firstDosage = dosageArray[0];
  float volume_ml = firstDosage["volume_ml"] | 0;
  int flowRate = firstDosage["flowRate_ml_per_min"] | DEFAULT_FLOW_RATE;

  Serial.printf("Volumen: %.1f ml, Flow-Rate: %d ml/min\n", volume_ml, flowRate);

  // Validierung
  if (volume_ml <= 0 || volume_ml > 1000) {
    Serial.println("✗ Ungültiges Volumen!");
    return;
  }

  // Sensor-Werte VOR Dosierung messen (für spätere Verwendung)
  readNutrientSensors();

  // Dauer berechnen
  float duration_seconds = (volume_ml / (float)flowRate) * 60.0;
  nutrientPumpDuration = (unsigned long)(duration_seconds * 1000);

  Serial.printf("Berechnete Dauer: %.1f Sekunden\n", duration_seconds);

  // Pumpe starten
  startNutrientPump();

  // Warten bis fertig (non-blocking über loop)
  // Die loop() prüft ob nutrientPumpDuration abgelaufen ist
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Verbinde mit WLAN: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWLAN verbunden!");
  Serial.print("IP-Adresse: ");
  Serial.println(WiFi.localIP());
  Serial.print("Verbinde zu MQTT Broker: ");
  Serial.println(MQTT_SERVER);
}

void callback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (int i = 0; i < length; i++) message += (char)payload[i];
  
  Serial.print("Nachricht auf ["); Serial.print(topic); Serial.print("]: ");
  Serial.println(message);

  // ArduinoJson v7 Syntax
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, message);

  if (!error) {
    // Haupt-System Commands
    if (String(topic) == MQTT_TOPIC_COMMAND) {
      const char* action = doc["action"];
      if (action) {
        if (strcmp(action, "reboot") == 0) {
          Serial.println("REBOOT BEFEHL ERHALTEN!");
          ESP.restart();
        }
        else if (strcmp(action, "set_relay") == 0) {
          const char* relay = doc["relay"];
          bool state = doc["state"];

          int pinToSwitch = -1;

          if (strcmp(relay, "light") == 0) pinToSwitch = PIN_LIGHT;
          else if (strcmp(relay, "fan_exhaust") == 0) pinToSwitch = PIN_FAN;
          else if (strcmp(relay, "fan_circulation") == 0) pinToSwitch = PIN_FAN_CIRCULATION;
          else if (strcmp(relay, "pump_main") == 0) pinToSwitch = PIN_PUMP_1;
          else if (strcmp(relay, "pump_mix") == 0) pinToSwitch = PIN_PUMP_2;
          else if (strcmp(relay, "nutrient_pump") == 0) pinToSwitch = PIN_NUTRIENT_PUMP;
          else if (strcmp(relay, "heater") == 0) pinToSwitch = PIN_HEATER;
          else if (strcmp(relay, "dehumidifier") == 0) pinToSwitch = PIN_DEHUMIDIFIER;

          if (pinToSwitch != -1) {
            digitalWrite(pinToSwitch, state ? HIGH : LOW);
            Serial.print("Relais geschaltet: ");
            Serial.print(relay);
            Serial.print(" -> ");
            Serial.println(state ? "AN" : "AUS");
          }
        }
        else if (strcmp(action, "set_fan_pwm") == 0) {
          int pwmValue = doc["value"];
          setFanPWM(pwmValue);
        }
        else if (strcmp(action, "set_light_pwm") == 0) {
          int pwmValue = doc["value"];
          setLightPWM(pwmValue);
        }
        else if (strcmp(action, "set_light_enable") == 0) {
          bool enabled = doc["enabled"];
          setLightEnable(enabled);
        }
      }
    }

    // Nährstoff-Pumpen Commands
    else if (String(topic) == MQTT_TOPIC_NUTRIENT_CMD) {
      const char* action = doc["action"];
      if (action) {
        if (strcmp(action, "dose") == 0) {
          handleNutrientDoseCommand(doc);
        }
        else if (strcmp(action, "stop") == 0) {
          if (nutrientPumpRunning) {
            stopNutrientPump();
          }
        }
        else if (strcmp(action, "measure") == 0) {
          readNutrientSensors();
          // Sensor-Daten publishen
          JsonDocument sensorDoc;
          sensorDoc["ec"] = currentEC;
          sensorDoc["ph"] = currentPH;
          sensorDoc["temp"] = sht31_bottom_ok ? sht31_bottom.readTemperature() : 0.0;  // Nutze unteren SHT31 für Reservoir-Temp
          sensorDoc["reservoirLevel_percent"] = reservoirLevel_percent;
          sensorDoc["totalDosed_ml"] = totalDosed_ml;

          char buffer[512];
          serializeJson(sensorDoc, buffer);
          client.publish(MQTT_TOPIC_NUTRIENT_SENSORS, buffer);
          Serial.println("Nährstoff-Sensordaten gesendet");
        }
      }
    }
  }
}

// Non-blocking MQTT Reconnect (blockiert nicht mehr den Loop!)
unsigned long lastReconnectAttempt = 0;
#define RECONNECT_INTERVAL 5000  // 5 Sekunden zwischen Versuchen

void reconnect() {
  // Non-blocking: Nur ein Versuch pro Aufruf, dann zurück zum Loop
  if (client.connected()) return;

  unsigned long now = millis();
  if (now - lastReconnectAttempt < RECONNECT_INTERVAL) return;
  lastReconnectAttempt = now;

  Serial.print("Verbinde mit MQTT...");
  String clientId = "ESP32-Drexl-" + String(random(0xffff), HEX);

  if (client.connect(clientId.c_str())) {
    Serial.println("verbunden!");
    client.subscribe(MQTT_TOPIC_CONFIG);
    client.subscribe(MQTT_TOPIC_COMMAND);
    client.subscribe(MQTT_TOPIC_NUTRIENT_CMD);
    Serial.println("Subscribed: Haupt-System + Nährstoffe");
    lastReconnectAttempt = 0;  // Reset für nächste Trennung
  } else {
    Serial.print("Fehler, rc="); Serial.print(client.state());
    Serial.println(" nächster Versuch in 5s...");
    // KEIN delay() hier! Loop läuft weiter und Sensoren werden gelesen
  }
}

// ==========================================
// 5. SETUP & LOOP
// ==========================================
void setup() {
  Serial.begin(115200);

  // Hardware Watchdog: Auto-Reset nach 30s wenn loop() hängt
  esp_task_wdt_init(30, true);  // 30s Timeout, true = Panic (Auto-Reset)
  esp_task_wdt_add(NULL);       // Aktuellen Task zum Watchdog hinzufügen
  Serial.println("🐕 Hardware Watchdog aktiviert (30s Timeout)");

  // Analog Inputs
  for(int i=0; i<6; i++) pinMode(PINS_SOIL_MOISTURE[i], INPUT);
  pinMode(PIN_TANK_LEVEL, INPUT);
  pinMode(PIN_GAS_SENSOR, INPUT);

  // Relais Outputs (ON/OFF)
  pinMode(PIN_PUMP_1, OUTPUT);
  pinMode(PIN_PUMP_2, OUTPUT);
  pinMode(PIN_LIGHT, OUTPUT);
  pinMode(PIN_FAN, OUTPUT);
  pinMode(PIN_FAN_CIRCULATION, OUTPUT);
  pinMode(PIN_HEATER, OUTPUT);
  pinMode(PIN_DEHUMIDIFIER, OUTPUT);

  // Alle Relais initial ausschalten
  digitalWrite(PIN_PUMP_1, LOW);
  digitalWrite(PIN_PUMP_2, LOW);
  digitalWrite(PIN_LIGHT, LOW);
  digitalWrite(PIN_FAN, LOW);
  digitalWrite(PIN_FAN_CIRCULATION, LOW);
  digitalWrite(PIN_HEATER, LOW);
  digitalWrite(PIN_DEHUMIDIFIER, LOW);

  // Nährstoff-Pumpe (neu)
  pinMode(PIN_NUTRIENT_PUMP, OUTPUT);
  digitalWrite(PIN_NUTRIENT_PUMP, LOW);  // Pumpe aus
  pinMode(PIN_LEVEL_SENSOR, INPUT);      // Füllstands-Sensor

  // === PWM SETUP (FIXED FOR ESP32 CORE 3.0) ===
  
  // 1. Fan PWM Setup
  // Neue Syntax: ledcAttach(pin, freq, resolution)
  if (!ledcAttach(PIN_FAN_PWM, PWM_FREQ, PWM_RESOLUTION)) {
      Serial.println("Fehler beim Fan PWM Setup!");
  }
  ledcWrite(PIN_FAN_PWM, 0); // Start bei 0%

  // 2. Grow Light PWM Setup (Fehlerbehebung)
  // Alte Syntax (ledcSetup/ledcAttachPin) entfernt.
  // Neue Syntax:
  if (!ledcAttach(PIN_RJ11_PWM, PWM_FREQ, PWM_RESOLUTION)) {
      Serial.println("Fehler beim Light PWM Setup!");
  }
  ledcWrite(PIN_RJ11_PWM, 0); // Start bei 0%

  // RJ11 Enable Pin
  pinMode(PIN_RJ11_ENABLE, OUTPUT);
  digitalWrite(PIN_RJ11_ENABLE, LOW); // Start disabled

  // Tachometer Interrupt
  pinMode(PIN_FAN_TACH, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_FAN_TACH), tachISR, FALLING);

  // Sensoren initialisieren
  Serial.println("=== Initialisiere SHT31 Sensoren ===");

  // I2C Bus explizit initialisieren (Standard Pins: SDA=21, SCL=22)
  Wire.begin();
  Serial.println("✅ I2C Bus auf GPIO 21 (SDA) und GPIO 22 (SCL) initialisiert");

  // I2C Scanner - Hilft beim Debugging
  Serial.println("Scanne I2C Bus...");
  byte error, address;
  int nDevices = 0;
  for(address = 1; address < 127; address++ ) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    if (error == 0) {
      Serial.print("I2C Gerät gefunden an Adresse 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
      nDevices++;
    }
  }
  if (nDevices == 0) {
    Serial.println("⚠️ Keine I2C Geräte gefunden!");
  }
  Serial.println();

  // SHT31 #1 (Unten) - Aktuell vorhandener Sensor
  // Versuche beide möglichen Adressen
  if (sht31_bottom.begin(0x44)) {
    Serial.println("✅ SHT31 Unten an Adresse 0x44 bereit");
    sht31_bottom_ok = true;
  } else if (sht31_bottom.begin(0x45)) {
    Serial.println("✅ SHT31 Unten an Adresse 0x45 bereit");
    sht31_bottom_ok = true;
  } else {
    Serial.println("❌ SHT31 Unten (0x44/0x45) nicht gefunden!");
    Serial.println("   → Prüfe Verkabelung: SDA=GPIO21, SCL=GPIO22");
    Serial.println("   → Prüfe 3.3V Versorgung");
    sht31_bottom_ok = false;
  }

  // SHT31 #2 (Mitte) - Optional, für zukünftige Erweiterung
  // WICHTIG: Adresse 0x45 nur wenn nicht bereits von Bottom verwendet!
  if (!sht31_bottom_ok || sht31_middle.begin(0x45)) {
    if (sht31_middle.begin(0x45)) {
      Serial.println("✅ SHT31 Mitte an Adresse 0x45 bereit");
      sht31_middle_ok = true;
    } else {
      Serial.println("ℹ️  SHT31 Mitte: Noch nicht installiert (wird 0.0 senden)");
      sht31_middle_ok = false;
    }
  } else {
    Serial.println("ℹ️  SHT31 Mitte: Adresse 0x45 bereits von Bottom-Sensor belegt");
    sht31_middle_ok = false;
  }

  // ==========================================
  // TCA9548A MULTIPLEXER + SENSOREN INITIALISIEREN
  // ==========================================
  Serial.println("=== Initialisiere TCA9548A Multiplexer ===");

  // Prüfe ob TCA9548A vorhanden ist
  Wire.beginTransmission(TCA9548A_ADDR);
  byte tcaError = Wire.endTransmission();

  if (tcaError == 0) {
    Serial.println("✅ TCA9548A Multiplexer an 0x70 gefunden");

    // SHT31 #3 (Oben) via TCA9548A Channel 6
    tcaSelect(6);
    delay(10);
    if (sht31_top.begin(0x44)) {
      Serial.println("  ✅ SHT31 Oben (Ch 6, 0x44) bereit");
      sht31_top_ok = true;
    } else {
      Serial.println("  ℹ️  SHT31 Oben (Ch 6): Nicht gefunden");
      sht31_top_ok = false;
    }
    tcaDisable();

    // VL53L0X ToF Sensoren auf Channel 0-5 initialisieren
    Serial.println("=== Initialisiere VL53L0X ToF Sensoren ===");
    for (int i = 0; i < NUM_TOF_SENSORS; i++) {
      tcaSelect(i);
      delay(10);

      tofSensors[i].setTimeout(500);
      if (tofSensors[i].init()) {
        // Hohe Genauigkeit: 200ms Timing Budget
        tofSensors[i].setMeasurementTimingBudget(200000);
        tofSensors[i].startContinuous();
        tofSensorOk[i] = true;
        Serial.printf("  ✅ VL53L0X #%d (Ch %d): OK - Pflanze %d\n", i+1, i, i+1);
      } else {
        tofSensorOk[i] = false;
        Serial.printf("  ℹ️  VL53L0X #%d (Ch %d): Nicht gefunden\n", i+1, i);
      }
    }
    tcaDisable();

  } else {
    Serial.println("ℹ️  TCA9548A Multiplexer nicht gefunden (0x70)");
    Serial.println("   → VL53L0X + SHT31-Top deaktiviert");
    sht31_top_ok = false;
    for (int i = 0; i < NUM_TOF_SENSORS; i++) tofSensorOk[i] = false;
  }
  Serial.println();

  if (!lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
    Serial.println("❌ BH1750 Fehler");
  } else {
    Serial.println("✅ BH1750 bereit");
  }

  // ==========================================
  // ENS160 + AHT21 LUFTQUALITÄTS-SENSOR INITIALISIEREN
  // ==========================================
  Serial.println("\n=== Initialisiere ENS160 + AHT21 ===");

  // TCA9548A deaktivieren damit direkte I2C Geräte erreichbar sind
  tcaDisable();
  delay(10);

  // AHT21 zuerst initialisieren (für ENS160 Kompensation)
  if (aht21.begin()) {
    Serial.println("  ✅ AHT21 (0x38) bereit");
    aht21_ok = true;
  } else {
    Serial.println("  ❌ AHT21 (0x38) nicht gefunden!");
    aht21_ok = false;
  }

  // ENS160 initialisieren
  if (ens160.begin()) {
    Serial.println("  ✅ ENS160 (0x53) bereit");
    ens160_ok = true;

    // Standard-Modus setzen (Messung aktiv)
    if (ens160.setMode(ENS160_OPMODE_STD)) {
      Serial.println("  ✅ ENS160 Standard-Modus aktiv");
    }

    // Kompensationswerte von AHT21 setzen (falls verfügbar)
    if (aht21_ok) {
      sensors_event_t hum_event, temp_event;
      aht21.getEvent(&hum_event, &temp_event);
      float ahtTemp = temp_event.temperature;
      float ahtHum = hum_event.relative_humidity;
      if (!isnan(ahtTemp) && !isnan(ahtHum)) {
        ens160.set_envdata(ahtTemp, ahtHum);
        Serial.printf("  ✅ ENS160 Kompensation: %.1f°C, %.1f%%\n", ahtTemp, ahtHum);
      }
    }
  } else {
    Serial.println("  ❌ ENS160 (0x53) nicht gefunden!");
    ens160_ok = false;
  }
  Serial.println();

  setup_wifi();
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setBufferSize(4096);  // Erhöhe MQTT Buffer für große JSON-Nachrichten (alle Sensoren)
  client.setCallback(callback);

  Serial.println("✅ PWM & RJ11 Steuerung initialisiert (Core 3.0)");
}

void loop() {
  // Hardware Watchdog füttern (verhindert Auto-Reset wenn alles OK)
  esp_task_wdt_reset();

  // Non-blocking: reconnect() versucht nur einmal alle 5s, blockiert nicht
  if (!client.connected()) reconnect();
  if (client.connected()) client.loop();

  // RPM kontinuierlich berechnen
  updateFanRPM();

  // Nährstoff-Pumpen-Timer prüfen
  if (nutrientPumpRunning) {
    unsigned long elapsed = millis() - nutrientPumpStartTime;

    if (elapsed >= nutrientPumpDuration) {
      stopNutrientPump();

      // Nach Dosierung: Sensoren messen & Completion-Response senden
      delay(5000);  // 5 Sek warten bis Werte stabil
      readNutrientSensors();

      JsonDocument response;
      response["status"] = "completed";
      response["volume_ml"] = (nutrientPumpDuration / 1000.0 / 60.0) * DEFAULT_FLOW_RATE;
      response["duration_seconds"] = nutrientPumpDuration / 1000.0;
      response["ec"] = currentEC;
      response["ph"] = currentPH;
      response["temp"] = sht31_bottom_ok ? sht31_bottom.readTemperature() : 0.0;  // Nutze unteren SHT31 für Reservoir-Temp

      char buffer[512];
      serializeJson(response, buffer);
      client.publish(MQTT_TOPIC_NUTRIENT_STATUS, buffer);

      Serial.println("=== Dosierung abgeschlossen ===");
    }

    // Progress alle 500ms publishen
    static unsigned long lastProgress = 0;
    if (millis() - lastProgress > 500) {
      JsonDocument progressDoc;
      progressDoc["status"] = "dosing";
      progressDoc["progress_percent"] = (int)((elapsed / (float)nutrientPumpDuration) * 100);
      progressDoc["elapsed_ms"] = elapsed;

      char buffer[256];
      serializeJson(progressDoc, buffer);
      client.publish(MQTT_TOPIC_NUTRIENT_STATUS, buffer);

      lastProgress = millis();
    }
  }

  unsigned long now = millis();
  if (now - lastMsg > MSG_INTERVAL) {
    lastMsg = now;

    // ArduinoJson v7 Syntax
    JsonDocument doc;

    // 3 SHT31 Sensoren auslesen (Höhenverteilung)
    // NUR Sensoren lesen, die erfolgreich initialisiert wurden!
    float t_bottom = sht31_bottom_ok ? sht31_bottom.readTemperature() : NAN;
    float h_bottom = sht31_bottom_ok ? sht31_bottom.readHumidity() : NAN;
    float t_middle = sht31_middle_ok ? sht31_middle.readTemperature() : NAN;
    float h_middle = sht31_middle_ok ? sht31_middle.readHumidity() : NAN;

    // SHT31-Top über TCA9548A Channel 6 lesen
    float t_top = NAN;
    float h_top = NAN;
    if (sht31_top_ok) {
      tcaSelect(6);
      t_top = sht31_top.readTemperature();
      h_top = sht31_top.readHumidity();
      tcaDisable();
    }

    // Sensordaten mit neuen Feldnamen (für Backend Kompatibilität)
    doc["temp_bottom"] = isnan(t_bottom) ? 0.0 : t_bottom;
    doc["humidity_bottom"] = isnan(h_bottom) ? 0.0 : h_bottom;
    doc["temp_middle"] = isnan(t_middle) ? 0.0 : t_middle;
    doc["humidity_middle"] = isnan(h_middle) ? 0.0 : h_middle;
    doc["temp_top"] = isnan(t_top) ? 0.0 : t_top;
    doc["humidity_top"] = isnan(h_top) ? 0.0 : h_top;

    // Durchschnittswerte berechnen
    // Temperatur: > -40 (SHT31 Messbereich: -40 bis +125°C, 0°C ist gültiger Wert!)
    // Humidity: > 0 (0% ist technisch ungültig für SHT31)
    float tempSum = 0.0;
    float humSum = 0.0;
    int tempCount = 0;
    int humCount = 0;

    if (!isnan(t_bottom) && t_bottom > -40) { tempSum += t_bottom; tempCount++; }
    if (!isnan(t_middle) && t_middle > -40) { tempSum += t_middle; tempCount++; }
    if (!isnan(t_top) && t_top > -40) { tempSum += t_top; tempCount++; }

    if (!isnan(h_bottom) && h_bottom > 0) { humSum += h_bottom; humCount++; }
    if (!isnan(h_middle) && h_middle > 0) { humSum += h_middle; humCount++; }
    if (!isnan(h_top) && h_top > 0) { humSum += h_top; humCount++; }

    // Durchschnittswerte für Backend speichern
    doc["temp"] = tempCount > 0 ? (tempSum / tempCount) : 0.0;
    doc["humidity"] = humCount > 0 ? (humSum / humCount) : 0.0;

    // Andere Sensoren
    doc["lux"] = lightMeter.readLightLevel();
    doc["tank"] = analogRead(PIN_TANK_LEVEL);
    doc["gas"] = analogRead(PIN_GAS_SENSOR);

    JsonArray soil = doc["soil"].to<JsonArray>();
    for(int i=0; i<6; i++) {
      soil.add(analogRead(PINS_SOIL_MOISTURE[i]));
    }

    // PWM & RPM Daten hinzufügen
    doc["fanPWM"] = fanPWMValue;
    doc["lightPWM"] = lightPWMValue;
    doc["fanRPM"] = fanRPM;

    // VL53L0X Pflanzenhöhen messen und hinzufügen
    readPlantHeights();
    JsonArray heights = doc["heights"].to<JsonArray>();
    for (int i = 0; i < NUM_TOF_SENSORS; i++) {
      heights.add(plantHeight_mm[i]);  // mm, -1 = ungültig
    }

    // ==========================================
    // ENS160 + AHT21 Luftqualität auslesen
    // ==========================================
    tcaDisable();  // Sicherstellen: direkte I2C Geräte erreichbar
    delay(10);  // I2C Bus braucht Zeit zur Stabilisierung nach MUX-Umschaltung

    float aht21_t = NAN;
    float aht21_h = NAN;

    if (aht21_ok) {
      sensors_event_t hum_event, temp_event;
      aht21.getEvent(&hum_event, &temp_event);
      aht21_t = temp_event.temperature;
      aht21_h = hum_event.relative_humidity;
    }

    // ENS160 Kompensation mit aktuellen AHT21-Werten aktualisieren
    if (ens160_ok && aht21_ok && !isnan(aht21_t) && !isnan(aht21_h)) {
      ens160.set_envdata(aht21_t, aht21_h);
    }

    int ens160_eco2_val = 0;
    int ens160_tvoc_val = 0;
    int ens160_aqi_val = 0;

    if (ens160_ok) {
      if (ens160.measure()) {
        ens160_eco2_val = ens160.geteCO2();
        ens160_tvoc_val = ens160.getTVOC();
        ens160_aqi_val = ens160.getAQI();
      }
    }

    // Air Quality Daten zum JSON hinzufügen
    doc["ens160_eco2"] = ens160_eco2_val;                       // ppm (400-65000)
    doc["ens160_tvoc"] = ens160_tvoc_val;                       // ppb (0-65000)
    doc["ens160_aqi"] = ens160_aqi_val;                         // 1-5 (UBA Skala)
    doc["aht21_temp"] = isnan(aht21_t) ? 0.0 : aht21_t;        // °C
    doc["aht21_humidity"] = isnan(aht21_h) ? 0.0 : aht21_h;    // %

    char buffer[3072];  // Vergrößert für alle Sensoren inkl. ENS160+AHT21
    serializeJson(doc, buffer);

    if(client.publish(MQTT_TOPIC_DATA, buffer)) {
      Serial.print("📡 Daten gesendet: ");
      // Debug-Ausgabe der Durchschnittstemperatur (korrekt berechnet)
      float avgTemp = doc["temp"];
      float avgHum = doc["humidity"];
      if (avgTemp > 0) {
        Serial.print("Temp Ø: ");
        Serial.print(avgTemp, 1);
        Serial.print("°C (");
        Serial.print(t_bottom, 1); Serial.print("/");
        Serial.print(t_middle, 1); Serial.print("/");
        Serial.print(t_top, 1); Serial.print(")");
        Serial.print(" | Hum Ø: ");
        Serial.print(avgHum, 1);
        Serial.println("%");
      } else {
        Serial.println(MQTT_TOPIC_DATA);
      }
    } else {
      Serial.println("❌ Fehler beim Senden");
    }
  }
}