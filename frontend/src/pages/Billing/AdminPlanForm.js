import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  CardBody,
  Form,
  FormGroup,
  Label,
  Input,
  Button,
  Spinner,
  Badge,
  Alert,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  Table,
  InputGroup,
  InputGroupText,
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';
import BillingService from '../../services/BillingService';
import './Billing.scss';

const LIMIT_TYPES = [
  { value: 'UNLIMITED', label: 'Unlimited' },
  { value: 'QUOTA', label: 'Fixed Quota' },
];

// Features to exclude from the UI
const EXCLUDED_FEATURES = ['API_ACCESS', 'STORAGE_GB'];

const OVERAGE_BEHAVIORS = [
  { value: 'BLOCK', label: 'Block' },
  { value: 'CHARGE', label: 'Charge' },
  { value: 'NOTIFY_ONLY', label: 'Notify' },
];

const DEFAULT_FEATURE_CONFIG = {
  isEnabled: false,
  limitType: 'QUOTA',
  includedQuota: 0,
  overageBehavior: 'BLOCK',
  overagePrice: 0,
  overageCurrency: 'USD',
  warningThresholdPercent: 80,
  gracePeriodDays: 0,
};

const AdminPlanForm = () => {
  const { planId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(planId);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [features, setFeatures] = useState([]);
  const [activeTab, setActiveTab] = useState('basic');
  const [validationErrors, setValidationErrors] = useState({});

  const initialFormState = {
    name: '',
    description: '',
    planCode: '',
    billingCycleOptions: 'MONTHLY,YEARLY',
    trialDays: 14,
    gracePeriodDays: 7,
    isCustomizable: true,
    sortOrder: 0,
    monthlyBasePrice: '',
    yearlyBasePrice: '',
    currency: 'USD',
    featureConfigs: {},
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchFeatures = useCallback(async () => {
    try {
      const response = await BillingService.getAdminFeatures();
      // Filter out excluded features
      const filteredFeatures = (response.data || []).filter(
        (f) => !EXCLUDED_FEATURES.includes(f.featureCode)
      );
      setFeatures(filteredFeatures);
    } catch (error) {
      // Fallback features (already excludes API_ACCESS and STORAGE_GB)
      setFeatures([
        { featureId: 1, featureCode: 'USERS', displayName: 'Users', description: 'Number of active users (set quota for per-user pricing)', isMetered: true },
        { featureId: 2, featureCode: 'AI_CYCLES', displayName: 'AI Cycles', description: 'AI processing cycles', isMetered: true },
        { featureId: 3, featureCode: 'RFQ_COUNT', displayName: 'RFQ Limit', description: 'RFQs per month', isMetered: true },
        { featureId: 4, featureCode: 'ERP_INTEGRATIONS', displayName: 'ERP Integrations', description: 'ERP integrations', isMetered: false },
        { featureId: 5, featureCode: 'OCR_DOCUMENTS', displayName: 'OCR Documents', description: 'OCR processing', isMetered: true },
      ]);
    }
  }, []);

  const initializeFeatureConfigs = useCallback(
    (existingConfigs = []) => {
      const configs = {};
      features.forEach((feature) => {
        const existing = existingConfigs.find((fc) => fc.featureCode === feature.featureCode);
        if (existing) {
          configs[feature.featureCode] = {
            isEnabled: existing.isEnabled || false,
            limitType: existing.limitType || 'QUOTA',
            includedQuota: existing.includedQuota || 0,
            overageBehavior: existing.overageBehavior || 'BLOCK',
            overagePrice: existing.overagePrice || 0,
            overageCurrency: existing.overageCurrency || 'USD',
            warningThresholdPercent: existing.warningThresholdPercent || 80,
            gracePeriodDays: existing.gracePeriodDays || 0,
          };
        } else {
          configs[feature.featureCode] = { ...DEFAULT_FEATURE_CONFIG };
        }
      });
      return configs;
    },
    [features],
  );

  const fetchPlanData = useCallback(async () => {
    if (!isEditMode) return;
    try {
      setLoading(true);
      const response = await BillingService.getAdminPlan(planId);
      const plan = response.data;
      const usdPricing = plan.pricings?.find((p) => p.currency === 'USD') || plan.pricings?.[0];

      setFormData({
        name: plan.name || '',
        description: plan.description || '',
        planCode: plan.planCode || '',
        billingCycleOptions: plan.billingCycleOptions || 'MONTHLY,YEARLY',
        trialDays: plan.trialDays || 14,
        gracePeriodDays: plan.gracePeriodDays || 7,
        isCustomizable: plan.isCustomizable !== false,
        sortOrder: plan.sortOrder || 0,
        monthlyBasePrice: usdPricing?.monthlyBasePrice?.toString() || '',
        yearlyBasePrice: usdPricing?.yearlyBasePrice?.toString() || '',
        currency: usdPricing?.currency || 'USD',
        featureConfigs: initializeFeatureConfigs(plan.featureConfigs || []),
      });
    } catch (error) {
      toast.error('Failed to load plan data');
      if (error.response?.status === 404) {
        navigate('/plan-management');
      }
    } finally {
      setLoading(false);
    }
  }, [isEditMode, planId, navigate, initializeFeatureConfigs]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  useEffect(() => {
    if (features.length > 0) {
      if (isEditMode) {
        fetchPlanData();
      } else {
        setFormData((prev) => ({
          ...prev,
          featureConfigs: initializeFeatureConfigs([]),
        }));
      }
    }
  }, [features, isEditMode, fetchPlanData, initializeFeatureConfigs]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleFeatureConfigChange = (featureCode, field, value) => {
    setFormData((prev) => ({
      ...prev,
      featureConfigs: {
        ...prev.featureConfigs,
        [featureCode]: {
          ...prev.featureConfigs[featureCode],
          [field]: value,
        },
      },
    }));
  };

  const toggleAllFeatures = (enabled) => {
    const updatedConfigs = {};
    Object.keys(formData.featureConfigs).forEach((code) => {
      updatedConfigs[code] = {
        ...formData.featureConfigs[code],
        isEnabled: enabled,
      };
    });
    setFormData((prev) => ({ ...prev, featureConfigs: updatedConfigs }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Plan name is required';

    const hasMonthly = formData.billingCycleOptions.includes('MONTHLY');
    const hasYearly = formData.billingCycleOptions.includes('YEARLY');

    if (hasMonthly && (!formData.monthlyBasePrice || parseFloat(formData.monthlyBasePrice) < 0)) {
      errors.monthlyBasePrice = 'Valid monthly price required';
    }
    if (hasYearly && (!formData.yearlyBasePrice || parseFloat(formData.yearlyBasePrice) < 0)) {
      errors.yearlyBasePrice = 'Valid yearly price required';
    }

    // Validate feature configs - QUOTA limit type requires quota > 0
    let hasFeatureErrors = false;
    Object.entries(formData.featureConfigs).forEach(([featureCode, config]) => {
      if (config.isEnabled && config.limitType === 'QUOTA') {
        const quota = parseInt(config.includedQuota, 10);
        if (isNaN(quota) || quota < 1) {
          errors[`feature_${featureCode}`] = 'Quota must be greater than 0';
          hasFeatureErrors = true;
        }
      }
    });

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      if (errors.name || errors.maxUsers) setActiveTab('basic');
      else if (errors.monthlyBasePrice || errors.yearlyBasePrice) setActiveTab('pricing');
      else if (hasFeatureErrors) setActiveTab('features');
      return false;
    }
    return true;
  };

  const buildPlanRequest = () => {
    const hasMonthly = formData.billingCycleOptions.includes('MONTHLY');
    const hasYearly = formData.billingCycleOptions.includes('YEARLY');

    const pricings = [{
      currency: formData.currency || 'USD',
      monthlyBasePrice: hasMonthly ? (parseFloat(formData.monthlyBasePrice) || 0) : null,
      yearlyBasePrice: hasYearly ? (parseFloat(formData.yearlyBasePrice) || 0) : null,
    }];

    const featureConfigs = Object.entries(formData.featureConfigs)
      .filter(([, config]) => config.isEnabled)
      .map(([featureCode, config]) => ({
        featureCode,
        isEnabled: config.isEnabled,
        limitType: config.limitType,
        includedQuota: parseInt(config.includedQuota, 10) || 0,
        overageBehavior: config.overageBehavior,
        overagePrice: parseFloat(config.overagePrice) || 0,
        overageCurrency: config.overageCurrency || 'USD',
        warningThresholdPercent: parseInt(config.warningThresholdPercent, 10) || 80,
        gracePeriodDays: parseInt(config.gracePeriodDays, 10) || 0,
      }));

    const planCode = formData.planCode.trim() || formData.name.toUpperCase().replace(/\s+/g, '_');

    // Derive maxUsers from USERS feature config
    const usersConfig = formData.featureConfigs.USERS;
    let maxUsers = null; // Default: unlimited
    if (usersConfig?.isEnabled && usersConfig.limitType === 'QUOTA') {
      // Only set hard limit if overage behavior is BLOCK
      if (usersConfig.overageBehavior === 'BLOCK') {
        maxUsers = parseInt(usersConfig.includedQuota, 10) || null;
      }
      // CHARGE or NOTIFY_ONLY = no hard limit (can add more users)
    }

    return {
      name: formData.name.trim(),
      description: formData.description.trim(),
      planCode,
      billingCycleOptions: formData.billingCycleOptions,
      trialDays: parseInt(formData.trialDays, 10) || 14,
      gracePeriodDays: parseInt(formData.gracePeriodDays, 10) || 7,
      billingPeriodType: 'ANNIVERSARY',
      isCustomizable: formData.isCustomizable,
      sortOrder: parseInt(formData.sortOrder, 10) || 0,
      maxUsers,
      pricings,
      featureConfigs,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }

    const planData = buildPlanRequest();

    Swal.fire({
      title: isEditMode ? 'Updating Plan...' : 'Creating Plan...',
      html: 'Please wait...',
      icon: 'info',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      setSaving(true);

      if (isEditMode) {
        await BillingService.updateAdminPlan(planId, {
          name: planData.name,
          description: planData.description,
          billingCycleOptions: planData.billingCycleOptions,
          trialDays: planData.trialDays,
          gracePeriodDays: planData.gracePeriodDays,
          isCustomizable: planData.isCustomizable,
          sortOrder: planData.sortOrder,
          maxUsers: planData.maxUsers,
        });

        if (planData.pricings.length > 0) {
          await BillingService.savePlanPricing(planId, planData.pricings[0]);
        }

        await Promise.all(
          planData.featureConfigs.map((fc) => BillingService.savePlanFeatureConfig(planId, fc)),
        );
      } else {
        // Create the plan first
        const response = await BillingService.createAdminPlan(planData);
        const newPlanId = response.data.planId;

        // Save pricing for the new plan
        if (planData.pricings.length > 0) {
          await BillingService.savePlanPricing(newPlanId, planData.pricings[0]);
        }

        // Save feature configs for the new plan
        if (planData.featureConfigs.length > 0) {
          await Promise.all(
            planData.featureConfigs.map((fc) => BillingService.savePlanFeatureConfig(newPlanId, fc)),
          );
        }
      }

      Swal.fire({
        title: 'Success!',
        text: isEditMode ? 'Plan updated!' : 'Plan created!',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#28a745',
      }).then(() => {
        navigate('/plan-management');
      });
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} plan`,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc3545',
      });
    } finally {
      setSaving(false);
    }
  };

  const enabledFeaturesCount = Object.values(formData.featureConfigs).filter((fc) => fc.isEnabled).length;

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
        <Spinner color="primary" />
      </div>
    );
  }

  return (
    <div className="plan-form-container">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center">
          <Button color="link" className="p-0 me-2 text-muted" onClick={() => navigate('/plan-management')}>
            <i className="bi bi-arrow-left" />
          </Button>
          <div>
            <h5 className="mb-0 fw-semibold">
              {isEditMode ? 'Edit Plan' : 'Create Plan'}
            </h5>
            <small className="text-muted">
              {isEditMode ? `Editing: ${formData.name || 'Plan'}` : 'Set up a new subscription plan'}
            </small>
          </div>
        </div>
        <div className="d-flex gap-2">
          <Button color="outline-secondary" size="sm" onClick={() => navigate('/plan-management')}>
            Cancel
          </Button>
          <Button color="primary" size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? <Spinner size="sm" /> : <i className={`bi ${isEditMode ? 'bi-check-lg' : 'bi-plus'} me-1`} />}
            {isEditMode ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>

      <Form onSubmit={handleSubmit}>
        <Row className="g-3">
          {/* Main Form */}
          <Col lg="8">
            <Card className="border-0 shadow-sm">
              <CardBody className="p-0">
                <Nav tabs className="px-3 pt-2 border-bottom">
                  <NavItem>
                    <NavLink
                      className={`py-2 px-3 ${activeTab === 'basic' ? 'active' : ''} ${validationErrors.name ? 'text-danger' : ''}`}
                      onClick={() => setActiveTab('basic')}
                      style={{ cursor: 'pointer' }}
                    >
                      <i className="bi bi-info-circle me-1" />Basic
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={`py-2 px-3 ${activeTab === 'pricing' ? 'active' : ''} ${validationErrors.monthlyBasePrice || validationErrors.yearlyBasePrice ? 'text-danger' : ''}`}
                      onClick={() => setActiveTab('pricing')}
                      style={{ cursor: 'pointer' }}
                    >
                      <i className="bi bi-currency-dollar me-1" />Pricing
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={`py-2 px-3 ${activeTab === 'features' ? 'active' : ''}`}
                      onClick={() => setActiveTab('features')}
                      style={{ cursor: 'pointer' }}
                    >
                      <i className="bi bi-gear me-1" />Features
                      <Badge color="secondary" className="ms-1" pill>{enabledFeaturesCount}</Badge>
                    </NavLink>
                  </NavItem>
                </Nav>

                <div className="p-3">
                  <TabContent activeTab={activeTab}>
                    {/* Basic Info Tab */}
                    <TabPane tabId="basic">
                      <Row className="g-2">
                        <Col md="6">
                          <FormGroup className="mb-2">
                            <Label for="name" className="small fw-semibold mb-1">
                              Plan Name <span className="text-danger">*</span>
                            </Label>
                            <Input
                              type="text"
                              name="name"
                              id="name"
                              bsSize="sm"
                              value={formData.name}
                              onChange={handleInputChange}
                              placeholder="e.g., Starter, Professional"
                              className={validationErrors.name ? 'is-invalid' : ''}
                            />
                            {validationErrors.name && (
                              <div className="invalid-feedback">{validationErrors.name}</div>
                            )}
                          </FormGroup>
                        </Col>
                        <Col md="6">
                          <FormGroup className="mb-2">
                            <Label for="planCode" className="small fw-semibold mb-1">Plan Code</Label>
                            <Input
                              type="text"
                              name="planCode"
                              id="planCode"
                              bsSize="sm"
                              value={formData.planCode}
                              onChange={handleInputChange}
                              placeholder="Auto-generated"
                              disabled={isEditMode}
                            />
                          </FormGroup>
                        </Col>
                      </Row>

                      <FormGroup className="mb-2">
                        <Label for="description" className="small fw-semibold mb-1">Description</Label>
                        <Input
                          type="textarea"
                          name="description"
                          id="description"
                          bsSize="sm"
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder="Describe what this plan offers..."
                          rows="2"
                        />
                      </FormGroup>

                      <Row className="g-2">
                        <Col md="4">
                          <FormGroup className="mb-2">
                            <Label for="billingCycleOptions" className="small fw-semibold mb-1">Billing Cycles</Label>
                            <Input
                              type="select"
                              name="billingCycleOptions"
                              id="billingCycleOptions"
                              bsSize="sm"
                              value={formData.billingCycleOptions}
                              onChange={handleInputChange}
                            >
                              <option value="MONTHLY">Monthly Only</option>
                              <option value="YEARLY">Yearly Only</option>
                              <option value="MONTHLY,YEARLY">Both</option>
                            </Input>
                          </FormGroup>
                        </Col>
                        <Col md="4">
                          <FormGroup className="mb-2">
                            <Label for="trialDays" className="small fw-semibold mb-1">Trial (Days)</Label>
                            <Input
                              type="number"
                              name="trialDays"
                              id="trialDays"
                              bsSize="sm"
                              value={formData.trialDays}
                              onChange={handleInputChange}
                              min="0"
                            />
                          </FormGroup>
                        </Col>
                        <Col md="4">
                          <FormGroup className="mb-2">
                            <Label for="gracePeriodDays" className="small fw-semibold mb-1">Grace Period</Label>
                            <Input
                              type="number"
                              name="gracePeriodDays"
                              id="gracePeriodDays"
                              bsSize="sm"
                              value={formData.gracePeriodDays}
                              onChange={handleInputChange}
                              min="0"
                            />
                          </FormGroup>
                        </Col>
                      </Row>

                      <Row className="g-2">
                        <Col md="6">
                          <FormGroup className="mb-2">
                            <Label for="sortOrder" className="small fw-semibold mb-1">Sort Order</Label>
                            <Input
                              type="number"
                              name="sortOrder"
                              id="sortOrder"
                              bsSize="sm"
                              value={formData.sortOrder}
                              onChange={handleInputChange}
                              min="0"
                            />
                          </FormGroup>
                        </Col>
                      </Row>

                      <FormGroup check className="mt-2">
                        <Input
                          type="checkbox"
                          name="isCustomizable"
                          id="isCustomizable"
                          checked={formData.isCustomizable}
                          onChange={handleInputChange}
                        />
                        <Label check for="isCustomizable" className="small">
                          Allow feature overrides per subscription
                        </Label>
                      </FormGroup>
                    </TabPane>

                    {/* Pricing Tab */}
                    <TabPane tabId="pricing">
                      <Row className="g-2 mb-3">
                        <Col md="4">
                          <FormGroup className="mb-0">
                            <Label for="currency" className="small fw-semibold mb-1">Currency</Label>
                            <Input
                              type="select"
                              name="currency"
                              id="currency"
                              bsSize="sm"
                              value={formData.currency}
                              onChange={handleInputChange}
                            >
                              <option value="USD">USD ($)</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                              <option value="INR">INR</option>
                            </Input>
                          </FormGroup>
                        </Col>
                      </Row>

                      <Row className="g-2">
                        {formData.billingCycleOptions.includes('MONTHLY') && (
                          <Col md={formData.billingCycleOptions === 'MONTHLY,YEARLY' ? '6' : '12'}>
                            <div className={`pricing-input-card ${validationErrors.monthlyBasePrice ? 'error' : ''}`}>
                              <div className="pricing-header monthly">
                                <i className="bi bi-calendar-month me-1" />Monthly
                              </div>
                              <FormGroup className="mb-0">
                                <InputGroup size="sm">
                                  <InputGroupText>$</InputGroupText>
                                  <Input
                                    type="number"
                                    name="monthlyBasePrice"
                                    value={formData.monthlyBasePrice}
                                    onChange={handleInputChange}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                  />
                                  <InputGroupText>/mo</InputGroupText>
                                </InputGroup>
                              </FormGroup>
                              {validationErrors.monthlyBasePrice && (
                                <small className="text-danger">{validationErrors.monthlyBasePrice}</small>
                              )}
                            </div>
                          </Col>
                        )}

                        {formData.billingCycleOptions.includes('YEARLY') && (
                          <Col md={formData.billingCycleOptions === 'MONTHLY,YEARLY' ? '6' : '12'}>
                            <div className={`pricing-input-card ${validationErrors.yearlyBasePrice ? 'error' : ''}`}>
                              <div className="pricing-header yearly">
                                <i className="bi bi-calendar-check me-1" />Yearly
                              </div>
                              <FormGroup className="mb-0">
                                <InputGroup size="sm">
                                  <InputGroupText>$</InputGroupText>
                                  <Input
                                    type="number"
                                    name="yearlyBasePrice"
                                    value={formData.yearlyBasePrice}
                                    onChange={handleInputChange}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                  />
                                  <InputGroupText>/yr</InputGroupText>
                                </InputGroup>
                              </FormGroup>
                              {validationErrors.yearlyBasePrice && (
                                <small className="text-danger">{validationErrors.yearlyBasePrice}</small>
                              )}
                            </div>
                          </Col>
                        )}
                      </Row>

                      {formData.monthlyBasePrice && formData.yearlyBasePrice && formData.billingCycleOptions === 'MONTHLY,YEARLY' && (
                        <Alert color="success" className="mt-3 mb-0 py-2">
                          <small>
                            <i className="bi bi-calculator me-1" />
                            Yearly savings: <strong>
                              {(((parseFloat(formData.monthlyBasePrice) * 12 - parseFloat(formData.yearlyBasePrice)) /
                                (parseFloat(formData.monthlyBasePrice) * 12)) * 100).toFixed(0)}%
                            </strong>
                          </small>
                        </Alert>
                      )}
                    </TabPane>

                    {/* Features Tab */}
                    <TabPane tabId="features">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <small className="text-muted">Enable features and set limits</small>
                        <div>
                          <Button color="link" size="sm" className="p-0 me-2" onClick={() => toggleAllFeatures(true)}>
                            Enable All
                          </Button>
                          <Button color="link" size="sm" className="p-0 text-muted" onClick={() => toggleAllFeatures(false)}>
                            Disable All
                          </Button>
                        </div>
                      </div>

                      <div className="table-responsive">
                        <Table size="sm" bordered className="feature-form-table mb-0">
                          <thead>
                            <tr>
                              <th style={{ width: '35px' }} className="text-center">
                                <i className="bi bi-check2-square" />
                              </th>
                              <th style={{ minWidth: '140px' }}>Feature</th>
                              <th style={{ width: '95px' }}>Limit Type</th>
                              <th style={{ width: '75px' }}>Quota</th>
                              <th style={{ width: '85px' }}>Overage</th>
                              <th style={{ width: '85px' }}>Price/Unit</th>
                              <th style={{ width: '65px' }}>Warn %</th>
                              <th style={{ width: '65px' }}>Grace</th>
                            </tr>
                          </thead>
                          <tbody>
                            {features.map((feature) => {
                              const config = formData.featureConfigs[feature.featureCode] || DEFAULT_FEATURE_CONFIG;
                              const isEnabled = config.isEnabled;
                              const isQuotaType = config.limitType === 'QUOTA';
                              const canCharge = config.overageBehavior === 'CHARGE';

                              return (
                                <tr key={feature.featureCode} className={isEnabled ? '' : 'disabled-row'}>
                                  <td className="text-center align-middle">
                                    <Input
                                      type="checkbox"
                                      checked={isEnabled}
                                      onChange={(e) =>
                                        handleFeatureConfigChange(feature.featureCode, 'isEnabled', e.target.checked)
                                      }
                                    />
                                  </td>
                                  <td className="align-middle">
                                    <div className="fw-medium small">{feature.displayName || feature.featureCode}</div>
                                    {feature.unitLabel && (
                                      <small className="text-muted">Unit: {feature.unitLabel}</small>
                                    )}
                                  </td>
                                  <td className="align-middle">
                                    {isEnabled ? (
                                      <Input
                                        type="select"
                                        bsSize="sm"
                                        value={config.limitType}
                                        onChange={(e) =>
                                          handleFeatureConfigChange(feature.featureCode, 'limitType', e.target.value)
                                        }
                                      >
                                        {LIMIT_TYPES.map((lt) => (
                                          <option key={lt.value} value={lt.value}>{lt.label}</option>
                                        ))}
                                      </Input>
                                    ) : (
                                      <span className="text-muted small">-</span>
                                    )}
                                  </td>
                                  <td className="align-middle">
                                    {isEnabled && isQuotaType ? (
                                      <>
                                        <Input
                                          type="number"
                                          bsSize="sm"
                                          value={config.includedQuota}
                                          onChange={(e) =>
                                            handleFeatureConfigChange(feature.featureCode, 'includedQuota', e.target.value)
                                          }
                                          min="1"
                                          placeholder="1"
                                          className={validationErrors[`feature_${feature.featureCode}`] ? 'is-invalid' : ''}
                                        />
                                        {validationErrors[`feature_${feature.featureCode}`] && (
                                          <small className="text-danger d-block">{validationErrors[`feature_${feature.featureCode}`]}</small>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-muted small">{isEnabled ? '∞' : '-'}</span>
                                    )}
                                  </td>
                                  <td className="align-middle">
                                    {isEnabled && isQuotaType ? (
                                      <Input
                                        type="select"
                                        bsSize="sm"
                                        value={config.overageBehavior}
                                        onChange={(e) =>
                                          handleFeatureConfigChange(feature.featureCode, 'overageBehavior', e.target.value)
                                        }
                                      >
                                        {OVERAGE_BEHAVIORS.map((ob) => (
                                          <option key={ob.value} value={ob.value}>{ob.label}</option>
                                        ))}
                                      </Input>
                                    ) : (
                                      <span className="text-muted small">{isEnabled ? 'N/A' : '-'}</span>
                                    )}
                                  </td>
                                  <td className="align-middle">
                                    {isEnabled && isQuotaType && canCharge ? (
                                      <InputGroup size="sm">
                                        <InputGroupText className="px-1">$</InputGroupText>
                                        <Input
                                          type="number"
                                          value={config.overagePrice}
                                          onChange={(e) =>
                                            handleFeatureConfigChange(feature.featureCode, 'overagePrice', e.target.value)
                                          }
                                          min="0"
                                          step="0.01"
                                          placeholder="0"
                                          style={{ paddingLeft: '4px' }}
                                        />
                                      </InputGroup>
                                    ) : (
                                      <span className="text-muted small">{isEnabled && isQuotaType ? 'N/A' : '-'}</span>
                                    )}
                                  </td>
                                  <td className="align-middle">
                                    {isEnabled && isQuotaType ? (
                                      <InputGroup size="sm">
                                        <Input
                                          type="number"
                                          value={config.warningThresholdPercent}
                                          onChange={(e) =>
                                            handleFeatureConfigChange(feature.featureCode, 'warningThresholdPercent', e.target.value)
                                          }
                                          min="0"
                                          max="100"
                                          placeholder="80"
                                          style={{ paddingRight: '2px' }}
                                        />
                                        <InputGroupText className="px-1">%</InputGroupText>
                                      </InputGroup>
                                    ) : (
                                      <span className="text-muted small">-</span>
                                    )}
                                  </td>
                                  <td className="align-middle">
                                    {isEnabled && isQuotaType ? (
                                      <InputGroup size="sm">
                                        <Input
                                          type="number"
                                          value={config.gracePeriodDays}
                                          onChange={(e) =>
                                            handleFeatureConfigChange(feature.featureCode, 'gracePeriodDays', e.target.value)
                                          }
                                          min="0"
                                          placeholder="0"
                                          style={{ paddingRight: '2px' }}
                                        />
                                        <InputGroupText className="px-1">d</InputGroupText>
                                      </InputGroup>
                                    ) : (
                                      <span className="text-muted small">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </div>

                      <Alert color="primary" className="mt-2 mb-0 py-2">
                        <small>
                          <i className="bi bi-lightbulb me-1" />
                          <strong>User Limits:</strong> Configure the <strong>Users</strong> feature above to set user limits.
                          Use "Fixed Quota" + "Block" for hard limits, or "Charge" for per-user pricing with overages.
                        </small>
                      </Alert>
                    </TabPane>
                  </TabContent>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Sidebar - Preview */}
          <Col lg="4">
            <Card className="border-0 shadow-sm preview-card">
              <CardBody className="p-3">
                <h6 className="fw-semibold mb-2">
                  <i className="bi bi-eye me-1" />Preview
                </h6>

                <div className="preview-header text-center mb-2">
                  <div className="preview-icon">
                    <i className="bi bi-box" />
                  </div>
                  <div className="preview-name">{formData.name || 'Plan Name'}</div>
                  <small className="text-muted text-truncate d-block">
                    {formData.description || 'Description'}
                  </small>
                </div>

                <div className="preview-section">
                  <div className="preview-row">
                    <span><i className="bi bi-people me-1" />Users</span>
                    {(() => {
                      const usersConfig = formData.featureConfigs.USERS;
                      if (!usersConfig?.isEnabled || usersConfig.limitType === 'UNLIMITED') {
                        return <Badge color="success" pill>Unlimited</Badge>;
                      }
                      if (usersConfig.limitType === 'QUOTA') {
                        if (usersConfig.overageBehavior === 'BLOCK') {
                          return <Badge color="primary" pill>{usersConfig.includedQuota || 0} max</Badge>;
                        }
                        if (usersConfig.overageBehavior === 'CHARGE') {
                          return (
                            <span>
                              <Badge color="primary" pill className="me-1">{usersConfig.includedQuota || 0}</Badge>
                              <small className="text-warning">+${usersConfig.overagePrice || 0}/ea</small>
                            </span>
                          );
                        }
                        return <Badge color="info" pill>{usersConfig.includedQuota || 0}</Badge>;
                      }
                      return <Badge color="secondary" pill>-</Badge>;
                    })()}
                  </div>
                  <div className="preview-row">
                    <span><i className="bi bi-calendar me-1" />Trial</span>
                    <span>{formData.trialDays || 0} days</span>
                  </div>
                  <div className="preview-row">
                    <span><i className="bi bi-hourglass me-1" />Grace</span>
                    <span>{formData.gracePeriodDays || 0} days</span>
                  </div>
                </div>

                <div className="preview-pricing">
                  {formData.billingCycleOptions.includes('MONTHLY') && (
                    <div className="price-item">
                      <span className="text-muted">Monthly</span>
                      <span className="price text-primary">${formData.monthlyBasePrice || '0'}</span>
                    </div>
                  )}
                  {formData.billingCycleOptions.includes('YEARLY') && (
                    <div className="price-item">
                      <span className="text-muted">Yearly</span>
                      <span className="price text-success">${formData.yearlyBasePrice || '0'}</span>
                    </div>
                  )}
                </div>

                <div className="preview-features">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <small className="fw-semibold">Features</small>
                    <Badge color="secondary" pill>{enabledFeaturesCount}</Badge>
                  </div>
                  {enabledFeaturesCount === 0 ? (
                    <small className="text-muted">No features enabled</small>
                  ) : (
                    <div className="feature-list">
                      {Object.entries(formData.featureConfigs)
                        .filter(([, cfg]) => cfg.isEnabled)
                        .slice(0, 4)
                        .map(([code, cfg]) => (
                          <div key={code} className="feature-item">
                            <i className="bi bi-check text-success me-1" />
                            <span>{code}</span>
                            {cfg.limitType === 'QUOTA' && cfg.includedQuota > 0 ? (
                              <span className="ms-auto text-muted">
                                {cfg.includedQuota}
                                {cfg.overageBehavior === 'CHARGE' && cfg.overagePrice > 0 && (
                                  <small className="text-warning"> +${cfg.overagePrice}/ea</small>
                                )}
                              </span>
                            ) : (
                              <span className="ms-auto text-muted">∞</span>
                            )}
                          </div>
                        ))}
                      {enabledFeaturesCount > 4 && (
                        <small className="text-muted">+{enabledFeaturesCount - 4} more</small>
                      )}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default AdminPlanForm;
