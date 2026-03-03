import React, { useState, useEffect, useMemo } from 'react';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Label, Row, Col, Card, CardBody, Badge, Input } from 'reactstrap';
import { useParams, useNavigate } from 'react-router-dom';
// eslint-disable-next-line import/no-extraneous-dependencies
import Rating from 'react-rating';
import PurchaseOrderService from '../../services/PurchaseOrderService';
import ApprovalPolicyManagementService from '../../services/ApprovalPolicyManagementService';
import { getEntityId, getUserId, getUserName, getUserRole, formatCurrency, getCompanyCurrency, getCurrencySymbol } from '../localStorageUtil';
import {
  formatDualCurrency,
  formatDualCurrencyTotal,
  getUserType,
  convertCurrency,
} from '../../utils/currencyUtils';
import CompanyService from '../../services/CompanyService';
import FileUploadService from '../../services/FileUploadService';
import ApprovalsService from '../../services/ApprovalsService';
import FeedBackService from '../../services/FeedBackService';
import CartService from '../../services/CartService';
import ApproverService from '../../services/ApproverService';
import BudgetValidationPreview from '../../components/BudgetValidation/BudgetValidationPreview';
import PurchaseOrderHistoryTimeline from '../../components/PurchaseOrderHistoryTimeline/PurchaseOrderHistoryTimeline';

