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
  FaShoppingCart,
  FaBox,
} from 'react-icons/fa';
import CartService from '../../services/CartService';
import '../HistoryTimeline/HistoryTimeline.scss';

const EVENT_CONFIG = {
  CREATE: { icon: FaPlus, color: '#28a745', bgColor: '#d4edda', label: 'Cart Created', cardClass: 'event-create' },
  UPDATE: { icon: FaEdit, color: '#17a2b8', bgColor: '#d1ecf1', label: 'Cart Updated', cardClass: 'event-update' },
  DELETE: { icon: FaTrash, color: '#dc3545', bgColor: '#f8d7da', label: 'Cart Deleted', cardClass: 'event-delete' },
  STATUS_CHANGE: { icon: FaExchangeAlt, color: '#ffc107', bgColor: '#fff3cd', label: 'Status Changed', cardClass: 'event-status' },
  APPROVE: { icon: FaCheckCircle, color: '#28a745', bgColor: '#d4edda', label: 'Approved', cardClass: 'event-approve' },
  REJECT: { icon: FaTimesCircle, color: '#dc3545', bgColor: '#f8d7da', label: 'Rejected', cardClass: 'event-reject' },
  APPROVER_ADDED: { icon: FaUserPlus, color: '#17a2b8', bgColor: '#d1ecf1', label: 'Approver Added', cardClass: 'event-update' },
  LINE_ITEM_ADD: { icon: FaPlusSquare, color: '#28a745', bgColor: '#d4edda', label: 'Item Added', cardClass: 'event-create' },
  LINE_ITEM_UPDATE: { icon: FaPencilAlt, color: '#17a2b8', bgColor: '#d1ecf1', label: 'Item Updated', cardClass: 'event-update' },
  LINE_ITEM_DELETE: { icon: FaMinusSquare, color: '#dc3545', bgColor: '#f8d7da', label: 'Item Deleted', cardClass: 'event-delete' },
  REASSIGNED: { icon: FaExchangeAlt, color: '#6f42c1', bgColor: '#e2d9f3', label: 'Reassigned', cardClass: 'event-reassign' },
};

