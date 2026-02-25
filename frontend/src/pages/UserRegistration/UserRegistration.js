import React, { useEffect, useState, useRef } from 'react';
import './UserRegistration.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Card, CardBody, Row, Col, FormGroup, Label, Input, FormText, Button } from 'reactstrap';
import { useNavigate, useParams } from 'react-router-dom';
import * as Yup from 'yup';
import { Formik, Form, Field, ErrorMessage, useFormikContext } from 'formik';
import UserService from '../../services/UserService';
import MasterDataService from '../../services/MasterDataService';
import CompanyService from '../../services/CompanyService';
import FileUploadService from '../../services/FileUploadService';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { getUserRole, getEntityType } from '../localStorageUtil';
import getAvailableRoles from '../../utils/roleUtils';

const UserRegistration = () => {
  const navigate = useNavigate();
  const entityType = getEntityType();
  const [userData, setUserData] = useState(null);
  const { userId, companyId, userEntityType } = useParams();
  const [parentIds, setParentIds] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [profileImageId, setProfileImageId] = useState(userData?.profileImageId || null);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const userRoles = getUserRole() || [];
  const isAdmin = userRoles.includes('ADMIN');
  const [setSelectedRole] = useState(userData?.role[0]?.name || '');
  const availableRoles = getAvailableRoles();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await MasterDataService.getAllCountries();
        setCountries(response.data);
      } catch (error) {
        console.error('Error fetching countries:', error);
        toast.dismiss();
        toast.error('Failed to load countries');
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    const fetchStates = async () => {
      if (selectedCountry) {
        try {
          const country = countries.find((c) => c.name === selectedCountry);
          if (country) {
            const response = await MasterDataService.getStatesByCountryId(country.countryId);
            setStates(response.data);
            setCities([]);
          }
        } catch (error) {
          console.error('Error fetching states:', error);
          toast.dismiss();
          toast.error('Failed to load states');
        }
      } else {
        setStates([]);
        setSelectedState('');
        setCities([]);
      }
    };
    fetchStates();
  }, [selectedCountry, countries]);

  useEffect(() => {
    const fetchCities = async () => {
      if (selectedState) {
        try {
          const state = states.find((s) => s.name === selectedState);
          if (state) {
            const response = await MasterDataService.getCitiesByStateId(state.stateId);
            setCities(response.data);
          }
        } catch (error) {
          console.error('Error fetching cities:', error);
          toast.dismiss();
          toast.error('Failed to load cities');
        }
      } else {
        setCities([]);
      }
    };
    fetchCities();
  }, [selectedState, states]);

  const fetchCompanies = async () => {
    try {
      const response = await CompanyService.getAllCompanies();

      const companyList = Array.isArray(response.data)
        ? response.data
        : response.data?.content ?? [];

      setCompanies(companyList);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      const fetchParentIds = async () => {
        try {
          const response = await UserService.fetchAllUsers(selectedCompanyId);
          setParentIds(response.data);
        } catch (error) {
          console.error('Error fetching parent IDs:', error);
        }
      };
      fetchParentIds();
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (isEditMode && userData?.address?.country && countries.length > 0) {
      setSelectedCountry(userData.address.country);
    }
  }, [isEditMode, userData, countries]);

  const fetchUserData = async () => {
    if (!userId) return;

    setIsEditMode(true);
    const response = await UserService.fetchByUserId(companyId, userId, userEntityType);
    setUserData(response);
    setSelectedParentId(response.parentId);

    if (response.role?.length) {
      setSelectedRoles(response.role.map((r) => r.name));
    }

    if (response.address?.country) {
      setSelectedCountry(response.address.country);

      const country = countries.find((c) => c.name === response.address.country);
      if (country) {
        const statesRes = await MasterDataService.getStatesByCountryId(country.countryId);
        setStates(statesRes.data);

        if (response.address.state) {
          setSelectedState(response.address.state);

          const state = statesRes.data.find((s) => s.name === response.address.state);
          if (state) {
            const citiesRes = await MasterDataService.getCitiesByStateId(state.stateId);
            setCities(citiesRes.data);
          }
        }
      }
    }
  };
  useEffect(() => {
    if (userData && userData.role && userData.role.length > 0) {
      const userRoleNames = userData.role.map((role) => role.name);
      setSelectedRoles(userRoleNames);
    }
  }, [userData]);

  useEffect(() => {
    if (companyId && countries.length > 0) {
      setSelectedCompanyId(companyId);
      fetchUserData();
    }
  }, [companyId, userId, countries]);

  const validationSchema = Yup.object({
    companyId: Yup.string().required('Company is required'),
    firstName: Yup.string()
      .test('no-spaces', 'First name cannot contain spaces', (value) => !/\s/.test(value))
      .required('First name is required'),
    lastName: Yup.string()
      .test('no-spaces', 'Last name cannot contain spaces', (value) => !/\s/.test(value))
      .required('Last name is required'),
    email: Yup.string().email('Invalid email format').required('Email is required'),
    mobile: Yup.string()
      .matches(/^\d+$/, 'Mobile number must be numeric')
      .min(10, 'Mobile number must be at least 10 digits')
      .required('Mobile is required'),
    addressLine1: Yup.string().required('Address Line 1 is required'),
    userName: Yup.string().required('User Name is required'),
    country: Yup.string().required('Country is required'),
    state: Yup.string().required('State is required'),
    city: Yup.string().required('City is required'),
    role: Yup.string().test(
      'is-not-empty',
      'Role is required',
      (value) => value && value.trim() !== '',
    ),
    postalCode: Yup.string().required('Postal code is required'),
  });

  const handleFileSelectAndUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file.name);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('fileContent', file, file.name);

      const response = await FileUploadService.uploadFile(selectedCompanyId, file);
      const fileId = response?.data?.fileId;

      if (fileId) {
        toast.success('File uploaded successfully!');
        setProfileImageId(fileId);
      } else {
        toast.error('Upload succeeded but no file ID returned.');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.dismiss();
      toast.error(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (values) => {
    if (!selectedCompanyId) {
      toast.dismiss();
      toast.error('Please select a company');
      return;
    }

    if (!selectedRoles || selectedRoles.length === 0) {
      toast.dismiss();
      toast.error('Please select at least one role');
      return;
    }
    const selectedRoleObjects = availableRoles
      .filter((role) => selectedRoles.includes(role.name))
      .map((role) => ({
        roleId: role.roleId,
        name: role.name,
        isActive: true,
      }));
    const requestBody = {
      userId: userData ? userData.userId : 0,
      title: values.titlePrefix,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      entityId: selectedCompanyId,
      entityType: 'COMPANY',
      phone: values.phone || ' ',
      ext: values.ext || ' ',
      mobile: values.mobile,
      userName: values.userName,
      parentId: selectedParentId || null,
      profileImageId,
      delegateId: null,
      isActive: true,
      delegateStartDate: null,
      delegateEndDate: null,
      delegateSetDate: null,
      userContactType: values.userContactType || 'PRIMARY',
      address: {
        addressId: null,
        companyId: selectedCompanyId,
        addressLine1: values.addressLine1 || null,
        addressLine2: values.addressLine2 || null,
        addressType: 'SHIPPING',
        street: ' ',
        city: values.city || null,
        state: values.state || null,
        postalCode: values.postalCode || null,
        country: values.country || null,
        isoCountryCode: ' ',
      },
      role: selectedRoleObjects,
    };

    try {
      if (userData) {
        await UserService.handleEditUser(requestBody, companyId, userData.userId, entityType).then(
          (response) => {
            console.log('User updated successfully:', response.data);
            toast.dismiss();
            toast.success('User updated successfully!');
            setTimeout(() => {
              navigate('/user-management');
            }, 1500);
          },
        );
      } else {
        await UserService.handleCreateUser(requestBody, selectedCompanyId).then((response) => {
          console.log('User created successfully:', response.data);
          toast.dismiss();
          toast.success('User created successfully!');
          setTimeout(() => {
            navigate('/user-management');
          }, 1500);
        });
      }
    } catch (error) {
      console.error('Error saving user:', error);

      // Don't show toast for 400 errors - apiClient interceptor already handles them
      const status = error.response?.status || error.status;
      if (status === 400) {
        return; // Interceptor already showed the toast
      }

      toast.dismiss();

      const errorMessage =
        error.response?.data?.errorMessage ||
        error.response?.data?.message ||
        error.message ||
        'An unexpected error occurred';

      toast.error(errorMessage);
    }
  };

  const initialValues = {
    companyId: selectedCompanyId || '',
    role: userData && userData.role ? userData.role.map((r) => r.name).join(', ') : '',
    titlePrefix: userData?.title || '',
    firstName: userData?.firstName || '',
    lastName: userData?.lastName || '',
    userName: userData?.userName || '',
    email: userData?.email || '',
    mobile: userData?.mobile || '',
    phone: userData?.phone || '',
    ext: userData?.ext || '',
    addressLine1: userData?.address?.addressLine1 || '',
    addressLine2: userData?.address?.addressLine2 || '',
    city: userData?.address?.city || '',
    state: userData?.address?.state || '',
    postalCode: userData?.address?.postalCode || '',
    country: userData?.address?.country || '',
    userContactType: userData?.userContactType || '',
  };

  const handleCancel = () => {
    navigate('/user-management');
  };

  const handleCountryChange = (e, setFieldValue) => {
    const countryName = e.target.value;
    setSelectedCountry(countryName);
    setFieldValue('country', countryName);
    setFieldValue('state', '');
    setFieldValue('city', '');
    setSelectedState('');
    setStates([]);
    setCities([]);
  };

  const handleStateChange = (e, setFieldValue) => {
    const stateName = e.target.value;
    setSelectedState(stateName);
    setFieldValue('state', stateName);
    setFieldValue('city', '');
    setCities([]);
  };

  const SyncEmailToUsername = () => {
    const { values, setFieldValue } = useFormikContext();
    const prevEmailRef = useRef('');

    useEffect(() => {
      const currentEmail = values?.email || '';
      if (prevEmailRef.current !== currentEmail) {
        setFieldValue('userName', currentEmail);
        prevEmailRef.current = currentEmail;
      }
    }, [values?.email, setFieldValue]);

    return null;
  };

  return (
    <>
      <div className="user-registration-page">
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
        <div className="container-fluid py-4">
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
                      <i className="fas fa-user text-white"></i>
                    </div>
                    <div>
                      <h4 className="mb-1">{userData ? 'Edit User' : 'Create New User'}</h4>
                      <p className="text-muted mb-0 small">
                        {userData
                          ? 'Update the user details below'
                          : 'Enter the user information to create a new user account'}
                      </p>
                    </div>
                  </div>
                </CardBody>
                <CardBody style={{ padding: '0 24px 24px 24px' }}>
                  <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                    enableReinitialize
                  >
                    {({ errors, touched, setFieldValue, values }) => (
                      <Form>
                        <SyncEmailToUsername />
                        <Row>
                          {isAdmin && (
                            <Col md="12">
                              <FormGroup>
                                <Label>
                                  Company<span className="text-danger">*</span>
                                </Label>
                                <Field
                                  as="select"
                                  name="companyId"
                                  disabled={!!companyId}
                                  className={`form-control${
                                    errors.companyId && touched.companyId ? ' is-invalid' : ''
                                  }`}
                                  value={selectedCompanyId}
                                  onChange={(e) => {
                                    setSelectedCompanyId(e.target.value);
                                  }}
                                >
                                  <option value="">Select a Company</option>
                                  {companies.map((company) => (
                                    <option key={company.companyId} value={company.companyId}>
                                      {company.name}
                                    </option>
                                  ))}
                                </Field>
                                <ErrorMessage
                                  name="companyId"
                                  component="div"
                                  className="invalid-feedback"
                                />
                              </FormGroup>
                            </Col>
                          )}
                          <Col md="12">
                            <FormGroup>
                              <Label>
                                Role(s)<span className="text-danger">*</span>
                              </Label>
                              <div
                                className={`dropdown w-100${
                                  errors.role && touched.role ? ' is-invalid' : ''
                                }`}
                                ref={dropdownRef}
                              >
                                <button
                                  type="button"
                                  className="form-control dropdown-toggle d-flex align-items-center justify-content-between"
                                  onClick={() => setIsOpen((prev) => !prev)}
                                  style={{ textAlign: 'left' }}
                                >
                                  {selectedRoles.length > 0
                                    ? selectedRoles.join(', ')
                                    : 'Select Role(s)'}
                                </button>

                                {isOpen && (
                                  <ul
                                    className="dropdown-menu show w-100"
                                    style={{
                                      maxHeight: '200px',
                                      overflowY: 'auto',
                                      padding: '10px',
                                      zIndex: '2',
                                    }}
                                  >
                                    {availableRoles.map((role) => (
                                      <li key={role.roleId} className="form-check mb-2">
                                        <input
                                          type="checkbox"
                                          className="form-check-input"
                                          id={`role-${role.roleId}`}
                                          checked={selectedRoles.includes(role.name)}
                                          onChange={(e) => {
                                            const updatedRoles = e.target.checked
                                              ? [...selectedRoles, role.name]
                                              : selectedRoles.filter((r) => r !== role.name);
                                            setSelectedRoles(updatedRoles);
                                            setFieldValue('role', updatedRoles.join(', '));
                                          }}
                                        />
                                        <label
                                          className="form-check-label"
                                          htmlFor={`role-${role.roleId}`}
                                        >
                                          {role.displayName}
                                        </label>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <ErrorMessage
                                name="role"
                                component="div"
                                className="invalid-feedback d-block"
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                        <Row>
                          <Col md="4">
                            <FormGroup>
                              <Label>Title</Label>
                              <div className="d-flex">
                                <Field as="select" name="titlePrefix" className="form-control">
                                  <option value="">Select</option>
                                  <option value="Mr.">Mr.</option>
                                  <option value="Mrs.">Mrs.</option>
                                  <option value="Miss">Miss</option>
                                  <option value="Ms.">Ms.</option>
                                  <option value="Dr.">Dr.</option>
                                  <option value="Prof.">Prof.</option>
                                </Field>
                              </div>
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <FormGroup>
                              <Label>
                                First Name<span className="text-danger">*</span>
                              </Label>
                              <Field
                                type="text"
                                name="firstName"
                                className={`form-control${
                                  errors.firstName && touched.firstName ? ' is-invalid' : ''
                                }`}
                                placeholder="Enter Your Name"
                                maxLength={75}
                                onKeyDown={(e) => {
                                  if (e.key === ' ') {
                                    e.preventDefault();
                                  }
                                }}
                                onChange={(e) => {
                                  e.target.value = e.target.value.replace(/\s/g, '');
                                  setFieldValue('firstName', e.target.value);
                                }}
                              />
                              <ErrorMessage
                                name="firstName"
                                component="div"
                                className="invalid-feedback"
                              />
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <FormGroup>
                              <Label>
                                Last Name<span className="text-danger">*</span>
                              </Label>
                              <Field
                                type="text"
                                name="lastName"
                                className={`form-control${
                                  errors.lastName && touched.lastName ? ' is-invalid' : ''
                                }`}
                                placeholder="Enter Your Last Name"
                                maxLength={75}
                                onKeyDown={(e) => {
                                  if (e.key === ' ') {
                                    e.preventDefault();
                                  }
                                }}
                                onChange={(e) => {
                                  e.target.value = e.target.value.replace(/\s/g, '');
                                  setFieldValue('lastName', e.target.value);
                                }}
                              />
                              <ErrorMessage
                                name="lastName"
                                component="div"
                                className="invalid-feedback"
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                        <Row>
                          <Col md="4">
                            <FormGroup>
                              <Label>
                                Email<span className="text-danger">*</span>
                              </Label>
                              <Field
                                type="email"
                                name="email"
                                className={`form-control${
                                  errors.email && touched.email ? ' is-invalid' : ''
                                }`}
                                placeholder="your.email@example.com"
                                disabled={!!userId}
                                maxLength={254}
                              />
                              <ErrorMessage
                                name="email"
                                component="div"
                                className="invalid-feedback"
                              />
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <FormGroup>
                              <Label>User Name</Label>
                              <Field
                                type="text"
                                name="userName"
                                className={`form-control${
                                  errors.userName && touched.userName ? ' is-invalid' : ''
                                }`}
                                placeholder="Enter Your User Name"
                                maxLength={50}
                                disabled={!!userId || !!values.email}
                              />
                              <ErrorMessage
                                name="userName"
                                component="div"
                                className="invalid-feedback"
                              />
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <FormGroup>
                              <Label>
                                Mobile<span className="text-danger">*</span>
                              </Label>
                              <Field
                                autoComplete="off"
                                type="tel"
                                name="mobile"
                                className={`form-control${
                                  errors.mobile && touched.mobile ? ' is-invalid' : ''
                                }`}
                                placeholder="Mobile Number"
                                maxLength={10}
                                pattern="[0-9]*"
                                onChange={(e) => {
                                  const numericValue = e.target.value.replace(/\D/g, '');
                                  setFieldValue('mobile', numericValue);
                                }}
                              />
                              <ErrorMessage
                                name="mobile"
                                component="div"
                                className="invalid-feedback"
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                        <Row>
                          <Col md="4">
                            <FormGroup>
                              <Label>Phone</Label>
                              <Field
                                autoComplete="off"
                                name="phone"
                                className="form-control"
                                placeholder="Phone Number"
                                maxLength={10}
                                onKeyDown={(e) => {
                                  if (
                                    !/^[0-9]$/.test(e.key) &&
                                    e.key !== 'Backspace' &&
                                    e.key !== 'Delete' &&
                                    e.key !== 'Tab'
                                  ) {
                                    e.preventDefault();
                                  }
                                }}
                              />
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <FormGroup>
                              <Label>Phone Ext.</Label>
                              <Field
                                type="text"
                                name="ext"
                                className="form-control nowrap"
                                placeholder="Phone Ext."
                                maxLength={5}
                                // pattern="[0-9]*"
                                onKeyDown={(e) => {
                                  if (
                                    !/^[0-9]$/.test(e.key) &&
                                    e.key !== 'Backspace' &&
                                    e.key !== 'Delete' &&
                                    e.key !== 'Tab'
                                  ) {
                                    e.preventDefault();
                                  }
                                }}
                              />
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <FormGroup>
                              <Label>Manager</Label>
                              <Field
                                as="select"
                                name="parentId"
                                className="form-control"
                                value={selectedParentId}
                                onChange={(e) => setSelectedParentId(e.target.value)}
                              >
                                <option value="">Select a Manager</option>
                                {parentIds.map((option) => (
                                  <option key={option.userId} value={option.userId}>
                                    {option.firstName}
                                  </option>
                                ))}
                              </Field>
                            </FormGroup>
                          </Col>
                        </Row>
                        <Row>
                          <Col md="12">
                            <FormGroup>
                              <Label>Profile Image</Label>
                              <div className="d-flex align-items-center">
                                <Input
                                  type="file"
                                  className="flex-grow-1"
                                  style={{ marginRight: '10px' }}
                                  disabled={isUploading}
                                  onChange={handleFileSelectAndUpload}
                                  accept="image/*"
                                />
                              </div>
                              <FormText className="muted">
                                {selectedFile
                                  ? `Selected: ${selectedFile.name}`
                                  : 'Upload your profile image'}
                              </FormText>
                            </FormGroup>
                          </Col>
                        </Row>
                        <CardBody className="mb-3 address-card-body" style={{ padding: '12px' }}>
                          <h4 className="mb-0 text-white">Address</h4>
                        </CardBody>
                        <Row>
                          <Col md="4">
                            <FormGroup>
                              <Label>
                                Country<span className="text-danger">*</span>
                              </Label>
                              <Field
                                as="select"
                                name="country"
                                className={`form-control${
                                  errors.country && touched.country ? ' is-invalid' : ''
                                }`}
                                onChange={(e) => handleCountryChange(e, setFieldValue)}
                                value={values.country}
                              >
                                <option value="">Select Country</option>
                                {countries.map((country) => (
                                  <option key={country.countryId} value={country.name}>
                                    {country.name}
                                  </option>
                                ))}
                              </Field>
                              <ErrorMessage
                                name="country"
                                component="div"
                                className="invalid-feedback"
                              />
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <FormGroup>
                              <Label>
                                State<span className="text-danger">*</span>
                              </Label>
                              <Field
                                as="select"
                                name="state"
                                className={`form-control${
                                  errors.state && touched.state ? ' is-invalid' : ''
                                }`}
                                disabled={!values.country}
                                onChange={(e) => handleStateChange(e, setFieldValue)}
                                value={values.state}
                              >
                                <option value="">Select State</option>
                                {states.map((state) => (
                                  <option key={state.stateId} value={state.name}>
                                    {state.name}
                                  </option>
                                ))}
                              </Field>
                              <ErrorMessage
                                name="state"
                                component="div"
                                className="invalid-feedback"
                              />
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <FormGroup>
                              <Label>
                                City<span className="text-danger">*</span>
                              </Label>
                              <Field
                                as="select"
                                name="city"
                                className={`form-control${
                                  errors.city && touched.city ? ' is-invalid' : ''
                                }`}
                                disabled={!values.state}
                                value={values.city}
                              >
                                <option value="">Select City</option>
                                {cities.map((city) => (
                                  <option key={city.cityId} value={city.name}>
                                    {city.name}
                                  </option>
                                ))}
                              </Field>
                              <ErrorMessage
                                name="city"
                                component="div"
                                className="invalid-feedback"
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                        <Row>
                          <Col md="4">
                            <FormGroup>
                              <Label>
                                Address Line 1<span className="text-danger">*</span>
                              </Label>
                              <Field
                                type="text"
                                name="addressLine1"
                                className={`form-control${
                                  errors.addressLine1 && touched.addressLine1 ? ' is-invalid' : ''
                                }`}
                                placeholder="Enter Address Line 1"
                                maxLength={100}
                              />
                              <ErrorMessage
                                name="addressLine1"
                                component="div"
                                className="invalid-feedback"
                              />
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <FormGroup>
                              <Label>Address Line 2</Label>
                              <Field
                                type="text"
                                name="addressLine2"
                                className="form-control"
                                placeholder="Enter Address Line 2"
                                maxLength={100}
                              />
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <FormGroup>
                              <Label>
                                Postal Code<span className="text-danger">*</span>
                              </Label>
                              <Field
                                type="text"
                                name="postalCode"
                                className={`form-control${
                                  errors.postalCode && touched.postalCode ? ' is-invalid' : ''
                                }`}
                                placeholder="Enter Postal Code"
                                maxLength={15}
                              />
                              <ErrorMessage
                                name="postalCode"
                                component="div"
                                className="invalid-feedback"
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                        <div className="d-flex justify-content-end">
                          <Button
                            color="secondary"
                            onClick={handleCancel}
                            className="button-spacing"
                            style={{ marginRight: '10px' }}
                          >
                            Back
                          </Button>
                          <Button color="primary" type="submit" className="button-spacing">
                            {userData ? 'Update' : 'Submit'}
                          </Button>
                        </div>
                      </Form>
                    )}
                  </Formik>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </div>
      </div>

      <style>{`
        .user-registration-page {
          margin-top: 2rem;
          padding-top: 1rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          min-height: calc(100vh - 120px);
        }
        
        .user-registration-page .container-fluid {
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .user-registration-page .enhanced-card {
          border: none !important;
          border-radius: 16px !important;
          box-shadow: 0 6px 25px rgba(0, 0, 0, 0.08) !important;
          transition: all 0.3s ease;
        }
        
        .user-registration-page .enhanced-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 35px rgba(0, 0, 0, 0.12) !important;
        }
        
        .user-registration-page .icon-wrapper {
          background: linear-gradient(135deg, #009efb, #0056b3) !important;
          box-shadow: 0 4px 15px rgba(0, 158, 251, 0.3);
        }
        
        .user-registration-page h4 {
          color: #009efb;
          font-weight: 600;
        }
        
        .user-registration-page .text-muted {
          color: #6c757d !important;
        }
        
        .user-registration-page .address-card-body {
          background: linear-gradient(135deg, #009efb, #0056b3) !important;
          border-radius: 8px;
          margin: 1.5rem 0 1rem 0;
        }
        
        .user-registration-page .form-control:focus {
          border-color: #009efb;
          box-shadow: 0 0 0 0.2rem rgba(0, 158, 251, 0.25);
        }
        
        .user-registration-page .btn-primary {
          background: linear-gradient(135deg, #009efb, #0056b3);
          border: none;
          border-radius: 8px;
          padding: 0.6rem 1.5rem;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        
        .user-registration-page .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(0, 158, 251, 0.4);
        }
        
        .user-registration-page .btn-secondary {
          border-radius: 8px;
          padding: 0.6rem 1.5rem;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        
        .user-registration-page .dropdown-menu {
          border: none;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        @media (max-width: 768px) {
          .user-registration-page {
            margin-top: 1.5rem;
            padding-top: 0.5rem;
          }
          
          .user-registration-page .container-fluid {
            padding-left: 1rem;
            padding-right: 1rem;
          }
          
          .user-registration-page .enhanced-card {
            margin-bottom: 1rem;
          }
          
          .user-registration-page .card-body {
            padding: 1rem !important;
          }
        }
        
        @media (max-width: 576px) {
          .user-registration-page {
            margin-top: 1rem;
          }
          
          .user-registration-page .icon-wrapper {
            width: 35px !important;
            height: 35px !important;
          }
          
          .user-registration-page h4 {
            font-size: 1.1rem;
          }
        }
      `}</style>
    </>
  );
};

export default UserRegistration;
