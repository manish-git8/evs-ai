import React, { useState, useEffect } from 'react';
import { Card, CardBody, Row, Col, FormGroup, Label, Input, Button } from 'reactstrap';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { useNavigate, useParams } from 'react-router-dom';
import { Formik, ErrorMessage, Form } from 'formik';
import * as Yup from 'yup';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UserService from '../../services/UserService';
import LocationService from '../../services/LocationService';
import { getEntityId } from '../localStorageUtil';

const LocationRegistration = () => {
  const [locationData, setLocationData] = useState(null);
  const companyId = getEntityId();
  const navigate = useNavigate();
  const { locationId } = useParams();
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [userPageSize, setUserPageSize] = useState(10);
  const [userPageNumber, setUserPageNumber] = useState(0);
  const [userSortBy, setUserSortBy] = useState('firstName');
  const [userSortOrder, setUserSortOrder] = useState('asc');

  const locationValidationSchema = Yup.object({
    name: Yup.string().required('Name is required'),
    description: Yup.string().required('Description is required'),
    notes: Yup.string(),
    isActive: Yup.boolean(),
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

      if (locationId) {
        const assignedUsersResponse = await LocationService.getUsersByLocation(
          companyId,
          locationId,
        );
        const assignedUserIds = assignedUsersResponse.data.users.map((user) => user.userId);
        setSelectedUsers(assignedUserIds);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.dismiss();
      toast.error(error.response?.data?.errorMessage || 'Failed to fetch users');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, [companyId, debouncedSearchTerm, userPageSize, userPageNumber, userSortBy, userSortOrder]);

  useEffect(() => {
    if (locationId) {
      const fetchLocationDetails = async () => {
        try {
          const response = await LocationService.getLocationById(companyId, locationId);
          setLocationData(response.data[0]);
          fetchUsers();
        } catch (error) {
          console.error('Error fetching location details:', error);
        }
      };
      fetchLocationDetails();
    }
  }, [companyId, locationId]);

  const handleUserSelection = async (selectedUserId) => {
    const newSelectedUsers = selectedUsers.includes(selectedUserId)
      ? selectedUsers.filter((id) => id !== selectedUserId)
      : [...selectedUsers, selectedUserId];

    setSelectedUsers(newSelectedUsers);

    try {
      const requestBody = {
        locationId,
        users: newSelectedUsers.map((userId) => ({ userId })),
      };
      await LocationService.addUserToLocation(companyId, locationId, requestBody);
      toast.success('Users updated successfully!');

      const assignedUsersResponse = await LocationService.getUsersByLocation(companyId, locationId);
      const assignedUserIds = assignedUsersResponse.data.users.map((user) => user.userId);
      setSelectedUsers(assignedUserIds);
    } catch (error) {
      console.error('Error updating users:', error);
      toast.dismiss();
      toast.error('Failed to update users');
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

      if (locationId) {
        await LocationService.handleUpdateLocation(companyId, locationId, requestBody);
        toast.dismiss();
        toast.success('Location updated successfully!');
      } else {
        await LocationService.handleCreateLocation(companyId, requestBody);
        toast.dismiss();
        toast.success('Location created successfully!');
      }

      setTimeout(() => {
        navigate('/location-management');
      }, 1500);
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.errorMessage || 'An unexpected error occurred');
    }
  };

  const handleCancel = () => {
    navigate('/location-management');
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
          <Card
            className="enhanced-card"
            style={{
              borderRadius: '15px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: 'none',
            }}
          >
            <CardBody style={{ padding: '24px 24px 0 24px' }}>
              <div className="d-flex align-items-center gap-3 mb-4">
                <div
                  className="icon-wrapper"
                  style={{
                    width: '40px',
                    height: '40px',
                    background: '#009efb',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i className="fas fa-map-marker-alt text-white"></i>
                </div>
                <div>
                  <h4 className="mb-1">{locationId ? 'Edit Location' : 'Create New Location'}</h4>
                  <p className="text-muted mb-0 small">
                    {locationId
                      ? 'Update the location details below'
                      : 'Enter the location information to create a new location'}
                  </p>
                </div>
              </div>
            </CardBody>
            <CardBody style={{ padding: '0 24px 24px 24px' }}>
              <Formik
                initialValues={{
                  name: locationData?.name || '',
                  description: locationData?.description || '',
                  notes: locationData?.notes || '',
                  isActive: locationData?.isActive || true,
                }}
                validationSchema={locationValidationSchema}
                onSubmit={handleSubmit}
                enableReinitialize
              >
                {({ values, handleChange, handleBlur, errors, touched }) => (
                  <Form>
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
                            placeholder="Enter Location Name"
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

                    {locationId && (
                      <Row>
                        <Col md="6">
                          <Card>
                            <CardBody>
                              <div className="user-list-container">
                                <div className="d-flex justify-content-between mb-3 align-items-end responsive-container">
                                  <h4>Add User</h4>
                                  <div>
                                    <input
                                      type="text"
                                      value={searchTerm}
                                      onChange={(e) => setSearchTerm(e.target.value)}
                                      placeholder="Search by name..."
                                      className="form-control"
                                    />
                                  </div>
                                </div>

                                <div
                                  className="scrollable-user-list mb-3"
                                  style={{ height: '300px', overflowY: 'auto' }}
                                >
                                  {users.map((user) => (
                                    <div key={user.userId} className="form-check">
                                      <Input
                                        type="checkbox"
                                        checked={selectedUsers.includes(user.userId)}
                                        onChange={() => handleUserSelection(user.userId)}
                                      />
                                      <Label>
                                        {user.firstName} {user.lastName}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </CardBody>
                          </Card>
                        </Col>
                      </Row>
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

export default LocationRegistration;
