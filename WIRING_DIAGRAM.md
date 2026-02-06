# Verdrahtungsplan - GrowMonitoringSystem v2.6

> Basierend auf: `firmware/ArduinoVersion/GrowSystem.ino`, `backend/src/config/devices.js`
> Stand: Februar 2026

---

## 1. ESP32 DevKitC - GPIO Pin-Belegung (Gesamtübersicht)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ESP32 DevKitC v4 - Pin Map                      │
├──────────┬──────────────┬───────────────────────────────────────────┤
│  GPIO    │  Typ         │  Funktion                                 │
├──────────┼──────────────┼───────────────────────────────────────────┤
│  GPIO 0  │  ⚠ BOOT      │  Strapping Pin - NICHT verwenden          │
│  GPIO 1  │  ⚠ TX        │  UART TX - NICHT verwenden                │
│  GPIO 2  │  RELAY       │  fan_circulation (Umluft)                 │
│  GPIO 3  │  ⚠ RX        │  UART RX - NICHT verwenden                │
│  GPIO 4  │  RELAY       │  light (Hauptlicht 200W)                  │
│  GPIO 5  │  RELAY       │  fan_exhaust (Abluft 35W)                 │
│  GPIO 6  │  ⛔ FLASH     │  SPI Flash - NICHT verwenden              │
│  GPIO 7  │  ⛔ FLASH     │  SPI Flash - NICHT verwenden              │
│  GPIO 8  │  ⛔ FLASH     │  SPI Flash - NICHT verwenden              │
│  GPIO 9  │  ⛔ FLASH     │  SPI Flash - NICHT verwenden              │
│  GPIO 10 │  ⛔ FLASH     │  SPI Flash - NICHT verwenden              │
│  GPIO 11 │  ⛔ FLASH     │  SPI Flash - NICHT verwenden              │
│  GPIO 12 │  RELAY       │  heater (Heizung 150W)                    │
│  GPIO 13 │  RELAY       │  nutrient_pump (Nährstoff-Pumpe 30W)      │
│  GPIO 14 │  RELAY       │  dehumidifier (Entfeuchter 250W)          │
│  GPIO 15 │  ANALOG IN   │  nutrient_level (Nährstoff-Level)         │
│  GPIO 16 │  RELAY       │  pump_main (Luftbefeuchter 50W)           │
│  GPIO 17 │  RELAY       │  pump_mix (Tank-Pumpe 45W)                │
│  GPIO 18 │  PWM OUT     │  fan_pwm → 0-10V Converter → Abluft      │
│  GPIO 19 │  TACH IN     │  Fan Tachometer (Interrupt, FALLING)      │
│  GPIO 21 │  I2C SDA     │  I2C Datenleitung (alle Sensoren)         │
│  GPIO 22 │  I2C SCL     │  I2C Taktleitung (alle Sensoren)          │
│  GPIO 23 │  PWM OUT     │  light_pwm (RJ11 Grow Light Dimming)      │
│  GPIO 25 │  ANALOG IN   │  tank_level (Wassertank Füllstand)        │
│  GPIO 26 │  ANALOG IN   │  gas_sensor (MQ-135 CO2/Gas)              │
│  GPIO 27 │  DIGITAL OUT │  RJ11 Light Enable (ON/OFF)               │
│  GPIO 32 │  ANALOG IN   │  soil_5 (Bodensensor 5)                   │
│  GPIO 33 │  ANALOG IN   │  soil_6 (Bodensensor 6)                   │
│  GPIO 34 │  ANALOG IN   │  soil_3 (Bodensensor 3) ⚡ Input Only     │
│  GPIO 35 │  ANALOG IN   │  soil_4 (Bodensensor 4) ⚡ Input Only     │
│  GPIO 36 │  ANALOG IN   │  soil_1 (Bodensensor 1) ⚡ Input Only     │
│  GPIO 39 │  ANALOG IN   │  soil_2 (Bodensensor 2) ⚡ Input Only     │
├──────────┴──────────────┴───────────────────────────────────────────┤
│  Belegung: 8× Relay, 2× PWM, 1× Tach, 1× Enable, 9× Analog,      │
│            2× I2C = 23 Pins belegt │ 0 frei (ohne Flash/UART)       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Relay-Modul Verdrahtung (8-Kanal)

