import React, { useEffect, useState } from 'react';
import { Label } from 'reactstrap';
import '../../CompanyManagement/ReactBootstrapTable.scss';
import { Link, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Formik, Form, ErrorMessage, Field } from 'formik';
import * as Yup from 'yup';
import CompanyService from '../../../services/CompanyService';
import CompanyCategoryService from '../../../services/CompanyCategoryService';
import MasterDataService from '../../../services/MasterDataService';
import { getCurrencyDisplayName } from '../../../utils/currencyUtils';

const Welcome = ({ getStore, updateStore, jumpToStep }) => {
  const { companyId } = useParams();
  const [formState, setFormState] = useState(() => {
    const storedData = getStore();
    return {
      email: storedData.email || '',
      name: storedData.name || '',
      displayName: storedData.displayName || '',
      fax: storedData.fax || '',
      website: storedData.website || '',
      phone: storedData.phone || '',
      primaryContact: storedData.primaryContact || {},
      secondaryContact: storedData.secondaryContact || {},
      billingAddress: storedData.billingAddress || {},
      shippingAddresses: storedData.shippingAddresses || [],
      categoryId: storedData.categoryId || '',
      subCategoryId: storedData.subCategoryId || '',
      currency: storedData.currency || 'INR',
    };
  });
  const [companyCategory, setCompanyCategory] = useState([]);
  const [companySubCategory, setCompanySubCategory] = useState([]);
  const [filteredCategoryId, setFilteredCategoryId] = useState('');
  const [currencies, setCurrencies] = useState([]);

  useEffect(() => {
    const fetchSubCategories = async () => {
      if (formState.categoryId) {
        try {
          const response = await CompanyCategoryService.getCompanySubCategory(formState.categoryId);
          setCompanySubCategory(response.data);
        } catch (error) {
          console.error('Error fetching sub-categories:', error);
        }
      }
    };
    fetchSubCategories();
  }, [formState.categoryId]);

  useEffect(() => {
    if (formState.categoryId) {
      setFilteredCategoryId(formState.categoryId.toString());
    }
  }, [formState.categoryId]);

  useEffect(() => {
    if (companyId && !formState.name) {
      const fetchData = async () => {
        try {
          const response = await CompanyService.getCompanyByCompanyId(companyId);
          const company = response.data[0];
          if (company) {
            const fetchedData = {
              email: company.email || '',
              name: company.name || '',
              displayName: company.displayName || '',
              fax: company.fax || '',
              website: company.website || '',
              phone: company.phone || '',
              primaryContact: company.primaryContact || {},
              secondaryContact: company.secondaryContact || {},
              billingAddress: company.billingAddress || {},
              shippingAddresses: company.shippingAddresses || [],
              categoryId: company.categoryId || '',
              subCategoryId: company.subCategoryId || '',
              currency: company.currency || 'INR',
            };
            setFormState(fetchedData);
            updateStore(fetchedData);
            if (company.categoryId) {
              setFilteredCategoryId(company.categoryId.toString());
            }
          }
        } catch (error) {
          console.error('Error fetching company data:', error);
        }
      };
      fetchData();
    }
  }, [companyId]);

  useEffect(() => {
    const fetchCompanyCategory = async () => {
      try {
        const response = await CompanyCategoryService.getCompanyCategory();
        setCompanyCategory(response.data);
      } catch (error) {
        console.error('Error fetching company categories:', error);
      }
    };
    fetchCompanyCategory();
  }, []);

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await MasterDataService.getAllCurrencies();
        setCurrencies(response.data || []);
      } catch (error) {
        console.error('Error fetching currencies:', error);
      }
    };
    fetchCurrencies();
  }, []);

  useEffect(() => {
    const fetchCompanySubCategory = async () => {
      if (filteredCategoryId) {
        try {
          const response = await CompanyCategoryService.getCompanySubCategory(filteredCategoryId);
          setCompanySubCategory(response.data);
        } catch (error) {
          console.error('Error fetching states:', error);
        }
      }
    };
    fetchCompanySubCategory();
  }, [filteredCategoryId]);

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    displayName: Yup.string().required('Display name is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    phone: Yup.string()
      .matches(/^[0-9]{10}$/, 'Phone number must be a 10-digit number')
      .required('Phone is required'),
    website: Yup.string()
      .matches(
        /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.){1,}[a-zA-Z]{2,}(\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]*)?$/,
        'Enter a valid website URL',
      )
      .nullable(),
    fax: Yup.string()
      .matches(
        /^(\+\d{1,3}[- ]?)?\d{3}[- ]?\d{3}[- ]?\d{4}$/,
        'Enter a valid fax number (e.g., 123-456-7890 or +1 123 456 7890)',
      )
      .max(15, 'Fax number cannot exceed 15 characters')
      .nullable(),
    categoryId: Yup.string().required('Category is required'),
    subCategoryId: Yup.string().required('Sub Category is required'),
    currency: Yup.string().required('Currency is required'),
  });

  const handleSave = (values) => {
    // Pull existing store IDs if available
    const store = getStore();
    const submitValues = {
      ...store,
      ...values,
      companyId: store.companyId || values.companyId || '',
    };
    updateStore(submitValues);
    jumpToStep(1, submitValues);
  };

  return (
    <div className="step Welcome mt-5">
      <div className="row justify-content-md-center">
        <div className="col col-lg-12">
          <div>
            <h4 className="mb-3">Welcome, Please Enter Company Info</h4>
            <Formik
              initialValues={formState}
              validationSchema={validationSchema}
              onSubmit={handleSave}
              enableReinitialize
            >
              {({ values, handleChange, handleBlur, touched, errors, setFieldValue }) => (
                <Form className="form-horizontal mt-2">
                  <div className="row">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label className="control-label">
                          Name<span className="text-danger">*</span>
                        </Label>
                        <input
                          name="name"
                          value={values.name}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          autoComplete="off"
                          type="text"
                          placeholder="Company name"
                          className={`form-control${
                            touched.name && errors.name ? ' is-invalid' : ''
                          }`}
                          maxLength={200}
                        />
                        <ErrorMessage name="name" component="div" className="invalid-feedback" />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label className="control-label">
                          Display Name<span className="text-danger">*</span>
                        </Label>
                        <input
                          name="displayName"
                          value={values.displayName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          autoComplete="off"
                          type="text"
                          placeholder="Company display name"
                          className={`form-control${
                            touched.displayName && errors.displayName ? ' is-invalid' : ''
                          }`}
                          maxLength={200}
                        />
                        <ErrorMessage
                          name="displayName"
                          component="div"
                          className="invalid-feedback"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label className="control-label">
                          Email<span className="text-danger">*</span>
                        </Label>
                        <input
                          name="email"
                          value={values.email}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          autoComplete="off"
                          type="email"
                          placeholder="company.email@example.com"
                          className={`form-control${
                            touched.email && errors.email ? ' is-invalid' : ''
                          }`}
                          maxLength={200}
                          disabled={!!companyId}
                        />
                        <ErrorMessage name="email" component="div" className="invalid-feedback" />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label className="control-label">Fax</Label>
                        <input
                          name="fax"
                          value={values.fax}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          autoComplete="off"
                          type="text"
                          placeholder="123-456-7890"
                          className={`form-control ${
                            touched.fax && errors.fax ? 'is-invalid' : ''
                          }`}
                          maxLength={15}
                        />
                        <ErrorMessage name="fax" component="div" className="invalid-feedback" />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label className="control-label">Website</Label>
                        <input
                          name="website"
                          value={values.website}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          autoComplete="off"
                          type="text"
                          placeholder="www.example.com"
                          className={`form-control ${
                            touched.website && errors.website ? 'is-invalid' : ''
                          }`}
                          maxLength={200}
                        />
                        <ErrorMessage name="website" component="div" className="invalid-feedback" />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <Label className="control-label">
                          Phone<span className="text-danger">*</span>
                        </Label>
                        <input
                          name="phone"
                          value={values.phone}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          autoComplete="off"
                          type="tel"
                          placeholder="1234567890"
                          className={`form-control${
                            touched.phone && errors.phone ? ' is-invalid' : ''
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

                        <ErrorMessage name="phone" component="div" className="invalid-feedback" />
                      </div>
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <Label>
                        Company Category<span className="text-danger">*</span>
                      </Label>

                      <Field
                        as="select"
                        name="categoryId"
                        className={`form-control col-md-4${
                          touched.categoryId && errors.categoryId ? ' is-invalid' : ''
                        }`}
                        onChange={(e) => {
                          const selectedCategoryId = e.target.value;
                          setFilteredCategoryId(selectedCategoryId);
                          const selectedCategory = companyCategory.find(
                            (c) => c.categoryId.toString() === selectedCategoryId,
                          );
                          setFieldValue('categoryId', selectedCategoryId);
                          setFieldValue('subCategoryId', '');
                          setFieldValue(
                            'companyCategoryName',
                            selectedCategory?.categoryName || '',
                          );
                        }}
                        value={values.categoryId || ''}
                      >
                        <option value="">Select Company Category</option>
                        {companyCategory.map((category) => (
                          <option key={category.categoryId} value={category.categoryId}>
                            {category.categoryName}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage
                        name="categoryId"
                        component="div"
                        className="invalid-feedback"
                      />
                    </div>
                    <div className="col-md-4">
                      <Label>
                        Company Sub Category<span className="text-danger">*</span>
                      </Label>
                      <Field
                        as="select"
                        name="subCategoryId"
                        className={`form-control${
                          touched.subCategoryId && errors.subCategoryId ? ' is-invalid' : ''
                        }`}
                        onChange={(e) => {
                          const selectedSubCategoryId = e.target.value;
                          const selectedSubCategoryName = companySubCategory.find(
                            (s) => s.subCategoryId === selectedSubCategoryId,
                          );
                          setFieldValue('subCategoryId', selectedSubCategoryId);
                          setFieldValue(
                            'companySubCategoryName',
                            selectedSubCategoryName?.subCategoryName || '',
                          );
                        }}
                        value={values.subCategoryId || ''}
                      >
                        <option value="">Select Company Sub Category</option>
                        {companySubCategory.map((subCategory) => (
                          <option key={subCategory.subCategoryId} value={subCategory.subCategoryId}>
                            {subCategory.subCategoryName}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage
                        name="subCategoryId"
                        component="div"
                        className="invalid-feedback"
                      />
                    </div>
                    <div className="col-md-4">
                      <Label>
                        Currency<span className="text-danger">*</span>
                      </Label>
                      <Field
                        as="select"
                        name="currency"
                        className={`form-control${
                          touched.currency && errors.currency ? ' is-invalid' : ''
                        }`}
                        value={values.currency || 'INR'}
                      >
                        <option value="">Select Currency</option>
                        {currencies.map((curr) => (
                          <option key={curr.currencyCode} value={curr.currencyCode}>
                            {curr.currencyCode} ({curr.symbol})
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage
                        name="currency"
                        component="div"
                        className="invalid-feedback"
                      />
                    </div>
                  </div>
                  <div className="col text-end">
                    <Link to="/company-management">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ marginTop: '10px', marginRight: '10px' }}
                      >
                        Back
                      </button>
                    </Link>
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                      Next
                    </button>
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

Welcome.propTypes = {
  jumpToStep: PropTypes.func.isRequired,
  updateStore: PropTypes.func.isRequired,
  getStore: PropTypes.func.isRequired,
};

export default Welcome;
