import React, { useState, useEffect } from 'react';
import { Button, FormGroup, Container, Row, Col, Card, CardBody, Label, Modal, ModalHeader, ModalBody, ModalFooter, Spinner } from 'reactstrap';
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
import getRedirectPathForUser from '../../utils/loginHelperUtils';
import '../../css/Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

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
    entityType: Yup.string().required('Please select a login type'),
  });

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (!resendEmail || resendCooldown > 0) return;

    setIsResending(true);
    try {
      await LoginService.resendVerificationEmail(resendEmail);
      toast.success('Verification email sent successfully! Please check your inbox.');
      setResendCooldown(60);
      setShowResendModal(false);
    } catch (error) {
      const errorMsg = error.response?.data?.errorMessage || error.response?.data?.message || 'Failed to send verification email.';
      toast.error(errorMsg);
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      const response = await LoginService.handleLogin({
        email: values.email,
        password: values.password,
        entityType: values.entityType,
      });

      const { jwtToken, requirePasswordChange } = response;

      if (jwtToken) {
        const decodedToken = jwtDecode(jwtToken);
        const { entityId } = decodedToken;
        localStorage.setItem('entityId', entityId);
        localStorage.setItem('userDetails', JSON.stringify(decodedToken));

        // Check if password change is required (legacy SHA-256 users)
        if (requirePasswordChange) {
          toast.info('For security reasons, please update your password.');
          navigate('/reset-password');
          return;
        }

        const redirectPath = getRedirectPathForUser({
          entityType: decodedToken.entityType,
          roles: decodedToken.ROLE || [],
        });

        navigate(redirectPath);
      }
    } catch (error) {
      toast.dismiss();
      const errorMessage = error.response?.data?.errorMessage || error.response?.data?.message || 'An unexpected error occurred';

      // Handle specific error cases
      if (errorMessage.toLowerCase().includes('locked')) {
        toast.error('Your account has been locked due to too many failed login attempts. Please try again in 30 minutes or contact support.');
      } else if (errorMessage.toLowerCase().includes('email not verified') || errorMessage.toLowerCase().includes('verify your email')) {
        toast.error('Please verify your email before logging in.');
        setResendEmail(values.email);
        setShowResendModal(true);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="login-wrapper vh-100"
      style={{ background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)' }}
    >
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
            lg="6"
            className="d-flex align-items-center justify-content-center p-0 d-none d-lg-flex"
            style={{
              background: 'linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div className="text-center w-100 h-100 d-flex flex-column align-items-center justify-content-center position-relative">
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                }}
              />
              <div className="position-relative z-index-1">
                <img
                  src="./LoginImage.jpg"
                  alt="Welcome illustration"
                  className="img-fluid mb-4"
                  style={{
                    maxHeight: '400px',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.2))',
                  }}
                />
                <h2 className="text-white mb-3 fw-bold">Welcome Back!</h2>
                <p className="text-white opacity-75 fs-5">
                  Access your procurement dashboard with ease
                </p>
              </div>
            </div>
          </Col>
          <Col lg="6" className="d-flex align-items-center justify-content-center p-4">
            <Card
              className="login-card border-0 w-100 shadow-lg"
              style={{
                maxWidth: '450px',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <CardBody className="p-5">
                <div className="text-center mb-4">
                  <AuthLogo />
                  <h3 className="fw-bold text-dark mt-3 mb-2">{t('Login')}</h3>
                  <p className="text-muted">Sign in to your account</p>
                </div>
                <Formik
                  initialValues={initialValues}
                  validationSchema={validationSchema}
                  onSubmit={handleSubmit}
                >
                  {({ errors, touched, isSubmitting }) => (
                    <Form>
                      <FormGroup className="mb-4">
                        <Label htmlFor="email" className="form-label fw-semibold text-dark">
                          Email Address
                        </Label>
                        <Field
                          name="email"
                          type="text"
                          id="email"
                          placeholder="Enter your email address"
                          className={`form-control form-control-lg${
                            errors.email && touched.email ? ' is-invalid' : ''
                          }`}
                          style={{
                            borderRadius: '12px',
                            border: '2px solid #e8ecef',
                            padding: '12px 16px',
                            fontSize: '16px',
                            transition: 'all 0.3s ease',
                            background: 'rgba(255, 255, 255, 0.9)',
                          }}
                          maxLength={200}
                        />
                        <ErrorMessage name="email" component="div" className="invalid-feedback" />
                      </FormGroup>

                      <FormGroup className="mb-4">
                        <Label htmlFor="password" className="form-label fw-semibold text-dark">
                          Password
                        </Label>

                        <div className="password-wrapper position-relative">
                          <Field
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            placeholder="Enter your password"
                            className={`form-control form-control-lg ${
                              errors.password && touched.password ? 'is-invalid' : ''
                            }`}
                            style={{
                              borderRadius: '12px',
                              border: '2px solid #e8ecef',
                              padding: '12px 50px 12px 16px',
                              fontSize: '16px',
                              height: '52px',
                              background: 'rgba(255,255,255,0.9)',
                            }}
                          />

                          <span
                            className="eye-icon"
                            onClick={() => setShowPassword((prev) => !prev)}
                          >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                          </span>
                        </div>
                        <ErrorMessage name="password" component="div" className="password-error" />
                      </FormGroup>

                      <FormGroup tag="fieldset" className="mb-4">
                        <legend className="col-form-label fw-semibold text-dark mb-3">
                          Login as
                        </legend>
                        <div className="d-flex gap-3">
                          <Label
                            check
                            className="d-flex align-items-center p-3 border rounded-3 flex-fill cursor-pointer"
                            style={{
                              transition: 'all 0.3s ease',
                              border: '2px solid #e8ecef !important',
                              background: 'rgba(255, 255, 255, 0.5)',
                            }}
                          >
                            <Field
                              type="radio"
                              name="entityType"
                              value="company"
                              className="me-2"
                            />
                            <span className="fw-medium">Company</span>
                          </Label>
                          <Label
                            check
                            className="d-flex align-items-center p-3 border rounded-3 flex-fill cursor-pointer"
                            style={{
                              transition: 'all 0.3s ease',
                              border: '2px solid #e8ecef !important',
                              background: 'rgba(255, 255, 255, 0.5)',
                            }}
                          >
                            <Field
                              type="radio"
                              name="entityType"
                              value="supplier"
                              className="me-2"
                            />
                            <span className="fw-medium">Supplier</span>
                          </Label>
                        </div>
                        <ErrorMessage
                          name="entityType"
                          component="div"
                          className="text-danger small mt-2"
                        />
                      </FormGroup>
                      <div className="text-end mb-3">
                        <a
                          href="/forgot-password"
                          className="text-decoration-none small"
                          style={{ color: '#009efb' }}
                        >
                          Forgot Password?
                        </a>
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-100 py-3 fw-bold"
                        style={{
                          background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                          border: 'none',
                          borderRadius: '12px',
                          fontSize: '16px',
                          letterSpacing: '0.5px',
                          transition: 'all 0.3s ease',
                          transform: isSubmitting ? 'scale(0.98)' : 'scale(1)',
                          boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
                        }}
                      >
                        {isSubmitting ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm me-2"
                              role="status"
                              aria-hidden="true"
                            ></span>
                            Signing In...
                          </>
                        ) : (
                          'Sign In'
                        )}
                      </Button>
                    </Form>
                  )}
                </Formik>
                {/* <div className="text-center mt-3">
                  <p>or login with</p>
                  <div className="d-flex justify-content-center">
                    <Button color="primary" className="me-2">
                      <i className="bi bi-facebook"></i> Facebook
                    </Button>
                    <Button color="danger" className="me-2">
                      <i className="bi bi-google"></i> Google
                    </Button>
                    <Button color="info">
                      <i className="bi bi-twitter"></i> Twitter
                    </Button>
                  </div>
                </div> */}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Resend Verification Email Modal */}
      <Modal isOpen={showResendModal} toggle={() => setShowResendModal(false)} centered>
        <ModalHeader toggle={() => setShowResendModal(false)}>
          Email Not Verified
        </ModalHeader>
        <ModalBody>
          <p>Your email address has not been verified yet. Please check your inbox for the verification email or request a new one.</p>
          <div className="mb-3">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="Enter your email address"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowResendModal(false)}>
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={handleResendVerification}
            disabled={isResending || resendCooldown > 0 || !resendEmail}
          >
            {isResending ? (
              <>
                <Spinner size="sm" className="me-2" />
                Sending...
              </>
            ) : resendCooldown > 0 ? (
              `Resend in ${resendCooldown}s`
            ) : (
              'Resend Verification Email'
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default Login;
