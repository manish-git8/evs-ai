import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  Label,
  Input,
  Button,
  Spinner,
  ButtonGroup,
  Alert,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import 'react-bootstrap-table/dist/react-bootstrap-table-all.min.css';
import Select from 'react-select';
import BillingService from '../../services/BillingService';
import CompanyService from '../../services/CompanyService';
import { formatDate } from '../localStorageUtil';
import './Billing.scss';

const AdminSubscriptionManagement = () => {
  const [plans, setPlans] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);

  const [formData, setFormData] = useState({
    planId: '',
  });

  const [selectedPlan, setSelectedPlan] = useState(null);

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
      setCompanies(response?.data?.content);
    } catch (error) {
      toast.error('Failed to fetch companies');
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setSubscriptionsLoading(true);
      const response = await BillingService.getAllSubscriptions(filterStatus);
      setSubscriptions(response.data);
    } catch (error) {
      toast.error('Failed to fetch subscriptions');
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  const getBillingCycleLabel = (cycle) => {
    const labels = {
      MONTHLY: 'Monthly',
      YEARLY: 'Yearly',
    };
    return labels[cycle] || cycle;
  };

  const resetForm = () => {
    setSelectedCompany(null);
    setSelectedPlan(null);
    setFormData({
      planId: '',
    });
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchPlans(), fetchCompanies(), fetchSubscriptions()]);
      setInitialLoading(false);
    };

    loadData();
  }, [filterStatus]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // If plan is selected, find and store the plan object
    if (name === 'planId' && value) {
      const plan = plans.find((p) => p.planId === parseInt(value, 10));
      setSelectedPlan(plan);
    } else if (name === 'planId' && !value) {
      setSelectedPlan(null);
    }
  };

  const handleAssignPlan = async () => {
    if (!selectedCompany || !formData.planId || !selectedPlan) {
      toast.error('Please fill in all required fields');
      return;
    }

    const { billingCycle } = selectedPlan;

    // Show assigning progress
    Swal.fire({
      title: 'Assigning Plan...',
      html: 'Please wait while we assign the plan to the company.',
      icon: 'info',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      setLoading(true);
      const requestData = {
        companyId: selectedCompany.companyId,
        planId: parseInt(formData.planId, 10),
        billingCycle,
        startDate: new Date().toISOString(),
      };

      await BillingService.assignPlanToCompany(requestData);

      // Show success message
      Swal.fire({
        title: 'Success!',
        html: `Plan assigned successfully with ${getBillingCycleLabel(billingCycle).toLowerCase()} billing and 60-day trial!<br/>Email notification sent to company admins.`,
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#28a745',
      });

      resetForm();
      fetchSubscriptions();
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to assign plan',
        icon: 'error',
        confirmButtonText: 'OK',
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

    const result = await Swal.fire({
      title: 'Confirm Upgrade',
      html: `
        <div class="text-start">
          <p><strong>Company:</strong> ${selectedSubscription.companyName}</p>
          <p><strong>Current Plan:</strong> ${selectedSubscription.planName}</p>
          <p><strong>New Plan:</strong> ${plans.find(p => p.planId === parseInt(selectedPlanId, 10))?.name}</p>
          <p class="text-info mt-3">Are you sure you want to upgrade this subscription?</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Upgrade',
      confirmButtonColor: '#0d6efd',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    // Close the modal first
    setUpgradeModal(false);

    // Show upgrading progress
    Swal.fire({
      title: 'Upgrading...',
      html: 'Please wait while we upgrade the subscription plan.',
      icon: 'info',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      setLoading(true);
      const requestData = {
        newPlanId: parseInt(selectedPlanId, 10),
        effectiveDate: new Date().toISOString(),
      };

      await BillingService.upgradePlan(selectedSubscription.companyId, requestData);

      // Show success message
      Swal.fire({
        title: 'Success!',
        text: 'Plan upgraded successfully! Notification email sent to the company.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#28a745',
      });

      fetchSubscriptions();
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to upgrade plan',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc3545',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateClick = async (subscription) => {
    const { value: reason } = await Swal.fire({
      title: 'Terminate Subscription?',
      html: `
        <div class="text-start">
          <p class="text-danger fw-bold">This action cannot be undone!</p>
          <p><strong>Company:</strong> ${subscription.companyName}</p>
          <p><strong>Plan:</strong> ${subscription.planName}</p>
          <p><strong>Status:</strong> ${subscription.status}</p>
        </div>
      `,
      input: 'textarea',
      inputLabel: 'Termination Reason *',
      inputPlaceholder: 'Enter reason for termination...',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Terminate',
      confirmButtonColor: '#dc3545',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) {
          return 'Please provide a reason for termination';
        }
        return undefined;
      },
    });

    if (!reason) return;

    // Show terminating progress
    Swal.fire({
      title: 'Terminating...',
      html: 'Please wait while we terminate the subscription.',
      icon: 'info',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      setLoading(true);
      const requestData = {
        reason,
        effectiveDate: new Date().toISOString(),
      };

      await BillingService.terminateSubscription(subscription.companyId, requestData);

      // Show success message
      Swal.fire({
        title: 'Success!',
        html: 'Subscription terminated successfully.<br/>Company notified via email.<br/>Data will be retained for 30 days.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#28a745',
      });

      fetchSubscriptions();
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to terminate subscription',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc3545',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleAssignPlan();
  };

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

  const statusFormatter = (cell) => {
    return (
      <span className={`badge bg-${getStatusBadgeColor(cell)}`}>
        {cell}
      </span>
    );
  };

  const dateFormatter = (cell) => {
    return formatDate(cell);
  };

  const actionsFormatter = (cell, row) => {
    const canUpgrade = row.status === 'ACTIVE' || row.status === 'TRIAL';
    const canTerminate = row.status === 'ACTIVE' || row.status === 'TRIAL';

    return (
      <div className="d-flex gap-1">
        {canUpgrade && (
          <Button
            color="primary"
            size="sm"
            onClick={() => handleUpgradeClick(row)}
            title="Upgrade Plan"
          >
            <i className="bi bi-arrow-up-circle me-1" />
            Upgrade
          </Button>
        )}
        {canTerminate && (
          <Button
            color="danger"
            size="sm"
            onClick={() => handleTerminateClick(row)}
            title="Terminate Subscription"
          >
            <i className="bi bi-x-circle me-1" />
            Terminate
          </Button>
        )}
      </div>
    );
  };

  if (initialLoading) {
    return (
      <div className="text-center mt-5">
        <Spinner color="primary" />
        <p className="mt-2" style={{ color: '#495057' }}>Loading subscription management...</p>
      </div>
    );
  }

  return (
    <div className="admin-subscription-management-container">
      <ToastContainer position="top-right" autoClose={3000} />

      <Row>
        <Col xs="12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-2">
                <i className="bi bi-gear-fill me-2" />
                Subscription Management
              </h2>
              <div className="d-flex gap-4">
                <div>
                  <span className="text-muted me-2">Active:</span>
                  <span className="badge bg-success">{subscriptions.filter((s) => s.status === 'ACTIVE').length}</span>
                </div>
                <div>
                  <span className="text-muted me-2">Trial:</span>
                  <span className="badge bg-info">{subscriptions.filter((s) => s.status === 'TRIAL').length}</span>
                </div>
                <div>
                  <span className="text-muted me-2">Expired:</span>
                  <span className="badge bg-danger">{subscriptions.filter((s) => s.status === 'EXPIRED').length}</span>
                </div>
                <div>
                  <span className="text-muted me-2">Cancelled:</span>
                  <span className="badge bg-secondary">
                    {subscriptions.filter((s) => s.status === 'CANCELLED' || s.status === 'TERMINATED').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col xs="12">
          <Card className="admin-form-card">
            <CardBody>
              <CardTitle tag="h4" className="mb-3">
                Assign Plan to Company
              </CardTitle>

              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md="4">
                    <FormGroup>
                      <Label for="company">Company *</Label>
                      <Select
                        id="company"
                        options={companies.map((company) => ({
                          value: company.companyId,
                          label: company.name,
                          ...company,
                        }))}
                        value={
                          selectedCompany
                            ? {
                                value: selectedCompany.companyId,
                                label: selectedCompany.name,
                              }
                            : null
                        }
                        onChange={(option) => setSelectedCompany(option)}
                        placeholder="Search and select company..."
                        isClearable
                        isSearchable
                        styles={{
                          control: (base) => ({
                            ...base,
                            fontSize: '12px',
                            minHeight: '38px',
                          }),
                          menu: (base) => ({
                            ...base,
                            fontSize: '12px',
                          }),
                        }}
                      />
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <Label for="planId">Plan *</Label>
                      <Input
                        type="select"
                        name="planId"
                        id="planId"
                        value={formData.planId}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select a plan</option>
                        {plans.map((plan) => (
                          <option key={plan.planId} value={plan.planId}>
                            {plan.name} - ${plan.basePrice?.toFixed(2)} + ${plan.pricePerUser?.toFixed(2)}/user
                          </option>
                        ))}
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <Label for="billingCycle">Billing Cycle</Label>
                      <Input
                        type="text"
                        name="billingCycle"
                        id="billingCycle"
                        value={selectedPlan ? getBillingCycleLabel(selectedPlan.billingCycle) : ''}
                        placeholder="Select a plan first"
                        readOnly
                        disabled={!selectedPlan}
                      />
                      {selectedPlan && (
                        <small className="text-muted">
                          Automatically set from selected plan
                        </small>
                      )}
                    </FormGroup>
                  </Col>
                </Row>

                <div className="d-flex gap-2 align-items-center">
                  <Button color="primary" type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plus-circle me-2" />
                        Assign Plan
                      </>
                    )}
                  </Button>
                  <Button color="secondary" outline size="sm" type="button" onClick={resetForm}>
                    Reset
                  </Button>
                  <small className="text-muted ms-2">
                    <i className="bi bi-info-circle me-1" />
                    60-day trial period will be set automatically
                  </small>
                </div>
              </Form>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xs="12">
          <Card>
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <CardTitle tag="h4" className="mb-0">
                  All Subscriptions
                </CardTitle>

                <ButtonGroup>
                  <Button
                    color="primary"
                    outline={filterStatus !== ''}
                    size="sm"
                    onClick={() => setFilterStatus('')}
                  >
                    All
                  </Button>
                  <Button
                    color="primary"
                    outline={filterStatus !== 'TRIAL'}
                    size="sm"
                    onClick={() => setFilterStatus('TRIAL')}
                  >
                    Trial
                  </Button>
                  <Button
                    color="primary"
                    outline={filterStatus !== 'ACTIVE'}
                    size="sm"
                    onClick={() => setFilterStatus('ACTIVE')}
                  >
                    Active
                  </Button>
                  <Button
                    color="primary"
                    outline={filterStatus !== 'EXPIRED'}
                    size="sm"
                    onClick={() => setFilterStatus('EXPIRED')}
                  >
                    Expired
                  </Button>
                </ButtonGroup>
              </div>

              <BootstrapTable
                data={subscriptions}
                striped
                hover
                condensed
                pagination
                options={{
                  noDataText: subscriptionsLoading ? (
                    <div className="text-center py-4">
                      <Spinner color="primary" />
                      <p className="mt-2">Loading subscriptions...</p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <i className="bi bi-inbox fs-1 text-muted mb-3 d-block" />
                      <h5 className="text-muted">No subscriptions found</h5>
                    </div>
                  ),
                  sizePerPage: 10,
                  sizePerPageList: [10, 25, 50],
                }}
              >
                <TableHeaderColumn dataField="subscriptionId" isKey hidden>
                  ID
                </TableHeaderColumn>

                <TableHeaderColumn dataField="companyName" dataSort width="200">
                  Company
                </TableHeaderColumn>

                <TableHeaderColumn dataField="planName" dataSort width="150">
                  Plan
                </TableHeaderColumn>

                <TableHeaderColumn
                  dataField="status"
                  dataFormat={statusFormatter}
                  dataAlign="center"
                  width="90"
                >
                  Status
                </TableHeaderColumn>

                <TableHeaderColumn
                  dataField="startDate"
                  dataFormat={dateFormatter}
                  dataSort
                  width="100"
                >
                  Start Date
                </TableHeaderColumn>

                <TableHeaderColumn
                  dataField="nextBillingDate"
                  dataFormat={dateFormatter}
                  dataSort
                  width="110"
                >
                  Next Billing
                </TableHeaderColumn>

                <TableHeaderColumn
                  dataField="actions"
                  dataFormat={actionsFormatter}
                  dataAlign="center"
                  width="200"
                >
                  Actions
                </TableHeaderColumn>
              </BootstrapTable>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Upgrade Modal */}
      <Modal isOpen={upgradeModal} toggle={() => setUpgradeModal(false)} size="md">
        <ModalHeader toggle={() => setUpgradeModal(false)}>
          Upgrade Subscription Plan
        </ModalHeader>
        <ModalBody>
          {selectedSubscription && (
            <>
              <div className="mb-3">
                <p className="mb-1">
                  <strong>Company:</strong> {selectedSubscription.companyName}
                </p>
                <p className="mb-1">
                  <strong>Current Plan:</strong> {selectedSubscription.planName}
                </p>
                <p className="mb-0">
                  <strong>Status:</strong>{' '}
                  <span className={`badge bg-${getStatusBadgeColor(selectedSubscription.status)}`}>
                    {selectedSubscription.status}
                  </span>
                </p>
              </div>

              <FormGroup>
                <Label for="upgradePlanId">Select New Plan *</Label>
                <Input
                  type="select"
                  id="upgradePlanId"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                >
                  <option value="">Choose a plan...</option>
                  {plans.map((plan) => (
                    <option key={plan.planId} value={plan.planId}>
                      {plan.name} - ${plan.basePrice ? plan.basePrice.toFixed(2) : '0.00'} + $
                      {plan.pricePerUser ? plan.pricePerUser.toFixed(2) : '0'}/user ({plan.billingCycle})
                    </option>
                  ))}
                </Input>
              </FormGroup>

              <Alert color="info" className="mb-0">
                <i className="bi bi-info-circle-fill me-2" />
                <small>
                  The upgrade will take effect immediately and the company will be notified via email.
                </small>
              </Alert>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setUpgradeModal(false)}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleUpgradePlan} disabled={loading || !selectedPlanId}>
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Upgrading...
              </>
            ) : (
              <>
                <i className="bi bi-arrow-up-circle me-2" />
                Confirm Upgrade
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default AdminSubscriptionManagement;