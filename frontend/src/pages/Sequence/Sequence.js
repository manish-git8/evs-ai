import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Card, CardBody } from 'reactstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as Yup from 'yup';
import { useParams, useNavigate } from 'react-router-dom';
import SequenceService from '../../services/SequenceService';
import { getEntityId } from '../localStorageUtil';

const Sequence = () => {
  const [sequenceName, setSequenceName] = useState('');
  const [sequenceValue, setSequenceValue] = useState('');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const companyId = getEntityId();

  const { sequenceId } = useParams();
  const navigate = useNavigate();

  const sequenceOptions = [
    { value: 'purchase_order', label: 'Purchase Order' },
    { value: 'Voucher', label: 'Voucher' },
    { value: 'grn', label: 'GRN' },
  ];

  const validationSchema = Yup.object({
    sequenceName: Yup.string().required('Sequence name is required'),
    sequenceValue: Yup.number()
      .required('Sequence value is required')
      .min(0, 'Sequence value must be non-negative')
      .integer('Sequence value must be an integer'),
    prefix: Yup.string().max(20, 'Prefix must be 20 characters or less'),
    suffix: Yup.string().max(20, 'Suffix must be 20 characters or less'),
  });

  const [errors, setErrors] = useState({});

  const fetchSequenceData = async () => {
    try {
      const response = await SequenceService.getSequenceById(companyId, sequenceId);
      const { data } = response;
      if (Array.isArray(data) && data.length > 0) {
        const sequenceData = data[0];

        setSequenceName(sequenceData.sequenceName || '');
        setSequenceValue(sequenceData.sequenceValue?.toString() || '');
        setPrefix(sequenceData.prefix || '');
        setSuffix(sequenceData.suffix || '');
      } else {
        console.error('No sequence data found');
        toast.error('No sequence data found');
      }
    } catch (error) {
      console.error('Error fetching sequence data:', error);
      toast.error('Failed to fetch sequence data');
    }
  };
  useEffect(() => {
    if (sequenceId) {
      setIsEditMode(true);
      fetchSequenceData();
    }
  }, [sequenceId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await validationSchema.validate(
        {
          sequenceName,
          sequenceValue: parseInt(sequenceValue, 10),
          prefix,
          suffix,
        },
        { abortEarly: false },
      );
      setErrors({});
    } catch (validationErrors) {
      const errorMessages = {};
      validationErrors.inner.forEach((error) => {
        errorMessages[error.path] = error.message;
      });
      setErrors(errorMessages);
      return;
    }

    const sequenceData = {
      companyId,
      sequenceName,
      sequenceValue: parseInt(sequenceValue, 10),
      prefix: prefix || '',
      suffix: suffix || '',
    };

    setLoading(true);
    try {
      let response;
      if (isEditMode) {
        response = await SequenceService.updateSequence(companyId, sequenceId, sequenceData);
        toast.dismiss();
        toast.success('Sequence updated successfully!', {
          position: 'top-right',
          autoClose: 2000,
        });
      } else {
        response = await SequenceService.saveSequence(sequenceData);
        toast.dismiss();
        toast.success('Sequence saved successfully!', {
          position: 'top-right',
          autoClose: 2000,
        });
      }

      console.log('Response:', response.data);
      setTimeout(() => {
        navigate('/SequenceManagement');
      }, 1000);
      if (!isEditMode) {
        setSequenceName('');
        setSequenceValue('');
        setPrefix('');
        setSuffix('');
      }
    } catch (error) {
      console.error('Error saving sequence:', error);
      toast.dismiss();
      toast.error(`Failed to ${isEditMode ? 'update' : 'save'} sequence.`, {
        position: 'top-right',
        autoClose: 2000,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatSequenceName = (name) => {
    const nameMap = {
      purchase_order: 'Purchase Order',
      Voucher: 'Voucher',
      grn: 'GRN',
    };
    return nameMap[name] || name;
  };

  const handleCancel = () => {
    navigate('/SequenceManagement');
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

      <Row className="mb-4">
        <Col lg="12">
          <Card
            className="welcome-card"
            style={{
              backgroundColor: '#009efb',
              color: 'white',
              border: 'none',
              borderRadius: '15px',
              boxShadow: '0 4px 20px rgba(0, 158, 251, 0.15)',
            }}
          >
            <CardBody className="py-2">
              <Row className="align-items-center">
                <Col md="8">
                  <h3 className="mb-2 fw-bold">
                    <i className="bi bi-list-ol me-2"></i>
                    {isEditMode ? 'Edit Sequence Configuration' : 'Sequence Configuration'}
                  </h3>
                  <p className="mb-0 opacity-90">
                    {isEditMode
                      ? 'Update sequence configuration for your document'
                      : 'Configure sequence numbers for documents with custom prefixes and suffixes for organized numbering'}
                  </p>
                </Col>
                <Col md="4" className="text-end d-none d-md-block">
                  <div
                    className="icon-wrapper"
                    style={{
                      width: '80px',
                      height: '80px',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                    }}
                  >
                    <i className="bi bi-list-ol text-white" style={{ fontSize: '2rem' }}></i>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md="12">
          <Card
            className="enhanced-card"
            style={{
              borderRadius: '15px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: 'none',
            }}
          >
            <CardBody>
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
                    <i className="bi bi-gear text-white"></i>
                  </div>
                  <div>
                    <h4 className="mb-1">
                      {isEditMode ? 'Edit Sequence Settings' : 'Sequence Settings'}
                    </h4>
                    <p className="text-muted mb-0 small">
                      {isEditMode
                        ? 'Modify the sequence configuration'
                        : 'Configure numbering sequences for your documents'}
                    </p>
                  </div>
                </div>
                <div className="sequence-selection-wrapper" style={{ minWidth: '250px' }}>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                  <label htmlFor="sequence-select" className="form-label mb-2 fw-medium">
                    Document Type
                  </label>
                  <select
                    id="sequence-select"
                    className={`form-select ${errors.sequenceName ? 'is-invalid' : ''}`}
                    value={sequenceName}
                    onChange={(e) => setSequenceName(e.target.value)}
                    disabled={isEditMode}
                    style={{
                      borderRadius: '8px',
                      border: '2px solid #e9ecef',
                      padding: '12px 16px',
                      fontSize: '14px',
                      backgroundColor: isEditMode ? '#f8f9fa' : 'white',
                    }}
                  >
                    <option value="" disabled>
                      Choose a sequence type
                    </option>
                    {sequenceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.sequenceName && (
                    <div className="invalid-feedback d-block mt-1">{errors.sequenceName}</div>
                  )}
                  {sequenceName && (
                    <small className="text-muted mt-1 d-block">
                      <i className="bi bi-info-circle me-1"></i>
                      Selected: <strong>{formatSequenceName(sequenceName)}</strong>
                    </small>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div
                  className="form-section mb-4"
                  style={{
                    backgroundColor: '#f8f9fa',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #e9ecef',
                  }}
                >
                  <Row>
                    <Col md={4}>
                      <div className="form-group mb-3">
                        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                        <label htmlFor="sequence-value" className="form-label fw-medium mb-2">
                          {isEditMode ? 'Current Value' : 'Starting Value'}{' '}
                          <span className="text-danger">*</span>
                        </label>
                        <input
                          id="sequence-value"
                          type="number"
                          className={`form-control ${errors.sequenceValue ? 'is-invalid' : ''}`}
                          value={sequenceValue}
                          onChange={(e) => setSequenceValue(e.target.value)}
                          placeholder="e.g., 1001"
                          min="0"
                          style={{
                            borderRadius: '8px',
                            border: '2px solid #e9ecef',
                            padding: '12px 16px',
                            fontSize: '14px',
                          }}
                        />
                        {errors.sequenceValue && (
                          <div className="invalid-feedback">{errors.sequenceValue}</div>
                        )}
                        <small className="text-muted mt-1 d-block">
                          <i className="bi bi-lightbulb me-1"></i>
                          {isEditMode
                            ? 'Current sequence number'
                            : 'The starting number for your sequence'}
                        </small>
                      </div>
                    </Col>

                    <Col md={4}>
                      <div className="form-group mb-3">
                        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                        <label htmlFor="prefix" className="form-label fw-medium mb-2">
                          Prefix (Optional)
                        </label>
                        <input
                          id="prefix"
                          type="text"
                          className={`form-control ${errors.prefix ? 'is-invalid' : ''}`}
                          value={prefix}
                          onChange={(e) => setPrefix(e.target.value)}
                          placeholder="e.g., PO-, INV-"
                          maxLength="20"
                          style={{
                            borderRadius: '8px',
                            border: '2px solid #e9ecef',
                            padding: '12px 16px',
                            fontSize: '14px',
                          }}
                        />
                        {errors.prefix && <div className="invalid-feedback">{errors.prefix}</div>}
                        <small className="text-muted mt-1 d-block">
                          <i className="bi bi-arrow-left me-1"></i>
                          Text before the number
                        </small>
                      </div>
                    </Col>

                    <Col md={4}>
                      <div className="form-group mb-3">
                        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                        <label htmlFor="suffix" className="form-label fw-medium mb-2">
                          Suffix (Optional)
                        </label>
                        <input
                          id="suffix"
                          type="text"
                          className={`form-control ${errors.suffix ? 'is-invalid' : ''}`}
                          value={suffix}
                          onChange={(e) => setSuffix(e.target.value)}
                          placeholder="e.g., -2025, /FY"
                          maxLength="20"
                          style={{
                            borderRadius: '8px',
                            border: '2px solid #e9ecef',
                            padding: '12px 16px',
                            fontSize: '14px',
                          }}
                        />
                        {errors.suffix && <div className="invalid-feedback">{errors.suffix}</div>}
                        <small className="text-muted mt-1 d-block">
                          <i className="bi bi-arrow-right me-1"></i>
                          Text after the number
                        </small>
                      </div>
                    </Col>
                  </Row>
                </div>

                <div
                  className="d-flex justify-content-center gap-3 mt-4 pt-3"
                  style={{
                    borderTop: '1px solid #e9ecef',
                  }}
                >
                  <Button
                    type="button"
                    className="px-4 py-3"
                    onClick={handleCancel}
                    style={{
                      backgroundColor: '#6c757d',
                      borderColor: '#6c757d',
                      borderRadius: '10px',
                      fontWeight: '600',
                      fontSize: '16px',
                      color: 'white',
                    }}
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="px-5 py-3"
                    disabled={loading}
                    style={{
                      backgroundColor: '#009efb',
                      borderColor: '#009efb',
                      borderRadius: '10px',
                      fontWeight: '600',
                      fontSize: '16px',
                      boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseOver={(e) => {
                      if (!loading) {
                        e.target.style.backgroundColor = '#0084d6';
                        e.target.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!loading) {
                        e.target.style.backgroundColor = '#009efb';
                        e.target.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        {isEditMode ? 'Updating...' : 'Saving...'}
                      </>
                    ) : (
                      <>
                        <i className={`bi ${isEditMode ? 'bi-check-circle' : 'bi-save'} me-2`}></i>
                        {isEditMode
                          ? 'Update Sequence Configuration'
                          : 'Save Sequence Configuration'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Sequence;
