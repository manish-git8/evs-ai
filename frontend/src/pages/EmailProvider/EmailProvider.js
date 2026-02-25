import React, { useState, useEffect, useRef } from 'react';
import { Label, Button, FormGroup, Input, Card, CardHeader, CardBody, Row, Col } from 'reactstrap';
import { Formik, Form as FormikForm, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { useNavigate, useParams } from 'react-router-dom';
import SupplierService from '../../services/SupplierService';
import TemplateService from '../../services/TemplateService';
import { getEntityId } from '../localStorageUtil';

const EmailProvider = () => {
  const { providerId } = useParams();
  const [isEditMode, setIsEditMode] = useState(false);
  const formikRef = useRef();
  const navigate = useNavigate();

  const initialValues = {
    host: '',
    port: '',
    userName: '',
    password: '',
    authentication: true,
    encryptionType: 'TLS',
    priority: 1,
    isActive: true,
  };

  const validationSchema = Yup.object({
    host: Yup.string().required('Host is required'),
    port: Yup.number()
      .required('Port is required')
      .min(1, 'Port must be between 1 and 65535')
      .max(65535, 'Port must be between 1 and 65535'),
    userName: Yup.string().required('Username is required'),
    password: Yup.string().required('Password is required'),
    encryptionType: Yup.string().required('Encryption type is required'),
    priority: Yup.number().required('Priority is required').min(1, 'Priority must be at least 1'),
  });

  const encryptionTypes = [
    { value: 'TLS', label: 'TLS' },
    { value: 'SSL', label: 'SSL' },
    { value: 'STARTTLS', label: 'STARTTLS' },
  ];

  const companyId = getEntityId();

  const fetchProviderDetails = async (id, setValues) => {
    try {
      const response = await SupplierService.getSupplierById(id);

      if (response.data) {
        setValues({
          host: response.data.host || '',
          port: response.data.port || 587,
          userName: response.data.userName || '',
          password: response.data.password || '',
          authentication: response.data.authentication || true,
          encryptionType: response.data.encryptionType || 'TLS',
          priority: response.data.priority || 1,
          isActive: response.data.isActive || true,
        });
      }
    } catch (error) {
      console.error('Error fetching email provider details:', error);
      toast.error('Failed to load email provider details');
    }
  };

  useEffect(() => {
    if (providerId && formikRef.current) {
      setIsEditMode(true);
      fetchProviderDetails(providerId, formikRef.current.setValues);
    }
  }, [providerId]);

  const handleSubmit = async (values) => {
    try {
      let response;
      const requestBody = {
        host: values.host,
        port: values.port,
        userName: values.userName,
        password: values.password,
        authentication: values.authentication,
        encryptionType: values.encryptionType,
        priority: values.priority,
        isActive: values.isActive,
      };

      if (isEditMode) {
        response = await TemplateService.createEmailProvider(companyId, providerId, requestBody);
      } else {
        response = await TemplateService.createEmailProvider(companyId, requestBody);
      }

      if (response.status === 201) {
        await Swal.fire({
          icon: 'success',
          title: 'Success',
          text: `Email provider ${isEditMode ? 'updated' : 'created'} successfully!`,
          timer: 1500,
          showConfirmButton: false,
        });
        navigate('/Email-Provider-Management');
      }
    } catch (error) {
      console.error('Error saving email provider:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: (error && error.response && error.response.data && error.response.data.errorMessage) || 'Failed to save email provider.',
      });
    }
  };

  const handleBack = () => {
    navigate('/Email-Provider-Management');
  };

  return (
    <div style={{ paddingTop: '20px' }}>
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

      {/* Enhanced Header Section */}
      <Row className="mb-4">
        <Col lg="12">
          <Card className="welcome-card" style={{
            backgroundColor: '#009efb',
            color: 'white',
            border: 'none',
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0, 158, 251, 0.15)'
          }}>
            <CardBody className="py-4">
              <Row className="align-items-center">
                <Col md="8">
                  <h3 className="mb-2 fw-bold">
                    <i className="bi bi-gear me-2"></i>
                    {isEditMode ? 'Configure Email Provider' : 'Setup New Email Provider'}
                  </h3>
                  <p className="mb-0 opacity-90">
                    {isEditMode 
                      ? 'Update your SMTP configuration settings for reliable email delivery'
                      : 'Configure your SMTP server settings to enable email notifications and communications'
                    }
                  </p>
                </Col>
                <Col md="4" className="text-end d-none d-md-block">
                  <div className="icon-wrapper" style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto'
                  }}>
                    <i className="bi bi-gear text-white" style={{ fontSize: '2rem' }}></i>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Formik
        innerRef={formikRef}
        initialValues={initialValues}
        enableReinitialize
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ errors, touched }) => (
          <FormikForm>
            <Card className="enhanced-card" style={{
              borderRadius: '15px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: 'none'
            }}>
              <CardHeader className="border-0" style={{ 
                backgroundColor: 'transparent',
                paddingBottom: '0'
              }}>
                <div className="d-flex align-items-center gap-3 p-3">
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
                    <i className="fas fa-cog text-white"></i>
                  </div>
                  <div>
                    <h4 className="mb-1">SMTP Configuration</h4>
                    <p className="text-muted mb-0 small">Configure your email server settings</p>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="p-4">
                {/* Connection Settings Section */}
                <div className="section-divider mb-3">
                  <h6 className="section-title text-primary mb-2">
                    <i className="bi bi-link me-2"></i>
                    Connection Settings
                  </h6>
                  <Row>
                    <Col md={6}>
                      <FormGroup className="mb-2">
                        <Label for="host" className="form-label fw-medium">
                          <i className="bi bi-hdd-network me-1 text-muted"></i>
                          SMTP Host <span className="text-danger">*</span>
                        </Label>
                        <Field
                          id="host"
                          name="host"
                          as={Input}
                          type="text"
                          placeholder="e.g., smtp.gmail.com"
                          className={`form-control ${errors.host && touched.host ? 'is-invalid' : ''}`}
                          style={{
                            borderRadius: '8px',
                            border: '2px solid #e9ecef',
                            padding: '10px 14px',
                            fontSize: '14px'
                          }}
                        />
                        <ErrorMessage name="host" component="div" className="invalid-feedback" />
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup className="mb-2">
                        <Label for="port" className="form-label fw-medium">
                          <i className="bi bi-outlet me-1 text-muted"></i>
                          Port <span className="text-danger">*</span>
                        </Label>
                        <Field
                          id="port"
                          name="port"
                          as={Input}
                          type="number"
                          placeholder="e.g., 587"
                          className={`form-control ${errors.port && touched.port ? 'is-invalid' : ''}`}
                          style={{
                            borderRadius: '8px',
                            border: '2px solid #e9ecef',
                            padding: '10px 14px',
                            fontSize: '14px'
                          }}
                        />
                        <ErrorMessage name="port" component="div" className="invalid-feedback" />
                      </FormGroup>
                    </Col>
                  </Row>
                </div>

                {/* Authentication Section */}
                <div className="section-divider mb-3">
                  <h6 className="section-title text-primary mb-2">
                    <i className="fas fa-key me-2"></i>
                    Authentication
                  </h6>
                  <Row>
                    <Col md={6}>
                      <FormGroup className="mb-2">
                        <Label for="userName" className="form-label fw-medium">
                          <i className="bi bi-person me-1 text-muted"></i>
                          Username <span className="text-danger">*</span>
                        </Label>
                        <Field
                          id="userName"
                          name="userName"
                          as={Input}
                          type="text"
                          placeholder="your-email@example.com"
                          className={`form-control ${errors.userName && touched.userName ? 'is-invalid' : ''}`}
                          style={{
                            borderRadius: '8px',
                            border: '2px solid #e9ecef',
                            padding: '10px 14px',
                            fontSize: '14px'
                          }}
                        />
                        <ErrorMessage name="userName" component="div" className="invalid-feedback" />
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup className="mb-2">
                        <Label for="password" className="form-label fw-medium">
                          <i className="bi bi-shield-lock me-1 text-muted"></i>
                          Password <span className="text-danger">*</span>
                        </Label>
                        <Field
                          id="password"
                          name="password"
                          as={Input}
                          type="password"
                          placeholder="••••••••"
                          className={`form-control ${errors.password && touched.password ? 'is-invalid' : ''}`}
                          style={{
                            borderRadius: '8px',
                            border: '2px solid #e9ecef',
                            padding: '10px 14px',
                            fontSize: '14px'
                          }}
                        />
                        <ErrorMessage name="password" component="div" className="invalid-feedback" />
                      </FormGroup>
                    </Col>
                  </Row>
                </div>

                {/* Security & Configuration Section */}
                <div className="section-divider mb-3">
                  <h6 className="section-title text-primary mb-2">
                    <i className="fas fa-shield-alt me-2"></i>
                    Security & Configuration
                  </h6>
                  <Row>
                    <Col md={6}>
                      <FormGroup className="mb-2">
                        <Label for="encryptionType" className="form-label fw-medium">
                          <i className="bi bi-shield-lock me-1 text-muted"></i>
                          Encryption Type <span className="text-danger">*</span>
                        </Label>
                        <Field
                          as={Input}
                          type="select"
                          id="encryptionType"
                          name="encryptionType"
                          className={`form-control ${
                            errors.encryptionType && touched.encryptionType ? 'is-invalid' : ''
                          }`}
                          style={{
                            borderRadius: '8px',
                            border: '2px solid #e9ecef',
                            padding: '10px 14px',
                            fontSize: '14px'
                          }}
                        >
                          {encryptionTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </Field>
                        <ErrorMessage
                          name="encryptionType"
                          component="div"
                          className="invalid-feedback"
                        />
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup className="mb-2">
                        <Label for="priority" className="form-label fw-medium">
                          <i className="bi bi-sort-numeric-up me-1 text-muted"></i>
                          Priority <span className="text-danger">*</span>
                        </Label>
                        <Field
                          id="priority"
                          name="priority"
                          as={Input}
                          type="number"
                          min="1"
                          placeholder="1 (highest priority)"
                          className={`form-control ${errors.priority && touched.priority ? 'is-invalid' : ''}`}
                          style={{
                            borderRadius: '8px',
                            border: '2px solid #e9ecef',
                            padding: '10px 14px',
                            fontSize: '14px'
                          }}
                        />
                        <small className="text-muted">Lower numbers indicate higher priority</small>
                        <ErrorMessage name="priority" component="div" className="invalid-feedback" />
                      </FormGroup>
                    </Col>
                  </Row>
                </div>

                {/* Settings Section */}
                <div className="section-divider mb-3">
                  <h6 className="section-title text-primary mb-2">
                    <i className="fas fa-toggle-on me-2"></i>
                    Provider Settings
                  </h6>
                  <Row>
                    <Col md={6}>
                      <div className="custom-control-wrapper p-2" style={{
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #e9ecef'
                      }}>
                        <FormGroup check className="mb-0">
                          <Label check className="d-flex align-items-center">
                            <Field type="checkbox" name="authentication" as={Input} className="me-2" />
                            <div>
                              <span className="fw-medium">Require Authentication</span>
                              <small className="d-block text-muted">Enable SMTP authentication for secure connection</small>
                            </div>
                          </Label>
                        </FormGroup>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="custom-control-wrapper p-2" style={{
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #e9ecef'
                      }}>
                        <FormGroup check className="mb-0">
                          <Label check className="d-flex align-items-center">
                            <Field type="checkbox" name="isActive" as={Input} className="me-2" />
                            <div>
                              <span className="fw-medium">Active Provider</span>
                              <small className="d-block text-muted">Enable this email provider for sending emails</small>
                            </div>
                          </Label>
                        </FormGroup>
                      </div>
                    </Col>
                  </Row>
                </div>

                {/* Action Buttons */}
                <div className="d-flex justify-content-end gap-3 mt-3 pt-2" style={{
                  borderTop: '1px solid #e9ecef'
                }}>
                  <Button
                    color="secondary"
                    onClick={handleBack}
                    className="px-4 py-2"
                    style={{
                      borderRadius: '8px',
                      fontWeight: '500'
                    }}
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    Back
                  </Button>
                  <Button 
                    color="primary" 
                    type="submit" 
                    className="px-4 py-2"
                    style={{
                      backgroundColor: '#009efb',
                      borderColor: '#009efb',
                      borderRadius: '8px',
                      fontWeight: '500',
                      boxShadow: '0 2px 8px rgba(0, 158, 251, 0.2)'
                    }}
                  >
                    <i className={`bi ${isEditMode ? 'bi-save' : 'bi-plus-lg'} me-2`}></i>
                    {isEditMode ? 'Update Provider' : 'Create Provider'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          </FormikForm>
        )}
      </Formik>
    </div>
  );
};

export default EmailProvider;
