import React, { useState, useRef, useEffect } from 'react';
import { Row, Col, Button, Card, CardBody } from 'reactstrap';
import Quill from 'react-quill';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './EmailTemplate.css';
import * as Yup from 'yup';
import TemplateService from '../../services/TemplateService';
import { getEntityId, parseEmails } from '../localStorageUtil';
import 'react-quill/dist/quill.snow.css';

const EmailPo = () => {
  const [subject, setSubject] = useState('');
  const [recipient, setRecipient] = useState('');
  const [ccRecipients, setCcRecipients] = useState('');
  const [bccRecipients, setBccRecipients] = useState('');
  const [content, setContent] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [toEmails, setToEmails] = useState([]);
  const [ccEmails, setCcEmails] = useState([]);
  const [bccEmails, setBccEmails] = useState([]);
  const quillRef = useRef(null);
  const [eventTypes, setEventTypes] = useState([]);
  const [loadingEventTypes, setLoadingEventTypes] = useState(true);
  const validationSchema = Yup.object({
    selectedEvent: Yup.string().required('Event selection is required'),
    subject: Yup.string().required('Subject is required'),
    recipient: Yup.string().required('Recipient email is required'),
  });

  const [errors, setErrors] = useState({});

  // Function to format event types for display
  const formatEventType = (eventType) => {
    const eventTypeMap = {
      'posubmitted': 'PO Submitted',
      'poconfirmed': 'PO Confirmed', 
      'podelivered': 'PO Delivered',
      'pocancelled': 'PO Cancelled',
      'cartcreated': 'Cart Created',
      'cartapproved': 'Cart Approved',
      'cartrejected': 'Cart Rejected',
      'cartsubmitted': 'Cart Submitted',
      'grncreated': 'GRN Created',
      'grnprocessed': 'GRN Processed',
      'rfqcreated': 'RFQ Created',
      'rfqsubmitted': 'RFQ Submitted',
      'rfqclosed': 'RFQ Closed',
      'rfqcancelled': 'RFQ Cancelled',
      'invoicecreated': 'Invoice Created',
      'invoiceapproved': 'Invoice Approved',
      'invoicepaid': 'Invoice Paid',
      'paymentprocessed': 'Payment Processed',
      'userregistered': 'User Registered',
      'passwordreset': 'Password Reset',
      'accountactivated': 'Account Activated'
    };
    
    if (!eventType) return '';
    
    const formattedFromMap = eventTypeMap[eventType.toLowerCase()];
    if (formattedFromMap) return formattedFromMap;
    
    // Fallback formatting for unknown event types
    return eventType
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .replace(/\b\w/g, char => char.toUpperCase()) // Capitalize each word
      .trim();
  };

  const modules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['clean'],
    ],
  };

  const handleToEmailsChange = (e) => {
    const emails = parseEmails(e.target.value);
    setToEmails(emails);
    setRecipient(e.target.value);
  };

  const handleCcEmailsChange = (e) => {
    const emails = parseEmails(e.target.value);
    setCcEmails(emails);
    setCcRecipients(e.target.value);
  };

  const handleBccEmailsChange = (e) => {
    const emails = parseEmails(e.target.value);
    setBccEmails(emails);
    setBccRecipients(e.target.value);
  };

  const handleEventChange = async (e) => {
    const eventValue = e.target.value;
    setSelectedEvent(eventValue);

    if (eventValue) {
      try {
        const companyId = getEntityId();
        const response = await TemplateService.getTemplateByCompanyAndEventName(
          companyId,
          eventValue,
        );

        if (response.data) {
          const template = response.data;

          setSubject(template.subject || '');
          setContent(template.templateForEvent || '');

          if (template.emails && template.emails.length > 0) {
            const templateToEmails = template.emails
              .filter((email) => email.emailType === 'TO')
              .map((email) => email.email);
            const templateCcEmails = template.emails
              .filter((email) => email.emailType === 'CC')
              .map((email) => email.email);
            const templateBccEmails = template.emails
              .filter((email) => email.emailType === 'BCC')
              .map((email) => email.email);

            setRecipient(templateToEmails.join(', '));
            setCcRecipients(templateCcEmails.join(', '));
            setBccRecipients(templateBccEmails.join(', '));
            setToEmails(templateToEmails);
            setCcEmails(templateCcEmails);
            setBccEmails(templateBccEmails);
          }

          toast.success('Template loaded successfully!', {
            position: 'top-right',
            autoClose: 2000,
          });
        }
      } catch (error) {
        console.error('Error fetching template:', error);
      }
    } else {
      setSubject('');
      setContent('');
      setRecipient('');
      setCcRecipients('');
      setBccRecipients('');
      setToEmails([]);
      setCcEmails([]);
      setBccEmails([]);
    }
  };

  useEffect(() => {
    const fetchEventTypes = async () => {
      try {
        const response = await TemplateService.getAllEmailEventTypes();
        if (Array.isArray(response.data)) {
          setEventTypes(response.data);
        } else {
          setEventTypes([]);
        }
        setLoadingEventTypes(false);
      } catch (error) {
        console.error('Error fetching event types:', error);
        setLoadingEventTypes(false);
        toast.error('Failed to load event types');
      }
    };

    fetchEventTypes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await validationSchema.validate(
        {
          selectedEvent,
          subject,
          recipient,
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

    const companyId = getEntityId();
    const emails = [];

    toEmails.forEach((email) => {
      emails.push({ emailType: 'TO', email });
    });

    ccEmails.forEach((email) => {
      emails.push({ emailType: 'CC', email });
    });

    bccEmails.forEach((email) => {
      emails.push({ emailType: 'BCC', email });
    });

    const htmlContent = `
            ${content}
            <p><small> Generated on: ${new Date().toLocaleString()}</small></p>
    `;

    const templateData = {
      companyId,
      templateForEvent: htmlContent,
      event: selectedEvent,
      subject,
      emails,
    };

    try {
      const response = await TemplateService.saveTemplate(companyId, templateData);
      toast.dismiss();
      toast.success('Template saved successfully!', {
        position: 'top-right',
        autoClose: 2000,
      });
      console.log('Response:', response.data);

      setRecipient('');
      setCcRecipients('');
      setBccRecipients('');
      setSubject('');
      setContent('');
      setSelectedEvent('');
      setToEmails([]);
      setCcEmails([]);
      setBccEmails([]);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.dismiss();
      toast.error('Failed to save template.', {
        position: 'top-right',
        autoClose: 2000,
      });
    }
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
      
      {/* Enhanced Header Section */}
      <Row className="mb-4">
        <Col lg="12">
          <Card className="welcome-card" style={{
            backgroundColor: '#009efb',
            color: 'white',
            border: 'none',
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0, 158, 251, 0.15)'
          }}>
            <CardBody className="py-4">
              <Row className="align-items-center">
                <Col md="8">
                  <h3 className="mb-2 fw-bold">
                    <i className="bi bi-envelope-paper me-2"></i>
                    Email Template Designer
                  </h3>
                  <p className="mb-0 opacity-90">
                    Create and customize email templates for automated communications with rich formatting and dynamic content
                  </p>
                </Col>
                <Col md="4" className="text-end d-none d-md-block">
                  <div className="icon-wrapper" style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto'
                  }}>
                    <i className="bi bi-envelope-paper text-white" style={{ fontSize: '2rem' }}></i>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md="12">
          <Card className="enhanced-card" style={{
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: 'none'
          }}>
            <CardBody>
              {/* Header with Event Selection */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div className="icon-wrapper" style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#009efb',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid rgba(0, 158, 251, 0.1)'
                  }}>
                    <i className="bi bi-file-text text-white"></i>
                  </div>
                  <div>
                    <h4 className="mb-1">Template Configuration</h4>
                    <p className="text-muted mb-0 small">Design your email template with custom content and styling</p>
                  </div>
                </div>
                
                {/* Event Selection */}
                <div className="event-selection-wrapper" style={{ minWidth: '250px' }}>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                  <label htmlFor="event-select" className="form-label mb-2 fw-medium">
                    Select Event Type
                  </label>
                  <select
                    id="event-select"
                    className={`form-select ${errors.selectedEvent ? 'is-invalid' : ''}`}
                    value={selectedEvent}
                    onChange={handleEventChange}
                    style={{
                      borderRadius: '8px',
                      border: '2px solid #e9ecef',
                      padding: '12px 16px',
                      fontSize: '14px'
                    }}
                    disabled={loadingEventTypes}
                  >
                    <option value="" disabled>
                      {loadingEventTypes ? 'Loading events...' : 'Choose an event type'}
                    </option>
                    {eventTypes.map((eventType) => (
                      <option key={eventType.type} value={eventType.type}>
                        {formatEventType(eventType.type)}
                      </option>
                    ))}
                  </select>
                  {errors.selectedEvent && (
                    <div className="invalid-feedback d-block mt-1">{errors.selectedEvent}</div>
                  )}
                  {selectedEvent && (
                    <small className="text-muted mt-1 d-block">
                      <i className="bi bi-info-circle me-1"></i>
                      Selected: <strong>{formatEventType(selectedEvent)}</strong>
                    </small>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Recipients Section */}
                <div className="form-section mb-4" style={{
                  backgroundColor: '#f8f9fa',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #e9ecef'
                }}>
                  <h6 className="section-title text-primary mb-3">
                    <i className="bi bi-people me-2"></i>
                    Email Recipients
                  </h6>
                  
                  <Row>
                    <Col md={4}>
                      <div className="form-group mb-3">
                        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                        <label htmlFor="recipient-emails" className="form-label fw-medium mb-2">
                          Recipient Emails (To) <span className="text-danger">*</span>
                        </label>
                        <input
                          id="recipient-emails"
                          type="text"
                          className={`form-control ${errors.recipient ? 'is-invalid' : ''}`}
                          value={recipient}
                          onChange={handleToEmailsChange}
                          placeholder="user@example.com, user2@example.com"
                          style={{
                            borderRadius: '8px',
                            border: '2px solid #e9ecef',
                            padding: '12px 16px',
                            fontSize: '14px'
                          }}
                        />
                        {errors.recipient && (
                          <div className="invalid-feedback">{errors.recipient}</div>
                        )}
                      </div>
                    </Col>
                    
                    <Col md={4}>
                      <div className="form-group mb-3">
                        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                        <label htmlFor="cc-recipients" className="form-label fw-medium mb-2">
                          CC Recipients (Optional)
                        </label>
                        <input
                          id="cc-recipients"
                          type="text"
                          className="form-control"
                          value={ccRecipients}
                          onChange={handleCcEmailsChange}
                          placeholder="cc@example.com"
                          style={{
                            borderRadius: '8px',
                            border: '2px solid #e9ecef',
                            padding: '12px 16px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </Col>
                    
                    <Col md={4}>
                      <div className="form-group mb-3">
                        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                        <label htmlFor="bcc-recipients" className="form-label fw-medium mb-2">
                          BCC Recipients (Optional)
                        </label>
                        <input
                          id="bcc-recipients"
                          type="text"
                          className="form-control"
                          value={bccRecipients}
                          onChange={handleBccEmailsChange}
                          placeholder="bcc@example.com"
                          style={{
                            borderRadius: '8px',
                            border: '2px solid #e9ecef',
                            padding: '12px 16px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </Col>
                  </Row>
                </div>

                {/* Subject Section */}
                <div className="form-section mb-4">
                  <h6 className="section-title text-primary mb-3">
                    <i className="bi bi-tag me-2"></i>
                    Email Subject
                  </h6>
                  <input
                    type="text"
                    className={`form-control ${errors.subject ? 'is-invalid' : ''}`}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter your email subject line"
                    style={{
                      borderRadius: '8px',
                      border: '2px solid #e9ecef',
                      padding: '16px 20px',
                      fontSize: '16px',
                      fontWeight: '500'
                    }}
                  />
                  {errors.subject && (
                    <div className="invalid-feedback">{errors.subject}</div>
                  )}
                </div>

                {/* Content Section */}
                <div className="form-section mb-4">
                  <h6 className="section-title text-primary mb-3">
                    <i className="bi bi-pencil-square me-2"></i>
                    Email Content
                  </h6>
                  <div className="quill-wrapper" style={{
                    border: '2px solid #e9ecef',
                    borderRadius: '12px',
                    overflow: 'hidden'
                  }}>
                    <Quill
                      ref={quillRef}
                      theme="snow"
                      value={content}
                      onChange={setContent}
                      modules={modules}
                      placeholder="Start composing your email template here..."
                      style={{ minHeight: '300px' }}
                    />
                  </div>
                </div>

                {/* Action Button */}
                <div className="d-flex justify-content-center mt-4 pt-3" style={{
                  borderTop: '1px solid #e9ecef'
                }}>
                  <Button 
                    type="submit" 
                    className="px-5 py-3"
                    style={{
                      backgroundColor: '#009efb',
                      borderColor: '#009efb',
                      borderRadius: '10px',
                      fontWeight: '600',
                      fontSize: '16px',
                      boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#0084d6';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = '#009efb';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    <i className="bi bi-save me-2"></i>
                    Save Email Template
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

export default EmailPo;
