const PlantGrowthLog = require('../models/PlantGrowthLog');
const Plant = require('../models/Plant');
const SensorLog = require('../models/SensorLog');

/**
 * Auto Growth Logger Service
 * Erstellt automatisch tägliche Growth Logs mit Sensor-Durchschnittswerten
 */
class AutoGrowthLogger {
  constructor() {
    this.running = false;
    this.checkInterval = null;
    this.checkIntervalHours = 24; // Einmal täglich
    this.lastRun = null;
  }

  /**
   * Starte Auto Logger
   */
  start() {
    if (this.running) {
      console.log('⚠️  Auto Growth Logger läuft bereits');
      return;
    }

    console.log('📊 Auto Growth Logger gestartet');
    this.running = true;

    // Prüfe sofort beim Start
    this.createDailyLogs();

    // Dann alle 24h
    this.checkInterval = setInterval(() => {
      this.createDailyLogs();
    }, this.checkIntervalHours * 60 * 60 * 1000);
  }

  /**
   * Stoppe Auto Logger
   */
  stop() {
    if (!this.running) return;

    console.log('🛑 Auto Growth Logger gestoppt');
    this.running = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Erstelle tägliche Logs für alle aktiven Pflanzen
   */
  async createDailyLogs() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Hole alle aktiven Pflanzen
      const plants = await Plant.find({
        stage: { $nin: ['Leer', 'Geerntet'] }
      });

      if (plants.length === 0) {
        console.log('📊 Keine aktiven Pflanzen für Auto-Logging');
        return;
      }

      console.log(`📊 Erstelle tägliche Logs für ${plants.length} Pflanzen...`);

      for (const plant of plants) {
        await this.createLogForPlant(plant, today);
      }

      this.lastRun = new Date();
      console.log(`✅ Auto Growth Logs erstellt (${plants.length} Pflanzen)`);

    } catch (error) {
      console.error('❌ Fehler beim Auto-Logging:', error);
    }
  }

  /**
   * Erstelle Log für einzelne Pflanze mit Sensor-Durchschnitten
   */
  async createLogForPlant(plant, date) {
    try {
      // Prüfe ob Log für heute bereits existiert
      const existingLog = await PlantGrowthLog.findOne({
        plant: plant._id,
        date: date
      });

      if (existingLog) {
        // Log existiert bereits - aktualisiere nur Umgebungsdaten
        console.log(`📝 Aktualisiere Log für ${plant.name || `Slot ${plant.slotId}`}`);
        const averages = await this.calculateDailyAverages(date);

        existingLog.environment = {
          ...existingLog.environment,
          ...averages
        };

        await existingLog.save();
        return;
      }

      // Berechne Durchschnittswerte für den Tag
      const averages = await this.calculateDailyAverages(date);

      // Erstelle neuen Log mit Umgebungsdaten
      const newLog = new PlantGrowthLog({
        plant: plant._id,
        date: date,
        environment: averages,
        // Measurements bleiben leer - werden manuell ergänzt
        measurements: {
          height: { value: null, unit: 'cm' },
          width: { value: null, unit: 'cm' },
          stemDiameter: { value: null, unit: 'mm' }
        },
        health: {
          overall: 5,
          leafColor: 'dunkelgrün'
        },
        notes: 'Automatisch erstellt - Bitte Messungen ergänzen'
      });

      await newLog.save();
      console.log(`✅ Log erstellt für ${plant.name || `Slot ${plant.slotId}`}`);

    } catch (error) {
      console.error(`❌ Fehler beim Erstellen des Logs für ${plant.name}:`, error);
    }
  }

  /**
   * Berechne Durchschnittswerte aus Sensordaten für den Tag
   */
  async calculateDailyAverages(date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Aggregiere Sensordaten aus SensorLog
      const result = await SensorLog.aggregate([
        {
          $match: {
            timestamp: {
              $gte: startOfDay,
              $lte: endOfDay
            }
          }
        },
        {
          $project: {
            // Nutze entweder den vom ESP32 berechneten Durchschnitt (readings.temp)
            // oder berechne selbst aus den Einzelsensoren
            avgTemp: {
              $cond: [
                { $ifNull: ['$readings.temp', false] },
                '$readings.temp',
                {
                  $avg: [
                    '$readings.temp_bottom',
                    '$readings.temp_middle',
                    '$readings.temp_top'
                  ]
                }
              ]
            },
            // Gleiches für Luftfeuchtigkeit
            avgHum: {
              $cond: [
                { $ifNull: ['$readings.humidity', false] },
                '$readings.humidity',
                {
                  $avg: [
                    '$readings.humidity_bottom',
                    '$readings.humidity_middle',
                    '$readings.humidity_top'
                  ]
                }
              ]
            },
            soilMoisture: '$readings.soilMoisture'
          }
        },
        {
          $group: {
            _id: null,
            avgTemperature: { $avg: '$avgTemp' },
            avgHumidity: { $avg: '$avgHum' },
            avgSoilMoisture: {
              $avg: {
                $cond: [
                  { $isArray: '$soilMoisture' },
                  { $avg: '$soilMoisture' },
                  '$soilMoisture'
                ]
              }
            },
            dataPoints: { $sum: 1 }
          }
        }
      ]);

      if (result.length === 0 || result[0].dataPoints === 0) {
        // Keine Daten verfügbar - verwende null
        return {
          avgTemperature: null,
          avgHumidity: null,
          avgVPD: null,
          avgSoilMoisture: null,
          lightHours: null,
          waterAmount: null
        };
      }

      const data = result[0];

      // Berechne VPD aus Temp + Humidity (Magnus-Formel)
      let vpd = null;
      if (data.avgTemperature && data.avgHumidity) {
        const temp = data.avgTemperature;
        const rh = data.avgHumidity;
        const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
        vpd = svp * (1 - rh / 100);
      }

      // Konvertiere Bodenfeuchtigkeit (bereits in % gespeichert in SensorLog)
      let soilMoisture = data.avgSoilMoisture;

      return {
        avgTemperature: data.avgTemperature ? parseFloat(data.avgTemperature.toFixed(1)) : null,
        avgHumidity: data.avgHumidity ? parseFloat(data.avgHumidity.toFixed(1)) : null,
        avgVPD: vpd ? parseFloat(vpd.toFixed(2)) : null,
        avgSoilMoisture: soilMoisture ? parseFloat(soilMoisture.toFixed(1)) : null,
        lightHours: null, // Kann später aus Light-PWM berechnet werden
        waterAmount: null  // Wird manuell eingetragen
      };

    } catch (error) {
      console.error('Fehler beim Berechnen der Durchschnitte:', error);
      return {
        avgTemperature: null,
        avgHumidity: null,
        avgVPD: null,
        avgSoilMoisture: null,
        lightHours: null,
        waterAmount: null
      };
    }
  }

  /**
   * Manuelles Triggern des Loggings
   */
  async triggerNow() {
    console.log('🔄 Manuelles Auto-Logging getriggert');
    await this.createDailyLogs();
  }
}

// Singleton Instance
const autoGrowthLogger = new AutoGrowthLogger();

module.exports = autoGrowthLogger;
