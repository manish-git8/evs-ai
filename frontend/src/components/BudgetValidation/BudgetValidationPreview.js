import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Badge, Alert } from 'reactstrap';
import BudgetService from '../../services/BudgetService';
import { getEntityId, formatCurrency } from '../../pages/localStorageUtil';

// Helper to restore body scroll - runs multiple times to ensure cleanup
const restoreBodyScroll = () => {
  const cleanup = () => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.classList.remove('modal-open');
    // Also remove any leftover backdrop
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
  };

  // Run immediately
  cleanup();
  // Run again after short delay (in case Modal re-adds)
  setTimeout(cleanup, 50);
  setTimeout(cleanup, 150);
  setTimeout(cleanup, 300);
};

const BudgetValidationPreview = ({ isOpen, toggle, cartItems, cartHeaderData, onValidationComplete }) => {
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [displayItems, setDisplayItems] = useState([]);
  const companyId = getEntityId();

  // Use refs to always get latest values (avoids stale closure issues)
  const cartItemsRef = useRef(cartItems);
  const cartHeaderDataRef = useRef(cartHeaderData);
  const isOpenRef = useRef(false);

  // Keep refs updated with latest props
  useEffect(() => {
    cartItemsRef.current = cartItems;
    cartHeaderDataRef.current = cartHeaderData;
  }, [cartItems, cartHeaderData]);

  // Run validation when modal opens
  useEffect(() => {
    isOpenRef.current = isOpen;

    if (!isOpen) {
      // Reset when modal closes
      setValidationResult(null);
      setLoading(false);
      setError(null);
      setDisplayItems([]);
      // Ensure body scroll is restored
      restoreBodyScroll();
      return;
    }

    // Get latest cart items from ref
    const currentCartItems = cartItemsRef.current;
    const currentCartHeaderData = cartHeaderDataRef.current;

    if (!currentCartItems || currentCartItems.length === 0) {
      return;
    }

    const runValidation = async () => {
      try {
        setLoading(true);
        setError(null);

        // Store cart items for display - use values exactly as passed
        // cartItems from parent has: quantity, unitPrice, totalPrice, description, projectId, etc.
        const itemsForDisplay = currentCartItems.map((item, index) => ({
          ...item,
          _index: index,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice || (item.quantity || 1) * (item.unitPrice || 0),
          description: item.description || item.partId || `Item ${index + 1}`,
        }));

        console.log('BudgetValidationPreview - cartItems received:', currentCartItems);
        console.log('BudgetValidationPreview - itemsForDisplay:', itemsForDisplay);

        if (!isOpenRef.current) return;
        setDisplayItems(itemsForDisplay);

        const uniqueProjects = [...new Set(currentCartItems.map(item => item.projectId).filter(Boolean))];

        const lineItems = itemsForDisplay.map((item) => ({
          projectId: item.projectId || null,
          amount: item.totalPrice,
          description: item.description,
          glAccountId: item.glAccountId || null
        }));

        const validationRequest = {
          companyId,
          purchaseType: currentCartHeaderData?.purchaseType?.toLowerCase() || 'opex',
          lineItems,
          excludeCartId: null
        };

        console.log('Budget validation request:', validationRequest);

        let response;
        if (uniqueProjects.length <= 1) {
          response = await BudgetService.previewBudgetValidation(companyId, validationRequest);
        } else {
          response = await BudgetService.previewMultiProjectBudgetValidation(companyId, validationRequest);
        }

        if (!isOpenRef.current) return;
        setValidationResult(response.data);
      } catch (err) {
        if (!isOpenRef.current) return;
        setError('Failed to validate budget. Please try again.');
        console.error('Error previewing budget validation:', err);
      } finally {
        if (isOpenRef.current) {
          setLoading(false);
        }
      }
    };

    runValidation();
  }, [isOpen, companyId]);

  const handleProceed = useCallback(() => {
    if (validationResult) {
      restoreBodyScroll();
      onValidationComplete(true, validationResult);
      toggle();
    }
  }, [validationResult, onValidationComplete, toggle]);

  const handleCancel = useCallback(() => {
    isOpenRef.current = false;
    restoreBodyScroll();
    toggle();
  }, [toggle]);

  const getBadgeColor = (status) => {
    switch (status) {
      case 'VALID': return 'success';
      case 'EXCEEDED': return 'danger';
      case 'WARNING': return 'warning';
      case 'INSUFFICIENT': return 'danger';
      default: return 'secondary';
    }
  };

  // Callback when modal has fully closed - proper cleanup point
  const handleModalClosed = useCallback(() => {
    // Force cleanup after modal animation completes
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.classList.remove('modal-open');
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      toggle={handleCancel}
      size="lg"
      onClosed={handleModalClosed}
      unmountOnClose={true}
      returnFocusAfterClose={false}
      scrollable={true}
    >
      <ModalHeader toggle={handleCancel}>
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
                  <strong className="text-dark">Total: {formatCurrency(validationResult.totalRequestedAmount || 0)}</strong>
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
                  const groupedByProject = validationResult.lineItemResults.reduce((acc, item, idx) => {
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
                    const displayItem = displayItems[idx] || {};
                    acc[projectKey].items.push({ ...item, displayItem });
                    acc[projectKey].totalRequested += (item.requestedAmount || 0);

                    if (item.wouldExceedBudget || item.validationStatus === 'EXCEEDED') {
                      acc[projectKey].hasExceededBudget = true;
                    }
                    if (item.validationStatus === 'WARNING') {
                      acc[projectKey].hasWarnings = true;
                    }

                    return acc;
                  }, {});

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
                        <div className="px-3 py-2 border-bottom" style={{ backgroundColor: '#f8f9fa' }}>
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <strong className="text-dark">{project.projectName}</strong>
                              <span className="text-muted ms-2">({formatCurrency(project.totalRequested)})</span>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              {overAmount > 0 && (
                                <small className="text-danger fw-bold">
                                  Over by {formatCurrency(overAmount)}
                                </small>
                              )}
                              <Badge color={projectStatus.color} className="px-2 py-1">
                                {projectStatus.text}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="px-3 py-2 border-bottom">
                          <div className="row text-center">
                            <div className="col-3">
                              <small className="text-muted d-block">Allocated</small>
                              <strong>{formatCurrency(project.totalAllocated)}</strong>
                            </div>
                            <div className="col-3">
                              <small className="text-muted d-block">Used</small>
                              <strong>{formatCurrency(project.currentUtilized)}</strong>
                            </div>
                            <div className="col-3">
                              <small className="text-muted d-block">After Request</small>
                              <strong>{formatCurrency(project.newUtilized)}</strong>
                            </div>
                            <div className="col-3">
                              <small className="text-muted d-block">Left After</small>
                              <strong className={project.newAvailable < 0 ? 'text-danger' : 'text-dark'}>
                                {formatCurrency(project.newAvailable)}
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div className="px-3 pb-2">
                          <small className="text-muted">Items ({project.items.length})</small>
                          {project.items.map((item, itemIndex) => {
                            const qty = item.displayItem?.quantity || 1;
                            const price = item.displayItem?.unitPrice || 0;
                            const desc = item.displayItem?.description || item.description || `Item ${itemIndex + 1}`;
                            const lineTotal = item.requestedAmount || (qty * price);

                            return (
                              <div key={`${project.projectId || 'unassigned'}-${itemIndex}`}
                                   className="d-flex justify-content-between align-items-center py-1 border-bottom">
                                <div className="flex-grow-1 me-2">
                                  <div className="text-truncate" style={{ maxWidth: '250px' }} title={desc}>
                                    {desc}
                                  </div>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                  <small className="text-muted">{qty} × {formatCurrency(price)}</small>
                                  <strong>{formatCurrency(lineTotal)}</strong>
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
                {validationResult.warnings.map((warning, idx) => (
                  <Alert key={`warning-${idx}`} color="warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {warning}
                  </Alert>
                ))}
              </div>
            )}

            {validationResult.violations && validationResult.violations.length > 0 && (
              <div className="mb-4">
                <h6>Violations</h6>
                {validationResult.violations.map((violation, idx) => (
                  <Alert key={`violation-${idx}`} color="danger">
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
        <Button color="secondary" onClick={handleCancel}>
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
  cartHeaderData: PropTypes.object,
  onValidationComplete: PropTypes.func,
};

BudgetValidationPreview.defaultProps = {
  onValidationComplete: () => {},
};

export default BudgetValidationPreview;
