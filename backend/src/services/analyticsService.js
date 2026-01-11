const SensorLog = require('../models/SensorLog');
const Plant = require('../models/Plant');
const vpdService = require('./vpdService');

class AnalyticsService {

  /**
   * Berechnet aggregierte Statistiken f�r einen bestimmten Zeitraum
   * WICHTIG: Nutzt readings.temp (fertiger Durchschnitt) und ignoriert 0.0
   */
  async getStats(hours = 24) {
    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

    const logs = await SensorLog.find({
      timestamp: { $gte: hoursAgo }
    }).lean();

    if (!logs.length) return null;

    // Initialisierung der Summen
    const sums = {
      temp: 0, humidity: 0, vpd: 0, lux: 0,
      co2: 0, par: 0, count: 0
    };

    const minMax = {
      temp: { min: 100, max: 0 },
      humidity: { min: 100, max: 0 },
      vpd: { min: 10, max: 0 }
    };

    let validCount = 0;

    logs.forEach(log => {
      const r = log.readings || {};
      
      // 1. Hole Temperatur (Priorit�t: fertig berechneter Wert -> dann Einzelwerte)
      let temp = r.temp;
      if (!temp || temp === 0) {
         // Fallback: Berechne aus Einzelwerten, ignoriere 0
         const temps = [r.temp_bottom, r.temp_middle, r.temp_top].filter(t => t && t > 0);
         if (temps.length > 0) {
           temp = temps.reduce((a, b) => a + b, 0) / temps.length;
         }
      }

      // 2. Hole Feuchtigkeit
      let hum = r.humidity;
      if (!hum || hum === 0) {
          const hums = [r.humidity_bottom, r.humidity_middle, r.humidity_top].filter(h => h && h > 0);
          if (hums.length > 0) {
              hum = hums.reduce((a, b) => a + b, 0) / hums.length;
          }
      }

      // Nur wenn wir valide Werte haben, nehmen wir sie in die Statistik auf
      if (temp > 0 && hum > 0) {
        sums.temp += temp;
        sums.humidity += hum;
        sums.lux += (r.lux || 0);
        
        // VPD Berechnung
        const vpd = this.calculateVPD(temp, hum);
        sums.vpd += (vpd > 0 ? vpd : 0);

        // Min/Max Update
        if (temp < minMax.temp.min) minMax.temp.min = temp;
        if (temp > minMax.temp.max) minMax.temp.max = temp;
        if (hum < minMax.humidity.min) minMax.humidity.min = hum;
        if (hum > minMax.humidity.max) minMax.humidity.max = hum;
        if (vpd < minMax.vpd.min) minMax.vpd.min = vpd;
        if (vpd > minMax.vpd.max) minMax.vpd.max = vpd;

        validCount++;
      }
    });

    if (validCount === 0) return null;

    return {
      period: `${hours}h`,
      samples: validCount,
      averages: {
        temp: parseFloat((sums.temp / validCount).toFixed(1)),
        humidity: parseFloat((sums.humidity / validCount).toFixed(1)),
        vpd: parseFloat((sums.vpd / validCount).toFixed(2)),
        lux: Math.round(sums.lux / validCount)
      },
      ranges: minMax
    };
  }

