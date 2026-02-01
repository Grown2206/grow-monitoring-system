/**
 * Zentrale Geräte-Konfiguration
 * Synchronisiert zwischen Frontend (Controls.jsx) und Backend (AutomationEngine)
 *
 * WICHTIG: Diese Konfiguration muss mit der ESP32 Firmware übereinstimmen!
 * Siehe: firmware/ArduinoVersion/GrowSystem.ino
 */

const DEVICE_DEFINITIONS = {
  // Relais-gesteuerte Geräte (ON/OFF)
  relays: {
    light: {
      id: 'light',
      label: 'Hauptlicht',
      subLabel: 'Samsung LM301H LED',
      pin: 4,
      watts: 200,
      type: 'relay',
      icon: 'Lightbulb',
      color: '#facc15' // yellow-400
    },
    fan_exhaust: {
      id: 'fan_exhaust',
      label: 'Abluft',
      subLabel: 'AC Infinity CloudLine',
      pin: 5,
      watts: 35,
      type: 'relay',
      icon: 'Fan',
      color: '#60a5fa' // blue-400
    },
    fan_circulation: {
      id: 'fan_circulation',
      label: 'Umluft',
      subLabel: 'Clip-On Ventilator',
      pin: 2,
      watts: 15,
      type: 'relay',
      icon: 'Wind',
      color: '#22d3ee' // cyan-400
    },
    pump_main: {
      id: 'pump_main',
      label: 'Luftbefeuchter',
      subLabel: 'Ultrasonic Humidifier',
      pin: 16,
      watts: 50,
      type: 'relay',
      icon: 'Droplets',
      color: '#10b981', // emerald-400
      mqttRelay: 'pump_main' // MQTT command verwendet immer noch pump_main für Kompatibilität
    },
    pump_mix: {
      id: 'pump_mix',
      label: 'Pumpe Tank Luftbefeuchter',
      subLabel: 'Humidifier Tank Pump',
      pin: 17,
      watts: 45,
      type: 'relay',
      icon: 'Droplets',
      color: '#14b8a6' // teal-400
    },
    nutrient_pump: {
      id: 'nutrient_pump',
      label: 'Nährstoff-Pumpe',
      subLabel: 'Dosing Pump',
      pin: 13,
      watts: 30,
      type: 'relay',
      icon: 'Beaker',
      color: '#a855f7' // purple-400
    },
    heater: {
      id: 'heater',
      label: 'Heizung',
      subLabel: 'Ceramic Heater',
      pin: 12,
      watts: 150,
      type: 'relay',
      icon: 'Thermometer',
      color: '#ef4444' // red-400
    },
    dehumidifier: {
      id: 'dehumidifier',
      label: 'Entfeuchter',
      subLabel: 'Dehumidifier Pro',
      pin: 14,
      watts: 250,
      type: 'relay',
      icon: 'Droplet',
      color: '#fb923c' // orange-400
    }
  },

  // PWM-gesteuerte Geräte (0-100% / 0-10V)
  pwm: {
    fan_pwm: {
      id: 'fan_pwm',
      label: 'Abluftfilter PWM',
      subLabel: '0-10V Steuerung + Tachometer',
      pin: 18,
      type: 'pwm',
      icon: 'Fan',
      color: '#60a5fa', // blue-400
      minValue: 0,
      maxValue: 100,
      unit: '%',
      voltage: true, // Hat 0-10V Output
      tachPin: 19 // Tachometer Input Pin
    },
    light_pwm: {
      id: 'light_pwm',
      label: 'RJ11 Grow Light',
      subLabel: 'PWM Dimming via RJ11',
      pin: 23,
      enablePin: 27,
      type: 'pwm',
      icon: 'Lightbulb',
      color: '#fbbf24', // amber-400
      minValue: 0,
      maxValue: 100,
      unit: '%'
    }
  },

  // Analog Input Pins
  analog: {
    soil_1: { pin: 36, label: 'Bodensensor 1', type: 'soil_moisture' },
    soil_2: { pin: 39, label: 'Bodensensor 2', type: 'soil_moisture' },
    soil_3: { pin: 34, label: 'Bodensensor 3', type: 'soil_moisture' },
    soil_4: { pin: 35, label: 'Bodensensor 4', type: 'soil_moisture' },
    soil_5: { pin: 32, label: 'Bodensensor 5', type: 'soil_moisture' },
    soil_6: { pin: 33, label: 'Bodensensor 6', type: 'soil_moisture' },
    tank_level: { pin: 25, label: 'Tank Füllstand', type: 'water_level' },
    gas_sensor: { pin: 26, label: 'Gas Sensor (MQ-135)', type: 'gas' },
    nutrient_level: { pin: 15, label: 'Nährstoff-Level', type: 'liquid_level' }
  },

  // Digital Inputs: Kein freier GPIO - bei Bedarf PCF8574 I2C-Expander verwenden

  // I2C Bus Geräte
  i2c: {
    sda: 21,
    scl: 22,
    devices: [
      { name: 'SHT31-Bottom', address: '0x44', type: 'temp_humidity', zone: 'bottom' },
      { name: 'SHT31-Middle', address: '0x45', type: 'temp_humidity', zone: 'middle' },
      { name: 'BH1750', address: '0x23', type: 'light_sensor' },
      { name: 'TCA9548A', address: '0x70', type: 'i2c_multiplexer', channels: 8, description: 'I2C Multiplexer für VL53L0X + SHT31-Top' },
      { name: 'EZO-EC', address: '0x64', type: 'ec_sensor' },
      { name: 'EZO-pH', address: '0x63', type: 'ph_sensor' },
      { name: 'ENS160', address: '0x53', type: 'air_quality', description: 'eCO2, TVOC, AQI Luftqualitäts-Sensor' },
      { name: 'AHT21', address: '0x38', type: 'temp_humidity', description: 'Temperatur & Luftfeuchtigkeit (ENS160 Kompensation)' }
    ],
    // Geräte hinter TCA9548A Multiplexer (0x70)
    multiplexed: [
      { name: 'VL53L0X Slot 1', address: '0x29', channel: 0, type: 'tof_distance', mountHeight_mm: 800, description: 'Pflanzenhöhe Slot 1' },
      { name: 'VL53L0X Slot 2', address: '0x29', channel: 1, type: 'tof_distance', mountHeight_mm: 800, description: 'Pflanzenhöhe Slot 2' },
      { name: 'VL53L0X Slot 3', address: '0x29', channel: 2, type: 'tof_distance', mountHeight_mm: 800, description: 'Pflanzenhöhe Slot 3' },
      { name: 'VL53L0X Slot 4', address: '0x29', channel: 3, type: 'tof_distance', mountHeight_mm: 800, description: 'Pflanzenhöhe Slot 4' },
      { name: 'VL53L0X Slot 5', address: '0x29', channel: 4, type: 'tof_distance', mountHeight_mm: 800, description: 'Pflanzenhöhe Slot 5' },
      { name: 'VL53L0X Slot 6', address: '0x29', channel: 5, type: 'tof_distance', mountHeight_mm: 800, description: 'Pflanzenhöhe Slot 6' },
      { name: 'SHT31-Top', address: '0x44', channel: 6, type: 'temp_humidity', zone: 'top' }
    ]
  }
};

