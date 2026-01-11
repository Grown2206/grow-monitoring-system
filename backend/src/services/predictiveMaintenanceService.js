const MaintenanceAnalytics = require('../models/MaintenanceAnalytics');

class PredictiveMaintenanceService {
  constructor() {
    // Geräte-spezifische Konfiguration
    this.deviceConfig = {
      fan_exhaust: {
        expectedLifetime: 8760, // 1 Jahr in Stunden
        maintenanceInterval: 720, // 30 Tage in Stunden
        degradationThreshold: 0.15,
        normalRange: { rpm: { min: 800, max: 3000 } }
      },
      pump: {
        expectedLifetime: 17520, // 2 Jahre
        maintenanceInterval: 2160, // 90 Tage
        degradationThreshold: 0.2,
        normalRange: { pressure: { min: 1, max: 5 } }
      },
      light: {
        expectedLifetime: 43800, // 5 Jahre
        maintenanceInterval: 4380, // 6 Monate
        degradationThreshold: 0.1,
        normalRange: { brightness: { min: 0, max: 100 } }
      },
      sensor: {
        expectedLifetime: 26280, // 3 Jahre
        maintenanceInterval: 2160, // 90 Tage (Kalibrierung)
        degradationThreshold: 0.25,
        normalRange: {}
      },
      filter: {
        expectedLifetime: 2160, // 90 Tage
        maintenanceInterval: 720, // 30 Tage
        degradationThreshold: 0.3,
        normalRange: {}
      }
    };
  }

  /**
   * Analysiere Sensor-Daten für ein Gerät
   */
  async analyzeSensorData(deviceType, deviceId, sensorData) {
    const config = this.deviceConfig[deviceType];
    if (!config) {
      throw new Error(`Unknown device type: ${deviceType}`);
    }

    // Berechne Statistiken
    const stats = this.calculateStatistics(sensorData);

    // Anomalie-Erkennung
    const anomalies = this.detectAnomalies(sensorData, stats, config);

    // Health Score berechnen
    const healthScore = this.calculateHealthScore(stats, anomalies, config);

    // Vorhersagen treffen
    const predictions = this.predictMaintenance(stats, healthScore, config);

    return {
      stats,
      anomalies,
      healthScore,
      predictions
    };
  }

  /**
   * Berechne statistische Metriken
   */
  calculateStatistics(data) {
    if (!data || data.length === 0) {
      return { mean: 0, stdDev: 0, min: 0, max: 0, trend: 0 };
    }

    const values = data.map(d => d.value);
    const n = values.length;

    // Mittelwert
    const mean = values.reduce((a, b) => a + b, 0) / n;

    // Standardabweichung
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Min/Max
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Trend (Linear Regression Slope)
    const trend = this.calculateTrend(data);

    return { mean, stdDev, min, max, trend };
  }

