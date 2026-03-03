import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, Button, Spinner } from 'reactstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthLogo from '../../layouts/logo/AuthLogo';
import LoginService from '../../services/AuthService';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState('loading'); // loading, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verifyEmail(token);
    } else {
      setVerificationStatus('error');
      setErrorMessage('No verification token provided.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const verifyEmail = async (token) => {
    try {
      await LoginService.verifyEmail(token);
      setVerificationStatus('success');
      toast.success('Email verified successfully!');
    } catch (error) {
      setVerificationStatus('error');
      // After apiClient.formatError: error.data contains response data, error.message contains the message
      const errorMsg = error?.data?.errorMessage || error?.message || 'Verification failed. The link may be invalid or expired.';
      setErrorMessage(errorMsg);
      toast.dismiss();
      toast.error(errorMsg);
    }
  };

  const handleResendVerification = async () => {
    if (!resendEmail || resendCooldown > 0) return;

    setIsResending(true);
    try {
      await LoginService.resendVerificationEmail(resendEmail);
      toast.success('Verification email sent successfully! Please check your inbox.');
      setResendCooldown(60); // 60 second cooldown
    } catch (error) {
      // After apiClient.formatError: error.data contains response data, error.message contains the message
      const errorMsg = error?.data?.errorMessage || error?.message || 'Failed to send verification email.';
      toast.dismiss();
      toast.error(errorMsg);
    } finally {
      setIsResending(false);
    }
  };

  const goToLogin = () => {
    navigate('/login');
  };

  return (
    <div
      className="email-verification-wrapper vh-100"
      style={{ background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)' }}
    >
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover={false}
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
              <CardBody className="p-5 text-center">
                <div className="mb-4">
                  <AuthLogo />
                </div>

                {verificationStatus === 'loading' && (
                  <>
                    <Spinner color="primary" className="mb-3" />
                    <h4 className="text-dark mb-3">Verifying your email...</h4>
                    <p className="text-muted">Please wait while we verify your email address.</p>
                  </>
                )}

                {verificationStatus === 'success' && (
                  <>
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
                    <h4 className="text-success mb-3">Email Verified!</h4>
                    <p className="text-muted mb-4">
                      Your email has been verified successfully. You can now log in to your account.
                    </p>
                    <Button
                      color="primary"
                      className="w-100 py-2"
                      onClick={goToLogin}
                      style={{
                        background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                        border: 'none',
                        borderRadius: '12px',
                      }}
                    >
                      Go to Login
                    </Button>
                  </>
                )}

                {verificationStatus === 'error' && (
                  <>
                    <div
                      className="mb-4"
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
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
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </div>
                    <h4 className="text-danger mb-3">Verification Failed</h4>
                    <p className="text-muted mb-4">{errorMessage}</p>

                    <div className="mb-4">
                      <p className="text-muted small mb-2">Enter your email to resend verification:</p>
                      <input
                        type="email"
                        className="form-control mb-3"
                        placeholder="Enter your email address"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        style={{
                          borderRadius: '12px',
                          border: '2px solid #e8ecef',
                          padding: '12px 16px',
                        }}
                      />
                      <Button
                        color="warning"
                        className="w-100 py-2 mb-3"
                        onClick={handleResendVerification}
                        disabled={isResending || resendCooldown > 0 || !resendEmail}
                        style={{
                          borderRadius: '12px',
                        }}
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
                    </div>

                    <Button
                      color="primary"
                      outline
                      className="w-100 py-2"
                      onClick={goToLogin}
                      style={{
                        borderRadius: '12px',
                      }}
                    >
                      Back to Login
                    </Button>
                  </>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default EmailVerification;
