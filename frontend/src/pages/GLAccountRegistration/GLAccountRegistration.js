import React, { useState, useEffect } from 'react';
import { Card, CardBody, Row, Col, FormGroup, Label, Input, Button } from 'reactstrap';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { useNavigate, useParams } from 'react-router-dom';
import { Formik, ErrorMessage, Form } from 'formik';
import * as Yup from 'yup';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import GLAccountService from '../../services/GLaccountService';
import UserService from '../../services/UserService';
import DepartmentService from '../../services/DepartmentService';
import { getEntityId } from '../localStorageUtil';

const GLAccountRegistration = () => {
  const [glAccount, setGLAccount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchDepartmentTerm, setSearchDepartmentTerm] = useState('');
  const [debouncedSearchDepartmentTerm, setDebouncedSearchDepartmentTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [userPageSize, setUserPageSize] = useState(10);
  const [userPageNumber, setUserPageNumber] = useState(0);
  const [userSortBy, setUserSortBy] = useState('firstName');
  const [userSortOrder, setUserSortOrder] = useState('asc');
  const [departments, setDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const companyId = getEntityId();
  const navigate = useNavigate();
  const { glAccountId } = useParams();

  const glAccountValidationSchema = Yup.object({
    name: Yup.string().required('Name is required'),
    description: Yup.string().required('Description is required'),
    notes: Yup.string(),
    isActive: Yup.boolean(),
  });

  useEffect(() => {
    const fetchGLAccount = async () => {
      try {
        if (glAccountId) {
          const response = await GLAccountService.getGlAccountById(companyId, glAccountId);
          setGLAccount(response.data[0]);

          const usersResponse = await GLAccountService.getUsersForGLAccount(companyId, glAccountId);
          const assignedUserIds = usersResponse.data.users.map((user) => user.userId);
          setSelectedUsers(assignedUserIds);

          const departmentResponse = await GLAccountService.getDepartmentForgLAccount(
            companyId,
            glAccountId,
          );
          const assignedDepartmentId = departmentResponse.data.map((dep) => dep.departmentId);
          setSelectedDepartments(assignedDepartmentId);
        }
      } catch (error) {
        console.error('Error fetching GL Account:', error);
      }
    };

    fetchGLAccount();
  }, [companyId, glAccountId]);

  const fetchUsers = async () => {
    try {
      let response;
      const pageDto = {
        pageSize: userPageSize,
        pageNumber: userPageNumber,
        sortBy: userSortBy,
        order: userSortOrder,
      };

      if (debouncedSearchTerm.trim() === '') {
        response = await UserService.fetchAllUsers(companyId, pageDto);
      } else {
        response = await UserService.getUsersBySearch(debouncedSearchTerm, companyId, pageDto);
      }

      setUsers(response?.data?.content || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      if (error.response && error.response.data && error.response.data.errorMessage) {
        toast.dismiss();
        toast.error(error.response.data.errorMessage);
      } else {
        toast.dismiss();
        toast.error('Not found');
      }
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [companyId, debouncedSearchTerm, userPageSize, userPageNumber, userSortBy, userSortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

 useEffect(() => {
  const fetchDepartments = async () => {
    try {
      if (debouncedSearchDepartmentTerm.trim() === '') {
        const response = await DepartmentService.getAllDepartment(companyId);
        setDepartments(response.data);
      } else {
        const response = await DepartmentService.getDepartmentBySearch(
          companyId,
          { search: debouncedSearchDepartmentTerm }
        );
        setDepartments(response.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  fetchDepartments();
}, [companyId, debouncedSearchDepartmentTerm]);

  const handleDepartmentSearchInputChange = (event) => {
    setSearchDepartmentTerm(event.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchDepartmentTerm(searchDepartmentTerm);
    }, 1500);
    return () => clearTimeout(timer);
  }, [searchDepartmentTerm]);

  const handleDepartmentSelection = async (departmentId) => {
    const newSelectedDepartments = selectedDepartments.includes(departmentId)
      ? selectedDepartments.filter((id) => id !== departmentId)
      : [...selectedDepartments, departmentId];

    setSelectedDepartments(newSelectedDepartments);

    try {
      const requestBody = newSelectedDepartments.map((id) => ({
        departmentId: id,
      }));

      await GLAccountService.handleAddDeparmentToGLAccount(companyId, requestBody, glAccountId);
    } catch (error) {
      console.error('Error updating departments:', error);
    }
  };

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleUserSelection = async (selectedUserId) => {
    const newSelectedUsers = selectedUsers.includes(selectedUserId)
      ? selectedUsers.filter((id) => id !== selectedUserId)
      : [...selectedUsers, selectedUserId];

    setSelectedUsers(newSelectedUsers);

    try {
      const requestBody = {
        glAccountId,
        users: newSelectedUsers.map((userId) => ({ userId })),
      };
      await GLAccountService.handleAddUserToGLAccount(companyId, requestBody, glAccountId);
    } catch (error) {
      console.error('Error updating users:', error);
      toast.dismiss();
      toast.error('Failed to update user');
    }
  };

  const handleSubmit = async (values) => {
    try {
      const requestBody = {
        name: values.name,
        description: values.description,
        notes: values.notes,
        companyId,
        isActive: values.isActive,
      };

      if (glAccountId) {
        await GLAccountService.handleUpdateGLAccount(companyId, glAccountId, requestBody);
        toast.dismiss();
        toast.success('GL Account updated successfully!');
      } else {
        await GLAccountService.handleCreateGLAccount(companyId, requestBody);
        toast.dismiss();
        toast.success('GL Account created successfully!');
      }

      setTimeout(() => {
        navigate('/gl-account-management');
      }, 1500);
    } catch (error) {
      if (error.response && error.response.data && error.response.data.errorMessage) {
        toast.dismiss();
        toast.error(error.response.data.errorMessage);
      } else {
        toast.dismiss();
        toast.error('An unexpected error occurred');
      }
    }
  };

  const handleCancel = () => {
    navigate('/gl-account-management');
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
        <Col md="12">
          <Card className="enhanced-card" style={{
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: 'none'
          }}>
            <CardBody style={{ padding: '24px 24px 0 24px' }}>
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="icon-wrapper" style={{
                  width: '40px',
                  height: '40px',
                  background: '#009efb',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className="fas fa-calculator text-white"></i>
                </div>
                <div>
                  <h4 className="mb-1">{glAccountId ? 'Edit GL Account' : 'Create New GL Account'}</h4>
                  <p className="text-muted mb-0 small">
                    {glAccountId ? 'Update the general ledger account details below' : 'Enter the GL account information to create a new account'}
                  </p>
                </div>
              </div>
            </CardBody>
            <CardBody style={{ padding: '0 24px 24px 24px' }}>
              <Formik
                initialValues={{
                  name: glAccount ? glAccount.name : '',
                  description: glAccount ? glAccount.description : '',
                  notes: glAccount ? glAccount.notes : '',
                  isActive: glAccount ? glAccount.isActive : true,
                }}
                validationSchema={glAccountValidationSchema}
                onSubmit={handleSubmit}
                enableReinitialize
              >
                {({ values, handleChange, handleBlur, errors, touched }) => (
                  <Form
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                  >
                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Name<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="text"
                            name="name"
                            value={values.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Enter GL Account Name"
                            className={`form-control${
                              touched.name && errors.name ? ' is-invalid' : ''
                            }`}
                            maxLength={200}
                          />
                          <ErrorMessage name="name" component="div" className="invalid-feedback" />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>Notes</Label>
                          <Input
                            type="text"
                            name="notes"
                            value={values.notes}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Enter Notes"
                            className={`form-control${
                              touched.notes && errors.notes ? ' is-invalid' : ''
                            }`}
                            maxLength={200}
                          />
                          <ErrorMessage name="notes" component="div" className="invalid-feedback" />
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Description<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="textarea"
                            name="description"
                            value={values.description}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Enter Description"
                            className={`form-control${
                              touched.description && errors.description ? ' is-invalid' : ''
                            }`}
                            maxLength={200}
                            style={{ height: '100px', resize: 'none' }}
                          />
                          <ErrorMessage
                            name="description"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    {glAccountId && (
                      <>
                        <Row>
                          <Col md="12">
                            <Card style={{
                              borderRadius: '12px',
                              boxShadow: '0 2px 15px rgba(0,0,0,0.06)',
                              border: '1px solid #e8ecef',
                              marginBottom: '20px'
                            }}>
                              <CardBody style={{ padding: '20px' }}>
                                <div className="user-list-container">
                                  <div className="d-flex justify-content-between mb-4 align-items-center">
                                    <div className="d-flex align-items-center gap-3">
                                      <div className="icon-wrapper" style={{
                                        width: '36px',
                                        height: '36px',
                                        background: '#009efb',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 3px 10px rgba(0, 158, 251, 0.3)'
                                      }}>
                                        <i className="fas fa-users text-white" style={{ fontSize: '16px' }}></i>
                                      </div>
                                      <div>
                                        <h5 className="mb-0" style={{ fontWeight: '600', color: '#2c3e50' }}>Assign Users</h5>
                                        <p className="text-muted mb-0 small">Select users to associate with this GL Account</p>
                                      </div>
                                    </div>
                                    <div style={{ minWidth: '200px' }}>
                                      <div className="search-wrapper" style={{ position: 'relative' }}>
                                        <input
                                          type="text"
                                          value={searchTerm}
                                          onChange={handleSearchInputChange}
                                          placeholder="Search users..."
                                          className="form-control"
                                          style={{
                                            borderRadius: '8px',
                                            border: '1px solid #e3e6ea',
                                            paddingLeft: '35px',
                                            fontSize: '14px',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                          }}
                                        />
                                        <i className="fas fa-search" style={{
                                          position: 'absolute',
                                          left: '10px',
                                          top: '50%',
                                          transform: 'translateY(-50%)',
                                          color: '#6c757d',
                                          fontSize: '12px'
                                        }}></i>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="scrollable-user-list" style={{
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    border: '1px solid #e8ecef',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    backgroundColor: '#fafbfc'
                                  }}>
                                    {users.length > 0 ? users.map((user) => (
                                      <div key={user.userId} className="form-check" style={{
                                        padding: '10px 12px',
                                        margin: '4px 0',
                                        backgroundColor: selectedUsers.includes(user.userId) ? '#e7f3ff' : '#ffffff',
                                        border: `1px solid ${selectedUsers.includes(user.userId) ? '#009efb' : '#e8ecef'}`,
                                        borderRadius: '6px',
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => handleUserSelection(user.userId)}>
                                        <div className="d-flex align-items-center gap-3">
                                          <Input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.userId)}
                                            onChange={() => handleUserSelection(user.userId)}
                                            style={{ transform: 'scale(1.1)' }}
                                          />
                                          <div className="d-flex align-items-center gap-2">
                                            <div style={{
                                              width: '24px',
                                              height: '24px',
                                              backgroundColor: selectedUsers.includes(user.userId) ? '#009efb' : '#6c757d',
                                              borderRadius: '50%',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              fontSize: '10px',
                                              color: 'white',
                                              fontWeight: 'bold'
                                            }}>
                                              {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                                            </div>
                                            <Label className="mb-0" style={{
                                              fontWeight: '500',
                                              color: selectedUsers.includes(user.userId) ? '#009efb' : '#495057',
                                              cursor: 'pointer'
                                            }}>
                                              {user.firstName} {user.lastName}
                                            </Label>
                                          </div>
                                        </div>
                                      </div>
                                    )) : (
                                      <div className="text-center py-4">
                                        <i className="fas fa-users text-muted" style={{ fontSize: '32px', opacity: 0.5 }}></i>
                                        <p className="text-muted mt-2 mb-0">No users found</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardBody>
                            </Card>
                          </Col>
                        </Row>
                        <Row>
                          <Col md="12">
                            <Card style={{
                              borderRadius: '12px',
                              boxShadow: '0 2px 15px rgba(0,0,0,0.06)',
                              border: '1px solid #e8ecef'
                            }}>
                              <CardBody style={{ padding: '20px' }}>
                                <div className="user-list-container">
                                  <div className="d-flex justify-content-between mb-4 align-items-center">
                                    <div className="d-flex align-items-center gap-3">
                                      <div className="icon-wrapper" style={{
                                        width: '36px',
                                        height: '36px',
                                        background: '#009efb',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 3px 10px rgba(0, 158, 251, 0.3)'
                                      }}>
                                        <i className="fas fa-building text-white" style={{ fontSize: '16px' }}></i>
                                      </div>
                                      <div>
                                        <h5 className="mb-0" style={{ fontWeight: '600', color: '#2c3e50' }}>Link Departments</h5>
                                        <p className="text-muted mb-0 small">Connect departments to this GL Account</p>
                                      </div>
                                    </div>
                                    <div style={{ minWidth: '200px' }}>
                                      <div className="search-wrapper" style={{ position: 'relative' }}>
                                        <input
                                          type="text"
                                          value={searchDepartmentTerm}
                                          onChange={handleDepartmentSearchInputChange}
                                          placeholder="Search departments..."
                                          className="form-control"
                                          style={{
                                            borderRadius: '8px',
                                            border: '1px solid #e3e6ea',
                                            paddingLeft: '35px',
                                            fontSize: '14px',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                          }}
                                        />
                                        <i className="fas fa-search" style={{
                                          position: 'absolute',
                                          left: '10px',
                                          top: '50%',
                                          transform: 'translateY(-50%)',
                                          color: '#6c757d',
                                          fontSize: '12px'
                                        }}></i>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="scrollable-user-list" style={{
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    border: '1px solid #e8ecef',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    backgroundColor: '#fafbfc'
                                  }}>
                                    {departments.length > 0 ? departments.map((department) => (
                                      <div key={department.departmentId} className="form-check" style={{
                                        padding: '10px 12px',
                                        margin: '4px 0',
                                        backgroundColor: selectedDepartments.includes(department.departmentId) ? '#e7f3ff' : '#ffffff',
                                        border: `1px solid ${selectedDepartments.includes(department.departmentId) ? '#009efb' : '#e8ecef'}`,
                                        borderRadius: '6px',
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => handleDepartmentSelection(department.departmentId)}>
                                        <div className="d-flex align-items-center gap-3">
                                          <Input
                                            type="checkbox"
                                            checked={selectedDepartments.includes(department.departmentId)}
                                            onChange={() => handleDepartmentSelection(department.departmentId)}
                                            style={{ transform: 'scale(1.1)' }}
                                          />
                                          <div className="d-flex align-items-center gap-2">
                                            <div style={{
                                              width: '24px',
                                              height: '24px',
                                              backgroundColor: selectedDepartments.includes(department.departmentId) ? '#009efb' : '#6c757d',
                                              borderRadius: '4px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              fontSize: '10px',
                                              color: 'white',
                                              fontWeight: 'bold'
                                            }}>
                                              <i className="fas fa-building" style={{ fontSize: '10px' }}></i>
                                            </div>
                                            <Label className="mb-0" style={{
                                              fontWeight: '500',
                                              color: selectedDepartments.includes(department.departmentId) ? '#009efb' : '#495057',
                                              cursor: 'pointer'
                                            }}>
                                              {department.name}
                                            </Label>
                                          </div>
                                        </div>
                                      </div>
                                    )) : (
                                      <div className="text-center py-4">
                                        <i className="fas fa-building text-muted" style={{ fontSize: '32px', opacity: 0.5 }}></i>
                                        <p className="text-muted mt-2 mb-0">No departments found</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardBody>
                            </Card>
                          </Col>
                        </Row>
                      </>
                    )}
                    <Row>
                      <Col className="d-flex justify-content-end mt-3">
                        <Button
                          color="secondary"
                          onClick={handleCancel}
                          style={{ marginRight: '10px' }}
                        >
                          Back
                        </Button>
                        <Button type="submit" color="primary">
                          Submit
                        </Button>
                      </Col>
                    </Row>
                  </Form>
                )}
              </Formik>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default GLAccountRegistration;
