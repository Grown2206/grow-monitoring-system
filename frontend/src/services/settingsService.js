import { api } from '../utils/api';

/**
 * Settings Service
 * Centralized API client for all settings-related operations
 */
const settingsService = {
  // ==========================================
  // AUTOMATION SETTINGS
  // ==========================================

  /**
   * Get automation configuration
   */
  async getAutomationConfig() {
    const response = await api.get('/settings/automation');
    return response.data.data || response.data;
  },

  /**
   * Update automation configuration
   */
  async updateAutomationConfig(config) {
    const response = await api.post('/settings/automation', config);
    return response.data.data || response.data;
  },

  // ==========================================
  // WEBHOOK SETTINGS
  // ==========================================

  /**
   * Get webhook configuration
   */
  async getWebhook() {
    const response = await api.get('/settings/webhook');
    return response.data.url || response.data;
  },

  /**
   * Update webhook URL
   */
  async updateWebhook(url) {
    const response = await api.post('/settings/webhook', { url });
    return response.data;
  },

  // ==========================================
  // SYSTEM OPERATIONS
  // ==========================================

  /**
   * Reboot system
   */
  async reboot() {
    const response = await api.post('/system/reboot');
    return response.data;
  },

  /**
   * Reset system
   */
  async reset() {
    const response = await api.post('/system/reset');
    return response.data;
  },

  /**
   * Get device states
   */
  async getDeviceStates() {
    const response = await api.get('/settings/device-states');
    return response.data.data || response.data;
  },

  // ==========================================
  // TIMELAPSE SETTINGS
  // ==========================================

  /**
   * Get timelapse statistics
   */
  async getTimelapseStats() {
    const response = await api.get('/timelapse/statistics');
    return response.data;
  },

  /**
   * Capture photo for timelapse
   */
  async capturePhoto(settings) {
    const response = await api.post('/timelapse/capture', settings);
    return response.data;
  },

  /**
   * Generate timelapse video
   */
  async generateVideo(settings) {
    const response = await api.post('/timelapse/generate', settings);
    return response.data;
  },

  /**
   * Clean up old timelapse captures
   */
  async cleanupCaptures(days) {
    const response = await api.post('/timelapse/cleanup', { days });
    return response.data;
  },

  // ==========================================
  // NOTIFICATION SETTINGS
  // ==========================================

  /**
   * Get notification statistics
   */
  async getNotificationStats() {
    const response = await api.get('/notifications/stats');
    return response.data;
  },

  /**
   * Subscribe to push notifications
   */
  async subscribePush(subscription) {
    const response = await api.post('/notifications/subscribe', subscription);
    return response.data;
  },

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribePush() {
    const response = await api.post('/notifications/unsubscribe');
    return response.data;
  },

  /**
   * Send test notification
   */
  async sendTestNotification() {
    const response = await api.post('/notifications/test');
    return response.data;
  }
};

// Export both named and default
export { settingsService };
export default settingsService;
