const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const apiRoutes = require('./routes/apiRoutes');
const connectDB = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { sanitizeInput } = require('./middleware/validation');
require('dotenv').config();
require('./services/mqttService'); // Startet MQTT

// Datenbankverbindung initialisieren
connectDB().then(async () => {
  // Initialisiere Grow-Rezept Templates nach erfolgreicher DB-Verbindung
  const recipeController = require('./controllers/recipeController');
  recipeController.initializeTemplates();

  // Starte Plant Tracking Service (unified: replaces autoGrowthLogger + autoPlantTracking)
  const plantTrackingService = require('./services/plantTrackingService');
  plantTrackingService.start();

  // Initialize Automation Service with MongoDB config persistence
  const { initializeAutomation } = require('./services/automationService');
  await initializeAutomation();
});

const app = express();
const server = http.createServer(app);

// ========================================
// 🔒 SECURITY MIDDLEWARE
// ========================================

// 1. Helmet - Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // Deaktiviert für Socket.io
  crossOriginEmbedderPolicy: false
}));

// 2. CORS - Beschränkt auf Frontend-URL
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: (origin, callback) => {
    // Erlaube Requests ohne Origin (z.B. mobile Apps, Postman)
    if (!origin) return callback(null, true);

    // In Development: Erlaube alle localhost und lokale IPs (192.168.x.x, 10.x.x.x)
    if (isDevelopment) {
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
      const isLocalNetwork = /https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin);

      if (isLocalhost || isLocalNetwork || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
    }

    // In Production: Nur explizit erlaubte Origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked request from: ${origin}`);
      callback(new Error('CORS-Fehler: Zugriff von dieser Domain nicht erlaubt'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));

// 3. Rate Limiting - Schutz vor Brute-Force
const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // Default: 15 Minuten
const rateLimitMaxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (isDevelopment ? 1000 : 100);
const rateLimitAuthMax = parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 5;

const apiLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMaxRequests,
  message: {
    success: false,
    message: 'Zu viele Anfragen von dieser IP, bitte versuche es später erneut'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip Rate-Limiting für WebSocket und MQTT Endpoints in Development
    // Strikte Path-Checks: Nur exakt /socket.io oder /api/mqtt
    if (isDevelopment) {
      const path = req.path;
      return path.startsWith('/socket.io') || path === '/api/mqtt' || path.startsWith('/api/mqtt/');
    }
    return false;
  }
});

// Strengeres Limit für Auth-Endpoints
const authLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitAuthMax,
  message: {
    success: false,
    message: 'Zu viele Login-Versuche, bitte versuche es später erneut'
  },
  skipSuccessfulRequests: true // Erfolgreiche Requests nicht zählen
});

// Rate Limiter anwenden
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 4. Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Input Sanitization - NoSQL Injection Schutz
app.use(sanitizeInput);

// ========================================
// 🔌 SOCKET.IO - Echtzeit-Verbindung
// ========================================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins, // Gleiche CORS-Regeln wie für REST API
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Wenn sich ein Browser verbindet
io.on('connection', (socket) => {
  console.log('📱 Frontend verbunden:', socket.id);

  socket.on('disconnect', () => {
    console.log('👋 Frontend getrennt:', socket.id);
  });
});

// MQTT Service initialisieren (verarbeitet alle MQTT Messages intern)
require('./services/mqttService');

// Automation Service initialization is now done in connectDB().then()
// to ensure MongoDB is connected before loading config

// ========================================
// 📡 API ROUTEN
// ========================================
app.use('/api', apiRoutes);

// ========================================
// ⚠️ ERROR HANDLING
// ========================================
// 404 Handler (muss NACH allen Routes kommen)
app.use(notFoundHandler);

// Zentraler Error Handler (muss als LETZTES kommen)
app.use(errorHandler);

// ========================================
// 🚀 SERVER STARTEN
// ========================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ✅ Grow Monitoring System Server läuft!
  ========================================
  🌐 Lokal:     http://localhost:${PORT}
  🌍 Netzwerk:  http://<DEINE-PC-IP>:${PORT}
  🔒 Security:  Helmet, CORS, Rate-Limiting ✓
  🔐 Auth:      JWT-Authentifizierung ✓
  📊 Database:  MongoDB verbunden ✓
  ⚡ Rate-Limit: ${rateLimitMaxRequests} req/${rateLimitWindowMs/60000}min
  ========================================
  Environment: ${process.env.NODE_ENV || 'development'}
  `);
});

// Export für andere Module (z.B. mqttService für Broadcasts)
module.exports = { io, server, app };