const CartHistoryTimeline = ({ isOpen, toggle, cartId, companyId }) => {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [pagination, setPagination] = useState({
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
  });

  const fetchAudits = async (page = 0, size = 10) => {
    if (!cartId || !companyId) return;
    try {
      setLoading(true);
      const response = await CartService.getCartAudits(companyId, cartId, page, size);
      const { data } = response;
      setAudits(data.content || []);
      setPagination({
        page: data.pageable?.pageNumber ?? data.number ?? page,
        size: data.size || 10,
        totalElements: data.totalElements || 0,
        totalPages: data.totalPages || 0,
      });
    } catch (error) {
      toast.error('Failed to load cart history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && cartId && companyId) {
      fetchAudits(0, 10);
      setExpandedItems(new Set());
    }
  }, [isOpen, cartId, companyId]);

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
      (audit.fieldChanged === 'AccountSettings' && (audit.oldDepartment || audit.newDepartment || audit.oldProject || audit.newProject || audit.oldGLAccount || audit.newGLAccount || audit.oldLocation || audit.newLocation || audit.oldClass || audit.newClass))
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
              <span className="detail-label">Name:</span>
              <span className="detail-value">
                <span className="new-value">{audit.newCartName || 'New Cart'}</span>
              </span>
            </div>
            {audit.newTotalAmount && (
              <div className="detail-row">
                <span className="detail-label">Amount:</span>
                <span className="detail-value">
                  <span className="new-value">{formatCurrency(audit.newTotalAmount)}</span>
                </span>
              </div>
            )}
          </div>
        );

      case 'UPDATE':
        return (
          <div className="event-details">
            {audit.oldCartName !== audit.newCartName && audit.newCartName && (
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">
                  <span className="old-value">{audit.oldCartName || 'None'}</span>
                  <span className="arrow">→</span>
                  <span className="new-value">{audit.newCartName}</span>
                </span>
              </div>
            )}
            {audit.oldTotalAmount !== audit.newTotalAmount && (
              <div className="detail-row">
                <span className="detail-label">Amount:</span>
                <span className="detail-value">
                  <span className="old-value">{formatCurrency(audit.oldTotalAmount)}</span>
                  <span className="arrow">→</span>
                  <span className="new-value">{formatCurrency(audit.newTotalAmount)}</span>
                </span>
              </div>
            )}
            {audit.fieldChanged && !['AccountSettings'].includes(audit.fieldChanged) && audit.oldValue !== audit.newValue && (
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
                <span className="status-badge status-old">{(audit.oldCartStatus || audit.oldValue || '').replace(/_/g, ' ')}</span>
                <span className="arrow">→</span>
                <span className="status-badge status-new">{(audit.newCartStatus || audit.newValue || '').replace(/_/g, ' ')}</span>
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
                <span className="status-badge status-old">{(audit.oldCartStatus || '').replace(/_/g, ' ')}</span>
                <span className="arrow">→</span>
                <span className="status-badge status-new">{(audit.newCartStatus || '').replace(/_/g, ' ')}</span>
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
                <span className="detail-value"><span className="new-value">{audit.approverUser.firstName} {audit.approverUser.lastName}</span></span>
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
                <span className="status-badge status-old">{(audit.oldCartStatus || '').replace(/_/g, ' ')}</span>
                <span className="arrow">→</span>
                <span className="status-badge status-rejected">{(audit.newCartStatus || '').replace(/_/g, ' ')}</span>
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
                <span className="detail-value"><span className="new-value">{audit.approverUser.firstName} {audit.approverUser.lastName}</span></span>
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
              <span className="detail-value"><span className="new-value">{formatCurrency(audit.newLineAmount)}</span></span>
            </div>
            {(audit.newProject || audit.newGLAccount) && (
              <div className="dimension-tags">
                {audit.newProject && <span className="dimension-tag"><FaBox size={10} /> {audit.newProject.name}</span>}
                {audit.newGLAccount && <span className="dimension-tag">{audit.newGLAccount.name}</span>}
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

      case 'DELETE':
        return (
          <div className="event-details">
            <div className="detail-row">
              <span className="detail-label">Cart:</span>
              <span className="detail-value">
                <span className="old-value">{audit.oldCartName || 'Cart'}</span>
                <span className="arrow">→</span>
                <span className="new-value deleted-value">Deleted</span>
              </span>
            </div>
          </div>
        );

      case 'REASSIGNED':
        return (
          <div className="event-details">
            <div className="detail-row">
              <span className="detail-label">Owner Changed:</span>
              <span className="detail-value">
                <span className="old-value">{audit.oldValue || 'Unknown'}</span>
                <span className="arrow">→</span>
                <span className="new-value">{audit.newValue || 'Unknown'}</span>
              </span>
            </div>
            {audit.changeReason && (
              <div className="detail-row">
                <span className="detail-label">Reason:</span>
                <span className="detail-value">{audit.changeReason}</span>
              </div>
            )}
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
      {audit.fieldChanged === 'AccountSettings' && (
        <>
          {(audit.oldDepartment || audit.newDepartment) && (
            <div className="expanded-row">
              <span className="expanded-label">Department:</span>
              <span className="expanded-value">{audit.oldDepartment?.name || 'None'} → {audit.newDepartment?.name || 'None'}</span>
            </div>
          )}
          {(audit.oldProject || audit.newProject) && (
            <div className="expanded-row">
              <span className="expanded-label">Project:</span>
              <span className="expanded-value">{audit.oldProject?.name || 'None'} → {audit.newProject?.name || 'None'}</span>
            </div>
          )}
          {(audit.oldGLAccount || audit.newGLAccount) && (
            <div className="expanded-row">
              <span className="expanded-label">GL Account:</span>
              <span className="expanded-value">{audit.oldGLAccount?.name || 'None'} → {audit.newGLAccount?.name || 'None'}</span>
            </div>
          )}
          {(audit.oldLocation || audit.newLocation) && (
            <div className="expanded-row">
              <span className="expanded-label">Location:</span>
              <span className="expanded-value">{audit.oldLocation?.name || 'None'} → {audit.newLocation?.name || 'None'}</span>
            </div>
          )}
          {(audit.oldClass || audit.newClass) && (
            <div className="expanded-row">
              <span className="expanded-label">Class:</span>
              <span className="expanded-value">{audit.oldClass?.name || 'None'} → {audit.newClass?.name || 'None'}</span>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" className="history-timeline-modal">
      <ModalHeader toggle={toggle}>
        <span>Cart History</span>
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
            No history available for this cart.
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
                            <Badge color={config.color === '#28a745' ? 'success' : config.color === '#dc3545' ? 'danger' : config.color === '#ffc107' ? 'warning' : 'primary'} className="event-badge">
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
                              <FaShoppingCart className="title-icon" size={12} />
                              <span className="title-text">Cart Level Change</span>
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
                  <button type="button" className="page-link" onClick={() => fetchAudits(pagination.page - 1, 10)} disabled={pagination.page === 0}>
                    Previous
                  </button>
                </li>
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                  const pageNum = pagination.page < 3 ? i : pagination.page - 2 + i;
                  if (pageNum >= pagination.totalPages) return null;
                  return (
                    <li key={pageNum} className={`page-item ${pageNum === pagination.page ? 'active' : ''}`}>
                      <button type="button" className="page-link" onClick={() => fetchAudits(pageNum, 10)}>
                        {pageNum + 1}
                      </button>
                    </li>
                  );
                })}
                <li className={`page-item ${pagination.page >= pagination.totalPages - 1 ? 'disabled' : ''}`}>
                  <button type="button" className="page-link" onClick={() => fetchAudits(pagination.page + 1, 10)} disabled={pagination.page >= pagination.totalPages - 1}>
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

CartHistoryTimeline.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  cartId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  companyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default CartHistoryTimeline;