  /**
   * Generiert Wachstums-Insights basierend auf Sensordaten & Pflanzenphase
   */
  async getGrowthInsights() {
    const stats = await this.getStats(24); // Letzte 24h
    if (!stats) return [];

    const activePlant = await Plant.findOne({ status: 'active' });
    const insights = [];

    // Pr�fe VPD
    const avgVPD = stats.averages.vpd;
    let targetVPD = { min: 0.8, max: 1.2 }; // Default Vegetative
    
    if (activePlant) {
      if (activePlant.stage === 'seedling') targetVPD = { min: 0.4, max: 0.8 };
      else if (activePlant.stage === 'flowering') targetVPD = { min: 1.2, max: 1.6 };
    }

    if (avgVPD < targetVPD.min) {
      insights.push({
        type: 'warning',
        metric: 'VPD',
        message: `VPD ist niedrig (${avgVPD}). Risiko f�r Schimmel. L�ftung erh�hen.`,
        action: 'fan_increase'
      });
    } else if (avgVPD > targetVPD.max) {
      insights.push({
        type: 'warning',
        metric: 'VPD',
        message: `VPD ist hoch (${avgVPD}). Pflanzen stressen. Luftfeuchte erh�hen.`,
        action: 'humidifier_on'
      });
    } else {
      insights.push({
        type: 'success',
        metric: 'VPD',
        message: `VPD optimal im Zielbereich (${targetVPD.min}-${targetVPD.max}).`,
      });
    }

    // DLI Sch�tzung
    const hoursLight = 18; 
    const avgPPFD = stats.averages.lux / 55; 
    const dli = (avgPPFD * 3600 * hoursLight) / 1000000;

    insights.push({
      type: 'info',
      metric: 'DLI',
      message: `Gesch�tzter DLI: ${dli.toFixed(1)} mol/m�/d (Ziel: 30-40 f�r Bl�te)`,
    });

    return insights;
  }

  /**
   * Erkennt Anomalien in Sensordaten
   */
  async detectAnomalies(hours = 24) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      const data = await SensorLog.find({
        timestamp: { $gte: since }
      }).sort({ timestamp: 1 }).lean();

      if (data.length < 10) {
        return { anomalies: [], message: 'Nicht genug Daten f�r Analyse' };
      }

      const anomalies = [];

      // HELPER: Extrahiere saubere Werte (ignoriere 0.0)
      const extractValidValues = (logs, type) => {
        return logs.map(log => {
            const r = log.readings || {};
            let val = r[type]; 

            if (!val || val === 0) {
                const subValues = [r[`${type}_bottom`], r[`${type}_middle`], r[`${type}_top`]]
                                  .filter(v => v != null && v > 0);
                if (subValues.length > 0) {
                    val = subValues.reduce((a, b) => a + b, 0) / subValues.length;
                }
            }
            return { val: val || 0, timestamp: log.timestamp };
        }).filter(item => item.val > 0); 
      };

      // 1. Temperatur-Anomalien
      const tempValues = extractValidValues(data, 'temp');
      if (tempValues.length > 5) {
          const tempStats = this.calculateStats(tempValues.map(v => v.val));
          const tempAnomalies = tempValues.filter(d => {
            const zScore = Math.abs((d.val - tempStats.mean) / tempStats.stdDev);
            return zScore > 2.5; 
          });

          if (tempAnomalies.length > 0) {
            anomalies.push({
              type: 'temperature',
              severity: 'high',
              count: tempAnomalies.length,
              message: `${tempAnomalies.length} ungew�hnliche Temperaturwerte erkannt`,
              values: tempAnomalies.slice(0, 5)
            });
          }
      }

      // 2. Feuchtigkeits-Anomalien
      const humValues = extractValidValues(data, 'humidity');
      if (humValues.length > 5) {
        const humStats = this.calculateStats(humValues.map(v => v.val));
        const humAnomalies = humValues.filter(d => {
            const zScore = Math.abs((d.val - humStats.mean) / humStats.stdDev);
            return zScore > 2.5;
        });

        if (humAnomalies.length > 0) {
            anomalies.push({
            type: 'humidity',
            severity: 'medium',
            count: humAnomalies.length,
            message: `${humAnomalies.length} ungew�hnliche Feuchtigkeitswerte erkannt`,
            values: humAnomalies.slice(0, 5)
            });
        }
      }

