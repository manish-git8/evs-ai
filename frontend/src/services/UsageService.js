import apiClient from '../api/apiClient';

const USAGE_PATH = 'ep/v1/usage';

const UsageService = {
  /**
   * Get current usage for all tracked features.
   * Returns usage info including current usage, limits, and remaining quota.
   */
  getAllUsage() {
    return apiClient.get(USAGE_PATH);
  },

  /**
   * Get usage for a specific feature.
   * @param {string} featureCode - The feature code (e.g., 'AI_CYCLES', 'USERS', 'RFQ_COUNT')
   */
  getFeatureUsage(featureCode) {
    return apiClient.get(`${USAGE_PATH}/${featureCode}`);
  },

  /**
   * Record usage for a feature (internal API).
   * @param {string} featureCode - The feature code
   * @param {number} quantity - The quantity to record (default: 1)
   * @param {string} metadata - Optional metadata about the usage
   */
  recordUsage(featureCode, quantity = 1, metadata = null) {
    return apiClient.post(`${USAGE_PATH}/${featureCode}`, { quantity, metadata });
  },

  /**
   * Get usage history/summaries.
   */
  getUsageHistory() {
    return apiClient.get(`${USAGE_PATH}/history`);
  },

  /**
   * Get unacknowledged usage alerts.
   */
  getAlerts() {
    return apiClient.get(`${USAGE_PATH}/alerts`);
  },

  /**
   * Get count of unacknowledged alerts.
   */
  getAlertCount() {
    return apiClient.get(`${USAGE_PATH}/alerts/count`);
  },
};

export default UsageService;
