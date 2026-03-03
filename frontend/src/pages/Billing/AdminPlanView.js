import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  CardBody,
  Button,
  Spinner,
  Badge,
  Table,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';
import BillingService from '../../services/BillingService';
import { getCurrencySymbol } from '../localStorageUtil';
import './Billing.scss';

const AdminPlanView = () => {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchPlanDetails = useCallback(async () => {
    try {
      setLoading(true);
      const [planResponse, subscriptionsResponse] = await Promise.all([
        BillingService.getAdminPlan(planId),
        BillingService.getPlanSubscriptions(planId),
      ]);
      setPlan(planResponse.data);
      setSubscriptions(subscriptionsResponse.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load plan details');
      if (error.response?.status === 404) {
        navigate('/plan-management');
      }
    } finally {
      setLoading(false);
    }
  }, [planId, navigate]);

  useEffect(() => {
    fetchPlanDetails();
  }, [fetchPlanDetails]);

  const handleDeactivate = async () => {
    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === 'ACTIVE' || s.status === 'TRIAL',
    );

    const result = await Swal.fire({
      title: 'Deactivate Plan?',
      html: `
        <div class="text-start">
          <p>This will make <strong>${plan.name}</strong> unavailable for new subscriptions.</p>
          ${
            activeSubscriptions.length > 0
              ? `<p class="text-danger mb-0"><strong>${activeSubscriptions.length}</strong> active subscription(s) will not be affected.</p>`
              : '<p class="text-success mb-0">No active subscriptions.</p>'
          }
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Deactivate',
      confirmButtonColor: '#dc3545',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      await BillingService.deleteAdminPlan(planId);
      toast.success('Plan deactivated successfully');
      navigate('/plan-management');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to deactivate plan');
    }
  };

  const getPricing = () => {
    return plan?.pricings?.[0];
  };

  const formatPrice = (price, currency = 'USD') => {
    if (!price && price !== 0) return '-';
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${parseFloat(price).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      ACTIVE: 'success',
      TRIAL: 'primary',
      CANCELED: 'danger',
      EXPIRED: 'secondary',
      PAST_DUE: 'warning',
      SUSPENDED: 'dark',
    };
    return colors[status] || 'secondary';
  };

  const getLimitTypeLabel = (limitType) => {
    const labels = {
      UNLIMITED: 'Unlimited',
      QUOTA: 'Fixed Quota',
      SOFT_LIMIT: 'Soft Limit',
    };
    return labels[limitType] || limitType;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
        <Spinner color="primary" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-4">
        <i className="bi bi-exclamation-circle fs-3 text-danger d-block mb-2" />
        <p className="mb-2">Plan not found</p>
        <Button color="primary" size="sm" onClick={() => navigate('/plan-management')}>
          Back to Plans
        </Button>
      </div>
    );
  }

  const pricing = getPricing();
  const enabledFeatures = plan.featureConfigs?.filter((fc) => fc.isEnabled) || [];
  const activeSubscriptions = subscriptions.filter((s) => s.status === 'ACTIVE' || s.status === 'TRIAL');
  const yearlySavings =
    pricing?.monthlyBasePrice && pricing?.yearlyBasePrice
      ? ((parseFloat(pricing.monthlyBasePrice) * 12 - parseFloat(pricing.yearlyBasePrice)) /
          (parseFloat(pricing.monthlyBasePrice) * 12)) *
        100
      : 0;

  return (
    <div className="plan-view-container">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div className="d-flex align-items-center">
          <Button
            color="link"
            className="p-0 me-2 text-muted"
            onClick={() => navigate('/plan-management')}
          >
            <i className="bi bi-arrow-left" />
          </Button>
          <div className="plan-icon-sm me-2">
            <i className="bi bi-box" />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h5 className="mb-0 fw-semibold">{plan.name}</h5>
              <Badge color={plan.isActive ? 'success' : 'secondary'} pill>
                {plan.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <small className="text-muted">{plan.planCode}</small>
          </div>
        </div>
        <div className="d-flex gap-2">
          <Button
            color="outline-primary"
            size="sm"
            onClick={() => navigate(`/plan-management/${planId}/edit`)}
          >
            <i className="bi bi-pencil me-1" />Edit
          </Button>
          {plan.isActive && (
            <Button color="outline-danger" size="sm" onClick={handleDeactivate}>
              <i className="bi bi-x-circle me-1" />Deactivate
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats Row */}
      <Row className="g-2 mb-3">
        <Col xs="6" md="3">
          <Card className="stat-card border-0">
            <CardBody className="py-2 px-3">
              <div className="d-flex align-items-center">
                <div className="stat-icon bg-primary-subtle text-primary me-2">
                  <i className="bi bi-currency-dollar" />
                </div>
                <div>
                  <div className="stat-value">{formatPrice(pricing?.monthlyBasePrice, pricing?.currency)}</div>
                  <div className="stat-label">Monthly</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xs="6" md="3">
          <Card className="stat-card border-0">
            <CardBody className="py-2 px-3">
              <div className="d-flex align-items-center">
                <div className="stat-icon bg-success-subtle text-success me-2">
                  <i className="bi bi-calendar-check" />
                </div>
                <div>
                  <div className="stat-value">
                    {formatPrice(pricing?.yearlyBasePrice, pricing?.currency)}
                    {yearlySavings > 0 && (
                      <small className="text-success ms-1">-{yearlySavings.toFixed(0)}%</small>
                    )}
                  </div>
                  <div className="stat-label">Yearly</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xs="6" md="3">
          <Card className="stat-card border-0">
            <CardBody className="py-2 px-3">
              <div className="d-flex align-items-center">
                <div className="stat-icon bg-info-subtle text-info me-2">
                  <i className="bi bi-people" />
                </div>
                <div>
                  <div className="stat-value">{activeSubscriptions.length}</div>
                  <div className="stat-label">Subscribers</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xs="6" md="3">
          <Card className="stat-card border-0">
            <CardBody className="py-2 px-3">
              <div className="d-flex align-items-center">
                <div className="stat-icon bg-warning-subtle text-warning me-2">
                  <i className="bi bi-gear" />
                </div>
                <div>
                  <div className="stat-value">{enabledFeatures.length}</div>
                  <div className="stat-label">Features</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Card className="border-0 shadow-sm">
        <CardBody className="p-0">
          <Nav tabs className="px-3 pt-2 border-bottom">
            <NavItem>
              <NavLink
                className={`py-2 px-3 ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
                style={{ cursor: 'pointer' }}
              >
                <i className="bi bi-info-circle me-1" />Overview
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={`py-2 px-3 ${activeTab === 'features' ? 'active' : ''}`}
                onClick={() => setActiveTab('features')}
                style={{ cursor: 'pointer' }}
              >
                <i className="bi bi-gear me-1" />Features
                <Badge color="secondary" className="ms-1" pill>{enabledFeatures.length}</Badge>
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={`py-2 px-3 ${activeTab === 'companies' ? 'active' : ''}`}
                onClick={() => setActiveTab('companies')}
                style={{ cursor: 'pointer' }}
              >
                <i className="bi bi-buildings me-1" />Companies
                <Badge color="secondary" className="ms-1" pill>{subscriptions.length}</Badge>
              </NavLink>
            </NavItem>
          </Nav>

          <div className="p-3">
            <TabContent activeTab={activeTab}>
              {/* Overview Tab */}
              <TabPane tabId="overview">
                <Row className="g-2">
                  <Col lg="7" md="12">
                    <h6 className="fw-semibold mb-2">Plan Details</h6>
                    <Table size="sm" borderless className="detail-table mb-3">
                      <tbody>
                        <tr>
                          <td className="text-muted">Description</td>
                          <td>{plan.description || 'No description'}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Billing Cycles</td>
                          <td>
                            {plan.billingCycleOptions?.split(',').map((cycle) => (
                              <Badge
                                key={cycle}
                                color="light"
                                className="text-dark border me-1"
                              >
                                {cycle.trim()}
                              </Badge>
                            ))}
                          </td>
                        </tr>
                        <tr>
                          <td className="text-muted">Trial Period</td>
                          <td>{plan.trialDays || 0} days</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Users</td>
                          <td>
                            {(() => {
                              const usersFeature = plan.featureConfigs?.find((fc) => fc.featureCode === 'USERS');
                              if (!usersFeature?.isEnabled || usersFeature.limitType === 'UNLIMITED') {
                                return <Badge color="success" pill>Unlimited</Badge>;
                              }
                              if (usersFeature.limitType === 'QUOTA') {
                                if (usersFeature.overageBehavior === 'BLOCK') {
                                  return <span>{usersFeature.includedQuota || 0} <small className="text-muted">(hard limit)</small></span>;
                                }
                                if (usersFeature.overageBehavior === 'CHARGE') {
                                  return (
                                    <span>
                                      {usersFeature.includedQuota || 0} included
                                      <small className="text-warning ms-1">+${usersFeature.overagePrice || 0}/user</small>
                                    </span>
                                  );
                                }
                                return <span>{usersFeature.includedQuota || 0} <small className="text-muted">(soft limit)</small></span>;
                              }
                              return <Badge color="success" pill>Unlimited</Badge>;
                            })()}
                          </td>
                        </tr>
                        <tr>
                          <td className="text-muted">Grace Period</td>
                          <td>{plan.gracePeriodDays || 7} days</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Customizable</td>
                          <td>
                            {plan.isCustomizable ? (
                              <i className="bi bi-check-circle text-success" />
                            ) : (
                              <i className="bi bi-x-circle text-muted" />
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="text-muted">Sort Order</td>
                          <td>{plan.sortOrder || 0}</td>
                        </tr>
                      </tbody>
                    </Table>

                    <h6 className="fw-semibold mb-2">Pricing</h6>
                    <Row className="g-2">
                      {plan.billingCycleOptions?.includes('MONTHLY') && (
                        <Col xs="6">
                          <div className="pricing-card monthly">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="text-muted">Monthly</span>
                              <span className="fw-bold text-primary price-value">
                                {formatPrice(pricing?.monthlyBasePrice, pricing?.currency)}
                              </span>
                            </div>
                          </div>
                        </Col>
                      )}
                      {plan.billingCycleOptions?.includes('YEARLY') && (
                        <Col xs="6">
                          <div className="pricing-card yearly">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <span className="text-muted">Yearly</span>
                                {yearlySavings > 0 && (
                                  <Badge color="success" className="ms-2" pill>
                                    -{yearlySavings.toFixed(0)}%
                                  </Badge>
                                )}
                              </div>
                              <span className="fw-bold text-success price-value">
                                {formatPrice(pricing?.yearlyBasePrice, pricing?.currency)}
                              </span>
                            </div>
                          </div>
                        </Col>
                      )}
                    </Row>
                  </Col>

                  <Col lg="5" md="12">
                    <div className="breakdown-card">
                      <h6 className="fw-semibold mb-2">
                        <i className="bi bi-pie-chart me-1" />Subscription Stats
                      </h6>
                      <div className="breakdown-item">
                        <span className="text-success">Active</span>
                        <strong>{subscriptions.filter((s) => s.status === 'ACTIVE').length}</strong>
                      </div>
                      <div className="breakdown-item">
                        <span className="text-info">Trial</span>
                        <strong>{subscriptions.filter((s) => s.status === 'TRIAL').length}</strong>
                      </div>
                      <div className="breakdown-item">
                        <span className="text-danger">Canceled</span>
                        <strong>{subscriptions.filter((s) => s.status === 'CANCELED').length}</strong>
                      </div>
                      <div className="breakdown-item">
                        <span className="text-secondary">Expired</span>
                        <strong>{subscriptions.filter((s) => s.status === 'EXPIRED').length}</strong>
                      </div>
                      <hr className="my-2" />
                      <div className="breakdown-item total">
                        <span>Total</span>
                        <strong>{subscriptions.length}</strong>
                      </div>
                    </div>
                  </Col>
                </Row>
              </TabPane>

              {/* Features Tab */}
              <TabPane tabId="features">
                {enabledFeatures.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="bi bi-gear fs-3 text-muted d-block mb-2" />
                    <p className="text-muted mb-2">No features configured</p>
                    <Button
                      color="primary"
                      size="sm"
                      onClick={() => navigate(`/plan-management/${planId}/edit`)}
                    >
                      Configure Features
                    </Button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table size="sm" hover className="feature-table mb-0">
                      <thead>
                        <tr>
                          <th>Feature</th>
                          <th className="text-center">Limit Type</th>
                          <th className="text-center">Quota</th>
                          <th className="text-center">Overage</th>
                          <th className="text-center">Price/Unit</th>
                          <th className="text-center">Warn %</th>
                          <th className="text-center">Grace</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enabledFeatures.map((feature) => {
                          const hasQuota = feature.limitType !== 'UNLIMITED';
                          const canCharge = feature.overageBehavior === 'CHARGE';

                          return (
                            <tr key={feature.featureCode}>
                              <td>
                                <div className="d-flex align-items-center">
                                  <i className="bi bi-check-circle-fill text-success me-2" />
                                  <span className="fw-medium">{feature.featureCode}</span>
                                </div>
                              </td>
                              <td className="text-center">
                                <Badge
                                  color={feature.limitType === 'UNLIMITED' ? 'success' : 'primary'}
                                  pill
                                >
                                  {getLimitTypeLabel(feature.limitType)}
                                </Badge>
                              </td>
                              <td className="text-center">
                                {hasQuota ? (
                                  <span className="fw-medium">{feature.includedQuota || 0}</span>
                                ) : (
                                  <span className="text-muted">∞</span>
                                )}
                              </td>
                              <td className="text-center">
                                {hasQuota ? (
                                  <Badge
                                    color={
                                      feature.overageBehavior === 'CHARGE'
                                        ? 'warning'
                                        : feature.overageBehavior === 'BLOCK'
                                          ? 'danger'
                                          : 'secondary'
                                    }
                                    pill
                                  >
                                    {feature.overageBehavior === 'CHARGE'
                                      ? 'Charge'
                                      : feature.overageBehavior === 'BLOCK'
                                        ? 'Block'
                                        : 'Notify'}
                                  </Badge>
                                ) : (
                                  <span className="text-muted">N/A</span>
                                )}
                              </td>
                              <td className="text-center">
                                {hasQuota && canCharge ? (
                                  <span className="fw-medium text-warning">
                                    {formatPrice(feature.overagePrice, pricing?.currency)}
                                  </span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td className="text-center">
                                {hasQuota ? (
                                  <span>{feature.warningThresholdPercent || 80}%</span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td className="text-center">
                                {hasQuota ? (
                                  <span>{feature.gracePeriodDays || 0}d</span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                )}
              </TabPane>

              {/* Companies Tab */}
              <TabPane tabId="companies">
                {subscriptions.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="bi bi-buildings fs-3 text-muted d-block mb-2" />
                    <p className="text-muted mb-0">No companies enrolled</p>
                  </div>
                ) : (
                  <Table size="sm" hover responsive className="company-table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th className="text-center">Status</th>
                        <th className="text-center">Billing</th>
                        <th className="text-center">Start</th>
                        <th className="text-center">Next Billing</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.map((sub) => (
                        <tr key={sub.subscriptionId}>
                          <td>
                            <span className="fw-medium">
                              {sub.companyName || sub.company?.companyName || 'Unknown'}
                            </span>
                          </td>
                          <td className="text-center">
                            <Badge color={getStatusColor(sub.status)} pill>
                              {sub.status}
                            </Badge>
                          </td>
                          <td className="text-center">
                            <Badge
                              color={sub.billingCycle === 'YEARLY' ? 'success' : 'primary'}
                              className="text-uppercase"
                              pill
                            >
                              {sub.billingCycle === 'YEARLY' ? 'Y' : 'M'}
                            </Badge>
                          </td>
                          <td className="text-center">{formatDate(sub.startDate)}</td>
                          <td className="text-center">
                            <span className={new Date(sub.nextBillingDate) < new Date() ? 'text-danger' : ''}>
                              {formatDate(sub.nextBillingDate)}
                            </span>
                          </td>
                          <td className="text-center">
                            <Button
                              color="outline-primary"
                              size="sm"
                              onClick={() =>
                                navigate(
                                  `/subscription-management?company=${sub.companyId || sub.company?.companyId}`,
                                )
                              }
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </TabPane>
            </TabContent>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default AdminPlanView;
