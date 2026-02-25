import { React, useState } from 'react';
import { Button, FormGroup, Container, Row, Col, Card, CardBody, Label } from 'reactstrap';
import { Formik, Field, Form, ErrorMessage } from 'formik';
import { jwtDecode } from 'jwt-decode';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import AuthLogo from '../../layouts/logo/AuthLogo';
import LoginService from '../../services/AuthService';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const initialValues = {
    email: '',
    password: '',
    entityType: '',
  };

  const validationSchema = Yup.object().shape({
    email: Yup.string().email('Email is invalid').required('Email is required'),
    password: Yup.string()
      .min(6, 'Password must be at least 6 characters')
      .required('Password is required'),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    console.log('btn click:', values);
    try {
      const response = await LoginService.handleLogin({
        email: values.email,
        password: values.password,
        entityType: 'admin',
      });
      console.log('Form values:', values);
      const { jwtToken } = response;

      if (jwtToken) {
        const decodedToken = jwtDecode(jwtToken);
        const { entityId, entityType } = decodedToken;
        localStorage.setItem('entityId', entityId);
        localStorage.setItem('userDetails', JSON.stringify(decodedToken));

        if (entityType === 'COMPANY') {
          navigate('/dashboard');
        } else if (entityType === 'SUPPLIER') {
          navigate('/supplier-dashboard');
        } else if (entityType === 'ADMIN') {
          navigate('/company-management');
        } else {
          toast.dismiss();
          toast.error('Invalid entity type');
        }
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.errorMessage || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-wrapper vh-100">
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
      <Container fluid className="vh-100 d-flex p-0">
        <Row className="w-100 h-100 m-0">
          <Col
            md="6"
            className="d-flex align-items-center justify-content-center p-0"
            style={{ backgroundColor: 'rgb(97 182 210)' }}
          >
            <div className="text-center w-100 h-100 d-flex align-items-center justify-content-center">
              <img
                src="./LoginImage.jpg"
                alt="Lightbulb illustration"
                className="img-fluid"
                style={{ maxHeight: '70%', objectFit: 'contain' }}
              />
            </div>
          </Col>
          <Col md="6" className="d-flex align-items-center justify-content-center p-5">
            <Card
              className="login-card border-0 w-100"
              style={{ maxWidth: '400px', boxShadow: 'none' }}
            >
              <CardBody>
                <AuthLogo />
                <h4 className="text-center mb-3">{t('Admin Login')}</h4>{' '}
                <Formik
                  initialValues={initialValues}
                  validationSchema={validationSchema}
                  onSubmit={handleSubmit}
                >
                  {({ errors, touched, isSubmitting }) => (
                    <Form>
                      <FormGroup className="mb-3">
                        <Label htmlFor="email" className="form-label">
                          Email Address
                        </Label>
                        <Field
                          name="email"
                          type="text"
                          id="email"
                          placeholder="Email Address"
                          className={`form-control${
                            errors.email && touched.email ? ' is-invalid' : ''
                          }`}
                        />
                        <ErrorMessage name="email" component="div" className="invalid-feedback" />
                      </FormGroup>
                      <FormGroup className="mb-3">
                        <Label htmlFor="password" className="form-label">
                          Password
                        </Label>

                        <div className="position-relative">
                          <Field
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            placeholder="Password"
                            className={`form-control ${
                              errors.password && touched.password ? 'is-invalid' : ''
                            }`}
                            maxLength={200}
                          />

                          {/* Eye Icon */}
                          <span
                            className="position-absolute"
                            style={{
                              right: errors.password && touched.password ? '36px' : '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              cursor: 'pointer',
                              zIndex: 10,
                              color: '#6c757d',
                              transition: 'right 0.2s ease',
                            }}
                            onClick={() => setShowPassword((prev) => !prev)}
                          >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                          </span>
                        </div>

                        <ErrorMessage
                          name="password"
                          component="div"
                          className="invalid-feedback"
                        />
                      </FormGroup>

                      {/* <FormGroup className="d-flex justify-content-between align-items-center mb-3">
                        <Label htmlFor="remember" className="form-label">
                          <Input type="checkbox" id="remember" className="me-2" />
                          Remember me
                        </Label>
                        <a href="/auth/forgotPwd" className="text-decoration-none small">
                          Forgot Password?
                        </a>
                      </FormGroup> */}

                      <Button
                        type="submit"
                        color="primary"
                        disabled={isSubmitting}
                        className="w-100 py-2"
                      >
                        {isSubmitting ? 'Logging in...' : 'Login'}
                      </Button>

                      {/* <p className="text-center mt-4">
                        Don&apos;t have an account?{' '}
                        <a href="/register" className="text-decoration-none">
                          Register here
                        </a>
                      </p> */}
                    </Form>
                  )}
                </Formik>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default AdminLogin;
