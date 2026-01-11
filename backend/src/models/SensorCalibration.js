const mongoose = require('mongoose');

/**
 * Sensor Calibration Model
 * Speichert Kalibrierdaten für EC und pH Sensoren
 * Atlas Scientific EZO-EC & EZO-pH Module
 */
const SensorCalibrationSchema = new mongoose.Schema({
  sensorType: {
    type: String,
    enum: ['ec', 'ph'],
    required: true
  },

  sensorId: {
    type: String,
    default: 'default',
    description: 'Eindeutige ID für mehrere Sensoren'
  },

  // EC Calibration (für EZO-EC)
  ecCalibration: {
    dry: {
      calibrated: { type: Boolean, default: false },
      date: Date,
      value: Number
    },
    low: {
      calibrated: { type: Boolean, default: false },
      date: Date,
      referenceValue: { type: Number, default: 1.413 }, // µS/cm (1413 µS/cm standard)
      measuredValue: Number
    },
    high: {
      calibrated: { type: Boolean, default: false },
      date: Date,
      referenceValue: { type: Number, default: 12.88 }, // mS/cm (12880 µS/cm standard)
      measuredValue: Number
    },
    slope: {
      type: Number,
      description: 'EC probe slope (quality indicator)'
    }
  },

  // pH Calibration (für EZO-pH)
  phCalibration: {
    low: {
      calibrated: { type: Boolean, default: false },
      date: Date,
      referenceValue: { type: Number, default: 4.0 },
      measuredValue: Number
    },
    mid: {
      calibrated: { type: Boolean, default: false },
      date: Date,
      referenceValue: { type: Number, default: 7.0 },
      measuredValue: Number
    },
    high: {
      calibrated: { type: Boolean, default: false },
      date: Date,
      referenceValue: { type: Number, default: 10.0 },
      measuredValue: Number
    },
    slope: {
      type: Number,
      description: 'pH probe slope (quality indicator, ideal: 59.16 mV/pH at 25°C)'
    }
  },

  // Temperature Compensation
  temperatureCompensation: {
    enabled: { type: Boolean, default: true },
    value: { type: Number, default: 25 }, // °C
    coefficient: { type: Number, default: 2.0 } // %/°C for EC
  },

  // Calibration Status
  status: {
    isValid: { type: Boolean, default: false },
    lastCalibration: Date,
    nextCalibrationDue: Date,
    calibrationInterval: { type: Number, default: 30 }, // Tage
    pointsCalibrated: { type: Number, default: 0 }
  },

  // Quality Metrics
  quality: {
    accuracy: { type: Number, min: 0, max: 100 }, // %
    drift: { type: Number }, // Abweichung seit letzter Kalibrierung
    confidence: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'unknown'],
      default: 'unknown'
    }
  },

  // Calibration History
  history: [{
    type: {
      type: String,
      enum: ['ec_dry', 'ec_low', 'ec_high', 'ph_low', 'ph_mid', 'ph_high']
    },
    date: { type: Date, default: Date.now },
    referenceValue: Number,
    measuredValue: Number,
    success: Boolean,
    notes: String
  }],

  // Metadata
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Virtual: Gesamtstatus
SensorCalibrationSchema.virtual('calibrationComplete').get(function() {
  if (this.sensorType === 'ec') {
    return this.ecCalibration.dry.calibrated &&
           this.ecCalibration.low.calibrated &&
           this.ecCalibration.high.calibrated;
  } else if (this.sensorType === 'ph') {
    // Minimum 2-Punkt-Kalibrierung (low + mid ODER mid + high)
    const lowMid = this.phCalibration.low.calibrated && this.phCalibration.mid.calibrated;
    const midHigh = this.phCalibration.mid.calibrated && this.phCalibration.high.calibrated;
    return lowMid || midHigh;
  }
  return false;
});

// Methode: Add Calibration Point
SensorCalibrationSchema.methods.addCalibrationPoint = function(type, referenceValue, measuredValue, success = true, notes = '') {
  this.history.push({
    type,
    date: new Date(),
    referenceValue,
    measuredValue,
    success,
    notes
  });

  // Keep only last 50 entries
  if (this.history.length > 50) {
    this.history = this.history.slice(-50);
  }

  this.status.lastCalibration = new Date();
  this.status.nextCalibrationDue = new Date(Date.now() + this.status.calibrationInterval * 24 * 60 * 60 * 1000);
};

// Methode: Calculate Quality
SensorCalibrationSchema.methods.calculateQuality = function() {
  let pointsCalibrated = 0;
  let totalSlope = 0;
  let hasSlope = false;

  if (this.sensorType === 'ec') {
    if (this.ecCalibration.dry.calibrated) pointsCalibrated++;
    if (this.ecCalibration.low.calibrated) pointsCalibrated++;
    if (this.ecCalibration.high.calibrated) pointsCalibrated++;

    if (this.ecCalibration.slope) {
      totalSlope = this.ecCalibration.slope;
      hasSlope = true;
    }
  } else if (this.sensorType === 'ph') {
    if (this.phCalibration.low.calibrated) pointsCalibrated++;
    if (this.phCalibration.mid.calibrated) pointsCalibrated++;
    if (this.phCalibration.high.calibrated) pointsCalibrated++;

    if (this.phCalibration.slope) {
      totalSlope = this.phCalibration.slope;
      hasSlope = true;

      // pH slope quality check (ideal: 59.16 mV/pH at 25°C)
      const idealSlope = 59.16;
      const deviation = Math.abs(totalSlope - idealSlope);

      if (deviation < 2) this.quality.confidence = 'excellent';
      else if (deviation < 5) this.quality.confidence = 'good';
      else if (deviation < 10) this.quality.confidence = 'fair';
      else this.quality.confidence = 'poor';
    }
  }

  this.status.pointsCalibrated = pointsCalibrated;

  // Calculate accuracy percentage
  const maxPoints = this.sensorType === 'ec' ? 3 : 3;
  this.quality.accuracy = Math.round((pointsCalibrated / maxPoints) * 100);

  // Determine if valid
  this.status.isValid = this.calibrationComplete;
};

// Methode: Reset Calibration
SensorCalibrationSchema.methods.resetCalibration = function() {
  if (this.sensorType === 'ec') {
    this.ecCalibration = {
      dry: { calibrated: false },
      low: { calibrated: false, referenceValue: 1.413 },
      high: { calibrated: false, referenceValue: 12.88 }
    };
  } else if (this.sensorType === 'ph') {
    this.phCalibration = {
      low: { calibrated: false, referenceValue: 4.0 },
      mid: { calibrated: false, referenceValue: 7.0 },
      high: { calibrated: false, referenceValue: 10.0 }
    };
  }

  this.status.isValid = false;
  this.status.pointsCalibrated = 0;
  this.quality.accuracy = 0;
  this.quality.confidence = 'unknown';
};

// Static: Get or Create Calibration
SensorCalibrationSchema.statics.getOrCreate = async function(sensorType, sensorId = 'default') {
  let calibration = await this.findOne({ sensorType, sensorId });

  if (!calibration) {
    calibration = await this.create({ sensorType, sensorId });
    console.log(`✅ Calibration created for ${sensorType} (${sensorId})`);
  }

  return calibration;
};

const SensorCalibration = mongoose.model('SensorCalibration', SensorCalibrationSchema);

module.exports = SensorCalibration;
