const cron = require('node-cron');
const timelapseService = require('./timelapseService');

/**
 * Timelapse Cron Service
 * Automatische Erfassung von Snapshots nach Zeitplan
 */
class TimelapseCronService {
  constructor() {
    this.jobs = new Map();
    this.config = {
      enabled: false,
      interval: '*/10 * * * *', // Default: Alle 10 Minuten
      resolution: { width: 1920, height: 1080 },
      format: 'jpg',
      quality: 90,
      autoCleanup: true,
      cleanupDays: 30
    };
  }

  /**
   * Initialisierung
   */
  async initialize() {
    console.log('📸 Timelapse Cron Service initializing...');

    // Load config from environment or database
    this.loadConfig();

    // Start default capture job if enabled
    if (this.config.enabled) {
      this.startCaptureJob();
    }

    // Start cleanup job (täglich um 03:00 Uhr)
    if (this.config.autoCleanup) {
      this.startCleanupJob();
    }

    console.log('✅ Timelapse Cron Service initialized');
  }

  /**
   * Load Configuration
   */
  loadConfig() {
    // Load from environment variables
    if (process.env.TIMELAPSE_ENABLED === 'true') {
      this.config.enabled = true;
    }

    if (process.env.TIMELAPSE_INTERVAL) {
      this.config.interval = process.env.TIMELAPSE_INTERVAL;
    }

    if (process.env.TIMELAPSE_RESOLUTION) {
      try {
        const [width, height] = process.env.TIMELAPSE_RESOLUTION.split('x');
        this.config.resolution = {
          width: parseInt(width),
          height: parseInt(height)
        };
      } catch (error) {
        console.error('❌ Invalid TIMELAPSE_RESOLUTION format, using default');
      }
    }

    if (process.env.TIMELAPSE_AUTO_CLEANUP === 'true') {
      this.config.autoCleanup = true;
    }

    if (process.env.TIMELAPSE_CLEANUP_DAYS) {
      this.config.cleanupDays = parseInt(process.env.TIMELAPSE_CLEANUP_DAYS);
    }
  }

  /**
   * Start Capture Job
   */
  startCaptureJob(customInterval = null) {
    const interval = customInterval || this.config.interval;

    // Stop existing job if running
    if (this.jobs.has('capture')) {
      this.stopJob('capture');
    }

    // Validate cron pattern
    if (!cron.validate(interval)) {
      console.error(`❌ Invalid cron pattern: ${interval}`);
      return false;
    }

    // Create and start job
    const job = cron.schedule(interval, async () => {
      try {
        console.log('📸 Auto-capturing timelapse snapshot...');

        const result = await timelapseService.captureSnapshot({
          source: 'automated',
          resolution: this.config.resolution,
          format: this.config.format,
          quality: this.config.quality,
          tags: ['automated']
        });

        if (result.success) {
          console.log(`✅ Auto-capture successful: ${result.capture.filename}`);
        }
      } catch (error) {
        console.error('❌ Auto-capture failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: 'Europe/Berlin'
    });

    this.jobs.set('capture', job);
    console.log(`✅ Capture job started with interval: ${interval}`);
    return true;
  }

  /**
   * Start Cleanup Job
   */
  startCleanupJob() {
    // Stop existing job if running
    if (this.jobs.has('cleanup')) {
      this.stopJob('cleanup');
    }

    // Run cleanup daily at 3:00 AM
    const job = cron.schedule('0 3 * * *', async () => {
      try {
        console.log('🗑️ Running timelapse cleanup...');

        const result = await timelapseService.cleanupOldCaptures(this.config.cleanupDays);

        if (result.success) {
          console.log(`✅ Cleanup completed: ${result.deletedCount} captures deleted, ${result.freedSpaceMB} MB freed`);
        }
      } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: 'Europe/Berlin'
    });

    this.jobs.set('cleanup', job);
    console.log('✅ Cleanup job started (daily at 03:00)');
  }

  /**
   * Stop Job
   */
  stopJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      this.jobs.delete(jobName);
      console.log(`⏹️ ${jobName} job stopped`);
      return true;
    }
    return false;
  }

  /**
   * Enable Auto-Capture
   */
  enable(interval = null) {
    this.config.enabled = true;
    return this.startCaptureJob(interval);
  }

  /**
   * Disable Auto-Capture
   */
  disable() {
    this.config.enabled = false;
    return this.stopJob('capture');
  }

  /**
   * Get Status
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      interval: this.config.interval,
      resolution: this.config.resolution,
      jobs: {
        capture: this.jobs.has('capture'),
        cleanup: this.jobs.has('cleanup')
      },
      autoCleanup: this.config.autoCleanup,
      cleanupDays: this.config.cleanupDays
    };
  }

  /**
   * Update Config
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };

    // Restart capture job if enabled
    if (this.config.enabled && this.jobs.has('capture')) {
      this.startCaptureJob();
    }

    return this.config;
  }

  /**
   * Trigger Manual Capture Now
   */
  async captureNow() {
    try {
      console.log('📸 Manual trigger: Capturing snapshot...');

      const result = await timelapseService.captureSnapshot({
        source: 'manual',
        resolution: this.config.resolution,
        format: this.config.format,
        quality: this.config.quality,
        tags: ['manual']
      });

      return result;
    } catch (error) {
      console.error('❌ Manual capture failed:', error);
      throw error;
    }
  }

  /**
   * Get Next Scheduled Capture Time
   */
  getNextCaptureTime() {
    const job = this.jobs.get('capture');
    if (!job) return null;

    // Calculate next execution based on cron pattern
    // Note: node-cron doesn't expose next execution time directly
    // This is a simplified approximation
    return 'Scheduled according to interval: ' + this.config.interval;
  }
}

// Singleton Instance
const timelapseCronService = new TimelapseCronService();

module.exports = timelapseCronService;
