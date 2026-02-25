import React, { useState } from 'react';
import { Container, Row, Col, Card, CardBody, Button, FormGroup, Label, Spinner } from 'reactstrap';
import { Formik, Field, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthLogo from '../../layouts/logo/AuthLogo';
import LoginService from '../../services/AuthService';

// Password requirements checker
const checkPasswordRequirements = (password) => {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
  };
};

// Password strength indicator component
const PasswordStrengthIndicator = ({ password }) => {
  const requirements = checkPasswordRequirements(password || '');
  const metCount = Object.values(requirements).filter(Boolean).length;

  const getStrengthColor = () => {
    if (metCount <= 1) return '#dc3545';
    if (metCount <= 2) return '#fd7e14';
    if (metCount <= 3) return '#ffc107';
    return '#28a745';
  };

  const getStrengthText = () => {
    if (metCount <= 1) return 'Weak';
    if (metCount <= 2) return 'Fair';
    if (metCount <= 3) return 'Good';
    return 'Strong';
  };

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="d-flex align-items-center mb-2">
        <div
          style={{
            flex: 1,
            height: '4px',
            backgroundColor: '#e9ecef',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${(metCount / 4) * 100}%`,
              height: '100%',
              backgroundColor: getStrengthColor(),
              transition: 'all 0.3s ease',
            }}
          />
        </div>
        <span
          className="ms-2 small"
          style={{ color: getStrengthColor(), fontWeight: 500, minWidth: '50px' }}
        >
          {getStrengthText()}
        </span>
      </div>
      <div className="small">
        <div style={{ color: requirements.minLength ? '#28a745' : '#6c757d' }}>
          {requirements.minLength ? '\u2713' : '\u2717'} At least 8 characters
        </div>
        <div style={{ color: requirements.hasUppercase ? '#28a745' : '#6c757d' }}>
          {requirements.hasUppercase ? '\u2713' : '\u2717'} One uppercase letter
        </div>
        <div style={{ color: requirements.hasLowercase ? '#28a745' : '#6c757d' }}>
          {requirements.hasLowercase ? '\u2713' : '\u2717'} One lowercase letter
        </div>
        <div style={{ color: requirements.hasNumber ? '#28a745' : '#6c757d' }}>
          {requirements.hasNumber ? '\u2713' : '\u2717'} One number
        </div>
      </div>
    </div>
  );
};

const ResetPasswordWithToken = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const token = searchParams.get('token');

  const initialValues = {
    newPassword: '',
    confirmPassword: '',
  };

  const validationSchema = Yup.object().shape({
    newPassword: Yup.string()
      .min(8, 'Password must be at least 8 characters')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
        'Password must have at least 8 characters with uppercase, lowercase, and numbers'
      )
      .required('New password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('newPassword')], 'Passwords must match')
      .required('Please confirm your password'),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    if (!token) {
      toast.error('Invalid reset link. Please request a new password reset.');
      return;
    }

    try {
      await LoginService.resetPasswordWithToken(token, values.newPassword);
      setResetSuccess(true);
      toast.success('Password reset successful! You can now login with your new password.');
    } catch (error) {
      const errorMsg = error.response?.data?.errorMessage ||
                       error.response?.data?.message ||
                       'Failed to reset password. The link may have expired.';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div
        className="reset-password-wrapper vh-100"
        style={{ background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)' }}
      >
        <Container fluid className="vh-100 d-flex align-items-center justify-content-center">
          <Row className="justify-content-center w-100">
            <Col md="6" lg="4">
              <Card
                className="border-0 shadow-lg"
                style={{
                  borderRadius: '20px',
                  background: 'rgba(255, 255, 255, 0.95)',
                }}
              >
                <CardBody className="p-5 text-center">
                  <AuthLogo />
                  <h4 className="text-danger mt-4 mb-3">Invalid Reset Link</h4>
                  <p className="text-muted mb-4">
                    This password reset link is invalid or has expired.
                    Please request a new password reset.
                  </p>
                  <Button
                    color="primary"
                    onClick={() => navigate('/forgot-password')}
                    style={{
                      background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                      border: 'none',
                      borderRadius: '12px',
                    }}
                  >
                    Request New Reset Link
                  </Button>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <div
      className="reset-password-wrapper vh-100"
      style={{ background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)' }}
    >
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
      />
      <Container fluid className="vh-100 d-flex align-items-center justify-content-center">
        <Row className="justify-content-center w-100">
          <Col md="6" lg="4">
            <Card
              className="border-0 shadow-lg"
              style={{
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <CardBody className="p-5">
                <div className="text-center mb-4">
                  <AuthLogo />
                  <h3 className="fw-bold text-dark mt-3 mb-2">Reset Password</h3>
                  <p className="text-muted">
                    {resetSuccess
                      ? 'Your password has been reset successfully'
                      : 'Enter your new password'}
                  </p>
                </div>

                {resetSuccess ? (
                  <div className="text-center">
                    <div
                      className="mb-4"
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                      }}
                    >
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <h5 className="text-success mb-3">Password Reset Successful!</h5>
                    <p className="text-muted mb-4">
                      Your password has been reset. You can now login with your new password.
                    </p>
                    <Button
                      color="primary"
                      className="w-100 py-2"
                      onClick={() => navigate('/login')}
                      style={{
                        background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                        border: 'none',
                        borderRadius: '12px',
                      }}
                    >
                      Go to Login
                    </Button>
                  </div>
                ) : (
                  <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                  >
                    {({ errors, touched, isSubmitting, values }) => (
                      <Form>
                        <FormGroup className="mb-4">
                          <Label htmlFor="newPassword" className="form-label fw-semibold text-dark">
                            New Password
                          </Label>
                          <div className="position-relative">
                            <Field
                              name="newPassword"
                              type={showPassword ? 'text' : 'password'}
                              id="newPassword"
                              placeholder="Enter new password"
                              className={`form-control form-control-lg ${
                                errors.newPassword && touched.newPassword ? 'is-invalid' : ''
                              }`}
                              style={{
                                borderRadius: '12px',
                                border: '2px solid #e8ecef',
                                padding: '12px 50px 12px 16px',
                                fontSize: '16px',
                              }}
                            />
                            <span
                              className="position-absolute"
                              style={{
                                right: '15px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                cursor: 'pointer',
                                color: '#6c757d',
                              }}
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </span>
                          </div>
                          <PasswordStrengthIndicator password={values.newPassword} />
                          <ErrorMessage name="newPassword" component="div" className="text-danger small mt-1" />
                        </FormGroup>

                        <FormGroup className="mb-4">
                          <Label htmlFor="confirmPassword" className="form-label fw-semibold text-dark">
                            Confirm Password
                          </Label>
                          <div className="position-relative">
                            <Field
                              name="confirmPassword"
                              type={showConfirmPassword ? 'text' : 'password'}
                              id="confirmPassword"
                              placeholder="Confirm new password"
                              className={`form-control form-control-lg ${
                                errors.confirmPassword && touched.confirmPassword ? 'is-invalid' : ''
                              }`}
                              style={{
                                borderRadius: '12px',
                                border: '2px solid #e8ecef',
                                padding: '12px 50px 12px 16px',
                                fontSize: '16px',
                              }}
                            />
                            <span
                              className="position-absolute"
                              style={{
                                right: '15px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                cursor: 'pointer',
                                color: '#6c757d',
                              }}
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                            </span>
                          </div>
                          <ErrorMessage name="confirmPassword" component="div" className="text-danger small mt-1" />
                        </FormGroup>

                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-100 py-3 fw-bold"
                          style={{
                            background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '16px',
                          }}
                        >
                          {isSubmitting ? (
                            <>
                              <Spinner size="sm" className="me-2" />
                              Resetting...
                            </>
                          ) : (
                            'Reset Password'
                          )}
                        </Button>
                      </Form>
                    )}
                  </Formik>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default ResetPasswordWithToken;
