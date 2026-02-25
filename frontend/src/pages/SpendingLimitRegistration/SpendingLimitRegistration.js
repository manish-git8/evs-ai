import React, { useEffect, useState } from 'react';
import { Card, CardBody, Row, Col, FormGroup, Label, Input, Button } from 'reactstrap';
import { Formik, ErrorMessage, Form } from 'formik';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useParams, useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import SpendingLimitService from '../../services/SpendingLimitService';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { getEntityId, getUserId } from '../localStorageUtil';
import UserService from '../../services/UserService';

const SpendingLimitRegistration = () => {
  const { spendingLimitId } = useParams();
  const navigate = useNavigate();
  const companyId = getEntityId();
  const currentYear = new Date().getFullYear();

  const [initialValues, setInitialValues] = useState({
    spendingLimitId: '',
    userId: getUserId(),
    companyId: getEntityId(),
    spendingLimit: '',
    approvalLimit: '',
    periodYear: '',
    periodQuarter: '',
    notes: '',
    employeeId: '',
  });

  const [employees, setEmployees] = useState([]);
  const [availableQuarters, setAvailableQuarters] = useState(['0', '1', '2', '3']);

  const validationSchema = Yup.object({
    spendingLimit: Yup.number().required('Spending Limit is required'),
    approvalLimit: Yup.number().required('Approval Limit is required'),
    periodQuarter: Yup.string().required('Quarter is required'),
    userId: Yup.string().required('Employee is required'),
  });

  const fetchEmployees = async () => {
    try {
      const response = await UserService.fetchAllCompanyUsers(companyId);
      setEmployees(response.data?.content || response.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.dismiss();
      toast.error('Error fetching employee data');
    }
  };

  const fetchAvailableQuarters = async (year, userId) => {
    if (!year || !userId) return;
  
    try {
      const response = await SpendingLimitService.getAvailableQuarters(companyId, userId, year);
      const existingQuarters = response.data.map((q) => String(q));
      const allQuarters = ['1', '2', '3', '4'];
      const available = allQuarters.filter((q) => !existingQuarters.includes(q));
      setAvailableQuarters(available);
    } catch (error) {
      console.error('Error fetching quarters:', error);
      toast.dismiss();
      toast.error('Failed to load available quarters');
    }
  };

  const getQuarter = (date) => {
    const month = date.getMonth() + 1;
    if (month >= 1 && month <= 3) return '1';
    if (month >= 4 && month <= 6) return '2';
    if (month >= 7 && month <= 9) return '3';
    if (month >= 10 && month <= 12) return '4';
    return '';
  };

  const fetchSpendingLimitDetails = async (id) => {
    try {
      const response = await SpendingLimitService.getSpendingLimitById(companyId, id);
      const data = response.data[0];
      const periodStartDate = data.periodStartDate ? new Date(data.periodStartDate) : new Date();

      setInitialValues({
        spendingLimitId: data.spendingLimitId || '',
        userId: data.userId || '',
        companyId: data.companyId || '',
        spendingLimit: data.spendingLimit || '',
        approvalLimit: data.approvalLimit || '',
        periodYear: periodStartDate.getFullYear(),
        periodQuarter: getQuarter(periodStartDate),
        notes: data.notes || '',
        employeeId: data.userId || '',
      });
    } catch (error) {
      console.error('Error fetching spending limit data:', error);
      if (error.response && error.response.data && error.response.data.errorMessage) {
        toast.dismiss();
        toast.error(error.response.data.errorMessage);
      } else {
        toast.dismiss();
        toast.error('An unexpected error occurred');
      }
    }
  };

  useEffect(() => {
    if (spendingLimitId) {
      fetchSpendingLimitDetails(spendingLimitId);
    }
    fetchEmployees();
  }, [spendingLimitId]);
  const handleSubmit = async (values) => {
    try {
      const { periodQuarter, periodYear } = values;
      let startDate;
      let endDate;
      const yearToUse = periodYear || currentYear;
      if (periodQuarter === '1') {
        startDate = new Date(Date.UTC(yearToUse, 0, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(yearToUse, 2, 31, 23, 59, 59, 999));
      } else if (periodQuarter === '2') {
        startDate = new Date(Date.UTC(yearToUse, 3, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(yearToUse, 5, 30, 23, 59, 59, 999));
      } else if (periodQuarter === '3') {
        startDate = new Date(Date.UTC(yearToUse, 6, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(yearToUse, 8, 30, 23, 59, 59, 999));
      } else if (periodQuarter === '4') {
        startDate = new Date(Date.UTC(yearToUse, 9, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(yearToUse, 11, 31, 23, 59, 59, 999));
      }
      const formattedValues = {
        ...values,
        periodStartDate: startDate.toISOString(),
        periodEndDate: endDate.toISOString(),
      };

      if (spendingLimitId) {
        await SpendingLimitService.updateSpendingLimit(spendingLimitId, formattedValues);
        toast.dismiss();
        toast.success('Spending Limit updated successfully!');
      } else {
        await SpendingLimitService.createSpendingLimit(formattedValues);
        toast.dismiss();
        toast.success('Spending Limit created successfully!');
      }
      setTimeout(() => {
        navigate('/spendinglimit');
      }, 1500);
    } catch (error) {
      if (error.response && error.response.data && error.response.data.errorMessage) {
        toast.error(error.response.data.errorMessage);
      } else {
        toast.dismiss();
        toast.error('An unexpected error occurred');
      }
    }
  };

  const handleCancel = () => {
    navigate('/spendinglimit');
  };

  return (
    <div className="spending-limit-registration" style={{ paddingTop: '24px' }}>
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
              <i className="fas fa-dollar-sign text-white"></i>
            </div>
            <div>
              <h4 className="mb-1">{spendingLimitId ? 'Edit Spending Limit' : 'Create New Spending Limit'}</h4>
              <p className="text-muted mb-0 small">
                {spendingLimitId ? 'Update the spending limit details below' : 'Set up spending and approval limits for users'}
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
            {({ values, handleChange, handleBlur, errors, touched, setFieldValue }) => (
              <Form>
                <Row>
                  <Col md="6">
                    <FormGroup>
                      <Label>
                        Approval Limit<span className="text-danger">*</span>
                      </Label>
                      <Input
                        type="number"
                        name="approvalLimit"
                        value={values.approvalLimit}
                        onChange={(e) => {
                          if (e.target.value.length <= 15) {
                            handleChange(e);
                          }
                        }}
                        onBlur={handleBlur}
                        placeholder="Enter Approval Limit"
                        className={`form-control${
                          touched.approvalLimit && errors.approvalLimit ? ' is-invalid' : ''
                        }`}
                        maxLength={20}
                      />
                      <ErrorMessage
                        name="approvalLimit"
                        component="div"
                        className="invalid-feedback"
                      />
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label>
                        Spending Limit<span className="text-danger">*</span>
                      </Label>
                      <Input
                        type="number"
                        name="spendingLimit"
                        value={values.spendingLimit}
                        onChange={(e) => {
                          if (e.target.value.length <= 15) {
                            handleChange(e);
                          }
                        }}
                        onBlur={handleBlur}
                        placeholder="Enter Spending Limit"
                        className={`form-control${
                          touched.spendingLimit && errors.spendingLimit ? ' is-invalid' : ''
                        }`}
                        maxLength={20}
                      />
                      <ErrorMessage
                        name="spendingLimit"
                        component="div"
                        className="invalid-feedback"
                      />
                    </FormGroup>
                  </Col>
                </Row>
                <Row>
                  <Col md="6">
                    <FormGroup>
                      <Label>Employee</Label>
                      <Input
                        type="select"
                        name="userId"
                        value={values.userId}
                        onChange={(e) => {
                          handleChange(e);
                          setAvailableQuarters(['1', '2', '3', '4']);
                          setFieldValue('periodYear', '');
                          setFieldValue('periodQuarter', '');
                        }}
                        onBlur={handleBlur}
                        className={`form-control${
                          touched.userId && errors.userId ? ' is-invalid' : ''
                        }`}
                      >
                        <option value="">Select Employee</option>
                        {employees.map((employee) => (
                          <option key={employee.userId} value={employee.userId}>
                            {employee.firstName} {employee.lastName} {`(${employee.email})`}
                          </option>
                        ))}
                      </Input>
                      <ErrorMessage name="userId" component="div" className="invalid-feedback" />
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label>Year<span className="text-danger">*</span></Label>
                      <Input
                        type="select"
                        name="periodYear"
                        value={values.periodYear}
                        onChange={(e) => {
                          const selectedYear = e.target.value;
                          handleChange(e);
                          fetchAvailableQuarters(selectedYear, values.userId);
                        }}
                        onBlur={handleBlur}
                        className={`form-control${touched.periodYear && errors.periodYear ? ' is-invalid' : ''}`}
                        style={{ maxHeight: '50px', overflowY: 'auto' }}
                      >
                        <option value="">Select Year</option>
                          {[...Array(11)].map((_, index) => {
                          const year = new Date().getFullYear() + index;
                          return (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          );
                        })}
                      </Input>
                      <ErrorMessage name="periodYear" component="div" className="invalid-feedback" />
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
                        className={`form-control${
                          touched.notes && errors.notes ? ' is-invalid' : ''
                        }`}
                        placeholder="Enter notes"
                        maxLength={200}
                      />
                      <ErrorMessage name="notes" component="div" className="invalid-feedback" />
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label>
                        Quarter<span className="text-danger">*</span>
                      </Label>
                      <Input
                        type="select"
                        name="periodQuarter"
                        value={values.periodQuarter}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        disabled={!values.periodYear}
                        className={`form-control${
                          touched.periodQuarter && errors.periodQuarter ? ' is-invalid' : ''
                        }`}
                      >
                        <option value="">Select Quarter</option>
                        {availableQuarters.includes('1') && <option value="1">Jan - Mar</option>}
                        {availableQuarters.includes('2') && <option value="2">Apr - Jun</option>}
                        {availableQuarters.includes('3') && <option value="3">Jul - Sep</option>}
                        {availableQuarters.includes('4') && <option value="4">Oct - Dec</option>}                      
                        </Input>
                      <ErrorMessage
                        name="periodQuarter"
                        component="div"
                        className="invalid-feedback"
                      />
                    </FormGroup>
                  </Col>
                </Row>

                <div className="d-flex justify-content-end mt-3">
                  <Button color="secondary" onClick={handleCancel} style={{ marginRight: '10px' }}>
                    Back
                  </Button>
                  <Button type="submit" color="primary">
                    Submit
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </CardBody>
      </Card>
    </div>
  );
};

export default SpendingLimitRegistration;