```
ESP32 DevKitC                    8-Kanal Relay Modul                              Geräte (230V AC)
═══════════════                  ════════════════════                              ════════════════
                                 ┌──────────────────┐
GPIO 4  ────────────────────────►│ IN1  │ NO1  COM1 │──────────► Hauptlicht         (200W)
GPIO 5  ────────────────────────►│ IN2  │ NO2  COM2 │──────────► Abluft             ( 35W)
GPIO 2  ────────────────────────►│ IN3  │ NO3  COM3 │──────────► Umluft             ( 15W)
GPIO 16 ────────────────────────►│ IN4  │ NO4  COM4 │──────────► Luftbefeuchter     ( 50W)
GPIO 17 ────────────────────────►│ IN5  │ NO5  COM5 │──────────► Pumpe Tank         ( 45W)
GPIO 13 ────────────────────────►│ IN6  │ NO6  COM6 │──────────► Nährstoff-Pumpe    ( 30W)
GPIO 12 ────────────────────────►│ IN7  │ NO7  COM7 │──────────► Heizung            (150W)
GPIO 14 ────────────────────────►│ IN8  │ NO8  COM8 │──────────► Entfeuchter        (250W)
                                 │                  │                               ─────────
VIN 5V  ────────────────────────►│ VCC              │                         Total: 775W max
GND     ────────────────────────►│ GND              │
                                 └──────────────────┘

Legende:
  NO  = Normally Open (Gerät AUS wenn Relay nicht geschaltet)
  COM = Common (an 230V Phase angeschlossen)
  IN  = Signal Input (3.3V von ESP32, LOW = Relay AN bei Active-Low Modul)
```

### Relay-Übersicht

| Kanal | GPIO | Device ID          | Gerät                       | Leistung | Farbe (UI) |
|-------|------|--------------------|-----------------------------|----------|------------|
| CH1   | 4    | `light`            | Samsung LM301H LED          | 200W     | Gelb       |
| CH2   | 5    | `fan_exhaust`      | AC Infinity CloudLine       | 35W      | Blau       |
| CH3   | 2    | `fan_circulation`  | Clip-On Ventilator          | 15W      | Cyan       |
| CH4   | 16   | `pump_main`        | Ultrasonic Humidifier       | 50W      | Emerald    |
| CH5   | 17   | `pump_mix`         | Humidifier Tank Pump        | 45W      | Teal       |
| CH6   | 13   | `nutrient_pump`    | Dosing Pump                 | 30W      | Lila       |
| CH7   | 12   | `heater`           | Ceramic Heater              | 150W     | Rot        |
| CH8   | 14   | `dehumidifier`     | Dehumidifier Pro            | 250W     | Orange     |

---

## 3. I2C Bus Verdrahtung

