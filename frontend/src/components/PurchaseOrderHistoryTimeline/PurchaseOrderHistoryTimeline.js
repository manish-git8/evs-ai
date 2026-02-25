import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, Badge, Spinner, Alert, Collapse } from 'reactstrap';
import { toast } from 'react-toastify';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaExchangeAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaUserPlus,
  FaPlusSquare,
  FaPencilAlt,
  FaMinusSquare,
  FaChevronDown,
  FaChevronUp,
  FaUser,
  FaFileAlt,
  FaBox,
  FaTruck,
  FaHome,
  FaClipboardCheck,
} from 'react-icons/fa';
import PurchaseOrderService from '../../services/PurchaseOrderService';
import '../HistoryTimeline/HistoryTimeline.scss';

const EVENT_CONFIG = {
  CREATE: { icon: FaPlus, color: '#28a745', bgColor: '#d4edda', label: 'PO Created', cardClass: 'event-create' },
  UPDATE: { icon: FaEdit, color: '#17a2b8', bgColor: '#d1ecf1', label: 'PO Updated', cardClass: 'event-update' },
  DELETE: { icon: FaTrash, color: '#dc3545', bgColor: '#f8d7da', label: 'PO Deleted', cardClass: 'event-delete' },
  STATUS_CHANGE: { icon: FaExchangeAlt, color: '#ffc107', bgColor: '#fff3cd', label: 'Status Changed', cardClass: 'event-status' },
  APPROVE: { icon: FaCheckCircle, color: '#28a745', bgColor: '#d4edda', label: 'Approved', cardClass: 'event-approve' },
  REJECT: { icon: FaTimesCircle, color: '#dc3545', bgColor: '#f8d7da', label: 'Rejected', cardClass: 'event-reject' },
  APPROVER_ADDED: { icon: FaUserPlus, color: '#17a2b8', bgColor: '#d1ecf1', label: 'Approver Added', cardClass: 'event-update' },
  LINE_ITEM_ADD: { icon: FaPlusSquare, color: '#28a745', bgColor: '#d4edda', label: 'Item Added', cardClass: 'event-create' },
  LINE_ITEM_UPDATE: { icon: FaPencilAlt, color: '#17a2b8', bgColor: '#d1ecf1', label: 'Item Updated', cardClass: 'event-update' },
  LINE_ITEM_DELETE: { icon: FaMinusSquare, color: '#dc3545', bgColor: '#f8d7da', label: 'Item Deleted', cardClass: 'event-delete' },
  CONFIRM: { icon: FaClipboardCheck, color: '#007bff', bgColor: '#cce5ff', label: 'Confirmed', cardClass: 'event-update' },
  SHIP: { icon: FaTruck, color: '#6f42c1', bgColor: '#e2d9f3', label: 'Shipped', cardClass: 'event-update' },
  DELIVER: { icon: FaHome, color: '#28a745', bgColor: '#d4edda', label: 'Delivered', cardClass: 'event-create' },
};

