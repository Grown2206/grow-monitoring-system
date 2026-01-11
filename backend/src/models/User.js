const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Benutzername ist erforderlich'],
    unique: true,
    trim: true,
    minlength: [3, 'Benutzername muss mindestens 3 Zeichen lang sein'],
    maxlength: [30, 'Benutzername darf maximal 30 Zeichen lang sein']
  },
  password: {
    type: String,
    required: [true, 'Passwort ist erforderlich'],
    minlength: [6, 'Passwort muss mindestens 6 Zeichen lang sein']
  },
  email: {
    type: String,
    sparse: true, // Erlaubt mehrere null-Werte
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Bitte gib eine gültige E-Mail-Adresse ein']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// 🔒 WICHTIG: Passwort hashen VOR dem Speichern
userSchema.pre('save', async function(next) {
  // Nur hashen wenn Passwort neu oder geändert wurde
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Salt generieren (10 Runden = gute Balance zwischen Sicherheit und Performance)
    const salt = await bcrypt.genSalt(10);

    // Passwort hashen
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Methode zum Passwort-Vergleich
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Passwort-Vergleich fehlgeschlagen');
  }
};

// Passwort beim Ausgeben ausblenden
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
