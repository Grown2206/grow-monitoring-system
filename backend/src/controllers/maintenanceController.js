const predictiveMaintenanceService = require('../services/predictiveMaintenanceService');

/**
 * Controller für Predictive Maintenance
 */

// Hole alle Geräte-Analytics
exports.getAllDeviceAnalytics = async (req, res, next) => {
  try {
    const userId = req.user?.userId || null;
    const analytics = await predictiveMaintenanceService.getAllDeviceAnalytics(userId);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

// Hole Analytics für spezifisches Gerät
exports.getDeviceAnalytics = async (req, res, next) => {
  try {
    const { deviceType, deviceId } = req.params;
    const analytics = await predictiveMaintenanceService.getDeviceAnalytics(deviceType, deviceId);

    if (!analytics) {
      return res.status(404).json({
        success: false,
        message: 'Keine Analytics für dieses Gerät gefunden'
      });
    }

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

// Aktualisiere Analytics für ein Gerät
exports.updateDeviceAnalytics = async (req, res, next) => {
  try {
    const { deviceType, deviceId } = req.params;
    const userId = req.user?.userId || null;

    const analytics = await predictiveMaintenanceService.updateDeviceAnalytics(
      deviceType,
      deviceId,
      userId
    );

    res.json({
      success: true,
      message: 'Analytics aktualisiert',
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

// Füge Wartungs-Historie hinzu
exports.addMaintenanceRecord = async (req, res, next) => {
  try {
    const { deviceType, deviceId } = req.params;
    const record = {
      type: req.body.type,
      description: req.body.description,
      performedBy: req.body.performedBy || req.user?.username || 'System',
      cost: req.body.cost || 0,
      resolved: req.body.resolved !== undefined ? req.body.resolved : true
    };

    const analytics = await predictiveMaintenanceService.addMaintenanceRecord(
      deviceType,
      deviceId,
      record
    );

    res.json({
      success: true,
      message: 'Wartung eingetragen',
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

// Initialisiere Standard-Geräte
exports.initializeStandardDevices = async (req, res, next) => {
  try {
    const userId = req.user?.userId || null;
    const results = await predictiveMaintenanceService.initializeStandardDevices(userId);

    res.json({
      success: true,
      message: `${results.length} Geräte initialisiert`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

// Hole Dashboard-Übersicht
exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user?.userId || null;
    const allDevices = await predictiveMaintenanceService.getAllDeviceAnalytics(userId);

    // Berechne Dashboard-Statistiken
    const totalDevices = allDevices.length;
    const healthyDevices = allDevices.filter(d => d.healthScore >= 85).length;
    const warningDevices = allDevices.filter(d => d.healthScore >= 50 && d.healthScore < 85).length;
    const criticalDevices = allDevices.filter(d => d.healthScore < 50).length;

    const avgHealthScore = totalDevices > 0
      ? allDevices.reduce((sum, d) => sum + d.healthScore, 0) / totalDevices
      : 100;

    // Geräte mit dringender Wartung
    const urgentDevices = allDevices.filter(d =>
      d.predictions?.recommendedAction === 'urgent_maintenance' ||
      d.predictions?.recommendedAction === 'replace'
    );

    // Nächste geplante Wartungen
    const upcomingMaintenance = allDevices
      .filter(d => d.predictions?.nextMaintenanceDate)
      .sort((a, b) => new Date(a.predictions.nextMaintenanceDate) - new Date(b.predictions.nextMaintenanceDate))
      .slice(0, 5);

    // Letzte Anomalien (alle Geräte)
    const recentAnomalies = [];
    allDevices.forEach(device => {
      if (device.anomalies && device.anomalies.length > 0) {
        device.anomalies.slice(-3).forEach(anomaly => {
          recentAnomalies.push({
            ...anomaly,
            deviceType: device.deviceType,
            deviceId: device.deviceId
          });
        });
      }
    });
    recentAnomalies.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: {
        summary: {
          totalDevices,
          healthyDevices,
          warningDevices,
          criticalDevices,
          avgHealthScore: Math.round(avgHealthScore)
        },
        devices: allDevices,
        urgentDevices,
        upcomingMaintenance,
        recentAnomalies: recentAnomalies.slice(0, 10)
      }
    });
  } catch (error) {
    next(error);
  }
};
