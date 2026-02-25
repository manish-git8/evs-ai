import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Row,
  Col,
  Badge,
  Alert,
  Input,
} from 'reactstrap';
import { toast } from 'react-toastify';
import BudgetService from '../../services/BudgetService';
import { getEntityId } from '../../pages/localStorageUtil';

const BudgetModal = ({ isOpen, toggle, editingBudget = null, onBudgetSaved, projects = [] }) => {
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedProjectDetails, setSelectedProjectDetails] = useState(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [purchaseType, setPurchaseType] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({
    project: '',
    fromDate: '',
    toDate: '',
    purchaseType: '',
    amount: '',
    description: '',
  });

  const companyId = getEntityId();
  const isEditing = !!editingBudget;

  const resetForm = () => {
    setSelectedProject('');
    setSelectedProjectDetails(null);
    setDateRange({ from: '', to: '' });
    setPurchaseType('');
    setAmount('');
    setDescription('');
    setAiRecommendations(null);
    setFormErrors({
      project: '',
      fromDate: '',
      toDate: '',
      purchaseType: '',
      amount: '',
      description: '',
    });
  };

  // Reset form when modal opens/closes or editing budget changes
  useEffect(() => {
    if (isOpen) {
      if (editingBudget) {
        // Populate form with editing data
        setSelectedProject(editingBudget.projectId.toString());

        // Format dates for input fields
        let startDate;
        let endDate;

        if (editingBudget.rawFromDate && editingBudget.rawToDate) {
          [startDate] = new Date(editingBudget.rawFromDate).toISOString().split('T');
          [endDate] = new Date(editingBudget.rawToDate).toISOString().split('T');
        } else {
          try {
            [startDate] = new Date(editingBudget.fromDate).toISOString().split('T');
            [endDate] = new Date(editingBudget.toDate).toISOString().split('T');
          } catch (parseError) {
            console.error('Error parsing dates:', parseError);
            toast.error('Error loading budget dates.');
            startDate = '';
            endDate = '';
          }
        }

        setDateRange({ from: startDate, to: endDate });
        // Normalize purchase type to lowercase for dropdown
        setPurchaseType(editingBudget.purchaseType?.toLowerCase() || '');
        setAmount(editingBudget.amount.toString());
        setDescription(editingBudget.description || '');

        // Find and set project details
        const projectDetails = projects.find(
          (p) => p.projectId.toString() === editingBudget.projectId.toString(),
        );
        setSelectedProjectDetails(projectDetails || null);
      } else {
        // Reset for new budget
        resetForm();
      }
    } else {
      resetForm();
    }
  }, [isOpen, editingBudget, projects]);

  const handleProjectChange = (e) => {
    const projectId = e.target.value;
    setSelectedProject(projectId);

    const projectDetails = projects.find((p) => p.projectId.toString() === projectId);
    setSelectedProjectDetails(projectDetails || null);

    setFormErrors((prev) => ({ ...prev, project: '' }));
  };

  const validateForm = () => {
    const errors = {
      project: !selectedProject ? 'Please select a project' : '',
      fromDate: !dateRange.from ? 'Please select start date' : '',
      toDate: !dateRange.to ? 'Please select end date' : '',
      purchaseType: !purchaseType ? 'Please select purchase type' : '',
      amount: !amount || parseFloat(amount) <= 0 ? 'Please enter a valid amount' : '',
      description: '',
    };

    // Date validation
    if (dateRange.from && dateRange.to && new Date(dateRange.from) >= new Date(dateRange.to)) {
      errors.toDate = 'End date must be after start date';
    }

    setFormErrors(errors);
    return !Object.values(errors).some((error) => error);
  };

  const handleAIRecommendation = async () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }

    try {
      setLoadingAI(true);
      const response = await BudgetService.handleAiRecommendation(companyId, selectedProject);
      const recommendations = response.data;

      setAiRecommendations(recommendations);

      if (recommendations && recommendations.recommendedAmount) {
        setAmount(recommendations.recommendedAmount.toString());
        toast.success('AI recommendations applied!');
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

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const payload = {
      projectId: selectedProjectDetails.projectId,
      companyId: parseInt(companyId, 10),
      budgetAmount: parseFloat(amount),
      purchaseType: purchaseType.toUpperCase(),
      description,
      periodStartDate: new Date(dateRange.from).toISOString(),
      periodEndDate: new Date(dateRange.to).toISOString(),
    };

    try {
      setLoading(true);

      if (isEditing) {
        await BudgetService.handleUpdateBudgetById(companyId, editingBudget.id, payload);
        toast.success('Budget updated successfully');
      } else {
        await BudgetService.handleCreateBudget(companyId, payload);
        toast.success('Budget created successfully');
      }

      onBudgetSaved();
      toggle();
    } catch (error) {
      const errorMessage =
        (error.response && error.response.data && error.response.data.errorMessage) ||
        (error.response && error.response.errorMessage) ||
        error.errorMessage ||
        `Failed to ${isEditing ? 'update' : 'create'} budget`;
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const RequiredAsterisk = () => <span style={{ color: 'red' }}>*</span>;

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>
        <div className="d-flex align-items-center gap-2">
          <i className={`bi ${isEditing ? 'bi-pencil-square' : 'bi-plus-circle'} text-primary`}></i>
          {isEditing ? 'Edit Budget' : 'Create New Budget'}
          {isEditing && (
            <Badge color="warning" className="ms-2">
              Editing
            </Badge>
          )}
        </div>
      </ModalHeader>

      <ModalBody className="p-4">
        {/* AI Recommendations Display */}
        {aiRecommendations && (
          <Alert
            color="info"
            className="mb-4"
            style={{
              background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)',
              border: '1px solid #009efb',
              borderRadius: '10px',
            }}
          >
            <h6 className="text-primary mb-2">
              <i className="bi bi-robot me-2"></i>
              AI Budget Recommendations
            </h6>
            <Row>
              {aiRecommendations.recommendedAmount && (
                <Col md="4">
                  <small className="text-muted d-block">Recommended Amount</small>
                  <strong className="text-primary">
                    ${parseFloat(aiRecommendations.recommendedAmount).toLocaleString()}
                  </strong>
                </Col>
              )}
              {aiRecommendations.confidenceScore && (
                <Col md="4">
                  <small className="text-muted d-block">Confidence</small>
                  <strong className="text-success">
                    {(aiRecommendations.confidenceScore * 100).toFixed(1)}%
                  </strong>
                </Col>
              )}
              {aiRecommendations.forecastPeriod && (
                <Col md="4">
                  <small className="text-muted d-block">Forecast Period</small>
                  <strong>{aiRecommendations.forecastPeriod}</strong>
                </Col>
              )}
            </Row>
            {aiRecommendations.reasoning && (
              <div className="mt-2">
                <small className="text-muted d-block">AI Analysis</small>
                <small>{aiRecommendations.reasoning}</small>
              </div>
            )}
          </Alert>
        )}

        <Row>
          {/* Project Selection */}
          <Col md="6" className="mb-3">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="projectSelect" className="form-label fw-bold">
              Project <RequiredAsterisk />
            </label>
            <Input
              id="projectSelect"
              type="select"
              value={selectedProject}
              onChange={handleProjectChange}
              className={formErrors.project ? 'is-invalid' : ''}
              disabled={isEditing} // Don't allow project change when editing
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.projectId} value={project.projectId}>
                  {project.name}
                </option>
              ))}
            </Input>
            {formErrors.project && <div className="invalid-feedback">{formErrors.project}</div>}
          </Col>

          {/* Purchase Type */}
          <Col md="6" className="mb-3">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="purchaseTypeSelect" className="form-label fw-bold">
              Purchase Type <RequiredAsterisk />
            </label>
            <Input
              id="purchaseTypeSelect"
              type="select"
              value={purchaseType}
              onChange={(e) => {
                setPurchaseType(e.target.value);
                setFormErrors((prev) => ({ ...prev, purchaseType: '' }));
              }}
              className={formErrors.purchaseType ? 'is-invalid' : ''}
            >
              <option value="">Select purchase type</option>
              <option value="opex">OPEX</option>
              <option value="capex">CAPEX</option>
            </Input>
            {formErrors.purchaseType && (
              <div className="invalid-feedback">{formErrors.purchaseType}</div>
            )}
          </Col>

          {/* Date Range */}
          <Col md="6" className="mb-3">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="startDate" className="form-label fw-bold">
              Start Date <RequiredAsterisk />
            </label>
            <Input
              id="startDate"
              type="date"
              value={dateRange.from}
              max={dateRange.to || undefined}
              onChange={(e) => {
                setDateRange((prev) => ({ ...prev, from: e.target.value }));
                setFormErrors((prev) => ({ ...prev, fromDate: '', toDate: '' }));
              }}
              className={formErrors.fromDate ? 'is-invalid' : ''}
            />
            {formErrors.fromDate && <div className="invalid-feedback">{formErrors.fromDate}</div>}
          </Col>

          <Col md="6" className="mb-3">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="endDate" className="form-label fw-bold">
              End Date <RequiredAsterisk />
            </label>
            <Input
              id="endDate"
              type="date"
              value={dateRange.to}
              min={dateRange.from || undefined}
              onChange={(e) => {
                setDateRange((prev) => ({ ...prev, to: e.target.value }));
                setFormErrors((prev) => ({ ...prev, toDate: '' }));
              }}
              className={formErrors.toDate ? 'is-invalid' : ''}
            />
            {formErrors.toDate && <div className="invalid-feedback">{formErrors.toDate}</div>}
          </Col>

          {/* Budget Amount */}
          <Col md="8" className="mb-3">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="budgetAmount" className="form-label fw-bold">
              Budget Amount <RequiredAsterisk />
            </label>
            <Input
              id="budgetAmount"
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter budget amount"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setFormErrors((prev) => ({ ...prev, amount: '' }));
              }}
              className={formErrors.amount ? 'is-invalid' : ''}
            />
            {formErrors.amount && <div className="invalid-feedback">{formErrors.amount}</div>}
          </Col>

          {/* AI Forecast Button */}
          <Col md="4" className="mb-3">
            <div style={{ marginTop: '2rem' }}>
              <Button
                color="outline-primary"
                onClick={handleAIRecommendation}
                disabled={!selectedProject || loadingAI}
                className="w-100"
                style={{ fontSize: '14px' }}
              >
                {loadingAI && (
                  <div className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                )}
                <i className="bi bi-robot me-1"></i>
                {loadingAI ? 'Getting Forecast...' : 'AI Forecast'}
              </Button>
            </div>
          </Col>

          {/* Description */}
          <Col md="12" className="mb-3">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="description" className="form-label fw-bold">
              Description
            </label>
            <Input
              id="description"
              type="textarea"
              rows="3"
              placeholder="Enter budget description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Col>
        </Row>
      </ModalBody>

      <ModalFooter>
        <Button color="secondary" onClick={toggle} disabled={loading}>
          Cancel
        </Button>
        <Button color="primary" onClick={handleSubmit} disabled={loading}>
          {loading && (
            <div className="spinner-border spinner-border-sm me-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          )}
          {isEditing ? 'Update Budget' : 'Create Budget'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

BudgetModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  editingBudget: PropTypes.object,
  onBudgetSaved: PropTypes.func.isRequired,
  projects: PropTypes.array,
};

BudgetModal.defaultProps = {
  editingBudget: null,
  projects: [],
};

export default BudgetModal;
