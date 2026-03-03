import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  CardBody,
  CardTitle,
  Button,
  ButtonGroup,
  Spinner,
  Badge,
  Alert,
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import BillingService from '../../services/BillingService';
import { getEntityId, getUserRole, getEntityType, getCurrencySymbol, getCompanyCurrency } from '../localStorageUtil';
import './Billing.scss';

const BillingPlans = () => {
  const navigate = useNavigate();
  const companyId = getEntityId();
  const userRoles = getUserRole();
  const entityType = getEntityType();

  // Check if user is admin - only admins can manage plans in enterprise
  const isAdmin = entityType === 'ADMIN' || userRoles.includes('ADMIN');
  

  const [plans, setPlans] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState('MONTHLY');
  const [currentSubscription, setCurrentSubscription] = useState(null);

 

  

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await BillingService.getAllActivePlans();
      setPlans(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const response = await BillingService.getActiveSubscription(companyId);
      setCurrentSubscription(response.data);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching current subscription:', error);
      }
    }
  };

  const filterPlansByCycle = (cycle) => {
    const filtered = plans.filter((plan) => plan.billingCycle === cycle);
    setFilteredPlans(filtered);
  };

   useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, []);

  const handleCycleChange = (cycle) => {
    setSelectedCycle(cycle);
  };

  useEffect(() => {
    filterPlansByCycle(selectedCycle);
  }, [plans, selectedCycle]);


  const getBillingCycleLabel = (cycle) => {
    const labels = {
      MONTHLY: 'Monthly',
      YEARLY: 'Yearly',
    };
    return labels[cycle] || cycle;
  };

  const handleSubscribe = async (planId) => {
    // Find the plan to get its billing cycle
    const selectedPlan = plans.find((p) => p.planId === planId);
    if (!selectedPlan) {
      toast.error('Plan not found');
      return;
    }

    const { billingCycle } = selectedPlan;

    const billingCycleLabel = getBillingCycleLabel(billingCycle);

    const trialDays = selectedPlan.trialDays || 14;

    const currencySymbol = getCurrencySymbol(selectedPlan.currency || getCompanyCurrency());
    const result = await Swal.fire({
      title: 'Confirm Subscription',
      html: `
        <div class="text-start">
          <p>You are about to subscribe to the following plan:</p>
          <div class="alert alert-info">
            <p class="mb-1"><strong>Plan:</strong> ${selectedPlan.name}</p>
            <p class="mb-1"><strong>Billing Cycle:</strong> ${billingCycleLabel}</p>
            <p class="mb-0"><strong>Price:</strong> ${currencySymbol}${selectedPlan.basePrice?.toFixed(2)}/${billingCycleLabel.toLowerCase()}</p>
          </div>
          <p class="text-success fw-bold">✓ You will get a ${trialDays}-day FREE trial period!</p>
          <p class="text-muted small">Trial expiry reminders will be sent at 7, 3, and 1 day before expiry.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0d6efd',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Start Free Trial',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    // Show subscribing progress
    Swal.fire({
      title: 'Creating Subscription...',
      html: 'Please wait while we set up your subscription.',
      icon: 'info',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      setSubscribing(planId);
      const subscriptionData = {
        companyId,
        planId,
        billingCycle,
        startDate: new Date().toISOString(),
      };

      await BillingService.createSubscription(subscriptionData);

      // Show success message
      Swal.fire({
        title: 'Success!',
        html: `Subscription created successfully with ${billingCycleLabel.toLowerCase()} billing and ${trialDays}-day trial!<br/>Redirecting to billing dashboard...`,
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#28a745',
        timer: 2000,
        timerProgressBar: true,
      }).then(() => {
        navigate('/billing-dashboard');
      });
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to create subscription',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc3545',
      });
    } finally {
      setSubscribing(null);
    }
  };

  

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner color="primary" />
        <p className="mt-2" style={{ color: '#495057' }}>Loading plans...</p>
      </div>
    );
  }

  // Non-admin users see a read-only view with contact admin message
  if (!isAdmin) {
    return (
      <div className="billing-plans-container">
        <ToastContainer position="top-right" autoClose={3000} />
        <Row>
          <Col xs="12">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h2 style={{ color: '#495057' }}>Subscription Plans</h2>
                <p className="text-muted" style={{ color: '#6c757d' }}>Enterprise subscription plans</p>
              </div>
              <Button color="secondary" outline size="sm" onClick={() => navigate('/billing-dashboard')}>
                <i className="bi bi-arrow-left me-2" />
                Back
              </Button>
            </div>
          </Col>
        </Row>

        <Row className="mb-4">
          <Col xs="12">
            <Alert color="primary">
              <h5 className="alert-heading">
                <i className="bi bi-building me-2" />
                Enterprise Subscription
              </h5>
              <p className="mb-0">
                Your organization uses an enterprise subscription plan. Plan changes, upgrades, and subscription
                modifications are managed by your EVS administrator.
              </p>
              <hr />
              <p className="mb-0">
                <strong>Need to change your plan?</strong> Please contact your system administrator or
                reach out to EVS support at <a href="mailto:support@evsprocure.com">support@evsprocure.com</a>
              </p>
            </Alert>
          </Col>
        </Row>

        {currentSubscription && (
          <Row>
            <Col xs="12" md="6">
              <Card>
                <CardBody>
                  <CardTitle tag="h5">
                    <i className="bi bi-check-circle-fill text-success me-2" />
                    Your Current Plan
                  </CardTitle>
                  <h3 className="text-primary">{currentSubscription.planName}</h3>
                  <p className="text-muted">
                    Status: <Badge color={currentSubscription.status === 'ACTIVE' ? 'success' : 'warning'}>
                      {currentSubscription.status}
                    </Badge>
                  </p>
                  <Button color="primary" outline onClick={() => navigate('/billing-dashboard')}>
                    View Billing Details
                  </Button>
                </CardBody>
              </Card>
            </Col>
          </Row>
        )}
      </div>
    );
  }

  return (
    <div className="billing-plans-container">
      <ToastContainer position="top-right" autoClose={3000} />

      <Row>
        <Col xs="12">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 style={{ color: '#495057' }}>Subscription Plans</h2>
              <p className="text-muted" style={{ color: '#6c757d' }}>Choose the perfect plan for your business</p>
            </div>
            <Button color="secondary" outline size="sm" onClick={() => navigate('/billing-dashboard')}>
              <i className="bi bi-arrow-left me-2" />
              Back
            </Button>
          </div>
        </Col>
      </Row>

      {currentSubscription && (
        <Row className="mb-3">
          <Col xs="12">
            <Card className="current-subscription-card">
              <CardBody>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-1">
                      <i className="bi bi-check-circle-fill text-success me-2" />
                      Current Plan: {currentSubscription.planName}
                    </h5>
                    <p className="text-muted mb-0">
                      Status: <Badge color={currentSubscription.status === 'ACTIVE' ? 'success' : 'warning'}>
                        {currentSubscription.status}
                      </Badge>
                    </p>
                  </div>
                  <Button
                    color="primary"
                    outline
                    onClick={() => navigate('/billing-dashboard')}
                  >
                    View Details
                  </Button>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      <Row className="mb-3">
        <Col xs="12" className="text-center">
          <ButtonGroup className="billing-cycle-selector">
            <Button
              color="primary"
              outline={selectedCycle !== 'MONTHLY'}
              onClick={() => handleCycleChange('MONTHLY')}
            >
              Monthly
            </Button>
            <Button
              color="primary"
              outline={selectedCycle !== 'YEARLY'}
              onClick={() => handleCycleChange('YEARLY')}
            >
              Yearly
              <Badge color="success" className="ms-2" pill>
                Save More!
              </Badge>
            </Button>
          </ButtonGroup>
        </Col>
      </Row>

      <Row className="gx-2 gy-3 justify-content-center">
        {filteredPlans.length === 0 ? (
          <Col xs="12">
            <Card>
              <CardBody className="text-center py-4">
                <i className="bi bi-inbox fs-2 text-muted mb-2 d-block" />
                <h6 className="text-muted mb-1">No plans available for {getBillingCycleLabel(selectedCycle)} billing</h6>
                <p className="text-muted small mb-0">Please try a different billing cycle</p>
              </CardBody>
            </Card>
          </Col>
        ) : (
          filteredPlans.map((plan) => (
            <Col xs="12" sm="6" md="6" lg="4" xl="3" key={plan.planId} className="d-flex">
              <Card className={`plan-card ${currentSubscription?.planId === plan.planId ? 'current-plan' : ''}`}>
                <CardBody>
                  {currentSubscription?.planId === plan.planId && (
                    <Badge color="success" className="current-plan-badge">
                      Current Plan
                    </Badge>
                  )}

                  <CardTitle tag="h5" className="text-center">
                    {plan.name}
                  </CardTitle>

                  <p className="text-muted text-center">{plan.description || 'Complete subscription plan'}</p>

                  <div className="price-container text-center">
                    <h3 className="price mb-0">
                      {getCurrencySymbol(plan.currency || getCompanyCurrency())}{plan.basePrice ? plan.basePrice.toFixed(2) : '0.00'}
                      <span className="price-period">/{plan.billingCycle ? getBillingCycleLabel(plan.billingCycle).toLowerCase() : 'month'}</span>
                    </h3>
                    {plan.pricePerUser && plan.pricePerUser > 0 && (
                      <p className="text-muted small mb-0 mt-1">
                        + {getCurrencySymbol(plan.currency || getCompanyCurrency())}{plan.pricePerUser.toFixed(2)}/user
                      </p>
                    )}
                    {!currentSubscription && plan.trialDays > 0 && (
                      <p className="text-success fw-bold mt-2 mb-0">
                        <i className="bi bi-gift-fill me-1" />
                        {plan.trialDays}-Day Free Trial
                      </p>
                    )}
                  </div>

                  <div className="plan-features">
                    <div className="feature-item">
                      <i className="bi bi-check-circle-fill text-success me-2" />
                      <span>{plan.maxUsers === null ? 'Unlimited users' : `Up to ${plan.maxUsers} users`}</span>
                    </div>
                    {plan.features && plan.features.split(',').map((feature) => (
                     <div key={feature.featureName} className="feature-item">
                        <i className="bi bi-check-circle-fill text-success me-2" />
                        <span>{feature.trim()}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    color="primary"
                    block
                    onClick={() => handleSubscribe(plan.planId)}
                    disabled={
                      subscribing === plan.planId ||
                      currentSubscription?.planId === plan.planId
                    }
                    className="subscribe-btn"
                  >
                    {subscribing === plan.planId ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Processing...
                      </>
                    ) : currentSubscription?.planId === plan.planId ? (
                      'Current Plan'
                    ) : (
                      <>
                        <i className="bi bi-star-fill me-2" />
                        Start Free Trial
                      </>
                    )}
                  </Button>
                </CardBody>
              </Card>
            </Col>
          ))
        )}
      </Row>
    </div>
  );
};

export default BillingPlans;
