const mongoose = require('mongoose');

const CalendarEventSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  title: String,
  type: {
    type: String,
    enum: ['water', 'nutrient', 'pruning', 'check', 'other'], // Gießen, Düngen, Schneiden...
    default: 'other'
  },
  description: String,
  completed: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('CalendarEvent', CalendarEventSchema);