import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardTitle, Row, Col, FormGroup, Label, Input, Button, Badge } from 'reactstrap';
import { Formik, Form } from 'formik';
import { useParams, useNavigate } from 'react-router-dom';
import '../UserRegistration/UserRegistration.css';
import '../CompanyManagement/ReactBootstrapTable.scss';
import SupplierService from '../../services/SupplierService';

const SupplierBuyerSideRegistration = () => {
  const { supplierId } = useParams();
  const navigate = useNavigate();
  const [isInternal, setIsInternal] = useState(false);
  const [initialValues, setInitialValues] = useState({
    name: '',
    displayName: '',
    email: '',
    customerServicePhone: '',
    salesEmail: '',
    website: '',
    currency: '',
    primaryContact: '',
    address: {
      addressLine1: '',
      addressLine2: '',
      addressType: 'SHIPPING',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      isoCountryCode: '',
    },
  });

  useEffect(() => {
    if (supplierId) {
      SupplierService.getSupplierById(supplierId)
        .then((response) => {
          const supplierData = response.data[0];
          setIsInternal(supplierData.isInternal || false);
          setInitialValues({
            name: supplierData.name,
            displayName: supplierData.displayName,
            email: supplierData.email,
            customerServicePhone: supplierData.customerServicePhone,
            salesEmail: supplierData.salesEmail,
            website: supplierData.website,
            currency: supplierData.currency,
            primaryContact: supplierData.primaryContact,
            address: {
              addressLine1: supplierData.address?.addressLine1 || '',
              addressLine2: supplierData.address?.addressLine2 || '',
              city: supplierData.address?.city || '',
              state: supplierData.address?.state || '',
              postalCode: supplierData.address?.postalCode || '',
              country: supplierData.address?.country || '',
              isoCountryCode: supplierData.address?.isoCountryCode || '',
            },
          });
        })
        .catch((error) => {
          console.error('Error fetching supplier:', error);
        });
    }
  }, [supplierId]);

  const handleBack = () => {
    navigate('/suppliers');
  };

  return (
    <div style={{ paddingTop: '24px' }}>
      <Row>
        <Col md="12">
          <Card>
            <CardBody style={{ backgroundColor: '#009efb', padding: '12px' }}>
              <div className="d-flex justify-content-between align-items-center">
                <CardTitle tag="h4" className="mb-0 text-white">
                  {supplierId ? 'Supplier Details' : 'Supplier Info'}
                </CardTitle>
                <span className="text-white">
                  <strong>Is Internal:</strong>{' '}
                  {isInternal ? (
                    <Badge
                      style={{
                        backgroundColor: '#0891b2',
                        fontSize: '11px',
                        padding: '4px 10px',
                      }}
                    >
                      Yes
                    </Badge>
                  ) : (
                    <span style={{ opacity: 0.8 }}>No</span>
                  )}
                </span>
              </div>
            </CardBody>
            <CardBody>
              <Formik initialValues={initialValues} enableReinitialize onSubmit={() => {}}>
                {({ values }) => (
                  <Form>
                    <Row>
                      <Col md="4">
                        <FormGroup>
                          <Label className="control-label">Name</Label>
                          <Input
                            name="name"
                            value={values.name}
                            type="text"
                            disabled
                            className="form-control"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <Label className="control-label">Display Name</Label>
                          <Input
                            name="displayName"
                            value={values.displayName}
                            type="text"
                            disabled
                            className="form-control"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <Label className="control-label">Email</Label>
                          <Input
                            name="email"
                            value={values.email}
                            type="email"
                            disabled
                            className="form-control"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <Label className="control-label">Sales Email</Label>
                          <Input
                            name="salesEmail"
                            value={values.salesEmail}
                            type="email"
                            disabled
                            className="form-control"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <Label className="control-label">Customer Service Phone</Label>
                          <Input
                            name="customerServicePhone"
                            value={values.customerServicePhone}
                            type="tel"
                            disabled
                            className="form-control"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <Label className="control-label">Website</Label>
                          <Input
                            name="website"
                            value={values.website}
                            type="text"
                            disabled
                            className="form-control"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <Label className="control-label">Currency</Label>
                          <Input
                            name="currency"
                            value={values.currency}
                            disabled
                            className="form-control"
                          ></Input>
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <Label className="control-label">Contact Number</Label>
                          <Input
                            name="primaryContact"
                            value={values.primaryContact}
                            type="tel"
                            disabled
                            className="form-control"
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    <CardBody className="address-card-body" style={{ padding: '12px' }}>
                      <CardTitle tag="h4" className="mb-0 text-white">
                        Address
                      </CardTitle>
                    </CardBody>
                    <CardBody>
                      <Row>
                        <Col md="4">
                          <FormGroup>
                            <Label className="control-label">Address Line 1</Label>
                            <Input
                              name="address.addressLine1"
                              value={values.address.addressLine1}
                              disabled
                              className="form-control"
                            />
                          </FormGroup>
                        </Col>
                        <Col md="4">
                          <FormGroup>
                            <Label>Address Line 2</Label>
                            <Input
                              name="address.addressLine2"
                              value={values.address.addressLine2}
                              disabled
                              className="form-control"
                            />
                          </FormGroup>
                        </Col>
                        <Col md="4">
                          <FormGroup>
                            <Label>Country</Label>
                            <Input
                              name="address.country"
                              className="form-control"
                              value={values.address.country}
                              disabled
                            ></Input>
                          </FormGroup>
                        </Col>
                      </Row>
                      <Row>
                        <Col md="4">
                          <FormGroup>
                            <Label>State</Label>
                            <Input
                              name="address.state"
                              className="form-control"
                              value={values.address.state}
                              disabled
                            ></Input>
                          </FormGroup>
                        </Col>
                        <Col md="4">
                          <FormGroup>
                            <Label>City</Label>
                            <Input
                              name="address.city"
                              className="form-control"
                              value={values.address.city}
                              disabled
                            ></Input>
                          </FormGroup>
                        </Col>
                        <Col md="4">
                          <FormGroup>
                            <Label>Postal Code</Label>
                            <Input
                              name="address.postalCode"
                              value={values.address.postalCode}
                              disabled
                              className="form-control"
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                      <Row>
                        <Col md="4">
                          <FormGroup>
                            <Label>Country Code</Label>
                            <Input
                              name="address.isoCountryCode"
                              type="text"
                              value={values.address.isoCountryCode}
                              disabled
                              className="form-control"
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                    </CardBody>
                    <Row>
                      <Col className="d-flex justify-content-end mt-3 mb-3">
                        <Button
                          color="secondary"
                          onClick={handleBack}
                          className="button-spacing"
                          style={{ marginRight: '10px' }}
                        >
                          Back
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

export default SupplierBuyerSideRegistration;
