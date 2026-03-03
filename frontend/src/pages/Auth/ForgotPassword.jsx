import React, { useState } from 'react';
import { Container, Row, Col, Card, CardBody, Button, FormGroup, Label, Spinner } from 'reactstrap';
import { Formik, Field, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthLogo from '../../layouts/logo/AuthLogo';
import LoginService from '../../services/AuthService';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [emailSent, setEmailSent] = useState(false);

  const initialValues = {
    email: '',
  };

  const validationSchema = Yup.object().shape({
    email: Yup.string()
      .email('Please enter a valid email address')
      .required('Email is required'),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await LoginService.forgotPassword(values.email);
      setEmailSent(true);
      toast.success('Password reset link has been sent to your email.');
    } catch (error) {
      // After apiClient.formatError: error.data contains response data, error.message contains the message
      const errorMsg = error?.data?.errorMessage ||
                       error?.message ||
                       'Failed to send reset email. Please check your email and try again.';
      toast.dismiss();
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="forgot-password-wrapper vh-100"
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
                  <h3 className="fw-bold text-dark mt-3 mb-2">Forgot Password</h3>
                  <p className="text-muted">
                    {emailSent
                      ? 'Check your email for the reset link'
                      : 'Enter your email to receive a password reset link'}
                  </p>
                </div>

                {emailSent ? (
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
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                    </div>
                    <h5 className="text-success mb-3">Email Sent!</h5>
                    <p className="text-muted mb-4">
                      We've sent a password reset link to your email.
                      Please check your inbox and follow the instructions.
                    </p>
                    <p className="text-muted small mb-4">
                      The link will expire in 30 minutes.
                    </p>
                    <Button
                      color="primary"
                      className="w-100 py-2 mb-3"
                      onClick={() => navigate('/login')}
                      style={{
                        background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                        border: 'none',
                        borderRadius: '12px',
                      }}
                    >
                      Back to Login
                    </Button>
                    <Button
                      color="link"
                      className="w-100"
                      onClick={() => setEmailSent(false)}
                    >
                      Didn't receive email? Try again
                    </Button>
                  </div>
                ) : (
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
                            type="email"
                            id="email"
                            placeholder="Enter your registered email"
                            className={`form-control form-control-lg ${
                              errors.email && touched.email ? 'is-invalid' : ''
                            }`}
                            style={{
                              borderRadius: '12px',
                              border: '2px solid #e8ecef',
                              padding: '12px 16px',
                              fontSize: '16px',
                            }}
                          />
                          <ErrorMessage name="email" component="div" className="invalid-feedback" />
                        </FormGroup>

                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-100 py-3 fw-bold mb-3"
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
                              Sending...
                            </>
                          ) : (
                            'Send Reset Link'
                          )}
                        </Button>

                        <Button
                          color="link"
                          className="w-100"
                          onClick={() => navigate('/login')}
                        >
                          Back to Login
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

export default ForgotPassword;
