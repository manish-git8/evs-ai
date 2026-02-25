import React, { useState, useEffect, useRef } from 'react';
import { Formik, Field, Form, ErrorMessage, useFormikContext } from 'formik';
import * as Yup from 'yup';
import { useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Label } from 'reactstrap';
import MasterDataService from '../../../services/MasterDataService';
import useCountries from '../../../hooks/useCountries';

const Step3 = ({ jumpToStep, updateStore, contactData }) => {
  const { countries } = useCountries();
  const [primaryStates, setPrimaryStates] = useState([]);
  const [primaryCities, setPrimaryCities] = useState([]);
  const [secondaryStates, setSecondaryStates] = useState([]);
  const [secondaryCities, setSecondaryCities] = useState([]);
  const [selectedPrimaryCountryId, setSelectedPrimaryCountryId] = useState('');
  const [selectedPrimaryStateId, setSelectedPrimaryStateId] = useState('');
  const [selectedSecondaryCountryId, setSelectedSecondaryCountryId] = useState('');
  const [selectedSecondaryStateId, setSelectedSecondaryStateId] = useState('');
  const { companyId } = useParams();
  const isEditMode =
    contactData?.primaryContact?.address?.addressId ||
    contactData?.secondaryContact?.address?.addressId;

  const CountryDataLoader = () => {
    const { setFieldValue } = useFormikContext();
    const hasInitializedRef = useRef(false);

    useEffect(() => {
      // Prevent multiple fetches
      if (hasInitializedRef.current) return;
      hasInitializedRef.current = true;

      const initializeCountryData = () => {
        if (!countries || countries.length === 0) return;

        try {
          if (isEditMode || contactData?.primaryContact?.address?.country) {
            const primaryCountry = countries.find(
              (c) => c.name === contactData?.primaryContact?.address?.country,
            );
            const secondaryCountry = countries.find(
              (c) => c.name === contactData?.secondaryContact?.address?.country,
            );
            setSelectedPrimaryCountryId(primaryCountry?.countryId || '');
            setSelectedSecondaryCountryId(secondaryCountry?.countryId || '');
            if (primaryCountry) {
              setFieldValue('primaryContact.address.isoCountryCode', primaryCountry.shortName);
            }
            if (secondaryCountry) {
              setFieldValue('secondaryContact.address.isoCountryCode', secondaryCountry.shortName);
            }
          }
        } catch (error) {
          console.error('Error initializing country data:', error);
        }
      };
      initializeCountryData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [countries]); // Only initialize when countries are loaded

    return null;
  };

  useEffect(() => {
    const fetchPrimaryStates = async () => {
      if (selectedPrimaryCountryId) {
        try {
          const response = await MasterDataService.getStatesByCountryId(selectedPrimaryCountryId);
          const fetchedStates = response.data;
          setPrimaryStates(fetchedStates);
          if (isEditMode || contactData?.primaryContact?.address?.state) {
            const primaryState = fetchedStates.find(
              (s) => s.name === contactData?.primaryContact?.address?.state,
            );
            setSelectedPrimaryStateId(primaryState?.stateId || '');
          }
        } catch (error) {
          console.error('Error fetching primary states:', error);
        }
      } else {
        setPrimaryStates([]);
        setSelectedPrimaryStateId('');
      }
    };
    fetchPrimaryStates();
  }, [selectedPrimaryCountryId, isEditMode, contactData]);

  useEffect(() => {
    const fetchPrimaryCities = async () => {
      if (selectedPrimaryStateId) {
        try {
          const response = await MasterDataService.getCitiesByStateId(selectedPrimaryStateId);
          setPrimaryCities(response.data);
        } catch (error) {
          console.error('Error fetching primary cities:', error);
        }
      } else {
        setPrimaryCities([]);
      }
    };
    fetchPrimaryCities();
  }, [selectedPrimaryStateId]);

  useEffect(() => {
    const fetchSecondaryStates = async () => {
      if (selectedSecondaryCountryId) {
        try {
          const response = await MasterDataService.getStatesByCountryId(selectedSecondaryCountryId);
          const fetchedStates = response.data;
          setSecondaryStates(fetchedStates);
          if (isEditMode || contactData?.secondaryContact?.address?.state) {
            const secondaryState = fetchedStates.find(
              (s) => s.name === contactData?.secondaryContact?.address?.state,
            );
            setSelectedSecondaryStateId(secondaryState?.stateId || '');
          }
        } catch (error) {
          console.error('Error fetching secondary states:', error);
        }
      } else {
        setSecondaryStates([]);
        setSelectedSecondaryStateId('');
      }
    };
    fetchSecondaryStates();
  }, [selectedSecondaryCountryId, isEditMode, contactData]);

  useEffect(() => {
    const fetchSecondaryCities = async () => {
      if (selectedSecondaryStateId) {
        try {
          const response = await MasterDataService.getCitiesByStateId(selectedSecondaryStateId);
          setSecondaryCities(response.data);
        } catch (error) {
          console.error('Error fetching secondary cities:', error);
        }
      } else {
        setSecondaryCities([]);
      }
    };
    fetchSecondaryCities();
  }, [selectedSecondaryStateId]);

  const validationSchema = Yup.object({
    primaryContact: Yup.object().shape({
      firstName: Yup.string().required('First name is required'),
      lastName: Yup.string().required('Last name is required'),
      email: Yup.string().email('Invalid email format').required('Email is required'),
      phone: Yup.string()
        .trim()
        .matches(
          /^\+?[1-9]\d{9,14}$/,
          'Enter a valid phone number (10–15 digits)'
        )
        .required('Phone number is required'),

      mobile: Yup.string()
        .trim()
        .matches(
          /^\+?[1-9]\d{9,14}$/,
          'Enter a valid mobile number (10–15 digits)'
        )
        .required('Mobile number is required'),
      address: Yup.object().shape({
        addressLine1: Yup.string().required('Address Line 1 is required'),
        city: Yup.string().required('City is required'),
        state: Yup.string().required('State is required'),
        country: Yup.string().required('Country is required'),
        postalCode: Yup.string().required('Postal Code is required'),
      }),
    }),
    secondaryContact: Yup.object().shape({
      firstName: Yup.string(),
      lastName: Yup.string(),
      email: Yup.string()
        .email('Invalid email format')
        .when(['firstName', 'lastName'], {
          is: (firstName, lastName) => !!firstName || !!lastName,
          then: (schema) => schema.required('Email is required'),
        }),
      address: Yup.object()
        .shape({
          addressLine1: Yup.string(),
          city: Yup.string(),
          state: Yup.string(),
          country: Yup.string(),
          postalCode: Yup.string(),
        })
        .when(['firstName', 'lastName'], {
          is: (firstName, lastName) => !!firstName || !!lastName,
          then: (schema) =>
            schema.shape({
              addressLine1: Yup.string().required('Address Line 1 is required'),
              city: Yup.string().required('City is required'),
              state: Yup.string().required('State is required'),
              country: Yup.string().required('Country is required'),
              postalCode: Yup.string().required('Postal Code is required'),
            }),
        }),
    }),
  });

  const initialValues = {
    primaryContact: {
      firstName: contactData?.primaryContact?.firstName || '',
      lastName: contactData?.primaryContact?.lastName || '',
      email: contactData?.primaryContact?.email || '',
      phone: contactData?.primaryContact?.phone || '',
      mobile: contactData?.primaryContact?.mobile || '',
      userName: contactData?.primaryContact?.userName || '',
      title: contactData?.primaryContact?.title || '',
      ext: contactData?.primaryContact?.ext || '',
      address: {
        addressId: isEditMode ? contactData?.primaryContact?.address?.addressId || '' : '',
        companyId: isEditMode ? contactData?.primaryContact?.address?.companyId || '' : '',
        addressLine1: contactData?.primaryContact?.address?.addressLine1 || '',
        addressLine2: contactData?.primaryContact?.address?.addressLine2 || '',
        addressType: 'PRIMARY',
        city: contactData?.primaryContact?.address?.city || '',
        state: contactData?.primaryContact?.address?.state || '',
        country: contactData?.primaryContact?.address?.country || '',
        postalCode: contactData?.primaryContact?.address?.postalCode || '',
        isoCountryCode: contactData?.primaryContact?.address?.isoCountryCode || '',
      },
    },
    secondaryContact: {
      firstName: contactData?.secondaryContact?.firstName || '',
      lastName: contactData?.secondaryContact?.lastName || '',
      email: contactData?.secondaryContact?.email || '',
      phone: contactData?.secondaryContact?.phone || '',
      mobile: contactData?.secondaryContact?.mobile || '',
      userName: contactData?.secondaryContact?.userName || '',
      title: contactData?.secondaryContact?.title || '',
      ext: contactData?.secondaryContact?.ext || '',
      address: {
        addressId: isEditMode ? contactData?.secondaryContact?.address?.addressId || '' : '',
        companyId: isEditMode ? contactData?.secondaryContact?.address?.companyId || '' : '',
        addressLine1: contactData?.secondaryContact?.address?.addressLine1 || '',
        addressLine2: contactData?.secondaryContact?.address?.addressLine2 || '',
        addressType: 'SECONDARY',
        city: contactData?.secondaryContact?.address?.city || '',
        state: contactData?.secondaryContact?.address?.state || '',
        country: contactData?.secondaryContact?.address?.country || '',
        postalCode: contactData?.secondaryContact?.address?.postalCode || '',
        isoCountryCode: contactData?.secondaryContact?.address?.isoCountryCode || '',
      },
    },
  };

  const handleSubmit = (values) => {
    const store = contactData;
    const mergedPrimaryContact = {
      ...((store && store.primaryContact) || {}),
      ...values.primaryContact,
      userId:
        values.primaryContact.userId || (store.primaryContact && store.primaryContact.userId) || '',
      entityId:
        values.primaryContact.entityId ||
        (store.primaryContact && store.primaryContact.entityId) ||
        '',
      address: {
        ...((store && store.primaryContact && store.primaryContact.address) || {}),
        ...values.primaryContact.address,
        addressId:
          values.primaryContact.address.addressId ||
          (store.primaryContact &&
            store.primaryContact.address &&
            store.primaryContact.address.addressId) ||
          '',
        companyId:
          values.primaryContact.address.companyId ||
          (store.primaryContact &&
            store.primaryContact.address &&
            store.primaryContact.address.companyId) ||
          '',
      },
      role: values.primaryContact.role || (store.primaryContact && store.primaryContact.role) || [],
    };
    const mergedSecondaryContact = {
      ...((store && store.secondaryContact) || {}),
      ...values.secondaryContact,
      userId:
        values.secondaryContact.userId ||
        (store.secondaryContact && store.secondaryContact.userId) ||
        '',
      entityId:
        values.secondaryContact.entityId ||
        (store.secondaryContact && store.secondaryContact.entityId) ||
        '',
      address: {
        ...((store && store.secondaryContact && store.secondaryContact.address) || {}),
        ...values.secondaryContact.address,
        addressId:
          values.secondaryContact.address.addressId ||
          (store.secondaryContact &&
            store.secondaryContact.address &&
            store.secondaryContact.address.addressId) ||
          '',
        companyId:
          values.secondaryContact.address.companyId ||
          (store.secondaryContact &&
            store.secondaryContact.address &&
            store.secondaryContact.address.companyId) ||
          '',
      },
      role:
        values.secondaryContact.role ||
        (store.secondaryContact && store.secondaryContact.role) ||
        [],
    };
    const submitValues = {
      primaryContact: mergedPrimaryContact,
      secondaryContact: mergedSecondaryContact,
    };
    updateStore(submitValues);
    jumpToStep(3);
  };

  const SyncEmailToUsername = () => {
    const { values, setFieldValue } = useFormikContext();
    const prevPrimaryEmailRef = useRef('');
    const prevSecondaryEmailRef = useRef('');

    useEffect(() => {
      const currentEmail = values.primaryContact?.email || '';
      if (prevPrimaryEmailRef.current !== currentEmail) {
        setFieldValue('primaryContact.userName', currentEmail);
        prevPrimaryEmailRef.current = currentEmail;
      }
    }, [values.primaryContact?.email, setFieldValue]);

    useEffect(() => {
      const currentEmail = values.secondaryContact?.email || '';
      if (prevSecondaryEmailRef.current !== currentEmail) {
        setFieldValue('secondaryContact.userName', currentEmail);
        prevSecondaryEmailRef.current = currentEmail;
      }
    }, [values.secondaryContact?.email, setFieldValue]);

    return null;
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({
        isSubmitting,
        setTouched,
        validateForm,
        submitForm,
        touched,
        errors,
        values,
        setFieldValue,
      }) => (
        <Form>
          <SyncEmailToUsername />
          <CountryDataLoader />
          <div className="step step3 mt-5">
            <div className="row justify-content-md-center">
              <div className="col-lg-12">
                <div className="primary-contact mb-5">
                  <h4>Primary Contact Details</h4>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label htmlFor="primaryContact.title">Title</Label>
                        <Field as="select" name="primaryContact.title" className="form-control">
                          <option value="" disabled selected>
                            Select Title
                          </option>
                          <option value="Mr">Mr</option>
                          <option value="Mrs">Mrs</option>
                          <option value="Miss">Miss</option>
                          <option value="Ms">Ms</option>
                          <option value="Dr">Dr</option>
                          <option value="Prof">Prof</option>
                          <option value="Rev">Rev</option>
                          <option value="Sir">Sir</option>
                        </Field>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>
                          First Name<span className="text-danger">*</span>
                        </Label>
                        <Field
                          type="text"
                          name="primaryContact.firstName"
                          placeholder="Enter First Name"
                          className={`form-control${
                            touched.primaryContact?.firstName && errors.primaryContact?.firstName
                            ? ' is-invalid'
                            : ''
                            }`}
                          onKeyDown={(e) => {
                            if (e.key === ' ') {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => {
                            e.target.value = e.target.value.replace(/\s/g, '');
                            setFieldValue('primaryContact.firstName', e.target.value);
                          }}
                        />
                        <ErrorMessage
                          name="primaryContact.firstName"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>
                          Last Name<span className="text-danger">*</span>
                        </Label>
                        <Field
                          type="text"
                          name="primaryContact.lastName"
                          placeholder="Enter Last Name"
                          className={`form-control${
                            touched.primaryContact?.lastName && errors.primaryContact?.lastName
                            ? ' is-invalid'
                            : ''
                            }`}
                          onKeyDown={(e) => {
                            if (e.key === ' ') {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => {
                            const filteredValue = e.target.value.replace(/\s/g, '');
                            if (e.target.value !== filteredValue) {
                              e.target.value = filteredValue;
                            }
                            setFieldValue('primaryContact.lastName', filteredValue);
                          }}
                        />
                        <ErrorMessage
                          name="primaryContact.lastName"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>
                          Email<span className="text-danger">*</span>
                        </Label>
                        <Field
                          type="email"
                          name="primaryContact.email"
                          placeholder="Enter Email"
                          className={`form-control${
                            touched.primaryContact?.email && errors.primaryContact?.email
                            ? ' is-invalid'
                            : ''
                            }`}
                          disabled={!!companyId}
                        />
                        <ErrorMessage
                          name="primaryContact.email"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>Phone</Label>
                        <span className="text-danger">*</span>
                        <Field
                          type="tel"
                          name="primaryContact.phone"
                          placeholder="Enter Phone Number"
                          className={`form-control${
                            touched.primaryContact?.phone && errors.primaryContact?.phone
                            ? ' is-invalid'
                            : ''
                            }`}
                          maxLength={10}
                        />
                        <ErrorMessage
                          name="primaryContact.phone"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>Phone Ext.</Label>
                        <Field name="primaryContact.ext">
                          {({ field, form }) => (
                            <input
                              {...field}
                              type="tel"
                              placeholder="Enter Phone Extension"
                              className="form-control"
                              maxLength={5}
                              onKeyDown={(e) => {
                                if (
                                  !/[0-9+-]/.test(e.key) &&
                                  ![
                                    'Backspace',
                                    'Delete',
                                    'Tab',
                                    'ArrowLeft',
                                    'ArrowRight',
                                    'ArrowUp',
                                    'ArrowDown',
                                  ].includes(e.key)
                                ) {
                                  e.preventDefault();
                                }
                              }}
                              onChange={(e) => {
                                const filteredValue = e.target.value.replace(/[^0-9+-]/g, '');
                                form.setFieldValue(field.name, filteredValue);
                              }}
                            />
                          )}
                        </Field>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>Mobile</Label>
                        <span className="text-danger">*</span>
                        <Field
                          type="tel"
                          name="primaryContact.mobile"
                          placeholder="Enter Mobile Number"
                          className={`form-control${
                            touched.primaryContact?.mobile && errors.primaryContact?.mobile
                            ? ' is-invalid'
                            : ''
                            }`}
                          maxLength={10}
                        />

                        <ErrorMessage
                          name="primaryContact.mobile"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>Username</Label>
                        <Field
                          type="text"
                          name="primaryContact.userName"
                          placeholder="Enter username"
                          className={`form-control${
                            touched.primaryContact?.userName && errors.primaryContact?.userName
                            ? ' is-invalid'
                            : ''
                            }`}
                          disabled={!!values.primaryContact?.userName || !!companyId}
                        />
                        <ErrorMessage
                          name="primaryContact.userName"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>
                          Address Line 1<span className="text-danger">*</span>
                        </Label>
                        <Field
                          type="text"
                          name="primaryContact.address.addressLine1"
                          placeholder="Enter Address Line 1"
                          className={`form-control${
                            touched.primaryContact?.address?.addressLine1 &&
                            errors.primaryContact?.address?.addressLine1
                            ? ' is-invalid'
                            : ''
                            }`}
                          maxLength={200}
                        />
                        <ErrorMessage
                          name="primaryContact.address.addressLine1"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>Address Line 2</Label>
                        <Field
                          type="text"
                          name="primaryContact.address.addressLine2"
                          placeholder="Enter Address Line 2"
                          className="form-control"
                          maxLength={200}
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>
                          Country<span className="text-danger">*</span>
                        </Label>
                        <Field
                          as="select"
                          name="primaryContact.address.country"
                          className={`form-control${
                            touched.primaryContact?.address?.country &&
                            errors.primaryContact?.address?.country
                            ? ' is-invalid'
                            : ''
                            }`}
                          onChange={(e) => {
                            const countryName = e.target.value;
                            const selectedCountry = countries.find((c) => c.name === countryName);
                            setSelectedPrimaryCountryId(selectedCountry?.countryId || '');
                            setFieldValue('primaryContact.address.country', countryName);
                            setFieldValue(
                              'primaryContact.address.isoCountryCode',
                              selectedCountry?.shortName || '',
                            );
                            setFieldValue('primaryContact.address.state', '');
                            setFieldValue('primaryContact.address.city', '');
                          }}
                        >
                          <option value="">Select Country</option>
                          {countries.map((country) => (
                            <option
                              key={country.countryId}
                              value={country.name}
                              selected={country.name === values.primaryContact.address.country}
                            >
                              {country.name}
                            </option>
                          ))}
                        </Field>
                        <ErrorMessage
                          name="primaryContact.address.country"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>
                          State<span className="text-danger">*</span>
                        </Label>
                        <Field
                          as="select"
                          name="primaryContact.address.state"
                          className={`form-control${
                            touched.primaryContact?.address?.state &&
                            errors.primaryContact?.address?.state
                            ? ' is-invalid'
                            : ''
                            }`}
                          disabled={!values.primaryContact.address.country}
                          onChange={(e) => {
                            const stateName = e.target.value;
                            const selectedState = primaryStates.find((s) => s.name === stateName);
                            setSelectedPrimaryStateId(selectedState?.stateId || '');
                            setFieldValue('primaryContact.address.state', stateName);
                            setFieldValue('primaryContact.address.city', '');
                          }}
                        >
                          <option value="">Select State</option>
                          {primaryStates.map((state) => (
                            <option key={state.stateId} value={state.name}>
                              {state.name}
                            </option>
                          ))}
                        </Field>
                        <ErrorMessage
                          name="primaryContact.address.state"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>
                          City<span className="text-danger">*</span>
                        </Label>
                        <Field
                          as="select"
                          name="primaryContact.address.city"
                          className={`form-control${
                            touched.primaryContact?.address?.city &&
                            errors.primaryContact?.address?.city
                            ? ' is-invalid'
                            : ''
                            }`}
                          disabled={!values.primaryContact.address.state}
                        >
                          <option value="">Select City</option>
                          {primaryCities.map((city) => (
                            <option key={city.cityId} value={city.name}>
                              {city.name}
                            </option>
                          ))}
                        </Field>
                        <ErrorMessage
                          name="primaryContact.address.city"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>
                          Postal Code<span className="text-danger">*</span>
                        </Label>
                        <Field
                          type="text"
                          name="primaryContact.address.postalCode"
                          placeholder="Enter Postal Code"
                          className={`form-control${
                            touched.primaryContact?.address?.postalCode &&
                            errors.primaryContact?.address?.postalCode
                            ? ' is-invalid'
                            : ''
                            }`}
                          maxLength={10}
                        />
                        <ErrorMessage
                          name="primaryContact.address.postalCode"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>Country Code</Label>
                        <Field
                          type="text"
                          name="primaryContact.address.isoCountryCode"
                          className="form-control"
                          placeholder="e.g.,IN, US, CA, GB"
                          maxLength={3}
                          onInput={(e) => {
                            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                          }}
                          style={{ textTransform: 'uppercase' }}
                        />
                      </div>
                    </div>
                  </div>

                  <h4>Secondary Contact Details</h4>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label htmlFor="secondaryContact.title">Title</Label>
                        <Field as="select" name="secondaryContact.title" className="form-control">
                          <option value="" disabled selected>
                            Select Title
                          </option>
                          <option value="Mr">Mr</option>
                          <option value="Mrs">Mrs</option>
                          <option value="Miss">Miss</option>
                          <option value="Ms">Ms</option>
                          <option value="Dr">Dr</option>
                          <option value="Prof">Prof</option>
                          <option value="Rev">Rev</option>
                          <option value="Sir">Sir</option>
                        </Field>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>First Name</Label>
                        <Field
                          type="text"
                          name="secondaryContact.firstName"
                          placeholder="Enter First Name"
                          className={`form-control${
                            touched.secondaryContact?.firstName &&
                            errors.secondaryContact?.firstName
                            ? ' is-invalid'
                            : ''
                            }`}
                          onKeyDown={(e) => {
                            if (e.key === ' ') {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => {
                            e.target.value = e.target.value.replace(/\s/g, '');
                            setFieldValue('secondaryContact.firstName', e.target.value);
                          }}
                        />
                        <ErrorMessage
                          name="secondaryContact.firstName"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>Last Name</Label>
                        <Field
                          type="text"
                          name="secondaryContact.lastName"
                          placeholder="Enter Last Name"
                          className={`form-control${
                            touched.secondaryContact?.lastName && errors.secondaryContact?.lastName
                            ? ' is-invalid'
                            : ''
                            }`}
                          onKeyDown={(e) => {
                            if (e.key === ' ') {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => {
                            const filteredValue = e.target.value.replace(/\s/g, '');
                            if (e.target.value !== filteredValue) {
                              e.target.value = filteredValue;
                            }
                            setFieldValue('secondaryContact.lastName', filteredValue);
                          }}
                        />
                        <ErrorMessage
                          name="secondaryContact.lastName"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>
                          Email
                          {(values.secondaryContact.firstName ||
                            values.secondaryContact.lastName) && (
                              <span className="text-danger">*</span>
                            )}
                        </Label>
                        <Field
                          type="email"
                          name="secondaryContact.email"
                          placeholder="Enter Email"
                          className={`form-control${
                            touched.secondaryContact?.email && errors.secondaryContact?.email
                              ? ' is-invalid'
                              : ''
                          }`}
                        />
                        <ErrorMessage
                          name="secondaryContact.email"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>Phone</Label>
                        <Field
                          type="tel"
                          name="secondaryContact.phone"
                          placeholder="Enter Phone Number"
                          className="form-control"
                          maxLength={10}
                          pattern="[0-9]*"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>Phone Ext.</Label>
                        <Field name="secondaryContact.ext">
                          {({ field, form }) => (
                            <input
                              {...field}
                              type="tel"
                              placeholder="Enter Phone Extension"
                              className="form-control"
                              maxLength={5}
                              onKeyDown={(e) => {
                                if (
                                  !/[0-9+-]/.test(e.key) &&
                                  ![
                                    'Backspace',
                                    'Delete',
                                    'Tab',
                                    'ArrowLeft',
                                    'ArrowRight',
                                    'ArrowUp',
                                    'ArrowDown',
                                  ].includes(e.key)
                                ) {
                                  e.preventDefault();
                                }
                              }}
                              onChange={(e) => {
                                const filteredValue = e.target.value.replace(/[^0-9+-]/g, '');
                                form.setFieldValue(field.name, filteredValue);
                              }}
                            />
                          )}
                        </Field>
                      </div>
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>Mobile</Label>
                        <Field
                          type="tel"
                          name="secondaryContact.mobile"
                          placeholder="Enter Mobile Number"
                          className="form-control"
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
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>Username</Label>
                        <Field
                          type="text"
                          name="secondaryContact.userName"
                          placeholder="Enter username"
                          className={`form-control${
                            touched.secondaryContact?.userName && errors.secondaryContact?.userName
                            ? ' is-invalid'
                            : ''
                            }`}
                          disabled={!!values.secondaryContact?.userName || !!companyId}
                        />
                        <ErrorMessage
                          name="secondaryContact.userName"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>
                          Address Line 1
                          {(values.secondaryContact.firstName ||
                            values.secondaryContact.lastName) && (
                              <span className="text-danger">*</span>
                            )}
                        </Label>
                        <Field
                          type="text"
                          name="secondaryContact.address.addressLine1"
                          placeholder="Enter Address Line 1"
                          className={`form-control${
                            touched.secondaryContact?.address?.addressLine1 &&
                            errors.secondaryContact?.address?.addressLine1
                            ? ' is-invalid'
                            : ''
                            }`}
                          maxLength={200}
                        />
                        <ErrorMessage
                          name="secondaryContact.address.addressLine1"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>Address Line 2</Label>
                        <Field
                          type="text"
                          name="secondaryContact.address.addressLine2"
                          placeholder="Enter Address Line 2"
                          className="form-control"
                          maxLength={200}
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>
                          Country
                          {(values.secondaryContact.firstName ||
                            values.secondaryContact.lastName) && (
                              <span className="text-danger">*</span>
                            )}
                        </Label>
                        <Field
                          as="select"
                          name="secondaryContact.address.country"
                          className={`form-control${
                            touched.secondaryContact?.address?.country &&
                            errors.secondaryContact?.address?.country
                            ? ' is-invalid'
                            : ''
                            }`}
                          onChange={(e) => {
                            const countryName = e.target.value;
                            const selectedCountry = countries.find((c) => c.name === countryName);
                            setSelectedSecondaryCountryId(selectedCountry?.countryId || '');
                            setFieldValue('secondaryContact.address.country', countryName);
                            setFieldValue(
                              'secondaryContact.address.isoCountryCode',
                              selectedCountry?.shortName || '',
                            );
                            setFieldValue('secondaryContact.address.state', '');
                            setFieldValue('secondaryContact.address.city', '');
                          }}
                          value={values.secondaryContact.address.country || ''}
                        >
                          <option value="">Select Country</option>
                          {countries.map((country) => (
                            <option
                              key={country.countryId}
                              value={country.name}
                              selected={country.name === values.secondaryContact.address.country}
                            >
                              {country.name}
                            </option>
                          ))}
                        </Field>

                        <ErrorMessage
                          name="secondaryContact.address.country"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>
                          State
                          {(values.secondaryContact.firstName ||
                            values.secondaryContact.lastName) && (
                              <span className="text-danger">*</span>
                            )}
                        </Label>
                        <Field
                          as="select"
                          name="secondaryContact.address.state"
                          className={`form-control${
                            touched.secondaryContact?.address?.state &&
                            errors.secondaryContact?.address?.state
                            ? ' is-invalid'
                            : ''
                            }`}
                          disabled={!values.secondaryContact.address.country}
                          onChange={(e) => {
                            const stateName = e.target.value;
                            const selectedState = secondaryStates.find((s) => s.name === stateName);
                            setSelectedSecondaryStateId(selectedState?.stateId || '');
                            setFieldValue('secondaryContact.address.state', stateName);
                            setFieldValue('secondaryContact.address.city', '');
                          }}
                          value={values.secondaryContact.address.state || ''}
                        >
                          <option value="">Select State</option>
                          {secondaryStates.map((state) => (
                            <option
                              key={state.stateId}
                              value={state.name}
                              selected={state.name === values.secondaryContact.address.state}
                            >
                              {state.name}
                            </option>
                          ))}
                        </Field>
                        <ErrorMessage
                          name="secondaryContact.address.state"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>
                          City
                          {(values.secondaryContact.firstName ||
                            values.secondaryContact.lastName) && (
                              <span className="text-danger">*</span>
                            )}
                        </Label>
                        <Field
                          as="select"
                          name="secondaryContact.address.city"
                          className={`form-control${
                            touched.secondaryContact?.address?.city &&
                            errors.secondaryContact?.address?.city
                            ? ' is-invalid'
                            : ''
                            }`}
                          disabled={!values.secondaryContact.address.state}
                        >
                          <option value="">Select City</option>
                          {secondaryCities.map((city) => (
                            <option key={city.cityId} value={city.name}>
                              {city.name}
                            </option>
                          ))}
                        </Field>
                        <ErrorMessage
                          name="secondaryContact.address.city"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>
                          Postal Code
                          {(values.secondaryContact.firstName ||
                            values.secondaryContact.lastName) && (
                              <span className="text-danger">*</span>
                            )}
                        </Label>
                        <Field
                          type="text"
                          name="secondaryContact.address.postalCode"
                          placeholder="Enter Postal Code"
                          className={`form-control${
                            touched.secondaryContact?.address?.postalCode &&
                            errors.secondaryContact?.address?.postalCode
                            ? ' is-invalid'
                            : ''
                            }`}
                          maxLength={10}
                        />
                        <ErrorMessage
                          name="secondaryContact.address.postalCode"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label>Country Code</Label>
                        <Field
                          type="text"
                          name="secondaryContact.address.isoCountryCode"
                          className="form-control"
                          placeholder="e.g.,IN, US, CA, GB"
                          maxLength={3}
                          onInput={(e) => {
                            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                          }}
                          style={{ textTransform: 'uppercase' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="d-flex justify-content-end">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => jumpToStep(1)}
                    style={{ marginRight: '10px' }}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={async () => {
                      setTouched({
                        primaryContact: {
                          firstName: true,
                          lastName: true,
                          email: true,
                          phone: true,
                          mobile: true,
                          userName: true,
                          address: {
                            addressLine1: true,
                            country: true,
                            state: true,
                            city: true,
                            postalCode: true,
                          },
                        },
                        secondaryContact: {
                          firstName: true,
                          lastName: true,
                          email: true,
                          userName: true,
                          address: {
                            addressLine1: true,
                            country: true,
                            state: true,
                            city: true,
                            postalCode: true,
                          },
                        },
                      });
                      const validationErrors = await validateForm();
                      if (Object.keys(validationErrors).length === 0) {
                        submitForm();
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Processing...' : 'Next'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
};

Step3.propTypes = {
  jumpToStep: PropTypes.func.isRequired,
  updateStore: PropTypes.func.isRequired,
  contactData: PropTypes.shape({
    primaryContact: PropTypes.object,
    secondaryContact: PropTypes.object,
  }).isRequired,
};

export default Step3;
