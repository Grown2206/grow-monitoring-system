const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Support both MONGODB_URI (standard) and DB_URI (legacy) environment variables
    const mongoUri = process.env.MONGODB_URI || process.env.DB_URI || 'mongodb://127.0.0.1:27017/growmonitor';

    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // Increased timeout for Docker networking
    });

    console.log(`✅ MongoDB Verbunden: ${conn.connection.host}`);
  } catch (error) {
    console.log("\n⚠️  ACHTUNG: Keine Datenbank gefunden!");
    console.log(`   Grund: ${error.message}`);
    console.log("👉 Server startet im 'Live-Only' Modus."); 
    console.log("   (Echtzeit-Daten funktionieren, aber Historie wird nicht gespeichert)\n");
    
    // WICHTIG: Wir beenden den Prozess NICHT, damit der Server trotzdem läuft!
    // process.exit(1); <--- Auskommentiert
  }
};

module.exports = connectDB;