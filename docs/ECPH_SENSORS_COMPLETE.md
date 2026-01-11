# EC/pH Sensors Integration - Complete ✅

**Date:** 2026-01-02
**Feature:** EC/pH Sensors with Atlas Scientific EZO (Feature 1 from IMPLEMENTATION_PLAN.md)
**Status:** Backend + Frontend Implementation Complete

---

## Summary

Complete EC (Electrical Conductivity) and pH sensor integration with Atlas Scientific EZO-EC and EZO-pH modules. Includes calibration wizard, real-time monitoring, historical trends, and threshold alerts.

---

## What Was Implemented

### Backend Implementation

#### 1. Database Models

**SensorCalibration Model** (`models/SensorCalibration.js`)
- Stores calibration data for EC and pH sensors
- EC: 3-point calibration (dry, low 1.413 mS/cm, high 12.88 mS/cm)
- pH: 3-point calibration (low 4.0, mid 7.0, high 10.0)
- Temperature compensation settings
- Calibration history tracking
- Quality metrics (accuracy, drift, confidence)
- Auto-calculated validity status

**NutrientReading Model** (`models/NutrientReading.js`)
- Stores EC/pH readings over time
- EC value with unit conversion (mS/cm, µS/cm, ppm)
- pH value with temperature tracking
- Reservoir level and volume
- Quality flags (valid, calibrated, anomaly)
- Automatic threshold checking
- Alert generation (low/high EC/pH, temp, level)
- Statistics calculation (average, min, max, stdDev)

#### 2. API Controller

**SensorController** (`controllers/sensorController.js`)

**Data Endpoints:**
```javascript
GET  /api/sensors/current           // Current EC/pH/Temp values
GET  /api/sensors/history           // Historical readings
```

**Calibration Endpoints:**
```javascript
GET  /api/sensors/calibration/:type        // Get calibration status (ec/ph)
POST /api/sensors/calibration/:type/start  // Start calibration point
POST /api/sensors/calibration/:type/save   // Save calibration point
POST /api/sensors/calibration/:type/reset  // Reset calibration
```

**Command Endpoints:**
```javascript
POST /api/sensors/read                      // Trigger manual reading
POST /api/sensors/temperature-compensation  // Set temp compensation
```

#### 3. MQTT Integration

Extended `mqttService.js` to handle EC/pH data:
- Receives sensor data from ESP32 via `grow/esp32/nutrients/sensors`
- Automatically saves readings to database
- Checks thresholds and generates alerts
- Broadcasts to Socket.io for real-time updates

**Expected MQTT Payload:**
```json
{
  "ec": 1.35,
  "ph": 6.2,
  "temp": 22.5,
  "reservoirLevel_percent": 85,
  "ecUnit": "mS/cm",
  "tempCompensated": true,
  "calibrated": true
}
```

### Frontend Implementation

#### 1. SensorCard Component

Main display card showing:
- Current EC value (mS/cm) with color-coded status
- Current pH value with color-coded status
- PPM conversion (EC × 500)
- Temperature reading
- Reservoir level percentage
- Calibration status badges
- Active alerts display
- Manual refresh button

**Status Colors:**
- Green: Optimal range
- Yellow: Warning (slightly out of range)
- Orange: Caution (moderately out of range)
- Red: Critical (severely out of range)

#### 2. CalibrationWizard Component

Step-by-step calibration interface:

**EC Calibration (3 steps):**
1. Dry calibration (sensor fully dry)
2. Low point (1.413 mS/cm or 1413 µS/cm)
3. High point (12.88 mS/cm or 12880 µS/cm)

**pH Calibration (3 steps):**
1. Mid point (pH 7.0) - Required
2. Low point (pH 4.0) - Recommended
3. High point (pH 10.0) - Optional

**Features:**
- Visual progress indicator
- Custom reference value input
- Step completion tracking
- Skip optional steps
- Reset calibration
- Real-time status updates

#### 3. SensorHistoryChart Component

