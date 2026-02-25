import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Spinner, Alert, Collapse, Button, Modal, ModalHeader, ModalBody } from 'reactstrap';
import {
  FaPlus,
  FaCopy,
  FaEdit,
  FaPaperPlane,
  FaRedo,
  FaUserPlus,
  FaReply,
  FaHandshake,
  FaClipboardCheck,
  FaCheckCircle,
  FaTimesCircle,
  FaShieldAlt,
  FaShoppingCart,
  FaTrophy,
  FaTrash,
  FaChevronDown,
  FaChevronUp,
} from 'react-icons/fa';
import RqfService from '../../../services/RfqService';
import './RfqHistoryTimeline.scss';

const EVENT_CONFIG = {
  RFQ_CREATED: {
    icon: FaPlus,
    color: '#28a745',
    bgColor: '#d4edda',
    label: 'RFQ Created',
  },
  RFQ_CLONED: {
    icon: FaCopy,
    color: '#6f42c1',
    bgColor: '#e2d9f3',
    label: 'RFQ Cloned',
  },
  RFQ_UPDATED: {
    icon: FaEdit,
    color: '#17a2b8',
    bgColor: '#d1ecf1',
    label: 'RFQ Updated',
  },
  RFQ_SUBMITTED: {
    icon: FaPaperPlane,
    color: '#007bff',
    bgColor: '#cce5ff',
    label: 'RFQ Submitted',
  },
  RFQ_RESUBMITTED: {
    icon: FaRedo,
    color: '#6f42c1',
    bgColor: '#e2d9f3',
    label: 'RFQ Resubmitted',
  },
  SUPPLIER_INVITED: {
    icon: FaUserPlus,
    color: '#20c997',
    bgColor: '#d1f2eb',
    label: 'Supplier Invited',
  },
  SUPPLIER_RESPONDED: {
    icon: FaReply,
    color: '#17a2b8',
    bgColor: '#d1ecf1',
    label: 'Supplier Responded',
  },
  SUPPLIER_NEGOTIATION: {
    icon: FaHandshake,
    color: '#fd7e14',
    bgColor: '#ffe5d0',
    label: 'Price Negotiation',
  },
  SIGNOFF_REQUESTED: {
    icon: FaClipboardCheck,
    color: '#ffc107',
    bgColor: '#fff3cd',
    label: 'Approval Requested',
  },
  SIGNOFF_APPROVED: {
    icon: FaCheckCircle,
    color: '#28a745',
    bgColor: '#d4edda',
    label: 'Approved',
  },
  SIGNOFF_REJECTED: {
    icon: FaTimesCircle,
    color: '#dc3545',
    bgColor: '#f8d7da',
    label: 'Rejected',
  },
  SIGNOFF_OVERRIDDEN: {
    icon: FaShieldAlt,
    color: '#6c757d',
    bgColor: '#e2e3e5',
    label: 'Approval Overridden',
  },
  PO_GENERATED: {
    icon: FaShoppingCart,
    color: '#28a745',
    bgColor: '#d4edda',
    label: 'PO Generated',
  },
  RFQ_COMPLETED: {
    icon: FaTrophy,
    color: '#28a745',
    bgColor: '#d4edda',
    label: 'RFQ Completed',
  },
  RFQ_DELETED: {
    icon: FaTrash,
    color: '#dc3545',
    bgColor: '#f8d7da',
    label: 'RFQ Deleted',
  },
};

