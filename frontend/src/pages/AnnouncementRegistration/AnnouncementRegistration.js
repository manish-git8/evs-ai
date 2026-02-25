import React, { useState, useEffect } from 'react';
import { Card, CardBody, Row, Col, FormGroup, Label, Input, Button } from 'reactstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { Formik, ErrorMessage, Form } from 'formik';
import * as Yup from 'yup';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AnnouncementService from '../../services/AnnouncementService';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { getEntityId } from '../localStorageUtil';

const AnnouncementRegistration = () => {
  const { announcementId } = useParams();
  const companyId = getEntityId();
  const [announcementData, setAnnouncementData] = useState({
    companyId,
    title: '',
    body: '',
    startDate: '',
    endDate: '',
    announcementType: 'critical',
    isReadReceiptRequired: true,
  });

  const navigate = useNavigate();
  const announcementValidationSchema = Yup.object({
    title: Yup.string().required('Title is required'),
    body: Yup.string().required('Body is required'),
    startDate: Yup.date().required('Start Date is required').nullable(),
    endDate: Yup.date().required('End Date is required').nullable(),
    announcementType: Yup.string().required('Announcement Type is required'),
    isReadReceiptRequired: Yup.boolean(),
  });

  const fetchAnnouncementDetails = async (id) => {
    try {
      const response = await AnnouncementService.getAnnouncementByAnnouncementId(companyId, id);
      const data = response.data[0];
      setAnnouncementData({
        companyId: data.companyId || 54,
        title: data.title,
        body: data.body,
        startDate: new Date(data.startDate).toISOString().slice(0, 16),
        endDate: new Date(data.endDate).toISOString().slice(0, 16),
        announcementType: data.announcementType,
        isReadReceiptRequired: data.isReadReceiptRequired,
      });
    } catch (error) {
      console.error('Error fetching announcement:', error);
      toast.dismiss();
      toast.error('Failed to fetch announcement details.');
    }
  };

  useEffect(() => {
    if (announcementId) {
      fetchAnnouncementDetails(announcementId);
    }
  }, [announcementId]);

  const handleSubmit = async (values) => {
    try {
      const formattedValues = {
        ...values,
        startDate: new Date(values.startDate).toISOString(),
        endDate: new Date(values.endDate).toISOString(),
      };

      if (announcementId) {
        await AnnouncementService.handleUpdateAnnouncement(
          companyId,
          announcementId,
          formattedValues,
        );
        toast.dismiss();
        toast.success('Announcement updated successfully!');
      } else {
        await AnnouncementService.handleCreateAnnouncement(companyId, formattedValues);
        toast.dismiss();
        toast.success('Announcement created successfully!');
      }

      setTimeout(() => {
        navigate('/announcement-management');
      }, 1500);
    } catch (error) {
      console.error('Error saving announcement:', error);
      const errorMessage = error.response?.data?.errorMessage || 'An unexpected error occurred';
      toast.dismiss();
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    navigate('/announcement-management');
  };

  return (
    <div style={{ paddingTop: '24px' }}>
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
      <Row>
        <Col md="12">
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
                  backgroundColor: '#009efb',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(0, 158, 251, 0.1)'
                }}>
                  <i className="fas fa-bullhorn text-white"></i>
                </div>
                <div>
                  <h4 className="mb-1">{announcementId ? 'Edit Announcement' : 'Create New Announcement'}</h4>
                  <p className="text-muted mb-0 small">
                    {announcementId ? 'Update announcement details and settings' : 'Create and publish announcements for your organization'}
                  </p>
                </div>
              </div>
            </CardBody>
            <CardBody>
              <Formik
                initialValues={announcementData}
                validationSchema={announcementValidationSchema}
                onSubmit={handleSubmit}
                enableReinitialize
              >
                {({ values, handleChange, handleBlur, errors, touched }) => (
                  <Form>
                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Title<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="text"
                            name="title"
                            value={values.title}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Enter Title"
                            className={`form-control${
                              touched.title && errors.title ? ' is-invalid' : ''
                            }`}
                            maxLength={200}
                          />
                          <ErrorMessage name="title" component="div" className="invalid-feedback" />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Body<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="text"
                            name="body"
                            value={values.body}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Enter Announcement Body"
                            className={`form-control${
                              touched.body && errors.body ? ' is-invalid' : ''
                            }`}
                            maxLength={200}
                          />
                          <ErrorMessage name="body" component="div" className="invalid-feedback" />
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row className="mb-3">
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Start Date<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="date"
                            name="startDate"
                            value={values.startDate}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            min={new Date().toISOString().slice(0, 10)}
                            className={`form-control${
                              touched.startDate && errors.startDate ? ' is-invalid' : ''
                            }`}
                          />
                          <ErrorMessage
                            name="startDate"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            End Date<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="date"
                            name="endDate"
                            value={values.endDate}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            min={new Date().toISOString().slice(0, 10)}
                            className={`form-control${
                              touched.endDate && errors.endDate ? ' is-invalid' : ''
                            }`}
                          />
                          <ErrorMessage
                            name="endDate"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col className="d-flex justify-content-end mt-3">
                        <Button
                          color="secondary"
                          onClick={handleCancel}
                          style={{ marginRight: '10px' }}
                        >
                          Back
                        </Button>
                        <Button type="submit" color="primary">
                          Submit
                        </Button>
                      </Col>
                    </Row>
                  </Form>
                )}
              </Formik>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AnnouncementRegistration;
