const fs = require('fs').promises;
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
const TimelapseCapture = require('../models/TimelapseCapture');
const TimelapseVideo = require('../models/TimelapseVideo');

// Set ffmpeg path from @ffmpeg-installer/ffmpeg
try {
  const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  ffmpeg.setFfmpegPath(ffmpegPath);
  console.log('✅ FFmpeg configured:', ffmpegPath);
} catch (error) {
  console.warn('⚠️ FFmpeg installer not found, using system FFmpeg');
}

/**
 * Timelapse Service
 * Verwaltet Snapshot-Erfassung und Video-Generierung
 */
class TimelapseService {
  constructor() {
    // Basis-Verzeichnisse
    this.baseDir = path.join(__dirname, '../../timelapse');
    this.capturesDir = path.join(this.baseDir, 'captures');
    this.thumbnailsDir = path.join(this.baseDir, 'thumbnails');
    this.videosDir = path.join(this.baseDir, 'videos');
    this.tempDir = path.join(this.baseDir, 'temp');

    this.initialized = false;
  }

  /**
   * Initialisierung: Erstelle Verzeichnis-Struktur
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      await fs.mkdir(this.capturesDir, { recursive: true });
      await fs.mkdir(this.thumbnailsDir, { recursive: true });
      await fs.mkdir(this.videosDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });

      this.initialized = true;
      console.log('📸 Timelapse Service initialized');
    } catch (error) {
      console.error('❌ Error initializing Timelapse Service:', error);
      throw error;
    }
  }

  /**
   * Erfasse Snapshot von Kamera
   * @param {Object} options - Capture options
   * @returns {Promise<Object>} Capture metadata
   */
  async captureSnapshot(options = {}) {
    await this.initialize();

    const {
      source = 'webcam',
      resolution = { width: 1920, height: 1080 },
      format = 'jpg',
      quality = 90,
      plant = null,
      phase = null,
      tags = [],
      environmentData = null
    } = options;

    try {
      // Generiere Dateinamen mit Timestamp
      const timestamp = new Date();
      const filename = `capture_${timestamp.getTime()}.${format}`;
      const filePath = path.join(this.capturesDir, filename);

      // HINWEIS: In echter Implementierung würde hier die Kamera angesteuert
      // Für Development: Erstelle Placeholder-Bild
      await this.createPlaceholderImage(filePath, resolution);

      // Erstelle Thumbnail
      const thumbnailPath = await this.createThumbnail(filePath, filename);

      // Hole Dateigröße
      const stats = await fs.stat(filePath);

      // Hole aktuelle Sensor-Daten falls nicht übergeben
      const envSnapshot = environmentData || await this.getCurrentEnvironmentData();

      // Speichere in Datenbank
      const capture = new TimelapseCapture({
        filename,
        filePath,
        thumbnailPath,
        timestamp,
        captureSource: source,
        resolution,
        fileSize: stats.size,
        format,
        plant,
        phase,
        tags,
        environmentSnapshot: envSnapshot,
        quality: {
          score: 95, // In echter Implementierung: Bildqualitäts-Analyse
          issues: []
        }
      });

      await capture.save();

      console.log(`📸 Snapshot captured: ${filename}`);

      return {
        success: true,
        capture: capture.toJSON()
      };
    } catch (error) {
      console.error('❌ Error capturing snapshot:', error);
      throw error;
    }
  }

