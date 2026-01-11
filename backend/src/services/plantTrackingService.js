const PlantGrowthLog = require('../models/PlantGrowthLog');
const Plant = require('../models/Plant');
const SensorLog = require('../models/SensorLog');
const vpdService = require('./vpdService');

/**
 * Unified Plant Tracking Service
 *
 * Combines functionality from autoPlantTracking and autoGrowthLogger:
 * - Collects sensor data throughout the day (every 10 minutes)
 * - Creates/updates daily growth logs with aggregated sensor averages
 * - Provides real-time tracking status
 *
 * @unified Replaces: autoPlantTracking.js + autoGrowthLogger.js
 */
class PlantTrackingService {
  constructor() {
    this.isRunning = false;
    this.collectionIntervalId = null;
    this.collectionIntervalMinutes = 10; // Collect data every 10 minutes
    this.dailyAverages = new Map(); // plantId -> { temp: [], humidity: [], soil: [], vpd: [] }
    this.lastDailySave = null;
  }

  // ============================================
  // SERVICE LIFECYCLE
  // ============================================

  /**
   * Start the plant tracking service
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Plant Tracking Service already running');
      return;
    }

    console.log('🌱 Plant Tracking Service started');
    this.isRunning = true;

    // Collect sensor data every 10 minutes
    this.collectionIntervalId = setInterval(() => {
      this.collectSensorData();
    }, this.collectionIntervalMinutes * 60 * 1000);

    // Schedule daily save at midnight
    this.scheduleDailySave();

    // Immediate first collection
    this.collectSensorData();
  }

  /**
   * Stop the service
   */
  stop() {
    if (this.collectionIntervalId) {
      clearInterval(this.collectionIntervalId);
      this.collectionIntervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Plant Tracking Service stopped');
  }

  // ============================================
  // DATA COLLECTION (Real-time)
  // ============================================

  /**
   * Collect current sensor data for all active plants
   * Runs every 10 minutes to build daily averages
   */
  async collectSensorData() {
    try {
      // Get all active plants (not empty, not harvested)
      const activePlants = await Plant.find({
        stage: { $nin: ['Leer', 'Geerntet'] },
        slotId: { $exists: true, $ne: null }
      });

      if (activePlants.length === 0) {
        return; // No active plants
      }

      // Get latest sensor data
      const latestSensorData = await SensorLog.findOne()
        .sort({ timestamp: -1 })
        .limit(1);

      if (!latestSensorData) {
        return; // No sensor data available
      }

      // Calculate average temp and humidity from 3 sensors
      const readings = latestSensorData.readings || {};
      const temps = [readings.temp_bottom, readings.temp_middle, readings.temp_top]
        .filter(t => t && t > 0);
      const humidities = [readings.humidity_bottom, readings.humidity_middle, readings.humidity_top]
        .filter(h => h && h > 0);

      const temp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
      const humidity = humidities.length > 0 ? humidities.reduce((a, b) => a + b, 0) / humidities.length : null;
      const soilData = readings.soilMoisture || [];

      // Collect data for each plant
      for (const plant of activePlants) {
        const plantId = plant._id.toString();

        // Initialize array for this plant if needed
        if (!this.dailyAverages.has(plantId)) {
          this.dailyAverages.set(plantId, {
            temp: [],
            humidity: [],
            soil: [],
            vpd: []
          });
        }

        const plantData = this.dailyAverages.get(plantId);

        // Add measurements
        if (temp && temp > 0) {
          plantData.temp.push(temp);
        }

        if (humidity && humidity > 0) {
          plantData.humidity.push(humidity);
        }

        // Soil moisture for specific slot
        if (plant.slotId && soilData[plant.slotId - 1]) {
          const soilMoisture = soilData[plant.slotId - 1];
          if (soilMoisture > 0) {
            plantData.soil.push(soilMoisture);
          }
        }

        // Calculate VPD if temp and humidity available
        if (temp && temp > 0 && humidity && humidity > 0) {
          const vpd = vpdService.calculateVPD(temp, humidity);
          if (vpd !== null) {
            plantData.vpd.push(vpd);
          }
        }
      }

    } catch (error) {
      console.error('❌ Error collecting sensor data:', error);
    }
  }

  // ============================================
  // DAILY AGGREGATION & PERSISTENCE
  // ============================================

  /**
   * Save daily summary for all plants
   * Uses both in-memory averages AND MongoDB aggregation as fallback
   */
  async saveDailySummary() {
    try {
      console.log('💾 Saving daily plant tracking data...');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all active plants
      const activePlants = await Plant.find({
        stage: { $nin: ['Leer', 'Geerntet'] }
      });

      if (activePlants.length === 0) {
        console.log('📊 No active plants for logging');
        return;
      }

      console.log(`📊 Creating daily logs for ${activePlants.length} plants...`);

      for (const plant of activePlants) {
        await this.saveLogForPlant(plant, today);
      }

      // Clear collected data for new day
      this.dailyAverages.clear();
      this.lastDailySave = new Date();
      console.log(`✅ Daily plant tracking data saved (${activePlants.length} plants)`);

    } catch (error) {
      console.error('❌ Error saving daily summary:', error);
    }
  }

  /**
   * Save or update growth log for a single plant
   * Uses in-memory data if available, otherwise falls back to MongoDB aggregation
   */
  async saveLogForPlant(plant, date) {
    try {
      const plantId = plant._id.toString();

      // Check if log already exists for today
      let growthLog = await PlantGrowthLog.findOne({
        plant: plant._id,
        date: date
      });

      // Calculate averages from in-memory data
      let avgTemp = null, avgHumidity = null, avgSoilMoisture = null, avgVPD = null;

      if (this.dailyAverages.has(plantId)) {
        // Use in-memory collected data (more accurate)
        const data = this.dailyAverages.get(plantId);
        avgTemp = this.calculateAverage(data.temp);
        avgHumidity = this.calculateAverage(data.humidity);
        avgSoilMoisture = this.calculateAverage(data.soil);
        avgVPD = this.calculateAverage(data.vpd);
      } else {
        // Fallback to MongoDB aggregation (in case service was restarted)
        const aggregatedData = await this.calculateDailyAveragesFromDB(date);
        avgTemp = aggregatedData.avgTemperature;
        avgHumidity = aggregatedData.avgHumidity;
        avgSoilMoisture = aggregatedData.avgSoilMoisture;
        avgVPD = aggregatedData.avgVPD;
      }

      if (growthLog) {
        // Update existing log
        if (avgTemp !== null) growthLog.environment.avgTemperature = Math.round(avgTemp * 10) / 10;
        if (avgHumidity !== null) growthLog.environment.avgHumidity = Math.round(avgHumidity * 10) / 10;
        if (avgSoilMoisture !== null) growthLog.environment.avgSoilMoisture = Math.round(avgSoilMoisture * 10) / 10;
        if (avgVPD !== null) growthLog.environment.avgVPD = Math.round(avgVPD * 100) / 100;

        await growthLog.save();
        console.log(`✅ Growth log updated for ${plant.name || `Slot ${plant.slotId}`}`);
      } else {
        // Create new log with environment data
        growthLog = new PlantGrowthLog({
          plant: plant._id,
          date: date,
          environment: {
            avgTemperature: avgTemp !== null ? Math.round(avgTemp * 10) / 10 : null,
            avgHumidity: avgHumidity !== null ? Math.round(avgHumidity * 10) / 10 : null,
            avgSoilMoisture: avgSoilMoisture !== null ? Math.round(avgSoilMoisture * 10) / 10 : null,
            avgVPD: avgVPD !== null ? Math.round(avgVPD * 100) / 100 : null,
            lightHours: null, // Can be calculated from light PWM later
            waterAmount: null // Will be manually entered
          },
          measurements: {
            height: { value: null, unit: 'cm' },
            width: { value: null, unit: 'cm' },
            stemDiameter: { value: null, unit: 'mm' }
          },
          health: {
            overall: 5, // Default
            leafColor: 'dunkelgrün'
          },
          notes: 'Automatically created - Please add manual measurements'
        });

        await growthLog.save();
        console.log(`✅ New growth log created for ${plant.name || `Slot ${plant.slotId}`}`);
      }

    } catch (error) {
      console.error(`❌ Error saving log for plant ${plant.name}:`, error);
    }
  }

  /**
   * Calculate daily averages from MongoDB (fallback method)
   * Used when in-memory data is not available (e.g., after service restart)
   */
  async calculateDailyAveragesFromDB(date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Aggregate sensor data from SensorLog
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
            // Use ESP32 calculated average or calculate from individual sensors
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
        // No data available
        return {
          avgTemperature: null,
          avgHumidity: null,
          avgVPD: null,
          avgSoilMoisture: null
        };
      }

      const data = result[0];

      // Calculate VPD from temp + humidity
      let vpd = null;
      if (data.avgTemperature && data.avgHumidity) {
        vpd = vpdService.calculateVPD(data.avgTemperature, data.avgHumidity);
      }

      return {
        avgTemperature: data.avgTemperature,
        avgHumidity: data.avgHumidity,
        avgVPD: vpd,
        avgSoilMoisture: data.avgSoilMoisture
      };

    } catch (error) {
      console.error('Error calculating averages from DB:', error);
      return {
        avgTemperature: null,
        avgHumidity: null,
        avgVPD: null,
        avgSoilMoisture: null
      };
    }
  }

  // ============================================
  // SCHEDULING
  // ============================================

  /**
   * Schedule daily save at midnight
   */
  scheduleDailySave() {
    const now = new Date();
    const night = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1, // Next day
      0, 0, 0 // Midnight
    );
    const msToMidnight = night.getTime() - now.getTime();

    // Save at midnight
    setTimeout(() => {
      this.saveDailySummary();
      // Repeat daily
      setInterval(() => {
        this.saveDailySummary();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, msToMidnight);

    console.log(`⏰ Daily save scheduled in ${Math.round(msToMidnight / 1000 / 60)} minutes`);
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Calculate average from array of values
   */
  calculateAverage(values) {
    if (!values || values.length === 0) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  /**
   * Manual trigger for daily save (for testing)
   */
  async triggerDailySave() {
    await this.saveDailySummary();
  }

  /**
   * Manual trigger for immediate log creation
   */
  async triggerNow() {
    console.log('🔄 Manual logging triggered');
    await this.saveDailySummary();
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      trackedPlants: this.dailyAverages.size,
      dataPoints: Array.from(this.dailyAverages.values()).reduce((sum, data) => {
        return sum + data.temp.length + data.humidity.length + data.soil.length + data.vpd.length;
      }, 0),
      lastDailySave: this.lastDailySave,
      collectionIntervalMinutes: this.collectionIntervalMinutes
    };
  }
}

// Singleton Instance
const plantTrackingService = new PlantTrackingService();

module.exports = plantTrackingService;