```
                                     ┌──── 4.7kΩ ────► 3.3V
                                     │
ESP32 GPIO 21 (SDA) ─────────────────┼──────────────────────────────────────────────┐
ESP32 GPIO 22 (SCL) ──────┬──────────┘                                              │
                          │  ┌──── 4.7kΩ ────► 3.3V                                 │
                          │  │                                                       │
                 I2C Bus (SDA/SCL gemeinsam)                                         │
                          │                                                          │
                ┌─────────┼─────────────────────────────────────────────────────┐     │
                │         │                                                     │     │
        ┌───────┴──────┐  │  ┌──────────────┐  ┌──────────────┐                │     │
        │  SHT31 #1    │  │  │  SHT31 #2    │  │   BH1750     │                │     │
        │  (Unten)     │  │  │  (Mitte)     │  │  Lichtsensor  │                │     │
        │  Addr: 0x44  │  │  │  Addr: 0x45  │  │  Addr: 0x23  │                │     │
        │  ADDR → GND  │  │  │  ADDR → VDD  │  │              │                │     │
        └──────────────┘  │  └──────────────┘  └──────────────┘                │     │
                          │                                                     │     │
        ┌─────────────────┴─────────────────┐  ┌──────────────────────────┐     │     │
        │  ENS160 + AHT21 Combo Board       │  │  EZO-EC Sensor           │     │     │
        │  ENS160: 0x53 (eCO2, TVOC, AQI)   │  │  Addr: 0x64              │     │     │
        │  AHT21:  0x38 (Temp-Kompensation)  │  │  (Leitfähigkeit)        │     │     │
        └───────────────────────────────────┘  └──────────────────────────┘     │     │
                                                                                │     │
        ┌──────────────────────────┐                                            │     │
        │  EZO-pH Sensor           │                                            │     │
        │  Addr: 0x63              │                                            │     │
        │  (pH-Wert)               │                                            │     │
        └──────────────────────────┘                                            │     │
                                                                                │     │
        ┌───────────────────────────────────────────────────────────────────────┘     │
        │                                                                             │
        ▼                                                                             │
┌──────────────────────────────────────────────────────────────────────┐               │
│                    TCA9548A I2C Multiplexer                          │               │
│                    Addr: 0x70                                        │               │
│                                                                      │               │
│  ┌─────────────────────────────────────────────────────────────┐     │               │
│  │ CH0 ──► VL53L0X Slot 1 (0x29) │ Pflanzenhöhe Platz 1       │     │               │
│  │ CH1 ──► VL53L0X Slot 2 (0x29) │ Pflanzenhöhe Platz 2       │     │               │
│  │ CH2 ──► VL53L0X Slot 3 (0x29) │ Pflanzenhöhe Platz 3       │     │               │
│  │ CH3 ──► VL53L0X Slot 4 (0x29) │ Pflanzenhöhe Platz 4       │     │               │
│  │ CH4 ──► VL53L0X Slot 5 (0x29) │ Pflanzenhöhe Platz 5       │     │               │
│  │ CH5 ──► VL53L0X Slot 6 (0x29) │ Pflanzenhöhe Platz 6       │     │               │
│  │ CH6 ──► SHT31 #3 Top  (0x44) │ Temp/Humidity Oben          │     │               │
│  │ CH7 ──► (Frei - Erweiterung)  │                             │     │               │
│  └─────────────────────────────────────────────────────────────┘     │               │
└──────────────────────────────────────────────────────────────────────┘               │
                                                                                       │
    Alle I2C Geräte: VCC → 3.3V, GND → GND, SDA/SCL wie oben ────────────────────────┘
```

### I2C Adress-Übersicht

| Gerät              | Adresse | Typ              | Bus            | Notiz                        |
|--------------------|---------|------------------|----------------|------------------------------|
| SHT31-Bottom       | 0x44    | Temp/Humidity    | Direkt         | ADDR Pin → GND               |
| SHT31-Middle       | 0x45    | Temp/Humidity    | Direkt         | ADDR Pin → VDD               |
| BH1750             | 0x23    | Lichtsensor      | Direkt         | Lux-Messung                  |
| ENS160             | 0x53    | Luftqualität     | Direkt         | eCO2, TVOC, AQI (UBA 1-5)   |
| AHT21              | 0x38    | Temp/Humidity    | Direkt         | Kompensation für ENS160      |
| EZO-EC             | 0x64    | Leitfähigkeit    | Direkt         | Atlas Scientific             |
| EZO-pH             | 0x63    | pH-Wert          | Direkt         | Atlas Scientific             |
| TCA9548A           | 0x70    | Multiplexer      | Direkt         | 8 Kanäle                     |
| VL53L0X ×6         | 0x29    | ToF Distanz      | Mux CH0-5      | Montage: 800mm über Topf     |
| SHT31-Top          | 0x44    | Temp/Humidity    | Mux CH6        | Gleiche Addr wie Bottom (OK) |

---

## 4. Analoge Sensoren

