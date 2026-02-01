const SensorLog = require('../models/SensorLog');
const PlantGrowthLog = require('../models/PlantGrowthLog');

/**
 * Calendar Controller
 * Tages-Zusammenfassungen für den interaktiven Kalender
 */

/**
 * Tages-Messwerte Zusammenfassung
 * Aggregiert SensorLog-Daten für einen bestimmten Tag
 */
exports.getDailySummary = async (req, res) => {
  try {
    const { date } = req.params;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // MongoDB Aggregation für Sensor-Daten
    const sensorAgg = await SensorLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          // Temperatur (3 Zonen)
          avgTempBottom: { $avg: '$readings.temp_bottom' },
          avgTempMiddle: { $avg: '$readings.temp_middle' },
          avgTempTop: { $avg: '$readings.temp_top' },
          minTempBottom: { $min: '$readings.temp_bottom' },
          maxTempBottom: { $max: '$readings.temp_bottom' },
          // Luftfeuchtigkeit (3 Zonen)
          avgHumBottom: { $avg: '$readings.humidity_bottom' },
          avgHumMiddle: { $avg: '$readings.humidity_middle' },
          avgHumTop: { $avg: '$readings.humidity_top' },
          // Licht
          avgLux: { $avg: '$readings.lux' },
          maxLux: { $max: '$readings.lux' },
          // Tank
          avgTank: { $avg: '$readings.tankLevel' },
          // Gas
          avgGas: { $avg: '$readings.gasLevel' },
          // Letzte Werte des Tages
          lastHeights: { $last: '$readings.heights' },
          lastSoil: { $last: '$readings.soilMoisture' },
          // Datenpunkte
          dataPoints: { $sum: 1 }
        }
      }
    ]);

    // Lichtstunden berechnen (Readings mit lux > 100)
    const lightReadings = await SensorLog.countDocuments({
      timestamp: { $gte: startOfDay, $lte: endOfDay },
      'readings.lux': { $gt: 100 }
    });

    // Growth Logs für den Tag
    const growthLogs = await PlantGrowthLog.find({
      date: startOfDay
    }).populate('plant', 'name slotId strain stage').lean();

    const data = sensorAgg[0] || {};
    const totalReadings = data.dataPoints || 1;

    // Durchschnittswerte berechnen (nur gültige Werte > 0)
    const temps = [data.avgTempBottom, data.avgTempMiddle, data.avgTempTop].filter(t => t && t > 0);
    const hums = [data.avgHumBottom, data.avgHumMiddle, data.avgHumTop].filter(h => h && h > 0);
    const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
    const avgHum = hums.length > 0 ? hums.reduce((a, b) => a + b, 0) / hums.length : null;

    // VPD berechnen
    let avgVPD = null;
    if (avgTemp && avgHum) {
      const svp = 0.6108 * Math.exp((17.27 * avgTemp) / (avgTemp + 237.3));
      avgVPD = Math.round(svp * (1 - avgHum / 100) * 100) / 100;
    }

    const lightHours = Math.round((lightReadings / totalReadings) * 24 * 10) / 10;

    res.json({
      success: true,
      data: {
        date,
        environment: {
          avgTemp: avgTemp ? Math.round(avgTemp * 10) / 10 : null,
          minTemp: data.minTempBottom || null,
          maxTemp: data.maxTempBottom || null,
          avgHumidity: avgHum ? Math.round(avgHum * 10) / 10 : null,
          avgVPD,
          avgLux: data.avgLux ? Math.round(data.avgLux) : null,
          maxLux: data.maxLux || null,
          lightHours,
          tankLevel: data.avgTank ? Math.round(data.avgTank) : null,
          gasLevel: data.avgGas ? Math.round(data.avgGas) : null
        },
        plants: {
          heights: data.lastHeights || [],
          soilMoisture: data.lastSoil || [],
          growthLogs: growthLogs.map(log => ({
            _id: log._id,
            plant: log.plant,
            height: log.measurements?.height?.value || null,
            width: log.measurements?.width?.value || null,
            health: log.health?.overall || null,
            leafColor: log.health?.leafColor || null,
            issues: log.health?.issues || []
          }))
        },
        dataPoints: data.dataPoints || 0
      }
    });

  } catch (error) {
    console.error('Error getting daily summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Monats-Übersicht für Kalender-Heatmap
 * Gibt pro Tag einen Qualitätsindikator zurück
 */
exports.getMonthSummary = async (req, res) => {
  try {
    const { year, month } = req.params;
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Tägliche Datenpunkt-Zählung
    const dailyData = await SensorLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          avgTemp: { $avg: '$readings.temp_bottom' },
          avgHum: { $avg: '$readings.humidity_bottom' },
          dataPoints: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Growth Logs für den Monat
    const growthLogs = await PlantGrowthLog.find({
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).select('date health.overall').lean();

    // Tages-Daten zusammenführen
    const days = {};
    for (const day of dailyData) {
      days[day._id] = {
        hasData: true,
        dataPoints: day.dataPoints,
        avgTemp: day.avgTemp ? Math.round(day.avgTemp * 10) / 10 : null,
        avgHum: day.avgHum ? Math.round(day.avgHum * 10) / 10 : null
      };
    }

    // Health-Daten hinzufügen
    for (const log of growthLogs) {
      const dateStr = log.date.toISOString().split('T')[0];
      if (!days[dateStr]) days[dateStr] = { hasData: false };
      if (!days[dateStr].healthScores) days[dateStr].healthScores = [];
      if (log.health?.overall) {
        days[dateStr].healthScores.push(log.health.overall);
      }
    }

    res.json({ success: true, data: days });

  } catch (error) {
    console.error('Error getting month summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Hilfsfunktion: VPD aus Temp + Humidity berechnen ───
function calcVPD(temp, hum) {
  if (!temp || !hum) return null;
  const svp = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
  return Math.round(svp * (1 - hum / 100) * 100) / 100;
}

// Hilfsfunktion: 3-Zonen Durchschnitt
function avg3Zone(bottom, middle, top) {
  const vals = [bottom, middle, top].filter(v => v && v > -40);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

/**
 * Stündliche Tages-Details für 24h-Chart
 * GET /api/calendar/day-detail/:date
 */
exports.getDayDetail = async (req, res) => {
  try {
    const { date } = req.params;
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const hourlyData = await SensorLog.aggregate([
      { $match: { timestamp: { $gte: startOfDay, $lte: endOfDay } } },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          avgTempBottom: { $avg: '$readings.temp_bottom' },
          avgTempMiddle: { $avg: '$readings.temp_middle' },
          avgTempTop: { $avg: '$readings.temp_top' },
          minTempBottom: { $min: '$readings.temp_bottom' },
          maxTempBottom: { $max: '$readings.temp_bottom' },
          avgHumBottom: { $avg: '$readings.humidity_bottom' },
          avgHumMiddle: { $avg: '$readings.humidity_middle' },
          avgHumTop: { $avg: '$readings.humidity_top' },
          avgLux: { $avg: '$readings.lux' },
          maxLux: { $max: '$readings.lux' },
          avgGas: { $avg: '$readings.gasLevel' },
          avgTank: { $avg: '$readings.tankLevel' },
          avgEco2: { $avg: '$readings.ens160_eco2' },
          avgTvoc: { $avg: '$readings.ens160_tvoc' },
          avgAqi: { $avg: '$readings.ens160_aqi' },
          lastHeights: { $last: '$readings.heights' },
          lastSoil: { $last: '$readings.soilMoisture' },
          dataPoints: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const hours = hourlyData.map(h => {
      const temp = avg3Zone(h.avgTempBottom, h.avgTempMiddle, h.avgTempTop);
      const humidity = avg3Zone(h.avgHumBottom, h.avgHumMiddle, h.avgHumTop);
      return {
        hour: h._id,
        temp: temp ? Math.round(temp * 10) / 10 : null,
        minTemp: h.minTempBottom > -40 ? Math.round(h.minTempBottom * 10) / 10 : null,
        maxTemp: h.maxTempBottom > -40 ? Math.round(h.maxTempBottom * 10) / 10 : null,
        humidity: humidity ? Math.round(humidity * 10) / 10 : null,
        vpd: calcVPD(temp, humidity),
        lux: h.avgLux ? Math.round(h.avgLux) : null,
        maxLux: h.maxLux || null,
        eco2: h.avgEco2 ? Math.round(h.avgEco2) : null,
        tvoc: h.avgTvoc ? Math.round(h.avgTvoc) : null,
        aqi: h.avgAqi ? Math.round(h.avgAqi * 10) / 10 : null,
        tank: h.avgTank ? Math.round(h.avgTank) : null,
        gas: h.avgGas ? Math.round(h.avgGas) : null,
        heights: h.lastHeights || [],
        soil: h.lastSoil || [],
        dataPoints: h.dataPoints
      };
    });

    const growthLogs = await PlantGrowthLog.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate('plant', 'name slotId strain stage').lean();

    res.json({
      success: true,
      data: {
        date,
        hours,
        growthLogs: growthLogs.map(log => ({
          _id: log._id,
          plant: log.plant,
          height: log.measurements?.height?.value || null,
          width: log.measurements?.width?.value || null,
          health: log.health?.overall || null,
          leafColor: log.health?.leafColor || null,
          milestones: log.milestones || []
        }))
      }
    });
  } catch (error) {
    console.error('Error getting day detail:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Wochenvergleich: Diese Woche vs. Vorwoche
 * GET /api/calendar/week-comparison/:year/:week
 */
exports.getWeekComparison = async (req, res) => {
  try {
    const { year, week } = req.params;
    const y = parseInt(year);
    const w = parseInt(week);

    // ISO-Woche berechnen: 4. Januar ist immer in KW1
    const jan4 = new Date(y, 0, 4);
    const dayOfWeek = jan4.getDay() || 7; // Sonntag=7
    const weekStart = new Date(jan4);
    weekStart.setDate(jan4.getDate() - dayOfWeek + 1 + (w - 1) * 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const prevStart = new Date(weekStart);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(weekStart);
    prevEnd.setDate(prevEnd.getDate() - 1);
    prevEnd.setHours(23, 59, 59, 999);

    const aggregateDays = async (start, end) => {
      return SensorLog.aggregate([
        { $match: { timestamp: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            avgTempBottom: { $avg: '$readings.temp_bottom' },
            avgTempMiddle: { $avg: '$readings.temp_middle' },
            avgTempTop: { $avg: '$readings.temp_top' },
            avgHumBottom: { $avg: '$readings.humidity_bottom' },
            avgHumMiddle: { $avg: '$readings.humidity_middle' },
            avgHumTop: { $avg: '$readings.humidity_top' },
            avgLux: { $avg: '$readings.lux' },
            maxLux: { $max: '$readings.lux' },
            avgEco2: { $avg: '$readings.ens160_eco2' },
            dataPoints: { $sum: 1 },
            lightReadings: { $sum: { $cond: [{ $gt: ['$readings.lux', 100] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ]);
    };

    const [thisWeekData, lastWeekData] = await Promise.all([
      aggregateDays(weekStart, weekEnd),
      aggregateDays(prevStart, prevEnd)
    ]);

    const processDays = (days) => days.map(d => {
      const temp = avg3Zone(d.avgTempBottom, d.avgTempMiddle, d.avgTempTop);
      const humidity = avg3Zone(d.avgHumBottom, d.avgHumMiddle, d.avgHumTop);
      const lightHours = d.dataPoints > 0 ? Math.round((d.lightReadings / d.dataPoints) * 24 * 10) / 10 : 0;
      return {
        date: d._id,
        dayName: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(d._id).getDay()],
        temp: temp ? Math.round(temp * 10) / 10 : null,
        humidity: humidity ? Math.round(humidity * 10) / 10 : null,
        vpd: calcVPD(temp, humidity),
        lux: d.avgLux ? Math.round(d.avgLux) : null,
        eco2: d.avgEco2 ? Math.round(d.avgEco2) : null,
        lightHours,
        dataPoints: d.dataPoints
      };
    });

    res.json({
      success: true,
      data: {
        thisWeek: processDays(thisWeekData),
        lastWeek: processDays(lastWeekData),
        weekNumber: w,
        year: y
      }
    });
  } catch (error) {
    console.error('Error getting week comparison:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Monatstrends mit Rolling Averages + DLI + Stabilität
 * GET /api/calendar/trends/:year/:month
 */
exports.getMonthTrends = async (req, res) => {
  try {
    const { year, month } = req.params;
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const dailyData = await SensorLog.aggregate([
      { $match: { timestamp: { $gte: startOfMonth, $lte: endOfMonth } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          avgTempBottom: { $avg: '$readings.temp_bottom' },
          avgTempMiddle: { $avg: '$readings.temp_middle' },
          avgTempTop: { $avg: '$readings.temp_top' },
          minTempBottom: { $min: '$readings.temp_bottom' },
          maxTempBottom: { $max: '$readings.temp_bottom' },
          avgHumBottom: { $avg: '$readings.humidity_bottom' },
          avgHumMiddle: { $avg: '$readings.humidity_middle' },
          avgHumTop: { $avg: '$readings.humidity_top' },
          minHumBottom: { $min: '$readings.humidity_bottom' },
          maxHumBottom: { $max: '$readings.humidity_bottom' },
          avgLux: { $avg: '$readings.lux' },
          maxLux: { $max: '$readings.lux' },
          avgEco2: { $avg: '$readings.ens160_eco2' },
          avgTvoc: { $avg: '$readings.ens160_tvoc' },
          avgGas: { $avg: '$readings.gasLevel' },
          avgTank: { $avg: '$readings.tankLevel' },
          dataPoints: { $sum: 1 },
          lightReadings: { $sum: { $cond: [{ $gt: ['$readings.lux', 100] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const growthLogs = await PlantGrowthLog.find({
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).populate('plant', 'name slotId stage').sort({ date: 1 }).lean();

    // Tages-Daten aufbereiten
    const days = dailyData.map(d => {
      const temp = avg3Zone(d.avgTempBottom, d.avgTempMiddle, d.avgTempTop);
      const humidity = avg3Zone(d.avgHumBottom, d.avgHumMiddle, d.avgHumTop);
      const lightHours = d.dataPoints > 0 ? Math.round((d.lightReadings / d.dataPoints) * 24 * 10) / 10 : 0;

      // DLI Schätzung: (Lux × Stunden × 0.0185) / 1.000.000 → mol/m²/d
      // Vereinfacht: avgLux * lightHours * 0.0000185 * 3600
      const dli = d.avgLux && lightHours > 0
        ? Math.round(d.avgLux * lightHours * 0.0000185 * 3600 * 10) / 10
        : null;

      // Stabilitäts-Score: weniger Temp-Schwankung = höher
      const tempRange = ((d.maxTempBottom || 0) - (d.minTempBottom || 0));
      const humRange = ((d.maxHumBottom || 0) - (d.minHumBottom || 0));
      const stability = Math.max(0, Math.min(100,
        100 - (tempRange * 3) - (humRange * 1.5)
      ));

      return {
        date: d._id,
        temp: temp ? Math.round(temp * 10) / 10 : null,
        minTemp: d.minTempBottom > -40 ? Math.round(d.minTempBottom * 10) / 10 : null,
        maxTemp: d.maxTempBottom > -40 ? Math.round(d.maxTempBottom * 10) / 10 : null,
        humidity: humidity ? Math.round(humidity * 10) / 10 : null,
        vpd: calcVPD(temp, humidity),
        lux: d.avgLux ? Math.round(d.avgLux) : null,
        maxLux: d.maxLux || null,
        dli,
        lightHours,
        eco2: d.avgEco2 ? Math.round(d.avgEco2) : null,
        tvoc: d.avgTvoc ? Math.round(d.avgTvoc) : null,
        stability: Math.round(stability),
        dataPoints: d.dataPoints
      };
    });

    // 7-Tage Rolling Averages
    const rollingAverages = days.map((day, idx) => {
      const window = days.slice(Math.max(0, idx - 6), idx + 1);
      const avgVal = (key) => {
        const vals = window.map(d => d[key]).filter(v => v != null);
        return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null;
      };
      return {
        date: day.date,
        temp7d: avgVal('temp'),
        humidity7d: avgVal('humidity'),
        vpd7d: avgVal('vpd'),
        dli7d: avgVal('dli'),
        stability7d: avgVal('stability')
      };
    });

    res.json({
      success: true,
      data: {
        days,
        rollingAverages,
        growthLogs: growthLogs.map(log => ({
          date: log.date,
          plant: log.plant,
          height: log.measurements?.height?.value || null,
          width: log.measurements?.width?.value || null,
          health: log.health?.overall || null,
          milestones: log.milestones || []
        }))
      }
    });
  } catch (error) {
    console.error('Error getting month trends:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
