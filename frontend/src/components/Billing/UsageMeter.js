import React from 'react';
import { Progress, Badge, UncontrolledTooltip } from 'reactstrap';

// Feature display names
const FEATURE_NAMES = {
  USERS: 'Users',
  AI_CYCLES: 'AI Cycles',
  RFQ_COUNT: 'RFQs',
  OCR_DOCUMENTS: 'OCR Documents',
  ERP_INTEGRATIONS: 'ERP Integrations',
};

/**
 * UsageMeter component displays usage for a feature with a progress bar.
 *
 * @param {string} featureCode - The feature code (e.g., 'AI_CYCLES')
 * @param {number} currentUsage - Current usage count
 * @param {number} limit - The usage limit
 * @param {string} limitType - Type of limit: 'QUOTA', 'UNLIMITED', 'DISABLED'
 * @param {boolean} compact - If true, show compact version
 * @param {boolean} showLabel - If true, show feature label
 */
function UsageMeter({
  featureCode,
  currentUsage = 0,
  limit = 0,
  limitType = 'QUOTA',
  compact = false,
  showLabel = true,
}) {
  const featureName = FEATURE_NAMES[featureCode] || featureCode;
  const tooltipId = `usage-tooltip-${featureCode}`;

  // Handle unlimited
  if (limitType === 'UNLIMITED') {
    return (
      <div className={compact ? 'mb-2' : 'mb-3'}>
        {showLabel && (
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className={compact ? 'small fw-medium' : 'fw-medium'}>{featureName}</span>
            <Badge color="success" pill className="text-uppercase" style={{ fontSize: '0.7rem' }}>
              Unlimited
            </Badge>
          </div>
        )}
        {!compact && (
          <small className="text-muted">{currentUsage.toLocaleString()} used (no limit)</small>
        )}
      </div>
    );
  }

  // Handle disabled
  if (limitType === 'DISABLED') {
    return (
      <div className={compact ? 'mb-2' : 'mb-3'}>
        {showLabel && (
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className={`${compact ? 'small' : ''} fw-medium text-muted`}>{featureName}</span>
            <Badge color="secondary" pill style={{ fontSize: '0.7rem' }}>
              Not Available
            </Badge>
          </div>
        )}
      </div>
    );
  }

  // Calculate percentage
  const percentage = limit > 0 ? Math.min(Math.round((currentUsage / limit) * 100), 100) : 0;
  const remaining = Math.max(limit - currentUsage, 0);
  const isNearLimit = percentage >= 75;
  const isAtLimit = percentage >= 100;

  // Determine progress bar color
  const getProgressColor = () => {
    if (isAtLimit) return 'danger';
    if (isNearLimit) return 'warning';
    return 'success';
  };

  // Determine text color class
  const getTextColorClass = () => {
    if (isAtLimit) return 'text-danger';
    if (isNearLimit) return 'text-warning';
    return 'text-muted';
  };

  return (
    <div className={compact ? 'mb-2' : 'mb-3'}>
      {showLabel && (
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span className={compact ? 'small fw-medium' : 'fw-medium'}>{featureName}</span>
          <span className={`${compact ? 'small' : ''} ${getTextColorClass()}`}>
            {currentUsage.toLocaleString()} / {limit.toLocaleString()}
          </span>
        </div>
      )}

      <div id={tooltipId}>
        <Progress
          value={percentage}
          color={getProgressColor()}
          style={{ height: compact ? '6px' : '10px' }}
        />
      </div>
      <UncontrolledTooltip placement="top" target={tooltipId}>
        {remaining.toLocaleString()} remaining ({percentage}% used)
      </UncontrolledTooltip>

      {!compact && (
        <div className="d-flex justify-content-between mt-1">
          <small className="text-muted">{remaining.toLocaleString()} remaining</small>
          <small className={`${isNearLimit ? 'fw-bold' : ''} ${getTextColorClass()}`}>
            {percentage}% used
          </small>
        </div>
      )}
    </div>
  );
}

export default UsageMeter;
