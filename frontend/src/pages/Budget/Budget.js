import { useState, useEffect } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import {
  Row,
  Col,
  Button,
  Card,
  CardBody,
  Badge
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';
import { Edit, Trash, BarChart2 } from 'react-feather';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';
import ComponentCard from '../../components/ComponentCard';
import BudgetModal from '../../components/BudgetModal/BudgetModal';
import './Budget.scss';
import ProjectService from '../../services/ProjectService';
import { getEntityId } from '../localStorageUtil';
import BudgetService from '../../services/BudgetService';

const Budget = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [editingBudget, setEditingBudget] = useState(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const companyId = getEntityId();

  const handleCreateBudget = () => {
    setEditingBudget(null);
    setShowBudgetModal(true);
  };

  const fetchAllBudgets = async () => {
    try {
      setIsLoading(true);
      
      // Use the original budget API for listing all budgets
      const response = await BudgetService.handleGetAllBudgets(companyId);
      const budgetsData = (response && response.data) || [];

      // Get utilization data separately
      const utilizationResponse = await BudgetService.getBudgetUtilization(companyId);
      const utilizationData = (utilizationResponse && utilizationResponse.data) || [];

      // Create utilization lookup map
      const utilizationMap = {};
      if (Array.isArray(utilizationData)) {
        utilizationData.forEach(util => {
          const key = `${util.projectId}-${util.purchaseType?.toLowerCase()}`;
          utilizationMap[key] = util;
        });
      } else if (utilizationData.budgetUtilization) {
        utilizationData.budgetUtilization.forEach(util => {
          const key = `${util.projectId}-${util.purchaseType?.toLowerCase()}`;
          utilizationMap[key] = util;
        });
      }

      // Create project name lookup
      const projectMap = projects.reduce((map, project) => {
        map[project.projectId] = project.name;
        return map;
      }, {});

      const formatted = budgetsData.map((budget) => {
        const utilizationKey = `${budget.projectId}-${budget.purchaseType?.toLowerCase()}`;
        const utilization = utilizationMap[utilizationKey] || {};

        return {
          id: budget.budgetId,
          projectId: budget.projectId,
          projectName: projectMap[budget.projectId] || 'Unknown Project',
          fromDate: new Date(budget.periodStartDate).toLocaleDateString(),
          toDate: new Date(budget.periodEndDate).toLocaleDateString(),
          // Keep raw dates for editing
          rawFromDate: budget.periodStartDate,
          rawToDate: budget.periodEndDate,
          purchaseType: budget.purchaseType,
          amount: budget.budgetAmount || 0,
          budgetId: budget.budgetId,
          description: budget.description,
          // Use utilization data
          utilizedAmount: utilization.orderAmount || 0,
          availableAmount: (budget.budgetAmount || 0) - (utilization.orderAmount || 0) - (utilization.cartAmount || 0),
          cartAmount: utilization.cartAmount || 0,
          orderAmount: utilization.orderAmount || 0,
          utilizationPercentage: utilization.utilizationPercentage || 0,
          status: utilization.status || 'HEALTHY',
          daysRemaining: utilization.daysRemaining || 0,
          activeCartsCount: utilization.activeCartsCount || 0,
          confirmedOrdersCount: utilization.confirmedOrdersCount || 0
        };
      });

      setAllocations(formatted);
    } catch (error) {
      const errorMessage =
        (error.response && error.response.data && error.response.data.errorMessage) ||
        (error.response && error.response.errorMessage) ||
        error.errorMessage ||
        'Failed to load budgets';
      toast.dismiss();
      toast.error(errorMessage);
      setAllocations([]); // Clear allocations on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await ProjectService.getAllProjects(companyId);
        const responseData = (response && response.data) || [];
        setProjects(responseData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.dismiss();
        toast.error('Failed to load required data');
        setIsLoading(false); // Stop loading on error
      }
    };

    fetchData();
  }, [companyId]);

  const handleBudgetSaved = () => {
    fetchAllBudgets();
  };

  useEffect(() => {
    if (projects.length > 0) {
      fetchAllBudgets();
    }
  }, [companyId, projects]);

  const handleEditClick = (budget) => {
    setEditingBudget(budget);
    setShowBudgetModal(true);
  };

  const handleViewUtilization = (budgetId) => {
    navigate(`/budget-utilization/${budgetId}`);
  };

  const handleDelete = async (budgetId) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'You will not be able to recover this budget allocation!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
      });

      if (result.isConfirmed) {
        await BudgetService.handleDeleteBudgetById(companyId, budgetId);
        toast.dismiss();
        toast.success('Budget deleted successfully');
        fetchAllBudgets();
      }
    } catch (error) {
      const errorMessage =
        (error.response && error.response.data && error.response.data.errorMessage) ||
        (error.response && error.response.errorMessage) ||
        error.errorMessage ||
        'Failed to delete budget';
      toast.dismiss();
      toast.error(errorMessage);
    }
  };

  const handleProjectAIForecast = async (projectName, budgets) => {
    try {
      // Get the main project ID from the first budget
      const projectId = budgets.length > 0 ? budgets[0].projectId : null;
      
      if (!projectId) {
        toast.error('No project data available for AI forecast');
        return;
      }

      toast.info(`Generating AI forecast for ${projectName}...`);
      
      const response = await BudgetService.handleAiRecommendation(companyId, projectId);
      const forecast = response.data;
      
      // Format large numbers properly
      const formatLargeNumber = (number) => {
        if (!number) return '$0.00';
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(number);
      };

      // Create HTML content for better formatting
      const htmlContent = `
        <div class="ai-forecast-content" style="text-align: left;">
          <div class="budget-forecast mb-4">
            <div class="row mb-3">
              <div class="col-6">
                <div class="card border-primary" style="border-width: 2px;">
                  <div class="card-body text-center p-3">
                    <i class="bi bi-building" style="font-size: 24px; color: #007bff;"></i>
                    <h6 class="card-title mt-2 mb-1">CAPEX Forecast</h6>
                    <h4 class="text-primary mb-0">${formatLargeNumber(forecast.capexBudget)}</h4>
                  </div>
                </div>
              </div>
              <div class="col-6">
                <div class="card border-info" style="border-width: 2px;">
                  <div class="card-body text-center p-3">
                    <i class="bi bi-gear" style="font-size: 24px; color: #17a2b8;"></i>
                    <h6 class="card-title mt-2 mb-1">OPEX Forecast</h6>
                    <h4 class="text-info mb-0">${formatLargeNumber(forecast.opexBudget)}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          ${forecast.insights ? `
            <div class="insights-section">
              <h6 class="text-muted mb-3">
                <i class="bi bi-lightbulb me-2"></i>AI Insights & Analysis
              </h6>
              <div class="insights-text" style="
                background: #f8f9fa; 
                border-left: 4px solid #007bff; 
                padding: 15px; 
                border-radius: 0 5px 5px 0;
                font-size: 14px;
                line-height: 1.6;
                max-height: 300px;
                overflow-y: auto;
              ">
                ${forecast.insights.replace(/\n/g, '<br>')}
              </div>
            </div>
          ` : ''}
        </div>
      `;

      Swal.fire({
        title: `<i class="bi bi-robot me-2"></i>AI Budget Forecast - ${projectName}`,
        html: htmlContent,
        icon: null,
        width: '700px',
        showConfirmButton: true,
        confirmButtonText: '<i class="bi bi-check-circle me-2"></i>Close',
        confirmButtonColor: '#009efb',
        customClass: {
          popup: 'ai-forecast-modal',
          title: 'ai-forecast-title'
        }
      });
      
    } catch (error) {
      console.error('Error fetching project AI forecast:', error);
      toast.error('Failed to get AI forecast. Please try again.');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
      case 'over_budget':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const renderBudgetCard = (allocation) => {
    const totalBudget = allocation.amount || 0;
    const utilizedAmount = allocation.utilizedAmount || 0;
    const cartAmount = allocation.cartAmount || 0;
    const availableAmount = Math.max(0, totalBudget - utilizedAmount);
    
    // Define consistent colors for all charts and text
    const CHART_COLORS = {
      utilized: '#009efb',    // Project theme blue for used
      available: '#28a745',   // Green for available
      reserved: '#ff8c00'     // Orange for reserved
    };

    // Prepare data for pie chart - ONLY utilized vs available from budget (not including cart amount)
    const pieData = [
      {
        name: 'Utilized',
        value: utilizedAmount,
        color: CHART_COLORS.utilized
      },
      {
        name: 'Available', 
        value: availableAmount,
        color: CHART_COLORS.available
      }
    ].filter(item => item.value > 0);

    const utilizationPercentage = totalBudget > 0 ? ((utilizedAmount / totalBudget) * 100).toFixed(1) : 0;

    // Determine if budget is exceeded
    const isExceeded = allocation.status?.toLowerCase() === 'exceeded';
    const cardBgColor = isExceeded ? '#fff5f5' : '#ffffff';

    // Determine if budget is exceeded  
    const borderColor = isExceeded ? '#dc3545' : 
                       getStatusColor(allocation.status) === 'success' ? '#28a745' : 
                       getStatusColor(allocation.status) === 'warning' ? '#ffc107' : '#6c757d';

    return (
      <Card key={allocation.id} className="mb-2 shadow-sm" style={{ 
        borderRadius: '8px', 
        border: `3px solid ${borderColor}`,
        backgroundColor: cardBgColor,
        minHeight: '120px' 
      }}>
        <CardBody className="p-3">
          <Row className="align-items-center">
            {/* Left: Type and Status */}
            <Col xs="3" className="text-center">
              <div className="d-flex flex-column align-items-center">
                {/* Purchase Type Badge */}
                <Badge 
                  color={allocation.purchaseType?.toLowerCase() === 'capex' ? 'primary' : 'info'} 
                  className="mb-1" 
                  style={{ 
                    fontSize: '11px', 
                    padding: '4px 8px',
                    fontWeight: '700'
                  }}
                >
                  {allocation.purchaseType?.toUpperCase() || 'OPEX'}
                </Badge>
                {/* Status Badge */}
                <Badge 
                  color={getStatusColor(allocation.status)} 
                  className="mb-1" 
                  style={{ 
                    fontSize: '9px', 
                    padding: '3px 6px',
                    fontWeight: '600'
                  }}
                >
                  {allocation.status || 'Active'}
                </Badge>
                <small className="text-muted" style={{ fontSize: '10px', fontWeight: '500' }}>
                  {allocation.daysRemaining > 0 ? `${allocation.daysRemaining} days` : 'Expired'}
                </small>
              </div>
            </Col>

            {/* Middle: Amounts */}
            <Col xs="6">
              <div className="d-flex flex-column">
                {/* Total Budget */}
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <small className="text-dark" style={{ fontSize: '12px', fontWeight: '600' }}>Total</small>
                  <strong style={{ fontSize: '13px', fontWeight: '700' }}>{formatCurrency(totalBudget)}</strong>
                </div>
                
                {/* Utilized */}
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div className="d-flex align-items-center">
                    <span style={{ backgroundColor: CHART_COLORS.utilized, width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', marginRight: '6px' }}></span>
                    <small style={{ fontSize: '12px', color: CHART_COLORS.utilized, fontWeight: '600' }}>Used</small>
                  </div>
                  <strong style={{ fontSize: '12px', color: CHART_COLORS.utilized, fontWeight: '700' }}>{formatCurrency(utilizedAmount)}</strong>
                </div>
                
                {/* Available */}
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div className="d-flex align-items-center">
                    <span style={{ backgroundColor: CHART_COLORS.available, width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', marginRight: '6px' }}></span>
                    <small style={{ fontSize: '12px', color: CHART_COLORS.available, fontWeight: '600' }}>Available</small>
                  </div>
                  <strong style={{ 
                    fontSize: '12px', 
                    color: isExceeded ? '#dc3545' : CHART_COLORS.available, 
                    fontWeight: '700' 
                  }}>
                    {formatCurrency(availableAmount)}
                  </strong>
                </div>

                {/* Reserved (always show to maintain consistent height) */}
                <div className="d-flex justify-content-between align-items-center mb-1" style={{ minHeight: '20px' }}>
                  {cartAmount > 0 ? (
                    <>
                      <div className="d-flex align-items-center">
                        <i className="bi bi-cart3 me-1" style={{ fontSize: '10px', color: CHART_COLORS.reserved }}></i>
                        <small style={{ fontSize: '12px', color: CHART_COLORS.reserved, fontWeight: '600' }}>Projected (In Carts)</small>
                      </div>
                      <strong style={{ fontSize: '12px', color: CHART_COLORS.reserved, fontWeight: '700' }}>{formatCurrency(cartAmount)}</strong>
                    </>
                  ) : (
                    <>
                      <div className="d-flex align-items-center">
                        <i className="bi bi-cart3 me-1" style={{ fontSize: '10px', color: '#e9ecef' }}></i>
                        <small style={{ fontSize: '12px', color: '#e9ecef', fontWeight: '600' }}>Projected (In Carts)</small>
                      </div>
                      <strong style={{ fontSize: '12px', color: '#e9ecef', fontWeight: '700' }}>$0.00</strong>
                    </>
                  )}
                </div>
                
                {/* Progress Bar */}
                <div className="mt-2">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <small className="text-dark" style={{ fontSize: '10px', fontWeight: '600' }}>Utilization</small>
                    <small className="text-dark" style={{ fontSize: '10px', fontWeight: '600' }}>{utilizationPercentage}%</small>
                  </div>
                  <div className="progress" style={{ height: '4px', backgroundColor: '#e9ecef' }}>
                    <div 
                      className="progress-bar" 
                      style={{ 
                        backgroundColor: isExceeded ? '#dc3545' : CHART_COLORS.utilized,
                        width: `${Math.min(utilizationPercentage, 100)}%` 
                      }}
                    ></div>
                    {isExceeded && (
                      <div 
                        className="progress-bar" 
                        style={{ 
                          backgroundColor: '#ff6b6b',
                          width: `${Math.max(0, utilizationPercentage - 100)}%`,
                          opacity: 0.8
                        }}
                      ></div>
                    )}
                  </div>
                </div>
              </div>
            </Col>

            {/* Right: Pie Chart */}
            <Col xs="3" className="text-center">
              <div style={{ width: '80px', height: '80px', margin: '0 auto' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={16}
                      outerRadius={38}
                      dataKey="value"
                    >
                      {pieData.map((entry) => (
                        <Cell key={`cell-${allocation.id}-${entry.name}`} fill={
                          isExceeded && entry.name === 'Available' ? '#dc3545' : entry.color
                        } />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), '']} 
                      labelStyle={{ color: '#000' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Col>
          </Row>

          {/* Bottom: Actions and Date */}
          <div className="d-flex justify-content-between align-items-center mt-2">
            <small className="text-muted" style={{ fontSize: '10px', fontWeight: '500' }}>
              {allocation.fromDate} - {allocation.toDate}
            </small>
            <div className="d-flex gap-2">
              <Button
                color="outline-info"
                size="sm"
                onClick={() => handleViewUtilization(allocation.budgetId)}
                title="View Budget Utilization"
                style={{ fontSize: '10px', padding: '4px 8px' }}
              >
                <BarChart2 size={12} />
              </Button>
              <Button
                color="outline-primary"
                size="sm"
                onClick={() => handleEditClick(allocation)}
                title="Edit Budget"
                style={{ fontSize: '10px', padding: '4px 8px' }}
              >
                <Edit size={12} />
              </Button>
              <Button
                color="outline-danger"
                size="sm"
                onClick={() => handleDelete(allocation.id)}
                title="Delete Budget"
                style={{ fontSize: '10px', padding: '4px 8px' }}
              >
                <Trash size={12} />
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  };


  const renderBudgetCards = () => {
    // Show loading state
    if (isLoading) {
      return (
        <div className="text-center py-5">
          <div className="d-flex flex-column align-items-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5 className="text-muted mb-2">Loading Budget Allocations</h5>
            <p className="text-muted">Please wait while we fetch your budget data...</p>
          </div>
        </div>
      );
    }

    // Show empty state when not loading and no allocations
    if (allocations.length === 0) {
      return (
        <div className="text-center py-5">
          <div className="d-flex flex-column align-items-center">
            <i className="bi bi-folder-x" style={{ fontSize: '48px', color: '#6c757d', marginBottom: '1rem' }}></i>
            <h5 className="text-muted mb-2">No budget allocations found</h5>
            <p className="text-muted mb-3">Create your first budget allocation to get started</p>
            <Button color="primary" onClick={handleCreateBudget}>
              <i className="bi bi-plus-circle me-2"></i>
              Create Budget
            </Button>
          </div>
        </div>
      );
    }

    // Group by project and purchase type for 3-column layout
    const groupedAllocations = allocations.reduce((acc, allocation) => {
      const projectKey = allocation.projectName;
      if (!acc[projectKey]) {
        acc[projectKey] = { OPEX: [], CAPEX: [] };
      }
      const purchaseType = allocation.purchaseType?.toUpperCase() || 'OPEX';
      acc[projectKey][purchaseType].push(allocation);
      return acc;
    }, {});

    return Object.entries(groupedAllocations).map(([projectName, budgetTypes]) => {
      const allBudgets = [...budgetTypes.CAPEX, ...budgetTypes.OPEX];
      const totalAllocated = allBudgets.reduce((sum, b) => sum + (b.amount || 0), 0);
      const totalUtilized = allBudgets.reduce((sum, b) => sum + (b.utilizedAmount || 0), 0);
      const totalReserved = allBudgets.reduce((sum, b) => sum + (b.cartAmount || 0), 0);
      const overallUtilization = totalAllocated > 0 ? ((totalUtilized / totalAllocated) * 100).toFixed(1) : 0;

      return (
        <Card 
          key={projectName} 
          className="mb-4" 
          style={{ 
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15), 0 4px 10px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.08)';
          }}
        >
          <CardBody className="p-3">
            {/* Project Header */}
            <div className="mb-3">
              {/* Project Title and Summary Stats - Same Row */}
              <div 
                className="d-flex justify-content-between align-items-center mb-2 p-3 rounded"
                style={{
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.05) 100%)',
                  border: '1px solid rgba(102, 126, 234, 0.1)'
                }}
              >
                {/* Left: Project Title */}
                <div>
                  <h5 className="mb-1 text-primary" style={{ fontSize: '18px', fontWeight: '600' }}>
                    {projectName}
                  </h5>
                  <small className="text-muted">
                    Total Budget: <strong>{formatCurrency(totalAllocated)}</strong> | 
                    Utilization: <strong>{overallUtilization}%</strong> | 
                    Budgets: <strong>{allBudgets.length}</strong>
                  </small>
                </div>

                {/* Middle: Summary Stats */}
                <div className="d-flex align-items-center gap-4">
                  <div className="text-center">
                    <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '500' }}>Total Utilized</div>
                    <div style={{ fontSize: '14px', color: '#009efb', fontWeight: '700' }}>{formatCurrency(totalUtilized)}</div>
                  </div>
                  <div className="text-center">
                    <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '500' }}>Available</div>
                    <div style={{ fontSize: '14px', color: '#28a745', fontWeight: '700' }}>{formatCurrency(totalAllocated - totalUtilized)}</div>
                  </div>
                  <div className="text-center">
                    <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '500' }}>Projected (In Carts)</div>
                    <div style={{ fontSize: '14px', color: '#ff8c00', fontWeight: '700' }}>{formatCurrency(totalReserved)}</div>
                  </div>
                  <div className="text-center">
                    <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '500' }}>Active Carts</div>
                    <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '700' }}>{allBudgets.reduce((sum, b) => sum + (b.activeCartsCount || 0), 0)}</div>
                  </div>
                </div>

                {/* Right: AI Forecast Button and CAPEX/OPEX Badges */}
                <div className="d-flex flex-column align-items-end gap-2">
                  {/* AI Forecast Button */}
                  <Button
                    color="outline-info"
                    size="sm"
                    onClick={() => handleProjectAIForecast(projectName, allBudgets)}
                    style={{ fontSize: '10px', padding: '4px 8px' }}
                  >
                    <i className="bi bi-robot me-1"></i>
                    AI Forecast
                  </Button>
                  
                  {/* CAPEX/OPEX Badges */}
                  <div className="d-flex gap-2 align-items-center">
                    <Badge color="primary" style={{ fontSize: '10px' }}>
                      CAPEX: {budgetTypes.CAPEX.length}
                    </Badge>
                    <Badge color="info" style={{ fontSize: '10px' }}>
                      OPEX: {budgetTypes.OPEX.length}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Progress */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <small className="text-muted">Project Utilization</small>
                <small className="text-muted">{overallUtilization}%</small>
              </div>
              <div className="progress" style={{ height: '4px' }}>
                <div 
                  className="progress-bar bg-success" 
                  style={{ width: `${overallUtilization}%` }}
                ></div>
              </div>
            </div>

            {/* Budget Cards Grid - 2 Columns */}
            <Row className="g-2">
              {/* Render all CAPEX budgets */}
              {budgetTypes.CAPEX.map(allocation => (
                <Col md="6" key={`capex-${allocation.id}`}>
                  {renderBudgetCard(allocation)}
                </Col>
              ))}

              {/* Render all OPEX budgets */}
              {budgetTypes.OPEX.map(allocation => (
                <Col md="6" key={`opex-${allocation.id}`}>
                  {renderBudgetCard(allocation)}
                </Col>
              ))}
            </Row>

          </CardBody>
        </Card>
      );
    });
  };

  return (
    <div style={{ paddingTop: '24px' }}>
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover={false}
        style={{ top: '12px', right: '12px' }}
        toastStyle={{
          marginBottom: '0',
          position: 'absolute',
          top: 0,
          right: 0,
        }}
      />
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
                    <i className="fas fa-chart-pie text-white"></i>
                  </div>
                  <div>
                    <h4 className="mb-1">Budget Management</h4>
                    <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                      Track and manage project budgets with real-time utilization data
                    </p>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Button
                    color="primary"
                    onClick={handleCreateBudget}
                    className="d-flex align-items-center gap-2"
                  >
                    <i className="bi bi-plus-circle"></i>
                    Create Budget
                  </Button>
                </div>
              </div>
            }
          >

            {/* Budget Management Actions */}
            <div className="row mb-4">
              <div className="col-md-12">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-1 text-primary">Budget Overview</h5>
                    <small className="text-muted">
                      Total Budgets: {allocations.length} | 
                      Active Projects: {[...new Set(allocations.map(b => b.projectId))].length}
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Budget List Display */}
            <div className="row mt-4">
              <div className="col-md-12">
                <h5 className="mb-3">Budget Allocations</h5>
                {renderBudgetCards()}
              </div>
            </div>

          </ComponentCard>
        </Col>
      </Row>
      
      {/* Budget Modal for Create/Edit */}
      <BudgetModal
        isOpen={showBudgetModal}
        toggle={() => setShowBudgetModal(false)}
        editingBudget={editingBudget}
        onBudgetSaved={handleBudgetSaved}
        projects={projects}
      />
    </div>
  );
};

export default Budget;