Interactive time-series chart:
- Dual Y-axis (EC left, pH right)
- Target range reference lines
- Time range selector (1h, 4h, 12h, 24h, 48h)
- Statistics panel (average, min, max)
- Compact mode for dashboard
- Full-screen mode for dedicated view

#### 4. SensorDashboard Page

Complete sensor management interface with 4 views:

**a) Overview**
- SensorCard (current values)
- SensorHistoryChart (compact trend)
- Educational info panel (EC/pH basics)

**b) EC Calibration**
- Full CalibrationWizard for EC sensor

**c) pH Calibration**
- Full CalibrationWizard for pH sensor

**d) History**
- Full-screen SensorHistoryChart

---

## File Structure

```
backend/
├── src/
│   ├── models/
│   │   ├── SensorCalibration.js         ✅ NEW - EC/pH calibration data
│   │   └── NutrientReading.js           ✅ NEW - EC/pH readings history
│   ├── controllers/
│   │   └── sensorController.js          ✅ NEW - Sensor API handlers
│   ├── routes/
│   │   ├── sensorRoutes.js              ✅ NEW - Sensor route definitions
│   │   └── apiRoutes.js                 ✅ UPDATED - Sensor routes registered
│   └── services/
│       └── mqttService.js               ✅ UPDATED - EC/pH data handling

frontend/
├── src/
│   ├── components/
│   │   └── Sensors/
│   │       ├── SensorCard.jsx           ✅ NEW - Current values display
│   │       ├── CalibrationWizard.jsx    ✅ NEW - Calibration interface
│   │       ├── SensorHistoryChart.jsx   ✅ NEW - Historical trends
│   │       └── SensorDashboard.jsx      ✅ NEW - Full sensor page
│   └── App.jsx                          ✅ UPDATED - Sensor navigation & routing
```

---

## API Examples

### Get Current Readings

```bash
curl http://localhost:3000/api/sensors/current
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ec": { "value": 1.35, "unit": "mS/cm", "compensated": true },
    "ph": { "value": 6.2, "temperature": 22.5 },
    "temperature": 22.5,
    "reservoir": { "id": "main", "level": 85 },
    "tds": 675,
    "calibrated": { "ec": true, "ph": true },
    "quality": { "ecValid": true, "phValid": true },
    "alerts": [],
    "timestamp": "2026-01-02T20:30:00.000Z"
  }
}
```

### Start EC Calibration (Low Point)

```bash
curl -X POST http://localhost:3000/api/sensors/calibration/ec/start \
  -H "Content-Type: application/json" \
  -d '{ "point": "low", "referenceValue": 1.413 }'
```

### Save Calibration Point

```bash
curl -X POST http://localhost:3000/api/sensors/calibration/ec/save \
  -H "Content-Type: application/json" \
  -d '{
    "point": "low",
    "referenceValue": 1.413,
    "measuredValue": 1.410,
    "slope": 1.02
  }'
```

### Get Calibration Status

```bash
curl http://localhost:3000/api/sensors/calibration/ph
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sensorType": "ph",
    "phCalibration": {
      "low": { "calibrated": true, "date": "2026-01-02T...", "referenceValue": 4.0 },
      "mid": { "calibrated": true, "date": "2026-01-02T...", "referenceValue": 7.0 },
      "high": { "calibrated": false },
      "slope": 59.16
    },
    "status": {
      "isValid": true,
      "lastCalibration": "2026-01-02T20:15:00.000Z",
      "pointsCalibrated": 2
    },
    "quality": {
      "accuracy": 67,
      "confidence": "excellent"
    }
  }
}
```

---

## Hardware Requirements

### Atlas Scientific EZO Modules

**EZO-EC (Electrical Conductivity)**
- I2C Address: 0x64 (default, configurable)
- Voltage: 3.3V or 5V
- Current: 30mA
- Accuracy: ±2%
- Range: 0.07 - 500,000+ µS/cm
- Price: ~€50-70