```
                              ESP32 ADC
                              ─────────
Bodensensor 1 ──────────────► GPIO 36 (ADC1_CH0)  ┐
Bodensensor 2 ──────────────► GPIO 39 (ADC1_CH3)  │
Bodensensor 3 ──────────────► GPIO 34 (ADC1_CH6)  │  Input-Only Pins
Bodensensor 4 ──────────────► GPIO 35 (ADC1_CH7)  │  (kein Pull-up/down)
Bodensensor 5 ──────────────► GPIO 32 (ADC1_CH4)  │
Bodensensor 6 ──────────────► GPIO 33 (ADC1_CH5)  ┘
Tank Füllstand ─────────────► GPIO 25 (ADC2_CH8)
Gas Sensor (MQ-135) ────────► GPIO 26 (ADC2_CH9)
Nährstoff-Level ────────────► GPIO 15 (ADC2_CH3)
```

| GPIO | ADC Kanal | Sensor              | Typ              | Messbereich     |
|------|-----------|---------------------|------------------|-----------------|
| 36   | ADC1_CH0  | Bodensensor 1       | Kapazitiv        | 0-4095 (12bit)  |
| 39   | ADC1_CH3  | Bodensensor 2       | Kapazitiv        | 0-4095 (12bit)  |
| 34   | ADC1_CH6  | Bodensensor 3       | Kapazitiv        | 0-4095 (12bit)  |
| 35   | ADC1_CH7  | Bodensensor 4       | Kapazitiv        | 0-4095 (12bit)  |
| 32   | ADC1_CH4  | Bodensensor 5       | Kapazitiv        | 0-4095 (12bit)  |
| 33   | ADC1_CH5  | Bodensensor 6       | Kapazitiv        | 0-4095 (12bit)  |
| 25   | ADC2_CH8  | Tank Füllstand      | Wasserstandsensor| 0-4095 → 0-100% |
| 26   | ADC2_CH9  | MQ-135 Gas Sensor   | Halbleitersensor | 0-4095 (CO2/Gas)|
| 15   | ADC2_CH3  | Nährstoff-Level     | Füllstandsensor  | 0-4095 → 0-100% |

> **Hinweis:** GPIO 34, 35, 36, 39 sind **Input-Only** und haben keine internen Pull-up/Pull-down Widerstände.

---

## 5. PWM-Steuerung & Tachometer

### 5a. Abluftfilter (0-10V PWM)

```
ESP32                     PWM-to-0-10V Converter              Abluftfilter
═════                     ═══════════════════════              ════════════

GPIO 18 (PWM) ──────────► PWM IN                              ┌──────────────────┐
                          │                                    │ Pin 1 (Rot): VCC  │
GND ─────────────────────► GND                                 │ Pin 2 (Schwarz): GND
                          │              0-10V OUT ───────────►│ Pin 3 (Gelb): PWM │
12V DC ──────────────────► VCC                                 │ Pin 4 (Weiß): FG  │
                                                               └────────┬─────────┘
                                                                        │
                                                            Tachometer-Signal
                                                                        │
                                                           (opt. Optokoppler)
                                                                        │
ESP32 GPIO 19 (INPUT_PULLUP) ◄──────────────────────────────────────────┘
```

**PWM Konfiguration:**
- Frequenz: 25 kHz
- Auflösung: 8-bit (0-255)
- API: 0-100% → `map(percent, 0, 100, 0, 255)`
- Output: 0-10V (via Converter-Modul)

**Tachometer:**
- Signal: 2 Pulse pro Umdrehung (Standard PC-Lüfter)
- Interrupt: `FALLING` edge
- Berechnung: `RPM = (Pulse × 60) / 2` (jede Sekunde)

### 5b. RJ11 Grow Light (PWM Dimming)

```
ESP32                          RJ11 Buchse / Breakout           Grow Light
═════                          ═══════════════════════           ══════════

GPIO 23 (PWM) ────────────────► Pin 3 (Signal/Data 1) ────────► Dimming Input
GPIO 27 (Enable) ────────────► über Relay/MOSFET ─────────────► Power ON/OFF
GND ──────────────────────────► Pin 2 (GND) ───────────────────► GND
```