  /**
   * Berechne Trend mit linearer Regression
   */
  calculateTrend(data) {
    const n = data.length;
    if (n < 2) return 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    data.forEach((point, i) => {
      const x = i;
      const y = point.value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Erkenne Anomalien mit Z-Score und weiteren Metriken
   */
  detectAnomalies(data, stats, config) {
    const anomalies = [];
    const zScoreThreshold = 3; // 3 Sigma

    data.forEach((point, i) => {
      const zScore = stats.stdDev > 0 ? Math.abs((point.value - stats.mean) / stats.stdDev) : 0;

      // Z-Score Anomalie
      if (zScore > zScoreThreshold) {
        anomalies.push({
          timestamp: point.timestamp,
          type: point.value > stats.mean ? 'spike' : 'degradation',
          severity: zScore > 4 ? 'critical' : zScore > 3.5 ? 'high' : 'medium',
          description: `Wert ${point.value.toFixed(2)} weicht um ${zScore.toFixed(2)} Sigma vom Durchschnitt ab`,
          value: point.value
        });
      }

      // Drift-Erkennung (zu starker negativer Trend)
      if (stats.trend < -config.degradationThreshold) {
        anomalies.push({
          timestamp: new Date(),
          type: 'drift',
          severity: 'medium',
          description: `Negative Drift erkannt: ${stats.trend.toFixed(4)}`,
          value: stats.trend
        });
      }

      // Pattern-Erkennung: Plötzliche Änderungen
      if (i > 0) {
        const change = Math.abs(point.value - data[i - 1].value);
        const percentChange = data[i - 1].value !== 0 ? (change / Math.abs(data[i - 1].value)) : 0;

        if (percentChange > 0.5) { // 50% Änderung
          anomalies.push({
            timestamp: point.timestamp,
            type: 'unusual_pattern',
            severity: 'high',
            description: `Plötzliche Änderung von ${percentChange.toFixed(1)}%`,
            value: point.value
          });
        }
      }
    });

    return anomalies;
  }

  /**
   * Berechne Health Score (0-100)
   */
  calculateHealthScore(stats, anomalies, config) {
    let score = 100;

    // Reduziere Score basierend auf Anomalien
    anomalies.forEach(anomaly => {
      switch (anomaly.severity) {
        case 'critical': score -= 20; break;
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    });

    // Reduziere Score basierend auf Trend
    if (stats.trend < -config.degradationThreshold) {
      score -= 15;
    } else if (stats.trend < 0) {
      score -= 5;
    }

    // Reduziere Score basierend auf Variabilität
    const cv = stats.mean !== 0 ? stats.stdDev / stats.mean : 0; // Coefficient of Variation
    if (cv > 0.3) score -= 10; // Hohe Variabilität
    else if (cv > 0.2) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Vorhersage der nächsten Wartung
   */
  predictMaintenance(stats, healthScore, config) {
    const now = new Date();

    // Berechne geschätzte verbleibende Lebensdauer
    const degradationRate = Math.abs(stats.trend);
    const estimatedRemainingLife = degradationRate > 0
      ? (stats.mean / degradationRate) * 24 // in Stunden
      : config.expectedLifetime;

    // Nächstes Wartungsdatum basierend auf Health Score und Trend
    let maintenanceIntervalMultiplier = 1.0;

    if (healthScore < 50) maintenanceIntervalMultiplier = 0.25;
    else if (healthScore < 70) maintenanceIntervalMultiplier = 0.5;
    else if (healthScore < 85) maintenanceIntervalMultiplier = 0.75;

    const hoursUntilMaintenance = config.maintenanceInterval * maintenanceIntervalMultiplier;
    const nextMaintenanceDate = new Date(now.getTime() + hoursUntilMaintenance * 60 * 60 * 1000);

    // Ausfallwahrscheinlichkeit (0-1)
    const failureProbability = this.calculateFailureProbability(healthScore, estimatedRemainingLife, config);

    // Empfohlene Aktion
    let recommendedAction = 'none';
    if (healthScore < 30 || failureProbability > 0.8) {
      recommendedAction = 'replace';
    } else if (healthScore < 50 || failureProbability > 0.6) {
      recommendedAction = 'urgent_maintenance';
    } else if (healthScore < 70 || failureProbability > 0.4) {
      recommendedAction = 'schedule_maintenance';
    } else if (healthScore < 85) {
      recommendedAction = 'monitor';
    }

    return {
      nextMaintenanceDate,
      estimatedRemainingLife: Math.max(0, estimatedRemainingLife),
      failureProbability: Math.min(1, Math.max(0, failureProbability)),
      recommendedAction
    };
  }

  /**
   * Berechne Ausfallwahrscheinlichkeit
   */
  calculateFailureProbability(healthScore, remainingLife, config) {
    // Weibull-ähnliche Verteilung
    const healthFactor = (100 - healthScore) / 100;
    const lifeFactor = 1 - (remainingLife / config.expectedLifetime);

    // Kombiniere beide Faktoren
    const probability = (healthFactor * 0.6) + (lifeFactor * 0.4);

    return Math.min(1, Math.max(0, probability));
  }

  /**
   * Update Analytics für ein Gerät
   */
  async updateDeviceAnalytics(deviceType, deviceId, userId = null) {
    try {
      // Hole letzte 7 Tage Sensor-Daten
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Mock: In echter Implementation würden wir SensorData abfragen
      // Für jetzt verwenden wir Dummy-Daten
      const sensorData = this.generateMockSensorData(deviceType, 168); // 7 Tage * 24 Stunden

      // Analysiere Daten
      const analysis = await this.analyzeSensorData(deviceType, deviceId, sensorData);

      // Finde oder erstelle Analytics-Eintrag
      let analytics = await MaintenanceAnalytics.findOne({ deviceType, deviceId });

      if (!analytics) {
        analytics = new MaintenanceAnalytics({
          deviceType,
          deviceId,
          userId
        });
      }

      // Update Metrics
      analytics.metrics = {
        operatingHours: (analytics.metrics?.operatingHours || 0) + 168,
        cycleCount: (analytics.metrics?.cycleCount || 0) + Math.floor(Math.random() * 1000),
        averageDutyCycle: analysis.stats.mean,
        powerConsumption: analysis.stats.mean * 168 * 0.1, // Mock
        lastReading: sensorData[sensorData.length - 1].value
      };

      analytics.healthScore = analysis.healthScore;
      analytics.anomalyScore = analysis.anomalies.length > 0 ? analysis.anomalies.length / 10 : 0;
      analytics.predictions = analysis.predictions;
      analytics.sensorBaseline = analysis.stats;

      // Füge nur neue Anomalien hinzu (nicht Duplikate)
      analysis.anomalies.forEach(anomaly => {
        const isDuplicate = analytics.anomalies.some(
          a => Math.abs(new Date(a.timestamp) - new Date(anomaly.timestamp)) < 60000 // 1 Minute
        );
        if (!isDuplicate) {
          analytics.anomalies.push(anomaly);
        }
      });

      // Behalte nur letzte 50 Anomalien
      if (analytics.anomalies.length > 50) {
        analytics.anomalies = analytics.anomalies.slice(-50);
      }

      await analytics.save();
      return analytics;

    } catch (error) {
      console.error('Error updating device analytics:', error);
      throw error;
    }
  }

  /**
   * Generiere Mock Sensor-Daten (für Demo)
   */
  generateMockSensorData(deviceType, count) {
    const data = [];
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;

    // Basis-Wert basierend auf Gerätetyp
    let baseValue = 50;
    let variance = 5;
    let degradation = 0;

    switch (deviceType) {
      case 'fan_exhaust':
        baseValue = 1500; // RPM
        variance = 100;
        degradation = -0.5; // Langsame Degradation
        break;
      case 'pump':
        baseValue = 3;
        variance = 0.2;
        degradation = -0.01;
        break;
      case 'sensor':
        baseValue = 25;
        variance = 2;
        degradation = -0.02;
        break;
    }

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(now - (count - i) * hourInMs);
      const noise = (Math.random() - 0.5) * variance * 2;
      const trend = degradation * i;

      // Gelegentliche Anomalien einfügen (5% Chance)
      const anomaly = Math.random() < 0.05 ? variance * (Math.random() > 0.5 ? 3 : -3) : 0;

      const value = baseValue + trend + noise + anomaly;

      data.push({
        timestamp,
        value: Math.max(0, value)
      });
    }

    return data;
  }

  /**
   * Hole alle Geräte-Analytics
   */
  async getAllDeviceAnalytics(userId = null) {
    const query = userId ? { userId } : {};
    return await MaintenanceAnalytics.find(query).sort({ healthScore: 1 });
  }

  /**
   * Hole Analytics für spezifisches Gerät
   */
  async getDeviceAnalytics(deviceType, deviceId) {
    return await MaintenanceAnalytics.findOne({ deviceType, deviceId });
  }

  /**
   * Füge Wartungs-Historie hinzu
   */
  async addMaintenanceRecord(deviceType, deviceId, record) {
    const analytics = await MaintenanceAnalytics.findOne({ deviceType, deviceId });

    if (!analytics) {
      throw new Error('Device analytics not found');
    }

    analytics.maintenanceHistory.push(record);

    // Nach Wartung: Health Score verbessern
    if (record.type === 'full_service' || record.type === 'part_replacement') {
      analytics.healthScore = Math.min(100, analytics.healthScore + 30);
      analytics.metrics.operatingHours = 0; // Reset
    } else if (record.type === 'cleaning' || record.type === 'calibration') {
      analytics.healthScore = Math.min(100, analytics.healthScore + 15);
    }

    // Predictions neu berechnen
    const config = this.deviceConfig[deviceType];
    const stats = analytics.sensorBaseline;
    analytics.predictions = this.predictMaintenance(stats, analytics.healthScore, config);

    await analytics.save();
    return analytics;
  }

  /**
   * Initialisiere Analytics für Standard-Geräte
   */
  async initializeStandardDevices(userId = null) {
    const devices = [
      { type: 'fan_exhaust', id: 'fan_main' },
      { type: 'pump', id: 'pump_main' },
      { type: 'light', id: 'light_main' },
      { type: 'sensor', id: 'temp_sensor' },
      { type: 'sensor', id: 'humidity_sensor' },
      { type: 'filter', id: 'carbon_filter' }
    ];

    const results = [];
    for (const device of devices) {
      try {
        const analytics = await this.updateDeviceAnalytics(device.type, device.id, userId);
        results.push(analytics);
      } catch (error) {
        console.error(`Error initializing ${device.type}:${device.id}`, error);
      }
    }

    return results;
  }
}

module.exports = new PredictiveMaintenanceService();
