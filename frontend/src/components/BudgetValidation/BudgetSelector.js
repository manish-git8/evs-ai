import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Badge, Alert, Spinner } from 'reactstrap';
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

const BudgetSelector = ({ onBudgetSelect, cartItems = [], purchaseType = 'opex' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [budgetSummary, setBudgetSummary] = useState({ overallStatus: 'LOADING' });
  const companyId = getEntityId();
  const [budgetPreviewLoading, setBudgetPreviewLoading] = useState(false);

  // Remove budget utilization API - we'll get all data from preview API
  const initializeComponent = () => {
    setLoading(false);
  };

  useEffect(() => {
    initializeComponent();
  }, []);

  const createBudgetSummary = () => {
    // Group cart items by project
    const projectGroups = cartItems.reduce((acc, item) => {
      const { projectId } = item;
      if (!projectId) return acc;

      if (!acc[projectId]) {
        acc[projectId] = {
          projectId,
          items: [],
          totalAmount: 0,
        };
      }

      const itemAmount = (item.quantity || 1) * (item.unitPrice || 0);
      acc[projectId].items.push({
        description: item.description || 'Cart item',
        amount: itemAmount,
      });
      acc[projectId].totalAmount += itemAmount;

      return acc;
    }, {});

    const projectSummaries = Object.values(projectGroups);
    const totalRequested = projectSummaries.reduce((sum, p) => sum + p.totalAmount, 0);

    return {
      projectSummaries,
      totalRequested,
      isValid: false, // Will be set by API
      overallStatus: 'PENDING',
    };
  };

  const getStatusMessageFromAPI = (apiResult) => {
    switch (apiResult.validationStatus) {
      case 'VALID':
        return 'All budgets validated and sufficient';
      case 'WARNING':
        return apiResult.recommendation || 'Budget validation has warnings';
      case 'EXCEEDED':
        return 'Budget limits exceeded';
      case 'INSUFFICIENT':
        return 'Insufficient budget available';
      default:
        return apiResult.recommendation || 'Budget validation required';
    }
  };

  const getValidationFromAPI = async (summary) => {
    try {
      setBudgetSummary({ ...summary, overallStatus: 'LOADING' });
      // Prepare line items for budget validation API
      const lineItems = (cartItems || []).map((item) => ({
        projectId: item.projectId || null,
        amount: (item.quantity || 1) * (item.unitPrice || 0),
        description: item.description || 'Cart item',
        glAccountId: item.glAccountId || null,
      }));

      const validationRequest = {
        companyId,
        purchaseType: purchaseType.toLowerCase(),
        lineItems,
      };

      console.log('Preview API Request:', validationRequest);
      const uniqueProjects = [
        ...new Set((cartItems || []).map((item) => item.projectId).filter(Boolean)),
      ];
      let validationResponse;

      setBudgetPreviewLoading(true);

      try {
        if (uniqueProjects.length === 1) {
          validationResponse = await BudgetService.previewBudgetValidation(
            companyId,
            validationRequest,
          );
        } else {
          validationResponse = await BudgetService.previewMultiProjectBudgetValidation(
            companyId,
            validationRequest,
          );
        }
      } finally {
        setBudgetPreviewLoading(false);
      }

      const apiResult = validationResponse.data;
      console.log('Preview API Response:', apiResult);

      // Create project validation map from API response lineItemResults
      const projectValidationMap = {};
      let totalAvailableBudget = 0;

      if (apiResult.lineItemResults && Array.isArray(apiResult.lineItemResults)) {
        // Group by project and get the most comprehensive data for each project
        apiResult.lineItemResults.forEach((lineItem) => {
          const { projectId } = lineItem;
          if (!projectValidationMap[projectId]) {
            projectValidationMap[projectId] = {
              projectId: lineItem.projectId,
              projectName: lineItem.projectName,
              validationStatus: lineItem.validationStatus,
              budgetAmount: lineItem.currentAllocatedBudget,
              availableBudget: lineItem.currentAvailableBudget,
              consumedBudget: lineItem.currentUtilizedBudget,
              newAvailableBudget: lineItem.newAvailableBudget,
              utilizationPercentage: lineItem.utilizationPercentage,
              wouldExceedBudget: lineItem.wouldExceedBudget,
              overrunAmount: lineItem.overrunAmount,
              warnings: lineItem.warnings || [],
              violations: lineItem.violations || [],
            };
            totalAvailableBudget += lineItem.currentAvailableBudget || 0;
          } else {
            // Update with worst case status (WARNING > VALID)
            if (
              lineItem.validationStatus === 'WARNING' &&
              projectValidationMap[projectId].validationStatus === 'VALID'
            ) {
              projectValidationMap[projectId].validationStatus = 'WARNING';
            }
            if (lineItem.validationStatus === 'EXCEEDED') {
              projectValidationMap[projectId].validationStatus = 'EXCEEDED';
            }
          }
        });
      }

      // Update project summaries with API validation data
      const updatedProjectSummaries = summary.projectSummaries.map((project) => {
        const apiValidation = projectValidationMap[project.projectId];

        // Determine validation status
        let validationStatus = 'NO_BUDGET';
        let validationMessage = `No ${purchaseType.toUpperCase()} budget found for this project`;

        if (apiValidation) {
          validationStatus = apiValidation.validationStatus;
          validationMessage =
            apiValidation.warnings?.length > 0
              ? apiValidation.warnings[0]
              : apiValidation.violations?.length > 0
              ? apiValidation.violations[0]
              : 'Budget validation completed';
        }

        return {
          ...project,
          // API validation status
          validationStatus,
          validationMessage,
          // Budget information from API
          budgetAmount: apiValidation?.budgetAmount || 0,
          availableBudget: apiValidation?.availableBudget || 0,
          consumedBudget: apiValidation?.consumedBudget || 0,
          newAvailableBudget: apiValidation?.newAvailableBudget || 0,
          utilizationPercentage: apiValidation?.utilizationPercentage || 0,
          // Project details
          projectName: apiValidation?.projectName || `Project ${project.projectId}`,
          // Status flags
          hasValidBudget: !!apiValidation,
          isOverBudget: apiValidation?.wouldExceedBudget || false,
          overrunAmount: apiValidation?.overrunAmount || 0,
        };
      });

      // Determine overall status based on individual project statuses
      const hasNoBudgetProjects = updatedProjectSummaries.some(
        (p) => p.validationStatus === 'NO_BUDGET',
      );
      const hasExceededProjects = updatedProjectSummaries.some(
        (p) => p.validationStatus === 'EXCEEDED',
      );
      const hasInvalidProjects = updatedProjectSummaries.some(
        (p) => p.validationStatus === 'INVALID',
      );
      const hasWarningProjects = updatedProjectSummaries.some(
        (p) => p.validationStatus === 'WARNING',
      );

      let overallStatus = apiResult.validationStatus;
      if (hasNoBudgetProjects) {
        overallStatus = 'NO_BUDGET';
      } else if (hasInvalidProjects) {
        overallStatus = 'INVALID';
      } else if (hasExceededProjects) {
        overallStatus = 'EXCEEDED';
      } else if (hasWarningProjects) {
        overallStatus = 'WARNING';
      }

      // Enhanced summary with API data
      const enhancedSummary = {
        ...summary,
        projectSummaries: updatedProjectSummaries,
        totalAvailable: totalAvailableBudget,
        // Overall status based on worst case from projects
        overallStatus,
        isValid: overallStatus === 'VALID',
        statusMessage: getStatusMessageFromAPI(apiResult),
        // API response details
        apiValidationStatus: apiResult.validationStatus,
        apiRecommendation: apiResult.recommendation,
        apiWarnings: apiResult.warnings || [],
        apiViolations: apiResult.violations || [],
      };

      setBudgetSummary(enhancedSummary);

      // Auto-notify parent component
      if (onBudgetSelect && typeof onBudgetSelect === 'function') {
        // Extract project data from API response - use project IDs as budget identifiers
        const budgetIds = Object.values(projectValidationMap)
          .map((pv) => `budget-${pv.projectId}`)
          .filter(Boolean);
        const budgetData = Object.values(projectValidationMap);

        onBudgetSelect(budgetIds, budgetData, enhancedSummary);
      }
    } catch (apiError) {
      console.error('Error getting validation from API:', apiError);
      setError(`Preview validation failed: ${apiError.message}`);
    }
  };

  // Create budget summary and get validation from preview API only
  useEffect(() => {
    if (cartItems && cartItems.length > 0) {
      const summary = createBudgetSummary();
      setBudgetSummary(summary);

      // Get validation status using only preview budget API
      getValidationFromAPI(summary);
    } else {
      setBudgetSummary(null);
    }
    // Remove onBudgetSelect from dependencies to prevent continuous calls
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems, purchaseType, companyId]);

  const getBudgetStatusColor = (validationStatus) => {
    switch (validationStatus) {
      case 'VALID':
        return 'success';
      case 'WARNING':
        return 'warning';
      case 'EXCEEDED':
      case 'INSUFFICIENT':
        return 'danger';
      case 'NO_BUDGET':
      case 'INVALID':
        return 'danger';
      case 'UNKNOWN':
        return 'secondary';
      case 'ERROR':
        return 'primary';
      default:
        return 'danger';
    }
  };

  const getStatusDisplayText = (validationStatus) => {
    switch (validationStatus) {
      case 'VALID':
        return 'Valid';
      case 'WARNING':
        return 'Warning';
      case 'EXCEEDED':
        return 'Exceeded';
      case 'INSUFFICIENT':
        return 'Insufficient';
      case 'NO_BUDGET':
        return 'No Budget';
      case 'INVALID':
        return 'Invalid';
      case 'UNKNOWN':
        return 'Unknown';
      case 'ERROR':
        return 'Pending';
      default:
        return 'Invalid';
    }
  };

  const BUDGET_STATUS_BG = {
    LOADING: {
      bg: '#e3f2fd',
      border: '#2196f3',
      badge: 'info',
    },
    VALID: {
      bg: '#d4edda',
      border: '#28a745',
      badge: 'success',
    },
    WARNING: {
      bg: '#fff3cd',
      border: '#ffc107',
      badge: 'warning',
    },
    EXCEEDED: {
      bg: '#f8d7da',
      border: '#dc3545',
      badge: 'danger',
    },
    INSUFFICIENT: {
      bg: '#f8d7da',
      border: '#dc3545',
      badge: 'danger',
    },
    NO_BUDGET: {
      bg: '#f8d7da',
      border: '#dc3545',
      badge: 'danger',
    },
    INVALID: {
      bg: '#f8d7da',
      border: '#dc3545',
      badge: 'danger',
    },
    ERROR: {
      bg: '#e2e3e5',
      border: '#6c757d',
      badge: 'secondary',
    },
    UNKNOWN: {
      bg: '#e2e3e5',
      border: '#6c757d',
      badge: 'secondary',
    },
  };

  const getBudgetUI = (status) => BUDGET_STATUS_BG[status] || BUDGET_STATUS_BG.INVALID;

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-3">
        <div className="spinner-border spinner-border-sm text-primary" role="status">
          <span className="visually-hidden">Loading budgets...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <Alert color="warning">{error}</Alert>;
  }

  return (
    <div>
      <div className="mb-3">
        <h6 className="text-primary mb-1">
          <i className="fas fa-calculator me-2"></i>
          Budget Validation - {purchaseType.toUpperCase()}
        </h6>
      </div>

      {budgetPreviewLoading && (
        <div className="d-flex align-items-center gap-2 p-2">
          <span className="spinner-border spinner-border-sm text-primary" />
          <small className="fw-bold text-muted">Checking budget...</small>
        </div>
      )}

      {budgetSummary?.overallStatus === 'LOADING' ? (
        <div className="text-center py-4">
          <Spinner color="primary" />
          <div className="mt-2 text-muted small">Checking budget availability...</div>
        </div>
      ) : budgetSummary ? (
        <div>
          <div
            className="d-flex justify-content-between align-items-center p-2 mb-2 rounded"
            style={{
              backgroundColor: getBudgetUI(budgetSummary.overallStatus).bg,
              border: `1px solid ${getBudgetUI(budgetSummary.overallStatus).border}`,
              fontSize: '0.85rem',
            }}
          >
            <div className="d-flex align-items-center gap-3">
              <span>
                <strong>Total Requesting: {formatCurrency(budgetSummary.totalRequested)}</strong>
              </span>
              <span>
                <strong>
                  Total Available: {formatCurrency(budgetSummary.totalAvailable || 0)}
                </strong>
              </span>
            </div>
            <Badge
              color={getBudgetStatusColor(budgetSummary.overallStatus)}
              style={{ fontSize: '0.7rem' }}
            >
              {getStatusDisplayText(budgetSummary.overallStatus)}
            </Badge>
          </div>

          <div className="row g-1">
            {budgetSummary.projectSummaries.map((project) => (
              <div key={project.projectId} className="col-md-12 mb-1">
                <div
                  className="border rounded p-2"
                  style={{ backgroundColor: '#f8f9fa', fontSize: '0.85rem' }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div className="d-flex align-items-center">
                      <small className="fw-bold text-dark me-2">
                        {project.projectName || `Project ${project.projectId}`}
                      </small>
                      <Badge
                        size="sm"
                        color={getBudgetStatusColor(project.validationStatus)}
                        style={{ fontSize: '0.65rem' }}
                      >
                        {getStatusDisplayText(project.validationStatus)}
                      </Badge>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.7rem' }}>
                    {(project.items || []).slice(0, 2).map((item, index) => (
                      <div
                        key={`${project.projectId}-item-${
                          item.description?.substring(0, 10)?.replace(/\s+/g, '') || index
                        }`}
                        className="text-muted"
                      >
                        <span>
                          •{' '}
                          {(item.description || '').length > 30
                            ? `${(item.description || '').substring(0, 30)}...`
                            : item.description || 'Cart item'}
                        </span>
                      </div>
                    ))}
                    {(project.items || []).length > 2 && (
                      <div className="text-muted">
                        <span>
                          ... and {(project.items || []).length - 2} more (
                          {(project.items || []).length} total)
                        </span>
                      </div>
                    )}
                  </div>

                  {project.hasValidBudget && (
                    <div
                      className="mt-1 p-1 rounded"
                      style={{
                        backgroundColor:
                          project.validationStatus === 'VALID'
                            ? '#f0f9ff'
                            : project.validationStatus === 'WARNING'
                            ? '#fffbf0'
                            : '#fff2f2',
                        fontSize: '0.65rem',
                      }}
                    >
                      <div className="d-flex justify-content-between text-muted mb-1">
                        <span>Total Budget: {formatCurrency(project.budgetAmount)}</span>
                        <span>Already Used: {formatCurrency(project.consumedBudget)}</span>
                      </div>
                      <div className="d-flex justify-content-between text-muted mb-1">
                        <span>Available Now: {formatCurrency(project.availableBudget)}</span>
                        <span>After This Order: {formatCurrency(project.newAvailableBudget)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {budgetSummary.overallStatus === 'NO_BUDGET' && (
            <Alert color="danger" className="mt-3">
              <i className="fas fa-exclamation-triangle me-2"></i>
              Some projects do not have matching budgets for {purchaseType.toUpperCase()} purchases.
              Please create budgets for these projects first.
            </Alert>
          )}

          {budgetSummary.overallStatus === 'EXCEEDED' && (
            <Alert color="danger" className="mt-3">
              <i className="fas fa-exclamation-triangle me-2"></i>
              Some projects exceed their individual budget limits. Please review the amounts above.
            </Alert>
          )}

          {!budgetSummary.isValid &&
            budgetSummary.totalRequested > (budgetSummary.totalAvailable || 0) && (
              <Alert color="warning" className="mt-3">
                <i className="fas fa-exclamation-triangle me-2"></i>
                Total requested amount exceeds available budget by{' '}
                {formatCurrency(
                  Math.abs(budgetSummary.totalRequested - (budgetSummary.totalAvailable || 0)),
                )}
                .
              </Alert>
            )}

          {(budgetSummary.apiWarnings || []).length > 0 && (
            <Alert color="warning" className="mt-3">
              <i className="fas fa-exclamation-triangle me-2"></i>
              <strong>API Warnings:</strong>
              <ul className="mb-0 mt-1">
                {(budgetSummary.apiWarnings || []).map((warning, index) => (
                  <li key={`warning-${index}`}>{warning}</li>
                ))}
              </ul>
            </Alert>
          )}

          {budgetSummary.isValid &&
            !(budgetSummary.apiWarnings || []).length &&
            !(budgetSummary.apiViolations || []).length && (
              <Alert color="success" className="mt-3">
                <i className="fas fa-check-circle me-2"></i>
                All line items have sufficient budget coverage for order conversion.
                <small className="d-block mt-1 text-muted">
                  Note: This is a requisition preview. Actual budget consumption occurs when orders
                  are placed.
                </small>
              </Alert>
            )}
        </div>
      ) : (
        <Alert color="info">
          <i className="fas fa-info-circle me-2"></i>
          Add items to cart to see budget summary.
        </Alert>
      )}
    </div>
  );
};

BudgetSelector.propTypes = {
  onBudgetSelect: PropTypes.func.isRequired,
  cartItems: PropTypes.arrayOf(
    PropTypes.shape({
      projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      quantity: PropTypes.number,
      unitPrice: PropTypes.number,
      description: PropTypes.string,
    }),
  ),
  purchaseType: PropTypes.string,
};

BudgetSelector.defaultProps = {
  cartItems: [],
  purchaseType: 'opex',
};

export default BudgetSelector;
