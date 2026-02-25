import React, { useEffect, useState } from 'react';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { Card, CardBody, Row, Col, FormGroup, Label, Input, Button } from 'reactstrap';
import { useNavigate } from 'react-router-dom';
import { Formik, Form } from 'formik';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getEntityId } from '../localStorageUtil';
import CompanySettingsService from '../../services/CompanySettingsService';
import CompanyService from '../../services/CompanyService';

const CompanySettings = () => {
  const companyId = getEntityId();
  const navigate = useNavigate();
  const [initialValues, setInitialValues] = useState({
    gLAccountEnabled: true,
    departmentEnabled: true,
    projectEnabled: '',
    locationEnabled: '',
    classEnabled: '',
  });

  const fetchCompanySettings = async () => {
    try {
      const response = await CompanyService.getCompanySetting(companyId);
      if (response.data) {
        const { settingsId, ...filteredData } = response.data;
        setInitialValues({
          ...filteredData,
          gLAccountEnabled: true,
          departmentEnabled: true,
        });
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

  useEffect(() => {
    fetchCompanySettings();
  }, [companyId]);

  const handleSubmit = async (values) => {
    values.companyId = companyId;
    try {
      await CompanySettingsService.handleCreateCompanySettings(companyId, values);
      fetchCompanySettings();
    } catch (error) {
      console.error('Failed to update company settings', error);
    }
  };

  const handleCheckboxChange = async (field, value, setFieldValue) => {
    setFieldValue(field, value);
    const updatedValues = { ...initialValues, [field]: value };
    await handleSubmit(updatedValues);
  };

  const handleCancel = () => {
    navigate('/dashboard');
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
                      backgroundColor: '#009efb',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid rgba(0, 158, 251, 0.1)',
                    }}
                  >
                    <i className="fas fa-cog text-white"></i>
                  </div>
                  <div>
                    <h4 className="mb-1">Company Settings</h4>
                    <p className="text-muted mb-0 small">
                      Configure feature availability and system preferences for your organization
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
            <CardBody style={{ padding: '0 24px 24px 24px' }}>
              <Formik initialValues={initialValues} onSubmit={handleSubmit} enableReinitialize>
                {({ values, setFieldValue }) => (
                  <Form>
                    {/* Feature Settings Section */}
                    <div className="mb-4">
                      <div
                        className="d-flex align-items-center mb-3 px-3 py-2"
                        style={{
                          backgroundColor: '#f8f9fa',
                          borderRadius: '8px',
                          border: '1px solid #e9ecef',
                        }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <i
                            className="fas fa-toggle-on"
                            style={{ color: '#009efb', fontSize: '14px' }}
                          ></i>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#495057' }}>
                            Feature Availability Settings
                          </span>
                        </div>
                      </div>

                      <Row>
                        <Col md="6">
                          <div
                            className="setting-group"
                            style={{
                              background: '#fafbfc',
                              borderRadius: '10px',
                              padding: '20px',
                              border: '1px solid #e8ecef',
                              marginBottom: '16px',
                            }}
                          >
                            <FormGroup check className="mb-3">
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-3">
                                  <div
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      backgroundColor: '#009efb',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      boxShadow: '0 2px 4px rgba(0, 158, 251, 0.2)',
                                    }}
                                  >
                                    <i
                                      className="fas fa-balance-scale"
                                      style={{ color: 'white', fontSize: '14px' }}
                                    ></i>
                                  </div>
                                  <div>
                                    <Label
                                      for="gLAccountEnabled"
                                      check
                                      className="form-check-label mb-0"
                                      style={{ fontSize: '15px', fontWeight: '600' }}
                                    >
                                      GL Account
                                    </Label>
                                    <p className="text-muted mb-0 small">
                                      Enable General Ledger account tracking
                                    </p>
                                  </div>
                                </div>
                                <Input
                                  type="checkbox"
                                  name="gLAccountEnabled"
                                  id="gLAccountEnabled"
                                  checked
                                  disabled
                                  className="form-check-input"
                                  style={{ transform: 'scale(1.3)' }}
                                />
                              </div>
                            </FormGroup>
                          </div>

                          <div
                            className="setting-group"
                            style={{
                              background: '#fafbfc',
                              borderRadius: '10px',
                              padding: '20px',
                              border: '1px solid #e8ecef',
                              marginBottom: '16px',
                            }}
                          >
                            <FormGroup check className="mb-3">
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-3">
                                  <div
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      backgroundColor: '#009efb',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      boxShadow: '0 2px 4px rgba(0, 158, 251, 0.2)',
                                    }}
                                  >
                                    <i
                                      className="fas fa-users-cog"
                                      style={{ color: 'white', fontSize: '14px' }}
                                    ></i>
                                  </div>
                                  <div>
                                    <Label
                                      for="departmentEnabled"
                                      check
                                      className="form-check-label mb-0"
                                      style={{ fontSize: '15px', fontWeight: '600' }}
                                    >
                                      Department
                                    </Label>
                                    <p className="text-muted mb-0 small">
                                      Enable department-based organization
                                    </p>
                                  </div>
                                </div>
                                <Input
                                  type="checkbox"
                                  name="departmentEnabled"
                                  id="departmentEnabled"
                                  checked
                                  disabled
                                  className="form-check-input"
                                  style={{ transform: 'scale(1.3)' }}
                                />
                              </div>
                            </FormGroup>
                          </div>

                          <div
                            className="setting-group"
                            style={{
                              background: '#fafbfc',
                              borderRadius: '10px',
                              padding: '20px',
                              border: '1px solid #e8ecef',
                            }}
                          >
                            <FormGroup check className="mb-3">
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-3">
                                  <div
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      backgroundColor: '#009efb',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      boxShadow: '0 2px 4px rgba(0, 158, 251, 0.2)',
                                    }}
                                  >
                                    <i
                                      className="fas fa-layer-group"
                                      style={{ color: 'white', fontSize: '14px' }}
                                    ></i>
                                  </div>
                                  <div>
                                    <Label
                                      for="classEnabled"
                                      check
                                      className="form-check-label mb-0"
                                      style={{ fontSize: '15px', fontWeight: '600' }}
                                    >
                                      Class
                                    </Label>
                                    <p className="text-muted mb-0 small">
                                      Enable classification system
                                    </p>
                                  </div>
                                </div>
                                <Input
                                  type="checkbox"
                                  name="classEnabled"
                                  id="classEnabled"
                                  checked={values.classEnabled}
                                  onChange={(e) =>
                                    handleCheckboxChange(
                                      'classEnabled',
                                      e.target.checked,
                                      setFieldValue,
                                    )
                                  }
                                  className="form-check-input"
                                  style={{ transform: 'scale(1.3)' }}
                                />
                              </div>
                            </FormGroup>
                          </div>
                        </Col>

                        <Col md="6">
                          <div
                            className="setting-group"
                            style={{
                              background: '#fafbfc',
                              borderRadius: '10px',
                              padding: '20px',
                              border: '1px solid #e8ecef',
                              marginBottom: '16px',
                            }}
                          >
                            <FormGroup check className="mb-3">
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-3">
                                  <div
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      backgroundColor: '#009efb',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      boxShadow: '0 2px 4px rgba(0, 158, 251, 0.2)',
                                    }}
                                  >
                                    <i
                                      className="fas fa-project-diagram"
                                      style={{ color: 'white', fontSize: '14px' }}
                                    ></i>
                                  </div>
                                  <div>
                                    <Label
                                      for="projectEnabled"
                                      check
                                      className="form-check-label mb-0"
                                      style={{ fontSize: '15px', fontWeight: '600' }}
                                    >
                                      Project
                                    </Label>
                                    <p className="text-muted mb-0 small">
                                      Enable project-based tracking
                                    </p>
                                  </div>
                                </div>
                                <Input
                                  type="checkbox"
                                  name="projectEnabled"
                                  id="projectEnabled"
                                  checked={values.projectEnabled}
                                  onChange={(e) =>
                                    handleCheckboxChange(
                                      'projectEnabled',
                                      e.target.checked,
                                      setFieldValue,
                                    )
                                  }
                                  className="form-check-input"
                                  style={{ transform: 'scale(1.3)' }}
                                />
                              </div>
                            </FormGroup>
                          </div>

                          <div
                            className="setting-group"
                            style={{
                              background: '#fafbfc',
                              borderRadius: '10px',
                              padding: '20px',
                              border: '1px solid #e8ecef',
                            }}
                          >
                            <FormGroup check className="mb-3">
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-3">
                                  <div
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      backgroundColor: '#009efb',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      boxShadow: '0 2px 4px rgba(0, 158, 251, 0.2)',
                                    }}
                                  >
                                    <i
                                      className="fas fa-map-pin"
                                      style={{ color: 'white', fontSize: '14px' }}
                                    ></i>
                                  </div>
                                  <div>
                                    <Label
                                      for="locationEnabled"
                                      check
                                      className="form-check-label mb-0"
                                      style={{ fontSize: '15px', fontWeight: '600' }}
                                    >
                                      Location
                                    </Label>
                                    <p className="text-muted mb-0 small">
                                      Enable location-based management
                                    </p>
                                  </div>
                                </div>
                                <Input
                                  type="checkbox"
                                  name="locationEnabled"
                                  id="locationEnabled"
                                  checked={values.locationEnabled}
                                  onChange={(e) =>
                                    handleCheckboxChange(
                                      'locationEnabled',
                                      e.target.checked,
                                      setFieldValue,
                                    )
                                  }
                                  className="form-check-input"
                                  style={{ transform: 'scale(1.3)' }}
                                />
                              </div>
                            </FormGroup>
                          </div>
                        </Col>
                      </Row>
                    </div>
                    <Row>
                      <Col className="d-flex justify-content-end">
                        <Button
                          onClick={handleCancel}
                          className="btn btn-secondary px-4 py-2"
                          style={{
                            backgroundColor: '#6c757d',
                            border: '1px solid #6c757d',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(108, 117, 125, 0.2)',
                            transition: 'all 0.2s ease',
                            color: 'white',
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#5a6268';
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.3)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = '#6c757d';
                            e.target.style.transform = 'translateY(0px)';
                            e.target.style.boxShadow = '0 2px 8px rgba(108, 117, 125, 0.2)';
                          }}
                          onFocus={(e) => {
                            e.target.style.backgroundColor = '#5a6268';
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.3)';
                          }}
                          onBlur={(e) => {
                            e.target.style.backgroundColor = '#6c757d';
                            e.target.style.transform = 'translateY(0px)';
                            e.target.style.boxShadow = '0 2px 8px rgba(108, 117, 125, 0.2)';
                          }}
                        >
                          <i className="fas fa-arrow-left me-2"></i>Back to Dashboard
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

export default CompanySettings;
