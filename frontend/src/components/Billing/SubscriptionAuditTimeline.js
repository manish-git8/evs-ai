import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, Badge, Spinner, Alert, Collapse } from 'reactstrap';
import { toast } from 'react-toastify';
import {
  FaPlus,
  FaPlay,
  FaPause,
  FaStop,
  FaArrowUp,
  FaArrowDown,
  FaExchangeAlt,
  FaSyncAlt,
  FaClock,
  FaExclamationTriangle,
  FaBell,
  FaFileInvoiceDollar,
  FaCreditCard,
  FaTimesCircle,
  FaCog,
  FaChevronDown,
  FaChevronUp,
  FaUser,
  FaUserShield,
} from 'react-icons/fa';
import BillingService from '../../services/BillingService';
import '../HistoryTimeline/HistoryTimeline.scss';

// Event type configuration with icons, colors, and labels
const EVENT_CONFIG = {
  CREATED: { icon: FaPlus, color: '#28a745', bgColor: '#d4edda', label: 'Subscription Created', cardClass: 'event-create' },
  ACTIVATED: { icon: FaPlay, color: '#28a745', bgColor: '#d4edda', label: 'Activated', cardClass: 'event-create' },
  SUSPENDED: { icon: FaPause, color: '#dc3545', bgColor: '#f8d7da', label: 'Suspended', cardClass: 'event-delete' },
  RESUMED: { icon: FaPlay, color: '#28a745', bgColor: '#d4edda', label: 'Resumed', cardClass: 'event-create' },
  TERMINATED: { icon: FaStop, color: '#dc3545', bgColor: '#f8d7da', label: 'Terminated', cardClass: 'event-delete' },
  CANCELLED: { icon: FaTimesCircle, color: '#dc3545', bgColor: '#f8d7da', label: 'Cancelled', cardClass: 'event-delete' },
  UPGRADED: { icon: FaArrowUp, color: '#28a745', bgColor: '#d4edda', label: 'Plan Upgraded', cardClass: 'event-create' },
  DOWNGRADED: { icon: FaArrowDown, color: '#ffc107', bgColor: '#fff3cd', label: 'Plan Downgraded', cardClass: 'event-status' },
  PLAN_CHANGED: { icon: FaExchangeAlt, color: '#17a2b8', bgColor: '#d1ecf1', label: 'Plan Changed', cardClass: 'event-update' },
  STATUS_CHANGED: { icon: FaExchangeAlt, color: '#ffc107', bgColor: '#fff3cd', label: 'Status Changed', cardClass: 'event-status' },
  RENEWED: { icon: FaSyncAlt, color: '#28a745', bgColor: '#d4edda', label: 'Renewed', cardClass: 'event-create' },
  TRIAL_STARTED: { icon: FaClock, color: '#17a2b8', bgColor: '#d1ecf1', label: 'Trial Started', cardClass: 'event-update' },
  TRIAL_ENDED: { icon: FaClock, color: '#ffc107', bgColor: '#fff3cd', label: 'Trial Ended', cardClass: 'event-status' },
  PAST_DUE: { icon: FaExclamationTriangle, color: '#dc3545', bgColor: '#f8d7da', label: 'Past Due', cardClass: 'event-delete' },
  GRACE_PERIOD_STARTED: { icon: FaExclamationTriangle, color: '#ffc107', bgColor: '#fff3cd', label: 'Grace Period Started', cardClass: 'event-status' },
  EXPIRED: { icon: FaStop, color: '#6c757d', bgColor: '#e2e3e5', label: 'Expired', cardClass: 'event-default' },
  BILLING_CYCLE_CHANGED: { icon: FaCog, color: '#17a2b8', bgColor: '#d1ecf1', label: 'Billing Cycle Changed', cardClass: 'event-update' },
  INVOICE_GENERATED: { icon: FaFileInvoiceDollar, color: '#17a2b8', bgColor: '#d1ecf1', label: 'Invoice Generated', cardClass: 'event-update' },
  PAYMENT_RECEIVED: { icon: FaCreditCard, color: '#28a745', bgColor: '#d4edda', label: 'Payment Received', cardClass: 'event-create' },
  PAYMENT_FAILED: { icon: FaTimesCircle, color: '#dc3545', bgColor: '#f8d7da', label: 'Payment Failed', cardClass: 'event-delete' },
  FEATURE_CHANGED: { icon: FaCog, color: '#17a2b8', bgColor: '#d1ecf1', label: 'Feature Changed', cardClass: 'event-update' },
  RENEWAL_NOTIFICATION_SENT: { icon: FaBell, color: '#17a2b8', bgColor: '#d1ecf1', label: 'Renewal Reminder Sent', cardClass: 'event-update' },
};