  /**
   * Erstelle Placeholder-Bild (für Development ohne Kamera)
   */
  async createPlaceholderImage(filePath, resolution) {
    const { width, height } = resolution;

    // Erstelle SVG mit Zeitstempel
    const timestamp = new Date().toLocaleString('de-DE');
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1a1a2e"/>
        <text x="50%" y="50%" font-family="Arial" font-size="48" fill="#10b981" text-anchor="middle">
          GrowMonitor Timelapse
        </text>
        <text x="50%" y="55%" font-family="Arial" font-size="24" fill="#64748b" text-anchor="middle">
          ${timestamp}
        </text>
        <circle cx="50%" cy="30%" r="80" fill="#10b981" opacity="0.3"/>
      </svg>
    `;

    await sharp(Buffer.from(svg))
      .jpeg({ quality: 90 })
      .toFile(filePath);
  }

  /**
   * Erstelle Thumbnail für Capture
   */
  async createThumbnail(imagePath, filename) {
    const thumbnailFilename = `thumb_${filename}`;
    const thumbnailPath = path.join(this.thumbnailsDir, thumbnailFilename);

    await sharp(imagePath)
      .resize(320, 180, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    return thumbnailPath;
  }

  /**
   * Hole aktuelle Umgebungsdaten
   */
  async getCurrentEnvironmentData() {
    try {
      // HINWEIS: In echter Implementierung würde hier der Socket/MQTT-Service abgefragt
      // Für jetzt: Return mock data
      return {
        temperature: 24.5,
        humidity: 65,
        vpd: 1.05,
        lightIntensity: 450,
        ec: 1.8,
        ph: 6.0
      };
    } catch (error) {
      console.error('❌ Error getting environment data:', error);
      return {};
    }
  }

  /**
   * Generiere Timelapse-Video aus Captures
   * @param {Object} options - Video generation options
   * @returns {Promise<Object>} Video metadata
   */
  async generateTimelapse(options = {}) {
    await this.initialize();

    const {
      title,
      description,
      startDate,
      endDate,
      fps = 30,
      resolution = { width: 1920, height: 1080 },
      format = 'mp4',
      codec = 'h264',
      plant = null,
      tags = [],
      effects = {}
    } = options;

    try {
      // Hole Captures für Zeitraum
      const captures = await TimelapseCapture.getByDateRange(startDate, endDate, { plant });

      if (captures.length === 0) {
        throw new Error('Keine Captures für den gewählten Zeitraum gefunden');
      }

      console.log(`🎬 Generating timelapse from ${captures.length} captures...`);

      // Erstelle Video-Dokument
      const filename = `timelapse_${Date.now()}.${format}`;
      const filePath = path.join(this.videosDir, filename);

      const video = new TimelapseVideo({
        filename,
        filePath,
        title: title || `Timelapse ${new Date(startDate).toLocaleDateString('de-DE')}`,
        description,
        dateRange: { start: startDate, end: endDate },
        fps,
        resolution,
        format,
        codec,
        frameCount: captures.length,
        fileSize: 0, // Wird nach Generierung aktualisiert
        duration: captures.length / fps,
        captures: captures.map(c => c._id),
        plant,
        tags,
        effects,
        status: 'processing',
        processingProgress: 0
      });

      await video.save();

      // Starte asynchrone Video-Generierung
      this.processVideoGeneration(video, captures).catch(error => {
        console.error('❌ Video generation failed:', error);
        video.fail(error.message);
      });

      return {
        success: true,
        video: video.toJSON(),
        message: 'Video-Generierung gestartet'
      };
    } catch (error) {
      console.error('❌ Error generating timelapse:', error);
      throw error;
    }
  }

  /**
   * Verarbeite Video-Generierung (asynchron)
   */
  async processVideoGeneration(video, captures) {
    try {
      await video.updateProgress(10, 'Bereite Frames vor...');

      // Erstelle temporäre Frame-Liste
      const frameListPath = path.join(this.tempDir, `frames_${video._id}.txt`);
      const frameList = captures.map((c, idx) => {
        return `file '${c.filePath}'\nduration ${1 / video.fps}`;
      }).join('\n');

      await fs.writeFile(frameListPath, frameList);

      await video.updateProgress(30, 'Starte FFmpeg-Encoding...');

      // FFmpeg Video-Generierung
      await new Promise((resolve, reject) => {
        let command = ffmpeg();

        // Input: Concat demuxer für variable Framerate
        command.input(frameListPath)
          .inputOptions(['-f concat', '-safe 0']);

        // Output: Video-Einstellungen
        command
          .outputOptions([
            `-c:v ${this.getCodec(video.codec)}`,
            `-pix_fmt yuv420p`,
            `-r ${video.fps}`,
            `-s ${video.resolution.width}x${video.resolution.height}`,
            `-preset medium`,
            `-crf 23`
          ])
          .output(video.filePath);

        // Progress Tracking
        command.on('progress', async (progress) => {
          const percent = Math.min(90, 30 + Math.round(progress.percent || 0) * 0.6);
          await video.updateProgress(percent, `Encoding... ${Math.round(progress.percent || 0)}%`);
        });

        command.on('end', resolve);
        command.on('error', reject);

        command.run();
      });

      await video.updateProgress(95, 'Finalisiere Video...');

      // Hole finale Dateigröße
      const stats = await fs.stat(video.filePath);

      // Markiere Captures als verwendet
      for (const capture of captures) {
        const captureDoc = await TimelapseCapture.findById(capture._id);
        if (captureDoc) {
          await captureDoc.markUsed(video._id);
        }
      }

      // Cleanup
      await fs.unlink(frameListPath);

      // Video als completed markieren
      await video.complete(stats.size, video.duration);

      console.log(`✅ Timelapse video generated: ${video.filename}`);
    } catch (error) {
      console.error('❌ Video processing error:', error);
      await video.fail(error.message);
      throw error;
    }
  }

  /**
   * Hole FFmpeg Codec String
   */
  getCodec(codec) {
    const codecs = {
      h264: 'libx264',
      h265: 'libx265',
      vp9: 'libvpx-vp9'
    };
    return codecs[codec] || 'libx264';
  }

  /**
   * Lösche alte Captures
   * @param {Number} daysToKeep - Anzahl Tage zum Behalten
   * @returns {Promise<Object>} Deletion statistics
   */
  async cleanupOldCaptures(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Finde alte Captures die nicht in Videos verwendet wurden
      const oldCaptures = await TimelapseCapture.find({
        timestamp: { $lt: cutoffDate },
        usedInTimelapse: false,
        isDeleted: false
      });

      let deletedCount = 0;
      let freedSpace = 0;

      for (const capture of oldCaptures) {
        try {
          // Lösche Dateien
          await fs.unlink(capture.filePath).catch(() => {});
          if (capture.thumbnailPath) {
            await fs.unlink(capture.thumbnailPath).catch(() => {});
          }

          // Soft delete in DB
          await capture.softDelete();

          deletedCount++;
          freedSpace += capture.fileSize;
        } catch (err) {
          console.error(`❌ Error deleting capture ${capture.filename}:`, err);
        }
      }

      console.log(`🗑️ Cleaned up ${deletedCount} old captures, freed ${(freedSpace / (1024 * 1024)).toFixed(2)} MB`);

      return {
        success: true,
        deletedCount,
        freedSpaceMB: (freedSpace / (1024 * 1024)).toFixed(2)
      };
    } catch (error) {
      console.error('❌ Error cleaning up captures:', error);
      throw error;
    }
  }

  /**
   * Hole Speicher-Statistiken
   */
  async getStorageStats() {
    try {
      const captureStats = await TimelapseCapture.getStatistics();
      const videoStats = await TimelapseVideo.getStatistics();

      return {
        captures: captureStats,
        videos: videoStats,
        totalStorageGB: captureStats.totalSizeGB + videoStats.totalSizeGB
      };
    } catch (error) {
      console.error('❌ Error getting storage stats:', error);
      throw error;
    }
  }
}

// Singleton Instance
const timelapseService = new TimelapseService();

module.exports = timelapseService;
