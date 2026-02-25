import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Row,
  Col,
  Button,
  Card,
  CardBody,
  Pagination,
  PaginationItem,
  PaginationLink,
  Modal,
  Input,
  Label,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Table,
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import { FaDownload, FaFileUpload } from 'react-icons/fa';
import 'react-toastify/dist/ReactToastify.css';
import '../CompanyManagement/ReactBootstrapTable.scss';
import Swal from 'sweetalert2';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import AsyncSelect from 'react-select/async';
import AddProductModal from './AddProductModal';
import AddSupplierModal from './AddSupplierModal';
import CartService from '../../services/CartService';
import SupplierService from '../../services/SupplierService';
import CompanyService from '../../services/CompanyService';

import {
  getEntityId,
  formatStatusText,
  getUserId,
  getUserName,
  parseQueries,
  getExtensionFromContentType,
} from '../localStorageUtil';
import ApprovalPolicyManagementService from '../../services/ApprovalPolicyManagementService';
import { computeDefaultsMap } from '../../utils/autoDefaults';
import ApproverService from '../../services/ApproverService';
import DepartmentService from '../../services/DepartmentService';
import LocationService from '../../services/LocationService';
import GLAccountService from '../../services/GLaccountService';
import FileUploadService from '../../services/FileUploadService';
import ClassService from '../../services/ClassService';
import ProjectService from '../../services/ProjectService';
import CatalogItemService from '../../services/CatalogItemService';
import PurchaseOrderService from '../../services/PurchaseOrderService';
import AddressService from '../../services/AddressService';
import { autoSelectSingleOption } from '../../utils/autoDefaults';
import { computeSingleOptionDefaults } from '../../utils/autoDefaultsHelpers';
import UserService from '../../services/UserService';
import MarkResolvedModal from '../QueryModal/MarkResolvedModal';
import BudgetValidationPreview from '../../components/BudgetValidation/BudgetValidationPreview';
import BudgetSelector from '../../components/BudgetValidation/BudgetSelector';
import BudgetService from '../../services/BudgetService';
import CartHistoryTimeline from '../../components/CartHistoryTimeline/CartHistoryTimeline';
import ManualProductModal from './ManualProductModal';

