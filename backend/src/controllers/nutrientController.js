const NutrientSchedule = require('../models/NutrientSchedule');
const DosageLog = require('../models/DosageLog');
const ReservoirState = require('../models/ReservoirState');
const { client: mqttClient } = require('../services/mqttService');

/**
 * Nährstoff-Controller
 * Handles CRUD für Schedules und manuelle Dosierung
 */

// ==========================================
// SCHEDULES
// ==========================================

/**
 * GET /api/nutrients/schedules
 * Alle Zeitpläne abrufen
 */
exports.getSchedules = async (req, res, next) => {
  try {
    const schedules = await NutrientSchedule.find()
      .populate('plantId', 'name slotId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/nutrients/schedules/:id
 * Einen Zeitplan abrufen
 */
exports.getSchedule = async (req, res, next) => {
  try {
    const schedule = await NutrientSchedule.findById(req.params.id)
      .populate('plantId');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Zeitplan nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/nutrients/schedules
 * Neuen Zeitplan erstellen
 */
exports.createSchedule = async (req, res, next) => {
  try {
    const schedule = new NutrientSchedule({
      ...req.body,
      createdBy: req.user?._id
    });

    // Berechne erste nextRun
    if (schedule.type === 'fixed' && schedule.schedule.enabled) {
      schedule.nextRun = schedule.calculateNextRun();
    }

    await schedule.save();

    res.status(201).json({
      success: true,
      data: schedule,
      message: 'Zeitplan erstellt'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/nutrients/schedules/:id
 * Zeitplan aktualisieren
 */
exports.updateSchedule = async (req, res, next) => {
  try {
    const schedule = await NutrientSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Zeitplan nicht gefunden'
      });
    }

    // Update
    Object.assign(schedule, req.body);

    // Neu berechnen wenn Schedule-Settings geändert
    if (schedule.type === 'fixed' && schedule.schedule.enabled) {
      schedule.nextRun = schedule.calculateNextRun();
    }

    await schedule.save();

    res.json({
      success: true,
      data: schedule,
      message: 'Zeitplan aktualisiert'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/nutrients/schedules/:id
 * Zeitplan löschen
 */
exports.deleteSchedule = async (req, res, next) => {
  try {
    const schedule = await NutrientSchedule.findByIdAndDelete(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Zeitplan nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Zeitplan gelöscht'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/nutrients/schedules/:id/toggle
 * Zeitplan aktivieren/deaktivieren
 */
exports.toggleSchedule = async (req, res, next) => {
  try {
    const schedule = await NutrientSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Zeitplan nicht gefunden'
      });
    }

    schedule.isActive = !schedule.isActive;

    // Bei Aktivierung: nextRun neu berechnen
    if (schedule.isActive && schedule.type === 'fixed') {
      schedule.nextRun = schedule.calculateNextRun();
    }

    await schedule.save();

    res.json({
      success: true,
      data: schedule,
      message: `Zeitplan ${schedule.isActive ? 'aktiviert' : 'deaktiviert'}`
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// MANUELLE DOSIERUNG
// ==========================================

/**
 * POST /api/nutrients/dose
 * Manuelle Dosierung auslösen
 */
exports.manualDose = async (req, res, next) => {
  try {
    const { waterVolume_liters, ml_per_liter, notes } = req.body;

    // Validierung
    if (!waterVolume_liters || !ml_per_liter) {
      return res.status(400).json({
        success: false,
        message: 'waterVolume_liters und ml_per_liter sind erforderlich'
      });
    }

    const totalML = waterVolume_liters * ml_per_liter;

    // Sicherheits-Check
    if (totalML > 500) {
      return res.status(400).json({
        success: false,
        message: `Dosierung von ${totalML}ml erscheint unrealistisch hoch!`
      });
    }

    // Reservoir-Check
    const reservoirState = await ReservoirState.getOrCreate();
    const canDose = reservoirState.canDose(1, totalML);

    if (!canDose.ok) {
      return res.status(400).json({
        success: false,
        message: canDose.reason
      });
    }

    // Messungen VOR Dosierung
    const measurementsBefore = {
      ec: reservoirState.main.ec,
      ph: reservoirState.main.ph,
      temp: reservoirState.main.temp,
      timestamp: new Date()
    };

    // MQTT-Command an ESP32 senden
    const pumpCommand = {
      action: 'dose',
      dosage: [{
        pumpId: 1,
        volume_ml: totalML,
        flowRate_ml_per_min: 100  // Default Flow-Rate
      }],
      measureAfter: true,
      mixAfter_seconds: 120  // 2 Min mischen
    };

    // Promise für ESP32-Response (mit Timeout)
    const dosageResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('ESP32 Response Timeout'));
      }, 180000);  // 3 Min Timeout

      mqttClient.publish(
        'grow/esp32/nutrients/command',
        JSON.stringify(pumpCommand),
        { qos: 1 }
      );

      // Warte auf Bestätigung
      const responseHandler = (topic, message) => {
        if (topic === 'grow/esp32/nutrients/status') {
          try {
            const data = JSON.parse(message.toString());
            if (data.status === 'completed') {
              clearTimeout(timeout);
              mqttClient.removeListener('message', responseHandler);
              resolve(data);
            }
          } catch (e) {
            console.error('MQTT Parse Error:', e);
          }
        }
      };

      mqttClient.on('message', responseHandler);
    });

    // Dosage-Log erstellen
    const dosageLog = new DosageLog({
      dosage: {
        singlePump: {
          pumpId: 1,
          ml_dosed: totalML,
          duration_seconds: dosageResult.duration_seconds || Math.ceil(totalML / 100 * 60),
          flowRate_ml_per_min: 100
        },
        totalVolume_ml: totalML
      },
      waterVolume_liters,
      measurements: {
        before: measurementsBefore,
        after: {
          ec: dosageResult.ec,
          ph: dosageResult.ph,
          temp: dosageResult.temp,
          timestamp: new Date()
        }
      },
      status: 'success',
      triggeredBy: {
        type: 'manual',
        userId: req.user?._id
      },
      notes
    });

    await dosageLog.save();

    // Reservoir-State aktualisieren
    reservoirState.consumeNutrient(1, totalML);
    await reservoirState.save();

    res.json({
      success: true,
      data: {
        dosageLog,
        reservoirState
      },
      message: `Erfolgreich ${totalML}ml dosiert`
    });

  } catch (error) {
    console.error('Manual Dosage Error:', error);

    // Log Fehler
    const errorLog = new DosageLog({
      dosage: {
        singlePump: { pumpId: 1, ml_dosed: 0 },
        totalVolume_ml: 0
      },
      waterVolume_liters: req.body.waterVolume_liters || 0,
      status: 'failed',
      errors: [{ message: error.message }],
      triggeredBy: {
        type: 'manual',
        userId: req.user?._id
      }
    });

    await errorLog.save().catch(e => console.error('Error saving error log:', e));

    next(error);
  }
};

// ==========================================
// RESERVOIR-STATUS
// ==========================================

/**
 * GET /api/nutrients/reservoir
 * Aktuellen Reservoir-Status abrufen
 */
exports.getReservoirState = async (req, res, next) => {
  try {
    const state = await ReservoirState.getOrCreate();

    const warnings = state.getWarnings();

    res.json({
      success: true,
      data: state,
      warnings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/nutrients/reservoir/refill
 * Reservoir auffüllen
 */
exports.refillReservoir = async (req, res, next) => {
  try {
    const { pumpId, volume_ml } = req.body;

    if (!pumpId || !volume_ml) {
      return res.status(400).json({
        success: false,
        message: 'pumpId und volume_ml sind erforderlich'
      });
    }

    const state = await ReservoirState.getOrCreate();
    const newLevel = state.refillReservoir(pumpId, volume_ml);

    await state.save();

    res.json({
      success: true,
      data: state,
      message: `Reservoir ${pumpId} aufgefüllt. Neuer Stand: ${newLevel}ml`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/nutrients/reservoir/water-change
 * Haupt-Reservoir Wasserwechsel
 */
exports.waterChange = async (req, res, next) => {
  try {
    const state = await ReservoirState.getOrCreate();

    state.main.lastChange = new Date();
    state.main.age_days = 0;

    await state.save();

    res.json({
      success: true,
      data: state,
      message: 'Wasserwechsel dokumentiert'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DOSAGE-LOGS
// ==========================================

/**
 * GET /api/nutrients/logs
 * Dosierungs-Historie abrufen
 */
exports.getDosageLogs = async (req, res, next) => {
  try {
    const {
      limit = 50,
      page = 1,
      scheduleId,
      startDate,
      endDate
    } = req.query;

    const query = {};

    if (scheduleId) query.scheduleId = scheduleId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await DosageLog.find(query)
      .populate('scheduleId', 'name')
      .populate('plantId', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await DosageLog.countDocuments(query);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/nutrients/stats
 * Statistiken für Zeitraum
 */
exports.getStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await DosageLog.getStats(start, end);

    res.json({
      success: true,
      data: stats,
      period: {
        from: start,
        to: end,
        days: Math.ceil((end - start) / (1000 * 60 * 60 * 24))
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// KALIBRIERUNG
// ==========================================

/**
 * POST /api/nutrients/calibrate
 * Sensor kalibrieren
 */
exports.calibrateSensor = async (req, res, next) => {
  try {
    const { sensor, referenceValue, measuredValue } = req.body;

    if (!['ec', 'ph'].includes(sensor)) {
      return res.status(400).json({
        success: false,
        message: 'Sensor muss "ec" oder "ph" sein'
      });
    }

    const state = await ReservoirState.getOrCreate();

    // Füge Kalibrier-Wert hinzu
    state.calibration[sensor].calibrationValues.push({
      reference: referenceValue,
      measured: measuredValue,
      timestamp: new Date()
    });

    // Berechne Drift
    const drift = ((measuredValue - referenceValue) / referenceValue) * 100;
    state.calibration[sensor].drift_percent = drift;
    state.calibration[sensor].lastCalibration = new Date();

    // Setze nächste Kalibrierung
    const interval = sensor === 'ec' ? 14 : 7;  // EC: 2 Wochen, pH: 1 Woche
    state.calibration.nextCalibration[sensor] = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);

    await state.save();

    res.json({
      success: true,
      data: {
        sensor,
        drift_percent: drift,
        nextCalibration: state.calibration.nextCalibration[sensor]
      },
      message: `${sensor.toUpperCase()}-Sensor kalibriert (Drift: ${drift.toFixed(2)}%)`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