**RJ11 Pinout (6P6C):**
```
┌─────────────────────────┐
│ Pin 1: nicht belegt      │
│ Pin 2: GND               │
│ Pin 3: Signal (PWM) ◄── GPIO 23
│ Pin 4: Signal 2          │
│ Pin 5: nicht belegt      │
│ Pin 6: nicht belegt      │
└─────────────────────────┘
```

**Enable-Logik:**
- `GPIO 27 = HIGH` → Light eingeschaltet (PWM aktiv)
- `GPIO 27 = LOW` → Light ausgeschaltet (kein Strom)

---

## 6. ESP32-CAM (Separater ESP32)

> Dies ist ein **zweiter, eigenständiger ESP32** (AI-Thinker ESP32-CAM Modul) mit eigenem WiFi und eigener Stromversorgung.

```
┌─────────────────────────────────────────┐
│          ESP32-CAM (AI-Thinker)          │
│                                          │
│  Kamera: OV2640                          │
│  Auflösung: bis 1600×1200 (UXGA)        │
│  Stream: MJPEG über HTTP Port 80         │
│  Timelapse: Upload alle 60s zum Backend  │
│                                          │
│  Kamera-Pins (fest verdrahtet):          │
│  ──────────────────────────────          │
│  PWDN:  GPIO 32    XCLK:  GPIO 0        │
│  SIOD:  GPIO 26    SIOC:  GPIO 27        │
│  Y2-Y9: GPIO 5,18,19,21,36,39,34,35     │
│  VSYNC: GPIO 25    HREF:  GPIO 23        │
│  PCLK:  GPIO 22                          │
│                                          │
│  LED Flash:     GPIO 4  (eingebaut)      │
│  LED Builtin:   GPIO 33 (optional)       │
│                                          │
│  ⚠ GPIO 0 muss beim Upload LOW sein!    │
└─────────────────────────────────────────┘

Verbindung zum Backend:
  WiFi ──► 192.168.2.169:3000/api/timelapse/upload
  Kamera-ID: "cam1"
```

---

## 7. Stromversorgung

```
┌────────────────────────────────────────────────────────────────┐
│                      Stromversorgungsplan                       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  USB 5V / Netzteil                                             │
│  ─────────────────                                             │
│  5V ────┬──► ESP32 VIN (Hauptversorgung)                       │
│         └──► 8-Kanal Relay Modul VCC                           │
│                                                                │
│  3.3V (ESP32 intern)                                           │
│  ───────────────────                                           │
│  3.3V ──┬──► Alle I2C Sensoren (VCC)                           │
│         ├──► I2C Pull-up Widerstände (4.7kΩ)                   │
│         └──► Kapazitive Bodensensoren (VCC)                    │
│                                                                │
│  12V DC Netzteil (separat)                                     │
│  ─────────────────────────                                     │
│  12V ───┬──► PWM-to-0-10V Converter (VCC)                      │
│         └──► Abluftfilter Pin 1 (VCC +10VDC)                   │
│                                                                │
│  230V AC (über Relay-Modul geschaltet)                         │
│  ─────────────────────────────────────                         │
│  Phase ──► Relay COM ──► Relay NO ──► Gerät ──► Neutralleiter  │
│                                                                │
│  ⚠ MAXIMALE LAST: 775W (alle Relays gleichzeitig)             │
│  ⚠ Empfehlung: 10A Sicherung auf Relay-Seite                  │
│                                                                │
│  ESP32-CAM (separater USB 5V)                                  │
│  ─────────────────────────────                                 │
│  5V USB ──► ESP32-CAM 5V                                       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Leistungsübersicht

| Gerät                    | Max. Leistung | Versorgung |
|--------------------------|---------------|------------|
| Hauptlicht (LED)         | 200W          | 230V AC    |
| Abluft (CloudLine)       | 35W           | 230V AC    |
| Umluft (Clip-On)         | 15W           | 230V AC    |
| Luftbefeuchter           | 50W           | 230V AC    |
| Pumpe Tank               | 45W           | 230V AC    |
| Nährstoff-Pumpe          | 30W           | 230V AC    |
| Heizung (Keramik)        | 150W          | 230V AC    |
| Entfeuchter              | 250W          | 230V AC    |
| **Gesamt (alle an)**     | **775W**      |            |
| RJ11 Grow Light (PWM)    | ~150W         | Separat    |
| Fan PWM (0-10V)          | ~35W          | 12V DC     |

---

## 8. MQTT Netzwerk

```
┌──────────────┐         WiFi (2.4 GHz)          ┌─────────────────────┐
│   ESP32      │ ◄──────────────────────────────► │  MQTT Broker        │
│   DevKitC    │                                  │  192.168.2.169:1883 │
│              │   Publish: grow_drexl_v2/data    │  (CasaOS Server)    │
│              │   Subscribe: grow_drexl_v2/command│                     │
│              │   Subscribe: grow_drexl_v2/config │                     │
└──────────────┘                                  └─────────┬───────────┘
                                                            │
