/**
 * Zentrale Error-Handler Middleware
 * Fängt alle Fehler ab und gibt konsistente Error-Responses zurück
 */

// Custom Error-Klasse für bessere Fehlerbehandlung
class AppError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Unterscheidet zwischen erwarteten und unerwarteten Fehlern

    Error.captureStackTrace(this, this.constructor);
  }
}

// Specialized Error Classes for consistent error handling
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message, details = null) {
    super(message, 409, details);
    this.name = 'ConflictError';
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details = null) {
    super(message, 500, details);
    this.name = 'DatabaseError';
  }
}

class ServiceUnavailableError extends AppError {
  constructor(service = 'Service') {
    super(`${service} is currently unavailable`, 503);
    this.name = 'ServiceUnavailableError';
  }
}

// MongoDB Fehler Handler
const handleMongoError = (error) => {
  // Duplicate Key Error (z.B. bereits existierender Username)
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];
    return new AppError(
      `${field} "${value}" existiert bereits`,
      409,
      { field, value }
    );
  }

  // Validation Error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));
    return new AppError('Validierungsfehler', 400, errors);
  }

  // Cast Error (ungültige ObjectID)
  if (error.name === 'CastError') {
    return new AppError(`Ungültige ${error.path}: ${error.value}`, 400);
  }

  return error;
};

// JWT Fehler Handler
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AppError('Ungültiger Token', 401);
  }

  if (error.name === 'TokenExpiredError') {
    return new AppError('Token abgelaufen - Bitte erneut anmelden', 401);
  }

  return error;
};

// Hauptfehler-Handler Middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log Fehler für Debugging
  console.error('❌ Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // MongoDB Fehler behandeln
  if (err.name === 'MongoError' || err.name === 'ValidationError' || err.name === 'CastError' || err.code === 11000) {
    error = handleMongoError(err);
  }

  // JWT Fehler behandeln
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  }

  // Default Status Code
  const statusCode = error.statusCode || err.statusCode || 500;

  // Response erstellen
  const response = {
    success: false,
    message: error.message || 'Interner Server-Fehler',
    ...(error.details && { details: error.details })
  };

  // Stack-Trace nur in Development-Mode
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.error = err;
  }

  res.status(statusCode).json(response);
};

// 404 Not Found Handler
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.originalUrl} nicht gefunden`,
    404
  );
  next(error);
};

// Async Handler Wrapper (verhindert try-catch in jedem Controller)
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  // Base error class
  AppError,

  // Specialized error classes
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ServiceUnavailableError,

  // Middleware
  errorHandler,
  notFoundHandler,
  asyncHandler
};
