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
import { Edit, Trash } from 'react-feather';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import ComponentCard from '../../components/ComponentCard';
import BudgetModal from '../../components/BudgetModal/BudgetModal';
import './Budget.scss';
import ProjectService from '../../services/ProjectService';
import { getEntityId } from '../localStorageUtil';
import BudgetService from '../../services/BudgetService';

const Budget = () => {

  const [projects, setProjects] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [editingBudget, setEditingBudget] = useState(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const companyId = getEntityId();

  const handleCreateBudget = () => {
    setEditingBudget(null);
    setShowBudgetModal(true);
  };

  const handleBudgetSaved = () => {
    fetchAllBudgets();
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
      }
    };

    fetchData();
  }, [companyId]);

  const fetchAllBudgets = async () => {
    try {
      const [budgetsResponse, utilizationResponse] = await Promise.all([
        BudgetService.handleGetAllBudgets(companyId),
        BudgetService.getBudgetUtilization(companyId)
      ]);
      
      const budgetsData = (budgetsResponse && budgetsResponse.data) || [];
      const utilizationData = (utilizationResponse && utilizationResponse.data) || [];

      const projectMap = projects.reduce((map, project) => {
        map[project.projectId] = project.name;
        return map;
      }, {});
      
      // Create utilization lookup
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
      

      const formatted = budgetsData.map((budget) => {
        const utilizationKey = `${budget.projectId}-${budget.purchaseType?.toLowerCase()}`;
        const utilization = utilizationMap[utilizationKey] || {};
        
        return {
          id: budget.budgetId,
          projectId: budget.projectId,
          projectName: (projectMap && projectMap[budget.projectId]) || 'Unknown Project',
          fromDate: new Date(budget.periodStartDate).toLocaleDateString(),
          toDate: new Date(budget.periodEndDate).toLocaleDateString(),
          // Keep raw dates for editing
          rawFromDate: budget.periodStartDate,
          rawToDate: budget.periodEndDate,
          purchaseType: budget.purchaseType,
          amount: budget.budgetAmount,
          budgetId: budget.budgetId,
          description: budget.description,
          utilization,
          status: utilization.status || 'UNKNOWN'
        };
      });

      setAllocations(formatted);
    } catch (error) {
      const errorMessage =
(error.response && error.response.data && error.response.data.errorMessage) ||
        (error.response && error.response.errorMessage) ||
        'Failed to load required data';
      toast.dismiss();
      toast.error(errorMessage);
    }
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

  const handleBudgetSaved = () => {
    fetchAllBudgets();
  };

  const handleDelete = async (budgetId) => {
    try {
      const confirmDelete = await Swal.fire({
        title: 'Are you sure?',
        text: 'This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
      });

      if (confirmDelete.isConfirmed) {
        await BudgetService.handleDeleteBudgetById(companyId, budgetId);
        Swal.fire('Deleted!', 'Budget item has been deleted.', 'success');
        fetchAllBudgets();
      }
    } catch (error) {
      console.error('Error deleting budget item:', error);
      Swal.fire('Error!', 'There was an issue deleting the item.', 'error');
    }
  };

  const formatCurrency = (budgetAmount) => {
    return `$${parseFloat(budgetAmount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };
  
  const getUtilizationData = (budget) => {
    const utilization = budget.utilization || {};
    
    // Convert to numbers and ensure they're valid
    const totalBudget = Number(budget.amount) || 0;
    
    // Get utilized amount (actual consumed budget from orders)
    const utilized = Number(utilization.orderAmount || utilization.utilizedAmount || 0);
    
    // Get pending amount (reserved in carts but not yet converted to orders)
    const pending = Number(utilization.cartAmount || 0);
    
    // Available amount is what's left after utilized + pending
    // Use API provided availableAmount if available, otherwise calculate
    let available;
    if (utilization.availableAmount !== undefined && utilization.availableAmount !== null) {
      available = Number(utilization.availableAmount);
    } else {
      available = Math.max(0, totalBudget - utilized - pending);
    }
    
    // Debug logging
    console.log('Budget utilization data:', {
      projectName: budget.projectName,
      totalBudget,
      utilized: `${utilized} (orders)`,
      pending: `${pending} (carts)`, 
      available,
      calculation: `${totalBudget} - ${utilized} - ${pending} = ${available}`,
      rawUtilization: utilization
    });
    
    // If no budget amount, show empty state
    if (totalBudget === 0) {
      return { pieData: [], pending, utilized, available: totalBudget };
    }
    
    // For pie chart: show only Utilized vs Available (NOT including reserved carts)
    const pieData = [
      { name: 'Available', value: Math.max(0, available), color: '#28a745' },
      { name: 'Utilized', value: Math.max(0, utilized), color: '#007bff' }
    ].filter(item => item.value > 0);
    
    // If all values are 0, show full budget as available
    if (pieData.length === 0 || pieData.every(item => item.value === 0)) {
      return { 
        pieData: [{ name: 'Available', value: totalBudget, color: '#28a745' }], 
        pending, 
        utilized, 
        available: totalBudget 
      };
    }
    
    return { pieData, pending, utilized, available };
  };
  
  const getBudgetStatus = (budget) => {
    const utilization = budget.utilization || {};
    const utilizationPercentage = utilization.utilizationPercentage || 0;
    
    if (utilizationPercentage >= 95) return { color: 'danger', text: 'Critical' };
    if (utilizationPercentage >= 80) return { color: 'warning', text: 'Warning' };
    if (utilizationPercentage >= 60) return { color: 'info', text: 'Moderate' };
    return { color: 'success', text: 'Healthy' };
  };

  const renderBudgetCard = (budget, utilizationData, status) => {
    const { pieData, pending, utilized, available } = utilizationData;
    
    return (
      <Card 
        className="shadow-sm border-0" 
        style={{ 
          transition: 'all 0.2s ease-in-out',
          cursor: 'pointer',
          borderLeft: `4px solid ${status.color === 'danger' ? '#dc3545' : status.color === 'warning' ? '#ffc107' : status.color === 'info' ? '#17a2b8' : '#28a745'}`
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
        }}
      >
        <CardBody className="p-3">
          {/* Compact Header Section */}
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="d-flex align-items-center gap-2">
              <Badge 
                color={budget.purchaseType?.toLowerCase() === 'capex' ? 'info' : 'secondary'} 
                className="px-2 py-1" 
                style={{ fontSize: '10px' }}
              >
                {budget.purchaseType?.toUpperCase() || 'OPEX'}
              </Badge>
              <Badge color={status.color} className="px-2 py-1" style={{ fontSize: '10px' }}>
                {status.text}
              </Badge>
            </div>
            <div className="text-end">
              <div className="fw-bold h6 mb-0 text-dark">{formatCurrency(budget.amount)}</div>
              <small className="text-muted">Total Budget</small>
            </div>
          </div>

          {/* Main Content - Budget Details and Chart Side by Side */}
          <div className="d-flex align-items-center gap-3">
            {/* Budget Breakdown (Compact) */}
            <div className="flex-grow-1">
              <div className="d-flex flex-column gap-1">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <div className="bg-success rounded-circle" style={{ width: '8px', height: '8px' }}></div>
                    <small className="text-muted" style={{ fontSize: '11px' }}>Available</small>
                  </div>
                  <small className="fw-bold text-success" style={{ fontSize: '12px' }}>
                    {formatCurrency(available)}
                  </small>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <div className="bg-primary rounded-circle" style={{ width: '8px', height: '8px' }}></div>
                    <small className="text-muted" style={{ fontSize: '11px' }}>Utilized</small>
                  </div>
                  <small className="fw-bold text-primary" style={{ fontSize: '12px' }}>
                    {formatCurrency(utilized)}
                  </small>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <i className="fas fa-hourglass-half text-info" style={{ fontSize: '8px' }}></i>
                    <small className="text-muted" style={{ fontSize: '11px' }}>Pending</small>
                  </div>
                  <small className="fw-bold text-info" style={{ fontSize: '12px' }}>
                    {formatCurrency(pending)}
                  </small>
                </div>
              </div>
            </div>
            
            {/* Compact Pie Chart */}
            <div style={{ width: '60px', height: '60px', flexShrink: 0 }}>
              {pieData && pieData.length > 0 && pieData.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={15}
                      outerRadius={25}
                      paddingAngle={pieData.length > 1 ? 1 : 0}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100">
                  <div className="rounded-circle d-flex align-items-center justify-content-center"
                       style={{ 
                         width: '50px', 
                         height: '50px', 
                         backgroundColor: '#f8f9fa',
                         border: '2px dashed #dee2e6'
                       }}>
                    <i className="fas fa-chart-pie text-muted" style={{ fontSize: '16px' }}></i>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Compact Footer Section */}
          <div className="d-flex align-items-center justify-content-between mt-3 pt-2 border-top">
            <div className="d-flex align-items-center gap-3">
              <small className="text-primary fw-bold" style={{ fontSize: '10px' }}>
                <i className="fas fa-calendar-alt me-1 text-primary"></i>
                {budget.fromDate} - {budget.toDate}
              </small>
              {budget.description && (
                <small className="text-muted" style={{ fontSize: '10px' }} title={budget.description}>
                  <i className="fas fa-info-circle me-1"></i>
                  {budget.description.length > 15 ? `${budget.description.substring(0, 15)}...` : budget.description}
                </small>
              )}
            </div>
            
            {/* Compact Action Buttons */}
            <div className="d-flex gap-1">
              <Button
                size="sm"
                color="primary"
                outline
                className="p-1"
                onClick={() => handleEditClick(budget)}
                title="Edit Budget"
                style={{ fontSize: '10px' }}
              >
                <Edit size={12} />
              </Button>
              <Button
                size="sm"
                color="danger"
                outline
                className="p-1"
                onClick={() => handleDelete(budget.budgetId)}
                title="Delete Budget"
                style={{ fontSize: '10px' }}
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
    if (allocations.length === 0) {
      return (
        <div className="text-center py-5">
          <i className="fas fa-chart-pie fa-3x text-muted mb-3"></i>
          <h5 className="text-muted">No budget allocations found</h5>
          <p className="text-muted">Create your first budget allocation using the form above.</p>
        </div>
      );
    }
    
    // Group budgets by project and then by purchase type
    const groupedBudgets = allocations.reduce((acc, budget) => {
      const projectKey = `${budget.projectId}-${budget.projectName}`;
      if (!acc[projectKey]) {
        acc[projectKey] = {
          projectId: budget.projectId,
          projectName: budget.projectName,
          budgets: { CAPEX: [], OPEX: [] }
        };
      }
      const budgetPurchaseType = budget.purchaseType?.toUpperCase() || 'OPEX';
      acc[projectKey].budgets[budgetPurchaseType].push(budget);
      return acc;
    }, {});
    
    return (
      <div>
        {Object.values(groupedBudgets).map((projectGroup) => (
          <div key={`${projectGroup.projectId}-${projectGroup.projectName}`} className="mb-4">
            {/* Project Header */}
            <div className="mb-3">
              <div className="d-flex align-items-center gap-2 p-3 rounded-top" 
                   style={{ backgroundColor: '#f8f9fa', borderLeft: '4px solid #009efb' }}>
                <i className="fas fa-folder-open text-primary" style={{ fontSize: '16px' }}></i>
                <h6 className="mb-0 text-primary fw-bold">{projectGroup.projectName}</h6>
                <small className="text-muted">
                  ({(projectGroup.budgets.CAPEX.length + projectGroup.budgets.OPEX.length)} budget{(projectGroup.budgets.CAPEX.length + projectGroup.budgets.OPEX.length) !== 1 ? 's' : ''})
                </small>
              </div>
            </div>
            
            {/* Budget Grid - 3 Columns */}
            <div className="row g-2">
              {/* CAPEX Cards */}
              {projectGroup.budgets.CAPEX.map((budget) => {
                const utilizationData = getUtilizationData(budget);
                const status = getBudgetStatus(budget);
                
                return (
                  <div key={budget.id} className="col-md-4 mb-2">
                    {renderBudgetCard(budget, utilizationData, status)}
                  </div>
                );
              })}
              
              {/* OPEX Cards */}
              {projectGroup.budgets.OPEX.map((budget) => {
                const utilizationData = getUtilizationData(budget);
                const status = getBudgetStatus(budget);
                
                return (
                  <div key={budget.id} className="col-md-4 mb-2">
                    {renderBudgetCard(budget, utilizationData, status)}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleAIRecommendationClick = async () => {
    if (!selectedProject) {
      toast.dismiss();
      toast.error('Please select a project first');
      return;
    }

    try {
      setLoadingAI(true);
      toast.info('Getting AI budget recommendations...');
      
      const response = await BudgetService.handleAiRecommendation(companyId, selectedProject);
      const recommendations = response.data;
      
      setAiRecommendations(recommendations);
      
      // Apply recommendations to form if available
      if (recommendations && recommendations.recommendedAmount) {
        setAmount(recommendations.recommendedAmount.toString());
        toast.success('AI recommendations applied! Review and save the budget.');
      } else {
        toast.success('AI recommendations received. Check the insights below.');
      }
      
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
      toast.error('Failed to get AI recommendations. Please try again.');
    } finally {
      setLoadingAI(false);
    }
  };

  const RequiredAsterisk = () => <span style={{ color: 'red' }}>*</span>;

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
                    <div className="d-flex align-items-center gap-2">
                      <h4 className="mb-1">
                        {isEditing ? 'Edit Budget' : 'Budget Management'}
                      </h4>
                      {isEditing && (
                        <Badge color="warning" className="px-2 py-1">
                          <i className="bi bi-pencil-square me-1"></i>
                          Editing
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                      {isEditing 
                        ? `Updating budget for ${editingBudget?.projectName || 'selected project'}`
                        : 'Track and manage project budgets with real-time utilization data'
                      }
                    </p>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="ai-forecast-btn d-flex align-items-center gap-2 cursor-pointer btn"
                    onClick={handleAIRecommendationClick}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '6px',
                      border: '1px solid #009efb',
                      color: '#009efb',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#009efb';
                      e.target.style.color = 'white';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = '#f8f9fa';
                      e.target.style.color = '#009efb';
                    }}
                    onFocus={(e) => {
                      e.target.style.backgroundColor = '#009efb';
                      e.target.style.color = 'white';
                    }}
                    onBlur={(e) => {
                      e.target.style.backgroundColor = '#f8f9fa';
                      e.target.style.color = '#009efb';
                    }}
                  >
                    <i className="fas fa-robot" style={{ fontSize: '14px' }}></i>
                    {loadingAI && (
                      <div className="spinner-border spinner-border-sm me-2" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    )}
                    <span>{loadingAI ? 'Getting Forecast...' : 'AI Forecast'}</span>
                  </div>
                </div>
              </div>
            }
          >

            {/* AI Recommendations Display */}
            {aiRecommendations && (
              <div className="row mb-4">
                <div className="col-md-12">
                  <div className="alert alert-info" style={{ 
                    background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)',
                    border: '1px solid #009efb',
                    borderRadius: '10px'
                  }}>
                    <h6 className="text-primary mb-2">
                      <i className="bi bi-robot me-2"></i>
                      AI Budget Recommendations
                    </h6>
                    <div className="row">
                      {aiRecommendations.recommendedAmount && (
                        <div className="col-md-4">
                          <small className="text-muted d-block">Recommended Amount</small>
                          <strong className="text-primary">
                            ${parseFloat(aiRecommendations.recommendedAmount).toLocaleString()}
                          </strong>
                        </div>
                      )}
                      {aiRecommendations.confidenceScore && (
                        <div className="col-md-4">
                          <small className="text-muted d-block">Confidence</small>
                          <strong className="text-success">
                            {(aiRecommendations.confidenceScore * 100).toFixed(1)}%
                          </strong>
                        </div>
                      )}
                      {aiRecommendations.forecastPeriod && (
                        <div className="col-md-4">
                          <small className="text-muted d-block">Forecast Period</small>
                          <strong>{aiRecommendations.forecastPeriod}</strong>
                        </div>
                      )}
                    </div>
                    {aiRecommendations.reasoning && (
                      <div className="mt-2">
                        <small className="text-muted d-block">AI Analysis</small>
                        <small>{aiRecommendations.reasoning}</small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Budget Form */}
            <div className="row">
              <div className="col-md-12 mb-4">
                <div className="row">
                  <div className="col-md-3">
                    {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                    <label htmlFor="projectSelect" className="form-label fw-bold">
                      Project <RequiredAsterisk />
                    </label>
                    <select
                      id="projectSelect"
                      className={`form-control form-select ${
                        formErrors.project ? 'is-invalid' : ''
                      }`}
                      value={selectedProject}
                      onChange={handleProjectChange}
                      required
                    >
                      <option value="">Select Project</option>
                      {projects.map((project) => (
                        <option key={project.projectId} value={project.projectId}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.project && (
                      <div className="invalid-feedback">{formErrors.project}</div>
                    )}
                  </div>

                  {/* Date Range Fields */}
                  <div className="col-md-3">
                    {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                    <label htmlFor="fromDate" className="form-label fw-bold">
                      From <RequiredAsterisk />
                    </label>
                    <input
                      type="date"
                      id="fromDate"
                      name="from"
                      className={`form-control ${formErrors.fromDate ? 'is-invalid' : ''}`}
                      value={dateRange.from}
                      onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                      required
                    />
                    {formErrors.fromDate && (
                      <div className="invalid-feedback">{formErrors.fromDate}</div>
                    )}
                  </div>

                  <div className="col-md-3">
                    {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                    <label htmlFor="toDate" className="form-label fw-bold">
                      To <RequiredAsterisk />
                    </label>
                    <input
                      type="date"
                      id="toDate"
                      name="to"
                      className={`form-control ${formErrors.toDate ? 'is-invalid' : ''}`}
                      value={dateRange.to}
                      onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                      required
                    />
                    {formErrors.toDate && (
                      <div className="invalid-feedback">{formErrors.toDate}</div>
                    )}
                  </div>

                  {/* Purchase Type Field */}
                  <div className="col-md-3">
                    {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                    <label htmlFor="purchaseType" className="form-label fw-bold">
                      Purchase Type <RequiredAsterisk />
                    </label>
                    <select
                      id="purchaseType"
                      className={`form-control form-select ${
                        formErrors.purchaseType ? 'is-invalid' : ''
                      }`}
                      value={purchaseType}
                      onChange={(e) => setPurchaseType(e.target.value)}
                      required
                    >
                      <option value="">Select Type</option>
                      <option value="capex">CAPEX</option>
                      <option value="opex">OPEX</option>
                    </select>
                    {formErrors.purchaseType && (
                      <div className="invalid-feedback">{formErrors.purchaseType}</div>
                    )}
                  </div>

                  {/* Amount Field */}
                  <div className="col-md-3">
                    {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                    <label htmlFor="amount" className="form-label fw-bold">
                      Amount <RequiredAsterisk />
                    </label>
                    <input
                      type="number"
                      id="amount"
                      className={`form-control ${formErrors.amount ? 'is-invalid' : ''}`}
                      value={amount}
                      onChange={({ target: { value } }) => {
                        const regex = /^\d{0,10}(\.\d{0,2})?$/;
                        if (value === '' || regex.test(value)) {
                          setAmount(value);
                        }
                      }}
                      min="0"
                      step="0.01"
                      placeholder="Enter budget amount"
                      required
                    />
                    {formErrors.amount && (
                      <div className="invalid-feedback">{formErrors.amount}</div>
                    )}
                  </div>

                  {/* Description Field */}
                  <div className="col-md-12 mt-3">
                    {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                    <label htmlFor="description" className="form-label fw-bold">
                      Description
                    </label>
                    <textarea
                      id="description"
                      className="form-control"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Budget description..."
                      maxLength={255}
                      rows={3}
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="col-md-12 mt-3">
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      onClick={handleSubmit}
                    >
                      {isEditing ? 'Update Budget' : 'Create Budget'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary ms-2"
                      onClick={resetFormFields}
                    >
                      {isEditing ? 'Cancel Edit' : 'Reset'}
                    </button>
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