const PurchaseOrderHistoryTimeline = ({ isOpen, toggle, purchaseOrderId, companyId }) => {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [pagination, setPagination] = useState({
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
  });

  const fetchAudits = async (page = 0) => {
    if (!purchaseOrderId || !companyId) return;
    try {
      setLoading(true);
      const response = await PurchaseOrderService.getPurchaseOrderAudits(companyId, purchaseOrderId, page, pagination.size);
      const { data } = response;
      setAudits(data.content || []);
      setPagination({
        page: data.pageNumber ?? data.number ?? page,
        size: data.pageSize ?? data.size ?? 10,
        totalElements: data.totalElements || 0,
        totalPages: data.totalPages || 0,
      });
    } catch (error) {
      console.error('Error fetching purchase order audits:', error);
      toast.error('Failed to load purchase order history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && purchaseOrderId && companyId) {
      fetchAudits(0);
      setExpandedItems(new Set());
    }
  }, [isOpen, purchaseOrderId, companyId]);

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

  const formatCurrency = (amount) => {
    if (amount == null || Number.isNaN(Number(amount))) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
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
    return (
      audit.approvalComments ||
      audit.changeReason ||
      audit.trackingNumber ||
      audit.confirmationDetails
    );
  };

  const getPerformerName = (changedBy) => {
    if (!changedBy) return 'System';
    const name = `${changedBy.firstName || ''} ${changedBy.lastName || ''}`.trim();
    const email = changedBy.email;
    if (name && email) {
      return `${name} (${email})`;
    }
    return name || email || 'Unknown';
  };

  const renderChangeDetails = (audit) => {
    const { changeType } = audit;

    switch (changeType) {
      case 'CREATE':
        return (
          <div className="event-details">
            <div className="detail-row">
              <span className="detail-label">Order No:</span>
              <span className="detail-value"><span className="new-value">{audit.newOrderNo || 'New PO'}</span></span>
            </div>
            {audit.newOrderTotal && (
              <div className="detail-row">
                <span className="detail-label">Total:</span>
                <span className="detail-value"><span className="new-value">{formatCurrency(audit.newOrderTotal)}</span></span>
              </div>
            )}
            {audit.newExpectedDeliveryDate && (
              <div className="detail-row">
                <span className="detail-label">Delivery:</span>
                <span className="detail-value"><span className="new-value">{formatDate(audit.newExpectedDeliveryDate)}</span></span>
              </div>
            )}
          </div>
        );

      case 'UPDATE':
        return (
          <div className="event-details">
            {audit.oldOrderNo !== audit.newOrderNo && audit.newOrderNo && (
              <div className="detail-row">
                <span className="detail-label">Order No:</span>
                <span className="detail-value">
                  <span className="old-value">{audit.oldOrderNo || 'None'}</span>
                  <span className="arrow">→</span>
                  <span className="new-value">{audit.newOrderNo}</span>
                </span>
              </div>
            )}
            {audit.oldOrderTotal !== audit.newOrderTotal && (
              <div className="detail-row">
                <span className="detail-label">Total:</span>
                <span className="detail-value">
                  <span className="old-value">{formatCurrency(audit.oldOrderTotal)}</span>
                  <span className="arrow">→</span>
                  <span className="new-value">{formatCurrency(audit.newOrderTotal)}</span>
                </span>
              </div>
            )}
            {audit.oldExpectedDeliveryDate !== audit.newExpectedDeliveryDate && (
              <div className="detail-row">
                <span className="detail-label">Delivery:</span>
                <span className="detail-value">
                  <span className="old-value">{formatDate(audit.oldExpectedDeliveryDate)}</span>
                  <span className="arrow">→</span>
                  <span className="new-value">{formatDate(audit.newExpectedDeliveryDate)}</span>
                </span>
              </div>
            )}
            {audit.fieldChanged && audit.oldValue !== audit.newValue && (
              <div className="detail-row">
                <span className="detail-label">{audit.fieldChanged}:</span>
                <span className="detail-value">
                  <span className="old-value">{audit.oldValue || 'None'}</span>
                  <span className="arrow">→</span>
                  <span className="new-value">{audit.newValue || 'None'}</span>
                </span>
              </div>
            )}
          </div>
        );

      case 'STATUS_CHANGE':
        return (
          <div className="event-details">
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className="detail-value">
                <span className="status-badge status-old">{(audit.oldOrderStatus || '').replace(/_/g, ' ')}</span>
                <span className="arrow">→</span>
                <span className="status-badge status-new">{(audit.newOrderStatus || '').replace(/_/g, ' ')}</span>
              </span>
            </div>
          </div>
        );

      case 'APPROVE':
        return (
          <div className="event-details">
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className="detail-value">
                <span className="status-badge status-old">{(audit.oldOrderStatus || '').replace(/_/g, ' ')}</span>
                <span className="arrow">→</span>
                <span className="status-badge status-new">{(audit.newOrderStatus || '').replace(/_/g, ' ')}</span>
              </span>
            </div>
            {audit.approvalLevel && (
              <div className="detail-row">
                <span className="detail-label">Level:</span>
                <span className="detail-value"><span className="new-value">Level {audit.approvalLevel}</span></span>
              </div>
            )}
            {audit.approverUser && (
              <div className="detail-row">
                <span className="detail-label">Approver:</span>
                <span className="detail-value"><span className="new-value">{audit.approverUser.firstName} {audit.approverUser.lastName}{audit.approverUser.email && ` (${audit.approverUser.email})`}</span></span>
              </div>
            )}
          </div>
        );

      case 'REJECT':
        return (
          <div className="event-details">
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className="detail-value">
                <span className="status-badge status-old">{(audit.oldOrderStatus || '').replace(/_/g, ' ')}</span>
                <span className="arrow">→</span>
                <span className="status-badge status-rejected">{(audit.newOrderStatus || '').replace(/_/g, ' ')}</span>
              </span>
            </div>
            {audit.approvalLevel && (
              <div className="detail-row">
                <span className="detail-label">Level:</span>
                <span className="detail-value"><span className="new-value">Level {audit.approvalLevel}</span></span>
              </div>
            )}
          </div>
        );

      case 'APPROVER_ADDED':
        return (
          <div className="event-details">
            {audit.approverUser && (
              <div className="detail-row">
                <span className="detail-label">Approver:</span>
                <span className="detail-value"><span className="new-value">{audit.approverUser.firstName} {audit.approverUser.lastName}{audit.approverUser.email && ` (${audit.approverUser.email})`}</span></span>
              </div>
            )}
            {audit.approvalLevel && (
              <div className="detail-row">
                <span className="detail-label">Level:</span>
                <span className="detail-value"><span className="new-value">Level {audit.approvalLevel}</span></span>
              </div>
            )}
          </div>
        );

      case 'LINE_ITEM_ADD':
        return (
          <div className="event-details">
            <div className="detail-row">
              <span className="detail-label">Quantity:</span>
              <span className="detail-value"><span className="new-value">{audit.newQuantity}</span></span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Unit Price:</span>
              <span className="detail-value"><span className="new-value">{formatCurrency(audit.newUnitPrice)}</span></span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Total:</span>
              <span className="detail-value"><span className="new-value">{formatCurrency(audit.newLineAmount || (audit.newQuantity * audit.newUnitPrice))}</span></span>
            </div>
            {(audit.newProject || audit.newGLAccount || audit.newDepartment) && (
              <div className="dimension-tags">
                {audit.newProject && <span className="dimension-tag"><FaBox size={10} /> {audit.newProject.name}</span>}
                {audit.newGLAccount && <span className="dimension-tag">{audit.newGLAccount.name}</span>}
                {audit.newDepartment && <span className="dimension-tag">{audit.newDepartment.name}</span>}
              </div>
            )}
          </div>
        );

      case 'LINE_ITEM_UPDATE':
        return (
          <div className="event-details">
            {audit.oldQuantity !== audit.newQuantity && (
              <div className="detail-row">
                <span className="detail-label">Quantity:</span>
                <span className="detail-value">
                  <span className="old-value">{audit.oldQuantity}</span>
                  <span className="arrow">→</span>
                  <span className="new-value">{audit.newQuantity}</span>
                </span>
              </div>
            )}
            {audit.oldUnitPrice !== audit.newUnitPrice && (
              <div className="detail-row">
                <span className="detail-label">Unit Price:</span>
                <span className="detail-value">
                  <span className="old-value">{formatCurrency(audit.oldUnitPrice)}</span>
                  <span className="arrow">→</span>
                  <span className="new-value">{formatCurrency(audit.newUnitPrice)}</span>
                </span>
              </div>
            )}
            {audit.oldLineAmount !== audit.newLineAmount && (
              <div className="detail-row">
                <span className="detail-label">Total:</span>
                <span className="detail-value">
                  <span className="old-value">{formatCurrency(audit.oldLineAmount)}</span>
                  <span className="arrow">→</span>
                  <span className="new-value">{formatCurrency(audit.newLineAmount)}</span>
                </span>
              </div>
            )}
            {audit.oldDiscountPercentage !== audit.newDiscountPercentage && (
              <div className="detail-row">
                <span className="detail-label">Discount:</span>
                <span className="detail-value">
                  <span className="old-value">{audit.oldDiscountPercentage || 0}%</span>
                  <span className="arrow">→</span>
                  <span className="new-value">{audit.newDiscountPercentage || 0}%</span>
                </span>
              </div>
            )}
          </div>
        );

      case 'LINE_ITEM_DELETE':
        return (
          <div className="event-details">
            <div className="detail-row">
              <span className="detail-label">Quantity:</span>
              <span className="detail-value">
                <span className="old-value">{audit.oldQuantity}</span>
                <span className="arrow">→</span>
                <span className="new-value deleted-value">0</span>
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Amount:</span>
              <span className="detail-value">
                <span className="old-value">{formatCurrency(audit.oldLineAmount)}</span>
                <span className="arrow">→</span>
                <span className="new-value deleted-value">$0.00</span>
              </span>
            </div>
          </div>
        );

      case 'CONFIRM':
        return (
          <div className="event-details">
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className="detail-value">
                <span className="status-badge status-old">{(audit.oldOrderStatus || '').replace(/_/g, ' ')}</span>
                <span className="arrow">→</span>
                <span className="status-badge status-new">{(audit.newOrderStatus || '').replace(/_/g, ' ')}</span>
              </span>
            </div>
            {audit.newQuantityConfirmed && (
              <div className="detail-row">
                <span className="detail-label">Confirmed:</span>
                <span className="detail-value"><span className="new-value">{audit.newQuantityConfirmed} units</span></span>
              </div>
            )}
          </div>
        );

      case 'SHIP':
        return (
          <div className="event-details">
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className="detail-value">
                <span className="status-badge status-old">{(audit.oldOrderStatus || '').replace(/_/g, ' ')}</span>
                <span className="arrow">→</span>
                <span className="status-badge status-new">{(audit.newOrderStatus || '').replace(/_/g, ' ')}</span>
              </span>
            </div>
            {audit.newQuantityShipped && (
              <div className="detail-row">
                <span className="detail-label">Shipped:</span>
                <span className="detail-value"><span className="new-value">{audit.newQuantityShipped} units</span></span>
              </div>
            )}
            {audit.shipmentDate && (
              <div className="detail-row">
                <span className="detail-label">Ship Date:</span>
                <span className="detail-value"><span className="new-value">{formatDate(audit.shipmentDate)}</span></span>
              </div>
            )}
          </div>
        );

      case 'DELIVER':
        return (
          <div className="event-details">
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className="detail-value">
                <span className="status-badge status-old">{(audit.oldOrderStatus || '').replace(/_/g, ' ')}</span>
                <span className="arrow">→</span>
                <span className="status-badge status-new">{(audit.newOrderStatus || '').replace(/_/g, ' ')}</span>
              </span>
            </div>
            {audit.newQuantityReceived && (
              <div className="detail-row">
                <span className="detail-label">Received:</span>
                <span className="detail-value"><span className="new-value">{audit.newQuantityReceived} units</span></span>
              </div>
            )}
            {audit.newQuantityAccepted && (
              <div className="detail-row">
                <span className="detail-label">Accepted:</span>
                <span className="detail-value"><span className="new-value" style={{ background: '#d4edda', borderColor: '#c3e6cb' }}>{audit.newQuantityAccepted} units</span></span>
              </div>
            )}
            {audit.newQuantityRejected && Number(audit.newQuantityRejected) > 0 && (
              <div className="detail-row">
                <span className="detail-label">Rejected:</span>
                <span className="detail-value"><span className="new-value deleted-value">{audit.newQuantityRejected} units</span></span>
              </div>
            )}
          </div>
        );

      case 'DELETE':
        return (
          <div className="event-details">
            <div className="detail-row">
              <span className="detail-label">Order:</span>
              <span className="detail-value">
                <span className="old-value">{audit.oldOrderNo || 'PO'}</span>
                <span className="arrow">→</span>
                <span className="new-value deleted-value">Deleted</span>
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Total:</span>
              <span className="detail-value">
                <span className="old-value">{formatCurrency(audit.oldOrderTotal)}</span>
                <span className="arrow">→</span>
                <span className="new-value deleted-value">$0.00</span>
              </span>
            </div>
          </div>
        );

      default:
        return audit.fieldChanged && (
          <div className="event-details">
            <div className="detail-row">
              <span className="detail-label">{audit.fieldChanged}:</span>
              <span className="detail-value">
                <span className="old-value">{audit.oldValue || 'None'}</span>
                <span className="arrow">→</span>
                <span className="new-value">{audit.newValue || 'None'}</span>
              </span>
            </div>
          </div>
        );
    }
  };

  const renderExpandedContent = (audit) => (
    <div className="expanded-details">
      {audit.approvalComments && (
        <div className="expanded-row">
          <span className="expanded-label">Comments:</span>
          <span className="expanded-value">{audit.approvalComments}</span>
        </div>
      )}
      {audit.trackingNumber && (
        <div className="expanded-row">
          <span className="expanded-label">Tracking:</span>
          <span className="expanded-value">{audit.trackingNumber}</span>
        </div>
      )}
      {audit.confirmationDetails && (
        <div className="expanded-row">
          <span className="expanded-label">Details:</span>
          <span className="expanded-value">{audit.confirmationDetails}</span>
        </div>
      )}
      {audit.changeReason && (
        <div className="expanded-row">
          <span className="expanded-label">Reason:</span>
          <span className="expanded-value">{audit.changeReason}</span>
        </div>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" className="history-timeline-modal">
      <ModalHeader toggle={toggle}>
        <span>Purchase Order History</span>
        {pagination.totalElements > 0 && (
          <Badge color="secondary" className="event-count-badge ms-2">
            {pagination.totalElements} events
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
            No history available for this purchase order.
          </Alert>
        )}

        {!loading && audits.length > 0 && (
          <div className="history-timeline">
            <div className="timeline-container">
              {audits.map((audit, index) => {
                const config = EVENT_CONFIG[audit.changeType] || { icon: FaEdit, color: '#6c757d', bgColor: '#e2e3e5', label: audit.changeType, cardClass: 'event-default' };
                const IconComponent = config.icon;
                const isExpanded = expandedItems.has(index);
                const hasDetails = hasExpandableContent(audit);

                return (
                  <div key={audit.auditId} className="timeline-item">
                    <div className="timeline-marker">
                      <div className="timeline-icon" style={{ backgroundColor: config.bgColor, color: config.color }}>
                        <IconComponent size={12} />
                      </div>
                      {index < audits.length - 1 && <div className="timeline-line" />}
                    </div>

                    <div className="timeline-content">
                      <div className={`timeline-card ${config.cardClass}`}>
                        <div className="timeline-card-header">
                          <div className="event-info">
                            <Badge color={config.color === '#28a745' ? 'success' : config.color === '#dc3545' ? 'danger' : config.color === '#ffc107' ? 'warning' : config.color === '#6f42c1' ? 'purple' : 'primary'} className="event-badge">
                              {config.label}
                            </Badge>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <span className="event-time">{formatDate(audit.changedDate)}</span>
                            {hasDetails && (
                              <button className="expand-btn" onClick={() => toggleExpand(index)}>
                                {isExpanded ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="event-title">
                          {audit.lineItemDescription ? (
                            <>
                              <FaBox className="title-icon" size={12} />
                              <span className="title-text" title={audit.lineItemDescription}>{audit.lineItemDescription}</span>
                            </>
                          ) : (
                            <>
                              <FaFileAlt className="title-icon" size={12} />
                              <span className="title-text">Purchase Order Level Change</span>
                            </>
                          )}
                        </div>

                        {renderChangeDetails(audit)}

                        <Collapse isOpen={isExpanded}>
                          {renderExpandedContent(audit)}
                        </Collapse>

                        <div className="event-footer">
                          <span className="performer">
                            <FaUser size={10} />
                            {getPerformerName(audit.changedBy)}
                          </span>
                        </div>
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
                  <button type="button" className="page-link" onClick={() => fetchAudits(pagination.page - 1)} disabled={pagination.page === 0}>
                    Previous
                  </button>
                </li>
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                  const pageNum = pagination.page < 3 ? i : pagination.page - 2 + i;
                  if (pageNum >= pagination.totalPages) return null;
                  return (
                    <li key={pageNum} className={`page-item ${pageNum === pagination.page ? 'active' : ''}`}>
                      <button type="button" className="page-link" onClick={() => fetchAudits(pageNum)}>
                        {pageNum + 1}
                      </button>
                    </li>
                  );
                })}
                <li className={`page-item ${pagination.page >= pagination.totalPages - 1 ? 'disabled' : ''}`}>
                  <button type="button" className="page-link" onClick={() => fetchAudits(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages - 1}>
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

PurchaseOrderHistoryTimeline.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  purchaseOrderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  companyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default PurchaseOrderHistoryTimeline;