const CartDetails = () => {
  const { cartId, shipToAddressId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const userNames = getUserName() || 'Unknown User';
  const userId = getUserId();
  const [purchaseOrderId, setPurchaseOrderId] = useState([]);
  const [poCurrentPage, setPoCurrentPage] = useState(0);
  const [poTotalElements, setPoTotalElements] = useState(0);
  const [poLoading, setPoLoading] = useState(false);
  const [modalPurchaseOrders, setModalPurchaseOrders] = useState([]);
  const poPageSize = 10;
  const submitted = new URLSearchParams(location.search).get('submitted') === 'true';
  const [cartStatusType, setCartStatusType] = useState('Draft');
  const queryParams = new URLSearchParams(location.search);
  const redirectToDashboard = queryParams.get('dashboard') === 'true';
  const [cartHeaderData, setCartHeaderData] = useState(null);
  const [onBehalfOfUserId, setOnBehalfOfUserId] = useState('');
  const [purchaseType, setPurchaseType] = useState('OPEX');
  const [neededByDate, setNeededByDate] = useState('');
  const [cartDetails, setCartDetails] = useState([]);
  const [isCartEmpty, setIsCartEmpty] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [allShippingAddresses, setAllShippingAddresses] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(shipToAddressId || ' ');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const companyId = getEntityId();
  const [applyToAll, setApplyToAll] = useState(false);
  const [approvals, setApprovals] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [approvalPreviewData, setApprovalPreviewData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [glAccounts, setGlAccounts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [supplierResults, setSupplierResults] = useState([]);
  const [catalogResults, setCatalogResults] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [selectedGlAccountId, setSelectedGlAccountId] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState(
    (cartHeaderData && cartHeaderData.supplierId) || null,
  );
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const toggleResolvedModal = () => setIsResolveModalOpen(!isResolveModalOpen);
  const [selectedBudgets, setSelectedBudgets] = useState([]);
  const [budgetValidationStatus, setBudgetValidationStatus] = useState(null);
  const [showBudgetValidation, setShowBudgetValidation] = useState(false);
  const [showCartHistory, setShowCartHistory] = useState(false);
  const [cartTotal, setCartTotal] = useState(0);
  const [budgetRefreshKey, setBudgetRefreshKey] = useState(0);
  const [budgetSectionExpanded, setBudgetSectionExpanded] = useState(false);
  const [budgetValidationCartItems, setBudgetValidationCartItems] = useState(null);
  const [showDraftConfirmationModal, setShowDraftConfirmationModal] = useState(false);
  const [pendingNavigationForDraft, setPendingNavigationForDraft] = useState(null);
  const [filteredGlAccounts, setFilteredGlAccounts] = useState([]);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualModalData, setManualModalData] = useState(null);

  const loadPartIdOptions = async (supplierId, inputValue) => {
    if (!supplierId) return [];
    try {
      const results = await CatalogItemService.searchCatalogItemsBySupplier(
        supplierId,
        inputValue,
        { pageSize: 50, pageNumber: 0 },
      );

      const options = results.map((item) => ({
        value: item.PartId,
        label: `${item.PartId} — ${item.Description || ''}`,
        catalogItem: item,
      }));

      if (inputValue && inputValue.trim()) {
        const exactMatch = results.find((item) => item.PartId === inputValue);
        if (!exactMatch) {
          options.push({
            value: inputValue,
            label: `Use "${inputValue}" (Part ID)`,
            isManual: true,
            customOption: true,
          });
        }
      }

      return options;
    } catch (error) {
      console.error('Part ID search failed:', error);

      if (inputValue && inputValue.trim()) {
        return [
          {
            value: inputValue,
            label: `Use "${inputValue}" (Part ID)`,
            isManual: true,
            customOption: true,
          },
        ];
      }

      return [];
    }
  };

  const handleManualOpen = (cartItem, partId) => {
    setManualModalData({
      partId,
      description: " ",
      price: " ",
      unitOfMeasure: cartItem.unitOfMeasure || 'Each',
      cartDetailId: cartItem.cartDetailId,
      isNewManual: true,
    });
    setManualModalOpen(true);
  };


  const handleManualSave = async (data) => {
    const {
      cartDetailId,
      partId,
      description,
      price,
      unitOfMeasure,
    } = data;

    const originalItem = cartDetails.find(
      (x) => x.cartDetailId === cartDetailId
    );
    if (!originalItem) return;

    const updateBody = {
      ...originalItem,
      partId,
      partDescription: description,
      price: Number(price),
      unitOfMeasure,
      catalogItemId: null,
      isManual: true,
    };

    try {
      if (cartStatusType === 'DRAFT') {
        // ✅ Direct save
        await CartService.handleUpdateCartDetails(
          updateBody,
          companyId,
          cartDetailId,
          cartId
        );

        setLocalCartChanges((prev) => {
          const updated = { ...prev };
          delete updated[cartDetailId];
          setHasUnsavedChanges(Object.keys(updated).length > 0);
          return updated;
        });

        fetchCarts(true);
      } else if (isCartEditable()) {
        handleLocalFieldChange(cartDetailId, 'partId', partId);
        handleLocalFieldChange(cartDetailId, 'partDescription', description);
        handleLocalFieldChange(cartDetailId, 'price', Number(price));
        handleLocalFieldChange(cartDetailId, 'unitOfMeasure', unitOfMeasure);
        handleLocalFieldChange(cartDetailId, 'isManual', true);
        handleLocalFieldChange(cartDetailId, 'catalogItemId', null);
      } else {
        await CartService.handleUpdateCartDetails(
          updateBody,
          companyId,
          cartDetailId,
          cartId
        );
        fetchCarts(true);
      }

      setManualModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save product');
    }
  };


  const triggerBudgetRefresh = () => {
    setBudgetRefreshKey((prev) => prev + 1);
  };

  const formatCurrency = (amount, currency = 'USD') => {
    if (amount == null || Number.isNaN(Number(amount))) {
      return currency === 'USD' ? '$0.00' : `${currency} 0.00`;
    }

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(Number(amount));
  };


  const formatNeededBy = (value) => {
    if (!value) return null;
    if (typeof value !== 'string') {
      try {
        return new Date(value).toISOString();
      } catch (e) {
        return null;
      }
    }

    if (/T.*Z$/.test(value)) return value;

    if (value.includes('T')) {
      try {
        return new Date(value).toISOString();
      } catch (e) {
      }
    }


    const parts = value.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts.map((p) => parseInt(p, 10));
      if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
        const now = new Date();
        const isoDate = new Date(
          Date.UTC(
            y,
            m - 1,
            d,
            now.getUTCHours(),
            now.getUTCMinutes(),
            now.getUTCSeconds(),
            now.getUTCMilliseconds(),
          ),
        );
        return isoDate.toISOString();
      }
    }

    try {
      return new Date(value).toISOString();
    } catch (e) {
      return null;
    }
  };

  const [validationErrors, setValidationErrors] = useState({
    projectId: false,
    departmentId: false,
    glAccountId: false,
    classId: false,
    locationId: false,
    shipToAddressId: false,
    purchaseType: false,
  });


  const [originalDropdownValues, setOriginalDropdownValues] = useState({
    projectId: null,
    departmentId: null,
    glAccountId: null,
    classId: null,
    locationId: null,
  });

  const approvalType = 'indent';
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const [settings, setSettings] = useState({
    gLAccountEnabled: '',
    departmentEnabled: '',
    projectEnabled: '',
    locationEnabled: '',
    classEnabled: '',
    supplierEnabled: 'optional',
  });
  const [itemValidationErrors, setItemValidationErrors] = useState({});
  const [previousQueries, setPreviousQueries] = useState([]);
  const [isQueryRaised, setIsQueryRaised] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const fileInputRef = useRef(null);
  const [uploadedFileId, setUploadedFileId] = useState(null);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  // Ensure default single-option selections are applied once
  const defaultsAppliedRef = useRef(false);
  // Prevent concurrent cart header updates (causes database deadlocks)
  const cartUpdateInProgressRef = useRef(false);
  // Track if purchaseType default was already applied
  const purchaseTypeDefaultAppliedRef = useRef(false);

  // Local cart editing state
  const [localCartChanges, setLocalCartChanges] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [originalCartAmount, setOriginalCartAmount] = useState(0);

  const [onBehalfOfEmail, setOnBehalfOfEmail] = useState('');

  useEffect(() => {
    if (cartHeaderData && allUsers.length > 0) {
      const matchedUser = allUsers.find((user) => user.userId === cartHeaderData.onBehalfOf);
      if (matchedUser) {
        setOnBehalfOfEmail(matchedUser.email);
      }
    }
  }, [cartHeaderData, allUsers]);

  const handleSaveSupplier = (supplierData) => {
    toast.success('Supplier added successfully!');
  };

  const PART_PRICE_TOAST_ID = 'PART_PRICE_VALIDATION_ERROR';

  const validatePartAndPrice = () => {
    const errors = {};
    let hasError = false;

    visibleCartDetails.forEach((item) => {
      if (item.isDeleted) return;

      const lineErrors = [];

      if (!item.partId || String(item.partId).trim() === '') {
        lineErrors.push('partId');
      }

      const price = Number(item.price);
      if (!price || price <= 0) {
        lineErrors.push('price');
      }

      if (lineErrors.length > 0) {
        errors[item.cartDetailId] = lineErrors;
        hasError = true;
      }
    });

    setItemValidationErrors(errors);

    if (hasError) {
      if (!toast.isActive(PART_PRICE_TOAST_ID)) {
        toast.dismiss();
        toast.error('Part ID and Unit Price are required for all items.', {
          toastId: PART_PRICE_TOAST_ID,
        });
      }
      return false;
    }

    return true;
  };

  useEffect(() => {
    if (settings.departmentEnabled && selectedDepartmentId) {
      DepartmentService.getgLAccountForDepartment(companyId, selectedDepartmentId)
        .then((response) => {
          setFilteredGlAccounts(response.data || []);
          if (selectedGlAccountId) {
            const isValidGlAccount = (response.data || []).some(
              g => String(g.glAccountId) === String(selectedGlAccountId)
            );
            if (!isValidGlAccount) {
              setSelectedGlAccountId('');
              // Don't auto-update cart during initial load - only on user-initiated changes
              // This prevents deadlocks with other concurrent updates
            }
          }
        })
        .catch((error) => {
          console.error('Error fetching GL accounts for department:', error);
          setFilteredGlAccounts(glAccounts);
        });
    } else {
      setFilteredGlAccounts(glAccounts);
    }
  }, [selectedDepartmentId, settings.departmentEnabled, companyId, glAccounts, selectedGlAccountId]);

  const validateCartItems = () => {
    const newErrors = {};

    const dynamicRequiredFields = [
      ...(settings.projectEnabled ? ['projectId'] : []),
      ...(settings.departmentEnabled ? ['departmentId'] : []),
      ...(settings.gLAccountEnabled ? ['glAccountId'] : []),
      ...(settings.classEnabled ? ['classId'] : []),
      ...(settings.locationEnabled ? ['locationId'] : []),
    ];

    cartDetails.forEach((item) => {
      const missingFields = dynamicRequiredFields.filter((field) => !item[field]);
      if (missingFields.length > 0) {
        newErrors[item.cartDetailId] = missingFields;
      }
    });

    setItemValidationErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSupplierSearch = async () => {
    try {
      setIsLoading(true);
      const response = await SupplierService.getConnectedSuppliers(companyId);
      const supplierData = (response && response.data) || [];

      const filteredSuppliers = supplierData.filter((supplier) => {
        if (!supplier) return false;

        const matchesSearch =
          supplierSearchTerm.trim() === '' ||
          (supplier.name &&
            supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase())) ||
          (supplier.displayName &&
            supplier.displayName.toLowerCase().includes(supplierSearchTerm.toLowerCase()));

        return matchesSearch;
      });

      setSupplierResults(filteredSuppliers);
    } catch (error) {
      console.error('Supplier search failed:', error);
      setSupplierResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCartQueries = async () => {
    try {
      const response = await CartService.getCartQueries(companyId, cartId);
      const responsecartbyId = response.data;
      if (responsecartbyId.queries) {
        const parsedQueries = parseQueries(responsecartbyId.queries);
        setPreviousQueries(parsedQueries);
        setIsQueryRaised(responsecartbyId.isQueryRaised);
      } else {
        setPreviousQueries([]);
      }
    } catch (error) {
      console.error('Error fetching cart queries:', error);
    }
  };

  useEffect(() => {
    fetchCartQueries();
  }, [cartId, companyId]);

  const handleMarkAsResolved = async (note) => {
    const user = {
      userId,
      firstName: userNames,
    };

    const formattedQuery = note ? `${note} - Resolved by ${userNames}` : `Resolved by ${userNames}`;

    const requestBody = {
      isQueryRaised: false,
      queries: formattedQuery,
      user,
      queryResolverId: userId,
    };

    try {
      const response = await ApprovalPolicyManagementService.handleUpdateQuery(
        requestBody,
        companyId,
        cartId,
      );

      if (response.status === 200) {
        await fetchCartQueries();
        setIsQueryRaised(false);
        toast.success('Query marked as resolved!');
        setIsResolveModalOpen(false);
        setUploadedFileId('');
      } else {
        toast.error('Failed to mark query as resolved.');
      }
    } catch (error) {
      console.error('Failed to mark query as resolved:', error);
      toast.error('Failed to resolve query');
    }
  };

  const fetchCarts = (preservePage = false) => {
    return CartService.getCartDetailById(cartId, companyId)
      .then((response) => {
        const fetchedData = response.data || [];
        setCartDetails([...fetchedData]); // Force new array reference
        setIsCartEmpty(fetchedData.length === 0);

        if (!preservePage) {
          setCurrentPage(1);
        }

        // Calculate and store original cart amount
        const originalAmount = fetchedData.reduce((total, item) => {
          const qty = item.qty || 0;
          const price = item.price || 0;
          return total + qty * price;
        }, 0);
        setOriginalCartAmount(originalAmount);

        // Store first item data for account settings population
        if (fetchedData.length > 0) {
          const firstItem = fetchedData[0];
          // Store first item data globally so it can be accessed by modal
          window.firstCartItemSettings = {
            departmentId: firstItem.departmentId,
            glAccountId: firstItem.glAccountId,
            projectId: firstItem.projectId,
            classId: firstItem.classId,
            locationId: firstItem.locationId,
            supplierId: firstItem.supplierId,
          };

          if (
            !(cartHeaderData && cartHeaderData.projectId) &&
            !selectedProjectId &&
            firstItem.projectId
          ) {
            setSelectedProjectId(firstItem.projectId);
          }
          if (
            !(cartHeaderData && cartHeaderData.departmentId) &&
            !selectedDepartmentId &&
            firstItem.departmentId
          ) {
            setSelectedDepartmentId(firstItem.departmentId);
          }
          if (!cartHeaderData?.glAccountId && !selectedGlAccountId && firstItem.glAccountId) {
            setSelectedGlAccountId(firstItem.glAccountId);
          }
          if (!cartHeaderData?.classId && !selectedClassId && firstItem.classId) {
            setSelectedClassId(firstItem.classId);
          }
          if (!cartHeaderData?.locationId && !selectedLocationId && firstItem.locationId) {
            setSelectedLocationId(firstItem.locationId);
          }
        }

        return fetchedData;
      })
      .catch((error) => {
        console.error('Error fetching cart details:', error);
        setIsCartEmpty(true);
        throw error;
      });
  };

  const handleSupplierSpecificPartSelect = async (
    cartDetailId,
    partId,
    isManual = false,
    manualData = null,
  ) => {
    try {
      // Get the cart item to find the supplier ID
      const cartItem = cartDetails.find((x) => x.cartDetailId === cartDetailId);
      if (!cartItem) return;

      if (isManual) {
        setManualModalData({
          cartDetailId,
          partId,
          description: cartItem.partDescription || '',
          price: cartItem.price || '',
          unitOfMeasure: cartItem.unitOfMeasure || 'Each',
        });
        setManualModalOpen(true);
        return;
      }

      // Existing logic for catalog items (keep this as is)
      const results = await CatalogItemService.searchCatalogItemsBySupplier(
        cartItem.supplierId,
        partId,
        { pageSize: 10, pageNumber: 0 },
      );

      // Find exact match by PartId
      let selected = results.find((x) => x.PartId === partId);

      const updateBody = {
        ...cartDetails.find((x) => x.cartDetailId === cartDetailId),
        partId: selected.PartId,
        partDescription: selected.Description,
        price: selected.UnitPrice,
        qty: 1,
        unitOfMeasure: selected.UnitOfMeasure || 'Each',
        catalogId: selected.CatalogId,
        catalogItemId: {
          CatalogItemId: selected.CatalogItemId,
          PartId: selected.PartId,
          ProductImageURL: selected.ProductImageURL,
        },
        manufacturerName: selected.Manufacturer || '',
        manufacturerPart: selected.ManufacturerPart || '',
        isManual: false,
      };

      try {
        const defaults = computeDefaultsMap({
          departmentId: departments,
          projectId: projects,
          glAccountId: glAccounts,
          classId: classes,
          locationId: locations,
        });

        if (defaults.departmentId && !updateBody.departmentId && !cartHeaderData?.departmentId) {
          updateBody.departmentId = defaults.departmentId;
        }
        if (defaults.projectId && !updateBody.projectId && !cartHeaderData?.projectId) {
          updateBody.projectId = defaults.projectId;
        }
        if (defaults.glAccountId && !updateBody.glAccountId && !cartHeaderData?.glAccountId) {
          updateBody.glAccountId = defaults.glAccountId;
        }
        if (defaults.classId && !updateBody.classId && !cartHeaderData?.classId) {
          updateBody.classId = defaults.classId;
        }
        if (defaults.locationId && !updateBody.locationId && !cartHeaderData?.locationId) {
          updateBody.locationId = defaults.locationId;
        }
      } catch (err) {
        console.error('Error computing line-item defaults:', err);
      }


      if (cartStatusType === 'DRAFT') {
        await CartService.handleUpdateCartDetails(updateBody, companyId, cartDetailId, cartId);
        setLocalCartChanges((prev) => {
          const newChanges = { ...prev };
          delete newChanges[cartDetailId];
          setHasUnsavedChanges(Object.keys(newChanges).length > 0);
          return newChanges;
        });

        fetchCarts(true);
      } else if (isCartEditable()) {
        handleLocalFieldChange(cartDetailId, 'partId', selected.PartId);
        handleLocalFieldChange(cartDetailId, 'partDescription', selected.Description);
        handleLocalFieldChange(cartDetailId, 'price', selected.UnitPrice);
        handleLocalFieldChange(cartDetailId, 'unitOfMeasure', selected.UnitOfMeasure || 'Each');
        handleLocalFieldChange(cartDetailId, 'isManual', false);
        handleLocalFieldChange(cartDetailId, 'catalogId', selected.CatalogId);
        handleLocalFieldChange(cartDetailId, 'catalogItemId', {
          CatalogItemId: selected.CatalogItemId,
          PartId: selected.PartId,
          ProductImageURL: selected.ProductImageURL,
        });
        try {
          const defaults = computeDefaultsMap({
            departmentId: departments,
            projectId: projects,
            glAccountId: glAccounts,
            classId: classes,
            locationId: locations,
          });

          if (defaults.departmentId && !cartDetails.find(d => d.cartDetailId === cartDetailId).departmentId && !cartHeaderData?.departmentId) {
            handleLocalFieldChange(cartDetailId, 'departmentId', defaults.departmentId);
          }
          if (defaults.projectId && !cartDetails.find(d => d.cartDetailId === cartDetailId).projectId && !cartHeaderData?.projectId) {
            handleLocalFieldChange(cartDetailId, 'projectId', defaults.projectId);
          }
          if (defaults.glAccountId && !cartDetails.find(d => d.cartDetailId === cartDetailId).glAccountId && !cartHeaderData?.glAccountId) {
            handleLocalFieldChange(cartDetailId, 'glAccountId', defaults.glAccountId);
          }
          if (defaults.classId && !cartDetails.find(d => d.cartDetailId === cartDetailId).classId && !cartHeaderData?.classId) {
            handleLocalFieldChange(cartDetailId, 'classId', defaults.classId);
          }
          if (defaults.locationId && !cartDetails.find(d => d.cartDetailId === cartDetailId).locationId && !cartHeaderData?.locationId) {
            handleLocalFieldChange(cartDetailId, 'locationId', defaults.locationId);
          }
        } catch (err) {
          console.error('Error applying local line-item defaults:', err);
        }
      }
      else {
        await CartService.handleUpdateCartDetails(updateBody, companyId, cartDetailId, cartId);
        fetchCarts(true);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to update product');
    }
  };

  const handleAddNewProduct = async (productData) => {
    try {
      toast.dismiss();
      const firstItem = cartDetails.length > 0 ? cartDetails[0] : null;
      const projectId =
        productData.projectId ||
        selectedProjectId ||
        cartHeaderData?.projectId ||
        window.firstCartItemSettings?.projectId;

      const departmentId =
        productData.departmentId ||
        selectedDepartmentId ||
        cartHeaderData?.departmentId ||
        window.firstCartItemSettings?.departmentId;

      const glAccountId =
        productData.glAccountId ||
        selectedGlAccountId ||
        cartHeaderData?.glAccountId ||
        window.firstCartItemSettings?.glAccountId;

      const classId =
        productData.classId ||
        selectedClassId ||
        cartHeaderData?.classId ||
        window.firstCartItemSettings?.classId;

      const locationId =
        productData.locationId ||
        selectedLocationId ||
        cartHeaderData?.locationId ||
        window.firstCartItemSettings?.locationId;


      const requestBody = {
        cartId,
        supplierId,
        projectId,
        catalogId: null,
        catalogItemId: {
          CatalogItemId: null,
          PartId: productData.PartId,
          ProductImageURL: null,
        },
        partId: productData.PartId,
        partDescription: window.jiproduct?.Description || productData.Description || '',
        departmentId,
        orderType: 0,
        glAccountId,
        isCritical: false,
        isSafetyAppReq: false,
        slimit: '',
        qty: productData.quantity || 1,
        price: window.jiproduct?.price || productData.price || 0,
        unitOfMeasure:
          window.jiproduct?.UnitOfMeasurement || productData.UnitOfMeasurement || 'piece', // Match working version
        currencyCode: 'USD',
        internalBuyerQuoteFile: 0,
        priceUpdate: false,
        classId,
        locationId: locationId,
        productId: 1,
        manufacturerName: '',
        manufacturerPart: productData.PartId || '',
      };

      const response = await CartService.handleCreateCart(requestBody, companyId, cartId);

      if (response.data) {
        const newCartItem = {
          cartDetailId: response.data.cartDetailId || Date.now(),
          cartId,
          supplierId,
          projectId,
          departmentId,
          glAccountId,
          classId,
          locationId,
          partId: productData.PartId,
          partDescription: productData.Description,
          unitOfMeasure: productData.UnitOfMeasurement || 'Each',
          qty: productData.quantity || 1,
          price: productData.price || 0,
          notes: productData.notes || '',
          createdBy: userId,
          companyId,
          // Additional fields
          orderType: 0,
          isCritical: false,
          isSafetyAppReq: false,
          slimit: '',
          currencyCode: 'USD',
          internalBuyerQuoteFile: 0,
          priceUpdate: false,
          productId: 1,
          manufacturerName: '',
          manufacturerPart: productData.PartId || '',
        };

        setCartDetails((prevDetails) => {
          const updatedDetails = [...prevDetails, newCartItem];

          return updatedDetails;
        });

        // Close the modal first
        setIsAddProductModalOpen(false);

        // Show success message
        toast.success('Product added to cart successfully!');

        // Also refresh cart data from server to ensure consistency
        setTimeout(() => {
          fetchCarts()
            .then((fetchedData) => {
              console.log('Server refresh completed after product addition');
            })
            .catch((error) => {
              console.error('Error refreshing cart after product addition:', error);
            });
        }, 500);
      } else {
        throw new Error('No response data received');
      }
    } catch (error) {
      console.error('Error adding new product to cart:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });

      const errorMessage =
        error.response?.data?.errorMessage ||
        error.response?.data?.message ||
        error.message ||
        'Failed to add product to cart. Please try again.';

      toast.error(errorMessage);
    }
  };

  const handleCatalogSearch = async () => {
    try {
      setIsLoading(true);
      const response = await CatalogItemService.getCatalogItemsBySearch(500, 0, catalogSearchTerm);
      setCatalogResults(response || []);
    } catch (error) {
      console.error('Catalog search failed:', error);
      setCatalogResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuerySubmit = async (queryText) => {
    try {
      const formattedQuery = `${queryText} ${uploadedFileId ? `[FileId: ${uploadedFileId}]` : ''}`;
      const user = {
        userId,
        firstName: userNames,
      };
      const requestBody = {
        isQueryRaised: true,
        queries: formattedQuery,
        user,
      };
      await ApprovalPolicyManagementService.handleUpdateQuery(requestBody, companyId, cartId);
      await fetchCartQueries();
      setIsQueryRaised(true);
      setUploadedFileId('');
      toast.success('Query submitted successfully!');
    } catch (error) {
      console.error('Error submitting query:', error);
      toast.error(
        (error.response && error.response.data && error.response.data.errorMessage) ||
        'Failed to submit query. Please try again.',
      );
    }
  };

  const handleAddToCart = async (item) => {
    const requestBody = {
      cartId,
      supplierId: item.Supplier && item.Supplier.supplierId,
      projectId: item.projectId,
      catalogId: item.CatalogId,
      catalogItemId: {
        CatalogItemId: item.CatalogItemId,
        PartId: item.PartId,
        ProductImageURL: item.ProductImageURL,
      },
      partId: item.PartId,
      partDescription: item.Description || '',
      departmentId: item.departmentId,
      orderType: 0,
      glAccountId: item.glAccountId,
      isCritical: true,
      isSafetyAppReq: false,
      slimit: 'some limit',
      qty: 1,
      price: item.UnitPrice,
      unitOfMeasure: 'piece',
      currencyCode: item.Currency || 'USD',
      internalBuyerQuoteFile: 0,
      priceUpdate: false,
      classId: item.classId,
      locationId: item.classId,
      productId: item.ProductId || 1,
      manufacturerName: item.Manufacturer || 'ABC Corp',
      manufacturerPart: item.ManufacturerPart || 'MP-12345',
    };

    try {
      const response = await CartService.handleCreateCart(requestBody, companyId, cartId);
      if (response.data) {
        toast.dismiss();
        toast.success('Product added to cart successfully!');
        fetchCarts();
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      if (error.response && error.response.data && error.response.data.errorMessage) {
        toast.dismiss();
        toast.error(error.response.data.errorMessage);
      } else {
        toast.dismiss();
        toast.error('An unexpected error occurred');
      }
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      handleSupplierSearch();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [supplierSearchTerm]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (catalogSearchTerm.trim().length > 0) {
        handleCatalogSearch();
      } else {
        setCatalogResults([]);
      }
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [catalogSearchTerm]);

  useEffect(() => {
    const fetchCartHeaderData = async () => {
      try {
        const response = await CartService.getCartsPaginated(companyId, 1, 0, '', '', cartId);
        const responseData = response.data?.content ? response.data.content : response.data || [];
  
        if (responseData && responseData.length > 0) {
          const cartData = responseData[0];
  
          setCartHeaderData(cartData);
          
          // Handle purchaseType with default value and update if needed
          const purchaseTypeValue = cartData.purchaseType || 'OPEX';
          setPurchaseType(purchaseTypeValue);
          
          // Update cart with default OPEX if purchaseType is missing and cart is in DRAFT or PENDING_APPROVAL status
          // Only apply once to prevent loops and deadlocks
          if (!cartData.purchaseType &&
              ['DRAFT', 'PENDING_APPROVAL'].includes(cartData.cartStatusType || '') &&
              !purchaseTypeDefaultAppliedRef.current &&
              !cartUpdateInProgressRef.current) {
            purchaseTypeDefaultAppliedRef.current = true;
            const updatedCartHeader = {
              ...cartData,
              purchaseType: 'OPEX',
              cartId: cartData.cartId,
              companyId: cartData.companyId,
            };
            try {
              cartUpdateInProgressRef.current = true;
              await CartService.handleUpdateCart(updatedCartHeader, companyId, cartId);
              setCartHeaderData(updatedCartHeader);
            } catch (updateError) {
              console.error('Error updating default purchaseType:', updateError);
            } finally {
              cartUpdateInProgressRef.current = false;
            }
          }
          
          setOnBehalfOfUserId(cartData.onBehalfOf || '');
          
          if (cartData.neededBy) {
            const formattedDate = cartData.neededBy.includes('T')
              ? cartData.neededBy.split('T')[0]
              : cartData.neededBy;
            setNeededByDate(formattedDate);
          } else {
            setNeededByDate('');
          }
  
          setSelectedSupplierId(cartData.supplierId || '');
          setSelectedAddressId(cartData.shipToAddressId || shipToAddressId);
          setCartStatusType(cartData.cartStatusType || '');
          
          setOriginalDropdownValues({
            projectId: cartData.projectId || null,
            departmentId: cartData.departmentId || null,
            glAccountId: cartData.glAccountId || null,
            classId: cartData.classId || null,
            locationId: cartData.locationId || null,
          });
        }
      } catch (error) {
        console.error('Error fetching cart header data:', error);
      }
    };
  
    fetchCartHeaderData();
  }, [cartId, companyId, shipToAddressId]);

  // Additional useEffect to ensure cart header values are prioritized
  useEffect(() => {
    if (
      cartHeaderData &&
      projects.length > 0 &&
      departments.length > 0 &&
      glAccounts.length > 0 &&
      classes.length > 0 &&
      locations.length > 0
    ) {
      if (cartHeaderData.projectId) {
        const projectExists = projects.find((p) => p.projectId === cartHeaderData.projectId);
        if (projectExists) {
          setSelectedProjectId(cartHeaderData.projectId);
        } else {
          console.log(
            'Cart header projectId not found in projects array:',
            cartHeaderData.projectId,
          );
        }
      }
      if (cartHeaderData.departmentId) {
        const departmentExists = departments.find(
          (d) => d.departmentId === cartHeaderData.departmentId,
        );
        if (departmentExists) {
          setSelectedDepartmentId(cartHeaderData.departmentId);
        } else {
          console.log(
            'Cart header departmentId not found in departments array:',
            cartHeaderData.departmentId,
          );
        }
      }
      if (cartHeaderData.glAccountId) {
        const glAccountExists = glAccounts.find(
          (g) => g.glAccountId === cartHeaderData.glAccountId,
        );
        if (glAccountExists) {
          setSelectedGlAccountId(cartHeaderData.glAccountId);
        } else {
          console.log(
            'Cart header glAccountId not found in glAccounts array:',
            cartHeaderData.glAccountId,
          );
        }
      }
      if (cartHeaderData.classId) {
        const classExists = classes.find((c) => c.classId === cartHeaderData.classId);
        if (classExists) {
          setSelectedClassId(cartHeaderData.classId);
        } else {
        }
      }
      if (cartHeaderData.locationId) {
        const locationExists = locations.find((l) => l.locationId === cartHeaderData.locationId);
        if (locationExists) {
          setSelectedLocationId(cartHeaderData.locationId);
        } else {
          console.log(
            'Cart header locationId not found in locations array:',
            cartHeaderData.locationId,
          );
        }
      }
    }
  }, [cartHeaderData, projects, departments, glAccounts, classes, locations]);

  const getPartIdDisplay = (item) => {
    if (!item.partId) return null;

    if (item.isManual) {
      return {
        value: item.partId,
        label: `${item.partId}`,
        customOption: true,
      };
    }

    return {
      value: item.partId,
      label: item.partId,
      customOption: false,
    };
  };

  // Fetch paginated purchase orders for the modal
  const fetchPaginatedPurchaseOrders = async (pageNumber = 0) => {
    try {
      setPoLoading(true);
      const response = await PurchaseOrderService.getPurchaseOrdersPaginated(companyId, {
        pageSize: poPageSize,
        pageNumber,
        cartId,
      });

      // Handle paginated response structure
      if (response.data && response.data.content && response.data.content.length > 0) {
        setModalPurchaseOrders(response.data.content);
        setPoCurrentPage(response.data.pageNumber || 0);
        setPoTotalElements(response.data.totalElements || 0);
      } else if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Fallback for non-paginated response
        setModalPurchaseOrders(response.data);
        setPoCurrentPage(0);
        setPoTotalElements(response.data.length);
      } else {
        setModalPurchaseOrders([]);
        setPoCurrentPage(0);
        setPoTotalElements(0);
      }
    } catch (error) {
      console.error('Error fetching paginated purchase orders:', error);
      setModalPurchaseOrders([]);
      setPoCurrentPage(0);
      setPoTotalElements(0);
    } finally {
      setPoLoading(false);
    }
  };

  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      try {
        const response = await PurchaseOrderService.getPurchaseOrdersPaginated(companyId, {
          pageSize: 100,
          pageNumber: 0,
          cartId,
        });

        // Handle the paginated response structure
        if (response.data && response.data.content) {
          setPurchaseOrderId(response.data.content);
        } else {
          setPurchaseOrderId(response.data || []);
        }
      } catch (error) {
        console.error('Error fetching purchase orders:', error);
      }
    };

    fetchPurchaseOrders();
  }, [companyId, cartId]);

  const handleViewPODetails = async () => {
    if (purchaseOrderId.length > 0) {
      setShowModal(true);
      // Load the first page of paginated purchase orders
      await fetchPaginatedPurchaseOrders(0);
    } else {
      console.log('No purchase orders available');
    }
  };

  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const response = await CompanyService.getCompanySetting(companyId);
        setSettings(response.data);
      } catch (error) {
        console.error('Error fetching company settings:', error);
      }
    };

    fetchCompanySettings();
  }, [companyId]);

  const toggleModal = () => {
    setModalOpen(!modalOpen);
  };

  const validateDropdowns = () => {
    const errors = {
      projectId: settings.projectEnabled && !selectedProjectId,
      departmentId: settings.departmentEnabled && !selectedDepartmentId,
      glAccountId: settings.gLAccountEnabled && !selectedGlAccountId,
      classId: settings.classEnabled && !selectedClassId,
      locationId: settings.locationEnabled && !selectedLocationId,
      shipToAddressId: !selectedAddressId || selectedAddressId === '' || selectedAddressId === 'undefined',
      purchaseType: !purchaseType,
    };

    setValidationErrors(errors);
    console.log('Validation Errors:', errors);
    console.log('Selected Address ID:', selectedAddressId);

    return !Object.values(errors).some((error) => error);
  };

  const fetchDepartments = async () => {
    try {
      const response = await DepartmentService.getAllDepartment(companyId);
      if (response && response.data) {
        setDepartments(response.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await LocationService.getAllLocation(companyId);
      if (response && response.data) {
        setLocations(response.data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchGLAccounts = async () => {
    try {
      const response = await GLAccountService.getAllGLAccount(companyId);
      if (response && response.data) {
        setGlAccounts(response.data);
      }
    } catch (error) {
      console.error('Error fetching GL accounts:', error);
    }
  };

  const fetchClass = async () => {
    try {
      const response = await ClassService.getAllClass(companyId);
      if (response && response.data) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await ProjectService.getAllProjects(companyId);
      if (response && response.data) {
        setProjects(response.data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };



  useEffect(() => {
    const loadAllArrays = async () => {
      await fetchDepartments();
      await fetchLocations();
      await fetchGLAccounts();
      await fetchClass();
      await fetchProjects();
    };
    loadAllArrays();
  }, [companyId]);


  const allDropdownsLoaded =
    departments.length > 0 &&
    locations.length > 0 &&
    glAccounts.length > 0 &&
    classes.length > 0 &&
    projects.length > 0;



  useEffect(() => {
    const applySingleOptionDefaults = async () => {
      if (defaultsAppliedRef.current) return;
      if (cartStatusType !== 'DRAFT') return;
      if (!cartHeaderData) return;
      if (!allDropdownsLoaded) return;
      // Wait if another cart update is in progress to prevent deadlocks
      if (cartUpdateInProgressRef.current) return;

      try {
        const { headerUpdates, itemUpdates } =
          computeSingleOptionDefaults(
            { departments, projects, glAccounts, classes, locations, allShippingAddresses },
            cartHeaderData,
            cartDetails,
          );

        if (Object.keys(headerUpdates).length > 0) {
          cartUpdateInProgressRef.current = true;
          try {
            await CartService.handleUpdateCart(
              { ...cartHeaderData, ...headerUpdates },
              companyId,
              cartId,
            );
            setCartHeaderData(prev => ({ ...prev, ...headerUpdates }));
          } finally {
            cartUpdateInProgressRef.current = false;
          }
        }

        if (itemUpdates?.length > 0) {
          // Process item updates sequentially to avoid deadlocks
          for (const u of itemUpdates) {
            await CartService.handleUpdateCartDetails(
              u.requestBody,
              companyId,
              u.cartDetailId,
              cartId,
            );
          }
          await fetchCarts(true);
        }

        defaultsAppliedRef.current = true;
      } catch (e) {
        console.error('Error applying single option defaults:', e);
        // Prevent infinite retries by marking as applied even on error
        defaultsAppliedRef.current = true;
      }
    };

    applySingleOptionDefaults();
  }, [
    cartStatusType,
    cartHeaderData,
    cartDetails,
    allDropdownsLoaded,
  ]);



  const fetchApprovalPreview = async () => {
    try {
      const response = await ApprovalPolicyManagementService.getPreviewApprovalByCompanyId(
        companyId,
        'indent',
        cartId,
      );

      const data = response?.data || [];
      setApprovalPreviewData(data);

      return data;
    } catch (error) {
      toast.dismiss();
      toast.error('Error fetching approval preview data');
      console.error('Error fetching approval preview:', error);
      return null;
    }
  };

  const refreshApprovalWorkflow = async () => {
    try {
      const response = await ApprovalPolicyManagementService.getApprovalFlow(
        companyId,
        approvalType,
        cartId,
      );
      if (response.data && response.data.length) {
        const approvalStages = response.data || [];
        setApprovals(approvalStages);
      } else {
        setApprovals([]);
      }
    } catch (error) {
      console.error('Error refreshing approval workflow:', error);
    }
  };

  const refreshCartDataAfterReapproval = async () => {
    try {
      // Refresh cart header data to get latest status
      const cartHeaderResponse = await CartService.getCartsPaginated(
        companyId,
        1,
        0,
        '',
        '',
        cartId,
      );
      // Extract from paginated response structure or legacy structure
      const responseData = cartHeaderResponse.data?.content
        ? cartHeaderResponse.data.content
        : cartHeaderResponse.data || [];
      if (responseData && responseData.length > 0) {
        const cartData = responseData[0];
        setCartHeaderData(cartData);
        if (cartData && cartData.cartStatusType) {
          setCartStatusType(cartData.cartStatusType);
        }
      }

      // Refresh approval workflow
      await refreshApprovalWorkflow();
    } catch (error) {
      console.error('Error refreshing cart data after reapproval:', error);
    }
  };

  useEffect(() => {
    const fetchApprovals = async () => {
      try {
        const response = await ApprovalPolicyManagementService.getApprovalFlow(
          companyId,
          approvalType,
          cartId,
        );
        if (response.data && response.data.length) {
          const approvalStages = response.data || [];
          setApprovals(approvalStages);
        } else {
          setApprovals([]);
        }
      } catch (error) {
        console.error('Error fetching approvals:', error);
      }
    };
    fetchApprovals();
  }, [companyId, approvalType, cartId]);

  // Calculate cart total (respect local changes)
  useEffect(() => {
    const total = calculateCurrentCartTotal();
    setCartTotal(total);
  }, [cartDetails, localCartChanges]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleItemFieldChange = async (cartDetailId, field, value) => {
    const detail = cartDetails.find((item) => item.cartDetailId === cartDetailId);
    if (!detail) {
      toast.dismiss();
      toast.error('Item not found in the cart');
      return;
    }
    setItemValidationErrors((prevErrors) => ({
      ...prevErrors,
      [cartDetailId]: (prevErrors[cartDetailId] || []).filter((err) => err !== field),
    }));

    const requestBody = {
      ...detail,
      [field]: value,
      cartDetailId,
      cartId,
    };

    try {
      await CartService.handleUpdateCartDetails(requestBody, companyId, cartDetailId, cartId);
      fetchCarts(true);
      // Trigger budget refresh when project changes for individual items
      if (field === 'projectId') {
        triggerBudgetRefresh();
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
      toast.dismiss();
      toast.error('Failed to update item. Please try again.');
    }
  };

  // Helper function to check if cart is editable
  const isCartEditable = () => {
    return ['PENDING_APPROVAL', 'CREATED', 'REJECTED', 'DRAFT'].includes(cartStatusType);
  };

  const isItemDescriptionEditable = (item) => {
    if (submitted) return false;

    const local = (item && localCartChanges[item.cartDetailId]) || {};
    const effectiveCatalog = local.catalogItemId !== undefined ? local.catalogItemId : item.catalogItemId;
    const effectiveIsManual = local.isManual !== undefined ? local.isManual : item.isManual;
    const effectivePartId = local.partId !== undefined ? local.partId : item.partId;

    const isManualEntry =
      !effectivePartId ||
      !effectiveCatalog ||
      !effectiveCatalog.CatalogItemId ||
      effectiveIsManual === true;

    if (isManualEntry) {
      return true;
    }

    if (cartStatusType === 'DRAFT') {
      return effectiveIsManual === true;
    }

    if (['APPROVED', 'POGENERATED'].includes(cartStatusType)) {
      return false;
    }

    return true;
  };

  const handleLocalFieldChange = (cartDetailId, field, value) => {
    if (!cartDetailId) {
      console.warn('handleLocalFieldChange called with invalid cartDetailId:', cartDetailId);
      return;
    }

    if (!isCartEditable()) return;

    const originalItem = cartDetails.find((item) => item.cartDetailId === cartDetailId);
    if (!originalItem) return;

    setLocalCartChanges((prev) => {
      const currentChanges = { ...prev };

      if (!currentChanges[cartDetailId]) {
        currentChanges[cartDetailId] = {};
      }

      const originalValue = originalItem[field];

      const isValueReverted =
        value === originalValue ||
        (value === '' && (originalValue == null || originalValue === '')) ||
        (value == null && originalValue === '') ||
        (typeof value === 'number' &&
          typeof originalValue === 'number' &&
          value === originalValue) ||
        (typeof value === 'string' &&
          typeof originalValue === 'string' &&
          value.trim() === originalValue.trim());

      if (isValueReverted) {
        delete currentChanges[cartDetailId][field];

        if (Object.keys(currentChanges[cartDetailId]).length === 0) {
          delete currentChanges[cartDetailId];
        }
      } else {
        currentChanges[cartDetailId][field] = value;
      }

      setHasUnsavedChanges(Object.keys(currentChanges).length > 0);

      return currentChanges;
    });

    // Trigger budget refresh when project changes
    if (field === 'projectId') {
      triggerBudgetRefresh();
    }
  };

  // Get display value (local change or original)
  const getDisplayValue = (item, field) => {
    if (
      localCartChanges[item.cartDetailId] &&
      localCartChanges[item.cartDetailId][field] !== undefined
    ) {
      return localCartChanges[item.cartDetailId][field];
    }
    return item[field];
  };

  const getAccountSettingDisplayValue = (field) => {
    // First check for local changes
    if (localCartChanges.cartHeader && localCartChanges.cartHeader[field] !== undefined) {
      return localCartChanges.cartHeader[field];
    }

    // Then check selected state (for the current session)
    const selectedValues = {
      projectId: selectedProjectId,
      departmentId: selectedDepartmentId,
      glAccountId: selectedGlAccountId,
      classId: selectedClassId,
      locationId: selectedLocationId,
      supplierId: selectedSupplierId,
    };

    if (selectedValues[field] !== null && selectedValues[field] !== undefined) {
      return selectedValues[field];
    }

    // Finally fallback to cart header data
    return (cartHeaderData && cartHeaderData[field]) || '';
  };

  // Check if item is locally deleted
  const isItemDeleted = (cartDetailId) => {
    return localCartChanges[cartDetailId]?.isDeleted === true;
  };

  // Calculate current cart total with local changes
  const calculateCurrentCartTotal = () => {
    let total = 0;
    cartDetails.forEach((item) => {
      if (!isItemDeleted(item.cartDetailId)) {
        const qty = getDisplayValue(item, 'qty') || item.qty || 0;
        const price = getDisplayValue(item, 'price') || item.price || 0;
        total += qty * price;
      }
    });
    return total;
  };

  // Check if reapproval is needed based on amount changes or dropdown changes
  const isReapprovalNeeded = () => {

    if (cartStatusType === 'DRAFT') {
      return false;
    }
    const currentTotal = calculateCurrentCartTotal();
    const amountChanged = Math.abs(currentTotal - originalCartAmount) > 0.01; // Account for floating point precision

    // Check if any items were deleted or if there are quantity/price changes
    const hasItemDeletions = Object.values(localCartChanges).some((changes) => changes.isDeleted);
    const hasAmountChanges = Object.values(localCartChanges).some(
      (changes) => changes.qty !== undefined || changes.price !== undefined,
    );

    // Check for line-item account field changes (Department, GL Account, Project, Class, Location)
    const hasLineItemAccountChanges = Object.entries(localCartChanges).some(
      ([cartDetailId, changes]) => {
        // Skip cart header changes
        if (cartDetailId === 'cartHeader') return false;

        // Check if any account-related fields have been changed in line items
        return (
          changes.departmentId !== undefined ||
          changes.glAccountId !== undefined ||
          changes.projectId !== undefined ||
          changes.classId !== undefined ||
          changes.locationId !== undefined
        );
      },
    );

    // Check if any dropdown values have changed
    const currentDropdownValues = {
      projectId: selectedProjectId,
      departmentId: selectedDepartmentId,
      glAccountId: selectedGlAccountId,
      classId: selectedClassId,
      locationId: selectedLocationId,
    };

    const hasDropdownChanges = Object.keys(originalDropdownValues).some((key) => {
      const original = originalDropdownValues[key];
      const current = currentDropdownValues[key];
      // Convert to strings for comparison to handle null vs empty string differences
      const originalStr = original ? String(original) : '';
      const currentStr = current ? String(current) : '';
      return originalStr !== currentStr;
    });
    return (
      amountChanged ||
      hasItemDeletions ||
      hasAmountChanges ||
      hasLineItemAccountChanges ||
      hasDropdownChanges
    );
  };

  const handleConfirmChanges = async () => {

    if (cartStatusType === 'DRAFT') {
      try {

        const cartHeaderChanges = localCartChanges.cartHeader || {};
        const deletions = [];
        const updatePromises = [];

        Object.entries(localCartChanges).forEach(([cartDetailId, changes]) => {

          if (cartDetailId === 'cartHeader') {
            return;
          }

          if (changes.isDeleted) {
            deletions.push(cartDetailId);
            return;
          }

          const updateFields = Object.fromEntries(
            Object.entries(changes).filter(([key]) => key !== 'isDeleted'),
          );

          if (Object.keys(updateFields).length === 0) {
            return;
          }

          const detail = cartDetails.find((item) =>
            item.cartDetailId.toString() === cartDetailId.toString()
          );

          if (!detail) {
            console.warn(`CartDetailId ${cartDetailId} not found in current cart data`);
            return;
          }

          const requestBody = {
            ...detail,
            ...updateFields,
            cartDetailId,
            cartId,
          };

          const updatePromise = CartService.handleUpdateCartDetails(
            requestBody,
            companyId,
            cartDetailId,
            cartId
          ).catch((error) => {
            console.error(`Update API call failed for cartDetailId ${cartDetailId}:`, error);
            toast.error(`Failed to update item: ${detail.partId || 'Unknown item'}`);
            throw error;
          });

          updatePromises.push(updatePromise);
        });


        if (Object.keys(cartHeaderChanges).length > 0) {
          if (cartHeaderData) {
            const updatedCartHeader = {
              ...cartHeaderData,
              ...cartHeaderChanges,
              cartId: cartHeaderData.cartId,
              companyId: cartHeaderData.companyId,
              cartName: cartHeaderData.cartName,
              cartNo: cartHeaderData.cartNo,
              onBehalfOf: cartHeaderData.onBehalfOf,
              neededBy: cartHeaderData.neededBy,
              supportingId: cartHeaderData.supportingId,
              notes: cartHeaderData.notes,
              cartStatusType: cartHeaderData.cartStatusType,
              shipToAddressId: cartHeaderData.shipToAddressId,
              shippingMethodId: cartHeaderData.shippingMethodId,
              prepaidFreight: cartHeaderData.prepaidFreight,
              paymentTermId: cartHeaderData.paymentTermId,
              prepaidFreightType: cartHeaderData.prepaidFreightType,
              copiedCartId: cartHeaderData.copiedCartId,
              deletedByUser: cartHeaderData.deletedByUser,
              isConfidentialOrder: cartHeaderData.isConfidentialOrder,
              costCenter: cartHeaderData.costCenter,
              approvalDecision: cartHeaderData.approvalDecision,
              orderOfApproval: cartHeaderData.orderOfApproval,
              previousApprovalDecision: cartHeaderData.previousApprovalDecision,
            };

            await CartService.handleUpdateCart(updatedCartHeader, companyId, cartId);
            setCartHeaderData(updatedCartHeader);
          }
        }

        const allPromises = [];

        if (updatePromises.length > 0) {
          allPromises.push(...updatePromises);
        }

        if (deletions.length > 0) {
          const deletePromises = deletions.map((cartDetailId) =>
            CartService.deleteCartDetail(cartId, cartDetailId)
          );
          allPromises.push(...deletePromises);
        }

        if (allPromises.length > 0) {
          await Promise.all(allPromises);
        }

        setLocalCartChanges({});
        setHasUnsavedChanges(false);
        toast.dismiss();
        toast.success('Draft changes saved successfully!');
        fetchCarts(true);
        setShowConfirmationModal(false);
        setShowDraftConfirmationModal(false);


        if (pendingNavigationForDraft) {
          pendingNavigationForDraft();
          setPendingNavigationForDraft(null);
        }
        if (pendingNavigation) {
          pendingNavigation();
          setPendingNavigation(null);
        }

      } catch (error) {
        console.error('Error saving draft changes:', error);
      }
      return;
    }

    try {
      if (!window.skipBudgetValidation) {

        const updatedCartItems = cartDetails
          .filter((item) => !item.isDeleted)
          .map((item) => {
            const changes = localCartChanges[item.cartDetailId] || {};
            const { isDeleted, ...itemChanges } = changes;

            if (isDeleted) return null;

            return {
              ...item,
              ...itemChanges,
            };
          })
          .filter(Boolean);

        if (updatedCartItems.length > 0 && updatedCartItems.some((item) => item.projectId)) {
          try {
            const validationCompanyId = getEntityId();
            const lineItems = updatedCartItems.map((item) => ({
              projectId: item.projectId || null,
              amount: parseFloat(item.totalPrice || 0),
              description: item.description || 'Cart item',
              glAccountId: item.glAccountId || null,
            }));


            const validLineItems = lineItems.filter((item) => item.projectId);

            if (validLineItems.length > 0) {
              const validationRequest = {
                companyId: validationCompanyId,
                purchaseType: cartHeaderData.purchaseType.toLowerCase(),
                lineItems: validLineItems,
                excludeCartId: cartId,
              };

              const uniqueProjects = [...new Set(validLineItems.map((item) => item.projectId))];

              let validationResponse;

              if (uniqueProjects.length === 1) {
                validationResponse = await BudgetService.previewBudgetValidation(
                  validationCompanyId,
                  validationRequest,
                );
              } else {
                validationResponse = await BudgetService.previewMultiProjectBudgetValidation(
                  validationCompanyId,
                  validationRequest,
                );
              }

              const validationData = validationResponse.data;
              if (!validationData.isValid) {

                const updatedMemoizedCartItems = updatedCartItems.map((item) => {
                  const quantity = item.quantity || item.qty || 1;
                  const unitPrice = item.unitPrice || item.price || 0;
                  const totalPrice =
                    item.totalPrice || item.lineTotal || item.extendedPrice || quantity * unitPrice;

                  return {
                    ...item,
                    projectId: item.projectId,
                    departmentId: item.departmentId,
                    glAccountId: item.glAccountId,
                    classId: item.classId,
                    locationId: item.locationId,
                    quantity,
                    unitPrice,
                    totalPrice,
                    description: item.description || item.productName || 'Cart item',
                  };
                });

                setBudgetValidationCartItems(updatedMemoizedCartItems);
                setShowBudgetValidation(true);
                window.cartModificationBudgetValidation = true;
                return;
              }
            }
          } catch (budgetError) {
            console.error('Budget validation error for cart modification:', budgetError);
            console.warn('Budget validation could not be performed, but cart changes will proceed');
          }
        }
      }
      const cartHeaderChanges = localCartChanges.cartHeader || {};
      const deletions = [];
      const updatePromises = [];

      Object.entries(localCartChanges).forEach(([cartDetailId, changes]) => {
        if (cartDetailId === 'cartHeader') {
          return;
        }

        if (changes.isDeleted) {
          deletions.push(cartDetailId);
        } else {

          const updateFields = Object.fromEntries(
            Object.entries(changes).filter(([key]) => key !== 'isDeleted'),
          );

          if (Object.keys(updateFields).length === 0) {
            return;
          }

          const detail = cartDetails.find((item) => item.cartDetailId === cartDetailId);

          if (!detail) {

            const fetchAndUpdatePromise = CartService.getCartDetailById(cartId, companyId).then(
              (response) => {
                const allCartDetails = response.data || [];
                const fullDetail = allCartDetails.find(
                  (item) => item.cartDetailId.toString() === cartDetailId.toString(),
                );

                if (!fullDetail) {
                  throw new Error(`CartDetailId ${cartDetailId} not found in full cart data`);
                }

                const { isDeleted, ...updateChanges } = changes;
                const requestBody = {
                  ...fullDetail,
                  ...updateChanges,
                  cartDetailId,
                  cartId,
                };

                return CartService.handleUpdateCartDetails(
                  requestBody,
                  companyId,
                  cartDetailId,
                  cartId,
                )
                  .then((result) => {
                    return result;
                  })
                  .catch((error) => {
                    console.error(
                      `Fetched-update API call failed for cartDetailId ${cartDetailId}:`,
                      error,
                    );
                    throw error;
                  });
              },
            );

            updatePromises.push(fetchAndUpdatePromise);
          } else {

            const { isDeleted, ...updateChanges } = changes;
            const requestBody = {
              ...detail,
              ...updateChanges,
              cartDetailId,
              cartId,
            };
            const updatePromise = CartService.handleUpdateCartDetails(
              requestBody,
              companyId,
              cartDetailId,
              cartId,
            )
              .then((result) => {
                return result;
              })
              .catch((error) => {
                console.error(`Update API call failed for cartDetailId ${cartDetailId}:`, error);
                throw error;
              });
            updatePromises.push(updatePromise);
          }
        }
      });

      const deletePromises = deletions.map((cartDetailId) =>
        CartService.deleteCartDetail(cartId, cartDetailId),
      );

      if (
        updatePromises.length === 0 &&
        deletePromises.length === 0 &&
        Object.keys(cartHeaderChanges).length === 0
      ) {
        return;
      }


      if (Object.keys(cartHeaderChanges).length > 0) {
        if (cartHeaderData) {
          const updatedCartHeader = {
            ...cartHeaderData,
            ...cartHeaderChanges,
            cartId: cartHeaderData.cartId,
            companyId: cartHeaderData.companyId,
            cartName: cartHeaderData.cartName,
            cartNo: cartHeaderData.cartNo,
            onBehalfOf: cartHeaderData.onBehalfOf,
            neededBy: cartHeaderData.neededBy,
            supportingId: cartHeaderData.supportingId,
            notes: cartHeaderData.notes,
            cartStatusType: cartHeaderData.cartStatusType,
            shipToAddressId: cartHeaderData.shipToAddressId,
            shippingMethodId: cartHeaderData.shippingMethodId,
            prepaidFreight: cartHeaderData.prepaidFreight,
            paymentTermId: cartHeaderData.paymentTermId,
            prepaidFreightType: cartHeaderData.prepaidFreightType,
            copiedCartId: cartHeaderData.copiedCartId,
            deletedByUser: cartHeaderData.deletedByUser,
            isConfidentialOrder: cartHeaderData.isConfidentialOrder,
            costCenter: cartHeaderData.costCenter,
            approvalDecision: cartHeaderData.approvalDecision,
            orderOfApproval: cartHeaderData.orderOfApproval,
            previousApprovalDecision: cartHeaderData.previousApprovalDecision,
          };

          await CartService.handleUpdateCart(updatedCartHeader, companyId, cartId);
          setCartHeaderData(updatedCartHeader);
        }
      }

      const allPromises = [...updatePromises, ...deletePromises];
      if (allPromises.length > 0) {
        await Promise.all(allPromises);
      }
      let needsReapproval = false;

      if (cartStatusType !== 'DRAFT') {
        needsReapproval = isReapprovalNeeded();
      }

      if (needsReapproval) {
        const requestBody = {};
        await ApproverService.handleApproverCartRestart(
          requestBody,
          companyId,
          cartId,
        );
        toast.dismiss();
        toast.success('Cart changes saved successfully. Reapproval process has been initiated.');
        await refreshCartDataAfterReapproval();
      } else {
        toast.dismiss();
        toast.success('Cart changes saved successfully. No reapproval required.');
      }
      setLocalCartChanges({});
      setHasUnsavedChanges(false);
      setShowConfirmationModal(false);

      if (pendingNavigation) {
        pendingNavigation();
        setPendingNavigation(null);
      }
      fetchCarts(true);

    } catch (error) {
      console.error('Error updating cart:', error);
    }
  };


  const handleCancelChanges = () => {
    if (localCartChanges.cartHeader) {
      setSelectedDepartmentId(cartHeaderData?.departmentId || null);
      setSelectedGlAccountId(cartHeaderData?.glAccountId || null);
      setSelectedClassId(cartHeaderData?.classId || null);
      setSelectedLocationId(cartHeaderData?.locationId || null);
      setSelectedSupplierId(cartHeaderData?.supplierId || null);
    }

    setLocalCartChanges({});
    setHasUnsavedChanges(false);
    setShowConfirmationModal(false);

    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    } else {
      window.history.back();
    }
  };


  const handleNavigationWithConfirmation = (navigationFn) => {
    if (!hasUnsavedChanges) {
      navigationFn();
      return;
    }

    if (cartStatusType === 'DRAFT') {
      setPendingNavigationForDraft(() => navigationFn);
      setShowDraftConfirmationModal(true);
    } else {
      setPendingNavigation(() => navigationFn);
      setShowConfirmationModal(true);
    }
  };


  const handleLocalDeleteProduct = (cartDetailId) => {
    setLocalCartChanges((prev) => {
      const newChanges = {
        ...prev,
        [cartDetailId]: {
          ...prev[cartDetailId],
          isDeleted: true,
        },
      };
      setHasUnsavedChanges(Object.keys(newChanges).length > 0);
      return newChanges;
    });
  };


  const handleUndoDelete = (cartDetailId) => {
    setLocalCartChanges((prev) => {
      const newChanges = { ...prev };
      if (newChanges[cartDetailId]) {
        delete newChanges[cartDetailId].isDeleted;
        if (Object.keys(newChanges[cartDetailId]).length === 0) {
          delete newChanges[cartDetailId];
        }
      }
      setHasUnsavedChanges(Object.keys(newChanges).length > 0);
      return newChanges;
    });
  };

  // Calculate pagination based on non-deleted items only
  const visibleCartDetails = cartDetails.filter((item) => !isItemDeleted(item.cartDetailId));
  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(visibleCartDetails.length / itemsPerPage); i++) {
    pageNumbers.push(i);
  }

  useEffect(() => {
    fetchCarts();
  }, [cartId, shipToAddressId]);

  useEffect(() => {
    fetchCarts();
    SupplierService.getConnectedSuppliers(companyId)
      .then((response) => {
        const supplierData = response.data || [];
        setSuppliers(supplierData);
      })
      .catch((error) => console.error('Error fetching suppliers:', error));

    AddressService.getAllAddress(companyId, 'SHIPPING', { pageSize: 1000, pageNumber: 0 })
      .then((response) => {
        const data = response.data;
        const addresses = data?.content ?? data ?? [];
        setAllShippingAddresses(addresses);
      })
      .catch((error) => console.error('Error fetching all addresses:', error));

    // Fetch all users for the company
    const pageDto = { pageSize: 100, pageNumber: 0, sortBy: 'firstName', order: 'asc' };
    UserService.fetchAllCompanyUsers(companyId, pageDto)
      .then((response) => {
        const usersData = response.data?.content || response.data || [];
        setAllUsers(usersData);
      })
      .catch((error) => console.error('Error fetching users:', error));
  }, [cartId, shipToAddressId]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(visibleCartDetails.length / itemsPerPage)
    );

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [visibleCartDetails.length, currentPage, itemsPerPage]);

  // Set up beforeunload event listener for page refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && cartStatusType === 'DRAFT') {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your draft cart. Are you sure you want to leave?';
        return 'You have unsaved changes in your draft cart. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, cartStatusType]);

  useEffect(() => {
    const handlePopState = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();

        const navigationFn = () => {
          setLocalCartChanges({});
          setHasUnsavedChanges(false);
          window.history.back();
        };

        // 🔥 Open correct modal based on cart status
        if (cartStatusType === 'DRAFT') {
          setPendingNavigationForDraft(() => navigationFn);
          setShowDraftConfirmationModal(true);
        } else {
          setPendingNavigation(() => navigationFn);
          setShowConfirmationModal(true);
        }

        // Push current state back to history
        window.history.pushState(null, '', window.location.href);
      }
    };

    if (hasUnsavedChanges) {
      window.history.pushState({ hasUnsavedChanges: true }, '', window.location.href);
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges, cartStatusType]); // Added cartStatusType

  useEffect(() => {
    const handleLinkClick = (e) => {
      // Only intercept if we have unsaved changes
      if (!hasUnsavedChanges) return;

      // Skip if this is a modal button or inside a modal
      if (e.target.closest('.modal') || e.target.closest('[data-modal-action]')) {
        return;
      }

      // Check for navigation elements - be more inclusive
      const target = e.target.closest(
        'a, button, [role="button"], .nav-link, .navbar-nav a, .sidebar-item, [data-navigation]',
      );
      if (!target) return;

      // Get href from various sources
      const href =
        target.getAttribute('href') ||
        target.getAttribute('data-href') ||
        target.getAttribute('data-to') ||
        target.dataset.navigate;

      // Skip cart operation buttons (delete, edit, quantity controls, etc.)
      if (
        target.closest('.cart-item-controls') ||
        target.classList.contains('btn-outline-danger') ||
        target.closest('[data-cart-action]') ||
        target.querySelector('.bi-trash') ||
        target.classList.contains('quantity-control') ||
        target.closest('.quantity-controls')
      ) {
        return;
      }

      // Check if it's a navigation element (broader detection)
      const isNavigation =
        (href && (href.startsWith('/') || href.startsWith('#'))) ||
        target.classList.contains('nav-link') ||
        target.classList.contains('navbar-nav') ||
        target.classList.contains('sidebar-item') ||
        target.closest('.navbar') ||
        target.closest('.sidebar') ||
        target.hasAttribute('data-navigation') ||
        // Fallback: any link or button with href that looks like navigation
        (target.tagName === 'A' && href) ||
        (target.tagName === 'BUTTON' && target.getAttribute('data-navigate'));

      if (isNavigation) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const navigationFn = () => {
          // Remove the event listener temporarily to allow navigation
          document.removeEventListener('click', handleLinkClick, true);
          document.body.removeEventListener('click', handleLinkClick, true);

          if (href && href.startsWith('/')) {
            navigate(href);
          } else {
            // For elements without href, trigger click without our listener
            setTimeout(() => {
              target.click();
            }, 50);
          }
        };

        // 🔥 CRITICAL FIX: Check cart status and open correct modal
        if (cartStatusType === 'DRAFT') {
          // Open DRAFT confirmation modal
          setPendingNavigationForDraft(() => navigationFn);
          setShowDraftConfirmationModal(true);
        } else {
          // Open non-DRAFT confirmation modal
          setPendingNavigation(() => navigationFn);
          setShowConfirmationModal(true);
        }
      }
    };

    if (hasUnsavedChanges) {
      // Use capture phase to catch events before they bubble
      document.addEventListener('click', handleLinkClick, true);

      // Also add listener to the body for broader coverage
      document.body.addEventListener('click', handleLinkClick, true);
    }

    return () => {
      document.removeEventListener('click', handleLinkClick, true);
      document.body.removeEventListener('click', handleLinkClick, true);
    };
  }, [hasUnsavedChanges, navigate, cartStatusType]); // Added cartStatusType to dependencies

  const handleAddProduct = () => {
    const submit = cartStatusType === 'SUBMITTED';
    const navigationFn = () =>
      navigate(
        `/products/${companyId}/${cartId}/${shipToAddressId}?submitted=${submit}&cartStatusType=${cartStatusType}`,
      );
    handleNavigationWithConfirmation(navigationFn);
  };

  const handleOnBehalfOfChange = async (value) => {
    try {
      const updatedCartHeader = {
        ...cartHeaderData,
        onBehalfOf: value,
        cartId: cartHeaderData.cartId,
        companyId: cartHeaderData.companyId,
      };

      await CartService.handleUpdateCart(updatedCartHeader, companyId, cartId);
      setOnBehalfOfUserId(value);
      setCartHeaderData(updatedCartHeader);
    } catch (error) {
      console.error('Error updating on behalf of:', error);
      toast.error('Failed to update user');
    }
  };

  // Direct update for purchase type
  const handlePurchaseTypeChange = async (value) => {
    try {
      const updatedCartHeader = {
        ...cartHeaderData,
        purchaseType: value,
        cartId: cartHeaderData.cartId,
        companyId: cartHeaderData.companyId,
      };

      await CartService.handleUpdateCart(updatedCartHeader, companyId, cartId);

      setPurchaseType(value);
      setCartHeaderData(updatedCartHeader);
      setValidationErrors((prev) => ({
        ...prev,
        purchaseType: false,
      }));
    } catch (error) {
      console.error('Error updating purchase type:', error);
      toast.error('Failed to update purchase type');
    }
  };

  const handleNeededByDateChange = async (value) => {
    try {
      const updatedCartHeader = {
        ...cartHeaderData,
        neededBy: formatNeededBy(value),
        cartId: cartHeaderData.cartId,
        companyId: cartHeaderData.companyId,
      };

      await CartService.handleUpdateCart(updatedCartHeader, companyId, cartId);
      setNeededByDate(value);
      setCartHeaderData(updatedCartHeader);
    } catch (error) {
      console.error('Error updating needed by date:', error);
      toast.error('Failed to update date');
    }
  };

  const handleAddressChangeImmediate = async (value) => {
    if (!value) {
      setSelectedAddressId('');
      setCartHeaderData((prev) => ({
        ...prev,
        shipToAddressId: '',
      }));
      setValidationErrors((prev) => ({
        ...prev,
        shipToAddressId: true,
      }));
      return;
    }

    try {
      const updatedCartHeader = {
        ...cartHeaderData,
        shipToAddressId: value,
        cartId: cartHeaderData.cartId,
        companyId: cartHeaderData.companyId,
      };

      await CartService.handleUpdateCart(updatedCartHeader, companyId, cartId);

      setSelectedAddressId(value);
      setCartHeaderData(updatedCartHeader);
      setValidationErrors((prev) => ({
        ...prev,
        shipToAddressId: false,
      }));
    } catch (error) {
      console.error('Error updating address:', error);
      toast.error('Failed to update address');
    }
  };

  const handleDuplicateCart = async () => {
    try {
      const response = await CartService.duplicateCart(companyId, cartId);
      if (response.data && response.data.cartId) {
        const result = await Swal.fire({
          title: 'Cart Duplicated Successfully!',
          text: 'Would you like to open the duplicated cart?',
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: 'Yes, open it',
          cancelButtonText: 'Stay here',
          confirmButtonColor: '#009efb',
          cancelButtonColor: '#6c757d',
        });

        if (result.isConfirmed) {
          const duplicatedCartShipToAddressId =
            (cartHeaderData && cartHeaderData.shipToAddressId) ||
            shipToAddressId ||
            selectedAddressId;
          if (duplicatedCartShipToAddressId) {
            navigate(`/cartDetails/${response.data.cartId}/${duplicatedCartShipToAddressId}`);
          } else {
            navigate(`/cartDetails/${response.data.cartId}`);
          }
        } else {
          toast.dismiss();
          toast.success('Cart duplicated successfully!');
        }
      } else {
        toast.error('Failed to duplicate cart. No cart ID returned.');
      }
    } catch (error) {
      console.error('Error duplicating cart:', error);
      toast.error(error.response?.data?.errorMessage || 'Failed to duplicate cart');
    }
  };

  const getSupplierName = (supplierId) => {
    if (!supplierId) return 'Unknown Supplier';
    const idToFind = typeof supplierId === 'string' ? parseInt(supplierId, 10) : supplierId;

    const supplier = suppliers.find((sup) => {
      if (!sup) return false;
      return sup.supplierId === idToFind;
    });

    if (!supplier) {
      return 'Unknown Supplier';
    }

    return supplier.name || supplier.displayName || 'Unknown Supplier';
  };

  const handleApproverCartSubmit = () => {
    if (!validateDropdowns()) {
      toast.dismiss();
      toast.error('Please fill all required fields before submitting');
      return;
    }
    if (cartStatusType === 'REJECTED') {
      const requestBody = {};
      ApproverService.handleApproverCartRestart(requestBody, companyId, cartId)
        .then((response) => {
          toast.dismiss();
          toast.success('Cart has been restarted successfully for approver!');
          setTimeout(() => {
            navigate('/dashboard');
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
      ApproverService.handleApproverCartSubmit(cartId, companyId, cartId)
        .then((response) => {
          toast.dismiss();
          toast.success('Cart has been submitted successfully for approver!');
          setTimeout(() => {
            navigate('/dashboard');
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

  useEffect(() => {
    const applyValuesToAllProducts = async () => {
      if (applyToAll && cartDetails.length > 0) {
        // For DRAFT carts: Apply changes immediately via API
        if (cartStatusType === 'DRAFT') {
          try {
            const updatePromises = cartDetails.map((item) => {
              const requestBody = {
                ...item,
                projectId: selectedProjectId || item.projectId,
                departmentId: selectedDepartmentId || item.departmentId,
                glAccountId: selectedGlAccountId || item.glAccountId,
                classId: selectedClassId || item.classId,
                locationId: selectedLocationId || item.locationId,
                cartDetailId: item.cartDetailId,
                cartId,
                cartStatusType,
              };

              return CartService.handleUpdateCartDetails(
                requestBody,
                companyId,
                item.cartDetailId,
                cartId,
              );
            });
            await Promise.all(updatePromises);
            fetchCarts();
            setItemValidationErrors({});
            toast.dismiss();
            toast.success('Values applied to all products successfully!');
          } catch (error) {
            toast.dismiss();
            toast.error('Failed to update cart items. Please try again.');
          }
        } else {
          setLocalCartChanges((prev) => {
            const newChanges = { ...prev };
            cartDetails.forEach((item) => {
              const { cartDetailId } = item;
              const changes = {};

              // Only add changes for values that are different from current item values
              if (selectedProjectId && selectedProjectId !== item.projectId) {
                changes.projectId = selectedProjectId;
              }
              if (selectedDepartmentId && selectedDepartmentId !== item.departmentId) {
                changes.departmentId = selectedDepartmentId;
              }
              if (selectedGlAccountId && selectedGlAccountId !== item.glAccountId) {
                changes.glAccountId = selectedGlAccountId;
              }
              if (selectedClassId && selectedClassId !== item.classId) {
                changes.classId = selectedClassId;
              }
              if (selectedLocationId && selectedLocationId !== item.locationId) {
                changes.locationId = selectedLocationId;
              }

              // Only add to local changes if there are actual changes
              if (Object.keys(changes).length > 0) {
                newChanges[cartDetailId] = {
                  ...newChanges[cartDetailId],
                  ...changes,
                };
              }
            });

            setHasUnsavedChanges(Object.keys(newChanges).length > 0);
            return newChanges;
          });

          // This will trigger hasUnsavedChanges to show Save Changes button
          toast.success(
            'Account settings will be applied to all lines. Click "Save Changes" to confirm.',
          );
        }
      }
    };
    applyValuesToAllProducts();
  }, [applyToAll]);

  const handleQuantityChange = (cartDetailId, newQty) => {
    if (newQty < 1) {
      return;
    }
    const detail = cartDetails.find((item) => item.cartDetailId === cartDetailId);
    if (!detail) {
      toast.dismiss();
      toast.error('Item not found in the cart');
      return;
    }
    const requestBody = {
      cartDetailId,
      cartId,
      supplierId: detail.supplierId,
      projectId: detail.projectId,
      catalogId: detail.catalogId,
      catalogItemId: detail.catalogItemId
        ? {
          CatalogItemId: detail.catalogItemId && detail.catalogItemId.CatalogItemId,
          CatalogId: detail.catalogItemId.CatalogId,
          PartId: detail.partId || '',
          ProductImageURL: (detail.catalogItemId && detail.catalogItemId.ProductImageURL) || '',
        }
        : null,
      partId: detail.partId || '',
      partDescription: detail.partDescription || '',
      departmentId: detail.departmentId,
      orderType: detail.orderType || 1,
      glAccountId: detail.glAccountId,
      isCritical: detail.isCritical || false,
      isSafetyAppReq: detail.isSafetyAppReq || false,
      slimit: detail.slimit || '',
      qty: newQty,
      price: detail.price || 0,
      unitOfMeasure: detail.unitOfMeasure || 'piece',
      currencyCode: detail.currencyCode || '$',
      currencyRate: detail.currencyRate || 1.0,
      discount: detail.discount || '0%',
      discountNote: detail.discountNote || '',
      supplierNote: detail.supplierNote || '',
      internalNote: detail.internalNote || '',
      supplierQuoteFile: detail.supplierQuoteFile || '',
      internalBuyerQuoteFile: detail.internalBuyerQuoteFile || 0,
      priceUpdate: detail.priceUpdate || false,
      supplierChangedBy: detail.supplierChangedBy || 0,
      classId: detail.classId,
      locationId: detail.locationId,
      productId: detail.productId,
      manufacturerName: detail.manufacturerName || '',
      manufacturerPart: detail.manufacturerPart || '',
    };

    CartService.handleUpdateCartDetails(requestBody, companyId, cartDetailId, cartId)
      .then(() => {
        fetchCarts(true);
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
  };

  const handleDeleteProduct = (cartDetailId) => {
    Swal.fire({
      title: 'Remove Product',
      text: 'This product will be removed from your cart.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Remove',
      cancelButtonText: 'Cancel',
      buttonsStyling: false,
      customClass: {
        confirmButton: 'btn btn-danger me-2',
        cancelButton: 'btn btn-secondary',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        CartService.deleteCartDetail(cartId, cartDetailId)
          .then(() => {
            Swal.fire({
              title: 'Removed',
              text: 'Product has been removed from your cart.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false,
              buttonsStyling: false,
            });
            fetchCarts();
          })
          .catch((error) => {
            console.error('Error deleting product:', error);
            Swal.fire({
              title: 'Error',
              text: 'Failed to remove product. Please try again.',
              icon: 'error',
              confirmButtonText: 'OK',
              buttonsStyling: false,
              customClass: {
                confirmButton: 'btn btn-primary',
              },
            });
          });
      }
    });
  };

  const handleBudgetSelect = (budgetIds, budgetDetails, validationStatus = null) => {
    setSelectedBudgets(budgetIds);
    setBudgetValidationStatus(validationStatus);
  };
  const handleBudgetValidationComplete = async (isValid) => {
    setShowBudgetValidation(false);
    setBudgetValidationCartItems(null);

    // ================= CART MODIFICATION FLOW =================
    if (window.cartModificationBudgetValidation) {
      window.cartModificationBudgetValidation = false;

      if (!isValid) {
        Swal.fire({
          title: 'Budget Validation Failed',
          text: 'Budget validation failed, but you can still proceed with saving the cart changes. Budget issues will need to be resolved during the approval process.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Proceed with Save',
          cancelButtonText: 'Cancel',
        }).then(async (result) => {
          if (result.isConfirmed) {
            window.skipBudgetValidation = true;
            await handleConfirmChanges();
            window.skipBudgetValidation = false;
          }
        });
        return;
      }

      window.skipBudgetValidation = true;
      await handleConfirmChanges();
      window.skipBudgetValidation = false;
      return;
    }

    // ================= NORMAL SUBMIT FLOW =================
    if (!isValid) {
      // Check if the validation failure is due to "budget validation skipped" warning
      const hasSkipWarning =
        budgetValidationStatus?.statusMessage?.includes('skipped') ||
        budgetValidationStatus?.warnings?.some((w) => w.includes('skipped'));

      if (hasSkipWarning) {
        const previewData = await fetchApprovalPreview();
        if (!previewData || previewData.length === 0) {
          try {
            await ApproverService.handleApproverCartSubmit({}, companyId, cartId);

            toast.success('Cart submitted successfully');
            navigate('/dashboard');
          } catch (error) {
            console.error('Error submitting cart:', error);
            toast.error('Failed to submit cart. Please try again.');
          }
        } else {
          toggleModal();
        }
      } else {
        // Regular budget validation failure
        toast.error('Budget validation failed. Please review and try again.');
      }
      return;
    }

    const previewData = await fetchApprovalPreview();

    if (!previewData || previewData.length === 0) {
      try {
        await ApproverService.handleApproverCartSubmit({}, companyId, cartId);

        toast.success('Cart submitted successfully');
        navigate('/dashboard');
        return;
      } catch (error) {
        console.error('Error submitting cart:', error);
        toast.error('Failed to submit cart. Please try again.');
        return;
      }
    }
    toggleModal();
  };

  // Memoize cartItems to prevent infinite loops in BudgetValidationPreview
  const memoizedCartItems = useMemo(() => {
    return cartDetails
      .filter((item) => !item.isDeleted)
      .map((item) => {
        const quantity = item.qty || 1;
        const unitPrice = item.unitPrice || item.price || 0;
        const totalPrice =
          item.totalPrice || item.lineTotal || item.extendedPrice || quantity * unitPrice;

        return {
          id: item.cartDetailId,
          quantity,
          unitPrice,
          totalPrice,
          description: item.catalogItem?.description || item.description || item.partDescription,
          partId: item.catalogItem?.partId || item.partId,
          projectId: item.projectId || selectedProjectId,
          glAccountId: item.glAccountId || selectedGlAccountId,
        };
      });
  }, [cartDetails, selectedProjectId]);

  // Memoize cartItems for BudgetSelector to handle local changes properly
  // Memoize cartItems for BudgetSelector - WITHOUT description dependency
  const memoizedBudgetSelectorCartItems = useMemo(() => {
    return cartDetails
      .filter((item) => !item.isDeleted)
      .map((item) => {
        const localChanges = localCartChanges[item.cartDetailId] || {};

        // Create a copy of localChanges WITHOUT description
        const { partDescription, description, ...changesWithoutDescription } = localChanges;

        const effectiveProjectId =
          changesWithoutDescription.projectId !== undefined
            ? changesWithoutDescription.projectId
            : item.projectId || selectedProjectId;
        const effectiveQty =
          changesWithoutDescription.qty !== undefined
            ? changesWithoutDescription.qty
            : item.qty || item.quantity || 1;
        const effectivePrice =
          changesWithoutDescription.price !== undefined
            ? changesWithoutDescription.price
            : item.unitPrice || item.price || 0;

        const effectiveGlAccountId =
          changesWithoutDescription.glAccountId !== undefined
            ? changesWithoutDescription.glAccountId
            : item.glAccountId || selectedGlAccountId;

        return {
          projectId: effectiveProjectId,
          quantity: effectiveQty,
          unitPrice: effectivePrice,
          description: item.catalogItem?.description || item.description || item.partDescription,
          glAccountId: effectiveGlAccountId,
        };
      });
  }, [
    cartDetails,
    selectedProjectId,
    (() => {

      const relevantChanges = {};
      Object.entries(localCartChanges).forEach(([cartDetailId, changes]) => {
        const filteredChanges = {};
        // Only include fields that affect budget validation
        ['projectId', 'qty', 'price', 'glAccountId', 'isDeleted'].forEach(field => {
          if (changes[field] !== undefined) {
            filteredChanges[field] = changes[field];
          }
        });
        if (Object.keys(filteredChanges).length > 0) {
          relevantChanges[cartDetailId] = filteredChanges;
        }
      });
      return JSON.stringify(relevantChanges);
    })(),
    budgetRefreshKey
  ]);

  // Create budget summary for collapsed view
  const getBudgetSummary = () => {
    if (!memoizedBudgetSelectorCartItems.length) return null;

    const projectGroups = memoizedBudgetSelectorCartItems.reduce((acc, item) => {
      if (!item.projectId) return acc;
      if (!acc[item.projectId]) {
        acc[item.projectId] = { projectId: item.projectId, totalAmount: 0, items: [] };
      }
      const amount = (item.quantity || 1) * (item.unitPrice || 0);
      acc[item.projectId].totalAmount += amount;
      acc[item.projectId].items.push(item);
      return acc;
    }, {});

    const projectCount = Object.keys(projectGroups).length;
    const totalAmount = Object.values(projectGroups).reduce((sum, p) => sum + p.totalAmount, 0);

    return { projectCount, totalAmount, projectGroups };
  };

  // Get detailed budget status for the section header
  const getBudgetValidationSummary = () => {
    if (budgetValidationStatus) {
      // Use the overallStatus from BudgetSelector for accurate status
      const status =
        budgetValidationStatus.overallStatus ||
        (budgetValidationStatus.isValid
          ? 'VALID'
          : budgetValidationStatus.hasOverBudgetProjects
            ? 'OVER_BUDGET'
            : budgetValidationStatus.hasUnmatchedProjects
              ? 'MISSING_BUDGET'
              : 'WARNING');

      return {
        status,
        message:
          budgetValidationStatus.statusMessage ||
          (budgetValidationStatus.isValid
            ? 'All budgets validated'
            : budgetValidationStatus.hasOverBudgetProjects
              ? 'Some projects over budget'
              : budgetValidationStatus.hasUnmatchedProjects
                ? 'Missing budgets for some projects'
                : 'Validation warnings'),
        color:
          status === 'VALID'
            ? 'success'
            : status === 'WARNING'
              ? 'warning'
              : status === 'UNHEALTHY'
                ? 'warning'
                : status === 'NO_BUDGET'
                  ? 'danger'
                  : status === 'INVALID'
                    ? 'danger'
                    : status === 'EXCEEDED'
                      ? 'danger'
                      : status === 'INSUFFICIENT'
                        ? 'danger'
                        : status === 'OVER_BUDGET' || status === 'MISSING_BUDGET'
                          ? 'danger'
                          : 'secondary',
      };
    }

    if (selectedBudgets.length === 0) {
      return {
        status: 'PENDING',
        message: 'Budget validation pending',
        color: 'secondary',
      };
    }

    return {
      status: 'READY',
      message: 'Ready for validation',
      color: 'info',
    };
  };

  const handleSubmitClick = () => {
    if (!validatePartAndPrice()) {
      return;
    }

    const dropdownValid = validateDropdowns();
    const itemsValid = validateCartItems();

    if (!dropdownValid || !itemsValid) {
      toast.dismiss();
      toast.error('Please fill all required fields before submitting');
      return;
    }

    // 🔥 NEW LOGIC: Check if project is enabled before requiring budget validation
    const isProjectEnabled = settings.projectEnabled && settings.projectEnabled !== 'disabled';

    // Only require budget validation if project is enabled
    if (isProjectEnabled) {
      // Check if budgets are selected and validated
      if (selectedBudgets.length === 0) {
        toast.dismiss();
        toast.error(
          'Please expand Budget Selection & Validation section to validate budgets before submitting',
        );
        // Auto-expand the budget section to help user
        setBudgetSectionExpanded(true);
        return;
      }

      // Check if validation has warnings about "skipped" validation
      const hasSkipWarning =
        budgetValidationStatus?.statusMessage?.includes('skipped') ||
        budgetValidationStatus?.warnings?.some((w) => w.includes('skipped'));

      if (hasSkipWarning) {
        setShowBudgetValidation(true);
        return;
      }

      // Show warning if validation has issues but allow proceeding
      if (budgetValidationStatus && !budgetValidationStatus.isValid) {
        toast.dismiss();
        const statusMsg = budgetValidationStatus.hasOverBudgetProjects
          ? 'Some projects exceed their budget limits'
          : budgetValidationStatus.hasUnmatchedProjects
            ? 'Some projects are missing budget allocations'
            : 'Budget validation has warnings';
        toast.warning(`${statusMsg}. You can still proceed, but approval may be required.`);
      }

      // Show budget validation preview
      setShowBudgetValidation(true);
    } else {
      // Directly fetch approval preview
      fetchApprovalPreview()
        .then((previewData) => {
          if (!previewData || previewData.length === 0) {
            ApproverService.handleApproverCartSubmit({}, companyId, cartId)
              .then(() => {
                toast.success('Cart submitted successfully');
                navigate('/dashboard');
              })
              .catch((error) => {
                console.error('Error submitting cart:', error);
                toast.error('Failed to submit cart. Please try again.');
              });
          } else {
            toggleModal();
          }
        })
        .catch((error) => {
          console.error('Error fetching approval preview:', error);
          toast.error('Error checking approval workflow');
        });
    }
  };

  const handleResubmitClick = () => {
    // Show warning if validation has issues but allow proceeding
    if (budgetValidationStatus && !budgetValidationStatus.isValid) {
      toast.dismiss();
      const statusMsg = budgetValidationStatus.hasOverBudgetProjects
        ? 'Some projects exceed their budget limits'
        : budgetValidationStatus.hasUnmatchedProjects
          ? 'Some projects are missing budget allocations'
          : 'Budget validation has warnings';
      toast.warning(`${statusMsg}. You can still proceed, but approval may be required.`);
    }

    // For rejected carts, directly show the approval preview and resubmit
    setShowBudgetValidation(true);
  };

  // Group visible (non-deleted) items by supplier first, then apply pagination to individual items within groups
  // Group all visible items by supplier first (not just current page items)
  const allGroupedItems = visibleCartDetails.reduce((groups, item) => {
    const { supplierId } = item;

    // Normalize supplierId to string to avoid type mismatches
    const normalizedSupplierId = supplierId ? String(supplierId) : 'unknown';

    if (!groups[normalizedSupplierId]) {
      groups[normalizedSupplierId] = [];
    }
    groups[normalizedSupplierId].push(item);
    return groups;
  }, {});

  // Apply pagination across visible items only, but maintain supplier grouping
  const allItemsFlattened = Object.values(allGroupedItems).flat();
  const paginatedItems = allItemsFlattened.slice(indexOfFirstItem, indexOfLastItem);

  // Re-group the paginated items by supplier
  const groupedItems = {};
  paginatedItems.forEach((item) => {
    const normalizedSupplierId = item.supplierId ? String(item.supplierId) : 'unknown';
    if (!groupedItems[normalizedSupplierId]) {
      groupedItems[normalizedSupplierId] = [];
    }
    groupedItems[normalizedSupplierId].push(item);
  });

  const handleCatalogSearchForSupplier = async (supplierId) => {
    try {
      setIsLoading(true);
      const response = await CatalogItemService.getCatalogItemsBySupplierSearch(500, 0, '');
      const filteredResults =
        (response &&
          response.filter((item) => item.Supplier && item.Supplier.supplierId === supplierId)) ||
        [];
      setCatalogResults(filteredResults);
    } catch (error) {
      console.error('Catalog search for supplier failed:', error);
      setCatalogResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDropdownChange = async (field, value) => {
    // Skip if another cart update is in progress to prevent deadlocks
    if (cartUpdateInProgressRef.current) {
      console.log('Skipping dropdown change - cart update in progress');
      return;
    }
    try {
      cartUpdateInProgressRef.current = true;
      // Update local state first for immediate UI feedback
      switch (field) {
        case 'projectId':
          setSelectedProjectId(value);
          setValidationErrors({ ...validationErrors, projectId: false });
          triggerBudgetRefresh();
          break;
        case 'departmentId':
          setSelectedDepartmentId(value);
          setValidationErrors({ ...validationErrors, departmentId: false });
          break;
        case 'glAccountId':
          setSelectedGlAccountId(value);
          setValidationErrors({ ...validationErrors, glAccountId: false });
          break;
        case 'classId':
          setSelectedClassId(value);
          setValidationErrors({ ...validationErrors, classId: false });
          break;
        case 'locationId':
          setSelectedLocationId(value);
          setValidationErrors({ ...validationErrors, locationId: false });
          break;
        case 'supplierId':
          setSelectedSupplierId(value);
          setValidationErrors({ ...validationErrors, supplierId: false });
          setSupplierSearchTerm('');
          setSupplierResults([]);
          setCatalogResults([]);
          if (value) {
            handleCatalogSearchForSupplier(value);
          }
          break;
        default:
          break;
      }

      // Build the updated cart header
      const updatedCartHeader = {
        ...cartHeaderData,
        [field]: value,
        cartId: cartHeaderData.cartId,
        companyId: cartHeaderData.companyId,
        cartName: cartHeaderData.cartName,
        cartNo: cartHeaderData.cartNo,
        onBehalfOf: cartHeaderData.onBehalfOf,
        neededBy: cartHeaderData.neededBy,
        supportingId: cartHeaderData.supportingId,
        notes: cartHeaderData.notes,
        cartStatusType: cartHeaderData.cartStatusType,
        shipToAddressId: cartHeaderData.shipToAddressId,
        shippingMethodId: cartHeaderData.shippingMethodId,
        prepaidFreight: cartHeaderData.prepaidFreight,
        paymentTermId: cartHeaderData.paymentTermId,
        prepaidFreightType: cartHeaderData.prepaidFreightType,
        copiedCartId: cartHeaderData.copiedCartId,
        deletedByUser: cartHeaderData.deletedByUser,
        isConfidentialOrder: cartHeaderData.isConfidentialOrder,
        costCenter: cartHeaderData.costCenter,
        approvalDecision: cartHeaderData.approvalDecision,
        orderOfApproval: cartHeaderData.orderOfApproval,
        previousApprovalDecision: cartHeaderData.previousApprovalDecision,
      };

      // Save to API
      await CartService.handleUpdateCart(updatedCartHeader, companyId, cartId);

      // Update cart header data with new values
      setCartHeaderData(updatedCartHeader);
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast.error(error?.response?.data?.errorMessage || `Failed to update ${field}`);

      // Revert local state on error
      switch (field) {
        case 'projectId':
          setSelectedProjectId(cartHeaderData?.projectId || null);
          break;
        case 'departmentId':
          setSelectedDepartmentId(cartHeaderData?.departmentId || null);
          break;
        case 'glAccountId':
          setSelectedGlAccountId(cartHeaderData?.glAccountId || null);
          break;
        case 'classId':
          setSelectedClassId(cartHeaderData?.classId || null);
          break;
        case 'locationId':
          setSelectedLocationId(cartHeaderData?.locationId || null);
          break;
        case 'supplierId':
          setSelectedSupplierId(cartHeaderData?.supplierId || null);
          break;
        default:
          break;
      }
    } finally {
      cartUpdateInProgressRef.current = false;
    }
  };

  // Separate logic for different types of modifications
  const disableCartItemModifications =
    submitted || ['PENDING_APPROVAL', 'APPROVED', 'POGENERATED'].includes(cartStatusType);

  // Account Settings dropdowns can only be edited for specific statuses
  const disableAccountSettingsDropdowns = ![
    'DRAFT',
    'CREATED',
    'PENDING_APPROVAL',
    'REJECTED',
  ].includes(cartStatusType);

  const allRequiredDropdownsSelected = () => {
    if (settings.projectEnabled && !selectedProjectId) return false;
    if (settings.departmentEnabled && !selectedDepartmentId) return false;
    if (settings.gLAccountEnabled && !selectedGlAccountId) return false;
    if (settings.classEnabled && !selectedClassId) return false;
    if (settings.locationEnabled && !selectedLocationId) return false;
    return true;
  };

  const disableResolveBtn = !isQueryRaised || cartStatusType === 'DRAFT';

  const resetFileInput = () => {
    setAttachedFileName(null);
    setFileInputKey(Date.now());
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAttachedFileName(file.name);
    const formData = new FormData();
    formData.append('fileContent', file, file.name);

    try {
      const response = await FileUploadService.uploadFile(getEntityId(), file);
      if (response && response.data && response.data.fileId) {
        const FileId = response.data.fileId;
        setUploadedFileId(FileId);
        toast.success('File uploaded successfully!');
      } else {
        toast.error('File upload failed.');
        resetFileInput();
      }
    } catch (error) {
      toast.error('Failed to upload file.');
      resetFileInput();
    }
  };

  const handleFileDownload = async (fileId) => {
    try {
      const downloadResponse = await FileUploadService.downloadFile(fileId);
      const contentType = downloadResponse.headers['content-type'];
      const extension = getExtensionFromContentType(contentType);
      const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Attachment_${fileId}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };


  const calculateDraftChangesSummary = () => {
    let modifiedItems = 0;
    let deletedItems = 0;
    let priceChanges = 0;

    Object.entries(localCartChanges).forEach(([cartDetailId, changes]) => {
      if (cartDetailId === 'cartHeader') {
        modifiedItems++;
        return;
      }

      if (changes.isDeleted) {
        deletedItems++;
      } else {
        modifiedItems++;
        if (changes.price !== undefined) {
          priceChanges++;
        }
      }
    });

    return {
      modifiedItems,
      deletedItems,
      priceChanges,
      totalChanges: Object.keys(localCartChanges).length
    };
  };



  const handleDiscardDraftChanges = () => {
    setLocalCartChanges({});
    setHasUnsavedChanges(false);
    setShowDraftConfirmationModal(false);


    if (pendingNavigationForDraft) {
      pendingNavigationForDraft();
      setPendingNavigationForDraft(null);
    } else {
      window.history.back();
    }
  };


  const handleSaveDraftChanges = async () => {
    try {
      await handleConfirmChanges();
      setShowDraftConfirmationModal(false);
      if (pendingNavigationForDraft) {
        pendingNavigationForDraft();
        setPendingNavigationForDraft(null);
      }
    } catch (error) {
      console.error('Error saving draft changes:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const supplierSearchInput = event.target.closest('input[placeholder="Search suppliers..."]');
      const catalogSearchInput = event.target.closest(
        'input[placeholder="Search catalog items..."]',
      );
      const supplierResultsCard = document.querySelector('.search-results-card');
      const isClickInsideResults =
        supplierResultsCard && supplierResultsCard.contains(event.target);
      if (!supplierSearchInput && !catalogSearchInput && !isClickInsideResults) {
        setSupplierSearchTerm('');
        setCatalogSearchTerm('');
        setSupplierResults([]);
        setCatalogResults([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div style={{ padding: '20px 0', fontSize: '12px' }}>
      {/* Unsaved Changes Indicator */}
      {hasUnsavedChanges && (
        <div
          className="alert alert-warning mb-3"
          style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            fontSize: '14px',
          }}
        >
          <i className="bi bi-exclamation-triangle me-2"></i>
          <strong>You have unsaved changes.</strong> These will be lost if you navigate away without
          saving.
        </div>
      )}

      {/* Compact Header Section */}
      <div
        className="d-flex align-items-center justify-content-between mb-3"
        style={{
          padding: '12px 16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          border: '1px solid #e9ecef',
        }}
      >
        <div className="d-flex align-items-center gap-3">
          {/* Breadcrumb */}
          <nav aria-label="breadcrumb" className="mb-0">
            <ol
              className="breadcrumb mb-0"
              style={{ backgroundColor: 'transparent', padding: 0, fontSize: '14px' }}
            >
              <li className="breadcrumb-item">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigationWithConfirmation(() => navigate('/MyCart'));
                  }}
                  style={{ color: '#009efb', textDecoration: 'none', fontSize: '14px' }}
                >
                  <i className="bi bi-cart me-1"></i>
                  My Carts
                </a>
              </li>
              <li
                className="breadcrumb-item active"
                aria-current="page"
                style={{ fontSize: '14px' }}
              >
                {cartHeaderData?.cartNo || 'Cart Details'}
              </li>
            </ol>
          </nav>

          {/* Divider */}
          <div style={{ height: '20px', width: '1px', backgroundColor: '#dee2e6' }}></div>

          {/* Cart Name */}
          {cartHeaderData?.cartName && (
            <span className="text-muted" style={{ fontSize: '14px' }}>
              {cartHeaderData.cartName}
            </span>
          )}

          {/* Item Count Badge */}
          <span className="badge bg-secondary" style={{ fontSize: '14px', padding: '4px 8px' }}>
            {(() => {
              const visibleItemCount = cartDetails.filter(
                (item) => !isItemDeleted(item.cartDetailId),
              ).length;
              return `${visibleItemCount} item${visibleItemCount !== 1 ? 's' : ''}`;
            })()}
          </span>

          {/* Total */}
          <span className="fw-bold" style={{ color: '#009efb', fontSize: '14px' }}>
            <i className="bi bi-calculator me-1"></i>
            Total: $
            {cartDetails
              .filter((item) => !isItemDeleted(item.cartDetailId))
              .reduce((sum, item) => {
                const price = getDisplayValue(item, 'price') || item.price;
                const qty = getDisplayValue(item, 'qty') || item.qty;
                return sum + price * qty;
              }, 0)
              .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Cart History and Duplicate Cart Buttons - Visible for non-DRAFT carts */}
        {cartStatusType !== 'DRAFT' && (
          <div className="d-flex align-items-center gap-2">
            {/* Status Display for non-DRAFT/non-PENDING_APPROVAL carts */}
            {cartStatusType !== 'PENDING_APPROVAL' && (
              <div
                className="d-flex align-items-center gap-1 px-2 py-1 me-2"
                style={{
                  backgroundColor:
                    cartStatusType === 'APPROVED'
                      ? '#d4edda'
                      : cartStatusType === 'REJECTED'
                        ? '#f8d7da'
                        : cartStatusType === 'POGENERATED'
                          ? '#d1ecf1'
                          : cartStatusType === 'SUBMITTED'
                            ? '#cce5ff'
                            : '#e9ecef',
                  borderRadius: '6px',
                  border: `1px solid ${cartStatusType === 'APPROVED'
                      ? '#28a745'
                      : cartStatusType === 'REJECTED'
                        ? '#dc3545'
                        : cartStatusType === 'POGENERATED'
                          ? '#17a2b8'
                          : cartStatusType === 'SUBMITTED'
                            ? '#007bff'
                            : '#6c757d'
                    }`,
                }}
              >
                <i
                  className={`bi ${cartStatusType === 'APPROVED'
                      ? 'bi-check-circle-fill'
                      : cartStatusType === 'REJECTED'
                        ? 'bi-x-circle-fill'
                        : cartStatusType === 'POGENERATED'
                          ? 'bi-file-earmark-check-fill'
                          : cartStatusType === 'SUBMITTED'
                            ? 'bi-send-check-fill'
                            : 'bi-circle'
                    }`}
                  style={{
                    fontSize: '12px',
                    color:
                      cartStatusType === 'APPROVED'
                        ? '#28a745'
                        : cartStatusType === 'REJECTED'
                          ? '#dc3545'
                          : cartStatusType === 'POGENERATED'
                            ? '#0c5460'
                            : cartStatusType === 'SUBMITTED'
                              ? '#004085'
                              : '#6c757d',
                  }}
                ></i>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color:
                      cartStatusType === 'APPROVED'
                        ? '#155724'
                        : cartStatusType === 'REJECTED'
                          ? '#721c24'
                          : cartStatusType === 'POGENERATED'
                            ? '#0c5460'
                            : cartStatusType === 'SUBMITTED'
                              ? '#004085'
                              : '#495057',
                  }}
                >
                  {formatStatusText(cartStatusType)}
                </span>
              </div>
            )}
            {/* Resubmit button for rejected carts */}
            {cartStatusType === 'REJECTED' && (
              <Button
                color="warning"
                size="sm"
                disabled={isCartEmpty}
                onClick={handleResubmitClick}
                style={{
                  borderRadius: '8px',
                  padding: '6px 16px',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Resubmit
              </Button>
            )}
            <Button
              color="secondary"
              size="sm"
              onClick={() => setShowCartHistory(true)}
              style={{
                borderRadius: '8px',
                padding: '6px 16px',
                fontSize: '13px',
              }}
            >
              <i className="bi bi-clock-history me-1"></i>
              History
            </Button>
            <Button
              color="info"
              size="sm"
              onClick={handleDuplicateCart}
              style={{
                borderRadius: '8px',
                padding: '6px 16px',
                fontSize: '13px',
                background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                border: 'none',
                color: 'white',
              }}
            >
              <i className="bi bi-copy me-1"></i>
              Duplicate Cart
            </Button>
          </div>
        )}

        {/* Actions for DRAFT status - Add Products and Submit/Apply buttons */}
        {(cartStatusType === 'DRAFT' || cartStatusType === 'PENDING_APPROVAL') && !submitted && (
          <div className="d-flex align-items-center gap-2">
            {hasUnsavedChanges && isCartEditable() && (
              <button
                className="btn btn-warning btn-sm"
                onClick={() => {
                  Swal.fire({
                    title: 'Save Changes?',
                    text: 'Do you want to save your changes before proceeding?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Yes, Save Changes',
                    cancelButtonText: 'No, Continue Without Saving',
                    confirmButtonColor: '#28a745',
                    cancelButtonColor: '#6c757d'
                  }).then((result) => {
                    if (result.isConfirmed) {
                      handleConfirmChanges();
                    } else {
                      setLocalCartChanges({});
                      setHasUnsavedChanges(false);
                    }
                  });
                }}
                style={{
                  borderRadius: '8px',
                  padding: '6px 16px',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                <i className="bi bi-save me-1"></i>
                Save Changes
              </button>
            )}
            {/* Status Display */}
            <div
              className="d-flex align-items-center gap-1 px-2 py-1"
              style={{
                backgroundColor: cartStatusType === 'DRAFT' ? '#e7f1ff' : '#fff3cd',
                borderRadius: '6px',
                border: `1px solid ${cartStatusType === 'DRAFT' ? '#007bff' : '#ffc107'}`,
              }}
            >
              <i
                className={`bi ${cartStatusType === 'DRAFT' ? 'bi-pencil-square' : 'bi-hourglass-split'}`}
                style={{ fontSize: '12px', color: cartStatusType === 'DRAFT' ? '#007bff' : '#856404' }}
              ></i>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: cartStatusType === 'DRAFT' ? '#004085' : '#856404',
                }}
              >
                {formatStatusText(cartStatusType)}
              </span>
            </div>
            <Button
              color="primary"
              size="sm"
              onClick={handleAddProduct}
              style={{
                borderRadius: '8px',
                padding: '6px 16px',
                fontSize: '13px',
              }}
            >
              <i className="bi bi-plus-circle me-1"></i>
              Add Products
            </Button>
            {cartDetails.length > 0 && (
              <>
                <Button
                  color="success"
                  size="sm"
                  disabled={
                    isCartEmpty ||
                    submitted ||
                    cartStatusType === 'APPROVED' ||
                    cartStatusType === 'POGENERATED'
                  }
                  onClick={handleSubmitClick}
                  style={{
                    fontSize: '13px',
                    padding: '6px 16px',
                    borderRadius: '8px',
                    fontWeight: '500',
                  }}
                >
                  <i className="bi bi-send me-1"></i>
                  Submit Cart
                </Button>
              </>
            )}
          </div>
        )}      </div>

      <Card
        className="mb-2 shadow-sm"
        style={{
          borderRadius: '12px',
          border: 'none',
          background: 'linear-gradient(145deg, #ffffff, #f8fbff)',
        }}
      >
        <ToastContainer />
        <div className="p-4">
          <div className="row g-3">
            {/* Cart Information - Left Side */}
            <div className="col-lg-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-3">
                  {/* On Behalf Of */}
                  <div className="mb-3">
                    <Label
                      className="form-label fw-semibold mb-2"
                      style={{ fontSize: '11px', color: '#495057' }}
                    >
                      <i className="bi bi-person-circle me-1 text-primary"></i>
                      On behalf of
                    </Label>
                    {cartStatusType === 'POGENERATED' ? (
                      <div
                        className="form-control form-control-sm"
                        style={{
                          backgroundColor: '#e9ecef',
                          color: '#495057',
                          cursor: 'not-allowed',
                        }}
                      >
                        {cartHeaderData?.onBehalfOf
                          ? allUsers.find((user) => user.userId === cartHeaderData.onBehalfOf)
                            ?.userName ||
                          allUsers.find((user) => user.userId === cartHeaderData.onBehalfOf)
                            ?.email ||
                          'N/A'
                          : 'N/A'}
                      </div>
                    ) : (
                      <select
                        className="form-select form-select-sm"
                        value={onBehalfOfUserId}
                        onChange={(e) => handleOnBehalfOfChange(e.target.value)}
                        disabled={!['DRAFT', 'PENDING_APPROVAL'].includes(cartStatusType)}
                      >
                        <option value="">Select User</option>
                        {allUsers.map((user) => (
                          <option key={user.userId} value={user.userId}>
                            {user.userName || user.email}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Purchase Type */}
                  <div className="mb-3">
                    <Label
                      className="form-label fw-semibold mb-2"
                      style={{ fontSize: '11px', color: '#495057' }}
                    >
                      <i className="bi bi-tag me-1 text-primary"></i>
                      Purchase type
                    </Label>

                    <div
                      className={`btn-group w-100 ${validationErrors.purchaseType ? 'border border-danger rounded' : ''
                        }`}
                      role="group"
                      style={{ padding: '2px' }} // thoda gap so border visible
                    >
                      {['CAPEX', 'OPEX'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          className={`btn btn-sm ${purchaseType === type ? 'btn-primary' : 'btn-outline-primary'
                            }`}
                          onClick={() => handlePurchaseTypeChange(type)}
                          style={{ fontSize: '12px', fontWeight: '600' }}
                          disabled={!['DRAFT', 'PENDING_APPROVAL'].includes(cartStatusType)}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Needed By Date */}
                  <div className="mb-3">
                    <Label
                      className="form-label fw-semibold mb-2"
                      style={{ fontSize: '11px', color: '#495057' }}
                    >
                      <i className="bi bi-calendar-event me-1 text-primary"></i>
                      Needed by date
                    </Label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={neededByDate}
                      onChange={(e) => handleNeededByDateChange(e.target.value)}
                      disabled={!['DRAFT', 'PENDING_APPROVAL'].includes(cartStatusType)}
                    />
                  </div>

                  <hr className="my-3" />

                  {/* Status Section */}
                  <div>
                    <div className="small mb-2">
                      <span className="text-muted">Created by:</span>
                      <span className="ms-2 fw-medium">
                        <i className="bi bi-person-circle me-1 text-primary"></i>
                        {cartHeaderData && cartHeaderData.createdBy
                          ? `${cartHeaderData.createdBy.firstName || ''} ${cartHeaderData.createdBy.lastName || ''
                            }`.trim()
                          : 'N/A'}
                      </span>
                    </div>

                    {cartHeaderData &&
                      (cartHeaderData.createdAt ||
                        cartHeaderData.createdDate ||
                        cartHeaderData.created ||
                        cartHeaderData.createdOn) && (
                        <div className="small mb-2">
                          <span className="text-muted">Created:</span>
                          <span className="ms-2 text-secondary">
                            <i className="bi bi-calendar3 me-1 text-primary"></i>
                            {new Date(
                              cartHeaderData.createdAt ||
                              cartHeaderData.createdDate ||
                              cartHeaderData.created ||
                              cartHeaderData.createdOn,
                            ).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            at{' '}
                            {new Date(
                              cartHeaderData.createdAt ||
                              cartHeaderData.createdDate ||
                              cartHeaderData.created ||
                              cartHeaderData.createdOn,
                            ).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}

                    {cartHeaderData && cartHeaderData.submittedBy && (
                      <div className="small mb-2">
                        <span className="text-muted">Submitted by:</span>
                        <span className="ms-2 fw-medium">
                          <i className="bi bi-send-check me-1 text-success"></i>
                          {`${cartHeaderData.submittedBy.firstName || ''} ${cartHeaderData.submittedBy.lastName || ''}`.trim()}
                        </span>
                      </div>
                    )}

                    {cartHeaderData && cartHeaderData.submittedDate && (
                      <div className="small mb-2">
                        <span className="text-muted">Submitted:</span>
                        <span className="ms-2 text-secondary">
                          <i className="bi bi-calendar-check me-1 text-success"></i>
                          {new Date(cartHeaderData.submittedDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          at{' '}
                          {new Date(cartHeaderData.submittedDate).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}

                    {cartHeaderData && cartHeaderData.purchaseType && (
                      <div className="small mb-2">
                        <span className="text-muted">Type:</span>
                        <span className="badge bg-secondary ms-2" style={{ fontSize: '10px' }}>
                          {cartHeaderData.purchaseType}
                        </span>
                      </div>
                    )}

                    {cartHeaderData && cartHeaderData.cartStatusType === 'POGENERATED' && (
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm w-100 mt-2"
                        onClick={handleViewPODetails}
                        style={{ fontSize: '11px' }}
                      >
                        <i className="bi bi-eye me-1"></i>
                        View PO Details
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address & Account Settings - Right Side */}
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-3">
                  {/* Shipping Address Section */}
                  <div className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <div
                        className="bg-warning bg-gradient rounded d-flex align-items-center justify-content-center me-2"
                        style={{ width: '32px', height: '32px' }}
                      >
                        <i className="bi bi-geo-alt-fill text-white"></i>
                      </div>
                      <h6 className="mb-0 fw-bold" style={{ fontSize: '13px', color: '#2c3e50' }}>
                        Shipping address
                      </h6>
                    </div>

                    <Label
                      className="form-label fw-semibold mb-2"
                      style={{ fontSize: '11px', color: '#495057' }}
                    >
                      Select address
                    </Label>
                    <select
                      className={`form-select form-select-sm ${validationErrors.shipToAddressId ? 'is-invalid' : ''}`}
                      value={
                        selectedAddressId || shipToAddressId || (allShippingAddresses && allShippingAddresses.length === 1 ? allShippingAddresses[0].addressId : '')
                      }
                      onChange={(e) => handleAddressChangeImmediate(e.target.value)}
                      disabled={!['DRAFT', 'PENDING_APPROVAL'].includes(cartStatusType)}
                    >
                      <option value="">Select Shipping Address</option>
                      {allShippingAddresses.map((addr) => (
                        <option key={addr.addressId} value={addr.addressId}>
                          {addr.addressLine1} - {addr.city}, {addr.state} {addr.postalCode}
                        </option>
                      ))}
                    </select>
                  </div>

                  <hr className="my-3" />

                  {/* Account Settings Section */}
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="mb-0 fw-bold text-primary" style={{ fontSize: '13px' }}>
                        <i className="bi bi-gear me-1"></i>
                        Account settings
                      </h6>
                      {cartDetails.length > 0 && !disableAccountSettingsDropdowns && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setApplyToAll(!applyToAll)}
                          disabled={!allRequiredDropdownsSelected()}
                          style={{ fontSize: '10px', padding: '4px 10px' }}
                        >
                          <i className="bi bi-arrow-repeat me-1"></i>
                          {applyToAll ? '✓ Applied' : 'Apply All'}
                        </button>
                      )}
                    </div>

                    <div className="row g-2">
                      {settings.projectEnabled && (
                        <div className="col-md-6">
                          <Label
                            className="form-label mb-1"
                            style={{ fontSize: '10px', fontWeight: '600' }}
                          >
                            Project
                            {settings.projectEnabled === 'required' && (
                              <span className="text-danger">*</span>
                            )}
                          </Label>
                          <select
                            className={`form-select form-select-sm ${validationErrors.projectId ? 'is-invalid' : ''
                              }`}
                            value={getAccountSettingDisplayValue('projectId')}
                            onChange={(e) => handleDropdownChange('projectId', e.target.value)}
                            disabled={disableAccountSettingsDropdowns}
                            style={{ fontSize: '11px' }}
                          >
                            <option value="">Select Project</option>
                            {projects.map((p) => (
                              <option key={p.projectId} value={p.projectId}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {settings.departmentEnabled && (
                        <div className="col-md-6">
                          <Label
                            className="form-label mb-1"
                            style={{ fontSize: '10px', fontWeight: '600' }}
                          >
                            Department
                            {settings.departmentEnabled === 'required' && (
                              <span className="text-danger">*</span>
                            )}
                          </Label>
                          <select
                            className={`form-select form-select-sm ${validationErrors.departmentId ? 'is-invalid' : ''
                              }`}
                            value={getAccountSettingDisplayValue('departmentId')}
                            onChange={(e) => handleDropdownChange('departmentId', e.target.value)}
                            disabled={disableAccountSettingsDropdowns}
                            style={{ fontSize: '11px' }}
                          >
                            <option value="">Select Department</option>
                            {departments.map((d) => (
                              <option key={d.departmentId} value={d.departmentId}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

{settings.gLAccountEnabled && (
  <div className="col-md-6">
    <Label
      className="form-label mb-1"
      style={{ fontSize: '10px', fontWeight: '600' }}
    >
      GL Account
      {settings.gLAccountEnabled === 'required' && (
        <span className="text-danger">*</span>
      )}
    </Label>
    <select
      className={`form-select form-select-sm ${
        validationErrors.glAccountId ? 'is-invalid' : ''
      }`}
      value={getAccountSettingDisplayValue('glAccountId')}
      onChange={(e) => handleDropdownChange('glAccountId', e.target.value)}
      disabled={disableAccountSettingsDropdowns || !selectedDepartmentId || filteredGlAccounts.length === 0}
      style={{ fontSize: '11px' }}
    >
      <option value="">
        {!selectedDepartmentId 
          ? 'Select Department First' 
          : filteredGlAccounts.length === 0 
          ? 'No GL Accounts Available'
          : 'Select GL Account'}
      </option>
      {filteredGlAccounts.map((g) => (
        <option key={g.glAccountId} value={g.glAccountId}>
          {g.name}
        </option>
      ))}
    </select>
    {selectedDepartmentId && filteredGlAccounts.length === 0 && (
      <small className="text-danger d-block mt-1" style={{ fontSize: '10px' }}>
        <i className="bi bi-exclamation-circle me-1"></i>
        No GL linked with the selected department
      </small>
    )}
    {!selectedDepartmentId && (
      <small className="text-muted" style={{ fontSize: '10px' }}>
        Please select a department first
      </small>
    )}
  </div>
)}
                      {settings.classEnabled && (
                        <div className="col-md-6">
                          <Label
                            className="form-label mb-1"
                            style={{ fontSize: '10px', fontWeight: '600' }}
                          >
                            Class
                            {settings.classEnabled === 'required' && (
                              <span className="text-danger">*</span>
                            )}
                          </Label>
                          <select
                            className={`form-select form-select-sm ${validationErrors.classId ? 'is-invalid' : ''
                              }`}
                            value={getAccountSettingDisplayValue('classId')}
                            onChange={(e) => handleDropdownChange('classId', e.target.value)}
                            disabled={disableAccountSettingsDropdowns}
                            style={{ fontSize: '11px' }}
                          >
                            <option value="">Select Class</option>
                            {classes.map((c) => (
                              <option key={c.classId} value={c.classId}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {settings.locationEnabled && (
                        <div className="col-md-6">
                          <Label
                            className="form-label mb-1"
                            style={{ fontSize: '10px', fontWeight: '600' }}
                          >
                            Location
                            {settings.locationEnabled === 'required' && (
                              <span className="text-danger">*</span>
                            )}
                          </Label>
                          <select
                            className={`form-select form-select-sm ${validationErrors.locationId ? 'is-invalid' : ''
                              }`}
                            value={getAccountSettingDisplayValue('locationId')}
                            onChange={(e) => handleDropdownChange('locationId', e.target.value)}
                            disabled={disableAccountSettingsDropdowns}
                            style={{ fontSize: '11px' }}
                          >
                            <option value="">Select Location</option>
                            {locations.map((l) => (
                              <option key={l.locationId} value={l.locationId}>
                                {l.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {(cartStatusType === 'DRAFT' || cartStatusType === 'PENDING_APPROVAL') && !submitted && (
            <div className="row mt-4">
              <div className="col-lg-12">
                <div
                  style={{
                    background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
                    borderRadius: '10px',
                    padding: '16px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  {/* Budget Header - Always Visible */}
                  <div
                    className="d-flex justify-content-between align-items-center"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setBudgetSectionExpanded(!budgetSectionExpanded)}
                  >
                    <div className="d-flex align-items-center">
                      <i
                        className="bi bi-wallet2 me-2"
                        style={{ color: '#009efb', fontSize: '18px' }}
                      ></i>
                      <div>
                        <h5 className="mb-0" style={{ color: '#009efb', fontWeight: '600' }}>
                          Budget Selection & Validation
                        </h5>
                        {(() => {
                          const validationSummary = getBudgetValidationSummary();
                          return (
                            <small
                              className={`text-${validationSummary.color} fw-bold`}
                              style={{ fontSize: '0.75rem' }}
                            >
                              <i
                                className={`bi ${validationSummary.status === 'VALID'
                                  ? 'bi-check-circle-fill'
                                  : validationSummary.status === 'OVER_BUDGET'
                                    ? 'bi-exclamation-triangle-fill'
                                    : validationSummary.status === 'MISSING_BUDGET'
                                      ? 'bi-x-circle-fill'
                                      : validationSummary.status === 'NO_BUDGET'
                                        ? 'bi-x-circle-fill'
                                        : validationSummary.status === 'INVALID'
                                          ? 'bi-x-circle-fill'
                                          : validationSummary.status === 'EXCEEDED'
                                            ? 'bi-exclamation-triangle-fill'
                                            : validationSummary.status === 'INSUFFICIENT'
                                              ? 'bi-exclamation-triangle-fill'
                                              : validationSummary.status === 'WARNING'
                                                ? 'bi-exclamation-triangle-fill'
                                                : validationSummary.status === 'PENDING'
                                                  ? 'bi-clock-fill'
                                                  : 'bi-info-circle-fill'
                                  } me-1`}
                              ></i>
                              {validationSummary.message}
                            </small>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="d-flex align-items-center">
                      {/* Budget Summary and Status */}
                      {(() => {
                        const summary = getBudgetSummary();
                        const validationSummary = getBudgetValidationSummary();
                        return summary ? (
                          <div className="me-3 text-end">
                            <small className="text-muted d-block" style={{ fontSize: '0.8rem' }}>
                              {summary.projectCount} project{summary.projectCount !== 1 ? 's' : ''}{' '}
                              •{formatCurrency(summary.totalAmount)} total
                            </small>
                            <small
                              className={`text-${validationSummary.color} d-block fw-bold`}
                              style={{ fontSize: '0.7rem' }}
                            >
                              Status:{' '}
                              {validationSummary.status === 'VALID'
                                ? 'Valid'
                                : validationSummary.status === 'OVER_BUDGET'
                                  ? 'Over Budget'
                                  : validationSummary.status === 'MISSING_BUDGET'
                                    ? 'Missing Budget'
                                    : validationSummary.status === 'NO_BUDGET'
                                      ? 'No Budget'
                                      : validationSummary.status === 'INVALID'
                                        ? 'Invalid'
                                        : validationSummary.status === 'EXCEEDED'
                                          ? 'Exceeded'
                                          : validationSummary.status === 'INSUFFICIENT'
                                            ? 'Insufficient'
                                            : validationSummary.status === 'WARNING'
                                              ? 'Warning'
                                              : validationSummary.status === 'UNHEALTHY'
                                                ? 'Unhealthy'
                                                : validationSummary.status === 'ERROR'
                                                  ? 'Pending'
                                                  : 'Ready'}
                            </small>
                          </div>
                        ) : null;
                      })()}
                      <button
                        type="button"
                        className="btn btn-sm btn-link p-0"
                        style={{ color: '#009efb' }}
                      >
                        <i
                          className={`bi ${budgetSectionExpanded ? 'bi-chevron-up' : 'bi-chevron-down'
                            }`}
                          style={{ fontSize: '16px' }}
                        ></i>
                      </button>
                    </div>
                  </div>

                  {/* Hidden Budget Selector for Auto-Selection */}
                  <div style={{ display: 'none' }}>
                    <BudgetSelector
                      key={`budget-selector-hidden-${budgetRefreshKey}`}
                      onBudgetSelect={handleBudgetSelect}
                      cartItems={memoizedBudgetSelectorCartItems}
                      cartTotal={cartTotal}
                      disabled={disableAccountSettingsDropdowns}
                      purchaseType={cartHeaderData?.purchaseType || 'OPEX'}
                    />
                  </div>

                  {/* Budget Details - Expandable */}
                  {budgetSectionExpanded && (
                    <div className="mt-3">
                      <BudgetSelector
                        key={`budget-selector-${budgetRefreshKey}`}
                        onBudgetSelect={handleBudgetSelect}
                        cartItems={memoizedBudgetSelectorCartItems}
                        cartTotal={cartTotal}
                        disabled={disableAccountSettingsDropdowns}
                        purchaseType={cartHeaderData?.purchaseType || 'OPEX'}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
      <Row>
        <Col className={cartStatusType === 'DRAFT' ? 'col-md-12' : ''}>
          <div className="mb-2">
            {!['APPROVED', 'POGENERATED'].includes(cartStatusType) && (
              <Card className="shadow-sm mb-2" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="p-3">
                  <div className="d-flex gap-3">
                    <div style={{ width: '50%', position: 'relative' }}>
                      <div className="position-relative">
                        <Input
                          type="text"
                          placeholder="Search suppliers..."
                          style={{
                            paddingLeft: '40px',
                            borderRadius: '8px',
                            border: '1px solid #e0e0e0',
                            fontSize: '14px',
                          }}
                          value={supplierSearchTerm}
                          onChange={(e) => {
                            if (cartStatusType === 'DRAFT') {
                              setSupplierSearchTerm(e.target.value);
                              setSelectedSupplierId(null); // allow re-search
                            }
                          }}
                          onFocus={() => {
                            if (cartStatusType === 'DRAFT') {
                              setCatalogSearchTerm('');
                              setCatalogResults([]);
                              handleSupplierSearch();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && cartStatusType === 'DRAFT') {
                              setSelectedSupplierId(null);
                            }
                          }}
                          disabled={cartStatusType !== 'DRAFT'}
                        />
                        <i
                          className="bi bi-search position-absolute"
                          style={{
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#666',
                            fontSize: '14px',
                          }}
                        ></i>
                      </div>
                      {(supplierSearchTerm.trim().length > 0 ||
                        document.activeElement ===
                        document.querySelector('input[placeholder="Search suppliers..."]')) && (
                          <Card
                            className="mt-2 shadow-sm search-results-card"
                            style={{
                              maxHeight: '300px',
                              overflowY: 'auto',
                              overflowX: 'hidden',
                              position: 'absolute',
                              zIndex: '1',
                              width: '100%',
                            }}
                          >
                            <CardBody>
                              {isLoading ? (
                                <div className="text-center">Loading...</div>
                              ) : supplierResults.length === 0 ? (
                                <div className="text-center">
                                  <p>No suppliers found</p>
                                  <Button
                                    color="primary"
                                    size="sm"
                                    onClick={() => setIsAddSupplierModalOpen(true)}
                                  >
                                    Add Supplier
                                  </Button>
                                </div>
                              ) : (
                                supplierResults.map((supplier) => {
                                  const supplierObj = supplier;
                                  if (!supplierObj) return null;

                                  return (
                                    <div
                                      key={supplierObj.supplierId || Math.random()}
                                      className="mb-2 border-bottom pb-2"
                                    >
                                      <div className="d-flex align-items-center justify-content-between">
                                        <div>
                                          <h6 className="mb-1">
                                            {supplierObj.name || supplierObj.displayName}
                                          </h6>
                                        </div>
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-primary"
                                          onClick={async () => {
                                            handleDropdownChange(
                                              'supplierId',
                                              supplierObj.supplierId,
                                            );
                                            setSelectedSupplierId(supplierObj.supplierId);
                                            setSupplierSearchTerm('');
                                            setSupplierResults([]);

                                            // ---- ADD EMPTY PRODUCT AUTOMATICALLY ----
                                            const emptyProduct = {
                                              cartId,
                                              supplierId: supplierObj.supplierId,
                                              projectId: selectedProjectId || null,
                                              departmentId: selectedDepartmentId || null,
                                              glAccountId: selectedGlAccountId || null,
                                              classId: selectedClassId || null,
                                              locationId: selectedLocationId || null,
                                              partId: '',
                                              partDescription: '',
                                              qty: 1,
                                              price: 0,
                                              unitOfMeasure: 'Each',
                                              currencyCode: 'USD',
                                              catalogId: null,
                                              catalogItemId: {
                                                CatalogItemId: null,
                                                PartId: null,
                                                ProductImageURL: null,
                                              },
                                              orderType: 0,
                                              isCritical: false,
                                              isSafetyAppReq: false,
                                              slimit: '',
                                              internalBuyerQuoteFile: 0,
                                              priceUpdate: false,
                                              productId: 1,
                                              manufacturerName: '',
                                              manufacturerPart: '',
                                            };

                                            try {
                                              const res = await CartService.handleCreateCart(
                                                emptyProduct,
                                                companyId,
                                                cartId,
                                              );
                                              if (res.data) {
                                                toast.dismiss();
                                                toast.success('Empty product added!');
                                                fetchCarts(); // refresh list
                                              }
                                            } catch (err) {
                                              toast.error('Failed to add empty product');
                                              console.error(err);
                                            }
                                          }}
                                        >
                                          Select
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </CardBody>
                          </Card>
                        )}
                    </div>

                    <div style={{ width: '50%', position: 'relative' }}>
                      <div className="position-relative">
                        <Input
                          type="text"
                          placeholder="Search catalog items..."
                          style={{
                            paddingLeft: '40px',
                            borderRadius: '8px',
                            border: '1px solid #e0e0e0',
                            fontSize: '14px',
                            display: 'none',
                          }}
                          value={catalogSearchTerm}
                          onChange={(e) => setCatalogSearchTerm(e.target.value)}
                          onFocus={() => {
                            setSupplierSearchTerm('');
                            setSupplierResults([]);
                            if (selectedSupplierId && catalogSearchTerm === '') {
                              handleCatalogSearchForSupplier(selectedSupplierId);
                            }
                          }}
                          onClick={() => {
                            if (selectedSupplierId && catalogResults.length === 0) {
                              handleCatalogSearchForSupplier(selectedSupplierId);
                            }
                          }}
                        />
                        {/* <i
                          className="bi bi-search position-absolute"
                          style={{
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#666',
                            fontSize: '14px',
                          }}
                        ></i> */}
                      </div>
                      {(catalogSearchTerm.trim().length > 0 ||
                        (selectedSupplierId &&
                          catalogResults.length > 0 &&
                          document.activeElement ===
                          document.querySelector(
                            'input[placeholder="Search catalog items..."]',
                          ))) && (
                          <Card
                            className="mt-2 shadow-sm search-results-card"
                            style={{
                              maxHeight: '300px',
                              overflowY: 'auto',
                              overflowX: 'hidden',
                              position: 'absolute',
                              zIndex: '1',
                              width: '100%',
                            }}
                          >
                            <CardBody>
                              {isLoading ? (
                                <div className="text-center">Loading...</div>
                              ) : catalogResults.length === 0 ? (
                                <div className="text-center">
                                  <p>No items found</p>
                                  {/* Only show Add Item button when cart is in DRAFT status */}
                                  {cartStatusType === 'DRAFT' && (
                                    <Button
                                      color="primary"
                                      size="sm"
                                      onClick={() => setIsAddProductModalOpen(true)}
                                    >
                                      Add Item
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                catalogResults
                                  .filter(
                                    (item) =>
                                      item.Supplier &&
                                      item.Supplier.supplierId === selectedSupplierId,
                                  )
                                  .map((item) => (
                                    <div key={item.CatalogItemId} className="mb-2 border-bottom pb-2">
                                      <div className="d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center">
                                          <img
                                            src={
                                              item.ProductImageURL || 'https://via.placeholder.com/50'
                                            }
                                            alt={item.Description}
                                            className="me-3"
                                            style={{
                                              width: '50px',
                                              height: '50px',
                                              objectFit: 'cover',
                                              flexShrink: 0,
                                            }}
                                          />
                                          <div>
                                            <div className="description-wrapper">
                                              <h6 className="mb-1">
                                                {item.Description &&
                                                  item.Description.split(' ').slice(0, 4).join(' ')}
                                                {item.Description &&
                                                  item.Description.split(' ').length > 4 &&
                                                  '...'}
                                              </h6>
                                            </div>
                                            <p className="mb-1 small">
                                              Price: {item.UnitPrice || item.price || 'N/A'}{' '}
                                              {item.Currency || item.currencyCode || 'N/A'}
                                            </p>
                                            <p className="mb-1 small">
                                              Supplier:{' '}
                                              {(item.Supplier && item.Supplier.name) || 'N/A'}
                                            </p>
                                            <p className="mb-0 small">
                                              Part ID: {item.PartId || 'N/A'}
                                            </p>
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-primary"
                                          onClick={() => {
                                            handleAddToCart(item);
                                            setCatalogSearchTerm('');
                                          }}
                                        >
                                          Add to Cart
                                        </button>
                                      </div>
                                    </div>
                                  ))
                              )}
                            </CardBody>
                          </Card>
                        )}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
          <div>
            {cartDetails.length === 0 ? (
              <Card className="shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <CardBody className="py-5">
                  <div className="text-center">
                    <div className="mb-4">
                      <i className="bi bi-cart-x" style={{ fontSize: '64px', color: '#ccc' }}></i>
                    </div>
                    <h5 className="text-muted mb-2">Your cart is empty</h5>
                    <p className="text-muted mb-0">
                      Add products to get started with your procurement
                    </p>
                  </div>
                </CardBody>
              </Card>
            ) : (
              Object.entries(groupedItems).map(([supplierId, items]) => {
                // Convert supplierId back to number for supplier lookup, handle 'unknown' case
                const supplierIdNum = supplierId === 'unknown' ? null : Number(supplierId);
                const supplierName = getSupplierName(supplierIdNum);
                const visibleItems = items.filter((item) => !isItemDeleted(item.cartDetailId));
                const orderValue = visibleItems.reduce((sum, item) => {
                  const price = getDisplayValue(item, 'price') || item.price;
                  const qty = getDisplayValue(item, 'qty') || item.qty;
                  return sum + price * qty;
                }, 0);
                const lineItemCount = visibleItems.length;

                return (
                  <Card
                    key={`supplier-${supplierId}-page-${currentPage}`}
                    className="mb-2 shadow-sm"
                    style={{ borderRadius: '12px', border: 'none' }}
                  >
                    <CardBody className="p-4">
                      <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                        <div className="d-flex align-items-center">
                          <i
                            className="bi bi-building me-2"
                            style={{ color: '#009efb', fontSize: '18px' }}
                          ></i>
                          <h6 className="mb-0" style={{ color: '#009efb', fontWeight: '600' }}>
                            {supplierName}
                          </h6>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                          <div className="d-flex align-items-center gap-2">
                            <span className="text-muted" style={{ fontSize: '13px' }}>
                              Items:
                            </span>
                            <span
                              className="fw-semibold"
                              style={{ color: '#495057', fontSize: '13px' }}
                            >
                              {lineItemCount}
                            </span>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <span className="text-muted" style={{ fontSize: '13px' }}>
                              Value:
                            </span>
                            <span
                              className="fw-bold"
                              style={{ color: '#198754', fontSize: '14px' }}
                            >
                              $
                              {orderValue.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Row>
                        {items
                          .filter((cartItem) => !isItemDeleted(cartItem.cartDetailId))
                          .map((cartItem) => (
                            <Col key={`item-${cartItem.cartDetailId}`} md="12" className="mb-3">
                              <div
                                className="border rounded p-3"
                                style={{
                                  borderRadius: '8px',
                                  backgroundColor: localCartChanges[cartItem.cartDetailId]
                                    ? '#fff7e6'
                                    : '#fafafa',
                                  border: localCartChanges[cartItem.cartDetailId]
                                    ? '1px solid #ffc107'
                                    : '1px solid #e0e0e0',
                                  position: 'relative',
                                }}
                              >
                                {localCartChanges[cartItem.cartDetailId] && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: '8px',
                                      right: '8px',
                                      backgroundColor: '#ffc107',
                                      color: '#212529',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                    }}
                                  >
                                    MODIFIED
                                  </div>
                                )}
                                <Row className="align-items-start">
                                  <Col
                                    md="2"
                                    xs="4"
                                    className="d-flex flex-column align-items-center justify-content-between"
                                    style={{ height: '100%' }}
                                  >
                                    <div style={{ width: '80px', height: '80px' }}>
                                      <img
                                        src={
                                          (getDisplayValue(cartItem, 'catalogItemId') &&
                                            getDisplayValue(cartItem, 'catalogItemId').ProductImageURL) ||
                                          'https://st3.depositphotos.com/23594922/31822/v/450/depositphotos_318221368-stock-illustration-missing-picture-page-for-website.jpg'
                                        }
                                        alt="Product"
                                        className="img-fluid"
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          objectFit: 'cover',
                                          borderRadius: '8px',
                                          border: '1px solid #e0e0e0',
                                        }}
                                        onError={(e) => {
                                          e.target.src =
                                            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGNUY1RjUiLz4KICA8Y2lyY2xlIGN4PSIxMDAiIGN5PSI3MCIgcj0iMTUiIGZpbGw9IiNDQ0NDQ0MiLz4KICA8cGF0aCBkPSJNNjAgMTQwTDgwIDEyMEw5NSAxMzVMMTIwIDExMEwxNDAgMTQwVjE2MEg2MFYxNDBaIiBmaWxsPSIjQ0NDQ0NDIi8+CiAgPHRleHQgeD0iMTAwIiB5PSIxODUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2UgTm90IEF2YWlsYWJsZTwvdGV4dD4KPC9zdmc+Cg==';
                                        }}
                                      />
                                    </div>
                                    <div
                                      className="d-flex align-items-center justify-content-center gap-1"
                                      style={{ marginTop: '16px' }}
                                    >
                                      <Button
                                        size="sm"
                                        color="outline-primary"
                                        data-cart-action="quantity-decrease"
                                        style={{
                                          borderRadius: '6px',
                                          width: '28px',
                                          height: '28px',
                                          padding: '0',
                                          fontSize: '12px',
                                        }}
                                        onClick={() => {
                                          const currentQty =
                                            getDisplayValue(cartItem, 'qty') || cartItem.qty;
                                          if (isCartEditable()) {
                                            handleLocalFieldChange(
                                              cartItem.cartDetailId,
                                              'qty',
                                              Math.max(1, currentQty - 1),
                                            );
                                          } else {
                                            handleQuantityChange(
                                              cartItem.cartDetailId,
                                              cartItem.qty - 1,
                                              cartItem,
                                            );
                                          }
                                        }}
                                        disabled={
                                          (getDisplayValue(cartItem, 'qty') || cartItem.qty) <= 1 ||
                                          submitted ||
                                          (!isCartEditable() &&
                                            [
                                              'PENDING_APPROVAL',
                                              'APPROVED',
                                              'POGENERATED',
                                            ].includes(cartStatusType))
                                        }
                                      >
                                        -
                                      </Button>
                                      {isCartEditable() ? (
                                        <Input
                                          type="number"
                                          min="1"
                                          value={getDisplayValue(cartItem, 'qty')}
                                          onChange={(e) =>
                                            handleLocalFieldChange(
                                              cartItem.cartDetailId,
                                              'qty',
                                              parseInt(e.target.value, 10) || 1,
                                            )
                                          }
                                          style={{
                                            width: '50px',
                                            height: '28px',
                                            textAlign: 'center',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            margin: '0 8px',
                                            border: '1px solid #e0e0e0',
                                            borderRadius: '4px',
                                          }}
                                        />
                                      ) : (
                                        <span
                                          className="mx-2 fw-bold"
                                          style={{
                                            minWidth: '30px',
                                            textAlign: 'center',
                                            fontSize: '14px',
                                          }}
                                        >
                                          {cartItem.qty}
                                        </span>
                                      )}
                                      <Button
                                        size="sm"
                                        color="outline-primary"
                                        data-cart-action="quantity-increase"
                                        style={{
                                          borderRadius: '6px',
                                          width: '28px',
                                          height: '28px',
                                          padding: '0',
                                          fontSize: '12px',
                                        }}
                                        onClick={() => {
                                          const currentQty =
                                            getDisplayValue(cartItem, 'qty') || cartItem.qty;
                                          if (isCartEditable()) {
                                            handleLocalFieldChange(
                                              cartItem.cartDetailId,
                                              'qty',
                                              currentQty + 1,
                                            );
                                          } else {
                                            handleQuantityChange(
                                              cartItem.cartDetailId,
                                              cartItem.qty + 1,
                                              cartItem,
                                            );
                                          }
                                        }}
                                        disabled={
                                          submitted ||
                                          (!isCartEditable() &&
                                            [
                                              'PENDING_APPROVAL',
                                              'APPROVED',
                                              'POGENERATED',
                                            ].includes(cartStatusType))
                                        }
                                      >
                                        +
                                      </Button>
                                    </div>
                                    <Button
                                      size="sm"
                                      color="light"
                                      className="mt-2 border-0"
                                      data-cart-action="delete"
                                      style={{
                                        borderRadius: '8px',
                                        width: '36px',
                                        height: '32px',
                                        padding: '0',
                                        fontSize: '12px',
                                        backgroundColor: '#fff5f5',
                                        color: '#dc3545',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 2px 4px rgba(220, 53, 69, 0.1)',
                                      }}
                                      onClick={() => {
                                        if (isCartEditable()) {
                                          Swal.fire({
                                            title: 'Remove Product',
                                            text: 'This product will be removed from your cart.',
                                            icon: 'question',
                                            showCancelButton: true,
                                            confirmButtonText: 'Remove',
                                            cancelButtonText: 'Cancel',
                                            buttonsStyling: false,
                                            customClass: {
                                              confirmButton: 'btn btn-danger me-2',
                                              cancelButton: 'btn btn-secondary',
                                            },
                                          }).then((result) => {
                                            if (result.isConfirmed) {
                                              handleLocalDeleteProduct(cartItem.cartDetailId);
                                            }
                                          });
                                        } else {
                                          handleDeleteProduct(cartItem.cartDetailId);
                                        }
                                      }}
                                      disabled={
                                        submitted ||
                                        (!isCartEditable() &&
                                          ['PENDING_APPROVAL', 'APPROVED', 'POGENERATED'].includes(
                                            cartStatusType,
                                          ))
                                      }
                                      onMouseEnter={(e) => {
                                        if (!e.target.disabled) {
                                          e.target.style.backgroundColor = '#fecaca';
                                          e.target.style.transform = 'scale(1.05)';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!e.target.disabled) {
                                          e.target.style.backgroundColor = '#fff5f5';
                                          e.target.style.transform = 'scale(1)';
                                        }
                                      }}
                                    >
                                      <i className="bi bi-trash" style={{ fontSize: '14px' }}></i>
                                    </Button>
                                  </Col>
                                  <Col md="4" xs="9" className="justify-content-start">
                                    <div className="mb-3">
                                      <div className="description-wrapper">
                                        <Input
                                          type="textarea"
                                          value={getDisplayValue(cartItem, 'partDescription') || ''}
                                          onChange={(e) => {
                                            if (cartStatusType === 'DRAFT') {
                                              // For DRAFT status, use local changes
                                              handleLocalFieldChange(
                                                cartItem.cartDetailId,
                                                'partDescription',
                                                e.target.value
                                              );
                                            } else if (isCartEditable()) {
                                              handleLocalFieldChange(
                                                cartItem.cartDetailId,
                                                'partDescription',
                                                e.target.value
                                              );
                                            } else {
                                              if (cartItem.isManual) {
                                                const updateBody = {
                                                  ...cartItem,
                                                  partDescription: e.target.value,
                                                  cartDetailId: cartItem.cartDetailId,
                                                  cartId,
                                                };

                                                CartService.handleUpdateCartDetails(
                                                  updateBody,
                                                  companyId,
                                                  cartItem.cartDetailId,
                                                  cartId,
                                                )
                                                  .then(() => {
                                                    fetchCarts(true);
                                                  })
                                                  .catch((error) => {
                                                    console.error(
                                                      'Error updating description:',
                                                      error,
                                                    );
                                                    toast.error('Failed to update description');
                                                  });
                                              }
                                            }
                                          }}
                                          style={{
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            minHeight: '40px',
                                            border: '1px solid #e0e0e0',
                                            borderRadius: '4px',
                                          }}
                                          placeholder="Enter Product Name"
                                          disabled={!isItemDescriptionEditable(cartItem)}
                                        />
                                        {cartItem.isManual && (
                                          <small className="text-warning d-block mt-1">
                                            <i className="bi bi-info-circle me-1"></i>
                                            Manual entry - you can edit this description
                                          </small>
                                        )}
                                      </div>
                                    </div>
                                    <div className="d-flex flex-column gap-1 mt-2">
                                      {(() => {
                                        const showPartIdError =
                                          itemValidationErrors[cartItem.cartDetailId]?.includes(
                                            'partId',
                                          );

                                        const showPriceError =
                                          itemValidationErrors[cartItem.cartDetailId]?.includes(
                                            'price',
                                          );

                                        return (
                                          <>
                                            <div className="d-flex align-items-center">
                                              <span
                                                className="text-muted me-2"
                                                style={{ fontSize: '12px', minWidth: '70px' }}
                                              >
                                                Part ID:
                                              </span>

                                              {(() => {
                                                const isEditable =
                                                  !submitted &&
                                                  ['DRAFT', 'PENDING_APPROVAL'].includes(
                                                    cartStatusType,
                                                  );

                                                if (!isEditable) {
                                                  return (
                                                    <span
                                                      style={{
                                                        fontSize: '12px',
                                                        color: '#000',
                                                        fontWeight: '500',
                                                      }}
                                                    >
                                                      {cartItem.partId || 'N/A'}
                                                    </span>
                                                  );
                                                }

                                                return (
                                                  <AsyncSelect
                                                    className={`basic-single ${showPartIdError ? 'react-select-error' : ''
                                                      }`}
                                                    classNamePrefix="select"
                                                    placeholder="Search Part ID..."
                                                    isClearable={true}
                                                    cacheOptions
                                                    defaultOptions
                                                    loadOptions={(inputValue) =>
                                                      loadPartIdOptions(
                                                        cartItem.supplierId,
                                                        inputValue,
                                                      )
                                                    }
                                                    styles={{
                                                      control: (base) => ({
                                                        ...base,
                                                        minHeight: '26px',
                                                        fontSize: '12px',
                                                        minWidth: '200px',
                                                      }),
                                                      valueContainer: (base) => ({
                                                        ...base,
                                                        padding: '0 6px',
                                                      }),
                                                      input: (base) => ({
                                                        ...base,
                                                        margin: '0',
                                                        padding: '0',
                                                      }),
                                                      indicatorsContainer: (base) => ({
                                                        ...base,
                                                        height: '26px',
                                                      }),
                                                      option: (base, state) => ({
                                                        ...base,
                                                        fontSize: '12px',
                                                        padding: '6px 10px',
                                                        backgroundColor: state.data.customOption
                                                          ? '#fff3cd'
                                                          : base.backgroundColor,
                                                        color: state.data.customOption
                                                          ? '#856404'
                                                          : base.color,
                                                        '&:hover': {
                                                          backgroundColor: state.data.customOption
                                                            ? '#ffeaa7'
                                                            : '#f8f9fa',
                                                        },
                                                      }),
                                                      singleValue: (base, state) => ({
                                                        ...base,
                                                        color: state.data.customOption
                                                          ? '#856404'
                                                          : base.color,
                                                      }),
                                                      loadingMessage: (base) => ({
                                                        ...base,
                                                        fontSize: '12px',
                                                      }),
                                                      noOptionsMessage: (base) => ({
                                                        ...base,
                                                        fontSize: '12px',
                                                      }),
                                                      clearIndicator: (base) => ({
                                                        ...base,
                                                        padding: '4px',
                                                        cursor: 'pointer',
                                                        ':hover': {
                                                          color: '#dc3545', // Red color on hover
                                                        },
                                                      }),
                                                    }}
                                                    value={
                                                      getDisplayValue(cartItem, 'partId')
                                                        ? {
                                                          value: String(getDisplayValue(cartItem, 'partId')),
                                                          label: getDisplayValue(cartItem, 'isManual')
                                                            ? `${getDisplayValue(cartItem, 'partId')} (manual)`
                                                            : String(getDisplayValue(cartItem, 'partId')),
                                                          customOption: !!getDisplayValue(cartItem, 'isManual'),
                                                        }
                                                        : null
                                                    }
                                                    onChange={(selectedOption) => {
                                                      if (selectedOption) {
                                                        handleSupplierSpecificPartSelect(
                                                          cartItem.cartDetailId,
                                                          selectedOption.value,
                                                          selectedOption.customOption || false,
                                                        );
                                                      } else {
                                                        // Clear button clicked - reset ALL related fields
                                                        if (isCartEditable()) {
                                                          handleLocalFieldChange(cartItem.cartDetailId, 'partId', '');
                                                          handleLocalFieldChange(cartItem.cartDetailId, 'partDescription', '');
                                                          handleLocalFieldChange(cartItem.cartDetailId, 'price', 0);
                                                          handleLocalFieldChange(cartItem.cartDetailId, 'unitOfMeasure', 'Each');
                                                          handleLocalFieldChange(cartItem.cartDetailId, 'isManual', false);
                                                          handleLocalFieldChange(cartItem.cartDetailId, 'catalogItemId', null);
                                                          handleLocalFieldChange(cartItem.cartDetailId, 'manufacturerName', '');
                                                          handleLocalFieldChange(cartItem.cartDetailId, 'manufacturerPart', '');
                                                        } else {
                                                          // For non-editable carts, use direct API updates
                                                          const requestBody = {
                                                            ...cartItem,
                                                            partId: '',
                                                            partDescription: '',
                                                            price: 0,
                                                            unitOfMeasure: 'Each',
                                                            isManual: false,
                                                            catalogItemId: null,
                                                            manufacturerName: '',
                                                            manufacturerPart: '',
                                                            cartDetailId: cartItem.cartDetailId,
                                                            cartId,
                                                          };
                                                          CartService.handleUpdateCartDetails(
                                                            requestBody,
                                                            companyId,
                                                            cartItem.cartDetailId,
                                                            cartId
                                                          )
                                                            .then(() => {
                                                              fetchCarts(true);
                                                            })
                                                            .catch(error => {
                                                              console.error('Error clearing product details:', error);
                                                              toast.error('Failed to clear product');
                                                            });
                                                        }
                                                      }
                                                    }}
                                                    noOptionsMessage={({ inputValue }) =>
                                                      inputValue
                                                        ? 'No parts found. Type to add manually'
                                                        : 'Type to search parts...'
                                                    }
                                                    loadingMessage={() => 'Searching...'}
                                                    formatOptionLabel={(option, { context }) => {
                                                      if (context === 'value') {
                                                        return option.label;
                                                      }
                                                      if (option.customOption) {
                                                        return (
                                                          <div className="d-flex align-items-center">
                                                            <i className="bi bi-plus-circle me-2 text-warning"></i>
                                                            <div>
                                                              <div className="fw-bold">
                                                                {option.label}
                                                              </div>
                                                              <small className="text-muted">
                                                                Click to add as manual entry
                                                              </small>
                                                            </div>
                                                          </div>
                                                        );
                                                      }
                                                      return option.label;
                                                    }}
                                                    filterOption={null}
                                                  />
                                                );
                                              })()}
                                            </div>

                                            <div className="d-flex align-items-center">
                                              <span
                                                className="text-muted me-2"
                                                style={{ fontSize: '12px', minWidth: '70px' }}
                                              >
                                                Unit:
                                              </span>
                                              <span style={{ fontSize: '12px', color: '#000' }}>
                                                {cartItem.unitOfMeasure}
                                              </span>
                                            </div>

                                            <div className="d-flex align-items-center">
                                              <span
                                                className="text-muted me-2"
                                                style={{ fontSize: '12px', minWidth: '70px' }}
                                              >
                                                Unit Price:
                                              </span>
                                              <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={getDisplayValue(cartItem, 'price')}
                                                onChange={(e) => {
                                                  const newPrice = parseFloat(e.target.value) || 0;
                                                  if (isCartEditable()) {
                                                    handleLocalFieldChange(
                                                      cartItem.cartDetailId,
                                                      'price',
                                                      newPrice,
                                                    );
                                                  } else {
                                                    handleItemFieldChange(
                                                      cartItem.cartDetailId,
                                                      'price',
                                                      newPrice,
                                                    );
                                                  }
                                                }}
                                                className={showPriceError ? 'is-invalid' : ''}
                                                style={{
                                                  fontSize: '12px',
                                                  height: '26px',

                                                  borderRadius: '4px',
                                                  width: '100px',
                                                }}
                                                placeholder="0.00"
                                                disabled={
                                                  submitted ||
                                                  (!isCartEditable() &&
                                                    [
                                                      'PENDING_APPROVAL',
                                                      'APPROVED',
                                                      'POGENERATED',
                                                    ].includes(cartStatusType))
                                                }
                                              />
                                            </div>

                                            <div className="d-flex align-items-center">
                                              <span
                                                className="text-muted me-2"
                                                style={{ fontSize: '12px', minWidth: '70px' }}
                                              >
                                                Total:
                                              </span>
                                              <span
                                                style={{
                                                  fontSize: '12px',
                                                  fontWeight: '600',
                                                  color: '#000',
                                                }}
                                              >
                                                $
                                                {(
                                                  ((getDisplayValue(cartItem, 'price') ?? cartItem.price ?? 0) *
                                                    (getDisplayValue(cartItem, 'qty') ?? cartItem.qty ?? 0))
                                                ).toLocaleString('en-US', {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                })}
                                              </span>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </Col>
                                  <Col md="6" xs="12">
                                    {settings.departmentEnabled && (
                                      <Row className="align-items-center mb-2">
                                        <Col xs="4" className="text-end">
                                          <Label
                                            className="mb-0 text-muted"
                                            style={{ fontSize: '13px' }}
                                          >
                                            Department
                                          </Label>
                                        </Col>
                                        <Col xs="8">
                                          <Input
                                            type="select"
                                            bsSize="sm"
                                            value={getDisplayValue(cartItem, 'departmentId') || ''}
                                            onChange={(e) => {
                                              if (isCartEditable()) {
                                                handleLocalFieldChange(
                                                  cartItem.cartDetailId,
                                                  'departmentId',
                                                  e.target.value,
                                                );
                                              } else {
                                                handleItemFieldChange(
                                                  cartItem.cartDetailId,
                                                  'departmentId',
                                                  e.target.value,
                                                );
                                              }
                                            }}
                                            className={
                                              itemValidationErrors[cartItem.cartDetailId] &&
                                                itemValidationErrors[cartItem.cartDetailId].includes(
                                                  'departmentId',
                                                )
                                                ? 'is-invalid'
                                                : ''
                                            }
                                            disabled={
                                              submitted ||
                                              (!isCartEditable() &&
                                                [
                                                  'PENDING_APPROVAL',
                                                  'APPROVED',
                                                  'POGENERATED',
                                                ].includes(cartStatusType))
                                            }
                                          >
                                            <option value="">Select</option>
                                            {departments.map((d) => (
                                              <option key={d.departmentId} value={d.departmentId}>
                                                {d.name}
                                              </option>
                                            ))}
                                          </Input>
                                        </Col>
                                      </Row>
                                    )}

                                    {settings.gLAccountEnabled && (
                                      <Row className="align-items-center mb-2">
                                        <Col xs="4" className="text-end">
                                          <Label
                                            className="mb-0 text-muted"
                                            style={{ fontSize: '13px' }}
                                          >
                                            GL Account
                                          </Label>
                                        </Col>
                                        <Col xs="8">
                                          <Input
                                            type="select"
                                            bsSize="sm"
                                            value={getDisplayValue(cartItem, 'glAccountId') || ''}
                                            onChange={(e) => {
                                              if (isCartEditable()) {
                                                handleLocalFieldChange(
                                                  cartItem.cartDetailId,
                                                  'glAccountId',
                                                  e.target.value,
                                                );
                                              } else {
                                                handleItemFieldChange(
                                                  cartItem.cartDetailId,
                                                  'glAccountId',
                                                  e.target.value,
                                                );
                                              }
                                            }}
                                            className={
                                              itemValidationErrors[cartItem.cartDetailId] &&
                                                itemValidationErrors[cartItem.cartDetailId].includes(
                                                  'glAccountId',
                                                )
                                                ? 'is-invalid'
                                                : ''
                                            }
                                            disabled={
                                              submitted ||
                                              (!isCartEditable() &&
                                                [
                                                  'PENDING_APPROVAL',
                                                  'APPROVED',
                                                  'POGENERATED',
                                                ].includes(cartStatusType))
                                            }
                                          >
                                            <option value="">Select</option>
                                            {glAccounts.map((g) => (
                                              <option key={g.glAccountId} value={g.glAccountId}>
                                                {g.name}
                                              </option>
                                            ))}
                                          </Input>
                                        </Col>
                                      </Row>
                                    )}

                                    {settings.projectEnabled && (
                                      <Row className="align-items-center mb-2">
                                        <Col xs="4" className="text-end">
                                          <Label className="mb-0">Project</Label>
                                        </Col>
                                        <Col xs="8">
                                          <Input
                                            type="select"
                                            bsSize="sm"
                                            value={getDisplayValue(cartItem, 'projectId') || ''}
                                            onChange={(e) => {
                                              if (isCartEditable()) {
                                                handleLocalFieldChange(
                                                  cartItem.cartDetailId,
                                                  'projectId',
                                                  e.target.value,
                                                );
                                              } else {
                                                handleItemFieldChange(
                                                  cartItem.cartDetailId,
                                                  'projectId',
                                                  e.target.value,
                                                );
                                              }
                                            }}
                                            className={
                                              itemValidationErrors[cartItem.cartDetailId] &&
                                                itemValidationErrors[cartItem.cartDetailId].includes(
                                                  'projectId',
                                                )
                                                ? 'is-invalid'
                                                : ''
                                            }
                                            disabled={
                                              submitted ||
                                              (!isCartEditable() &&
                                                [
                                                  'PENDING_APPROVAL',
                                                  'APPROVED',
                                                  'POGENERATED',
                                                ].includes(cartStatusType))
                                            }
                                          >
                                            <option value="">Select</option>
                                            {projects.map((p) => (
                                              <option key={p.projectId} value={p.projectId}>
                                                {p.name}
                                              </option>
                                            ))}
                                          </Input>
                                        </Col>
                                      </Row>
                                    )}

                                    {settings.classEnabled && (
                                      <Row className="align-items-center mb-2">
                                        <Col xs="4" className="text-end">
                                          <Label className="mb-0">Class</Label>
                                        </Col>
                                        <Col xs="8">
                                          <Input
                                            type="select"
                                            bsSize="sm"
                                            value={getDisplayValue(cartItem, 'classId') || ''}
                                            onChange={(e) => {
                                              if (isCartEditable()) {
                                                handleLocalFieldChange(
                                                  cartItem.cartDetailId,
                                                  'classId',
                                                  e.target.value,
                                                );
                                              } else {
                                                handleItemFieldChange(
                                                  cartItem.cartDetailId,
                                                  'classId',
                                                  e.target.value,
                                                );
                                              }
                                            }}
                                            className={
                                              itemValidationErrors[cartItem.cartDetailId] &&
                                                itemValidationErrors[cartItem.cartDetailId].includes(
                                                  'classId',
                                                )
                                                ? 'is-invalid'
                                                : ''
                                            }
                                            disabled={
                                              submitted ||
                                              (!isCartEditable() &&
                                                [
                                                  'PENDING_APPROVAL',
                                                  'APPROVED',
                                                  'POGENERATED',
                                                ].includes(cartStatusType))
                                            }
                                          >
                                            <option value="">Select</option>
                                            {classes.map((c) => (
                                              <option key={c.classId} value={c.classId}>
                                                {c.name}
                                              </option>
                                            ))}
                                          </Input>
                                        </Col>
                                      </Row>
                                    )}

                                    {settings.locationEnabled && (
                                      <Row className="align-items-center mb-2">
                                        <Col xs="4" className="text-end">
                                          <Label className="mb-0">Location</Label>
                                        </Col>
                                        <Col xs="8">
                                          <Input
                                            type="select"
                                            bsSize="sm"
                                            value={getDisplayValue(cartItem, 'locationId') || ''}
                                            onChange={(e) => {
                                              if (isCartEditable()) {
                                                handleLocalFieldChange(
                                                  cartItem.cartDetailId,
                                                  'locationId',
                                                  e.target.value,
                                                );
                                              } else {
                                                handleItemFieldChange(
                                                  cartItem.cartDetailId,
                                                  'locationId',
                                                  e.target.value,
                                                );
                                              }
                                            }}
                                            className={
                                              itemValidationErrors[cartItem.cartDetailId] &&
                                                itemValidationErrors[cartItem.cartDetailId].includes(
                                                  'locationId',
                                                )
                                                ? 'is-invalid'
                                                : ''
                                            }
                                            disabled={
                                              submitted ||
                                              (!isCartEditable() &&
                                                [
                                                  'PENDING_APPROVAL',
                                                  'APPROVED',
                                                  'POGENERATED',
                                                ].includes(cartStatusType))
                                            }
                                          >
                                            <option value="">Select</option>
                                            {locations.map((l) => (
                                              <option key={l.locationId} value={l.locationId}>
                                                {l.name}
                                              </option>
                                            ))}
                                          </Input>
                                        </Col>
                                      </Row>
                                    )}
                                  </Col>
                                </Row>
                              </div>
                            </Col>
                          ))}

                        {/* Deleted Items Section */}
                        {isCartEditable() &&
                          items.some((item) => isItemDeleted(item.cartDetailId)) && (
                            <Row className="mt-4">
                              <Col md="12">
                                <div
                                  className="alert alert-warning"
                                  style={{
                                    backgroundColor: '#fff3cd',
                                    border: '1px solid #ffeaa7',
                                    borderRadius: '8px',
                                  }}
                                >
                                  <div className="d-flex align-items-center mb-2">
                                    <i
                                      className="bi bi-trash"
                                      style={{ fontSize: '16px', color: '#856404' }}
                                    ></i>
                                    <strong className="ms-2" style={{ color: '#856404' }}>
                                      Deleted Items
                                    </strong>
                                    <small className="ms-2 text-muted">
                                      (Click Undo to restore)
                                    </small>
                                  </div>
                                  {items
                                    .filter((item) => isItemDeleted(item.cartDetailId))
                                    .map((item) => (
                                      <div
                                        key={`deleted-${item.cartDetailId}`}
                                        className="d-flex align-items-center justify-content-between p-2 mb-2"
                                        style={{
                                          backgroundColor: '#f8f9fa',
                                          border: '1px solid #dee2e6',
                                          borderRadius: '4px',
                                        }}
                                      >
                                        <div className="d-flex align-items-center">
                                          <span
                                            style={{
                                              textDecoration: 'line-through',
                                              color: '#6c757d',
                                              fontSize: '14px',
                                            }}
                                          >
                                            {item.partDescription || 'Product'} (Part ID:{' '}
                                            {item.partId})
                                          </span>
                                        </div>
                                        <Button
                                          size="sm"
                                          color="warning"
                                          onClick={() => handleUndoDelete(item.cartDetailId)}
                                          style={{ fontSize: '12px', padding: '4px 12px' }}
                                        >
                                          <i className="bi bi-arrow-counterclockwise me-1"></i>
                                          Undo
                                        </Button>
                                      </div>
                                    ))}
                                </div>
                              </Col>
                            </Row>
                          )}
                      </Row>
                    </CardBody>
                  </Card>
                );
              })
            )}
            {visibleCartDetails.length > 5 && (
              <div className="d-flex justify-content-center mt-4">
                <Pagination size="sm" className="pagination">
                  <PaginationItem disabled={currentPage === 1}>
                    <PaginationLink first onClick={() => handlePageChange(1)} href="#" />
                  </PaginationItem>
                  <PaginationItem disabled={currentPage === 1}>
                    <PaginationLink
                      previous
                      onClick={() => handlePageChange(currentPage - 1)}
                      href="#"
                    />
                  </PaginationItem>
                  {pageNumbers
                    .slice(
                      Math.max(0, currentPage - 3),
                      Math.min(pageNumbers.length, currentPage + 2),
                    )
                    .map((number) => (
                      <PaginationItem key={number} active={number === currentPage}>
                        <PaginationLink onClick={() => handlePageChange(number)} href="#">
                          {number}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                  <PaginationItem disabled={currentPage === pageNumbers.length}>
                    <PaginationLink
                      next
                      onClick={() => handlePageChange(currentPage + 1)}
                      href="#"
                    />
                  </PaginationItem>
                  <PaginationItem disabled={currentPage === pageNumbers.length}>
                    <PaginationLink
                      last
                      onClick={() => handlePageChange(pageNumbers.length)}
                      href="#"
                    />
                  </PaginationItem>
                </Pagination>
              </div>
            )}
          </div>
        </Col>
        <Col md={4}>
          <div className="d-flex justify-content-end">
            <Modal isOpen={showModal} toggle={() => setShowModal(false)} centered size="lg">
              <ModalHeader toggle={() => setShowModal(false)}>Purchase Order Details</ModalHeader>
              <ModalBody style={{ maxHeight: '500px', overflow: 'auto' }}>
                {poLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2 text-muted">Loading purchase order...</p>
                  </div>
                ) : modalPurchaseOrders && modalPurchaseOrders.length > 0 ? (
                  <div className="po-list">
                    <div className="table-responsive">
                      <Table
                        striped
                        hover
                        style={{ width: '100%', margin: '0', fontSize: '0.85rem' }}
                      >
                        <thead>
                          <tr>
                            <th style={{ padding: '8px', whiteSpace: 'nowrap', width: '15%' }}>
                              Order No
                            </th>
                            <th style={{ padding: '8px', whiteSpace: 'nowrap', width: '20%' }}>
                              Supplier
                            </th>
                            <th style={{ padding: '8px', whiteSpace: 'nowrap', width: '18%' }}>
                              Status
                            </th>
                            <th style={{ padding: '8px', whiteSpace: 'nowrap', width: '15%' }}>
                              Amount
                            </th>
                            <th style={{ padding: '8px', whiteSpace: 'nowrap', width: '15%' }}>
                              Delivery Date
                            </th>
                            <th style={{ padding: '8px', whiteSpace: 'nowrap', width: '17%' }}>
                              Buyer
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {modalPurchaseOrders.map((po) => {
                            const getStatusBadge = (status) => {
                              const statusColors = {
                                PARTIALLY_CONFIRMED: 'warning',
                                CONFIRMED: 'success',
                                SUBMITTED: 'info',
                                PENDING_APPROVAL: 'secondary',
                                APPROVED: 'primary',
                                REJECTED: 'danger',
                              };
                              return statusColors[status] || 'secondary';
                            };

                            return (
                              <tr
                                key={po.PurchaseOrderId}
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  setShowModal(false);
                                  const navigationFn = () =>
                                    navigate(`/purchase-order-detail/${po.PurchaseOrderId}`, {
                                      state: {
                                        fromcartDetails: true,
                                        cartId,
                                        shipToAddressId,
                                        companyId,
                                      },
                                    });
                                  handleNavigationWithConfirmation(navigationFn);
                                }}
                              >
                                <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                                  {po.orderNo}
                                </td>

                                <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                                  <div style={{ fontSize: '0.85rem' }}>
                                    <div>{(po.supplier && po.supplier.name) || '-'}</div>
                                    {po.supplier && po.supplier.displayName && (
                                      <small style={{ color: '#6c757d' }}>
                                        ({po.supplier.displayName})
                                      </small>
                                    )}
                                  </div>
                                </td>

                                <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                                  <span
                                    className={`badge bg-${getStatusBadge(po.orderStatus)}`}
                                    style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                                  >
                                    {po.orderStatus?.replace('_', ' ') || '-'}
                                  </span>
                                </td>

                                <td
                                  style={{
                                    padding: '8px',
                                    verticalAlign: 'middle',
                                    fontWeight: '500',
                                  }}
                                >
                                  ${po.orderAmount?.toLocaleString() || '0.00'}
                                </td>

                                <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                                  {po.deliveryDate
                                    ? new Date(po.deliveryDate).toLocaleDateString()
                                    : '-'}
                                </td>

                                <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                                  {po.buyerUser
                                    ? `${po.buyerUser.firstName} ${po.buyerUser.lastName}`
                                    : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>

                    {poTotalElements > poPageSize && (
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                          Showing {modalPurchaseOrders.length} of {poTotalElements} orders
                        </div>
                        <Pagination size="sm">
                          <PaginationItem disabled={poCurrentPage === 0}>
                            <PaginationLink first onClick={() => fetchPaginatedPurchaseOrders(0)} />
                          </PaginationItem>
                          <PaginationItem disabled={poCurrentPage === 0}>
                            <PaginationLink
                              previous
                              onClick={() => fetchPaginatedPurchaseOrders(poCurrentPage - 1)}
                            />
                          </PaginationItem>

                          {(() => {
                            const totalPages = Math.ceil(poTotalElements / poPageSize);
                            const startPage = Math.max(0, poCurrentPage - 2);
                            const endPage = Math.min(totalPages - 1, poCurrentPage + 2);
                            const pages = [];

                            for (let i = startPage; i <= endPage; i++) {
                              pages.push(
                                <PaginationItem key={i} active={i === poCurrentPage}>
                                  <PaginationLink onClick={() => fetchPaginatedPurchaseOrders(i)}>
                                    {i + 1}
                                  </PaginationLink>
                                </PaginationItem>,
                              );
                            }
                            return pages;
                          })()}

                          <PaginationItem
                            disabled={poCurrentPage >= Math.ceil(poTotalElements / poPageSize) - 1}
                          >
                            <PaginationLink
                              next
                              onClick={() => fetchPaginatedPurchaseOrders(poCurrentPage + 1)}
                            />
                          </PaginationItem>
                          <PaginationItem
                            disabled={poCurrentPage >= Math.ceil(poTotalElements / poPageSize) - 1}
                          >
                            <PaginationLink
                              last
                              onClick={() =>
                                fetchPaginatedPurchaseOrders(
                                  Math.ceil(poTotalElements / poPageSize) - 1,
                                )
                              }
                            />
                          </PaginationItem>
                        </Pagination>
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: '12px',
                        padding: '10px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                      }}
                    >
                      <div className="row">
                        <div className="col-4">
                          <strong>Total Orders:</strong> {poTotalElements}
                        </div>
                        <div className="col-4">
                          <strong>Page:</strong> {poCurrentPage + 1} of{' '}
                          {Math.ceil(poTotalElements / poPageSize)}
                        </div>
                        <div className="col-4">
                          <strong>Cart:</strong> {modalPurchaseOrders[0]?.cart?.cartNo || '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#6c757d' }}>
                    <p>No purchase orders available</p>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="secondary" onClick={() => setShowModal(false)}>
                  Close
                </Button>
              </ModalFooter>
            </Modal>
          </div>
          {approvals && approvals.length > 0 && (
            <Card className="shadow-sm mb-4" style={{ borderRadius: '12px', border: 'none' }}>
              <CardBody className="p-4">
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <div className="d-flex align-items-center">
                    <i
                      className="bi bi-check-circle me-2"
                      style={{ color: '#009efb', fontSize: '20px' }}
                    ></i>
                    <h5 className="mb-0" style={{ color: '#009efb', fontWeight: '600' }}>
                      Approval Workflow
                    </h5>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted" style={{ fontSize: '13px' }}>
                      Progress:
                    </span>
                    <span className="fw-semibold" style={{ color: '#495057', fontSize: '13px' }}>
                      {approvals.filter((a) => a.approvalDecision === 'approved').length} of{' '}
                      {approvals.length} completed
                    </span>
                  </div>
                </div>

                {/* Approval Process Start Date */}
                {approvals.length > 0 && approvals[0].createdDate && (
                  <div
                    className="d-flex align-items-center mb-3 px-2 py-1 rounded"
                    style={{ backgroundColor: '#f8f9fa', fontSize: '12px' }}
                  >
                    <i
                      className="bi bi-calendar-event me-1 text-info"
                      style={{ fontSize: '12px' }}
                    ></i>
                    <span className="text-muted me-1">Started:</span>
                    <span className="fw-medium" style={{ color: '#495057' }}>
                      {new Date(approvals[0].createdDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}

                <div className="position-relative">
                  {/* Progress line */}
                  <div
                    className="position-absolute"
                    style={{
                      left: '19px',
                      top: '45px',
                      bottom: '0',
                      width: '2px',
                      background: `linear-gradient(to bottom, #28a745 0%, #28a745 ${(approvals.filter((a) => a.approvalDecision === 'approved').length /
                        approvals.length) *
                        100
                        }%, #e9ecef ${(approvals.filter((a) => a.approvalDecision === 'approved').length /
                          approvals.length) *
                        100
                        }%, #e9ecef 100%)`,
                    }}
                  ></div>

                  {approvals.map((approval, index) => (
                    <div key={approval.orderOfApproval} className="d-flex mb-4 position-relative">
                      <div
                        className={`rounded-circle d-flex align-items-center justify-content-center position-relative ${approval.approvalDecision === 'approved'
                          ? 'bg-success'
                          : approval.approvalDecision === 'pending'
                            ? 'bg-warning'
                            : approval.approvalDecision === 'rejected'
                              ? 'bg-danger'
                              : 'bg-light border'
                          }`}
                        style={{
                          width: '40px',
                          height: '40px',
                          zIndex: 2,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                      >
                        {approval.approvalDecision === 'approved' ? (
                          <i className="bi bi-check-lg text-white" style={{ fontSize: '16px' }}></i>
                        ) : approval.approvalDecision === 'rejected' ? (
                          <i className="bi bi-x-lg text-white" style={{ fontSize: '16px' }}></i>
                        ) : approval.approvalDecision === 'pending' ? (
                          <i className="bi bi-clock text-dark" style={{ fontSize: '14px' }}></i>
                        ) : (
                          <span className="text-muted fw-bold" style={{ fontSize: '12px' }}>
                            {index + 1}
                          </span>
                        )}
                      </div>

                      <div className="ms-3 flex-grow-1">
                        <div
                          className="p-3 rounded"
                          style={{
                            background:
                              approval.approvalDecision === 'approved'
                                ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
                                : approval.approvalDecision === 'pending'
                                  ? 'linear-gradient(135deg, #fffbeb, #fef3c7)'
                                  : approval.approvalDecision === 'rejected'
                                    ? 'linear-gradient(135deg, #fef2f2, #fecaca)'
                                    : 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
                            border: `1px solid ${approval.approvalDecision === 'approved'
                              ? '#bbf7d0'
                              : approval.approvalDecision === 'pending'
                                ? '#fde68a'
                                : approval.approvalDecision === 'rejected'
                                  ? '#fca5a5'
                                  : '#e5e7eb'
                              }`,
                          }}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <div>
                              <h6 className="mb-0" style={{ color: '#000', fontWeight: '600' }}>
                                {approval.user.title ? `${approval.user.title} ` : ''}
                                {approval.user.firstName} {approval.user.lastName}
                              </h6>
                              <div
                                className="text-muted"
                                style={{
                                  fontSize: '12px',
                                  wordBreak: 'break-word',
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                {approval.user.email}
                              </div>
                            </div>
                            <span
                              className={`badge ${approval.approvalDecision === 'approved'
                                ? 'bg-success'
                                : approval.approvalDecision === 'pending'
                                  ? 'bg-warning text-dark'
                                  : approval.approvalDecision === 'rejected'
                                    ? 'bg-danger'
                                    : 'bg-secondary'
                                }`}
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                            >
                              {formatStatusText(approval.approvalDecision || 'awaiting')}
                            </span>
                          </div>

                          <div className="mb-2">
                            <div>
                              <small className="text-muted">Approval Order:</small>
                              <span
                                className="fw-medium ms-2"
                                style={{ fontSize: '13px', color: '#000' }}
                              >
                                {approval.orderOfApproval}
                              </span>
                            </div>
                          </div>

                          {approval.approvalDecision === 'approved' &&
                            approval.approvalDecisionDate && (
                              <div
                                className="d-flex align-items-center mt-2 pt-2 border-top"
                                style={{ borderColor: '#bbf7d0 !important' }}
                              >
                                <i
                                  className="bi bi-calendar-check me-2 text-success"
                                  style={{ fontSize: '14px' }}
                                ></i>
                                <small className="text-success fw-medium">
                                  Approved on{' '}
                                  {new Date(approval.approvalDecisionDate).toLocaleDateString(
                                    'en-US',
                                    {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    },
                                  )}
                                </small>
                              </div>
                            )}

                          {approval.approvalDecision === 'rejected' &&
                            approval.approvalDecisionDate && (
                              <div
                                className="d-flex align-items-center mt-2 pt-2 border-top"
                                style={{ borderColor: '#fca5a5 !important' }}
                              >
                                <i
                                  className="bi bi-calendar-x me-2 text-danger"
                                  style={{ fontSize: '14px' }}
                                ></i>
                                <small className="text-danger fw-medium">
                                  Rejected on{' '}
                                  {new Date(approval.approvalDecisionDate).toLocaleDateString(
                                    'en-US',
                                    {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    },
                                  )}
                                </small>
                              </div>
                            )}

                          {approval.rules && approval.rules.length > 0 && (
                            <div className="mt-2 pt-2 border-top">
                              <small className="text-muted">Approval Rules:</small>
                              <ul className="list-unstyled mb-0 mt-1">
                                {approval.rules.map((rule) => (
                                  <li
                                    key={rule.approvalPolicyRuleId}
                                    className="d-flex align-items-center"
                                  >
                                    <i
                                      className="bi bi-arrow-right me-2 text-muted"
                                      style={{ fontSize: '12px' }}
                                    ></i>
                                    <small style={{ color: '#000' }}>{rule.name}</small>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {previousQueries.length > 0 && (
            <Card
              className="shadow-sm mb-4"
              style={{ borderRadius: '8px', border: '1px solid #e9ecef' }}
            >
              <CardBody className="p-0">
                <div className="p-3 border-bottom" style={{ backgroundColor: '#f8f9fa' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <i
                        className="bi bi-chat-dots me-2"
                        style={{ color: '#495057', fontSize: '18px' }}
                      ></i>
                      <h5 className="mb-0" style={{ color: '#495057', fontWeight: '600' }}>
                        Project Queries
                      </h5>
                      <span className="badge bg-secondary ms-2" style={{ fontSize: '11px' }}>
                        {
                          previousQueries.filter((q) => !q.queryText?.includes('Resolved by'))
                            .length
                        }{' '}
                        Active
                      </span>
                    </div>
                    <button
                      className="btn btn-outline-primary btn-sm"
                      type="button"
                      disabled={disableResolveBtn}
                      onClick={() => setIsResolveModalOpen(true)}
                      style={{
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '13px',
                      }}
                    >
                      <i className="bi bi-check-circle me-1"></i>
                      Mark as Resolved
                    </button>
                  </div>
                </div>

                <div className="p-3" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {previousQueries.map((query) => {
                    const { queryText: text, fileId } = query;
                    const resolvedByIndex = text.indexOf('Resolved by');
                    const dashIndex =
                      resolvedByIndex !== -1 ? text.lastIndexOf('-', resolvedByIndex) : -1;
                    const isResolved = resolvedByIndex !== -1;

                    let queryText = text;
                    let resolvedText = '';

                    if (resolvedByIndex !== -1 && dashIndex !== -1) {
                      queryText = text.slice(0, dashIndex).trim();
                      resolvedText = text.slice(dashIndex + 1).trim();
                    }

                    return (
                      <div
                        key={query.timestamp}
                        className="mb-3 p-3 border rounded"
                        style={{
                          fontSize: '14px',
                          backgroundColor: isResolved ? '#f8f9fa' : '#ffffff',
                          borderColor: '#dee2e6',
                        }}
                      >
                        <div className="d-flex align-items-start justify-content-between mb-2">
                          <div className="d-flex align-items-center">
                            <i
                              className={`bi ${isResolved ? 'bi-check-circle-fill' : 'bi-person-circle'
                                } me-2`}
                              style={{
                                color: isResolved ? '#28a745' : '#009efb',
                                fontSize: '16px',
                              }}
                            ></i>
                            <div className="d-flex align-items-center">
                              <strong style={{ color: '#495057', fontSize: '14px' }}>
                                {query.userName}
                              </strong>
                              <small className="text-muted ms-2" style={{ fontSize: '12px' }}>
                                {new Date(query.timestamp).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </small>
                              {isResolved && (
                                <span
                                  className="badge bg-success ms-2"
                                  style={{ fontSize: '10px' }}
                                >
                                  Resolved
                                </span>
                              )}
                            </div>
                          </div>

                          {fileId && (
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              style={{
                                fontSize: '11px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                              }}
                              onClick={() => handleFileDownload(fileId)}
                              title="Download attachment"
                            >
                              <FaDownload className="me-1" />
                              File
                            </button>
                          )}
                        </div>

                        <div className="query-content">
                          <div
                            className="mb-2"
                            style={{
                              color: '#495057',
                              fontSize: '13px',
                              lineHeight: '1.5',
                            }}
                          >
                            {queryText}
                          </div>

                          {resolvedText && (
                            <div
                              className="mt-2 p-2 rounded"
                              style={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6' }}
                            >
                              <div className="d-flex align-items-center mb-1">
                                <i
                                  className="bi bi-check-circle me-2"
                                  style={{ fontSize: '12px', color: '#6c757d' }}
                                ></i>
                                <small
                                  className="fw-medium"
                                  style={{ fontSize: '11px', color: '#495057' }}
                                >
                                  Resolution
                                </small>
                              </div>
                              <small style={{ fontSize: '12px', color: '#6c757d' }}>
                                {resolvedText}
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 border-top" style={{ backgroundColor: '#f8f9fa' }}>
                  {attachedFileName && (
                    <div
                      className="mb-3 p-2 rounded bg-info d-flex align-items-center"
                      style={{
                        backgroundColor: 'rgba(13, 202, 240, 0.1)',
                        border: '1px solid rgba(13, 202, 240, 0.3)',
                      }}
                    >
                      <i className="bi bi-paperclip me-2 text-info"></i>
                      <span style={{ fontSize: '13px', color: '#0c5460' }}>{attachedFileName}</span>
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.target.querySelector('input[type="text"]');
                      const text = input.value.trim();
                      if (text) {
                        handleQuerySubmit(text);
                        input.value = '';
                        resetFileInput();
                      }
                    }}
                  >
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Type your question or concern..."
                        aria-label="Query input"
                        style={{
                          fontSize: '14px',
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => fileInputRef.current.click()}
                        title="Attach a file"
                      >
                        <FaFileUpload />
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={disableResolveBtn}
                        style={{
                          fontSize: '14px',
                        }}
                      >
                        <i className="bi bi-send me-1"></i>
                        Submit
                      </button>
                    </div>
                    <input
                      key={fileInputKey}
                      type="file"
                      ref={fileInputRef}
                      className="d-none"
                      onChange={handleFileChange}
                    />
                  </form>
                </div>
              </CardBody>
            </Card>
          )}
          <Modal isOpen={modalOpen} toggle={toggleModal}>
            <ModalHeader toggle={toggleModal}>Approval Preview</ModalHeader>
            <ModalBody>
              <div className="card shadow-sm p-3">
                <h5 className="mb-4">Approval Status</h5>
                <div className="d-flex flex-column">
                  {approvalPreviewData.map((approval) => (
                    <div key={approval.orderOfApproval} className="d-flex mb-4 position-relative">
                      <div
                        className={`rounded-circle d-flex align-items-center justify-content-center ${approval.approvalDecision === 'approved'
                          ? 'bg-success text-white'
                          : approval.approvalDecision === 'pending'
                            ? 'bg-warning text-dark'
                            : 'bg-primary text-white'
                          }`}
                        style={{ width: '20px', height: '20px', zIndex: 1 }}
                      >
                        {approval.approvalDecision === 'approved' && (
                          <i className="bi bi-check-lg"></i>
                        )}
                      </div>
                      <div className="ms-3 flex-grow-1">
                        <h6 className="mb-1">
                          {approval.user.title} {approval.user.firstName} {approval.user.lastName}
                        </h6>
                        <p className="mb-1 small text-muted" style={{ fontSize: '12px' }}>
                          {approval.user.email}
                        </p>
                        <p className="mb-1 small text-muted">
                          <strong>Status: </strong>
                          <span
                            className={`fw-bold ${approval.approvalDecision === 'approved'
                              ? 'text-success'
                              : approval.approvalDecision === 'pending'
                                ? 'text-warning'
                                : 'text-primary'
                              }`}
                          >
                            {approval.approvalDecision.toUpperCase()}
                          </span>
                        </p>
                        {approval.approvalDecision === 'approved' &&
                          approval.approvalDecisionDate && (
                            <p className="mb-1 small text-muted">
                              Approved on:{' '}
                              {new Date(approval.approvalDecisionDate).toLocaleString()}
                            </p>
                          )}
                        {approval.rules && approval.rules.length > 0 && (
                          <div className="small text-muted mb-0">
                            <strong>Rule Applicable:</strong>{' '}
                            {approval.rules.map((rule) => rule.name).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" onClick={toggleModal}>
                Close
              </Button>
              <Button color="primary" onClick={handleApproverCartSubmit}>
                Submit Cart
              </Button>
            </ModalFooter>
          </Modal>
          {redirectToDashboard && (
            <div className="mt-3 d-flex justify-content-end">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => handleNavigationWithConfirmation(() => navigate('/dashboard'))}
              >
                Back
              </button>
            </div>
          )}
        </Col>
      </Row>
      {userNames && (
        <MarkResolvedModal
          isOpen={isResolveModalOpen}
          toggle={toggleResolvedModal}
          onSubmit={handleMarkAsResolved}
          currentUser={userNames}
        />
      )}
      {manualModalOpen && manualModalData && (
        <ManualProductModal
          isOpen={manualModalOpen}
          onClose={() => {
            setManualModalOpen(false);
            setManualModalData(null);
          }}
          onSave={handleManualSave}
          initialData={manualModalData}
        />
      )}



      {!['DRAFT'].includes(cartStatusType) && (
        <Modal
          isOpen={showConfirmationModal}
          toggle={() => setShowConfirmationModal(false)}
          centered
          size="sm"
        >
          <ModalHeader toggle={() => setShowConfirmationModal(false)} className="pb-2">
            <i className="bi bi-exclamation-triangle text-warning me-2"></i>
            Cart Changes
          </ModalHeader>
          <ModalBody className="py-3">
            <div className="text-center">
              <i className="bi bi-cart-check mb-2" style={{ fontSize: '32px', color: '#ffc107' }}></i>
              <p className="mb-3" style={{ fontSize: '14px' }}>
                Cart modified. Keep changes?
              </p>
              <div className="alert alert-info py-2 mb-0" style={{ fontSize: '12px' }}>
                <i className="bi bi-info-circle me-1"></i>
                {isReapprovalNeeded() ? 'Reapproval required.' : 'No reapproval needed.'}
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="pt-2">
            <Button
              color="secondary"
              size="sm"
              onClick={handleCancelChanges}
              data-modal-action="cancel"
            >
              <i className="bi bi-x-circle me-1"></i>
              Discard
            </Button>
            <Button
              color="primary"
              size="sm"
              onClick={handleConfirmChanges}
              data-modal-action="confirm"
            >
              <i className="bi bi-check-circle me-1"></i>
              {isReapprovalNeeded() ? 'Keep & Reapprove' : 'Save Changes'}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* DRAFT Status Confirmation Modal - Separate from general confirmation modal */}
      <Modal
        isOpen={showDraftConfirmationModal}
        toggle={() => setShowDraftConfirmationModal(false)}
        centered
        size="md"
      >
        <ModalHeader
          toggle={() => setShowDraftConfirmationModal(false)}
          className="pb-2"
          style={{
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e9ecef'
          }}
        >
          <div className="d-flex align-items-center">
            <div className="bg-warning bg-gradient rounded d-flex align-items-center justify-content-center me-3"
              style={{ width: '36px', height: '36px' }}>
              <i className="bi bi-exclamation-triangle-fill text-white" style={{ fontSize: '18px' }}></i>
            </div>
            <div>
              <h5 className="mb-0" style={{ color: '#495057', fontWeight: '600' }}>
                Save Draft Changes?
              </h5>
              <small className="text-muted">Your cart has unsaved modifications</small>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="py-4">
          <div className="text-center mb-3">
            <i className="bi bi-cart-check mb-3" style={{ fontSize: '48px', color: '#ffc107' }}></i>
            <h6 className="mb-3" style={{ color: '#495057' }}>
              You have unsaved changes in your draft cart
            </h6>

            <div className="alert alert-light border mb-4" style={{ backgroundColor: '#f8f9fa' }}>
              <div className="d-flex align-items-center mb-2">
                <i className="bi bi-info-circle me-2 text-primary"></i>
                <small className="fw-semibold" style={{ color: '#495057' }}>
                  Changes Summary
                </small>
              </div>
              <div className="text-start">
                {(() => {
                  const changesSummary = calculateDraftChangesSummary();
                  return (
                    <>
                      {changesSummary.modifiedItems > 0 && (
                        <div className="d-flex justify-content-between mb-1">
                          <small className="text-muted">Modified items:</small>
                          <small className="fw-semibold">{changesSummary.modifiedItems}</small>
                        </div>
                      )}
                      {changesSummary.deletedItems > 0 && (
                        <div className="d-flex justify-content-between mb-1">
                          <small className="text-muted">Deleted items:</small>
                          <small className="fw-semibold text-danger">{changesSummary.deletedItems}</small>
                        </div>
                      )}
                      {changesSummary.priceChanges > 0 && (
                        <div className="d-flex justify-content-between mb-1">
                          <small className="text-muted">Price updates:</small>
                          <small className="fw-semibold text-success">{changesSummary.priceChanges}</small>
                        </div>
                      )}
                      <div className="d-flex justify-content-between mt-2 pt-2 border-top">
                        <small className="text-muted">Total changes:</small>
                        <small className="fw-bold" style={{ color: '#009efb' }}>
                          {Object.keys(localCartChanges).length}
                        </small>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <p className="mb-0" style={{ fontSize: '14px', color: '#6c757d' }}>
              What would you like to do with these changes?
            </p>
          </div>
        </ModalBody>

        <ModalFooter className="pt-2 border-top">
          <Button
            color="outline-secondary"
            size="sm"
            onClick={() => handleDiscardDraftChanges()}
            style={{
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            <i className="bi bi-trash me-1"></i>
            Discard All
          </Button>

          <Button
            color="outline-primary"
            size="sm"
            onClick={() => setShowDraftConfirmationModal(false)}
            style={{
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              borderColor: '#dee2e6',
            }}
          >
            <i className="bi bi-pencil me-1"></i>
            Continue Editing
          </Button>

          <Button
            color="primary"
            size="sm"
            onClick={() => handleSaveDraftChanges()}
            style={{
              borderRadius: '6px',
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
              border: 'none',
            }}
          >
            <i className="bi bi-save me-1"></i>
            Save Changes
          </Button>
        </ModalFooter>
      </Modal>

      <AddSupplierModal
        isOpen={isAddSupplierModalOpen || false}
        toggle={() => setIsAddSupplierModalOpen(false)}
        onSave={handleSaveSupplier}
      />
      {/* Only render AddProductModal when cart is in DRAFT status */}
      {cartStatusType === 'DRAFT' && (
        <AddProductModal
          isOpen={isAddProductModalOpen || false}
          toggle={() => setIsAddProductModalOpen(false)}
          onAddProduct={handleAddNewProduct}
          departments={departments}
          glAccounts={glAccounts}
          projects={projects}
          classes={classes}
          locations={locations}
          suppliers={suppliers}
          defaultDepartmentId={
            selectedDepartmentId ||
            (cartHeaderData && cartHeaderData.departmentId) ||
            (window.firstCartItemSettings && window.firstCartItemSettings.departmentId) ||
            null
          }
          defaultGlAccountId={
            selectedGlAccountId ||
            (cartHeaderData && cartHeaderData.glAccountId) ||
            (window.firstCartItemSettings && window.firstCartItemSettings.glAccountId) ||
            null
          }
          defaultProjectId={
            selectedProjectId ||
            (cartHeaderData && cartHeaderData.projectId) ||
            (window.firstCartItemSettings && window.firstCartItemSettings.projectId) ||
            null
          }
          defaultClassId={
            selectedClassId ||
            (cartHeaderData && cartHeaderData.classId) ||
            (window.firstCartItemSettings && window.firstCartItemSettings.classId) ||
            null
          }
          defaultLocationId={
            selectedLocationId ||
            (cartHeaderData && cartHeaderData.locationId) ||
            (window.firstCartItemSettings && window.firstCartItemSettings.locationId) ||
            null
          }
          defaultSupplierId={
            selectedSupplierId ||
            (cartHeaderData && cartHeaderData.supplierId) ||
            (window.firstCartItemSettings && window.firstCartItemSettings.supplierId) ||
            null
          }
          settings={settings}
        />
      )}

      {/* Budget Validation Preview Modal */}
      <BudgetValidationPreview
        isOpen={showBudgetValidation}
        toggle={() => setShowBudgetValidation(false)}
        cartItems={budgetValidationCartItems || memoizedCartItems}
        cartHeaderData={cartHeaderData}
        onValidationComplete={handleBudgetValidationComplete}
      />

      {/* Cart History Timeline Modal */}
      <CartHistoryTimeline
        isOpen={showCartHistory}
        toggle={() => setShowCartHistory(false)}
        cartId={cartId}
        companyId={companyId}
      />
    </div>
  );
};

export default CartDetails;