import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Table,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  InputGroup,
  InputGroupText,
  Progress,
  Collapse,
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';
import Select from 'react-select';
import BillingService from '../../services/BillingService';
import CompanyService from '../../services/CompanyService';
import { formatDate } from '../localStorageUtil';
import { SubscriptionAuditTimeline } from '../../components/Billing';
import './Billing.scss';

const AdminSubscriptionManagement = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [formData, setFormData] = useState({ planId: '' });
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Usage panel state
  const [expandedSubscription, setExpandedSubscription] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [usageAlerts, setUsageAlerts] = useState([]);
  const [usageLoading, setUsageLoading] = useState(false);

  // Tax config state
  const [taxConfig, setTaxConfig] = useState(null);
  const [taxConfigLoading, setTaxConfigLoading] = useState(false);
  const [taxConfigEditing, setTaxConfigEditing] = useState(false);
  const [taxConfigForm, setTaxConfigForm] = useState({
    taxExempt: false,
    taxExemptReason: '',
    taxRate: '',
    taxLabel: 'Tax',
  });

  // Tax config for assign modal
  const [assignTaxConfig, setAssignTaxConfig] = useState({
    taxExempt: false,
    taxExemptReason: '',
    taxRate: '',
    taxLabel: 'Tax',
  });

  // Audit history modal state
  const [showAuditHistory, setShowAuditHistory] = useState(false);
  const [auditCompanyId, setAuditCompanyId] = useState(null);

  const fetchPlans = async () => {
    try {
      const response = await BillingService.getAllActivePlans();
      setPlans(response.data);
    } catch (error) {
      toast.error('Failed to fetch plans');
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await CompanyService.getAllCompanies();
      setCompanies(response?.data?.content || []);
    } catch (error) {
      toast.error('Failed to fetch companies');
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const response = await BillingService.getAllSubscriptions('');
      setSubscriptions(response.data || []);
    } catch (error) {
      toast.error('Failed to fetch subscriptions');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchPlans(), fetchCompanies(), fetchSubscriptions()]);
      setInitialLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    let result = subscriptions;

    if (filterStatus !== 'all') {
      result = result.filter((s) => s.status === filterStatus);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.companyName?.toLowerCase().includes(term) ||
          s.planName?.toLowerCase().includes(term),
      );
    }

    setFilteredSubscriptions(result);
  }, [subscriptions, filterStatus, searchTerm]);

  // Helper to unwrap JsonNullable values from backend
  // JsonNullable creates { present: boolean, value: T } structure
  const unwrapJsonNullable = (data) => {
    if (data && typeof data === 'object' && 'present' in data) {
      return data.present ? data.value : null;
    }
    return data;
  };

  // Fetch usage data for selected subscription
  const fetchUsageData = useCallback(async (companyId) => {
    if (!companyId) return;
    setUsageLoading(true);
    try {
      const [usageResponse, alertsResponse] = await Promise.all([
        BillingService.getBillingDetails(companyId),
        BillingService.getCompanyUsageAlerts(companyId).catch(() => ({ data: [] })),
      ]);
      // Unwrap JsonNullable fields if present
      const data = usageResponse.data;
      if (data) {
        data.featureUsage = unwrapJsonNullable(data.featureUsage);
        data.featureFlags = unwrapJsonNullable(data.featureFlags);
      }
      setUsageData(data);
      setUsageAlerts(alertsResponse.data || []);
    } catch (error) {
      console.error('Failed to fetch usage data:', error);
      setUsageData(null);
    } finally {
      setUsageLoading(false);
    }
  }, []);

  // Fetch tax config for selected subscription
  const fetchTaxConfig = useCallback(async (companyId) => {
    if (!companyId) return;
    setTaxConfigLoading(true);
    try {
      const response = await BillingService.getTaxConfig(companyId);
      setTaxConfig(response.data);
      setTaxConfigForm({
        taxExempt: response.data.taxExempt || false,
        taxExemptReason: response.data.taxExemptReason || '',
        taxRate: response.data.taxRate !== null ? response.data.taxRate : '',
        taxLabel: response.data.taxLabel || 'Tax',
      });
    } catch (error) {
      console.error('Failed to fetch tax config:', error);
      setTaxConfig(null);
    } finally {
      setTaxConfigLoading(false);
    }
  }, []);

  // Save tax config
  const saveTaxConfig = async (companyId) => {
    try {
      setTaxConfigLoading(true);
      const payload = {
        taxExempt: taxConfigForm.taxExempt,
        taxExemptReason: taxConfigForm.taxExempt ? taxConfigForm.taxExemptReason : null,
        taxRate: taxConfigForm.taxRate !== '' ? parseFloat(taxConfigForm.taxRate) : null,
        taxLabel: taxConfigForm.taxLabel || 'Tax',
      };
      const response = await BillingService.updateTaxConfig(companyId, payload);
      setTaxConfig(response.data);
      setTaxConfigEditing(false);
      toast.success('Tax configuration saved successfully');
    } catch (error) {
      toast.error('Failed to save tax configuration');
    } finally {
      setTaxConfigLoading(false);
    }
  };

  // Handle subscription row click
  const handleSubscriptionClick = (subscription) => {
    if (expandedSubscription?.subscriptionId === subscription.subscriptionId) {
      // Collapse if clicking same row
      setExpandedSubscription(null);
      setUsageData(null);
      setUsageAlerts([]);
      setTaxConfig(null);
      setTaxConfigEditing(false);
    } else {
      // Expand and fetch usage + tax config
      setExpandedSubscription(subscription);
      setTaxConfigEditing(false);
      // Fetch usage data for active, trial, past_due, and suspended subscriptions
      if (['ACTIVE', 'TRIAL', 'PAST_DUE', 'SUSPENDED'].includes(subscription.status)) {
        fetchUsageData(subscription.companyId);
      }
      fetchTaxConfig(subscription.companyId);
    }
  };

  const getFeatureIcon = (featureCode) => {
    const icons = {
      USERS: 'bi-people-fill',
      AI_CYCLES: 'bi-cpu',
      RFQ_COUNT: 'bi-file-earmark-text',
      OCR_DOCUMENTS: 'bi-file-earmark-image',
      ERP_INTEGRATIONS: 'bi-diagram-3',
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

  const getProgressColor = (percentUsed) => {
    if (percentUsed >= 90) return 'danger';
    if (percentUsed >= 75) return 'warning';
    if (percentUsed >= 50) return 'primary';
    return 'success';
  };

  const getBillingCycleLabel = (cycle) => {
    return cycle === 'YEARLY' ? 'Yearly' : 'Monthly';
  };

  const resetForm = () => {
    setSelectedCompany(null);
    setSelectedPlan(null);
    setFormData({ planId: '' });
    setAssignTaxConfig({
      taxExempt: false,
      taxExemptReason: '',
      taxRate: '',
      taxLabel: 'Tax',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === 'planId' && value) {
      const plan = plans.find((p) => p.planId === parseInt(value, 10));
      setSelectedPlan(plan);
    } else if (name === 'planId') {
      setSelectedPlan(null);
    }
  };

  const handleAssignPlan = async () => {
    if (!selectedCompany || !formData.planId || !selectedPlan) {
      toast.error('Please fill in all required fields');
      return;
    }

    setAssignModal(false);

    Swal.fire({
      title: 'Assigning Plan...',
      html: 'Please wait...',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      setLoading(true);
      await BillingService.assignPlanToCompany({
        companyId: selectedCompany.companyId,
        planId: parseInt(formData.planId, 10),
        billingCycle: selectedPlan.billingCycle,
        startDate: new Date().toISOString(),
      });

      // Save tax configuration if any values were set
      if (assignTaxConfig.taxExempt || assignTaxConfig.taxRate !== '' || assignTaxConfig.taxLabel !== 'Tax') {
        try {
          await BillingService.updateTaxConfig(selectedCompany.companyId, {
            taxExempt: assignTaxConfig.taxExempt,
            taxExemptReason: assignTaxConfig.taxExempt ? assignTaxConfig.taxExemptReason : null,
            taxRate: assignTaxConfig.taxRate !== '' ? parseFloat(assignTaxConfig.taxRate) : null,
            taxLabel: assignTaxConfig.taxLabel || 'Tax',
          });
        } catch (taxError) {
          console.error('Failed to save tax config:', taxError);
          // Continue anyway - plan was assigned
        }
      }

      Swal.fire({
        title: 'Success!',
        text: 'Plan assigned successfully!',
        icon: 'success',
        confirmButtonColor: '#28a745',
      });

      resetForm();
      fetchSubscriptions();
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to assign plan',
        icon: 'error',
        confirmButtonColor: '#dc3545',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeClick = (subscription) => {
    setSelectedSubscription(subscription);
    setSelectedPlanId('');
    setUpgradeModal(true);
  };

  const handleUpgradePlan = async () => {
    if (!selectedPlanId) {
      toast.error('Please select a plan');
      return;
    }

    setUpgradeModal(false);

    Swal.fire({
      title: 'Upgrading...',
      html: 'Please wait...',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      setLoading(true);
      await BillingService.upgradePlan(selectedSubscription.companyId, {
        newPlanId: parseInt(selectedPlanId, 10),
        effectiveDate: new Date().toISOString(),
      });

      Swal.fire({
        title: 'Success!',
        text: 'Plan upgraded successfully!',
        icon: 'success',
        confirmButtonColor: '#28a745',
      });

      fetchSubscriptions();
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to upgrade plan',
        icon: 'error',
        confirmButtonColor: '#dc3545',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateClick = async (subscription) => {
    const { value: reason } = await Swal.fire({
      title: 'Terminate Subscription?',
      html: `<p class="mb-2"><strong>${subscription.companyName}</strong> - ${subscription.planName}</p>
             <p class="text-danger small">This action cannot be undone.</p>`,
      input: 'textarea',
      inputLabel: 'Reason',
      inputPlaceholder: 'Enter reason...',
      showCancelButton: true,
      confirmButtonText: 'Terminate',
      confirmButtonColor: '#dc3545',
      inputValidator: (value) => (!value ? 'Please provide a reason' : undefined),
    });

    if (!reason) return;

    Swal.fire({
      title: 'Terminating...',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      setLoading(true);
      await BillingService.terminateSubscription(subscription.companyId, {
        reason,
        effectiveDate: new Date().toISOString(),
      });

      Swal.fire({
        title: 'Success!',
        text: 'Subscription terminated.',
        icon: 'success',
        confirmButtonColor: '#28a745',
      });

      fetchSubscriptions();
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to terminate',
        icon: 'error',
        confirmButtonColor: '#dc3545',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      TRIAL: 'primary',
      ACTIVE: 'success',
      EXPIRED: 'danger',
      CANCELLED: 'secondary',
      TERMINATED: 'dark',
      PAST_DUE: 'warning',
      SUSPENDED: 'danger',
      CANCELED: 'secondary',
    };
    return colors[status] || 'secondary';
  };

  // Handle suspend subscription
  const handleSuspendClick = async (subscription) => {
    const { value: reason } = await Swal.fire({
      title: 'Suspend Subscription?',
      html: `<p class="mb-2"><strong>${subscription.companyName}</strong> - ${subscription.planName}</p>
             <p class="text-warning small">This will block the company's access to the platform.</p>`,
      input: 'textarea',
      inputLabel: 'Reason (optional)',
      inputPlaceholder: 'Enter reason for suspension...',
      showCancelButton: true,
      confirmButtonText: 'Suspend',
      confirmButtonColor: '#dc3545',
    });

    if (reason === undefined) return; // User cancelled

    Swal.fire({
      title: 'Suspending...',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      setLoading(true);
      await BillingService.suspendSubscription(subscription.companyId, reason || '');

      Swal.fire({
        title: 'Success!',
        text: 'Subscription suspended successfully.',
        icon: 'success',
        confirmButtonColor: '#28a745',
      });

      fetchSubscriptions();
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to suspend subscription',
        icon: 'error',
        confirmButtonColor: '#dc3545',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle resume subscription
  const handleResumeClick = async (subscription) => {
    const result = await Swal.fire({
      title: 'Resume Subscription?',
      html: `<p class="mb-2"><strong>${subscription.companyName}</strong> - ${subscription.planName}</p>
             <p class="text-info small">This will restore the company's access to the platform.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Resume',
      confirmButtonColor: '#28a745',
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: 'Resuming...',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      setLoading(true);
      await BillingService.resumeSubscription(subscription.companyId);

      Swal.fire({
        title: 'Success!',
        text: 'Subscription resumed successfully.',
        icon: 'success',
        confirmButtonColor: '#28a745',
      });

      fetchSubscriptions();
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to resume subscription',
        icon: 'error',
        confirmButtonColor: '#dc3545',
      });
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter((s) => s.status === 'ACTIVE').length,
    trial: subscriptions.filter((s) => s.status === 'TRIAL').length,
    pastDue: subscriptions.filter((s) => s.status === 'PAST_DUE').length,
    suspended: subscriptions.filter((s) => s.status === 'SUSPENDED').length,
    expired: subscriptions.filter((s) => s.status === 'EXPIRED' || s.status === 'CANCELLED' || s.status === 'TERMINATED' || s.status === 'CANCELED').length,
  };

  if (initialLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
        <Spinner color="primary" />
      </div>
    );
  }

  return (
    <div className="subscription-mgmt-container">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-0 fw-semibold">Subscription Management</h5>
          <small className="text-muted">Manage company subscriptions</small>
        </div>
        <Button color="primary" size="sm" onClick={() => setAssignModal(true)}>
          <i className="bi bi-plus me-1" />
          Assign Plan
        </Button>
      </div>

      {/* Stats Row */}
      <Row className="g-2 mb-3">
        <Col xs="6" md="2">
          <Card className="stat-card border-0">
            <CardBody className="py-2 px-3">
              <div className="d-flex align-items-center">
                <div className="stat-icon bg-primary-subtle text-primary me-2">
                  <i className="bi bi-collection" />
                </div>
                <div>
                  <div className="stat-value">{stats.total}</div>
                  <div className="stat-label">Total</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xs="6" md="2">
          <Card className="stat-card border-0">
            <CardBody className="py-2 px-3">
              <div className="d-flex align-items-center">
                <div className="stat-icon bg-success-subtle text-success me-2">
                  <i className="bi bi-check-circle" />
                </div>
                <div>
                  <div className="stat-value">{stats.active}</div>
                  <div className="stat-label">Active</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xs="6" md="2">
          <Card className="stat-card border-0">
            <CardBody className="py-2 px-3">
              <div className="d-flex align-items-center">
                <div className="stat-icon bg-info-subtle text-info me-2">
                  <i className="bi bi-hourglass-split" />
                </div>
                <div>
                  <div className="stat-value">{stats.trial}</div>
                  <div className="stat-label">Trial</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xs="6" md="2">
          <Card className="stat-card border-0">
            <CardBody className="py-2 px-3">
              <div className="d-flex align-items-center">
                <div className="stat-icon bg-warning-subtle text-warning me-2">
                  <i className="bi bi-exclamation-triangle" />
                </div>
                <div>
                  <div className="stat-value">{stats.pastDue}</div>
                  <div className="stat-label">Past Due</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xs="6" md="2">
          <Card className="stat-card border-0">
            <CardBody className="py-2 px-3">
              <div className="d-flex align-items-center">
                <div className="stat-icon bg-danger-subtle text-danger me-2">
                  <i className="bi bi-pause-circle" />
                </div>
                <div>
                  <div className="stat-value">{stats.suspended}</div>
                  <div className="stat-label">Suspended</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xs="6" md="2">
          <Card className="stat-card border-0">
            <CardBody className="py-2 px-3">
              <div className="d-flex align-items-center">
                <div className="stat-icon bg-secondary-subtle text-secondary me-2">
                  <i className="bi bi-x-circle" />
                </div>
                <div>
                  <div className="stat-value">{stats.expired}</div>
                  <div className="stat-label">Inactive</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Filters & Table */}
      <Card className="border-0 shadow-sm">
        <CardBody className="py-2 px-3">
          <Row className="align-items-center g-2 mb-2">
            <Col md="5">
              <InputGroup size="sm">
                <InputGroupText className="bg-white">
                  <i className="bi bi-search text-muted" />
                </InputGroupText>
                <Input
                  type="text"
                  placeholder="Search company or plan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  bsSize="sm"
                />
              </InputGroup>
            </Col>
            <Col md="3">
              <Input
                type="select"
                bsSize="sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="TRIAL">Trial</option>
                <option value="PAST_DUE">Past Due</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </Input>
            </Col>
            <Col md="4" className="text-end">
              <small className="text-muted">
                {filteredSubscriptions.length} of {subscriptions.length}
              </small>
            </Col>
          </Row>
        </CardBody>

        <Table hover responsive className="subscription-table mb-0">
          <thead>
            <tr>
              <th>Company</th>
              <th>Plan</th>
              <th className="text-center">Status</th>
              <th className="text-center">Billing</th>
              <th className="text-center">Start</th>
              <th className="text-center">Next Billing</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubscriptions.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4">
                  <i className="bi bi-inbox fs-3 text-muted d-block mb-2" />
                  <span className="text-muted">No subscriptions found</span>
                </td>
              </tr>
            ) : (
              filteredSubscriptions.map((sub) => (
                <React.Fragment key={sub.subscriptionId}>
                  <tr
                    className={expandedSubscription?.subscriptionId === sub.subscriptionId ? 'selected' : ''}
                    onClick={() => handleSubscriptionClick(sub)}
                  >
                    <td>
                      <div className="d-flex align-items-center">
                        <span className="fw-medium">{sub.companyName}</span>
                        {expandedSubscription?.subscriptionId === sub.subscriptionId ? (
                          <i className="bi bi-chevron-up ms-2 text-primary" />
                        ) : (
                          <i className="bi bi-chevron-down ms-2 text-muted" />
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="fw-medium">{sub.planName}</div>
                    </td>
                    <td className="text-center">
                      <Badge color={getStatusColor(sub.status)} pill>
                        {sub.status}
                      </Badge>
                    </td>
                    <td className="text-center">
                      <Badge color={sub.billingCycle === 'YEARLY' ? 'success' : 'primary'} pill>
                        {sub.billingCycle === 'YEARLY' ? 'Y' : 'M'}
                      </Badge>
                    </td>
                    <td className="text-center">{formatDate(sub.startDate)}</td>
                    <td className="text-center">
                      <span className={new Date(sub.nextBillingDate) < new Date() ? 'text-danger' : ''}>
                        {formatDate(sub.nextBillingDate)}
                      </span>
                    </td>
                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="d-flex justify-content-center gap-1">
                        {/* Active/Trial subscriptions: Upgrade, Suspend, Terminate */}
                        {(sub.status === 'ACTIVE' || sub.status === 'TRIAL') && (
                          <>
                            <Button
                              color="outline-primary"
                              size="sm"
                              onClick={() => handleUpgradeClick(sub)}
                              title="Upgrade Plan"
                            >
                              <i className="bi bi-arrow-up" />
                            </Button>
                            <Button
                              color="outline-warning"
                              size="sm"
                              onClick={() => handleSuspendClick(sub)}
                              title="Suspend"
                            >
                              <i className="bi bi-pause" />
                            </Button>
                            <Button
                              color="outline-danger"
                              size="sm"
                              onClick={() => handleTerminateClick(sub)}
                              title="Terminate"
                            >
                              <i className="bi bi-x" />
                            </Button>
                          </>
                        )}

                        {/* Past Due subscriptions: Suspend or Resume options */}
                        {sub.status === 'PAST_DUE' && (
                          <>
                            <Button
                              color="outline-warning"
                              size="sm"
                              onClick={() => handleSuspendClick(sub)}
                              title="Suspend"
                            >
                              <i className="bi bi-pause" />
                            </Button>
                            <Button
                              color="outline-danger"
                              size="sm"
                              onClick={() => handleTerminateClick(sub)}
                              title="Terminate"
                            >
                              <i className="bi bi-x" />
                            </Button>
                          </>
                        )}

                        {/* Suspended subscriptions: Resume option */}
                        {sub.status === 'SUSPENDED' && (
                          <>
                            <Button
                              color="outline-success"
                              size="sm"
                              onClick={() => handleResumeClick(sub)}
                              title="Resume"
                            >
                              <i className="bi bi-play" />
                            </Button>
                            <Button
                              color="outline-danger"
                              size="sm"
                              onClick={() => handleTerminateClick(sub)}
                              title="Terminate"
                            >
                              <i className="bi bi-x" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {/* Usage Panel - Shows when subscription is expanded */}
                  {expandedSubscription?.subscriptionId === sub.subscriptionId && (
                    <tr>
                      <td colSpan="7" className="p-0 border-0">
                        <div className="usage-panel m-2">
                          <div className="usage-header d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">
                              <i className="bi bi-bar-chart me-2" />
                              Usage Overview - {sub.companyName}
                            </h6>
                            <span className="small">
                              Plan: {sub.planName}
                            </span>
                          </div>
                          <div className="usage-content">
                            {usageLoading ? (
                              <div className="text-center py-4">
                                <Spinner size="sm" color="primary" />
                                <span className="ms-2 text-muted">Loading usage data...</span>
                              </div>
                            ) : usageData ? (
                              <>
                                {/* Usage Alerts - deduplicated by feature code */}
                                {usageAlerts.length > 0 && (
                                  <div className="usage-alerts mb-3">
                                    <small className="text-muted fw-semibold mb-2 d-block">
                                      <i className="bi bi-exclamation-triangle text-warning me-1" />
                                      Active Alerts
                                    </small>
                                    {usageAlerts
                                      .filter((alert, idx, self) =>
                                        idx === self.findIndex((a) => a.featureCode === alert.featureCode)
                                      )
                                      .slice(0, 3)
                                      .map((alert, idx) => (
                                        <div key={idx} className="alert-item small">
                                          <strong>{getFeatureLabel(alert.featureCode)}:</strong>{' '}
                                          {alert.alertType?.replace('_', ' ')}
                                        </div>
                                      ))}
                                  </div>
                                )}

                                {/* Feature Usage Cards */}
                                {usageData.featureUsage && Object.keys(usageData.featureUsage).length > 0 ? (
                                  <Row className="g-2">
                                    {Object.entries(usageData.featureUsage).map(([key, usage]) => {
                                      // Use key as featureCode if usage.featureCode is missing
                                      const featureCode = usage?.featureCode || key;
                                      const currentUsage = usage?.currentUsage ?? 0;
                                      const limit = usage?.limit ?? 0;
                                      const isUnlimited = usage?.isUnlimited || limit < 0;
                                      const percentUsed = usage?.percentUsed ?? 0;
                                      const overageUsage = usage?.overageUsage ?? 0;

                                      return (
                                        <Col xs="6" md="4" lg="2" key={key}>
                                          <div className="usage-card">
                                            <div className="d-flex align-items-center mb-2">
                                              <div className={`usage-icon bg-${getProgressColor(percentUsed)}-subtle text-${getProgressColor(percentUsed)} me-2`}>
                                                <i className={`bi ${getFeatureIcon(featureCode)}`} />
                                              </div>
                                              <div className="small fw-semibold text-truncate">
                                                {getFeatureLabel(featureCode)}
                                              </div>
                                            </div>
                                            <div className="small mb-1">
                                              <span className="fw-bold">{currentUsage}</span>
                                              <span className="text-muted"> / {isUnlimited ? '∞' : limit}</span>
                                            </div>
                                            {!isUnlimited && limit > 0 && (
                                              <Progress
                                                value={Math.min(percentUsed, 100)}
                                                color={getProgressColor(percentUsed)}
                                                className="mb-1"
                                              />
                                            )}
                                            {isUnlimited && (
                                              <Badge color="success" className="small">Unlimited</Badge>
                                            )}
                                            {overageUsage > 0 && (
                                              <Badge color="danger" className="small">+{overageUsage} overage</Badge>
                                            )}
                                          </div>
                                        </Col>
                                      );
                                    })}
                                  </Row>
                                ) : (
                                  <div className="text-center py-3">
                                    <i className="bi bi-bar-chart text-muted fs-4 d-block mb-2" />
                                    <span className="text-muted small">No feature usage tracked yet</span>
                                  </div>
                                )}

                                {/* Quick Stats */}
                                <div className="mt-3 pt-2 border-top">
                                  <Row className="small text-muted">
                                    <Col>
                                      <strong>Active Users:</strong> {usageData.activeUserCount || 0}
                                    </Col>
                                    <Col>
                                      <strong>Next Billing:</strong> {formatDate(usageData.nextBillingDate)}
                                    </Col>
                                    <Col className="text-end d-flex justify-content-end gap-2">
                                      <Button
                                        color="link"
                                        size="sm"
                                        className="p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAuditCompanyId(sub.companyId);
                                          setShowAuditHistory(true);
                                        }}
                                      >
                                        <i className="bi bi-clock-history me-1" />
                                        History
                                      </Button>
                                      <Button
                                        color="link"
                                        size="sm"
                                        className="p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/invoice-management?company=${sub.companyId}`);
                                        }}
                                      >
                                        View Invoices <i className="bi bi-arrow-right" />
                                      </Button>
                                    </Col>
                                  </Row>
                                </div>
                              </>
                            ) : (
                              <div className="text-center py-3">
                                <i className="bi bi-bar-chart text-muted fs-4 d-block mb-2" />
                                <span className="text-muted small">No usage data available</span>
                              </div>
                            )}

                            {/* Tax Configuration Section */}
                            <div className="mt-3 pt-3 border-top">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="mb-0 small fw-semibold">
                                  <i className="bi bi-percent me-2 text-success" />
                                  Tax Configuration
                                </h6>
                                {!taxConfigEditing && (
                                  <Button
                                    color="outline-primary"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTaxConfigEditing(true);
                                    }}
                                  >
                                    <i className="bi bi-pencil me-1" />
                                    Edit
                                  </Button>
                                )}
                              </div>

                              {taxConfigLoading ? (
                                <div className="text-center py-2">
                                  <Spinner size="sm" color="primary" />
                                </div>
                              ) : taxConfigEditing ? (
                                <div className="border rounded p-2" onClick={(e) => e.stopPropagation()}>
                                  <Row className="g-2">
                                    <Col md="3">
                                      <FormGroup check className="mb-2">
                                        <Input
                                          type="checkbox"
                                          id="taxExempt"
                                          checked={taxConfigForm.taxExempt}
                                          onChange={(e) => setTaxConfigForm({
                                            ...taxConfigForm,
                                            taxExempt: e.target.checked,
                                          })}
                                        />
                                        <Label check for="taxExempt" className="small">
                                          Tax Exempt
                                        </Label>
                                      </FormGroup>
                                    </Col>
                                    <Col md="3">
                                      <Label className="small text-muted mb-1">Tax Rate (%)</Label>
                                      <Input
                                        type="number"
                                        bsSize="sm"
                                        placeholder={`Default: ${taxConfig?.defaultTaxRate || 10}%`}
                                        value={taxConfigForm.taxRate}
                                        onChange={(e) => setTaxConfigForm({
                                          ...taxConfigForm,
                                          taxRate: e.target.value,
                                        })}
                                        disabled={taxConfigForm.taxExempt}
                                        step="0.01"
                                        min="0"
                                        max="100"
                                      />
                                    </Col>
                                    <Col md="3">
                                      <Label className="small text-muted mb-1">Tax Label</Label>
                                      <Input
                                        type="text"
                                        bsSize="sm"
                                        placeholder="e.g., GST, VAT"
                                        value={taxConfigForm.taxLabel}
                                        onChange={(e) => setTaxConfigForm({
                                          ...taxConfigForm,
                                          taxLabel: e.target.value,
                                        })}
                                        disabled={taxConfigForm.taxExempt}
                                      />
                                    </Col>
                                    <Col md="3">
                                      {taxConfigForm.taxExempt && (
                                        <>
                                          <Label className="small text-muted mb-1">Exemption Reason</Label>
                                          <Input
                                            type="text"
                                            bsSize="sm"
                                            placeholder="e.g., SEZ Unit"
                                            value={taxConfigForm.taxExemptReason}
                                            onChange={(e) => setTaxConfigForm({
                                              ...taxConfigForm,
                                              taxExemptReason: e.target.value,
                                            })}
                                          />
                                        </>
                                      )}
                                    </Col>
                                  </Row>
                                  <div className="d-flex justify-content-end gap-2 mt-2">
                                    <Button
                                      color="secondary"
                                      size="sm"
                                      outline
                                      onClick={() => {
                                        setTaxConfigEditing(false);
                                        if (taxConfig) {
                                          setTaxConfigForm({
                                            taxExempt: taxConfig.taxExempt || false,
                                            taxExemptReason: taxConfig.taxExemptReason || '',
                                            taxRate: taxConfig.taxRate !== null ? taxConfig.taxRate : '',
                                            taxLabel: taxConfig.taxLabel || 'Tax',
                                          });
                                        }
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      color="success"
                                      size="sm"
                                      onClick={() => saveTaxConfig(sub.companyId)}
                                      disabled={taxConfigLoading}
                                    >
                                      {taxConfigLoading ? <Spinner size="sm" /> : 'Save'}
                                    </Button>
                                  </div>
                                </div>
                              ) : taxConfig ? (
                                <Row className="g-2 small">
                                  <Col md="3">
                                    <div className="border rounded p-2">
                                      <div className="text-muted mb-1">Status</div>
                                      <div className="fw-semibold">
                                        {taxConfig.taxExempt ? (
                                          <Badge color="warning">Tax Exempt</Badge>
                                        ) : (
                                          <Badge color="success">Taxable</Badge>
                                        )}
                                      </div>
                                    </div>
                                  </Col>
                                  <Col md="3">
                                    <div className="border rounded p-2">
                                      <div className="text-muted mb-1">Effective Rate</div>
                                      <div className="fw-semibold">
                                        {taxConfig.effectiveTaxRate}%
                                        {taxConfig.taxRate === null && !taxConfig.taxExempt && (
                                          <span className="text-muted fw-normal"> (default)</span>
                                        )}
                                      </div>
                                    </div>
                                  </Col>
                                  <Col md="3">
                                    <div className="border rounded p-2">
                                      <div className="text-muted mb-1">Label</div>
                                      <div className="fw-semibold">{taxConfig.taxLabel || 'Tax'}</div>
                                    </div>
                                  </Col>
                                  {taxConfig.taxExempt && taxConfig.taxExemptReason && (
                                    <Col md="3">
                                      <div className="border rounded p-2">
                                        <div className="text-muted mb-1">Exemption Reason</div>
                                        <div className="fw-semibold">{taxConfig.taxExemptReason}</div>
                                      </div>
                                    </Col>
                                  )}
                                </Row>
                              ) : (
                                <div className="text-center py-2 text-muted small">
                                  No tax configuration
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      {/* Assign Plan Modal */}
      <Modal isOpen={assignModal} toggle={() => setAssignModal(false)} size="md">
        <ModalHeader toggle={() => setAssignModal(false)}>
          <i className="bi bi-plus-circle me-2" />Assign Plan to Company
        </ModalHeader>
        <ModalBody>
          <FormGroup className="mb-3">
            <Label className="small fw-semibold">Company *</Label>
            <Select
              options={companies.map((c) => ({
                value: c.companyId,
                label: c.name,
                ...c,
              }))}
              value={selectedCompany ? { value: selectedCompany.companyId, label: selectedCompany.name } : null}
              onChange={(option) => setSelectedCompany(option)}
              placeholder="Search company..."
              isClearable
              isSearchable
              styles={{
                control: (base) => ({ ...base, fontSize: '0.85rem', minHeight: '36px' }),
                menu: (base) => ({ ...base, fontSize: '0.85rem' }),
              }}
            />
          </FormGroup>

          <FormGroup className="mb-3">
            <Label className="small fw-semibold">Plan *</Label>
            <Input
              type="select"
              name="planId"
              bsSize="sm"
              value={formData.planId}
              onChange={handleInputChange}
            >
              <option value="">Select a plan</option>
              {plans.map((plan) => (
                <option key={plan.planId} value={plan.planId}>
                  {plan.name} - ${plan.basePrice?.toFixed(2) || '0'}/base
                </option>
              ))}
            </Input>
          </FormGroup>

          {selectedPlan && (
            <div className="border rounded p-2 mb-3">
              <div className="d-flex justify-content-between">
                <span className="text-muted">Billing Cycle</span>
                <Badge color="primary">{getBillingCycleLabel(selectedPlan.billingCycle)}</Badge>
              </div>
            </div>
          )}

          {/* Tax Configuration */}
          <div className="border rounded p-2 mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <small className="fw-semibold text-muted">
                <i className="bi bi-percent me-1" />
                Tax Configuration (Optional)
              </small>
            </div>
            <Row className="g-2">
              <Col md="6">
                <FormGroup check className="mb-0">
                  <Input
                    type="checkbox"
                    id="assignTaxExempt"
                    checked={assignTaxConfig.taxExempt}
                    onChange={(e) => setAssignTaxConfig({
                      ...assignTaxConfig,
                      taxExempt: e.target.checked,
                    })}
                  />
                  <Label check for="assignTaxExempt" className="small">
                    Tax Exempt
                  </Label>
                </FormGroup>
              </Col>
              <Col md="6">
                <Input
                  type="number"
                  bsSize="sm"
                  placeholder="Tax Rate % (leave empty for default)"
                  value={assignTaxConfig.taxRate}
                  onChange={(e) => setAssignTaxConfig({
                    ...assignTaxConfig,
                    taxRate: e.target.value,
                  })}
                  disabled={assignTaxConfig.taxExempt}
                  step="0.01"
                  min="0"
                  max="100"
                />
              </Col>
              <Col md="6">
                <Input
                  type="text"
                  bsSize="sm"
                  placeholder="Tax Label (e.g., GST, VAT)"
                  value={assignTaxConfig.taxLabel}
                  onChange={(e) => setAssignTaxConfig({
                    ...assignTaxConfig,
                    taxLabel: e.target.value,
                  })}
                  disabled={assignTaxConfig.taxExempt}
                />
              </Col>
              {assignTaxConfig.taxExempt && (
                <Col md="6">
                  <Input
                    type="text"
                    bsSize="sm"
                    placeholder="Exemption Reason"
                    value={assignTaxConfig.taxExemptReason}
                    onChange={(e) => setAssignTaxConfig({
                      ...assignTaxConfig,
                      taxExemptReason: e.target.value,
                    })}
                  />
                </Col>
              )}
            </Row>
          </div>

          <small className="text-muted">
            <i className="bi bi-info-circle me-1" />
            {selectedPlan?.trialDays
              ? `${selectedPlan.trialDays}-day trial period will be set automatically`
              : 'Trial period based on plan settings'}
          </small>
        </ModalBody>
        <ModalFooter>
          <Button color="outline-secondary" size="sm" onClick={() => { setAssignModal(false); resetForm(); }}>
            Cancel
          </Button>
          <Button
            color="primary"
            size="sm"
            onClick={handleAssignPlan}
            disabled={loading || !selectedCompany || !formData.planId}
          >
            {loading ? <Spinner size="sm" /> : <><i className="bi bi-check me-1" />Assign</>}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Upgrade Modal */}
      <Modal isOpen={upgradeModal} toggle={() => setUpgradeModal(false)} size="md">
        <ModalHeader toggle={() => setUpgradeModal(false)}>
          <i className="bi bi-arrow-up-circle me-2" />Upgrade Subscription
        </ModalHeader>
        <ModalBody>
          {selectedSubscription && (
            <>
              <div className="bg-light rounded p-2 mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Company</span>
                  <strong>{selectedSubscription.companyName}</strong>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Current Plan</span>
                  <span>{selectedSubscription.planName}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Status</span>
                  <Badge color={getStatusColor(selectedSubscription.status)} pill>
                    {selectedSubscription.status}
                  </Badge>
                </div>
              </div>

              <FormGroup>
                <Label className="small fw-semibold">New Plan *</Label>
                <Input
                  type="select"
                  bsSize="sm"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                >
                  <option value="">Select a plan...</option>
                  {plans.map((plan) => (
                    <option key={plan.planId} value={plan.planId}>
                      {plan.name} - ${plan.basePrice?.toFixed(2) || '0'} ({plan.billingCycle})
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="outline-secondary" size="sm" onClick={() => setUpgradeModal(false)}>
            Cancel
          </Button>
          <Button
            color="primary"
            size="sm"
            onClick={handleUpgradePlan}
            disabled={loading || !selectedPlanId}
          >
            {loading ? <Spinner size="sm" /> : <><i className="bi bi-arrow-up me-1" />Upgrade</>}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Subscription Audit History Modal */}
      <SubscriptionAuditTimeline
        isOpen={showAuditHistory}
        toggle={() => {
          setShowAuditHistory(false);
          setAuditCompanyId(null);
        }}
        companyId={auditCompanyId}
        isAdmin
      />
    </div>
  );
};

export default AdminSubscriptionManagement;
