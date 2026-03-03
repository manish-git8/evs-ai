import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Badge,
  Spinner,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Label,
  Row,
  Col,
} from "reactstrap";
import Swal from 'sweetalert2';
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaHistory, FaArrowLeft, FaCheck, FaExclamationTriangle, FaEye, FaPaperclip, FaList, FaThLarge } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import ComponentCard from "../../components/ComponentCard";
import RqfService from "../../services/RfqService";
import SupplierService from "../../services/SupplierService";
import { getEntityId, getUserId } from "../localStorageUtil";
import { formatCurrency, getCurrencySymbol } from "../../utils/currencyUtils";
import UserService from "../../services/UserService";
import { RFQ_SUPPLIER_STATUS } from "../../constant/RfqConstant";
import AddressService from "../../services/AddressService";
import '../CompanyManagement/ReactBootstrapTable.scss';
import './SupplierResponseForm.scss';
import FileUploadService from "../../services/FileUploadService";
import PurchaseOrderService from "../../services/PurchaseOrderService";
import aiIcon from '../../assets/images/ai_image/Ai_star_img.png';

// New Components
import SupplierSummaryCard from "./SupplierSummaryCard";
import ItemComparisonRow from "./ItemComparisonRow";
import SelectionSummaryBar from "./SelectionSummaryBar";

