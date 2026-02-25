export const VoucherStatus = {
  CREATED: 'created',
  CLOSED: 'closed',
  ON_HOLD: 'on_hold',
  APPROVED: 'approved',
  UNPAID: 'unpaid',
  PAID: 'paid',
  SUBMITTED: 'submitted',
  CONFIRMED: 'confirmed',
  PARTIALLY_CONFIRMED: 'partially_confirmed',
  DRAFT: 'draft',
  REJECTED: 'rejected'
};

export const GrnStatus = {
  CREATED: 'created',
  PROCESSED: 'processed',
  IN_PROGRESS: 'in_progress',
  DELETED: 'deleted'
};

export const StatusLabels = {
  [VoucherStatus.CREATED]: 'Created',
  [VoucherStatus.CLOSED]: 'Closed',
  [VoucherStatus.ON_HOLD]: 'On Hold',
  [VoucherStatus.APPROVED]: 'Approved',
  [VoucherStatus.UNPAID]: 'Unpaid',
  [VoucherStatus.PAID]: 'Paid',
  [VoucherStatus.SUBMITTED]: 'Submitted',
  [VoucherStatus.CONFIRMED]: 'Confirmed',
  [VoucherStatus.PARTIALLY_CONFIRMED]: 'Partially Confirmed',
  [VoucherStatus.DRAFT]: 'Draft',
  [VoucherStatus.REJECTED]: 'Rejected',
  // GRN Status Labels
  [GrnStatus.CREATED]: 'Created',
  [GrnStatus.PROCESSED]: 'Processed',
  [GrnStatus.IN_PROGRESS]: 'In Progress',
  [GrnStatus.DELETED]: 'Deleted'
};

export default {
  VoucherStatus,
  GrnStatus,
  StatusLabels
};

export const getBadgeColor = (status) => {
  switch ((status || '').toLowerCase()) {
    // Voucher statuses
    case 'created':
    case 'draft':
    case 'closed':
    case 'submitted':
      return 'primary';
    case 'approved':
    case 'confirmed':
    case 'paid':
    case 'processed':
      return 'success';
    case 'rejected':
    case 'unpaid':
    case 'deleted':
      return 'danger';
    case 'on_hold':
    case 'partially_confirmed':
    case 'in_progress':
      return 'warning';
    default:
      return 'primary';
  }
};

export const getStatusLabel = (status) => {
  return StatusLabels[status] || status || 'Unknown';
};