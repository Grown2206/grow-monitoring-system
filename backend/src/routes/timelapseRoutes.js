const express = require('express');
const router = express.Router();
const timelapseController = require('../controllers/timelapseController');
const { optionalAuth } = require('../middleware/auth');

/**
 * Timelapse Routes
 * API-Endpunkte für Timelapse-Funktionalität
 */

// ===== CAPTURES =====

/**
 * POST /api/timelapse/capture
 * Erfasse manuellen Snapshot
 */
router.post('/capture', optionalAuth, timelapseController.captureSnapshot);

/**
 * GET /api/timelapse/captures
 * Hole alle Captures mit Filterung
 * Query Params:
 *   - startDate: ISO date string
 *   - endDate: ISO date string
 *   - plant: Plant ID
 *   - phase: Growth phase
 *   - tags: Comma-separated tags
 *   - limit: Number of results (default: 100)
 *   - offset: Offset for pagination (default: 0)
 *   - sortBy: Field to sort by (default: timestamp)
 *   - sortOrder: asc/desc (default: desc)
 */
router.get('/captures', optionalAuth, timelapseController.getCaptures);

/**
 * GET /api/timelapse/captures/:id
 * Hole einzelnen Capture
 */
router.get('/captures/:id', optionalAuth, timelapseController.getCaptureById);

/**
 * DELETE /api/timelapse/captures/:id
 * Lösche Capture (soft delete)
 */
router.delete('/captures/:id', optionalAuth, timelapseController.deleteCapture);

// ===== VIDEOS =====

/**
 * POST /api/timelapse/generate
 * Generiere Timelapse-Video
 * Body:
 *   - title: Video title
 *   - description: Video description
 *   - startDate: ISO date string (required)
 *   - endDate: ISO date string (required)
 *   - fps: Frames per second (default: 30)
 *   - resolution: { width, height }
 *   - format: mp4/avi/webm (default: mp4)
 *   - codec: h264/h265/vp9 (default: h264)
 *   - plant: Plant ID
 *   - tags: Array of tags
 *   - effects: { stabilization, colorCorrection, watermark, transitions }
 */
router.post('/generate', optionalAuth, timelapseController.generateVideo);

/**
 * GET /api/timelapse/videos
 * Hole alle Videos
 * Query Params:
 *   - status: pending/processing/completed/failed
 *   - plant: Plant ID
 *   - limit: Number of results (default: 50)
 *   - offset: Offset for pagination (default: 0)
 *   - sortBy: Field to sort by (default: createdAt)
 *   - sortOrder: asc/desc (default: desc)
 */
router.get('/videos', optionalAuth, timelapseController.getVideos);

/**
 * GET /api/timelapse/videos/:id
 * Hole einzelnes Video (Metadata)
 */
router.get('/videos/:id', optionalAuth, timelapseController.getVideoById);

/**
 * DELETE /api/timelapse/videos/:id
 * Lösche Video (soft delete)
 */
router.delete('/videos/:id', optionalAuth, timelapseController.deleteVideo);

// ===== MEDIA SERVING =====

/**
 * GET /api/timelapse/images/:filename
 * Serve Capture Image
 */
router.get('/images/:filename', timelapseController.serveImage);

/**
 * GET /api/timelapse/thumbnails/:filename
 * Serve Thumbnail
 */
router.get('/thumbnails/:filename', timelapseController.serveThumbnail);

/**
 * GET /api/timelapse/videos/:filename/stream
 * Stream Video
 */
router.get('/videos/:filename/stream', timelapseController.streamVideo);

/**
 * GET /api/timelapse/videos/:filename/download
 * Download Video
 */
router.get('/videos/:filename/download', timelapseController.downloadVideo);

// ===== UTILITIES =====

/**
 * GET /api/timelapse/statistics
 * Hole Timelapse-Statistiken
 */
router.get('/statistics', optionalAuth, timelapseController.getStatistics);

/**
 * POST /api/timelapse/cleanup
 * Cleanup alte Captures
 * Body:
 *   - daysToKeep: Number of days to keep (default: 30)
 */
router.post('/cleanup', optionalAuth, timelapseController.cleanup);

module.exports = router;
