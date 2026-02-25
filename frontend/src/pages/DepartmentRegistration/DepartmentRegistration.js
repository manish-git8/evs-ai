import React, { useState, useEffect } from 'react';
import { Card, CardBody, Row, Col, FormGroup, Label, Input, Button } from 'reactstrap';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { useNavigate, useParams } from 'react-router-dom';
import { Formik, ErrorMessage, Form, Field } from 'formik';
import * as Yup from 'yup';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UserService from '../../services/UserService';
import DepartmentService from '../../services/DepartmentService';
import GLAccountService from '../../services/GLaccountService';
import { getEntityId } from '../localStorageUtil';

const DepartmentRegistration = () => {
  const [departmentHead, setDepartmentHead] = useState(null);
  const [users, setUsers] = useState([]);
  const [gLAccounts, setGLAccounts] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectGLAccount, setSelectGLAccount] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchGLTerm, setSearchGLTerm] = useState('');
  const [debouncedSearchGLTerm, setDebouncedSearchGLTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [userPageSize, setUserPageSize] = useState(10);
  const [userPageNumber, setUserPageNumber] = useState(0);
  const [userSortBy, setUserSortBy] = useState('firstName');
  const [userSortOrder, setUserSortOrder] = useState('asc');
  const [departmentData, setDepartmentData] = useState(null);
  const companyId = getEntityId();
  const navigate = useNavigate();
  const { departmentId } = useParams();

  const departmentValidationSchema = Yup.object({
    name: Yup.string().required('Name is required'),
    description: Yup.string().required('Description is required'),
    notes: Yup.string(),
    isActive: Yup.boolean(),
    parentId: Yup.number().required('Department Head is required'),
  });

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
    const fetchDepartmentHead = async () => {
      try {
        const pageDto = { pageSize: userPageSize, pageNumber: userPageNumber, sortBy: userSortBy, order: userSortOrder };
        const response = await UserService.fetchAllUsers(companyId, pageDto);
        setDepartmentHead(response?.data?.content || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    const fetchGLAccounts = async () => {
      try {
        const response = await GLAccountService.getAllGLAccount(companyId);
        setGLAccounts(response.data);
      } catch (error) {
        console.error('Error fetching GL accounts:', error);
        toast.dismiss();
        toast.error('Failed to fetch GL accounts');
      }
    };

    fetchGLAccounts();
    fetchDepartmentHead();
  }, [companyId]);

  useEffect(() => {
    fetchUsers();
  }, [debouncedSearchTerm]);

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  useEffect(() => {
    const fetchGLAccountsBySearch = async () => {
      try {
        if (debouncedSearchGLTerm.trim() === '') {
          const response = await GLAccountService.getAllGLAccount(companyId);
          setGLAccounts(response.data);
        } else {
          const response = await GLAccountService.getGLAccountBySearch(
            debouncedSearchGLTerm,
            companyId,
          );
          setGLAccounts(response.data);
        }
      } catch (error) {
        console.error('Error fetching GL accounts by search:', error);
        toast.dismiss();
        toast.error('Failed to fetch GL accounts');
      }
    };

    fetchGLAccountsBySearch();
  }, [debouncedSearchGLTerm, companyId]);

  const handleGLAccountSearchInputChange = (event) => {
    setSearchGLTerm(event.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchGLTerm(searchGLTerm);
    }, 1500);
    return () => clearTimeout(timer);
  }, [searchGLTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (departmentId) {
      const fetchDepartmentDetails = async () => {
        try {
          const response = await DepartmentService.getByIdDepartment(companyId, departmentId);
          setDepartmentData(response.data[0]);

          const usersResponse = await DepartmentService.getUsersForDepartment(
            companyId,
            departmentId,
          );
          const assignedUserIds = usersResponse.data.users.map((user) => user.userId);
          setSelectedUsers(assignedUserIds);

          const glResponse = await DepartmentService.getgLAccountForDepartment(
            companyId,
            departmentId,
          );
          const assignedGLAccountIds = glResponse.data.map((gl) => gl.glAccountId);
          setSelectGLAccount(assignedGLAccountIds);
        } catch (error) {
          console.error('Error fetching department details:', error);
        }
      };

      fetchDepartmentDetails();
    }
  }, [companyId, departmentId]);

  const handleSubmit = async (values) => {
    try {
      const requestBody = {
        name: values.name,
        description: values.description,
        notes: values.notes,
        companyId,
        isActive: values.isActive,
        parentId: values.parentId,
      };

      if (departmentId) {
        await DepartmentService.handleUpdateDepartment(companyId, departmentId, requestBody);
        toast.dismiss();
        toast.success('Department updated successfully!');
      } else {
        await DepartmentService.handleCreateDeparment(companyId, requestBody);
        toast.dismiss();
        toast.success('Department created successfully!');
      }

      setTimeout(() => {
        navigate('/department-management');
      }, 1000);
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

  const handleGLAccountSelection = async (glAccountId) => {
    const newSelectedGLAccounts = selectGLAccount.includes(glAccountId)
      ? selectGLAccount.filter((id) => id !== glAccountId)
      : [...selectGLAccount, glAccountId];

    setSelectGLAccount(newSelectedGLAccounts);

    try {
      const requestBody = newSelectedGLAccounts.map((id) => ({
        glAccountId: id,
      }));

      await DepartmentService.handleAddGLAccountToDeparment(companyId, requestBody, departmentId);
    } catch (error) {
      console.error('Error updating GL accounts:', error);
    }
  };

  const handleUserSelection = async (selectedUserId) => {
    const newSelectedUsers = selectedUsers.includes(selectedUserId)
      ? selectedUsers.filter((id) => id !== selectedUserId)
      : [...selectedUsers, selectedUserId];

    setSelectedUsers(newSelectedUsers);

    try {
      const requestBody = {
        departmentId,
        users: newSelectedUsers.map((userId) => ({ userId })),
      };
      await DepartmentService.handleAddUserToDeparment(companyId, requestBody, departmentId);
    } catch (error) {
      console.error('Error updating users:', error);
      toast.dismiss();
      toast.error('Failed to update user');
    }
  };

  const handleCancel = () => {
    navigate('/department-management');
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
                  <i className="fas fa-building text-white"></i>
                </div>
                <div>
                  <h4 className="mb-1">{departmentId ? 'Edit Department' : 'Create New Department'}</h4>
                  <p className="text-muted mb-0 small">
                    {departmentId ? 'Update the department details below' : 'Enter the department information to create a new department'}
                  </p>
                </div>
              </div>
            </CardBody>
            <CardBody style={{ padding: '0 24px 24px 24px' }}>
              <Formik
                initialValues={{
                  name: departmentData?.name || '',
                  description: departmentData?.description || '',
                  notes: departmentData?.notes || '',
                  isActive: departmentData?.isActive || true,
                  parentId: departmentData?.parentId || '',
                }}
                validationSchema={departmentValidationSchema}
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
                            placeholder="Enter Department Name"
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
                          <Label>
                            Department Head<span className="text-danger">*</span>
                          </Label>
                          <Field
                            as="select"
                            name="parentId"
                            className={`form-control${
                              errors.parentId && touched.parentId ? ' is-invalid' : ''
                            }`}
                          >
                            <option value="">Please Select Department Head</option>
                            {(departmentHead || []).map((user) => (
                              <option key={user.userId} value={user.userId}>
                                {`${user.firstName} ${user.lastName}`}
                              </option>
                            ))}
                          </Field>

                          <ErrorMessage
                            name="parentId"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row>
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
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Description<span className="text-danger">*</span>
                          </Label>
                          <textarea
                            name="description"
                            value={values.description}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Enter Description"
                            className={`form-control${
                              touched.description && errors.description ? ' is-invalid' : ''
                            }`}
                            style={{ height: '100px', resize: 'none' }}
                            maxLength={200}
                          />
                          <ErrorMessage
                            name="description"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    {departmentId && (
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
                                        <p className="text-muted mb-0 small">Select users to associate with this department</p>
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
                                        <i className="fas fa-calculator text-white" style={{ fontSize: '16px' }}></i>
                                      </div>
                                      <div>
                                        <h5 className="mb-0" style={{ fontWeight: '600', color: '#2c3e50' }}>Link GL Accounts</h5>
                                        <p className="text-muted mb-0 small">Connect GL accounts to this department</p>
                                      </div>
                                    </div>
                                    <div style={{ minWidth: '200px' }}>
                                      <div className="search-wrapper" style={{ position: 'relative' }}>
                                        <input
                                          type="text"
                                          value={searchGLTerm}
                                          onChange={handleGLAccountSearchInputChange}
                                          placeholder="Search GL accounts..."
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
                                    {gLAccounts.length > 0 ? gLAccounts.map((gl) => (
                                      <div key={gl.glAccountId} className="form-check" style={{
                                        padding: '10px 12px',
                                        margin: '4px 0',
                                        backgroundColor: selectGLAccount.includes(gl.glAccountId) ? '#e7f3ff' : '#ffffff',
                                        border: `1px solid ${selectGLAccount.includes(gl.glAccountId) ? '#009efb' : '#e8ecef'}`,
                                        borderRadius: '6px',
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => handleGLAccountSelection(gl.glAccountId)}>
                                        <div className="d-flex align-items-center gap-3">
                                          <Input
                                            type="checkbox"
                                            checked={selectGLAccount.includes(gl.glAccountId)}
                                            onChange={() => handleGLAccountSelection(gl.glAccountId)}
                                            style={{ transform: 'scale(1.1)' }}
                                          />
                                          <div className="d-flex align-items-center gap-2">
                                            <div style={{
                                              width: '24px',
                                              height: '24px',
                                              backgroundColor: selectGLAccount.includes(gl.glAccountId) ? '#009efb' : '#6c757d',
                                              borderRadius: '4px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              fontSize: '10px',
                                              color: 'white',
                                              fontWeight: 'bold'
                                            }}>
                                              <i className="fas fa-calculator" style={{ fontSize: '10px' }}></i>
                                            </div>
                                            <Label className="mb-0" style={{
                                              fontWeight: '500',
                                              color: selectGLAccount.includes(gl.glAccountId) ? '#009efb' : '#495057',
                                              cursor: 'pointer'
                                            }}>
                                              {gl.name}
                                            </Label>
                                          </div>
                                        </div>
                                      </div>
                                    )) : (
                                      <div className="text-center py-4">
                                        <i className="fas fa-calculator text-muted" style={{ fontSize: '32px', opacity: 0.5 }}></i>
                                        <p className="text-muted mt-2 mb-0">No GL accounts found</p>
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

export default DepartmentRegistration;