/**
 * Gibt alle Relais-Geräte als Array zurück
 * Für Dropdown-Listen in UI
 */
const getAllRelayDevices = () => {
  return Object.values(DEVICE_DEFINITIONS.relays).map(device => ({
    value: device.mqttRelay || device.id,
    label: `${device.label} (Pin ${device.pin})`,
    ...device
  }));
};

/**
 * Gibt alle PWM-Geräte als Array zurück
 */
const getAllPWMDevices = () => {
  return Object.values(DEVICE_DEFINITIONS.pwm).map(device => ({
    value: device.id,
    label: `${device.label} (Pin ${device.pin})`,
    ...device
  }));
};

/**
 * Gibt alle steuerbaren Geräte (Relais + PWM) als Array zurück
 */
const getAllControllableDevices = () => {
  return [
    ...getAllRelayDevices(),
    ...getAllPWMDevices()
  ];
};

/**
 * Sucht ein Gerät by ID
 */
const getDeviceById = (id) => {
  // Suche in Relays
  if (DEVICE_DEFINITIONS.relays[id]) {
    return DEVICE_DEFINITIONS.relays[id];
  }
  // Suche in PWM
  if (DEVICE_DEFINITIONS.pwm[id]) {
    return DEVICE_DEFINITIONS.pwm[id];
  }
  return null;
};

module.exports = {
  DEVICE_DEFINITIONS,
  getAllRelayDevices,
  getAllPWMDevices,
  getAllControllableDevices,
  getDeviceById
};
