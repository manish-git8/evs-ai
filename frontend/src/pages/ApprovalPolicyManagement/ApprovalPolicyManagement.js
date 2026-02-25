import React, { useEffect, useState } from 'react';
import { Row, Col, Label, Input, Button, Card, CardBody, FormGroup, Spinner } from 'reactstrap';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';
import ApprovalPolicyManagementService from '../../services/ApprovalPolicyManagementService';
import SupplierService from '../../services/SupplierService';
import DepartmentService from '../../services/DepartmentService';
import LocationService from '../../services/LocationService';
import UserService from '../../services/UserService';
import ProjectService from '../../services/ProjectService';
import { getEntityId } from '../localStorageUtil';
import { POLICY_CONDITION_TYPES } from '../../constant/ApprovalPolicyConstant';
import {
  FaArrowUp,
  FaArrowDown,
  FaTimes,
  FaPlus,
  FaSave,
  FaEdit,
  FaFilter,
  FaShieldAlt,
} from 'react-icons/fa';

const ApprovalPolicyManagement = () => {
  const navigate = useNavigate();
  const [policyData, setPolicyData] = useState(null);
  const [approvalType, setApprovalType] = useState('indent');
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editablePolicy, setEditablePolicy] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const companyId = getEntityId();
  const [saving, setSaving] = useState(false);

  const CONDITION_TYPES = Object.values(POLICY_CONDITION_TYPES);

  useEffect(() => {
    const fetchPolicyData = async () => {
      try {
        setLoading(true);
        const response = await ApprovalPolicyManagementService.getApprovalPolicyByCompanyId(
          companyId,
          approvalType,
        );
        const policy = response.data[0] || null;
        setPolicyData(policy);
        setEditablePolicy(policy);
      } catch (error) {
        console.error('Error fetching policy data:', error);
        setPolicyData(null);
        setEditablePolicy(null);
      } finally {
        setLoading(false);
      }
    };

    const fetchReferenceData = async () => {
      try {
        const [suppliersRes, departmentsRes, locationsRes, projectsRes, usersRes] =
          await Promise.all([
            SupplierService.getAllSuppliersPaginated(),
            DepartmentService.getAllDepartment(companyId),
            LocationService.getAllLocation(companyId),
            ProjectService.getAllProjects(companyId),
            UserService.fetchAllCompanyUsers(companyId, { pageSize: 100, pageNumber: 0 }),
          ]);

        setSuppliers(suppliersRes.data);
        setDepartments(departmentsRes.data);
        setLocations(locationsRes.data);
        setProjects(projectsRes.data);
        setUsers(usersRes.data?.content || usersRes.data);
      } catch (error) {
        console.error('Error fetching reference data:', error);
      }
    };

    fetchPolicyData();
    fetchReferenceData();
  }, [approvalType, companyId]);

  const validatePolicy = () => {
    const errors = {};
    let isValid = true;

    if (!editablePolicy) {
      return false;
    }

    editablePolicy.rules.forEach((rule, ruleIndex) => {
      const ruleErrors = [];
      if (!rule.name || rule.name.trim() === '') {
        ruleErrors.push('Rule name is required');
        isValid = false;
      }

      const nonCartConditions = rule.conditions.filter(
        (condition) => condition.conditionType !== POLICY_CONDITION_TYPES.CART_AMOUNT,
      );

      const conditionTypes = nonCartConditions.map((cond) => cond.conditionType);
      const uniqueTypes = [...new Set(conditionTypes)];

      if (uniqueTypes.length !== conditionTypes.length) {
        ruleErrors.push(
          'Only one condition of each type (supplier, department, location, project) is allowed per rule',
        );
        isValid = false;
      }

      rule.conditions.forEach((condition, conditionIndex) => {
        if (!condition.conditionType) {
          ruleErrors.push(`Condition ${conditionIndex + 1}: Type is required`);
          isValid = false;
        }

        if (!condition.comparisonOperator) {
          ruleErrors.push(`Condition ${conditionIndex + 1}: Operator is required`);
          isValid = false;
        }

        if (condition.conditionType === POLICY_CONDITION_TYPES.CART_AMOUNT) {
          if (!condition.comparisonValue || condition.comparisonValue === '') {
            ruleErrors.push(`Condition ${conditionIndex + 1}: Amount value is required`);
            isValid = false;
          }
          if (isNaN(condition.comparisonValue) || parseFloat(condition.comparisonValue) <= 0) {
            ruleErrors.push(`Condition ${conditionIndex + 1}: Amount must be a positive number`);
            isValid = false;
          }
        } else {
          if (!condition.entityTargetValue) {
            ruleErrors.push(
              `Condition ${conditionIndex + 1}: ${condition.conditionType} selection is required`,
            );
            isValid = false;
          }
        }
      });

      rule.approvers.forEach((approver, approverIndex) => {
        if (!approver.approvalUser.userId) {
          ruleErrors.push(`Approver ${approverIndex + 1}: User selection is required`);
          isValid = false;
        }
      });

      if (ruleErrors.length > 0) {
        errors[`rule-${ruleIndex}`] = ruleErrors;
      }
    });

    const defaultApproverErrors = [];
    editablePolicy.defaultApprovers.forEach((approver, index) => {
      if (!approver.approvalUser.userId) {
        defaultApproverErrors.push(`Default approver ${index + 1}: User selection is required`);
        isValid = false;
      }
    });

    if (defaultApproverErrors.length > 0) {
      errors['defaultApprovers'] = defaultApproverErrors;
    }

    editablePolicy.rules.forEach((rule, ruleIndex) => {
      if (rule.conditions.length === 0) {
        if (!errors[`rule-${ruleIndex}`]) {
          errors[`rule-${ruleIndex}`] = [];
        }
        errors[`rule-${ruleIndex}`].push('At least one condition is required');
        isValid = false;
      }
    });

    editablePolicy.rules.forEach((rule, ruleIndex) => {
      if (rule.approvers.length === 0) {
        if (!errors[`rule-${ruleIndex}`]) {
          errors[`rule-${ruleIndex}`] = [];
        }
        errors[`rule-${ruleIndex}`].push('At least one approver is required');
        isValid = false;
      }
    });

    if (editablePolicy.defaultApprovers.length === 0) {
      errors['defaultApprovers'] = errors['defaultApprovers'] || [];
      errors['defaultApprovers'].push('At least one default approver is required');
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleApprovalTypeChange = (e) => {
    setApprovalType(e.target.value);
  };

  const handleNavigate = () => {
    navigate(`/approval?type=${approvalType}`);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setValidationErrors({});
  };

  const handleSave = async () => {
    if (!validatePolicy()) {
      toast.error('Please fix all validation errors before saving');
      return;
    }

    try {
      setSaving(true);

      const policyId = editablePolicy.approvalPolicyId;

      const requestBody = {
        ...editablePolicy,
        rules: editablePolicy.rules.map((rule) => ({
          ...rule,
          id: undefined,
          conditions: rule.conditions.map((c) => ({ ...c, id: undefined })),
          approvers: rule.approvers.map((a) => ({ ...a, id: undefined })),
        })),
        defaultApprovers: editablePolicy.defaultApprovers.map((a) => ({
          ...a,
          id: undefined,
        })),
      };

      await ApprovalPolicyManagementService.handleUpdateApprovalPolicy(
        requestBody,
        companyId,
        policyId,
      );

      const refreshed = await ApprovalPolicyManagementService.getApprovalPolicyByCompanyId(
        companyId,
        approvalType,
      );
      
      const updatedPolicy = refreshed.data[0] || null;
      
      setPolicyData(updatedPolicy);
      setEditablePolicy(updatedPolicy);
      setIsEditing(false);
      
      setValidationErrors({});
      toast.success('Policy updated successfully!');
    } catch (error) {
      console.error('Error updating policy:', error);
      toast.error('Failed to update policy');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditablePolicy(policyData);
    setIsEditing(false);
    setValidationErrors({});
  };

  const handleRuleChange = (ruleIndex, field, value) => {
    const updatedRules = [...editablePolicy.rules];
    updatedRules[ruleIndex] = { ...updatedRules[ruleIndex], [field]: value };
    setEditablePolicy({ ...editablePolicy, rules: updatedRules });

    if (field === 'name') {
      const newErrors = { ...validationErrors };
      if (newErrors[`rule-${ruleIndex}`]) {
        newErrors[`rule-${ruleIndex}`] = newErrors[`rule-${ruleIndex}`].filter(
          (error) => !error.includes('Rule name'),
        );
        if (newErrors[`rule-${ruleIndex}`].length === 0) {
          delete newErrors[`rule-${ruleIndex}`];
        }
      }
      setValidationErrors(newErrors);
    }
  };
  const handleConditionChange = (ruleIndex, conditionIndex, field, value) => {
    const updatedRules = [...editablePolicy.rules];
    const updatedConditions = [...updatedRules[ruleIndex].conditions];

    if (field === 'conditionType' && value !== POLICY_CONDITION_TYPES.CART_AMOUNT) {
      const existingSameType = updatedConditions.some(
        (cond, idx) => idx !== conditionIndex && cond.conditionType === value,
      );

      if (existingSameType) {
        toast.error(`Only one ${value} condition is allowed per rule`);
        return;
      }
    }

    const updatedCondition = {
      ...updatedConditions[conditionIndex],
      [field]: value,
    };

    if (field === 'entityTargetValue') {
      updatedCondition.comparisonValue = value;
    }

    if (
      field === 'conditionType' &&
      value !== POLICY_CONDITION_TYPES.CART_AMOUNT &&
      updatedConditions[conditionIndex].comparisonOperator !== 'eq'
    ) {
      updatedCondition.comparisonOperator = 'eq';
    }

    updatedConditions[conditionIndex] = updatedCondition;
    const newErrors = { ...validationErrors };
    if (newErrors[`rule-${ruleIndex}`]) {
      newErrors[`rule-${ruleIndex}`] = newErrors[`rule-${ruleIndex}`].filter(
        (error) => !error.includes(`Condition ${conditionIndex + 1}`),
      );
      if (newErrors[`rule-${ruleIndex}`].length === 0) {
        delete newErrors[`rule-${ruleIndex}`];
      }
    }
    setValidationErrors(newErrors);

    updatedRules[ruleIndex].conditions = updatedConditions;
    setEditablePolicy({ ...editablePolicy, rules: updatedRules });
  };

  const handleApproverChange = (ruleIndex, approverIndex, field, value) => {
    const selectedUser = users.find((u) => u.userId === value.userId);
  
    const updatedRules = [...editablePolicy.rules];
    const updatedApprovers = [...updatedRules[ruleIndex].approvers];
  
    updatedApprovers[approverIndex] = {
      ...updatedApprovers[approverIndex],
      approvalUser: selectedUser
        ? {
            userId: selectedUser.userId,
            firstName: selectedUser.firstName,
            lastName: selectedUser.lastName,
            email: selectedUser.email,
            title: selectedUser.title || '',
          }
        : value,
    };
  
    updatedRules[ruleIndex].approvers = updatedApprovers;
    setEditablePolicy({ ...editablePolicy, rules: updatedRules });
  };
  

  const handleDefaultApproverChange = (approverIndex, field, value) => {
    const selectedUser = users.find((u) => u.userId === value.userId);
  
    const updatedDefaultApprovers = [...editablePolicy.defaultApprovers];
  
    updatedDefaultApprovers[approverIndex] = {
      ...updatedDefaultApprovers[approverIndex],
      approvalUser: selectedUser
        ? {
            userId: selectedUser.userId,
            firstName: selectedUser.firstName,
            lastName: selectedUser.lastName,
            email: selectedUser.email,
            title: selectedUser.title || '',
          }
        : value,
    };
  
    setEditablePolicy({
      ...editablePolicy,
      defaultApprovers: updatedDefaultApprovers,
    });
  };
  

  const moveApproverUp = (ruleIndex, approverIndex) => {
    if (approverIndex > 0) {
      const updatedRules = [...editablePolicy.rules];
      const approvers = [...updatedRules[ruleIndex].approvers];
      const temp = approvers[approverIndex];
      approvers[approverIndex] = approvers[approverIndex - 1];
      approvers[approverIndex - 1] = temp;

      updatedRules[ruleIndex].approvers = approvers.map((approver, index) => ({
        ...approver,
        orderOfApproval: index + 1,
      }));

      setEditablePolicy({ ...editablePolicy, rules: updatedRules });
    }
  };

  const handleSaveWithConfirmation = () => {
  Swal.fire({
    title: 'Save Changes?',
    text: 'Are you sure you want to save these approval policy changes?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, Save Changes',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#28a745',
    cancelButtonColor: '#6c757d',
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.close();
      setTimeout(() => {
        handleSave(); 
      }, 100);
    }
  });
};


  const moveApproverDown = (ruleIndex, approverIndex) => {
    const updatedRules = [...editablePolicy.rules];
    const approvers = [...updatedRules[ruleIndex].approvers];
    if (approverIndex < approvers.length - 1) {
      const temp = approvers[approverIndex];
      approvers[approverIndex] = approvers[approverIndex + 1];
      approvers[approverIndex + 1] = temp;

      updatedRules[ruleIndex].approvers = approvers.map((approver, index) => ({
        ...approver,
        orderOfApproval: index + 1,
      }));

      setEditablePolicy({ ...editablePolicy, rules: updatedRules });
    }
  };

  const moveDefaultApproverUp = (approverIndex) => {
    if (approverIndex > 0) {
      const updatedDefaultApprovers = [...editablePolicy.defaultApprovers];
      const temp = updatedDefaultApprovers[approverIndex];
      updatedDefaultApprovers[approverIndex] = updatedDefaultApprovers[approverIndex - 1];
      updatedDefaultApprovers[approverIndex - 1] = temp;

      const reorderedApprovers = updatedDefaultApprovers.map((approver, index) => ({
        ...approver,
        orderOfApproval: index + 1,
      }));

      setEditablePolicy({ ...editablePolicy, defaultApprovers: reorderedApprovers });
    }
  };

  const moveDefaultApproverDown = (approverIndex) => {
    const updatedDefaultApprovers = [...editablePolicy.defaultApprovers];
    if (approverIndex < updatedDefaultApprovers.length - 1) {
      const temp = updatedDefaultApprovers[approverIndex];
      updatedDefaultApprovers[approverIndex] = updatedDefaultApprovers[approverIndex + 1];
      updatedDefaultApprovers[approverIndex + 1] = temp;

      // Update order numbers
      const reorderedApprovers = updatedDefaultApprovers.map((approver, index) => ({
        ...approver,
        orderOfApproval: index + 1,
      }));

      setEditablePolicy({ ...editablePolicy, defaultApprovers: reorderedApprovers });
    }
  };

  const addApprover = (ruleIndex) => {
    const updatedRules = [...editablePolicy.rules];
    const newApprover = {
      id: Date.now(),
      approvalUser: { userId: '', firstName: '', lastName: '', email: '' },
      orderOfApproval: updatedRules[ruleIndex].approvers.length + 1,
    };
    updatedRules[ruleIndex].approvers.push(newApprover);
    setEditablePolicy({ ...editablePolicy, rules: updatedRules });
  };

  const removeApprover = (ruleIndex, approverIndex) => {
    const updatedRules = [...editablePolicy.rules];
    if (updatedRules[ruleIndex].approvers.length > 1) {
      updatedRules[ruleIndex].approvers.splice(approverIndex, 1);
      // Reorder remaining approvers
      updatedRules[ruleIndex].approvers = updatedRules[ruleIndex].approvers.map(
        (approver, index) => ({
          ...approver,
          orderOfApproval: index + 1,
        }),
      );
      setEditablePolicy({ ...editablePolicy, rules: updatedRules });
    }
  };

  const addDefaultApprover = () => {
    const newApprover = {
      id: Date.now(),
      approvalUser: { userId: '', firstName: '', lastName: '', email: '' },
      orderOfApproval: editablePolicy.defaultApprovers.length + 1,
    };
    setEditablePolicy({
      ...editablePolicy,
      defaultApprovers: [...editablePolicy.defaultApprovers, newApprover],
    });
  };

  const removeDefaultApprover = (approverIndex) => {
    if (editablePolicy.defaultApprovers.length > 1) {
      const updatedApprovers = editablePolicy.defaultApprovers.filter(
        (_, index) => index !== approverIndex,
      );
      // Reorder remaining approvers
      const reorderedApprovers = updatedApprovers.map((approver, index) => ({
        ...approver,
        orderOfApproval: index + 1,
      }));
      setEditablePolicy({ ...editablePolicy, defaultApprovers: reorderedApprovers });
    }
  };

  const addCondition = (ruleIndex) => {
    const updatedRules = [...editablePolicy.rules];
    const rule = updatedRules[ruleIndex];

    const usedTypes = rule.conditions.map((cond) => cond.conditionType);
    const availableTypes = CONDITION_TYPES.filter(
      (type) => type === POLICY_CONDITION_TYPES.CART_AMOUNT || !usedTypes.includes(type),
    );

    if (availableTypes.length === 0) {
      toast.error('All condition types have been used in this rule');
      return;
    }

    const newConditionType = availableTypes[0];

    const newCondition = {
      id: Date.now(),
      conditionType: newConditionType,
      comparisonOperator: newConditionType === POLICY_CONDITION_TYPES.CART_AMOUNT ? '' : 'eq',
      comparisonValue: '',
      entityTargetValue: '',
    };

    updatedRules[ruleIndex].conditions.push(newCondition);
    setEditablePolicy({ ...editablePolicy, rules: updatedRules });
  };

  const removeCondition = (ruleIndex, conditionIndex) => {
    const updatedRules = [...editablePolicy.rules];
    if (updatedRules[ruleIndex].conditions.length > 1) {
      updatedRules[ruleIndex].conditions.splice(conditionIndex, 1);
      setEditablePolicy({ ...editablePolicy, rules: updatedRules });
    }
  };

  const addRule = () => {
    const newRule = {
      id: Date.now(),
      name: '',
      orderOfEvaluation: editablePolicy.rules.length + 1,
      conditions: [
        {
          id: Date.now(),
          conditionType: POLICY_CONDITION_TYPES.CART_AMOUNT,
          comparisonOperator: '',
          comparisonValue: '',
          entityTargetValue: null,
        },
      ],
      approvers: [
        {
          id: Date.now(),
          approvalUser: { userId: '', firstName: '', lastName: '', email: '' },
          orderOfApproval: 1,
        },
      ],
    };
    setEditablePolicy({
      ...editablePolicy,
      rules: [...editablePolicy.rules, newRule],
    });
  };

  const removeRule = (ruleIndex) => {
    const updatedRules = [...editablePolicy.rules];
    if (updatedRules.length > 1) {
      updatedRules.splice(ruleIndex, 1);

      const reorderedRules = updatedRules.map((rule, index) => ({
        ...rule,
        orderOfEvaluation: index + 1,
      }));
      setEditablePolicy({ ...editablePolicy, rules: reorderedRules });
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find((s) => s.supplierId === supplierId);
    return supplier ? supplier.name : `Supplier ID: ${supplierId}`;
  };

  const getDepartmentName = (departmentId) => {
    const department = departments.find((d) => d.departmentId === departmentId);
    return department ? department.name : `Department ID: ${departmentId}`;
  };

  const getLocationName = (locationId) => {
    const location = locations.find((l) => l.locationId === locationId);
    return location ? location.name : `Location ID: ${locationId}`;
  };

  const getProjectName = (projectId) => {
    const project = projects.find((p) => p.projectId === projectId);
    return project ? project.name : `Project ID: ${projectId}`;
  };

  const getAvailableConditionTypes = (ruleIndex) => {
    const rule = editablePolicy.rules[ruleIndex];
    const usedTypes = rule.conditions.map((cond) => cond.conditionType);
    return CONDITION_TYPES.filter((type) => type === 'cart_amount' || !usedTypes.includes(type));
  };

  const displayRuleErrors = (ruleIndex) => {
    const errors = validationErrors[`rule-${ruleIndex}`];
    if (!errors || errors.length === 0) return null;

    return (
      <div className="alert alert-danger mt-2" style={{ fontSize: '12px' }}>
        <strong>Validation Errors:</strong>
        <ul className="mb-0" style={{ paddingLeft: '20px' }}>
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ paddingTop: '24px' }}>
        <ToastContainer />
        <Row className="justify-content-center">
          <Col md="12">
            <Card
              className="enhanced-card"
              style={{
                borderRadius: '15px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: 'none',
              }}
            >
              <CardBody className="text-center py-5">
                <div
                  className="icon-wrapper mx-auto mb-3"
                  style={{
                    width: '60px',
                    height: '60px',
                    background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                    borderRadius: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    className="spinner-border text-white"
                    role="status"
                    style={{ width: '24px', height: '24px' }}
                  >
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
                <h5 className="mb-2">Loading Policy Information</h5>
                <p className="text-muted mb-0">
                  Please wait while we fetch your approval policies...
                </p>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  if (!policyData) {
    return (
      <div style={{ paddingTop: '24px' }}>
        <ToastContainer />
        <Row className="justify-content-center">
          <Col md="8">
            <Card
              className="enhanced-card"
              style={{
                borderRadius: '15px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: 'none',
              }}
            >
              <CardBody className="text-center py-5">
                <div
                  className="icon-wrapper mx-auto mb-4"
                  style={{
                    width: '80px',
                    height: '80px',
                    background: 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i className="fas fa-clipboard-list text-white" style={{ fontSize: '32px' }}></i>
                </div>
                <h4 className="mb-3">No Approval Policy Found</h4>
                <p className="text-muted mb-4" style={{ maxWidth: '400px', margin: '0 auto' }}>
                  Get started by creating your first approval policy to streamline your approval
                  workflows and maintain proper governance.
                </p>
                <Button
                  onClick={handleNavigate}
                  className="px-4 py-2"
                  style={{
                    background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0px)';
                  }}
                  onFocus={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onBlur={(e) => {
                    e.target.style.transform = 'translateY(0px)';
                  }}
                >
                  <FaPlus className="me-2" />
                  Create Your First Policy
                </Button>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

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
        <Col md="12">
          <Card
            className="enhanced-card"
            style={{
              borderRadius: '15px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: 'none',
            }}
          >
            <CardBody style={{ padding: '24px 24px 0 24px' }}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="icon-wrapper"
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#009efb',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid rgba(0, 158, 251, 0.1)',
                    }}
                  >
                    <FaShieldAlt className="text-white" />
                  </div>
                  <div>
                    <h4 className="mb-1">Approval Policy Management</h4>
                    <p className="text-muted mb-0 small">
                      Configure and manage approval workflows and governance rules for your
                      organization
                    </p>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  {!isEditing ? (
                    <>
                      <Button
                        onClick={handleNavigate}
                        className="px-4 py-2"
                        style={{
                          background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                          transition: 'transform 0.2s ease',
                          color: 'white',
                        }}
                      >
                        <FaPlus className="me-2" />
                        Add New Policy
                      </Button>
                      <Button
                        onClick={handleEdit}
                        className="px-4 py-2"
                        color="warning"
                        style={{
                          border: 'none',
                          borderRadius: '8px',
                          transition: 'transform 0.2s ease',
                        }}
                      >
                        <FaEdit className="me-2" />
                        Edit Policy
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleCancel}
                        className="px-4 py-2"
                        color="secondary"
                        style={{
                          border: 'none',
                          borderRadius: '8px',
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveWithConfirmation}
                        className="px-4 py-2"
                        color="success"
                        disabled={saving}
                        style={{
                          border: 'none',
                          borderRadius: '8px',
                          opacity: saving ? 0.7 : 1,
                        }}
                      >
                        {saving ? (
                          <>
                            <Spinner size="sm" className="me-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <FaSave className="me-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardBody>
            <CardBody style={{ padding: '0 24px 24px 24px' }}>
              {/* Policy Type Selection */}
              <div className="mb-4">
                <h5 className="mb-3" style={{ fontWeight: '600', color: '#212529' }}>
                  Policy Configuration
                </h5>

                <Row className="align-items-center">
                  <Col md="6">
                    <div className="policy-type-selector">
                      <Label
                        className="mb-3"
                        style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}
                      >
                        Select Approval Type
                      </Label>
                      <div className="d-flex gap-4">
                        <div
                          className={`policy-option ${approvalType === 'indent' ? 'active' : ''}`}
                          style={{
                            padding: '12px 20px',
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: approvalType === 'indent' ? '#009efb' : '#dee2e6',
                            backgroundColor: approvalType === 'indent' ? '#e3f2fd' : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onClick={() => setApprovalType('indent')}
                        >
                          <div className="d-flex align-items-center">
                            <Input
                              type="radio"
                              id="indent"
                              name="approvalType"
                              value="indent"
                              checked={approvalType === 'indent'}
                              onChange={handleApprovalTypeChange}
                              className="form-check-input me-2"
                            />
                            <div>
                              <div style={{ fontWeight: '500', fontSize: '14px' }}>
                                Cart Requests
                              </div>
                              <small className="text-muted">Shopping cart approvals</small>
                            </div>
                          </div>
                        </div>
                        <div
                          className={`policy-option ${
                            approvalType === 'purchase_order' ? 'active' : ''
                          }`}
                          style={{
                            padding: '12px 20px',
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: approvalType === 'purchase_order' ? '#009efb' : '#dee2e6',
                            backgroundColor:
                              approvalType === 'purchase_order' ? '#e3f2fd' : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onClick={() => setApprovalType('purchase_order')}
                        >
                          <div className="d-flex align-items-center">
                            <Input
                              type="radio"
                              id="purchase_order"
                              name="approvalType"
                              value="purchase_order"
                              checked={approvalType === 'purchase_order'}
                              onChange={handleApprovalTypeChange}
                              className="form-check-input me-2"
                            />
                            <div>
                              <div style={{ fontWeight: '500', fontSize: '14px' }}>
                                Purchase Orders
                              </div>
                              <small className="text-muted">PO creation approvals</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Col>
                  <Col md="6">
                    <div
                      className="policy-metadata"
                      style={{
                        background: '#f8f9fa',
                        borderRadius: '6px',
                        padding: '16px',
                        border: '1px solid #dee2e6',
                      }}
                    >
                      <h6
                        className="mb-3"
                        style={{ fontSize: '14px', fontWeight: '600', color: '#212529' }}
                      >
                        Policy Information
                      </h6>
                      <div style={{ fontSize: '13px' }}>
                        {editablePolicy?.createdDate && (
                          <div className="mb-2">
                            <span className="text-muted">Created:</span>{' '}
                            <strong>
                              {new Date(editablePolicy.createdDate).toLocaleDateString()}
                            </strong>
                            {editablePolicy?.createdBy && (
                              <div className="text-muted small">
                                by {editablePolicy.createdBy.firstName}{' '}
                                {editablePolicy.createdBy.lastName}
                              </div>
                            )}
                          </div>
                        )}
                        {editablePolicy?.updatedDate && (
                          <div className="mb-2">
                            <span className="text-muted">Updated:</span>{' '}
                            <strong>
                              {new Date(editablePolicy.updatedDate).toLocaleDateString()}
                            </strong>
                            {editablePolicy?.updatedBy && (
                              <div className="text-muted small">
                                by {editablePolicy.updatedBy.firstName}{' '}
                                {editablePolicy.updatedBy.lastName}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="d-flex align-items-center gap-2 mt-3">
                          <span className="badge bg-primary">
                            {editablePolicy.rules?.length || 0} Rules
                          </span>
                          <span className="badge bg-secondary">
                            {editablePolicy.defaultApprovers?.length || 0} Default Approvers
                          </span>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Approval Rules Section */}
              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div>
                    <h5 className="mb-0" style={{ fontWeight: '600', color: '#212529' }}>
                      Approval Workflow Rules
                    </h5>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <span className="badge bg-primary">
                      {editablePolicy.rules?.length || 0} Rule
                      {editablePolicy.rules?.length !== 1 ? 's' : ''}
                    </span>
                    {isEditing && (
                      <Button
                        color="primary"
                        size="sm"
                        onClick={addRule}
                        style={{ fontSize: '12px' }}
                      >
                        <FaPlus className="me-1" /> Add Rule
                      </Button>
                    )}
                  </div>
                </div>

                {editablePolicy?.rules?.length > 0 ? (
                  <div className="row g-3">
                    {editablePolicy.rules.map((rule, ruleIndex) => (
                      <div
                        key={rule.approvalPolicyRuleId || rule.id || ruleIndex}
                        className="col-12"
                      >
                        <div
                          className="rule-card"
                          style={{
                            borderRadius: '12px',
                            border: '1px solid #e8ecef',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                            overflow: 'hidden',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div
                            className="rule-header"
                            style={{
                              background: '#f8f9fa',
                              padding: '16px 20px',
                              borderBottom: '1px solid #dee2e6',
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                {isEditing ? (
                                  <div className="d-flex align-items-center gap-2">
                                    <Input
                                      type="text"
                                      value={rule.name}
                                      onChange={(e) =>
                                        handleRuleChange(ruleIndex, 'name', e.target.value)
                                      }
                                      style={{
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        border: '1px solid #ced4da',
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        width: '300px',
                                      }}
                                      placeholder="Enter rule name"
                                      className={
                                        validationErrors[`rule-${ruleIndex}`]?.some((e) =>
                                          e.includes('Rule name'),
                                        )
                                          ? 'is-invalid'
                                          : ''
                                      }
                                    />
                                    <Button
                                      color="danger"
                                      size="sm"
                                      onClick={() => removeRule(ruleIndex)}
                                      disabled={editablePolicy.rules.length <= 1}
                                      style={{ fontSize: '11px' }}
                                    >
                                      Remove Rule
                                    </Button>
                                  </div>
                                ) : (
                                  <h6
                                    className="mb-2"
                                    style={{ fontWeight: '600', color: '#212529' }}
                                  >
                                    {rule.name}
                                  </h6>
                                )}
                                <div className="d-flex align-items-center gap-2">
                                  <span className="badge bg-primary" style={{ fontSize: '11px' }}>
                                    Priority {rule.orderOfEvaluation}
                                  </span>
                                  <span className="badge bg-secondary" style={{ fontSize: '11px' }}>
                                    {rule.conditions.length} Condition
                                    {rule.conditions.length !== 1 ? 's' : ''}
                                  </span>
                                  <span className="badge bg-info" style={{ fontSize: '11px' }}>
                                    {rule.approvers.length} Approver
                                    {rule.approvers.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ padding: '20px' }}>
                            {/* Display validation errors for this rule */}
                            {displayRuleErrors(ruleIndex)}

                            <Row>
                              <Col md={6} className="pe-4">
                                <div className="conditions-section">
                                  <div className="d-flex align-items-center justify-content-between mb-3">
                                    <div className="d-flex align-items-center">
                                      <FaFilter className="me-2" style={{ color: '#009efb' }} />
                                      <h6
                                        className="mb-0"
                                        style={{ fontWeight: '600', color: '#2c3e50' }}
                                      >
                                        Conditions
                                      </h6>
                                    </div>
                                    {isEditing && (
                                      <Button
                                        color="primary"
                                        size="sm"
                                        onClick={() => addCondition(ruleIndex)}
                                        style={{ fontSize: '11px' }}
                                        disabled={
                                          getAvailableConditionTypes(ruleIndex).length === 0
                                        }
                                      >
                                        <FaPlus className="me-1" /> Add Condition
                                      </Button>
                                    )}
                                  </div>
                                  {rule.conditions.length > 0 ? (
                                    <div className="conditions-list">
                                      {rule.conditions.map((condition, conditionIndex) => {
                                        const getOperatorText = () => {
                                          switch (condition.comparisonOperator) {
                                            case 'eq':
                                              return 'equals to';
                                            case 'gte':
                                              return 'is greater than or equal to';
                                            case 'lte':
                                              return 'is less than or equal to';
                                            case 'gt':
                                              return 'is greater than';
                                            case 'lt':
                                              return 'is less than';
                                            default:
                                              return condition.comparisonOperator;
                                          }
                                        };

                                        const getDisplayValue = () => {
                                          switch (condition.conditionType) {
                                            case 'cart_amount':
                                              return formatCurrency(condition.comparisonValue);
                                            case 'supplier':
                                              return getSupplierName(condition.entityTargetValue);
                                            case 'department':
                                              return getDepartmentName(condition.entityTargetValue);
                                            case 'location':
                                              return getLocationName(condition.entityTargetValue);
                                            case 'project':
                                              return getProjectName(condition.entityTargetValue);
                                            default:
                                              return condition.comparisonValue;
                                          }
                                        };

                                        const getConditionName = () => {
                                          return condition.conditionType === 'cart_amount'
                                            ? 'Cart Amount'
                                            : condition.conditionType.charAt(0).toUpperCase() +
                                                condition.conditionType.slice(1).replace('_', ' ');
                                        };

                                        return (
                                          <div
                                            key={
                                              condition.approvalConditionId ||
                                              condition.id ||
                                              conditionIndex
                                            }
                                            className="condition-item mb-3"
                                            style={{
                                              background: '#f8f9fa',
                                              borderRadius: '6px',
                                              padding: '14px',
                                              border: '1px solid #dee2e6',
                                              position: 'relative',
                                            }}
                                          >
                                            {isEditing && (
                                              <div
                                                style={{
                                                  position: 'absolute',
                                                  top: '8px',
                                                  right: '8px',
                                                }}
                                              >
                                                {rule.conditions.length > 1 && (
                                                  <Button
                                                    color="danger"
                                                    size="sm"
                                                    onClick={() =>
                                                      removeCondition(ruleIndex, conditionIndex)
                                                    }
                                                    style={{ fontSize: '10px', padding: '4px 8px' }}
                                                  >
                                                    <FaTimes />
                                                  </Button>
                                                )}
                                              </div>
                                            )}
                                            {isEditing ? (
                                              <Row>
                                                <Col md={4}>
                                                  <FormGroup>
                                                    <Label style={{ fontSize: '12px' }}>Type</Label>
                                                    <Input
                                                      type="select"
                                                      value={condition.conditionType}
                                                      onChange={(e) =>
                                                        handleConditionChange(
                                                          ruleIndex,
                                                          conditionIndex,
                                                          'conditionType',
                                                          e.target.value,
                                                        )
                                                      }
                                                      style={{ fontSize: '12px' }}
                                                    >
                                                      <option value="">Select Type</option>
                                                      {CONDITION_TYPES.map((type) => {
                                                        // For non-cart_amount types, only show if not already used
                                                        if (
                                                          type !==
                                                          POLICY_CONDITION_TYPES.CART_AMOUNT
                                                        ) {
                                                          const isUsed = rule.conditions.some(
                                                            (cond, idx) =>
                                                              idx !== conditionIndex &&
                                                              cond.conditionType === type,
                                                          );
                                                          if (isUsed) return null;
                                                        }
                                                        return (
                                                          <option key={type} value={type}>
                                                            {type ===
                                                            POLICY_CONDITION_TYPES.CART_AMOUNT
                                                              ? 'Cart Amount'
                                                              : type.charAt(0).toUpperCase() +
                                                                type.slice(1)}
                                                          </option>
                                                        );
                                                      }).filter(Boolean)}
                                                    </Input>
                                                  </FormGroup>
                                                </Col>
                                                <Col md={4}>
                                                  <FormGroup>
                                                    <Label style={{ fontSize: '12px' }}>
                                                      Operator
                                                    </Label>
                                                    <Input
                                                      type="select"
                                                      value={condition.comparisonOperator}
                                                      onChange={(e) =>
                                                        handleConditionChange(
                                                          ruleIndex,
                                                          conditionIndex,
                                                          'comparisonOperator',
                                                          e.target.value,
                                                        )
                                                      }
                                                      style={{ fontSize: '12px' }}
                                                    >
                                                      {/* For cart_amount, show all operators */}
                                                      {condition.conditionType ===
                                                      POLICY_CONDITION_TYPES.CART_AMOUNT ? (
                                                        <>
                                                          <option value="">Select Operator</option>
                                                          <option value="eq">Equals to</option>
                                                          <option value="gt">Greater than</option>
                                                          <option value="gte">
                                                            Greater than or equal to
                                                          </option>
                                                          <option value="lt">Less than</option>
                                                          <option value="lte">
                                                            Less than or equal to
                                                          </option>
                                                        </>
                                                      ) : (
                                                        // For other condition types, show only "equals to"
                                                        <>
                                                          <option value="">Select Operator</option>
                                                          <option value="eq">Equals to</option>
                                                        </>
                                                      )}
                                                    </Input>
                                                  </FormGroup>
                                                </Col>
                                                <Col md={4}>
                                                  <FormGroup>
                                                    <Label style={{ fontSize: '12px' }}>
                                                      Value
                                                    </Label>
                                                    {condition.conditionType === 'cart_amount' ? (
                                                      <Input
                                                        type="number"
                                                        value={condition.comparisonValue}
                                                        onChange={(e) =>
                                                          handleConditionChange(
                                                            ruleIndex,
                                                            conditionIndex,
                                                            'comparisonValue',
                                                            e.target.value,
                                                          )
                                                        }
                                                        style={{ fontSize: '12px' }}
                                                        placeholder="Enter amount"
                                                        min="0"
                                                        step="0.01"
                                                      />
                                                    ) : condition.conditionType === 'supplier' ? (
                                                      <Input
                                                        type="select"
                                                        value={condition.entityTargetValue || ''}
                                                        onChange={(e) =>
                                                          handleConditionChange(
                                                            ruleIndex,
                                                            conditionIndex,
                                                            'entityTargetValue',
                                                            e.target.value,
                                                          )
                                                        }
                                                        style={{ fontSize: '12px' }}
                                                      >
                                                        <option value="">Select Supplier</option>
                                                        {suppliers.map((supplier) => (
                                                          <option
                                                            key={supplier.supplierId}
                                                            value={supplier.supplierId}
                                                          >
                                                            {supplier.name}
                                                          </option>
                                                        ))}
                                                      </Input>
                                                    ) : condition.conditionType === 'department' ? (
                                                      <Input
                                                        type="select"
                                                        value={condition.entityTargetValue || ''}
                                                        onChange={(e) =>
                                                          handleConditionChange(
                                                            ruleIndex,
                                                            conditionIndex,
                                                            'entityTargetValue',
                                                            e.target.value,
                                                          )
                                                        }
                                                        style={{ fontSize: '12px' }}
                                                      >
                                                        <option value="">Select Department</option>
                                                        {departments.map((dept) => (
                                                          <option
                                                            key={dept.departmentId}
                                                            value={dept.departmentId}
                                                          >
                                                            {dept.name}
                                                          </option>
                                                        ))}
                                                      </Input>
                                                    ) : condition.conditionType === 'location' ? (
                                                      <Input
                                                        type="select"
                                                        value={condition.entityTargetValue || ''}
                                                        onChange={(e) =>
                                                          handleConditionChange(
                                                            ruleIndex,
                                                            conditionIndex,
                                                            'entityTargetValue',
                                                            e.target.value,
                                                          )
                                                        }
                                                        style={{ fontSize: '12px' }}
                                                      >
                                                        <option value="">Select Location</option>
                                                        {locations.map((location) => (
                                                          <option
                                                            key={location.locationId}
                                                            value={location.locationId}
                                                          >
                                                            {location.name}
                                                          </option>
                                                        ))}
                                                      </Input>
                                                    ) : (
                                                      <Input
                                                        type="select"
                                                        value={condition.entityTargetValue || ''}
                                                        onChange={(e) =>
                                                          handleConditionChange(
                                                            ruleIndex,
                                                            conditionIndex,
                                                            'entityTargetValue',
                                                            e.target.value,
                                                          )
                                                        }
                                                        style={{ fontSize: '12px' }}
                                                      >
                                                        <option value="">Select Project</option>
                                                        {projects.map((project) => (
                                                          <option
                                                            key={project.projectId}
                                                            value={project.projectId}
                                                          >
                                                            {project.name}
                                                          </option>
                                                        ))}
                                                      </Input>
                                                    )}
                                                  </FormGroup>
                                                </Col>
                                              </Row>
                                            ) : (
                                              <div
                                                className="condition-text"
                                                style={{
                                                  fontSize: '14px',
                                                  color: '#495057',
                                                  lineHeight: '1.5',
                                                }}
                                              >
                                                <span style={{ fontWeight: '600' }}>
                                                  {getConditionName()}
                                                </span>
                                                <span className="mx-2 text-muted">
                                                  {getOperatorText()}
                                                </span>
                                                <span
                                                  style={{ fontWeight: '600', color: '#212529' }}
                                                >
                                                  {getDisplayValue()}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        background: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        borderRadius: '6px',
                                        padding: '16px',
                                        textAlign: 'center',
                                      }}
                                    >
                                      <span style={{ fontSize: '14px', color: '#6c757d' }}>
                                        No conditions specified
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </Col>

                              <Col
                                md={6}
                                className="ps-4"
                                style={{ borderLeft: '1px solid #e8ecef' }}
                              >
                                <div className="approvers-section">
                                  <div className="d-flex align-items-center justify-content-between mb-3">
                                    <h6
                                      className="mb-0"
                                      style={{ fontWeight: '600', color: '#2c3e50' }}
                                    >
                                      Approvers ({rule.approvers.length})
                                    </h6>
                                    {isEditing && (
                                      <Button
                                        color="primary"
                                        size="sm"
                                        onClick={() => addApprover(ruleIndex)}
                                        style={{ fontSize: '12px' }}
                                      >
                                        <FaPlus className="me-1" />
                                        Add Approver
                                      </Button>
                                    )}
                                  </div>
                                  {rule.approvers.length > 0 ? (
                                    <div className="approvers-list">
                                      {rule.approvers.map((approver, approverIndex) => (
                                        <div
                                          key={
                                            approver.policyApproverId ||
                                            approver.id ||
                                            approverIndex
                                          }
                                          className="approver-item mb-3"
                                          style={{
                                            background: '#f8f9fa',
                                            borderRadius: '6px',
                                            padding: '14px',
                                            border: '1px solid #dee2e6',
                                          }}
                                        >
                                          <div className="d-flex align-items-start">
                                            <div
                                              className="approver-number me-3"
                                              style={{
                                                width: '24px',
                                                height: '24px',
                                                backgroundColor: '#6c757d',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                flexShrink: 0,
                                              }}
                                            >
                                              {approverIndex + 1}
                                            </div>
                                            <div className="flex-grow-1">
                                              {isEditing ? (
                                                <FormGroup>
                                                  <Input
                                                    type="select"
                                                    value={approver.approvalUser.userId}
                                                    onChange={(e) =>
                                                      handleApproverChange(
                                                        ruleIndex,
                                                        approverIndex,
                                                        'approvalUser',
                                                        {
                                                          ...approver.approvalUser,
                                                          userId: e.target.value,
                                                        },
                                                      )
                                                    }
                                                    style={{ fontSize: '13px' }}
                                                    className={
                                                      validationErrors[`rule-${ruleIndex}`]?.some(
                                                        (e) =>
                                                          e.includes(
                                                            `Approver ${approverIndex + 1}`,
                                                          ),
                                                      )
                                                        ? 'is-invalid'
                                                        : ''
                                                    }
                                                  >
                                                    <option value="">Select Approver</option>
                                                    {users.map((user) => (
                                                      <option key={user.userId} value={user.userId}>
                                                        {user.firstName} {user.lastName} (
                                                        {user.email})
                                                      </option>
                                                    ))}
                                                  </Input>
                                                </FormGroup>
                                              ) : (
                                                <>
                                                  <div
                                                    style={{
                                                      fontSize: '14px',
                                                      fontWeight: '600',
                                                      color: '#212529',
                                                      marginBottom: '4px',
                                                    }}
                                                  >
                                                    {approver.approvalUser.title}{' '}
                                                    {approver.approvalUser.firstName}{' '}
                                                    {approver.approvalUser.lastName}
                                                  </div>
                                                  <div
                                                    style={{ fontSize: '13px', color: '#6c757d' }}
                                                  >
                                                    {approver.approvalUser.email}
                                                  </div>
                                                </>
                                              )}
                                            </div>
                                            {isEditing && (
                                              <div className="d-flex flex-column gap-1 ms-2">
                                                {approverIndex > 0 && (
                                                  <Button
                                                    color="outline-primary"
                                                    size="sm"
                                                    onClick={() =>
                                                      moveApproverUp(ruleIndex, approverIndex)
                                                    }
                                                    style={{ fontSize: '10px', padding: '4px 8px' }}
                                                    title="Move Up"
                                                  >
                                                    <FaArrowUp />
                                                  </Button>
                                                )}
                                                {approverIndex < rule.approvers.length - 1 && (
                                                  <Button
                                                    color="outline-primary"
                                                    size="sm"
                                                    onClick={() =>
                                                      moveApproverDown(ruleIndex, approverIndex)
                                                    }
                                                    style={{ fontSize: '10px', padding: '4px 8px' }}
                                                    title="Move Down"
                                                  >
                                                    <FaArrowDown />
                                                  </Button>
                                                )}
                                                {rule.approvers.length > 1 && (
                                                  <Button
                                                    color="danger"
                                                    size="sm"
                                                    onClick={() =>
                                                      removeApprover(ruleIndex, approverIndex)
                                                    }
                                                    style={{ fontSize: '10px', padding: '4px 8px' }}
                                                    title="Remove"
                                                  >
                                                    <FaTimes />
                                                  </Button>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        background: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        borderRadius: '6px',
                                        padding: '16px',
                                        textAlign: 'center',
                                      }}
                                    >
                                      <span style={{ fontSize: '14px', color: '#6c757d' }}>
                                        No approvers assigned
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </Col>
                            </Row>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      background: '#f8f9fa',
                      borderRadius: '6px',
                      padding: '30px',
                      textAlign: 'center',
                      border: '1px solid #dee2e6',
                    }}
                  >
                    <h6 className="mb-2">No Approval Rules Configured</h6>
                    <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                      Create specific rules with conditions and approvers to automate your approval
                      workflows based on different criteria.
                    </p>
                  </div>
                )}
              </div>

              {/* Default Approvers Section */}
              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="mb-0" style={{ fontWeight: '600', color: '#212529' }}>
                    Default Approvers
                  </h5>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-secondary">
                      {editablePolicy.defaultApprovers?.length || 0} Approver
                      {editablePolicy.defaultApprovers?.length !== 1 ? 's' : ''}
                    </span>
                    {isEditing && (
                      <Button
                        color="primary"
                        size="sm"
                        onClick={addDefaultApprover}
                        style={{ fontSize: '12px' }}
                      >
                        <FaPlus className="me-1" />
                        Add Approver
                      </Button>
                    )}
                  </div>
                </div>

                {validationErrors['defaultApprovers'] && (
                  <div className="alert alert-danger mb-3" style={{ fontSize: '12px' }}>
                    <strong>Validation Errors:</strong>
                    <ul className="mb-0" style={{ paddingLeft: '20px' }}>
                      {validationErrors['defaultApprovers'].map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {editablePolicy?.defaultApprovers?.length > 0 ? (
                  <div className="default-approvers-list">
                    <Row className="g-3">
                      {editablePolicy.defaultApprovers.map((approver, approverIndex) => (
                        <Col
                          key={approver.defaultApproverId || approver.id || approverIndex}
                          md={6}
                          lg={4}
                        >
                          <div
                            className="approver-card"
                            style={{
                              background: '#f8f9fa',
                              borderRadius: '6px',
                              padding: '16px',
                              border: '1px solid #dee2e6',
                              position: 'relative',
                            }}
                          >
                            <div
                              className="order-badge"
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                width: '20px',
                                height: '20px',
                                backgroundColor: '#009efb',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '11px',
                                fontWeight: '600',
                              }}
                            >
                              {approver.orderOfApproval}
                            </div>
                            {isEditing && (
                              <div
                                className="d-flex gap-1"
                                style={{
                                  position: 'absolute',
                                  top: '8px',
                                  left: '8px',
                                }}
                              >
                                {approverIndex > 0 && (
                                  <Button
                                    color="outline-primary"
                                    size="sm"
                                    onClick={() => moveDefaultApproverUp(approverIndex)}
                                    style={{ fontSize: '10px', padding: '4px 8px' }}
                                    title="Move Up"
                                  >
                                    <FaArrowUp />
                                  </Button>
                                )}
                                {approverIndex < editablePolicy.defaultApprovers.length - 1 && (
                                  <Button
                                    color="outline-primary"
                                    size="sm"
                                    onClick={() => moveDefaultApproverDown(approverIndex)}
                                    style={{ fontSize: '10px', padding: '4px 8px' }}
                                    title="Move Down"
                                  >
                                    <FaArrowDown />
                                  </Button>
                                )}
                                {editablePolicy.defaultApprovers.length > 1 && (
                                  <Button
                                    color="danger"
                                    size="sm"
                                    onClick={() => removeDefaultApprover(approverIndex)}
                                    style={{ fontSize: '10px', padding: '4px 8px' }}
                                    title="Remove"
                                  >
                                    <FaTimes />
                                  </Button>
                                )}
                              </div>
                            )}
                            <div>
                              {isEditing ? (
                                <FormGroup>
                                  <Input
                                    type="select"
                                    value={approver.approvalUser.userId}
                                    onChange={(e) =>
                                      handleDefaultApproverChange(approverIndex, 'approvalUser', {
                                        ...approver.approvalUser,
                                        userId: e.target.value,
                                      })
                                    }
                                    style={{ fontSize: '13px' }}
                                    className={
                                      validationErrors['defaultApprovers']?.some((e) =>
                                        e.includes(`Default approver ${approverIndex + 1}`),
                                      )
                                        ? 'is-invalid'
                                        : ''
                                    }
                                  >
                                    <option value="">Select Approver</option>
                                    {users.map((user) => (
                                      <option key={user.userId} value={user.userId}>
                                        {user.firstName} {user.lastName} ({user.email})
                                      </option>
                                    ))}
                                  </Input>
                                </FormGroup>
                              ) : (
                                <>
                                  <h6
                                    className="mb-1"
                                    style={{
                                      fontSize: '14px',
                                      fontWeight: '600',
                                      color: '#212529',
                                    }}
                                  >
                                    {approver.approvalUser.title} {approver.approvalUser.firstName}{' '}
                                    {approver.approvalUser.lastName}
                                  </h6>
                                  <div style={{ fontSize: '13px', color: '#6c757d' }}>
                                    {approver.approvalUser.email}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ) : (
                  <div
                    style={{
                      background: '#f8f9fa',
                      borderRadius: '6px',
                      padding: '30px',
                      textAlign: 'center',
                      border: '1px solid #dee2e6',
                    }}
                  >
                    <h6 className="mb-2">No Default Approvers Assigned</h6>
                    <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                      Set up default approvers who will be notified when no specific approval rules
                      match the request criteria.
                    </p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ApprovalPolicyManagement;