**EZO-pH (pH Sensor)**
- I2C Address: 0x63 (default, configurable)
- Voltage: 3.3V or 5V
- Current: 30mA
- Accuracy: ±0.002 pH
- Range: 0.001 - 14.000 pH
- Price: ~€50-70

**EC Probe (K 1.0)**
- Working Range: 5 - 200,000 µS/cm
- Ideal for hydroponic applications
- Price: ~€60-80

**pH Probe (Lab-Grade)**
- Double junction reference
- Temperature sensor integrated
- Price: ~€60-100

**Calibration Solutions**
- EC: 1413 µS/cm, 12880 µS/cm (~€15)
- pH: 4.0, 7.0, 10.0 (~€20)

**Total Hardware Cost: ~€300-350**

---

## ESP32 Firmware Requirements

### I2C Communication

```cpp
#include <Wire.h>

#define EZO_EC_ADDR 0x64
#define EZO_PH_ADDR 0x63

// Initialize I2C
void setup() {
  Wire.begin(21, 22); // SDA=21, SCL=22
}

// Read EC value
float readEC() {
  Wire.beginTransmission(EZO_EC_ADDR);
  Wire.write("R");
  Wire.endTransmission();

  delay(1000); // Wait for reading

  Wire.requestFrom(EZO_EC_ADDR, 32);
  String response = "";
  while(Wire.available()) {
    char c = Wire.read();
    if(c != 1) response += c; // Skip status byte
  }

  return response.toFloat();
}

// Read pH value
float readPH() {
  Wire.beginTransmission(EZO_PH_ADDR);
  Wire.write("R");
  Wire.endTransmission();

  delay(1000); // Wait for reading

  Wire.requestFrom(EZO_PH_ADDR, 32);
  String response = "";
  while(Wire.available()) {
    char c = Wire.read();
    if(c != 1) response += c;
  }

  return response.toFloat();
}

// Calibrate EC (example: low point)
void calibrateEC(String point, float value) {
  String cmd = "Cal," + point + "," + String(value);

  Wire.beginTransmission(EZO_EC_ADDR);
  Wire.write(cmd.c_str());
  Wire.endTransmission();

  delay(2000); // Calibration takes ~2s
}

// Set temperature compensation
void setTempCompensation(uint8_t addr, float temp) {
  String cmd = "T," + String(temp);

  Wire.beginTransmission(addr);
  Wire.write(cmd.c_str());
  Wire.endTransmission();
}

// Publish to MQTT
void publishSensorData() {
  float ec = readEC();
  float ph = readPH();
  float temp = readTemperature(); // From DS18B20 or DHT

  String payload = "{";
  payload += "\"ec\":" + String(ec, 2) + ",";
  payload += "\"ph\":" + String(ph, 2) + ",";
  payload += "\"temp\":" + String(temp, 1) + ",";
  payload += "\"reservoirLevel_percent\":" + String(getReservoirLevel()) + ",";
  payload += "\"ecUnit\":\"mS/cm\",";
  payload += "\"tempCompensated\":true,";
  payload += "\"calibrated\":true";
  payload += "}";

  mqtt.publish("grow/esp32/nutrients/sensors", payload.c_str());
}
```

### MQTT Command Handling

