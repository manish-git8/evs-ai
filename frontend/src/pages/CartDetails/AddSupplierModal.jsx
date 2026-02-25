import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import * as yup from 'yup';
import { useFormik } from 'formik';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Label,
  Row,
  Col,
  FormFeedback,
  FormGroup,
} from 'reactstrap';
import SupplierService from '../../services/SupplierService';
import MasterDataService from '../../services/MasterDataService';
import { getEntityId } from '../localStorageUtil';

const AddSupplierModal = ({ isOpen, toggle, onSave }) => {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [isStatesLoading, setIsStatesLoading] = useState(false);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);
  const companyId = getEntityId();

  const validationSchema = yup.object().shape({
    name: yup.string().required('Name is required'),
    email: yup.string().email('Invalid email').required('Email is required'),
    primaryContact: yup
      .string()
      .required('Primary Contact is required')
      .matches(/^[0-9]+$/, 'Must be only digits')
      .max(10, 'Must be 12 digits or less')
      .min(10, 'Must be at least 10 digits'),

    customerServicePhone: yup
      .string()
      .matches(/^[0-9]{0,10}$/, 'Must be 10 digits or less')
      .nullable(),
  });

  const handleToggle = () => {
    setStates([]);
    setCities([]);
    toggle();
  };

  const formik = useFormik({
    initialValues: {
      name: '',
      displayName: '',
      email: '',
      salesEmail: '',
      customerServicePhone: '',
      website: '',
      currency: '',
      primaryContact: '',
      addressLine1: '',
      addressLine2: '',
      country: '',
      state: '',
      city: '',
      postalCode: '',
      countryCode: '',
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const payload = {
          name: values.name,
          displayName: values.displayName,
          salesEmail: values.salesEmail,
          customerServicePhone: values.customerServicePhone,
          email: values.email,
          website: values.website,
          currency: values.currency,
          primaryContact: values.primaryContact,
          supplierLogoId: 0,
          supplierSignatureId: 0,
          shippingMethodId: 0,
          paymentTermsId: 0,
          isActive: true,
          supplierStatus: 'DRAFT',
          createdDate: new Date().toISOString(),
          address: {
            addressId: 0,
            addressLine1: values.addressLine1,
            addressLine2: values.addressLine2,
            addressType: 'PRIMARY',
            street: '',
            city: values.city || '',
            state: values.state || '',
            postalCode: values.postalCode,
            country: values.country || '',
            isoCountryCode: values.countryCode || '',
          },
        };

        await SupplierService.handleCreateDraftSupplierFromCart(payload, companyId);
        onSave(payload);
        handleToggle();
        toast.dismiss();
        toast.success('Supplier created successfully');
      } catch (error) {
        console.error('Error creating draft supplier:', error);
        toast.dismiss();
        if (error.response?.data?.errorMessage) {
          toast.error(error.response.data.errorMessage);
        } else {
          toast.error('Failed to create supplier');
        }
      } finally {
        setSubmitting(false);
      }
    },
  });

  const loadCountries = async () => {
    try {
      const response = await MasterDataService.getAllCountries();
      setCountries(response.data);
    } catch (error) {
      console.error('Error loading countries:', error);
      toast.error('Failed to load countries');
    }
  };

  const loadCurrencies = async () => {
    try {
      const response = await MasterDataService.getAllCurrencies();
      setCurrencies(response.data);
    } catch (error) {
      console.error('Error loading currencies:', error);
      toast.dismiss();
      toast.error('Failed to load currencies');
    }
  };

  const handleCountryChange = async (e) => {
    const countryName = e.target.value;
    const selectedCountry = countries.find((c) => c.name === countryName);
    const countryId = selectedCountry ? selectedCountry.countryId : null;

    formik.setFieldValue('country', countryName);
    formik.setFieldValue('state', '');
    formik.setFieldValue('city', '');
    setCities([]);

    if (countryId) {
      try {
        setIsStatesLoading(true);
        const response = await MasterDataService.getStatesByCountryId(countryId);
        setStates(response.data);
      } catch (error) {
        console.error('Error loading states:', error);
        toast.dismiss();
        toast.error('Failed to load states');
      } finally {
        setIsStatesLoading(false);
      }
    } else {
      setStates([]);
    }
  };

  const handleStateChange = async (e) => {
    const stateName = e.target.value;
    const selectedState = states.find((s) => s.name === stateName);
    const stateId = selectedState ? selectedState.stateId : null;

    formik.setFieldValue('state', stateName);
    formik.setFieldValue('city', '');

    if (stateId) {
      try {
        setIsCitiesLoading(true);
        const response = await MasterDataService.getCitiesByStateId(stateId);
        setCities(response.data);
      } catch (error) {
        console.error('Error loading cities:', error);
        toast.dismiss();
        toast.error('Failed to load cities');
      } finally {
        setIsCitiesLoading(false);
      }
    } else {
      setCities([]);
    }
  };

  const loadInitialData = async () => {
    try {
      await Promise.all([loadCountries(), loadCurrencies()]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      formik.resetForm();
      setStates([]);
      setCities([]);
    } else {
      loadInitialData();
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} toggle={handleToggle} size="lg">
        <ModalHeader toggle={handleToggle}>Add New Supplier</ModalHeader>
        <ModalBody>
          <form onSubmit={formik.handleSubmit}>
            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label className="control-label">
                    Name<span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="text"
                    name="name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`form-control${
                      formik.touched.name && formik.errors.name ? ' is-invalid' : ''
                    }`}
                  />
                  <FormFeedback>{formik.errors.name}</FormFeedback>
                </FormGroup>

                <FormGroup>
                  <Label className="control-label">Display Name</Label>
                  <Input
                    type="text"
                    name="displayName"
                    value={formik.values.displayName}
                    onChange={formik.handleChange}
                    className="form-control"
                  />
                </FormGroup>

                <FormGroup>
                  <Label className="control-label">Currency</Label>
                  <Input
                    type="select"
                    name="currency"
                    value={formik.values.currency}
                    onChange={formik.handleChange}
                    className="form-control"
                  >
                    <option value="">Select Currency</option>
                    {currencies.map((currency) => (
                      <option key={currency.currencyId} value={currency.currencyId}>
                        {currency.currencyCode} - {currency.symbol}
                      </option>
                    ))}
                  </Input>
                </FormGroup>

                <FormGroup>
                  <Label className="control-label">
                    Primary Contact<span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="text"
                    name="primaryContact"
                    value={formik.values.primaryContact}
                    onChange={({ target: { value } }) => {
                      if (/^\d{0,12}$/.test(value)) {
                        formik.setFieldValue('primaryContact', value);
                      }
                    }}
                    onBlur={formik.handleBlur}
                    placeholder="1234567890"
                    className={`form-control${
                      formik.touched.primaryContact && formik.errors.primaryContact
                        ? ' is-invalid'
                        : ''
                    }`}
                    maxLength={10}
                    pattern="[0-9]*"
                    onKeyDown={(e) => {
                      if (
                        !/^[0-9]$/.test(e.key) &&
                        e.key !== 'Backspace' &&
                        e.key !== 'Delete' &&
                        e.key !== 'Tab'
                      ) {
                        e.preventDefault();
                      }
                    }}
                  />
                  <FormFeedback>{formik.errors.primaryContact}</FormFeedback>
                </FormGroup>

                <FormGroup>
                  <Label className="control-label">Customer Service Phone</Label>
                  <Input
                    autoComplete="off"
                    type="tel"
                    name="customerServicePhone"
                    value={formik.values.customerServicePhone}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="1234567890"
                    className={`form-control${
                      formik.touched.customerServicePhone && formik.errors.customerServicePhone
                        ? ' is-invalid'
                        : ''
                    }`}
                    maxLength={10}
                    pattern="[0-9]*"
                    onKeyDown={(e) => {
                      if (
                        !/^[0-9]$/.test(e.key) &&
                        e.key !== 'Backspace' &&
                        e.key !== 'Delete' &&
                        e.key !== 'Tab'
                      ) {
                        e.preventDefault();
                      }
                    }}
                  />
                  <FormFeedback>{formik.errors.customerServicePhone}</FormFeedback>
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <Label className="control-label">
                    Email<span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="email"
                    name="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`form-control${
                      formik.touched.email && formik.errors.email ? ' is-invalid' : ''
                    }`}
                  />
                  <FormFeedback>{formik.errors.email}</FormFeedback>
                </FormGroup>

                <FormGroup>
                  <Label className="control-label">Sales Email</Label>
                  <Input
                    type="email"
                    name="salesEmail"
                    value={formik.values.salesEmail}
                    onChange={formik.handleChange}
                    className="form-control"
                  />
                </FormGroup>

                <FormGroup>
                  <Label className="control-label">Website</Label>
                  <Input
                    type="text"
                    name="website"
                    value={formik.values.website}
                    onChange={formik.handleChange}
                    className="form-control"
                    placeholder="https://example.com"
                  />
                </FormGroup>

                <FormGroup>
                  <Label className="control-label">Country Code</Label>
                  <Input
                    type="text"
                    name="countryCode"
                    value={formik.values.countryCode}
                    onChange={formik.handleChange}
                    className="form-control"
                    placeholder="e.g. US, IN, etc."
                  />
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label className="control-label">Country</Label>
                  <Input
                    type="select"
                    name="country"
                    value={formik.values.country}
                    onChange={handleCountryChange}
                    className="form-control"
                  >
                    <option value="">Select Country</option>
                    {countries.map((country) => (
                      <option key={country.countryId} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </Input>
                </FormGroup>

                <FormGroup>
                  <Label className="control-label">State</Label>
                  <Input
                    type="select"
                    name="state"
                    value={formik.values.state}
                    onChange={handleStateChange}
                    disabled={!formik.values.country || isStatesLoading}
                    className="form-control"
                  >
                    <option value="">Select State</option>
                    {states.map((state) => (
                      <option key={state.stateId} value={state.name}>
                        {state.name}
                      </option>
                    ))}
                  </Input>
                </FormGroup>

                <FormGroup>
                  <Label className="control-label">City</Label>
                  <Input
                    type="select"
                    name="city"
                    value={formik.values.city}
                    onChange={formik.handleChange}
                    disabled={!formik.values.state || isCitiesLoading}
                    className="form-control"
                  >
                    <option value="">Select City</option>
                    {cities.map((city) => (
                      <option key={city.cityId} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <Label className="control-label">Address Line 1</Label>
                  <Input
                    type="text"
                    name="addressLine1"
                    value={formik.values.addressLine1}
                    onChange={formik.handleChange}
                    className="form-control"
                    placeholder="Street address, P.O. box"
                  />
                </FormGroup>

                <FormGroup>
                  <Label className="control-label">Address Line 2</Label>
                  <Input
                    type="text"
                    name="addressLine2"
                    value={formik.values.addressLine2}
                    onChange={formik.handleChange}
                    className="form-control"
                    placeholder="Apartment, suite, unit, building, floor"
                  />
                </FormGroup>

                <FormGroup>
                  <Label className="control-label">Postal Code</Label>
                  <Input
                    type="text"
                    name="postalCode"
                    value={formik.values.postalCode}
                    onChange={formik.handleChange}
                    className="form-control"
                    placeholder="ZIP or postal code"
                  />
                </FormGroup>
              </Col>
            </Row>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={handleToggle}>
            Cancel
          </Button>
          <Button color="primary" onClick={formik.handleSubmit} disabled={formik.isSubmitting}>
            {formik.isSubmitting ? 'Saving...' : 'Save Supplier'}
          </Button>
        </ModalFooter>
      </Modal>
  );
};

AddSupplierModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default AddSupplierModal;
