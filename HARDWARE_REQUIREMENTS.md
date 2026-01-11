# Hardware-Anforderungen für PWM-Abluftfilter & RJ11 Grow Light

## 🔌 Benötigte Hardware

### 1. PWM zu 0-10V Converter (Abluftfilter)
**ERFORDERLICH** - ESP32 hat 3.3V Logik, Abluftfilter benötigt 0-10V PWM Signal

**Empfohlene Module:**
- **DAC-Modul MCP4725** (I2C zu 0-5V, mit Op-Amp auf 0-10V erweiterbar)
- **PWM zu 0-10V Converter Modul** (z.B. von Amazon/AliExpress)
  - Beispiel: "PWM to 0-10V Signal Converter Module"
  - Input: 3.3V/5V PWM
  - Output: 0-10V analog

**Anschluss:**
```
ESP32 Pin (z.B. GPIO 18) → PWM Converter Input
PWM Converter Output → Abluftfilter PIN 3 (Gelb/PWM)
ESP32 GND → PWM Converter GND
12V Netzteil → PWM Converter VCC
```

**Spezifikationen Abluftfilter:**
- PIN 1 (Rot): VCC +10VDC - Stromversorgung
- PIN 2 (Black): GND - Ground
- PIN 3 (Gelb): PWM/Vsp 0-10V - PWM Steuersignal
- PIN 4 (Weiß): FG - Fan Ground/Tachometer Feedback (optional)

### 2. RJ11 Kabel & Connector (Grow Light)
**ERFORDERLICH** - Für Grow Light Ansteuerung

**Komponenten:**
- RJ11 Buchse/Stecker (6P6C oder 6P4C)
- RJ11 Kabel
- Breadboard-freundliche RJ11 Breakout Board (optional)

**RJ11 Pinout (Standard):**
```
Pin 1: nicht belegt (oder +12V)
Pin 2: nicht belegt (oder GND)
Pin 3: Signal/Data Line 1
Pin 4: Signal/Data Line 2
Pin 5: nicht belegt
Pin 6: nicht belegt
```

**WICHTIG:** Grow Light Protokoll muss identifiziert werden!
- Möglichkeit 1: PWM Dimming (0-100%)
- Möglichkeit 2: DMX512 Protokoll
- Möglichkeit 3: Proprietäres Protokoll (Herstellerdatenblatt prüfen!)

### 3. Optionale Komponenten

#### 3.1 Level Shifter (falls PWM Converter keinen hat)
- Bi-directional Logic Level Converter (3.3V ↔ 5V/12V)
- Falls direkte Kommunikation zwischen ESP32 und externen Geräten

#### 3.2 Optokoppler für FG Signal
- PC817 Optokoppler
- Zur galvanischen Trennung des Tachometer-Signals
- Verhindert Störungen durch Motor-EMI

#### 3.3 12V Netzteil
- Für PWM-Converter und Abluftfilter
- Empfohlen: 12V/2A Netzteil

### 4. Aktuell verwendete Pins (bereits belegt)

```cpp
// Sensoren
PINS_SOIL_MOISTURE[6] = { 36, 39, 34, 35, 32, 33 }
PIN_TANK_LEVEL = 25
PIN_GAS_SENSOR = 26

// Relais (bereits belegt)
PIN_PUMP_1 = 16
PIN_PUMP_2 = 17
PIN_LIGHT = 4
PIN_FAN = 5
```

### 5. Neue Pins (für PWM & RJ11)

```cpp
// PWM Abluftfilter
PIN_FAN_PWM = 18        // PWM Output (zu PWM-Converter)
PIN_FAN_TACH = 19       // Tachometer Input (FG Signal)

// RJ11 Grow Light
PIN_RJ11_DATA1 = 21     // I2C SDA (falls DMX/I2C Protokoll)
PIN_RJ11_DATA2 = 22     // I2C SCL (falls DMX/I2C Protokoll)
// ODER
PIN_RJ11_PWM = 23       // PWM Signal (falls PWM Dimming)
PIN_RJ11_ENABLE = 27    // Enable/Relay (falls einfache ON/OFF + PWM)
```

## 🛒 Einkaufsliste

| Komponente | Anzahl | Geschätzte Kosten |
|------------|--------|-------------------|
| PWM zu 0-10V Converter | 1 | 10-15€ |
| RJ11 Buchse/Breakout | 1 | 3-5€ |
| RJ11 Kabel | 1 | 2-4€ |
| Optokoppler PC817 | 2 | 1-2€ |
| Level Shifter (optional) | 1 | 2-3€ |
| Jumper Kabel | 10+ | 5€ |

**Gesamtkosten: ca. 25-35€**

## ⚠️ Wichtige Hinweise

1. **Grow Light Protokoll identifizieren**
   - Herstellerdatenblatt des Grow Lights prüfen
   - RJ11 Pinout dokumentieren
   - Protokoll bestimmen (PWM/DMX/Proprietär)

2. **Spannungspegel beachten**
   - ESP32 ist NICHT 5V-tolerant!
   - Immer Level Shifter verwenden bei >3.3V

3. **Strombelastung**
   - ESP32 GPIO max. 12mA pro Pin
   - Für höhere Lasten: MOSFET/Relais verwenden

4. **EMI/RFI Schutz**
   - Optokoppler für Motor-Signale verwenden
   - Ferritperlen an langen Kabeln

## 📚 Nützliche Links

- ESP32 Pinout: https://randomnerdtutorials.com/esp32-pinout-reference-gpios/
- PWM Tutorial: https://randomnerdtutorials.com/esp32-pwm-arduino-ide/
- RJ11 Pinout: https://pinoutguide.com/HeadsetsHeadphones/rj11_headset_pinout.shtml
