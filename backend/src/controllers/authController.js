const User = require('../models/User');
const jwt = require('jsonwebtoken');

// JWT Token generieren
const generateToken = (userId, username, role) => {
  return jwt.sign(
    { userId, username, role },
    process.env.JWT_SECRET || 'default-secret-CHANGE-ME-IN-PRODUCTION',
    { expiresIn: '7d' } // Token gültig für 7 Tage
  );
};

// 📝 Registrierung mit bcrypt Passwort-Hashing
const register = async (req, res, next) => {
  try {
    const { username, password, email } = req.body;

    // Validierung
    if (!username || !password) {
      return res.status(400).json({
        message: "Benutzername und Passwort sind erforderlich"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Passwort muss mindestens 6 Zeichen lang sein"
      });
    }

    // Prüfen ob User bereits existiert
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({
        message: "Benutzername bereits vergeben"
      });
    }

    // User erstellen (Passwort wird automatisch gehasht durch pre-save Hook)
    const user = new User({ username, password, email });
    await user.save();

    // JWT Token generieren
    const token = generateToken(user._id, user.username, user.role);

    console.log(`✅ Neuer User registriert: ${username}`);

    res.status(201).json({
      message: "Benutzer erfolgreich erstellt",
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registrierungs-Fehler:', error);
    next(error);
  }
};

// 🔐 Login mit bcrypt Passwort-Vergleich
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validierung
    if (!username || !password) {
      return res.status(400).json({
        message: "Benutzername und Passwort sind erforderlich"
      });
    }

    // User finden
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({
        message: "Ungültige Zugangsdaten"
      });
    }

    // Passwort prüfen (bcrypt compare)
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Ungültige Zugangsdaten"
      });
    }

    // Last login updaten
    user.lastLogin = new Date();
    await user.save();

    // JWT Token generieren
    const token = generateToken(user._id, user.username, user.role);

    console.log(`✅ User eingeloggt: ${username}`);

    res.json({
      message: "Login erfolgreich",
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Login-Fehler:', error);
    next(error);
  }
};

// 🔍 Token validieren (für Frontend)
const validateToken = async (req, res) => {
  try {
    // Token kommt aus dem auth Middleware (req.user)
    res.json({
      valid: true,
      user: req.user
    });
  } catch (error) {
    res.status(401).json({
      valid: false,
      message: "Ungültiger Token"
    });
  }
};

// 🔄 Token erneuern
const refreshToken = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: "User nicht gefunden" });
    }

    const token = generateToken(user._id, user.username, user.role);

    res.json({
      message: "Token erneuert",
      token
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  validateToken,
  refreshToken
};
