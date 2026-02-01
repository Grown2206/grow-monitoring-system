/**
 * Zentrale Geräte-Konfiguration (Frontend)
 * Synchronisiert mit Backend: backend/src/config/devices.js
 *
 * Diese Konstanten werden in Controls.jsx und Automation verwendet
 */

export const DEVICE_DEFINITIONS = {
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
  }
};

/**
 * Gibt alle Relais-Geräte als Array zurück
 * Für Dropdown-Listen in UI
 */
export const getAllRelayDevices = () => {
  return Object.values(DEVICE_DEFINITIONS.relays).map(device => ({
    value: device.mqttRelay || device.id,
    label: `${device.label} (Pin ${device.pin})`,
    ...device
  }));
};

/**
 * Gibt alle PWM-Geräte als Array zurück
 */
export const getAllPWMDevices = () => {
  return Object.values(DEVICE_DEFINITIONS.pwm).map(device => ({
    value: device.id,
    label: `${device.label} (Pin ${device.pin})`,
    ...device
  }));
};

/**
 * Gibt alle steuerbaren Geräte (Relais + PWM) als Array zurück
 * Für Automation-Dropdown
 */
export const getAllControllableDevices = () => {
  return [
    ...getAllRelayDevices(),
    ...getAllPWMDevices()
  ];
};

/**
 * Sucht ein Gerät by ID
 */
// Digital Inputs: Kein freier GPIO - bei Bedarf PCF8574 I2C-Expander verwenden

export const getDeviceById = (id) => {
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
