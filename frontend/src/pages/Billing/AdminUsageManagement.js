import React, { useState, useEffect, useCallback } from 'react';
import {
  Row,
  Col,
  Card,
  CardBody,
  Button,
  Spinner,
  Badge,
  Table,
  Input,
  InputGroup,
  InputGroupText,
  Modal,
  ModalHeader,
  ModalBody,
  Progress,
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Select from 'react-select';
import BillingService from '../../services/BillingService';
import CompanyService from '../../services/CompanyService';
import { formatDate } from '../localStorageUtil';
import './Billing.scss';

const AdminUsageManagement = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [usageEvents, setUsageEvents] = useState([]);
  const [usageAlerts, setUsageAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState('');

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await CompanyService.getAllCompanies();
        setCompanies(response?.data?.content || []);
      } catch (error) {
        toast.error('Failed to fetch companies');
      }
    };
    fetchCompanies();
  }, []);

  // Fetch usage data when company is selected
  const fetchUsageData = useCallback(async (companyId) => {
    if (!companyId) return;

    setLoading(true);
    try {
      const [usageResponse, alertsResponse] = await Promise.all([
        BillingService.getBillingDetails(companyId),
        BillingService.getCompanyUsageAlerts(companyId).catch(() => ({ data: [] })),
      ]);

      setUsageData(usageResponse.data);
      setUsageAlerts(alertsResponse.data || []);
    } catch (error) {
      toast.error('Failed to fetch usage data');
      setUsageData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch usage events for a specific feature
  const fetchUsageEvents = useCallback(async (featureCode) => {
    if (!selectedCompany) return;

    setEventsLoading(true);
    try {
      const response = await BillingService.getUsageEvents(selectedCompany.companyId, featureCode);
      setUsageEvents(response.data || []);
    } catch (error) {
      // If endpoint doesn't exist yet, show empty
      setUsageEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [selectedCompany]);

  const handleCompanySelect = (option) => {
    setSelectedCompany(option);
    setUsageData(null);
    setUsageEvents([]);
    setUsageAlerts([]);
    if (option) {
      fetchUsageData(option.companyId);
    }
  };

  const openDetailModal = (featureCode) => {
    setSelectedFeature(featureCode);
    setDetailModal(true);
    fetchUsageEvents(featureCode);
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

  const getAlertTypeColor = (alertType) => {
    const colors = {
      NEAR_LIMIT: 'warning',
      LIMIT_REACHED: 'danger',
      LIMIT_EXCEEDED: 'danger',
      GRACE_PERIOD_STARTED: 'warning',
      GRACE_PERIOD_ENDED: 'dark',
    };
    return colors[alertType] || 'secondary';
  };

  return (
    <div className="usage-mgmt-container">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0 fw-semibold">Usage Management</h4>
          <small className="text-muted">Monitor feature usage across companies</small>
        </div>
      </div>

      {/* Company Selector */}
      <Card className="border-0 shadow-sm mb-3">
        <CardBody className="py-3">
          <Row className="align-items-center">
            <Col md="6">
              <label className="small fw-semibold mb-1">Select Company</label>
              <Select
                options={companies.map((c) => ({
                  value: c.companyId,
                  label: c.name,
                  ...c,
                }))}
                value={selectedCompany ? { value: selectedCompany.companyId, label: selectedCompany.name } : null}
                onChange={handleCompanySelect}
                placeholder="Search and select a company..."
                isClearable
                isSearchable
                styles={{
                  control: (base) => ({ ...base, fontSize: '0.9rem' }),
                  menu: (base) => ({ ...base, fontSize: '0.9rem' }),
                }}
              />
            </Col>
            <Col md="6" className="text-end">
              {selectedCompany && usageData && (
                <div className="text-muted small">
                  <strong>Plan:</strong> {usageData.currentPlan?.name || 'No Plan'} |
                  <strong className="ms-2">Active Users:</strong> {usageData.activeUserCount || 0}
                </div>
              )}
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="d-flex justify-content-center align-items-center py-5">
          <Spinner color="primary" />
        </div>
      )}

      {/* No Company Selected */}
      {!selectedCompany && !loading && (
        <Card className="border-0 shadow-sm">
          <CardBody className="text-center py-5">
            <i className="bi bi-building fs-1 text-muted mb-3 d-block" />
            <h5 className="text-muted">Select a Company</h5>
            <p className="text-muted mb-0">Choose a company from the dropdown to view their usage data</p>
          </CardBody>
        </Card>
      )}

      {/* Usage Data */}
      {selectedCompany && usageData && !loading && (
        <>
          {/* Usage Alerts */}
          {usageAlerts.length > 0 && (
            <Card className="border-0 shadow-sm mb-3 border-start border-warning border-3">
              <CardBody className="py-2">
                <h6 className="mb-2">
                  <i className="bi bi-exclamation-triangle text-warning me-2" />
                  Active Alerts ({usageAlerts.length})
                </h6>
                <div className="d-flex flex-wrap gap-2">
                  {usageAlerts.slice(0, 5).map((alert, idx) => (
                    <Badge key={idx} color={getAlertTypeColor(alert.alertType)} className="py-1 px-2">
                      {getFeatureLabel(alert.featureCode)}: {alert.alertType?.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Feature Usage Cards */}
          <h6 className="mb-2">Feature Usage</h6>
          <Row className="g-3 mb-4">
            {usageData.featureUsage && Object.keys(usageData.featureUsage).length > 0 ? (
              Object.entries(usageData.featureUsage).map(([key, usage]) => (
                <Col xs="12" md="6" lg="3" key={key}>
                  <Card className="border-0 shadow-sm h-100 usage-card">
                    <CardBody className="p-3">
                      <div className="d-flex align-items-center mb-2">
                        <div className="usage-icon me-2">
                          <i className={`bi ${getFeatureIcon(usage.featureCode)}`} />
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-0 small fw-semibold">{getFeatureLabel(usage.featureCode)}</h6>
                        </div>
                        <Button
                          color="link"
                          size="sm"
                          className="p-0"
                          onClick={() => openDetailModal(usage.featureCode)}
                          title="View Details"
                        >
                          <i className="bi bi-eye" />
                        </Button>
                      </div>

                      <div className="mb-2">
                        <div className="d-flex justify-content-between small mb-1">
                          <span>
                            {usage.currentUsage} / {usage.isUnlimited ? '∞' : usage.limit}
                          </span>
                          {!usage.isUnlimited && (
                            <span className={`text-${getProgressColor(usage.percentUsed)}`}>
                              {Math.round(usage.percentUsed || 0)}%
                            </span>
                          )}
                        </div>
                        {!usage.isUnlimited && (
                          <Progress
                            value={Math.min(usage.percentUsed || 0, 100)}
                            color={getProgressColor(usage.percentUsed)}
                            style={{ height: '6px' }}
                          />
                        )}
                        {usage.isUnlimited && (
                          <Badge color="success" className="small">Unlimited</Badge>
                        )}
                      </div>

                      {usage.overageUsage > 0 && (
                        <Badge color="danger" className="small">
                          Overage: {usage.overageUsage}
                        </Badge>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              ))
            ) : (
              <Col xs="12">
                <Card className="border-0 shadow-sm">
                  <CardBody className="text-center py-4">
                    <i className="bi bi-bar-chart text-muted fs-3 mb-2 d-block" />
                    <span className="text-muted">No usage data available</span>
                  </CardBody>
                </Card>
              </Col>
            )}
          </Row>

          {/* Feature Flags */}
          {usageData.featureFlags && Object.keys(usageData.featureFlags).length > 0 && (
            <>
              <h6 className="mb-2">Available Features</h6>
              <Card className="border-0 shadow-sm">
                <CardBody className="p-0">
                  <Table hover className="mb-0">
                    <thead>
                      <tr>
                        <th>Feature</th>
                        <th className="text-center">Status</th>
                        <th className="text-center">Limit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(usageData.featureFlags).map(([key, flag]) => (
                        <tr key={key}>
                          <td>
                            <div className="d-flex align-items-center">
                              <i className={`bi ${getFeatureIcon(flag.featureCode)} me-2 text-muted`} />
                              {getFeatureLabel(flag.featureCode)}
                            </div>
                          </td>
                          <td className="text-center">
                            <Badge color={flag.enabled ? 'success' : 'secondary'} pill>
                              {flag.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </td>
                          <td className="text-center">
                            {flag.unlimited ? (
                              <Badge color="primary">Unlimited</Badge>
                            ) : (
                              <span>{flag.limit ?? '-'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            </>
          )}

          {/* Subscription Info */}
          {usageData.currentSubscription && (
            <Card className="border-0 shadow-sm mt-3">
              <CardBody>
                <h6 className="mb-2">Subscription Details</h6>
                <Row className="small">
                  <Col md="3">
                    <strong>Plan:</strong> {usageData.currentPlan?.name}
                  </Col>
                  <Col md="3">
                    <strong>Status:</strong>{' '}
                    <Badge color={usageData.currentSubscription.status === 'ACTIVE' ? 'success' : 'secondary'}>
                      {usageData.currentSubscription.status}
                    </Badge>
                  </Col>
                  <Col md="3">
                    <strong>Billing:</strong> {usageData.currentSubscription.billingCycle}
                  </Col>
                  <Col md="3">
                    <strong>Next Billing:</strong> {formatDate(usageData.nextBillingDate)}
                  </Col>
                </Row>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {/* Usage Events Detail Modal */}
      <Modal isOpen={detailModal} toggle={() => setDetailModal(false)} size="lg">
        <ModalHeader toggle={() => setDetailModal(false)}>
          <i className={`bi ${getFeatureIcon(selectedFeature)} me-2`} />
          {getFeatureLabel(selectedFeature)} - Usage Events
        </ModalHeader>
        <ModalBody>
          {eventsLoading ? (
            <div className="text-center py-4">
              <Spinner color="primary" />
            </div>
          ) : usageEvents.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-inbox fs-3 text-muted d-block mb-2" />
              <span className="text-muted">No usage events recorded</span>
              <p className="text-muted small mt-2">
                Usage events will appear here as the feature is used.
              </p>
            </div>
          ) : (
            <Table hover size="sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th className="text-center">Quantity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {usageEvents.map((event, idx) => (
                  <tr key={idx}>
                    <td className="small">{formatDate(event.eventTimestamp)}</td>
                    <td className="small">{event.userId || '-'}</td>
                    <td className="text-center">{event.quantity}</td>
                    <td className="small text-muted">{event.metadata || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </ModalBody>
      </Modal>
    </div>
  );
};

export default AdminUsageManagement;
