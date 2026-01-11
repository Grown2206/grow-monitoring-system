const PlantGrowthLog = require('../models/PlantGrowthLog');
const Plant = require('../models/Plant');

/**
 * Plant Growth Log Controller
 * CRUD für tägliche Pflanzenmessungen
 */

/**
 * Erstelle/Update täglichen Log
 */
exports.createOrUpdate = async (req, res) => {
  try {
    const { plantId } = req.params;
    const logData = req.body;

    // Prüfe ob Pflanze existiert
    const plant = await Plant.findById(plantId);
    if (!plant) {
      return res.status(404).json({
        success: false,
        error: 'Pflanze nicht gefunden'
      });
    }

    // Erstelle Date ohne Uhrzeit
    const date = logData.date ? new Date(logData.date) : new Date();
    date.setHours(0, 0, 0, 0);

    // Suche existierenden Log für diesen Tag
    let growthLog = await PlantGrowthLog.findOne({
      plant: plantId,
      date: date
    });

    if (growthLog) {
      // Update existierenden Log
      Object.assign(growthLog, logData);
      await growthLog.save();
    } else {
      // Erstelle neuen Log
      growthLog = new PlantGrowthLog({
        plant: plantId,
        date: date,
        ...logData
      });
      await growthLog.save();
    }

    res.status(growthLog.isNew ? 201 : 200).json({
      success: true,
      message: growthLog.isNew ? 'Log erstellt' : 'Log aktualisiert',
      data: growthLog
    });
  } catch (error) {
    console.error('Fehler beim Speichern des Growth Logs:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Speichern des Growth Logs'
    });
  }
};

/**
 * Hole Logs für Zeitraum
 */
exports.getLogs = async (req, res) => {
  try {
    const { plantId } = req.params;
    const { startDate, endDate, limit = 30 } = req.query;

    const query = { plant: plantId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const logs = await PlantGrowthLog.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Logs:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Logs'
    });
  }
};

/**
 * Hole Log für spezifischen Tag
 */
exports.getLogByDate = async (req, res) => {
  try {
    const { plantId, date } = req.params;

    const searchDate = new Date(date);
    searchDate.setHours(0, 0, 0, 0);

    const log = await PlantGrowthLog.findOne({
      plant: plantId,
      date: searchDate
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Kein Log für dieses Datum gefunden'
      });
    }

    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Logs:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen des Logs'
    });
  }
};

/**
 * Hole Wachstumstrend
 */
exports.getGrowthTrend = async (req, res) => {
  try {
    const { plantId } = req.params;
    const { days = 30 } = req.query;

    const logs = await PlantGrowthLog.getGrowthTrend(plantId, parseInt(days));

    // Extrahiere Daten für Charts
    const chartData = logs.map(log => ({
      date: log.date,
      height: log.measurements?.height?.value || null,
      width: log.measurements?.width?.value || null,
      stemDiameter: log.measurements?.stemDiameter?.value || null,
      leafCount: log.measurements?.leafCount || null,
      nodeCount: log.measurements?.nodeCount || null,
      health: log.health?.overall || null,
      temperature: log.environment?.avgTemperature || null,
      humidity: log.environment?.avgHumidity || null,
      vpd: log.environment?.avgVPD || null,
      soilMoisture: log.environment?.avgSoilMoisture || null,
      heightChange: log.growthRate?.heightChange || null,
      widthChange: log.growthRate?.widthChange || null
    }));

    res.json({
      success: true,
      count: logs.length,
      data: chartData
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Trends:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen des Trends'
    });
  }
};

/**
 * Hole Durchschnittswerte
 */
exports.getStats = async (req, res) => {
  try {
    const { plantId } = req.params;
    const { days = 7 } = req.query;

    const averages = await PlantGrowthLog.getAverages(plantId, parseInt(days));

    // Hole auch neuesten und ältesten Wert für Vergleich
    const latestLog = await PlantGrowthLog.findOne({ plant: plantId })
      .sort({ date: -1 });

    const oldestLog = await PlantGrowthLog.findOne({ plant: plantId })
      .sort({ date: 1 });

    res.json({
      success: true,
      data: {
        period: `${days} Tage`,
        averages,
        current: latestLog ? {
          height: latestLog.measurements?.height?.value,
          width: latestLog.measurements?.width?.value,
          health: latestLog.health?.overall
        } : null,
        totalGrowth: (latestLog && oldestLog) ? {
          height: (latestLog.measurements?.height?.value || 0) - (oldestLog.measurements?.height?.value || 0),
          width: (latestLog.measurements?.width?.value || 0) - (oldestLog.measurements?.width?.value || 0),
          days: Math.ceil((latestLog.date - oldestLog.date) / (1000 * 60 * 60 * 24))
        } : null
      }
    });
  } catch (error) {
    console.error('Fehler beim Berechnen der Statistiken:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Berechnen der Statistiken'
    });
  }
};

/**
 * Lösche Log
 */
exports.deleteLog = async (req, res) => {
  try {
    const { logId } = req.params;

    const log = await PlantGrowthLog.findByIdAndDelete(logId);

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Log nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Log gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Logs:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen des Logs'
    });
  }
};

/**
 * Füge Foto zu Log hinzu
 */
exports.addPhoto = async (req, res) => {
  try {
    const { logId } = req.params;
    const { url, caption } = req.body;

    const log = await PlantGrowthLog.findById(logId);

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Log nicht gefunden'
      });
    }

    log.photos.push({
      url,
      caption,
      timestamp: new Date()
    });

    await log.save();

    res.json({
      success: true,
      message: 'Foto hinzugefügt',
      data: log
    });
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Fotos:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Hinzufügen des Fotos'
    });
  }
};

/**
 * Füge Aktivität zu Log hinzu
 */
exports.addActivity = async (req, res) => {
  try {
    const { logId } = req.params;
    const { type, description } = req.body;

    const log = await PlantGrowthLog.findById(logId);

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Log nicht gefunden'
      });
    }

    log.activities.push({
      type,
      description,
      time: new Date()
    });

    await log.save();

    res.json({
      success: true,
      message: 'Aktivität hinzugefügt',
      data: log
    });
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Aktivität:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Hinzufügen der Aktivität'
    });
  }
};

/**
 * Hole alle Meilensteine
 */
exports.getMilestones = async (req, res) => {
  try {
    const { plantId } = req.params;

    const logs = await PlantGrowthLog.find({
      plant: plantId,
      'milestones.0': { $exists: true }
    }).select('date milestones').sort({ date: 1 });

    const milestones = [];
    logs.forEach(log => {
      log.milestones.forEach(milestone => {
        milestones.push({
          date: log.date,
          type: milestone.type,
          achieved: milestone.achieved,
          notes: milestone.notes
        });
      });
    });

    res.json({
      success: true,
      count: milestones.length,
      data: milestones
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Meilensteine:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Meilensteine'
    });
  }
};

module.exports = exports;