      return { anomalies, analyzedCount: data.length };

    } catch (error) {
      console.error('Fehler bei Anomalie-Erkennung:', error);
      return { anomalies: [], error: error.message };
    }
  }

  /**
   * Generiert Optimierungsvorschl�ge
   */
  async getOptimizationSuggestions() {
    try {
      const last7Days = await SensorLog.find({
        timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }).lean();

      if (last7Days.length < 50) return { suggestions: [], message: 'Mehr Daten ben�tigt' };

      const suggestions = [];

      const validData = last7Days.map(log => {
        const r = log.readings || {};
        
        let temp = r.temp;
        if (!temp || temp === 0) {
             const ts = [r.temp_bottom, r.temp_middle, r.temp_top].filter(v => v > 0);
             if (ts.length) temp = ts.reduce((a,b)=>a+b,0)/ts.length;
        }

        let hum = r.humidity;
        if (!hum || hum === 0) {
             const hs = [r.humidity_bottom, r.humidity_middle, r.humidity_top].filter(v => v > 0);
             if (hs.length) hum = hs.reduce((a,b)=>a+b,0)/hs.length;
        }

        return { temp, humidity: hum };
      }).filter(d => d.temp > 0 && d.humidity > 0);

      if (validData.length === 0) return { suggestions: [], message: 'Keine validen Sensordaten' };

      const tempValues = validData.map(d => d.temp);
      const humValues = validData.map(d => d.humidity);

      const tempStats = this.calculateStats(tempValues);
      const humStats = this.calculateStats(humValues);

      if (tempStats.mean > 28) {
        suggestions.push({
          category: 'climate',
          priority: 'high',
          issue: 'Durchschnittstemperatur zu hoch',
          suggestion: `? ${tempStats.mean.toFixed(1)}�C - Ziel: 22-26�C`,
          action: 'L�ftung erh�hen oder Licht dimmen'
        });
      } else if (tempStats.mean < 18) {
        suggestions.push({
          category: 'climate',
          priority: 'medium',
          issue: 'Durchschnittstemperatur zu niedrig',
          suggestion: `? ${tempStats.mean.toFixed(1)}�C - Ziel: 22-26�C`,
          action: 'Heizung pr�fen oder Abluft reduzieren'
        });
      }

      if (humStats.mean > 70) {
        suggestions.push({
          category: 'climate',
          priority: 'high',
          issue: 'Luftfeuchtigkeit kritisch hoch',
          suggestion: `? ${humStats.mean.toFixed(1)}% - Risiko f�r Schimmel`,
          action: 'Bel�ftung erh�hen, Entfeuchter verwenden'
        });
      }

      const vpdValues = validData.map(d => this.calculateVPD(d.temp, d.humidity));
      const vpdStats = this.calculateStats(vpdValues);

      if (vpdStats.mean < 0.8) {
        suggestions.push({
          category: 'vpd',
          priority: 'medium',
          issue: 'VPD zu niedrig f�r optimales Wachstum',
          suggestion: `Durchschnittlicher VPD: ${vpdStats.mean.toFixed(2)} kPa - Ziel: 0.8-1.2 kPa`,
          action: 'Temperatur erh�hen oder Luftfeuchtigkeit senken'
        });
      } else if (vpdStats.mean > 1.5) {
        suggestions.push({
          category: 'vpd',
          priority: 'high',
          issue: 'VPD zu hoch - Stress f�r Pflanzen',
          suggestion: `Durchschnittlicher VPD: ${vpdStats.mean.toFixed(2)} kPa`,
          action: 'Luftfeuchtigkeit erh�hen oder Temperatur senken'
        });
      }

      return { suggestions, analyzed: validData.length };
    } catch (error) {
      console.error('Fehler bei Optimierungsvorschl�gen:', error);
      throw error;
    }
  }

  /**
   * Berechnet VPD (Vapor Pressure Deficit)
   * @deprecated Use vpdService.calculateVPD() instead
   */
  calculateVPD(temp, humidity) {
    return vpdService.calculateVPD(temp, humidity);
  }

  /**
   * Hilfsfunktion f�r Statistiken
   */
  calculateStats(values) {
    if (!values || values.length === 0) return { mean: 0, min: 0, max: 0, stdDev: 0 };

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    
    const squareDiffs = values.map(value => {
      const diff = value - mean;
      return diff * diff;
    });
    
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    return {
      mean,
      min: Math.min(...values),
      max: Math.max(...values),
      stdDev
    };
  }
}

module.exports = new AnalyticsService();