const Joi = require('joi');
const mongoose = require('mongoose');

/**
 * Validierungs-Middleware für Request-Body
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Alle Fehler zurückgeben, nicht nur den ersten
      stripUnknown: true // Unbekannte Felder entfernen
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        message: 'Validierungsfehler',
        errors
      });
    }

    // Validierte Daten ersetzen req.body
    req.body = value;
    next();
  };
};

/**
 * Validierungs-Middleware für Query-Parameter
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        message: 'Ungültige Query-Parameter',
        errors
      });
    }

    req.query = value;
    next();
  };
};

/**
 * MongoDB ObjectID Validierung
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Ungültige ID',
        error: `Der Parameter "${paramName}" muss eine gültige MongoDB ObjectID sein`
      });
    }

    next();
  };
};

/**
 * Sanitize Input - entfernt potentiell gefährliche Zeichen
 */
const sanitizeInput = (req, res, next) => {
  // NoSQL Injection verhindern
  const sanitize = (obj) => {
    for (let key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        // Verhindere MongoDB Operatoren wie $gt, $ne etc.
        if (key.startsWith('$')) {
          delete obj[key];
        } else {
          sanitize(obj[key]);
        }
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

// ========================================
// Vordefinierte Validierungs-Schemas
// ========================================

const schemas = {
  // Auth Schemas
  register: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .required()
      .messages({
        'string.alphanum': 'Benutzername darf nur Buchstaben und Zahlen enthalten',
        'string.min': 'Benutzername muss mindestens 3 Zeichen lang sein',
        'string.max': 'Benutzername darf maximal 30 Zeichen lang sein'
      }),
    password: Joi.string()
      .min(6)
      .required()
      .messages({
        'string.min': 'Passwort muss mindestens 6 Zeichen lang sein'
      }),
    email: Joi.string()
      .email()
      .optional()
  }),

  login: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  }),

  // Automation Config Schema
  automationConfig: Joi.object({
    lightStart: Joi.string()
      .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .required()
      .messages({
        'string.pattern.base': 'Ungültiges Zeitformat. Bitte HH:MM verwenden (z.B. 08:00)'
      }),
    lightDuration: Joi.number()
      .min(0)
      .max(24)
      .required()
      .messages({
        'number.min': 'Beleuchtungsdauer muss mindestens 0 Stunden sein',
        'number.max': 'Beleuchtungsdauer darf maximal 24 Stunden sein'
      }),
    tempTarget: Joi.number()
      .min(10)
      .max(40)
      .required()
      .messages({
        'number.min': 'Zieltemperatur muss mindestens 10°C sein',
        'number.max': 'Zieltemperatur darf maximal 40°C sein'
      }),
    tempHysteresis: Joi.number()
      .min(0)
      .max(10)
      .required(),
    pumpInterval: Joi.number()
      .min(1)
      .max(24)
      .required()
      .messages({
        'number.min': 'Pumpen-Intervall muss mindestens 1 Stunde sein',
        'number.max': 'Pumpen-Intervall darf maximal 24 Stunden sein'
      }),
    pumpDuration: Joi.number()
      .min(1)
      .max(120)
      .required()
      .messages({
        'number.min': 'Pumpen-Dauer muss mindestens 1 Sekunde sein',
        'number.max': 'Pumpen-Dauer darf maximal 120 Sekunden sein'
      })
  }),

  // Plant Schema
  plant: Joi.object({
    name: Joi.string()
      .min(1)
      .max(100)
      .required(),
    strain: Joi.string()
      .max(100)
      .optional(),
    slotId: Joi.number()
      .integer()
      .min(1)
      .max(10)
      .required(),
    plantedDate: Joi.date()
      .optional(),
    phase: Joi.string()
      .valid('Keimling', 'Vegetation', 'Blüte', 'Spülen', 'Ernte')
      .optional(),
    notes: Joi.string()
      .max(1000)
      .optional()
  }),

  // Recipe Schema
  recipe: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .required(),
    type: Joi.string()
      .valid('Indica', 'Sativa', 'Hybrid', 'Autoflower', 'CBD')
      .required(),
    difficulty: Joi.string()
      .valid('Anfänger', 'Fortgeschritten', 'Experte')
      .required(),
    totalDays: Joi.number()
      .integer()
      .min(30)
      .max(200)
      .required(),
    description: Joi.string()
      .max(500)
      .optional(),
    phases: Joi.array()
      .items(Joi.object({
        name: Joi.string().required(),
        duration: Joi.number().min(1).required(),
        lightHours: Joi.number().min(0).max(24).optional(),
        tempDay: Joi.object({
          min: Joi.number(),
          target: Joi.number(),
          max: Joi.number()
        }).optional(),
        tempNight: Joi.object({
          min: Joi.number(),
          target: Joi.number(),
          max: Joi.number()
        }).optional(),
        humidity: Joi.object({
          min: Joi.number(),
          target: Joi.number(),
          max: Joi.number()
        }).optional(),
        vpd: Joi.object({
          min: Joi.number(),
          target: Joi.number(),
          max: Joi.number()
        }).optional(),
        ec: Joi.object({
          min: Joi.number(),
          target: Joi.number(),
          max: Joi.number()
        }).optional(),
        ph: Joi.object({
          min: Joi.number(),
          target: Joi.number(),
          max: Joi.number()
        }).optional(),
        wateringInterval: Joi.number().optional(),
        tips: Joi.array().items(Joi.string()).optional()
      }))
      .min(1)
      .required()
  }),

  // Pagination Query
  pagination: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20),
    sort: Joi.string()
      .optional(),
    order: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
  })
};

module.exports = {
  validateBody,
  validateQuery,
  validateObjectId,
  sanitizeInput,
  schemas
};