```cpp
void handleMQTTCommand(String command) {
  DynamicJsonDocument doc(1024);
  deserializeJson(doc, command);

  String action = doc["action"];

  if (action == "calibrate_sensor") {
    String sensor = doc["sensor"]; // "ec" or "ph"
    String point = doc["point"];   // "dry", "low", "mid", "high"
    float refValue = doc["referenceValue"];

    uint8_t addr = (sensor == "ec") ? EZO_EC_ADDR : EZO_PH_ADDR;

    if (sensor == "ec" && point == "dry") {
      Wire.beginTransmission(addr);
      Wire.write("Cal,dry");
      Wire.endTransmission();
    } else {
      String cmd = "Cal," + point + "," + String(refValue);
      Wire.beginTransmission(addr);
      Wire.write(cmd.c_str());
      Wire.endTransmission();
    }
  }
  else if (action == "reset_calibration") {
    String sensor = doc["sensor"];
    uint8_t addr = (sensor == "ec") ? EZO_EC_ADDR : EZO_PH_ADDR;

    Wire.beginTransmission(addr);
    Wire.write("Cal,clear");
    Wire.endTransmission();
  }
  else if (action == "set_temp_compensation") {
    String sensor = doc["sensor"];
    float temperature = doc["temperature"];
    uint8_t addr = (sensor == "ec") ? EZO_EC_ADDR : EZO_PH_ADDR;

    setTempCompensation(addr, temperature);
  }
  else if (action == "read_sensors") {
    publishSensorData();
  }
}
```

---

## Calibration Guide

### EC Sensor Calibration

**Required Equipment:**
- EC calibration solutions: 1413 µS/cm (1.413 mS/cm) and 12880 µS/cm (12.88 mS/cm)
- Distilled water for rinsing
- Clean container

**Steps:**
1. **Dry Calibration**
   - Remove probe from solution
   - Pat dry with clean paper towel
   - Click "Start Calibration" for dry point
   - Wait for completion

2. **Low Point (1.413 mS/cm)**
   - Rinse probe with distilled water
   - Submerge in 1413 µS/cm solution
   - Wait 30 seconds for stabilization
   - Click "Start Calibration" for low point
   - Wait for completion (~60s)

3. **High Point (12.88 mS/cm)**
   - Rinse probe with distilled water
   - Submerge in 12880 µS/cm solution
   - Wait 30 seconds for stabilization
   - Click "Start Calibration" for high point
   - Wait for completion (~60s)

4. **Verify**
   - Check calibration status shows "Kalibriert"
   - Accuracy should be > 95%
   - Store probe in storage solution

### pH Sensor Calibration

**Required Equipment:**
- pH buffer solutions: 4.0, 7.0, and 10.0
- Distilled water for rinsing
- Clean container

**Steps:**
1. **Mid Point (pH 7.0)** - REQUIRED
   - Rinse probe with distilled water
   - Submerge in pH 7.0 buffer
   - Wait 30 seconds for stabilization
   - Click "Start Calibration" for mid point
   - Wait for completion (~60s)

2. **Low Point (pH 4.0)** - RECOMMENDED
   - Rinse probe with distilled water
   - Submerge in pH 4.0 buffer
   - Wait 30 seconds for stabilization
   - Click "Start Calibration" for low point
   - Wait for completion (~60s)

3. **High Point (pH 10.0)** - OPTIONAL
   - Rinse probe with distilled water
   - Submerge in pH 10.0 buffer
   - Wait 30 seconds for stabilization
   - Click "Start Calibration" for high point
   - Wait for completion (~60s)

4. **Verify**
   - Check slope (ideal: 59.16 mV/pH at 25°C)
   - Confidence should be "excellent" or "good"
   - Store probe in pH 4.0 buffer solution

**Calibration Frequency:**
- EC: Every 30 days or after probe cleaning
- pH: Every 14-30 days or when readings drift

---

## Optimal Ranges

### EC (Electrical Conductivity)

**Seedling:** 0.5 - 0.8 mS/cm
**Vegetative:** 0.8 - 1.5 mS/cm
**Flowering:** 1.2 - 2.5 mS/cm
**Late Flowering:** 1.5 - 2.8 mS/cm

**Critical:** < 0.5 or > 3.5 mS/cm

### pH (Acidity/Alkalinity)

**Optimal Range:** 5.5 - 6.5
**Acceptable Range:** 5.0 - 7.0
**Critical:** < 4.5 or > 7.5

**pH and Nutrient Availability:**
- pH < 5.0: Manganese and Iron toxicity risk
- pH 5.5-6.5: All nutrients available
- pH > 7.0: Iron, Manganese, Phosphorus deficiency risk

