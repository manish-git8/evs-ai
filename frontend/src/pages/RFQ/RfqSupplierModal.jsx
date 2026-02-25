import React from 'react';
import PropTypes from 'prop-types';
import * as yup from 'yup';
import { useFormik } from 'formik';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Nav,
  NavItem,
  NavLink,
  FormGroup,
  Label,
  Input,
  Row,
  Col,
  FormFeedback,
} from 'reactstrap';
import MasterDataService from '../../services/MasterDataService';
import SupplierService from '../../services/SupplierService';
import SupplierCategoryService from '../../services/SupplierCategoryService';
import { getEntityId } from '../localStorageUtil';

const RfqSupplierModal = ({
  isOpen,
  toggle,
  existingSuppliers,
  formData,
  newSupplier,
  setNewSupplier,
  addExistingSupplier,
}) => {
  const [supplierSearchTerm, setSupplierSearchTerm] = React.useState('');
  const [supplierResults, setSupplierResults] = React.useState([]);
  const [searchTimeout, setSearchTimeout] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [countries, setCountries] = React.useState([]);
  const [states, setStates] = React.useState([]);
  const [cities, setCities] = React.useState([]);
  const [currencies, setCurrencies] = React.useState([]);
  const [isStatesLoading, setIsStatesLoading] = React.useState(false);
  const [isCitiesLoading, setIsCitiesLoading] = React.useState(false);
  const [categories, setCategories] = React.useState([]);
  const [allCategories, setAllCategories] = React.useState([]); // All categories from API for Create New tab
  const [selectedCategoryFilter, setSelectedCategoryFilter] = React.useState('');
  const [selectedCategories, setSelectedCategories] = React.useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = React.useState([]);
  const [subCategories, setSubCategories] = React.useState([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = React.useState(false);
  const [showSubCategorySuggestions, setShowSubCategorySuggestions] = React.useState(false);
  const categoryDropdownRef = React.useRef(null);
  const subCategoryDropdownRef = React.useRef(null);
  const companyId = getEntityId();

  const isSupplierLimitReached = formData.suppliers.length >= 5;
  const isMinimumSuppliersNotMet = formData.suppliers.length < 3;
  const hasMinimumSuppliers = formData.suppliers.length >= 3;

  const validationSchema = yup.object().shape({
    name: yup.string().required('Name is required'),
    email: yup.string().email('Invalid email').required('Email is required'),
    primaryContact: yup.string().required('Primary Contact is required'),
  });

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
            companyId,
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

        const response = await SupplierService.handleCreateDraftSupplierFromCart(
          payload,
          companyId,
        );
        addExistingSupplier(response.data);
        setNewSupplier({
          tab: 'existing',
          name: '',
          email: '',
          phone: '',
        });
        toggle();
      } catch (error) {
        console.error('Error creating draft supplier:', error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const handleSupplierSearch = async (term) => {
    try {
      if (term.trim() === '') {
        setSupplierResults([]);
        return;
      }

      const localResults = existingSuppliers.filter(
        (supplier) =>
          supplier.name.toLowerCase().includes(term.toLowerCase()) ||
          supplier.email.toLowerCase().includes(term.toLowerCase()) ||
          (supplier.primaryContact &&
            supplier.primaryContact.toLowerCase().includes(term.toLowerCase())),
      );
      if (localResults.length > 0) {
        setSupplierResults(localResults);
      } else {
        setIsLoading(true);
        const response = await SupplierService.getCatalogItemsBySupplierSearch(500, 0, term);
        setSupplierResults(response || []);
      }
    } catch (error) {
      console.error('Supplier search failed:', error);
      setSupplierResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSupplierSearchTerm(term);
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    const newTimeout = setTimeout(() => {
      handleSupplierSearch(term);
    }, 500);

    setSearchTimeout(newTimeout);
  };

  const loadCountries = async () => {
    try {
      const response = await MasterDataService.getAllCountries();
      setCountries(response.data);
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  };

  const loadCurrencies = async () => {
    try {
      const response = await MasterDataService.getAllCurrencies();
      setCurrencies(response.data);
    } catch (error) {
      console.error('Error loading currencies:', error);
    }
  };

  const loadCategories = async () => {
    try {
      // First try to fetch categories from API
      const response = await SupplierCategoryService.getAllSupplierCategories(companyId);
      const allCategoriesData = response.data.content || response.data || [];
      const parentCategories = allCategoriesData.filter((cat) => !cat.parentId);

      if (parentCategories.length > 0) {
        setCategories(parentCategories);
        return;
      }
    } catch (error) {
      console.warn(
        'Failed to load categories from API, falling back to existing suppliers:',
        error,
      );
    }

    // Fallback: Extract unique categories from existing suppliers
    try {
      const categoryMap = new Map();

      existingSuppliers.forEach((supplier) => {
        if (supplier.categories && Array.isArray(supplier.categories)) {
          supplier.categories.forEach((cat) => {
            if (!cat.parentId && !categoryMap.has(cat.categoryId)) {
              categoryMap.set(cat.categoryId, {
                categoryId: cat.categoryId,
                categoryName: cat.categoryName,
                subCategories: cat.subCategories || [],
              });
            }
          });
        }
      });

      const uniqueCategories = Array.from(categoryMap.values());
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadAllCategories = async () => {
    try {
      // Try to fetch ALL categories from the API first
      const response = await SupplierCategoryService.getAllSupplierCategories(companyId);
      const allCategoriesData = response.data.content || response.data || [];
      const parentCategories = allCategoriesData.filter((cat) => !cat.parentId);

      if (parentCategories.length > 0) {
        setAllCategories(parentCategories);
        return;
      }
    } catch (error) {
      console.warn(
        'Failed to load categories from API, falling back to existing suppliers:',
        error,
      );
    }

    // Fallback: Extract categories from existing suppliers if API fails or returns empty
    try {
      const categoryMap = new Map();

      existingSuppliers.forEach((supplier) => {
        if (supplier.categories && Array.isArray(supplier.categories)) {
          supplier.categories.forEach((cat) => {
            if (!cat.parentId && !categoryMap.has(cat.categoryId)) {
              categoryMap.set(cat.categoryId, {
                categoryId: cat.categoryId,
                categoryName: cat.categoryName,
                subCategories: cat.subCategories || [],
              });
            }
          });
        }
      });

      const uniqueCategories = Array.from(categoryMap.values());
      setAllCategories(uniqueCategories);
    } catch (error) {
      console.error('Error loading categories from suppliers:', error);
    }
  };

  const handleCountryChange = async (e) => {
    const countryId = e.target.value;
    formik.setFieldValue('country', countryId);
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
      } finally {
        setIsStatesLoading(false);
      }
    } else {
      setStates([]);
    }
  };

  const handleStateChange = async (e) => {
    const stateId = e.target.value;
    formik.setFieldValue('state', stateId);
    formik.setFieldValue('city', '');

    if (stateId) {
      try {
        setIsCitiesLoading(true);
        const response = await MasterDataService.getCitiesByStateId(stateId);
        setCities(response.data);
      } catch (error) {
        console.error('Error loading cities:', error);
      } finally {
        setIsCitiesLoading(false);
      }
    } else {
      setCities([]);
    }
  };

  const getFilteredSuppliers = () => {
    let suppliers = supplierSearchTerm ? supplierResults : existingSuppliers;

    if (!Array.isArray(suppliers)) {
      suppliers = [];
    }
    if (selectedCategoryFilter) {
      suppliers = suppliers.filter((supplier) => {
        if (!supplier.categories || supplier.categories.length === 0) {
          return false;
        }
        return supplier.categories.some(
          (cat) => cat.categoryId === parseInt(selectedCategoryFilter, 10) && !cat.parentId,
        );
      });
    }

    return suppliers;
  };

  React.useEffect(() => {
    if (isOpen) {
      // Reset selections when switching tabs
      setSelectedCategories([]);
      setSelectedSubCategories([]);
      setSubCategories([]);
      setShowCategorySuggestions(false);
      setShowSubCategorySuggestions(false);

      if (newSupplier.tab === 'new') {
        // Load all categories from existing suppliers for Create New tab
        loadAllCategories();
        loadCountries();
        loadCurrencies();
      } else {
        // Load categories from existing suppliers for Select Existing tab (default)
        loadCategories();
      }
    }
  }, [isOpen, newSupplier.tab, existingSuppliers]);

  // Click outside handlers
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setShowCategorySuggestions(false);
      }
      if (
        subCategoryDropdownRef.current &&
        !subCategoryDropdownRef.current.contains(event.target)
      ) {
        setShowSubCategorySuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load categories on initial open when tab is undefined
  React.useEffect(() => {
    if (isOpen && !newSupplier.tab) {
      loadCategories();
    }
  }, [isOpen]);

  // Load subcategories when categories are selected
  React.useEffect(() => {
    if (selectedCategories.length > 0) {
      try {
        const groupedSubCategories = [];
        const categorySource = newSupplier.tab === 'new' ? allCategories : categories;

        selectedCategories.forEach((selectedCatId) => {
          const selectedCat = categorySource.find(
            (cat) => cat.categoryId === parseInt(selectedCatId, 10),
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
  }, [selectedCategories, categories, allCategories, newSupplier.tab]);

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>Add Supplier</ModalHeader>
      <ModalBody>
        <Nav tabs>
          <NavItem>
            <NavLink
              active={!newSupplier.tab || newSupplier.tab === 'existing'}
              onClick={() => setNewSupplier((prev) => ({ ...prev, tab: 'existing' }))}
              style={{ cursor: 'pointer' }}
            >
              Select Existing
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              active={newSupplier.tab === 'new'}
              onClick={() => setNewSupplier((prev) => ({ ...prev, tab: 'new' }))}
              style={{ cursor: 'pointer' }}
            >
              Create New
            </NavLink>
          </NavItem>
        </Nav>

        {!hasMinimumSuppliers && (
          <div className="alert alert-warning mt-3 mb-0" role="alert">
            <strong>Note:</strong> You must select at least 3 suppliers to proceed with the RFQ.
          </div>
        )}

        {(!newSupplier.tab || newSupplier.tab === 'existing') && (
          <div className="mt-3">
            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label>Filter by Category</Label>
                  <Input
                    type="select"
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.categoryId} value={category.categoryId}>
                        {category.categoryName}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Search Suppliers</Label>
                  <Input
                    type="text"
                    placeholder="Type to search suppliers..."
                    value={supplierSearchTerm}
                    onChange={handleSearchChange}
                  />
                </FormGroup>
              </Col>
            </Row>

            <FormGroup>
              <Label>Select from existing suppliers</Label>
              {(isSupplierLimitReached || isMinimumSuppliersNotMet) &&
                formData.suppliers.length > 0 && (
                  <div
                    className={`mb-2 ${isSupplierLimitReached ? 'text-danger' : 'text-warning'}`}
                  >
                    {isSupplierLimitReached
                      ? "Maximum 5 suppliers allowed. You've reached the limit."
                      : `Minimum 3 supplier required. You've selected ${formData.suppliers.length}.`}
                  </div>
                )}
              <div className="border rounded" style={{ maxHeight: '245px', overflowY: 'auto' }}>
                {getFilteredSuppliers().map((supplier) => (
                  <div
                    key={supplier.supplierId}
                    className="p-3 border-bottom d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <div className="font-weight-bold">{supplier.name}</div>
                      <div className="text-muted small">{supplier.email}</div>
                      {supplier.primaryContact && (
                        <div className="text-muted small">{supplier.primaryContact}</div>
                      )}
                      {supplier.categories && supplier.categories.length > 0 && (
                        <div className="mt-1">
                          {supplier.categories
                            .filter((cat) => !cat.parentId)
                            .map((cat) => (
                              <span
                                key={cat.categoryId}
                                className="badge bg-info me-1"
                                style={{ fontSize: '10px' }}
                              >
                                {cat.categoryName}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                    <Button
                      color="primary"
                      size="sm"
                      onClick={() => addExistingSupplier(supplier)}
                      disabled={
                        formData.suppliers.some((s) => s.supplierId === supplier.supplierId) ||
                        isSupplierLimitReached
                      }
                    >
                      {formData.suppliers.some((s) => s.supplierId === supplier.supplierId)
                        ? 'Added'
                        : 'Select'}
                    </Button>
                  </div>
                ))}

                {getFilteredSuppliers().length === 0 && !isLoading && (
                  <div className="p-3 text-center text-muted">No matching suppliers found</div>
                )}

                {isLoading && <div className="p-3 text-center text-muted">Searching...</div>}
              </div>
            </FormGroup>
          </div>
        )}

        {newSupplier.tab === 'new' && (
          <div className="mt-3">
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
                      invalid={formik.touched.name && !!formik.errors.name}
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
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label className="control-label">Currency</Label>
                    <Input
                      type="select"
                      name="currency"
                      className="form-control"
                      value={formik.values.currency}
                      onChange={formik.handleChange}
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
                    <Label className="control-label">Categories</Label>
                    <div style={{ position: 'relative' }} ref={categoryDropdownRef}>
                      <div
                        onClick={() => setShowCategorySuggestions(!showCategorySuggestions)}
                        className="form-control"
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
                        {selectedCategories.length > 0 ? (
                          selectedCategories.map((catId) => {
                            const category = allCategories.find(
                              (c) => c.categoryId === parseInt(catId),
                            );
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
                                    const newCategoryIds = selectedCategories.filter(
                                      (id) => id !== catId,
                                    );
                                    setSelectedCategories(newCategoryIds);
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
                          {allCategories.map((category) => (
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
                                const catIdStr = String(category.categoryId);
                                const isSelected = selectedCategories.includes(catIdStr);
                                let newCategoryIds;
                                if (isSelected) {
                                  newCategoryIds = selectedCategories.filter(
                                    (id) => id !== catIdStr,
                                  );
                                } else {
                                  newCategoryIds = [...selectedCategories, catIdStr];
                                }
                                setSelectedCategories(newCategoryIds);
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
                                checked={selectedCategories.includes(String(category.categoryId))}
                                onChange={() => {}}
                                style={{ cursor: 'pointer' }}
                              />
                              <span>{category.categoryName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormGroup>

                  <FormGroup>
                    <Label className="control-label">
                      Primary Contact<span className="text-danger">*</span>
                    </Label>
                    <Input
                      type="text"
                      name="primaryContact"
                      value={formik.values.primaryContact}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                        formik.setFieldValue('primaryContact', value);
                      }}
                      onBlur={formik.handleBlur}
                      invalid={formik.touched.primaryContact && !!formik.errors.primaryContact}
                    />
                    <FormFeedback>{formik.errors.primaryContact}</FormFeedback>
                  </FormGroup>
                  <FormGroup>
                    <Label className="control-label">Customer Service Phone</Label>
                    <Input
                      type="text"
                      name="customerServicePhone"
                      value={formik.values.customerServicePhone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                        formik.setFieldValue('customerServicePhone', value);
                      }}
                    />
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
                      invalid={formik.touched.email && !!formik.errors.email}
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
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label className="control-label">Website</Label>
                    <Input
                      type="text"
                      name="website"
                      value={formik.values.website}
                      onChange={formik.handleChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label className="control-label">Subcategories</Label>
                    <div style={{ position: 'relative' }} ref={subCategoryDropdownRef}>
                      <div
                        onClick={() => {
                          if (selectedCategories.length > 0) {
                            setShowSubCategorySuggestions(!showSubCategorySuggestions);
                          }
                        }}
                        className="form-control"
                        style={{
                          minHeight: '38px',
                          cursor: selectedCategories.length > 0 ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '4px',
                          paddingRight: '30px',
                          opacity: selectedCategories.length > 0 ? 1 : 0.6,
                        }}
                      >
                        {selectedSubCategories.length > 0 ? (
                          selectedSubCategories.map((subCatId) => {
                            let subCategory = null;
                            let parentName = '';
                            subCategories.forEach((group) => {
                              const found = group.subCategories.find(
                                (s) => s.categoryId === parseInt(subCatId),
                              );
                              if (found) {
                                subCategory = found;
                                parentName = group.parentCategoryName;
                              }
                            });
                            return subCategory ? (
                              <span
                                key={subCatId}
                                className="badge bg-info"
                                style={{
                                  fontSize: '12px',
                                  padding: '4px 8px',
                                  marginRight: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                title={`${parentName} > ${subCategory.categoryName}`}
                              >
                                {subCategory.categoryName}
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newSubCategoryIds = selectedSubCategories.filter(
                                      (id) => id !== subCatId,
                                    );
                                    setSelectedSubCategories(newSubCategoryIds);
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
                            {selectedCategories.length === 0
                              ? 'Select categories first...'
                              : 'Select subcategories...'}
                          </span>
                        )}
                      </div>

                      {showSubCategorySuggestions && subCategories.length > 0 && (
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
                          {subCategories.map((categoryGroup) => (
                            <div key={categoryGroup.parentCategoryId}>
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
                                    const subCatIdStr = String(subCategory.categoryId);
                                    const isSelected = selectedSubCategories.includes(subCatIdStr);
                                    let newSubCategoryIds;
                                    if (isSelected) {
                                      newSubCategoryIds = selectedSubCategories.filter(
                                        (id) => id !== subCatIdStr,
                                      );
                                    } else {
                                      newSubCategoryIds = [...selectedSubCategories, subCatIdStr];
                                    }
                                    setSelectedSubCategories(newSubCategoryIds);
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
                                    checked={selectedSubCategories.includes(
                                      String(subCategory.categoryId),
                                    )}
                                    onChange={() => {}}
                                    style={{ cursor: 'pointer' }}
                                  />
                                  <span>{subCategory.categoryName}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormGroup>

                  <FormGroup>
                    <Label className="control-label">Country Code</Label>
                    <Input
                      type="number"
                      name="countryCode"
                      className="form-control"
                      value={formik.values.countryCode}
                      onChange={formik.handleChange}
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
                      className="form-control"
                      disabled={!formik.values.country || isStatesLoading}
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
                      className="form-control"
                      onChange={formik.handleChange}
                      disabled={!formik.values.state || isCitiesLoading}
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
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label className="control-label">Address Line 2</Label>
                    <Input
                      type="text"
                      name="addressLine2"
                      value={formik.values.addressLine2}
                      onChange={formik.handleChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label className="control-label">Postal Code</Label>
                    <Input
                      type="text"
                      name="postalCode"
                      value={formik.values.postalCode}
                      onChange={formik.handleChange}
                    />
                  </FormGroup>
                </Col>
              </Row>
            </form>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle}>
          Close
        </Button>
        {newSupplier.tab === 'new' && (
          <Button
            color="primary"
            onClick={formik.handleSubmit}
            disabled={!formik.isValid || isSupplierLimitReached || formik.isSubmitting}
          >
            {formik.isSubmitting ? 'Saving...' : 'Add Supplier'}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
};

RfqSupplierModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  existingSuppliers: PropTypes.arrayOf(
    PropTypes.shape({
      supplierId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      email: PropTypes.string,
      primaryContact: PropTypes.string,
      categories: PropTypes.array,
    }),
  ).isRequired,
  formData: PropTypes.shape({
    suppliers: PropTypes.arrayOf(
      PropTypes.shape({
        supplierId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      }),
    ),
  }).isRequired,
  newSupplier: PropTypes.shape({
    tab: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
  }).isRequired,
  setNewSupplier: PropTypes.func.isRequired,
  addExistingSupplier: PropTypes.func.isRequired,
};

export default RfqSupplierModal;
