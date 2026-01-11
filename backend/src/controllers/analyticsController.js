const analyticsService = require('../services/analyticsService');

exports.getAnomalies = async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const result = await analyticsService.detectAnomalies(parseInt(hours));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Fehler bei Anomalie-Erkennung:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Anomalie-Erkennung'
    });
  }
};

exports.getPredictions = async (req, res) => {
  try {
    const { hours = 24, predictHours = 6 } = req.query;
    const result = await analyticsService.predictValues(
      parseInt(hours),
      parseInt(predictHours)
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Fehler bei Vorhersage:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Vorhersage'
    });
  }
};

exports.getOptimizations = async (req, res) => {
  try {
    const result = await analyticsService.getOptimizationSuggestions();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Fehler bei Optimierungsvorschlägen:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler bei den Optimierungsvorschlägen'
    });
  }
};

module.exports = exports;
