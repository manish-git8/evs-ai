// Currency formatting
export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Number formatting
export const formatNumber = (num) => {
  if (num === null || num === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US').format(num);
};

// Percentage formatting
export const formatPercentage = (num, decimals = 1) => {
  if (num === null || num === undefined) return 'N/A';
  return `${num.toFixed(decimals)}%`;
};

// Compact number formatting (e.g., 1.5M, 2.3K)
export const formatCompactNumber = (num) => {
  if (num === null || num === undefined) return 'N/A';
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toFixed(0);
};

// Trend indicator component helpers
export const getTrendColor = (trend) => {
  switch (trend) {
    case 'UP':
      return 'danger';
    case 'DOWN':
      return 'success';
    case 'STABLE':
      return 'secondary';
    default:
      return 'secondary';
  }
};

export const getTrendIcon = (trend) => {
  switch (trend) {
    case 'UP':
      return '↑';
    case 'DOWN':
      return '↓';
    case 'STABLE':
      return '→';
    default:
      return '→';
  }
};

// Severity color mapping
export const getSeverityColor = (severity) => {
  switch (severity) {
    case 'CRITICAL':
      return { color: '#DC2626', bg: '#FEE2E2' };
    case 'HIGH':
      return { color: '#EA580C', bg: '#FFEDD5' };
    case 'MEDIUM':
      return { color: '#F59E0B', bg: '#FEF3C7' };
    case 'LOW':
      return { color: '#10B981', bg: '#D1FAE5' };
    default:
      return { color: '#6B7280', bg: '#F3F4F6' };
  }
};

// Risk level color mapping
export const getRiskLevelColor = (riskLevel) => {
  switch (riskLevel) {
    case 'HIGH':
      return 'danger';
    case 'MEDIUM':
      return 'warning';
    case 'LOW':
      return 'success';
    default:
      return 'secondary';
  }
};

// Budget health color mapping
export const getBudgetHealthColor = (type) => {
  switch (type) {
    case 'healthy':
      return '#10B981'; // Green
    case 'warning':
      return '#F59E0B'; // Yellow
    case 'critical':
      return '#EA580C'; // Orange
    case 'exceeded':
      return '#DC2626'; // Red
    default:
      return '#6B7280'; // Gray
  }
};

// Date formatting
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Days calculation
export const calculateDaysAgo = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};
