import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'react-feather';
import { Row, Col, Card, CardBody, CardTitle, Progress, Badge, Table } from 'reactstrap';
// eslint-disable-next-line import/no-extraneous-dependencies
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import BudgetService from '../../services/BudgetService';
import { getEntityId, formatCurrency, formatDate } from '../localStorageUtil';

const BudgetUtilization = () => {
  const { budgetId } = useParams();
  const navigate = useNavigate();
  const [utilizationData, setUtilizationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const companyId = getEntityId();

  const fetchUtilizationData = async () => {
    try {
      setLoading(true);
      const response = await BudgetService.getBudgetUtilization(companyId, { budgetId });
      console.log('Utilization API Response:', response);
      
      // Handle different response structures
      let budgetData = null;
      if (response.data) {
        // If it's a direct budget object
        if (response.data.budgetId || response.data.projectId) {
          budgetData = response.data;
        }
        // If it's wrapped in an array or nested structure
        else if (Array.isArray(response.data)) {
          budgetData = response.data.find(budget => 
            budget.budgetId?.toString() === budgetId?.toString() || 
            budget.projectId?.toString() === budgetId?.toString()
          );
        }
        // If it's nested under budgetUtilization
        else if (response.data.budgetUtilization) {
          if (Array.isArray(response.data.budgetUtilization)) {
            budgetData = response.data.budgetUtilization.find(budget => 
              budget.budgetId?.toString() === budgetId?.toString() || 
              budget.projectId?.toString() === budgetId?.toString()
            );
          } else {
            budgetData = response.data.budgetUtilization;
          }
        }
      }
      
      console.log('Processed Budget Data:', budgetData);
      setUtilizationData(budgetData);
    } catch (err) {
      setError('Failed to load budget utilization data');
      console.error('Error fetching utilization data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (budgetId) {
      fetchUtilizationData();
    }
  }, [budgetId]);

  const getUtilizationColor = (percentage) => {
    if (percentage >= 90) return 'danger';
    if (percentage >= 75) return 'warning';
    if (percentage >= 50) return 'info';
    return 'success';
  };


  const getTransactionTypeBadgeColor = (transactionType) => {
    switch (transactionType) {
      case 'BUDGET_ALLOCATED': return 'primary';
      case 'CART_CREATED':
      case 'CART_UPDATED': return 'secondary'; // Pending requisitions
      case 'ORDER_PLACED': return 'success'; // Actual budget consumption
      case 'PAYMENT_MADE': return 'warning';
      default: return 'secondary';
    }
  };

  const formatTransactionType = (transactionType) => {
    switch (transactionType) {
      case 'BUDGET_ALLOCATED': return 'Budget Allocated';
      case 'CART_CREATED': return 'Requisition Created'; // Pending
      case 'CART_UPDATED': return 'Requisition Updated'; // Pending
      case 'ORDER_PLACED': return 'Purchase Order'; // Actual consumption
      case 'PAYMENT_MADE': return 'Payment Made';
      default: return transactionType?.replace('_', ' ') || 'Activity';
    }
  };

  const getTransactionLink = (transaction) => {
    switch (transaction.transactionType) {
      case 'CART_CREATED':
        return transaction.transactionId ? `/cartDetails/${transaction.transactionId}` : null;
      case 'ORDER_PLACED':
        return transaction.transactionId ? `/purchase-order-detail/${transaction.transactionId}` : null;
      default:
        return null;
    }
  };

  const renderTransactionName = (transaction) => {
    const link = getTransactionLink(transaction);

    // For cart transactions, show cart number instead of cart name
    const isCartTransaction = transaction.transactionType === 'CART_CREATED' || transaction.transactionType === 'CART_UPDATED';
    const displayName = isCartTransaction
      ? (transaction.cartNo ? `Cart: ${transaction.cartNo}` : transaction.transactionName)
      : transaction.transactionName;

    if (link) {
      return (
        <div>
          <a
            href={link}
            className="text-decoration-none fw-bold text-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            {displayName}
          </a>
          {isCartTransaction && transaction.cartName && (
            <div className="small text-muted">{transaction.cartName}</div>
          )}
          {transaction.orderNo && !isCartTransaction && (
            <div className="small text-muted">Order: {transaction.orderNo}</div>
          )}
        </div>
      );
    }

    return (
      <div>
        <strong>{displayName}</strong>
        {isCartTransaction && transaction.cartName && (
          <div className="small text-muted">{transaction.cartName}</div>
        )}
        {transaction.orderNo && !isCartTransaction && (
          <div className="small text-muted">Order: {transaction.orderNo}</div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  if (!utilizationData) {
    return (
      <div className="alert alert-warning" role="alert">
        <h4>Debug Information:</h4>
        <p><strong>Budget ID from URL:</strong> {budgetId}</p>
        <p><strong>Company ID:</strong> {companyId}</p>
        <p>No utilization data found for this budget. Please check the console for API response details.</p>
        <button 
          type="button"
          className="btn btn-primary mt-2" 
          onClick={() => window.location.reload()}
        >
          Retry Loading
        </button>
      </div>
    );
  }

  const utilizationPercentage = utilizationData?.utilizationPercentage || 0;
  const remainingAmount = utilizationData 
    ? Number((utilizationData.allocatedAmount - utilizationData.utilizedAmount).toFixed(2))
    : 0;

  return (
    <div style={{ paddingTop: '24px' }}>
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center mb-3">
            <button 
              type="button"
              className="btn btn-outline-secondary me-3"
              onClick={() => navigate('/budget-dashboard')}
            >
              <ArrowLeft size={16} className="me-1" />
              Back to Dashboard
            </button>
            <div>
              <h2 className="mb-0">{utilizationData?.projectName || `Budget #${utilizationData?.budgetId || budgetId}`}</h2>
              <p className="text-muted mb-0">{utilizationData?.purchaseType || 'Budget'} | Budget Utilization Details</p>
            </div>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md="3">
          <Card className="border-left-primary shadow h-100">
            <CardBody>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total Budget
                  </div>
                  <div className="h5 mb-0 font-weight-bold">
                    {formatCurrency(utilizationData?.allocatedAmount || 0)}
                  </div>
                </div>
                <Badge color={getUtilizationColor(utilizationPercentage)}>
                  {utilizationPercentage.toFixed(1)}% Utilized
                </Badge>
              </div>
            </CardBody>
          </Card>
        </Col>
        
        <Col md="3">
          <Card className="border-left-success shadow h-100">
            <CardBody>
              <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                Consumed (Orders)
              </div>
              <div className="h5 mb-0 font-weight-bold text-success">
                {formatCurrency(utilizationData?.utilizedAmount || 0)}
              </div>
              <div className="text-muted small">
                {utilizationPercentage.toFixed(1)}% of budget
              </div>
              <div className="text-info small mt-1">
                Pending: {formatCurrency(utilizationData?.cartAmount || 0)}
              </div>
            </CardBody>
          </Card>
        </Col>
        
        <Col md="3">
          <Card className="border-left-info shadow h-100">
            <CardBody>
              <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                Remaining
              </div>
              <div className="h5 mb-0 font-weight-bold">
                {formatCurrency(remainingAmount)}
              </div>
              <div className="mt-2">
                <Progress 
                  value={utilizationPercentage} 
                  color={getUtilizationColor(utilizationPercentage)}
                />
              </div>
            </CardBody>
          </Card>
        </Col>
        
        <Col md="3">
          <Card className="border-left-warning shadow h-100">
            <CardBody>
              <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                Activity Summary
              </div>
              <div className="small">
                <strong>Pending Carts:</strong> {utilizationData?.activeCartsCount || 0}<br/>
                <strong>Confirmed Orders:</strong> {utilizationData?.confirmedOrdersCount || 0}<br/>
                <strong>Last Activity:</strong><br/>
                {utilizationData.utilizationTimeline?.filter(t => t.transactionType !== 'BUDGET_ALLOCATED').length > 0 
                  ? formatDate([...utilizationData.utilizationTimeline].filter(t => t.transactionType !== 'BUDGET_ALLOCATED').sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date)
                  : 'No activity'
                }
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md="12">
          <Card className="shadow">
            <CardBody>
              <CardTitle tag="h6" className="mb-4 text-primary">
                Cumulative Budget Utilization Timeline
              </CardTitle>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={utilizationData.utilizationTimeline ? [...utilizationData.utilizationTimeline].filter(t => t.transactionType !== 'BUDGET_ALLOCATED').sort((a, b) => new Date(a.date) - new Date(b.date)) : []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis 
                    yAxisId="left"
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'cumulativeUtilization') return [formatCurrency(value), 'Cumulative Consumed (Orders)'];
                      if (name === 'utilizationPercentage') return [`${value}%`, 'Utilization %'];
                      if (name === 'cartAmount') return [formatCurrency(value), 'Pending Requisitions'];
                      if (name === 'orderAmount') return [formatCurrency(value), 'Order Amount'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Date: ${new Date(label).toLocaleString()}`}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border rounded shadow">
                            <p className="fw-bold mb-2">{`Date: ${new Date(label).toLocaleString()}`}</p>
                            {payload.map((entry) => (
                              <p key={`tooltip-${entry.dataKey}-${entry.value}`} style={{ color: entry.color }}>
                                {entry.name === 'cumulativeUtilization' ? 'Cumulative Consumed (Orders): ' : 
                                 entry.name === 'utilizationPercentage' ? 'Utilization %: ' : `${entry.name}: `}
                                <span className="fw-bold">
                                  {entry.name === 'utilizationPercentage' ? `${entry.value}%` : formatCurrency(entry.value)}
                                </span>
                              </p>
                            ))}
                            {payload[0]?.payload?.transactionName && (
                              <p className="text-muted small mt-2">Transaction: {payload[0].payload.transactionName}</p>
                            )}
                            {payload[0]?.payload?.userName && (
                              <p className="text-muted small">User: {payload[0].payload.userName}</p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cumulativeUtilization" 
                    stroke="#28a745" 
                    strokeWidth={2}
                    yAxisId="left"
                    name="cumulativeUtilization"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="utilizationPercentage" 
                    stroke="#007bff" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    yAxisId="right"
                    name="utilizationPercentage"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </Col>
        
      </Row>

      <Row>
        <Col md="12">
          <Card className="shadow">
            <CardBody>
              <CardTitle tag="h6" className="mb-4 text-primary">
                Budget Utilization Timeline
              </CardTitle>
              {utilizationData.utilizationTimeline && utilizationData.utilizationTimeline.length > 0 ? (
                <div className="table-responsive">
                  <Table striped hover>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Transaction Type</th>
                        <th>Description</th>
                        <th>Cart Amount</th>
                        <th>Order Amount</th>
                        <th>Cumulative Total</th>
                        <th>Utilization %</th>
                        <th>User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {utilizationData.utilizationTimeline.filter(t => t.transactionType !== 'BUDGET_ALLOCATED').map((transaction) => (
                        <tr key={`${transaction.transactionType}-${transaction.date}-${transaction.cumulativeUtilization}`}>
                          <td>
                            <small>{new Date(transaction.date).toLocaleString()}</small>
                          </td>
                          <td>
                            <Badge color={getTransactionTypeBadgeColor(transaction.transactionType)}>
                              {formatTransactionType(transaction.transactionType)}
                            </Badge>
                          </td>
                          <td>
                            {renderTransactionName(transaction)}
                          </td>
                          <td>
                            {transaction.cartAmount > 0 ? formatCurrency(transaction.cartAmount) : '-'}
                          </td>
                          <td>
                            {transaction.orderAmount > 0 ? formatCurrency(transaction.orderAmount) : '-'}
                          </td>
                          <td>
                            <strong>{formatCurrency(transaction.cumulativeUtilization)}</strong>
                          </td>
                          <td>
                            <Badge color={getUtilizationColor(transaction.utilizationPercentage)}>
                              {transaction.utilizationPercentage.toFixed(1)}%
                            </Badge>
                          </td>
                          <td>
                            <div>
                              <small className="fw-bold">{transaction.userName}</small>
                              {transaction.userEmail && (
                                <div className="small text-muted">{transaction.userEmail}</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-muted text-center py-3">
                  No timeline data found for this budget.
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Budget History Section */}
      <Row className="mt-4">
        <Col md="12">
          <Card className="shadow">
            <CardBody>
              <CardTitle tag="h6" className="mb-4 text-primary">
                Budget History
              </CardTitle>
              {utilizationData.budgetHistory && utilizationData.budgetHistory.length > 0 ? (
                <div className="table-responsive">
                  <Table striped hover>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Change Type</th>
                        <th>Field Changed</th>
                        <th>Old Value</th>
                        <th>New Value</th>
                        <th>Changed By</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {utilizationData.budgetHistory.map((historyItem) => (
                        <tr key={`history-${historyItem.auditId}`}>
                          <td>
                            <small>{new Date(historyItem.changedDate).toLocaleString()}</small>
                          </td>
                          <td>
                            <Badge color={
                              historyItem.changeType === 'CREATE' ? 'success' :
                              historyItem.changeType === 'UPDATE' ? 'warning' :
                              historyItem.changeType === 'DELETE' ? 'danger' : 'secondary'
                            }>
                              {historyItem.changeType}
                            </Badge>
                          </td>
                          <td>
                            <small className="fw-bold">
                              {historyItem.fieldChanged === 'budgetAmount' ? 'Budget Amount' :
                               historyItem.fieldChanged === 'budgetDescription' ? 'Description' :
                               historyItem.fieldChanged === 'periodStartDate' ? 'Start Date' :
                               historyItem.fieldChanged === 'periodEndDate' ? 'End Date' :
                               historyItem.fieldChanged === 'ALL' ? 'Budget Created' :
                               historyItem.fieldChanged}
                            </small>
                          </td>
                          <td>
                            <small className="text-muted">
                              {historyItem.changeType === 'CREATE' ? '-' :
                               historyItem.fieldChanged === 'budgetAmount' ? 
                                 formatCurrency(historyItem.oldBudgetAmount) :
                               historyItem.fieldChanged === 'periodStartDate' ? 
                                 (historyItem.oldPeriodStartDate ? formatDate(historyItem.oldPeriodStartDate) : '-') :
                               historyItem.fieldChanged === 'periodEndDate' ? 
                                 (historyItem.oldPeriodEndDate ? formatDate(historyItem.oldPeriodEndDate) : '-') :
                               historyItem.oldValue || '-'}
                            </small>
                          </td>
                          <td>
                            <small className="fw-bold text-primary">
                              {historyItem.fieldChanged === 'budgetAmount' ? 
                                 formatCurrency(historyItem.newBudgetAmount) :
                               historyItem.fieldChanged === 'periodStartDate' ? 
                                 (historyItem.newPeriodStartDate ? formatDate(historyItem.newPeriodStartDate) : '-') :
                               historyItem.fieldChanged === 'periodEndDate' ? 
                                 (historyItem.newPeriodEndDate ? formatDate(historyItem.newPeriodEndDate) : '-') :
                               historyItem.fieldChanged === 'ALL' ? 'Budget Created' :
                               historyItem.newValue || '-'}
                            </small>
                          </td>
                          <td>
                            <small>{historyItem.changedByName}</small>
                          </td>
                          <td>
                            <small className="text-muted">{historyItem.changeReason || '-'}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-muted text-center py-3">
                  <i className="fas fa-history me-2"></i>
                  No budget history found for this budget.
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {utilizationPercentage >= 75 && (
        <Row className="mt-4">
          <Col md="12">
            <Card className="shadow">
              <CardBody>
                <CardTitle tag="h6" className="mb-4 text-primary">
                  Budget Alerts
                </CardTitle>
                {utilizationPercentage >= 90 && (
                  <div className="alert alert-danger">
                    <strong>Critical Alert:</strong> Budget utilization has reached {utilizationPercentage.toFixed(1)}%. 
                    Immediate attention required.
                  </div>
                )}
                {utilizationPercentage >= 75 && utilizationPercentage < 90 && (
                  <div className="alert alert-warning">
                    <strong>Warning:</strong> Budget utilization is at {utilizationPercentage.toFixed(1)}%. 
                    Consider reviewing remaining expenses.
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default BudgetUtilization;