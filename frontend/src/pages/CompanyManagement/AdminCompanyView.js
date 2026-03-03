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
  Progress,
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import {
  FaBuilding,
  FaEnvelope,
  FaPhone,
  FaGlobe,
  FaMapMarkerAlt,
  FaUsers,
  FaShoppingCart,
  FaFileInvoice,
  FaClipboardList,
  FaCalendarAlt,
  FaChartLine,
  FaCreditCard,
  FaHistory,
  FaEdit,
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaPauseCircle,
} from 'react-icons/fa';
import 'react-toastify/dist/ReactToastify.css';
import CompanyService from '../../services/CompanyService';
import BillingService from '../../services/BillingService';
import { SubscriptionAuditTimeline } from '../../components/Billing';
import { formatDate, formatCurrency, getCompanyCurrency } from '../localStorageUtil';
import './AdminCompanyView.scss';

const AdminCompanyView = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [metrics, setMetrics] = useState({
    users: 0,
    carts: 0,
    orders: 0,
    rfqs: 0,
  });
  const [invoices, setInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAuditHistory, setShowAuditHistory] = useState(false);

  // Helper to safely fetch data and return null on error
  const safeFetch = async (fetchFn) => {
    try {
      return await fetchFn();
    } catch (error) {
      // Log error for debugging but return null to prevent crash
      console.debug('SafeFetch caught error:', error?.message || error);
      return null;
    }
  };

  const fetchCompanyData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch company details
      const companyResponse = await CompanyService.getCompanyByCompanyId(companyId);
      const companyData = Array.isArray(companyResponse.data)
        ? companyResponse.data[0]
        : companyResponse.data;
      setCompany(companyData);

      // Fetch metrics in parallel - wrap each in safeFetch to prevent errors from propagating
      const [subscriptionRes, usageRes, metricsRes, invoicesRes] =
        await Promise.all([
          safeFetch(() => BillingService.getActiveSubscription(companyId)),
          safeFetch(() => BillingService.getCompanyUsage(companyId)),
          safeFetch(() => CompanyService.getCompanyMetrics(companyId)),
          safeFetch(() => BillingService.getInvoicesByCompany(companyId, 0, 5)),
        ]);

      if (subscriptionRes?.data) {
        setSubscription(subscriptionRes.data);
      }

      if (usageRes?.data) {
        setUsage(usageRes.data);
      }

      if (invoicesRes?.data) {
        setInvoices(invoicesRes.data.content || invoicesRes.data || []);
      }

      // Use the dedicated metrics endpoint for accurate counts
      if (metricsRes?.data) {
        setMetrics({
          users: metricsRes.data.usersCount || 0,
          carts: metricsRes.data.cartsCount || 0,
          orders: metricsRes.data.ordersCount || 0,
          rfqs: metricsRes.data.rfqsCount || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
      toast.error('Failed to load company details');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchCompanyData();
    }
  }, [companyId, fetchCompanyData]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      ACTIVE: { color: 'success', icon: FaCheckCircle, label: 'Active' },
      TRIAL: { color: 'info', icon: FaChartLine, label: 'Trial' },
      PAST_DUE: { color: 'warning', icon: FaExclamationTriangle, label: 'Past Due' },
      SUSPENDED: { color: 'danger', icon: FaPauseCircle, label: 'Suspended' },
      CANCELED: { color: 'secondary', icon: FaTimesCircle, label: 'Canceled' },
      EXPIRED: { color: 'dark', icon: FaTimesCircle, label: 'Expired' },
    };
    const config = statusConfig[status] || { color: 'secondary', label: status };
    const Icon = config.icon;
    return (
      <Badge color={config.color} className="d-inline-flex align-items-center gap-1 px-2 py-1">
        {Icon && <Icon size={12} />}
        {config.label}
      </Badge>
    );
  };

  const getInvoiceStatusBadge = (status) => {
    const colors = {
      PAID: 'success',
      PENDING: 'warning',
      SENT: 'info',
      OVERDUE: 'danger',
      PARTIALLY_PAID: 'warning',
      VOIDED: 'secondary',
    };
    return (
      <Badge color={colors[status] || 'secondary'} pill>
        {status}
      </Badge>
    );
  };

  const getUsagePercentage = (used, limit) => {
    if (!limit || limit === -1 || limit === 0) return 0;
    const usedValue = Number(used) || 0;
    const limitValue = Number(limit);
    if (isNaN(usedValue) || isNaN(limitValue) || limitValue <= 0) return 0;
    return Math.min(100, Math.round((usedValue / limitValue) * 100));
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'danger';
    if (percentage >= 75) return 'warning';
    return 'success';
  };

  // Normalize usage data - handle both array and object formats
  const normalizeUsageData = (usageData) => {
    if (!usageData) return [];
    // If it's an array, return as-is
    if (Array.isArray(usageData)) {
      return usageData;
    }
    // If it's an object with feature codes as keys, convert to array
    return Object.entries(usageData).map(([key, value]) => ({
      featureCode: key,
      ...value,
    }));
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner color="primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-5">
        <FaBuilding size={48} className="text-muted mb-3" />
        <h5>Company not found</h5>
        <Button color="primary" size="sm" onClick={() => navigate('/company-management')}>
          Back to Companies
        </Button>
      </div>
    );
  }

  return (
    <div className="admin-company-view">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="company-header mb-4">
        <div className="d-flex justify-content-between align-items-start">
          <div className="d-flex align-items-center">
            <Button
              color="link"
              className="p-0 me-3 text-muted back-btn"
              onClick={() => navigate('/company-management')}
            >
              <FaArrowLeft size={20} />
            </Button>
            <div className="company-logo-wrapper me-3">
              {company.companyLogoId ? (
                <img
                  src={`/ep/v1/file/${company.companyLogoId}`}
                  alt={company.name}
                  className="company-logo"
                />
              ) : (
                <div className="company-logo-placeholder">
                  <FaBuilding size={32} />
                </div>
              )}
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <h4 className="mb-0 fw-semibold">{company.name}</h4>
                {subscription && getStatusBadge(subscription.status)}
              </div>
              <div className="text-muted">
                {company.displayName && <span className="me-3">{company.displayName}</span>}
                <span className="me-3">
                  <FaEnvelope className="me-1" size={12} />
                  {company.email}
                </span>
                {company.phone && (
                  <span>
                    <FaPhone className="me-1" size={12} />
                    {company.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button
              color="outline-primary"
              size="sm"
              onClick={() => navigate(`/company-registration?companyId=${companyId}`)}
            >
              <FaEdit className="me-1" /> Edit Company
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <Row className="g-3 mb-4">
        <Col xs="6" md="3">
          <Card className="stat-card h-100 border-0 shadow-sm">
            <CardBody className="d-flex align-items-center">
              <div className="stat-icon bg-primary-light text-primary me-3">
                <FaUsers size={20} />
              </div>
              <div>
                <div className="stat-value">{metrics.users}</div>
                <div className="stat-label">Users</div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xs="6" md="3">
          <Card className="stat-card h-100 border-0 shadow-sm">
            <CardBody className="d-flex align-items-center">
              <div className="stat-icon bg-success-light text-success me-3">
                <FaShoppingCart size={20} />
              </div>
              <div>
                <div className="stat-value">{metrics.carts}</div>
                <div className="stat-label">Carts</div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xs="6" md="3">
          <Card className="stat-card h-100 border-0 shadow-sm">
            <CardBody className="d-flex align-items-center">
              <div className="stat-icon bg-info-light text-info me-3">
                <FaFileInvoice size={20} />
              </div>
              <div>
                <div className="stat-value">{metrics.orders}</div>
                <div className="stat-label">Orders</div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xs="6" md="3">
          <Card className="stat-card h-100 border-0 shadow-sm">
            <CardBody className="d-flex align-items-center">
              <div className="stat-icon bg-warning-light text-warning me-3">
                <FaClipboardList size={20} />
              </div>
              <div>
                <div className="stat-value">{metrics.rfqs}</div>
                <div className="stat-label">RFQs</div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Main Content Tabs */}
      <Card className="border-0 shadow-sm">
        <CardBody className="p-0">
          <Nav tabs className="nav-tabs-custom px-3 pt-2">
            <NavItem>
              <NavLink
                className={activeTab === 'overview' ? 'active' : ''}
                onClick={() => setActiveTab('overview')}
              >
                <FaBuilding className="me-2" size={14} />
                Overview
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === 'subscription' ? 'active' : ''}
                onClick={() => setActiveTab('subscription')}
              >
                <FaCreditCard className="me-2" size={14} />
                Subscription
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === 'usage' ? 'active' : ''}
                onClick={() => setActiveTab('usage')}
              >
                <FaChartLine className="me-2" size={14} />
                Usage
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === 'billing' ? 'active' : ''}
                onClick={() => setActiveTab('billing')}
              >
                <FaFileInvoice className="me-2" size={14} />
                Invoices
              </NavLink>
            </NavItem>
          </Nav>

          <div className="p-4">
            <TabContent activeTab={activeTab}>
              {/* Overview Tab */}
              <TabPane tabId="overview">
                <Row className="g-4">
                  <Col lg="6">
                    <div className="info-section">
                      <h6 className="section-title">
                        <FaBuilding className="me-2" />
                        Company Information
                      </h6>
                      <Table borderless size="sm" className="info-table">
                        <tbody>
                          <tr>
                            <td className="label-cell">Company Name</td>
                            <td className="value-cell">{company.name}</td>
                          </tr>
                          <tr>
                            <td className="label-cell">Display Name</td>
                            <td className="value-cell">{company.displayName || '-'}</td>
                          </tr>
                          <tr>
                            <td className="label-cell">Category</td>
                            <td className="value-cell">{company.categoryName || '-'}</td>
                          </tr>
                          <tr>
                            <td className="label-cell">Sub Category</td>
                            <td className="value-cell">{company.subCategoryName || '-'}</td>
                          </tr>
                          <tr>
                            <td className="label-cell">Created</td>
                            <td className="value-cell">{formatDate(company.createdDate)}</td>
                          </tr>
                        </tbody>
                      </Table>
                    </div>

                    <div className="info-section mt-4">
                      <h6 className="section-title">
                        <FaEnvelope className="me-2" />
                        Contact Information
                      </h6>
                      <Table borderless size="sm" className="info-table">
                        <tbody>
                          <tr>
                            <td className="label-cell">Email</td>
                            <td className="value-cell">
                              <a href={`mailto:${company.email}`}>{company.email}</a>
                            </td>
                          </tr>
                          <tr>
                            <td className="label-cell">Phone</td>
                            <td className="value-cell">{company.phone || '-'}</td>
                          </tr>
                          <tr>
                            <td className="label-cell">Fax</td>
                            <td className="value-cell">{company.fax || '-'}</td>
                          </tr>
                          <tr>
                            <td className="label-cell">Website</td>
                            <td className="value-cell">
                              {company.website ? (
                                <a href={company.website} target="_blank" rel="noopener noreferrer">
                                  <FaGlobe className="me-1" size={12} />
                                  {company.website}
                                </a>
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </div>
                  </Col>

                  <Col lg="6">
                    <div className="info-section">
                      <h6 className="section-title">
                        <FaMapMarkerAlt className="me-2" />
                        Billing Address
                      </h6>
                      {company.billingAddress ? (
                        <div className="address-block">
                          <p className="mb-1">{company.billingAddress.addressLine1}</p>
                          {company.billingAddress.addressLine2 && (
                            <p className="mb-1">{company.billingAddress.addressLine2}</p>
                          )}
                          <p className="mb-1">
                            {[
                              company.billingAddress.city,
                              company.billingAddress.state,
                              company.billingAddress.postalCode,
                            ]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                          <p className="mb-0">{company.billingAddress.country}</p>
                        </div>
                      ) : (
                        <p className="text-muted">No billing address provided</p>
                      )}
                    </div>

                    {company.shippingAddresses && company.shippingAddresses.length > 0 && (
                      <div className="info-section mt-4">
                        <h6 className="section-title">
                          <FaMapMarkerAlt className="me-2" />
                          Shipping Addresses
                        </h6>
                        {company.shippingAddresses.slice(0, 2).map((addr, index) => (
                          <div key={index} className="address-block mb-2">
                            <p className="mb-1">{addr.addressLine1}</p>
                            {addr.addressLine2 && <p className="mb-1">{addr.addressLine2}</p>}
                            <p className="mb-1">
                              {[addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ')}
                            </p>
                            <p className="mb-0">{addr.country}</p>
                          </div>
                        ))}
                        {company.shippingAddresses.length > 2 && (
                          <small className="text-muted">
                            +{company.shippingAddresses.length - 2} more addresses
                          </small>
                        )}
                      </div>
                    )}

                    {/* Primary Contact */}
                    {company.primaryContact && (
                      <div className="info-section mt-4">
                        <h6 className="section-title">
                          <FaUsers className="me-2" />
                          Primary Contact
                        </h6>
                        <Table borderless size="sm" className="info-table">
                          <tbody>
                            <tr>
                              <td className="label-cell">Name</td>
                              <td className="value-cell">
                                {company.primaryContact.firstName} {company.primaryContact.lastName}
                              </td>
                            </tr>
                            <tr>
                              <td className="label-cell">Email</td>
                              <td className="value-cell">{company.primaryContact.email || '-'}</td>
                            </tr>
                            <tr>
                              <td className="label-cell">Phone</td>
                              <td className="value-cell">{company.primaryContact.phone || '-'}</td>
                            </tr>
                          </tbody>
                        </Table>
                      </div>
                    )}
                  </Col>
                </Row>
              </TabPane>

              {/* Subscription Tab */}
              <TabPane tabId="subscription">
                {subscription ? (
                  <Row className="g-4">
                    <Col lg="8">
                      <div className="subscription-card">
                        <div className="d-flex justify-content-between align-items-start mb-4">
                          <div>
                            <h5 className="mb-1">{subscription.planName}</h5>
                            <div className="d-flex align-items-center gap-2">
                              {getStatusBadge(subscription.status)}
                              <Badge color="light" className="text-dark border">
                                {subscription.billingCycle}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            color="outline-secondary"
                            size="sm"
                            onClick={() => setShowAuditHistory(true)}
                          >
                            <FaHistory className="me-1" /> History
                          </Button>
                        </div>

                        <Row className="g-3">
                          <Col md="6">
                            <Table borderless size="sm" className="info-table">
                              <tbody>
                                <tr>
                                  <td className="label-cell">Start Date</td>
                                  <td className="value-cell">{formatDate(subscription.startDate)}</td>
                                </tr>
                                <tr>
                                  <td className="label-cell">Current Period</td>
                                  <td className="value-cell">
                                    {formatDate(subscription.currentPeriodStart || subscription.trialStartDate || subscription.startDate)} -{' '}
                                    {formatDate(subscription.currentPeriodEnd || subscription.trialEndDate || subscription.nextBillingDate)}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="label-cell">Next Billing</td>
                                  <td className="value-cell">
                                    {formatDate(subscription.nextBillingDate)}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="label-cell">Auto Renew</td>
                                  <td className="value-cell">
                                    {subscription.autoRenew ? (
                                      <Badge color="success" pill>Yes</Badge>
                                    ) : (
                                      <Badge color="secondary" pill>No</Badge>
                                    )}
                                  </td>
                                </tr>
                              </tbody>
                            </Table>
                          </Col>
                          <Col md="6">
                            <Table borderless size="sm" className="info-table">
                              <tbody>
                                {subscription.trialEndDate && (
                                  <tr>
                                    <td className="label-cell">Trial Ends</td>
                                    <td className="value-cell">
                                      {formatDate(subscription.trialEndDate)}
                                    </td>
                                  </tr>
                                )}
                                <tr>
                                  <td className="label-cell">Currency</td>
                                  <td className="value-cell">{subscription.currency || getCompanyCurrency()}</td>
                                </tr>
                                {subscription.graceEndsAt && (
                                  <tr>
                                    <td className="label-cell">Grace Period Ends</td>
                                    <td className="value-cell text-danger">
                                      {formatDate(subscription.graceEndsAt)}
                                    </td>
                                  </tr>
                                )}
                                {subscription.cancellationReason && (
                                  <tr>
                                    <td className="label-cell">Cancellation Reason</td>
                                    <td className="value-cell">{subscription.cancellationReason}</td>
                                  </tr>
                                )}
                              </tbody>
                            </Table>
                          </Col>
                        </Row>
                      </div>
                    </Col>

                    <Col lg="4">
                      <Card className="border-0 shadow-sm" style={{ backgroundColor: '#f8f9fa' }}>
                        <CardBody>
                          <h6 className="mb-3">Quick Actions</h6>
                          <div className="d-grid gap-2">
                            <Button
                              color="primary"
                              size="sm"
                              outline
                              onClick={() =>
                                navigate(`/subscription-management?company=${companyId}`)
                              }
                            >
                              Manage Subscription
                            </Button>
                            <Button
                              color="secondary"
                              size="sm"
                              outline
                              onClick={() => navigate(`/invoice-management?company=${companyId}`)}
                            >
                              View All Invoices
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    </Col>
                  </Row>
                ) : (
                  <div className="text-center py-5">
                    <FaCreditCard size={48} className="text-muted mb-3" />
                    <h5 className="text-muted">No Active Subscription</h5>
                    <p className="text-muted">This company doesn't have an active subscription.</p>
                    <Button
                      color="primary"
                      onClick={() => navigate(`/subscription-management?company=${companyId}`)}
                    >
                      Assign Plan
                    </Button>
                  </div>
                )}
              </TabPane>

              {/* Usage Tab */}
              <TabPane tabId="usage">
                {usage && (Array.isArray(usage) ? usage.length > 0 : Object.keys(usage).length > 0) ? (
                  <Row className="g-3">
                    {normalizeUsageData(usage).map((item, index) => {
                      const used = Number(item.currentUsage || item.used || 0);
                      const limit = Number(item.usageLimit || item.limit || item.includedQuota || 0);
                      const featureName = item.featureName || item.displayName || item.featureCode || `Feature ${index + 1}`;
                      const percentage = getUsagePercentage(used, limit);
                      const color = getUsageColor(percentage);
                      const isUnlimited = limit === -1 || limit === 0;

                      return (
                        <Col md="6" lg="4" key={item.featureCode || index}>
                          <Card className="usage-card border-0 shadow-sm h-100">
                            <CardBody>
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <h6 className="mb-0">{featureName}</h6>
                                {isUnlimited ? (
                                  <Badge color="success" pill>Unlimited</Badge>
                                ) : (
                                  <Badge color={color} pill>{percentage}%</Badge>
                                )}
                              </div>
                              {!isUnlimited && (
                                <>
                                  <Progress
                                    value={percentage}
                                    color={color}
                                    className="mb-2"
                                    style={{ height: '6px' }}
                                  />
                                  <div className="d-flex justify-content-between">
                                    <small className="text-muted">
                                      {used} used
                                    </small>
                                    <small className="text-muted">
                                      {limit} limit
                                    </small>
                                  </div>
                                </>
                              )}
                              {isUnlimited && (
                                <div className="text-muted">
                                  <small>{used} used</small>
                                </div>
                              )}
                            </CardBody>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                ) : (
                  <div className="text-center py-5">
                    <FaChartLine size={48} className="text-muted mb-3" />
                    <h5 className="text-muted">No Usage Data</h5>
                    <p className="text-muted">Usage data is not available for this company.</p>
                  </div>
                )}
              </TabPane>

              {/* Billing/Invoices Tab */}
              <TabPane tabId="billing">
                {invoices && invoices.length > 0 ? (
                  <div className="table-responsive">
                    <Table hover className="invoice-table">
                      <thead>
                        <tr>
                          <th>Invoice #</th>
                          <th>Date</th>
                          <th>Period</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice) => (
                          <tr key={invoice.invoiceId}>
                            <td className="fw-medium">{invoice.invoiceNumber}</td>
                            <td>{formatDate(invoice.invoiceDate)}</td>
                            <td>
                              <small>
                                {formatDate(invoice.billingPeriodStart)} -{' '}
                                {formatDate(invoice.billingPeriodEnd)}
                              </small>
                            </td>
                            <td className="fw-semibold">
                              {formatCurrency(invoice.totalAmount)}
                            </td>
                            <td>{getInvoiceStatusBadge(invoice.status)}</td>
                            <td>{formatDate(invoice.paymentDueDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    <div className="text-center mt-3">
                      <Button
                        color="link"
                        onClick={() => navigate(`/invoice-management?company=${companyId}`)}
                      >
                        View All Invoices
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <FaFileInvoice size={48} className="text-muted mb-3" />
                    <h5 className="text-muted">No Invoices</h5>
                    <p className="text-muted">No invoices found for this company.</p>
                  </div>
                )}
              </TabPane>
            </TabContent>
          </div>
        </CardBody>
      </Card>

      {/* Subscription Audit History Modal */}
      <SubscriptionAuditTimeline
        isOpen={showAuditHistory}
        toggle={() => setShowAuditHistory(false)}
        companyId={parseInt(companyId)}
        isAdmin={true}
      />
    </div>
  );
};

export default AdminCompanyView;
