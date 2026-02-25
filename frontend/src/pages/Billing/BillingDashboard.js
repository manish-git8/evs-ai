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
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import BillingService from '../../services/BillingService';
import { getEntityId, formatDate } from '../localStorageUtil';
import './Billing.scss';

const BillingDashboard = () => {
  const navigate = useNavigate();
  const companyId = getEntityId();

  const [billingDetails, setBillingDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBillingDetails = async () => {
    try {
      setLoading(true);
      const response = await BillingService.getBillingDetails(companyId);
      setBillingDetails(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        toast.info('No active subscription found. Please select a plan.');
        setTimeout(() => {
          navigate('/billing-plans');
        }, 2000);
      } else {
        toast.error(error.response?.data?.message || 'Failed to fetch billing details');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingDetails();
  }, []);

  const getStatusBadgeColor = (status) => {
    const colors = {
      TRIAL: 'info',
      ACTIVE: 'success',
      EXPIRED: 'danger',
      CANCELLED: 'secondary',
      TERMINATED: 'danger',
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

  const handleDownloadInvoice = async (invoiceId, pdfUrl) => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else {
      try {
        const response = await BillingService.generateInvoicePdf(invoiceId);
        window.open(response.data, '_blank');
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

      <Row>
        <Col xs="12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1" style={{ color: '#495057' }}>
                Billing Dashboard
              </h2>
              <p className="text-muted" style={{ color: '#6c757d' }}>
                Manage your subscription and billing
              </p>
            </div>
            <div>
              <Button
                color="primary"
                outline
                className="me-2"
                onClick={() => navigate('/billing-plans')}
              >
                <i className="bi bi-grid-3x3-gap-fill me-2" />
                View All Plans
              </Button>
              <Button color="primary" onClick={() => navigate('/billing-invoices')}>
                <i className="bi bi-receipt me-2" />
                View All Invoices
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {subscription && subscription.status === 'TRIAL' && trialDaysRemaining !== null && (
        <Row className="mb-4">
          <Col xs="12">
            <Card className={`trial-notice-card ${trialDaysRemaining <= 3 ? 'urgent' : ''}`}>
              <CardBody>
                <div className="d-flex align-items-center">
                  <i className="bi bi-clock-history fs-2 me-3" />
                  <div className="flex-grow-1">
                    <h5 className="mb-1">
                      {trialDaysRemaining === 0
                        ? 'Your trial ends today!'
                        : `${trialDaysRemaining} day${
                            trialDaysRemaining !== 1 ? 's' : ''
                          } remaining in your trial`}
                    </h5>
                    <p className="mb-0 text-muted">
                      Trial ends on {formatDate(subscription.trialEndDate)}
                    </p>
                  </div>
                  {trialDaysRemaining <= 3 && (
                    <Badge color="warning" pill className="ms-3">
                      <i className="bi bi-exclamation-triangle-fill me-1" />
                      Action Required
                    </Badge>
                  )}
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      <Row className="mb-4">
        <Col xs="12" lg="8">
          <Card className="subscription-overview-card h-100">
            <CardBody>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <CardTitle tag="h4">Current Subscription</CardTitle>
                  <h3 className="text-primary mb-0">{plan.name}</h3>
                </div>
                <Badge color={getStatusBadgeColor(subscription.status)} className="status-badge-lg">
                  {subscription.status}
                </Badge>
              </div>

              <Row className="subscription-details">
                <Col xs="6" className="mb-3">
                  <div className="detail-item">
                    <i className="bi bi-calendar-check text-success me-2" />
                    <div>
                      <small className="text-muted">Start Date</small>
                      <p className="mb-0 fw-bold">{formatDate(subscription.startDate)}</p>
                    </div>
                  </div>
                </Col>
                <Col xs="6" className="mb-3">
                  <div className="detail-item">
                    <i className="bi bi-calendar-event text-primary me-2" />
                    <div>
                      <small className="text-muted">Next Billing Date</small>
                      <p className="mb-0 fw-bold">{formatDate(subscription.nextBillingDate)}</p>
                    </div>
                  </div>
                </Col>
                <Col xs="6" className="mb-3">
                  <div className="detail-item">
                    <i className="bi bi-arrow-repeat text-info me-2" />
                    <div>
                      <small className="text-muted">Auto-Renew</small>
                      <p className="mb-0 fw-bold">
                        {subscription.autoRenew ? (
                          <span className="text-success">
                            <i className="bi bi-check-circle-fill me-1" />
                            Enabled
                          </span>
                        ) : (
                          <span className="text-warning">
                            <i className="bi bi-x-circle-fill me-1" />
                            Disabled
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </Col>
                <Col xs="6" className="mb-3">
                  <div className="detail-item">
                    <i className="bi bi-credit-card text-warning me-2" />
                    <div>
                      <small className="text-muted">Billing Cycle</small>
                      <p className="mb-0 fw-bold">{plan.billingCycle}</p>
                    </div>
                  </div>
                </Col>
              </Row>

              <div className="mt-3">
                {subscription.status === 'ACTIVE' && (
                  <Button color="danger" outline onClick={handleCancelSubscription}>
                    <i className="bi bi-x-circle me-2" />
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xs="12" lg="4">
          <Card className="costs-card h-100">
            <CardBody>
              <CardTitle tag="h4">Costs Summary</CardTitle>

              <div className="cost-item mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">Monthly Recurring</span>
                  <h4 className="text-primary mb-0">${safeCosts.monthlyRecurring.toFixed(2)}</h4>
                </div>
              </div>

              <div className="cost-item mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">Active Users</span>
                  <h5 className="mb-0">{activeUsers}</h5>
                </div>
              </div>

              <div className="cost-item">
                <div className="d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-muted small">Base Price</span>
                    <span className="small">${plan.basePrice.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted small">
                      + {activeUsers} users × ${plan.pricePerUser.toFixed(2)}
                    </span>
                    <span className="small">${(activeUsers * plan.pricePerUser).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col xs="12">
          <Card className="usage-card">
            <CardBody>
              <CardTitle tag="h4" className="mb-4">
                Usage This Period
              </CardTitle>

              <Row>
                <Col xs="12" md="6" className="mb-4">
                  <div className="usage-metric">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="fw-bold">
                        <i className="bi bi-people-fill text-primary me-2" />
                        Users
                      </span>
                      {plan.maxUsers === null ? (
                        <span className="text-success fw-bold">
                          {safeUsage.currentUsers} active users (Unlimited)
                        </span>
                      ) : (
                        <span className="text-muted">
                          {safeUsage.currentUsers} / {plan.maxUsers}
                        </span>
                      )}
                    </div>
                    {plan.maxUsers !== null ? (
                      <>
                        <Progress
                          value={safeUsage.usersPercentage}
                          color={
                            safeUsage.usersPercentage > 80
                              ? 'danger'
                              : safeUsage.usersPercentage > 60
                              ? 'warning'
                              : 'success'
                          }
                          className="mb-1"
                        />
                        <small className="text-muted">
                          {safeUsage.usersPercentage.toFixed(1)}% utilized
                        </small>
                      </>
                    ) : (
                      <small className="text-muted">No user limit on this plan</small>
                    )}
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xs="12">
          <Card className="recent-invoices-card">
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <CardTitle tag="h4" className="mb-0">
                  Recent Invoices
                  {billingDetails.totalInvoicesCount > 0 && (
                    <Badge color="secondary" className="ms-2" pill>
                      {billingDetails.totalInvoicesCount}
                    </Badge>
                  )}
                </CardTitle>
                <Button color="link" onClick={() => navigate('/billing-invoices')}>
                  View All <i className="bi bi-arrow-right ms-1" />
                </Button>
              </div>

              {recentInvoices && recentInvoices.length > 0 ? (
                <Table responsive hover className="mb-0">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Invoice Date</th>
                      <th>Due Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.map((invoice) => (
                      <tr key={invoice.invoiceId}>
                        <td className="fw-bold">{invoice.invoiceNumber}</td>
                        <td>{formatDate(invoice.issueDate)}</td>
                        <td>{formatDate(invoice.dueDate)}</td>
                        <td className="fw-bold">
                          ${invoice.totalAmount ? invoice.totalAmount.toFixed(2) : '0.00'}
                        </td>
                        <td>
                          <Badge color={getInvoiceStatusBadgeColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            color="primary"
                            size="sm"
                            outline
                            onClick={() => handleDownloadInvoice(invoice.invoiceId, invoice.pdfUrl)}
                          >
                            <i className="bi bi-download me-1" />
                            PDF
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center py-4">
                  <i className="bi bi-inbox fs-1 text-muted mb-3 d-block" />
                  <p className="text-muted">No invoices yet</p>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default BillingDashboard;
