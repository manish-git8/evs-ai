import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  CardBody,
  CardTitle,
  Button,
  Spinner,
  Badge,
  Progress,
  Table,
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Note: Subscription cancellation is admin-only for enterprise customers
import { useNavigate } from 'react-router-dom';
import BillingService from '../../services/BillingService';
import { getEntityId, formatDate, getUserRole, getEntityType } from '../localStorageUtil';
import { MultiFeatureLimitBanner, SubscriptionAuditTimeline } from '../../components/Billing';
import './Billing.scss';

// Get API base URL for file downloads
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const BillingDashboard = () => {
  const navigate = useNavigate();
  const companyId = getEntityId();
  const userRoles = getUserRole();
  const entityType = getEntityType();

  // Check if user is admin
  const isAdmin = entityType === 'ADMIN' || userRoles.includes('ADMIN');

  const [billingDetails, setBillingDetails] = useState(null);
  const [billingAlerts, setBillingAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAuditHistory, setShowAuditHistory] = useState(false);

  const fetchBillingDetails = async () => {
    try {
      setLoading(true);
      // Use secure endpoint for company users, admin endpoint for admins
      const response = isAdmin
        ? await BillingService.getBillingDetails(companyId)
        : await BillingService.getMyBillingDetails();
      setBillingDetails(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        toast.info('No active subscription found. Please contact your administrator.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to fetch billing details');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingAlerts = async () => {
    try {
      const response = isAdmin
        ? await BillingService.getBillingAlerts(companyId)
        : await BillingService.getMyBillingAlerts();
      setBillingAlerts(response.data || []);
    } catch (error) {
      // Silently fail for alerts - not critical
      console.error('Failed to fetch billing alerts:', error);
    }
  };

  useEffect(() => {
    fetchBillingDetails();
    fetchBillingAlerts();
  }, []);

  const getStatusBadgeColor = (status) => {
    const colors = {
      TRIAL: 'primary',
      ACTIVE: 'success',
      EXPIRED: 'danger',
      CANCELLED: 'secondary',
      TERMINATED: 'danger',
      PAST_DUE: 'warning',
      SUSPENDED: 'danger',
    };
    return colors[status] || 'secondary';
  };

  const getInvoiceStatusBadgeColor = (status) => {
    const colors = {
      PENDING: 'warning',
      PAID: 'success',
      OVERDUE: 'danger',
      CANCELLED: 'secondary',
    };
    return colors[status] || 'secondary';
  };

  const getFeatureIcon = (featureCode) => {
    const icons = {
      USERS: 'bi-people-fill',
      AI_CYCLES: 'bi-cpu',
      RFQ_COUNT: 'bi-file-earmark-text',
      OCR_DOCUMENTS: 'bi-file-earmark-image',
    };
    return icons[featureCode] || 'bi-gear';
  };

  const getFeatureLabel = (featureCode) => {
    const labels = {
      USERS: 'Users',
      AI_CYCLES: 'AI Cycles',
      RFQ_COUNT: 'RFQ Requests',
      OCR_DOCUMENTS: 'OCR Documents',
      ERP_INTEGRATIONS: 'ERP Integrations',
    };
    return labels[featureCode] || featureCode;
  };

  // Helper to unwrap JsonNullable data from backend
  // JsonNullable can wrap data as { present: true, value: {...} } or directly as the value
  const unwrapJsonNullable = (data) => {
    if (!data) return {};

    // Debug log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('unwrapJsonNullable input:', JSON.stringify(data, null, 2));
    }

    // If data has 'present' key with boolean true and 'value' key, it's JsonNullable wrapped
    if (data.present === true && data.value !== undefined) {
      const result = data.value || {};
      if (process.env.NODE_ENV === 'development') {
        console.log('unwrapJsonNullable unwrapped from present/value:', result);
      }
      return result;
    }

    // If it's an object but not a JsonNullable wrapper, filter out special keys
    if (typeof data === 'object' && !Array.isArray(data)) {
      const filtered = {};
      for (const key of Object.keys(data)) {
        // Skip internal keys that shouldn't be feature codes
        if (key !== 'present' && key !== 'undefined' && key !== 'value') {
          filtered[key] = data[key];
        }
      }
      return filtered;
    }

    return data;
  };

  const handleCancelSubscription = async () => {
    const { value: reason } = await Swal.fire({
      title: 'Cancel Subscription?',
      input: 'textarea',
      inputLabel: 'Please tell us why you are cancelling',
      inputPlaceholder: 'Enter your reason here...',
      showCancelButton: true,
      confirmButtonText: 'Yes, Cancel Subscription',
      cancelButtonText: 'Keep Subscription',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      inputValidator: (value) => {
        if (!value) {
          return 'Please provide a reason for cancellation';
        }
        return null;
      },
    });

    if (!reason) return;

    try {
      await BillingService.cancelSubscription(billingDetails.subscription.subscriptionId, reason);
      toast.success('Subscription cancelled successfully');
      fetchBillingDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel subscription');
    }
  };

  // Helper to construct full PDF URL
  const getPdfDownloadUrl = (pdfUrl) => {
    if (!pdfUrl) return null;
    // If already absolute URL, use as-is
    if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) {
      return pdfUrl;
    }
    // Prepend API base URL for relative paths, avoiding double slashes
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const path = pdfUrl.startsWith('/') ? pdfUrl : `/${pdfUrl}`;
    return `${baseUrl}${path}`;
  };

  const handleDownloadInvoice = async (invoiceId, pdfUrl) => {
    if (pdfUrl) {
      window.open(getPdfDownloadUrl(pdfUrl), '_blank');
    } else {
      try {
        const response = await BillingService.generateInvoicePdf(invoiceId);
        window.open(getPdfDownloadUrl(response.data), '_blank');
        toast.success('Invoice PDF generated successfully');
      } catch (error) {
        toast.error('Failed to generate invoice PDF');
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner color="primary" />
        <p className="mt-2" style={{ color: '#495057' }}>
          Loading billing information...
        </p>
      </div>
    );
  }

  if (!billingDetails || !billingDetails.currentSubscription || !billingDetails.currentPlan) {
    return (
      <div className="text-center mt-5">
        <i
          className="bi bi-info-circle fs-1 text-muted mb-3 d-block"
          style={{ color: '#6c757d' }}
        />
        <h5 style={{ color: '#495057' }}>No billing information available</h5>
        <p className="text-muted" style={{ color: '#6c757d' }}>
          Please subscribe to a plan to view billing details
        </p>
        <Button color="primary" onClick={() => navigate('/billing-plans')}>
          View Plans
        </Button>
      </div>
    );
  }

  // Map API response to component variables
  const { currentSubscription: subscription } = billingDetails;
  const plan = billingDetails.currentPlan;

  // Calculate usage metrics
  const { activeUserCount: activeUsers = 0 } = billingDetails;
  const { maxUsers } = plan;

  const usersPercentage = maxUsers === null ? 0 : (activeUsers / maxUsers) * 100;

  const safeUsage = {
    currentUsers: activeUsers,
    usersPercentage,
  };

  const safeCosts = {
    monthlyRecurring: billingDetails.currentMonthlyCost || 0,
    totalSpent: 0, // Not provided in API
    averageMonthlySpend: billingDetails.currentMonthlyCost || 0,
  };

  // Convert lastInvoice to array for compatibility
  const recentInvoices = billingDetails.lastInvoice ? [billingDetails.lastInvoice] : [];

  const getDaysUntilTrialEnd = () => {
    if (!subscription || !subscription.trialEndDate) return null;
    const now = new Date();
    const trialEnd = new Date(subscription.trialEndDate);
    const diffTime = trialEnd - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const trialDaysRemaining = getDaysUntilTrialEnd();

  return (
    <div className="billing-dashboard-container">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-0 fw-semibold">
            <i className="bi bi-credit-card-2-front me-2 text-primary" />
            Billing Dashboard
          </h5>
          <small className="text-muted">Manage your subscription and billing</small>
        </div>
        <div className="d-flex gap-2">
          {isAdmin && (
            <Button color="primary" outline size="sm" onClick={() => navigate('/billing-plans')}>
              <i className="bi bi-grid-3x3-gap-fill me-1" />Plans
            </Button>
          )}
          <Button color="secondary" outline size="sm" onClick={() => setShowAuditHistory(true)}>
            <i className="bi bi-clock-history me-1" />History
          </Button>
          <Button color="primary" size="sm" onClick={() => navigate('/billing-invoices')}>
            <i className="bi bi-receipt me-1" />Invoices
          </Button>
        </div>
      </div>

      {/* Billing Status Alerts */}
      {subscription?.status === 'PAST_DUE' && (
        <div className="alert alert-warning d-flex align-items-center mb-3" role="alert">
          <i className="bi bi-exclamation-triangle-fill fs-4 me-3" />
          <div className="flex-grow-1">
            <strong>Payment Overdue</strong>
            <p className="mb-0 small">
              Your subscription payment is overdue. Please make payment to avoid service interruption.
              {subscription.graceEndsAt && (
                <span className="ms-1">
                  Grace period ends on <strong>{formatDate(subscription.graceEndsAt)}</strong>.
                </span>
              )}
            </p>
          </div>
          <Button color="warning" size="sm" onClick={() => navigate('/billing-invoices')}>
            <i className="bi bi-credit-card me-1" />
            View Invoices
          </Button>
        </div>
      )}

      {subscription?.status === 'SUSPENDED' && (
        <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
          <i className="bi bi-pause-circle-fill fs-4 me-3" />
          <div className="flex-grow-1">
            <strong>Subscription Suspended</strong>
            <p className="mb-0 small">
              Your subscription has been suspended due to non-payment. Access to platform features is restricted.
              Please contact your administrator or make payment to restore access.
            </p>
          </div>
          <Button color="danger" size="sm" onClick={() => navigate('/billing-invoices')}>
            <i className="bi bi-credit-card me-1" />
            View Invoices
          </Button>
        </div>
      )}

      {/* Billing Alerts from API */}
      {billingAlerts.length > 0 && (
        <div className="mb-3">
          {billingAlerts.slice(0, 3).map((alert, idx) => (
            <div
              key={idx}
              className={`alert alert-${alert.severity === 'CRITICAL' ? 'danger' : alert.severity === 'WARNING' ? 'warning' : 'info'} d-flex align-items-center py-2 mb-2`}
              role="alert"
            >
              <i className={`bi bi-${alert.severity === 'CRITICAL' ? 'exclamation-octagon' : alert.severity === 'WARNING' ? 'exclamation-triangle' : 'info-circle'} me-2`} />
              <small className="flex-grow-1">{alert.message}</small>
              <small className="text-muted">{formatDate(alert.createdAt)}</small>
            </div>
          ))}
        </div>
      )}

      {/* Feature Limit Alerts */}
      <MultiFeatureLimitBanner
        featureCodes={['USERS', 'AI_CYCLES', 'RFQ_COUNT', 'OCR_DOCUMENTS']}
        warningThreshold={80}
        showUpgrade
        onUpgrade={() => navigate('/billing-plans')}
      />

      {/* Unified Subscription Card with Trial Info */}
      <Card className={`subscription-overview-card mb-2 ${subscription?.status === 'TRIAL' && trialDaysRemaining !== null && trialDaysRemaining <= 3 ? 'border-warning' : ''}`}>
        <CardBody className="py-2 px-3">
          {/* Trial Banner - inline */}
          {subscription?.status === 'TRIAL' && trialDaysRemaining !== null && (
            <div className={`trial-banner d-flex align-items-center justify-content-between py-2 px-3 mb-2 rounded ${trialDaysRemaining <= 3 ? 'bg-warning bg-opacity-25' : 'bg-info bg-opacity-10'}`}>
              <div className="d-flex align-items-center">
                <i className={`bi bi-clock-history me-2 ${trialDaysRemaining <= 3 ? 'text-warning' : 'text-info'}`} />
                <span className="fw-bold">
                  {trialDaysRemaining === 0 ? 'Trial ends today!' : `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} left`}
                </span>
                <span className="text-muted ms-2">· Ends {formatDate(subscription.trialEndDate)}</span>
              </div>
              {trialDaysRemaining <= 3 && (
                <Badge color="warning" pill>
                  <i className="bi bi-exclamation-triangle-fill me-1" />Action Required
                </Badge>
              )}
            </div>
          )}

          <Row className="align-items-center gx-3">
            {/* Plan Name & Status */}
            <Col xs="12" sm="6" lg="3" className="mb-2 mb-lg-0">
              <div className="d-flex align-items-center">
                <div className="plan-icon bg-primary bg-opacity-10 rounded p-2 me-2">
                  <i className="bi bi-box-seam text-primary" />
                </div>
                <div className="flex-grow-1 overflow-hidden">
                  <small className="text-muted">Plan</small>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold text-primary text-truncate" title={plan.name}>{plan.name}</span>
                    <Badge color={getStatusBadgeColor(subscription.status)} className="flex-shrink-0">{subscription.status}</Badge>
                  </div>
                </div>
              </div>
            </Col>

            {/* Dates & Cycle - Compact inline */}
            <Col xs="12" sm="6" lg="4" className="mb-2 mb-lg-0">
              <div className="d-flex flex-wrap gap-3">
                <div>
                  <small className="text-muted d-block"><i className="bi bi-calendar-check me-1" />Started</small>
                  <span className="fw-bold">{formatDate(subscription.startDate)}</span>
                </div>
                <div>
                  <small className="text-muted d-block"><i className="bi bi-calendar-event me-1" />Next Bill</small>
                  <span className="fw-bold">{formatDate(subscription.nextBillingDate)}</span>
                </div>
                <div>
                  <small className="text-muted d-block"><i className="bi bi-arrow-repeat me-1" />Cycle</small>
                  <span className="fw-bold">{subscription.billingCycle || plan.billingCycle || 'Monthly'}</span>
                </div>
              </div>
            </Col>

            {/* Users */}
            <Col xs="6" sm="4" lg="2" className="mb-2 mb-lg-0">
              <div className="text-center">
                <small className="text-muted d-block"><i className="bi bi-people me-1" />Users</small>
                <span className="fw-bold fs-5">{activeUsers}</span>
                {plan.maxUsers !== null && <span className="text-muted"> / {plan.maxUsers}</span>}
              </div>
            </Col>

            {/* Monthly Cost */}
            <Col xs="6" sm="8" lg="3">
              <div className="cost-summary border rounded py-2 px-3 text-center">
                <small className="text-muted">Monthly Cost</small>
                <h4 className="text-success mb-0">${safeCosts.monthlyRecurring.toFixed(2)}</h4>
                <small className="text-muted">
                  Base ${(plan.basePrice || 0).toFixed(2)}
                  {activeUsers > (plan.maxUsers || 0) && (plan.pricePerUser || 0) > 0 && (
                    <span className="text-warning"> +${((activeUsers - plan.maxUsers) * plan.pricePerUser).toFixed(2)}</span>
                  )}
                </small>
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Unified Features & Usage Card */}
      <Card className="features-usage-card mb-2">
        <CardBody className="py-2">
          <CardTitle tag="h5" className="mb-2">
                <i className="bi bi-speedometer2 me-2 text-primary" />
                Features & Usage
              </CardTitle>

              <Row>
                {/* Users Feature */}
                <Col xs="12" sm="6" lg="4" xl="3" className="mb-3">
                  <div className={`feature-card p-3 border rounded h-100 ${
                    plan.maxUsers !== null && safeUsage.usersPercentage > 90 ? 'border-danger' :
                    plan.maxUsers !== null && safeUsage.usersPercentage > 75 ? 'border-warning' : ''
                  }`}>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center">
                        <i className="bi bi-people-fill text-primary me-2 fs-5" />
                        <span className="fw-bold">Users</span>
                      </div>
                      <Badge color={plan.maxUsers === null ? 'success' : 'primary'} pill>
                        {plan.maxUsers === null ? 'Unlimited' : `${plan.maxUsers}`}
                      </Badge>
                    </div>
                    {plan.maxUsers !== null ? (
                      <>
                        <Progress
                          value={Math.min(safeUsage.usersPercentage, 100)}
                          color={
                            safeUsage.usersPercentage > 90 ? 'danger' :
                            safeUsage.usersPercentage > 75 ? 'warning' : 'success'
                          }
                          className="mb-2"
                          style={{ height: '8px' }}
                        />
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">
                            <strong>{safeUsage.currentUsers}</strong> / {plan.maxUsers} used
                          </small>
                          <small className={safeUsage.usersPercentage > 90 ? 'text-danger fw-bold' : 'text-muted'}>
                            {Math.round(safeUsage.usersPercentage)}%
                          </small>
                        </div>
                        {(plan.pricePerUser || 0) > 0 && safeUsage.currentUsers > plan.maxUsers && (
                          <small className="text-warning d-block mt-1">
                            <i className="bi bi-exclamation-triangle me-1" />
                            +{safeUsage.currentUsers - plan.maxUsers} extra (${((safeUsage.currentUsers - plan.maxUsers) * plan.pricePerUser).toFixed(2)})
                          </small>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-2">
                        <span className="text-success">
                          <i className="bi bi-infinity me-1" />
                          {safeUsage.currentUsers} active
                        </span>
                      </div>
                    )}
                  </div>
                </Col>

                {/* Other Features from featureFlags */}
                {(() => {
                  const featureFlags = unwrapJsonNullable(billingDetails.featureFlags);
                  const featureUsage = unwrapJsonNullable(billingDetails.featureUsage);
                  const validFeatureCodes = ['AI_CYCLES', 'RFQ_COUNT', 'OCR_DOCUMENTS', 'ERP_INTEGRATIONS'];

                  if (process.env.NODE_ENV === 'development') {
                    console.log('Features:', { featureFlags, featureUsage });
                  }

                  const filteredFeatures = Object.entries(featureFlags)
                    .filter(([code]) => validFeatureCodes.includes(code));

                  if (filteredFeatures.length === 0) {
                    return (
                      <Col xs="12" sm="6" lg="8" xl="9">
                        <div className="text-center text-muted py-4 border rounded bg-light">
                          <i className="bi bi-info-circle me-2" />
                          No additional features configured for this plan.
                        </div>
                      </Col>
                    );
                  }

                  return filteredFeatures.map(([featureCode, flag]) => {
                    const usage = featureUsage?.[featureCode] || { currentUsage: 0, limit: flag.limit || 0 };
                    const percentUsed = flag.limit > 0 ? (usage.currentUsage / flag.limit) * 100 : 0;
                    const isUnlimited = flag.unlimited || flag.limit === -1;

                    return (
                      <Col xs="12" sm="6" lg="4" xl="3" className="mb-3" key={featureCode}>
                        <div className={`feature-card p-3 border rounded h-100 ${
                          !flag.enabled ? 'bg-light opacity-60' :
                          !isUnlimited && percentUsed > 90 ? 'border-danger' :
                          !isUnlimited && percentUsed > 75 ? 'border-warning' : ''
                        }`}>
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <div className="d-flex align-items-center">
                              <i className={`bi ${getFeatureIcon(featureCode)} me-2 fs-5 ${flag.enabled ? 'text-primary' : 'text-secondary'}`} />
                              <span className="fw-bold">{getFeatureLabel(featureCode)}</span>
                            </div>
                            {flag.enabled ? (
                              <Badge color={isUnlimited ? 'success' : 'primary'} pill>
                                {isUnlimited ? 'Unlimited' : flag.limit}
                              </Badge>
                            ) : (
                              <Badge color="secondary" pill>Off</Badge>
                            )}
                          </div>

                          {flag.enabled ? (
                            isUnlimited ? (
                              <div className="text-center py-2">
                                <span className="text-success">
                                  <i className="bi bi-infinity me-1" />
                                  {usage.currentUsage || 0} used
                                </span>
                              </div>
                            ) : (
                              <>
                                <Progress
                                  value={Math.min(percentUsed, 100)}
                                  color={
                                    percentUsed > 90 ? 'danger' :
                                    percentUsed > 75 ? 'warning' : 'success'
                                  }
                                  className="mb-2"
                                  style={{ height: '8px' }}
                                />
                                <div className="d-flex justify-content-between align-items-center">
                                  <small className="text-muted">
                                    <strong>{usage.currentUsage || 0}</strong> / {flag.limit} used
                                  </small>
                                  <small className={percentUsed > 90 ? 'text-danger fw-bold' : 'text-muted'}>
                                    {Math.round(percentUsed)}%
                                  </small>
                                </div>
                                {/* Show overage if usage exceeds limit */}
                                {usage.overageUsage > 0 && (
                                  <div className="mt-2 p-2 bg-warning bg-opacity-10 border border-warning rounded">
                                    <small className="text-warning fw-bold d-flex align-items-center">
                                      <i className="bi bi-exclamation-triangle-fill me-1" />
                                      Overage: {usage.overageUsage} units
                                      {usage.overageAllowed && (
                                        <span className="text-muted ms-1">(charges apply)</span>
                                      )}
                                    </small>
                                  </div>
                                )}
                                {flag.remaining !== undefined && flag.remaining <= 5 && flag.remaining > 0 && !usage.overageUsage && (
                                  <small className="text-warning d-block mt-1">
                                    <i className="bi bi-exclamation-triangle me-1" />
                                    Only {flag.remaining} remaining
                                  </small>
                                )}
                              </>
                            )
                          ) : (
                            <div className="text-center py-2">
                              <small className="text-muted">
                                <i className="bi bi-lock me-1" />
                                Not available in plan
                              </small>
                            </div>
                          )}
                        </div>
                      </Col>
                    );
                  });
                })()}
              </Row>
            </CardBody>
          </Card>

      {/* Latest Invoice Card */}
      <Card className="recent-invoices-card mb-2">
            <CardBody className="py-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <CardTitle tag="h5" className="mb-0">
                  <i className="bi bi-receipt me-2 text-primary" />
                  Latest Invoice
                </CardTitle>
                {billingDetails.totalInvoicesCount > 1 && (
                  <Button color="link" size="sm" className="p-0" onClick={() => navigate('/billing-invoices')}>
                    View All ({billingDetails.totalInvoicesCount}) <i className="bi bi-arrow-right ms-1" />
                  </Button>
                )}
              </div>

              {recentInvoices && recentInvoices.length > 0 ? (
                <div className="invoice-summary d-flex flex-wrap align-items-center justify-content-between py-2 border rounded px-3">
                  <div className="d-flex align-items-center gap-4 flex-wrap">
                    <div>
                      <small className="text-muted d-block">Invoice #</small>
                      <span className="fw-bold">{recentInvoices[0].invoiceNumber}</span>
                    </div>
                    <div>
                      <small className="text-muted d-block">Date</small>
                      <span>{formatDate(recentInvoices[0].invoiceDate)}</span>
                    </div>
                    <div>
                      <small className="text-muted d-block">Due</small>
                      <span>{formatDate(recentInvoices[0].paymentDueDate)}</span>
                    </div>
                    <div>
                      <small className="text-muted d-block">Amount</small>
                      <span className="fw-bold text-success">${recentInvoices[0].totalAmount ? recentInvoices[0].totalAmount.toFixed(2) : '0.00'}</span>
                    </div>
                    <div>
                      <Badge color={getInvoiceStatusBadgeColor(recentInvoices[0].status)} className="px-2 py-1">
                        {recentInvoices[0].status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    color="primary"
                    outline
                    size="sm"
                    onClick={() => handleDownloadInvoice(recentInvoices[0].invoiceId, recentInvoices[0].pdfUrl)}
                  >
                    <i className="bi bi-download me-1" />
                    Download
                  </Button>
                </div>
              ) : (
                <div className="text-center py-3 text-muted">
                  <i className="bi bi-inbox me-2" />
                  No invoices yet
                </div>
              )}
            </CardBody>
          </Card>

      {/* Subscription Audit History Modal */}
      <SubscriptionAuditTimeline
        isOpen={showAuditHistory}
        toggle={() => setShowAuditHistory(false)}
        companyId={companyId}
        isAdmin={isAdmin}
      />
    </div>
  );
};

export default BillingDashboard;
