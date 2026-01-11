const mongoose = require('mongoose');

const plantSchema = new mongoose.Schema({
  slotId: { type: Number, required: true, unique: true }, // 1-6
  name: { type: String, default: '' },
  strain: { type: String, default: '' },
  breeder: { type: String, default: '' }, // Züchter (z.B. Royal Queen Seeds)
  type: { 
    type: String, 
    enum: ['Feminized', 'Autoflower', 'Regular', 'CBD'], 
    default: 'Feminized' 
  },
  stage: { 
    type: String, 
    enum: ['Keimling', 'Vegetation', 'Blüte', 'Trocknen', 'Geerntet', 'Leer'], 
    default: 'Leer' 
  },
  plantedDate: { type: Date, default: Date.now },
  germinationDate: { type: Date }, // Wann ist sie gekeimt?
  bloomDate: { type: Date },       // Wann begann die Blüte?
  harvestDate: { type: Date },     // Geplantes Erntedatum
  
  // Wachstum & Gesundheit
  height: { type: Number, default: 0 }, // cm
  health: { type: Number, default: 100 }, // 0-100%
  notes: { type: String, default: '' },
  
  // Bild URL (optional für später)
  imageUrl: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Plant', plantSchema);