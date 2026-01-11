const timelapseService = require('../services/timelapseService');
const TimelapseCapture = require('../models/TimelapseCapture');
const TimelapseVideo = require('../models/TimelapseVideo');
const path = require('path');
const fs = require('fs').promises;

/**
 * Timelapse Controller
 * API-Handler für Timelapse-Funktionalität
 */

/**
 * POST /api/timelapse/capture
 * Erfasse manuellen Snapshot
 */
exports.captureSnapshot = async (req, res, next) => {
  try {
    const {
      source = 'manual',
      resolution,
      format = 'jpg',
      quality = 90,
      plant,
      phase,
      tags = [],
      notes
    } = req.body;

    const result = await timelapseService.captureSnapshot({
      source,
      resolution,
      format,
      quality,
      plant,
      phase,
      tags
    });

    // Füge Notizen hinzu falls vorhanden
    if (notes && result.capture) {
      const capture = await TimelapseCapture.findById(result.capture._id);
      capture.notes = notes;
      await capture.save();
    }

    res.status(201).json({
      success: true,
      data: result.capture,
      message: 'Snapshot erfolgreich erfasst'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/timelapse/captures
 * Hole alle Captures mit Filterung
 */
exports.getCaptures = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      plant,
      phase,
      tags,
      limit = 100,
      offset = 0,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    // Build Query
    const query = { isDeleted: false };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    if (plant) query.plant = plant;
    if (phase) query.phase = phase;
    if (tags) query.tags = { $in: tags.split(',') };

    // Execute Query
    const captures = await TimelapseCapture.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('plant', 'name strain')
      .lean();

    // Count Total
    const total = await TimelapseCapture.countDocuments(query);

    res.json({
      success: true,
      data: {
        captures,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: total > (parseInt(offset) + parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/timelapse/captures/:id
 * Hole einzelnen Capture
 */
exports.getCaptureById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const capture = await TimelapseCapture.findById(id)
      .populate('plant', 'name strain')
      .lean();

    if (!capture || capture.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Capture nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: capture
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/timelapse/captures/:id
 * Lösche Capture (soft delete)
 */
exports.deleteCapture = async (req, res, next) => {
  try {
    const { id } = req.params;

    const capture = await TimelapseCapture.findById(id);

    if (!capture || capture.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Capture nicht gefunden'
      });
    }

    // Soft delete
    await capture.softDelete();

    // Optional: Lösche Dateien
    try {
      await fs.unlink(capture.filePath).catch(() => {});
      if (capture.thumbnailPath) {
        await fs.unlink(capture.thumbnailPath).catch(() => {});
      }
    } catch (err) {
      console.error('Error deleting files:', err);
    }

    res.json({
      success: true,
      message: 'Capture gelöscht'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/timelapse/generate
 * Generiere Timelapse-Video
 */
exports.generateVideo = async (req, res, next) => {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      fps = 30,
      resolution = { width: 1920, height: 1080 },
      format = 'mp4',
      codec = 'h264',
      plant,
      tags = [],
      effects = {}
    } = req.body;

    // Validierung
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate und endDate sind erforderlich'
      });
    }

    const result = await timelapseService.generateTimelapse({
      title,
      description,
      startDate,
      endDate,
      fps,
      resolution,
      format,
      codec,
      plant,
      tags,
      effects
    });

    res.status(202).json({
      success: true,
      data: result.video,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/timelapse/videos
 * Hole alle Videos
 */
exports.getVideos = async (req, res, next) => {
  try {
    const {
      status,
      plant,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build Query
    const query = { isDeleted: false };

    if (status) query.status = status;
    if (plant) query.plant = plant;

    // Execute Query
    const videos = await TimelapseVideo.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('plant', 'name strain')
      .lean();

    // Count Total
    const total = await TimelapseVideo.countDocuments(query);

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: total > (parseInt(offset) + parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/timelapse/videos/:id
 * Hole einzelnes Video
 */
exports.getVideoById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const video = await TimelapseVideo.findById(id)
      .populate('plant', 'name strain')
      .lean();

    if (!video || video.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Video nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: video
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/timelapse/videos/:id
 * Lösche Video (soft delete)
 */
exports.deleteVideo = async (req, res, next) => {
  try {
    const { id } = req.params;

    const video = await TimelapseVideo.findById(id);

    if (!video || video.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Video nicht gefunden'
      });
    }

    // Soft delete
    await video.softDelete();

    // Optional: Lösche Datei
    try {
      await fs.unlink(video.filePath).catch(() => {});
    } catch (err) {
      console.error('Error deleting video file:', err);
    }

    res.json({
      success: true,
      message: 'Video gelöscht'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/timelapse/statistics
 * Hole Timelapse-Statistiken
 */
exports.getStatistics = async (req, res, next) => {
  try {
    const stats = await timelapseService.getStorageStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/timelapse/cleanup
 * Cleanup alte Captures
 */
exports.cleanup = async (req, res, next) => {
  try {
    const { daysToKeep = 30 } = req.body;

    const result = await timelapseService.cleanupOldCaptures(daysToKeep);

    res.json({
      success: true,
      data: result,
      message: `${result.deletedCount} alte Captures gelöscht, ${result.freedSpaceMB} MB freigegeben`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/timelapse/images/:filename
 * Serve Capture Image
 */
exports.serveImage = async (req, res, next) => {
  try {
    const { filename } = req.params;

    const capture = await TimelapseCapture.findOne({ filename });

    if (!capture || capture.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Bild nicht gefunden'
      });
    }

    res.sendFile(capture.filePath);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/timelapse/thumbnails/:filename
 * Serve Thumbnail
 */
exports.serveThumbnail = async (req, res, next) => {
  try {
    const { filename } = req.params;

    const capture = await TimelapseCapture.findOne({ filename });

    if (!capture || capture.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Thumbnail nicht gefunden'
      });
    }

    const thumbnailFilename = `thumb_${filename}`;
    const thumbnailPath = path.join(
      require('../services/timelapseService').thumbnailsDir,
      thumbnailFilename
    );

    res.sendFile(thumbnailPath);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/timelapse/videos/:filename/stream
 * Stream Video
 */
exports.streamVideo = async (req, res, next) => {
  try {
    const { filename } = req.params;

    const video = await TimelapseVideo.findOne({ filename });

    if (!video || video.isDeleted || video.status !== 'completed') {
      return res.status(404).json({
        success: false,
        message: 'Video nicht verfügbar'
      });
    }

    // Increment view counter
    await video.incrementViews();

    // Send video file
    res.sendFile(video.filePath);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/timelapse/videos/:filename/download
 * Download Video
 */
exports.downloadVideo = async (req, res, next) => {
  try {
    const { filename } = req.params;

    const video = await TimelapseVideo.findOne({ filename });

    if (!video || video.isDeleted || video.status !== 'completed') {
      return res.status(404).json({
        success: false,
        message: 'Video nicht verfügbar'
      });
    }

    // Increment download counter
    video.downloads += 1;
    await video.save();

    // Force download
    res.download(video.filePath, filename);
  } catch (error) {
    next(error);
  }
};