const PurchaseOrderDetail = () => {
  const { purchaseOrderId } = useParams();
  const approverId = getUserId();
  const navigate = useNavigate();
  const companyId = getEntityId();
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState([]);

  // Pagination state for purchase order browsing
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoadingNavigation, setIsLoadingNavigation] = useState(false);
  const pageSize = 1; // Single order per page
  const approvalType = 'purchase_order';
  const [settings, setSettings] = useState({
    gLAccountEnabled: '',
    departmentEnabled: '',
    projectEnabled: '',
    locationEnabled: '',
    classEnabled: '',
  });
  const [approvalNotes, setApprovalNotes] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState(null);

  const userRole = getUserRole();

  // Check if user has specific roles
  const hasReceiverRole = Array.isArray(userRole) ?
    (userRole.includes('RECEIVER') || userRole.includes('COMPANY_ADMIN')) :
    (userRole === 'RECEIVER' || userRole === 'COMPANY_ADMIN');
  const hasAccountPayableRole = Array.isArray(userRole) ?
    (userRole.includes('ACCOUNT_PAYABLE') || userRole.includes('COMPANY_ADMIN')) :
    (userRole === 'ACCOUNT_PAYABLE' || userRole === 'COMPANY_ADMIN');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCreateGrnModal, setShowCreateGrnModal] = useState(false);
  const [selectedGrnFile, setSelectedGrnFile] = useState(null);
  const [grnFileUploading, setGrnFileUploading] = useState(false);
  const [showReapprovalModal, setShowReapprovalModal] = useState(false);
  const [showPOHistory, setShowPOHistory] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState(new Set());
  const [ratings, setRatings] = useState({
    deliveryPerformanceRating: 0,
    qualityRating: 0,
    pricingCostTransparencyRating: 0,
    communicationResponsivenessRating: 0,
    overallRating: 0,
    notes: '',
  });

  // Local PO editing state - similar to CartDetails
  const [localPOChanges, setLocalPOChanges] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [originalPOAmount, setOriginalPOAmount] = useState(0);
  // Real-time converted prices for edited items
  const [convertedPrices, setConvertedPrices] = useState({});

  // Budget validation state
  const [showBudgetValidation, setShowBudgetValidation] = useState(false);
  const [budgetValidationPOItems, setBudgetValidationPOItems] = useState(null);

  // Company-side confirmation state (for draft suppliers)
  const [showOrderConfirmModal, setShowOrderConfirmModal] = useState(false);
  const [confirmQuantities, setConfirmQuantities] = useState({});
  const [isConfirming, setIsConfirming] = useState(false);

  // Forward declarations to resolve hoisting issues
  let fetchPurchaseOrder;
  let handleApprove;
  let fetchApprovals;

  // formatCurrency is imported from localStorageUtil and uses company currency

  // Helper function to check if PO is editable
  const isPOEditable = () => {
    return purchaseOrder && ['PENDING_APPROVAL', 'CREATED', 'REJECTED'].includes(purchaseOrder.orderStatus);
  };

  // Check if budget validation should be shown
  const shouldShowBudgetValidation = () => {
    const hasAmountChanges = Object.values(localPOChanges).some(changes =>
      changes.quantity !== undefined || changes.unitPrice !== undefined
    );
    return hasAmountChanges;
  };

  // Check if amounts have changed (for reapproval decision)
  const hasAmountChanges = () => {
    return Object.values(localPOChanges).some(changes =>
      changes.quantity !== undefined || changes.unitPrice !== undefined
    );
  };

  // Check if supplier is a draft (internal) supplier
  const isDraftSupplier = () => {
    return purchaseOrder?.supplier?.supplierStatus === 'draft';
  };

  // Check if PO is in a status that can be confirmed
  const canBeConfirmed = () => {
    const confirmableStatuses = ['APPROVED', 'SUBMITTED', 'PARTIALLY_CONFIRMED'];
    return confirmableStatuses.includes(purchaseOrder?.orderStatus);
  };

  // Check if there are items remaining to be confirmed
  const hasItemsToConfirm = () => {
    return purchaseOrder?.orderItemDetails?.some((item) => {
      if (!item.isActive) return false;
      const remaining = Math.max(0, (item.quantity || 0) - (item.quantityConfirmed || 0));
      return remaining > 0;
    });
  };

  // Check if company user can confirm this order (draft supplier + confirmable status + items to confirm)
  const canCompanyConfirmOrder = () => {
    return isDraftSupplier() && canBeConfirmed() && hasItemsToConfirm();
  };

  // Initialize confirmation quantities when modal opens
  const initializeConfirmQuantities = () => {
    const quantities = {};
    purchaseOrder?.orderItemDetails?.forEach((item) => {
      if (!item.isActive) return;
      const remaining = Math.max(0, (item.quantity || 0) - (item.quantityConfirmed || 0));
      quantities[item.purchaseOrderDetailId] = remaining;
    });
    setConfirmQuantities(quantities);
  };

  // Handle confirm quantity change
  const handleConfirmQuantityChange = (e, itemId, maxRemaining) => {
    const { value } = e.target;
    const inputQty = parseInt(value, 10) || 0;

    // Validate: cannot exceed remaining quantity
    if (inputQty > maxRemaining) {
      toast.warning(`Cannot confirm more than ${maxRemaining} units for this item.`);
      setConfirmQuantities(prev => ({
        ...prev,
        [itemId]: maxRemaining,
      }));
    } else if (inputQty < 0) {
      setConfirmQuantities(prev => ({
        ...prev,
        [itemId]: 0,
      }));
    } else {
      setConfirmQuantities(prev => ({
        ...prev,
        [itemId]: inputQty,
      }));
    }
  };

  // Confirm all remaining quantities
  const handleConfirmAll = () => {
    const quantities = {};
    purchaseOrder?.orderItemDetails?.forEach((item) => {
      if (!item.isActive) return;
      const remaining = Math.max(0, (item.quantity || 0) - (item.quantityConfirmed || 0));
      quantities[item.purchaseOrderDetailId] = remaining;
    });
    setConfirmQuantities(quantities);
  };

  // Handle order confirmation submission
  const handleConfirmOrderSubmit = async () => {
    // Filter items that have quantities to confirm
    const itemsToConfirm = purchaseOrder?.orderItemDetails?.filter((item) => {
      const confirmQty = confirmQuantities[item.purchaseOrderDetailId] || 0;
      return confirmQty > 0 && item.isActive;
    });

    if (!itemsToConfirm || itemsToConfirm.length === 0) {
      toast.warning('Please enter at least one quantity to confirm.');
      return;
    }

    setIsConfirming(true);

    try {
      const confirmationData = {
        confirmationDate: new Date().toISOString(),
        estimatedDate: new Date().toISOString(),
        company: {
          companyId: purchaseOrder.company?.companyId || companyId,
          name: purchaseOrder.company?.name || purchaseOrder.company?.displayName || 'Company',
          displayName: purchaseOrder.company?.displayName || purchaseOrder.company?.name || 'Company',
        },
        purchaseOrder: {
          purchaseOrderId: Number(purchaseOrderId),
          orderNo: purchaseOrder.orderNo,
        },
        supplier: {
          supplierId: purchaseOrder.supplier?.supplierId,
          name: purchaseOrder.supplier?.name || purchaseOrder.supplier?.displayName || 'Supplier',
          displayName: purchaseOrder.supplier?.displayName || purchaseOrder.supplier?.name || 'Supplier',
        },
        notes: 'Confirmed by company user (draft supplier)',
        isActive: true,
        orderItemDetails: itemsToConfirm.map((item) => ({
          purchaseOrderDetail: {
            purchaseOrderDetailId: item.purchaseOrderDetailId,
            partId: item.partId || 'N/A',
            partDescription: item.partDescription || 'N/A',
          },
          qtyConfirmed: confirmQuantities[item.purchaseOrderDetailId] || 0,
          isActive: true,
        })),
      };

      await PurchaseOrderService.confirmPurchaseOrderAsCompany(
        companyId,
        purchaseOrderId,
        confirmationData,
      );

      toast.success('Order confirmed successfully!');
      setShowOrderConfirmModal(false);

      // Refresh the purchase order data
      if (fetchPurchaseOrder) {
        fetchPurchaseOrder(0, purchaseOrderId);
      }
    } catch (error) {
      console.error('Error confirming order:', error);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to confirm order. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsConfirming(false);
    }
  };

  // Handle local field changes for editable fields
  const handleLocalFieldChange = (orderItemId, field, value) => {
    if (!isPOEditable()) return;

    // Find the original item to compare against using consistent ID
    const originalItem = purchaseOrder?.orderItemDetails?.find(item =>
      (item.purchaseOrderDetailId || item.orderItemId) === orderItemId
    );
    if (!originalItem) return;

    setLocalPOChanges(prev => {
      const currentChanges = { ...prev };

      // Initialize item changes if not exists
      if (!currentChanges[orderItemId]) {
        currentChanges[orderItemId] = {};
      }

      const originalValue = originalItem[field];
      const isValueReverted = (value === originalValue || (value === '' && originalValue == null));

      if (isValueReverted) {
        // Remove the field from changes if reverting to original
        delete currentChanges[orderItemId][field];

        // Clean up empty item object
        if (Object.keys(currentChanges[orderItemId]).length === 0) {
          delete currentChanges[orderItemId];
        }
      } else {
        // Add/update the field change
        currentChanges[orderItemId][field] = value;
      }

      // Update hasUnsavedChanges based on the new changes
      const hasChanges = Object.keys(currentChanges).length > 0;
      setHasUnsavedChanges(hasChanges);

      return currentChanges;
    });

    // Trigger real-time currency conversion for unit price changes
    if (field === 'unitPrice' && value !== '' && !Number.isNaN(parseFloat(value))) {
      const fromCurrency = originalItem.originalCurrencyCode || getCompanyCurrency();
      const toCurrency = originalItem.convertedCurrencyCode || getCompanyCurrency();

      // Only convert if currencies are different
      if (fromCurrency && toCurrency && fromCurrency !== toCurrency) {
        convertCurrency(parseFloat(value), fromCurrency, toCurrency)
          .then((result) => {
            setConvertedPrices(prev => ({
              ...prev,
              [orderItemId]: {
                convertedUnitPrice: result.convertedAmount,
                rate: result.rate,
                rateDate: result.rateDate,
              },
            }));
          })
          .catch((error) => {
            console.error('Currency conversion error:', error);
          });
      }
    }
  };

  // Get display value (local change or original)
  const getDisplayValue = (item, field) => {
    const itemId = item.purchaseOrderDetailId || item.orderItemId;
    if (localPOChanges[itemId] && localPOChanges[itemId][field] !== undefined) {
      return localPOChanges[itemId][field];
    }
    return item[field];
  };

  // Get numeric value for calculations (handles empty strings)
  const getNumericValue = (item, field) => {
    const displayValue = getDisplayValue(item, field);
    if (displayValue === '' || displayValue == null) {
      return field === 'quantity' ? 1 : 0; // Default quantity to 1, unitPrice to 0
    }
    return typeof displayValue === 'number' ? displayValue : (field === 'quantity' ? 1 : 0);
  };

  // Check if item has local changes
  const hasItemChanges = (orderItemId) => {
    return localPOChanges[orderItemId] && Object.keys(localPOChanges[orderItemId]).length > 0;
  };

  // Calculate current PO total with local changes
  const calculateCurrentPOTotal = () => {
    if (!purchaseOrder?.orderItemDetails) return 0;

    return purchaseOrder.orderItemDetails.reduce((total, item) => {
      const currentQty = getNumericValue(item, 'quantity');
      const currentPrice = getNumericValue(item, 'unitPrice');
      return total + (currentQty * currentPrice);
    }, 0);
  };

  // Handle confirmation and save changes
  const handleConfirmChanges = async () => {
    try {
      if (!hasUnsavedChanges || Object.keys(localPOChanges).length === 0) {
        toast.info('No changes to save');
        return;
      }

      // Show budget validation if enabled
      if (settings.budgetValidationEnabled && shouldShowBudgetValidation()) {
        const updatedPOItems = purchaseOrder.orderItemDetails.map(item => {
          const itemId = item.purchaseOrderDetailId || item.orderItemId;
          const changes = localPOChanges[itemId] || {};
          return {
            ...item,
            ...changes
          };
        });
        setBudgetValidationPOItems(updatedPOItems);
        setShowBudgetValidation(true);
        return;
      }

      // Check if amounts changed and need reapproval confirmation BEFORE making any API calls
      const hadAmountChanges = hasAmountChanges();
      const currentStatus = purchaseOrder?.orderStatus;
      const canReapprove = ['PENDING_APPROVAL', 'REJECTED'].includes(currentStatus);

      let proceedWithSave = true;
      let shouldTriggerReapproval = false;

      // If amount changes detected and PO can be reapproved, ask for confirmation
      if (hadAmountChanges && canReapprove) {
        const reapprovalConfirmation = await Swal.fire({
          title: 'Amount Changes Detected!',
          text: 'You have made changes to quantities or prices. This will trigger a reapproval process. Do you want to proceed?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Yes, Save & Trigger Reapproval',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#28a745',
          cancelButtonColor: '#6c757d',
          focusCancel: false
        });

        if (reapprovalConfirmation.isConfirmed) {
          shouldTriggerReapproval = true;
        } else {
          proceedWithSave = false;
          toast.info('Save operation cancelled');
          return;
        }
      }

      // Only proceed with API calls if user confirmed (or no confirmation needed)
      if (proceedWithSave) {
        // Process the updates
        const updatePromises = [];
        Object.entries(localPOChanges).forEach(([itemId, changes]) => {
          if (Object.keys(changes).length > 0) {
            const updatedChanges = { ...changes };

            // Find the original item
            const originalItem = purchaseOrder?.orderItemDetails?.find(item =>
              (item.purchaseOrderDetailId || item.orderItemId) === parseInt(itemId, 10)
            );

            if (originalItem) {
              // Get effective quantity and unit price
              const qty = changes.quantity ?? originalItem.quantity ?? 1;
              const unitPrice = changes.unitPrice ?? originalItem.unitPrice ?? 0;

              // Always calculate itemTotal when quantity or unitPrice changes
              if (changes.quantity !== undefined || changes.unitPrice !== undefined) {
                updatedChanges.itemTotal = unitPrice * qty;
                // Also update original currency fields (unitPrice is in original/supplier currency)
                updatedChanges.originalUnitPrice = unitPrice;
                updatedChanges.originalItemTotal = unitPrice * qty;
              }

              // Include converted prices
              if (changes.unitPrice !== undefined) {
                // Unit price changed - need to recalculate converted values
                if (convertedPrices[itemId]) {
                  // Use real-time conversion from API
                  updatedChanges.convertedUnitPrice = convertedPrices[itemId].convertedUnitPrice;
                  updatedChanges.conversionRate = convertedPrices[itemId].rate;
                  updatedChanges.convertedItemTotal = convertedPrices[itemId].convertedUnitPrice * qty;
                } else if (originalItem.conversionRate && originalItem.conversionRate !== 1) {
                  // Fallback: use existing conversion rate to calculate converted values
                  const convertedUnitPrice = unitPrice * originalItem.conversionRate;
                  updatedChanges.convertedUnitPrice = convertedUnitPrice;
                  updatedChanges.conversionRate = originalItem.conversionRate;
                  updatedChanges.convertedItemTotal = convertedUnitPrice * qty;
                  console.log('⚠️ Using fallback conversion rate:', originalItem.conversionRate);
                }
              } else if (changes.quantity !== undefined && originalItem.convertedUnitPrice) {
                // If only quantity changed, recalculate converted total using existing converted unit price
                updatedChanges.convertedItemTotal = originalItem.convertedUnitPrice * qty;
              }
            }

            console.log(`📝 Update item ${itemId}:`, updatedChanges);
            updatePromises.push({ itemId, updatedChanges });
          }
        });

        if (updatePromises.length > 0) {
          // Execute updates SEQUENTIALLY to ensure proper PO total recalculation
          // Each update triggers a recalculation, so they must run one after another
          // to see each other's committed changes
          for (const { itemId, updatedChanges } of updatePromises) {
            console.log(`⏳ Updating item ${itemId}...`);
            await PurchaseOrderService.updateOrderItem(companyId, purchaseOrderId, itemId, updatedChanges);
          }
          console.log('✅ All order items updated successfully (PO total recalculated by backend)');

          // Trigger reapproval if user confirmed
          if (shouldTriggerReapproval) {
            try {
              const requestBody = {};
              const reapprovalResponse = await ApproverService.handlePurchaseOrderRestart(
                requestBody,
                companyId,
                purchaseOrderId
              );

              if (reapprovalResponse.status === 200) {
                toast.success('Purchase Order updated and reapproval triggered successfully!');
              } else {
                toast.success(`Purchase Order updated successfully! (Reapproval response: ${reapprovalResponse.status})`);
              }
            } catch (reapprovalError) {
              console.error('❌ Reapproval failed:', reapprovalError);
              const errorMsg = reapprovalError.response?.data?.errorMessage || reapprovalError.message;
              toast.error(`Purchase Order updated but reapproval failed: ${errorMsg}`);
            }
          } else if (hadAmountChanges && !canReapprove) {
            toast.success('Purchase Order updated successfully! (PO status does not allow reapproval)');
          } else {
            toast.success('Purchase Order updated successfully!');
          }

          // Reset local changes
          setLocalPOChanges({});
          setConvertedPrices({});
          setHasUnsavedChanges(false);

          // Refresh the purchase order data
          await fetchPurchaseOrder(currentPage, purchaseOrderId);
          await fetchApprovals();
        }
      }

    } catch (error) {
      console.error('Error updating purchase order:', error);
      toast.error(error.response?.data?.errorMessage || 'Failed to update purchase order');
    }
  };

  // Handle cancel changes
  const handleCancelChanges = () => {
    setLocalPOChanges({});
    setConvertedPrices({});
    setHasUnsavedChanges(false);
    toast.info('Changes discarded');
  };


  // Handle save and approve
  const handleSaveAndApprove = async () => {
    if (hasUnsavedChanges) {
      const result = await Swal.fire({
        title: 'Save Changes and Approve?',
        text: 'Do you want to save your changes and approve this Purchase Order?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Save & Approve',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#6c757d'
      });

      if (result.isConfirmed) {
        try {
          await handleConfirmChanges();
          // After saving changes, proceed with approval
          handleApprove();
        } catch (error) {
          console.error('Error in save and approve:', error);
        }
      }
    } else {
      // No unsaved changes, just approve
      handleApprove();
    }
  };


  // Function to show budget validation preview modal (like CartDetails)
  const fetchBudgetAnalysis = () => {
    // Just show the modal - let BudgetValidationPreview handle the API calls
    setShowBudgetValidation(true);
  };

  const handleBudgetValidationComplete = () => {
    setShowBudgetValidation(false);
    setBudgetValidationPOItems(null);
  };

  // Memoize PO items to prevent infinite loops in BudgetValidationPreview (like CartDetails)
  // IMPORTANT: Use converted price (company currency) for budget validation since budgets are in company currency
  const memoizedPOItems = useMemo(() => {
    if (!purchaseOrder?.orderItemDetails) return [];

    return purchaseOrder.orderItemDetails.map(item => {
      const itemId = item.purchaseOrderDetailId || item.orderItemId;
      // Get current values (local changes or original)
      const currentQty = getNumericValue(item, 'quantity');

      // For budget validation, use CONVERTED price (company currency) since budgets are in company currency
      // Priority: real-time converted price > item's converted price > original price (same currency fallback)
      const realtimeConverted = convertedPrices[itemId];
      const localChanges = localPOChanges[itemId] || {};
      let effectivePrice;
      if (localChanges.unitPrice !== undefined) {
        // User changed price - use real-time converted price if available
        effectivePrice = realtimeConverted?.convertedPrice ?? localChanges.unitPrice;
      } else {
        // No local change - use item's converted price if available, else original price
        effectivePrice = item.convertedUnitPrice ?? item.unitPrice ?? 0;
      }

      const totalPrice = currentQty * effectivePrice;

      return {
        id: itemId,
        quantity: currentQty,
        unitPrice: effectivePrice,
        totalPrice,
        description: getDisplayValue(item, 'partDescription') || item.partDescription || item.catalogItem?.Description || 'PO item',
        partId: item.partId || item.catalogItem?.PartId || '',
        projectId: item.project?.projectId || item.projectId || null,
        departmentId: item.department?.departmentId || item.departmentId || null,
        glAccountId: item.glAccount?.glAccountId || item.glAccountId || null,
        classId: item.class?.classId || item.classId || null,
        locationId: item.location?.locationId || item.locationId || null
      };
    });
  }, [purchaseOrder, localPOChanges, convertedPrices]);


  const handleRateSupplier = () => {
    setShowRatingModal(true);
  };

  const handleDuplicateCart = async () => {
    try {
      // Check if cart exists and has cartId
      if (!(purchaseOrder && purchaseOrder.cart && purchaseOrder.cart.cartId)) {
        toast.error('No cart associated with this purchase order');
        return;
      }

      const response = await CartService.duplicateCart(companyId, purchaseOrder.cart.cartId);
      if (response.data && response.data.cartId) {
        toast.success('Cart duplicated successfully!');
        // Ask user if they want to navigate to the duplicated cart
        const result = await Swal.fire({
          title: 'Cart Duplicated Successfully!',
          text: 'Would you like to open the duplicated cart?',
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: 'Yes, open it',
          cancelButtonText: 'Stay here',
          confirmButtonColor: '#009efb',
          cancelButtonColor: '#6c757d'
        });

        if (result.isConfirmed) {
          // Use the purchase order's cart shipToAddressId for the duplicated cart
          const duplicatedCartShipToAddressId = purchaseOrder && purchaseOrder.cart && purchaseOrder.cart.shipToAddressId;
          if (duplicatedCartShipToAddressId) {
            navigate(`/cartDetails/${response.data.cartId}/${duplicatedCartShipToAddressId}`);
          } else {
            navigate(`/cartDetails/${response.data.cartId}`);
          }
        }
      } else {
        toast.error('Failed to duplicate cart. No cart ID returned.');
      }
    } catch (error) {
      console.error('Error duplicating cart:', error);
      toast.error((error.response && error.response.data && error.response.data.errorMessage) || 'Failed to duplicate cart');
    }
  };


  const handleCreateGrn = () => {
    setShowCreateGrnModal(true);
  };

  const handleCreateGrnSubmit = async () => {
    if (!selectedGrnFile) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setGrnFileUploading(true);

      // Upload file first
      const response = await FileUploadService.uploadFile(companyId, selectedGrnFile);
      const { fileId } = response.data;

      if (!fileId) {
        toast.error('Failed to upload file');
        return;
      }

      // Create file preview object for navigation
      const fileBlob = new Blob([selectedGrnFile], { type: selectedGrnFile.type });
      const fileUrl = URL.createObjectURL(fileBlob);
      const previewObject = {
        url: fileUrl,
        name: selectedGrnFile.name,
        type: selectedGrnFile.type,
      };

      // Navigate to GRN receipt page with uploaded file details
      navigate('/grn-receipt', {
        state: {
          fileUploaded: true,
          uploadedFileId: fileId,
          uploadedFilePreview: previewObject,
          purchaseOrderNo: purchaseOrder && purchaseOrder.orderNo,
          purchaseOrderId: purchaseOrder && purchaseOrder.PurchaseOrderId,
          fromPurchaseOrderDetail: true
        }
      });

      // Close upload modal
      setShowCreateGrnModal(false);
      setSelectedGrnFile(null);
    } catch (error) {
      console.error('Error creating GRN:', error);
      toast.error((error.response && error.response.data && error.response.data.errorMessage) || 'Failed to upload GRN document');
    } finally {
      setGrnFileUploading(false);
    }
  };

  const handleCancelCreateGrn = () => {
    setShowCreateGrnModal(false);
    setSelectedGrnFile(null);
  };



  const toggleDescription = (itemId) => {
    const newExpanded = new Set(expandedDescriptions);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedDescriptions(newExpanded);
  };

  const handleRatingModalCancel = () => {
    setShowRatingModal(false);
    setRatings({
      deliveryPerformanceRating: 0,
      qualityRating: 0,
      pricingCostTransparencyRating: 0,
      communicationResponsivenessRating: 0,
      overallRating: 0,
      notes: '',
    });
    setDocumentId('');
  };

  const handleRatingSubmit = async () => {
    try {
      const requestBody = {
        companyId,
        userId: approverId,
        purchaseOrderId,
        supplierId: purchaseOrder.supplier && purchaseOrder.supplier.supplierId,
        documentId,
        isActive: true,
        deliveryPerformanceRating: ratings.deliveryPerformanceRating,
        qualityRating: ratings.qualityRating,
        pricingCostTransparencyRating: ratings.pricingCostTransparencyRating,
        communicationResponsivenessRating: ratings.communicationResponsivenessRating,
        overallRating: ratings.overallRating,
        notes: ratings.notes,
      };

      const response = await FeedBackService.handleCreateFeedBack(companyId, requestBody);

      if (response.status === 201) {
        toast.success('Supplier rating submitted successfully!');

        // Close the modal and reset the form
        setShowRatingModal(false);
        setRatings({
          deliveryPerformanceRating: 0,
          qualityRating: 0,
          pricingCostTransparencyRating: 0,
          communicationResponsivenessRating: 0,
          overallRating: 0,
          notes: '',
        });
        setDocumentId('');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error(
        (error.response && error.response.data && error.response.data.errorMessage) || 'Failed to submit rating. Please try again.',
      );
    }
  };

  const handleRatingFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const response = await FileUploadService.uploadFile(companyId, file);
      toast.dismiss();
      toast.success('File uploaded successfully!');
      console.log('File uploaded:', response.data);
      // Set the document ID from the response
      setDocumentId(response.data.fileId);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.dismiss();
      toast.error((error.response && error.response.data && error.response.data.message) || 'Failed to upload file');
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

  fetchPurchaseOrder = async (pageNumber = 0, specificPurchaseOrderId = null) => {
    try {
      setLoading(true);
      let response;

      if (specificPurchaseOrderId) {
        // Direct access to a specific purchase order (from URL params)
        response = await PurchaseOrderService.getPurchaseOrdersPaginated(companyId, {
          pageSize,
          pageNumber: 0,
          purchaseOrderId: specificPurchaseOrderId
        });
      } else {
        // Paginated browsing through all purchase orders
        response = await PurchaseOrderService.getPurchaseOrdersPaginated(companyId, {
          pageSize,
          pageNumber
        });
      }

      // Handle paginated response structure
      if (response.data && response.data.content && response.data.content.length > 0) {
        setPurchaseOrder(response.data.content[0]);
        setCurrentPage(response.data.pageNumber || 0);
        setTotalPages(response.data.totalPages || 0);
        setTotalElements(response.data.totalElements || 0);

        // Update URL to reflect current purchase order (for bookmarking)
        const currentOrderId = response.data.content[0].PurchaseOrderId;
        if (currentOrderId !== purchaseOrderId) {
          navigate(`/purchase-order-detail/${currentOrderId}`, { replace: true });
        }
      } else if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Fallback for non-paginated response
        setPurchaseOrder(response.data[0]);
        setCurrentPage(0);
        setTotalPages(1);
        setTotalElements(response.data.length);
      } else {
        setPurchaseOrder(null);
        setCurrentPage(0);
        setTotalPages(0);
        setTotalElements(0);
      }
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      setPurchaseOrder(null);
      setCurrentPage(0);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
      setIsLoadingNavigation(false);
    }
  };

  fetchApprovals = async () => {
    try {
      const response = await ApprovalPolicyManagementService.getApprovalFlow(
        companyId,
        approvalType,
        purchaseOrderId,
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

  const handleReapprove = () => {
    // Double check the status before allowing reapproval
    if (!['PENDING_APPROVAL', 'REJECTED'].includes(purchaseOrder && purchaseOrder.orderStatus)) {
      toast.error('Reapproval is only available for purchase orders with PENDING_APPROVAL or REJECTED status');
      return;
    }
    setShowReapprovalModal(true);
  };

  const handleConfirmReapproval = async () => {
    try {
      const requestBody = {};
      const response = await ApproverService.handlePurchaseOrderRestart(
        requestBody,
        companyId,
        purchaseOrderId
      );

      if (response.status === 200) {
        toast.success('Purchase order reapproval triggered successfully!');
        setShowReapprovalModal(false);

        // Refresh the purchase order data
        await fetchPurchaseOrder(currentPage, purchaseOrderId);
        await fetchApprovals();
      }
    } catch (error) {
      console.error('Error triggering reapproval:', error);
      toast.error((error.response && error.response.data && error.response.data.errorMessage) || 'Failed to trigger reapproval');
      setShowReapprovalModal(false);
    }
  };

  const handleCancelReapproval = () => {
    setShowReapprovalModal(false);
  };

  // Navigation functions for browsing through purchase orders
  const navigateToPreviousOrder = async () => {
    if (currentPage > 0) {
      setIsLoadingNavigation(true);
      await fetchPurchaseOrder(currentPage - 1);
    }
  };

  const navigateToNextOrder = async () => {
    if (currentPage < totalPages - 1) {
      setIsLoadingNavigation(true);
      await fetchPurchaseOrder(currentPage + 1);
    }
  };

  const navigateToFirstOrder = async () => {
    if (currentPage !== 0) {
      setIsLoadingNavigation(true);
      await fetchPurchaseOrder(0);
    }
  };

  const navigateToLastOrder = async () => {
    if (currentPage !== totalPages - 1) {
      setIsLoadingNavigation(true);
      await fetchPurchaseOrder(totalPages - 1);
    }
  };

  useEffect(() => {
    if (purchaseOrderId) {
      // Direct access to specific purchase order from URL
      fetchPurchaseOrder(0, purchaseOrderId);
    } else {
      // Browse all purchase orders starting from first page
      fetchPurchaseOrder(0);
    }
    fetchApprovals();
  }, [companyId, purchaseOrderId]);

  // Load dropdown data
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        // Dropdown data loading removed as it's not currently used
        // const [departmentsRes, locationsRes, glAccountsRes, classesRes, projectsRes] = await Promise.all([
        //   DepartmentService.getDepartmentsPaginated(companyId, 1000, 0),
        //   LocationService.getLocationsPaginated(companyId, 1000, 0),
        //   GLAccountService.getGLAccountsPaginated(companyId, 1000, 0),
        //   ClassService.getClassesPaginated(companyId, 1000, 0),
        //   ProjectService.getProjectsPaginated(companyId, 1000, 0)
        // ]);
        console.log('Dropdown data loading placeholder');
      } catch (error) {
        console.error('Error loading dropdown data:', error);
      }
    };

    loadDropdownData();
  }, [companyId]);

  // Set original PO amount when purchaseOrder loads
  useEffect(() => {
    if (purchaseOrder?.orderItemDetails) {
      const total = purchaseOrder.orderItemDetails.reduce((sum, item) =>
        sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
      setOriginalPOAmount(total);
    }
  }, [purchaseOrder]);

  // Navigation blocking hooks
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
      return undefined;
    };

    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const isCurrentUserNextApprover = () => {
    // Find the first pending approval in the workflow
    const firstPendingApproval = approvals.find((approval) => approval.approvalDecision === 'pending');

    if (!firstPendingApproval) return false;

    // Check if the first pending approval belongs to the current user
    return firstPendingApproval.user &&
      firstPendingApproval.user.userId &&
      firstPendingApproval.user.userId.toString() === approverId.toString();
  };

  const hasRejectedPreviousApprovals = () => {
    const currentApproval = approvals.find((approval) =>
      approval.approvalDecision === 'pending' &&
      approval.user.userId.toString() === approverId.toString()
    );

    if (!currentApproval) return false;

    const currentOrderIndex = approvals.findIndex(
      (approval) => approval.orderOfApproval === currentApproval.orderOfApproval,
    );

    for (let i = 0; i < currentOrderIndex; i++) {
      if (approvals[i].approvalDecision === 'rejected') {
        return true;
      }
    }
    return false;
  };

  const canCurrentUserApprove = isCurrentUserNextApprover();

  const hasRejectedPrevious = hasRejectedPreviousApprovals();
  const isApproveEnabled = canCurrentUserApprove && !hasRejectedPrevious;
  const isRejectEnabled = canCurrentUserApprove && !hasRejectedPrevious;

  const getStatusColor = (orderStatus) => {
    switch (orderStatus) {
      case 'APPROVED': return '#28a745';
      case 'CONFIRMED': return '#17a2b8';
      case 'PARTIALLY_CONFIRMED': return '#fd7e14';
      case 'SHIPPED': return '#6f42c1';
      case 'DELIVERED': return '#20c997';
      case 'REJECTED': return '#dc3545';
      case 'PENDING_APPROVAL': return '#ffc107';
      case 'CREATED': return '#17a2b8';
      case 'SUBMITTED': return '#6c757d';
      case 'RETURNED': return '#dc3545';
      default: return '#6c757d';
    }
  };


  if (loading) {
    return <div className="text-center mt-4">Loading...</div>;
  }

  if (!purchaseOrder) {
    return <div className="text-center mt-4">No data found</div>;
  }

  handleApprove = () => {
    setActionType('approve');
    setShowModal(true);
  };

  const handleReject = () => {
    setActionType('reject');
    setShowModal(true);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const response = await FileUploadService.uploadFile(companyId, file);
      toast.dismiss();
      toast.success('File uploaded successfully!');

      const { fileId } = response.data;
      setDocumentId(fileId);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.dismiss();
      toast.error((error.response && error.response.data && error.response.data.message) || 'Failed to upload file');
    }
  };

  const hasReceivedItems = purchaseOrder.orderItemDetails.some((item) => item.quantityReceived > 0);

  const handleDownload = async (fileId) => {
    try {
      const downloadResponse = await FileUploadService.downloadFile(fileId);
      const mediaTypeToExtensionMap = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'application/pdf': 'pdf',
        'text/plain': 'txt',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/msword': 'doc',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'text/csv': 'csv',
      };

      const contentType = downloadResponse.headers['content-type'];
      let extension = 'pdf';

      if (mediaTypeToExtensionMap[contentType]) {
        extension = mediaTypeToExtensionMap[contentType];
      }

      const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Document_${fileId}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.dismiss();
      toast.success('Document downloaded successfully');
    } catch (downloadError) {
      console.error('Error downloading document:', downloadError);
      toast.dismiss();
      toast.error('Failed to download document PDF');
    }
  };

  const handleModalConfirm = async () => {
    if (actionType === 'reject' && !approvalNotes.trim() && !documentId) {
      toast.error('Rejection note or document is required.');
      return;
    }

    try {
      const requestBody = {
        approvalDecision: actionType === 'approve' ? 'approved' : 'rejected',
        notes: approvalNotes,
        user: {
          userId: approverId,
          firstName: getUserName()
        },
        documentId,
      };

      const response = await ApprovalsService.handlePendingPOApprove(
        requestBody,
        companyId,
        purchaseOrderId,
      );

      if (response.status === 200) {
        toast.success(`${actionType === 'approve' ? 'Approval' : 'Rejection'} Successful`);
        fetchPurchaseOrder(currentPage, purchaseOrderId);

        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (error) {
      console.error(`Error ${actionType === 'approve' ? 'approving' : 'rejecting'} cart:`, error);
      toast.error(
        `Failed to ${actionType === 'approve' ? 'approve' : 'reject'} cart. Please try again.`,
      );
    } finally {
      setShowModal(false);
      setApprovalNotes('');
      setActionType(null);
    }
  };

  const handleModalCancel = () => {
    setShowModal(false);
    setApprovalNotes('');
    setActionType(null);
  };

  return (
    <div style={{ paddingTop: '24px' }}>

      {/* Unsaved Changes Indicator */}
      {hasUnsavedChanges && (
        <div className="alert alert-warning mb-3" style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px'
        }}>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <i className="bi bi-exclamation-triangle text-warning me-2"></i>
              <span>
                You have unsaved changes.
                <strong> Current Total: {formatCurrency(calculateCurrentPOTotal())}</strong>
                {' '}(Original: {formatCurrency(originalPOAmount)})
              </span>
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={handleCancelChanges}
                style={{ borderRadius: '6px' }}
              >
                Cancel Changes
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleConfirmChanges}
                style={{ borderRadius: '6px' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
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

      {/* Main Header Card */}
      <div className="d-flex align-items-center justify-content-between mb-3" style={{ marginTop: '10px' }}>
        <div className="d-flex align-items-baseline gap-3">
          <h4 className="mb-0" style={{ color: '#009efb', fontWeight: '600' }}>
            Purchase Order Details
          </h4>
          {totalElements > 1 && (
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-light text-dark" style={{ fontSize: '11px' }}>
                {currentPage + 1} of {totalElements}
              </span>
              <div className="btn-group" role="group" style={{ fontSize: '12px' }}>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={navigateToFirstOrder}
                  disabled={currentPage === 0 || isLoadingNavigation}
                  title="First Order"
                >
                  <i className="bi bi-chevron-double-left"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={navigateToPreviousOrder}
                  disabled={currentPage === 0 || isLoadingNavigation}
                  title="Previous Order"
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={navigateToNextOrder}
                  disabled={currentPage >= totalPages - 1 || isLoadingNavigation}
                  title="Next Order"
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={navigateToLastOrder}
                  disabled={currentPage >= totalPages - 1 || isLoadingNavigation}
                  title="Last Order"
                >
                  <i className="bi bi-chevron-double-right"></i>
                </button>
              </div>
              {isLoadingNavigation && (
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="d-flex gap-2">
          <Button 
            color="secondary" 
            size="sm"
            onClick={() => setShowPOHistory(true)}
            style={{ borderRadius: '8px' }}
          >
            <i className="bi bi-clock-history me-1"></i>
            History
          </Button>
          <button
            type="button"
            className="btn btn-gradient-primary"
            onClick={() => navigate(-1)}
            style={{
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
              border: 'none',
              color: 'white',
              boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)'
            }}
          >
            <i className="fas fa-arrow-left me-2"></i>Back
          </button>
        </div>
      </div>

      {/* Enhanced Order Information Card */}
      <div className="card shadow-sm mb-2" style={{ borderRadius: '12px', border: 'none' }}>
        <div className="card-body" style={{ padding: '24px' }}>
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div className="d-flex align-items-center gap-3">
              <div className="icon-wrapper" style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#009efb',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <i className="bi bi-file-text text-white" style={{ fontSize: '18px' }}></i>
              </div>
              <div>
                <h4 className="mb-1" style={{ color: '#009efb', fontWeight: '700', fontSize: '22px' }}>
                  {(purchaseOrder && purchaseOrder.orderNo) || 'N/A'}
                </h4>
                <div className="d-flex align-items-center gap-2">
                  <small className="text-muted" style={{ fontSize: '14px' }}>Purchase Order</small>
                  {(() => {
                    const cart = purchaseOrder?.cart;
                    const rfqId = purchaseOrder?.rfq;
                    const rfqNumber = purchaseOrder?.rfqNumber;

                    if (cart?.cartId) {
                      return (
                        <>
                          <span className="text-muted" style={{ fontSize: '12px' }}>•</span>
                          <span
                            style={{
                              fontSize: '12px',
                              color: '#009efb',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                            onClick={() => navigate(`/cartDetails/${cart.cartId}`)}
                            role="button"
                            tabIndex={0}
                          >
                            View Cart: {cart.cartNo || cart.cartId}
                          </span>
                        </>
                      );
                    }

                    if (rfqId) {
                      return (
                        <>
                          <span className="text-muted" style={{ fontSize: '12px' }}>•</span>
                          <span
                            style={{
                              fontSize: '12px',
                              color: '#009efb',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                            onClick={() => navigate(`/rfqDetails/${rfqId}`)}
                            role="button"
                            tabIndex={0}
                          >
                            View RFQ: {rfqNumber || rfqId}
                          </span>
                        </>
                      );
                    }

                    return null;
                  })()}
                </div>
              </div>
            </div>
            <div className="text-center">
              <span className="badge" style={{
                backgroundColor: getStatusColor(purchaseOrder && purchaseOrder.orderStatus),
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                {(purchaseOrder && purchaseOrder.orderStatus && purchaseOrder.orderStatus.replace('_', ' ')) || 'DRAFT'}
              </span>

              {/* Budget Preview Button near Status */}
              {isPOEditable() && hasUnsavedChanges && (
                <div className="mt-2">
                  <Button
                    color="outline-info"
                    size="sm"
                    onClick={fetchBudgetAnalysis}
                    style={{
                      borderRadius: '6px',
                      fontSize: '11px',
                      padding: '4px 8px'
                    }}
                  >
                    <i className="bi bi-calculator me-1"></i>
                    Preview Budget
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Order Details Grid */}
          <div className="row g-4">
            {/* Left Column */}
            <div className="col-md-6">
              <div className="row g-3">
                <div className="col-sm-6">
                  <div className="info-item">
                    <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>Buyer</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#212529' }}>
                      {(purchaseOrder && purchaseOrder.buyerUser) ? `${purchaseOrder.buyerUser.firstName} ${purchaseOrder.buyerUser.lastName}` : 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="info-item">
                    <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>Created Date</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#212529' }}>
                      {(purchaseOrder && purchaseOrder.orderPlacedDate) ? new Date(purchaseOrder.orderPlacedDate).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="info-item">
                    <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>Order Amount</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: hasUnsavedChanges ? '#ffc107' : '#28a745' }}>
                      {purchaseOrder ? (() => {
                        // Calculate real-time totals when there are unsaved changes
                        const currentTotal = calculateCurrentPOTotal();
                        const currentConvertedTotal = purchaseOrder.orderItemDetails?.reduce((total, item) => {
                          const itemId = item.purchaseOrderDetailId || item.orderItemId;
                          const currentQty = getNumericValue(item, 'quantity');
                          const realtimeConverted = convertedPrices[itemId];
                          const convertedUnitPrice = realtimeConverted?.convertedUnitPrice ?? item.convertedUnitPrice ?? 0;
                          return total + (currentQty * convertedUnitPrice);
                        }, 0) || 0;

                        return formatDualCurrency(
                          {
                            originalPrice: hasUnsavedChanges ? currentTotal : (purchaseOrder.originalOrderAmount || purchaseOrder.orderAmount || 0),
                            originalCurrency: purchaseOrder.originalCurrencyCode || getCompanyCurrency(),
                            convertedPrice: hasUnsavedChanges ? currentConvertedTotal : purchaseOrder.convertedOrderAmount,
                            convertedCurrency: purchaseOrder.convertedCurrencyCode,
                          },
                          getUserType()
                        );
                      })() : 'N/A'}
                      {hasUnsavedChanges && (
                        <small className="d-block text-muted" style={{ fontSize: '10px', fontWeight: '400' }}>
                          Original: {formatCurrency(purchaseOrder?.orderAmount || 0)}
                        </small>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="info-item">
                    <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>Delivery Date</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#212529' }}>
                      {(purchaseOrder && purchaseOrder.deliveryDate) ? new Date(purchaseOrder.deliveryDate).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
                {purchaseOrder && purchaseOrder.createdBy && (
                  <div className="col-sm-6">
                    <div className="info-item">
                      <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>
                        <i className="bi bi-person-circle me-1"></i>Created By
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#212529' }}>
                        {`${purchaseOrder.createdBy.firstName || ''} ${purchaseOrder.createdBy.lastName || ''}`.trim()}
                        {purchaseOrder.createdDate && (
                          <small className="d-block text-muted" style={{ fontSize: '11px', fontWeight: '400' }}>
                            {new Date(purchaseOrder.createdDate).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })} at {new Date(purchaseOrder.createdDate).toLocaleTimeString('en-US', {
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {purchaseOrder && purchaseOrder.submittedBy && (
                  <div className="col-sm-6">
                    <div className="info-item">
                      <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>
                        <i className="bi bi-send-check me-1 text-success"></i>Submitted By
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#212529' }}>
                        {`${purchaseOrder.submittedBy.firstName || ''} ${purchaseOrder.submittedBy.lastName || ''}`.trim()}
                        {purchaseOrder.submittedDate && (
                          <small className="d-block text-muted" style={{ fontSize: '11px', fontWeight: '400' }}>
                            {new Date(purchaseOrder.submittedDate).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })} at {new Date(purchaseOrder.submittedDate).toLocaleTimeString('en-US', {
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Addresses */}
            <div className="col-md-6">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="info-item">
                    <div className="text-muted" style={{ fontSize: '12px', marginBottom: '6px' }}>
                      <i className="bi bi-truck me-1"></i>Shipping Address
                    </div>
                    <div style={{ fontSize: '12px', color: '#212529', lineHeight: '1.3' }}>
                      {(purchaseOrder && purchaseOrder.shippingToAddress) ? (
                        <>
                          {purchaseOrder.shippingToAddress.addressLine1 && (
                            <div>{purchaseOrder.shippingToAddress.addressLine1}</div>
                          )}
                          {purchaseOrder.shippingToAddress.addressLine2 && (
                            <div>{purchaseOrder.shippingToAddress.addressLine2}</div>
                          )}
                          {(purchaseOrder.shippingToAddress.city || purchaseOrder.shippingToAddress.state || purchaseOrder.shippingToAddress.postalCode) && (
                            <div>
                              {purchaseOrder.shippingToAddress.city && `${purchaseOrder.shippingToAddress.city}, `}
                              {purchaseOrder.shippingToAddress.state && `${purchaseOrder.shippingToAddress.state} `}
                              {purchaseOrder.shippingToAddress.postalCode}
                            </div>
                          )}
                          {purchaseOrder.shippingToAddress.country && (
                            <div>{purchaseOrder.shippingToAddress.country}</div>
                          )}
                        </>
                      ) : 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="info-item">
                    <div className="text-muted" style={{ fontSize: '12px', marginBottom: '6px' }}>
                      <i className="bi bi-credit-card me-1"></i>Billing Address
                    </div>
                    <div style={{ fontSize: '12px', color: '#212529', lineHeight: '1.3' }}>
                      {(purchaseOrder && purchaseOrder.billingToAddress) ? (
                        <>
                          {purchaseOrder.billingToAddress.addressLine1 && (
                            <div>{purchaseOrder.billingToAddress.addressLine1}</div>
                          )}
                          {purchaseOrder.billingToAddress.addressLine2 && (
                            <div>{purchaseOrder.billingToAddress.addressLine2}</div>
                          )}
                          {(purchaseOrder.billingToAddress.city || purchaseOrder.billingToAddress.state || purchaseOrder.billingToAddress.postalCode) && (
                            <div>
                              {purchaseOrder.billingToAddress.city && `${purchaseOrder.billingToAddress.city}, `}
                              {purchaseOrder.billingToAddress.state && `${purchaseOrder.billingToAddress.state} `}
                              {purchaseOrder.billingToAddress.postalCode}
                            </div>
                          )}
                          {purchaseOrder.billingToAddress.country && (
                            <div>{purchaseOrder.billingToAddress.country}</div>
                          )}
                        </>
                      ) : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Section - Moved here */}
      <div className="card shadow-sm mb-2 mt-0" style={{
        borderRadius: '12px',
        border: 'none'
      }}>
        <div className="card-body" style={{ padding: '8px 24px' }}>
          <div className="d-flex align-items-center justify-content-center">
            <div className="d-flex gap-2 flex-wrap justify-content-center" style={{ maxWidth: '100%' }}>
              {hasReceiverRole && (
                <button
                  type="button"
                  className={`btn btn-sm ${['CONFIRMED', 'PARTIALLY_CONFIRMED'].includes(purchaseOrder?.orderStatus)
                    ? 'btn-primary'
                    : 'btn-secondary'
                    }`}
                  style={{
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '500',
                    minWidth: '120px',
                    opacity: ['CONFIRMED', 'PARTIALLY_CONFIRMED'].includes(purchaseOrder?.orderStatus) ? 1 : 0.6
                  }}
                  disabled={!['CONFIRMED', 'PARTIALLY_CONFIRMED'].includes(purchaseOrder?.orderStatus)}
                  onClick={handleCreateGrn}
                >
                  <i className="bi bi-file-plus me-1"></i>
                  Create GRN
                </button>
              )}
              {hasAccountPayableRole && (
                <button
                  type="button"
                  className={`btn btn-sm ${['CONFIRMED', 'PARTIALLY_CONFIRMED'].includes(purchaseOrder?.orderStatus)
                    ? 'btn-primary'
                    : 'btn-secondary'
                    }`}
                  style={{
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '500',
                    minWidth: '120px',
                    opacity: ['CONFIRMED', 'PARTIALLY_CONFIRMED'].includes(purchaseOrder?.orderStatus) ? 1 : 0.6
                  }}
                  disabled={!['CONFIRMED', 'PARTIALLY_CONFIRMED'].includes(purchaseOrder?.orderStatus)}
                  onClick={() => navigate('/create-voucher', {
                    state: {
                      purchaseOrderNo: purchaseOrder?.orderNo,
                      purchaseOrderId: purchaseOrder?.PurchaseOrderId
                    }
                  })}
                >
                  <i className="bi bi-receipt me-1"></i>
                  Create Voucher
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '500',
                  minWidth: '120px'
                }}
                onClick={() => window.print()}
              >
                <i className="bi bi-printer me-1"></i>
                Print
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled
                style={{
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '500',
                  minWidth: '120px',
                  opacity: 0.6
                }}
              >
                <i className="bi bi-envelope me-1"></i>
                Email PO
              </button>
              <button
                type="button"
                className={`btn btn-sm ${canCompanyConfirmOrder() ? 'btn-success' : 'btn-secondary'}`}
                disabled={!canCompanyConfirmOrder()}
                onClick={() => {
                  initializeConfirmQuantities();
                  setShowOrderConfirmModal(true);
                }}
                title={isDraftSupplier()
                  ? (canCompanyConfirmOrder() ? 'Confirm order quantities' : 'No items remaining to confirm')
                  : 'Only available for draft (internal) suppliers'
                }
                style={{
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '500',
                  minWidth: '120px',
                  opacity: canCompanyConfirmOrder() ? 1 : 0.6
                }}
              >
                <i className="bi bi-check-circle me-1"></i>
                Mark Confirmed
              </button>
              <button
                type="button"
                className={`btn btn-sm ${purchaseOrder?.cart?.cartId
                  ? 'btn-primary'
                  : 'btn-secondary'
                  }`}
                onClick={handleDuplicateCart}
                disabled={!purchaseOrder?.cart?.cartId}
                style={{
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '500',
                  minWidth: '120px',
                  opacity: purchaseOrder?.cart?.cartId ? 1 : 0.6
                }}
              >
                <i className="bi bi-copy me-1"></i>
                Duplicate Cart
              </button>
              <button
                type="button"
                className={`btn btn-sm ${['PENDING_APPROVAL', 'REJECTED'].includes(purchaseOrder?.orderStatus)
                  ? 'btn-primary'
                  : 'btn-secondary'
                  }`}
                onClick={handleReapprove}
                disabled={!['PENDING_APPROVAL', 'REJECTED'].includes(purchaseOrder?.orderStatus)}
                style={{
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '500',
                  minWidth: '120px',
                  opacity: ['PENDING_APPROVAL', 'REJECTED'].includes(purchaseOrder?.orderStatus) ? 1 : 0.6
                }}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Re-approve
              </button>
              {hasReceivedItems && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                  onClick={handleRateSupplier}
                >
                  <i className="bi bi-star me-1"></i>
                  Rate Supplier
                </button>
              )}
              {canCurrentUserApprove && (
                <>
                  {hasUnsavedChanges ? (
                    <button
                      type="button"
                      className={`btn btn-sm ${isApproveEnabled ? 'btn-success' : 'btn-secondary'}`}
                      onClick={handleSaveAndApprove}
                      disabled={!isApproveEnabled}
                      style={{
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: '500',
                        minWidth: '120px',
                        opacity: isApproveEnabled ? 1 : 0.6
                      }}
                    >
                      <i className="bi bi-check-lg me-1"></i>
                      Save & Approve
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`btn btn-sm ${isApproveEnabled ? 'btn-success' : 'btn-secondary'}`}
                      onClick={handleApprove}
                      disabled={!isApproveEnabled}
                      style={{
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: '500',
                        minWidth: '120px',
                        opacity: isApproveEnabled ? 1 : 0.6
                      }}
                    >
                      <i className="bi bi-check-lg me-1"></i>
                      Approve
                    </button>
                  )}
                  <button
                    type="button"
                    className={`btn btn-sm ${isRejectEnabled ? 'btn-danger' : 'btn-secondary'}`}
                    onClick={handleReject}
                    disabled={!isRejectEnabled}
                    style={{
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: '500',
                      minWidth: '120px',
                      opacity: isRejectEnabled ? 1 : 0.6
                    }}
                  >
                    <i className="bi bi-x-lg me-1"></i>
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Order Items Section - matching CartDetails structure */}
        <div style={{ width: '70%' }}>
          <Card className="mb-4 shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
            <CardBody className="p-4">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <div className="d-flex align-items-center">
                  <i className="bi bi-building me-2" style={{ color: '#009efb', fontSize: '18px' }}></i>
                  <h6 className="mb-0" style={{ color: '#009efb', fontWeight: '600' }}>
                    {purchaseOrder.supplier?.displayName || purchaseOrder.supplier?.name || 'Supplier'}
                    {purchaseOrder.supplier?.supplierStatus === 'draft' && (
                      <Badge color="warning" className="ms-2" style={{ fontSize: '10px', fontWeight: '500' }}>
                        Internal
                      </Badge>
                    )}
                  </h6>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted" style={{ fontSize: '13px' }}>Items:</span>
                    <span className="fw-semibold" style={{ color: '#495057', fontSize: '13px' }}>
                      {purchaseOrder.orderItemDetails.length}
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted" style={{ fontSize: '13px' }}>Value:</span>
                    <span className="fw-bold" style={{ color: '#198754', fontSize: '14px' }}>
                      {formatDualCurrencyTotal(
                        purchaseOrder.orderItemDetails.map((item) => {
                          const itemId = item.purchaseOrderDetailId || item.orderItemId;
                          const currentPrice = getNumericValue(item, 'unitPrice');
                          const currentQty = getNumericValue(item, 'quantity');
                          // Use real-time converted price if available
                          const realtimeConverted = convertedPrices[itemId];
                          const convertedUnitPrice = realtimeConverted?.convertedUnitPrice ?? item.convertedUnitPrice;
                          return {
                            originalPrice: currentPrice,
                            originalCurrencyCode: item.originalCurrencyCode,
                            convertedPrice: convertedUnitPrice,
                            convertedCurrencyCode: item.convertedCurrencyCode,
                            quantity: currentQty,
                          };
                        }),
                        getUserType()
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <Row>
                {purchaseOrder.orderItemDetails.map((item) => (
                  <Col key={item.purchaseOrderDetailId} md="12" className="mb-3">
                    <div className="border rounded p-3" style={{
                      borderRadius: '8px',
                      backgroundColor: hasItemChanges(item.purchaseOrderDetailId) ? '#fff7e6' : '#fafafa',
                      border: hasItemChanges(item.purchaseOrderDetailId) ? '1px solid #ffc107' : '1px solid #e0e0e0',
                      position: 'relative'
                    }}>
                      {hasItemChanges(item.purchaseOrderDetailId) && (
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          backgroundColor: '#ffc107',
                          color: '#212529',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '600'
                        }}>
                          MODIFIED
                        </div>
                      )}
                      <Row className="align-items-start">
                        <Col
                          md="2"
                          xs="4"
                          className="d-flex flex-column align-items-center justify-content-center"
                        >
                          <div style={{ width: '80px', height: '80px' }}>
                            <img
                              src={
                                (item && item.catalogItem && item.catalogItem.ProductImageURL) ||
                                'https://st3.depositphotos.com/23594922/31822/v/450/depositphotos_318221368-stock-illustration-missing-picture-page-for-website.jpg'
                              }
                              alt="Product"
                              className="img-fluid"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border: '1px solid #e0e0e0'
                              }}
                            />
                          </div>
                        </Col>
                        <Col md="4" xs="9" className="justify-content-start">
                          <div className="mb-3">
                            <div className="description-wrapper">
                              {isPOEditable() ? (
                                <Input
                                  type="textarea"
                                  rows="2"
                                  value={getDisplayValue(item, 'partDescription') || item.catalogItem?.Description || item.partDescription || ''}
                                  onChange={(e) => handleLocalFieldChange(item.purchaseOrderDetailId, 'partDescription', e.target.value)}
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    lineHeight: '1.4',
                                    resize: 'vertical',
                                    minHeight: '60px'
                                  }}
                                  placeholder="Enter item description"
                                />
                              ) : (
                                (() => {
                                  const description = getDisplayValue(item, 'partDescription') || item.catalogItem?.Description || item.partDescription || 'Product Description';
                                  const isLong = description.length > 80;
                                  const isExpanded = expandedDescriptions.has(item.purchaseOrderDetailId);
                                  const displayText = isLong && !isExpanded
                                    ? `${description.substring(0, 80)}...`
                                    : description;

                                  return (
                                    <div>
                                      {isLong ? (
                                        <div
                                          className="mb-1"
                                          style={{
                                            color: '#000',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            lineHeight: '1.4',
                                            fontSize: '16px'
                                          }}
                                          onClick={() => toggleDescription(item.purchaseOrderDetailId)}
                                          onKeyDown={(e) => e.key === 'Enter' && toggleDescription(item.purchaseOrderDetailId)}
                                          role="button"
                                          tabIndex={0}
                                          title="Click to expand/collapse"
                                        >
                                          {displayText}
                                          <i
                                            className={`bi bi-chevron-${isExpanded ? 'up' : 'down'} ms-2`}
                                            style={{ fontSize: '12px', color: '#009efb' }}
                                          ></i>
                                        </div>
                                      ) : (
                                        <h6
                                          className="mb-1"
                                          style={{
                                            color: '#000',
                                            fontWeight: '600',
                                            lineHeight: '1.4',
                                            fontSize: '16px'
                                          }}
                                        >
                                          {displayText}
                                        </h6>
                                      )}
                                    </div>
                                  );
                                })()
                              )}
                            </div>
                          </div>
                          <div className="d-flex flex-column gap-1 mt-2">
                            <div className="d-flex align-items-center">
                              <span className="text-muted me-2" style={{ fontSize: '13px', minWidth: '80px' }}>Part ID:</span>
                              {isPOEditable() ? (
                                <Input
                                  type="text"
                                  value={getDisplayValue(item, 'partId') || item.catalogItem?.PartId || item.partId || ''}
                                  onChange={(e) => handleLocalFieldChange(item.purchaseOrderDetailId, 'partId', e.target.value)}
                                  style={{
                                    fontSize: '13px',
                                    height: '28px',
                                    width: '120px',
                                    fontWeight: '500'
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: '13px', color: '#000' }}>{getDisplayValue(item, 'partId') || item.catalogItem?.PartId || item.partId || 'N/A'}</span>
                              )}
                            </div>
                            <div className="d-flex align-items-center">
                              <span className="text-muted me-2" style={{ fontSize: '13px', minWidth: '80px' }}>Unit Price:</span>
                              {isPOEditable() ? (
                                <>
                                  <span style={{ fontSize: '13px', color: '#000', marginRight: '2px' }}>
                                    {getCurrencySymbol(item.originalCurrencyCode || 'USD')}
                                  </span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={getDisplayValue(item, 'unitPrice') ?? ''}
                                    onChange={(e) => {
                                      const { value } = e.target;
                                      if (value === '') {
                                        handleLocalFieldChange(item.purchaseOrderDetailId, 'unitPrice', '');
                                      } else {
                                        const numValue = parseFloat(value);
                                        if (!Number.isNaN(numValue)) {
                                          handleLocalFieldChange(item.purchaseOrderDetailId, 'unitPrice', numValue);
                                        }
                                      }
                                    }}
                                    style={{
                                      fontSize: '13px',
                                      height: '28px',
                                      width: '80px',
                                      fontWeight: '500'
                                    }}
                                  />
                                  <span style={{ fontSize: '13px', color: '#666', margin: '0 4px' }}>/</span>
                                  <span style={{ fontSize: '13px', color: '#000' }}>
                                    {item.unitOfMeasure || item.catalogItem?.UnitOfMeasurement || 'Unit'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#000' }}>
                                    {formatDualCurrency(
                                      {
                                        originalPrice: item.originalUnitPrice || getDisplayValue(item, 'unitPrice') || item.unitPrice,
                                        originalCurrency: item.originalCurrencyCode || getCompanyCurrency(),
                                        convertedPrice: item.convertedUnitPrice,
                                        convertedCurrency: item.convertedCurrencyCode,
                                      },
                                      getUserType()
                                    )}
                                  </span>
                                  <span style={{ fontSize: '13px', color: '#666', margin: '0 4px' }}>/</span>
                                  <span style={{ fontSize: '13px', color: '#000' }}>
                                    {item.unitOfMeasure || item.catalogItem?.UnitOfMeasurement || 'Unit'}
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="d-flex align-items-center">
                              <span className="text-muted me-2" style={{ fontSize: '13px', minWidth: '80px' }}>Total:</span>
                              <span style={{ fontSize: '14px', fontWeight: '600', color: '#000' }}>
                                {(() => {
                                  const itemId = item.purchaseOrderDetailId || item.orderItemId;
                                  const currentQty = getNumericValue(item, 'quantity');
                                  const currentPrice = getNumericValue(item, 'unitPrice');
                                  // Use real-time converted price if available (from editing), otherwise use stored value
                                  const realtimeConverted = convertedPrices[itemId];
                                  const convertedUnitPrice = realtimeConverted?.convertedUnitPrice ?? item.convertedUnitPrice;
                                  return formatDualCurrency(
                                    {
                                      originalPrice: currentPrice * currentQty,
                                      originalCurrency: item.originalCurrencyCode || getCompanyCurrency(),
                                      convertedPrice: convertedUnitPrice ? convertedUnitPrice * currentQty : null,
                                      convertedCurrency: item.convertedCurrencyCode,
                                    },
                                    getUserType()
                                  );
                                })()}
                              </span>
                            </div>
                          </div>

                          {/* Quantity Fields in single line with smaller size */}
                          <div className="mt-3">
                            <div className="d-flex align-items-center justify-content-start" style={{
                              gap: '6px',
                              flexWrap: 'nowrap',
                              overflow: 'hidden',
                              minWidth: '300px'
                            }}>
                              <div className="quantity-item" style={{
                                backgroundColor: '#f8f9fa',
                                borderRadius: '4px',
                                padding: '3px 4px',
                                textAlign: 'center',
                                minWidth: isPOEditable() ? '58px' : '50px',
                                maxWidth: '62px',
                                border: '1px solid #e9ecef',
                                flexShrink: 0
                              }}>
                                {isPOEditable() ? (
                                  <Input
                                    type="number"
                                    min="1"
                                    value={getDisplayValue(item, 'quantity') ?? ''}
                                    onChange={(e) => {
                                      const { value } = e.target;
                                      if (value === '') {
                                        handleLocalFieldChange(item.purchaseOrderDetailId, 'quantity', '');
                                      } else {
                                        const numValue = parseInt(value, 10);
                                        if (!Number.isNaN(numValue) && numValue > 0) {
                                          handleLocalFieldChange(item.purchaseOrderDetailId, 'quantity', numValue);
                                        }
                                      }
                                    }}
                                    style={{
                                      width: '45px',
                                      height: '22px',
                                      fontSize: '11px',
                                      textAlign: 'center',
                                      fontWeight: '600',
                                      color: '#009efb',
                                      padding: '2px 4px',
                                      margin: '0 auto'
                                    }}
                                  />
                                ) : (
                                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#009efb' }}>
                                    {getDisplayValue(item, 'quantity') || item.quantity || '0'}
                                  </div>
                                )}
                                <small className="text-muted" style={{ fontSize: '9px', whiteSpace: 'nowrap' }}>Ordered</small>
                              </div>
                              <div className="quantity-item" style={{
                                backgroundColor: '#f8f9fa',
                                borderRadius: '4px',
                                padding: '3px 4px',
                                textAlign: 'center',
                                minWidth: '50px',
                                maxWidth: '62px',
                                border: '1px solid #e9ecef',
                                flexShrink: 0
                              }}>
                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#28a745' }}>{item.quantityConfirmed || '0'}</div>
                                <small className="text-muted" style={{ fontSize: '8px', whiteSpace: 'nowrap' }}>Confirmed</small>
                              </div>
                              <div className="quantity-item" style={{
                                backgroundColor: '#f8f9fa',
                                borderRadius: '4px',
                                padding: '3px 4px',
                                textAlign: 'center',
                                minWidth: '50px',
                                maxWidth: '62px',
                                border: '1px solid #e9ecef',
                                flexShrink: 0
                              }}>
                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#17a2b8' }}>{item.quantityReceived || '0'}</div>
                                <small className="text-muted" style={{ fontSize: '8px', whiteSpace: 'nowrap' }}>Received</small>
                              </div>
                              <div className="quantity-item" style={{
                                backgroundColor: '#f8f9fa',
                                borderRadius: '4px',
                                padding: '3px 4px',
                                textAlign: 'center',
                                minWidth: '50px',
                                maxWidth: '62px',
                                border: '1px solid #e9ecef',
                                flexShrink: 0
                              }}>
                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#ffc107' }}>{item.quantityInvoiced || '0'}</div>
                                <small className="text-muted" style={{ fontSize: '8px', whiteSpace: 'nowrap' }}>Invoiced</small>
                              </div>
                            </div>
                          </div>
                        </Col>
                        <Col md="6" xs="12">
                          {/* Settings-based fields with reduced spacing */}
                          {settings.departmentEnabled && (
                            <Row className="align-items-center mb-2">
                              <Col xs="4" className="text-end">
                                <Label className="mb-0 text-muted" style={{ fontSize: '12px' }}>Department</Label>
                              </Col>
                              <Col xs="8">
                                <span style={{ fontSize: '12px', color: '#000' }}>{item.department?.name || 'N/A'}</span>
                              </Col>
                            </Row>
                          )}
                          {settings.locationEnabled && (
                            <Row className="align-items-center mb-2">
                              <Col xs="4" className="text-end">
                                <Label className="mb-0 text-muted" style={{ fontSize: '12px' }}>Location</Label>
                              </Col>
                              <Col xs="8">
                                <span style={{ fontSize: '12px', color: '#000' }}>{item.location?.name || 'N/A'}</span>
                              </Col>
                            </Row>
                          )}
                          {settings.classEnabled && (
                            <Row className="align-items-center mb-2">
                              <Col xs="4" className="text-end">
                                <Label className="mb-0 text-muted" style={{ fontSize: '12px' }}>Class</Label>
                              </Col>
                              <Col xs="8">
                                <span style={{ fontSize: '12px', color: '#000' }}>{item.classId?.name || 'N/A'}</span>
                              </Col>
                            </Row>
                          )}
                          {settings.gLAccountEnabled && (
                            <Row className="align-items-center mb-2">
                              <Col xs="4" className="text-end">
                                <Label className="mb-0 text-muted" style={{ fontSize: '12px' }}>GL Account</Label>
                              </Col>
                              <Col xs="8">
                                <span style={{ fontSize: '12px', color: '#000' }}>{item.glAccount?.name || 'N/A'}</span>
                              </Col>
                            </Row>
                          )}
                          {settings.projectEnabled && (
                            <Row className="align-items-center mb-2">
                              <Col xs="4" className="text-end">
                                <Label className="mb-0 text-muted" style={{ fontSize: '12px' }}>Project</Label>
                              </Col>
                              <Col xs="8">
                                <span style={{ fontSize: '12px', color: '#000' }}>{item.project?.name || 'N/A'}</span>
                              </Col>
                            </Row>
                          )}
                        </Col>
                      </Row>
                    </div>
                  </Col>
                ))}
              </Row>
            </CardBody>
          </Card>
        </div>

        {/* Right Sidebar - Approval Status */}
        <div style={{ width: '30%' }}>
          {/* Approval Workflow Card - matching CartDetails exactly */}
          {approvals.length > 0 && (
            <Card className="shadow-sm mb-4" style={{ borderRadius: '12px', border: 'none' }}>
              <CardBody className="p-4">
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-check-circle me-2" style={{ color: '#009efb', fontSize: '20px' }}></i>
                    <h5 className="mb-0" style={{ color: '#009efb', fontWeight: '600' }}>
                      Approval Workflow
                    </h5>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted" style={{ fontSize: '13px' }}>Progress:</span>
                    <span className="fw-semibold" style={{ color: '#495057', fontSize: '13px' }}>
                      {approvals.filter(a => a.approvalDecision === 'approved').length} of {approvals.length} completed
                    </span>
                  </div>
                </div>

                {/* Approval Process Start Date */}
                {approvals.length > 0 && (() => {
                  // Find the earliest createdDate from any approval
                  const earliestApproval = approvals.find(a => a.createdDate) ||
                    approvals.find(a => a.approvalDecisionDate) ||
                    approvals[0];
                  const startDate = earliestApproval?.createdDate || earliestApproval?.approvalDecisionDate;

                  if (startDate) {
                    return (
                      <div className="d-flex align-items-center mb-3 px-2 py-1 rounded" style={{ backgroundColor: '#f8f9fa', fontSize: '12px' }}>
                        <i className="bi bi-calendar-event me-1 text-info" style={{ fontSize: '12px' }}></i>
                        <span className="text-muted me-1">Started:</span>
                        <span className="fw-medium" style={{ color: '#495057' }}>
                          {new Date(startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })} at {new Date(startDate).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="position-relative">
                  {/* Progress line */}
                  <div
                    className="position-absolute"
                    style={{
                      left: '19px',
                      top: '45px',
                      bottom: '0',
                      width: '2px',
                      background: `linear-gradient(to bottom, #28a745 0%, #28a745 ${(approvals.filter(a => a.approvalDecision === 'approved').length / approvals.length * 100)
                        }%, #e9ecef ${(approvals.filter(a => a.approvalDecision === 'approved').length / approvals.length * 100)
                        }%, #e9ecef 100%)`
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
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        {approval.approvalDecision === 'approved' ? (
                          <i className="bi bi-check-lg text-white" style={{ fontSize: '16px' }}></i>
                        ) : approval.approvalDecision === 'rejected' ? (
                          <i className="bi bi-x-lg text-white" style={{ fontSize: '16px' }}></i>
                        ) : approval.approvalDecision === 'pending' ? (
                          <i className="bi bi-clock text-dark" style={{ fontSize: '14px' }}></i>
                        ) : (
                          <span className="text-muted fw-bold" style={{ fontSize: '12px' }}>{index + 1}</span>
                        )}
                      </div>

                      <div className="ms-3 flex-grow-1">
                        <div
                          className="p-3 rounded"
                          style={{
                            background: approval.approvalDecision === 'approved'
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
                              }`
                          }}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <div>
                              <h6 className="mb-0" style={{ color: '#000', fontWeight: '600' }}>
                                {approval.user.title ? `${approval.user.title} ` : ''}
                                {approval.user.firstName} {approval.user.lastName}
                              </h6>
                              <div className="text-muted" style={{ fontSize: '12px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
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
                              style={{ fontSize: '10px' }}
                            >
                              {approval.approvalDecision?.toUpperCase() || 'WAITING'}
                            </span>
                          </div>

                          <div className="mb-2">
                            <div>
                              <small className="text-muted">Order: </small>
                              <span className="fw-medium" style={{ fontSize: '13px', color: '#000' }}>
                                #{approval.orderOfApproval}
                              </span>
                            </div>
                          </div>

                          {approval.approvalDecision === 'approved' && approval.approvalDecisionDate && (
                            <div className="mt-2 text-success">
                              <small>
                                <i className="bi bi-check-circle me-1"></i>
                                Approved on {new Date(approval.approvalDecisionDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })} at {new Date(approval.approvalDecisionDate).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </small>
                            </div>
                          )}

                          {approval.approvalDecision === 'rejected' && approval.approvalDecisionDate && (
                            <div className="mt-2 text-danger">
                              <small>
                                <i className="bi bi-x-circle me-1"></i>
                                Rejected on {new Date(approval.approvalDecisionDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })} at {new Date(approval.approvalDecisionDate).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </small>
                            </div>
                          )}

                          {approval.rules && approval.rules.length > 0 && (
                            <div className="mt-2">
                              <small className="text-muted d-block mb-1">Rules Applied:</small>
                              <ul className="list-unstyled mb-0">
                                {approval.rules.map((rule) => (
                                  <li key={rule.approvalPolicyRuleId} className="d-flex align-items-center">
                                    <i className="bi bi-arrow-right me-2 text-muted" style={{ fontSize: '12px' }}></i>
                                    <small style={{ color: '#000' }}>{rule.name}</small>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {approval.notes && (
                            <div className="mt-2 p-2 rounded" style={{
                              backgroundColor: approval.approvalDecision === 'rejected' ? '#fff5f5' : '#f8f9fa',
                              border: approval.approvalDecision === 'rejected' ? '1px solid #fecaca' : '1px solid #e9ecef'
                            }}>
                              <strong style={{ color: approval.approvalDecision === 'rejected' ? '#dc3545' : '#495057' }}>Notes:</strong>{' '}
                              <span style={{ color: approval.approvalDecision === 'rejected' ? '#721c24' : '#495057' }}>
                                {approval.notes}
                              </span>
                            </div>
                          )}

                          {approval.documentId && (
                            <div className="mt-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleDownload(approval.documentId)}
                                style={{
                                  fontSize: '11px',
                                  padding: '4px 8px',
                                  borderRadius: '4px'
                                }}
                              >
                                <i className="bi bi-download me-1"></i>Download
                              </button>
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

        </div>
      </div>



      {/* Budget Validation Preview Modal */}
      <BudgetValidationPreview
        isOpen={showBudgetValidation}
        toggle={() => setShowBudgetValidation(false)}
        cartItems={budgetValidationPOItems || memoizedPOItems}
        cartHeaderData={{
          purchaseType: purchaseOrder?.purchaseType || 'OPEX'
        }}
        onValidationComplete={handleBudgetValidationComplete}
      />

      {/* Confirmation Modal for Unsaved Changes */}
      <Modal
        isOpen={showConfirmationModal}
        toggle={() => setShowConfirmationModal(false)}
        centered
      >
        <ModalHeader toggle={() => setShowConfirmationModal(false)}>
          Unsaved Changes
        </ModalHeader>
        <ModalBody>
          <p>You have unsaved changes. What would you like to do?</p>
          <div className="alert alert-warning">
            <strong>Current Total:</strong> {formatCurrency(calculateCurrentPOTotal())}<br />
            <strong>Original Total:</strong> {formatCurrency(originalPOAmount)}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="secondary"
            onClick={() => {
              setShowConfirmationModal(false);
              handleCancelChanges();
              if (pendingNavigation) {
                pendingNavigation();
                setPendingNavigation(null);
              }
            }}
          >
            Discard Changes
          </Button>
          <Button
            color="primary"
            onClick={async () => {
              await handleConfirmChanges();
              setShowConfirmationModal(false);
              if (pendingNavigation) {
                pendingNavigation();
                setPendingNavigation(null);
              }
            }}
          >
            Save Changes
          </Button>
          <Button
            color="outline-secondary"
            onClick={() => setShowConfirmationModal(false)}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>


      <Modal isOpen={showModal} toggle={handleModalCancel} centered>
        <ModalHeader toggle={handleModalCancel}>
          {actionType === 'approve' ? 'Approve Purchase Order' : 'Reject Purchase Order'}
        </ModalHeader>
        <ModalBody>
          <div className="form-group mb-3">
            <textarea
              id="approvalNotes"
              className="form-control"
              rows="3"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder={
                actionType === 'approve'
                  ? 'Enter approval notes (optional)...'
                  : 'Enter rejection notes (required if no document is attached)...'
              }
            ></textarea>
          </div>
          <div className="form-group">
            <input
              type="file"
              id="fileUpload"
              className="form-control"
              onChange={handleFileChange}
            />
            <small className="text-muted">
              {actionType === 'approve'
                ? 'Upload supporting document (optional)'
                : 'Upload rejection document (required if no notes are provided)'}
            </small>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={handleModalCancel}>
            Cancel
          </Button>
          <Button
            color={actionType === 'approve' ? 'primary' : 'danger'}
            onClick={handleModalConfirm}
          >
            {actionType === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
          </Button>
        </ModalFooter>
      </Modal>
      <Modal isOpen={showRatingModal} toggle={() => setShowRatingModal(false)} centered size="lg" style={{ maxWidth: '700px' }}>
        <ModalHeader
          toggle={() => setShowRatingModal(false)}
          style={{
            background: 'linear-gradient(135deg, #009efb 0%, #0085d1 100%)',
            borderBottom: 'none',
            borderRadius: '8px 8px 0 0',
            padding: '20px 24px',
          }}
          close={
            <button
              className="btn btn-link p-0"
              onClick={() => setShowRatingModal(false)}
              style={{ color: 'white' }}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          }
        >
          <div className="d-flex align-items-center text-white">
            <i className="bi bi-star-fill me-2" style={{ fontSize: '24px' }}></i>
            <div>
              <h5 className="mb-0" style={{ fontWeight: '600' }}>Rate Supplier</h5>
              <small style={{ opacity: 0.9 }}>{purchaseOrder?.supplier?.displayName || purchaseOrder?.supplier?.name}</small>
            </div>
          </div>
        </ModalHeader>
        <ModalBody style={{ padding: '24px' }}>
          {/* Overall Rating Display */}
          {(() => {
            const validRatings = [
              ratings.deliveryPerformanceRating,
              ratings.qualityRating,
              ratings.pricingCostTransparencyRating,
              ratings.communicationResponsivenessRating,
            ].filter((r) => r > 0);
            const calculatedOverall = validRatings.length > 0
              ? Math.floor((validRatings.reduce((a, b) => a + b, 0) / validRatings.length) * 10) / 10
              : 0;
            return (
              <div
                className="text-center mb-4 p-4"
                style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #e8f4fd 100%)',
                  borderRadius: '12px',
                  border: '1px solid #e0e8f0',
                }}
              >
                <div style={{ fontSize: '48px', fontWeight: '700', color: '#009efb', lineHeight: 1 }}>
                  {calculatedOverall.toFixed(1)}
                </div>
                <div className="d-flex justify-content-center my-2">
                  <Rating
                    initialRating={calculatedOverall}
                    readonly
                    fractions={2}
                    fullSymbol={<i className="bi bi-star-fill text-warning" style={{ fontSize: '20px' }}></i>}
                    emptySymbol={<i className="bi bi-star text-warning" style={{ fontSize: '20px' }}></i>}
                  />
                </div>
                <small className="text-muted">Overall Rating (Auto-calculated)</small>
              </div>
            );
          })()}

          {/* Rating Categories */}
          <div className="row g-3 mb-4">
            {[
              { key: 'deliveryPerformanceRating', label: 'Delivery Performance', icon: 'bi-truck', color: '#009efb' },
              { key: 'qualityRating', label: 'Quality', icon: 'bi-award', color: '#28a745' },
              { key: 'pricingCostTransparencyRating', label: 'Pricing & Transparency', icon: 'bi-currency-dollar', color: '#ffc107' },
              { key: 'communicationResponsivenessRating', label: 'Communication', icon: 'bi-chat-dots', color: '#17a2b8' },
            ].map((category) => (
              <div key={category.key} className="col-md-6">
                <div
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e8e8e8',
                    borderRadius: '10px',
                    padding: '16px',
                    height: '100%',
                    transition: 'box-shadow 0.2s',
                  }}
                  className="rating-card"
                >
                  <div className="d-flex align-items-center mb-2">
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: `${category.color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '10px',
                      }}
                    >
                      <i className={`bi ${category.icon}`} style={{ color: category.color, fontSize: '16px' }}></i>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>{category.label}</span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between">
                    <Rating
                      initialRating={ratings[category.key]}
                      onChange={(value) => {
                        const newValue = Math.max(1, value);
                        setRatings({ ...ratings, [category.key]: newValue });
                      }}
                      fractions={2}
                      fullSymbol={<i className="bi bi-star-fill text-warning" style={{ fontSize: '18px' }}></i>}
                      emptySymbol={<i className="bi bi-star text-warning" style={{ fontSize: '18px' }}></i>}
                    />
                    <span
                      style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: ratings[category.key] > 0 ? category.color : '#ccc',
                        minWidth: '35px',
                        textAlign: 'right',
                      }}
                    >
                      {ratings[category.key].toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Notes Section */}
          <div className="mb-3">
            <Label htmlFor="ratingNotes" style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              <i className="bi bi-chat-left-text me-2" style={{ color: '#009efb' }}></i>
              Feedback Notes
            </Label>
            <textarea
              id="ratingNotes"
              className="form-control"
              rows="3"
              value={ratings.notes}
              onChange={(e) => setRatings({ ...ratings, notes: e.target.value })}
              placeholder="Share your experience with this supplier..."
              style={{
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                fontSize: '14px',
                resize: 'none',
              }}
            ></textarea>
          </div>

          {/* File Upload Section */}
          <div>
            <Label htmlFor="ratingFileUpload" style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              <i className="bi bi-paperclip me-2" style={{ color: '#009efb' }}></i>
              Supporting Document
              <span className="text-muted fw-normal ms-1" style={{ fontSize: '12px' }}>(optional)</span>
            </Label>
            <input
              type="file"
              id="ratingFileUpload"
              className="form-control"
              onChange={handleRatingFileChange}
              style={{
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                fontSize: '14px',
              }}
            />
          </div>
        </ModalBody>
        <ModalFooter style={{ borderTop: '1px solid #e8e8e8', padding: '16px 24px' }}>
          <Button
            color="light"
            onClick={handleRatingModalCancel}
            style={{ borderRadius: '8px', padding: '8px 20px' }}
          >
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={handleRatingSubmit}
            style={{
              borderRadius: '8px',
              padding: '8px 24px',
              background: 'linear-gradient(135deg, #009efb 0%, #0085d1 100%)',
              border: 'none',
            }}
          >
            <i className="bi bi-check-lg me-1"></i>
            Submit Rating
          </Button>
        </ModalFooter>
      </Modal>

      {/* Upload GRN Document Modal */}
      <Modal isOpen={showCreateGrnModal} toggle={handleCancelCreateGrn} centered>
        <ModalHeader toggle={handleCancelCreateGrn}>Upload GRN Document</ModalHeader>
        <ModalBody>
          <div className="mb-3">
            <p className="text-muted">Upload GRN document for Purchase Order: <strong>{purchaseOrder?.orderNo}</strong></p>
            <p className="text-muted">Supplier: <strong>{purchaseOrder?.supplier?.displayName || purchaseOrder?.supplier?.name}</strong></p>
          </div>
          <div className="form-group">
            <Label htmlFor="grnFile" className="form-label">
              Select GRN Document <span className="text-danger">*</span>
            </Label>
            <input
              type="file"
              id="grnFile"
              className="form-control"
              onChange={(e) => setSelectedGrnFile(e.target.files[0])}
              accept=".pdf,.jpg,.jpeg,.png"
              disabled={grnFileUploading}
            />
            <small className="text-muted">Accepted formats: PDF, JPG, PNG</small>
          </div>
          {selectedGrnFile && (
            <div className="mt-2">
              <Badge color="info">Selected: {selectedGrnFile.name}</Badge>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={handleCancelCreateGrn}>
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={handleCreateGrnSubmit}
            disabled={!selectedGrnFile || grnFileUploading}
          >
            {grnFileUploading ? 'Uploading...' : 'Upload GRN'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Order Confirmation Modal (for Draft Suppliers) */}
      <Modal
        isOpen={showOrderConfirmModal}
        toggle={() => !isConfirming && setShowOrderConfirmModal(false)}
        size="lg"
        centered
      >
        <ModalHeader toggle={() => !isConfirming && setShowOrderConfirmModal(false)}>
          Confirm Order Quantities
        </ModalHeader>
        <ModalBody>
          <p className="text-muted mb-3" style={{ fontSize: '13px' }}>
            As this is an internal supplier, you can confirm the order quantities directly.
          </p>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="text-muted" style={{ fontSize: '13px' }}>
              Order: <strong className="text-dark">{purchaseOrder?.orderNo}</strong>
            </span>
            <Button
              color="secondary"
              outline
              size="sm"
              onClick={handleConfirmAll}
              style={{ fontSize: '12px' }}
            >
              <i className="bi bi-check-all me-1"></i>
              Confirm All Remaining
            </Button>
          </div>

          <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="table table-sm table-bordered" style={{ fontSize: '12px' }}>
              <thead className="table-light">
                <tr>
                  <th style={{ minWidth: '200px' }}>Item</th>
                  <th className="text-center" style={{ width: '80px' }}>Ordered</th>
                  <th className="text-center" style={{ width: '80px' }}>Confirmed</th>
                  <th className="text-center" style={{ width: '80px' }}>Remaining</th>
                  <th className="text-center" style={{ width: '120px' }}>Confirm Qty</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrder?.orderItemDetails?.filter(item => item.isActive).map((item) => {
                  const ordered = item.quantity || 0;
                  const confirmed = item.quantityConfirmed || 0;
                  const remaining = Math.max(0, ordered - confirmed);
                  const isFullyConfirmed = remaining === 0;

                  return (
                    <tr key={item.purchaseOrderDetailId} style={isFullyConfirmed ? { backgroundColor: '#f8f9fa' } : {}}>
                      <td>
                        <div className="fw-medium" style={{ fontSize: '12px' }}>
                          {item.partDescription || item.partId || 'N/A'}
                        </div>
                        {item.partId && (
                          <small className="text-muted">{item.partId}</small>
                        )}
                      </td>
                      <td className="text-center align-middle">
                        <span className="fw-medium">{ordered}</span>
                      </td>
                      <td className="text-center align-middle">
                        <span className={confirmed > 0 ? 'text-success fw-medium' : 'text-muted'}>
                          {confirmed}
                        </span>
                      </td>
                      <td className="text-center align-middle">
                        <span className={remaining > 0 ? 'fw-medium' : 'text-muted'}>
                          {remaining}
                        </span>
                      </td>
                      <td className="text-center align-middle">
                        {isFullyConfirmed ? (
                          <span className="text-muted" style={{ fontSize: '11px' }}>
                            <i className="bi bi-check me-1"></i>
                            Complete
                          </span>
                        ) : (
                          <Input
                            type="number"
                            min="0"
                            max={remaining}
                            value={confirmQuantities[item.purchaseOrderDetailId] || 0}
                            onChange={(e) =>
                              handleConfirmQuantityChange(e, item.purchaseOrderDetailId, remaining)
                            }
                            style={{
                              width: '80px',
                              textAlign: 'center',
                              fontSize: '12px',
                              padding: '4px 8px',
                              margin: '0 auto',
                            }}
                            disabled={isConfirming}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-3 pt-3 border-top" style={{ fontSize: '12px' }}>
            <Row>
              <Col md={6}>
                <div className="d-flex justify-content-between text-muted">
                  <span>Total Items:</span>
                  <strong className="text-dark">{purchaseOrder?.orderItemDetails?.filter(i => i.isActive).length || 0}</strong>
                </div>
              </Col>
              <Col md={6}>
                <div className="d-flex justify-content-between text-muted">
                  <span>Items to Confirm:</span>
                  <strong className="text-dark">
                    {Object.values(confirmQuantities).filter(qty => qty > 0).length}
                  </strong>
                </div>
              </Col>
            </Row>
          </div>
        </ModalBody>
        <ModalFooter className="border-top">
          <Button
            color="light"
            onClick={() => setShowOrderConfirmModal(false)}
            disabled={isConfirming}
          >
            Cancel
          </Button>
          <Button
            color="dark"
            onClick={handleConfirmOrderSubmit}
            disabled={isConfirming || Object.values(confirmQuantities).every(qty => !qty || qty === 0)}
          >
            {isConfirming ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Confirming...
              </>
            ) : (
              <>
                <i className="bi bi-check me-1"></i>
                Confirm Order
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Reapproval Confirmation Modal */}
      <Modal isOpen={showReapprovalModal} toggle={handleCancelReapproval} centered>
        <ModalHeader toggle={handleCancelReapproval}>
          <i className="bi bi-arrow-clockwise text-warning me-2"></i>
          Confirm Reapproval
        </ModalHeader>
        <ModalBody>
          <div className="text-center">
            <i className="bi bi-exclamation-triangle text-warning mb-3" style={{ fontSize: '48px' }}></i>
            <h6 className="mb-3">Trigger Reapproval Process</h6>
            <p className="text-muted mb-3">
              This will restart the approval workflow for Purchase Order: <strong>{purchaseOrder?.orderNo}</strong>
            </p>
            <div className="alert alert-info" style={{ fontSize: '14px' }}>
              <i className="bi bi-info-circle me-2"></i>
              The approval process will start from the beginning and all previous approvals will be reset.
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={handleCancelReapproval}>
            Cancel
          </Button>
          <Button color="warning" onClick={handleConfirmReapproval}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Confirm Reapproval
          </Button>
        </ModalFooter>
      </Modal>

      {/* Purchase Order History Timeline */}
      <PurchaseOrderHistoryTimeline
        isOpen={showPOHistory}
        toggle={() => setShowPOHistory(false)}
        purchaseOrderId={purchaseOrderId}
        companyId={companyId}
        supplierCurrency={purchaseOrder?.originalCurrencyCode || purchaseOrder?.orderItemDetails?.[0]?.originalCurrencyCode || 'USD'}
        companyCurrency={purchaseOrder?.convertedCurrencyCode || getCompanyCurrency() || 'INR'}
      />

    </div>
  );
};

export default PurchaseOrderDetail;