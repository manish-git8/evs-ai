import React from 'react';
import { Alert, Button } from 'reactstrap';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';

// Feature display names
const FEATURE_NAMES = {
  USERS: 'Users',
  AI_CYCLES: 'AI Cycles',
  RFQ_COUNT: 'RFQs',
  OCR_DOCUMENTS: 'OCR Documents',
  ERP_INTEGRATIONS: 'ERP Integrations',
};

/**
 * FeatureLimitBanner displays a warning or error when a feature is near or at its limit.
 *
 * @param {string} featureCode - The feature code to check
 * @param {number} warningThreshold - Percentage at which to show warning (default: 80)
 * @param {boolean} showUpgrade - Show upgrade button
 * @param {function} onUpgrade - Callback when upgrade is clicked
 */
function FeatureLimitBanner({ featureCode, warningThreshold = 80, showUpgrade = true, onUpgrade }) {
  const { getFeature, getUsage, isBlocked } = useFeatureFlags();

  const feature = getFeature(featureCode);
  const usage = getUsage(featureCode);
  const blocked = isBlocked(featureCode);
  const featureName = FEATURE_NAMES[featureCode] || featureCode;

  // Don't show if feature doesn't exist or is unlimited
  if (!feature || feature.limit === -1) {
    return null;
  }

  // Don't show if below warning threshold and not blocked
  if (usage.percentage < warningThreshold && !blocked) {
    return null;
  }

  // Determine color and message
  let color = 'warning';
  let title = `${featureName} Approaching Limit`;
  let message = `You've used ${usage.percentage}% of your ${featureName.toLowerCase()} quota. ${usage.remaining} remaining.`;
  let icon = 'bi-exclamation-triangle-fill';

  if (blocked) {
    color = 'danger';
    title = `${featureName} Limit Reached`;
    message = feature.blockReason || `You've reached your ${featureName.toLowerCase()} limit. Upgrade your plan to continue.`;
    icon = 'bi-x-octagon-fill';
  } else if (usage.percentage >= 90) {
    color = 'danger';
    title = `${featureName} Almost Exhausted`;
    message = `Only ${usage.remaining} ${featureName.toLowerCase()} remaining. Consider upgrading your plan.`;
    icon = 'bi-exclamation-octagon-fill';
  }

  return (
    <Alert color={color} className="mb-3 d-flex align-items-center justify-content-between">
      <div className="d-flex align-items-start">
        <i className={`bi ${icon} me-2 mt-1`} style={{ fontSize: '1.2rem' }} />
        <div>
          <strong>{title}</strong>
          <p className="mb-0 mt-1">{message}</p>
        </div>
      </div>
      {showUpgrade && onUpgrade && (
        <Button
          color={color === 'danger' ? 'danger' : 'warning'}
          outline
          size="sm"
          onClick={onUpgrade}
          className="ms-3 flex-shrink-0"
        >
          <i className="bi bi-arrow-up-circle me-1" />
          Upgrade Plan
        </Button>
      )}
    </Alert>
  );
}

/**
 * MultiFeatureLimitBanner checks multiple features and shows the most critical banner.
 *
 * @param {string[]} featureCodes - Array of feature codes to check
 * @param {number} warningThreshold - Percentage at which to show warning (default: 80)
 * @param {boolean} showUpgrade - Show upgrade button
 * @param {function} onUpgrade - Callback when upgrade is clicked
 */
export function MultiFeatureLimitBanner({
  featureCodes = ['USERS', 'AI_CYCLES', 'RFQ_COUNT'],
  warningThreshold = 80,
  showUpgrade = true,
  onUpgrade,
}) {
  const { getFeature, getUsage, isBlocked } = useFeatureFlags();

  // Find the most critical feature to show
  let criticalFeature = null;
  let maxPriority = 0;

  for (const featureCode of featureCodes) {
    const feature = getFeature(featureCode);
    const usage = getUsage(featureCode);
    const blocked = isBlocked(featureCode);

    if (!feature || feature.limit === -1) continue;

    let priority = 0;
    if (blocked) {
      priority = 100 + usage.percentage;
    } else if (usage.percentage >= 90) {
      priority = 50 + usage.percentage;
    } else if (usage.percentage >= warningThreshold) {
      priority = usage.percentage;
    }

    if (priority > maxPriority) {
      maxPriority = priority;
      criticalFeature = featureCode;
    }
  }

  if (!criticalFeature) {
    return null;
  }

  return (
    <FeatureLimitBanner
      featureCode={criticalFeature}
      warningThreshold={warningThreshold}
      showUpgrade={showUpgrade}
      onUpgrade={onUpgrade}
    />
  );
}

export default FeatureLimitBanner;
