const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * JWT Authentifizierungs-Middleware
 * Prüft ob ein gültiger JWT-Token im Authorization-Header vorhanden ist
 */
const authenticate = async (req, res, next) => {
  try {
    // Token aus Header holen
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Kein Authentifizierungs-Token gefunden',
        hint: 'Bitte sende den Token im Format: Authorization: Bearer <token>'
      });
    }

    // Token extrahieren (Format: "Bearer <token>")
    const token = authHeader.split(' ')[1];

    // Token verifizieren
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-secret-CHANGE-ME-IN-PRODUCTION'
    );

    // User-Info an Request anhängen
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Ungültiger Token',
        error: error.message
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token abgelaufen',
        error: 'Bitte melde dich erneut an'
      });
    }

    return res.status(500).json({
      message: 'Authentifizierungs-Fehler',
      error: error.message
    });
  }
};

/**
 * Optional Auth Middleware
 * Versucht User zu authentifizieren, erlaubt aber auch unauthentifizierte Anfragen
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default-secret-CHANGE-ME-IN-PRODUCTION'
      );

      req.user = {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role
      };
    }

    next();
  } catch (error) {
    // Bei optionalAuth ignorieren wir Fehler und fahren fort
    next();
  }
};

/**
 * Admin-Only Middleware
 * Prüft ob der authentifizierte User Admin-Rechte hat
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Nicht authentifiziert'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Zugriff verweigert - Admin-Rechte erforderlich'
    });
  }

  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  requireAdmin
};
