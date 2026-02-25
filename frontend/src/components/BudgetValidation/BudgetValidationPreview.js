import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Badge, Alert } from 'reactstrap';
import BudgetService from '../../services/BudgetService';
import { getEntityId } from '../../pages/localStorageUtil';

// Enhanced currency formatting function
const formatCurrency = (amount, currency = 'USD') => {
  if (amount == null || Number.isNaN(Number(amount))) {
    return currency === 'USD' ? '$0.00' : `${currency} 0.00`;
  }
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(Number(amount));
};

const BudgetValidationPreview = ({ isOpen, toggle, cartItems, cartHeaderData, onValidationComplete }) => {
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const companyId = getEntityId();

  const previewValidation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if it's a single project validation or multi-project
      const uniqueProjects = [...new Set(cartItems.map(item => item.projectId).filter(Boolean))];
      
      // Use multi-project endpoint for all validations (unified API)
      const lineItems = cartItems.map(item => ({
        projectId: item.projectId || null,
        amount: (item.quantity || 1) * (item.unitPrice || 0),
        description: item.description || 'Cart item',
        glAccountId: item.glAccountId || null
      }));

      const validationRequest = {
        companyId,
        purchaseType: cartHeaderData.purchaseType.toLowerCase(), // This could be dynamic based on cart settings
        lineItems,
        excludeCartId: null // If needed for excluding current cart from calculations
      };
      
      console.log('Budget validation request:', validationRequest);
      
      if (uniqueProjects.length === 1) {
        // Single project - use single project endpoint
        const response = await BudgetService.previewBudgetValidation(companyId, validationRequest);
        setValidationResult(response.data);
      } else {
        // Multi-project - use multi-project endpoint
        const response = await BudgetService.previewMultiProjectBudgetValidation(companyId, validationRequest);
        setValidationResult(response.data);
      }
    } catch (err) {
      setError('Failed to validate budget. Please try again.');
      console.error('Error previewing budget validation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && cartItems && cartItems.length > 0) {
      previewValidation();
    }
  }, [isOpen, cartItems]);

  const handleProceed = async () => {
    if (validationResult) {
      try {
        onValidationComplete(true, validationResult);
        toggle();
      } catch (err) {
        setError('Failed to complete budget validation.');
        console.error('Error completing budget validation:', err);
      }
    }
  };

  const getBadgeColor = (status) => {
    switch (status) {
      case 'VALID': return 'success';
      case 'EXCEEDED': return 'danger';
      case 'WARNING': return 'warning';
      case 'INSUFFICIENT': return 'danger';
      default: return 'secondary';
    }
  };



  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>
        Budget Validation Preview
      </ModalHeader>
      <ModalBody className="p-3">
        {loading && (
          <div className="d-flex justify-content-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading validation...</span>
            </div>
          </div>
        )}

        {error && (
          <Alert color="danger">
            {error}
          </Alert>
        )}

        {validationResult && !loading && (
          <div>
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center p-3 border rounded">
                <div>
                  <strong className="text-dark">Total: {formatCurrency(validationResult.totalRequestedAmount || 0, 'USD')}</strong>
                  <small className="text-muted ms-2">({(validationResult.purchaseType || 'OPEX').toUpperCase()})</small>
                </div>
                <Badge 
                  color={getBadgeColor(validationResult.validationStatus || 'PENDING')}
                >
                  {validationResult.validationStatus || 'PENDING'}
                </Badge>
              </div>
              {validationResult.recommendation && (
                <div className="mt-2">
                  <Alert color="info" className="mb-2 py-2">
                    <strong>Recommendation:</strong> {validationResult.recommendation}
                  </Alert>
                </div>
              )}
            </div>

            {validationResult.lineItemResults && validationResult.lineItemResults.length > 0 && (
              <div className="mb-3">
                <h6 className="mb-2">Budget Impact</h6>
                {(() => {
                  // Group items by project for better organization
                  const groupedByProject = validationResult.lineItemResults.reduce((acc, item) => {
                    const projectKey = item.projectId || 'unassigned';
                    if (!acc[projectKey]) {
                      acc[projectKey] = {
                        projectName: item.projectName || 'Unassigned Project',
                        projectId: item.projectId,
                        items: [],
                        totalRequested: 0,
                        currentAvailable: item.currentAvailableBudget || 0,
                        newAvailable: item.newAvailableBudget || 0,
                        currentUtilized: item.currentUtilizedBudget || 0,
                        newUtilized: item.newUtilizedBudget || 0,
                        totalAllocated: item.currentAllocatedBudget || 0,
                        hasExceededBudget: false,
                        hasWarnings: false
                      };
                    }
                    acc[projectKey].items.push(item);
                    acc[projectKey].totalRequested += (item.requestedAmount || 0);
                    
                    // Check if any item exceeds budget or has warnings
                    if (item.wouldExceedBudget || item.validationStatus === 'EXCEEDED') {
                      acc[projectKey].hasExceededBudget = true;
                    }
                    if (item.validationStatus === 'WARNING') {
                      acc[projectKey].hasWarnings = true;
                    }
                    
                    return acc;
                  }, {});
                  
                  // Helper function to get meaningful project status
                  const getProjectStatus = (project) => {
                    if (project.hasExceededBudget) {
                      return { text: 'Over Budget', color: 'danger' };
                    }
                    if (project.hasWarnings) {
                      return { text: 'Warning', color: 'warning' };
                    }
                    if (project.newAvailable < 0) {
                      return { text: 'Insufficient Budget', color: 'danger' };
                    }
                    return { text: 'Within Budget', color: 'success' };
                  };

                  return Object.values(groupedByProject).map((project) => {
                    const projectStatus = getProjectStatus(project);
                    const overAmount = project.newAvailable < 0 ? Math.abs(project.newAvailable) : 0;
                    
                    return (
                      <div key={project.projectId || 'unassigned'} className="mb-3 border rounded">
                        {/* Project Header - Compact */}
                        <div className="px-3 py-2 border-bottom" style={{ backgroundColor: '#f8f9fa' }}>
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <strong className="text-dark">{project.projectName}</strong>
                              <span className="text-muted ms-2">({formatCurrency(project.totalRequested, 'USD')})</span>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              {overAmount > 0 && (
                                <small className="text-danger fw-bold">
                                  Over by {formatCurrency(overAmount, 'USD')}
                                </small>
                              )}
                              <Badge color={projectStatus.color} className="px-2 py-1">
                                {projectStatus.text}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Budget Summary - Simple */}
                        <div className="px-3 py-2 border-bottom">
                          <div className="row text-center">
                            <div className="col-3">
                              <small className="text-muted d-block">Allocated</small>
                              <strong>{formatCurrency(project.totalAllocated, 'USD')}</strong>
                            </div>
                            <div className="col-3">
                              <small className="text-muted d-block">Used</small>
                              <strong>{formatCurrency(project.currentUtilized, 'USD')}</strong>
                            </div>
                            <div className="col-3">
                              <small className="text-muted d-block">After Request</small>
                              <strong>{formatCurrency(project.newUtilized, 'USD')}</strong>
                            </div>
                            <div className="col-3">
                              <small className="text-muted d-block">Left After</small>
                              <strong className={project.newAvailable < 0 ? 'text-danger' : 'text-dark'}>
                                {formatCurrency(project.newAvailable, 'USD')}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* Items List - Compact */}
                        <div className="px-3 pb-2">
                          <small className="text-muted">Items ({project.items.length})</small>
                          {project.items.map((item) => {
                            // Get the correct quantity from the original cart item
                            const cartItem = cartItems.find(ci => ci.description === item.description);
                            const quantity = cartItem?.quantity || 1;
                            const unitPrice = cartItem?.unitPrice || 0;
                            
                            return (
                              <div key={`${item.projectId || 'unassigned'}-${item.description?.replace(/\s+/g, '-')?.substring(0, 30) || 'no-desc'}-${item.requestedAmount || 0}`} 
                                   className="d-flex justify-content-between align-items-center py-1 border-bottom">
                                <div className="flex-grow-1 me-2">
                                  <div className="text-truncate" style={{ maxWidth: '250px' }} title={item.description}>
                                    {item.description}
                                  </div>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                  <small className="text-muted">{quantity} × {formatCurrency(unitPrice, 'USD')}</small>
                                  <strong>{formatCurrency(item.requestedAmount || 0, 'USD')}</strong>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}


            {validationResult.warnings && validationResult.warnings.length > 0 && (
              <div className="mb-4">
                <h6>Warnings</h6>
                {validationResult.warnings.map((warning) => (
                  <Alert key={`warning-${warning.substring(0, 30)}`} color="warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {warning}
                  </Alert>
                ))}
              </div>
            )}

            {validationResult.violations && validationResult.violations.length > 0 && (
              <div className="mb-4">
                <h6>Violations</h6>
                {validationResult.violations.map((violation) => (
                  <Alert key={`violation-${violation.substring(0, 30)}`} color="danger">
                    <i className="fas fa-times-circle me-2"></i>
                    {violation}
                  </Alert>
                ))}
              </div>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle}>
          Cancel
        </Button>
        {validationResult && (
          <Button 
            color={validationResult.validationStatus === 'VALID' ? "primary" : "warning"} 
            onClick={handleProceed}
            disabled={loading}
          >
            {validationResult.validationStatus === 'VALID' ? "Continue" : "Convert Anyway"}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
};

BudgetValidationPreview.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  cartItems: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    quantity: PropTypes.number,
    unitPrice: PropTypes.number,
    totalPrice: PropTypes.number,
    description: PropTypes.string,
    partId: PropTypes.string,
  })).isRequired,
  cartHeaderData: PropTypes.node,
  onValidationComplete: PropTypes.func,
};

BudgetValidationPreview.defaultProps = {
  onValidationComplete: () => {},
};

export default BudgetValidationPreview;