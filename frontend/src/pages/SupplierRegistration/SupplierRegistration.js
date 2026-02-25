import React, { useState, useEffect, useRef } from 'react';
import '../UserRegistration/UserRegistration.css';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardBody, CardTitle, Row, Col, FormGroup, Label, Input, Button } from 'reactstrap';
import { Formik, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SupplierService from '../../services/SupplierService';
import MasterDataService from '../../services/MasterDataService';
import SupplierCategoryService from '../../services/SupplierCategoryService';
import { getEntityType } from '../localStorageUtil';
import '../CompanyManagement/ReactBootstrapTable.scss';

const SupplierRegistration = () => {
  const { supplierId } = useParams();
  const navigate = useNavigate();
  const categoryDropdownRef = useRef(null);
  const subCategoryDropdownRef = useRef(null);
  const [currencies, setCurrencies] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [supplierData, setSupplierData] = useState({
    name: '',
    displayName: '',
    email: '',
    customerServicePhone: '',
    salesEmail: '',
    website: '',
    currency: '',
    primaryContact: '',
    categoryIds: [],
    subCategoryIds: [],
    shippingMethodId: '',
    paymentTermsId: '',
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
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isCustomSubCategory, setIsCustomSubCategory] = useState(false);
  const [categorySuggestions, setCategorySuggestions] = useState([]);
  const [subCategorySuggestions, setSubCategorySuggestions] = useState([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [showSubCategorySuggestions, setShowSubCategorySuggestions] = useState(false);

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
    const fetchCategories = async () => {
      try {
        const response = await SupplierCategoryService.getAllSupplierCategories();
        const allCategories = response.data.content || [];
        const parentCategories = allCategories.filter((cat) => !cat.parentId);
        setCategories(parentCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.dismiss();
        toast.error('Failed to load categories');
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchSubCategories = async () => {
      if (selectedCategories.length > 0) {
        try {
          const response = await SupplierCategoryService.getAllSupplierCategories();
          const allCategories = response.data.content || [];

          // Collect subcategories grouped by parent category
          const groupedSubCategories = [];
          selectedCategories.forEach((selectedCatId) => {
            const selectedCat = allCategories.find(
              (cat) => cat.categoryId === parseInt(selectedCatId, 10)
            );
            if (selectedCat?.subCategories && selectedCat.subCategories.length > 0) {
              groupedSubCategories.push({
                parentCategoryId: selectedCat.categoryId,
                parentCategoryName: selectedCat.categoryName,
                subCategories: selectedCat.subCategories,
              });
            }
          });

          setSubCategories(groupedSubCategories);
        } catch (error) {
          console.error('Error fetching sub-categories:', error);
        }
      } else {
        setSubCategories([]);
      }
    };
    fetchSubCategories();
  }, [selectedCategories]);

  useEffect(() => {
    const fetchStates = async () => {
      if (selectedCountry) {
        try {
          const country = countries.find((c) => c.name === selectedCountry);
          if (country) {
            const response = await MasterDataService.getStatesByCountryId(country.countryId);
            setStates(response.data);
            setCities([]);
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

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await MasterDataService.getAllCurrencies();
        setCurrencies(response.data);
      } catch (error) {
        console.error('Error fetching currencies:', error);
        toast.dismiss();
        toast.error('Failed to load currencies');
      }
    };
    fetchCurrencies();
  }, []);

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target)
      ) {
        setShowCategorySuggestions(false);
      }
    };

    if (showCategorySuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategorySuggestions]);

  // Close subcategory dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        subCategoryDropdownRef.current &&
        !subCategoryDropdownRef.current.contains(event.target)
      ) {
        setShowSubCategorySuggestions(false);
      }
    };

    if (showSubCategorySuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSubCategorySuggestions]);

  useEffect(() => {
    if (supplierId) {
      SupplierService.getSupplierById(supplierId)
        .then(async (response) => {
          if (response.data && response.data.length > 0) {
            const supplier = response.data[0];

            // Collect parent category IDs and subcategory IDs separately
            const parentCategoryIds = [];
            const subCategoryIds = [];

            if (supplier.categories && supplier.categories.length > 0) {
              supplier.categories.forEach((cat) => {
                if (!cat.parentId) {
                  // This is a parent category
                  parentCategoryIds.push(cat.categoryId);

                  // Also collect subcategories from this category
                  if (cat.subCategories && cat.subCategories.length > 0) {
                    cat.subCategories.forEach((sub) => {
                      if (!subCategoryIds.includes(sub.categoryId)) {
                        subCategoryIds.push(sub.categoryId);
                      }
                    });
                  }
                } else {
                  // This is a subcategory listed at top level
                  if (!subCategoryIds.includes(cat.categoryId)) {
                    subCategoryIds.push(cat.categoryId);
                  }
                }
              });
            }

            setSupplierData({
              ...supplier,
              categoryIds: parentCategoryIds,
              subCategoryIds: subCategoryIds,
              address: {
                ...supplier.address,
                country: supplier.address?.country || '',
                state: supplier.address?.state || '',
              },
            });

            if (parentCategoryIds.length > 0) {
              setSelectedCategories(parentCategoryIds.map(String));
            }

            if (supplier.address?.country) {
              setSelectedCountry(supplier.address.country);
              try {
                const country = countries.find((c) => c.name === supplier.address.country);
                if (country) {
                  const statesResponse = await MasterDataService.getStatesByCountryId(
                    country.countryId,
                  );
                  setStates(statesResponse.data);
                  if (supplier.address?.state) {
                    setSelectedState(supplier.address.state);
                    const state = statesResponse.data.find(
                      (s) => s.name === supplier.address.state,
                    );
                    if (state) {
                      const citiesResponse = await MasterDataService.getCitiesByStateId(
                        state.stateId,
                      );
                      setCities(citiesResponse.data);
                    }
                  }
                }
              } catch (error) {
                console.error('Error fetching states/cities for supplier:', error);
              }
            }
          }
        })
        .catch((error) => {
          console.error('Error fetching supplier data:', error);
        });
    }
  }, [supplierId, countries]);

  const searchCategories = async (searchTerm, isSubCategory = false) => {
    if (searchTerm.length < 2) {
      isSubCategory ? setSubCategorySuggestions([]) : setCategorySuggestions([]);
      return;
    }

    try {
      const response = await SupplierCategoryService.getAllSupplierCategories({
        search: searchTerm,
      });
      const allCategories = response.data.content || [];

      if (isSubCategory && selectedCategories.length > 0) {
        // Collect subcategories grouped by parent from all selected categories
        const groupedSubCats = [];
        selectedCategories.forEach((selectedCatId) => {
          const parentCat = allCategories.find(
            (cat) => cat.categoryId === parseInt(selectedCatId, 10)
          );
          if (parentCat?.subCategories) {
            const filtered = parentCat.subCategories.filter((sub) =>
              sub.categoryName.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (filtered.length > 0) {
              groupedSubCats.push({
                parentCategoryId: parentCat.categoryId,
                parentCategoryName: parentCat.categoryName,
                subCategories: filtered,
              });
            }
          }
        });
        setSubCategorySuggestions(groupedSubCats);
      } else {
        const filtered = allCategories.filter(
          (cat) =>
            !cat.parentId && cat.categoryName.toLowerCase().includes(searchTerm.toLowerCase()),
        );
        setCategorySuggestions(filtered);
      }
    } catch (error) {
      console.error('Error searching categories:', error);
    }
  };

  const supplierValidationSchema = Yup.object({
    name: Yup.string().required('Supplier name is required'),
    displayName: Yup.string().required('Display name is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    salesEmail: Yup.string().required('Sales Email is required'),
    website: Yup.string().matches(
      /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.){1,}[a-zA-Z]{2,}(\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]*)?$/,
      'Enter a valid website URL',
    ),
    currency: Yup.string()
      .required('Currency is required')
      .test(
        'valid-currency',
        'Please select a valid currency',
        (value) => value && currencies.some((c) => c.currencyCode === value),
      ),
    categoryIds: Yup.array().test('category-required', 'At least one category is required', function (value) {
      const { customCategoryName } = this.parent;
      return (
        (value && value.length > 0) || (customCategoryName && customCategoryName.trim().length > 0)
      );
    }),
    subCategoryIds: Yup.array().test(
      'subcategory-required',
      'At least one sub category is required',
      function (value) {
        const { customSubCategoryName } = this.parent;
        return (
          (value && value.length > 0) ||
          (customSubCategoryName && customSubCategoryName.trim().length > 0)
        );
      },
    ),
    primaryContact: Yup.string()
      .matches(/^[0-9]{10}$/, 'Primary contact must be a 10-digit number')
      .required('Primary contact is required'),
    address: Yup.object({
      addressLine1: Yup.string().required('Address Line 1 is required'),
      postalCode: Yup.string().required('Postal code is required'),
      country: Yup.string().required('Country is required'),
    }),
  });

  const handleSave = (values) => {
    const requestBody = {
      ...values,
      address: {
        ...values.address,
        addressType: 'SHIPPING',
      },
    };
    const categoriesArray = [];

    if (values.customCategoryName && values.customCategoryName.trim()) {
      // Custom category
      categoriesArray.push({
        categoryName: values.customCategoryName.trim(),
        parentId: null,
        subCategories: [],
      });
    } else if (values.categoryIds && values.categoryIds.length > 0) {
      // Multiple selected categories
      values.categoryIds.forEach((categoryId) => {
        const parentCategoryId = parseInt(categoryId, 10);
        const selectedCategory = categories.find((cat) => cat.categoryId === parentCategoryId);

        if (selectedCategory) {
          categoriesArray.push({
            categoryId: parentCategoryId,
            categoryName: selectedCategory.categoryName,
            parentId: null,
            subCategories: [],
          });
        }
      });
    }

    // Handle subcategories
    if (values.customSubCategoryName && values.customSubCategoryName.trim()) {
      // Custom subcategory - add to first category
      if (categoriesArray.length > 0) {
        categoriesArray[0].subCategories = [
          {
            categoryName: values.customSubCategoryName.trim(),
            parentId: categoriesArray[0].categoryId || null,
          },
        ];
      }
    } else if (values.subCategoryIds && values.subCategoryIds.length > 0) {
      // Multiple selected subcategories - distribute to their parent categories
      values.subCategoryIds.forEach((subCatId) => {
        const subCategoryId = parseInt(subCatId, 10);

        // Find the subcategory in the grouped structure
        let selectedSubCategory = null;
        let parentCategoryId = null;

        subCategories.forEach((group) => {
          const found = group.subCategories.find((sub) => sub.categoryId === subCategoryId);
          if (found) {
            selectedSubCategory = found;
            parentCategoryId = group.parentCategoryId;
          }
        });

        if (selectedSubCategory) {
          // Find the parent category in categoriesArray
          const parentCat = categoriesArray.find((cat) => cat.categoryId === parentCategoryId);

          if (parentCat) {
            parentCat.subCategories.push({
              categoryId: subCategoryId,
              categoryName: selectedSubCategory.categoryName,
              parentId: parentCat.categoryId,
            });
          } else if (categoriesArray.length > 0) {
            // If parent not found, add to first category
            categoriesArray[0].subCategories.push({
              categoryId: subCategoryId,
              categoryName: selectedSubCategory.categoryName,
              parentId: categoriesArray[0].categoryId,
            });
          }
        }
      });
    }

    requestBody.categories = categoriesArray;

    delete requestBody.categoryIds;
    delete requestBody.subCategoryIds;
    delete requestBody.customCategoryName;
    delete requestBody.customSubCategoryName;

    const entityType = getEntityType();
    const redirectPath = entityType === 'SUPPLIER' ? '/supplier-info' : '/supplier-management';

    if (supplierId) {
      SupplierService.updateSupplier(supplierId, requestBody)
        .then((response) => {
          console.log('Supplier updated successfully:', response.data);
          toast.dismiss();
          toast.success('Supplier updated successfully!');
          setTimeout(() => {
            navigate(redirectPath);
          }, 1500);
        })
        .catch((error) => {
          if (error.response && error.response.data && error.response.data.errorMessage) {
            toast.dismiss();
            toast.error(error.response.data.errorMessage);
          } else {
            toast.dismiss();
            toast.error('An unexpected error occurred');
          }
        });
    } else {
      SupplierService.handleCreateSupplier(requestBody)
        .then((response) => {
          console.log('Supplier created successfully:', response.data);
          toast.dismiss();
          toast.success('Supplier created successfully!');
          setTimeout(() => {
            navigate(redirectPath);
          }, 1500);
        })
        .catch((error) => {
          if (error.response && error.response.data && error.response.data.errorMessage) {
            toast.dismiss();
            toast.error(error.response.data.errorMessage);
          } else {
            toast.dismiss();
            toast.error('An unexpected error occurred');
          }
        });
    }
  };

  const handleCancel = () => {
    const entityType = getEntityType();
    const redirectPath = entityType === 'SUPPLIER' ? '/supplier-info' : '/supplier-management';
    navigate(redirectPath);
  };

  return (
    <div>
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
            <CardBody style={{ backgroundColor: '#009efb', padding: '12px' }}>
              <CardTitle tag="h4" className="mb-0 text-white">
                Supplier Info
              </CardTitle>
            </CardBody>
            <CardBody>
              <Formik
                initialValues={supplierData}
                validationSchema={supplierValidationSchema}
                onSubmit={handleSave}
                enableReinitialize
              >
                {({ values, handleChange, handleBlur, errors, touched, setFieldValue }) => (
                  <Form>
                    <Row>
                      <Col md="4">
                        <FormGroup>
                          <Label className="control-label">
                            Name<span className="text-danger">*</span>
                          </Label>
                          <Input
                            name="name"
                            value={values.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            autoComplete="off"
                            type="text"
                            placeholder="Supplier name"
                            className={`form-control${
                              touched.name && errors.name ? ' is-invalid' : ''
                            }`}
                            maxLength={75}
                          />
                          <ErrorMessage name="name" component="div" className="invalid-feedback" />
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <Label className="control-label">
                            Display Name<span className="text-danger">*</span>
                          </Label>
                          <Input
                            name="displayName"
                            value={values.displayName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            autoComplete="off"
                            type="text"
                            placeholder="Supplier display name"
                            className={`form-control${
                              touched.displayName && errors.displayName ? ' is-invalid' : ''
                            }`}
                            maxLength={40}
                          />
                          <ErrorMessage
                            name="displayName"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <Label className="control-label">
                            Email<span className="text-danger">*</span>
                          </Label>
                          <Input
                            name="email"
                            value={values.email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            autoComplete="off"
                            type="email"
                            disabled={!!supplierId}
                            placeholder="supplier.email@example.com"
                            className={`form-control${
                              touched.email && errors.email ? ' is-invalid' : ''
                            }`}
                            maxLength={30}
                          />
                          <ErrorMessage name="email" component="div" className="invalid-feedback" />
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <Label className="control-label">
                            Sales Email <span className="text-danger">*</span>{' '}
                          </Label>
                          <Input
                            name="salesEmail"
                            value={values.salesEmail}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            autoComplete="off"
                            type="email"
                            placeholder="supplier.sales@example.com"
                            maxLength={30}
                            className={`form-control${
                              touched.salesEmail && errors.salesEmail ? ' is-invalid' : ''
                            }`}
                          />
                          <ErrorMessage
                            name="salesEmail"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <Label className="control-label">Customer Service Phone</Label>
                          <Input
                            name="customerServicePhone"
                            value={values.customerServicePhone}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            autoComplete="off"
                            type="tel"
                            placeholder="123-456-7890"
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
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <Label className="control-label">Website</Label>
                          <Input
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
                            maxLength={50}
                          />
                          <ErrorMessage
                            name="website"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <Label className="control-label">
                            Currency <span className="text-danger">*</span>{' '}
                          </Label>
                          <Input
                            name="currency"
                            type="select"
                            value={values.currency}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`form-control${
                              touched.currency && errors.currency ? ' is-invalid' : ''
                            }`}
                          >
                            <option value="">Select Currency</option>
                            {currencies.map((currency) => (
                              <option key={currency.currencyId} value={currency.currencyCode}>
                                {currency.currencyCode} - {currency.symbol}
                              </option>
                            ))}
                          </Input>
                          <ErrorMessage
                            name="currency"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <Label className="control-label">
                            Contact Number<span className="text-danger">*</span>
                          </Label>
                          <Input
                            name="primaryContact"
                            value={values.primaryContact}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            autoComplete="off"
                            type="tel"
                            placeholder="Enter Contact person"
                            className={`form-control${
                              touched.primaryContact && errors.primaryContact ? ' is-invalid' : ''
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
                          <ErrorMessage
                            name="primaryContact"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="4">
                        <FormGroup>
                          <Label className="control-label">
                            Categories <span className="text-danger">*</span>
                          </Label>
                          {!isCustomCategory ? (
                            <div style={{ position: 'relative' }} ref={categoryDropdownRef}>
                              <div
                                onClick={() => setShowCategorySuggestions(!showCategorySuggestions)}
                                className={`form-control${
                                  touched.categoryIds && errors.categoryIds ? ' is-invalid' : ''
                                }`}
                                style={{
                                  minHeight: '38px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                  gap: '4px',
                                  paddingRight: '30px',
                                }}
                              >
                                {values.categoryIds.length > 0 ? (
                                  values.categoryIds.map((catId) => {
                                    const category = categories.find((c) => c.categoryId === catId);
                                    return category ? (
                                      <span
                                        key={catId}
                                        className="badge bg-primary"
                                        style={{
                                          fontSize: '12px',
                                          padding: '4px 8px',
                                          marginRight: '4px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                        }}
                                      >
                                        {category.categoryName}
                                        <span
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const newCategoryIds = values.categoryIds.filter(
                                              (id) => id !== catId
                                            );
                                            setFieldValue('categoryIds', newCategoryIds);
                                            setSelectedCategories(newCategoryIds.map(String));
                                          }}
                                          style={{ cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                          ×
                                        </span>
                                      </span>
                                    ) : null;
                                  })
                                ) : (
                                  <span style={{ color: '#999' }}>Select categories...</span>
                                )}
                                <i
                                  className="bi bi-chevron-down"
                                  style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                  }}
                                ></i>
                              </div>

                              {showCategorySuggestions && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    backgroundColor: 'white',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    maxHeight: '250px',
                                    overflowY: 'auto',
                                    zIndex: 1000,
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                    marginTop: '2px',
                                  }}
                                >
                                  {categories.map((category) => (
                                    <div
                                      key={category.categoryId}
                                      style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid #f0f0f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                      }}
                                      onClick={() => {
                                        const isSelected = values.categoryIds.includes(
                                          category.categoryId
                                        );
                                        let newCategoryIds;
                                        if (isSelected) {
                                          newCategoryIds = values.categoryIds.filter(
                                            (id) => id !== category.categoryId
                                          );
                                        } else {
                                          newCategoryIds = [...values.categoryIds, category.categoryId];
                                        }
                                        setFieldValue('categoryIds', newCategoryIds);
                                        setSelectedCategories(newCategoryIds.map(String));
                                      }}
                                      onMouseEnter={(e) =>
                                        (e.currentTarget.style.backgroundColor = '#f5f5f5')
                                      }
                                      onMouseLeave={(e) =>
                                        (e.currentTarget.style.backgroundColor = 'white')
                                      }
                                    >
                                      <input
                                        type="checkbox"
                                        checked={values.categoryIds.includes(category.categoryId)}
                                        onChange={() => {}}
                                        style={{ cursor: 'pointer' }}
                                      />
                                      <span>{category.categoryName}</span>
                                    </div>
                                  ))}
                                  <div
                                    style={{
                                      padding: '8px 12px',
                                      cursor: 'pointer',
                                      borderTop: '2px solid #ddd',
                                      color: '#007bff',
                                      fontStyle: 'italic',
                                    }}
                                    onClick={() => {
                                      setIsCustomCategory(true);
                                      setShowCategorySuggestions(false);
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.backgroundColor = '#f5f5f5')
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.backgroundColor = 'white')
                                    }
                                  >
                                    + Add custom category
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ position: 'relative' }}>
                              <Input
                                type="text"
                                value={values.customCategoryName || ''}
                                placeholder="Type category name..."
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setFieldValue('customCategoryName', value);
                                }}
                                className={`form-control${
                                  touched.categoryIds && errors.categoryIds ? ' is-invalid' : ''
                                }`}
                              />
                              <Button
                                size="sm"
                                color="link"
                                onClick={() => {
                                  setIsCustomCategory(false);
                                  setFieldValue('customCategoryName', '');
                                }}
                                style={{ padding: '0 5px', fontSize: '12px' }}
                              >
                                Back to selection
                              </Button>
                            </div>
                          )}
                          <ErrorMessage
                            name="categoryIds"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>

                      <Col md="4">
                        <FormGroup>
                          <Label className="control-label">
                            Sub Categories <span className="text-danger">*</span>
                          </Label>
                          {!isCustomSubCategory ? (
                            <div style={{ position: 'relative' }} ref={subCategoryDropdownRef}>
                             <div
  onClick={() => {
    if (
      (values.categoryIds && values.categoryIds.length > 0) ||
      (values.customCategoryName &&
        values.customCategoryName.trim().length > 0)
    ) {
      setShowSubCategorySuggestions(!showSubCategorySuggestions);
    }
  }}
  className={`form-control${
    touched.subCategoryIds && errors.subCategoryIds ? ' is-invalid' : ''
  }`}
  style={{
    minHeight: '38px',
    cursor:
      values.categoryIds.length > 0 ||
      (values.customCategoryName &&
        values.customCategoryName.trim().length > 0)
        ? 'pointer'
        : 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '4px',
    paddingRight: '30px',
    backgroundColor:
      values.categoryIds.length === 0 &&
      (!values.customCategoryName ||
        values.customCategoryName.trim().length === 0)
        ? '#e9ecef'
        : 'white',
  }}
>
                                {values.subCategoryIds.length > 0 ? (
                                  values.subCategoryIds.map((subCatId) => {
                                    // Find subcategory in grouped structure
                                    let subCategory = null;
                                    let parentName = '';
                                    subCategories.forEach((group) => {
                                      const found = group.subCategories.find(
                                        (s) => s.categoryId === subCatId
                                      );
                                      if (found) {
                                        subCategory = found;
                                        parentName = group.parentCategoryName;
                                      }
                                    });
                                    return subCategory ? (
                                      <span
                                        key={subCatId}
                                        style={{
                                          fontSize: '12px',
                                          padding: '4px 8px',
                                          marginRight: '4px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          backgroundColor: '#17a2b8',
                                          color: 'white',
                                          borderRadius: '4px',
                                        }}
                                        title={`${parentName} > ${subCategory.categoryName}`}
                                      >
                                        {subCategory.categoryName}
                                        <span
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const newSubCategoryIds = values.subCategoryIds.filter(
                                              (id) => id !== subCatId
                                            );
                                            setFieldValue('subCategoryIds', newSubCategoryIds);
                                          }}
                                          style={{ cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                          ×
                                        </span>
                                      </span>
                                    ) : null;
                                  })
                                ) : (
                                  <span style={{ color: '#999' }}>
                                    {values.categoryIds.length === 0 &&
                                    (!values.customCategoryName ||
                                      values.customCategoryName.trim().length === 0)
                                      ? 'Select categories first...'
                                      : 'Select subcategories...'}
                                  </span>
                                )}
                                <i
                                  className="bi bi-chevron-down"
                                  style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                  }}
                                ></i>
                              </div>

                              {showSubCategorySuggestions && (
  <div
    style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '4px',
      maxHeight: '300px',
      overflowY: 'auto',
      zIndex: 1000,
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      marginTop: '2px',
    }}
  >
    {/* Show subcategories only if regular categories are selected */}
    {!values.customCategoryName && subCategories.length > 0 && (
      <>
        {subCategories.map((categoryGroup, groupIndex) => (
          <div key={categoryGroup.parentCategoryId}>
            {/* Parent category header */}
            <div
              style={{
                padding: '6px 12px',
                backgroundColor: '#f8f9fa',
                fontWeight: 'bold',
                fontSize: '13px',
                color: '#495057',
                borderBottom: '1px solid #dee2e6',
                position: 'sticky',
                top: 0,
                zIndex: 1,
              }}
            >
              {categoryGroup.parentCategoryName}
            </div>
            {/* Subcategories under this parent */}
            {categoryGroup.subCategories.map((subCategory) => (
              <div
                key={subCategory.categoryId}
                style={{
                  padding: '8px 12px 8px 24px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onClick={() => {
                  const isSelected = values.subCategoryIds.includes(
                    subCategory.categoryId
                  );
                  let newSubCategoryIds;
                  if (isSelected) {
                    newSubCategoryIds = values.subCategoryIds.filter(
                      (id) => id !== subCategory.categoryId
                    );
                  } else {
                    newSubCategoryIds = [
                      ...values.subCategoryIds,
                      subCategory.categoryId,
                    ];
                  }
                  setFieldValue('subCategoryIds', newSubCategoryIds);
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = '#f5f5f5')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = 'white')
                }
              >
                <input
                  type="checkbox"
                  checked={values.subCategoryIds.includes(
                    subCategory.categoryId
                  )}
                  onChange={() => {}}
                  style={{ cursor: 'pointer' }}
                />
                <span>{subCategory.categoryName}</span>
              </div>
            ))}
          </div>
        ))}
      </>
    )}
    
    {/* Show message when custom category is selected */}
    {values.customCategoryName && values.customCategoryName.trim().length > 0 && (
      <div
        style={{
          padding: '12px',
          textAlign: 'center',
          color: '#6c757d',
          fontStyle: 'italic',
          fontSize: '14px',
        }}
      >
        Add a custom subcategory below
      </div>
    )}
    
    <div
      style={{
        padding: '8px 12px',
        cursor: 'pointer',
        borderTop: '2px solid #ddd',
        color: '#007bff',
        fontStyle: 'italic',
        position: 'sticky',
        bottom: 0,
        backgroundColor: 'white',
      }}
      onClick={() => {
        setIsCustomSubCategory(true);
        setShowSubCategorySuggestions(false);
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = '#f5f5f5')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.backgroundColor = 'white')
      }
    >
      + Add custom subcategory
    </div>
  </div>
)}
                            </div>
                          ) : (
                            <div style={{ position: 'relative' }}>
                              <Input
                                type="text"
                                value={values.customSubCategoryName || ''}
                                placeholder="Type sub-category name..."
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setFieldValue('customSubCategoryName', value);
                                }}
                                className={`form-control${
                                  touched.subCategoryIds && errors.subCategoryIds ? ' is-invalid' : ''
                                }`}
                              />
                              <Button
                                size="sm"
                                color="link"
                                onClick={() => {
                                  setIsCustomSubCategory(false);
                                  setFieldValue('customSubCategoryName', '');
                                }}
                                style={{ padding: '0 5px', fontSize: '12px' }}
                              >
                                Back to selection
                              </Button>
                            </div>
                          )}
                          <ErrorMessage
                            name="subCategoryIds"
                            component="div"
                            className="invalid-feedback"
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
                            <Label className="control-label">
                              Address Line 1<span className="text-danger">*</span>
                            </Label>
                            <Input
                              name="address.addressLine1"
                              value={values.address?.addressLine1 || ''}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              placeholder="Enter Address Line 1"
                              className={`form-control${
                                touched.address?.addressLine1 && errors.address?.addressLine1
                                  ? ' is-invalid'
                                  : ''
                              }`}
                              maxLength={100}
                            />
                            <ErrorMessage
                              name="address.addressLine1"
                              component="div"
                              className="invalid-feedback"
                            />
                          </FormGroup>
                        </Col>
                        <Col md="4">
                          <FormGroup>
                            <Label>Address Line 2</Label>
                            <Input
                              name="address.addressLine2"
                              value={values.address?.addressLine2 || ''}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              placeholder="Enter Address Line 2"
                              maxLength={100}
                            />
                          </FormGroup>
                        </Col>
                        <Col md="4">
                          <FormGroup>
                            <Label>
                              Country <span className="text-danger">*</span>
                            </Label>
                            <Input
                              type="select"
                              name="address.country"
                              className={`form-control${
                                touched.address?.country && errors.address?.country
                                  ? ' is-invalid'
                                  : ''
                              }`}
                              onChange={(e) => {
                                const countryName = e.target.value;
                                setSelectedCountry(countryName);
                                setFieldValue('address.country', countryName);
                                setFieldValue('address.state', '');
                                setFieldValue('address.city', '');
                                setStates([]);
                                setCities([]);
                              }}
                              value={values.address?.country || ''}
                            >
                              <option value="">Select Country</option>
                              {countries.map((country) => (
                                <option key={country.countryId} value={country.name}>
                                  {country.name}
                                </option>
                              ))}
                            </Input>
                            <ErrorMessage
                              name="address.country"
                              component="div"
                              className="invalid-feedback"
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                      <Row>
                        <Col md="4">
                          <FormGroup>
                            <Label>State</Label>
                            <Input
                              type="select"
                              name="address.state"
                              className={`form-control${
                                touched.address?.state && errors.address?.state ? ' is-invalid' : ''
                              }`}
                              disabled={!values.address?.country}
                              onChange={(e) => {
                                const stateName = e.target.value;
                                setSelectedState(stateName);
                                setFieldValue('address.state', stateName);
                                setFieldValue('address.city', '');
                                setCities([]);
                              }}
                              value={values.address?.state || ''}
                            >
                              <option value="">Select State</option>
                              {states.map((state) => (
                                <option key={state.stateId} value={state.name}>
                                  {state.name}
                                </option>
                              ))}
                            </Input>
                            <ErrorMessage
                              name="address.state"
                              component="div"
                              className="invalid-feedback"
                            />
                          </FormGroup>
                        </Col>
                        <Col md="4">
                          <FormGroup>
                            <Label>City</Label>
                            <Input
                              type="select"
                              name="address.city"
                              className={`form-control${
                                touched.address?.city && errors.address?.city ? ' is-invalid' : ''
                              }`}
                              disabled={!values.address?.state}
                              onChange={handleChange}
                              value={values.address?.city || ''}
                            >
                              <option value="">Select City</option>
                              {cities.map((city) => (
                                <option key={city.cityId} value={city.name}>
                                  {city.name}
                                </option>
                              ))}
                            </Input>
                            <ErrorMessage
                              name="address.city"
                              component="div"
                              className="invalid-feedback"
                            />
                          </FormGroup>
                        </Col>
                        <Col md="4">
                          <FormGroup>
                            <Label>
                              Postal Code<span className="text-danger">*</span>
                            </Label>
                            <Input
                              name="address.postalCode"
                              value={values.address?.postalCode || ''}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              placeholder="Enter Postal Code"
                              className={`form-control${
                                touched.address?.postalCode && errors.address?.postalCode
                                  ? ' is-invalid'
                                  : ''
                              }`}
                              maxLength={15}
                            />
                            <ErrorMessage
                              name="address.postalCode"
                              component="div"
                              className="invalid-feedback"
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
                              value={values.address?.isoCountryCode || ''}
                              onChange={handleChange}
                              placeholder="e.g., IN, US, CA, GB"
                              onBlur={handleBlur}
                              maxLength={3}
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                    </CardBody>
                    <Row>
                      <Col className="d-flex justify-content-end mt-3 mb-3">
                        <Button
                          color="secondary"
                          onClick={handleCancel}
                          className="button-spacing"
                          style={{ marginRight: '10px' }}
                        >
                          Back
                        </Button>
                        <Button color="primary" type="submit" style={{ marginRight: '10px' }}>
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
export default SupplierRegistration;
