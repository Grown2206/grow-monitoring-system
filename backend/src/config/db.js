const mongoose = require('mongoose');

let dbConnected = false;
let reconnectTimer = null;

const connectDB = async () => {
  try {
    // Support both MONGODB_URI (standard) and DB_URI (legacy) environment variables
    const mongoUri = process.env.MONGODB_URI || process.env.DB_URI || 'mongodb://127.0.0.1:27017/growmonitor';

    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });

    dbConnected = true;
    console.log(`\u2705 MongoDB Verbunden: ${conn.connection.host}`);

    // Reconnect bei Verbindungsverlust
    mongoose.connection.on('disconnected', () => {
      dbConnected = false;
      console.log('\u26a0\ufe0f  MongoDB Verbindung verloren! Versuche Reconnect...');
      scheduleReconnect(mongoUri);
    });

    mongoose.connection.on('error', (err) => {
      dbConnected = false;
      console.error('\u274c MongoDB Fehler:', err.message);
    });

  } catch (error) {
    dbConnected = false;
    console.log("\n\u26a0\ufe0f  ACHTUNG: Keine Datenbank gefunden!");
    console.log(`   Grund: ${error.message}`);
    console.log("\ud83d\udc49 Server startet im 'Live-Only' Modus.");
    console.log("   (Echtzeit-Daten funktionieren, aber Historie wird nicht gespeichert)");
    console.log("   Reconnect-Versuch alle 30 Sekunden...\n");

    const mongoUri = process.env.MONGODB_URI || process.env.DB_URI || 'mongodb://127.0.0.1:27017/growmonitor';
    scheduleReconnect(mongoUri);
  }
};

const scheduleReconnect = (mongoUri) => {
  if (reconnectTimer) return; // Bereits geplant
  reconnectTimer = setInterval(async () => {
    if (mongoose.connection.readyState === 1) {
      // Bereits verbunden
      dbConnected = true;
      clearInterval(reconnectTimer);
      reconnectTimer = null;
      return;
    }
    try {
      console.log('\ud83d\udd04 MongoDB Reconnect-Versuch...');
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
      });
      dbConnected = true;
      console.log('\u2705 MongoDB Reconnect erfolgreich!');
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    } catch (err) {
      console.log(`\u274c MongoDB Reconnect fehlgeschlagen: ${err.message}`);
    }
  }, 30000); // Alle 30 Sekunden
};

const isDBConnected = () => dbConnected;

module.exports = connectDB;
module.exports.isDBConnected = isDBConnected;