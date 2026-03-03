import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, CardBody, CardTitle, Badge } from 'reactstrap';
// eslint-disable-next-line import/no-extraneous-dependencies
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import BudgetService from '../../services/BudgetService';
import ProjectService from '../../services/ProjectService';
import { getEntityId, formatCurrency, getCurrencySymbol, getCompanyCurrency } from '../localStorageUtil';
import ComponentCard from '../../components/ComponentCard';
import BudgetActivityFeed from './BudgetActivityFeed';

const BudgetDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [budgetData, setBudgetData] = useState([]);
  const [projectData, setProjectData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState('all');
  const companyId = getEntityId();
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard data, utilization data, and projects
      const [dashboardResponse, utilizationResponse, projectResponse] = await Promise.all([
        BudgetService.getBudgetDashboard(companyId).catch(() => ({ data: null })),
        BudgetService.getBudgetUtilization(companyId).catch(() => ({ data: [] })),
        ProjectService.getAllProjects(companyId).catch(() => ({ data: [] }))
      ]);
      
      console.log('Budget Dashboard API Response:', dashboardResponse);
      console.log('Budget Utilization Data:', utilizationResponse.data);
      console.log('Project Data:', projectResponse.data);
      
      setDashboardData(dashboardResponse.data);
      // Use utilization data for detailed budget information, fallback to topUtilizedProjects
      setBudgetData(utilizationResponse.data?.length > 0 ? utilizationResponse.data : (dashboardResponse.data?.topUtilizedProjects || []));
      setProjectData(projectResponse.data || []);
    } catch (err) {
      setError('Failed to load budget dashboard data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // formatCurrency is imported from localStorageUtil and uses company currency

  // Enhanced color palette for better visual appeal
  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

  // Get summary totals from dashboard API response
  const getSummaryTotals = () => {
    if (!dashboardData) return { 
      totalAllocated: 0, totalUtilized: 0, totalRemaining: 0, activeProjects: 0,
      averageBudgetSize: 0, totalBudgets: 0, capexTotal: 0, opexTotal: 0
    };
    
    const totalAllocated = dashboardData.totalAllocatedBudget || 0;
    const totalUtilized = dashboardData.totalUtilizedBudget || 0; // Now only orders
    const totalRemaining = dashboardData.totalAvailableBudget || 0;
    const totalPendingCarts = budgetData.reduce((sum, budget) => sum + (budget.cartAmount || 0), 0);
    const totalActualOrders = budgetData.reduce((sum, budget) => sum + (budget.orderAmount || 0), 0);
    const totalBudgets = dashboardData.totalBudgets || 0;
    const activeProjects = new Set(budgetData.map(b => b.projectId)).size;
    const averageBudgetSize = totalBudgets > 0 ? totalAllocated / totalBudgets : 0;
    
    // Calculate CAPEX vs OPEX breakdown from topUtilizedProjects
    const { capexTotal, opexTotal } = budgetData.reduce((acc, budget) => {
      const amount = budget.allocatedAmount || 0;
      if (budget.purchaseType && budget.purchaseType.toLowerCase() === 'capex') {
        acc.capexTotal += amount;
      } else if (budget.purchaseType && budget.purchaseType.toLowerCase() === 'opex') {
        acc.opexTotal += amount;
      }
      return acc;
    }, { capexTotal: 0, opexTotal: 0 });
    
    return { 
      totalAllocated, totalUtilized, totalRemaining, activeProjects,
      averageBudgetSize, totalBudgets, capexTotal, opexTotal,
      totalPendingCarts, totalActualOrders
    };
  };

  // Get individual budgets for selector (project + purchase type)
  const getBudgetOptions = () => {
    if (!budgetData.length) return [];
    
    return budgetData.map(budget => ({
      budgetId: budget.budgetId,
      projectId: budget.projectId,
      projectName: budget.projectName || `Project ${budget.projectId}`,
      purchaseType: budget.purchaseType,
      displayName: `${budget.projectName || `Project ${budget.projectId}`} (${budget.purchaseType.toUpperCase()})`,
      value: budget.budgetId.toString()
    })).sort((a, b) => a.displayName.localeCompare(b.displayName));
  };

  // Generate budget breakdown data based on selected budget
  const getProjectBreakdownData = () => {
    if (!budgetData.length) {
      return [{
        budgetName: 'No Data',
        allocatedAmount: 0,
        utilizedAmount: 0,
        availableAmount: 0
      }];
    }
    
    let filteredBudgets = budgetData;
    
    // Filter by selected budget if not 'all'
    if (selectedBudget !== 'all') {
      filteredBudgets = budgetData.filter(budget => 
        budget.budgetId.toString() === selectedBudget
      );
      
      if (!filteredBudgets.length) {
        return [{
          budgetName: 'No budget found',
          allocatedAmount: 0,
          utilizedAmount: 0,
          availableAmount: 0
        }];
      }
    }
    
    // Show each budget individually with project name and purchase type
    return filteredBudgets.map(budget => {
      const projectName = budget.projectName || `Project ${budget.projectId}`;
      const budgetName = `${projectName} (${budget.purchaseType.toUpperCase()})`;
      
      return {
        budgetName: budgetName.length > 30 ? `${budgetName.substring(0, 30)}...` : budgetName,
        fullBudgetName: budgetName,
        allocatedAmount: budget.allocatedAmount || 0,
        utilizedAmount: budget.utilizedAmount || 0, // Only orders now
        availableAmount: budget.availableAmount || 0,
        cartAmount: budget.cartAmount || 0, // Pending requisitions
        orderAmount: budget.orderAmount || 0, // Actual consumed budget
        utilizationPercentage: budget.utilizationPercentage || 0,
        status: budget.status,
        purchaseType: budget.purchaseType,
        projectName: budget.projectName,
        budgetId: budget.budgetId
      };
    });
  };


  // Generate CAPEX vs OPEX analysis with detailed breakdown
  const getCapexOpexData = () => {
    if (!budgetData.length) return [];
    
    const purchaseTypeData = budgetData.reduce((acc, budget) => {
      const type = (budget.purchaseType || 'Unknown').toUpperCase();
      const amount = budget.allocatedAmount || 0;
      
      if (!acc[type]) {
        acc[type] = { 
          name: type, 
          value: 0, 
          count: 0, 
          percentage: 0,
          avgBudgetSize: 0,
          projects: new Set(),
          totalBudgets: 0
        };
      }
      
      acc[type].value += amount;
      acc[type].count += 1;
      acc[type].totalBudgets += 1;
      acc[type].projects.add(budget.projectId);
      
      return acc;
    }, {});
    
    const total = Object.values(purchaseTypeData).reduce((sum, item) => sum + item.value, 0);
    
    return Object.values(purchaseTypeData)
      .map(item => ({
        ...item,
        percentage: total > 0 ? parseFloat(((item.value / total) * 100).toFixed(1)) : 0,
        avgBudgetSize: item.count > 0 ? item.value / item.count : 0,
        projectsCount: item.projects.size,
        projects: undefined // Remove Set for serialization
      }))
      .sort((a, b) => b.value - a.value); // Sort by value descending
  };

  // Generate time-based budget analysis
  const getTimeBasedData = () => {
    if (!budgetData.length) return [];
    
    // Group budgets by month/year from period start date
    const timeGroups = budgetData.reduce((acc, budget) => {
      const startDate = new Date(budget.periodStartDate);
      const monthYear = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthYear]) {
        acc[monthYear] = {
          period: monthYear,
          totalBudget: 0,
          budgetCount: 0,
          capexAmount: 0,
          opexAmount: 0,
          projects: new Set()
        };
      }
      
      acc[monthYear].totalBudget += budget.allocatedAmount || 0;
      acc[monthYear].budgetCount += 1;
      acc[monthYear].projects.add(budget.projectId);
      
      if (budget.purchaseType && budget.purchaseType.toLowerCase() === 'capex') {
        acc[monthYear].capexAmount += budget.allocatedAmount || 0;
      } else if (budget.purchaseType && budget.purchaseType.toLowerCase() === 'opex') {
        acc[monthYear].opexAmount += budget.allocatedAmount || 0;
      }
      
      return acc;
    }, {});
    
    return Object.values(timeGroups)
      .map(group => ({
        ...group,
        projectCount: group.projects.size,
        projects: undefined // Remove Set for JSON serialization
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  };

  // Generate budget status distribution from actual budget status data
  const getDetailedStatusDistribution = () => {
    if (!budgetData.length) {
      return [{ name: 'No Budgets', value: 1, details: 'No budget data available', totalAmount: 0, averageAmount: 0 }];
    }

    // Group budgets by their actual status and calculate totals
    const statusGroups = budgetData.reduce((acc, budget) => {
      const status = budget.status || 'UNKNOWN';
      const amount = budget.allocatedAmount || 0;
      
      if (!acc[status]) {
        acc[status] = {
          name: status === 'HEALTHY' ? 'Healthy Budgets' : 
                status === 'WARNING' ? 'Warning Budgets' :
                status === 'CRITICAL' ? 'Critical Budgets' :
                status === 'EXCEEDED' ? 'Exceeded Budgets' : 'Other Budgets',
          value: 0,
          totalAmount: 0,
          details: status === 'HEALTHY' ? 'Budgets operating within normal parameters' : 
                  status === 'WARNING' ? 'Budgets approaching limits' :
                  status === 'CRITICAL' ? 'Budgets near critical thresholds' :
                  status === 'EXCEEDED' ? 'Budgets that have exceeded limits' : 'Budgets with unknown status',
          color: status === 'HEALTHY' ? '#10b981' : 
                status === 'WARNING' ? '#f59e0b' :
                status === 'CRITICAL' ? '#ef4444' :
                status === 'EXCEEDED' ? '#dc2626' : '#6b7280',
          budgets: []
        };
      }
      
      acc[status].value += 1;
      acc[status].totalAmount += amount;
      acc[status].budgets.push({
        projectName: budget.projectName,
        allocatedAmount: amount,
        utilizedAmount: budget.utilizedAmount || 0,
        availableAmount: budget.availableAmount || 0,
        utilizationPercentage: budget.utilizationPercentage || 0,
        purchaseType: budget.purchaseType,
        daysRemaining: budget.daysRemaining || 0,
        cartAmount: budget.cartAmount || 0, // Pending requisitions
        orderAmount: budget.orderAmount || 0, // Actual consumed budget
        activeCartsCount: budget.activeCartsCount || 0,
        confirmedOrdersCount: budget.confirmedOrdersCount || 0
      });
      
      return acc;
    }, {});

    // Convert to array and calculate averages
    const statusData = Object.values(statusGroups).map(status => ({
      ...status,
      averageAmount: status.value > 0 ? status.totalAmount / status.value : 0
    }));

    return statusData.length > 0 ? statusData : [{ 
      name: 'No Budgets', 
      value: 1, 
      details: 'No budget data available', 
      totalAmount: 0,
      averageAmount: 0,
      color: '#6b7280'
    }];
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

  return (
    <div style={{ paddingTop: '24px' }}>
      <Row>
        <Col lg="12" sm="12">
          <ComponentCard
            title={
              <div className="d-flex justify-content-between align-items-center w-100">
                <div className="d-flex align-items-center gap-3">
                  <div className="icon-wrapper" style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#009efb',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid rgba(0, 158, 251, 0.1)'
                  }}>
                    <i className="fas fa-chart-bar text-white"></i>
                  </div>
                  <div>
                    <h4 className="mb-1">Budget Dashboard</h4>
                    <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                      Monitor budget performance and utilization across all projects
                    </p>
                  </div>
                </div>
              </div>
            }
          >

      <Row className="mb-4">
        <Col md="2">
          <Card className="shadow h-100 py-2" style={{ borderLeft: '4px solid #3b82f6' }}>
            <CardBody>
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-uppercase mb-1" style={{ color: '#3b82f6' }}>
                    Total Budget
                  </div>
                  <div className="h6 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(getSummaryTotals().totalAllocated)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-dollar-sign fa-2x text-gray-300"></i>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        
        <Col md="2">
          <Card className="shadow h-100 py-2" style={{ borderLeft: '4px solid #10b981' }}>
            <CardBody>
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-uppercase mb-1" style={{ color: '#10b981' }}>
                    Consumed (Orders)
                  </div>
                  <div className="h6 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(getSummaryTotals().totalUtilized)}
                  </div>
                  <div className="h6 mb-0 mr-3 font-weight-bold text-gray-800"  style={{ marginTop:'15px', color: '#06b6d4' }}>
                    Projected (Carts):
                  </div>
                   <div className="h6 mb-0 mr-3 font-weight-bold text-gray-800" style={{ marginTop:'4px' }}>
                    {formatCurrency(getSummaryTotals().totalPendingCarts)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-shopping-cart fa-2x text-gray-300"></i>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        
        <Col md="2">
          <Card className="shadow h-100 py-2" style={{ borderLeft: '4px solid #06b6d4' }}>
            <CardBody>
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-uppercase mb-1" style={{ color: '#06b6d4' }}>
                    Available
                  </div>
                  <div className="row no-gutters align-items-center">
                    <div className="col-auto">
                      <div className="h6 mb-0 mr-3 font-weight-bold text-gray-800">
                        {formatCurrency(getSummaryTotals().totalRemaining)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-clipboard-list fa-2x text-gray-300"></i>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        
        <Col md="2">
          <Card className="shadow h-100 py-2" style={{ borderLeft: '4px solid #f59e0b' }}>
            <CardBody>
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-uppercase mb-1" style={{ color: '#f59e0b' }}>
                    Projects
                  </div>
                  <div className="h6 mb-0 font-weight-bold text-gray-800">
                    {getSummaryTotals().activeProjects}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-project-diagram fa-2x text-gray-300"></i>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        
        <Col md="2">
          <Card className="shadow h-100 py-2" style={{ borderLeft: '4px solid #ef4444' }}>
            <CardBody>
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-uppercase mb-1" style={{ color: '#ef4444' }}>
                    Near Limit
                  </div>
                  <div className="h6 mb-0 font-weight-bold text-gray-800">
                    {dashboardData?.budgetsNearLimit?.length || 0}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-exclamation-triangle fa-2x text-gray-300"></i>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        
        <Col md="2">
          <Card className="shadow h-100 py-2" style={{ borderLeft: '4px solid #dc2626' }}>
            <CardBody>
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-uppercase mb-1" style={{ color: '#dc2626' }}>
                    Over Limit
                  </div>
                  <div className="h6 mb-0 font-weight-bold text-gray-800">
                    {dashboardData?.budgetsOverLimit?.length || 0}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-ban fa-2x text-gray-300"></i>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Budget Utilization by Project - Full Width Row */}
      <Row className="mb-4">
        <Col md="12">
          <Card className="shadow mb-4">
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <CardTitle tag="h6" className="mb-0 text-primary">
                  Budget Utilization by Project
                </CardTitle>
                <div className="d-flex align-items-center">
                  <span className="me-2 small text-muted">Filter by Budget:</span>
                  <select
                    className="form-select"
                    value={selectedBudget}
                    onChange={(e) => setSelectedBudget(e.target.value)}
                    style={{ width: '300px', fontSize: '12px' }}
                    aria-label="Filter by Budget"
                  >
                    <option value="all">All Budgets</option>
                    {getBudgetOptions().map(budget => (
                      <option key={budget.budgetId} value={budget.value}>
                        {budget.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={getProjectBreakdownData()}
                  margin={{ 
                    top: 20, 
                    right: 30, 
                    left: 20, 
                    bottom: getProjectBreakdownData().length === 1 ? 50 : 100 
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="budgetName" 
                    fontSize={11}
                    angle={getProjectBreakdownData().length === 1 ? 0 : -45}
                    textAnchor={getProjectBreakdownData().length === 1 ? "middle" : "end"}
                    height={getProjectBreakdownData().length === 1 ? 50 : 100}
                    interval={0}
                  />
                  <YAxis 
                    fontSize={12}
                    tickFormatter={(value) => `${getCurrencySymbol(getCompanyCurrency())}${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    formatter={(value, name) => [formatCurrency(value), name]} 
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0 && payload[0].payload.fullBudgetName) {
                        return payload[0].payload.fullBudgetName;
                      }
                      return label;
                    }}
                    labelStyle={{ color: '#000' }}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                  />
                  <Bar dataKey="allocatedAmount" fill="#3b82f6" name="Allocated" />
                  <Bar dataKey="utilizedAmount" fill="#10b981" name="Utilized" />
                  <Bar dataKey="availableAmount" fill="#6b7280" name="Available" />
                </BarChart>
              </ResponsiveContainer>
              
              {/* Budget Actions Table */}
              <div className="mt-4">
                <h6 className="text-primary mb-3">Budget Actions</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Project</th>
                        <th>Purchase Type</th>
                        <th>Allocated</th>
                        <th>Utilized</th>
                        <th>Available</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getProjectBreakdownData().map((budget) => (
                        <tr key={budget.budgetId}>
                          <td>
                            <small><strong>{budget.projectName}</strong></small>
                          </td>
                          <td>
                            <small>{budget.purchaseType?.toUpperCase()}</small>
                          </td>
                          <td>
                            <small>{formatCurrency(budget.allocatedAmount)}</small>
                          </td>
                          <td>
                            <small>{formatCurrency(budget.utilizedAmount)}</small>
                          </td>
                          <td>
                            <small>{formatCurrency(budget.availableAmount)}</small>
                          </td>
                          <td>
                            <button 
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => navigate(`/budget-utilization/${budget.budgetId}`)}
                              title="View detailed utilization"
                            >
                              <i className="fas fa-chart-line me-1"></i>
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Three Charts Row */}
      <Row>
        <Col md="4">
          <Card className="shadow mb-4" style={{ height: '400px' }}>
            <CardBody className="d-flex flex-column">
              <CardTitle tag="h6" className="mb-4 text-primary">
                CAPEX vs OPEX Distribution
              </CardTitle>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <Pie
                    data={getCapexOpexData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getCapexOpexData().map((entry, index) => (
                      <Cell key={`capex-opex-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => {
                      // eslint-disable-next-line react/prop-types
                      const count = props && props.payload && props.payload.count ? props.payload.count : 0;
                      return [formatCurrency(value), `${name} (${count} budgets)`];
                    }}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Legend Below Chart */}
              <div className="mt-3">
                <div className="d-flex flex-column gap-2">
                  {getCapexOpexData().map((entry, index) => (
                    <div key={`capex-legend-${entry.name}`} className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center">
                        <div 
                          className="me-2" 
                          style={{ 
                            width: '12px', 
                            height: '12px', 
                            backgroundColor: COLORS[index % COLORS.length],
                            borderRadius: '2px'
                          }}
                        ></div>
                        <small><strong>{entry.name} Budgets</strong></small>
                      </div>
                      <small className="text-muted">
                        {entry.count || 0} budget{(entry.count || 0) !== 1 ? 's' : ''}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        
        <Col md="4">
          <Card className="shadow mb-4" style={{ height: '400px' }}>
            <CardBody className="d-flex flex-column">
              <CardTitle tag="h6" className="mb-4 text-primary">
                Budget Status Distribution
              </CardTitle>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <Pie
                    data={getDetailedStatusDistribution()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getDetailedStatusDistribution().map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => {
                      // eslint-disable-next-line react/prop-types
                      if (props && props.payload) {
                        // eslint-disable-next-line react/prop-types
                        const { payload } = props;
                        return [
                          <div key="tooltip-content">
                            <div><strong>{value} budgets are {name}</strong></div>
                            {/* eslint-disable-next-line react/prop-types */}
                            <div>Total Allocated: {formatCurrency(payload.totalAmount || 0)}</div>
                            {/* eslint-disable-next-line react/prop-types */}
                            {payload.budgets && payload.budgets.length > 0 && (
                              <div className="mt-2">
                                <div><strong>Projects in this status:</strong></div>
                                {/* eslint-disable-next-line react/prop-types */}
                                {payload.budgets.map((budget) => (
                                  <div key={`${budget.projectName}-${budget.purchaseType}`} className="small">
                                    • <strong>{budget.projectName}</strong> ({budget.purchaseType?.toUpperCase()})
                                    <br />
                                    &nbsp;&nbsp;Utilization: {budget.utilizationPercentage.toFixed(1)}% 
                                    ({formatCurrency(budget.utilizedAmount)} / {formatCurrency(budget.allocatedAmount)})
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>,
                          ''
                        ];
                      }
                      return [`${value} budgets`, name];
                    }}
                    labelFormatter={(name) => {
                      return name;
                    }}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      padding: '12px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      maxWidth: '400px',
                      minWidth: '300px',
                      whiteSpace: 'normal',
                      wordWrap: 'break-word'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Legend Below Chart */}
              <div className="mt-3">
                <div className="d-flex flex-column gap-2">
                  {getDetailedStatusDistribution().map((entry, index) => (
                    <div key={`legend-${entry.name}`} className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center">
                        <div 
                          className="me-2" 
                          style={{ 
                            width: '12px', 
                            height: '12px', 
                            backgroundColor: entry.color || COLORS[index % COLORS.length],
                            borderRadius: '2px'
                          }}
                        ></div>
                        <small><strong>{entry.name}</strong></small>
                      </div>
                      <small className="text-muted">
                        {entry.value} budget{entry.value !== 1 ? 's' : ''}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        
        <Col md="4">
          <Card className="shadow mb-4" style={{ height: '400px' }}>
            <CardBody className="d-flex flex-column">
              <CardTitle tag="h6" className="mb-4 text-primary">
                Budget Allocation Timeline
              </CardTitle>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={getTimeBasedData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period" 
                    fontSize={10}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis 
                    fontSize={10}
                    tickFormatter={(value) => `${getCurrencySymbol(getCompanyCurrency())}${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    formatter={(value, name) => [formatCurrency(value), name]}
                    labelFormatter={(label) => `Period: ${label}`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="capexAmount" 
                    stackId="1"
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.6}
                    name="CAPEX"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="opexAmount" 
                    stackId="1"
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.6}
                    name="OPEX"
                  />
                </AreaChart>
              </ResponsiveContainer>
              
              {/* Legend Below Chart */}
              <div className="mt-3">
                <div className="d-flex flex-column gap-2">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div 
                        className="me-2" 
                        style={{ 
                          width: '12px', 
                          height: '12px', 
                          backgroundColor: '#3b82f6',
                          borderRadius: '2px'
                        }}
                      ></div>
                      <small><strong>CAPEX Allocation</strong></small>
                    </div>
                    <small className="text-muted">
                      {formatCurrency(getTimeBasedData().reduce((sum, period) => sum + (period.capexAmount || 0), 0))}
                    </small>
                  </div>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div 
                        className="me-2" 
                        style={{ 
                          width: '12px', 
                          height: '12px', 
                          backgroundColor: '#10b981',
                          borderRadius: '2px'
                        }}
                      ></div>
                      <small><strong>OPEX Allocation</strong></small>
                    </div>
                    <small className="text-muted">
                      {formatCurrency(getTimeBasedData().reduce((sum, period) => sum + (period.opexAmount || 0), 0))}
                    </small>
                  </div>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div 
                        className="me-2" 
                        style={{ 
                          width: '12px', 
                          height: '12px', 
                          backgroundColor: '#6b7280',
                          borderRadius: '2px'
                        }}
                      ></div>
                      <small><strong>Total Periods</strong></small>
                    </div>
                    <small className="text-muted">
                      {getTimeBasedData().length} period{getTimeBasedData().length !== 1 ? 's' : ''}
                    </small>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>


      <Row>
        <Col md="12">
          <Card className="shadow mb-4">
            <CardBody>
              <CardTitle tag="h6" className="mb-4 text-primary">
                Recent Activity
              </CardTitle>
              <BudgetActivityFeed 
                initialActivities={dashboardData?.recentActivity || []}
                onRefresh={(newActivities) => {
                  setDashboardData(prev => ({
                    ...prev,
                    recentActivity: newActivities
                  }));
                }}
              />
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md="12">
          <Card className="shadow mb-4">
            <CardBody>
              <CardTitle tag="h6" className="mb-4 text-primary d-flex justify-content-between align-items-center">
                Budget Alerts
                <button 
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/budget')}
                >
                  Manage Budgets
                </button>
              </CardTitle>
              
              {/* Budgets Over Limit Alert */}
              {dashboardData?.budgetsOverLimit && dashboardData.budgetsOverLimit.length > 0 && (
                <div>
                  <h6 className="mb-3" style={{ color: '#dc3545' }}>
                    <i className="fas fa-exclamation-triangle me-2" style={{ color: '#dc3545' }}></i>
                    Critical: Budgets Over Limit ({dashboardData.budgetsOverLimit.length})
                  </h6>
                  {dashboardData.budgetsOverLimit.map((budget, index) => (
                    <div key={`over-limit-${budget.budgetId || index}`} 
                         className="mb-3 p-3 rounded border-start" 
                         style={{ 
                           backgroundColor: '#fff5f5', 
                           borderLeftWidth: '4px', 
                           borderLeftColor: '#dc3545',
                           border: '1px solid #f5c6cb'
                         }}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-2">
                            <i className="fas fa-ban me-2" style={{ color: '#dc3545' }}></i>
                            <strong style={{ color: '#721c24', fontSize: '1.1rem' }}>
                              {budget.projectName || `Project ${budget.projectId}`}
                            </strong>
                            <Badge 
                              style={{ 
                                backgroundColor: '#dc3545', 
                                color: 'white',
                                marginLeft: '8px'
                              }} 
                              className="ms-2"
                            >
                              {budget.purchaseType?.toUpperCase()}
                            </Badge>
                            <Badge 
                              style={{ 
                                backgroundColor: '#721c24', 
                                color: 'white',
                                marginLeft: '4px'
                              }} 
                              className="ms-1"
                            >
                              {budget.utilizationPercentage?.toFixed(1)}% Utilized
                            </Badge>
                          </div>
                          <div className="row g-3">
                            <div className="col-md-4">
                              <div className="p-2 rounded" style={{ backgroundColor: '#e9ecef' }}>
                                <small className="text-muted d-block">Allocated Budget</small>
                                <strong style={{ color: '#495057', fontSize: '1rem' }}>
                                  {formatCurrency(budget.allocatedAmount || 0)}
                                </strong>
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="p-2 rounded" style={{ backgroundColor: '#f8d7da' }}>
                                <small className="text-muted d-block">Total Utilized</small>
                                <strong style={{ color: '#721c24', fontSize: '1rem' }}>
                                  {formatCurrency(budget.utilizedAmount || 0)}
                                </strong>
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="p-2 rounded" style={{ backgroundColor: '#f5c6cb' }}>
                                <small className="text-muted d-block">Over Budget By</small>
                                <strong style={{ color: '#721c24', fontSize: '1rem', fontWeight: 'bold' }}>
                                  {formatCurrency(Math.max(0, (budget.utilizedAmount || 0) - (budget.allocatedAmount || 0)))}
                                </strong>
                              </div>
                            </div>
                          </div>
                          {(budget.cartAmount > 0 || budget.orderAmount > 0) && (
                            <div className="mt-3 p-2 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                              <div className="d-flex justify-content-between small">
                                <span style={{ color: '#0dcaf0' }}>
                                  <i className="fas fa-clock me-1"></i>
                                  Pending: <strong>{formatCurrency(budget.cartAmount || 0)}</strong>
                                </span>
                                <span style={{ color: '#198754' }}>
                                  <i className="fas fa-check-circle me-1"></i>
                                  Consumed: <strong>{formatCurrency(budget.orderAmount || budget.utilizedAmount || 0)}</strong>
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        <button 
                          type="button"
                          className="btn btn-sm ms-3"
                          style={{
                            backgroundColor: '#dc3545',
                            borderColor: '#dc3545',
                            color: 'white'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#bb2d3b';
                            e.target.style.borderColor = '#b02a37';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = '#dc3545';
                            e.target.style.borderColor = '#dc3545';
                          }}
                          onFocus={(e) => {
                            e.target.style.backgroundColor = '#bb2d3b';
                            e.target.style.borderColor = '#b02a37';
                          }}
                          onBlur={(e) => {
                            e.target.style.backgroundColor = '#dc3545';
                            e.target.style.borderColor = '#dc3545';
                          }}
                          onClick={() => navigate(`/budget-utilization/${budget.budgetId}`)}
                        >
                          <i className="fas fa-exclamation-triangle me-1"></i>
                          Urgent Review
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 p-3 rounded d-flex align-items-center" 
                       style={{ 
                         backgroundColor: '#fff3cd', 
                         border: '1px solid #ffecb5',
                         borderLeftWidth: '4px',
                         borderLeftColor: '#ffc107'
                       }}>
                    <i className="fas fa-exclamation-triangle me-2" style={{ color: '#856404' }}></i>
                    <small style={{ color: '#856404' }}>
                      <strong>Action Required:</strong> These budgets have exceeded their allocated limits. 
                      Immediate review and corrective action is needed to prevent further overruns.
                    </small>
                  </div>
                </div>
              )}
              
              {/* Budgets Near Limit Alerts */}
              {dashboardData?.budgetsNearLimit && dashboardData.budgetsNearLimit.length > 0 && (
                <div>
                  <h6 className="text-warning mb-3">
                    <i className="fas fa-exclamation-circle me-1"></i>
                    Budgets Near Limit ({dashboardData.budgetsNearLimit.length})
                  </h6>
                  {dashboardData.budgetsNearLimit.map((budget, index) => (
                    <div key={`near-limit-${budget.budgetId || index}`} className="alert alert-warning">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <strong>{budget.projectName}</strong> ({budget.purchaseType?.toUpperCase()})
                          <div className="small text-muted">
                            <strong>Utilization:</strong> {budget.utilizationPercentage?.toFixed(1)}% 
                            ({formatCurrency(budget.utilizedAmount)} of {formatCurrency(budget.allocatedAmount)})
                          </div>
                          <div className="small text-muted">
                            <strong>Available:</strong> {formatCurrency(budget.availableAmount)} • 
                            <strong>Days Remaining:</strong> {budget.daysRemaining}
                          </div>
                          <div className="small text-muted">
                            <strong>Activity:</strong> {budget.activeCartsCount || 0} active carts 
                            ({formatCurrency(budget.cartAmount || 0)}) • 
                            {budget.confirmedOrdersCount || 0} orders 
                            ({formatCurrency(budget.orderAmount || 0)})
                          </div>
                          <div className="small text-muted">
                            <strong>Last Updated:</strong> {new Date(budget.lastUpdated).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-end">
                          <span className={`badge ${
                            budget.status === 'CRITICAL' ? 'bg-danger' : 
                            budget.status === 'WARNING' ? 'bg-warning' : 'bg-info'
                          }`}>
                            {budget.status}
                          </span>
                          <div className="mt-2">
                            <button 
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => navigate(`/budget-utilization/${budget.budgetId}`)}
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Show message if no alerts */}
              {(!dashboardData?.budgetsOverLimit?.present && 
                (!dashboardData?.budgetsNearLimit || dashboardData.budgetsNearLimit.length === 0)) && (
                <div className="text-success d-flex align-items-center">
                  <i className="fas fa-check-circle me-2"></i>
                  All budgets are operating within normal parameters.
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Comprehensive Budget Insights Panel */}
      <Row className="mb-4">
        <Col md="12">
          <Card className="shadow mb-4">
            <CardBody>
              <CardTitle tag="h6" className="mb-4 text-primary d-flex align-items-center">
                <i className="fas fa-chart-line me-2"></i>
                Budget Intelligence & Insights
              </CardTitle>
              
              {budgetData.length > 0 ? (
                <Row>
                  <Col md="4">
                    <div className="border-end pe-3">
                      <h6 className="text-muted mb-3">📊 Financial Overview</h6>
                      <div className="mb-2">
                        <strong>Portfolio Composition:</strong>
                        <div className="ms-3 small">
                          <div>• CAPEX: {formatCurrency(getSummaryTotals().capexTotal)} ({getSummaryTotals().totalAllocated > 0 ? ((getSummaryTotals().capexTotal / getSummaryTotals().totalAllocated) * 100).toFixed(1) : 0}%)</div>
                          <div>• OPEX: {formatCurrency(getSummaryTotals().opexTotal)} ({getSummaryTotals().totalAllocated > 0 ? ((getSummaryTotals().opexTotal / getSummaryTotals().totalAllocated) * 100).toFixed(1) : 0}%)</div>
                        </div>
                      </div>
                      
                      <div className="mb-2">
                        <strong>Budget Statistics:</strong>
                        <div className="ms-3 small">
                          <div>• Average Budget Size: {formatCurrency(getSummaryTotals().averageBudgetSize)}</div>
                          <div>• Total Budget Count: {getSummaryTotals().totalBudgets}</div>
                          <div>• Active Projects: {getSummaryTotals().activeProjects}</div>
                        </div>
                      </div>

                      <div className="mb-2">
                        <strong>Budget Distribution:</strong>
                        <div className="ms-3 small">
                          {getDetailedStatusDistribution().map(status => (
                            <div key={status.name}>
                              • {status.name}: {status.value} budgets ({formatCurrency(status.totalAmount)})
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Col>
                  
                  <Col md="4">
                    <div className="border-end pe-3">
                      <h6 className="text-muted mb-3">📈 Trends & Analysis</h6>
                      
                      <div className="mb-2">
                        <strong>Timeline Analysis:</strong>
                        <div className="ms-3 small">
                          {getTimeBasedData().slice(0, 3).map(period => (
                            <div key={period.period}>
                              • {period.period}: {formatCurrency(period.totalBudget)} ({period.budgetCount} budgets, {period.projectCount} projects)
                            </div>
                          ))}
                          {getTimeBasedData().length > 3 && <div>• ... and {getTimeBasedData().length - 3} more periods</div>}
                        </div>
                      </div>

                      <div className="mb-2">
                        <strong>CAPEX vs OPEX Trends:</strong>
                        <div className="ms-3 small">
                          {getCapexOpexData().map(type => (
                            <div key={type.name}>
                              • {type.name}: {type.count} budgets, {type.percentage}% of total value
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mb-2">
                        <strong>Project Distribution:</strong>
                        <div className="ms-3 small">
                          {(() => {
                            const projectTotals = budgetData.reduce((acc, budget) => {
                              const projectName = budget.projectName || `Project ${budget.projectId}`;
                              if (!acc[projectName]) {
                                acc[projectName] = 0;
                              }
                              acc[projectName] += budget.allocatedAmount || 0;
                              return acc;
                            }, {});
                            
                            return Object.entries(projectTotals)
                              .sort(([,a], [,b]) => b - a)
                              .slice(0, 4)
                              .map(([projectName, totalAmount]) => (
                                <div key={projectName}>
                                  • {projectName}: {formatCurrency(totalAmount)}
                                </div>
                              ));
                          })()}
                        </div>
                      </div>
                    </div>
                  </Col>
                  
                  <Col md="4">
                    <div>
                      <h6 className="text-muted mb-3">🎯 Key Insights</h6>
                      
                      <div className="mb-2">
                        <strong>Recommendations:</strong>
                        <div className="ms-3 small">
                          {getSummaryTotals().capexTotal > getSummaryTotals().opexTotal ? (
                            <div>• ⚠️ CAPEX-heavy portfolio - consider operational efficiency</div>
                          ) : (
                            <div>• ✅ Balanced CAPEX/OPEX distribution</div>
                          )}
                          
                          {(() => {
                            const expiredBudgets = getDetailedStatusDistribution().find(s => s.name === 'Expired Budgets');
                            return expiredBudgets && expiredBudgets.value > 0 && (
                              <div>• 🔄 {expiredBudgets.value} expired budgets need renewal</div>
                            );
                          })()}
                          
                          {getSummaryTotals().averageBudgetSize > 50000 ? (
                            <div>• 💰 High-value budget portfolio (avg: {formatCurrency(getSummaryTotals().averageBudgetSize)})</div>
                          ) : (
                            <div>• 📊 Standard budget sizing detected</div>
                          )}
                          
                          {getProjectBreakdownData().length > getSummaryTotals().activeProjects && (
                            <div>• 🔗 Multiple budgets per project - good planning</div>
                          )}
                        </div>
                      </div>

                      <div className="mb-2">
                        <strong>Data Quality:</strong>
                        <div className="ms-3 small">
                          <div>• Budget Records: {budgetData.length}</div>
                          <div>• Project Mapping: {projectData.length} projects linked</div>
                          <div>• Time Periods: {getTimeBasedData().length} periods covered</div>
                        </div>
                      </div>

                      <div className="mb-2">
                        <strong>Portfolio Health:</strong>
                        <div className="ms-3 small">
                          {(() => {
                            const statusCounts = budgetData.reduce((acc, budget) => {
                              const status = budget.status || 'UNKNOWN';
                              acc[status] = (acc[status] || 0) + 1;
                              return acc;
                            }, {});
                            
                            return (
                              <>
                                <div style={{ color: '#10b981' }}>
                                  • ✅ Healthy: {statusCounts.HEALTHY || 0} budgets
                                </div>
                                <div style={{ color: '#f59e0b' }}>
                                  • ⚠️ Warning: {statusCounts.WARNING || 0} budgets
                                </div>
                                <div style={{ color: '#ef4444' }}>
                                  • 🚨 Critical: {statusCounts.CRITICAL || 0} budgets
                                </div>
                                <div style={{ color: '#dc2626' }}>
                                  • 🔴 Exceeded: {statusCounts.EXCEEDED || 0} budgets
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-chart-line fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">No Budget Data Available</h5>
                  <p className="text-muted">Create your first budget to see comprehensive insights and analytics here.</p>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

          </ComponentCard>
        </Col>
      </Row>
    </div>
  );
};

export default BudgetDashboard;