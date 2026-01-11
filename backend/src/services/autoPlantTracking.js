const PlantGrowthLog = require('../models/PlantGrowthLog');
const Plant = require('../models/Plant');
const SensorLog = require('../models/SensorLog');

/**
 * Automatisches Plant Tracking Service
 * Sammelt täglich Sensordaten für jede aktive Pflanze
 */

class AutoPlantTrackingService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    // Speichere tägliche Durchschnittswerte
    this.dailyAverages = new Map(); // plantId -> { temp: [], humidity: [], soil: [] }
  }

  /**
   * Startet den automatischen Tracking Service
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Auto Plant Tracking läuft bereits');
      return;
    }

    console.log('🌱 Auto Plant Tracking Service gestartet');
    this.isRunning = true;

    // Sammle Daten alle 10 Minuten
    this.intervalId = setInterval(() => {
      this.collectSensorData();
    }, 10 * 60 * 1000); // 10 Minuten

    // Speichere tägliche Zusammenfassung um Mitternacht
    this.scheduleDailySave();

    // Erste Datensammlung sofort
    this.collectSensorData();
  }

  /**
   * Stoppt den Service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Auto Plant Tracking Service gestoppt');
  }

  /**
   * Sammelt aktuelle Sensordaten
   */
  async collectSensorData() {
    try {
      // Hole alle aktiven Pflanzen (nicht leer, nicht geerntet)
      const activePlants = await Plant.find({
        stage: { $nin: ['Leer', 'Geerntet'] },
        slotId: { $exists: true, $ne: null }
      });

      if (activePlants.length === 0) {
        return; // Keine aktiven Pflanzen
      }

      // Hole neueste Sensordaten
      const latestSensorData = await SensorLog.findOne()
        .sort({ timestamp: -1 })
        .limit(1);

      if (!latestSensorData) {
        return; // Keine Sensordaten verfügbar
      }

      // Berechne Durchschnittstemperatur und -luftfeuchtigkeit aus den 3 Sensoren
      const readings = latestSensorData.readings || {};
      const temps = [readings.temp_bottom, readings.temp_middle, readings.temp_top].filter(t => t && t > 0);
      const humidities = [readings.humidity_bottom, readings.humidity_middle, readings.humidity_top].filter(h => h && h > 0);

      const temp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
      const humidity = humidities.length > 0 ? humidities.reduce((a, b) => a + b, 0) / humidities.length : null;
      const soilData = readings.soilMoisture || [];

      // Sammle Daten für jede Pflanze
      for (const plant of activePlants) {
        const plantId = plant._id.toString();

        // Initialisiere Array für diese Pflanze falls nicht vorhanden
        if (!this.dailyAverages.has(plantId)) {
          this.dailyAverages.set(plantId, {
            temp: [],
            humidity: [],
            soil: [],
            vpd: []
          });
        }

        const plantData = this.dailyAverages.get(plantId);

        // Füge Messwerte hinzu
        if (temp && temp > 0) {
          plantData.temp.push(temp);
        }

        if (humidity && humidity > 0) {
          plantData.humidity.push(humidity);
        }

        // Bodenfeuchtigkeit für spezifischen Slot
        if (plant.slotId && soilData[plant.slotId - 1]) {
          const soilMoisture = soilData[plant.slotId - 1];
          if (soilMoisture > 0) {
            plantData.soil.push(soilMoisture);
          }
        }

        // Berechne VPD wenn Temp und Humidity verfügbar
        if (temp && temp > 0 && humidity && humidity > 0) {
          const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
          const vpd = svp * (1 - humidity / 100);
          plantData.vpd.push(vpd);
        }
      }

    } catch (error) {
      console.error('❌ Fehler beim Sammeln der Sensordaten:', error);
    }
  }

  /**
   * Berechnet Durchschnittswert aus Array
   */
  calculateAverage(values) {
    if (!values || values.length === 0) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  /**
   * Speichert tägliche Zusammenfassung
   */
  async saveDailySummary() {
    try {
      console.log('💾 Speichere tägliche Plant Tracking Daten...');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Verarbeite gesammelte Daten für jede Pflanze
      for (const [plantId, data] of this.dailyAverages.entries()) {
        try {
          // Berechne Durchschnittswerte
          const avgTemp = this.calculateAverage(data.temp);
          const avgHumidity = this.calculateAverage(data.humidity);
          const avgSoilMoisture = this.calculateAverage(data.soil);
          const avgVPD = this.calculateAverage(data.vpd);

          // Prüfe ob bereits ein Log für heute existiert
          let growthLog = await PlantGrowthLog.findOne({
            plant: plantId,
            date: today
          });

          if (growthLog) {
            // Update existierenden Log
            if (avgTemp !== null) growthLog.environment.avgTemperature = avgTemp;
            if (avgHumidity !== null) growthLog.environment.avgHumidity = avgHumidity;
            if (avgSoilMoisture !== null) growthLog.environment.avgSoilMoisture = avgSoilMoisture;
            if (avgVPD !== null) growthLog.environment.avgVPD = avgVPD;

            await growthLog.save();
            console.log(`✅ Growth Log für Pflanze ${plantId} aktualisiert`);
          } else {
            // Erstelle neuen Log nur mit Umgebungsdaten
            growthLog = new PlantGrowthLog({
              plant: plantId,
              date: today,
              environment: {
                avgTemperature: avgTemp,
                avgHumidity: avgHumidity,
                avgSoilMoisture: avgSoilMoisture,
                avgVPD: avgVPD
              },
              measurements: {
                height: { value: null },
                width: { value: null }
              },
              health: {
                overall: 5 // Default
              }
            });

            await growthLog.save();
            console.log(`✅ Neuer Growth Log für Pflanze ${plantId} erstellt`);
          }

        } catch (error) {
          console.error(`❌ Fehler beim Speichern für Pflanze ${plantId}:`, error);
        }
      }

      // Lösche gesammelte Daten für neuen Tag
      this.dailyAverages.clear();
      console.log('✅ Tägliche Plant Tracking Daten gespeichert');

    } catch (error) {
      console.error('❌ Fehler beim Speichern der täglichen Zusammenfassung:', error);
    }
  }

  /**
   * Plane tägliches Speichern um Mitternacht
   */
  scheduleDailySave() {
    const now = new Date();
    const night = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1, // Nächster Tag
      0, 0, 0 // Mitternacht
    );
    const msToMidnight = night.getTime() - now.getTime();

    // Speichere um Mitternacht
    setTimeout(() => {
      this.saveDailySummary();
      // Wiederhole täglich
      setInterval(() => {
        this.saveDailySummary();
      }, 24 * 60 * 60 * 1000); // 24 Stunden
    }, msToMidnight);

    console.log(`⏰ Tägliches Speichern geplant in ${Math.round(msToMidnight / 1000 / 60)} Minuten`);
  }

  /**
   * Manuelles Triggern des täglichen Saves (für Tests)
   */
  async triggerDailySave() {
    await this.saveDailySummary();
  }

  /**
   * Hole Status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      trackedPlants: this.dailyAverages.size,
      dataPoints: Array.from(this.dailyAverages.values()).reduce((sum, data) => {
        return sum + data.temp.length + data.humidity.length + data.soil.length + data.vpd.length;
      }, 0)
    };
  }
}

// Singleton Instance
const autoPlantTracking = new AutoPlantTrackingService();

module.exports = autoPlantTracking;
