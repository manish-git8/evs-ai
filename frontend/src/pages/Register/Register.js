import React, { useEffect, useState } from 'react';
import {
  Button,
  Label,
  FormGroup,
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Input,
  FormText,
} from 'reactstrap';
import { Formik, Field, Form, ErrorMessage } from 'formik';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as Yup from 'yup';
import Select from 'react-select';
import { Link, useNavigate } from 'react-router-dom';
import AuthLogo from '../../layouts/logo/AuthLogo';
import { ReactComponent as LeftBg } from '../../assets/images/bg/login-bgleft.svg';
import { ReactComponent as RightBg } from '../../assets/images/bg/login-bg-right.svg';
import UserService from '../../services/UserService';

const Register = () => {
  const navigate = useNavigate();
  const [parentIds, setParentIds] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [companyId] = useState(24);

  const fetchParentIds = async () => {
    try {
      const response = await UserService.fetchAllUsers();

      const options = response.map((user) => ({
        value: user.userId,
        label: `${user.firstName} ${user.lastName}`,
      }));
      setParentIds(options);
    } catch (error) {
      console.error('Error fetching parent IDs:', error);
    }
  };

  useEffect(() => {
    fetchParentIds();
  }, []);

  const validationSchema = Yup.object({
    firstName: Yup.string().required('First Name is required'),
    lastName: Yup.string().required('Last Name is required'),
    email: Yup.string().email('Invalid email format').required('Email is required'),
    mobile: Yup.string()
      .matches(/^\d+$/, 'Mobile number must be numeric')
      .min(10, 'Mobile number must be at least 10 digits')
      .required('Mobile is required'),
    AddressLine1: Yup.string().required('Address Line 1 is required'),
  });

  const handleSubmit = async (values) => {
    const requestBody = {
      title: values.title,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
      ext: values.ext,
      mobile: values.mobile,
      UserName: values.UserName,
      AddressLine1: values.AddressLine1,
      AddressLine2: values.AddressLine2,
      City: values.City,
      State: values.State,
      postalCode: values.postalCode,
      isActive: true,
      parentId: selectedParentId,
    };

    try {
      const response = await UserService.handleCreateUser(requestBody, companyId);
      console.log('User created:', response);
      toast.dismiss();
      toast.success('User created successfully');
      navigate('/user-management');
    } catch (error) {
      console.error('Error saving user:', error);
      if (error.response && error.response.data && error.response.data.errorMessage) {
        toast.dismiss();
        toast.error(error.response.data.errorMessage);
      } else {
        toast.dismiss();
        toast.error('An unexpected error occurred');
      }
    }
  };

  return (
    <>
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
      <div className="loginBox">
        <LeftBg className="position-absolute left bottom-0" />
        <RightBg className="position-absolute end-0 top" />
        <Container fluid className="h-100">
          <Row className="justify-content-center align-items-center h-100">
            <Col lg="12" className="loginContainer">
              <AuthLogo />
              <Card>
                <CardBody className="p-4 m-1">
                  <h4 className="mb-0 fw-bold">Register</h4>
                  <small className="pb-4 d-block">
                    Already have an account? <Link to="/">Login</Link>
                  </small>

                  <Formik validationSchema={validationSchema} onSubmit={handleSubmit}>
                    {({ errors, touched }) => (
                      <Form>
                        <Row>
                          <Col md="4">
                            <FormGroup>
                              <Label>Title</Label>
                              <Field
                                type="text"
                                name="title"
                                className={`form-control${
                                  errors.title && touched.title ? ' is-invalid' : ''
                                }`}
                                placeholder="Enter Your Title"
                              />
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <FormGroup>
                              <Label>First Name</Label>
                              <Field
                                type="text"
                                name="firstName"
                                className={`form-control${
                                  errors.firstName && touched.firstName ? ' is-invalid' : ''
                                }`}
                                placeholder="Enter Your Name"
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
                              <Label>Last Name</Label>
                              <Field
                                type="text"
                                name="lastName"
                                className={`form-control${
                                  errors.lastName && touched.lastName ? ' is-invalid' : ''
                                }`}
                                placeholder="Enter Your Last Name"
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
                              <Label>Username</Label>
                              <Field
                                type="text"
                                name="UserName"
                                className="form-control"
                                placeholder="Your Username"
                              />
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <FormGroup>
                              <Label>Email</Label>
                              <Field
                                type="email"
                                name="email"
                                className={`form-control${
                                  errors.email && touched.email ? ' is-invalid' : ''
                                }`}
                                placeholder="your.email@example.com"
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
                              <Label>Mobile</Label>
                              <Field
                                type="text"
                                name="mobile"
                                className={`form-control${
                                  errors.mobile && touched.mobile ? ' is-invalid' : ''
                                }`}
                                placeholder="Mobile Number"
                              />
                              <ErrorMessage
                                name="mobile"
                                component="div"
                                className="invalid-feedback"
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                        <Row className='mb-3'>
                          
                          <Col md="4">
                            <FormGroup>
                              <Label>Manager</Label>
                              <Select
                                options={parentIds}
                                value={parentIds.find(
                                  (option) => option.value === selectedParentId,
                                )}
                                onChange={(option) => setSelectedParentId(option.value)}
                                placeholder="Select Manager"
                              />
                            </FormGroup>
                          </Col>
                          <Col md="8">
                            <FormGroup>
                              <Label>Profile Image</Label>
                              <Input type="file" />
                              <FormText className="muted">Upload your profile image</FormText>
                            </FormGroup>
                          </Col>
                        </Row>

                        <Row>
                          <Col md="4">
                            <FormGroup>
                              <Label>Address Line 1</Label>
                              <Field
                                type="text"
                                name="AddressLine1"
                                className={`form-control${
                                  errors.AddressLine1 && touched.AddressLine1 ? ' is-invalid' : ''
                                }`}
                                placeholder="Enter Address Line 1"
                              />
                              <ErrorMessage
                                name="AddressLine1"
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
                                name="AddressLine2"
                                className="form-control"
                                placeholder="Enter Address Line 2"
                              />
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <FormGroup>
                              <Label>City</Label>
                              <Field
                                type="text"
                                name="City"
                                className="form-control"
                                placeholder="Enter City"
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                        <Row>
                          <Col md="4">
                            <FormGroup>
                              <Label>State</Label>
                              <Field
                                type="text"
                                name="State"
                                className="form-control"
                                placeholder="Enter State"
                              />
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <FormGroup>
                              <Label>Postal Code</Label>
                              <Field
                                type="text"
                                name="postalCode"
                                className="form-control"
                                placeholder="Enter Postal Code"
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                        <div className="d-flex justify-content-end">
                          <Button color="primary" type="submit" className="button-spacing">
                            Register
                          </Button>
                        </div>
                      </Form>
                    )}
                  </Formik>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </>
  );
};

export default Register;
