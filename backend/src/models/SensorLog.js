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
    // 3 SHT31 Temperatursensoren (Höhenverteilung)
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
    soilMoisture: [Number] // Array für die 6 Pflanzen [50, 40, 20, 0, 0, 0]
  }
});

// Index setzen, damit Abfragen nach Zeit schnell gehen
SensorLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('SensorLog', SensorLogSchema);