const RfqHistoryTimeline = ({ companyId, rfqId, isOpen, toggle }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());

  useEffect(() => {
    if (isOpen && companyId && rfqId) {
      fetchHistory();
    }
  }, [isOpen, companyId, rfqId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await RqfService.getRfqHistoryTimeline(companyId, rfqId);
      setHistory(response.data || []);
    } catch (err) {
      console.error('Error fetching RFQ history:', err);
      setError('Failed to load RFQ history');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (index) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  const getPerformerName = (performedBy) => {
    if (!performedBy) return 'System';
    const firstName = performedBy.firstName || '';
    const lastName = performedBy.lastName || '';
    const name = `${firstName} ${lastName}`.trim();
    const email = performedBy.email;
    if (name && email) {
      return `${name} (${email})`;
    }
    return name || email || 'Unknown User';
  };

  const hasExpandableContent = (item) => {
    return (
      item.signoffComments ||
      item.additionalData ||
      item.supplier ||
      item.purchaseOrderNumber ||
      item.signoffUser
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="rfq-history-loading">
          <Spinner color="primary" />
          <span>Loading history...</span>
        </div>
      );
    }

    if (error) {
      return <Alert color="danger">{error}</Alert>;
    }

    if (!history || history.length === 0) {
      return (
        <Alert color="info" className="rfq-history-empty">
          No history available for this RFQ.
        </Alert>
      );
    }

    return (
      <div className="timeline-container">
        {history.map((item, index) => {
          const config = EVENT_CONFIG[item.eventType] || {
            icon: FaEdit,
            color: '#6c757d',
            bgColor: '#e2e3e5',
            label: item.eventType,
          };
          const IconComponent = config.icon;
          const isExpanded = expandedItems.has(index);
          const hasDetails = hasExpandableContent(item);

          return (
            <div key={item.rfqHistoryId || index} className="timeline-item">
              <div className="timeline-marker">
                <div
                  className="timeline-icon"
                  style={{ backgroundColor: config.bgColor, color: config.color }}
                >
                  <IconComponent />
                </div>
                {index < history.length - 1 && <div className="timeline-line" />}
              </div>

              <div className="timeline-content">
                <div className="timeline-card" style={{ borderLeftColor: config.color }}>
                  <div className="timeline-card-header">
                    <div className="event-info">
                      <span className="event-label" style={{ color: config.color }}>
                        {config.label}
                      </span>
                      <span className="event-time">{formatDate(item.performedAt)}</span>
                    </div>
                    {hasDetails && (
                      <Button
                        color="link"
                        size="sm"
                        className="expand-btn"
                        onClick={() => toggleExpand(index)}
                      >
                        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                      </Button>
                    )}
                  </div>

                  <div className="event-description">
                    {item.eventType === 'SIGNOFF_REQUESTED' && item.eventDescription?.includes('suppliers:') ? (
                      <>
                        <span>Approval requested for suppliers:</span>
                        <div className="suppliers-list">
                          {item.eventDescription
                            .replace('Approval requested for suppliers:', '')
                            .split(',')
                            .map((supplier, idx) => (
                              <div key={idx} className="supplier-item">
                                {supplier.trim()}
                              </div>
                            ))}
                        </div>
                      </>
                    ) : (
                      item.eventDescription
                    )}
                  </div>

                  <div className="event-performer">
                    <small>by {getPerformerName(item.performedBy)}</small>
                  </div>

                  {item.oldStatus && item.newStatus && (
                    <div className="status-change">
                      <span className="old-status">{item.oldStatus}</span>
                      <span className="arrow">&rarr;</span>
                      <span className="new-status">{item.newStatus}</span>
                    </div>
                  )}

                  <Collapse isOpen={isExpanded}>
                    <div className="timeline-details">
                      {item.supplier && (
                        <div className="detail-row">
                          <span className="detail-label">Supplier:</span>
                          <span className="detail-value">
                            {item.supplier.name} ({item.supplier.email})
                          </span>
                        </div>
                      )}

                      {item.signoffUser && (
                        <div className="detail-row">
                          <span className="detail-label">Approver:</span>
                          <span className="detail-value">
                            {item.signoffUser.firstName} {item.signoffUser.lastName}
                            {item.signoffUser.email && ` (${item.signoffUser.email})`}
                          </span>
                        </div>
                      )}

                      {item.signoffComments && (
                        <div className="detail-row">
                          <span className="detail-label">Comments:</span>
                          <span className="detail-value comments">{item.signoffComments}</span>
                        </div>
                      )}

                      {item.purchaseOrderNumber && (
                        <div className="detail-row">
                          <span className="detail-label">PO Number:</span>
                          <span className="detail-value po-link">{item.purchaseOrderNumber}</span>
                        </div>
                      )}

                      {item.additionalData && (
                        <div className="detail-row">
                          <span className="detail-label">
                            {item.eventType === 'SUPPLIER_NEGOTIATION'
                              ? 'Price Changes:'
                              : item.eventType === 'SIGNOFF_REQUESTED'
                                ? 'Approvers:'
                                : 'Details:'}
                          </span>
                          {item.eventType === 'SUPPLIER_NEGOTIATION' ? (
                            <div className="price-changes">
                              {item.additionalData.split(';').map((change, idx) => (
                                <div key={idx} className="price-change-item">
                                  {change.trim()}
                                </div>
                              ))}
                            </div>
                          ) : item.eventType === 'SIGNOFF_REQUESTED' ? (
                            <div className="approvers-list">
                              {item.additionalData.split(';').map((approver, idx) => (
                                <div key={idx} className="approver-item">
                                  {approver.trim()}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="detail-value">{item.additionalData}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </Collapse>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" className="rfq-history-modal">
      <ModalHeader toggle={toggle}>
        <div className="d-flex align-items-center gap-2">
          <span>RFQ History</span>
          {history.length > 0 && (
            <span className="badge bg-secondary">{history.length} events</span>
          )}
        </div>
      </ModalHeader>
      <ModalBody className="rfq-history-timeline">{renderContent()}</ModalBody>
    </Modal>
  );
};

export default RfqHistoryTimeline;
