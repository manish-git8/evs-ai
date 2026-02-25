import React, { useState, useEffect } from 'react';
import { Label } from 'reactstrap';
import PropTypes from 'prop-types';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useParams } from 'react-router-dom';
import MasterDataService from '../../../services/MasterDataService';
import useCountries from '../../../hooks/useCountries';

const Step2 = ({ jumpToStep, updateStore, addressData }) => {
  const { companyId } = useParams();
  const isBillingEditMode = !!addressData?.billingAddress?.addressId;
  const isShippingEditMode = !!addressData?.shippingAddresses?.[0]?.addressId;
  const isEditMode = isBillingEditMode || isShippingEditMode;
  const { countries } = useCountries();
  const [billingStates, setBillingStates] = useState([]);
  const [billingCities, setBillingCities] = useState([]);
  const [shippingStates, setShippingStates] = useState([]);
  const [shippingCities, setShippingCities] = useState([]);
  const [selectedBillingCountryId, setSelectedBillingCountryId] = useState('');
  const [selectedBillingStateId, setSelectedBillingStateId] = useState('');
  const [selectedShippingCountryId, setSelectedShippingCountryId] = useState('');
  const [selectedShippingStateId, setSelectedShippingStateId] = useState('');

  useEffect(() => {
    const fetchBillingStates = async () => {
      if (selectedBillingCountryId) {
        try {
          const response = await MasterDataService.getStatesByCountryId(selectedBillingCountryId);
          const fetchedStates = response.data;
          setBillingStates(fetchedStates);
          if (isBillingEditMode) {
            const billingState = fetchedStates.find(
              (s) => s.name === addressData?.billingAddress?.state,
            );
            setSelectedBillingStateId(billingState?.stateId || '');
          }
        } catch (error) {
          console.error('Error fetching billing states:', error);
        }
      } else {
        setBillingStates([]);
        setSelectedBillingStateId('');
      }
    };
    fetchBillingStates();
  }, [selectedBillingCountryId, isBillingEditMode, addressData]);

  useEffect(() => {
    const fetchBillingCities = async () => {
      if (
        selectedBillingStateId ||
        (addressData?.billingAddress?.state && billingStates.length > 0)
      ) {
        try {
          const stateIdToUse =
            selectedBillingStateId ||
            billingStates.find((s) => s.name === addressData?.billingAddress?.state)?.stateId;

          if (stateIdToUse) {
            const response = await MasterDataService.getCitiesByStateId(stateIdToUse);
            setBillingCities(response.data);
          }
        } catch (error) {
          console.error('Error fetching billing cities:', error);
          setBillingCities([]);
        }
      } else {
        setBillingCities([]);
      }
    };
    fetchBillingCities();
  }, [selectedBillingStateId, addressData?.billingAddress?.state, billingStates]);

  useEffect(() => {
    const fetchShippingStates = async () => {
      if (selectedShippingCountryId) {
        try {
          const response = await MasterDataService.getStatesByCountryId(selectedShippingCountryId);
          const fetchedStates = response.data;
          setShippingStates(fetchedStates);
          if (isShippingEditMode) {
            const shippingState = fetchedStates.find(
              (s) => s.name === addressData?.shippingAddresses?.[0]?.state,
            );
            setSelectedShippingStateId(shippingState?.stateId || '');
          }
        } catch (error) {
          console.error('Error fetching shipping states:', error);
        }
      } else {
        setShippingStates([]);
        setSelectedShippingStateId('');
      }
    };
    fetchShippingStates();
  }, [selectedShippingCountryId, isShippingEditMode, addressData]);

  useEffect(() => {
    const fetchShippingCities = async () => {
      if (
        selectedShippingStateId ||
        (addressData?.shippingAddresses?.[0]?.state && shippingStates.length > 0)
      ) {
        try {
          const stateIdToUse =
            selectedShippingStateId ||
            shippingStates.find((s) => s.name === addressData?.shippingAddresses?.[0]?.state)
              ?.stateId;

          if (stateIdToUse) {
            const response = await MasterDataService.getCitiesByStateId(stateIdToUse);
            setShippingCities(response.data);
          }
        } catch (error) {
          console.error('Error fetching shipping cities:', error);
          setShippingCities([]);
        }
      } else {
        setShippingCities([]);
      }
    };
    fetchShippingCities();
  }, [selectedShippingStateId, addressData?.shippingAddresses?.[0]?.state, shippingStates]);

  useEffect(() => {
    if (addressData?.billingAddress?.country) {
      const billingCountry = countries.find((c) => c.name === addressData.billingAddress.country);
      setSelectedBillingCountryId(billingCountry?.countryId || '');
    }

    if (addressData?.shippingAddresses?.[0]?.country) {
      const shippingCountry = countries.find(
        (c) => c.name === addressData.shippingAddresses[0].country,
      );
      setSelectedShippingCountryId(shippingCountry?.countryId || '');
    }
  }, [addressData, countries]);

  const initialValues = {
    billingAddress: {
      ...(isBillingEditMode &&
        addressData?.billingAddress?.addressId && {
          addressId: addressData.billingAddress.addressId,
        }),
      companyId: companyId || '',
      addressLine1: addressData?.billingAddress?.addressLine1 || '',
      addressLine2: addressData?.billingAddress?.addressLine2 || '',
      addressType: 'BILLING',
      street: addressData?.billingAddress?.street || '',
      city: addressData?.billingAddress?.city || '',
      state: addressData?.billingAddress?.state || '',
      country: addressData?.billingAddress?.country || '',
      postalCode: addressData?.billingAddress?.postalCode || '',
      isoCountryCode:
        addressData?.billingAddress?.isoCountryCode ||
        (addressData?.billingAddress?.country
          ? countries.find((c) => c.name === addressData.billingAddress.country)?.shortName
          : ''),
    },
    shippingAddress: {
      ...(isShippingEditMode &&
        addressData?.shippingAddresses?.[0]?.addressId && {
          addressId: addressData.shippingAddresses[0].addressId,
        }),
      companyId: companyId || '',
      addressLine1: addressData?.shippingAddresses?.[0]?.addressLine1 || '',
      addressLine2: addressData?.shippingAddresses?.[0]?.addressLine2 || '',
      addressType: 'SHIPPING',
      street: addressData?.shippingAddresses?.[0]?.street || '',
      city: addressData?.shippingAddresses?.[0]?.city || '',
      state: addressData?.shippingAddresses?.[0]?.state || '',
      country: addressData?.shippingAddresses?.[0]?.country || '',
      postalCode: addressData?.shippingAddresses?.[0]?.postalCode || '',
      isoCountryCode:
        addressData?.shippingAddresses?.[0]?.isoCountryCode ||
        (addressData?.shippingAddresses?.[0]?.country
          ? countries.find((c) => c.name === addressData.shippingAddresses[0].country)?.shortName
          : ''),
    },
    sameAsBilling: false,
  };

  const validationSchema = Yup.object({
    billingAddress: Yup.object({
      addressLine1: Yup.string().required('Address Line 1 is required'),
      city: Yup.string().required('City is required'),
      state: Yup.string().required('State is required'),
      country: Yup.string().required('Country is required'),
      postalCode: Yup.string().required('Postal Code is required'),
    }),
    shippingAddress: Yup.object({
      addressLine1: Yup.string().required('Address Line 1 is required'),
      city: Yup.string().required('City is required'),
      state: Yup.string().required('State is required'),
      country: Yup.string().required('Country is required'),
      postalCode: Yup.string().required('Postal Code is required'),
    }),
  });

  const handleSubmit = (values) => {
    // Deep merge using the store's old addresses to ensure IDs carry over
    const store = addressData;

    // Build billing address - only include addressId if it actually exists in the data
    const billingAddressId =
      isBillingEditMode && store?.billingAddress?.addressId ? store.billingAddress.addressId : null;
    const mergedBillingAddress = {
      ...values.billingAddress,
      ...(billingAddressId && { addressId: billingAddressId }),
      companyId: companyId || undefined,
    };

    // Build shipping address - only include addressId if it actually exists in the data
    const shippingAddressId =
      isShippingEditMode && store?.shippingAddresses?.[0]?.addressId
        ? store.shippingAddresses[0].addressId
        : null;
    const mergedShippingAddresses = [
      {
        ...values.shippingAddress,
        ...(shippingAddressId && { addressId: shippingAddressId }),
        companyId: companyId || undefined,
      },
    ];
    const submitValues = {
      ...values,
      billingAddress: mergedBillingAddress,
      shippingAddresses: mergedShippingAddresses,
      selectedBillingStateId,
      selectedShippingStateId,
    };
    updateStore(submitValues);
    jumpToStep(2);
  };

  const handleSameAsBillingChange = (e, setFieldValue, values) => {
    const isChecked = e.target.checked;
    setFieldValue('sameAsBilling', isChecked);

    if (isChecked) {
      setFieldValue('shippingAddress.addressLine1', values.billingAddress.addressLine1);
      setFieldValue('shippingAddress.addressLine2', values.billingAddress.addressLine2);
      setFieldValue('shippingAddress.street', values.billingAddress.street);
      setFieldValue('shippingAddress.city', values.billingAddress.city);
      setFieldValue('shippingAddress.state', values.billingAddress.state);
      setFieldValue('shippingAddress.postalCode', values.billingAddress.postalCode);
      setFieldValue('shippingAddress.country', values.billingAddress.country);
      setFieldValue('shippingAddress.isoCountryCode', values.billingAddress.isoCountryCode);
      setSelectedShippingCountryId(selectedBillingCountryId);
      setSelectedShippingStateId(selectedBillingStateId);
    }
  };

  return (
    <div className="step step2 mt-5">
      <div className="row justify-content-md-center">
        <div className="col-lg-12">
          <div className="billing-address mb-5">
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
              enableReinitialize
            >
              {({ touched, errors, values, setFieldValue }) => (
                <Form className="form-horizontal mt-2">
                  <h4 className="mb-3">Billing Address Details</h4>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <Label htmlFor="billingAddress.addressLine1">
                        Address Line 1<span className="text-danger">*</span>
                      </Label>
                      <Field
                        type="text"
                        name="billingAddress.addressLine1"
                        placeholder="Enter Billing Address Line 1"
                        className={`form-control${
                          touched.billingAddress?.addressLine1 &&
                          errors.billingAddress?.addressLine1
                            ? ' is-invalid'
                            : ''
                        }`}
                        maxLength={200}
                      />
                      <ErrorMessage
                        name="billingAddress.addressLine1"
                        component="div"
                        className="invalid-feedback"
                      />
                    </div>
                    <div className="col-md-4">
                      <Label htmlFor="billingAddress.addressLine2">Address Line 2</Label>
                      <Field
                        type="text"
                        name="billingAddress.addressLine2"
                        className="form-control"
                        placeholder="Enter Billing Address Line 2"
                        maxLength={200}
                      />
                    </div>
                    <div className="col-md-4">
                      <Label htmlFor="billingAddress.street">Street</Label>
                      <Field
                        type="text"
                        name="billingAddress.street"
                        className="form-control"
                        placeholder="Enter Billing Street"
                        maxLength={200}
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-4">
                      <Label>
                        Country<span className="text-danger">*</span>
                      </Label>
                      <Field
                        as="select"
                        name="billingAddress.country"
                        className={`form-control${
                          touched.billingAddress?.country && errors.billingAddress?.country
                            ? ' is-invalid'
                            : ''
                        }`}
                        onChange={(e) => {
                          const countryName = e.target.value;
                          const selectedCountry = countries.find((c) => c.name === countryName);
                          setSelectedBillingCountryId(selectedCountry?.countryId || '');
                          setFieldValue('billingAddress.country', countryName);
                          setFieldValue(
                            'billingAddress.isoCountryCode',
                            selectedCountry?.shortName || '',
                          );
                          setFieldValue('billingAddress.state', '');
                          setFieldValue('billingAddress.city', '');
                        }}
                        value={values.billingAddress.country || ''}
                      >
                        <option value="">Select Country</option>
                        {countries.map((country) => (
                          <option
                            key={country.countryId}
                            value={country.name}
                            selected={country.name === values.billingAddress.country}
                          >
                            {country.name}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage
                        name="billingAddress.country"
                        component="div"
                        className="invalid-feedback"
                      />
                    </div>

                    <div className="col-md-4">
                      <Label>
                        State<span className="text-danger">*</span>
                      </Label>
                      <Field
                        as="select"
                        name="billingAddress.state"
                        className={`form-control${
                          touched.billingAddress?.state && errors.billingAddress?.state
                            ? ' is-invalid'
                            : ''
                        }`}
                        disabled={!values.billingAddress.country}
                        onChange={(e) => {
                          const stateName = e.target.value;
                          const selectedState = billingStates.find((s) => s.name === stateName);
                          setSelectedBillingStateId(selectedState?.stateId || '');
                          setFieldValue('billingAddress.state', stateName);
                          setFieldValue('billingAddress.city', '');
                        }}
                        value={values.billingAddress.state || ''}
                      >
                        <option value="">Select State</option>
                        {billingStates.map((state) => (
                          <option
                            key={state.stateId}
                            value={state.name}
                            selected={state.name === values.billingAddress.state}
                          >
                            {state.name}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage
                        name="billingAddress.state"
                        component="div"
                        className="invalid-feedback"
                      />
                    </div>

                    <div className="col-md-4">
                      <Label>
                        City<span className="text-danger">*</span>
                      </Label>
                      <Field
                        as="select"
                        name="billingAddress.city"
                        className={`form-control${
                          touched.billingAddress?.city && errors.billingAddress?.city
                            ? ' is-invalid'
                            : ''
                        }`}
                        disabled={!values.billingAddress.state}
                      >
                        <option value="">Select City</option>
                        {billingCities.map((city) => (
                          <option key={city.cityId} value={city.name}>
                            {city.name}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage
                        name="billingAddress.city"
                        component="div"
                        className="invalid-feedback"
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-4">
                      <Label htmlFor="billingAddress.postalCode">
                        Postal Code<span className="text-danger">*</span>
                      </Label>
                      <Field
                        type="text"
                        name="billingAddress.postalCode"
                        placeholder="Enter Billing Postal Code"
                        className={`form-control${
                          touched.billingAddress?.postalCode && errors.billingAddress?.postalCode
                            ? ' is-invalid'
                            : ''
                        }`}
                        maxLength={6}
                      />
                      <ErrorMessage
                        name="billingAddress.postalCode"
                        component="div"
                        className="invalid-feedback"
                      />
                    </div>
                    <div className="col-md-4">
                      <Label htmlFor="billingAddress.isoCountryCode">Country Code</Label>
                      <Field
                        type="text"
                        name="billingAddress.isoCountryCode"
                        className="form-control"
                        placeholder="e.g., IN, US, CA, GB"
                        maxLength={3}
                      />
                    </div>
                  </div>
                  <h4 className="mb-3">Shipping Address Details</h4>
                  <div className="row mb-3">
                    <div className="col-md-12">
                      <div className="form-check">
                        <Field
                          type="checkbox"
                          className="form-check-input"
                          id="sameAsBilling"
                          name="sameAsBilling"
                          checked={values.sameAsBilling}
                          onChange={(e) => handleSameAsBillingChange(e, setFieldValue, values)}
                        />
                        <Label className="form-check-label" htmlFor="sameAsBilling">
                          Same as Billing Address
                        </Label>
                      </div>
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <Label htmlFor="shippingAddress.addressLine1">
                        Address Line 1<span className="text-danger">*</span>
                      </Label>
                      <Field
                        type="text"
                        name="shippingAddress.addressLine1"
                        placeholder="Enter Shipping Address Line 1"
                        className={`form-control${
                          touched.shippingAddress?.addressLine1 &&
                          errors.shippingAddress?.addressLine1
                            ? ' is-invalid'
                            : ''
                        }`}
                        maxLength={200}
                      />
                      <ErrorMessage
                        name="shippingAddress.addressLine1"
                        component="div"
                        className="invalid-feedback"
                      />
                    </div>
                    <div className="col-md-4">
                      <Label htmlFor="shippingAddress.addressLine2">Address Line 2</Label>
                      <Field
                        type="text"
                        name="shippingAddress.addressLine2"
                        className="form-control"
                        placeholder="Enter Shipping Address Line 2"
                        maxLength={200}
                      />
                    </div>
                    <div className="col-md-4">
                      <Label htmlFor="shippingAddress.street">Street</Label>
                      <Field
                        type="text"
                        name="shippingAddress.street"
                        className="form-control"
                        placeholder="Enter Shipping Street"
                        maxLength={200}
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-4">
                      <Label>
                        Country<span className="text-danger">*</span>
                      </Label>
                      <Field
                        as="select"
                        name="shippingAddress.country"
                        className={`form-control${
                          touched.shippingAddress?.country && errors.shippingAddress?.country
                            ? ' is-invalid'
                            : ''
                        }`}
                        onChange={(e) => {
                          const countryName = e.target.value;
                          const selectedCountry = countries.find((c) => c.name === countryName);
                          setSelectedShippingCountryId(selectedCountry?.countryId || '');
                          setFieldValue('shippingAddress.country', countryName);
                          setFieldValue(
                            'shippingAddress.isoCountryCode',
                            selectedCountry?.shortName || '',
                          );
                          setFieldValue('shippingAddress.state', '');
                          setFieldValue('shippingAddress.city', '');
                        }}
                        value={values.shippingAddress.country || ''}
                      >
                        <option value="">Select Country</option>
                        {countries.map((country) => (
                          <option
                            key={country.countryId}
                            value={country.name}
                            selected={country.name === values.shippingAddress.country}
                          >
                            {country.name}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage
                        name="shippingAddress.country"
                        component="div"
                        className="invalid-feedback"
                      />
                    </div>

                    <div className="col-md-4">
                      <Label>
                        State<span className="text-danger">*</span>
                      </Label>
                      <Field
                        as="select"
                        name="shippingAddress.state"
                        className={`form-control${
                          touched.shippingAddress?.state && errors.shippingAddress?.state
                            ? ' is-invalid'
                            : ''
                        }`}
                        onChange={(e) => {
                          const stateName = e.target.value;
                          const selectedState = shippingStates.find((s) => s.name === stateName);
                          setSelectedShippingStateId(selectedState?.stateId || '');
                          setFieldValue('shippingAddress.state', stateName);
                          setFieldValue('shippingAddress.city', '');
                        }}
                        value={values.shippingAddress.state || ''}
                      >
                        <option value="">Select State</option>
                        {shippingStates.map((state) => (
                          <option
                            key={state.stateId}
                            value={state.name}
                            selected={state.name === values.shippingAddress.state}
                          >
                            {state.name}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage
                        name="shippingAddress.state"
                        component="div"
                        className="invalid-feedback"
                      />
                    </div>

                    <div className="col-md-4">
                      <Label>
                        City<span className="text-danger">*</span>
                      </Label>
                      <Field
                        as="select"
                        name="shippingAddress.city"
                        className={`form-control${
                          touched.shippingAddress?.city && errors.shippingAddress?.city
                            ? ' is-invalid'
                            : ''
                        }`}
                      >
                        <option value="">Select City</option>
                        {shippingCities.map((city) => (
                          <option key={city.cityId} value={city.name}>
                            {city.name}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage
                        name="shippingAddress.city"
                        component="div"
                        className="invalid-feedback"
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-4">
                      <Label htmlFor="shippingAddress.postalCode">
                        Postal Code<span className="text-danger">*</span>
                      </Label>
                      <Field
                        type="text"
                        name="shippingAddress.postalCode"
                        placeholder="Enter Shipping Postal Code"
                        className={`form-control${
                          touched.shippingAddress?.postalCode && errors.shippingAddress?.postalCode
                            ? ' is-invalid'
                            : ''
                        }`}
                        maxLength={6}
                      />
                      <ErrorMessage
                        name="shippingAddress.postalCode"
                        component="div"
                        className="invalid-feedback"
                      />
                    </div>
                    <div className="col-md-4">
                      <Label htmlFor="shippingAddress.isoCountryCode">Country Code</Label>
                      <Field
                        type="text"
                        name="shippingAddress.isoCountryCode"
                        className="form-control"
                        placeholder="e.g., IN, US, CA, GB"
                        maxLength={3}
                      />
                    </div>
                  </div>

                  <div className="row" style={{ marginBottom: '-50px' }}>
                    <div className="col text-end">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => jumpToStep(0)}
                        style={{ marginRight: '10px' }}
                      >
                        Previous
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Next
                      </button>
                    </div>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </div>
  );
};

Step2.propTypes = {
  jumpToStep: PropTypes.func.isRequired,
  updateStore: PropTypes.func.isRequired,
  addressData: PropTypes.shape({
    billingAddress: PropTypes.object.isRequired,
    shippingAddresses: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
};

export default Step2;