// Debounce utility function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const SupplierResponseForm = () => {
  const { rfqId } = useParams();
  const companyId = getEntityId();
  const userId = getUserId();
  const navigate = useNavigate();

  // State
  const [rfqData, setRfqData] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [responseItems, setResponseItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);
  const [currentNegotiation, setCurrentNegotiation] = useState({ supplierIndex: 0, itemIndex: 0 });
  const [showOverrideSignoffModal, setShowOverrideSignoffModal] = useState(false);
  const [overrideNotes, setOverrideNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileId, setUploadedFileId] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [billingAddresses, setBillingAddresses] = useState([]);
  const [selectedSupplierForAction, setSelectedSupplierForAction] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPO, setIsGeneratingPO] = useState(false);
  const [poStatus, setPoStatus] = useState({});
  const [showAIRecommendationModal, setShowAIRecommendationModal] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Map());
  const [showSelectedItemsSignoffModal, setShowSelectedItemsSignoffModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [generatingPOForSuppliers, setGeneratingPOForSuppliers] = useState(new Set());
  const [viewMode, setViewMode] = useState("items"); // "items" or "table"

  // Refs
  const poGenerationInProgress = useRef(new Set());
  const abortController = useRef(null);

  // Initialize selected items from API data
  useEffect(() => {
    if (rfqData && suppliers.length > 0) {
      const initialSelectedItems = new Map();
      suppliers.forEach(supplier => {
        if (supplier.selectedRfqItemIds && supplier.selectedRfqItemIds.length > 0) {
          supplier.selectedRfqItemIds.forEach(itemId => {
            initialSelectedItems.set(itemId, supplier.supplierId);
          });
        }
      });
      setSelectedItems(initialSelectedItems);
    }
  }, [rfqData, suppliers]);

  // Load RFQ data
  const loadRfqData = async () => {
    try {
      setLoading(true);
      const rfqResponse = await RqfService.getRfqById(companyId, rfqId);
      setRfqData(rfqResponse.data);

      const poResponse = await PurchaseOrderService.getPurchaseOrdersPaginated(companyId, {
        pageSize: 100,
        pageNumber: 0,
        rfqId
      });

      const poStatusMap = {};
      const poDataMap = {};
      const poData = poResponse.data && poResponse.data.content ? poResponse.data.content : (poResponse.data || []);

      poData.forEach(po => {
        if (po.supplier?.supplierId) {
          poStatusMap[po.supplier.supplierId] = true;
          poDataMap[po.supplier.supplierId] = po;
        }
      });

      setPoStatus(poStatusMap);

      const suppliersWithDetails = await Promise.all(
        rfqResponse.data.suppliers.map(async (supplier) => {
          try {
            const detail = await SupplierService.getSupplierById(supplier.supplierId);
            const detailAddress = detail?.data[0]?.address;
            const formattedAddress = [
              detailAddress?.addressLine1,
              detailAddress?.city,
              detailAddress?.country,
              detailAddress?.postalCode,
            ].filter(Boolean).join(", ");

            return {
              ...supplier,
              name: detail.data[0]?.name || "",
              email: detail.data[0]?.email || "",
              contactPerson: detail.data[0]?.primaryContact || "",
              address: formattedAddress,
              purchaseOrderId: poDataMap[supplier.supplierId]?.purchaseOrderId || null,
              purchaseOrderData: poDataMap[supplier.supplierId] || null,
              selectedRfqItemIds: supplier.selectedRfqItemIds || []
            };
          } catch (error) {
            console.error(`Error fetching supplier ${supplier.supplierId}:`, error);
            return {
              ...supplier,
              name: "",
              email: "",
              contactPerson: "",
              address: "",
              purchaseOrderId: null,
              purchaseOrderData: null,
              selectedRfqItemIds: supplier.selectedRfqItemIds || []
            };
          }
        })
      );

      setSuppliers(suppliersWithDetails);

      const initialSelectedItems = new Map();
      suppliersWithDetails.forEach(supplier => {
        if (supplier.selectedRfqItemIds && supplier.selectedRfqItemIds.length > 0) {
          supplier.selectedRfqItemIds.forEach(itemId => {
            initialSelectedItems.set(itemId, supplier.supplierId);
          });
        }
      });
      setSelectedItems(initialSelectedItems);

      setResponseItems(
        suppliersWithDetails.map((supplier) => {
          const existingResponse = supplier.responseItems || [];
          return {
            supplierId: supplier.supplierId,
            items: rfqResponse.data.rfqItems.map((rfqItem) => {
              const existingItem = existingResponse.find((item) => item.rfqItemId === rfqItem.rfqItemId);
              return {
                rfqItemId: rfqItem.rfqItemId,
                unitPrice: existingItem?.unitPrice?.toString() || "",
                negotiationHistory: existingItem?.negotiationHistory || "",
                quantity: existingItem?.quantity || rfqItem?.quantity || "",
                originalQuantity: rfqItem?.quantity || "",
              };
            }),
          };
        })
      );
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to fetch RFQ data");
      console.error("Error fetching RFQ data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRfqData();
  }, [companyId, rfqId]);

  useEffect(() => {
    AddressService.getAllAddressByCompany(companyId, "BILLING")
      .then((response) => setBillingAddresses(response.data))
      .catch((error) => {
        toast.dismiss();
        toast.error("Failed to fetch billing addresses");
        console.error("Error fetching billing addresses:", error);
      });
  }, [companyId]);

  // Helper functions
  const hasValidUnitPrice = (supplierId, itemId) => {
    const supplierResponse = responseItems.find(r => r.supplierId === supplierId);
    if (!supplierResponse) return false;
    const item = supplierResponse.items.find(i => i.rfqItemId === itemId);
    return item && parseFloat(item.unitPrice) > 0;
  };

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.supplierId === supplierId);
    return supplier?.name || 'Unknown Supplier';
  };

  const getItemDetails = (itemId) => {
    return rfqData?.rfqItems.find(i => i.rfqItemId === itemId) || null;
  };

  // Selection handlers
  const handleItemSelection = (supplierId, itemId, isSelected) => {
    if (isSelected && !hasValidUnitPrice(supplierId, itemId)) {
      toast.dismiss();
      toast.error("Please enter a valid unit price before selecting this item");
      return;
    }

    const newSelectedItems = new Map(selectedItems);
    if (isSelected) {
      const currentSupplierId = newSelectedItems.get(itemId);
      if (currentSupplierId && currentSupplierId !== supplierId) {
        toast.dismiss();
        toast.error("This item is already selected from another supplier");
        return;
      }
      newSelectedItems.set(itemId, supplierId);
    } else {
      newSelectedItems.delete(itemId);
    }
    setSelectedItems(newSelectedItems);
  };

  // For ItemComparisonRow - simplified selection handler
  const handleSelectSupplierForItem = (supplierId, itemId) => {
    const currentSelection = selectedItems.get(itemId);
    if (currentSelection === supplierId) {
      // Deselect if clicking the same supplier
      const newSelectedItems = new Map(selectedItems);
      newSelectedItems.delete(itemId);
      setSelectedItems(newSelectedItems);
    } else {
      handleItemSelection(supplierId, itemId, true);
    }
  };

  // Price and quantity handlers
  const handleUnitPriceChange = (supplierIndex, itemIndex, value) => {
    const newResponseItems = [...responseItems];
    newResponseItems[supplierIndex].items[itemIndex].unitPrice = value;
    setResponseItems(newResponseItems);

    const supplier = suppliers[supplierIndex];
    const item = rfqData.rfqItems[itemIndex];
    if (selectedItems.get(item.rfqItemId) === supplier.supplierId && parseFloat(value) <= 0) {
      const newSelectedItems = new Map(selectedItems);
      newSelectedItems.delete(item.rfqItemId);
      setSelectedItems(newSelectedItems);
    }
  };

  const handleAcceptedQtyChange = (supplierIndex, itemIndex, value) => {
    const newResponseItems = [...responseItems];
    const originalQty = parseFloat(newResponseItems[supplierIndex].items[itemIndex].originalQuantity);
    const newValue = parseFloat(value);

    if (!Number.isNaN(newValue)) {
      if (newValue > originalQty) {
        toast.error(`Accepted quantity cannot exceed original quantity (${originalQty})`);
        return;
      }
      if (newValue < 0) {
        toast.error(`Accepted quantity cannot be negative`);
        return;
      }
    }

    newResponseItems[supplierIndex].items[itemIndex].quantity = Number.isNaN(newValue) ? "" : value.toString();
    setResponseItems(newResponseItems);
  };

  // For ItemComparisonRow - price change handler with item lookup
  const handlePriceChangeForItem = (supplierIndex, itemId, value) => {
    const itemIndex = rfqData.rfqItems.findIndex(i => i.rfqItemId === itemId);
    if (itemIndex !== -1) {
      handleUnitPriceChange(supplierIndex, itemIndex, value);
    }
  };

  const handleQuantityChangeForItem = (supplierIndex, itemId, value) => {
    const itemIndex = rfqData.rfqItems.findIndex(i => i.rfqItemId === itemId);
    if (itemIndex !== -1) {
      handleAcceptedQtyChange(supplierIndex, itemIndex, value);
    }
  };

  // Negotiation dialog
  const openNegotiationDialog = (supplierIndex, item) => {
    const itemIndex = rfqData.rfqItems.findIndex(i => i.rfqItemId === item.rfqItemId);
    setCurrentNegotiation({ supplierIndex, itemIndex });
    setShowNegotiationDialog(true);
  };

  // Save supplier response
  const handleSaveSupplierResponse = async (supplierIndex) => {
    try {
      setIsSaving(true);
      const supplier = suppliers[supplierIndex];

      if (supplier.supplierStatus === "rejected") {
        toast.error("Cannot save changes for a rejected supplier");
        return;
      }

      const supplierResponseItems = responseItems.find((item) => item.supplierId === supplier.supplierId);

      const responseData = {
        rfqSupplierId: supplier.rfqSupplierId,
        supplierId: supplier.supplierId,
        supplierStatus: supplier.supplierStatus === "rejected" ? "rejected" : "negotiation",
        selectedRfqItemIds: [],
        responseItems: supplierResponseItems.items.map((item) => ({
          rfqSupplierResponseItemId: 0,
          rfqItemId: item.rfqItemId,
          unitPrice: item.unitPrice || 0,
          negotiationHistory: item.negotiationHistory || "",
          quantity: item.quantity || item.originalQuantity || "",
        })),
        signOffRequests: { requestedBy: {} },
      };

      await RqfService.saveSupplierResponse(companyId, rfqId, supplier.supplierId, responseData);
      toast.dismiss();
      toast.success('Supplier Response saved successfully');
      await loadRfqData();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.dismiss();
      toast.error('Failed to save supplier');
    } finally {
      setIsSaving(false);
    }
  };

  // Sign-off request
  const submitSelectedItemsSignoffRequest = async () => {
    try {
      setIsSaving(true);
      const groupedBySupplier = {};
      selectedItems.forEach((supplierId, itemId) => {
        if (!groupedBySupplier[supplierId]) {
          groupedBySupplier[supplierId] = [];
        }
        groupedBySupplier[supplierId].push(itemId);
      });

      const rfqSuppliers = Object.entries(groupedBySupplier).map(([supplierId, itemIds]) => {
        const supplier = suppliers.find(s => s.supplierId === parseInt(supplierId, 10));
        if (!supplier) return null;
        return {
          rfqSupplierId: supplier.rfqSupplierId,
          supplierId: supplier.supplierId,
          createdBy: { userId },
          updatedBy: { userId },
          selectedRfqItemIds: itemIds,
        };
      }).filter(Boolean);

      const signOffPayload = {
        rfqSupplierId: rfqSuppliers[0]?.rfqSupplierId || null,
        requestedBy: { userId },
        rfqSuppliers,
        signoffUsers: selectedUsers.map((selectedUserId) => ({
          signoffUserId: { userId: selectedUserId },
        })),
      };

      await RqfService.requsetSignOff(companyId, rfqId, signOffPayload);
      toast.dismiss();
      toast.success("Sign-off request sent successfully for selected items");
      await loadRfqData();
      setShowSelectedItemsSignoffModal(false);
      setSelectedUsers([]);
      setSelectedItems(new Map());
    } catch (err) {
      console.error("Error sending signoff request:", err);
      toast.dismiss();
      toast.error("Failed to request sign-off");
    } finally {
      setIsSaving(false);
    }
  };

  // Override sign-off
  const handleOverrideSignoff = (supplier) => {
    setSelectedSupplierForAction(supplier);
    setShowOverrideSignoffModal(true);
  };

  const submitOverrideSignoff = async () => {
    setIsSaving(true);
    try {
      if (!overrideNotes.trim()) {
        toast.dismiss();
        toast.error("Please enter notes for override");
        return;
      }

      const overridePayload = {
        comments: overrideNotes,
        requestedBy: selectedSupplierForAction.signOffRequests.requestedBy,
        resolvedBy: { userId },
        attachments: uploadedFileId ? [{
          attachmentId: 0,
          linkedEntityId: 0,
          fileId: uploadedFileId,
        }] : [],
      };

      await RqfService.overrideSignOff(
        companyId,
        rfqId,
        selectedSupplierForAction.signOffRequests.rfqSignOffId,
        overridePayload,
      );

      const result = await Swal.fire({
        title: 'Success!',
        text: 'Sign-off overridden successfully. Would you like to generate a PO now?',
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Generate PO Now',
        cancelButtonText: 'Later',
        customClass: {
          confirmButton: 'btn btn-primary',
          cancelButton: 'btn btn-secondary'
        },
        buttonsStyling: false
      });

      if (result.isConfirmed) {
        debouncedGeneratePO(selectedSupplierForAction);
      } else {
        await loadRfqData();
      }

      setShowOverrideSignoffModal(false);
      setOverrideNotes("");
      setUploadedFileId(null);
    } catch (error) {
      console.error("Error overriding sign-off:", error);
      toast.dismiss();
      toast.error("Failed to override sign-off");
    } finally {
      setIsSaving(false);
    }
  };

  // File handling
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFileId(null);
    setUploadError(null);

    try {
      setIsUploading(true);
      const uploadResponse = await FileUploadService.uploadFile(companyId, file);
      setUploadedFileId(uploadResponse.data.fileId);
      toast.dismiss();
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("File upload failed:", error);
      setUploadError("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewAttachment = async (fileId, fileName) => {
    try {
      const response = await FileUploadService.downloadFile(fileId);
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `attachment_${fileId}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      toast.error("Failed to download attachment");
    }
  };

  // User search for sign-off
  const fetchUsers = async () => {
    try {
      let res;
      if (searchTerm.trim() === "") {
        res = await UserService.fetchAllCompanyUsers(companyId);
      } else {
        res = await UserService.getUsersBySearch(searchTerm, companyId);
      }
      setFilteredUsers(res.data?.content || res.data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.dismiss();
      toast.error("Failed to fetch users");
    }
  };

  useEffect(() => {
    if (showSelectedItemsSignoffModal) {
      fetchUsers();
    }
  }, [showSelectedItemsSignoffModal]);

  useEffect(() => {
    if (showSelectedItemsSignoffModal) {
      const delayDebounce = setTimeout(() => fetchUsers(), 300);
      return () => clearTimeout(delayDebounce);
    }
    return undefined;
  }, [searchTerm, showSelectedItemsSignoffModal]);

  // PO Generation
  const handleGeneratePO = useCallback(async (supplier) => {
    const { supplierId, name } = supplier;

    if (poGenerationInProgress.current.has(supplierId)) {
      console.log('PO generation already in progress for supplier:', supplierId);
      return;
    }

    if (poStatus[supplierId]) {
      toast.dismiss();
      toast.info(`A purchase order already exists for ${name}`);
      return;
    }

    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    try {
      poGenerationInProgress.current.add(supplierId);
      setGeneratingPOForSuppliers(prev => new Set(prev).add(supplierId));
      setIsGeneratingPO(true);

      const currentRfq = rfqData;
      const selectedItemIds = [];
      selectedItems.forEach((supId, itemId) => {
        if (supId === supplierId) {
          selectedItemIds.push(itemId);
        }
      });

      const apiSelectedItems = supplier.selectedRfqItemIds || [];
      const allSelectedItems = selectedItemIds.length > 0 ? selectedItemIds : apiSelectedItems;

      if (allSelectedItems.length === 0) {
        toast.dismiss();
        toast.error("Please select items for this supplier before generating PO");
        return;
      }

      const hasInvalidItems = allSelectedItems.some(itemId => {
        const responseItem = responseItems
          .find(res => res.supplierId === supplierId)
          ?.items.find(i => i.rfqItemId === itemId);
        return !responseItem || parseFloat(responseItem?.unitPrice || 0) <= 0;
      });

      if (hasInvalidItems) {
        toast.dismiss();
        toast.error(`Please enter valid unit prices for all selected items`);
        return;
      }

      const selectedRfqItems = currentRfq.rfqItems.filter(item =>
        allSelectedItems.includes(item.rfqItemId)
      );

      const orderItemDetails = selectedRfqItems.map((item) => {
        const responseItem = responseItems
          .find((res) => res.supplierId === supplierId)
          ?.items.find((i) => i.rfqItemId === item.rfqItemId);

        const quantity = parseFloat(responseItem?.quantity || item.quantity || 0);
        const unitPrice = parseFloat(responseItem?.unitPrice || 0);
        const itemTotal = quantity * unitPrice;

        return {
          rfqItemId: item.rfqItemId,
          partId: item.partId,
          partDescription: item.description,
          unitPrice,
          quantity,
          unitOfMeasurement: item.uom,
          itemTotal,
          notes: item.notes || '',
        };
      });

      const orderTotal = orderItemDetails.reduce((total, item) => total + item.itemTotal, 0);

      const payload = {
        company: {
          companyId,
          name: currentRfq.company?.name || '',
          displayName: currentRfq.company?.displayName || '',
        },
        supplier: {
          supplierId,
          name: supplier.name || '',
          email: supplier.email || '',
          contactPerson: supplier.contactPerson || '',
        },
        rfq: rfqId,
        shippingToAddress: {
          addressId: currentRfq.shipToAddressId || 0,
          addressLine1: currentRfq.shippingAddress?.addressLine1 || '',
          city: currentRfq.shippingAddress?.city || '',
          state: currentRfq.shippingAddress?.state || '',
          postalCode: currentRfq.shippingAddress?.postalCode || '',
          country: currentRfq.shippingAddress?.country || '',
          isoCountryCode: currentRfq.shippingAddress?.isoCountryCode || '',
          addressType: currentRfq.shippingAddress?.addressType || 'shipping',
        },
        billingToAddress: {
          addressId: billingAddresses?.[0]?.addressId || 0,
          addressLine1: billingAddresses?.[0]?.addressLine1 || '',
          city: billingAddresses?.[0]?.city || '',
          state: billingAddresses?.[0]?.state || '',
          postalCode: billingAddresses?.[0]?.postalCode || '',
          country: billingAddresses?.[0]?.country || '',
          isoCountryCode: billingAddresses?.[0]?.isoCountryCode || '',
          addressType: billingAddresses?.[0]?.addressType || 'billing',
        },
        orderItemDetails,
        orderTotal,
        notes: currentRfq.notes,
      };

      const response = await PurchaseOrderService.createPurchaseOrder(companyId, payload, {
        signal: abortController.current.signal
      });

      if (abortController.current.signal.aborted) {
        console.log('PO generation aborted for supplier:', supplierId);
        return;
      }

      toast.dismiss();
      toast.success('Purchase Order created successfully!');

      setPoStatus(prev => ({ ...prev, [supplierId]: true }));
      setSuppliers(prevSuppliers =>
        prevSuppliers.map(s =>
          s.supplierId === supplierId
            ? {
              ...s,
              purchaseOrderId: response.data.purchaseOrderId || response.data.purchaseOrderID,
              purchaseOrderData: response.data
            }
            : s
        )
      );

      await loadRfqData();
    } catch (error) {
      if (error.name === 'AbortError' || abortController.current?.signal.aborted) {
        console.log('PO generation aborted for supplier:', supplierId);
        return;
      }

      console.error('PO creation failed:', error);
      let errorMessage = 'Failed to create Purchase Order';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      poGenerationInProgress.current.delete(supplierId);
      setGeneratingPOForSuppliers(prev => {
        const newSet = new Set(prev);
        newSet.delete(supplierId);
        return newSet;
      });
      if (poGenerationInProgress.current.size === 0) {
        setIsGeneratingPO(false);
      }
    }
  }, [poStatus, rfqData, selectedItems, responseItems, companyId, rfqId, billingAddresses]);

  const debouncedGeneratePO = useMemo(() =>
    debounce((supplier) => handleGeneratePO(supplier), 500),
    [handleGeneratePO]
  );

  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
      poGenerationInProgress.current.clear();
    };
  }, []);

  const handleViewPOs = async () => {
    try {
      const response = await PurchaseOrderService.getPurchaseOrdersPaginated(companyId, {
        pageSize: 100,
        pageNumber: 0,
        rfqId
      });
      const poData = response.data && response.data.content ? response.data.content : (response.data || []);
      setPurchaseOrders(poData);
      setShowPOModal(true);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      toast.dismiss();
      toast.error("Failed to fetch purchase orders");
    }
  };

  const handlePOClick = (poId) => {
    navigate(`/purchase-order-detail/${poId}`);
  };

  // AI Recommendation
  const handleAIRecommendationClick = async () => {
    setLoadingRecommendation(true);
    const supplierIds = suppliers.map((supplier) => supplier.supplierId);

    try {
      const response = await RqfService.getSupplierByAIRecommendation(supplierIds);
      const recommendedSupplier = suppliers.find(
        (supplier) => supplier.supplierId === response.data.recommendedSupplierId
      );
      setAiRecommendation({
        ...response.data,
        supplierName: recommendedSupplier?.name || 'Unknown Supplier',
      });
      setShowAIRecommendationModal(true);
    } catch (err) {
      const errorMessage = err?.response?.data?.errorMessage ||
        err?.response?.errorMessage ||
        'Something went wrong. Please try again.';
      toast.dismiss();
      toast.error(errorMessage);
    } finally {
      setLoadingRecommendation(false);
    }
  };

  // Computed values
  const sortedSuppliers = [...suppliers].sort((a, b) => {
    const statusOrder = {
      signoff_requested: 1, finalized: 2, shortlisted: 3,
      negotiation: 4, draft: 5, submitted: 6, rejected: 7
    };
    return statusOrder[a.supplierStatus] - statusOrder[b.supplierStatus];
  });

  const isAnySignoffRequested = suppliers.some(
    (s) => s.supplierStatus === "signoff_requested" || s.supplierStatus === "finalized"
  );

  const isSignoff = suppliers.some((s) => s.supplierStatus === "signoff_requested");
  const isAnyFinalized = suppliers.some((s) => s.supplierStatus === "finalized");
  const isRfqCompletedOrClosed = () => rfqData?.rfqStatus === "completed" || rfqData?.rfqStatus === "closed";
  const isRfqClosed = () => rfqData?.rfqStatus === "closed" || rfqData?.rfqStatus !== "completed";

  const hasApprovalPaths = suppliers.some(supplier =>
    (supplier.supplierStatus === "signoff_requested" || supplier.supplierStatus === "finalized") &&
    supplier.signOffRequests?.signoffUsers.length > 0
  );

  const calculateSupplierTotal = (supplierId) => {
    const supplierIndex = suppliers.findIndex(s => s.supplierId === supplierId);
    if (supplierIndex === -1) return 0;
    return rfqData.rfqItems.reduce((total, item, itemIndex) => {
      const responseItem = responseItems[supplierIndex]?.items[itemIndex];
      const quantity = parseFloat(responseItem?.quantity || item.quantity);
      const unitPrice = parseFloat(responseItem?.unitPrice || 0);
      return total + (quantity * unitPrice);
    }, 0);
  };

  const memoizedSupplierTotals = useMemo(() => {
    return sortedSuppliers.map(supplier => ({
      supplierId: supplier.supplierId,
      total: calculateSupplierTotal(supplier.supplierId),
    }));
  }, [sortedSuppliers, responseItems, rfqData]);

  const lowestTotal = useMemo(() =>
    Math.min(...memoizedSupplierTotals.map(s => s.total).filter(t => t > 0)),
    [memoizedSupplierTotals]
  );

  const lowestPricePerItem = useMemo(() => {
    const lowestPrices = new Map();
    if (!rfqData?.rfqItems) return lowestPrices;

    rfqData.rfqItems.forEach(item => {
      let lowestPrice = Infinity;
      let lowestSupplierId = null;

      responseItems.forEach(response => {
        const responseItem = response.items.find(i => i.rfqItemId === item.rfqItemId);
        const price = parseFloat(responseItem?.unitPrice || 0);
        if (price > 0 && price < lowestPrice) {
          lowestPrice = price;
          lowestSupplierId = response.supplierId;
        }
      });

      if (lowestSupplierId) {
        lowestPrices.set(item.rfqItemId, { price: lowestPrice, supplierId: lowestSupplierId });
      }
    });
    return lowestPrices;
  }, [rfqData, responseItems]);

  const totalValue = useMemo(() =>
    Array.from(selectedItems.entries()).reduce((total, [itemId, supplierId]) => {
      const item = getItemDetails(itemId);
      const supplierResponse = responseItems.find(r => r.supplierId === supplierId);
      const responseItem = supplierResponse?.items.find(i => i.rfqItemId === itemId);
      return total + (parseFloat(responseItem?.unitPrice || 0) * parseFloat(responseItem?.quantity || item?.quantity || 0));
    }, 0),
    [selectedItems, responseItems, rfqData]
  );

  // Get currency for selected items total - if all from same supplier, use that currency
  const selectedItemsCurrency = useMemo(() => {
    const supplierIds = [...new Set(Array.from(selectedItems.values()))];
    if (supplierIds.length === 1) {
      const supplier = suppliers.find(s => s.supplierId === supplierIds[0]);
      return supplier?.supplierCurrency || 'USD';
    }
    return 'USD'; // Mixed suppliers - default to USD
  }, [selectedItems, suppliers]);

  const suppliersWithSelections = useMemo(() => {
    const supplierIds = new Set(selectedItems.values());
    return suppliers.filter(s => supplierIds.has(s.supplierId));
  }, [selectedItems, suppliers]);

  const getSelectedItemsCountForSupplier = (supplierId) => {
    return Array.from(selectedItems.entries()).filter(([_, supId]) => supId === supplierId).length;
  };

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner />
        <p>Loading supplier response form...</p>
      </div>
    );
  }

  // Empty state
  if (!rfqData || !suppliers.length) {
    return (
      <div className="text-center py-5">
        <p>No RFQ or supplier data found</p>
        <Button color="secondary" onClick={() => navigate("/rfq")}>
          <FaArrowLeft className="me-2" /> Back
        </Button>
      </div>
    );
  }

  return (
    <>
      <ComponentCard
        title={
          <div className="d-flex align-items-center gap-2">
            <span>{rfqData.rfqNumber || `RFQ-${rfqData.rfqId}`}</span>
            {rfqData.title && <small className="text-muted">- {rfqData.title}</small>}
            <div
              className="text-primary cursor-pointer small ms-auto"
              onClick={handleAIRecommendationClick}
              style={{ fontSize: '11px', cursor: 'pointer' }}
            >
              <img className="mb-1" width="18" height="18" src={aiIcon} alt="AI" />
              {loadingRecommendation ? <Spinner size="sm" className="ms-1" /> : <>AI Insights</>}
            </div>
          </div>
        }
      >
        <CardBody style={{ padding: "12px" }}>
          {/* Selection Summary Bar */}
          <SelectionSummaryBar
            selectedItemsCount={selectedItems.size}
            totalValue={totalValue}
            totalValueCurrency={selectedItemsCurrency}
            suppliersWithSelections={suppliersWithSelections}
            onRequestSignoff={() => setShowSelectedItemsSignoffModal(true)}
            isSignoffRequested={isSignoff}
            isFinalized={isAnyFinalized}
            isSaving={isSaving}
            canRequestSignoff={!isAnySignoffRequested}
          />

          {/* Supplier Summary Cards */}
          <div className="supplier-cards-container">
            {sortedSuppliers.map((supplier) => {
              const supplierTotal = memoizedSupplierTotals.find(s => s.supplierId === supplier.supplierId)?.total || 0;
              const isLowestBid = supplierTotal === lowestTotal && supplierTotal > 0;
              const selectedCount = getSelectedItemsCountForSupplier(supplier.supplierId);

              return (
                <SupplierSummaryCard
                  key={supplier.supplierId}
                  supplier={supplier}
                  supplierTotal={supplierTotal}
                  selectedItemsCount={selectedCount}
                  isLowestBid={isLowestBid}
                  isAIRecommended={aiRecommendation?.recommendedSupplierId === supplier.supplierId}
                  isActive={false}
                  onClick={() => {}}
                  disabled={supplier.supplierStatus === "rejected"}
                />
              );
            })}
          </div>

          {/* Approval Path Section */}
          {hasApprovalPaths && (
            <Row className="mb-3">
              <Col>
                <Card className="approval-path-card">
                  <CardHeader className="approval-path-header">
                    {(() => {
                      const supplierWithSignoff = sortedSuppliers?.find(
                        (s) => s.signOffRequests?.signoffUsers?.length > 0
                      );
                      const signOffAttachments = supplierWithSignoff?.signOffRequests?.attachments || [];

                      return (
                        <div className="d-flex justify-content-between align-items-center w-100">
                          <CardTitle className="d-flex align-items-center gap-2 mb-0">
                            <FaCheck size={14} />
                            <span>Approval Path</span>
                          </CardTitle>
                          {signOffAttachments.length > 0 && (
                            <div className="header-attachments">
                              {signOffAttachments.map((attachment) => (
                                <button
                                  key={attachment.attachmentId}
                                  type="button"
                                  className="header-attachment-btn"
                                  onClick={() => handleViewAttachment(attachment.fileId, attachment.fileName)}
                                  title={attachment.fileName || 'View Attachment'}
                                >
                                  <FaPaperclip size={12} />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardHeader>
                  <CardBody className="approval-path-body">
                    {(() => {
                      const supplierWithSignoff = sortedSuppliers?.find(
                        (s) => s.signOffRequests?.signoffUsers?.length > 0
                      );
                      const allSignoffUsers = supplierWithSignoff?.signOffRequests?.signoffUsers || [];
                      const signOffRequest = supplierWithSignoff?.signOffRequests;
                      const hasOverride = allSignoffUsers.some(u => u.signoffStatus === "overridden");

                      if (allSignoffUsers.length === 0) {
                        return <div className="text-muted text-center py-3">No signoff users found</div>;
                      }

                      return (
                        <div className="approval-timeline">
                          {hasOverride && signOffRequest && (
                            <div className="override-info-section top">
                              <div className="override-header">
                                <FaExclamationTriangle size={12} />
                                <span>Override Details</span>
                              </div>
                              {signOffRequest.resolvedBy && (
                                <div className="override-detail">
                                  <span className="detail-label">Overridden by:</span>
                                  <span className="detail-value">
                                    {signOffRequest.resolvedBy.firstName} {signOffRequest.resolvedBy.lastName}
                                  </span>
                                </div>
                              )}
                              {signOffRequest.comments && (
                                <div className="override-detail notes">
                                  <span className="detail-label">Notes:</span>
                                  <span className="detail-value">{signOffRequest.comments}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {allSignoffUsers.map((user, index) => {
                            const isApproved = user.signoffStatus === "approved";
                            const isRejected = user.signoffStatus === "rejected";
                            const isPending = user.signoffStatus === "pending";
                            const isOverridden = user.signoffStatus === "overridden";
                            const isLast = index === allSignoffUsers.length - 1;

                            return (
                              <div key={user.rfqSignOffUserId} className={`approval-step ${isLast ? 'last' : ''}`}>
                                <div className="step-indicator">
                                  <div className={`step-circle ${isApproved ? 'approved' : ''} ${isRejected ? 'rejected' : ''} ${isPending ? 'pending' : ''} ${isOverridden ? 'overridden' : ''}`}>
                                    {isApproved && <FaCheck size={10} />}
                                    {isRejected && <span>✕</span>}
                                    {isPending && <span>{index + 1}</span>}
                                    {isOverridden && <span>!</span>}
                                  </div>
                                  {!isLast && <div className={`step-line ${isApproved ? 'completed' : ''}`} />}
                                </div>
                                <div className="step-content">
                                  <div className="step-header">
                                    <span className="step-name">
                                      {user.signoffUserId?.firstName} {user.signoffUserId?.lastName}
                                    </span>
                                    <Badge
                                      color={isApproved ? "success" : isRejected ? "danger" : isOverridden ? "info" : "warning"}
                                      className="step-badge"
                                    >
                                      {user.signoffStatus}
                                    </Badge>
                                  </div>
                                  <div className="step-email">{user.signoffUserId?.email}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </CardBody>
                </Card>
              </Col>
            </Row>
          )}

          {/* Selection Rule Alert */}
          <div className="selection-rule-alert d-flex align-items-center gap-2">
            <FaExclamationTriangle className="alert-icon" />
            <span>
              <strong>Selection Rule:</strong> Each item can only be selected from one supplier.
              Click on an item to expand and compare quotes from all suppliers.
            </span>
          </div>

          {/* View Mode Toggle */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0">
              Items Comparison ({rfqData.rfqItems.length} items)
            </h6>
            <div className="view-mode-toggle">
              <button
                className={`toggle-option ${viewMode === 'items' ? 'active' : ''}`}
                onClick={() => setViewMode('items')}
              >
                <FaList className="me-1" /> Item View
              </button>
              <button
                className={`toggle-option ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                <FaThLarge className="me-1" /> Table View
              </button>
            </div>
          </div>

          {/* Items Comparison Section */}
          <div className="items-comparison-section">
            {rfqData.rfqItems.map((item) => {
              const lowestPriceInfo = lowestPricePerItem.get(item.rfqItemId);
              const selectedSupplierId = selectedItems.get(item.rfqItemId);

              return (
                <ItemComparisonRow
                  key={item.rfqItemId}
                  item={item}
                  suppliers={sortedSuppliers}
                  responseItems={responseItems}
                  selectedSupplierId={selectedSupplierId}
                  lowestPriceSupplierId={lowestPriceInfo?.supplierId}
                  onSelectSupplier={handleSelectSupplierForItem}
                  onPriceChange={(supplierIndex, value) => {
                    const itemIndex = rfqData.rfqItems.findIndex(i => i.rfqItemId === item.rfqItemId);
                    handleUnitPriceChange(supplierIndex, itemIndex, value);
                  }}
                  onQuantityChange={(supplierIndex, value) => {
                    const itemIndex = rfqData.rfqItems.findIndex(i => i.rfqItemId === item.rfqItemId);
                    handleAcceptedQtyChange(supplierIndex, itemIndex, value);
                  }}
                  onViewNegotiationHistory={openNegotiationDialog}
                  isSignoffRequested={isAnySignoffRequested}
                  defaultExpanded={rfqData.rfqItems.length <= 3}
                />
              );
            })}
          </div>

          {/* Bottom Action Bar */}
          <div className="bottom-action-bar">
            <div className="left-actions">
              <Button color="secondary" onClick={() => navigate(`/rfqDetails/${rfqId}`)}>
                <FaArrowLeft className="me-2" />
                Back to RFQ
              </Button>
              {Object.keys(poStatus).length > 0 && (
                <Button color="info" onClick={handleViewPOs}>
                  <FaEye className="me-2" />
                  View POs
                </Button>
              )}
            </div>

            <div className="right-actions">
              {isSignoff && !isRfqCompletedOrClosed() && (
                <Button
                  color="warning"
                  onClick={() => {
                    const signoffSuppliers = suppliers.filter(
                      s => s.supplierStatus === "signoff_requested" || s.supplierStatus === "finalized"
                    );
                    signoffSuppliers.forEach(s => handleOverrideSignoff(s));
                  }}
                >
                  <FaExclamationTriangle className="me-2" />
                  Override
                </Button>
              )}

              {isAnyFinalized && !isRfqClosed() && (
                <Button
                  color="primary"
                  onClick={async () => {
                    const finalizedSuppliers = suppliers.filter(s => s.supplierStatus === "finalized");
                    const suppliersWithoutPO = finalizedSuppliers.filter(supplier => !poStatus[supplier.supplierId]);

                    if (suppliersWithoutPO.length === 0) {
                      toast.dismiss();
                      toast.info("All finalized suppliers already have purchase orders");
                      return;
                    }

                    if (suppliersWithoutPO.length > 1) {
                      const result = await Swal.fire({
                        title: 'Generate Multiple POs?',
                        text: `This will generate POs for ${suppliersWithoutPO.length} suppliers. Continue?`,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Generate All',
                        cancelButtonText: 'Cancel'
                      });
                      if (!result.isConfirmed) return;
                    }

                    suppliersWithoutPO.forEach((supplier) => debouncedGeneratePO(supplier));
                  }}
                  disabled={isGeneratingPO}
                >
                  {isGeneratingPO ? (
                    <><Spinner size="sm" className="me-2" /> Generating...</>
                  ) : (
                    "Generate PO"
                  )}
                </Button>
              )}

              {!isRfqCompletedOrClosed() && (
                <Button
                  color="success"
                  onClick={() => suppliers.forEach((_, index) => {
                    if (suppliers[index].supplierStatus !== "rejected") {
                      handleSaveSupplierResponse(index);
                    }
                  })}
                  disabled={isSaving || isAnySignoffRequested}
                >
                  {isSaving ? <><Spinner size="sm" className="me-2" /> Saving...</> : "Save All"}
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </ComponentCard>

      {/* Modals */}
      {/* AI Recommendation Modal */}
      <Modal isOpen={showAIRecommendationModal} toggle={() => setShowAIRecommendationModal(false)} centered>
        <ModalHeader toggle={() => setShowAIRecommendationModal(false)}>AI Insights</ModalHeader>
        <ModalBody style={{ maxHeight: 'calc(100vh - 200px)', overflow: 'hidden' }}>
          {loadingRecommendation ? (
            <div className="text-center py-3"><Spinner size="sm" /> Loading...</div>
          ) : aiRecommendation ? (
            <div>
              <div className="mb-3">
                <h6>Recommended Supplier:</h6>
                <p className="fw-bold" style={{ color: '#009efb' }}>{aiRecommendation.supplierName}</p>
                <h6 className="mt-3">Reason:</h6>
                <div className="reason-text" style={{
                  maxHeight: '135px', overflowY: 'auto', padding: '8px',
                  border: '1px solid #eee', borderRadius: '4px',
                }}>
                  <p className="text-muted m-0">{aiRecommendation.reason}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-3 text-muted">No recommendation available</div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowAIRecommendationModal(false)}>Close</Button>
        </ModalFooter>
      </Modal>

      {/* Selected Items Sign-off Modal */}
      <Modal isOpen={showSelectedItemsSignoffModal} toggle={() => setShowSelectedItemsSignoffModal(false)} size="lg">
        <ModalHeader toggle={() => setShowSelectedItemsSignoffModal(false)}>
          Request Sign-off for Selected Items
        </ModalHeader>
        <ModalBody>
          <div className="mb-4">
            <h6 className="text-primary mb-3">Selected Items Summary:</h6>
            <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {Array.from(selectedItems.entries()).map(([itemId, supplierId]) => {
                const supplierName = getSupplierName(supplierId);
                const supplierObj = suppliers.find(s => s.supplierId === supplierId);
                const supplierCurrency = supplierObj?.supplierCurrency || 'USD';
                const item = getItemDetails(itemId);
                const supplierResponse = responseItems.find(r => r.supplierId === supplierId);
                const responseItem = supplierResponse?.items.find(i => i.rfqItemId === itemId);
                const itemTotal = parseFloat(responseItem?.unitPrice || 0) * parseFloat(responseItem?.quantity || item?.quantity || 0);

                return (
                  <div key={`modal-${supplierId}-${itemId}`} className="mb-3 p-2 bg-light rounded">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-bold text-primary">{supplierName}</div>
                        <div className="small"><strong>{item?.partId}</strong> - {item?.description}</div>
                        <div className="small text-muted">
                          {formatCurrency(parseFloat(responseItem?.unitPrice || 0), supplierCurrency)} × {responseItem?.quantity || item?.quantity} {item?.uom}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold text-success">{formatCurrency(itemTotal, supplierCurrency)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="border-top pt-2 mt-2">
                <div className="d-flex justify-content-between fw-bold">
                  <span>Total Value:</span>
                  <span className="text-success">{formatCurrency(totalValue, selectedItemsCurrency)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <Label for="userSearch">Search and Select Approvers:</Label>
            <Input
              type="text"
              id="userSearch"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users by name or email..."
              className="mb-3"
            />
          </div>

          <div className="border rounded p-3" style={{ maxHeight: "250px", overflowY: "auto" }}>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div key={user.userId} className="form-check mb-2">
                  <Input
                    type="checkbox"
                    checked={selectedUsers.includes(user.userId)}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...selectedUsers, user.userId]
                        : selectedUsers.filter((id) => id !== user.userId);
                      setSelectedUsers(updated);
                    }}
                    id={`selected-user-${user.userId}`}
                    className="form-check-input"
                  />
                  <Label for={`selected-user-${user.userId}`} className="form-check-label">
                    <div>
                      <strong>{user.firstName} {user.lastName}</strong>
                      <div className="small text-muted">{user.email}</div>
                    </div>
                  </Label>
                </div>
              ))
            ) : (
              <div className="text-center text-muted py-3">
                {searchTerm ? 'No users found matching your search.' : 'Loading users...'}
              </div>
            )}
          </div>

          {selectedUsers.length > 0 && (
            <div className="mt-3">
              <small className="text-muted">
                {selectedUsers.length} approver{selectedUsers.length !== 1 ? 's' : ''} selected
              </small>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            onClick={submitSelectedItemsSignoffRequest}
            disabled={selectedUsers.length === 0 || isSaving}
          >
            {isSaving ? <><Spinner size="sm" className="me-2" /> Sending...</> : <><FaCheck className="me-2" /> Send Request</>}
          </Button>
          <Button color="secondary" onClick={() => setShowSelectedItemsSignoffModal(false)} disabled={isSaving}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      {/* Override Sign-off Modal */}
      <Modal isOpen={showOverrideSignoffModal} toggle={() => setShowOverrideSignoffModal(false)}>
        <ModalHeader toggle={() => setShowOverrideSignoffModal(false)}>Override Sign-off</ModalHeader>
        <ModalBody>
          <div className="mb-3">
            <Label for="overrideNotes">Notes<span className="text-danger">*</span></Label>
            <Input
              type="textarea"
              id="overrideNotes"
              value={overrideNotes}
              onChange={(e) => setOverrideNotes(e.target.value)}
              rows={3}
              placeholder="Enter reason for override..."
            />
          </div>
          <div className="mb-3">
            <Label for="overrideAttachment">Attachment <span className="text-danger">*</span></Label>
            <Input type="file" id="overrideAttachment" onChange={handleFileChange} disabled={isUploading} />
            <small className="text-muted d-block mt-1">
              Upload supporting document for <strong>Rfq sign-off override</strong>
            </small>
            {isUploading && <small className="text-muted d-block mt-1">Uploading...</small>}
            {uploadedFileId && <small className="text-success d-block mt-1">File uploaded successfully</small>}
            {uploadError && <small className="text-danger d-block mt-1">{uploadError}</small>}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            onClick={submitOverrideSignoff}
            disabled={isUploading || isSaving || !overrideNotes.trim() || !uploadedFileId}
          >
            {isSaving ? "Processing..." : "Confirm Override"}
          </Button>
          <Button color="secondary" onClick={() => setShowOverrideSignoffModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Negotiation History Modal */}
      <Modal isOpen={showNegotiationDialog} toggle={() => setShowNegotiationDialog(false)}>
        <ModalHeader toggle={() => setShowNegotiationDialog(false)}>Negotiation History</ModalHeader>
        <ModalBody>
          <p className="fw-bold">{rfqData.rfqItems[currentNegotiation.itemIndex]?.description || "Item"}</p>
          {(() => {
            const rawHistory = responseItems[currentNegotiation.supplierIndex]?.items[currentNegotiation.itemIndex]?.negotiationHistory;
            let history = [];
            try {
              if (rawHistory) history = JSON.parse(rawHistory);
            } catch (err) {
              console.error("Invalid negotiation history format:", err);
            }
            return history.length > 0 ? (
              <div className="p-3 rounded" style={{ maxHeight: "300px", overflowY: "auto" }}>
                <ul className="list-unstyled mb-0">
                  {history.map((entry) => (
                    <li key={entry.dateTime} className="mb-3 pb-2 border-bottom">
                      <div className="d-flex justify-content-between">
                        <span><strong>Price:</strong> ${entry.price}</span>
                        <span>{entry.createdBy?.firstName} {entry.createdBy?.lastName}</span>
                      </div>
                      <div className="d-flex justify-content-end">
                        <small className="text-muted">{new Date(entry.dateTime).toLocaleString()}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-center py-3 text-muted">
                <FaHistory className="mb-2" size={24} />
                <p>No negotiation history yet</p>
              </div>
            );
          })()}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowNegotiationDialog(false)}>Close</Button>
        </ModalFooter>
      </Modal>

      {/* Purchase Orders Modal */}
      <Modal isOpen={showPOModal} toggle={() => setShowPOModal(false)} size="lg">
        <ModalHeader toggle={() => setShowPOModal(false)}>
          Purchase Orders for RFQ: {rfqData?.rfqNumber || rfqData?.title}
        </ModalHeader>
        <ModalBody>
          <div className="table-responsive">
            <table className="table table-striped table-bordered">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.length > 0 ? (
                  purchaseOrders.map((po) => (
                    <tr key={po.PurchaseOrderId}>
                      <td>
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); handlePOClick(po.PurchaseOrderId); }}
                          style={{ color: '#0d6efd', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          {po.orderNo}
                        </a>
                      </td>
                      <td>{po.supplier?.name || 'Unknown Supplier'}</td>
                      <td>{formatCurrency(po.orderTotal || 0, po.currencyCode || po.supplier?.currency || 'USD')}</td>
                      <td>
                        <Badge color={
                          po.orderStatus === 'APPROVED' ? 'success' :
                            po.orderStatus === 'PENDING_APPROVAL' ? 'warning' :
                              po.orderStatus === 'REJECTED' ? 'danger' : 'secondary'
                        }>
                          {po.orderStatus || ''}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center text-muted py-3">
                      No purchase orders found for this RFQ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowPOModal(false)}>Close</Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default SupplierResponseForm;
