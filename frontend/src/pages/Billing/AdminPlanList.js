import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  CardBody,
  Button,
  Spinner,
  Badge,
  Input,
  InputGroup,
  InputGroupText,
  Table,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';
import BillingService from '../../services/BillingService';
import { getCurrencySymbol } from '../localStorageUtil';
import './Billing.scss';

const AdminPlanList = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await BillingService.getAdminPlans();
      setPlans(response.data || []);
      setFilteredPlans(response.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    let result = plans;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (plan) =>
          plan.name?.toLowerCase().includes(term) ||
          plan.description?.toLowerCase().includes(term) ||
          plan.planCode?.toLowerCase().includes(term),
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((plan) =>
        statusFilter === 'active' ? plan.isActive : !plan.isActive,
      );
    }

    setFilteredPlans(result);
  }, [searchTerm, statusFilter, plans]);

  const handleDeactivate = async (plan, e) => {
    e?.stopPropagation();

    const result = await Swal.fire({
      title: 'Deactivate Plan?',
      html: `<p>This will make <strong>${plan.name}</strong> unavailable for new subscriptions.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Deactivate',
      confirmButtonColor: '#dc3545',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      await BillingService.deleteAdminPlan(plan.planId);
      toast.success('Plan deactivated successfully');
      fetchPlans();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to deactivate plan');
    }
  };

  const getPricing = (plan) => {
    // Return first available pricing (plans may have multiple currency options)
    return plan.pricings?.[0];
  };

  const getEnabledFeaturesCount = (plan) => {
    return plan.featureConfigs?.filter((fc) => fc.isEnabled)?.length || 0;
  };

  const formatPrice = (price, currency = 'USD') => {
    if (!price && price !== 0) return '-';
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const totalSubscribers = plans.reduce((sum, p) => sum + (p.subscriberCount || 0), 0);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
        <Spinner color="primary" />
      </div>
    );
  }

  return (
    <div className="plan-management-container">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-0 fw-semibold">Plan Management</h5>
          <small className="text-muted">Manage subscription plans</small>
        </div>
        <Button color="primary" size="sm" onClick={() => navigate('/plan-management/create')}>
          <i className="bi bi-plus me-1" />
          New Plan
        </Button>
      </div>

      {/* Stats Row */}
      <Row className="g-2 mb-3">
        <Col xs="6" md="3">
          <Card className="stat-card border-0">
            <CardBody className="py-2 px-3">
              <div className="d-flex align-items-center">
                <div className="stat-icon bg-primary-subtle text-primary me-2">
                  <i className="bi bi-collection" />
                </div>
                <div>
                  <div className="stat-value">{plans.length}</div>
                  <div className="stat-label">Total Plans</div>
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
                  <i className="bi bi-check-circle" />
                </div>
                <div>
                  <div className="stat-value">{plans.filter((p) => p.isActive).length}</div>
                  <div className="stat-label">Active</div>
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
                  <div className="stat-value">{totalSubscribers}</div>
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
                  <i className="bi bi-calendar-check" />
                </div>
                <div>
                  <div className="stat-value">
                    {plans.filter((p) => p.billingCycleOptions?.includes('YEARLY')).length}
                  </div>
                  <div className="stat-label">Yearly</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-3">
        <CardBody className="py-2">
          <Row className="align-items-center g-2">
            <Col md="5">
              <InputGroup size="sm">
                <InputGroupText className="bg-white">
                  <i className="bi bi-search text-muted" />
                </InputGroupText>
                <Input
                  type="text"
                  placeholder="Search plans..."
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Input>
            </Col>
            <Col md="4" className="text-end">
              <div className="btn-group btn-group-sm me-2">
                <Button
                  color={viewMode === 'table' ? 'primary' : 'outline-secondary'}
                  onClick={() => setViewMode('table')}
                  size="sm"
                >
                  <i className="bi bi-list" />
                </Button>
                <Button
                  color={viewMode === 'cards' ? 'primary' : 'outline-secondary'}
                  onClick={() => setViewMode('cards')}
                  size="sm"
                >
                  <i className="bi bi-grid" />
                </Button>
              </div>
              <small className="text-muted">
                {filteredPlans.length} of {plans.length}
              </small>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Plan List */}
      {filteredPlans.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardBody className="text-center py-4">
            <i className="bi bi-inbox fs-3 text-muted d-block mb-2" />
            <p className="text-muted mb-2">No plans found</p>
            {!searchTerm && statusFilter === 'all' && (
              <Button color="primary" size="sm" onClick={() => navigate('/plan-management/create')}>
                Create First Plan
              </Button>
            )}
          </CardBody>
        </Card>
      ) : viewMode === 'table' ? (
        <Card className="border-0 shadow-sm">
          <Table hover responsive className="mb-0 plan-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th className="text-center">Status</th>
                <th className="text-center">Billing</th>
                <th className="text-end">Monthly</th>
                <th className="text-end">Yearly</th>
                <th className="text-center">Features</th>
                <th className="text-center">Subscribers</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.map((plan) => {
                const pricing = getPricing(plan);
                const featuresCount = getEnabledFeaturesCount(plan);

                return (
                  <tr
                    key={plan.planId}
                    onClick={() => navigate(`/plan-management/${plan.planId}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="plan-icon-sm me-2">
                          <i className="bi bi-box" />
                        </div>
                        <div>
                          <div className="fw-medium">{plan.name}</div>
                          <small className="text-muted">{plan.planCode}</small>
                        </div>
                      </div>
                    </td>
                    <td className="text-center">
                      <Badge color={plan.isActive ? 'success' : 'secondary'} pill>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="text-center">
                      {plan.billingCycleOptions?.split(',').map((cycle) => (
                        <Badge
                          key={cycle}
                          color="light"
                          className="text-dark border me-1"
                        >
                          {cycle.trim() === 'MONTHLY' ? 'M' : 'Y'}
                        </Badge>
                      ))}
                    </td>
                    <td className="text-end fw-medium">
                      {plan.billingCycleOptions?.includes('MONTHLY')
                        ? formatPrice(pricing?.monthlyBasePrice, pricing?.currency)
                        : '-'}
                    </td>
                    <td className="text-end fw-medium">
                      {plan.billingCycleOptions?.includes('YEARLY')
                        ? formatPrice(pricing?.yearlyBasePrice, pricing?.currency)
                        : '-'}
                    </td>
                    <td className="text-center">
                      <Badge color="primary" pill>
                        {featuresCount}
                      </Badge>
                    </td>
                    <td className="text-center">
                      <span className="fw-medium">{plan.subscriberCount || 0}</span>
                    </td>
                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      <UncontrolledDropdown>
                        <DropdownToggle tag="button" className="btn btn-sm btn-light border-0">
                          <i className="bi bi-three-dots" />
                        </DropdownToggle>
                        <DropdownMenu end>
                          <DropdownItem onClick={() => navigate(`/plan-management/${plan.planId}`)}>
                            <i className="bi bi-eye me-2" />View
                          </DropdownItem>
                          <DropdownItem onClick={() => navigate(`/plan-management/${plan.planId}/edit`)}>
                            <i className="bi bi-pencil me-2" />Edit
                          </DropdownItem>
                          {plan.isActive && (
                            <>
                              <DropdownItem divider />
                              <DropdownItem className="text-danger" onClick={(e) => handleDeactivate(plan, e)}>
                                <i className="bi bi-x-circle me-2" />Deactivate
                              </DropdownItem>
                            </>
                          )}
                        </DropdownMenu>
                      </UncontrolledDropdown>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      ) : (
        <Row className="g-3">
          {filteredPlans.map((plan) => {
            const pricing = getPricing(plan);
            const featuresCount = getEnabledFeaturesCount(plan);

            return (
              <Col lg="4" md="6" key={plan.planId}>
                <Card
                  className={`plan-card-compact h-100 border-0 shadow-sm ${!plan.isActive ? 'opacity-75' : ''}`}
                  onClick={() => navigate(`/plan-management/${plan.planId}`)}
                >
                  <CardBody className="p-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <h6 className="mb-0 fw-semibold">{plan.name}</h6>
                        <small className="text-muted">{plan.planCode}</small>
                      </div>
                      <Badge color={plan.isActive ? 'success' : 'secondary'} pill>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <p className="text-muted small mb-2 text-truncate">
                      {plan.description || 'No description'}
                    </p>

                    <div className="pricing-row d-flex justify-content-between align-items-center py-2 border-top border-bottom mb-2">
                      {plan.billingCycleOptions?.includes('MONTHLY') && (
                        <div>
                          <small className="text-muted d-block">Monthly</small>
                          <span className="fw-bold text-primary">{formatPrice(pricing?.monthlyBasePrice, pricing?.currency)}</span>
                        </div>
                      )}
                      {plan.billingCycleOptions?.includes('YEARLY') && (
                        <div className={plan.billingCycleOptions?.includes('MONTHLY') ? 'text-end' : ''}>
                          <small className="text-muted d-block">Yearly</small>
                          <span className="fw-bold text-success">{formatPrice(pricing?.yearlyBasePrice, pricing?.currency)}</span>
                        </div>
                      )}
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <Badge color="light" className="text-dark border me-1">
                          <i className="bi bi-gear me-1" />{featuresCount}
                        </Badge>
                        <Badge color="light" className="text-dark border">
                          <i className="bi bi-people me-1" />{plan.subscriberCount || 0}
                        </Badge>
                      </div>
                      <div className="btn-group btn-group-sm">
                        <Button
                          color="outline-primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/plan-management/${plan.planId}/edit`);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};

export default AdminPlanList;
