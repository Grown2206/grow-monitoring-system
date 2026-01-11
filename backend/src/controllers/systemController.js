const SystemLog = require('../models/SystemLog');
const CalendarEvent = require('../models/CalendarEvent');
const automationService = require('../services/automationService');
const { asyncHandler, NotFoundError, DatabaseError } = require('../middleware/errorHandler');

// --- SYSTEM LOGS ---
const getLogs = asyncHandler(async (req, res) => {
  const logs = await SystemLog.find()
    .sort({ timestamp: -1 })
    .limit(100);

  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs
  });
});

// --- KALENDER ---
const getEvents = asyncHandler(async (req, res) => {
  const events = await CalendarEvent.find().sort({ date: 1 });

  res.status(200).json({
    success: true,
    count: events.length,
    data: events
  });
});

const createEvent = asyncHandler(async (req, res) => {
  const newEvent = new CalendarEvent(req.body);
  const savedEvent = await newEvent.save();

  res.status(201).json({
    success: true,
    message: 'Event created successfully',
    data: savedEvent
  });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await CalendarEvent.findByIdAndDelete(id);

  if (!event) {
    throw new NotFoundError('Event');
  }

  res.status(200).json({
    success: true,
    message: 'Event deleted successfully',
    data: { id }
  });
});

// --- AUTOMATION SETTINGS ---
const getAutomationConfig = asyncHandler(async (req, res) => {
  const config = automationService.getAutomationConfig();

  res.status(200).json({
    success: true,
    data: config
  });
});

const updateAutomationConfig = asyncHandler(async (req, res) => {
  // updateAutomationConfig is now async (persists to MongoDB)
  await automationService.updateAutomationConfig(req.body);
  const updatedConfig = automationService.getAutomationConfig();

  res.status(200).json({
    success: true,
    message: 'Automation config updated and persisted to MongoDB',
    data: updatedConfig
  });
});

const getDeviceStates = asyncHandler(async (req, res) => {
  const states = automationService.getDeviceStates();

  res.status(200).json({
    success: true,
    data: states
  });
});

module.exports = {
  getLogs,
  getEvents,
  createEvent,
  deleteEvent,
  getAutomationConfig,
  updateAutomationConfig,
  getDeviceStates
};