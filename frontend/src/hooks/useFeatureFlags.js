import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import FeatureFlagService from '../services/FeatureFlagService';

// Context for feature flags
const FeatureFlagContext = createContext(null);

/**
 * Feature Flag Provider component.
 * Wraps the app to provide feature flag context.
 */
export function FeatureFlagProvider({ children }) {
  const [featureFlags, setFeatureFlags] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFeatureFlags = useCallback(async () => {
    try {
      setLoading(true);
      const response = await FeatureFlagService.getAllFeatureFlags();
      setFeatureFlags(response.data || {});
      setError(null);
    } catch (err) {
      console.error('Failed to fetch feature flags:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch if user is logged in
    const user = JSON.parse(localStorage.getItem('user'));
    if (user?.jwtToken) {
      fetchFeatureFlags();
    } else {
      setLoading(false);
    }
  }, [fetchFeatureFlags]);

  /**
   * Check if a feature is enabled.
   * @param {string} featureCode - The feature code to check
   * @returns {boolean} - Whether the feature is enabled
   */
  const isEnabled = useCallback(
    (featureCode) => {
      const flag = featureFlags[featureCode];
      return flag?.enabled && !flag?.blocked;
    },
    [featureFlags],
  );

  /**
   * Check if a feature is blocked (limit reached).
   * @param {string} featureCode - The feature code to check
   * @returns {boolean} - Whether the feature is blocked
   */
  const isBlocked = useCallback(
    (featureCode) => {
      const flag = featureFlags[featureCode];
      return flag?.blocked === true;
    },
    [featureFlags],
  );

  /**
   * Get feature flag details.
   * @param {string} featureCode - The feature code
   * @returns {object|null} - The feature flag details or null
   */
  const getFeature = useCallback(
    (featureCode) => {
      return featureFlags[featureCode] || null;
    },
    [featureFlags],
  );

  /**
   * Get usage information for a feature.
   * @param {string} featureCode - The feature code
   * @returns {object} - Usage info { currentUsage, limit, remaining }
   */
  const getUsage = useCallback(
    (featureCode) => {
      const flag = featureFlags[featureCode];
      if (!flag) {
        return { currentUsage: 0, limit: 0, remaining: 0, percentage: 0 };
      }
      const percentage = flag.limit > 0 ? Math.round((flag.currentUsage / flag.limit) * 100) : 0;
      return {
        currentUsage: flag.currentUsage || 0,
        limit: flag.limit || 0,
        remaining: flag.remaining || 0,
        percentage: Math.min(percentage, 100),
      };
    },
    [featureFlags],
  );

  const value = {
    featureFlags,
    loading,
    error,
    isEnabled,
    isBlocked,
    getFeature,
    getUsage,
    refresh: fetchFeatureFlags,
  };

  return <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>;
}

/**
 * Hook to access feature flags.
 * @returns {object} - Feature flag context value
 */
export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
}

/**
 * Hook to check if a specific feature is enabled.
 * @param {string} featureCode - The feature code to check
 * @returns {boolean} - Whether the feature is enabled
 */
export function useFeatureEnabled(featureCode) {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(featureCode);
}

export default FeatureFlagContext;
