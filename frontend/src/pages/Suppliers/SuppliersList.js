import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { Mail, Phone, MapPin, UserPlus, Edit2 } from 'react-feather';
import {
  Row,
  Col,
  Badge,
  Pagination,
  PaginationItem,
  PaginationLink,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  FormGroup,
  Label,
  Input,
  FormFeedback,
  Spinner,
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import ComponentCard from '../../components/ComponentCard';
import SupplierService from '../../services/SupplierService';
import SupplierCategoryService from '../../services/SupplierCategoryService';
import MasterDataService from '../../services/MasterDataService';
import { getEntityId } from '../localStorageUtil';

const PAGE_SIZE = 20;

const SuppliersList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const companyId = getEntityId();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Add/Edit Supplier modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState(null);
  const [editingSupplierData, setEditingSupplierData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [isStatesLoading, setIsStatesLoading] = useState(false);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    displayName: '',
    email: '',
    salesEmail: '',
    primaryContact: '',
    customerServicePhone: '',
    website: '',
    currency: '',
    addressLine1: '',
    addressLine2: '',
    country: '',
    state: '',
    city: '',
    postalCode: '',
    countryCode: '',
  });

  // Category/Subcategory selection state
  const [allCategories, setAllCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [showSubCategorySuggestions, setShowSubCategorySuggestions] = useState(false);
  const categoryDropdownRef = useRef(null);
  const subCategoryDropdownRef = useRef(null);

  const fetchCategories = async () => {
    try {
      const response = await SupplierCategoryService.getAllSupplierCategories(companyId);
      const allCategoriesData = response.data.content || response.data || [];
      const parentCategories = allCategoriesData.filter((cat) => !cat.parentId);
      setCategories(parentCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSuppliers = async (page = 0) => {
    setLoading(true);
    try {
      const response = await SupplierService.getAllSuppliersPaginated({
        pageSize: PAGE_SIZE,
        pageNumber: page,
        name: debouncedSearchTerm || undefined,
        categoryId: categoryFilter || undefined,
      });

      // Handle both array response and paginated response
      if (Array.isArray(response.data)) {
        setSuppliers(response.data);
        setTotalElements(response.data.length);
        setTotalPages(Math.ceil(response.data.length / PAGE_SIZE));
        setCurrentPage(0);
      } else {
        setSuppliers(response.data?.content || response.data || []);
        setTotalElements(response.data?.totalElements || response.data?.length || 0);
        setTotalPages(response.data?.totalPages || 1);
        setCurrentPage(response.data?.pageNumber || 0);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.dismiss();
      toast.error('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
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

  const loadAllCategories = async () => {
    try {
      const response = await SupplierCategoryService.getAllSupplierCategories(companyId);
      const allCategoriesData = response.data.content || response.data || [];
      const parentCategories = allCategoriesData.filter((cat) => !cat.parentId);
      setAllCategories(parentCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setShowCategorySuggestions(false);
      }
      if (subCategoryDropdownRef.current && !subCategoryDropdownRef.current.contains(event.target)) {
        setShowSubCategorySuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load subcategories when categories are selected
  useEffect(() => {
    if (selectedCategories.length > 0) {
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
    } else {
      setSubCategories([]);
      setSelectedSubCategories([]);
    }
  }, [selectedCategories, allCategories]);

  useEffect(() => {
    setCurrentPage(0);
    fetchSuppliers(0);
  }, [debouncedSearchTerm, categoryFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle edit from navigation state (from SupplierDetail page)
  useEffect(() => {
    const editSupplierId = location.state?.editSupplierId;
    if (editSupplierId && suppliers.length > 0) {
      const supplierToEdit = suppliers.find(
        (s) => s.supplierId === parseInt(editSupplierId, 10) || s.supplierId === editSupplierId
      );
      if (supplierToEdit) {
        openEditModal(supplierToEdit);
        // Clear the state so it doesn't re-trigger on subsequent renders
        navigate(location.pathname, { replace: true, state: {} });
      } else {
        // Supplier not in current page, fetch it directly
        const fetchAndEditSupplier = async () => {
          try {
            const response = await SupplierService.getSupplierById(editSupplierId);
            const supplierData = response.data?.[0] || response.data;
            if (supplierData) {
              openEditModal(supplierData);
            }
          } catch (error) {
            console.error('Error fetching supplier for edit:', error);
            toast.error('Could not load supplier for editing');
          }
          navigate(location.pathname, { replace: true, state: {} });
        };
        fetchAndEditSupplier();
      }
    }
  }, [location.state, suppliers]);

  const handlePageChange = (page) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
      fetchSuppliers(page);
    }
  };

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleCategoryFilterChange = (event) => {
    setCategoryFilter(event.target.value);
  };

  const handleViewDetails = (supplier) => {
    navigate(`/suppliers/${supplier.supplierId}`);
  };

  // Add/Edit Supplier Modal handlers
  const openAddModal = () => {
    setIsEditMode(false);
    setEditingSupplierId(null);
    loadCountries();
    loadCurrencies();
    loadAllCategories();
    setAddModalOpen(true);
  };

  const openEditModal = async (supplier) => {
    setIsEditMode(true);
    setEditingSupplierId(supplier.supplierId);
    setEditingSupplierData(supplier); // Store original supplier data for category fallback

    // Pre-populate form with supplier data
    setNewSupplier({
      name: supplier.name || '',
      displayName: supplier.displayName || '',
      email: supplier.email || '',
      salesEmail: supplier.salesEmail || '',
      primaryContact: supplier.primaryContact || '',
      customerServicePhone: supplier.customerServicePhone || '',
      website: supplier.website || '',
      currency: supplier.currency || '',
      addressLine1: supplier.address?.addressLine1 || '',
      addressLine2: supplier.address?.addressLine2 || '',
      country: supplier.address?.country || '',
      state: supplier.address?.state || '',
      city: supplier.address?.city || '',
      postalCode: supplier.address?.postalCode || '',
      countryCode: supplier.address?.isoCountryCode || '',
    });

    // Load countries and currencies
    loadCountries();
    loadCurrencies();

    // Load all categories first, then set selections
    try {
      const response = await SupplierCategoryService.getAllSupplierCategories(companyId);
      const allCategoriesData = response.data.content || response.data || [];
      const parentCategories = allCategoriesData.filter((cat) => !cat.parentId);
      setAllCategories(parentCategories);

      // Pre-select categories after allCategories is loaded
      // Note: The backend returns categories in a nested structure where subcategories
      // are inside the parent's 'subCategories' array. We need to flatten this structure.
      if (supplier.categories && supplier.categories.length > 0) {
        const parentCats = [];
        const subCats = [];

        supplier.categories.forEach((cat) => {
          if (!cat.parentId) {
            // This is a parent category (top-level)
            parentCats.push(cat);
            // Extract nested subcategories if present
            if (cat.subCategories && cat.subCategories.length > 0) {
              cat.subCategories.forEach((subCat) => {
                subCats.push(subCat);
              });
            }
          } else {
            // This is a subcategory (has parentId) - shouldn't happen with nested structure
            // but handle it for backwards compatibility
            subCats.push(cat);
          }
        });

        setSelectedCategories(parentCats.map((cat) => String(cat.categoryId)));
        setSelectedSubCategories(subCats.map((cat) => String(cat.categoryId)));
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }

    // Load states and cities if country/state is set
    if (supplier.address?.country) {
      try {
        const countriesResponse = await MasterDataService.getAllCountries();
        const selectedCountry = countriesResponse.data.find((c) => c.name === supplier.address.country);
        if (selectedCountry) {
          const statesResponse = await MasterDataService.getStatesByCountryId(selectedCountry.countryId);
          setStates(statesResponse.data);

          if (supplier.address?.state) {
            const selectedState = statesResponse.data.find((s) => s.name === supplier.address.state);
            if (selectedState) {
              const citiesResponse = await MasterDataService.getCitiesByStateId(selectedState.stateId);
              setCities(citiesResponse.data);
            }
          }
        }
      } catch (error) {
        console.error('Error loading states/cities:', error);
      }
    }

    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
    setIsEditMode(false);
    setEditingSupplierId(null);
    setEditingSupplierData(null);
    setNewSupplier({
      name: '',
      displayName: '',
      email: '',
      salesEmail: '',
      primaryContact: '',
      customerServicePhone: '',
      website: '',
      currency: '',
      addressLine1: '',
      addressLine2: '',
      country: '',
      state: '',
      city: '',
      postalCode: '',
      countryCode: '',
    });
    setFormErrors({});
    setStates([]);
    setCities([]);
    setSelectedCategories([]);
    setSelectedSubCategories([]);
    setSubCategories([]);
    setShowCategorySuggestions(false);
    setShowSubCategorySuggestions(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSupplier((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleCountryChange = async (e) => {
    const countryName = e.target.value;
    const selectedCountry = countries.find((c) => c.name === countryName);
    const countryId = selectedCountry ? selectedCountry.countryId : null;

    setNewSupplier((prev) => ({ ...prev, country: countryName, state: '', city: '' }));
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
    const stateName = e.target.value;
    const selectedState = states.find((s) => s.name === stateName);
    const stateId = selectedState ? selectedState.stateId : null;

    setNewSupplier((prev) => ({ ...prev, state: stateName, city: '' }));

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

  const validateForm = () => {
    const errors = {};
    if (!newSupplier.name || newSupplier.name.trim() === '') {
      errors.name = 'Supplier name is required';
    }
    if (!newSupplier.email || newSupplier.email.trim() === '') {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newSupplier.email)) {
      errors.email = 'Invalid email format';
    }
    if (!newSupplier.primaryContact || newSupplier.primaryContact.trim() === '') {
      errors.primaryContact = 'Primary contact is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddSupplier = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Build categories array from selected categories and subcategories
      const categoriesPayload = [];

      // Add parent categories
      selectedCategories.forEach((catId) => {
        const catIdInt = parseInt(catId, 10);
        let category = allCategories.find((c) => c.categoryId === catIdInt);

        // Fallback: use original supplier data if category not found in allCategories
        if (!category && isEditMode && editingSupplierData?.categories) {
          const originalCat = editingSupplierData.categories.find(
            (c) => c.categoryId === catIdInt && !c.parentId
          );
          if (originalCat) {
            category = originalCat;
          }
        }

        if (category) {
          categoriesPayload.push({
            categoryId: category.categoryId,
            categoryName: category.categoryName,
          });
        }
      });

      // Add subcategories - look in multiple places to find the subcategory data
      selectedSubCategories.forEach((subCatId) => {
        const subCatIdInt = parseInt(subCatId, 10);
        let foundSubCat = null;
        let parentCategoryId = null;

        // First try to find in subCategories state (grouped by parent)
        subCategories.forEach((group) => {
          const subCat = group.subCategories?.find((s) => s.categoryId === subCatIdInt);
          if (subCat) {
            foundSubCat = subCat;
            parentCategoryId = group.parentCategoryId;
          }
        });

        // If not found, search in allCategories nested subCategories
        if (!foundSubCat) {
          allCategories.forEach((parentCat) => {
            const subCat = parentCat.subCategories?.find((s) => s.categoryId === subCatIdInt);
            if (subCat) {
              foundSubCat = subCat;
              parentCategoryId = parentCat.categoryId;
            }
          });
        }

        // Fallback: use original supplier data (for edit mode when category structure differs)
        if (!foundSubCat && isEditMode && editingSupplierData?.categories) {
          const originalCat = editingSupplierData.categories.find((c) => c.categoryId === subCatIdInt);
          if (originalCat && originalCat.parentId) {
            foundSubCat = originalCat;
            parentCategoryId = originalCat.parentId;
          }
        }

        if (foundSubCat && parentCategoryId) {
          categoriesPayload.push({
            categoryId: foundSubCat.categoryId,
            categoryName: foundSubCat.categoryName,
            parentId: parentCategoryId,
          });
        }
      });

      const payload = {
        name: newSupplier.name,
        displayName: newSupplier.displayName || newSupplier.name,
        email: newSupplier.email,
        salesEmail: newSupplier.salesEmail || null,
        primaryContact: newSupplier.primaryContact,
        customerServicePhone: newSupplier.customerServicePhone || null,
        website: newSupplier.website || null,
        currency: newSupplier.currency || null,
        supplierLogoId: null,
        supplierSignatureId: null,
        shippingMethodId: null,
        paymentTermsId: null,
        isActive: true,
        // Only set DRAFT for new suppliers, preserve existing status on edit
        supplierStatus: isEditMode ? undefined : 'DRAFT',
        categories: categoriesPayload.length > 0 ? categoriesPayload : [],
        address: {
          addressId: null,
          companyId,
          addressLine1: newSupplier.addressLine1 || '',
          addressLine2: newSupplier.addressLine2 || '',
          addressType: 'PRIMARY',
          street: '',
          city: newSupplier.city || '',
          state: newSupplier.state || '',
          postalCode: newSupplier.postalCode || '',
          country: newSupplier.country || '',
          isoCountryCode: newSupplier.countryCode || '',
        },
      };

      if (isEditMode && editingSupplierId) {
        // Update existing supplier
        await SupplierService.updateSupplier(editingSupplierId, payload);
        toast.success('Supplier updated successfully');
      } else {
        // Create new supplier
        payload.createdDate = new Date().toISOString();
        await SupplierService.handleCreateDraftSupplierFromCart(payload, companyId);
        toast.success('Supplier created successfully');
      }

      closeAddModal();
      fetchSuppliers(currentPage);
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error(error.response?.data?.errorMessage || `Failed to ${isEditMode ? 'update' : 'create'} supplier`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSupplierName = (cell) => {
    return <span>{cell}</span>;
  };

  const renderIsInternal = (cell, row) => {
    return row.isInternal ? (
      <Badge
        color="info"
        style={{
          fontSize: '11px',
          padding: '4px 10px',
          backgroundColor: '#0891b2',
        }}
      >
        Yes
      </Badge>
    ) : (
      <span className="text-muted">No</span>
    );
  };

  const renderCategories = (cell, row) => {
    if (!row.categories || row.categories.length === 0) {
      return <span className="text-muted">-</span>;
    }
    const parentCategories = row.categories.filter((cat) => !cat.parentId);
    if (parentCategories.length === 0) {
      return <span className="text-muted">-</span>;
    }
    return (
      <div className="d-flex flex-wrap gap-1">
        {parentCategories.slice(0, 2).map((cat) => (
          <Badge key={cat.categoryId} color="light" className="text-dark border">
            {cat.categoryName}
          </Badge>
        ))}
        {parentCategories.length > 2 && (
          <Badge color="secondary" pill>
            +{parentCategories.length - 2}
          </Badge>
        )}
      </div>
    );
  };

  const renderContact = (cell, row) => {
    return (
      <div style={{ fontSize: '12px' }}>
        {row.email && (
          <div className="d-flex align-items-center gap-1 mb-1">
            <Mail size={12} className="text-muted" />
            <span className="text-truncate" style={{ maxWidth: '150px' }} title={row.email}>
              {row.email}
            </span>
          </div>
        )}
        {row.primaryContact && (
          <div className="d-flex align-items-center gap-1">
            <Phone size={12} className="text-muted" />
            <span>{row.primaryContact}</span>
          </div>
        )}
      </div>
    );
  };

  const renderLocation = (cell, row) => {
    const address = row.address;
    if (!address) return <span className="text-muted">-</span>;

    const locationParts = [address.city, address.state, address.country].filter(Boolean);
    if (locationParts.length === 0) return <span className="text-muted">-</span>;

    return (
      <div className="d-flex align-items-center gap-1" style={{ fontSize: '12px' }}>
        <MapPin size={12} className="text-muted" />
        <span>{locationParts.join(', ')}</span>
      </div>
    );
  };

  const renderActionButtons = (cell, row) => (
    <div className="d-flex justify-content-center gap-1">
      {row.isInternal && (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={(e) => {
            e.stopPropagation();
            openEditModal(row);
          }}
          title="Edit Supplier"
        >
          <Edit2 size={14} />
        </button>
      )}
    </div>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(0, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="d-flex justify-content-between align-items-center mt-3">
        <div className="text-muted small">
          Showing {currentPage * PAGE_SIZE + 1} to{' '}
          {Math.min((currentPage + 1) * PAGE_SIZE, totalElements)} of {totalElements} suppliers
        </div>
        <Pagination>
          <PaginationItem disabled={currentPage === 0}>
            <PaginationLink first onClick={() => handlePageChange(0)} />
          </PaginationItem>
          <PaginationItem disabled={currentPage === 0}>
            <PaginationLink previous onClick={() => handlePageChange(currentPage - 1)} />
          </PaginationItem>
          {startPage > 0 && (
            <PaginationItem disabled>
              <PaginationLink>...</PaginationLink>
            </PaginationItem>
          )}
          {pages.map((page) => (
            <PaginationItem key={page} active={page === currentPage}>
              <PaginationLink onClick={() => handlePageChange(page)}>{page + 1}</PaginationLink>
            </PaginationItem>
          ))}
          {endPage < totalPages - 1 && (
            <PaginationItem disabled>
              <PaginationLink>...</PaginationLink>
            </PaginationItem>
          )}
          <PaginationItem disabled={currentPage === totalPages - 1}>
            <PaginationLink next onClick={() => handlePageChange(currentPage + 1)} />
          </PaginationItem>
          <PaginationItem disabled={currentPage === totalPages - 1}>
            <PaginationLink last onClick={() => handlePageChange(totalPages - 1)} />
          </PaginationItem>
        </Pagination>
      </div>
    );
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
      />
      <Row>
        <Col md="12">
          <ComponentCard
            title={
              <div className="d-flex align-items-center gap-3">
                <div
                  className="icon-wrapper"
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#009efb',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid rgba(0, 158, 251, 0.1)',
                  }}
                >
                  <i className="fas fa-truck text-white"></i>
                </div>
                <div>
                  <h4 className="mb-1">Suppliers</h4>
                  <p className="text-muted mb-0 small">
                    Browse and filter suppliers by category
                  </p>
                </div>
              </div>
            }
          >
            <div
              className="d-flex justify-content-between align-items-center mb-3 responsive-container"
              style={{
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef',
              }}
            >
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <div className="search-wrapper" style={{ minWidth: '250px' }}>
                  <div className="position-relative">
                    <i
                      className="fas fa-search position-absolute"
                      style={{
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#6c757d',
                        zIndex: 1,
                      }}
                    ></i>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={handleSearchInputChange}
                      placeholder="Search by supplier name..."
                      className="form-control"
                      style={{
                        paddingLeft: '40px',
                        borderRadius: '6px',
                        border: '1px solid #dee2e6',
                      }}
                    />
                  </div>
                </div>
                <div style={{ minWidth: '200px' }}>
                  <select
                    className="form-control"
                    value={categoryFilter}
                    onChange={handleCategoryFilterChange}
                    style={{ borderRadius: '6px' }}
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.categoryId} value={cat.categoryId}>
                        {cat.categoryName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="stats-info d-flex align-items-center gap-2">
                  <i className="fas fa-truck" style={{ color: '#009efb', fontSize: '14px' }}></i>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#495057' }}>
                    Total Suppliers: <span style={{ color: '#009efb' }}>{totalElements}</span>
                  </span>
                </div>
              </div>
              <button
                className="btn btn-primary px-4 py-2"
                type="button"
                onClick={openAddModal}
                style={{
                  backgroundColor: '#009efb',
                  border: '1px solid #009efb',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0, 158, 251, 0.2)',
                  transition: 'all 0.2s ease',
                  color: 'white',
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#0084d6';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 158, 251, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#009efb';
                  e.target.style.transform = 'translateY(0px)';
                  e.target.style.boxShadow = '0 2px 8px rgba(0, 158, 251, 0.2)';
                }}
                onFocus={(e) => {
                  e.target.style.backgroundColor = '#0084d6';
                }}
                onBlur={(e) => {
                  e.target.style.backgroundColor = '#009efb';
                }}
              >
                <UserPlus size={16} className="me-2" />
                Add Supplier
              </button>
            </div>
            <div className="table-responsive">
              <BootstrapTable
                data={suppliers}
                striped
                hover
                condensed
                tableHeaderClass="mb-0"
                containerClass="clickable-rows"
                options={{
                  onRowClick: (row) => handleViewDetails(row),
                }}
              >
                <TableHeaderColumn
                  width="20%"
                  isKey
                  dataField="name"
                  dataAlign="left"
                  headerAlign="left"
                  dataFormat={renderSupplierName}
                >
                  Supplier Name
                </TableHeaderColumn>
                <TableHeaderColumn
                  width="20%"
                  dataField="categories"
                  dataAlign="left"
                  headerAlign="left"
                  dataFormat={renderCategories}
                >
                  Categories
                </TableHeaderColumn>
                <TableHeaderColumn
                  width="20%"
                  dataField="email"
                  dataAlign="left"
                  headerAlign="left"
                  dataFormat={renderContact}
                >
                  Contact
                </TableHeaderColumn>
                <TableHeaderColumn
                  width="15%"
                  dataField="address"
                  dataAlign="left"
                  headerAlign="left"
                  dataFormat={renderLocation}
                >
                  Location
                </TableHeaderColumn>
                <TableHeaderColumn
                  width="10%"
                  dataField="isInternal"
                  dataAlign="center"
                  headerAlign="center"
                  dataFormat={renderIsInternal}
                >
                  Is Internal
                </TableHeaderColumn>
                <TableHeaderColumn
                  width="10%"
                  dataFormat={renderActionButtons}
                  dataAlign="center"
                  headerAlign="center"
                >
                  Actions
                </TableHeaderColumn>
              </BootstrapTable>
              {loading && (
                <div className="text-center py-4">
                  <i className="fas fa-spinner fa-spin"></i> Loading...
                </div>
              )}
              {!loading && suppliers.length === 0 && (
                <div className="text-center py-4 text-muted">
                  No suppliers found.
                </div>
              )}
              {renderPagination()}
            </div>
          </ComponentCard>
        </Col>
      </Row>

      {/* Add/Edit Supplier Modal */}
      <Modal isOpen={addModalOpen} toggle={closeAddModal} size="lg">
        <ModalHeader toggle={closeAddModal}>
          {isEditMode ? <Edit2 size={20} className="me-2" /> : <UserPlus size={20} className="me-2" />}
          {isEditMode ? 'Edit Supplier' : 'Add New Supplier'}
        </ModalHeader>
        <ModalBody>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="name">
                  Supplier Name <span className="text-danger">*</span>
                </Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={newSupplier.name}
                  onChange={handleInputChange}
                  invalid={!!formErrors.name}
                  placeholder="Enter supplier name"
                />
                <FormFeedback>{formErrors.name}</FormFeedback>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label for="displayName">Display Name</Label>
                <Input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={newSupplier.displayName}
                  onChange={handleInputChange}
                  placeholder="Enter display name"
                />
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="email">
                  Email <span className="text-danger">*</span>
                </Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={newSupplier.email}
                  onChange={handleInputChange}
                  invalid={!!formErrors.email}
                  placeholder="Enter email address"
                />
                <FormFeedback>{formErrors.email}</FormFeedback>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label for="salesEmail">Sales Email</Label>
                <Input
                  type="email"
                  id="salesEmail"
                  name="salesEmail"
                  value={newSupplier.salesEmail}
                  onChange={handleInputChange}
                  placeholder="Enter sales email"
                />
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="primaryContact">
                  Primary Contact <span className="text-danger">*</span>
                </Label>
                <Input
                  type="text"
                  id="primaryContact"
                  name="primaryContact"
                  value={newSupplier.primaryContact}
                  onChange={handleInputChange}
                  invalid={!!formErrors.primaryContact}
                  placeholder="Enter phone number"
                />
                <FormFeedback>{formErrors.primaryContact}</FormFeedback>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label for="customerServicePhone">Customer Service Phone</Label>
                <Input
                  type="text"
                  id="customerServicePhone"
                  name="customerServicePhone"
                  value={newSupplier.customerServicePhone}
                  onChange={handleInputChange}
                  placeholder="Enter customer service phone"
                />
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="website">Website</Label>
                <Input
                  type="url"
                  id="website"
                  name="website"
                  value={newSupplier.website}
                  onChange={handleInputChange}
                  placeholder="https://www.example.com"
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label for="currency">Currency</Label>
                <Input
                  type="select"
                  id="currency"
                  name="currency"
                  value={newSupplier.currency}
                  onChange={handleInputChange}
                >
                  <option value="">Select Currency</option>
                  {currencies.map((curr) => (
                    <option key={curr.currencyId} value={curr.currencyCode}>
                      {curr.currencyCode} - {curr.currencyName}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>Categories</Label>
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
                        const category = allCategories.find((c) => c.categoryId === parseInt(catId, 10));
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
                                setSelectedCategories(selectedCategories.filter((id) => id !== catId));
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
                            if (isSelected) {
                              setSelectedCategories(selectedCategories.filter((id) => id !== catIdStr));
                            } else {
                              setSelectedCategories([...selectedCategories, catIdStr]);
                            }
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
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
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>Subcategories</Label>
                <div style={{ position: 'relative' }} ref={subCategoryDropdownRef}>
                  <div
                    onClick={() => {
                      if (selectedCategories.length > 0 && subCategories.length > 0) {
                        setShowSubCategorySuggestions(!showSubCategorySuggestions);
                      }
                    }}
                    className="form-control"
                    style={{
                      minHeight: '38px',
                      cursor: selectedCategories.length > 0 && subCategories.length > 0 ? 'pointer' : 'not-allowed',
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
                        subCategories.forEach((group) => {
                          const found = group.subCategories.find((s) => s.categoryId === parseInt(subCatId, 10));
                          if (found) {
                            subCategory = found;
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
                          >
                            {subCategory.categoryName}
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubCategories(selectedSubCategories.filter((id) => id !== subCatId));
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
                          : subCategories.length === 0
                          ? 'No subcategories available'
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
                                if (isSelected) {
                                  setSelectedSubCategories(selectedSubCategories.filter((id) => id !== subCatIdStr));
                                } else {
                                  setSelectedSubCategories([...selectedSubCategories, subCatIdStr]);
                                }
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                            >
                              <input
                                type="checkbox"
                                checked={selectedSubCategories.includes(String(subCategory.categoryId))}
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
            </Col>
          </Row>

          <hr />
          <h6 className="text-muted mb-3">Address Information</h6>

          <Row>
            <Col md={12}>
              <FormGroup>
                <Label for="addressLine1">Address Line 1</Label>
                <Input
                  type="text"
                  id="addressLine1"
                  name="addressLine1"
                  value={newSupplier.addressLine1}
                  onChange={handleInputChange}
                  placeholder="Enter street address"
                />
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              <FormGroup>
                <Label for="addressLine2">Address Line 2</Label>
                <Input
                  type="text"
                  id="addressLine2"
                  name="addressLine2"
                  value={newSupplier.addressLine2}
                  onChange={handleInputChange}
                  placeholder="Apartment, suite, etc."
                />
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="country">Country</Label>
                <Input
                  type="select"
                  id="country"
                  name="country"
                  value={newSupplier.country}
                  onChange={handleCountryChange}
                >
                  <option value="">Select Country</option>
                  {countries.map((country) => (
                    <option key={country.countryId} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label for="state">State/Province</Label>
                <Input
                  type="select"
                  id="state"
                  name="state"
                  value={newSupplier.state}
                  onChange={handleStateChange}
                  disabled={isStatesLoading || states.length === 0}
                >
                  <option value="">
                    {isStatesLoading ? 'Loading...' : 'Select State'}
                  </option>
                  {states.map((state) => (
                    <option key={state.stateId} value={state.name}>
                      {state.name}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="city">City</Label>
                <Input
                  type="select"
                  id="city"
                  name="city"
                  value={newSupplier.city}
                  onChange={handleInputChange}
                  disabled={isCitiesLoading || cities.length === 0}
                >
                  <option value="">
                    {isCitiesLoading ? 'Loading...' : 'Select City'}
                  </option>
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
                <Label for="postalCode">Postal Code</Label>
                <Input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  value={newSupplier.postalCode}
                  onChange={handleInputChange}
                  placeholder="Enter postal code"
                />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={closeAddModal} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleAddSupplier} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="me-2" />
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                {isEditMode ? <Edit2 size={16} className="me-2" /> : <UserPlus size={16} className="me-2" />}
                {isEditMode ? 'Update Supplier' : 'Add Supplier'}
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default SuppliersList;
