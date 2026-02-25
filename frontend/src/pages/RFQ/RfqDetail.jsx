import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import {
  Button,
  Badge,
  Spinner,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Table,
  Input,
  Label,
  Row,
  Col,
  Alert,
  Collapse,
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';
import {
  FaPaperclip,
  FaEdit,
  FaHistory,
  FaCheck,
  FaExclamationTriangle,
  FaEye,
  FaTrophy,
  FaChevronDown,
  FaChevronUp,
  FaComment,
} from 'react-icons/fa';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import FileUploadService from '../../services/FileUploadService';
import RqfService from '../../services/RfqService';
import { getEntityId, getUserId } from '../localStorageUtil';
import '../CompanyManagement/ReactBootstrapTable.scss';
import './RfqDetail.scss';
import './SupplierResponseForm.scss';
import SupplierService from '../../services/SupplierService';
import AddressService from '../../services/AddressService';
import LocationService from '../../services/LocationService';
import DepartmentService from '../../services/DepartmentService';
import ClassService from '../../services/ClassService';
import GLAccountService from '../../services/GLaccountService';
import ProjectService from '../../services/ProjectService';
import UserService from '../../services/UserService';
import PurchaseOrderService from '../../services/PurchaseOrderService';
import RfqSupplierModal from './RfqSupplierModal';
import { RFQ_STATUS, RFQ_SUPPLIER_STATUS } from '../../constant/RfqConstant';
import AttachmentsModal from './AttachmentsModal';
import RfqHistoryTimeline from './components/RfqHistoryTimeline';
import aiIcon from '../../assets/images/ai_image/Ai_star_img.png';

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

const RFQDetail = () => {
  const { rfqId } = useParams();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isFromDashboard = params.get('dashboard') === 'true';
  const companyId = getEntityId();
  const userId = getUserId();
  const [rfqData, setRfqData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [suppliersWithDetails, setSuppliersWithDetails] = useState([]);
  const [shipToAddressName, setShipToAddressName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [className, setClassName] = useState('');
  const [glAccountName, setGlAccountName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [showApproversModal, setShowApproversModal] = useState(false);
  const [signoffSectionExpanded, setSignoffSectionExpanded] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [openSupplierAttachmentId, setOpenSupplierAttachmentId] = useState(null);
  const [sendingToSuppliers, setSendingToSuppliers] = useState(false);

  // Supplier Response states (from SupplierResponseForm)
  const [responseItems, setResponseItems] = useState([]);
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);
  const [currentNegotiation, setCurrentNegotiation] = useState({ supplierIndex: 0, itemIndex: 0 });
  const [showOverrideSignoffModal, setShowOverrideSignoffModal] = useState(false);
  const [overrideNotes, setOverrideNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
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
  const [suppliersWithPriceChanges, setSuppliersWithPriceChanges] = useState(new Set());
  const [negotiationLoading, setNegotiationLoading] = useState(false);

  // Refs for PO generation
  const poGenerationInProgress = useRef(new Set());
  const abortController = useRef(null);

  const navigate = useNavigate();

  const fetchAllSuppliers = useCallback(async () => {
    try {
      const response = await SupplierService.getConnectedSuppliers(companyId);
      setSuppliers(response.data?.content || response.data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      toast.error('Failed to fetch suppliers');
    }
  }, [companyId]);

  const addExistingSupplier = useCallback(
    async (supplierId) => {
      try {
        console.log('Inviting supplier with ID:', supplierId);
        await RqfService.inviteSupplier(companyId, rfqId, supplierId.supplierId);
        toast.success('Supplier added successfully');
        const res = await RqfService.getRfqById(companyId, rfqId);
        const rfq = res.data;
        const supplierDetails = await Promise.all(
          rfq.suppliers.map(async (supplier) => {
            try {
              const detail = await SupplierService.getSupplierById(supplier.supplierId);
              return {
                ...supplier,
                name: detail.data[0].name,
                email: detail.data[0].email,
                primaryContact: detail.data[0].primaryContact,
              };
            } catch (e) {
              return {
                ...supplier,
                name: '',
                email: '',
              };
            }
          }),
        );
        setSuppliersWithDetails(supplierDetails);
        setShowSupplierDialog(false);
      } catch (err) {
        toast.error('Failed to add supplier');
      }
    },
    [companyId, rfqId],
  );

  const handleBack = () => {
    navigate('/dashboard', {
      state: { activeMainTab: 'rfqs' },
    });
  };

  const addNewSupplier = useCallback(async () => {
    try {
      const supplierResponse = await SupplierService.createSupplier(companyId, {
        name: newSupplier.name,
        email: newSupplier.email,
        primaryContact: newSupplier.phone,
      });

      await RqfService.addSupplierToRfq(companyId, rfqId, supplierResponse.data.supplierId);
      toast.success('New supplier added and invited to RFQ');

      const res = await RqfService.getRfqById(companyId, rfqId);
      const rfq = res.data;
      const supplierDetails = await Promise.all(
        rfq.suppliers.map(async (supplier) => {
          try {
            const detail = await SupplierService.getSupplierById(supplier.supplierId);
            return {
              ...supplier,
              name: detail.data[0].name,
              email: detail.data[0].email,
              primaryContact: detail.data[0].primaryContact,
            };
          } catch (e) {
            return {
              ...supplier,
              name: '',
              email: '',
            };
          }
        }),
      );
      setSuppliersWithDetails(supplierDetails);
      setShowSupplierDialog(false);
      setNewSupplier({ name: '', email: '', phone: '' });
    } catch (err) {
      toast.error('Failed to add new supplier');
    }
  }, [companyId, rfqId, newSupplier]);

  const handleDownload = useCallback(async (fileId, fileName) => {
    try {
      const response = await FileUploadService.getFileByFileId(fileId);
      const contentDisposition = response.headers['content-disposition'];
      let filename = `file_${fileId}`;

      if (contentDisposition) {
        const [, extractedFilename] = contentDisposition.match(/filename="?(.+)"?/) || [];
        if (extractedFilename) {
          filename = extractedFilename;
        }
      }

      const contentType = response.headers['content-type'];
      const [, extension] = contentType?.split('/') || [];
      if (!filename.includes('.') && extension) {
        filename = `${filename}.${extension}`;
      }

      const blob = new Blob([response.data], {
        type: contentType || 'application/octet-stream',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error('Download error:', downloadError);
      toast.error('Failed to download file');
    }
  }, []);
  // Load supplier response data (for Supplier Responses tab)
  const loadSupplierResponseData = useCallback(
    async (rfq) => {
      try {
        // Fetch PO data
        const poResponse = await PurchaseOrderService.getPurchaseOrdersPaginated(companyId, {
          pageSize: 100,
          pageNumber: 0,
          rfqId,
        });

        const poStatusMap = {};
        const poDataMap = {};
        const poData =
          poResponse.data && poResponse.data.content
            ? poResponse.data.content
            : poResponse.data || [];

        poData.forEach((po) => {
          if (po.supplier?.supplierId) {
            poStatusMap[po.supplier.supplierId] = true;
            poDataMap[po.supplier.supplierId] = po;
          }
        });

        setPoStatus(poStatusMap);

        // Fetch detailed supplier info with addresses
        const suppliersWithResponseDetails = await Promise.all(
          rfq.suppliers.map(async (supplier) => {
            try {
              const detail = await SupplierService.getSupplierById(supplier.supplierId);
              const detailAddress = detail?.data[0]?.address;
              const formattedAddress = [
                detailAddress?.addressLine1,
                detailAddress?.city,
                detailAddress?.country,
                detailAddress?.postalCode,
              ]
                .filter(Boolean)
                .join(', ');

              return {
                ...supplier,
                name: detail.data[0]?.name || '',
                email: detail.data[0]?.email || '',
                contactPerson: detail.data[0]?.primaryContact || '',
                primaryContact: detail.data[0]?.primaryContact || '',
                address: formattedAddress,
                purchaseOrderId: poDataMap[supplier.supplierId]?.purchaseOrderId || null,
                purchaseOrderData: poDataMap[supplier.supplierId] || null,
                selectedRfqItemIds: supplier.selectedRfqItemIds || [],
              };
            } catch (e) {
              return {
                ...supplier,
                name: '',
                email: '',
                contactPerson: '',
                primaryContact: '',
                address: '',
                purchaseOrderId: null,
                purchaseOrderData: null,
                selectedRfqItemIds: supplier.selectedRfqItemIds || [],
              };
            }
          }),
        );

        setSuppliersWithDetails(suppliersWithResponseDetails);

        // Initialize selected items from API
        const initialSelectedItems = new Map();
        suppliersWithResponseDetails.forEach((supplier) => {
          if (supplier.selectedRfqItemIds && supplier.selectedRfqItemIds.length > 0) {
            supplier.selectedRfqItemIds.forEach((itemId) => {
              initialSelectedItems.set(itemId, supplier.supplierId);
            });
          }
        });
        setSelectedItems(initialSelectedItems);

        // Initialize response items
        setResponseItems(
          suppliersWithResponseDetails.map((supplier) => {
            const existingResponse = supplier.responseItems || [];
            return {
              supplierId: supplier.supplierId,
              items: rfq.rfqItems.map((rfqItem) => {
                const existingItem = existingResponse.find(
                  (item) => item.rfqItemId === rfqItem.rfqItemId,
                );
                return {
                  rfqItemId: rfqItem.rfqItemId,
                  unitPrice: existingItem?.unitPrice?.toString() || '',
                  negotiationHistory: existingItem?.negotiationHistory || '',
                  quantity: existingItem?.quantity || rfqItem?.quantity || '',
                  originalQuantity: rfqItem?.quantity || '',
                };
              }),
            };
          }),
        );
      } catch (err) {
        console.error('Error loading supplier response data:', err);
      }
    },
    [companyId, rfqId],
  );

  useEffect(() => {
    const fetchRFQDetail = async () => {
      try {
        const response = await RqfService.getRfqById(companyId, rfqId);
        const rfq = response.data;
        setRfqData(rfq);

        // For CREATED status, just fetch basic supplier details
        if (rfq.rfqStatus === RFQ_STATUS.CREATED) {
          const supplierDetails = await Promise.all(
            rfq.suppliers.map(async (supplier) => {
              try {
                const detail = await SupplierService.getSupplierById(supplier.supplierId);
                return {
                  ...supplier,
                  name: detail.data[0].name,
                  email: detail.data[0].email,
                  primaryContact: detail.data[0].primaryContact,
                };
              } catch (e) {
                return {
                  ...supplier,
                  name: '',
                  email: '',
                };
              }
            }),
          );
          setSuppliersWithDetails(supplierDetails);
        } else {
          // For other statuses, load full supplier response data
          await loadSupplierResponseData(rfq);
        }

        // Fetch related data in parallel
        const fetchPromises = [];

        if (rfq.shipToAddressId) {
          fetchPromises.push(
            AddressService.getAddressById(companyId, rfq.shipToAddressId)
              .then((res) => {
                const addr = res.data;
                const formattedAddress = [
                  addr.addressLine1,
                  addr.addressLine2,
                  addr.city,
                  addr.state,
                  addr.country,
                  addr.postalCode,
                ]
                  .filter(Boolean)
                  .join(', ');
                setShipToAddressName(formattedAddress);
              })
              .catch(() => setShipToAddressName('')),
          );
        }

        if (rfq.locationId) {
          fetchPromises.push(
            LocationService.getLocationById(companyId, rfq.locationId)
              .then((res) => setLocationName(res.data[0]?.name || ''))
              .catch(() => setLocationName('')),
          );
        }

        if (rfq.departmentId) {
          fetchPromises.push(
            DepartmentService.getByIdDepartment(companyId, rfq.departmentId)
              .then((res) => setDepartmentName(res.data[0]?.name || ''))
              .catch(() => setDepartmentName('')),
          );
        }

        if (rfq.classId) {
          fetchPromises.push(
            ClassService.getByIdClass(companyId, rfq.classId)
              .then((res) => setClassName(res.data[0]?.name || ''))
              .catch(() => setClassName('')),
          );
        }

        if (rfq.glAccountId) {
          fetchPromises.push(
            GLAccountService.getGlAccountById(companyId, rfq.glAccountId)
              .then((res) => setGlAccountName(res.data[0]?.name || ''))
              .catch(() => setGlAccountName('')),
          );
        }

        if (rfq.projectId) {
          fetchPromises.push(
            ProjectService.getProjectByProjectId(companyId, rfq.projectId)
              .then((res) => setProjectName(res.data[0]?.name || ''))
              .catch(() => setProjectName('')),
          );
        }

        // Wait for all related data to load
        await Promise.all(fetchPromises);
      } catch (err) {
        setError('Failed to fetch RFQ details.');
      } finally {
        setLoading(false);
      }
    };

    fetchRFQDetail();
    fetchAllSuppliers();
  }, [rfqId, companyId, loadSupplierResponseData]);

  // Fetch billing addresses
  useEffect(() => {
    AddressService.getAllAddressByCompany(companyId, 'BILLING')
      .then((response) => {
        setBillingAddresses(response.data);
      })
      .catch((err) => {
        console.error('Error fetching billing addresses:', err);
      });
  }, [companyId]);

  // Reload function for supplier response data
  const reloadRfqData = useCallback(async () => {
    try {
      const response = await RqfService.getRfqById(companyId, rfqId);
      const rfq = response.data;
      setRfqData(rfq);
      if (rfq.rfqStatus !== RFQ_STATUS.CREATED) {
        await loadSupplierResponseData(rfq);
      }
    } catch (err) {
      console.error('Error reloading RFQ data:', err);
    }
  }, [companyId, rfqId, loadSupplierResponseData]);

  const getStatusBadge = useCallback((status) => {
    const statusConfig = {
      created: { label: 'Draft', color: 'warning' },
      submitted: { label: 'Submitted', color: 'primary' },
      cancelled: { label: 'Cancelled', color: 'danger' },
      completed: { label: 'Completed', color: 'success' },
      supplier_shortlisted: { label: 'Supplier Shortlisted', color: 'info' },
      closed: { label: 'Closed', color: 'danger' },
      rejected: { label: 'Rejected', color: 'danger' },
    };

    const config = statusConfig[status] || { label: status || 'Unknown', color: 'dark' };

    return (
      <Badge
        color={config.color}
        pill
        style={{
          fontSize: '12px',
          fontWeight: '500',
          padding: '6px 12px',
        }}
      >
        {config.label}
      </Badge>
    );
  }, []);

  const handleCloneRfq = async () => {
    const result = await Swal.fire({
      title: 'Clone RFQ?',
      text: `Are you sure you want to clone "${rfqData?.title}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#009efb',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Clone it',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      const response = await RqfService.duplicateRfq(companyId, rfqId);
      if (response.data?.rfqId) {
        navigate(`/rfqDetails/${response.data.rfqId}`, { replace: true });
        setTimeout(() => {
          toast.success('RFQ cloned successfully', {
            toastId: 'clone-success',
          });
        }, 100);
      }
    } catch (err) {
      console.error('Error cloning RFQ:', err);
      toast.error('Failed to clone RFQ');
    }
  };

  const getSupplierStatusBadge = useCallback((status) => {
    const colors = {
      submitted: 'primary',
      negotiation: 'warning',
      finalized: 'success',
      rejected: 'danger',
      cancelled: 'danger',
      signoff_requested: 'info',
      not_selected: 'secondary',
    };
    const labels = {
      not_selected: 'Not Selected',
      signoff_requested: 'Signoff Requested',
    };
    const label = labels[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown');
    return (
      <Badge color={colors[status] || 'dark'} pill>
        {label}
      </Badge>
    );
  }, []);

  const formatDate = useCallback((date) => {
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  }, []);

  const formatDateTime = useCallback((date) => {
    try {
      return format(new Date(date), 'MMM dd, yyyy h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  }, []);

  const resetOverrideModal = () => {
    setShowOverrideSignoffModal(false);
    setOverrideNotes('');
    setUploadedFileId(null);
    setUploadError(null);
  };

  const getFullName = useCallback((user) => {
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
  }, []);

  // =====================================================
  // Supplier Response Handlers (from SupplierResponseForm)
  // =====================================================

  const hasValidUnitPrice = useCallback(
    (supplierId, itemId) => {
      const supplierResponse = responseItems.find((r) => r.supplierId === supplierId);
      if (!supplierResponse) return false;
      const item = supplierResponse.items.find((i) => i.rfqItemId === itemId);
      return item && parseFloat(item.unitPrice) > 0;
    },
    [responseItems],
  );

  const handleItemSelection = useCallback(
    (supplierId, itemId, isSelected) => {
      if (isSelected && !hasValidUnitPrice(supplierId, itemId)) {
        toast.dismiss();
        toast.error('Please enter a valid unit price before selecting this item');
        return;
      }

      const newSelectedItems = new Map(selectedItems);

      if (isSelected) {
        const currentSupplierId = newSelectedItems.get(itemId);
        if (currentSupplierId && currentSupplierId !== supplierId) {
          toast.dismiss();
          toast.error('This item is already selected from another supplier');
          return;
        }
        newSelectedItems.set(itemId, supplierId);
      } else {
        newSelectedItems.delete(itemId);
      }

      setSelectedItems(newSelectedItems);
    },
    [selectedItems, hasValidUnitPrice],
  );

  const handleSelectAllForSupplier = useCallback(
    (supplierId, isSelected) => {
      const newSelectedItems = new Map(selectedItems);

      if (isSelected) {
        rfqData?.rfqItems?.forEach((item) => {
          if (hasValidUnitPrice(supplierId, item.rfqItemId)) {
            const currentSupplierId = newSelectedItems.get(item.rfqItemId);
            if (!currentSupplierId || currentSupplierId === supplierId) {
              newSelectedItems.set(item.rfqItemId, supplierId);
            }
          }
        });
      } else {
        rfqData?.rfqItems?.forEach((item) => {
          if (newSelectedItems.get(item.rfqItemId) === supplierId) {
            newSelectedItems.delete(item.rfqItemId);
          }
        });
      }

      setSelectedItems(newSelectedItems);
    },
    [selectedItems, rfqData, hasValidUnitPrice],
  );

  const isItemSelected = useCallback(
    (supplierId, itemId) => {
      return selectedItems.get(itemId) === supplierId;
    },
    [selectedItems],
  );

  const isAllItemsSelectedForSupplier = useCallback(
    (supplierId) => {
      const supplierIndex = suppliersWithDetails.findIndex((s) => s.supplierId === supplierId);
      if (supplierIndex === -1) return false;

      return rfqData?.rfqItems?.every((item) => {
        const hasValidPrice = hasValidUnitPrice(supplierId, item.rfqItemId);
        const selected = isItemSelected(supplierId, item.rfqItemId);
        return !hasValidPrice || selected;
      });
    },
    [suppliersWithDetails, rfqData, hasValidUnitPrice, isItemSelected],
  );

  const isSomeItemsSelectedForSupplier = useCallback(
    (supplierId) => {
      const supplierIndex = suppliersWithDetails.findIndex((s) => s.supplierId === supplierId);
      if (supplierIndex === -1) return false;

      const hasSomeSelected = rfqData?.rfqItems?.some((item) => {
        return (
          hasValidUnitPrice(supplierId, item.rfqItemId) &&
          isItemSelected(supplierId, item.rfqItemId)
        );
      });

      const hasSomeNotSelected = rfqData?.rfqItems?.some((item) => {
        return (
          hasValidUnitPrice(supplierId, item.rfqItemId) &&
          !isItemSelected(supplierId, item.rfqItemId)
        );
      });

      return hasSomeSelected && hasSomeNotSelected;
    },
    [suppliersWithDetails, rfqData, hasValidUnitPrice, isItemSelected],
  );

  const getSupplierName = useCallback(
    (supplierId) => {
      const supplier = suppliersWithDetails.find((s) => s.supplierId === supplierId);
      return supplier?.name || 'Unknown Supplier';
    },
    [suppliersWithDetails],
  );

  const getItemDetails = useCallback(
    (itemId) => {
      const item = rfqData?.rfqItems?.find((i) => i.rfqItemId === itemId);
      return item || null;
    },
    [rfqData],
  );

  const handleUnitPriceChange = useCallback(
    (supplierIndex, itemIndex, value) => {
      const newResponseItems = [...responseItems];
      newResponseItems[supplierIndex].items[itemIndex].unitPrice = value;
      setResponseItems(newResponseItems);

      const supplierId = suppliersWithDetails[supplierIndex]?.supplierId;
      if (supplierId) {
        setSuppliersWithPriceChanges((prev) => {
          const next = new Set(prev);
          next.add(supplierId);
          return next;
        });
      }
    },
    [responseItems, suppliersWithDetails],
  );

  const handleAcceptedQtyChange = useCallback(
    (supplierIndex, itemIndex, value) => {
      const newResponseItems = [...responseItems];
      const originalQty = parseFloat(
        newResponseItems[supplierIndex].items[itemIndex].originalQuantity,
      );
      const newValue = parseFloat(value);

      if (!Number.isNaN(newValue)) {
        if (newValue > originalQty) {
          toast.error(`Accepted quantity cannot exceed original quantity (${originalQty})`);
          return;
        }
        if (newValue < 0) {
          toast.error('Accepted quantity cannot be negative');
          return;
        }
      }

      newResponseItems[supplierIndex].items[itemIndex].quantity = Number.isNaN(newValue)
        ? ''
        : value.toString();
      setResponseItems(newResponseItems);
    },
    [responseItems],
  );

  const openNegotiationDialog = async (supplierIndex, itemIndex) => {
    try {
      setNegotiationLoading(true);

      const res = await RqfService.getRfqById(companyId, rfqId);
      const rfq = res.data;

      const supplier = rfq.suppliers[supplierIndex];
      const supplierResponse = supplier.responseItems || [];

      const updated = [...responseItems];
      const rfqItemId = rfq.rfqItems[itemIndex].rfqItemId;

      const latestItem = supplierResponse.find((i) => i.rfqItemId === rfqItemId);

      updated[supplierIndex].items[itemIndex].negotiationHistory =
        latestItem?.negotiationHistory || [];

      setResponseItems(updated);

      setCurrentNegotiation({ supplierIndex, itemIndex });
      setShowNegotiationDialog(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load negotiation history');
    } finally {
      setNegotiationLoading(false);
    }
  };

  const handleSaveSupplierResponse = useCallback(
    async (supplierIndex) => {
      try {
        setIsSaving(true);
        const supplier = suppliersWithDetails[supplierIndex];

        if (supplier.supplierStatus === 'rejected') {
          toast.error('Cannot save changes for a rejected supplier');
          return;
        }

        const supplierResponseItems = responseItems.find(
          (item) => item.supplierId === supplier.supplierId,
        );

        const responseData = {
          rfqSupplierId: supplier.rfqSupplierId,
          supplierId: supplier.supplierId,
          supplierStatus: supplier.supplierStatus === 'rejected' ? 'rejected' : 'negotiation',
          selectedRfqItemIds: [],
          responseItems: supplierResponseItems.items.map((item) => ({
            rfqSupplierResponseItemId: 0,
            rfqItemId: item.rfqItemId,
            unitPrice: item.unitPrice || 0,
            negotiationHistory: item.negotiationHistory || '',
            quantity: item.quantity || item.originalQuantity || '',
          })),
          signOffRequests: {
            requestedBy: {},
          },
        };

        await RqfService.saveSupplierResponse(companyId, rfqId, supplier.supplierId, responseData);
        toast.dismiss();
      } catch (err) {
        console.error('Error saving supplier:', err);
        toast.dismiss();
        toast.error('Failed to save supplier');
      } finally {
        setIsSaving(false);
      }
    },
    [suppliersWithDetails, responseItems, companyId, rfqId, reloadRfqData],
  );

  const handleSaveAllChanges = async () => {
    if (suppliersWithPriceChanges.size === 0) {
      toast.info('No price changes to save');
      return;
    }

    try {
      setIsSaving(true);

      for (const supplierId of suppliersWithPriceChanges) {
        const index = suppliersWithDetails.findIndex((s) => s.supplierId === supplierId);

        if (index !== -1 && suppliersWithDetails[index].supplierStatus !== 'rejected') {
          await handleSaveSupplierResponse(index);
        }
      }

      toast.dismiss();
      toast.success('Price changes saved successfully');
      setSuppliersWithPriceChanges(new Set());
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to save price changes');
    } finally {
      setIsSaving(false);
    }
  };

  const submitSelectedItemsSignoffRequest = useCallback(async () => {
    if (suppliersWithPriceChanges.size > 0) {
      await handleSaveAllChanges();
    }

    const hasInvalidPrice = Array.from(selectedItems.entries()).some(([itemId, supplierId]) => {
      const supplierResponse = responseItems.find((r) => r.supplierId === supplierId);
      const item = supplierResponse?.items.find((i) => i.rfqItemId === itemId);
      return !item || parseFloat(item.unitPrice) <= 0;
    });

    if (hasInvalidPrice) {
      toast.error('Please enter and save unit price before sign-off');
      return;
    }

    try {
      setIsSaving(true);
      const groupedBySupplier = {};
      selectedItems.forEach((supplierId, itemId) => {
        if (!groupedBySupplier[supplierId]) {
          groupedBySupplier[supplierId] = [];
        }
        groupedBySupplier[supplierId].push(itemId);
      });

      const rfqSuppliers = Object.entries(groupedBySupplier)
        .map(([supplierId, itemIds]) => {
          const supplier = suppliersWithDetails.find(
            (s) => s.supplierId === parseInt(supplierId, 10),
          );
          if (!supplier) return null;

          return {
            rfqSupplierId: supplier.rfqSupplierId,
            supplierId: supplier.supplierId,
            createdBy: { userId },
            updatedBy: { userId },
            selectedRfqItemIds: itemIds,
          };
        })
        .filter(Boolean);

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
      toast.success('Sign-off request sent successfully for selected items');
      await reloadRfqData();
      setShowSelectedItemsSignoffModal(false);
      setSelectedUsers([]);
    } catch (err) {
      console.error('Error sending signoff request:', err);
      toast.dismiss();
      toast.error('Failed to request sign-off');
    } finally {
      setIsSaving(false);
    }
  }, [selectedItems, suppliersWithDetails, selectedUsers, companyId, rfqId, userId, reloadRfqData]);

  const handleGeneratePO = useCallback(
    async (supplier) => {
      const { supplierId, name } = supplier;

      if (poGenerationInProgress.current.has(supplierId)) {
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
        setGeneratingPOForSuppliers((prev) => new Set(prev).add(supplierId));
        setIsGeneratingPO(true);

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
          toast.error('Please select items for this supplier before generating PO');
          return;
        }

        const hasInvalidItems = allSelectedItems.some((itemId) => {
          const responseItem = responseItems
            .find((res) => res.supplierId === supplierId)
            ?.items.find((i) => i.rfqItemId === itemId);
          return !responseItem || parseFloat(responseItem?.unitPrice || 0) <= 0;
        });

        if (hasInvalidItems) {
          toast.dismiss();
          toast.error('Please enter valid unit prices for all selected items');
          return;
        }

        const selectedRfqItems = rfqData.rfqItems.filter((item) =>
          allSelectedItems.includes(item.rfqItemId),
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
            name: rfqData.company?.name || '',
            displayName: rfqData.company?.displayName || '',
          },
          supplier: {
            supplierId,
            name: supplier.name || '',
            email: supplier.email || '',
            contactPerson: supplier.contactPerson || '',
          },
          rfq: rfqId,
          shippingToAddress: {
            addressId: rfqData.shipToAddressId || 0,
            addressLine1: rfqData.shippingAddress?.addressLine1 || '',
            city: rfqData.shippingAddress?.city || '',
            state: rfqData.shippingAddress?.state || '',
            postalCode: rfqData.shippingAddress?.postalCode || '',
            country: rfqData.shippingAddress?.country || '',
            isoCountryCode: rfqData.shippingAddress?.isoCountryCode || '',
            addressType: rfqData.shippingAddress?.addressType || 'shipping',
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
          notes: rfqData.notes,
        };

        const response = await PurchaseOrderService.createPurchaseOrder(companyId, payload, {
          signal: abortController.current.signal,
        });

        if (abortController.current.signal.aborted) {
          return;
        }

        toast.dismiss();
        toast.success('Purchase Order created successfully!');

        setPoStatus((prev) => ({
          ...prev,
          [supplierId]: true,
        }));

        setSuppliersWithDetails((prevSuppliers) =>
          prevSuppliers.map((s) =>
            s.supplierId === supplierId
              ? {
                  ...s,
                  purchaseOrderId: response.data.purchaseOrderId || response.data.purchaseOrderID,
                  purchaseOrderData: response.data,
                }
              : s,
          ),
        );

        await reloadRfqData();
      } catch (err) {
        if (err.name === 'AbortError' || abortController.current?.signal.aborted) {
          return;
        }

        console.error('PO creation failed:', err);
        let errorMessage = 'Failed to create Purchase Order';
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.message) {
          errorMessage = err.message;
        }

        toast.error(errorMessage);
      } finally {
        poGenerationInProgress.current.delete(supplierId);

        setGeneratingPOForSuppliers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(supplierId);
          return newSet;
        });

        if (poGenerationInProgress.current.size === 0) {
          setIsGeneratingPO(false);
        }
      }
    },
    [
      poStatus,
      rfqData,
      selectedItems,
      responseItems,
      companyId,
      rfqId,
      billingAddresses,
      reloadRfqData,
    ],
  );

  const debouncedGeneratePO = useMemo(
    () => debounce((supplier) => handleGeneratePO(supplier), 500),
    [handleGeneratePO],
  );

  const handleViewPOs = useCallback(async () => {
    try {
      const response = await PurchaseOrderService.getPurchaseOrdersPaginated(companyId, {
        pageSize: 100,
        pageNumber: 0,
        rfqId,
      });

      const poData =
        response.data && response.data.content ? response.data.content : response.data || [];
      setPurchaseOrders(poData);
      setShowPOModal(true);
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
      toast.dismiss();
      toast.error('Failed to fetch purchase orders');
    }
  }, [companyId, rfqId]);

  const handlePOClick = useCallback(
    (poId) => {
      navigate(`/purchase-order-detail/${poId}`);
    },
    [navigate],
  );

  const handleOverrideSignoff = useCallback((supplier) => {
    setSelectedSupplierForAction(supplier);
    setShowOverrideSignoffModal(true);
  }, []);

  const submitOverrideSignoff = useCallback(async () => {
    setIsSaving(true);
    try {
      if (!overrideNotes.trim()) {
        toast.dismiss();
        toast.error('Please enter notes for override');
        return;
      }

      const overridePayload = {
        comments: overrideNotes,
        requestedBy: selectedSupplierForAction.signOffRequests.requestedBy,
        resolvedBy: { userId },
        attachments: uploadedFileId
          ? [
              {
                attachmentId: 0,
                linkedEntityId: 0,
                fileId: uploadedFileId,
              },
            ]
          : [],
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
          cancelButton: 'btn btn-secondary',
        },
        buttonsStyling: false,
      });

      if (result.isConfirmed) {
        debouncedGeneratePO(selectedSupplierForAction);
      } else {
        await reloadRfqData();
      }

      setShowOverrideSignoffModal(false);
      setOverrideNotes('');
      setUploadedFileId(null);
    } catch (err) {
      console.error('Error overriding sign-off:', err);
    } finally {
      setIsSaving(false);
    }
  }, [
    overrideNotes,
    selectedSupplierForAction,
    uploadedFileId,
    companyId,
    rfqId,
    userId,
    debouncedGeneratePO,
    reloadRfqData,
  ]);

  const handleFileChange = useCallback(
    async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploadedFileId(null);
      setUploadError(null);

      try {
        setIsUploading(true);
        const uploadResponse = await FileUploadService.uploadFile(companyId, file);
        setUploadedFileId(uploadResponse.data.fileId);
        toast.dismiss();
        toast.success('File uploaded successfully');
      } catch (err) {
        console.error('File upload failed:', err);
        setUploadError('Failed to upload file. Please try again.');
      } finally {
        setIsUploading(false);
      }
    },
    [companyId],
  );

  const handleViewAttachment = useCallback(async (fileId, fileName) => {
    try {
      const response = await FileUploadService.downloadFile(fileId);
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/octet-stream',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `attachment_${fileId}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading attachment:', err);
      toast.error('Failed to download attachment');
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      let res;
      if (searchTerm.trim() === '') {
        const pageDto = { pageSize: 100, pageNumber: 0, sortBy: 'firstName', order: 'asc' };
        res = await UserService.fetchAllCompanyUsers(companyId, pageDto);
      } else {
        const pageDto = { pageSize: 100, pageNumber: 0, sortBy: 'firstName', order: 'asc' };
        res = await UserService.getUsersBySearch(searchTerm, companyId, pageDto);
      }
      setFilteredUsers(res.data?.content || res.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.dismiss();
      toast.error('Failed to fetch users');
    }
  }, [searchTerm, companyId]);

  const handleAIRecommendationClick = useCallback(async () => {
    setLoadingRecommendation(true);
    const supplierIds = suppliersWithDetails.map((supplier) => supplier.supplierId);

    try {
      const response = await RqfService.getSupplierByAIRecommendation(supplierIds);

      const recommendedSupplier = suppliersWithDetails.find(
        (supplier) => supplier.supplierId === response.data.recommendedSupplierId,
      );

      setAiRecommendation({
        ...response.data,
        supplierName: recommendedSupplier?.name || 'Unknown Supplier',
      });
      setShowAIRecommendationModal(true);
    } catch (err) {
      const errorMessage =
        err?.response?.data?.errorMessage ||
        err?.response?.errorMessage ||
        'Something went wrong. Please try again.';
      toast.dismiss();
      toast.error(errorMessage);
    } finally {
      setLoadingRecommendation(false);
    }
  }, [suppliersWithDetails]);

  // Effect to fetch users when signoff modal is open
  useEffect(() => {
    if (showSelectedItemsSignoffModal) {
      fetchUsers();
    }
  }, [showSelectedItemsSignoffModal, fetchUsers]);

  useEffect(() => {
    if (showSelectedItemsSignoffModal) {
      const delayDebounce = setTimeout(() => {
        fetchUsers();
      }, 300);
      return () => clearTimeout(delayDebounce);
    }
    return undefined;
  }, [searchTerm, showSelectedItemsSignoffModal, fetchUsers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
      poGenerationInProgress.current.clear();
    };
  }, []);

  const handleSendToSuppliers = useCallback(async () => {
    try {
      setSendingToSuppliers(true);

      await RqfService.sendRfqToSupplier(companyId, rfqId);

      toast.success('RFQ sent to suppliers');

      setTimeout(() => {
        navigate('/dashboard', {
          state: { activeMainTab: 'rfqs' },
        });
      }, 2000);
    } catch (err) {
      toast.error('Failed to send RFQ');
    } finally {
      setSendingToSuppliers(false);
    }
  }, [companyId, rfqId, navigate]);

  const handleResubmitRfq = useCallback(async () => {
    const result = await Swal.fire({
      title: 'Resubmit RFQ?',
      html: '<p>This will <strong>delete all signoff requests</strong> and <strong>clear all supplier responses</strong>. Suppliers will be notified to submit new responses.</p><p>Are you sure you want to continue?</p>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Resubmit',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      await RqfService.resubmitRfq(companyId, rfqId);
      toast.success('RFQ resubmitted successfully. Suppliers have been notified.');
      setTimeout(() => {
        navigate('/dashboard', {
          state: { activeMainTab: 'rfqs' },
        });
      }, 2000);
    } catch (err) {
      toast.error('Failed to resubmit RFQ. Please try again.');
      console.error('Resubmit error:', err);
    }
  }, [companyId, rfqId, navigate]);

  // Memoized computed values
  const allowedStatuses = useMemo(
    () => ['signoff_requested', 'supplier_shortlisted', 'finalized', 'completed', 'rejected'],
    [],
  );

  const hasSignoffRequested = useMemo(
    () =>
      suppliersWithDetails.some((s) => allowedStatuses.includes(s.supplierStatus?.toLowerCase())),
    [suppliersWithDetails, allowedStatuses],
  );

  const requestedSuppliers = useMemo(
    () =>
      hasSignoffRequested
        ? suppliersWithDetails.filter((s) =>
            allowedStatuses.includes(s.supplierStatus?.toLowerCase()),
          )
        : [],
    [hasSignoffRequested, suppliersWithDetails, allowedStatuses],
  );

  const supplierNames = requestedSuppliers.map((s) => s.name).join(', ');

  // Supplier Response computed values
  const sortedSuppliers = useMemo(() => {
    return [...suppliersWithDetails].sort((a, b) => {
      const statusOrder = {
        signoff_requested: 1,
        finalized: 2,
        shortlisted: 3,
        negotiation: 4,
        draft: 5,
        submitted: 6,
        rejected: 7,
      };
      return statusOrder[a.supplierStatus] - statusOrder[b.supplierStatus];
    });
  }, [suppliersWithDetails]);

  const isAnySignoffRequested = useMemo(
    () =>
      suppliersWithDetails.some(
        (s) => s.supplierStatus === 'signoff_requested' || s.supplierStatus === 'finalized',
      ),
    [suppliersWithDetails],
  );

  const isSignoff = useMemo(
    () => suppliersWithDetails.some((s) => s.supplierStatus === 'signoff_requested'),
    [suppliersWithDetails],
  );

  const isAnyFinalized = useMemo(
    () => suppliersWithDetails.some((s) => s.supplierStatus === 'finalized'),
    [suppliersWithDetails],
  );

  const isRfqCompletedOrClosed = useMemo(
    () => rfqData?.rfqStatus === 'completed' || rfqData?.rfqStatus === 'closed' || rfqData?.rfqStatus === 'rejected',
    [rfqData],
  );

  const isRfqClosed = useMemo(
    () => rfqData?.rfqStatus === 'closed' || rfqData?.rfqStatus !== 'completed',
    [rfqData],
  );

  const calculateSupplierTotal = useCallback(
    (supplierId) => {
      const supplierIndex = suppliersWithDetails.findIndex((s) => s.supplierId === supplierId);
      if (supplierIndex === -1) return 0;

      return (
        rfqData?.rfqItems?.reduce((total, item, itemIndex) => {
          const responseItem = responseItems[supplierIndex]?.items[itemIndex];
          const quantity = parseFloat(responseItem?.quantity || item.quantity);
          const unitPrice = parseFloat(responseItem?.unitPrice || 0);
          return total + quantity * unitPrice;
        }, 0) || 0
      );
    },
    [suppliersWithDetails, rfqData, responseItems],
  );

  const memoizedSupplierTotals = useMemo(() => {
    return sortedSuppliers.map((supplier) => ({
      supplierId: supplier.supplierId,
      total: calculateSupplierTotal(supplier.supplierId),
    }));
  }, [sortedSuppliers, calculateSupplierTotal]);

  const lowestTotal = useMemo(
    () => Math.min(...memoizedSupplierTotals.map((s) => s.total)),
    [memoizedSupplierTotals],
  );

  const lowestBidForSelectedItems = useMemo(() => {
    if (selectedItems.size === 0) {
      return { lowestTotal, useSelectedItems: false };
    }

    const selectedItemIds = Array.from(selectedItems.keys());

    const supplierTotalsForSelected = sortedSuppliers.map((supplier) => {
      const supplierIndex = suppliersWithDetails.findIndex(
        (s) => s.supplierId === supplier.supplierId,
      );
      if (supplierIndex === -1) return { supplierId: supplier.supplierId, total: Infinity };

      const total = selectedItemIds.reduce((sum, itemId) => {
        const itemIndex = rfqData?.rfqItems?.findIndex((item) => item.rfqItemId === itemId);
        if (itemIndex === -1) return sum;

        const item = rfqData.rfqItems[itemIndex];
        const responseItem = responseItems[supplierIndex]?.items[itemIndex];
        const quantity = parseFloat(responseItem?.quantity || item.quantity);
        const unitPrice = parseFloat(responseItem?.unitPrice || 0);

        if (unitPrice > 0) {
          return sum + quantity * unitPrice;
        }
        return sum + Infinity;
      }, 0);

      return { supplierId: supplier.supplierId, total };
    });

    const lowestSelectedTotal = Math.min(...supplierTotalsForSelected.map((s) => s.total));
    const lowestSupplier = supplierTotalsForSelected.find((s) => s.total === lowestSelectedTotal);

    return {
      lowestTotal: lowestSelectedTotal === Infinity ? 0 : lowestSelectedTotal,
      lowestSupplierId: lowestSupplier?.supplierId,
      supplierTotals: supplierTotalsForSelected,
      useSelectedItems: true,
    };
  }, [selectedItems, sortedSuppliers, suppliersWithDetails, rfqData, responseItems, lowestTotal]);

  const lowestPricePerItem = useMemo(() => {
    const lowestPrices = new Map();
    if (!rfqData?.rfqItems) return lowestPrices;

    rfqData.rfqItems.forEach((item) => {
      let lowestPrice = Infinity;
      let lowestSupplierId = null;

      responseItems.forEach((response) => {
        const responseItem = response.items.find((i) => i.rfqItemId === item.rfqItemId);
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

  const totalValue = useMemo(
    () =>
      Array.from(selectedItems.entries()).reduce((total, [itemId, supplierId]) => {
        const item = getItemDetails(itemId);
        const supplierResponse = responseItems.find((r) => r.supplierId === supplierId);
        const responseItem = supplierResponse?.items.find((i) => i.rfqItemId === itemId);
        return (
          total +
          parseFloat(responseItem?.unitPrice || 0) *
            parseFloat(responseItem?.quantity || item?.quantity || 0)
        );
      }, 0),
    [selectedItems, responseItems, getItemDetails],
  );

  const canInviteSuppliers = useMemo(
    () =>
      suppliersWithDetails.length < 5 &&
      !suppliersWithDetails.some(
        (s) =>
          s.supplierStatus === RFQ_SUPPLIER_STATUS.SIGNOFF_REQUESTED ||
          s.supplierStatus === RFQ_SUPPLIER_STATUS.FINALIZED,
      ),
    [suppliersWithDetails],
  );

  const canSendToSuppliers = useMemo(
    () => rfqData?.rfqStatus === RFQ_STATUS.CREATED,
    [rfqData?.rfqStatus],
  );

  const renderNegotiationHistory = (history) => {
    if (!history) {
      return <div className="text-muted">No negotiation history</div>;
    }

    let parsed;
    try {
      parsed = typeof history === 'string' ? JSON.parse(history) : history;
    } catch {
      return <div className="text-muted">No negotiation history</div>;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return <div className="text-muted">No negotiation history</div>;
    }

    return (
      <div
        style={{
          maxHeight: '220px',
          overflowY: 'auto',
          border: '1px solid #dee2e6',
          borderRadius: '6px',
          background: '#f8f9fa',
          padding: '8px',
        }}
      >
        {parsed.map((entry, index) => (
          <div
            key={index}
            style={{
              padding: '10px 8px',
              borderBottom: '1px solid #e9ecef',
              fontSize: '13px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ fontWeight: 600 }}>$ {entry.price}</div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 500 }}>
                  by {entry.createdBy?.firstName} {entry.createdBy?.lastName}
                </div>
                <div
                  className="text-muted"
                  style={{
                    fontSize: '11px',
                    marginTop: '2px',
                  }}
                >
                  {new Date(entry.dateTime).toLocaleDateString()} •{' '}
                  {new Date(entry.dateTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading)
    return (
      <div className="text-center py-5">
        <Spinner />
      </div>
    );
  if (error) return <div className="text-danger text-center py-5">{error}</div>;
  if (!rfqData) return <div className="text-center py-5">No RFQ found.</div>;

  return (
    <>
      <div className="rfq-detail-page">
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
        <div className="card h-100 shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
          <div className="card-body" style={{ padding: '24px' }}>
            {/* Compact Header Bar */}
            <div className="mb-2">
              <div
                className="d-flex flex-wrap gap-3 align-items-center p-2"
                style={{
                  background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                  borderRadius: '10px',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(0, 158, 251, 0.2)',
                }}
              >
                <div className="d-flex align-items-center gap-3">
                  <i className="fas fa-file-contract" style={{ fontSize: '24px' }}></i>
                  <div>
                    <h4 className="mb-0" style={{ fontWeight: '700', fontSize: '18px' }}>
                      {rfqData.rfqNumber || `RFQ-${rfqData.rfqId}`}
                    </h4>
                    {rfqData.title && (
                      <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                        {rfqData.title}
                      </div>
                    )}
                  </div>
                </div>
                <div className="ms-auto d-flex flex-wrap gap-4 align-items-center">
                  <div className="text-center">
                    <div
                      style={{
                        fontSize: '10px',
                        opacity: 0.8,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Status
                    </div>
                    <div className="d-flex align-items-center justify-content-center gap-2">
                      {getStatusBadge(rfqData.rfqStatus)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      style={{
                        fontSize: '10px',
                        opacity: 0.8,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Type
                    </div>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>
                      {rfqData.purchaseType}
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      style={{
                        fontSize: '10px',
                        opacity: 0.8,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Required By
                    </div>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: '#ffeb3b' }}>
                      {formatDate(rfqData.requiredAt)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      style={{
                        fontSize: '10px',
                        opacity: 0.8,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Items
                    </div>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>
                      {rfqData.rfqItems?.length || 0}
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      style={{
                        fontSize: '10px',
                        opacity: 0.8,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Suppliers
                    </div>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>
                      {suppliersWithDetails.length}
                    </div>
                  </div>
                  {rfqData.attachments?.length > 0 && (
                    <Button
                      color="link"
                      size="sm"
                      className="shadow-none p-0 text-white"
                      onClick={() => setShowAttachmentsModal(true)}
                      style={{
                        cursor: 'pointer',
                        textDecoration: 'none',
                        fontSize: '12px',
                      }}
                    >
                      <FaPaperclip className="me-1" />
                      Attachments
                    </Button>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    onClick={() => handleCloneRfq()}
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      fontWeight: '500',
                      borderRadius: '4px',
                    }}
                  >
                    Clone RFQ
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    onClick={() => setShowHistoryModal(true)}
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      fontWeight: '500',
                      borderRadius: '4px',
                    }}
                  >
                    <FaHistory className="me-1" />
                    History
                  </button>
                </div>
              </div>

              <AttachmentsModal
                attachments={rfqData.attachments || []}
                isOpen={showAttachmentsModal}
                toggle={() => setShowAttachmentsModal(false)}
                onDownload={handleDownload}
              />
            </div>

            <div className="row">
              <div className="col-12">
                <div
                  className="card"
                  style={{
                    marginBottom: '16px',
                    borderRadius: '12px',
                    border: '1px solid #e3e6f0',
                    boxShadow: '0 4px 20px rgba(0, 158, 251, 0.1)',
                  }}
                >
                  <div className="card-body" style={{ padding: '18px' }}>
                    <div className="row g-1">
                      {/* Objective and Requirements - First Section */}
                      <div className="col-6">
                        <div className="d-flex flex-column mb-3">
                          <div
                            className="text-muted small mb-2"
                            style={{
                              fontSize: '12px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            Objective
                          </div>
                          <div
                            style={{
                              fontWeight: '500',
                              color: '#4a5568',
                              fontSize: '13px',
                              lineHeight: '1.5',
                              padding: '10px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '6px',
                              border: '1px solid #e9ecef',
                              maxHeight: '100px',
                              overflowY: 'auto',
                            }}
                          >
                            {rfqData.objective}
                          </div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="d-flex flex-column mb-3">
                          <div
                            className="text-muted small mb-2"
                            style={{
                              fontSize: '12px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            Requirements
                          </div>
                          <div
                            style={{
                              fontWeight: '500',
                              color: '#4a5568',
                              fontSize: '13px',
                              lineHeight: '1.5',
                              padding: '10px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '6px',
                              border: '1px solid #e9ecef',
                              maxHeight: '100px',
                              overflowY: 'auto',
                            }}
                          >
                            {rfqData.requirements}
                          </div>
                        </div>
                      </div>

                      {/* Column 1: Created by and Last updated */}
                      <div className="col-4">
                        <div className="d-flex flex-column mb-3">
                          <div
                            className="text-muted small mb-1"
                            style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            Created By
                          </div>
                          <div style={{ fontWeight: '600', color: '#2d3748', fontSize: '13px' }}>
                            {getFullName(rfqData.createdBy)}
                          </div>
                          <small className="text-muted" style={{ fontSize: '11px' }}>
                            {formatDate(rfqData.createdDate)}
                          </small>
                        </div>
                        <div className="d-flex flex-column">
                          <div
                            className="text-muted small mb-1"
                            style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            Last Updated
                          </div>
                          <div style={{ fontWeight: '600', color: '#2d3748', fontSize: '13px' }}>
                            {getFullName(rfqData.updatedBy)}
                          </div>
                          <small className="text-muted" style={{ fontSize: '11px' }}>
                            {formatDate(rfqData.updatedDate)}
                          </small>
                        </div>
                      </div>

                      {/* Column 2: Submitted at and Ship address */}
                      <div className="col-4">
                        {rfqData.submittedAt && (
                          <div className="d-flex flex-column mb-3">
                            <div
                              className="text-muted small mb-1"
                              style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                              }}
                            >
                              Submitted At
                            </div>
                            <span style={{ fontWeight: '600', color: '#28a745', fontSize: '13px' }}>
                              {formatDateTime(rfqData.submittedAt)}
                            </span>
                          </div>
                        )}
                        {shipToAddressName && (
                          <div className="d-flex flex-column">
                            <div
                              className="text-muted small mb-1"
                              style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                              }}
                            >
                              <i className="fas fa-truck me-1"></i>Ship To Address
                            </div>
                            <div
                              style={{
                                fontWeight: '600',
                                color: '#2d3748',
                                fontSize: '12px',
                                lineHeight: '1.3',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                maxHeight: '3.9em',
                              }}
                            >
                              {shipToAddressName}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Column 3: Project, Location, Department, Class, GL Account */}
                      <div className="col-4">
                        <div className="d-flex flex-column gap-2">
                          {projectName && (
                            <div className="metadata-row">
                              <span className="metadata-label">Project:</span>
                              <span className="metadata-value" title={projectName}>
                                {projectName}
                              </span>
                            </div>
                          )}
                          {locationName && (
                            <div className="metadata-row">
                              <span className="metadata-label">Location:</span>
                              <span className="metadata-value" title={locationName}>
                                {locationName}
                              </span>
                            </div>
                          )}
                          {departmentName && (
                            <div className="metadata-row">
                              <span className="metadata-label">Department:</span>
                              <span className="metadata-value" title={departmentName}>
                                {departmentName}
                              </span>
                            </div>
                          )}
                          {className && (
                            <div className="metadata-row">
                              <span className="metadata-label">Class:</span>
                              <span className="metadata-value" title={className}>
                                {className}
                              </span>
                            </div>
                          )}
                          {glAccountName && (
                            <div className="metadata-row">
                              <span className="metadata-label">GL Account:</span>
                              <span className="metadata-value" title={glAccountName}>
                                {glAccountName}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {hasSignoffRequested && supplierNames && (
                        <div className="col-12" style={{ marginTop: '12px' }}>
                          <div
                            style={{
                              backgroundColor: '#fff8e1',
                              borderRadius: '8px',
                              border: '1px solid #ffb74d',
                            }}
                          >
                            {/* Header - Always visible */}
                            <div
                              className="d-flex justify-content-between align-items-center p-3"
                              style={{ cursor: 'pointer' }}
                              onClick={() => setSignoffSectionExpanded(!signoffSectionExpanded)}
                            >
                              <div className="d-flex align-items-center gap-3">
                                <div>
                                  <div
                                    className="text-muted small mb-1"
                                    style={{ fontSize: '11px', fontWeight: '600' }}
                                  >
                                    SIGNOFF REQUESTED
                                  </div>
                                  <div style={{ fontWeight: '600', color: '#f57c00' }}>
                                    {supplierNames}
                                  </div>
                                </div>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                {/* Attachments Icons */}
                                {(() => {
                                  const signOffAttachments =
                                    suppliersWithDetails?.find(
                                      (s) => s.signOffRequests?.signoffUsers?.length > 0,
                                    )?.signOffRequests?.attachments || [];
                                  return (
                                    signOffAttachments.length > 0 && (
                                      <div
                                        className="d-flex gap-1"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {signOffAttachments.map((attachment) => (
                                          <button
                                            key={attachment.attachmentId}
                                            type="button"
                                            className="btn btn-sm btn-link p-1"
                                            onClick={() =>
                                              handleViewAttachment(
                                                attachment.fileId,
                                                attachment.fileName,
                                              )
                                            }
                                            title={attachment.fileName || 'View Attachment'}
                                            style={{ color: '#f57c00' }}
                                          >
                                            <FaPaperclip size={14} />
                                          </button>
                                        ))}
                                      </div>
                                    )
                                  );
                                })()}
                                {signoffSectionExpanded ? (
                                  <FaChevronUp size={14} style={{ color: '#f57c00' }} />
                                ) : (
                                  <FaChevronDown size={14} style={{ color: '#f57c00' }} />
                                )}
                              </div>
                            </div>

                            {/* Expandable Content */}
                            <Collapse isOpen={signoffSectionExpanded}>
                              <div className="px-3 pb-3" style={{ borderTop: '1px solid #ffb74d' }}>
                                {/* Inline Approval Path */}
                                {(() => {
                                  const allSignoffUsers =
                                    suppliersWithDetails?.find(
                                      (s) => s.signOffRequests?.signoffUsers?.length > 0,
                                    )?.signOffRequests?.signoffUsers || [];
                                  const signOffRequest = suppliersWithDetails?.find(
                                    (s) => s.signOffRequests?.signoffUsers?.length > 0,
                                  )?.signOffRequests;
                                  const hasOverride = allSignoffUsers.some(
                                    (u) => u.signoffStatus === 'overridden',
                                  );

                                  if (allSignoffUsers.length === 0) {
                                    return (
                                      <div className="text-muted text-center py-2 small">
                                        No approvers found
                                      </div>
                                    );
                                  }

                                  // Render approvers list component
                                  const ApproversList = () => (
                                    <div className="approvers-list">
                                      {allSignoffUsers.map((user, index) => {
                                        const isApproved = user.signoffStatus === 'approved';
                                        const isRejected = user.signoffStatus === 'rejected';
                                        const isPending =
                                          user.signoffStatus === 'pending' ||
                                          user.signoffStatus === 'requested';
                                        const isOverridden = user.signoffStatus === 'overridden';

                                        // Determine date to show
                                        const requestedDate = user.createdDate
                                          ? new Date(user.createdDate)
                                          : null;
                                        const actionedDate = user.updatedDate
                                          ? new Date(user.updatedDate)
                                          : user.signedAt
                                          ? new Date(user.signedAt)
                                          : null;

                                        return (
                                          <div
                                            key={user.rfqSignOffUserId}
                                            className="d-flex align-items-start gap-2 py-2"
                                            style={{
                                              fontSize: '13px',
                                              borderBottom: '1px solid #eee',
                                            }}
                                          >
                                            <div
                                              className={`step-circle ${
                                                isApproved ? 'approved' : ''
                                              } ${isRejected ? 'rejected' : ''} ${
                                                isPending ? 'pending' : ''
                                              } ${isOverridden ? 'overridden' : ''}`}
                                              style={{
                                                width: '20px',
                                                height: '20px',
                                                minWidth: '20px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '10px',
                                                fontWeight: '600',
                                                backgroundColor: isApproved
                                                  ? '#28a745'
                                                  : isRejected
                                                  ? '#dc3545'
                                                  : isOverridden
                                                  ? '#17a2b8'
                                                  : '#ffc107',
                                                color: isPending ? '#000' : '#fff',
                                                marginTop: '2px',
                                              }}
                                            >
                                              {isApproved && <FaCheck size={10} />}
                                              {isRejected && <span>✕</span>}
                                              {isPending && <span>{index + 1}</span>}
                                              {isOverridden && <span>!</span>}
                                            </div>
                                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                              <div className="d-flex align-items-center gap-2">
                                                <span className="fw-semibold">
                                                  {user.signoffUserId?.firstName}{' '}
                                                  {user.signoffUserId?.lastName}
                                                </span>
                                                <Badge
                                                  color={
                                                    isApproved
                                                      ? 'success'
                                                      : isRejected
                                                      ? 'danger'
                                                      : isOverridden
                                                      ? 'info'
                                                      : 'warning'
                                                  }
                                                  style={{ fontSize: '10px' }}
                                                >
                                                  {user.signoffStatus}
                                                </Badge>
                                              </div>
                                              <div
                                                className="text-muted"
                                                style={{ fontSize: '11px' }}
                                              >
                                                {user.signoffUserId?.email}
                                              </div>
                                              <div
                                                style={{
                                                  fontSize: '11px',
                                                  color: '#888',
                                                  marginTop: '2px',
                                                }}
                                              >
                                                {isPending && requestedDate && (
                                                  <span>
                                                    Requested: {requestedDate.toLocaleDateString()}{' '}
                                                    {requestedDate.toLocaleTimeString([], {
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                    })}
                                                  </span>
                                                )}
                                                {(isApproved || isRejected || isOverridden) &&
                                                  actionedDate && (
                                                    <span>
                                                      {isApproved
                                                        ? 'Approved'
                                                        : isRejected
                                                        ? 'Rejected'
                                                        : 'Overridden'}
                                                      : {actionedDate.toLocaleDateString()}{' '}
                                                      {actionedDate.toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                      })}
                                                    </span>
                                                  )}
                                              </div>
                                              {user.comments && (
                                                <div
                                                  style={{
                                                    fontSize: '12px',
                                                    color: '#555',
                                                    marginTop: '4px',
                                                    background: '#f8f9fa',
                                                    padding: '6px 10px',
                                                    borderRadius: '4px',
                                                    borderLeft: `3px solid ${isRejected ? '#dc3545' : isApproved ? '#28a745' : '#17a2b8'}`,
                                                  }}
                                                >
                                                  <FaComment size={10} style={{ marginRight: '6px', color: '#888' }} />
                                                  {user.comments}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );

                                  // If override exists, use 2-column layout
                                  if (hasOverride && signOffRequest) {
                                    return (
                                      <Row className="mt-3">
                                        <Col md={6}>
                                          <div
                                            className="override-info-section p-2"
                                            style={{
                                              backgroundColor: '#fff3cd',
                                              borderRadius: '6px',
                                              border: '1px solid #ffc107',
                                            }}
                                          >
                                            <div
                                              className="d-flex align-items-center gap-2 mb-2"
                                              style={{ fontWeight: '600', color: '#856404' }}
                                            >
                                              <FaExclamationTriangle size={12} />
                                              <span>Override Details</span>
                                            </div>
                                            {signOffRequest.resolvedBy && (
                                              <div className="mb-1" style={{ fontSize: '13px' }}>
                                                <span className="text-muted">Overridden by: </span>
                                                <span className="fw-semibold">
                                                  {signOffRequest.resolvedBy.firstName}{' '}
                                                  {signOffRequest.resolvedBy.lastName}
                                                </span>
                                              </div>
                                            )}
                                            {signOffRequest.updatedDate && (
                                              <div className="mb-1" style={{ fontSize: '13px' }}>
                                                <span className="text-muted">Date: </span>
                                                <span>
                                                  {new Date(
                                                    signOffRequest.updatedDate,
                                                  ).toLocaleDateString()}{' '}
                                                  {new Date(
                                                    signOffRequest.updatedDate,
                                                  ).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                  })}
                                                </span>
                                              </div>
                                            )}
                                            {signOffRequest.comments && (
                                              <div style={{ fontSize: '13px' }}>
                                                <span className="text-muted">Notes: </span>
                                                <span>{signOffRequest.comments}</span>
                                              </div>
                                            )}
                                          </div>
                                        </Col>
                                        <Col md={6}>
                                          <div
                                            className="p-2"
                                            style={{
                                              backgroundColor: '#f8f9fa',
                                              borderRadius: '6px',
                                              border: '1px solid #dee2e6',
                                            }}
                                          >
                                            <div
                                              className="mb-2"
                                              style={{ fontWeight: '600', fontSize: '13px' }}
                                            >
                                              Approvers
                                            </div>
                                            <ApproversList />
                                          </div>
                                        </Col>
                                      </Row>
                                    );
                                  }

                                  // No override - just show approvers vertically
                                  return (
                                    <div
                                      className="mt-3 p-2"
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        borderRadius: '6px',
                                        border: '1px solid #dee2e6',
                                      }}
                                    >
                                      <div
                                        className="mb-2"
                                        style={{ fontWeight: '600', fontSize: '13px' }}
                                      >
                                        Approvers
                                      </div>
                                      <ApproversList />
                                    </div>
                                  );
                                })()}
                              </div>
                            </Collapse>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="section-header mb-0">Items ({rfqData.rfqItems?.length})</h6>
              </div>
              <div className="table-responsive">
                <table className="table table-striped table-hover rfq-table">
                  <thead>
                    <tr>
                      <th>Part ID</th>
                      <th>Description</th>
                      <th>Qty</th>
                      <th>UOM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfqData.rfqItems?.map((item) => (
                      <tr key={item.rfqItemId}>
                        <td>{item.partId}</td>
                        <td>{item.description}</td>
                        <td>{item.quantity}</td>
                        <td>{item.uom}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="section-header mb-0">Suppliers ({suppliersWithDetails.length})</h6>
                {canInviteSuppliers && (
                  <Button color="primary" size="sm" onClick={() => setShowSupplierDialog(true)}>
                    Invite Supplier
                  </Button>
                )}
              </div>
              <div className="table-responsive">
                <table className="table table-striped table-hover rfq-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Attachment</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliersWithDetails.map((s) => {
                      return (
                        <React.Fragment key={s.rfqSupplierId}>
                          <tr>
                            <td>{s.name}</td>
                            <td>{s.email}</td>
                            <td>{s.primaryContact || ''}</td>
                            <td>
                              {s.attachments?.length ? (
                                <Button
                                  color="link"
                                  size="sm"
                                  className="shadow-none p-0 text-decoration-underline"
                                  onClick={() => setOpenSupplierAttachmentId(s.rfqSupplierId)}
                                >
                                  <FaPaperclip className="me-1" />
                                  {s.attachments[0]?.file?.fileName || 'View Attachment'}
                                </Button>
                              ) : (
                                <span className="text-muted">No files</span>
                              )}
                            </td>
                            <td>{getSupplierStatusBadge(s.supplierStatus)}</td>
                          </tr>

                          {s.attachments?.length > 0 && (
                            <AttachmentsModal
                              attachments={s.attachments}
                              isOpen={openSupplierAttachmentId === s.rfqSupplierId}
                              toggle={() => setOpenSupplierAttachmentId(null)}
                              onDownload={handleDownload}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Action buttons for RFQ Details */}
            {rfqData.rfqStatus === RFQ_STATUS.CREATED && (
              <div className="d-flex justify-content-end gap-2 mb-4">
                <Button color="secondary" onClick={handleBack}>
                  Back
                </Button>
                <Button color="info" onClick={() => navigate(`/CreateRfq/${rfqId}`)}>
                  <FaEdit className="me-1" /> Edit RFQ
                </Button>
                {canSendToSuppliers && (
                  <Button
                    color="success"
                    onClick={handleSendToSuppliers}
                    disabled={sendingToSuppliers}
                  >
                    {sendingToSuppliers ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Sending...
                      </>
                    ) : (
                      'Send to Suppliers'
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Supplier Responses Section - Only show when status is not CREATED */}
            {rfqData.rfqStatus !== RFQ_STATUS.CREATED && (
              <>
                <hr className="my-4" />

                {/* AI Insights Button */}
                <div className="d-flex justify-content-end mb-3">
                  <div
                    className="text-primary cursor-pointer small d-flex align-items-center"
                    onClick={handleAIRecommendationClick}
                    style={{ fontSize: '13px', cursor: 'pointer' }}
                  >
                    <img className="me-1" width="18" height="18" src={aiIcon} alt="AI" />
                    {loadingRecommendation ? (
                      <Spinner size="sm" className="me-1" />
                    ) : (
                      <>AI Insights</>
                    )}
                  </div>
                </div>

                {/* Selected Items Summary */}
                {selectedItems.size > 0 && !isAnySignoffRequested && (
                  <div
                    className="mb-3 p-3 d-flex justify-content-between align-items-center"
                    style={{
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: '#e8f5e9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <FaCheck size={16} style={{ color: '#4caf50' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>
                          {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''} Selected
                          for Sign-off
                        </div>
                        <div style={{ fontSize: '13px', color: '#666' }}>
                          Total Value:{' '}
                          <strong style={{ color: '#333' }}>${totalValue.toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                    <Button
                      color="success"
                      onClick={() => setShowSelectedItemsSignoffModal(true)}
                      disabled={isAnySignoffRequested || selectedItems.size === 0}
                      className="d-flex align-items-center"
                    >
                      <FaCheck className="me-2" />
                      Request Sign-off
                    </Button>
                  </div>
                )}

                {/* Selection Rule Alert */}
                <Row className="mb-3">
                  <Col>
                    <Alert color="info" className="mb-0" fade={false}>
                      <FaExclamationTriangle className="me-2" />
                      <strong>Selection Rule:</strong> Each item can only be selected from one
                      supplier.
                    </Alert>
                  </Col>
                </Row>

                {/* Supplier Response Table */}
                <div
                  className="table-responsive"
                  style={{
                    scrollbarWidth: 'auto',
                  }}
                >
                  <Table striped bordered hover className="supplier-response-table">
                    <thead>
                      <tr>
                        <th rowSpan={2} className="col-part-id">
                          Part ID
                        </th>
                        <th rowSpan={2} className="col-description">
                          Description
                        </th>
                        <th rowSpan={2} className="col-uom">
                          UOM
                        </th>
                        <th rowSpan={2} className="col-req-qty">
                          Req Qty
                        </th>
                        {sortedSuppliers.map((supplier) => {
                          const supplierTotal =
                            memoizedSupplierTotals.find((s) => s.supplierId === supplier.supplierId)
                              ?.total || 0;
                          const isLowestTotalSupplier =
                            selectedItems.size > 0
                              ? lowestBidForSelectedItems.lowestSupplierId ===
                                  supplier.supplierId && lowestBidForSelectedItems.lowestTotal > 0
                              : supplierTotal === lowestTotal && supplierTotal > 0;

                          return (
                            <th
                              key={supplier.supplierId}
                              colSpan={4}
                              className="text-center border-left-thick supplier-header"
                            >
                              <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap">
                                <span className="fw-bold">{supplier.name}</span>
                                {isLowestTotalSupplier && (
                                  <Badge color="warning" pill>
                                    <FaTrophy className="me-1" style={{ fontSize: '10px' }} />
                                    {selectedItems.size > 0 ? 'Best Choice' : 'Lowest Bid'}
                                  </Badge>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                      <tr>
                        {sortedSuppliers.map((supplier) => (
                          <React.Fragment key={`subheader-${supplier.supplierId}`}>
                            <th className="text-center border-left-thick">
                              <Input
                                type="checkbox"
                                checked={isAllItemsSelectedForSupplier(supplier.supplierId)}
                                onChange={(e) =>
                                  handleSelectAllForSupplier(supplier.supplierId, e.target.checked)
                                }
                                disabled={
                                  isAnySignoffRequested || supplier.supplierStatus === 'rejected'
                                }
                                style={{ transform: 'scale(1.1)' }}
                                title="Select all items from this supplier"
                              />
                            </th>
                            <th className="text-center">Unit Price</th>
                            <th className="text-center">Accepted Qty</th>
                            <th className="text-center">Negotiation</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rfqData.rfqItems?.map((item, itemIndex) => (
                        <tr key={item.rfqItemId}>
                          <td className="col-part-id" title={item.partId}>
                            {item.partId}
                          </td>
                          <td className="col-description">
                            <div>{item.description}</div>
                            {item.notes && <small className="text-muted">{item.notes}</small>}
                          </td>
                          <td className="col-uom">{item.uom}</td>
                          <td className="col-req-qty">{item.quantity}</td>
                          {sortedSuppliers.map((supplier, supplierIdx) => {
                            const supplierIndex = suppliersWithDetails.findIndex(
                              (s) => s.supplierId === supplier.supplierId,
                            );
                            const responseItem = responseItems.find(
                              (r) => r.supplierId === supplier.supplierId,
                            )?.items[itemIndex];
                            const isRejected = supplier.supplierStatus === 'rejected';
                            const isSelected = isItemSelected(supplier.supplierId, item.rfqItemId);
                            const hasValidPrice = hasValidUnitPrice(
                              supplier.supplierId,
                              item.rfqItemId,
                            );
                            const isDisabled =
                              isAnySignoffRequested ||
                              isRejected ||
                              (!hasValidPrice && !isSelected);
                            const isItemSelectedFromOtherSupplier =
                              selectedItems.has(item.rfqItemId) &&
                              selectedItems.get(item.rfqItemId) !== supplier.supplierId;
                            const lowestPriceInfo = lowestPricePerItem.get(item.rfqItemId);
                            const isLowestPrice =
                              lowestPriceInfo &&
                              lowestPriceInfo.supplierId === supplier.supplierId &&
                              hasValidPrice;

                            return (
                              <React.Fragment key={`${supplier.supplierId}-${item.rfqItemId}`}>
                                <td className="text-center border-left-thick">
                                  <div className="d-flex justify-content-center align-items-center">
                                    <Input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) =>
                                        handleItemSelection(
                                          supplier.supplierId,
                                          item.rfqItemId,
                                          e.target.checked,
                                        )
                                      }
                                      disabled={isDisabled || isItemSelectedFromOtherSupplier}
                                      style={{ transform: 'scale(1.1)' }}
                                    />
                                  </div>
                                </td>
                                <td className={isLowestPrice ? 'lowest-price-cell' : ''}>
                                  <div className="d-flex align-items-center">
                                    {isLowestPrice && (
                                      <FaTrophy
                                        className="text-success me-1"
                                        style={{ fontSize: '12px' }}
                                      />
                                    )}
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={responseItem?.unitPrice || ''}
                                      onChange={(e) =>
                                        handleUnitPriceChange(
                                          supplierIndex,
                                          itemIndex,
                                          e.target.value,
                                        )
                                      }
                                      disabled={isAnySignoffRequested || isRejected}
                                      className={`form-control-sm ${
                                        isLowestPrice && !(isAnySignoffRequested || isRejected)
                                          ? 'text-success fw-bold'
                                          : ''
                                      }`}
                                      placeholder="0.00"
                                    />
                                  </div>
                                </td>
                                <td>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={item.quantity}
                                    value={responseItem?.quantity || ''}
                                    onChange={(e) =>
                                      handleAcceptedQtyChange(
                                        supplierIndex,
                                        itemIndex,
                                        e.target.value,
                                      )
                                    }
                                    disabled={isAnySignoffRequested || isRejected}
                                    className="form-control-sm"
                                    placeholder={item.quantity}
                                  />
                                </td>
                                <td className="text-center">
                                  <Button
                                    color="outline-primary"
                                    size="sm"
                                    onClick={() => openNegotiationDialog(supplierIndex, itemIndex)}
                                    disabled={isRejected}
                                    title="View negotiation history"
                                  >
                                    <FaHistory />
                                  </Button>
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      ))}
                      <tr className="fw-bold bg-light">
                        <td colSpan="4" className="text-end">
                          {selectedItems.size > 0 ? 'Selected Total:' : 'Grand Total:'}
                        </td>
                        {memoizedSupplierTotals.map(({ supplierId, total }) => {
                          const supplierIndex = suppliersWithDetails.findIndex(
                            (s) => s.supplierId === supplierId,
                          );
                          const selectedFromThisSupplier = Array.from(
                            selectedItems.entries(),
                          ).filter(
                            ([itemId, selectedSupplierId]) => selectedSupplierId === supplierId,
                          );

                          const selectedTotal = selectedFromThisSupplier.reduce((sum, [itemId]) => {
                            const itemIndex = rfqData?.rfqItems?.findIndex(
                              (i) => i.rfqItemId === itemId,
                            );
                            if (itemIndex === -1 || supplierIndex === -1) return sum;
                            const item = rfqData.rfqItems[itemIndex];
                            const responseItem = responseItems[supplierIndex]?.items[itemIndex];
                            const quantity = parseFloat(responseItem?.quantity || item.quantity);
                            const unitPrice = parseFloat(responseItem?.unitPrice || 0);
                            return sum + quantity * unitPrice;
                          }, 0);

                          const displayTotal = selectedItems.size > 0 ? selectedTotal : total;
                          const isLowest =
                            selectedItems.size === 0 && total === lowestTotal && total > 0;

                          return (
                            <React.Fragment key={`total-${supplierId}`}>
                              <td></td>
                              <td className="text-center">
                                <span
                                  className={`fw-bold ${
                                    isLowest
                                      ? 'text-success'
                                      : selectedTotal > 0
                                      ? 'text-primary'
                                      : 'text-dark'
                                  }`}
                                >
                                  ${displayTotal.toFixed(2)}
                                  {isLowest && (
                                    <small className="text-success d-block">Lowest</small>
                                  )}
                                </span>
                              </td>
                              <td colSpan="2"></td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    </tbody>
                  </Table>
                </div>

                {/* Action Buttons for Supplier Responses */}
                <div className="d-flex justify-content-end gap-2 mt-3">
                  <Button color="secondary" onClick={handleBack}>
                    Back
                  </Button>
                  {rfqData.rfqStatus === 'rejected' && (
                    <>
                      <Button color="info" onClick={() => navigate(`/CreateRfq/${rfqId}`)}>
                        <FaEdit className="me-1" /> Edit RFQ
                      </Button>
                      <Button color="success" onClick={handleResubmitRfq}>
                        Resubmit RFQ
                      </Button>
                    </>
                  )}
                  {Object.keys(poStatus).length > 0 && (
                    <Button color="info" onClick={handleViewPOs}>
                      <FaEye className="me-2" />
                      View Purchase Orders
                    </Button>
                  )}
                  {isSignoff && !isRfqCompletedOrClosed && (
                    <Button
                      color="warning"
                      onClick={() => {
                        const signoffSuppliers = suppliersWithDetails.filter(
                          (s) =>
                            s.supplierStatus === 'signoff_requested' ||
                            s.supplierStatus === 'finalized',
                        );
                        signoffSuppliers.forEach((s) => handleOverrideSignoff(s));
                      }}
                    >
                      <FaExclamationTriangle className="me-2" />
                      Override Sign-off
                    </Button>
                  )}
                  {isAnyFinalized && !isRfqClosed && (
                    <Button
                      color="primary"
                      onClick={async () => {
                        const finalizedSuppliers = suppliersWithDetails.filter(
                          (s) => s.supplierStatus === 'finalized',
                        );
                        const suppliersWithoutPO = finalizedSuppliers.filter(
                          (supplier) => !poStatus[supplier.supplierId],
                        );

                        if (suppliersWithoutPO.length === 0) {
                          toast.info('All finalized suppliers already have purchase orders');
                          return;
                        }

                        if (suppliersWithoutPO.length > 1) {
                          const result = await Swal.fire({
                            title: 'Generate Multiple POs?',
                            text: `This will generate POs for ${suppliersWithoutPO.length} suppliers. Continue?`,
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: 'Generate All',
                            cancelButtonText: 'Cancel',
                          });
                          if (!result.isConfirmed) return;
                        }

                        suppliersWithoutPO.forEach((supplier) => {
                          debouncedGeneratePO(supplier);
                        });
                      }}
                      disabled={isGeneratingPO}
                    >
                      {isGeneratingPO ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Generating PO...
                        </>
                      ) : (
                        'Generate PO for Finalized Suppliers'
                      )}
                    </Button>
                  )}
                  {!isRfqCompletedOrClosed && (
                    <Button
                      color="success"
                      onClick={handleSaveAllChanges}
                      disabled={isSaving || isAnySignoffRequested}
                    >
                      {isSaving ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Saving...
                        </>
                      ) : (
                        'Save All Changes'
                      )}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* RFQ History Section */}
        {/* RFQ History Modal */}
        <RfqHistoryTimeline
          companyId={companyId}
          rfqId={rfqId}
          isOpen={showHistoryModal}
          toggle={() => setShowHistoryModal(false)}
        />

        {/* RFQ Supplier Modal */}
        <RfqSupplierModal
          isOpen={showSupplierDialog}
          toggle={() => setShowSupplierDialog(false)}
          existingSuppliers={suppliers}
          formData={rfqData}
          newSupplier={newSupplier}
          setNewSupplier={setNewSupplier}
          addExistingSupplier={addExistingSupplier}
          onAddNewSupplier={addNewSupplier}
        />

        <Modal isOpen={showApproversModal} toggle={() => setShowApproversModal(false)} size="md">
          <ModalHeader toggle={() => setShowApproversModal(false)}>Approval Path</ModalHeader>
          <ModalBody style={{ maxHeight: '225px', overflow: 'auto' }}>
            {(() => {
              const allSignoffUsers =
                hasSignoffRequested && suppliersWithDetails?.length
                  ? suppliersWithDetails.find((s) => s.signOffRequests?.signoffUsers?.length > 0)
                      ?.signOffRequests?.signoffUsers || []
                  : [];

              return allSignoffUsers.length > 0 ? (
                <div>
                  {allSignoffUsers.map((approver, index) => (
                    <div
                      key={approver.rfqSignOffUserId || index}
                      className="d-flex justify-content-between align-items-center mb-3 p-3"
                      style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}
                    >
                      <div>
                        <div className="fw-bold">
                          {index + 1}. {approver.signoffUserId?.firstName || 'N/A'}{' '}
                          {approver.signoffUserId?.lastName || ''}
                        </div>
                        <div className="text-muted small">
                          {approver.signoffUserId?.email || 'N/A'}
                        </div>
                        {approver.signoffStatus === 'overridden' && approver.updatedBy && (
                          <div className="small">
                            <span className="text-muted small">Overridden by: </span>
                            <span className="fw-semibold small">
                              {approver.updatedBy.firstName} {approver.updatedBy.lastName}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-end">
                        <Badge
                          color={
                            approver.signoffStatus === 'approved'
                              ? 'success'
                              : approver.signoffStatus === 'requested'
                              ? 'warning'
                              : approver.signoffStatus === 'overridden'
                              ? 'warning'
                              : approver.signoffStatus === 'rejected'
                              ? 'danger'
                              : 'secondary'
                          }
                          pill
                        >
                          {approver.signoffStatus
                            ? approver.signoffStatus.charAt(0).toUpperCase() +
                              approver.signoffStatus.slice(1)
                            : 'Pending'}
                        </Badge>
                        <div className="text-muted small mt-1">
                          {approver.signedAt
                            ? formatDateTime(approver.signedAt)
                            : formatDateTime(approver.createdDate)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-4">No approvers found for this RFQ.</div>
              );
            })()}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setShowApproversModal(false)}>
              Close
            </Button>
          </ModalFooter>
        </Modal>

        {/* Negotiation History Modal */}
        <Modal
          isOpen={showNegotiationDialog}
          toggle={() => setShowNegotiationDialog(false)}
          size="md"
        >
          <ModalHeader toggle={() => setShowNegotiationDialog(false)}>
            Negotiation History
          </ModalHeader>

          <ModalBody>
            {(() => {
              const supplier = suppliersWithDetails[currentNegotiation.supplierIndex];
              const item = rfqData?.rfqItems?.[currentNegotiation.itemIndex];
              const responseItem =
                responseItems[currentNegotiation.supplierIndex]?.items[
                  currentNegotiation.itemIndex
                ];

              return (
                <>
                  <div className="mb-3">
                    <strong>Supplier:</strong> {supplier?.name}
                  </div>

                  <div className="mb-3">
                    <strong>Item:</strong> {item?.partId} - {item?.description}
                  </div>

                  <div className="mb-3">
                    <Label>History / Notes</Label>

                    {negotiationLoading ? (
                      <div className="text-center py-3">
                        <Spinner size="sm" />
                        <div className="mt-2 text-muted">Loading negotiation history...</div>
                      </div>
                    ) : (
                      renderNegotiationHistory(responseItem?.negotiationHistory)
                    )}
                  </div>
                </>
              );
            })()}
          </ModalBody>

          <ModalFooter>
            <Button color="secondary" onClick={() => setShowNegotiationDialog(false)}>
              Close
            </Button>
          </ModalFooter>
        </Modal>

        {/* AI Recommendation Modal */}
        <Modal
          isOpen={showAIRecommendationModal}
          toggle={() => setShowAIRecommendationModal(false)}
          size="lg"
        >
          <ModalHeader toggle={() => setShowAIRecommendationModal(false)}>
            <img className="me-2" width="24" height="24" src={aiIcon} alt="AI" />
            AI Supplier Recommendation
          </ModalHeader>
          <ModalBody>
            {aiRecommendation && (
              <div className="ai-recommendation-content">
                <div className="p-3 bg-light rounded mb-3">
                  <h5 className="text-white mb-3">
                    <FaTrophy className="me-2 text-warning" />
                    Recommended Supplier: <strong>{aiRecommendation.supplierName}</strong>
                  </h5>
                  {aiRecommendation.reason && (
                    <p className="mb-0 text-muted" style={{ fontStyle: 'italic' }}>
                      {aiRecommendation.reason}
                    </p>
                  )}
                </div>

                {aiRecommendation.recommendation && (
                  <div className="p-3 bg-white border rounded mb-3">
                    <h6 className="text-primary mb-2">
                      <i className="fas fa-chart-line me-2"></i>Detailed Analysis
                    </h6>
                    <div className="recommendation-details">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: aiRecommendation.recommendation
                            ?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\n/g, '<br />'),
                        }}
                      />
                    </div>
                  </div>
                )}

                {aiRecommendation.insights && (
                  <div className="p-3 bg-info bg-opacity-10 border border-info rounded">
                    <h6 className="text-info mb-2">
                      <i className="fas fa-lightbulb me-2"></i>Additional Insights
                    </h6>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: aiRecommendation.insights
                          ?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br />'),
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setShowAIRecommendationModal(false)}>
              Close
            </Button>
          </ModalFooter>
        </Modal>

        {/* Selected Items Sign-off Modal */}
        <Modal
          isOpen={showSelectedItemsSignoffModal}
          toggle={() => setShowSelectedItemsSignoffModal(false)}
          size="lg"
        >
          <ModalHeader toggle={() => setShowSelectedItemsSignoffModal(false)}>
            Request Sign-off for Selected Items
          </ModalHeader>
          <ModalBody>
            <div className="mb-4">
              <h6 className="mb-3" style={{ color: '#333', fontWeight: '600' }}>
                Selected Items Summary
              </h6>
              <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <Table size="sm" className="mb-0" style={{ fontSize: '13px' }}>
                  <thead style={{ backgroundColor: '#5d87ff', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ fontWeight: '600', color: '#fff' }}>Item</th>
                      <th style={{ fontWeight: '600', color: '#fff' }}>Supplier</th>
                      <th className="text-end" style={{ fontWeight: '600', color: '#fff' }}>
                        Unit Price
                      </th>
                      <th className="text-center" style={{ fontWeight: '600', color: '#fff' }}>
                        Qty
                      </th>
                      <th className="text-end" style={{ fontWeight: '600', color: '#fff' }}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(selectedItems.entries()).map(([itemId, supplierId]) => {
                      const item = getItemDetails(itemId);
                      const supplierResponse = responseItems.find(
                        (r) => r.supplierId === supplierId,
                      );
                      const responseItem = supplierResponse?.items.find(
                        (i) => i.rfqItemId === itemId,
                      );
                      const unitPrice = parseFloat(responseItem?.unitPrice || 0);
                      const quantity = parseFloat(responseItem?.quantity || item?.quantity || 0);

                      return (
                        <tr key={itemId}>
                          <td style={{ maxWidth: '250px' }}>
                            <div style={{ fontWeight: '500' }}>{item?.partId}</div>
                            <div
                              className="text-muted"
                              style={{
                                fontSize: '12px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '230px',
                              }}
                              title={item?.description}
                            >
                              {item?.description}
                            </div>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{getSupplierName(supplierId)}</td>
                          <td className="text-end" style={{ whiteSpace: 'nowrap' }}>
                            ${unitPrice.toFixed(2)}
                          </td>
                          <td className="text-center">{quantity}</td>
                          <td
                            className="text-end"
                            style={{ fontWeight: '500', whiteSpace: 'nowrap' }}
                          >
                            ${(unitPrice * quantity).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
              <div
                className="d-flex justify-content-between align-items-center mt-2 p-2"
                style={{ backgroundColor: '#f8f9fa', borderRadius: '4px' }}
              >
                <span style={{ fontWeight: '600', color: '#333' }}>Total Value</span>
                <span style={{ fontWeight: '700', fontSize: '15px', color: '#333' }}>
                  ${totalValue.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mb-3">
              <Label htmlFor="userSearch" style={{ fontWeight: '600', color: '#333' }}>
                Select Approvers
              </Label>
              <Input
                type="text"
                id="userSearch"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users by name or email..."
                className="mb-2"
                style={{ fontSize: '13px' }}
              />
              <div
                style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                }}
              >
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <div
                      key={user.userId}
                      className="d-flex align-items-center p-2"
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedUsers.includes(user.userId)
                          ? '#f0f7ff'
                          : 'transparent',
                        borderBottom: '1px solid #eee',
                      }}
                      onClick={() => {
                        if (selectedUsers.includes(user.userId)) {
                          setSelectedUsers(selectedUsers.filter((id) => id !== user.userId));
                        } else {
                          setSelectedUsers([...selectedUsers, user.userId]);
                        }
                      }}
                    >
                      <Input
                        type="checkbox"
                        checked={selectedUsers.includes(user.userId)}
                        onChange={() => {}}
                        className="me-2"
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ fontSize: '13px' }}>
                        <div style={{ fontWeight: '500' }}>
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-muted" style={{ fontSize: '12px' }}>
                          {user.email}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted py-3" style={{ fontSize: '13px' }}>
                    {searchTerm ? 'No users found matching your search.' : 'Loading users...'}
                  </div>
                )}
              </div>
              {selectedUsers.length > 0 && (
                <small className="text-muted mt-2 d-block">
                  {selectedUsers.length} approver{selectedUsers.length !== 1 ? 's' : ''} selected
                </small>
              )}
            </div>
          </ModalBody>
          <ModalFooter style={{ borderTop: '1px solid #dee2e6' }}>
            <Button
              color="secondary"
              onClick={() => setShowSelectedItemsSignoffModal(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={submitSelectedItemsSignoffRequest}
              disabled={selectedUsers.length === 0 || isSaving}
            >
              {isSaving ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Sending...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </ModalFooter>
        </Modal>

        {/* Override Sign-off Modal */}
        <Modal
          isOpen={showOverrideSignoffModal}
          toggle={() => setShowOverrideSignoffModal(false)}
          size="md"
        >
          <ModalHeader toggle={() => setShowOverrideSignoffModal(false)}>
            Override Sign-off
          </ModalHeader>
          <ModalBody>
            <Alert color="warning" fade={false}>
              <FaExclamationTriangle className="me-2" />
              <strong>Warning:</strong> You are about to override the sign-off process. This action
              will bypass pending approvals.
            </Alert>
            <div className="mb-3">
              <Label for="overrideNotes">
                Override Notes <span className="text-danger">*</span>
              </Label>
              <Input
                type="textarea"
                id="overrideNotes"
                rows={4}
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                placeholder="Enter reason for override..."
              />
            </div>
            <div className="mb-3">
              <Label for="overrideAttachment">
                Attachment <span className="text-danger">*</span>
              </Label>
              <Input
                type="file"
                id="overrideAttachment"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              {isUploading && (
                <small className="text-muted">
                  <Spinner size="sm" className="me-1" />
                  Uploading...
                </small>
              )}
              {uploadedFileId && (
                <small className="text-success">
                  <FaCheck className="me-1" />
                  File uploaded successfully
                </small>
              )}
              {uploadError && <small className="text-danger">{uploadError}</small>}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={resetOverrideModal}>
              Cancel
            </Button>
            <Button
              color="warning"
              onClick={submitOverrideSignoff}
              disabled={isSaving || !overrideNotes.trim() || !uploadedFileId || isUploading}
            >
              {isSaving ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Processing...
                </>
              ) : (
                'Override Sign-off'
              )}
            </Button>
          </ModalFooter>
        </Modal>

        {/* View Purchase Orders Modal */}
        <Modal isOpen={showPOModal} toggle={() => setShowPOModal(false)} size="lg">
          <ModalHeader toggle={() => setShowPOModal(false)}>
            Purchase Orders for RFQ: {rfqData?.title}
          </ModalHeader>
          <ModalBody>
            <div className="table-responsive">
              <Table striped bordered hover>
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
                      <tr key={po.PurchaseOrderId || po.purchaseOrderId}>
                        <td>
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handlePOClick(po.PurchaseOrderId || po.purchaseOrderId);
                            }}
                            style={{
                              color: '#0d6efd',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                            }}
                          >
                            {po.orderNo}
                          </a>
                        </td>
                        <td>{po.supplier?.name || 'Unknown Supplier'}</td>
                        <td>${po.orderTotal?.toFixed(2) || '0.00'}</td>
                        <td>
                          <Badge
                            color={
                              po.orderStatus === 'APPROVED'
                                ? 'success'
                                : po.orderStatus === 'PENDING_APPROVAL'
                                ? 'warning'
                                : po.orderStatus === 'REJECTED'
                                ? 'danger'
                                : 'secondary'
                            }
                          >
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
              </Table>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setShowPOModal(false)}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </>
  );
};

export default RFQDetail;