┌──────────────┐         WiFi (2.4 GHz)                     │
│  ESP32-CAM   │ ◄─────────────────────────────────────────►│
│  (cam1)      │   HTTP POST: /api/timelapse/upload         │
│              │   MJPEG Stream: :80/stream                  │
└──────────────┘                                  ┌─────────┴───────────┐
                                                  │  Node.js Backend    │
                                                  │  192.168.2.169:3000 │
                                                  │  + MongoDB          │
                                                  │  + Socket.IO        │
                                                  └─────────────────────┘
```

### MQTT Topics

| Topic                              | Richtung       | Inhalt                              |
|------------------------------------|----------------|-------------------------------------|
| `grow_drexl_v2/data`               | ESP → Backend  | Sensordaten (JSON, alle 5s)         |
| `grow_drexl_v2/config`             | Backend → ESP  | Konfigurationsänderungen            |
| `grow_drexl_v2/command`            | Backend → ESP  | Relay/PWM Steuerbefehle             |
| `grow/esp32/nutrients/command`     | Backend → ESP  | Nährstoff-Pumpen-Befehle            |
| `grow/esp32/nutrients/status`      | ESP → Backend  | Pumpen-Status (läuft/fertig)        |
| `grow/esp32/nutrients/sensors`     | ESP → Backend  | EC/pH/Level Sensordaten             |

### Sensor-Datenpaket (JSON, alle 5 Sekunden)

```json
{
  "temp_bottom": 23.5,      "humidity_bottom": 55.2,
  "temp_middle": 24.1,      "humidity_middle": 52.8,
  "temp_top": 25.0,         "humidity_top": 48.5,
  "temp": 24.2,             "humidity": 52.2,
  "lux": 35000,
  "tankLevel": 78,
  "gasValue": 420,
  "soil": [650, 720, 680, 710, 695, 730],
  "fanPWM": 65,             "lightPWM": 80,
  "fanRPM": 1250,
  "rj11Enabled": true,
  "plantHeights": [120, 145, 130, 155, 140, 135],
  "eco2": 650,              "tvoc": 120,
  "aqi": 2,
  "aht_temp": 23.8,         "aht_humidity": 54.1
}
```

---

## 9. Wichtige Warnhinweise

```
⚠️  SICHERHEITSHINWEISE
════════════════════════

1. SPANNUNGSPEGEL
   • ESP32 GPIOs sind NICHT 5V-tolerant (max. 3.3V Input!)
   • Für 5V/12V Signale: Level Shifter verwenden
   • Tachometer-Signal über Optokoppler (PC817) entkoppeln

2. STROMBELASTUNG
   • ESP32 GPIO max. 12mA pro Pin
   • Für höhere Lasten: MOSFET oder Relay verwenden
   • Gesamt max. 1200mA über alle GPIOs

3. INPUT-ONLY PINS
   • GPIO 34, 35, 36, 39 können NUR als Input verwendet werden
   • Diese Pins haben KEINE internen Pull-up/Pull-down Widerstände
   • Externe Pull-Widerstände ggf. erforderlich

