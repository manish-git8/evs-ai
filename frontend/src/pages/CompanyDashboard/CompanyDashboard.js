import React, { useState, useEffect } from 'react';
import {
  Badge,
  Spinner,
  Alert,
  Button,
  Row,
  Col
} from 'reactstrap';
import { toast } from 'react-toastify';
import CompanyService from '../../services/CompanyService';
import ComponentCard from '../../components/ComponentCard';
import { getEntityId } from '../localStorageUtil';

const CompanyDashboard = () => {
  const companyId = getEntityId();
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0
  });

  const fetchAudits = async (page = 0) => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      const response = await CompanyService.getCompanyAudits(companyId, page, pagination.size);
      const { data } = response;
      
      setAudits(data.content || []);
      setPagination({
        page: data.number || data.pageNumber || 0,
        size: data.size || data.pageSize || 10,
        totalElements: data.totalElements || 0,
        totalPages: data.totalPages || 0
      });
    } catch (error) {
      console.error('Error fetching company audits:', error);
      toast.error('Failed to load company audit history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchAudits(0);
    }
  }, [companyId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount) => {
    if (amount == null || Number.isNaN(Number(amount))) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Number(amount));
  };

  const getChangeTypeStyle = (changeType) => {
    const styles = {
      CREATE: { color: 'dark', icon: 'bi-plus-circle' },
      UPDATE: { color: 'dark', icon: 'bi-pencil-square' },
      DELETE: { color: 'dark', icon: 'bi-trash' },
      STATUS_CHANGE: { color: 'dark', icon: 'bi-arrow-repeat' },
      APPROVE: { color: 'dark', icon: 'bi-check-circle' },
      REJECT: { color: 'dark', icon: 'bi-x-circle' },
      LINE_ITEM_ADD: { color: 'dark', icon: 'bi-plus-square' },
      LINE_ITEM_UPDATE: { color: 'dark', icon: 'bi-pencil' },
      LINE_ITEM_DELETE: { color: 'dark', icon: 'bi-dash-square' },
      CONFIRM: { color: 'dark', icon: 'bi-check2-square' },
      SHIP: { color: 'dark', icon: 'bi-truck' },
      DELIVER: { color: 'dark', icon: 'bi-house-check' }
    };
    return styles[changeType] || { color: 'dark', icon: 'bi-circle' };
  };

  const getReadableChangeType = (changeType, entityType) => {
    const entityLabels = {
      CART: 'Cart',
      PURCHASE_ORDER: 'PO',
      INVOICE: 'Invoice', 
      GRN: 'GRN'
    };
    
    const entityName = entityLabels[entityType] || entityType || 'Cart';
    
    const combinedLabels = {
      CREATE: `${entityName} Created`,
      UPDATE: `${entityName} Updated`,
      DELETE: `${entityName} Deleted`,
      STATUS_CHANGE: `${entityName} Status Changed`,
      APPROVE: `${entityName} Approved`,
      REJECT: `${entityName} Rejected`,
      LINE_ITEM_ADD: `${entityName} Item Added`,
      LINE_ITEM_UPDATE: `${entityName} Item Updated`,
      LINE_ITEM_DELETE: `${entityName} Item Deleted`,
      CONFIRM: `${entityName} Confirmed`,
      SHIP: `${entityName} Shipped`,
      DELIVER: `${entityName} Delivered`
    };
    
    return combinedLabels[changeType] || `${entityName} ${changeType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}`;
  };


  const renderChangeDetails = (audit) => {
    const { changeType } = audit;
    
    return (
      <div className="change-details">
        {/* Entity Information */}
        <div className="d-flex align-items-center gap-2 mb-2">
          {audit.entityName && (
            <span className="badge border text-dark small" title={audit.entityName}>
              {audit.entityName.length > 30 ? `${audit.entityName.substring(0, 30)}...` : audit.entityName}
            </span>
          )}
          {audit.entityStatus && (
            <span className="badge border text-muted small">{audit.entityStatus}</span>
          )}
        </div>

        {/* Project Information */}
        {audit.project && (
          <div className="mb-2">
            <div className="d-flex align-items-center gap-2 mb-1">
              <i className="bi bi-folder text-muted"></i>
              <span className="badge border text-primary small">{audit.project.name}</span>
            </div>
            {audit.project.description && (
              <small className="text-muted d-block">{audit.project.description}</small>
            )}
            {audit.project.notes && (
              <small className="text-muted d-block mt-1">
                <i className="bi bi-sticky me-1"></i>
                {audit.project.notes}
              </small>
            )}
          </div>
        )}

        {/* Department Changes */}
        {(audit.oldDepartment || audit.newDepartment) && (
          <div className="mb-2">
            <div className="d-flex align-items-center gap-2 mb-1">
              <i className="bi bi-building text-muted"></i>
              <span className="small fw-bold text-muted">Department Change:</span>
            </div>
            <div className="ps-3">
              {audit.oldDepartment && audit.newDepartment ? (
                <div className="d-flex align-items-center gap-2">
                  <span className="badge border text-muted small">{audit.oldDepartment.name}</span>
                  <i className="bi bi-arrow-right text-muted"></i>
                  <span className="badge border text-dark small">{audit.newDepartment.name}</span>
                </div>
              ) : audit.newDepartment ? (
                <span className="badge border text-success small">Added: {audit.newDepartment.name}</span>
              ) : (
                <span className="badge border text-danger small">Removed: {audit.oldDepartment.name}</span>
              )}
              {(audit.newDepartment?.description || audit.oldDepartment?.description) && (
                <div className="mt-1">
                  <small className="text-muted">
                    {audit.newDepartment?.description || audit.oldDepartment?.description}
                  </small>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Class Changes */}
        {(audit.oldClass || audit.newClass) && (
          <div className="mb-2">
            <div className="d-flex align-items-center gap-2 mb-1">
              <i className="bi bi-tag text-muted"></i>
              <span className="small fw-bold text-muted">Class Change:</span>
            </div>
            <div className="ps-3">
              {audit.oldClass && audit.newClass ? (
                <div className="d-flex align-items-center gap-2">
                  <span className="badge border text-muted small">{audit.oldClass.name}</span>
                  <i className="bi bi-arrow-right text-muted"></i>
                  <span className="badge border text-dark small">{audit.newClass.name}</span>
                </div>
              ) : audit.newClass ? (
                <span className="badge border text-success small">Added: {audit.newClass.name}</span>
              ) : (
                <span className="badge border text-danger small">Removed: {audit.oldClass.name}</span>
              )}
              {(audit.newClass?.description || audit.oldClass?.description) && (
                <div className="mt-1">
                  <small className="text-muted">
                    {audit.newClass?.description || audit.oldClass?.description}
                  </small>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Project Changes */}
        {(audit.oldProject || audit.newProject) && (
          <div className="mb-2">
            <div className="d-flex align-items-center gap-2 mb-1">
              <i className="bi bi-folder text-muted"></i>
              <span className="small fw-bold text-muted">Project Change:</span>
            </div>
            <div className="ps-3">
              {audit.oldProject && audit.newProject ? (
                <div className="d-flex align-items-center gap-2">
                  <span className="badge border text-muted small">{audit.oldProject.name}</span>
                  <i className="bi bi-arrow-right text-muted"></i>
                  <span className="badge border text-dark small">{audit.newProject.name}</span>
                </div>
              ) : audit.newProject ? (
                <span className="badge border text-success small">Added: {audit.newProject.name}</span>
              ) : (
                <span className="badge border text-danger small">Removed: {audit.oldProject.name}</span>
              )}
            </div>
          </div>
        )}

        {/* GL Account Changes */}
        {(audit.oldGLAccount || audit.newGLAccount) && (
          <div className="mb-2">
            <div className="d-flex align-items-center gap-2 mb-1">
              <i className="bi bi-wallet text-muted"></i>
              <span className="small fw-bold text-muted">GL Account Change:</span>
            </div>
            <div className="ps-3">
              {audit.oldGLAccount && audit.newGLAccount ? (
                <div className="d-flex align-items-center gap-2">
                  <span className="badge border text-muted small">{audit.oldGLAccount.name}</span>
                  <i className="bi bi-arrow-right text-muted"></i>
                  <span className="badge border text-dark small">{audit.newGLAccount.name}</span>
                </div>
              ) : audit.newGLAccount ? (
                <span className="badge border text-success small">Added: {audit.newGLAccount.name}</span>
              ) : (
                <span className="badge border text-danger small">Removed: {audit.oldGLAccount.name}</span>
              )}
            </div>
          </div>
        )}

        {/* Location Changes */}
        {(audit.oldLocation || audit.newLocation) && (
          <div className="mb-2">
            <div className="d-flex align-items-center gap-2 mb-1">
              <i className="bi bi-geo-alt text-muted"></i>
              <span className="small fw-bold text-muted">Location Change:</span>
            </div>
            <div className="ps-3">
              {audit.oldLocation && audit.newLocation ? (
                <div className="d-flex align-items-center gap-2">
                  <span className="badge border text-muted small">{audit.oldLocation.name}</span>
                  <i className="bi bi-arrow-right text-muted"></i>
                  <span className="badge border text-dark small">{audit.newLocation.name}</span>
                </div>
              ) : audit.newLocation ? (
                <span className="badge border text-success small">Added: {audit.newLocation.name}</span>
              ) : (
                <span className="badge border text-danger small">Removed: {audit.oldLocation.name}</span>
              )}
            </div>
          </div>
        )}

        {/* Line Item Information */}
        {audit.lineItemDescription && (
          <div className="mb-2">
            <div className="d-flex align-items-center gap-2 mb-1">
              <i className="bi bi-box text-muted"></i>
              <span className="small fw-bold text-muted">Item:</span>
            </div>
            <div className="ps-3">
              <div className="small text-dark mb-1">{audit.lineItemDescription}</div>
              <div className="d-flex align-items-center gap-3">
                {audit.newQuantity && (
                  <small className="text-muted">
                    <i className="bi bi-123 me-1"></i>
                    Qty: {audit.oldQuantity || 0} → {audit.newQuantity}
                  </small>
                )}
                {audit.newUnitPrice && (
                  <small className="text-muted">
                    <i className="bi bi-tag me-1"></i>
                    Price: {formatCurrency(audit.oldUnitPrice || 0)} → {formatCurrency(audit.newUnitPrice)}
                  </small>
                )}
                {audit.newLineAmount && (
                  <small className="text-muted">
                    <i className="bi bi-calculator me-1"></i>
                    Total: {formatCurrency(audit.oldLineAmount || 0)} → {formatCurrency(audit.newLineAmount)}
                  </small>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status Changes */}
        {audit.changeType === 'STATUS_CHANGE' && audit.oldValue && audit.newValue && (
          <div className="mb-2">
            <div className="d-flex align-items-center gap-2 mb-1">
              <i className="bi bi-arrow-repeat text-muted"></i>
              <span className="small fw-bold text-muted">Status Change:</span>
            </div>
            <div className="ps-3 d-flex align-items-center gap-2">
              <span className="badge bg-secondary text-white small">{audit.oldValue.replace(/_/g, ' ').toUpperCase()}</span>
              <i className="bi bi-arrow-right text-muted"></i>
              <span className="badge bg-success text-white small">{audit.newValue.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>
        )}

        {/* Field Changes */}
        {audit.fieldChanged && audit.changeType !== 'STATUS_CHANGE' && (
          <div className="mb-2">
            <div className="d-flex align-items-center gap-2 mb-1">
              <i className="bi bi-arrow-left-right text-muted"></i>
              <span className="small fw-bold text-muted">Field Changed: {audit.fieldChanged}</span>
            </div>
            {audit.fieldChanged === 'AccountSettings' ? (
              <div className="ps-3">
                <span className="badge border text-info small">Account settings updated</span>
                {(audit.oldDepartment || audit.newDepartment || audit.oldClass || audit.newClass) && (
                  <div className="mt-1">
                    <small className="text-muted">Settings modified including department/class changes</small>
                  </div>
                )}
              </div>
            ) : audit.oldValue && audit.newValue ? (
              <div className="ps-3 d-flex align-items-center gap-2">
                <span className="badge border text-muted small">{audit.oldValue}</span>
                <i className="bi bi-arrow-right text-muted"></i>
                <span className="badge border text-dark small">{audit.newValue}</span>
              </div>
            ) : audit.oldValue || audit.newValue ? (
              <div className="ps-3">
                <span className="badge border text-warning small">
                  {audit.oldValue ? `From: ${audit.oldValue}` : `To: ${audit.newValue}`}
                </span>
              </div>
            ) : (
              <div className="ps-3">
                <span className="badge border text-info small">Field updated</span>
              </div>
            )}
          </div>
        )}

        {/* Approval Information */}
        {(changeType === 'APPROVE' || changeType === 'REJECT') && (
          <div className="mb-2">
            {audit.approverUser && (
              <div className="d-flex align-items-center gap-2 mb-1">
                <i className="bi bi-person-check text-muted"></i>
                <span className="small">
                  {audit.approverUser.firstName} {audit.approverUser.lastName}
                  {audit.approvalLevel && <span className="text-muted"> (Level {audit.approvalLevel})</span>}
                </span>
              </div>
            )}
            {audit.approvalComments && (
              <div className="alert alert-light py-1 px-2 mb-0" style={{ fontSize: '11px' }}>
                <i className="bi bi-chat-quote me-1"></i>
                {audit.approvalComments}
              </div>
            )}
          </div>
        )}

        {/* Purchase Type */}
        {audit.purchaseType && (
          <div className="mb-1">
            <span className={`badge ${audit.purchaseType === 'CAPEX' ? 'bg-primary' : 'bg-success'} text-white small`}>
              {audit.purchaseType}
            </span>
          </div>
        )}
      </div>
    );
  };

  const handlePageChange = (newPage) => {
    fetchAudits(newPage);
  };

  if (loading && audits.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner color="primary" />
        <span className="ms-2">Loading company audit history...</span>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '24px' }}>
      <Row>
        <Col lg="12" sm="12">
          <ComponentCard
            title={
              <div className="d-flex justify-content-between align-items-center w-100">
                <div className="d-flex align-items-center gap-3">
                  <div className="icon-wrapper" style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#009efb',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid rgba(0, 158, 251, 0.1)'
                  }}>
                    <i className="bi bi-activity text-white" style={{ fontSize: '18px' }}></i>
                  </div>
                  <div>
                    <h4 className="mb-1">Company Dashboard</h4>
                    <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                      Company-wide audit trail and activity timeline
                    </p>
                  </div>
                </div>
                {pagination.totalElements > 0 && (
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-light text-dark border" style={{ fontSize: '11px' }}>
                      {pagination.totalElements.toLocaleString()} activities
                    </span>
                    <Button 
                      color="primary" 
                      size="sm"
                      onClick={() => fetchAudits(0)}
                      title="Refresh"
                      style={{ borderRadius: '6px' }}
                    >
                      <i className="bi bi-arrow-clockwise"></i>
                    </Button>
                  </div>
                )}
              </div>
            }
          >
            <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {!loading && audits.length === 0 && (
            <Alert color="info">
              <i className="bi bi-info-circle me-2"></i>
              No audit history available for this company.
            </Alert>
          )}

          {audits.length > 0 && (
            <div className="timeline">
              {audits.map((audit, index) => {
                const style = getChangeTypeStyle(audit.changeType);
                return (
                  <div key={audit.auditId} className="timeline-item mb-3">
                    <div className="d-flex">
                      <div className="timeline-marker me-3">
                        <div 
                          className="bg-light border rounded-circle d-flex align-items-center justify-content-center"
                          style={{ width: '36px', height: '36px', minWidth: '36px' }}
                        >
                          <i className={`${style.icon} text-dark`} style={{ fontSize: '14px' }}></i>
                        </div>
                        {index < audits.length - 1 && (
                          <div 
                            className="timeline-line border-start"
                            style={{ 
                              width: '1px', 
                              height: '100%', 
                              position: 'absolute', 
                              left: '17.5px', 
                              top: '44px',
                              zIndex: 0 
                            }}
                          ></div>
                        )}
                      </div>
                      <div className="timeline-content flex-grow-1">
                        <div className="card border-0 shadow-sm">
                          <div className="card-body px-3 py-2">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <div className="d-flex align-items-center gap-2">
                                <Badge 
                                  color={
                                    audit.changeType === 'DELETE' || audit.changeType === 'LINE_ITEM_DELETE' 
                                      ? 'danger' 
                                      : audit.changeType === 'STATUS_CHANGE'
                                      ? 'warning'
                                      : audit.changeType === 'CREATE' || audit.changeType === 'LINE_ITEM_ADD'
                                      ? 'success'
                                      : 'primary'
                                  }
                                  className="text-white border px-2 py-1" 
                                  style={{ fontSize: '11px' }}
                                >
                                  {getReadableChangeType(audit.changeType, audit.entityType)}
                                </Badge>
                              </div>
                              <small className="text-muted" style={{ fontSize: '11px' }}>
                                {formatDate(audit.changedDate)}
                              </small>
                            </div>
                            
                            {/* Change details */}
                            <div className="mb-2" style={{ fontSize: '13px' }}>
                              {renderChangeDetails(audit)}
                            </div>
                            
                            {/* Footer with user and reason */}
                            <div className="d-flex justify-content-between align-items-center pt-2 border-top" style={{ borderColor: '#f0f0f0 !important' }}>
                              <span className="text-muted d-flex align-items-center" style={{ fontSize: '11px' }}>
                                <i className="bi bi-person-circle me-1"></i>
                                Changed by {audit.changedBy ? 
                                  `${audit.changedBy.firstName} ${audit.changedBy.lastName}` : 
                                  'System'
                                }
                                {audit.changedBy?.department && (
                                  <span className="text-muted ms-1">({audit.changedBy.department})</span>
                                )}
                              </span>
                              {audit.changeReason && (
                                <span className="text-muted text-truncate ms-2" style={{ fontSize: '11px', maxWidth: '200px' }} title={audit.changeReason}>
                                  <i className="bi bi-chat-dots me-1"></i>
                                  {audit.changeReason}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {loading && audits.length > 0 && (
            <div className="d-flex justify-content-center py-3">
              <Spinner size="sm" color="primary" />
              <span className="ms-2 small">Loading more...</span>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${pagination.page === 0 ? 'disabled' : ''}`}>
                    <button 
                      type="button"
                      className="page-link" 
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 0}
                    >
                      Previous
                    </button>
                  </li>
                  {Array.from({ length: Math.min(pagination.totalPages, 10) }, (_, i) => {
                    const pageNum = pagination.page < 5 ? i : pagination.page - 5 + i;
                    if (pageNum >= pagination.totalPages) return null;
                    return (
                      <li key={`page-${pageNum}-total-${pagination.totalPages}`} className={`page-item ${pageNum === pagination.page ? 'active' : ''}`}>
                        <button 
                          type="button"
                          className="page-link" 
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum + 1}
                        </button>
                      </li>
                    );
                  })}
                  <li className={`page-item ${pagination.page >= pagination.totalPages - 1 ? 'disabled' : ''}`}>
                    <button 
                      type="button"
                      className="page-link" 
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages - 1}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
            </div>
          </ComponentCard>
        </Col>
      </Row>
    </div>
  );
};

export default CompanyDashboard;