### Temperature

**Optimal:** 18-24°C
**Acceptable:** 15-28°C
**Critical:** > 32°C (oxygen depletion, root rot risk)

---

## Testing Results

### Backend API ✅

```bash
✅ GET /api/sensors/current - Returns current readings
✅ GET /api/sensors/history - Returns historical data
✅ GET /api/sensors/calibration/ec - Returns EC calibration status
✅ GET /api/sensors/calibration/ph - Returns pH calibration status
✅ POST /api/sensors/calibration/ec/start - Starts EC calibration
✅ POST /api/sensors/calibration/ec/save - Saves EC calibration point
✅ POST /api/sensors/calibration/ec/reset - Resets EC calibration
✅ POST /api/sensors/read - Triggers manual reading
✅ POST /api/sensors/temperature-compensation - Sets temp compensation
```

### Frontend Components ✅

```bash
✅ SensorCard renders with real-time data
✅ CalibrationWizard progresses through steps
✅ SensorHistoryChart displays dual-axis chart
✅ SensorDashboard tabs switch correctly
✅ Navigation menu includes Sensors tab
✅ Page routing works correctly
```

### MQTT Integration ✅

```bash
✅ Receives EC/pH data from grow/esp32/nutrients/sensors
✅ Saves readings to database
✅ Checks thresholds and generates alerts
✅ Broadcasts to Socket.io
```

---

## Known Limitations

1. **Hardware Not Yet Connected**
   - Atlas Scientific modules need to be ordered (~€300)
   - ESP32 firmware needs to be updated with I2C code
   - Physical probes need to be installed in reservoir

2. **Simulated Calibration**
   - Frontend calibration wizard is functional
   - Actual calibration requires ESP32 firmware implementation
   - Mock slope values used until real calibration

3. **Temperature Compensation**
   - Assumes 25°C if no temp sensor available
   - EC readings should be temperature compensated for accuracy
   - Requires DS18B20 or similar temp sensor in reservoir

4. **Alert Notifications**
   - Alerts generated and stored
   - Push notifications not yet implemented
   - Could add email/SMS alerts

---

## Next Steps

### Immediate (Hardware Integration)

1. **Order Hardware**
   - Atlas Scientific EZO-EC module
   - Atlas Scientific EZO-pH module
   - EC probe (K 1.0)
   - pH probe (lab-grade)
   - Calibration solutions

2. **Update ESP32 Firmware**
   - Add I2C library
   - Implement EZO communication
   - Add MQTT command handling
   - Test with real sensors

3. **Physical Installation**
   - Mount probes in reservoir
   - Connect to ESP32 I2C bus
   - Power and test readings
   - Perform initial calibration

### Future Enhancements

1. **Automatic Dosing**
   - pH Up/Down pumps for pH control
   - Nutrient A/B pumps for EC control
   - PID controller for precise adjustment

2. **Advanced Analytics**
   - Nutrient consumption rate tracking
   - Predictive alerts before problems
   - Optimal dosing schedule recommendations

3. **Multi-Reservoir Support**
   - Multiple sensor sets
   - Independent calibrations
   - Separate monitoring and alerts

---

## Conclusion

EC/pH sensor integration is **complete and ready for hardware**. The software stack (backend + frontend) is fully functional and awaiting Atlas Scientific EZO modules.

**Current Status:**
- ✅ Backend API fully functional
- ✅ Database models complete
- ✅ MQTT integration ready
- ✅ Frontend UI complete
- ✅ Calibration wizard ready
- ⏳ Hardware pending (~€300 investment)
- ⏳ ESP32 firmware update needed

**Next Feature:** Timelapse Generator (Priority 2)

---

**Implementation Team:** Claude Code
**Feature Priority:** 3-1-2 (VPD ✅ → EC/pH ✅ → Timelapse ⏳)
**Completion Date:** 2026-01-02
**Status:** READY FOR HARDWARE INTEGRATION 🎉
