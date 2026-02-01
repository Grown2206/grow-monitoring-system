const Camera = require('../models/Camera');
const Snapshot = require('../models/Snapshot');
const TimelapseVideo = require('../models/TimelapseVideo');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;

/**
 * Camera Controller
 * Verwaltet Multi-Kamera System, Snapshots und Timelapse
 */

// Upload-Verzeichnis
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads/cameras');

// Sicherstellen dass Upload-Verzeichnis existiert
const ensureUploadDir = async () => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(path.join(UPLOAD_DIR, 'snapshots'), { recursive: true });
    await fs.mkdir(path.join(UPLOAD_DIR, 'timelapse'), { recursive: true });
  } catch (err) {
    console.error('Could not create upload directory:', err);
  }
};
ensureUploadDir();

// ==========================================
// KAMERA-VERWALTUNG
// ==========================================

/**
 * Alle Kameras abrufen
 */
exports.getCameras = async (req, res) => {
  try {
    let cameras = await Camera.find().sort({ createdAt: 1 });

    // Falls keine Kameras existieren, Standard-Kameras erstellen
    if (cameras.length === 0) {
      const defaultCameras = [
        { cameraId: 'cam1', name: 'GrowCam 1', ip: '', color: '#10b981' },
        { cameraId: 'cam2', name: 'GrowCam 2', ip: '', color: '#3b82f6' }
      ];

      cameras = await Camera.insertMany(defaultCameras);
    }

    res.json({ success: true, data: cameras });
  } catch (error) {
    console.error('Error getting cameras:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Kamera hinzufügen
 */
exports.addCamera = async (req, res) => {
  try {
    const { cameraId, name, ip, color } = req.body;

    const camera = new Camera({
      cameraId: cameraId || `cam${Date.now()}`,
      name: name || 'Neue Kamera',
      ip: ip || '',
      color: color || '#10b981'
    });

    await camera.save();
    res.json({ success: true, data: camera });
  } catch (error) {
    console.error('Error adding camera:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Kamera aktualisieren
 */
exports.updateCamera = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const camera = await Camera.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );

    if (!camera) {
      return res.status(404).json({ success: false, error: 'Kamera nicht gefunden' });
    }

    res.json({ success: true, data: camera });
  } catch (error) {
    console.error('Error updating camera:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Kamera löschen
 */
exports.deleteCamera = async (req, res) => {
  try {
    const { id } = req.params;

    const camera = await Camera.findByIdAndDelete(id);

    if (!camera) {
      return res.status(404).json({ success: false, error: 'Kamera nicht gefunden' });
    }

    // Zugehörige Snapshots löschen
    await Snapshot.deleteMany({ cameraId: camera.cameraId });

    res.json({ success: true, message: 'Kamera gelöscht' });
  } catch (error) {
    console.error('Error deleting camera:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Kamera-Status abrufen
 */
exports.getCameraStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const camera = await Camera.findById(id);
    if (!camera || !camera.ip) {
      return res.json({ success: true, data: { status: 'offline', online: false } });
    }

    try {
      // Versuche API-Status abzurufen
      const response = await axios.get(`http://${camera.ip}/api/status`, { timeout: 5000 });

      // Update last seen
      camera.lastSeen = new Date();
      camera.status = 'online';
      await camera.save();

      res.json({
        success: true,
        data: {
          status: 'online',
          online: true,
          ...response.data
        }
      });
    } catch (err) {
      camera.status = 'offline';
      await camera.save();

      res.json({
        success: true,
        data: { status: 'offline', online: false }
      });
    }
  } catch (error) {
    console.error('Error getting camera status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// HEARTBEAT
// ==========================================

/**
 * Heartbeat von ESP32-CAM empfangen
 * Aktualisiert Status und IP in der Datenbank
 */
exports.receiveHeartbeat = async (req, res) => {
  try {
    const { cameraId, name, ip, rssi, uptime, freeHeap, captures, streaming, flash, timelapse } = req.body;

    if (!cameraId) {
      return res.status(400).json({ success: false, error: 'cameraId required' });
    }

    // Kamera finden oder erstellen (upsert)
    const camera = await Camera.findOneAndUpdate(
      { cameraId },
      {
        $set: {
          name: name || cameraId,
          ip: ip || '',
          status: 'online',
          lastSeen: new Date(),
          'stats.totalSnapshots': captures || 0,
          'settings.timelapse.enabled': timelapse?.enabled ?? true,
          'settings.timelapse.interval': timelapse?.interval ?? 60
        },
        $setOnInsert: {
          color: '#10b981'
        }
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Heartbeat received',
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Alle Kamera-Status abrufen (für Frontend-Polling)
 * Markiert Kameras als offline wenn kein Heartbeat seit 90 Sekunden
 */
exports.getAllCameraStatus = async (req, res) => {
  try {
    const cameras = await Camera.find().sort({ createdAt: 1 }).lean();

    const offlineThreshold = new Date(Date.now() - 90000); // 90 Sekunden

    const statusList = cameras.map(cam => ({
      id: cam._id,
      cameraId: cam.cameraId,
      name: cam.name,
      ip: cam.ip,
      color: cam.color,
      status: cam.lastSeen && cam.lastSeen > offlineThreshold ? 'online' : 'offline',
      lastSeen: cam.lastSeen,
      settings: cam.settings,
      stats: cam.stats
    }));

    res.json({ success: true, data: statusList });
  } catch (error) {
    console.error('Error getting camera status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// SNAPSHOTS
// ==========================================

/**
 * Alle Snapshots abrufen
 */
exports.getSnapshots = async (req, res) => {
  try {
    const { cameraId, limit = 100, skip = 0 } = req.query;

    const query = cameraId ? { cameraId } : {};

    const snapshots = await Snapshot.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Snapshot.countDocuments(query);

    res.json({
      success: true,
      data: snapshots,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    console.error('Error getting snapshots:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Snapshot von Kamera aufnehmen
 */
exports.takeSnapshot = async (req, res) => {
  try {
    const { id } = req.params;

    const camera = await Camera.findById(id);
    if (!camera || !camera.ip) {
      return res.status(400).json({ success: false, error: 'Kamera nicht konfiguriert' });
    }

    // Snapshot von ESP32-CAM abrufen
    const response = await axios.get(`http://${camera.ip}/capture`, {
      responseType: 'arraybuffer',
      timeout: 10000
    });

    // Datei speichern
    const filename = `${camera.cameraId}_${Date.now()}.jpg`;
    const filepath = path.join(UPLOAD_DIR, 'snapshots', filename);

    await fs.writeFile(filepath, response.data);

    // In DB speichern
    const snapshot = new Snapshot({
      cameraId: camera.cameraId,
      cameraName: camera.name,
      filename,
      filepath,
      size: response.data.length,
      timestamp: new Date()
    });

    await snapshot.save();

    res.json({
      success: true,
      data: snapshot
    });
  } catch (error) {
    console.error('Error taking snapshot:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Snapshot löschen
 */
exports.deleteSnapshot = async (req, res) => {
  try {
    const { snapshotId } = req.params;

    const snapshot = await Snapshot.findById(snapshotId);
    if (!snapshot) {
      return res.status(404).json({ success: false, error: 'Snapshot nicht gefunden' });
    }

    // Datei löschen
    try {
      await fs.unlink(snapshot.filepath);
    } catch (err) {
      console.log('Could not delete file:', err.message);
    }

    // DB-Eintrag löschen
    await snapshot.deleteOne();

    res.json({ success: true, message: 'Snapshot gelöscht' });
  } catch (error) {
    console.error('Error deleting snapshot:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Mehrere Snapshots löschen
 */
exports.deleteSnapshots = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, error: 'IDs Array required' });
    }

    const snapshots = await Snapshot.find({ _id: { $in: ids } });

    // Dateien löschen
    for (const snapshot of snapshots) {
      try {
        await fs.unlink(snapshot.filepath);
      } catch (err) {
        console.log('Could not delete file:', err.message);
      }
    }

    // DB-Einträge löschen
    await Snapshot.deleteMany({ _id: { $in: ids } });

    res.json({ success: true, deleted: ids.length });
  } catch (error) {
    console.error('Error deleting snapshots:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Snapshot-Bild abrufen
 */
exports.getSnapshotImage = async (req, res) => {
  try {
    const { snapshotId } = req.params;

    const snapshot = await Snapshot.findById(snapshotId);
    if (!snapshot) {
      return res.status(404).json({ success: false, error: 'Snapshot nicht gefunden' });
    }

    res.sendFile(snapshot.filepath);
  } catch (error) {
    console.error('Error getting snapshot image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// TIMELAPSE
// ==========================================

// Aktive Timelapse-Jobs
const timelapseJobs = new Map();

/**
 * Timelapse aus Snapshots generieren
 */
exports.generateTimelapse = async (req, res) => {
  try {
    const { snapshotIds, fps = 24, quality = 'high', resolution = '1080p' } = req.body;

    if (!snapshotIds || snapshotIds.length < 2) {
      return res.status(400).json({ success: false, error: 'Mindestens 2 Snapshots erforderlich' });
    }

    // Job erstellen
    const jobId = `timelapse_${Date.now()}`;

    timelapseJobs.set(jobId, {
      status: 'pending',
      progress: 0,
      snapshotCount: snapshotIds.length,
      startedAt: new Date()
    });

    // Async Timelapse-Generierung (vereinfacht - ohne ffmpeg)
    // In Produktion würde hier ffmpeg oder ein ähnliches Tool verwendet
    setTimeout(async () => {
      try {
        const job = timelapseJobs.get(jobId);
        job.status = 'processing';
        job.progress = 50;

        // Simulierte Generierung
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Video-Eintrag erstellen
        const filename = `timelapse_${Date.now()}.mp4`;
        const video = new TimelapseVideo({
          filename,
          filePath: path.join(UPLOAD_DIR, 'timelapse', filename),
          title: `Timelapse ${new Date().toLocaleDateString('de-DE')}`,
          dateRange: {
            start: new Date(),
            end: new Date()
          },
          duration: Math.ceil(snapshotIds.length / fps),
          fps,
          frameCount: snapshotIds.length,
          fileSize: 0,
          status: 'completed'
        });

        await video.save();

        job.status = 'completed';
        job.progress = 100;
        job.videoId = video._id;
      } catch (err) {
        const job = timelapseJobs.get(jobId);
        job.status = 'failed';
        job.error = err.message;
      }
    }, 100);

    res.json({
      success: true,
      jobId,
      message: 'Timelapse-Generierung gestartet'
    });
  } catch (error) {
    console.error('Error generating timelapse:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Timelapse-Status abrufen
 */
exports.getTimelapseStatus = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = timelapseJobs.get(jobId);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job nicht gefunden' });
    }

    res.json({ success: true, data: job });
  } catch (error) {
    console.error('Error getting timelapse status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Alle Timelapse-Videos abrufen
 */
exports.getTimelapseVideos = async (req, res) => {
  try {
    const videos = await TimelapseVideo.find()
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: videos });
  } catch (error) {
    console.error('Error getting timelapse videos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Timelapse-Video löschen
 */
exports.deleteTimelapseVideo = async (req, res) => {
  try {
    const { videoId } = req.params;

    const video = await TimelapseVideo.findByIdAndDelete(videoId);

    if (!video) {
      return res.status(404).json({ success: false, error: 'Video nicht gefunden' });
    }

    // Datei löschen falls vorhanden
    if (video.filepath) {
      try {
        await fs.unlink(video.filepath);
      } catch (err) {
        console.log('Could not delete video file:', err.message);
      }
    }

    res.json({ success: true, message: 'Video gelöscht' });
  } catch (error) {
    console.error('Error deleting timelapse video:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// KAMERA-EINSTELLUNGEN
// ==========================================

/**
 * Einstellungen von Kamera abrufen
 */
exports.getCameraSettings = async (req, res) => {
  try {
    const { id } = req.params;

    const camera = await Camera.findById(id);
    if (!camera || !camera.ip) {
      return res.status(400).json({ success: false, error: 'Kamera nicht konfiguriert' });
    }

    try {
      const response = await axios.get(`http://${camera.ip}/api/status`, { timeout: 5000 });
      res.json({ success: true, data: response.data });
    } catch (err) {
      res.json({ success: false, error: 'Kamera nicht erreichbar' });
    }
  } catch (error) {
    console.error('Error getting camera settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Einstellungen an Kamera senden
 */
exports.updateCameraSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const settings = req.body;

    const camera = await Camera.findById(id);
    if (!camera || !camera.ip) {
      return res.status(400).json({ success: false, error: 'Kamera nicht konfiguriert' });
    }

    // Einstellungen als Query-Parameter senden
    const params = new URLSearchParams(settings).toString();

    try {
      const response = await axios.get(`http://${camera.ip}/api/settings?${params}`, { timeout: 5000 });
      res.json({ success: true, data: response.data });
    } catch (err) {
      res.json({ success: false, error: 'Kamera nicht erreichbar' });
    }
  } catch (error) {
    console.error('Error updating camera settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Flash toggle
 */
exports.toggleFlash = async (req, res) => {
  try {
    const { id } = req.params;
    const { state } = req.body;

    const camera = await Camera.findById(id);
    if (!camera || !camera.ip) {
      return res.status(400).json({ success: false, error: 'Kamera nicht konfiguriert' });
    }

    try {
      const url = state !== undefined
        ? `http://${camera.ip}/api/flash/toggle?state=${state ? 1 : 0}`
        : `http://${camera.ip}/api/flash/toggle`;

      const response = await axios.get(url, { timeout: 5000 });
      res.json({ success: true, data: response.data });
    } catch (err) {
      res.json({ success: false, error: 'Kamera nicht erreichbar' });
    }
  } catch (error) {
    console.error('Error toggling flash:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// DIAGNOSTICS
// ==========================================

/**
 * GET /api/cameras/:id/diagnostics
 * Kamera-Diagnose: Ping, Settings, Speicher, Snapshot-Statistik
 */
exports.getCameraDiagnostics = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ success: false, error: 'Kamera nicht gefunden' });
    }

    const offlineThreshold = new Date(Date.now() - 90000);
    const isOnline = camera.lastSeen && camera.lastSeen > offlineThreshold;

    const diagnostics = {
      camera: {
        id: camera._id,
        cameraId: camera.cameraId,
        name: camera.name,
        ip: camera.ip,
        color: camera.color
      },
      connection: {
        status: isOnline ? 'online' : 'offline',
        lastSeen: camera.lastSeen,
        lastSeenAgo: camera.lastSeen ? Math.round((Date.now() - camera.lastSeen) / 1000) : null
      },
      settings: camera.settings || {},
      snapshots: {
        total: 0,
        last24h: 0,
        lastSnapshot: null
      },
      ping: null,
      geminiConfigured: !!process.env.GEMINI_API_KEY
    };

    // Snapshot-Statistik
    try {
      const totalSnaps = await Snapshot.countDocuments({ cameraId: camera.cameraId });
      const last24h = await Snapshot.countDocuments({
        cameraId: camera.cameraId,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      const lastSnap = await Snapshot.findOne({ cameraId: camera.cameraId })
        .sort({ timestamp: -1 })
        .select('timestamp fileSize')
        .lean();

      diagnostics.snapshots = {
        total: totalSnaps,
        last24h,
        lastSnapshot: lastSnap?.timestamp || null,
        lastFileSize: lastSnap?.fileSize || null
      };
    } catch (e) {
      // Snapshot-Stats optional
    }

    // Ping-Test (nur wenn IP konfiguriert)
    if (camera.ip && isOnline) {
      try {
        const startTime = Date.now();
        await axios.get(`http://${camera.ip}/api/status`, { timeout: 3000 });
        diagnostics.ping = {
          reachable: true,
          latency_ms: Date.now() - startTime
        };
      } catch (e) {
        // Fallback: einfacher HTTP check
        try {
          const startTime = Date.now();
          await axios.get(`http://${camera.ip}/`, { timeout: 3000 });
          diagnostics.ping = {
            reachable: true,
            latency_ms: Date.now() - startTime
          };
        } catch (e2) {
          diagnostics.ping = { reachable: false, latency_ms: null };
        }
      }
    }

    res.json({ success: true, data: diagnostics });
  } catch (error) {
    console.error('Error getting camera diagnostics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