4. STRAPPING PINS
   • GPIO 0: Boot-Modus (LOW = Download, HIGH = Normal)
   • GPIO 2: Muss beim Boot LOW sein
   • GPIO 12: Beeinflusst Flash-Spannung (nicht auf HIGH beim Boot!)
   • GPIO 15: Muss beim Boot HIGH sein (UART Logging)

5. I2C BUS
   • Pull-up Widerstände: 4.7kΩ an SDA und SCL zu 3.3V
   • Maximale Buslänge: ~1m (bei 100kHz)
   • Bei langen Kabeln: I2C Bus Extender verwenden

6. RELAY-MODUL (230V)
   • ⚡ LEBENSGEFAHR bei Arbeiten an 230V!
   • Nur von Fachpersonal anschließen lassen
   • Schutzleiter (PE) immer durchschleifen
   • Sicherung (10A) vor dem Relay-Modul vorsehen

7. PWM-CONVERTER
   • ESP32 PWM (3.3V) → Converter → 0-10V Output
   • Converter benötigt separate 12V Versorgung
   • Ohne Converter: Abluftfilter bekommt falsches Signal!

8. EMI-SCHUTZ
   • Optokoppler für Motor-Signale (Tachometer)
   • Ferritperlen an langen Sensor-Kabeln
   • Relais-Entstördioden ggf. nachrüsten
```

---

## 10. Komplettübersicht als Blockdiagramm

```
                                    ┌──────────────────────────────────┐
                                    │         CasaOS Server            │
                                    │      192.168.2.169               │
                                    │  ┌────────────────────────────┐  │
                                    │  │ Node.js Backend :3000      │  │
                                    │  │ MongoDB                    │  │
                                    │  │ MQTT Broker :1883          │  │
                                    │  └────────────┬───────────────┘  │
                                    └───────────────┼──────────────────┘
                                                    │ WiFi
                           ┌────────────────────────┼────────────────────────┐
                           │                        │                        │
                    ┌──────┴──────┐          ┌──────┴──────┐          ┌──────┴──────┐
                    │  Frontend   │          │   ESP32     │          │  ESP32-CAM  │
                    │  (Browser)  │          │  DevKitC    │          │  (cam1)     │
                    │  React App  │          │             │          │  OV2640     │
                    └─────────────┘          └──────┬──────┘          └─────────────┘
                                                    │
                    ┌───────────────────────────────┬┼──────────────────────────────┐
                    │                               ││                              │
            ┌───────┴───────┐               ┌───────┴┴───────┐            ┌────────┴────────┐
            │  8× Relays    │               │   I2C Bus      │            │  Analog Inputs  │
            │  (230V AC)    │               │  (GPIO 21/22)  │            │  (ADC 12-bit)   │
            ├───────────────┤               ├────────────────┤            ├─────────────────┤
            │ Hauptlicht    │               │ 3× SHT31      │            │ 6× Bodensensor  │
            │ Abluft        │               │ 1× BH1750     │            │ 1× Tank Level   │
            │ Umluft        │               │ 1× ENS160     │            │ 1× Gas (MQ-135) │
            │ Befeuchter    │               │ 1× AHT21      │            │ 1× Nährstoff-Lvl│
            │ Pumpe Tank    │               │ 1× EZO-EC     │            └─────────────────┘
            │ Nährstoff     │               │ 1× EZO-pH     │
            │ Heizung       │               │ 1× TCA9548A   │       ┌─────────────────────┐
            │ Entfeuchter   │               │   └─ 6× VL53L0X│      │  PWM Ausgänge       │
            └───────────────┘               └────────────────┘       ├─────────────────────┤
                                                                     │ GPIO 18 → Fan 0-10V │
                                                                     │ GPIO 23 → Light PWM │
                                                                     │ GPIO 27 → Light EN  │
                                                                     │ GPIO 19 ← Fan Tach  │
                                                                     └─────────────────────┘
```
