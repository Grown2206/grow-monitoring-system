const mongoose = require('mongoose');

const SensorLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now // Automatischer Zeitstempel
  },
  device: {
    type: String,
    required: true // z.B. "esp32_main"
  },
  readings: {
    // Durchschnittswerte (vom ESP32 berechnet)
    temp: Number,           // Durchschnitts-Temperatur aller SHT31
    humidity: Number,       // Durchschnitts-Luftfeuchtigkeit aller SHT31

    // 3 SHT31 Einzelsensoren (Höhenverteilung)
    temp_bottom: Number,    // SHT31 Unten
    temp_middle: Number,    // SHT31 Mitte
    temp_top: Number,       // SHT31 Oben
    humidity_bottom: Number,  // SHT31 Unten
    humidity_middle: Number,  // SHT31 Mitte
    humidity_top: Number,     // SHT31 Oben

    // Andere Sensoren
    lux: Number,        // Helligkeit (BH1750)
    tankLevel: Number,  // Wasserstand (Raw 0-4095)
    gasLevel: Number,   // CO2/Gas (MQ-135 Raw)
    soilMoisture: [Number], // Array für die 6 Pflanzen [50, 40, 20, 0, 0, 0]

    // VL53L0X ToF Pflanzenhöhen (mm) - 6 Sensoren via TCA9548A
    // Werte: >0 = Höhe in mm, -1 = Sensor ungültig/nicht vorhanden
    heights: [Number],

    // ENS160 Luftqualitäts-Sensor
    ens160_eco2: Number,     // eCO2 in ppm (400-65000)
    ens160_tvoc: Number,     // TVOC in ppb (0-65000)
    ens160_aqi: Number,      // AQI 1-5 (UBA Skala: 1=Excellent, 5=Unhealthy)

    // AHT21 Temperatur & Luftfeuchtigkeit (ENS160 Companion)
    aht21_temp: Number,      // Temperatur in °C
    aht21_humidity: Number   // Luftfeuchtigkeit in %
  },

  // Sensor-Health: Zeigt ob Messwerte vertrauenswürdig sind
  // false = Sensor ausgefallen (0.0 Wert) oder außerhalb Range
  sensorHealth: {
    bottom: { type: Boolean, default: true },    // SHT31 Bottom
    middle: { type: Boolean, default: true },    // SHT31 Middle
    top: { type: Boolean, default: true },       // SHT31 Top
    light: { type: Boolean, default: true },     // BH1750
    air: { type: Boolean, default: true }        // ENS160/AHT21
  }
});

// Indexes für schnelle Abfragen
SensorLogSchema.index({ timestamp: -1 });
SensorLogSchema.index({ device: 1, timestamp: -1 });

// TTL-Index: Sensordaten automatisch nach 90 Tagen löschen
// Verhindert unbegrenztes DB-Wachstum (~6.3 Mio. Einträge/Jahr bei 5s Intervall)
SensorLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 Tage

module.exports = mongoose.model('SensorLog', SensorLogSchema);