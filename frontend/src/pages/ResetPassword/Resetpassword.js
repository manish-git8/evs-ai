import React, { useState } from 'react';
import { Button, FormGroup, Container, Row, Col, Card, CardBody, Label } from 'reactstrap';
import { Formik, Field, Form } from 'formik';
import * as Yup from 'yup';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';
import AuthLogo from '../../layouts/logo/AuthLogo';
import AuthService from '../../services/AuthService';

const RESET_PASSWORD_TEXT = {
  heading: 'Reset Password',
  oldPasswordLabel: 'Old Password',
  newPasswordLabel: 'New Password',
  oldPasswordPlaceholder: 'Old Password',
  newPasswordPlaceholder: 'New Password',
  passwordRequirement:
    'must be at least 8 characters with uppercase, lowercase, and numbers',
  samePasswordError: 'New password must be different from old password',
  successMessage: 'Password reset successful!',
  errorMessage: 'Password reset failed:',
  buttonText: 'Reset Password',
  resettingText: 'Resetting...',
};

const FORM_VALIDATION = {
  minLength: 8,
  passwordPattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
};

const getToggleIconStyle = (hasError) => ({
  right: hasError ? '36px' : '10px',
  top: '50%',
  transform: 'translateY(-50%)',
  cursor: 'pointer',
  zIndex: 10,
  color: '#6c757d',
  transition: 'right 0.2s ease',
});

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

const Resetpassword = () => {
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const navigate = useNavigate();

  const initialValues = {
    oldPassword: '',
    newPassword: '',
  };

  const validationSchema = Yup.object().shape({
    oldPassword: Yup.string()
      .min(6, 'Old Password must be at least 6 characters')
      .required('Old Password is required'),

    newPassword: Yup.string()
      .min(FORM_VALIDATION.minLength, 'New Password must be at least 8 characters')
      .matches(
        FORM_VALIDATION.passwordPattern,
        `New Password ${RESET_PASSWORD_TEXT.passwordRequirement}`,
      )
      .notOneOf([Yup.ref('oldPassword')], RESET_PASSWORD_TEXT.samePasswordError)
      .required('New Password is required'),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await AuthService.resetPassword(values);

      const userDetails = JSON.parse(localStorage.getItem('userDetails'));
      const roles = userDetails?.ROLE || [];

      toast.success(RESET_PASSWORD_TEXT.successMessage, {
        autoClose: 3000,
        onClose: () => {
          if (roles.includes('ADMIN')) navigate('/company-management');
          else if (roles.includes('SUPPLIER_ADMIN')) navigate('/supplier-dashboard');
          else navigate('/dashboard');
        },
      });
    } catch (error) {
      toast.error(`${RESET_PASSWORD_TEXT.errorMessage} ${error?.response?.data?.message || ''}`, {
        autoClose: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ResetPassword">
      <ToastContainer position="top-right" autoClose={3000} />

      <Container>
        <Row className="justify-content-center">
          <Col md="6" lg="4">
            <Card className="border-0 w-100" style={{ maxWidth: '400px' }}>
              <CardBody>
                <div className="d-flex justify-content-center mb-3">
                  <AuthLogo />
                </div>

                <h4 className="text-center mb-4">{RESET_PASSWORD_TEXT.heading}</h4>

                <Formik
                  initialValues={initialValues}
                  validationSchema={validationSchema}
                  onSubmit={handleSubmit}
                  validateOnChange={true}
                  validateOnBlur={true}
                >
                  {({ errors, touched, isSubmitting, values }) => (
                    <Form>
                      <FormGroup className="mb-3">
                        <Label>{RESET_PASSWORD_TEXT.oldPasswordLabel}</Label>
                        <div className="position-relative">
                          <Field
                            name="oldPassword"
                            type={showOldPassword ? 'text' : 'password'}
                            placeholder={RESET_PASSWORD_TEXT.oldPasswordPlaceholder}
                            className={`form-control ${
                              errors.oldPassword && touched.oldPassword ? 'is-invalid' : ''
                            }`}
                          />
                          <span
                            style={getToggleIconStyle(errors.oldPassword && touched.oldPassword)}
                            className="position-absolute"
                            onClick={() => setShowOldPassword((p) => !p)}
                          >
                            {showOldPassword ? <FaEyeSlash /> : <FaEye />}
                          </span>
                        </div>
                        {errors.oldPassword && touched.oldPassword && (
                          <div className="text-danger small mt-1">{errors.oldPassword}</div>
                        )}
                      </FormGroup>

                      <FormGroup className="mb-3">
                        <Label>{RESET_PASSWORD_TEXT.newPasswordLabel}</Label>
                        <div className="position-relative">
                          <Field
                            name="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder={RESET_PASSWORD_TEXT.newPasswordPlaceholder}
                            className={`form-control ${
                              errors.newPassword && values.newPassword ? 'is-invalid' : ''
                            }`}
                          />
                          <span
                            style={getToggleIconStyle(errors.newPassword && values.newPassword)}
                            className="position-absolute"
                            onClick={() => setShowNewPassword((p) => !p)}
                          >
                            {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                          </span>
                        </div>
                        <PasswordStrengthIndicator password={values.newPassword} />
                        {errors.newPassword && values.newPassword && (
                          <div className="text-danger small mt-1">{errors.newPassword}</div>
                        )}
                      </FormGroup>

                      <Button
                        type="submit"
                        color="primary"
                        disabled={isSubmitting}
                        className="w-100 py-2"
                      >
                        {isSubmitting
                          ? RESET_PASSWORD_TEXT.resettingText
                          : RESET_PASSWORD_TEXT.buttonText}
                      </Button>
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

export default Resetpassword;
