import React, { useState, useEffect } from 'react';
import { Row, Col, Card, CardBody, Spinner, Alert, Button, ButtonGroup } from 'reactstrap';
import { DollarSign, TrendingUp, ShoppingCart, AlertCircle } from 'react-feather';
import { startOfMonth, endOfMonth, subMonths, startOfYear, format } from 'date-fns';
import { toast } from 'react-toastify';
import ExecutiveDashboardService from '../../services/ExecutiveDashboardService';
import MetricCard from './components/MetricCard';
import AlertCard from './components/AlertCard';
import BudgetHealthChart from './components/BudgetHealthChart';
import SpendByDepartmentChart from './components/SpendByDepartmentChart';
import ProcurementPipelineChart from './components/ProcurementPipelineChart';
import SupplierPerformanceTable from './components/SupplierPerformanceTable';
import ProcurementActivityChart from './components/ProcurementActivityChart';
import PurchaseOrderStatusChart from './components/PurchaseOrderStatusChart';
import RequisitionPipelineChart from './components/RequisitionPipelineChart';
import { formatCurrency, formatNumber, getTrendColor, getTrendIcon } from './utils/formatters';
import { getEntityId } from '../localStorageUtil';

const ExecutiveDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [activeTab, setActiveTab] = useState('overview');

  // Get company ID from local storage
  const companyId = getEntityId();

  // Helper function to format cycle time metrics
  const formatCycleTime = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return { display: 'N/A', color: 'text-muted', badge: null };
    }

    // Handle negative or invalid values
    if (value < 0) {
      return { display: 'N/A', color: 'text-muted', badge: null };
    }

    // Handle zero values
    if (value === 0) {
      return { display: 'No data', color: 'text-muted', badge: null };
    }

    // Format based on value ranges
    let display;
    let color;
    let badge = null;

    if (value < 1) {
      display = '< 1 day';
      color = 'text-success';
      badge = 'Excellent';
    } else if (value < 3) {
      display = `${Math.round(value)} ${Math.round(value) === 1 ? 'day' : 'days'}`;
      color = 'text-success';
      badge = 'Good';
    } else if (value < 7) {
      display = `${Math.round(value)} days`;
      color = 'text-warning';
      badge = 'Fair';
    } else {
      display = `${Math.round(value)} days`;
      color = 'text-danger';
      badge = 'Needs Attention';
    }

    return { display, color, badge };
  };

  // Date range calculation
  const getDateRange = () => {
    const now = new Date();
    let startDate;
    let endDate = now;

    switch (selectedPeriod) {
      case 'lastMonth':
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      case 'thisQuarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'thisYear':
        startDate = startOfYear(now);
        break;
      case 'thisMonth':
      default:
        startDate = startOfMonth(now);
        break;
    }

    return {
      startDate: format(startDate, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      endDate: format(endDate, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    };
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const dateRange = getDateRange();
      console.log('Fetching dashboard data for company:', companyId, 'with date range:', dateRange);
      const data = await ExecutiveDashboardService.getAllDashboardData(companyId, dateRange);
      console.log('Dashboard data received:', data);
      setDashboardData(data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      console.error('Error details:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load dashboard data. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Company ID from localStorage:', companyId);
    if (companyId) {
      fetchDashboardData();
    } else {
      console.error('No company ID found in localStorage');
      setError('Unable to load dashboard: Company information not found. Please log in again.');
      setLoading(false);
    }
  }, [companyId, selectedPeriod]);

  // Transform alerts data for AlertCard component - Categorized by alert type
  const transformAlerts = () => {
    if (!dashboardData?.alerts) return [];

    const categories = [];

    // Budget Alerts Category
    const budgetAlerts = [];

    // Budget Alerts - Exceeded
    dashboardData.alerts.budgetAlerts?.budgetsExceeded?.forEach((budget) => {
      budgetAlerts.push({
        title: budget.projectName,
        subtitle: `Allocated: ${formatCurrency(budget.allocatedBudget)} • Utilized: ${formatCurrency(budget.utilizedBudget)}`,
        message: `Exceeded by ${formatCurrency(budget.exceedAmount)} (${budget.exceedPercentage.toFixed(1)}% over budget)`,
        amount: formatCurrency(budget.exceedAmount),
        severity: 'CRITICAL',
        type: 'BUDGET_EXCEEDED',
      });
    });

    // Budget Alerts - Critical
    dashboardData.alerts.budgetAlerts?.budgetsCritical?.forEach((budget) => {
      budgetAlerts.push({
        title: budget.projectName,
        subtitle: `Allocated: ${formatCurrency(budget.allocatedBudget)} • ${budget.utilizationPercentage?.toFixed(1)}% utilized`,
        message: `Only ${formatCurrency(budget.remainingAmount)} remaining`,
        amount: formatCurrency(budget.remainingAmount),
        severity: 'CRITICAL',
        type: 'BUDGET_CRITICAL',
      });
    });

    if (budgetAlerts.length > 0) {
      categories.push({
        categoryName: 'Budget Alerts',
        alerts: budgetAlerts,
      });
    }

    // Cart Approval Alerts Category
    const cartApprovals = [];

    // Stale Approvals - Cart
    dashboardData.alerts.approvalAlerts?.staleApprovals
      ?.filter((approval) => approval.type === 'cart')
      .forEach((approval) => {
        cartApprovals.push({
          title: approval.targetNumber,
          subtitle: `Requested by ${approval.requesterName}`,
          message: `Pending with ${approval.currentApproverName} for ${approval.daysWaiting} days`,
          amount: formatCurrency(approval.amount),
          severity: approval.daysWaiting > 30 ? 'CRITICAL' : ((approval.daysWaiting < 30 && approval.daysWaiting > 15) ? 'HIGH' : 'MEDIUM'),
          type: 'CART_APPROVAL',
          daysWaiting: approval.daysWaiting,
          targetId: approval.targetId,
          targetLink: `/cart-approval-details/${approval.targetId}`,
        });
      });

    // High Value Pending - Cart
    dashboardData.alerts.approvalAlerts?.highValuePending
      ?.filter((approval) => approval.type === 'cart')
      .forEach((approval) => {
        cartApprovals.push({
          title: `${approval.targetNumber} (High Value)`,
          subtitle: `Requested by ${approval.requesterName}`,
          message: `Pending with ${approval.currentApproverName} for ${approval.daysWaiting} days`,
          amount: formatCurrency(approval.amount),
          severity: approval.daysWaiting > 30 ? 'CRITICAL' : ((approval.daysWaiting < 30 && approval.daysWaiting > 15) ? 'HIGH' : 'MEDIUM'),
          type: 'HIGH_VALUE_CART',
          targetId: approval.targetId,
          targetLink: `/cart-approval-details/${approval.targetId}`,
        });
      });

    if (cartApprovals.length > 0) {
      categories.push({
        categoryName: 'Cart Approvals',
        alerts: cartApprovals,
      });
    }

    // Purchase Order Approval Alerts Category
    const poApprovals = [];

    // Stale Approvals - Purchase Order
    dashboardData.alerts.approvalAlerts?.staleApprovals
      ?.filter((approval) => approval.type === 'purchase_order')
      .forEach((approval) => {
        poApprovals.push({
          title: approval.targetNumber,
          subtitle: `Requested by ${approval.requesterName}`,
          message: `Pending with ${approval.currentApproverName} for ${approval.daysWaiting} days`,
          amount: formatCurrency(approval.amount),
          severity: approval.daysWaiting > 30 ? 'CRITICAL' : ((approval.daysWaiting < 30 && approval.daysWaiting > 15) ? 'HIGH' : 'MEDIUM'),
          type: 'PO_APPROVAL',
          daysWaiting: approval.daysWaiting,
          targetId: approval.targetId,
          targetLink: `/purchase-order-detail/${approval.targetId}`,
        });
      });

    // High Value Pending - Purchase Order
    dashboardData.alerts.approvalAlerts?.highValuePending
      ?.filter((approval) => approval.type === 'purchase_order')
      .forEach((approval) => {
        poApprovals.push({
          title: `${approval.targetNumber} (High Value)`,
          subtitle: `Requested by ${approval.requesterName}`,
          message: `Pending with ${approval.currentApproverName} for ${approval.daysWaiting} days`,
          amount: formatCurrency(approval.amount),
          severity: approval.daysWaiting > 30 ? 'CRITICAL' : ((approval.daysWaiting < 30 && approval.daysWaiting > 15) ? 'HIGH' : 'MEDIUM'),
          type: 'HIGH_VALUE_PO',
          targetId: approval.targetId,
          targetLink: `/purchase-order-detail/${approval.targetId}`,
        });
      });

    if (poApprovals.length > 0) {
      categories.push({
        categoryName: 'Purchase Order Approvals',
        alerts: poApprovals,
      });
    }

    // Payment Alerts Category
    const paymentAlerts = [];

    // Payment Alerts - Overdue Invoices
    dashboardData.alerts.paymentAlerts?.invoicesOverdue?.forEach((invoice) => {
      paymentAlerts.push({
        title: invoice.invoiceNumber,
        subtitle: invoice.supplierName,
        message: `${invoice.daysOverdue} days overdue`,
        amount: formatCurrency(invoice.amount),
        severity: 'CRITICAL',
        type: 'PAYMENT_OVERDUE',
      });
    });

    // Payment Alerts - Due Soon
    dashboardData.alerts.paymentAlerts?.invoicesDueSoon?.forEach((invoice) => {
      paymentAlerts.push({
        title: invoice.invoiceNumber,
        subtitle: invoice.supplierName,
        message: `Due in ${invoice.daysUntilDue} days`,
        amount: formatCurrency(invoice.amount),
        severity: 'HIGH',
        type: 'PAYMENT_DUE_SOON',
      });
    });

    if (paymentAlerts.length > 0) {
      categories.push({
        categoryName: 'Payment Alerts',
        alerts: paymentAlerts,
      });
    }

    // Delivery Alerts Category
    const deliveryAlerts = [];

    dashboardData.alerts.deliveryAlerts?.delayedShipments?.forEach((shipment) => {
      deliveryAlerts.push({
        title: shipment.poNumber,
        subtitle: shipment.supplierName,
        message: `${shipment.daysDelayed} days delayed • Expected: ${new Date(shipment.expectedDeliveryDate).toLocaleDateString()}`,
        amount: formatCurrency(shipment.orderValue),
        severity: shipment.daysDelayed > 30 ? 'CRITICAL' : 'HIGH',
        type: 'DELAYED_SHIPMENT',
        targetId: shipment.purchaseOrderId,
        targetLink: `/purchase-order-detail/${shipment.purchaseOrderId}`,
      });
    });

    if (deliveryAlerts.length > 0) {
      categories.push({
        categoryName: 'Delivery Alerts',
        alerts: deliveryAlerts,
      });
    }

    // Operational Alerts Category
    const operationalAlerts = [];

    dashboardData.alerts.operationalAlerts?.rejectedRequisitions?.forEach((req) => {
      operationalAlerts.push({
        title: req.cartNumber,
        subtitle: req.requesterName ? `Requested by ${req.requesterName} • Rejected by ${req.rejectedBy}` : `Rejected by ${req.rejectedBy}`,
        message: req.rejectionReason || 'No reason provided',
        amount: formatCurrency(req.amount),
        severity: 'MEDIUM',
        type: 'REJECTED_REQUISITION',
        targetId: req.cartId,
        targetLink: `/cart-approval-details/${req.cartId}`,
      });
    });

    if (operationalAlerts.length > 0) {
      categories.push({
        categoryName: 'Operational Alerts',
        alerts: operationalAlerts,
      });
    }

    return categories;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="executive-dashboard">
        <h2 className="mb-4">Executive Dashboard</h2>
        <Alert color="danger">
          <h4 className="alert-heading">Error</h4>
          <p>{error}</p>
          <Button color="primary" onClick={fetchDashboardData}>
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  const financialData = dashboardData?.financial;
  const operationalData = dashboardData?.operational;
  const pipelineData = dashboardData?.pipeline;
  const supplierData = dashboardData?.supplier;
  const alerts = transformAlerts();

  // Check if we have any data at all
  const hasAnyData = financialData || operationalData || pipelineData || supplierData || (alerts && alerts.length > 0);

  if (!loading && !hasAnyData) {
    return (
      <div className="executive-dashboard">
        <h2 className="mb-4">Executive Dashboard</h2>
        <Alert color="info">
          <h4 className="alert-heading">No Data Available</h4>
          <p>There is no dashboard data available for the selected period. This could mean:</p>
          <ul>
            <li>The APIs are not yet implemented on the backend</li>
            <li>There is no data for the selected time period</li>
            <li>The backend server is not running</li>
          </ul>
          <p className="mb-0">Please check your backend server and try again.</p>
          <Button color="primary" onClick={fetchDashboardData} className="mt-2">
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="executive-dashboard">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div>
          <h1 className="mb-1 fw-bold" style={{ fontSize: '2rem', color: '#1a1a1a' }}>Executive Dashboard</h1>
          <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>
            Comprehensive insights and analytics for stakeholders
          </p>
        </div>
        <ButtonGroup>
          <Button
            color={selectedPeriod === 'thisMonth' ? 'primary' : 'outline-primary'}
            onClick={() => setSelectedPeriod('thisMonth')}
            size="sm"
          >
            This Month
          </Button>
          <Button
            color={selectedPeriod === 'lastMonth' ? 'primary' : 'outline-primary'}
            onClick={() => setSelectedPeriod('lastMonth')}
            size="sm"
          >
            Last Month
          </Button>
          <Button
            color={selectedPeriod === 'thisQuarter' ? 'primary' : 'outline-primary'}
            onClick={() => setSelectedPeriod('thisQuarter')}
            size="sm"
          >
            This Quarter
          </Button>
          <Button
            color={selectedPeriod === 'thisYear' ? 'primary' : 'outline-primary'}
            onClick={() => setSelectedPeriod('thisYear')}
            size="sm"
          >
            This Year
          </Button>
        </ButtonGroup>
      </div>

      {/* Tab Navigation */}
      <div className="mb-4" style={{ borderBottom: '2px solid #e0e0e0' }}>
        <div className="d-flex" style={{ overflowX: 'auto', scrollbarWidth: 'thin' }}>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 border-0 bg-transparent ${activeTab === 'overview' ? 'fw-bold' : ''}`}
            style={{
              borderBottom: activeTab === 'overview' ? '3px solid #007bff' : '3px solid transparent',
              color: activeTab === 'overview' ? '#007bff' : '#6c757d',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap'
            }}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`px-4 py-2 border-0 bg-transparent ${activeTab === 'financial' ? 'fw-bold' : ''}`}
            style={{
              borderBottom: activeTab === 'financial' ? '3px solid #007bff' : '3px solid transparent',
              color: activeTab === 'financial' ? '#007bff' : '#6c757d',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap'
            }}
          >
            Financial Metrics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('operations')}
            className={`px-4 py-2 border-0 bg-transparent ${activeTab === 'operations' ? 'fw-bold' : ''}`}
            style={{
              borderBottom: activeTab === 'operations' ? '3px solid #007bff' : '3px solid transparent',
              color: activeTab === 'operations' ? '#007bff' : '#6c757d',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap'
            }}
          >
            Operations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('procurement')}
            className={`px-4 py-2 border-0 bg-transparent ${activeTab === 'procurement' ? 'fw-bold' : ''}`}
            style={{
              borderBottom: activeTab === 'procurement' ? '3px solid #007bff' : '3px solid transparent',
              color: activeTab === 'procurement' ? '#007bff' : '#6c757d',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap'
            }}
          >
            Procurement & Suppliers
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Critical Alerts Summary */}
          {alerts && alerts.length > 0 && (
            <Row className="mb-4">
              <Col lg={12}>
                <AlertCard alertCategories={alerts} title="Critical Alerts & Actions Required" icon={<AlertCircle />} />
              </Col>
            </Row>
          )}

          {/* Financial Overview Cards */}
          {financialData && (
            <Row className="mb-4">
              <Col lg={12}>
                <h5 className="mb-3 fw-bold" style={{ fontSize: '1.1rem' }}>Financial Overview</h5>
                <Row>
                  {/* Spend Overview Card */}
                  <Col lg={4} md={12} className="mb-3">
                    <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
                      <CardBody className="p-3">
                        <h6 className="mb-2 fw-bold text-primary" style={{ fontSize: '0.9rem' }}>
                          <DollarSign size={16} className="me-1" />
                          Spend Overview
                        </h6>
                        <div style={{ fontSize: '0.75rem' }}>
                          {/* YTD */}
                          <div className="mb-2 pb-2 border-bottom">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <small className="text-muted fw-bold">Year to Date</small>
                              <strong className="text-dark" style={{ fontSize: '0.85rem' }}>{formatCurrency(financialData.totalSpendYTD)}</strong>
                            </div>
                          </div>
                          {/* QTD */}
                          <div className="mb-2 pb-2 border-bottom">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <small className="text-muted fw-bold">Quarter to Date</small>
                              <strong className="text-dark" style={{ fontSize: '0.85rem' }}>{formatCurrency(financialData.totalSpendQTD)}</strong>
                            </div>
                          </div>
                          {/* MTD */}
                          <div>
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <small className="text-muted fw-bold">Month to Date</small>
                              <strong className="text-dark" style={{ fontSize: '0.85rem' }}>{formatCurrency(financialData.totalSpendMTD)}</strong>
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>

                  {/* Budget Overview Card */}
                  <Col lg={4} md={12} className="mb-3">
                    <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
                      <CardBody className="p-3">
                        <h6 className="mb-2 fw-bold text-success" style={{ fontSize: '0.9rem' }}>
                          <TrendingUp size={16} className="me-1" />
                          Budget Overview
                        </h6>
                        <div style={{ fontSize: '0.75rem' }}>
                          <div className="d-flex justify-content-between mb-1">
                            <small className="text-muted">Allocated</small>
                            <strong className="text-dark">{formatCurrency(financialData.budgetMetrics?.totalAllocatedBudget)}</strong>
                          </div>
                          <div className="d-flex justify-content-between mb-1">
                            <small className="text-muted">Utilized</small>
                            <strong className="text-info">{formatCurrency(financialData.budgetMetrics?.totalUtilizedBudget)}</strong>
                          </div>
                          <div className="d-flex justify-content-between mb-1">
                            <small className="text-muted">Available</small>
                            <strong className="text-success">{formatCurrency(financialData.budgetMetrics?.totalAvailableBudget)}</strong>
                          </div>
                          <div className="d-flex justify-content-between pt-1 border-top">
                            <small className="text-muted">Utilization</small>
                            <strong className="text-primary">{financialData.budgetMetrics?.utilizationPercentage?.toFixed(1)}%</strong>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>

                  {/* Commitments & Payments Card */}
                  <Col lg={4} md={12} className="mb-3">
                    <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
                      <CardBody className="p-3">
                        <h6 className="mb-2 fw-bold text-warning" style={{ fontSize: '0.9rem' }}>
                          <ShoppingCart size={16} className="me-1" />
                          Commitments
                        </h6>
                        <div style={{ fontSize: '0.75rem' }}>
                          <div className="d-flex justify-content-between mb-1">
                            <small className="text-muted">Committed</small>
                            <strong className="text-dark">{formatCurrency(financialData.committedSpend?.totalCommitted)}</strong>
                          </div>
                          <div className="d-flex justify-content-between pt-1 border-top mb-1">
                            <small className="text-danger">Overdue</small>
                            <strong className="text-danger">{formatCurrency(financialData.paymentObligations?.overdue)}</strong>
                          </div>
                          <div className="d-flex justify-content-between">
                            <small className="text-muted">Avg Order</small>
                            <strong>{formatCurrency(financialData.averageOrderValue?.currentPeriod)}</strong>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>
                </Row>
              </Col>
            </Row>
          )}

          {/* Key Operational Metrics */}
          {operationalData && (
            <Row className="mb-4">
              <Col lg={12}>
                <h5 className="mb-3 fw-bold" style={{ fontSize: '1.1rem' }}>Key Operational Metrics</h5>
                <Row>
                  <Col lg={4} md={6} className="mb-3">
                    <MetricCard
                      title="Procurement Activity"
                      value={operationalData.procurementActivity?.totalRequisitions || 0}
                      format="number"
                      subtitle="Total Requisitions"
                      trend={null}
                      icon={<ShoppingCart />}
                    />
                  </Col>
                  <Col lg={4} md={6} className="mb-3">
                    <MetricCard
                      title="Approval Rate"
                      value={operationalData.approvalMetrics?.firstTimeApprovalRate || 0}
                      format="percentage"
                      subtitle="First Time Approval"
                      trend={null}
                      icon={<AlertCircle />}
                    />
                  </Col>
                  <Col lg={4} md={6} className="mb-3">
                    <MetricCard
                      title="Delivery Performance"
                      value={operationalData.deliveryPerformance?.onTimeDeliveryRate || 0}
                      format="percentage"
                      subtitle="On-Time Delivery Rate"
                      trend={null}
                      icon={<TrendingUp />}
                    />
                  </Col>
                </Row>
              </Col>
            </Row>
          )}

          {/* Procurement & Supplier Summary */}
          {(pipelineData || supplierData) && (
            <Row className="mb-4">
              <Col lg={6} className="mb-3">
                {pipelineData && (
                  <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
                    <CardBody className="p-3">
                      <h6 className="mb-3 fw-bold text-primary" style={{ fontSize: '0.9rem' }}>
                        Pipeline Summary
                      </h6>
                      <div style={{ fontSize: '0.85rem' }}>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Total Pipeline Value:</span>
                          <strong className="text-primary">{formatCurrency(pipelineData.pipelineSummary?.totalPipelineValue)}</strong>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Items in Pipeline:</span>
                          <strong>{formatNumber(pipelineData.pipelineSummary?.itemsInPipeline)}</strong>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )}
              </Col>
              <Col lg={6} className="mb-3">
                {supplierData && (
                  <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
                    <CardBody className="p-3">
                      <h6 className="mb-3 fw-bold text-success" style={{ fontSize: '0.9rem' }}>
                        Supplier Summary
                      </h6>
                      <div style={{ fontSize: '0.85rem' }}>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Active Suppliers:</span>
                          <strong className="text-success">{formatNumber(supplierData.supplierOverview?.totalActiveSuppliers)}</strong>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Transacted With:</span>
                          <strong className="text-primary">{formatNumber(supplierData.supplierOverview?.suppliersTransactedWith)}</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">New This Period:</span>
                          <strong className="text-info">{formatNumber(supplierData.supplierOverview?.newSuppliersAdded)}</strong>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )}
              </Col>
            </Row>
          )}
        </>
      )}

      {/* Financial Metrics Tab */}
      {activeTab === 'financial' && financialData && (
        <>
          <Row className="mb-4">
            <Col lg={12}>
              <h5 className="mb-3 fw-bold" style={{ fontSize: '1.1rem' }}>Financial Overview</h5>
              <Row>
                {/* Spend Overview Card */}
                <Col lg={4} md={12} className="mb-3">
                  <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
                    <CardBody className="p-3">
                      <h6 className="mb-2 fw-bold text-primary" style={{ fontSize: '0.9rem' }}>
                        <DollarSign size={16} className="me-1" />
                        Spend Overview
                      </h6>
                      <div style={{ fontSize: '0.75rem' }}>
                        {/* YTD */}
                        <div className="mb-2 pb-2 border-bottom">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <small className="text-muted fw-bold">Year to Date</small>
                            <strong className="text-dark" style={{ fontSize: '0.85rem' }}>{formatCurrency(financialData.totalSpendYTD)}</strong>
                          </div>
                          {financialData.spendVsLastYear && (
                            <div className="d-flex justify-content-end align-items-center">
                              <small style={{ fontSize: '0.65rem', color: getTrendColor(financialData.spendVsLastYear.trend) }}>
                                {getTrendIcon(financialData.spendVsLastYear.trend)} {financialData.spendVsLastYear.percentageChange.toFixed(1)}% vs last year
                              </small>
                            </div>
                          )}
                        </div>
                        {/* QTD */}
                        <div className="mb-2 pb-2 border-bottom">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <small className="text-muted fw-bold">Quarter to Date</small>
                            <strong className="text-dark" style={{ fontSize: '0.85rem' }}>{formatCurrency(financialData.totalSpendQTD)}</strong>
                          </div>
                          {financialData.spendVsLastQuarter && (
                            <div className="d-flex justify-content-end align-items-center">
                              <small style={{ fontSize: '0.65rem', color: getTrendColor(financialData.spendVsLastQuarter.trend) }}>
                                {getTrendIcon(financialData.spendVsLastQuarter.trend)} {financialData.spendVsLastQuarter.percentageChange.toFixed(1)}% vs last quarter
                              </small>
                            </div>
                          )}
                        </div>
                        {/* MTD */}
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <small className="text-muted fw-bold">Month to Date</small>
                            <strong className="text-dark" style={{ fontSize: '0.85rem' }}>{formatCurrency(financialData.totalSpendMTD)}</strong>
                          </div>
                          {financialData.spendVsLastMonth && (
                            <div className="d-flex justify-content-end align-items-center">
                              <small style={{ fontSize: '0.65rem', color: getTrendColor(financialData.spendVsLastMonth.trend) }}>
                                {getTrendIcon(financialData.spendVsLastMonth.trend)} {financialData.spendVsLastMonth.percentageChange.toFixed(1)}% vs last month
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Col>

              {/* Budget Overview Card */}
              <Col lg={4} md={12} className="mb-3">
                <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
                  <CardBody className="p-3">
                    <h6 className="mb-2 fw-bold text-success" style={{ fontSize: '0.9rem' }}>
                      <TrendingUp size={16} className="me-1" />
                      Budget Overview
                    </h6>
                    <div style={{ fontSize: '0.75rem' }}>
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-muted">Allocated</small>
                        <strong className="text-dark">{formatCurrency(financialData.budgetMetrics?.totalAllocatedBudget)}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-muted">Utilized</small>
                        <strong className="text-info">{formatCurrency(financialData.budgetMetrics?.totalUtilizedBudget)}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-muted">Available</small>
                        <strong className="text-success">{formatCurrency(financialData.budgetMetrics?.totalAvailableBudget)}</strong>
                      </div>
                      <div className="d-flex justify-content-between pt-1 border-top">
                        <small className="text-muted">Utilization</small>
                        <strong className="text-primary">{financialData.budgetMetrics?.utilizationPercentage?.toFixed(1)}%</strong>
                      </div>
                      <div className="d-flex justify-content-between pt-1 border-top" style={{ fontSize: '0.7rem' }}>
                        <span className="text-success">✓{financialData.budgetMetrics?.healthyBudgets}</span>
                        <span className="text-warning">⚠{financialData.budgetMetrics?.warningBudgets}</span>
                        <span className="text-danger">✗{financialData.budgetMetrics?.criticalBudgets}</span>
                        <span className="text-danger">⚠{financialData.budgetMetrics?.exceededBudgets}</span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Col>

              {/* Commitments & Payments Card */}
              <Col lg={4} md={12} className="mb-3">
                <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
                  <CardBody className="p-3">
                    <h6 className="mb-2 fw-bold text-warning" style={{ fontSize: '0.9rem' }}>
                      <ShoppingCart size={16} className="me-1" />
                      Commitments & Payments
                    </h6>
                    <div style={{ fontSize: '0.75rem' }}>
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-muted">Committed</small>
                        <strong className="text-dark">{formatCurrency(financialData.committedSpend?.totalCommitted)}</strong>
                      </div>
                      <div style={{ fontSize: '0.65rem' }}>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Confirmed:</span>
                          <span>{formatCurrency(financialData.committedSpend?.confirmedOrders)}</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Approved POs:</span>
                          <span>{formatCurrency(financialData.committedSpend?.approvedPOs)}</span>
                        </div>
                      </div>
                      <div className="d-flex justify-content-between pt-1 border-top mb-1">
                        <small className="text-danger">Overdue</small>
                        <strong className="text-danger">{formatCurrency(financialData.paymentObligations?.overdue)}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <small className="text-muted">Avg Order</small>
                        <strong>{formatCurrency(financialData.averageOrderValue?.currentPeriod)}</strong>
                      </div>
                    </div>
                  </CardBody>
                </Card>
                </Col>
              </Row>
            </Col>
          </Row>

          {/* Top Projects by Spend, Budget Health, and Payment Obligations */}
          <Row className="mb-4">
            {financialData.spendByProject?.length > 0 && (
              <Col lg={4}>
                <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
                  <CardBody className="p-3">
                    <h6 className="mb-3 fw-bold text-info">
                      <DollarSign size={18} className="me-2" />
                      Top Projects by Spend
                    </h6>
                    <div style={{ maxHeight: '215px', overflowY: 'auto', fontSize: '0.85rem' }}>
                      {financialData.spendByProject.slice(0, 5).map((project) => (
                        <div key={project.projectName} className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                          <div>
                            <small className="text-dark fw-bold d-block">{project.projectName}</small>
                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {project.transactionCount} transactions
                            </small>
                          </div>
                          <strong className="text-primary">{formatCurrency(project.totalSpend)}</strong>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              </Col>
            )}
            <Col lg={4}>
              <BudgetHealthChart budgetMetrics={financialData.budgetMetrics} />
            </Col>
            {financialData.paymentObligations && (
              <Col lg={4}>
                <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
                  <CardBody className="p-3">
                    <h6 className="mb-3 fw-bold text-danger">
                      <DollarSign size={18} className="me-2" />
                      Payment Obligations
                    </h6>
                    <div style={{ fontSize: '0.85rem', minHeight: '215px' }}>
                      <div className="d-flex justify-content-between align-items-start mb-3 pb-2 border-bottom">
                        <span className="text-danger fw-bold">Overdue:</span>
                        <div className="text-end">
                          <strong className="text-danger d-block">{formatCurrency(financialData.paymentObligations.overdue)}</strong>
                          <small className="text-muted" style={{ fontSize: '0.75rem' }}>{financialData.paymentObligations.overdueCount} invoices</small>
                        </div>
                      </div>
                      <div className="d-flex justify-content-between align-items-start mb-3 pb-2 border-bottom">
                        <span className="text-warning fw-bold">Due in 7 Days:</span>
                        <div className="text-end">
                          <strong className="text-warning d-block">{formatCurrency(financialData.paymentObligations.dueIn7Days)}</strong>
                          <small className="text-muted" style={{ fontSize: '0.75rem' }}>{financialData.paymentObligations.dueIn7DaysCount} invoices</small>
                        </div>
                      </div>
                      <div className="d-flex justify-content-between align-items-start mb-3 pb-2 border-bottom">
                        <span className="text-info fw-bold">Due in 30 Days:</span>
                        <div className="text-end">
                          <strong className="text-info d-block">{formatCurrency(financialData.paymentObligations.dueIn30Days)}</strong>
                          <small className="text-muted" style={{ fontSize: '0.75rem' }}>{financialData.paymentObligations.dueIn30DaysCount} invoices</small>
                        </div>
                      </div>
                      <div className="d-flex justify-content-between align-items-start">
                        <span className="text-success fw-bold">Due in 60 Days:</span>
                        <strong className="text-success">{formatCurrency(financialData.paymentObligations.dueIn60Days)}</strong>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            )}
          </Row>

          {/* Monthly Spend Trend */}
          {financialData.monthlySpendTrend && financialData.monthlySpendTrend.length > 0 && (
            <Row className="mb-4">
              <Col lg={12}>
                <Card className="shadow-sm border-0" style={{ borderRadius: '8px' }}>
                  <CardBody className="p-3">
                    <h6 className="mb-3 fw-bold text-primary">
                      <TrendingUp size={18} className="me-2" />
                      Monthly Spend Trend (Last 12 Months)
                    </h6>
                    <div style={{ height: '250px' }}>
                      <div className="d-flex justify-content-between align-items-end" style={{ height: '100%', gap: '4px' }}>
                        {financialData.monthlySpendTrend.map((month) => {
                          const maxSpend = Math.max(...financialData.monthlySpendTrend.map(m => m.totalSpend));
                          const height = maxSpend > 0 ? (month.totalSpend / maxSpend) * 100 : 0;
                          const monthName = new Date(`${month.month}-01`).toLocaleDateString('en-US', { month: 'short' });

                          return (
                            <div
                              key={month.month}
                              className="d-flex flex-column align-items-center"
                              style={{ flex: 1, height: '100%' }}
                            >
                              <div className="d-flex flex-column justify-content-end" style={{ height: '200px', width: '100%' }}>
                                <div
                                  className="position-relative"
                                  style={{
                                    height: `${height}%`,
                                    backgroundColor: month.totalSpend > 0 ? '#007bff' : '#e9ecef',
                                    borderRadius: '4px 4px 0 0',
                                    minHeight: month.totalSpend > 0 ? '2px' : '1px',
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = month.totalSpend > 0 ? '#0056b3' : '#dee2e6';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = month.totalSpend > 0 ? '#007bff' : '#e9ecef';
                                  }}
                                  title={`${monthName}: ${formatCurrency(month.totalSpend)} (${month.transactionCount} transactions)`}
                                >
                                  {month.totalSpend > 0 && (
                                    <small
                                      className="position-absolute"
                                      style={{
                                        bottom: '100%',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        fontSize: '0.6rem',
                                        whiteSpace: 'nowrap',
                                        color: '#6c757d',
                                        marginBottom: '2px'
                                      }}
                                    >
                                      {formatCurrency(month.totalSpend).replace(/\.\d+$/, '')}
                                    </small>
                                  )}
                                </div>
                              </div>
                              <small className="mt-1 text-muted" style={{ fontSize: '0.65rem', fontWeight: '500' }}>
                                {monthName}
                              </small>
                              {month.transactionCount > 0 && (
                                <small className="text-muted" style={{ fontSize: '0.55rem' }}>
                                  ({month.transactionCount})
                                </small>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          )}

          {/* Spend by Department Chart */}
          {financialData.spendByDepartment && financialData.spendByDepartment.length > 0 && (
            <Row className="mb-4">
              <Col lg={12}>
                <SpendByDepartmentChart spendByDepartment={financialData.spendByDepartment} />
              </Col>
            </Row>
          )}
        </>
      )}

      {/* Operations Tab */}
      {activeTab === 'operations' && operationalData && (
        <>
          <Row className="mb-3">
            <Col lg={12}>
              <h5 className="mb-0 fw-bold" style={{ fontSize: '1.1rem' }}>Operational Metrics</h5>
            </Col>
          </Row>

          {/* Cycle Time Metrics, Procurement Activity & Procurement Pipeline */}
          <Row className="mb-4">
            {operationalData.cycleTimeMetrics && (
              <Col lg={4} className="mb-3">
                <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
                  <CardBody className="p-3">
                    <h6 className="mb-2 fw-bold text-primary" style={{ fontSize: '0.9rem' }}>
                      <TrendingUp size={16} className="me-1" />
                      Cycle Time Metrics (days)
                    </h6>
                    <div style={{ fontSize: '0.8rem' }}>
                      {(() => {
                        const cartToPo = formatCycleTime(operationalData.cycleTimeMetrics['averageCart ToPoTime']);
                        return (
                          <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                            <span className="text-muted">Cart to PO:</span>
                            <div className="text-end">
                              <strong className={cartToPo.color}>{cartToPo.display}</strong>
                              {cartToPo.badge && <div><span className={`badge bg-${cartToPo.color === 'text-success' ? 'success' : cartToPo.color === 'text-warning' ? 'warning' : 'danger'} mt-1`} style={{ fontSize: '0.65rem' }}>{cartToPo.badge}</span></div>}
                            </div>
                          </div>
                        );
                      })()}
                      {(() => {
                        const poToDelivery = formatCycleTime(operationalData.cycleTimeMetrics.averagePoToDeliveryTime);
                        return (
                          <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                            <span className="text-muted">PO to Delivery:</span>
                            <div className="text-end">
                              <strong className={poToDelivery.color}>{poToDelivery.display}</strong>
                              {poToDelivery.badge && <div><span className={`badge bg-${poToDelivery.color === 'text-success' ? 'success' : poToDelivery.color === 'text-warning' ? 'warning' : 'danger'} mt-1`} style={{ fontSize: '0.65rem' }}>{poToDelivery.badge}</span></div>}
                            </div>
                          </div>
                        );
                      })()}
                      {(() => {
                        const invoiceToPayment = formatCycleTime(operationalData.cycleTimeMetrics.averageInvoiceToPaymentTime);
                        return (
                          <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                            <span className="text-muted">Invoice to Payment:</span>
                            <div className="text-end">
                              <strong className={invoiceToPayment.color}>{invoiceToPayment.display}</strong>
                              {invoiceToPayment.badge && <div><span className={`badge bg-${invoiceToPayment.color === 'text-success' ? 'success' : invoiceToPayment.color === 'text-warning' ? 'warning' : 'danger'} mt-1`} style={{ fontSize: '0.65rem' }}>{invoiceToPayment.badge}</span></div>}
                            </div>
                          </div>
                        );
                      })()}
                      {(() => {
                        const rfqResponse = formatCycleTime(operationalData.cycleTimeMetrics.averageRfqResponseTime);
                        return (
                          <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                            <span className="text-muted">RFQ Response:</span>
                            <div className="text-end">
                              <strong className={rfqResponse.color}>{rfqResponse.display}</strong>
                              {rfqResponse.badge && <div><span className={`badge bg-${rfqResponse.color === 'text-success' ? 'success' : rfqResponse.color === 'text-warning' ? 'warning' : 'danger'} mt-1`} style={{ fontSize: '0.65rem' }}>{rfqResponse.badge}</span></div>}
                            </div>
                          </div>
                        );
                      })()}
                      {(() => {
                        const totalCycle = formatCycleTime(operationalData.cycleTimeMetrics.totalProcurementCycleTime);
                        return (
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted fw-bold">Total Cycle:</span>
                            <div className="text-end">
                              <strong className={totalCycle.color} style={{ fontSize: '0.95rem' }}>{totalCycle.display}</strong>
                              {totalCycle.badge && <div><span className={`badge bg-${totalCycle.color === 'text-success' ? 'success' : totalCycle.color === 'text-warning' ? 'warning' : 'danger'} mt-1`} style={{ fontSize: '0.65rem' }}>{totalCycle.badge}</span></div>}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </CardBody>
                </Card>
              </Col>
            )}

            {operationalData.procurementActivity && (
              <Col lg={4} className="mb-3">
                <ProcurementActivityChart procurementActivity={operationalData.procurementActivity} />
              </Col>
            )}

            {operationalData.requisitionPipeline && (
              <Col lg={4} className="mb-3">
                <RequisitionPipelineChart requisitionPipeline={operationalData.requisitionPipeline} />
              </Col>
            )}
          </Row>

          {/* Purchase Order Stats & Approval Metrics */}
          <Row className="mb-4">
            {/* Purchase Order Stats */}
            {operationalData.purchaseOrderStats && (
              <Col lg={6}>
                <PurchaseOrderStatusChart purchaseOrderStats={operationalData.purchaseOrderStats} />
              </Col>
            )}

            {/* Approval Metrics */}
            {operationalData.approvalMetrics && (
              <Col lg={6}>
                <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
                  <CardBody className="p-3">
                    <h6 className="mb-3 fw-bold text-success">
                      <AlertCircle size={18} className="me-2" />
                      Approval Metrics
                    </h6>
                    <div style={{ fontSize: '0.85rem' }}>
                      <div className="mb-3">
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">First Time Approval Rate:</span>
                          <strong className="text-success fs-5">{operationalData.approvalMetrics.firstTimeApprovalRate?.toFixed(1)}%</strong>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Rejection Rate:</span>
                          <strong className="text-danger">{operationalData.approvalMetrics.rejectionRate?.toFixed(1)}%</strong>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Avg Approval Time:</span>
                          <strong>{operationalData.approvalMetrics.averageApprovalTime?.toFixed(1) || 0} days</strong>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Total Approvals Completed:</span>
                          <strong>{operationalData.approvalMetrics.totalApprovalsCompleted}</strong>
                        </div>
                      </div>
                      <div className="pt-2 border-top">
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted fw-bold">Pending Approvals:</span>
                          <strong className="text-warning">{operationalData.approvalMetrics.pendingApprovals?.totalPending || 0}</strong>
                        </div>
                        {operationalData.approvalMetrics.pendingApprovals && (
                          <div className="mb-2" style={{ fontSize: '0.75rem' }}>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Carts:</span>
                              <span>{operationalData.approvalMetrics.pendingApprovals.carts?.length || 0}</span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">RFQs:</span>
                              <span>{operationalData.approvalMetrics.pendingApprovals.rfqs?.length || 0}</span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Purchase Orders:</span>
                              <span>{operationalData.approvalMetrics.pendingApprovals.purchaseOrders?.length || 0}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      {operationalData.approvalMetrics.topRejectionReasons && operationalData.approvalMetrics.topRejectionReasons.length > 0 && (
                        <div className="pt-2 border-top">
                          <div className="mb-2">
                            <span className="text-muted fw-bold" style={{ fontSize: '0.8rem' }}>Top Rejection Reasons:</span>
                          </div>
                          <div style={{ fontSize: '0.75rem' }}>
                            {operationalData.approvalMetrics.topRejectionReasons.slice(0, 3).map((reason) => (
                              <div key={reason.reason} className="d-flex justify-content-between mb-1">
                                <span className="text-muted">{reason.reason}:</span>
                                <span className="text-danger fw-bold">{reason.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </Col>
            )}
          </Row>

          {/* Delivery Performance & Team Productivity */}
          <Row className="mb-4">
            {operationalData.deliveryPerformance && (
              <Col lg={6} className="mb-3">
                <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
                  <CardBody className="p-3">
                    <h6 className="mb-3 fw-bold text-warning">
                      <ShoppingCart size={18} className="me-2" />
                      Delivery Performance
                    </h6>
                    <div style={{ fontSize: '0.85rem' }}>
                      <div className="mb-3">
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">On-Time Delivery Rate:</span>
                          <strong className="text-success fs-5">
                            {operationalData.deliveryPerformance.onTimeDeliveryRate != null
                              ? `${operationalData.deliveryPerformance.onTimeDeliveryRate.toFixed(1)}%`
                              : operationalData.deliveryPerformance.totalDeliveries > 0
                              ? `${((operationalData.deliveryPerformance.onTimeDeliveries / operationalData.deliveryPerformance.totalDeliveries) * 100).toFixed(1)}%`
                              : '0.0%'}
                          </strong>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Total Deliveries:</span>
                          <strong>{operationalData.deliveryPerformance.totalDeliveries || 0}</strong>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">On-Time Deliveries:</span>
                          <strong className="text-success">{operationalData.deliveryPerformance.onTimeDeliveries || 0}</strong>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Late Deliveries:</span>
                          <strong className="text-danger">{operationalData.deliveryPerformance.lateDeliveries || 0}</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Avg Delay (days):</span>
                          <strong>
                            {operationalData.deliveryPerformance.averageDelayDays != null
                              ? operationalData.deliveryPerformance.averageDelayDays.toFixed(1)
                              : operationalData.deliveryPerformance.lateDeliveries > 0
                              ? '0.0'
                              : '0.0'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            )}

            {operationalData.teamProductivity && operationalData.teamProductivity.totalUsers > 0 && (
              <Col lg={6} className="mb-3">
                <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
                  <CardBody className="p-3">
                    <h6 className="mb-3 fw-bold text-info" style={{ fontSize: '0.9rem' }}>
                      <AlertCircle size={16} className="me-1" />
                      Team Productivity & Performance
                    </h6>

                    {/* Overall Stats */}
                    <Row style={{ fontSize: '0.85rem' }} className="mb-3">
                      <Col lg={4} md={6} className="mb-2">
                        <div className="d-flex justify-content-between p-2 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
                          <span className="text-muted">Total Users:</span>
                          <strong className="text-primary fs-5">{operationalData.teamProductivity.totalUsers}</strong>
                        </div>
                      </Col>
                      <Col lg={4} md={6} className="mb-2">
                        <div className="d-flex justify-content-between p-2 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
                          <span className="text-muted">Avg Requisitions/User:</span>
                          <strong className="text-info fs-5">{operationalData.teamProductivity.averageRequisitionsPerUser?.toFixed(1) || 'N/A'}</strong>
                        </div>
                      </Col>
                      <Col lg={4} md={6} className="mb-2">
                        <div className="d-flex justify-content-between p-2 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
                          <span className="text-muted">Avg Value/User:</span>
                          <strong className="text-success fs-5">{formatCurrency(operationalData.teamProductivity.averageValueProcessedPerUser)}</strong>
                        </div>
                      </Col>
                    </Row>

                    {/* Top Performers */}
                    {operationalData.teamProductivity.topPerformers && operationalData.teamProductivity.topPerformers.length > 0 && (
                      <>
                        <div className="border-top pt-3 mt-2">
                          <h6 className="mb-2 text-muted fw-bold" style={{ fontSize: '0.85rem' }}>
                            <i className="bi bi-trophy-fill text-warning me-1" />
                            Top Performers
                          </h6>
                        </div>
                        <Row style={{ fontSize: '0.8rem' }}>
                          {operationalData.teamProductivity.topPerformers.slice(0, 4).map((performer, performerIndex) => (
                            <Col lg={3} md={6} key={performer.userName} className="mb-2">
                              <div className="p-2 border rounded h-100" style={{ backgroundColor: performerIndex === 0 ? '#fff8e1' : '#f8f9fa' }}>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <strong className="text-dark" style={{ fontSize: '0.85rem' }}>{performer.userName}</strong>
                                  <span className={`badge ${performerIndex === 0 ? 'bg-warning text-dark' : 'bg-primary'}`} style={{ fontSize: '0.65rem' }}>
                                    {performerIndex === 0 && <i className="bi bi-trophy-fill me-1" />}
                                    #{performerIndex + 1}
                                  </span>
                                </div>
                                <div className="d-flex justify-content-between mb-1">
                                  <small className="text-muted">Requisitions:</small>
                                  <strong className="text-primary">{performer.requisitionsProcessed}</strong>
                                </div>
                                <div className="d-flex justify-content-between">
                                  <small className="text-muted">Value:</small>
                                  <strong className="text-success" style={{ fontSize: '0.75rem' }}>{formatCurrency(performer.totalValueProcessed)}</strong>
                                </div>
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </>
                    )}
                  </CardBody>
                </Card>
              </Col>
            )}
          </Row>
        </>
      )}

      {/* Procurement & Suppliers Tab */}
      {activeTab === 'procurement' && (pipelineData || supplierData) && (
        <>
          <Row className="mb-3">
            <Col lg={12}>
              <h5 className="mb-0 fw-bold" style={{ fontSize: '1.1rem' }}>Procurement Pipeline & Supplier Performance</h5>
            </Col>
          </Row>

          {pipelineData && (
            <Row className="mb-4">
              <Col>
                <ProcurementPipelineChart pipelineData={pipelineData} />
              </Col>
            </Row>
          )}

          {supplierData && (
            <Row className="mb-4">
              <Col>
                <SupplierPerformanceTable supplierData={supplierData} />
              </Col>
            </Row>
          )}
        </>
      )}

    </div>
  );
};

export default ExecutiveDashboard;