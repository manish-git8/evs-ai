import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, FormGroup, Label, Input, Row, Col } from 'reactstrap';
import { FaPlus } from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../CompanyManagement/ReactBootstrapTable.scss';
import UserService from '../../services/UserService';
import ApprovalPolicyManagementService from '../../services/ApprovalPolicyManagementService';
import SupplierService from '../../services/SupplierService';
import LocationService from '../../services/LocationService';
import DepartmentService from '../../services/DepartmentService';
import ProjectService from '../../services/ProjectService';
import { getEntityId } from '../localStorageUtil';

const ApprovalPolicy = () => {
  const MAX_CONDITIONS = 5;
  const companyId = getEntityId();
  const navigate = useNavigate();
  const [rules, setRules] = useState([
    {
      id: Date.now(),
      name: '',
      conditions: [
        {
          id: Date.now(),
          conditionType: 'cart_amount',
          comparisonOperator: '',
          comparisonValue: '',
          entityTargetValue: null,
        },
      ],
      approvers: [{ id: Date.now(), employeeId: '' }],
    },
  ]);

  const [defaultApprovers, setDefaultApprovers] = useState([{ id: Date.now(), employeeId: '' }]);
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [searchParams] = useSearchParams();
  const [approvalType, setApprovalType] = useState(searchParams.get('type') || 'indent');
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [department, setDepartment] = useState([]);
  const [projects, setProjects] = useState([]);
  const [validationError, setValidationError] = useState(false);

  const CONDITION_TYPES = ['cart_amount', 'supplier', 'location', 'department', 'project'];
  const COMPARISON_OPERATORS = {
    cart_amount: [
      { value: 'eq', label: 'Equals to' },
      { value: 'gt', label: 'Greater than' },
      { value: 'gte', label: 'Greater than or equal to' },
      { value: 'lt', label: 'Less than' },
      { value: 'lte', label: 'Less than or equal to' },
    ],
    default: [{ value: 'eq', label: 'Equals to' }],
  };

  const getAvailableConditionTypes = (rule, currentConditionId) => {
    const usedTypes = rule.conditions
      .filter((c) => c.id !== currentConditionId && c.conditionType)
      .map((c) => c.conditionType);
    return CONDITION_TYPES.filter((type) => !usedTypes.includes(type));
  };
  const getOperatorsForCondition = (conditionType) => {
    if (conditionType === 'cart_amount') {
      return COMPARISON_OPERATORS.cart_amount;
    }
    return COMPARISON_OPERATORS.default;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersRes = await UserService.fetchAllCompanyUsers(companyId, {
          pageSize: 100,
          pageNumber: 0,
        });
        setUsers(usersRes.data.content || []);
        try {
          const suppliersRes = await SupplierService.getAllSuppliersPaginated();
          setSuppliers(suppliersRes.data.content || []);
        } catch (error) {
          console.error('Error fetching suppliers:', error);
          setSuppliers([]);
        }

        try {
          const locationsRes = await LocationService.getAllLocation(companyId);
          setLocations(locationsRes.data || []);
        } catch (error) {
          console.error('Error fetching locations:', error);
          setLocations([]);
        }

        try {
          const deptRes = await DepartmentService.getAllDepartment(companyId);
          setDepartment(deptRes.data || []);
        } catch (error) {
          console.error('Error fetching departments:', error);
          setDepartment([]);
        }

        try {
          const projectsRes = await ProjectService.getAllProjects(companyId);
          setProjects(projectsRes.data || []);
        } catch (error) {
          console.error('Error fetching projects:', error);
          setProjects([]);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
        setUsers([]);
      }
    };

    fetchData();
  }, [companyId]);

  const addCondition = (ruleId) => {
    setRules((prevRules) =>
      prevRules.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              conditions: [
                ...rule.conditions,
                {
                  id: Date.now(),
                  conditionType: '',
                  comparisonOperator: '',
                  comparisonValue: '',
                  entityTargetValue: null,
                },
              ],
            }
          : rule,
      ),
    );
  };

  const clearError = (ruleId, field) => {
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      if (newErrors[ruleId]) {
        newErrors[ruleId] = newErrors[ruleId].filter((err) => !err.includes(field));
      }
      return newErrors;
    });
  };

  const handleRuleNameChange = (ruleId, value) => {
    setRules((prevRules) =>
      prevRules.map((rule) => (rule.id === ruleId ? { ...rule, name: value } : rule)),
    );
    clearError(ruleId, 'name');
  };

  const handleConditionChange = (ruleId, conditionId, field, value) => {
    setRules((prevRules) =>
      prevRules.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              conditions: rule.conditions.map((cond) => {
                if (cond.id !== conditionId) return cond;
                if (field === 'conditionType') {
                  return {
                    ...cond,
                    conditionType: value,
                    comparisonOperator: '',
                    comparisonValue: '',
                    entityTargetValue: null,
                  };
                }

                return { ...cond, [field]: value };
              }),
            }
          : rule,
      ),
    );
    clearError(ruleId, 'condition');
  };

  const addApprover = (ruleId) => {
    setRules((prevRules) =>
      prevRules.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              approvers: [...rule.approvers, { id: Date.now(), employeeId: '' }],
            }
          : rule,
      ),
    );
  };

  const removeDefaultApprover = (approverId) => {
    if (defaultApprovers.length > 1) {
      setDefaultApprovers((prevApprovers) =>
        prevApprovers.filter((approver) => approver.id !== approverId),
      );
    } else {
      toast.error('At least one default approver must remain');
    }
  };

  const removeApprover = (ruleId, approverId) => {
    setRules((prevRules) =>
      prevRules.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              approvers:
                rule.approvers.length > 1
                  ? rule.approvers.filter((approver) => approver.id !== approverId)
                  : rule.approvers,
            }
          : rule,
      ),
    );
  };

  const removeCondition = (ruleId, conditionId) => {
    setRules((prevRules) =>
      prevRules.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              conditions:
                rule.conditions.length > 1
                  ? rule.conditions.filter((condition) => condition.id !== conditionId)
                  : rule.conditions,
            }
          : rule,
      ),
    );
  };

  const addDefaultApprover = () => {
    setDefaultApprovers([...defaultApprovers, { id: Date.now(), employeeId: '' }]);
  };

  const removeRule = (ruleId) => {
    if (rules.length > 1) {
      setRules((prevRules) => prevRules.filter((rule) => rule.id !== ruleId));
    } else {
      toast.error('At least one rule must remain');
    }
  };

  const getAvailableEmployees = (ruleId, approverId) => {
    const rule = rules.find((r) => r.id === ruleId);
    const usedApproversInRule =
      rule?.approvers.map((approver) => String(approver.employeeId)).filter((id) => id) || [];

    const available = users.filter(
      (user) =>
        !usedApproversInRule.includes(String(user.userId)) ||
        String(user.userId) === String(approverId),
    );
    return available;
  };

  const handleApproverChange = (ruleId, approverId, value) => {
    setRules((prevRules) =>
      prevRules.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              approvers: rule.approvers.map((approver) =>
                approver.id === approverId ? { ...approver, employeeId: value } : approver,
              ),
            }
          : rule,
      ),
    );
    clearError(ruleId, 'approver');
  };

  const getAvailableDefaultApprovers = (currentApproverId) => {
    const usedApprovers = defaultApprovers
      .map((approver) => String(approver.employeeId))
      .filter((id) => id);

    const available = users.filter(
      (user) =>
        !usedApprovers.includes(String(user.userId)) ||
        String(user.userId) === String(currentApproverId),
    );
    return available;
  };
  const handleDefaultApproverChange = (approverId, value) => {
    setDefaultApprovers((prevApprovers) =>
      prevApprovers.map((approver) =>
        approver.id === approverId ? { ...approver, employeeId: value } : approver,
      ),
    );
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      if (newErrors.defaultApprovers) {
        newErrors.defaultApprovers = newErrors.defaultApprovers.filter(
          (err) => !err.includes('Default approver'),
        );
      }
      return newErrors;
    });
  };

  const validateRules = () => {
    const validationErrors = {};
    let isValid = true;

    if (!approvalType) {
      setValidationError(true);
      isValid = false;
    }

    rules.forEach((rule) => {
      const ruleErrors = [];

      if (!rule.name?.trim()) {
        ruleErrors.push('Rule name is required');
        isValid = false;
      }

      if (!rule.conditions || rule.conditions.length === 0) {
        ruleErrors.push('At least one condition is required');
        isValid = false;
      } else {
        rule.conditions.forEach((condition, condIndex) => {
          if (!condition.conditionType) {
            ruleErrors.push(`Condition ${condIndex + 1}: Type is required`);
            isValid = false;
          }

          if (!condition.comparisonOperator) {
            ruleErrors.push(`Condition ${condIndex + 1}: Operator is required`);
            isValid = false;
          }

          if (['supplier', 'location', 'department', 'project'].includes(condition.conditionType)) {
            if (!condition.entityTargetValue) {
              ruleErrors.push(
                `Condition ${condIndex + 1}: ${condition.conditionType} selection is required`,
              );
              isValid = false;
            }
          } else if (condition.conditionType === 'cart_amount') {
            if (!condition.comparisonValue) {
              ruleErrors.push(`Condition ${condIndex + 1}: Amount value is required`);
              isValid = false;
            }
          }
        });
      }

      if (!rule.approvers || rule.approvers.length === 0) {
        ruleErrors.push('At least one approver is required');
        isValid = false;
      } else {
        rule.approvers.forEach((approver, appIndex) => {
          if (!approver.employeeId) {
            ruleErrors.push(`Approver ${appIndex + 1}: Employee selection is required`);
            isValid = false;
          }
        });
      }

      if (ruleErrors.length > 0) {
        validationErrors[rule.id] = ruleErrors;
      }
    });

    if (defaultApprovers.length === 0) {
      validationErrors.defaultApprovers = ['At least one default approver is required'];
      isValid = false;
    } else {
      defaultApprovers.forEach((approver, index) => {
        if (!approver.employeeId) {
          validationErrors.defaultApprovers = validationErrors.defaultApprovers || [];
          validationErrors.defaultApprovers.push(
            `Default approver ${index + 1}: Employee selection is required`,
          );
          isValid = false;
        }
      });
    }

    setErrors(validationErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateRules()) {
      return;
    }

    const requestBody = {
      approvalType,
      company: {
        companyId,
        name: '',
        displayName: '',
      },
      rules: rules.map((rule, index) => ({
        name: rule.name,
        orderOfEvaluation: index + 1,
        conditions: rule.conditions.map((condition) => ({
          conditionType: condition.conditionType,
          comparisonOperator: condition.comparisonOperator,
          comparisonValue:
            condition.conditionType === 'cart_amount' ? condition.comparisonValue : null,
          entityTargetValue: ['supplier', 'location', 'department', 'project'].includes(
            condition.conditionType,
          )
            ? condition.entityTargetValue
            : null,
        })),
        approvers: rule.approvers.map((approver, idx) => ({
          approvalUser: {
            userId: approver.employeeId,
          },
          orderOfApproval: idx + 1,
        })),
      })),
      defaultApprovers: defaultApprovers.map((approver, idx) => ({
        approvalUser: {
          userId: approver.employeeId,
        },
        orderOfApproval: idx + 1,
      })),
      updatedDate: new Date().toISOString(),
    };

    try {
      const result = await Swal.fire({
        title: 'Confirm Submission',
        text: 'Are you sure you want to submit this approval policy?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Submit',
      });

      if (result.isConfirmed) {
        await ApprovalPolicyManagementService.handleCreateApprovalPolicy(requestBody, companyId);
        toast.dismiss();
        toast.success('Approval Policy successfully submitted!');
        setTimeout(() => {
          navigate('/approval-policy-management');
        }, 1500);
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error.response?.data?.errorMessage || 'Submission failed');
    }
  };

  const addRule = () => {
    const newRule = {
      id: Date.now(),
      name: '',
      conditions: [
        {
          id: Date.now(),
          conditionType: 'cart_amount',
          comparisonOperator: '',
          comparisonValue: '',
          entityTargetValue: null,
        },
      ],
      approvers: [{ id: Date.now(), employeeId: '' }],
    };
    setRules([...rules, newRule]);
  };

  const handleCancel = () => {
    navigate('/approval-policy-management');
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
            <CardBody style={{ padding: '24px 24px 0 24px' }}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="icon-wrapper"
                    style={{
                      width: '40px',
                      height: '40px',
                      background: 'linear-gradient(135deg, #009efb 0%, #0085d1 100%)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i className="fas fa-plus text-white"></i>
                  </div>
                  <div>
                    <h4 className="mb-1">Create New Approval Policy</h4>
                    <p className="text-muted mb-0 small">
                      Configure approval workflows, conditions, and approvers for your organization
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
            <CardBody style={{ padding: '0 24px 24px 24px' }}>
              <div className="mb-4">
                <h5 className="mb-3" style={{ fontWeight: '600', color: '#212529' }}>
                  Approval Policy Type
                </h5>
                <div className="d-flex gap-4 mb-3">
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
                    onClick={() => {
                      setApprovalType('indent');
                      setValidationError(false);
                    }}
                  >
                    <div className="d-flex align-items-center">
                      <Input
                        type="radio"
                        name="approvalType"
                        id="indent"
                        checked={approvalType === 'indent'}
                        onChange={() => {
                          setApprovalType('indent');
                          setValidationError(false);
                        }}
                        className="form-check-input me-2"
                      />
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '14px' }}>Cart Requests</div>
                        <small className="text-muted">Shopping cart approvals</small>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`policy-option ${approvalType === 'purchase_order' ? 'active' : ''}`}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: approvalType === 'purchase_order' ? '#009efb' : '#dee2e6',
                      backgroundColor: approvalType === 'purchase_order' ? '#e3f2fd' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => {
                      setApprovalType('purchase_order');
                      setValidationError(false);
                    }}
                  >
                    <div className="d-flex align-items-center">
                      <Input
                        type="radio"
                        name="approvalType"
                        id="purchase_order"
                        checked={approvalType === 'purchase_order'}
                        onChange={() => {
                          setApprovalType('purchase_order');
                          setValidationError(false);
                        }}
                        className="form-check-input me-2"
                      />
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '14px' }}>Purchase Orders</div>
                        <small className="text-muted">PO creation approvals</small>
                      </div>
                    </div>
                  </div>
                </div>
                {validationError && (
                  <div className="text-danger">Please select an approval type.</div>
                )}
              </div>

              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="mb-0" style={{ fontWeight: '600', color: '#212529' }}>
                    Approval Rules
                  </h5>
                  <span className="badge bg-primary">
                    {rules.length} Rule{rules.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {rules.map((rule, index) => (
                  <div
                    key={rule.id}
                    className="rule-card mb-3"
                    style={{
                      borderRadius: '8px',
                      border: '1px solid #dee2e6',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                      overflow: 'hidden',
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
                          <h6 className="mb-1" style={{ fontWeight: '600', color: '#212529' }}>
                            {rule.name || `Rule ${index + 1}`}
                          </h6>
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-primary" style={{ fontSize: '11px' }}>
                              Priority {index + 1}
                            </span>
                          </div>
                        </div>
                        {rules.length > 1 && (
                          <Button
                            color="danger"
                            size="sm"
                            onClick={() => removeRule(rule.id)}
                            style={{ fontSize: '12px' }}
                          >
                            Remove Rule
                          </Button>
                        )}
                      </div>
                    </div>
                    <div style={{ padding: '20px' }}>
                      <FormGroup className="mb-4">
                        <Label
                          for={`ruleName${rule.id}`}
                          style={{ fontWeight: '600', color: '#212529' }}
                        >
                          Rule Name<span className="text-danger">*</span>
                        </Label>
                        <Input
                          type="text"
                          id={`ruleName${rule.id}`}
                          placeholder="Enter descriptive rule name"
                          value={rule.name}
                          onChange={(e) => handleRuleNameChange(rule.id, e.target.value)}
                          className={`form-control ${
                            errors[rule.id]?.some((e) => e.includes('Rule name'))
                              ? 'is-invalid'
                              : ''
                          }`}
                          maxLength={200}
                          style={{
                            borderRadius: '6px',
                            border: '1px solid #dee2e6',
                            padding: '8px 12px',
                          }}
                        />
                        {errors[rule.id]?.some((e) => e.includes('Rule name')) && (
                          <div className="invalid-feedback">Rule name is required</div>
                        )}
                      </FormGroup>

                      <div className="mb-4">
                        <h6 style={{ fontWeight: '600', color: '#212529' }}>
                          Conditions<span className="text-danger">*</span>
                        </h6>
                        <p className="text-muted mb-3" style={{ fontSize: '13px' }}>
                          Define when this approval rule should be triggered
                        </p>
                        {rule.conditions.map((condition) => (
                          <div
                            key={condition.id}
                            className="condition-form mb-3"
                            style={{
                              background: '#f8f9fa',
                              borderRadius: '6px',
                              padding: '16px',
                              border: '1px solid #dee2e6',
                            }}
                          >
                            <Row>
                              <Col md={3}>
                                <FormGroup>
                                  <Label style={{ fontSize: '13px', fontWeight: '500' }}>
                                    Condition Type
                                  </Label>
                                  <Input
                                    type="select"
                                    value={condition.conditionType}
                                    onChange={(e) =>
                                      handleConditionChange(
                                        rule.id,
                                        condition.id,
                                        'conditionType',
                                        e.target.value,
                                      )
                                    }
                                    style={{
                                      borderRadius: '6px',
                                      border: '1px solid #dee2e6',
                                      fontSize: '13px',
                                    }}
                                  >
                                    <option value="">Select Condition</option>
                                    {getAvailableConditionTypes(rule, condition.id).map((type) => (
                                      <option key={type} value={type}>
                                        {type
                                          .replace('_', ' ')
                                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                                      </option>
                                    ))}
                                  </Input>
                                </FormGroup>
                              </Col>
                              <Col md={3}>
                                <FormGroup>
                                  <Label style={{ fontSize: '13px', fontWeight: '500' }}>
                                    Operator
                                  </Label>
                                  <Input
                                    key={`${condition.id}-${condition.conditionType}-operator`}
                                    type="select"
                                    value={condition.comparisonOperator || ''}
                                    onChange={(e) =>
                                      handleConditionChange(
                                        rule.id,
                                        condition.id,
                                        'comparisonOperator',
                                        e.target.value,
                                      )
                                    }
                                    style={{
                                      borderRadius: '6px',
                                      border: '1px solid #dee2e6',
                                      fontSize: '13px',
                                    }}
                                  >
                                    <option value="">Select Operator</option>
                                    {getOperatorsForCondition(condition.conditionType).map(
                                      (operator) => (
                                        <option key={operator.value} value={operator.value}>
                                          {operator.label}
                                        </option>
                                      ),
                                    )}
                                  </Input>
                                </FormGroup>
                              </Col>

                              <Col md={4}>
                                {condition.conditionType === 'supplier' ? (
                                  <FormGroup>
                                    <Label style={{ fontSize: '13px', fontWeight: '500' }}>
                                      Supplier
                                    </Label>
                                    <Input
                                      type="select"
                                      value={condition.entityTargetValue || ''}
                                      onChange={(e) =>
                                        handleConditionChange(
                                          rule.id,
                                          condition.id,
                                          'entityTargetValue',
                                          e.target.value,
                                        )
                                      }
                                      style={{
                                        borderRadius: '6px',
                                        border: '1px solid #dee2e6',
                                        fontSize: '13px',
                                      }}
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
                                  </FormGroup>
                                ) : condition.conditionType === 'location' ? (
                                  <FormGroup>
                                    <Label>Location</Label>
                                    <Input
                                      type="select"
                                      value={condition.entityTargetValue || ''}
                                      onChange={(e) =>
                                        handleConditionChange(
                                          rule.id,
                                          condition.id,
                                          'entityTargetValue',
                                          e.target.value,
                                        )
                                      }
                                      className="form-control"
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
                                  </FormGroup>
                                ) : condition.conditionType === 'department' ? (
                                  <FormGroup>
                                    <Label>Department</Label>
                                    <Input
                                      type="select"
                                      value={condition.entityTargetValue || ''}
                                      onChange={(e) =>
                                        handleConditionChange(
                                          rule.id,
                                          condition.id,
                                          'entityTargetValue',
                                          e.target.value,
                                        )
                                      }
                                      className="form-control"
                                    >
                                      <option value="">Select Department</option>
                                      {department.map((dept) => (
                                        <option key={dept.departmentId} value={dept.departmentId}>
                                          {dept.name}
                                        </option>
                                      ))}
                                    </Input>
                                  </FormGroup>
                                ) : condition.conditionType === 'project' ? (
                                  <FormGroup>
                                    <Label>Project</Label>
                                    <Input
                                      type="select"
                                      value={condition.entityTargetValue || ''}
                                      onChange={(e) =>
                                        handleConditionChange(
                                          rule.id,
                                          condition.id,
                                          'entityTargetValue',
                                          e.target.value,
                                        )
                                      }
                                      className="form-control"
                                    >
                                      <option value="">Select Project</option>
                                      {projects.map((project) => (
                                        <option key={project.projectId} value={project.projectId}>
                                          {project.name}
                                        </option>
                                      ))}
                                    </Input>
                                  </FormGroup>
                                ) : (
                                  <FormGroup>
                                    <Label>Amount</Label>
                                    <Input
                                      type="number"
                                      placeholder="Enter amount"
                                      value={condition.comparisonValue || ''}
                                      onChange={(e) =>
                                        handleConditionChange(
                                          rule.id,
                                          condition.id,
                                          'comparisonValue',
                                          e.target.value,
                                        )
                                      }
                                      onKeyDown={(e) => {
                                        if (['-', '+', 'e', 'E'].includes(e.key)) {
                                          e.preventDefault();
                                        }
                                      }}
                                      className="form-control"
                                      min="0"
                                      step="0.01"
                                    />
                                  </FormGroup>
                                )}
                              </Col>
                              <Col md={2} className="d-flex align-items-end">
                                <Button
                                  color="danger"
                                  size="sm"
                                  onClick={() => removeCondition(rule.id, condition.id)}
                                  className="mb-3"
                                  style={{ fontSize: '12px' }}
                                >
                                  Remove
                                </Button>
                              </Col>
                            </Row>
                            {errors[rule.id]?.some((err) =>
                              err.includes(`Condition ${rule.conditions.indexOf(condition) + 1}`),
                            ) && (
                              <div className="text-danger mt-2" style={{ fontSize: '13px' }}>
                                {errors[rule.id].find((err) =>
                                  err.includes(
                                    `Condition ${rule.conditions.indexOf(condition) + 1}`,
                                  ),
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        {rule.conditions.length < MAX_CONDITIONS && (
                          <Button
                            color="primary"
                            size="sm"
                            onClick={() => addCondition(rule.id)}
                            className="mt-2"
                            style={{ fontSize: '12px' }}
                          >
                            <FaPlus className="me-1" /> Add Condition
                          </Button>
                        )}
                        {errors[rule.id]?.some((err) =>
                          err.includes('At least one condition is required'),
                        ) && (
                          <div className="text-danger mt-2" style={{ fontSize: '13px' }}>
                            At least one condition is required
                          </div>
                        )}
                      </div>

                      <div>
                        <h6 style={{ fontWeight: '600', color: '#212529' }}>
                          Approvers<span className="text-danger">*</span>
                        </h6>
                        <p className="text-muted mb-3" style={{ fontSize: '13px' }}>
                          Select employees who can approve requests matching this rule
                        </p>
                        {rule.approvers.map((approver, approverIndex) => (
                          <div
                            key={approver.id}
                            className="approver-item mb-3"
                            style={{
                              background: '#f8f9fa',
                              borderRadius: '6px',
                              padding: '12px',
                              border: '1px solid #dee2e6',
                            }}
                          >
                            <Row className="align-items-center">
                              <Col md={1}>
                                <div
                                  className="approver-number"
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    backgroundColor: '#009efb',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                  }}
                                >
                                  {approverIndex + 1}
                                </div>
                              </Col>
                              <Col md={9}>
                                <FormGroup className="mb-0">
                                  <Input
                                    type="select"
                                    value={approver.employeeId || ''}
                                    onChange={(e) =>
                                      handleApproverChange(rule.id, approver.id, e.target.value)
                                    }
                                    style={{
                                      borderRadius: '6px',
                                      border: '1px solid #dee2e6',
                                      fontSize: '13px',
                                    }}
                                  >
                                    <option value="">Select Employee</option>
                                    {getAvailableEmployees(rule.id, approver.employeeId).map(
                                      (user) => (
                                        <option key={user.userId} value={user.userId}>
                                          {`${user.firstName} ${user.lastName} (${user.email})`}
                                        </option>
                                      ),
                                    )}
                                  </Input>
                                </FormGroup>
                              </Col>
                              <Col md={2} className="d-flex justify-content-end">
                                <Button
                                  color="danger"
                                  size="sm"
                                  onClick={() => removeApprover(rule.id, approver.id)}
                                  style={{ fontSize: '12px' }}
                                >
                                  Remove
                                </Button>
                              </Col>
                            </Row>
                          </div>
                        ))}
                        {rule.approvers.length < MAX_CONDITIONS && (
                          <Button
                            color="primary"
                            size="sm"
                            onClick={() => addApprover(rule.id)}
                            className="mt-2"
                            style={{ fontSize: '12px' }}
                          >
                            <FaPlus className="me-1" /> Add Approver
                          </Button>
                        )}
                        {errors[rule.id]?.some((err) =>
                          err.includes('At least one approver is required'),
                        ) && (
                          <div className="text-danger mt-2" style={{ fontSize: '13px' }}>
                            At least one approver is required
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  color="primary"
                  size="sm"
                  onClick={addRule}
                  className="mb-4"
                  style={{ fontSize: '12px' }}
                >
                  <FaPlus className="me-1" /> Add Rule
                </Button>
              </div>

              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="mb-0" style={{ fontWeight: '600', color: '#212529' }}>
                    Default Approvers<span className="text-danger">*</span>
                  </h5>
                  <span className="badge bg-secondary">
                    {defaultApprovers.length} Approver{defaultApprovers.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-muted mb-3" style={{ fontSize: '13px' }}>
                  These approvers will handle requests that don&apos;t match any specific rule
                  conditions
                </p>

                {errors.defaultApprovers && (
                  <div className="text-danger mb-3" style={{ fontSize: '13px' }}>
                    {errors.defaultApprovers.map((error) => (
                      <div key={error}>{error}</div>
                    ))}
                  </div>
                )}

                {defaultApprovers.map((approver, index) => (
                  <div
                    key={approver.id}
                    className="default-approver-item mb-3"
                    style={{
                      background: '#f8f9fa',
                      borderRadius: '6px',
                      padding: '12px',
                      border: '1px solid #dee2e6',
                    }}
                  >
                    <Row className="align-items-center">
                      <Col md={1}>
                        <div
                          className="approver-number"
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
                          }}
                        >
                          {index + 1}
                        </div>
                      </Col>
                      <Col md={9}>
                        <FormGroup className="mb-0">
                          <Input
                            type="select"
                            value={approver.employeeId || ''}
                            onChange={(e) =>
                              handleDefaultApproverChange(approver.id, e.target.value)
                            }
                            style={{
                              borderRadius: '6px',
                              border: '1px solid #dee2e6',
                              fontSize: '13px',
                            }}
                          >
                            <option value="">Select Employee</option>
                            {getAvailableDefaultApprovers(approver.employeeId).map((user) => (
                              <option key={user.userId} value={user.userId}>
                                {`${user.firstName} ${user.lastName} (${user.email})`}
                              </option>
                            ))}
                          </Input>
                        </FormGroup>
                      </Col>
                      <Col md={2} className="d-flex justify-content-end">
                        <Button
                          color="danger"
                          size="sm"
                          onClick={() => removeDefaultApprover(approver.id)}
                          style={{ fontSize: '12px' }}
                        >
                          Remove
                        </Button>
                      </Col>
                    </Row>
                  </div>
                ))}
                <Button
                  color="primary"
                  size="sm"
                  onClick={addDefaultApprover}
                  className="mt-2"
                  style={{ fontSize: '12px' }}
                >
                  <FaPlus className="me-1" /> Add Default Approver
                </Button>
              </div>

              <div
                className="d-flex justify-content-end gap-2 pt-3"
                style={{ borderTop: '1px solid #dee2e6' }}
              >
                <Button
                  color="secondary"
                  onClick={handleCancel}
                  style={{
                    borderRadius: '6px',
                    padding: '8px 24px',
                    fontSize: '14px',
                  }}
                >
                  Back
                </Button>
                <Button
                  color="primary"
                  onClick={handleSubmit}
                  style={{
                    borderRadius: '6px',
                    padding: '8px 24px',
                    fontSize: '14px',
                    background: 'linear-gradient(135deg, #009efb 0%, #0085d1 100%)',
                    border: 'none',
                  }}
                >
                  Create Policy
                </Button>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ApprovalPolicy;
