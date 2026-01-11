const weatherService = require('../services/weatherService');
const SensorLog = require('../models/SensorLog');

/**
 * Holt aktuelles Wetter
 */
exports.getCurrent = async (req, res) => {
  try {
    const { city = 'Munich', country = 'DE' } = req.query;

    const weather = await weatherService.getCurrentWeather(city, country);

    res.json({
      success: true,
      data: weather
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Wetters:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Wetterdaten'
    });
  }
};

/**
 * Holt Wettervorhersage
 */
exports.getForecast = async (req, res) => {
  try {
    const { city = 'Munich', country = 'DE', days = 5 } = req.query;

    const forecast = await weatherService.getForecast(
      city,
      country,
      parseInt(days)
    );

    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Vorhersage:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Wettervorhersage'
    });
  }
};

/**
 * Vergleicht Außenwetter mit Indoor-Bedingungen und gibt Empfehlungen
 */
exports.getRecommendations = async (req, res) => {
  try {
    const { city = 'Munich', country = 'DE' } = req.query;

    // Hole Wetterdaten
    const weather = await weatherService.getCurrentWeather(city, country);

    // Hole aktuelle Indoor-Sensordaten
    const latestSensor = await SensorLog.findOne().sort({ timestamp: -1 });

    if (!latestSensor) {
      return res.json({
        success: true,
        weather,
        recommendations: [],
        message: 'Keine Indoor-Sensordaten verfügbar für Vergleich'
      });
    }

    // Generiere Empfehlungen
    const recommendations = weatherService.getGrowingRecommendations(
      weather,
      latestSensor.temp,
      latestSensor.humidity
    );

    res.json({
      success: true,
      weather,
      indoor: {
        temp: latestSensor.temp,
        humidity: latestSensor.humidity,
        timestamp: latestSensor.timestamp
      },
      recommendations,
      comparison: {
        tempDifference: weather.current.temp - latestSensor.temp,
        humidityDifference: weather.current.humidity - latestSensor.humidity
      }
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Empfehlungen:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen der Empfehlungen'
    });
  }
};

module.exports = exports;
