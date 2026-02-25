import React, { useState, useEffect } from 'react';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { Card, CardBody, Row, Col, FormGroup, Label, Input, Button } from 'reactstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { Formik, ErrorMessage, Form } from 'formik';
import * as Yup from 'yup';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MasterDataService from '../../services/MasterDataService';
import AddressService from '../../services/AddressService';
import { getEntityId } from '../localStorageUtil';

const AddressRegistration = () => {
  const [addressData, setAddressData] = useState(null);
  const [loading, setLoading] = useState(false);
  const companyId = getEntityId();
  const navigate = useNavigate();
  const { addressId } = useParams();
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const addressValidationSchema = Yup.object({
    addressLine1: Yup.string().required('Address Line 1 is required'),
    addressLine2: Yup.string().nullable(),
    city: Yup.string().required('City is required'),
    state: Yup.string().required('State is required'),
    postalCode: Yup.string().required('Postal Code is required'),
    country: Yup.string().required('Country is required'),
    isoCountryCode: Yup.string().required('ISO Country Code is required'),
  });

  const fetchAddressFromAPI = async () => {
    try {
      const response = await AddressService.getAddressById(companyId, addressId);
      setAddressData(response.data);
      setSelectedCountry(response.data.country);
      setSelectedState(response.data.state);
    } catch (error) {
      console.error('Error fetching address details:', error);
      toast.dismiss();
      toast.error('Failed to fetch address details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (addressId) {
      const storedData = localStorage.getItem('editAddressData');
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          setAddressData(parsedData);
          setSelectedCountry(parsedData.country);
          setSelectedState(parsedData.state);
          localStorage.removeItem('editAddressData');
        } catch (error) {
          console.error('Error parsing stored address data:', error);

          fetchAddressFromAPI();
        }
        setLoading(false);
      } else {
        fetchAddressFromAPI();
      }
    }
  }, [addressId, companyId]);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await MasterDataService.getAllCountries();
        setCountries(response.data);
      } catch (error) {
        console.error('Error fetching countries:', error);
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    const fetchStates = async () => {
      if (selectedCountry) {
        try {
          const country = countries.find((c) => c.name === selectedCountry);
          if (country) {
            const response = await MasterDataService.getStatesByCountryId(country.countryId);
            setStates(response.data);
            setCities([]);
            if (addressData?.state) {
              setSelectedState(addressData.state);
            }
          }
        } catch (error) {
          console.error('Error fetching states:', error);
        }
      }
    };
    fetchStates();
  }, [selectedCountry, countries]);

  useEffect(() => {
    const fetchCities = async () => {
      if (selectedState) {
        try {
          const state = states.find((s) => s.name === selectedState);
          if (state) {
            const response = await MasterDataService.getCitiesByStateId(state.stateId);
            setCities(response.data);
          }
        } catch (error) {
          console.error('Error fetching cities:', error);
        }
      }
    };
    fetchCities();
  }, [selectedState, states]);

  const handleSubmit = async (values) => {
    try {
      const addressType = addressId ? addressData.addressType : 'SHIPPING';

      const requestBody = {
        ...values,
        companyId,
        addressType,
      };

      if (addressId) {
        await AddressService.updateAddress(companyId, addressId, requestBody);
        toast.dismiss();
        toast.success('Address updated successfully!');
      } else {
        await AddressService.handleCreateAddress(companyId, requestBody);
        toast.dismiss();
        toast.success('Address created successfully!');
      }
      setTimeout(() => {
        navigate('/address-management');
      }, 1500);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast.dismiss();
      toast.error(error.response?.data?.errorMessage || 'An unexpected error occurred');
    }
  };

  const handleCancel = () => {
    navigate('/address-management');
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  const initialValues = {
    addressLine1: addressData?.addressLine1,
    addressLine2: addressData?.addressLine2,
    addressType: addressData?.addressType,
    street: addressData?.street,
    city: addressData?.city,
    state: addressData?.state,
    postalCode: addressData?.postalCode,
    country: addressData?.country,
    isoCountryCode: addressData?.isoCountryCode,
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
                  background: '#009efb',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className="fas fa-map-marker-alt text-white"></i>
                </div>
                <div>
                  <h4 className="mb-1">{addressId ? 'Edit Shipping Address' : 'Add New Shipping Address'}</h4>
                  <p className="text-muted mb-0 small">
                    {addressId ? 'Update the shipping address details below' : 'Enter the shipping address details below'}
                  </p>
                </div>
              </div>
            </CardBody>
            <CardBody style={{ padding: '0 24px 24px 24px' }}>
              <Formik
                initialValues={initialValues}
                validationSchema={addressValidationSchema}
                onSubmit={handleSubmit}
                enableReinitialize
              >
                {({ values, handleChange, handleBlur, errors, touched, setFieldValue }) => (
                  <Form>
                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Address Line 1<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="text"
                            name="addressLine1"
                            value={values.addressLine1}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`form-control${
                              touched.addressLine1 && errors.addressLine1 ? ' is-invalid' : ''
                            }`}
                            placeholder="Enter Address Line 1"
                          />
                          <ErrorMessage
                            name="addressLine1"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>Address Line 2</Label>
                          <Input
                            type="text"
                            name="addressLine2"
                            value={values.addressLine2}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Enter Address Line 2"
                            className="form-control"
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Street
                          </Label>
                          <Input
                            type="text"
                            name="street"
                            value={values.street}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Enter Street"
                            className="form-control"
                          />
                          <ErrorMessage
                            name="street"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Country<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="select"
                            name="country"
                            value={values.country}
                            onChange={(e) => {
                              const countryName = e.target.value;
                              setSelectedCountry(countryName);
                              handleChange(e);
                              setFieldValue('state', '');
                              setFieldValue('city', '');
                            }}
                            onBlur={handleBlur}
                            className={`form-control${
                              touched.country && errors.country ? ' is-invalid' : ''
                            }`}
                          >
                            <option value="">Select Country</option>
                            {countries.map((country) => (
                              <option key={country.countryId} value={country.name}>
                                {country.name}
                              </option>
                            ))}
                          </Input>
                          <ErrorMessage
                            name="country"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            State<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="select"
                            name="state"
                            value={values.state}
                            onChange={(e) => {
                              const stateName = e.target.value;
                              setSelectedState(stateName);
                              handleChange(e);
                              setFieldValue('city', '');
                            }}
                            onBlur={handleBlur}
                            disabled={!values.country}
                            className={`form-control${
                              touched.state && errors.state ? ' is-invalid' : ''
                            }`}
                          >
                            <option value="">Select State</option>
                            {states.map((state) => (
                              <option key={state.stateId} value={state.name}>
                                {state.name}
                              </option>
                            ))}
                          </Input>
                          <ErrorMessage name="state" component="div" className="invalid-feedback" />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            City<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="select"
                            name="city"
                            value={values.city}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            disabled={!values.state}
                            className={`form-control${
                              touched.city && errors.city ? ' is-invalid' : ''
                            }`}
                          >
                            <option value="">Select City</option>
                            {cities.map((city) => (
                              <option key={city.cityId} value={city.name}>
                                {city.name}
                              </option>
                            ))}
                          </Input>
                          <ErrorMessage name="city" component="div" className="invalid-feedback" />
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Postal Code<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="text"
                            name="postalCode"
                            value={values.postalCode}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Enter Postal Code"
                            className={`form-control${
                              touched.postalCode && errors.postalCode ? ' is-invalid' : ''
                            }`}
                          />
                          <ErrorMessage
                            name="postalCode"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            ISO Country Code<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="text"
                            name="isoCountryCode"
                            value={values.isoCountryCode}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Enter ISO Country Code"
                            className={`form-control${
                              touched.isoCountryCode && errors.isoCountryCode ? ' is-invalid' : ''
                            }`}
                          />
                          <ErrorMessage
                            name="isoCountryCode"
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
                          {addressId ? 'Update' : 'Submit'}
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

export default AddressRegistration;
