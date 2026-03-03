import apiClient from '../api/apiClient';

const FEATURES_PATH = 'ep/v1/features';

const FeatureFlagService = {
  /**
   * Get all feature flags for the current company.
   * Returns a map of feature codes to their status and limits.
   */
  getAllFeatureFlags() {
    return apiClient.get(FEATURES_PATH);
  },

  /**
   * Check if a specific feature is enabled.
   * @param {string} featureCode - The feature code to check (e.g., 'AI_CYCLES', 'USERS')
   */
  isFeatureEnabled(featureCode) {
    return apiClient.get(`${FEATURES_PATH}/${featureCode}/enabled`);
  },

  /**
   * Get feature flag details for a specific feature.
   * @param {string} featureCode - The feature code
   */
  getFeatureFlag(featureCode) {
    return apiClient.get(`${FEATURES_PATH}/${featureCode}`);
  },
};

export default FeatureFlagService;