const SubscriptionAuditTimeline = ({ isOpen, toggle, companyId, subscriptionId, isAdmin = false }) => {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [pagination, setPagination] = useState({
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
  });

  const fetchAudits = async (page = 0) => {
    try {
      setLoading(true);
      let response;

      if (isAdmin && companyId) {
        // Admin viewing a company's audit trail
        response = await BillingService.getCompanySubscriptionAuditTrail(companyId, page, pagination.size);
      } else if (isAdmin && subscriptionId) {
        // Admin viewing a specific subscription's audit trail
        response = await BillingService.getSubscriptionAuditTrail(subscriptionId, page, pagination.size);
      } else {
        // Company user viewing their own audit trail
        response = await BillingService.getMySubscriptionAuditTrail(page, pagination.size);
      }

      const data = response.data || [];
      setAudits(data);
      setPagination((prev) => ({
        ...prev,
        page,
        totalElements: data.length,
        totalPages: Math.ceil(data.length / prev.size) || 1,
      }));
    } catch (error) {
      console.error('Error fetching subscription audits:', error);
      toast.error('Failed to load subscription history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAudits(0);
      setExpandedItems(new Set());
    }
  }, [isOpen, companyId, subscriptionId, isAdmin]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const toggleExpand = (index) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      return newSet;
    });
  };

  const hasExpandableContent = (audit) => {
    return audit.reason || audit.metadata;
  };

  const getPerformerDisplay = (audit) => {
    // For admin view, show performer details
    if (isAdmin && audit.performedByName) {
      const role = audit.performedByRole ? ` (${audit.performedByRole})` : '';
      return `${audit.performedByName}${role}`;
    }
    // For company view, just show "System" or generic text
    return null;
  };

  const renderStatusChange = (audit) => {
    if (!audit.previousStatus && !audit.newStatus) return null;

    return (
      <div className="detail-row">
        <span className="detail-label">Status:</span>
        <span className="detail-value">
          {audit.previousStatus && (
            <>
              <span className="status-badge status-old">{(audit.previousStatus || '').replace(/_/g, ' ')}</span>
              <span className="arrow">→</span>
            </>
          )}
          <span className="status-badge status-new">{(audit.newStatus || '').replace(/_/g, ' ')}</span>
        </span>
      </div>
    );
  };

  const renderPlanChange = (audit) => {
    if (!audit.previousPlanName && !audit.newPlanName) return null;

    return (
      <div className="detail-row">
        <span className="detail-label">Plan:</span>
        <span className="detail-value">
          {audit.previousPlanName && (
            <>
              <span className="old-value">{audit.previousPlanName}</span>
              <span className="arrow">→</span>
            </>
          )}
          <span className="new-value">{audit.newPlanName}</span>
        </span>
      </div>
    );
  };

  const renderChangeDetails = (audit) => {
    const { eventType } = audit;

    switch (eventType) {
      case 'CREATED':
        return (
          <div className="event-details">
            {audit.newPlanName && (
              <div className="detail-row">
                <span className="detail-label">Plan:</span>
                <span className="detail-value">
                  <span className="new-value">{audit.newPlanName}</span>
                </span>
              </div>
            )}
            {audit.newStatus && (
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className="detail-value">
                  <span className="status-badge status-new">{audit.newStatus.replace(/_/g, ' ')}</span>
                </span>
              </div>
            )}
          </div>
        );

      case 'SUSPENDED':
      case 'TERMINATED':
      case 'CANCELLED':
        return (
          <div className="event-details">
            {renderStatusChange(audit)}
            {audit.reason && (
              <div className="detail-row">
                <span className="detail-label">Reason:</span>
                <span className="detail-value">
                  <span className="old-value" style={{ background: '#fff3cd', borderColor: '#ffc107', color: '#856404' }}>
                    {audit.reason}
                  </span>
                </span>
              </div>
            )}
          </div>
        );

      case 'UPGRADED':
      case 'DOWNGRADED':
      case 'PLAN_CHANGED':
        return (
          <div className="event-details">
            {renderPlanChange(audit)}
            {renderStatusChange(audit)}
          </div>
        );

      case 'STATUS_CHANGED':
      case 'ACTIVATED':
      case 'RESUMED':
        return (
          <div className="event-details">
            {renderStatusChange(audit)}
          </div>
        );

      case 'PAST_DUE':
      case 'GRACE_PERIOD_STARTED':
        return (
          <div className="event-details">
            {renderStatusChange(audit)}
            {audit.reason && (
              <div className="detail-row">
                <span className="detail-label">Reason:</span>
                <span className="detail-value">{audit.reason}</span>
              </div>
            )}
          </div>
        );

      case 'RENEWED':
        return (
          <div className="event-details">
            {audit.newPlanName && (
              <div className="detail-row">
                <span className="detail-label">Plan:</span>
                <span className="detail-value">
                  <span className="new-value">{audit.newPlanName}</span>
                </span>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="event-details">
            {renderStatusChange(audit)}
            {renderPlanChange(audit)}
          </div>
        );
    }
  };

  const renderExpandedContent = (audit) => (
    <div className="expanded-details">
      {audit.reason && (
        <div className="expanded-row">
          <span className="expanded-label">Reason:</span>
          <span className="expanded-value">{audit.reason}</span>
        </div>
      )}
      {audit.metadata && (
        <div className="expanded-row">
          <span className="expanded-label">Details:</span>
          <span className="expanded-value">{audit.metadata}</span>
        </div>
      )}
      {isAdmin && audit.ipAddress && (
        <div className="expanded-row">
          <span className="expanded-label">IP Address:</span>
          <span className="expanded-value">{audit.ipAddress}</span>
        </div>
      )}
    </div>
  );

  const getBadgeColor = (color) => {
    switch (color) {
      case '#28a745': return 'success';
      case '#dc3545': return 'danger';
      case '#ffc107': return 'warning';
      case '#17a2b8': return 'info';
      case '#6f42c1': return 'purple';
      default: return 'secondary';
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" className="history-timeline-modal">
      <ModalHeader toggle={toggle}>
        <span>Subscription History</span>
        {audits.length > 0 && (
          <Badge color="secondary" className="event-count-badge ms-2">
            {audits.length} events
          </Badge>
        )}
      </ModalHeader>
      <ModalBody>
        {loading && (
          <div className="history-loading">
            <Spinner color="primary" />
            <span>Loading history...</span>
          </div>
        )}

        {!loading && audits.length === 0 && (
          <Alert color="info" className="history-empty">
            No subscription history available.
          </Alert>
        )}

        {!loading && audits.length > 0 && (
          <div className="history-timeline">
            <div className="timeline-container">
              {audits.map((audit, index) => {
                const config = EVENT_CONFIG[audit.eventType] || {
                  icon: FaCog,
                  color: '#6c757d',
                  bgColor: '#e2e3e5',
                  label: audit.eventType?.replace(/_/g, ' ') || 'Event',
                  cardClass: 'event-default',
                };
                const IconComponent = config.icon;
                const isExpanded = expandedItems.has(index);
                const hasDetails = hasExpandableContent(audit);
                const performerDisplay = getPerformerDisplay(audit);

                return (
                  <div key={audit.auditId || index} className="timeline-item">
                    <div className="timeline-marker">
                      <div
                        className="timeline-icon"
                        style={{ backgroundColor: config.bgColor, color: config.color }}
                      >
                        <IconComponent size={12} />
                      </div>
                      {index < audits.length - 1 && <div className="timeline-line" />}
                    </div>

                    <div className="timeline-content">
                      <div className={`timeline-card ${config.cardClass}`}>
                        <div className="timeline-card-header">
                          <div className="event-info">
                            <Badge color={getBadgeColor(config.color)} className="event-badge">
                              {config.label}
                            </Badge>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <span className="event-time">{formatDate(audit.createdDate)}</span>
                            {hasDetails && (
                              <button
                                type="button"
                                className="expand-btn"
                                onClick={() => toggleExpand(index)}
                              >
                                {isExpanded ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                              </button>
                            )}
                          </div>
                        </div>

                        {audit.eventDescription && (
                          <div className="event-title">
                            <span className="title-text">{audit.eventDescription}</span>
                          </div>
                        )}

                        {renderChangeDetails(audit)}

                        <Collapse isOpen={isExpanded}>{renderExpandedContent(audit)}</Collapse>

                        {/* Footer - Show performer only for admin */}
                        {(performerDisplay || isAdmin) && (
                          <div className="event-footer">
                            <span className="performer">
                              {isAdmin ? <FaUserShield size={10} /> : <FaUser size={10} />}
                              {performerDisplay || (isAdmin ? 'System' : '')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="history-pagination">
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${pagination.page === 0 ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => fetchAudits(pagination.page - 1)}
                    disabled={pagination.page === 0}
                  >
                    Previous
                  </button>
                </li>
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                  const pageNum = pagination.page < 3 ? i : pagination.page - 2 + i;
                  if (pageNum >= pagination.totalPages) return null;
                  return (
                    <li
                      key={pageNum}
                      className={`page-item ${pageNum === pagination.page ? 'active' : ''}`}
                    >
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => fetchAudits(pageNum)}
                      >
                        {pageNum + 1}
                      </button>
                    </li>
                  );
                })}
                <li
                  className={`page-item ${pagination.page >= pagination.totalPages - 1 ? 'disabled' : ''}`}
                >
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => fetchAudits(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages - 1}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
};

SubscriptionAuditTimeline.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  companyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  subscriptionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isAdmin: PropTypes.bool,
};

export default SubscriptionAuditTimeline;
