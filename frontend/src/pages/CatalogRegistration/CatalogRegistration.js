import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardTitle, Row, Col, FormGroup, Label, Input, Button } from 'reactstrap';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Formik, ErrorMessage, Form } from 'formik';
import * as Yup from 'yup';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CatalogService from '../../services/CatalogService';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { getEntityId } from '../localStorageUtil';

const CatalogRegistration = () => {
  const [catalogData, setCatalogData] = useState({
    catalogId: '',
    name: '',
    notes: '',
    supplierId: getEntityId(),
    isActive: true,
  });

  const navigate = useNavigate();
  const { catalogId } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const redirectToDashboard = queryParams.get('dashboard') === 'true';
  const catalogValidationSchema = Yup.object({
    name: Yup.string().required('Catalog Name is required'),
    notes: Yup.string().required('Notes are required'),
  });

  useEffect(() => {
    const fetchCatalog = async () => {
      if (catalogId) {
        try {
          const response = await CatalogService.getCatalogById(catalogId);
          const catalog = response.data.content[0];
          setCatalogData({
            catalogId: catalog.catalogId,
            name: catalog.name,
            notes: catalog.notes,
            supplierId: catalog.supplierId,
            parentId: catalog.parentId,
            isActive: catalog.isActive,
          });
        } catch (error) {
          console.error('Error fetching catalog:', error);
        }
      }
    };

    fetchCatalog();
  }, [catalogId]);

  const handleSubmit = async (values) => {
    try {
      let response;
      if (catalogId) {
        response = await CatalogService.updateCatalog(catalogId, values);
        console.log('Catalog updated successfully:', response.data);
        toast.dismiss();
        toast.success('Catalog updated successfully!');
      } else {
        response = await CatalogService.createCatalog(values);
        console.log('Catalog created successfully:', response.data);
        toast.dismiss();
        toast.success('Catalog created successfully!');
      }

      setTimeout(() => {
        if (redirectToDashboard) {
          navigate('/supplier-dashboard');
        } else {
          navigate('/catalog-management');
        }
      }, 1500);
    } catch (error) {
      console.error('Error saving catalog:', error);
      if (error.response && error.response.data && error.response.data.errorMessage) {
        toast.dismiss();
        toast.error(error.response.data.errorMessage);
      } else {
        toast.dismiss();
        toast.error('An unexpected error occurred');
      }
    }
  };

  const handleCancel = () => {
    if (redirectToDashboard) {
      navigate('/supplier-dashboard');
    } else {
      navigate('/catalog-management');
    }
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
          <Card>
            <CardBody style={{ backgroundColor: '#009efb', padding: '12px', color: 'white' }}>
              <CardTitle tag="h4" className="mb-0" style={{ fontWeight: '500', fontSize: '14px' }}>
                {catalogId ? 'Edit Catalog' : 'Catalog Registration'}
              </CardTitle>
            </CardBody>
            <CardBody>
              <Formik
                initialValues={catalogData}
                validationSchema={catalogValidationSchema}
                onSubmit={handleSubmit}
                enableReinitialize
              >
                {({ values, handleChange, handleBlur, errors, touched }) => (
                  <Form>
                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Name<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="text"
                            name="name"
                            value={values.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Enter Name"
                            className={`form-control${
                              touched.name && errors.name ? ' is-invalid' : ''
                              }`}
                            maxLength={200}
                          />
                          <ErrorMessage name="name" component="div" className="invalid-feedback" />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Notes<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="text"
                            name="notes"
                            value={values.notes}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Enter any notes"
                            className={`form-control${
                              touched.notes && errors.notes ? ' is-invalid' : ''
                              }`}
                            maxLength={200}
                          />
                          <ErrorMessage name="notes" component="div" className="invalid-feedback" />
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col className="d-flex justify-content-end mt-3">
                        <Button
                          color="secondary"
                          onClick={handleCancel}
                          className="button-spacing"
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

export default CatalogRegistration;
