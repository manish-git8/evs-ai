import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  CardBody,
  Row,
  Col,
  Nav,
  NavItem,
  NavLink,
  Badge,
  Spinner,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormGroup,
  Label,
  Input,
  Alert,
  InputGroup,
  InputGroupText,
} from 'reactstrap';
import {
  User,
  ShoppingCart,
  FileText,
  Send,
  CheckSquare,
  ArrowLeft,
  Edit,
  RefreshCw,
  Users,
  Settings,
  Plus,
  Trash2,
  AlertTriangle,
  DollarSign,
  ChevronUp,
  ChevronDown,
} from 'react-feather';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import UserService from '../../services/UserService';
import CartService from '../../services/CartService';
import PurchaseOrderService from '../../services/PurchaseOrderService';
import RfqService from '../../services/RfqService';
import UserApprovalPathService from '../../services/UserApprovalPathService';
import FileUploadService from '../../services/FileUploadService';
import apiClient from '../../api/apiClient';
import { getUserRole, getEntityId, formatDate, formatCurrency, getCurrencySymbol, getCompanyCurrency } from '../localStorageUtil';
import '../CompanyManagement/ReactBootstrapTable.scss';

const UserDetails = () => {
  const navigate = useNavigate();
  const { userId, companyId, userEntityType } = useParams();
  const currentUserRoles = getUserRole() || [];
  const isAdmin = currentUserRoles.includes('ADMIN') || currentUserRoles.includes('COMPANY_ADMIN');
  const currentCompanyId = getEntityId();

  // Active menu state
  const [activeMenu, setActiveMenu] = useState('details');

  // User data
  const [userData, setUserData] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [profileImage, setProfileImage] = useState(null);

  // Pagination config
  const pageSize = 10;

  // Carts data
  const [carts, setCarts] = useState([]);
  const [isLoadingCarts, setIsLoadingCarts] = useState(false);
  const [cartsCurrentPage, setCartsCurrentPage] = useState(0);
  const [cartsTotalElements, setCartsTotalElements] = useState(0);

  // Purchase Orders data
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [isLoadingPOs, setIsLoadingPOs] = useState(false);
  const [posCurrentPage, setPosCurrentPage] = useState(0);
  const [posTotalElements, setPosTotalElements] = useState(0);

  // RFQs data
  const [rfqs, setRfqs] = useState([]);
  const [isLoadingRfqs, setIsLoadingRfqs] = useState(false);
  const [rfqsCurrentPage, setRfqsCurrentPage] = useState(0);
  const [rfqsTotalElements, setRfqsTotalElements] = useState(0);

  // Approvals data
  const [pendingCartApprovals, setPendingCartApprovals] = useState([]);
  const [pendingPOApprovals, setPendingPOApprovals] = useState([]);
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(false);
  const [approvalTab, setApprovalTab] = useState('carts');
  const [cartApprovalsCurrentPage, setCartApprovalsCurrentPage] = useState(0);
  const [cartApprovalsTotalElements, setCartApprovalsTotalElements] = useState(0);
  const [poApprovalsCurrentPage, setPoApprovalsCurrentPage] = useState(0);
  const [poApprovalsTotalElements, setPoApprovalsTotalElements] = useState(0);

  // Selection state for reassignment
  const [selectedCarts, setSelectedCarts] = useState([]);
  const [selectedRfqs, setSelectedRfqs] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);

  // Reassign modal state
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassignType, setReassignType] = useState(''); // 'carts', 'rfqs', 'orders'
  const [targetUserId, setTargetUserId] = useState('');
  const [companyUsers, setCompanyUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);

  // Approval Settings state
  const [approvalPath, setApprovalPath] = useState(null);
  const [approvalLimit, setApprovalLimit] = useState('');
  const [eligibleApprovers, setEligibleApprovers] = useState([]);
  const [pathValidation, setPathValidation] = useState(null);
  const [isLoadingApprovalSettings, setIsLoadingApprovalSettings] = useState(false);
  const [isUpdatingApprovalLimit, setIsUpdatingApprovalLimit] = useState(false);
  const [isAddingApprover, setIsAddingApprover] = useState(false);
  const [selectedApproverToAdd, setSelectedApproverToAdd] = useState(null);
  const [showAddApproverModal, setShowAddApproverModal] = useState(false);
  // Approver search state
  const [approverSearchTerm, setApproverSearchTerm] = useState('');
  const [approverSearchResults, setApproverSearchResults] = useState([]);
  const [isSearchingApprovers, setIsSearchingApprovers] = useState(false);
  const [approverSearchPage, setApproverSearchPage] = useState(0);
  const [approverSearchTotalPages, setApproverSearchTotalPages] = useState(0);
  // Edit approver limit state
  const [showEditApproverLimitModal, setShowEditApproverLimitModal] = useState(false);
  const [editingApprover, setEditingApprover] = useState(null);
  const [editApproverLimit, setEditApproverLimit] = useState('');
  const [isUpdatingApproverLimit, setIsUpdatingApproverLimit] = useState(false);

  // Admin action state
  const [isPerformingAction, setIsPerformingAction] = useState(false);

  // Reusable function to fetch user data
  const fetchUserData = useCallback(async () => {
    setIsLoadingUser(true);
    try {
      const response = await UserService.fetchByUserId(companyId, userId, userEntityType);
      setUserData(response || response.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setIsLoadingUser(false);
    }
  }, [companyId, userId, userEntityType]);

  // Fetch user data and initial counts for badges
  useEffect(() => {
    // Fetch initial counts for all tabs (for badge display)
    const fetchInitialCounts = async () => {
      try {
        // Fetch counts in parallel with minimal page size for carts/POs/RFQs
        // and full data for approvals (since we need to filter by PENDING status)
        const [cartsRes, posRes, rfqsRes, cartApprovalsRes, poApprovalsRes] = await Promise.allSettled([
          CartService.getCartsPaginated(companyId, 1, 0, '', userId, '', ''),
          PurchaseOrderService.getPurchaseOrdersPaginated(companyId, { pageSize: 1, pageNumber: 0, createdBy: userId }),
          RfqService.getRfq(companyId, { pageSize: 1, pageNumber: 0, createdBy: userId }),
          // These endpoints return all approvals for the user - we'll filter for PENDING
          apiClient.get(`ep/v1/company/${companyId}/cart/${userId}`),
          apiClient.get(`ep/v1/company/${companyId}/purchaseOrder/${userId}`),
        ]);

        // Set cart count from paginated response
        if (cartsRes.status === 'fulfilled') {
          const cartTotal = cartsRes.value.data?.totalElements ?? 0;
          setCartsTotalElements(cartTotal);
        }

        // Set PO count from paginated response
        if (posRes.status === 'fulfilled') {
          const poTotal = posRes.value.data?.totalElements ?? 0;
          setPosTotalElements(poTotal);
        }

        // Set RFQ count from paginated response
        if (rfqsRes.status === 'fulfilled') {
          const rfqTotal = rfqsRes.value.data?.totalElements ?? 0;
          setRfqsTotalElements(rfqTotal);
        }

        // Set cart approvals count (filter for PENDING)
        if (cartApprovalsRes.status === 'fulfilled') {
          const cartApprovals = cartApprovalsRes.value.data || [];
          const pendingCarts = Array.isArray(cartApprovals)
            ? cartApprovals.filter((cart) => cart.approvalDecision === 'PENDING')
            : [];
          setCartApprovalsTotalElements(pendingCarts.length);
        }

        // Set PO approvals count (filter for PENDING)
        if (poApprovalsRes.status === 'fulfilled') {
          const poApprovals = poApprovalsRes.value.data || [];
          const pendingPOs = Array.isArray(poApprovals)
            ? poApprovals.filter((po) => po.approvalDecision === 'PENDING')
            : [];
          setPoApprovalsTotalElements(pendingPOs.length);
        }
      } catch (error) {
        console.error('Error fetching initial counts:', error);
      }
    };

    if (userId && companyId) {
      fetchUserData();
      fetchInitialCounts();
    }
  }, [userId, companyId, userEntityType, fetchUserData]);

  // Fetch profile image when userData is loaded
  useEffect(() => {
    const fetchProfileImage = async () => {
      if (userData?.profileImageId) {
        try {
          const response = await FileUploadService.getFileByFileId(userData.profileImageId, { silent: true });
          const reader = new FileReader();
          reader.onloadend = () => {
            setProfileImage(reader.result);
          };
          reader.readAsDataURL(response.data);
        } catch (error) {
          console.warn('Could not fetch profile image:', error);
        }
      }
    };

    fetchProfileImage();
  }, [userData?.profileImageId]);

  // Debounced search for approvers
  useEffect(() => {
    const searchApprovers = async () => {
      if (!showAddApproverModal) return;

      setIsSearchingApprovers(true);
      try {
        const pageDto = {
          pageSize: 10,
          pageNumber: approverSearchPage,
          sortBy: 'firstName',
          order: 'asc',
        };

        let response;
        if (approverSearchTerm.trim()) {
          response = await UserService.getUsersBySearch(approverSearchTerm, companyId, pageDto);
        } else {
          response = await UserService.fetchAllUsers(companyId, pageDto);
        }

        const usersData = response.data?.content || response.data || [];
        const totalPages = response.data?.totalPages || 1;

        // Get current approvers to filter them out
        const currentApproverIds = approvalPath?.approvers?.map(a => a.approverUser?.userId) || [];

        // Filter out: current user, and users already in approval path
        const filteredUsers = usersData.filter(user =>
          user.userId !== parseInt(userId) &&
          !currentApproverIds.includes(user.userId) &&
          user.isActive !== false
        );

        // Get approval limits for filtered users
        const usersWithLimits = await Promise.all(
          filteredUsers.map(async (user) => {
            try {
              const limitResponse = await UserApprovalPathService.getApprovalLimit(companyId, user.userId);
              const limit = limitResponse?.approvalLimit;
              return {
                ...user,
                approvalLimit: limit,
                hasApprovalLimit: limit != null && limit > 0,
              };
            } catch {
              return {
                ...user,
                approvalLimit: null,
                hasApprovalLimit: false,
              };
            }
          })
        );

        setApproverSearchResults(usersWithLimits);
        setApproverSearchTotalPages(totalPages);
      } catch (error) {
        console.error('Error searching approvers:', error);
        setApproverSearchResults([]);
      } finally {
        setIsSearchingApprovers(false);
      }
    };

    const debounceTimer = setTimeout(searchApprovers, 300);
    return () => clearTimeout(debounceTimer);
  }, [approverSearchTerm, approverSearchPage, showAddApproverModal, companyId, userId, approvalPath]);

  // Fetch carts function
  const fetchCarts = async (pageNumber = 0) => {
    setIsLoadingCarts(true);
    try {
      const response = await CartService.getCartsPaginated(
        companyId,
        pageSize,
        pageNumber,
        '',
        userId,
        '',
        '',
      );
      const cartsData = response.data?.content || response.data || [];
      const totalCount = response.data?.totalElements ?? cartsData.length;
      setCarts(Array.isArray(cartsData) ? cartsData : []);
      setCartsTotalElements(totalCount);
      setCartsCurrentPage(pageNumber);
    } catch (error) {
      console.error('Error fetching carts:', error);
      setCarts([]);
      setCartsTotalElements(0);
    } finally {
      setIsLoadingCarts(false);
    }
  };

  // Fetch carts when menu changes to carts
  useEffect(() => {
    if (activeMenu === 'carts' && userId && companyId) {
      fetchCarts(0);
    }
  }, [activeMenu, userId, companyId]);

  // Format PO data to normalize field names (API returns PurchaseOrderId with capital P)
  const formatPurchaseOrder = (po) => ({
    purchaseOrderId: po.PurchaseOrderId || po.purchaseOrderId,
    orderNo: po.orderNo || po.purchaseOrderNumber || po.PurchaseOrderNumber || po.purchaseOrderNo,
    supplier: po.supplier,
    orderAmount: po.orderAmount || po.totalAmount,
    orderStatus: po.poStatus || po.orderStatus,
    orderPlacedDate: po.orderPlacedDate || po.createdDate,
    deliveryDate: po.deliveryDate,
  });

  // Fetch purchase orders function
  const fetchPurchaseOrders = async (pageNumber = 0) => {
    setIsLoadingPOs(true);
    try {
      const response = await PurchaseOrderService.getPurchaseOrdersPaginated(companyId, {
        pageSize,
        pageNumber,
        createdBy: userId,
      });
      const posData = response.data?.content || response.data || [];
      const totalCount = response.data?.totalElements ?? posData.length;
      // Format the data to normalize field names
      const formattedPOs = Array.isArray(posData) ? posData.map(formatPurchaseOrder) : [];
      setPurchaseOrders(formattedPOs);
      setPosTotalElements(totalCount);
      setPosCurrentPage(pageNumber);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      setPurchaseOrders([]);
      setPosTotalElements(0);
    } finally {
      setIsLoadingPOs(false);
    }
  };

  // Fetch purchase orders when menu changes to orders
  useEffect(() => {
    if (activeMenu === 'orders' && userId && companyId) {
      fetchPurchaseOrders(0);
    }
  }, [activeMenu, userId, companyId]);

  // Fetch RFQs function - backend now returns paginated response
  const fetchRfqs = async (pageNumber = 0) => {
    setIsLoadingRfqs(true);
    try {
      const response = await RfqService.getRfq(companyId, {
        pageSize,
        pageNumber,
        createdBy: userId,
      });
      const rfqsData = response.data?.content || response.data || [];
      const totalCount = response.data?.totalElements ?? rfqsData.length;
      setRfqs(Array.isArray(rfqsData) ? rfqsData : []);
      setRfqsTotalElements(totalCount);
      setRfqsCurrentPage(pageNumber);
    } catch (error) {
      console.error('Error fetching RFQs:', error);
      setRfqs([]);
      setRfqsTotalElements(0);
    } finally {
      setIsLoadingRfqs(false);
    }
  };

  // Fetch RFQs when menu changes to rfqs
  useEffect(() => {
    if (activeMenu === 'rfqs' && userId && companyId) {
      fetchRfqs(0);
    }
  }, [activeMenu, userId, companyId]);

  // Store all cart approvals for client-side pagination
  const [allCartApprovals, setAllCartApprovals] = useState([]);
  const [cartApprovalsLoaded, setCartApprovalsLoaded] = useState(false);

  // Fetch cart approvals function - uses same endpoint as Dashboard
  const fetchCartApprovals = async (pageNumber = 0) => {
    setIsLoadingApprovals(true);
    try {
      if (!cartApprovalsLoaded) {
        // Fetch carts where this user is the approver using the approver endpoint
        const cartResponse = await CartService.getCartById(companyId, userId);
        const allCartData = cartResponse.data || [];
        // Filter to only show carts with PENDING approval decision
        const userPendingCarts = Array.isArray(allCartData)
          ? allCartData.filter((cart) => cart.approvalDecision === 'PENDING')
          : [];
        setAllCartApprovals(userPendingCarts);
        setCartApprovalsTotalElements(userPendingCarts.length);
        setCartApprovalsLoaded(true);
        // Apply client-side pagination
        const startIndex = pageNumber * pageSize;
        const paginatedCarts = userPendingCarts.slice(startIndex, startIndex + pageSize);
        setPendingCartApprovals(paginatedCarts);
      } else {
        // Use cached data for pagination
        const startIndex = pageNumber * pageSize;
        const paginatedCarts = allCartApprovals.slice(startIndex, startIndex + pageSize);
        setPendingCartApprovals(paginatedCarts);
      }
      setCartApprovalsCurrentPage(pageNumber);
    } catch (error) {
      console.error('Error fetching cart approvals:', error);
      setPendingCartApprovals([]);
      setAllCartApprovals([]);
      setCartApprovalsTotalElements(0);
    } finally {
      setIsLoadingApprovals(false);
    }
  };

  // Store all PO approvals for client-side pagination
  const [allPOApprovals, setAllPOApprovals] = useState([]);
  const [poApprovalsLoaded, setPoApprovalsLoaded] = useState(false);

  // Format PO data to normalize field names (API returns PurchaseOrderId with capital P)
  const formatPOApproval = (po) => ({
    purchaseOrderId: po.PurchaseOrderId || po.purchaseOrderId,
    orderNo: po.orderNo || po.purchaseOrderNumber || po.PurchaseOrderNumber || po.purchaseOrderNo,
    createdBy: po.buyerUser || po.createdBy,
    supplier: po.supplier,
    orderAmount: po.orderAmount || po.totalAmount,
    orderPlacedDate: po.orderPlacedDate || po.createdDate,
    approvalDecision: po.approvalDecision,
  });

  // Fetch PO approvals function - uses same endpoint as Dashboard
  const fetchPOApprovals = async (pageNumber = 0) => {
    setIsLoadingApprovals(true);
    try {
      if (!poApprovalsLoaded) {
        // Fetch POs where this user is the approver using the approver endpoint
        const poResponse = await PurchaseOrderService.getPurchaseOrderDetailsById(companyId, userId);
        const allPOs = poResponse.data || [];
        // Filter to only show POs with PENDING approval decision and format data
        const userPendingPOs = Array.isArray(allPOs)
          ? allPOs.filter((po) => po.approvalDecision === 'PENDING').map(formatPOApproval)
          : [];
        setAllPOApprovals(userPendingPOs);
        setPoApprovalsTotalElements(userPendingPOs.length);
        setPoApprovalsLoaded(true);
        // Apply client-side pagination
        const startIndex = pageNumber * pageSize;
        const paginatedPOs = userPendingPOs.slice(startIndex, startIndex + pageSize);
        setPendingPOApprovals(paginatedPOs);
      } else {
        // Use cached data for pagination
        const startIndex = pageNumber * pageSize;
        const paginatedPOs = allPOApprovals.slice(startIndex, startIndex + pageSize);
        setPendingPOApprovals(paginatedPOs);
      }
      setPoApprovalsCurrentPage(pageNumber);
    } catch (error) {
      console.error('Error fetching PO approvals:', error);
      setPendingPOApprovals([]);
      setAllPOApprovals([]);
      setPoApprovalsTotalElements(0);
    } finally {
      setIsLoadingApprovals(false);
    }
  };

  // Fetch approvals when menu changes to approvals
  useEffect(() => {
    if (activeMenu === 'approvals' && userId && companyId) {
      // Reset caches
      setAllCartApprovals([]);
      setCartApprovalsLoaded(false);
      setAllPOApprovals([]);
      setPoApprovalsLoaded(false);
      fetchCartApprovals(0);
      fetchPOApprovals(0);
    }
  }, [activeMenu, userId, companyId]);

  // Fetch approval settings data
  const fetchApprovalSettings = async () => {
    setIsLoadingApprovalSettings(true);
    try {
      const [pathResponse, limitResponse, validationResponse] = await Promise.allSettled([
        UserApprovalPathService.getUserApprovalPath(companyId, userId),
        UserApprovalPathService.getApprovalLimit(companyId, userId),
        UserApprovalPathService.validateApprovalPath(companyId, userId),
      ]);

      if (pathResponse.status === 'fulfilled') {
        setApprovalPath(pathResponse.value.data || pathResponse.value);
      }
      if (limitResponse.status === 'fulfilled') {
        const limitData = limitResponse.value.data || limitResponse.value;
        const limit = limitData?.approvalLimit;
        setApprovalLimit(limit !== null && limit !== undefined ? String(limit) : '');
      }
      if (validationResponse.status === 'fulfilled') {
        setPathValidation(validationResponse.value.data || validationResponse.value);
      }
    } catch (error) {
      console.error('Error fetching approval settings:', error);
      toast.error('Failed to load approval settings');
    } finally {
      setIsLoadingApprovalSettings(false);
    }
  };

  // Fetch approval settings when menu changes to approval-settings
  useEffect(() => {
    if (activeMenu === 'approval-settings' && userId && companyId && isAdmin) {
      fetchApprovalSettings();
    }
  }, [activeMenu, userId, companyId, isAdmin]);

  // Handle updating approval limit
  const handleUpdateApprovalLimit = async () => {
    if (!approvalLimit || isNaN(parseFloat(approvalLimit))) {
      toast.error('Please enter a valid approval limit');
      return;
    }

    setIsUpdatingApprovalLimit(true);
    try {
      await UserApprovalPathService.updateApprovalLimit(companyId, userId, parseFloat(approvalLimit));
      toast.success('Approval limit updated successfully');
      fetchApprovalSettings(); // Refresh to update validation
    } catch (error) {
      console.error('Error updating approval limit:', error);
      toast.error('Failed to update approval limit');
    } finally {
      setIsUpdatingApprovalLimit(false);
    }
  };

  // Handle adding approver
  const handleAddApprover = async () => {
    if (!selectedApproverToAdd?.userId) {
      toast.error('Please select an approver to add');
      return;
    }

    setIsAddingApprover(true);
    try {
      await UserApprovalPathService.addApproverToPath(companyId, userId, selectedApproverToAdd.userId);
      toast.success('Approver added successfully');
      setShowAddApproverModal(false);
      setSelectedApproverToAdd(null);
      setApproverSearchTerm('');
      setApproverSearchPage(0);
      fetchApprovalSettings(); // Refresh data
    } catch (error) {
      console.error('Error adding approver:', error);
      toast.error(error.response?.data?.message || 'Failed to add approver');
    } finally {
      setIsAddingApprover(false);
    }
  };

  // Handle removing approver
  const handleRemoveApprover = async (approverUserId) => {
    if (!window.confirm('Are you sure you want to remove this approver?')) {
      return;
    }

    try {
      await UserApprovalPathService.removeApproverFromPath(companyId, userId, approverUserId);
      toast.success('Approver removed successfully');
      fetchApprovalSettings(); // Refresh data
    } catch (error) {
      console.error('Error removing approver:', error);
      toast.error('Failed to remove approver');
    }
  };

  // Handle reordering approvers
  const handleMoveApprover = async (approverUserId, direction) => {
    if (!approvalPath?.approvers || approvalPath.approvers.length < 2) return;

    const currentIndex = approvalPath.approvers.findIndex(a => a.approverUserId === approverUserId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= approvalPath.approvers.length) return;

    // Create new order array
    const newOrder = approvalPath.approvers.map(a => a.approverUserId);
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];

    try {
      await UserApprovalPathService.reorderApprovers(companyId, userId, newOrder);
      toast.success('Approver order updated');
      fetchApprovalSettings(); // Refresh data
    } catch (error) {
      console.error('Error reordering approvers:', error);
      toast.error('Failed to reorder approvers');
    }
  };

  // Open edit approver limit modal
  const openEditApproverLimitModal = (approver) => {
    setEditingApprover(approver);
    setEditApproverLimit(approver.approvalLimit ? String(approver.approvalLimit) : '');
    setShowEditApproverLimitModal(true);
  };

  // Handle updating an approver's approval limit
  const handleUpdateApproverLimit = async () => {
    if (!editApproverLimit || isNaN(parseFloat(editApproverLimit))) {
      toast.error('Please enter a valid approval limit');
      return;
    }

    if (!editingApprover) return;

    setIsUpdatingApproverLimit(true);
    try {
      // Update the approver's approval limit using their userId
      await UserApprovalPathService.updateApprovalLimit(
        companyId,
        editingApprover.approverUserId,
        parseFloat(editApproverLimit)
      );
      toast.success('Approver limit updated successfully');
      setShowEditApproverLimitModal(false);
      setEditingApprover(null);
      setEditApproverLimit('');
      fetchApprovalSettings(); // Refresh data
    } catch (error) {
      console.error('Error updating approver limit:', error);
      toast.error('Failed to update approver limit');
    } finally {
      setIsUpdatingApproverLimit(false);
    }
  };

  // Fetch company users for reassignment
  const fetchCompanyUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const response = await UserService.fetchCompanyUsers(companyId, 'company');
      const users = response.data || response || [];
      // Filter out the current user being viewed
      const filteredUsers = Array.isArray(users)
        ? users.filter((user) => user.userId !== parseInt(userId, 10))
        : [];
      setCompanyUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching company users:', error);
      setCompanyUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [companyId, userId]);

  // Open reassign modal
  const openReassignModal = (type) => {
    setReassignType(type);
    setTargetUserId('');
    setIsReassignModalOpen(true);
    fetchCompanyUsers();
  };

  // Close reassign modal
  const closeReassignModal = () => {
    setIsReassignModalOpen(false);
    setReassignType('');
    setTargetUserId('');
  };

  // Handle reassignment
  const handleReassign = async () => {
    if (!targetUserId) {
      toast.error('Please select a user to reassign to');
      return;
    }

    const selectedItems =
      reassignType === 'carts'
        ? selectedCarts
        : reassignType === 'rfqs'
          ? selectedRfqs
          : selectedOrders;

    if (selectedItems.length === 0) {
      toast.error('No items selected for reassignment');
      return;
    }

    setIsReassigning(true);
    try {
      let response;
      if (reassignType === 'carts') {
        response = await CartService.reassignCarts(companyId, selectedItems, parseInt(targetUserId, 10));
      } else if (reassignType === 'rfqs') {
        response = await RfqService.reassignRfqs(companyId, selectedItems, parseInt(targetUserId, 10));
      } else if (reassignType === 'orders') {
        response = await PurchaseOrderService.reassignPurchaseOrders(
          companyId,
          selectedItems,
          parseInt(targetUserId, 10),
        );
      }

      const result = response.data || response;
      if (result.success || result.reassignedCount > 0) {
        toast.success(result.message || `Successfully reassigned ${result.reassignedCount} item(s)`);
        // Clear selections and refresh data
        if (reassignType === 'carts') {
          setSelectedCarts([]);
          fetchCarts(cartsCurrentPage);
        } else if (reassignType === 'rfqs') {
          setSelectedRfqs([]);
          fetchRfqs(rfqsCurrentPage);
        } else if (reassignType === 'orders') {
          setSelectedOrders([]);
          fetchPurchaseOrders(posCurrentPage);
        }
        closeReassignModal();
      } else {
        toast.error(result.message || 'Failed to reassign items');
      }
    } catch (error) {
      console.error('Error reassigning items:', error);
      toast.error('Failed to reassign items. Please try again.');
    } finally {
      setIsReassigning(false);
    }
  };

  // Selection handlers
  const handleCartSelection = (cartId, isSelected) => {
    if (isSelected) {
      setSelectedCarts((prev) => [...prev, cartId]);
    } else {
      setSelectedCarts((prev) => prev.filter((id) => id !== cartId));
    }
  };

  const handleSelectAllCarts = (isSelected) => {
    if (isSelected) {
      // Only select carts that can be reassigned (not SUBMITTED or POGENERATED)
      const selectableIds = carts
        .filter((cart) => !['SUBMITTED', 'POGENERATED', 'submitted', 'pogenerated'].includes(cart.cartStatusType))
        .map((cart) => cart.cartId);
      setSelectedCarts(selectableIds);
    } else {
      setSelectedCarts([]);
    }
  };

  const handleRfqSelection = (rfqId, isSelected) => {
    if (isSelected) {
      setSelectedRfqs((prev) => [...prev, rfqId]);
    } else {
      setSelectedRfqs((prev) => prev.filter((id) => id !== rfqId));
    }
  };

  const handleSelectAllRfqs = (isSelected) => {
    if (isSelected) {
      // Only select RFQs that can be reassigned (not COMPLETED or CLOSED)
      const selectableIds = rfqs
        .filter((rfq) => !['COMPLETED', 'CLOSED', 'completed', 'closed'].includes(rfq.rfqStatus))
        .map((rfq) => rfq.rfqId);
      setSelectedRfqs(selectableIds);
    } else {
      setSelectedRfqs([]);
    }
  };

  const handleOrderSelection = (orderId, isSelected) => {
    if (isSelected) {
      setSelectedOrders((prev) => [...prev, orderId]);
    } else {
      setSelectedOrders((prev) => prev.filter((id) => id !== orderId));
    }
  };

  const handleSelectAllOrders = (isSelected) => {
    if (isSelected) {
      // Only select orders that can be reassigned (not DELIVERED or RETURNED)
      const selectableIds = purchaseOrders
        .filter((po) => !['DELIVERED', 'RETURNED', 'delivered', 'returned'].includes(po.orderStatus))
        .map((po) => po.purchaseOrderId);
      setSelectedOrders(selectableIds);
    } else {
      setSelectedOrders([]);
    }
  };

  // Check if a cart can be selected for reassignment
  const canSelectCart = (cart) => {
    return !['SUBMITTED', 'POGENERATED', 'submitted', 'pogenerated'].includes(cart.cartStatusType);
  };

  // Check if an RFQ can be selected for reassignment
  const canSelectRfq = (rfq) => {
    return !['COMPLETED', 'CLOSED', 'completed', 'closed'].includes(rfq.rfqStatus);
  };

  // Check if an order can be selected for reassignment
  const canSelectOrder = (order) => {
    return !['DELIVERED', 'RETURNED', 'delivered', 'returned'].includes(order.orderStatus);
  };

  const handleBack = () => {
    navigate('/user-management');
  };

  const handleEdit = () => {
    navigate(`/user-registration/${userId}/${companyId}/${userEntityType}`);
  };

  // Admin action handlers
  const handleUnlockAccount = async () => {
    setIsPerformingAction(true);
    try {
      await UserService.unlockUserAccount(userId);
      toast.success('Account unlocked successfully');
      await fetchUserData();
    } catch (error) {
      console.error('Error unlocking account:', error);
      toast.error(error.response?.data?.message || 'Failed to unlock account');
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleResetFailedAttempts = async () => {
    setIsPerformingAction(true);
    try {
      await UserService.resetFailedLoginAttempts(userId);
      toast.success('Failed login attempts reset successfully');
      await fetchUserData();
    } catch (error) {
      console.error('Error resetting failed attempts:', error);
      toast.error(error.response?.data?.message || 'Failed to reset failed attempts');
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleResendVerification = async () => {
    setIsPerformingAction(true);
    try {
      await UserService.resendVerificationEmail(userId);
      toast.success('Verification email sent successfully');
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast.error(error.response?.data?.message || 'Failed to send verification email');
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleManuallyVerifyEmail = async () => {
    setIsPerformingAction(true);
    try {
      await UserService.manuallyVerifyEmail(userId);
      toast.success('Email verified successfully');
      await fetchUserData();
    } catch (error) {
      console.error('Error verifying email:', error);
      toast.error(error.response?.data?.message || 'Failed to verify email');
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleForcePasswordReset = async () => {
    setIsPerformingAction(true);
    try {
      await UserService.forcePasswordReset(userId);
      toast.success('User will be required to change password on next login');
      await fetchUserData();
    } catch (error) {
      console.error('Error forcing password reset:', error);
      toast.error(error.response?.data?.message || 'Failed to force password reset');
    } finally {
      setIsPerformingAction(false);
    }
  };

  const tableOptions = {
    paginationShowsTotal: false,
    hideSizePerPage: true,
    paginationPosition: 'bottom',
  };


  const renderStatusBadge = (status) => {
    const statusColors = {
      draft: 'secondary',
      submitted: 'warning',
      approved: 'success',
      rejected: 'danger',
      completed: 'info',
      cancelled: 'dark',
      pending_approval: 'warning',
      DRAFT: 'secondary',
      SUBMITTED: 'warning',
      APPROVED: 'success',
      REJECTED: 'danger',
      COMPLETED: 'info',
      CANCELLED: 'dark',
      PENDING_APPROVAL: 'warning',
    };
    return (
      <Badge color={statusColors[status] || 'secondary'} style={{ textTransform: 'capitalize' }}>
        {status?.replace(/_/g, ' ') || 'N/A'}
      </Badge>
    );
  };

  // Menu items configuration - use totalElements for accurate counts
  const baseMenuItems = [
    { key: 'details', label: 'User Details', icon: User },
    { key: 'carts', label: 'Carts', icon: ShoppingCart, count: cartsTotalElements },
    { key: 'orders', label: 'Purchase Orders', icon: FileText, count: posTotalElements },
    { key: 'rfqs', label: 'RFQs', icon: Send, count: rfqsTotalElements },
    {
      key: 'approvals',
      label: 'Approvals',
      icon: CheckSquare,
      count: cartApprovalsTotalElements + poApprovalsTotalElements,
    },
  ];

  // Add approval settings menu for admins only
  const menuItems = isAdmin
    ? [...baseMenuItems, { key: 'approval-settings', label: 'Approval Settings', icon: Settings }]
    : baseMenuItems;

  // Render User Details Section
  const renderUserDetails = () => {
    if (isLoadingUser) {
      return (
        <div className="text-center py-5">
          <Spinner color="primary" />
          <p className="text-muted mt-3">Loading user details...</p>
        </div>
      );
    }

    if (!userData) {
      return (
        <div className="text-center py-5">
          <User size={48} className="text-muted" />
          <p className="text-muted mt-3">User not found</p>
        </div>
      );
    }

    return (
      <div className="user-details-content">
        {/* User Information Grid */}
        <Row>
          <Col md="6">
            <Card className="mb-3 h-100" style={{ border: '1px solid #e8e8e8' }}>
              <CardBody>
                <h6 style={{ color: '#009efb', marginBottom: '16px', fontWeight: '600' }}>
                  <User size={16} className="me-2" />
                  Personal Information
                </h6>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">User Name</span>
                    <span className="info-value">{userData.userName || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Mobile</span>
                    <span className="info-value">{userData.mobile || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Phone</span>
                    <span className="info-value">{userData.phone || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Extension</span>
                    <span className="info-value">{userData.ext || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Contact Type</span>
                    <span className="info-value">{userData.userContactType || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Created Date</span>
                    <span className="info-value">{formatDate(userData.createdDate)}</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col md="6">
            <Card className="mb-3 h-100" style={{ border: '1px solid #e8e8e8' }}>
              <CardBody>
                <h6 style={{ color: '#009efb', marginBottom: '16px', fontWeight: '600' }}>
                  <FileText size={16} className="me-2" />
                  Address Information
                </h6>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Address Line 1</span>
                    <span className="info-value">{userData.address?.addressLine1 || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Address Line 2</span>
                    <span className="info-value">{userData.address?.addressLine2 || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">City</span>
                    <span className="info-value">{userData.address?.city || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">State</span>
                    <span className="info-value">{userData.address?.state || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Country</span>
                    <span className="info-value">{userData.address?.country || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Postal Code</span>
                    <span className="info-value">{userData.address?.postalCode || 'N/A'}</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Account Status and Activity Row */}
        <Row>
          <Col md="6">
            <Card className="mb-3 h-100" style={{ border: '1px solid #e8e8e8' }}>
              <CardBody>
                <h6 style={{ color: '#009efb', marginBottom: '16px', fontWeight: '600' }}>
                  <Settings size={16} className="me-2" />
                  Account Status
                </h6>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Email Verified</span>
                    <span className="info-value">
                      {userData.emailVerified ? (
                        <Badge color="success" pill>Verified</Badge>
                      ) : (
                        <Badge color="warning" pill>Not Verified</Badge>
                      )}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Account Status</span>
                    <span className="info-value">
                      {userData.accountLocked ? (
                        <Badge color="danger" pill>Locked</Badge>
                      ) : userData.isActive ? (
                        <Badge color="success" pill>Active</Badge>
                      ) : (
                        <Badge color="secondary" pill>Inactive</Badge>
                      )}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Failed Login Attempts</span>
                    <span className="info-value">
                      {userData.failedLoginAttempts > 0 ? (
                        <Badge color={userData.failedLoginAttempts >= 3 ? 'danger' : 'warning'} pill>
                          {userData.failedLoginAttempts}
                        </Badge>
                      ) : (
                        <span>0</span>
                      )}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Password Change Required</span>
                    <span className="info-value">
                      {userData.requirePasswordChange ? (
                        <Badge color="warning" pill>Yes</Badge>
                      ) : (
                        <span>No</span>
                      )}
                    </span>
                  </div>
                  {userData.accountLocked && userData.accountLockedAt && (
                    <div className="info-item">
                      <span className="info-label">Locked At</span>
                      <span className="info-value">{formatDate(userData.accountLockedAt)}</span>
                    </div>
                  )}
                </div>

                {/* Admin Actions */}
                {isAdmin && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid #e8e8e8' }}>
                    <h6 className="text-muted small mb-2">Admin Actions</h6>
                    <div className="d-flex flex-wrap gap-2">
                      {userData.accountLocked && (
                        <Button
                          color="success"
                          size="sm"
                          outline
                          onClick={handleUnlockAccount}
                          disabled={isPerformingAction}
                        >
                          <RefreshCw size={14} className="me-1" />
                          Unlock Account
                        </Button>
                      )}
                      {userData.failedLoginAttempts > 0 && (
                        <Button
                          color="warning"
                          size="sm"
                          outline
                          onClick={handleResetFailedAttempts}
                          disabled={isPerformingAction}
                        >
                          <RefreshCw size={14} className="me-1" />
                          Reset Attempts
                        </Button>
                      )}
                      {!userData.emailVerified && (
                        <>
                          <Button
                            color="info"
                            size="sm"
                            outline
                            onClick={handleResendVerification}
                            disabled={isPerformingAction}
                          >
                            <Send size={14} className="me-1" />
                            Resend Verification
                          </Button>
                          <Button
                            color="success"
                            size="sm"
                            outline
                            onClick={handleManuallyVerifyEmail}
                            disabled={isPerformingAction}
                          >
                            <CheckSquare size={14} className="me-1" />
                            Verify Email
                          </Button>
                        </>
                      )}
                      {!userData.requirePasswordChange && (
                        <Button
                          color="secondary"
                          size="sm"
                          outline
                          onClick={handleForcePasswordReset}
                          disabled={isPerformingAction}
                        >
                          <Settings size={14} className="me-1" />
                          Force Password Reset
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
          <Col md="6">
            <Card className="mb-3 h-100" style={{ border: '1px solid #e8e8e8' }}>
              <CardBody>
                <h6 style={{ color: '#009efb', marginBottom: '16px', fontWeight: '600' }}>
                  <RefreshCw size={16} className="me-2" />
                  Activity Information
                </h6>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Last Login</span>
                    <span className="info-value">
                      {userData.lastLoginAt ? formatDate(userData.lastLoginAt) : 'Never logged in'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Password Changed</span>
                    <span className="info-value">
                      {userData.passwordChangedAt ? formatDate(userData.passwordChangedAt) : 'Never changed'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Account Created</span>
                    <span className="info-value">{formatDate(userData.createdDate)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Entity Type</span>
                    <span className="info-value">
                      <Badge color="info" pill>{userData.entityType || 'N/A'}</Badge>
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // Render Carts Section
  const renderCarts = () => {
    if (isLoadingCarts) {
      return (
        <div className="text-center py-5">
          <Spinner color="primary" />
          <p className="text-muted mt-3">Loading carts...</p>
        </div>
      );
    }

    if (carts.length === 0) {
      return (
        <div className="text-center py-5">
          <ShoppingCart size={48} className="text-muted" />
          <p className="text-muted mt-3">No carts found for this user</p>
        </div>
      );
    }

    const selectableCartsCount = carts.filter(canSelectCart).length;
    const allSelectableSelected = selectableCartsCount > 0 && selectedCarts.length === selectableCartsCount;

    return (
      <div>
        {/* Selection toolbar */}
        {isAdmin && (
          <div className="d-flex justify-content-between align-items-center mb-3 p-2" style={{ backgroundColor: '#f8f9fc', borderRadius: '8px' }}>
            <div className="d-flex align-items-center">
              <Input
                type="checkbox"
                checked={allSelectableSelected}
                onChange={(e) => handleSelectAllCarts(e.target.checked)}
                className="me-2"
                disabled={selectableCartsCount === 0}
              />
              <span className="text-muted small">
                {selectedCarts.length > 0
                  ? `${selectedCarts.length} selected`
                  : 'Select carts to reassign'}
              </span>
            </div>
            {selectedCarts.length > 0 && (
              <Button
                color="primary"
                size="sm"
                onClick={() => openReassignModal('carts')}
              >
                <RefreshCw size={14} className="me-1" />
                Reassign Selected ({selectedCarts.length})
              </Button>
            )}
          </div>
        )}
        <div className="table-responsive">
          <BootstrapTable
            striped
            hover
            condensed
            data={carts}
            pagination={cartsTotalElements > pageSize}
            remote
            fetchInfo={{ dataTotalSize: cartsTotalElements }}
            options={{
              ...tableOptions,
              page: cartsCurrentPage + 1,
              sizePerPage: pageSize,
              onPageChange: (page) => fetchCarts(page - 1),
              onRowClick: (row) => navigate(`/cartDetails/${row.cartId}/${row.shipToAddressId || ''}`),
            }}
            trStyle={{ cursor: 'pointer' }}
          >
            <TableHeaderColumn dataField="cartId" isKey hidden>
              Cart ID
            </TableHeaderColumn>
            {isAdmin && (
              <TableHeaderColumn
                dataField="select"
                width="5%"
                dataAlign="center"
                dataFormat={(cell, row) => {
                  const canSelect = canSelectCart(row);
                  return (
                    <Input
                      type="checkbox"
                      checked={selectedCarts.includes(row.cartId)}
                      disabled={!canSelect}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleCartSelection(row.cartId, e.target.checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      title={canSelect ? 'Select for reassignment' : 'Cannot reassign - cart is submitted or PO generated'}
                    />
                  );
                }}
              >
                &nbsp;
              </TableHeaderColumn>
            )}
            <TableHeaderColumn
              dataField="cartNo"
              width={isAdmin ? '14%' : '15%'}
              dataFormat={(cell) => (
                <span style={{ color: '#009efb', fontWeight: '500' }}>{cell || '-'}</span>
              )}
            >
              Cart No.
            </TableHeaderColumn>
            <TableHeaderColumn
              dataField="supplierNames"
              width="18%"
              dataFormat={(cell) => {
                if (!cell) return <span className="text-muted">-</span>;
                const supplierText = typeof cell === 'string' ? cell : String(cell);
                const truncated = supplierText.length > 25 ? `${supplierText.substring(0, 25)}...` : supplierText;
                return <span title={supplierText}>{truncated}</span>;
              }}
            >
              Supplier
            </TableHeaderColumn>
            <TableHeaderColumn
              dataField="cartAmount"
              width="15%"
              dataFormat={(cell) => formatCurrency(cell)}
            >
              Amount
            </TableHeaderColumn>
            <TableHeaderColumn
              dataField="cartStatusType"
              width="15%"
              dataAlign="center"
              dataFormat={(cell) => renderStatusBadge(cell)}
            >
              Status
            </TableHeaderColumn>
            <TableHeaderColumn
              dataField="createdDate"
              width="12%"
              dataFormat={(cell) => formatDate(cell)}
            >
              Created
            </TableHeaderColumn>
            <TableHeaderColumn dataField="lineItemCount" width="8%" dataAlign="center">
              Items
            </TableHeaderColumn>
          </BootstrapTable>
        </div>
      </div>
    );
  };

  // Render Purchase Orders Section
  const renderPurchaseOrders = () => {
    if (isLoadingPOs) {
      return (
        <div className="text-center py-5">
          <Spinner color="primary" />
          <p className="text-muted mt-3">Loading purchase orders...</p>
        </div>
      );
    }

    if (purchaseOrders.length === 0) {
      return (
        <div className="text-center py-5">
          <FileText size={48} className="text-muted" />
          <p className="text-muted mt-3">No purchase orders found for this user</p>
        </div>
      );
    }

    const selectableOrdersCount = purchaseOrders.filter(canSelectOrder).length;
    const allSelectableSelected = selectableOrdersCount > 0 && selectedOrders.length === selectableOrdersCount;

    return (
      <div>
        {/* Selection toolbar */}
        {isAdmin && (
          <div className="d-flex justify-content-between align-items-center mb-3 p-2" style={{ backgroundColor: '#f8f9fc', borderRadius: '8px' }}>
            <div className="d-flex align-items-center">
              <Input
                type="checkbox"
                checked={allSelectableSelected}
                onChange={(e) => handleSelectAllOrders(e.target.checked)}
                className="me-2"
                disabled={selectableOrdersCount === 0}
              />
              <span className="text-muted small">
                {selectedOrders.length > 0
                  ? `${selectedOrders.length} selected`
                  : 'Select orders to reassign'}
              </span>
            </div>
            {selectedOrders.length > 0 && (
              <Button
                color="primary"
                size="sm"
                onClick={() => openReassignModal('orders')}
              >
                <RefreshCw size={14} className="me-1" />
                Reassign Selected ({selectedOrders.length})
              </Button>
            )}
          </div>
        )}
        <div className="table-responsive">
          <BootstrapTable
            striped
            hover
            condensed
            data={purchaseOrders}
            pagination={posTotalElements > pageSize}
            remote
            fetchInfo={{ dataTotalSize: posTotalElements }}
            options={{
              ...tableOptions,
              page: posCurrentPage + 1,
              sizePerPage: pageSize,
              onPageChange: (page) => fetchPurchaseOrders(page - 1),
              onRowClick: (row) => navigate(`/purchase-order-detail/${row.purchaseOrderId}`),
            }}
            trStyle={{ cursor: 'pointer' }}
          >
            <TableHeaderColumn dataField="purchaseOrderId" isKey hidden>
              PO ID
            </TableHeaderColumn>
            {isAdmin && (
              <TableHeaderColumn
                dataField="select"
                width="5%"
                dataAlign="center"
                dataFormat={(cell, row) => {
                  const canSelect = canSelectOrder(row);
                  return (
                    <Input
                      type="checkbox"
                      checked={selectedOrders.includes(row.purchaseOrderId)}
                      disabled={!canSelect}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleOrderSelection(row.purchaseOrderId, e.target.checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      title={canSelect ? 'Select for reassignment' : 'Cannot reassign - order is completed'}
                    />
                  );
                }}
              >
                &nbsp;
              </TableHeaderColumn>
            )}
            <TableHeaderColumn
              dataField="orderNo"
              width={isAdmin ? '16%' : '18%'}
              dataFormat={(cell) => (
                <span style={{ color: '#009efb', fontWeight: '500' }}>{cell || '-'}</span>
              )}
            >
              Order No.
            </TableHeaderColumn>
            <TableHeaderColumn
              dataField="supplier"
              width="18%"
              dataFormat={(cell) => cell?.displayName || cell?.name || 'N/A'}
            >
              Supplier
            </TableHeaderColumn>
            <TableHeaderColumn
              dataField="orderAmount"
              width="15%"
              dataFormat={(cell) => formatCurrency(cell)}
            >
              Amount
            </TableHeaderColumn>
            <TableHeaderColumn
              dataField="orderStatus"
              width="13%"
              dataAlign="center"
              dataFormat={(cell) => renderStatusBadge(cell)}
            >
              Status
            </TableHeaderColumn>
            <TableHeaderColumn
              dataField="orderPlacedDate"
              width="11%"
              dataFormat={(cell) => formatDate(cell)}
            >
              Created
            </TableHeaderColumn>
            <TableHeaderColumn
              dataField="deliveryDate"
              width="11%"
              dataFormat={(cell) => formatDate(cell)}
            >
              Delivery
            </TableHeaderColumn>
          </BootstrapTable>
        </div>
      </div>
    );
  };

  // Render RFQs Section
  const renderRfqs = () => {
    if (isLoadingRfqs) {
      return (
        <div className="text-center py-5">
          <Spinner color="primary" />
          <p className="text-muted mt-3">Loading RFQs...</p>
        </div>
      );
    }

    if (rfqs.length === 0) {
      return (
        <div className="text-center py-5">
          <Send size={48} className="text-muted" />
          <p className="text-muted mt-3">No RFQs found for this user</p>
        </div>
      );
    }

    const selectableRfqsCount = rfqs.filter(canSelectRfq).length;
    const allSelectableSelected = selectableRfqsCount > 0 && selectedRfqs.length === selectableRfqsCount;

    return (
      <div>
        {/* Selection toolbar */}
        {isAdmin && (
          <div className="d-flex justify-content-between align-items-center mb-3 p-2" style={{ backgroundColor: '#f8f9fc', borderRadius: '8px' }}>
            <div className="d-flex align-items-center">
              <Input
                type="checkbox"
                checked={allSelectableSelected}
                onChange={(e) => handleSelectAllRfqs(e.target.checked)}
                className="me-2"
                disabled={selectableRfqsCount === 0}
              />
              <span className="text-muted small">
                {selectedRfqs.length > 0
                  ? `${selectedRfqs.length} selected`
                  : 'Select RFQs to reassign'}
              </span>
            </div>
            {selectedRfqs.length > 0 && (
              <Button
                color="primary"
                size="sm"
                onClick={() => openReassignModal('rfqs')}
              >
                <RefreshCw size={14} className="me-1" />
                Reassign Selected ({selectedRfqs.length})
              </Button>
            )}
          </div>
        )}
        <div className="table-responsive">
          <BootstrapTable
            striped
            hover
            condensed
            data={rfqs}
            pagination={rfqsTotalElements > pageSize}
            remote
            fetchInfo={{ dataTotalSize: rfqsTotalElements }}
            options={{
              ...tableOptions,
              page: rfqsCurrentPage + 1,
              sizePerPage: pageSize,
              onPageChange: (page) => fetchRfqs(page - 1),
              onRowClick: (row) => navigate(`/RfqDetails/${row.rfqId}`),
            }}
            trStyle={{ cursor: 'pointer' }}
          >
            <TableHeaderColumn dataField="rfqId" isKey hidden>
              RFQ ID
            </TableHeaderColumn>
            {isAdmin && (
              <TableHeaderColumn
                dataField="select"
                width="5%"
                dataAlign="center"
                dataFormat={(cell, row) => {
                  const canSelect = canSelectRfq(row);
                  return (
                    <Input
                      type="checkbox"
                      checked={selectedRfqs.includes(row.rfqId)}
                      disabled={!canSelect}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleRfqSelection(row.rfqId, e.target.checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      title={canSelect ? 'Select for reassignment' : 'Cannot reassign - RFQ is completed or closed'}
                    />
                  );
                }}
              >
                &nbsp;
              </TableHeaderColumn>
            )}
            <TableHeaderColumn
              dataField="title"
              width={isAdmin ? '22%' : '25%'}
              dataFormat={(cell) => (
                <span style={{ color: '#009efb', fontWeight: '500' }}>{cell || '-'}</span>
              )}
            >
              Title
            </TableHeaderColumn>
            <TableHeaderColumn
              dataField="objective"
              width="18%"
              dataFormat={(cell) => {
                if (!cell) return <span className="text-muted">-</span>;
                const truncated = cell.length > 30 ? `${cell.substring(0, 30)}...` : cell;
                return <span title={cell}>{truncated}</span>;
              }}
            >
              Objective
            </TableHeaderColumn>
            <TableHeaderColumn
              dataField="suppliers"
              width="10%"
              dataAlign="center"
              dataFormat={(cell) => (cell ? cell.length : 0)}
            >
              Suppliers
            </TableHeaderColumn>
            <TableHeaderColumn
              dataField="rfqStatus"
              width="13%"
              dataAlign="center"
              dataFormat={(cell) => renderStatusBadge(cell)}
            >
              Status
            </TableHeaderColumn>
            <TableHeaderColumn
              dataField="createdDate"
              width="11%"
              dataFormat={(cell) => formatDate(cell)}
            >
              Created
            </TableHeaderColumn>
            <TableHeaderColumn
              dataField="requiredAt"
              width="11%"
              dataFormat={(cell) => formatDate(cell)}
            >
              Required
            </TableHeaderColumn>
          </BootstrapTable>
        </div>
      </div>
    );
  };

  // Render Approvals Section
  const renderApprovals = () => {
    if (isLoadingApprovals) {
      return (
        <div className="text-center py-5">
          <Spinner color="primary" />
          <p className="text-muted mt-3">Loading approvals...</p>
        </div>
      );
    }

    return (
      <div>
        {/* Approval Tabs */}
        <Nav tabs className="mb-3">
          <NavItem>
            <NavLink
              className={approvalTab === 'carts' ? 'active' : ''}
              onClick={() => setApprovalTab('carts')}
              style={{ cursor: 'pointer' }}
            >
              <ShoppingCart size={14} className="me-1" />
              Cart Approvals
              {cartApprovalsTotalElements > 0 && (
                <Badge color="danger" className="ms-2">
                  {cartApprovalsTotalElements}
                </Badge>
              )}
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={approvalTab === 'orders' ? 'active' : ''}
              onClick={() => setApprovalTab('orders')}
              style={{ cursor: 'pointer' }}
            >
              <FileText size={14} className="me-1" />
              PO Approvals
              {poApprovalsTotalElements > 0 && (
                <Badge color="danger" className="ms-2">
                  {poApprovalsTotalElements}
                </Badge>
              )}
            </NavLink>
          </NavItem>
        </Nav>

        {/* Cart Approvals Tab */}
        {approvalTab === 'carts' && (
          <>
            {pendingCartApprovals.length === 0 ? (
              <div className="text-center py-5">
                <CheckSquare size={48} className="text-muted" />
                <p className="text-muted mt-3">No pending cart approvals for this user</p>
              </div>
            ) : (
              <div className="table-responsive">
                <BootstrapTable
                  striped
                  hover
                  condensed
                  data={pendingCartApprovals}
                  pagination={cartApprovalsTotalElements > pageSize}
                  remote
                  fetchInfo={{ dataTotalSize: cartApprovalsTotalElements }}
                  options={{
                    ...tableOptions,
                    page: cartApprovalsCurrentPage + 1,
                    sizePerPage: pageSize,
                    onPageChange: (page) => fetchCartApprovals(page - 1),
                    onRowClick: (row) => navigate(`/cart-approval-details/${row.cartId}`),
                  }}
                  trStyle={{ cursor: 'pointer' }}
                >
                  <TableHeaderColumn dataField="cartId" isKey hidden>
                    Cart ID
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="cartNo"
                    width="15%"
                    dataFormat={(cell) => (
                      <span style={{ color: '#009efb', fontWeight: '500' }}>{cell || '-'}</span>
                    )}
                  >
                    Cart No.
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="supplierNames"
                    width="20%"
                    dataFormat={(cell) => {
                      if (!cell) return <span className="text-muted">-</span>;
                      const supplierText = typeof cell === 'string' ? cell : String(cell);
                      const truncated = supplierText.length > 25 ? `${supplierText.substring(0, 25)}...` : supplierText;
                      return <span title={supplierText}>{truncated}</span>;
                    }}
                  >
                    Supplier
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="createdBy"
                    width="20%"
                    dataFormat={(cell) =>
                      cell ? `${cell.firstName || ''} ${cell.lastName || ''}`.trim() || 'N/A' : 'N/A'
                    }
                  >
                    Requested By
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="cartAmount"
                    width="15%"
                    dataFormat={(cell) => formatCurrency(cell)}
                  >
                    Amount
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="submittedDate"
                    width="15%"
                    dataFormat={(cell) => formatDate(cell || '')}
                  >
                    Submitted
                  </TableHeaderColumn>
                </BootstrapTable>
              </div>
            )}
          </>
        )}

        {/* PO Approvals Tab */}
        {approvalTab === 'orders' && (
          <>
            {pendingPOApprovals.length === 0 ? (
              <div className="text-center py-5">
                <CheckSquare size={48} className="text-muted" />
                <p className="text-muted mt-3">No pending PO approvals for this user</p>
              </div>
            ) : (
              <div className="table-responsive">
                <BootstrapTable
                  striped
                  hover
                  condensed
                  data={pendingPOApprovals}
                  pagination={poApprovalsTotalElements > pageSize}
                  remote
                  fetchInfo={{ dataTotalSize: poApprovalsTotalElements }}
                  options={{
                    ...tableOptions,
                    page: poApprovalsCurrentPage + 1,
                    sizePerPage: pageSize,
                    onPageChange: (page) => fetchPOApprovals(page - 1),
                    onRowClick: (row) => navigate(`/purchase-order-detail/${row.purchaseOrderId}`),
                  }}
                  trStyle={{ cursor: 'pointer' }}
                >
                  <TableHeaderColumn dataField="purchaseOrderId" isKey hidden>
                    PO ID
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="orderNo"
                    width="18%"
                    dataFormat={(cell) => (
                      <span style={{ color: '#009efb', fontWeight: '500' }}>{cell || '-'}</span>
                    )}
                  >
                    Order No.
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="createdBy"
                    width="18%"
                    dataFormat={(cell) =>
                      cell ? `${cell.firstName || ''} ${cell.lastName || ''}`.trim() || 'N/A' : 'N/A'
                    }
                  >
                    Requested By
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="supplier"
                    width="18%"
                    dataFormat={(cell) => cell?.displayName || cell?.name || 'N/A'}
                  >
                    Supplier
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="orderAmount"
                    width="15%"
                    dataFormat={(cell) => formatCurrency(cell)}
                  >
                    Amount
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="orderPlacedDate"
                    width="12%"
                    dataFormat={(cell) => formatDate(cell)}
                  >
                    Created
                  </TableHeaderColumn>
                </BootstrapTable>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Render Approval Settings Section (Admin only)
  const renderApprovalSettings = () => {
    if (isLoadingApprovalSettings) {
      return (
        <div className="text-center py-5">
          <Spinner color="primary" />
          <p className="text-muted mt-3">Loading approval settings...</p>
        </div>
      );
    }

    return (
      <div className="approval-settings-content">
        <h5 style={{ color: '#009efb', marginBottom: '20px', fontWeight: '600' }}>
          <Settings size={20} className="me-2" />
          Approval Settings for {userData?.firstName} {userData?.lastName}
        </h5>

        {/* Validation Warnings */}
        {pathValidation?.warnings && pathValidation.warnings.length > 0 && (
          <Alert color="warning" className="mb-4">
            <div className="d-flex align-items-start">
              <AlertTriangle size={20} className="me-2 mt-1" />
              <div>
                <strong>Warnings:</strong>
                <ul className="mb-0 mt-1">
                  {pathValidation.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Alert>
        )}

        <Row className="align-items-stretch">
          {/* User's Approval Limit */}
          <Col md="6" className="d-flex">
            <Card className="mb-4 w-100" style={{ border: '1px solid #e8e8e8' }}>
              <CardBody className="d-flex flex-column">
                <h6 style={{ color: '#333', marginBottom: '16px', fontWeight: '600' }}>
                  <DollarSign size={16} className="me-2" />
                  User&apos;s Approval Limit
                </h6>
                <p className="text-muted small mb-3">
                  Set the maximum amount this user can approve. Leave empty for no limit.
                </p>
                <div className="mt-auto">
                  <InputGroup>
                    <InputGroupText>{getCurrencySymbol(getCompanyCurrency())}</InputGroupText>
                    <Input
                      type="number"
                      placeholder="Enter approval limit"
                      value={approvalLimit}
                      onChange={(e) => setApprovalLimit(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                    <Button
                      color="primary"
                      onClick={handleUpdateApprovalLimit}
                      disabled={isUpdatingApprovalLimit}
                    >
                      {isUpdatingApprovalLimit ? <Spinner size="sm" /> : 'Save'}
                    </Button>
                  </InputGroup>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Coverage Info */}
          <Col md="6" className="d-flex">
            <Card className="mb-4 w-100" style={{ border: '1px solid #e8e8e8' }}>
              <CardBody className="d-flex flex-column">
                <h6 style={{ color: '#333', marginBottom: '8px', fontWeight: '600' }}>
                  Coverage Information
                </h6>
                <p className="text-muted small mb-3">
                  Shows the maximum order amount that can be approved using this user&apos;s private approval path.
                  Orders exceeding this amount will fall back to global approval policies.
                </p>
                <div className="mt-auto">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted">Max Coverage Amount:</span>
                    <strong style={{ color: '#28a745' }}>
                      {formatCurrency(approvalPath?.maxCoverageAmount || 0)}
                    </strong>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted">Number of Approvers:</span>
                    <strong>{approvalPath?.approvers?.length || 0}</strong>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Has Coverage Gap:</span>
                    {approvalPath?.hasGap ? (
                      <Badge color="warning">Yes</Badge>
                    ) : (
                      <Badge color="success">No</Badge>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Private Approval Path */}
        <Card style={{ border: '1px solid #e8e8e8' }}>
          <CardBody>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 style={{ color: '#333', marginBottom: '0', fontWeight: '600' }}>
                <Users size={16} className="me-2" />
                Private Approval Path
              </h6>
              <Button
                color="primary"
                size="sm"
                onClick={() => setShowAddApproverModal(true)}
              >
                <Plus size={14} className="me-1" />
                Add Approver
              </Button>
            </div>
            <p className="text-muted small mb-3">
              Define specific approvers for this user. Approvers will be used in order based on their approval limits.
              If the order/cart amount exceeds all private approver limits, global approval policies will be used.
            </p>

            {(!approvalPath?.approvers || approvalPath.approvers.length === 0) ? (
              <div className="text-center py-4" style={{ backgroundColor: '#f8f9fc', borderRadius: '8px' }}>
                <Users size={36} className="text-muted mb-2" />
                <p className="text-muted mb-0">No private approvers defined.</p>
                <p className="text-muted small">Global approval policies will be used.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead style={{ backgroundColor: '#f8f9fc' }}>
                    <tr>
                      <th style={{ width: '5%' }}>#</th>
                      <th style={{ width: '30%' }}>Approver</th>
                      <th style={{ width: '25%' }}>Email</th>
                      <th style={{ width: '15%' }}>Approval Limit</th>
                      <th style={{ width: '15%' }}>Order</th>
                      <th style={{ width: '10%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvalPath.approvers.map((approver, index) => (
                      <tr key={approver.approverUserId}>
                        <td>{approver.orderOfApproval || index + 1}</td>
                        <td>
                          <strong>
                            {approver.approverUser?.firstName || ''} {approver.approverUser?.lastName || ''}
                          </strong>
                          {approver.approverUser?.title && (
                            <small className="text-muted d-block">{approver.approverUser.title}</small>
                          )}
                        </td>
                        <td>{approver.approverUser?.email || '-'}</td>
                        <td>
                          {approver.approvalLimit ? (
                            <div className="d-flex align-items-center gap-2">
                              <span style={{ color: '#28a745', fontWeight: '500' }}>
                                {formatCurrency(approver.approvalLimit)}
                              </span>
                              <Button
                                color="link"
                                size="sm"
                                className="p-0"
                                onClick={() => openEditApproverLimitModal(approver)}
                                title="Edit Limit"
                              >
                                <Edit size={12} />
                              </Button>
                            </div>
                          ) : (
                            <div className="d-flex align-items-center gap-2">
                              <Badge color="warning">Not Set</Badge>
                              <Button
                                color="primary"
                                size="sm"
                                onClick={() => openEditApproverLimitModal(approver)}
                                title="Set Limit"
                              >
                                <DollarSign size={12} className="me-1" />
                                Set
                              </Button>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              color="light"
                              size="sm"
                              onClick={() => handleMoveApprover(approver.approverUserId, 'up')}
                              disabled={index === 0}
                              title="Move Up"
                            >
                              <ChevronUp size={14} />
                            </Button>
                            <Button
                              color="light"
                              size="sm"
                              onClick={() => handleMoveApprover(approver.approverUserId, 'down')}
                              disabled={index === approvalPath.approvers.length - 1}
                              title="Move Down"
                            >
                              <ChevronDown size={14} />
                            </Button>
                          </div>
                        </td>
                        <td>
                          <Button
                            color="danger"
                            size="sm"
                            outline
                            onClick={() => handleRemoveApprover(approver.approverUserId)}
                            title="Remove Approver"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  };

  // Render content based on active menu
  const renderContent = () => {
    switch (activeMenu) {
      case 'details':
        return renderUserDetails();
      case 'carts':
        return renderCarts();
      case 'orders':
        return renderPurchaseOrders();
      case 'rfqs':
        return renderRfqs();
      case 'approvals':
        return renderApprovals();
      case 'approval-settings':
        return renderApprovalSettings();
      default:
        return renderUserDetails();
    }
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
      />

      <Row>
        <Col md="12">
          {/* Header */}
          <div
            className="d-flex align-items-center justify-content-between mb-3 p-3"
            style={{
              background: 'linear-gradient(135deg, #f8f9fc 0%, #e9ecf1 100%)',
              borderRadius: '10px',
              border: '1px solid #e8ecef',
            }}
          >
            <div className="d-flex align-items-center">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    marginRight: '15px',
                    boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '15px',
                    boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                  }}
                >
                  <span style={{ color: 'white', fontSize: '18px', fontWeight: '600' }}>
                    {userData?.firstName?.charAt(0) || ''}{userData?.lastName?.charAt(0) || ''}
                  </span>
                </div>
              )}
              <div>
                <h4 className="mb-1">
                  {isLoadingUser ? 'Loading...' : `${userData?.title || ''} ${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'User Details'}
                </h4>
                <p className="text-muted mb-0 small">
                  {userData?.email || ''}
                  {userData?.role && userData.role.length > 0 && (
                    <span className="ms-2">
                      {userData.role.map((r, idx) => (
                        <Badge key={r.roleId} color="info" className="me-1" style={{ fontSize: '10px' }}>
                          {r.name}
                        </Badge>
                      ))}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="d-flex gap-2">
              <Button
                color="primary"
                size="sm"
                onClick={handleEdit}
                style={{ borderRadius: '8px' }}
              >
                <Edit size={14} className="me-1" />
                Edit User
              </Button>
              <Button
                color="secondary"
                outline
                size="sm"
                onClick={handleBack}
                style={{ borderRadius: '8px' }}
              >
                <ArrowLeft size={16} className="me-1" />
                Back
              </Button>
            </div>
          </div>

          <Row className="align-items-stretch">
            {/* Sidebar Menu */}
            <Col md="3" className="d-flex">
              <Card
                className="w-100"
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: 'none',
                }}
              >
                <CardBody style={{ padding: '16px' }}>
                  <Nav vertical pills>
                    {menuItems.map((item) => (
                      <NavItem key={item.key}>
                        <NavLink
                          className={activeMenu === item.key ? 'active' : ''}
                          onClick={() => setActiveMenu(item.key)}
                          style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            marginBottom: '4px',
                            color: activeMenu === item.key ? 'white' : '#495057',
                            backgroundColor:
                              activeMenu === item.key ? '#009efb' : 'transparent',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <span className="d-flex align-items-center">
                            <item.icon size={18} className="me-2" />
                            {item.label}
                          </span>
                          {item.count !== undefined && item.count > 0 && (
                            <Badge
                              pill
                              style={{
                                backgroundColor: activeMenu === item.key ? 'white' : '#009efb',
                                color: activeMenu === item.key ? '#009efb' : 'white',
                                fontWeight: '600',
                                fontSize: '11px',
                                padding: '4px 8px',
                              }}
                            >
                              {item.count}
                            </Badge>
                          )}
                        </NavLink>
                      </NavItem>
                    ))}
                  </Nav>
                </CardBody>
              </Card>
            </Col>

            {/* Main Content */}
            <Col md="9" className="d-flex">
              <Card
                className="w-100"
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: 'none',
                  minHeight: '500px',
                }}
              >
                <CardBody style={{ padding: '24px' }}>
                  {/* Content */}
                  {renderContent()}
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Reassign Modal */}
      <Modal isOpen={isReassignModalOpen} toggle={closeReassignModal} size="md">
        <ModalHeader toggle={closeReassignModal}>
          <Users size={20} className="me-2" />
          Reassign {reassignType === 'carts' ? 'Carts' : reassignType === 'rfqs' ? 'RFQs' : 'Purchase Orders'}
        </ModalHeader>
        <ModalBody>
          <div className="mb-3">
            <div
              className="p-3 mb-3"
              style={{
                backgroundColor: '#e8f4fd',
                borderRadius: '8px',
                border: '1px solid #b3d7f5',
              }}
            >
              <p className="mb-0">
                <strong>
                  {reassignType === 'carts'
                    ? selectedCarts.length
                    : reassignType === 'rfqs'
                      ? selectedRfqs.length
                      : selectedOrders.length}
                </strong>{' '}
                {reassignType === 'carts' ? 'cart(s)' : reassignType === 'rfqs' ? 'RFQ(s)' : 'order(s)'} will be reassigned to the selected user.
              </p>
            </div>

            <FormGroup>
              <Label for="targetUser">
                <strong>Select User</strong>
              </Label>
              {isLoadingUsers ? (
                <div className="text-center py-3">
                  <Spinner size="sm" color="primary" />
                  <span className="ms-2 text-muted">Loading users...</span>
                </div>
              ) : companyUsers.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-muted mb-0">No other users found in this company</p>
                </div>
              ) : (
                <Input
                  type="select"
                  id="targetUser"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                >
                  <option value="">-- Select a user --</option>
                  {companyUsers.map((user) => (
                    <option key={user.userId} value={user.userId}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))}
                </Input>
              )}
            </FormGroup>

            <div
              className="p-3 mt-3"
              style={{
                backgroundColor: '#fff8e6',
                borderRadius: '8px',
                border: '1px solid #ffd966',
              }}
            >
              <small className="text-muted">
                <strong>Note:</strong> The original creator will be preserved in the audit history. The new user will become the owner of these items.
              </small>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={closeReassignModal} disabled={isReassigning}>
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={handleReassign}
            disabled={!targetUserId || isReassigning}
          >
            {isReassigning ? (
              <>
                <Spinner size="sm" className="me-1" /> Reassigning...
              </>
            ) : (
              <>
                <RefreshCw size={14} className="me-1" /> Reassign
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add Approver Modal */}
      <Modal
        isOpen={showAddApproverModal}
        toggle={() => {
          setShowAddApproverModal(false);
          setApproverSearchTerm('');
          setSelectedApproverToAdd(null);
          setApproverSearchPage(0);
        }}
        size="md"
      >
        <ModalHeader toggle={() => {
          setShowAddApproverModal(false);
          setApproverSearchTerm('');
          setSelectedApproverToAdd(null);
          setApproverSearchPage(0);
        }}>
          <Plus size={20} className="me-2" />
          Add Approver
        </ModalHeader>
        <ModalBody>
          <div className="mb-3">
            <p className="text-muted mb-3">
              Search and select a user to add as an approver for {userData?.firstName} {userData?.lastName}.
              The approver will be added at the end of the approval chain.
            </p>

            <FormGroup>
              <Label for="approverSearch">
                <strong>Search Users</strong>
              </Label>
              <Input
                type="text"
                id="approverSearch"
                placeholder="Type to search by name or email..."
                value={approverSearchTerm}
                onChange={(e) => {
                  setApproverSearchTerm(e.target.value);
                  setApproverSearchPage(0);
                }}
                autoFocus
              />
            </FormGroup>

            <div
              style={{
                maxHeight: '250px',
                overflowY: 'auto',
                border: '1px solid #e8e8e8',
                borderRadius: '8px',
              }}
            >
              {isSearchingApprovers ? (
                <div className="text-center py-4">
                  <Spinner size="sm" className="me-2" />
                  Searching...
                </div>
              ) : approverSearchResults.length === 0 ? (
                <div className="text-center py-4" style={{ backgroundColor: '#f8f9fc' }}>
                  <p className="text-muted mb-0">No eligible approvers found.</p>
                  <small className="text-muted">Try a different search term.</small>
                </div>
              ) : (
                approverSearchResults.map((user) => (
                  <div
                    key={user.userId}
                    onClick={() => setSelectedApproverToAdd(user)}
                    style={{
                      padding: '12px 15px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f0f0f0',
                      backgroundColor: selectedApproverToAdd?.userId === user.userId ? '#e8f4fd' : 'transparent',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedApproverToAdd?.userId !== user.userId) {
                        e.currentTarget.style.backgroundColor = '#f8f9fc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedApproverToAdd?.userId !== user.userId) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div className="d-flex align-items-center">
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '12px',
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>
                          {user.firstName?.charAt(0) || ''}{user.lastName?.charAt(0) || ''}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', color: '#333' }}>
                          {user.firstName} {user.lastName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {user.email}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {user.hasApprovalLimit ? (
                          <Badge color="success" style={{ fontSize: '10px' }}>
                            Limit: {formatCurrency(user.approvalLimit)}
                          </Badge>
                        ) : (
                          <Badge color="warning" style={{ fontSize: '10px' }}>
                            No limit
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {approverSearchTotalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <Button
                  color="secondary"
                  size="sm"
                  outline
                  disabled={approverSearchPage === 0}
                  onClick={() => setApproverSearchPage(prev => Math.max(0, prev - 1))}
                >
                  Previous
                </Button>
                <span className="text-muted small">
                  Page {approverSearchPage + 1} of {approverSearchTotalPages}
                </span>
                <Button
                  color="secondary"
                  size="sm"
                  outline
                  disabled={approverSearchPage >= approverSearchTotalPages - 1}
                  onClick={() => setApproverSearchPage(prev => prev + 1)}
                >
                  Next
                </Button>
              </div>
            )}

            {selectedApproverToAdd && !selectedApproverToAdd.hasApprovalLimit && (
              <div
                className="p-3 mt-3"
                style={{
                  backgroundColor: '#fff3cd',
                  borderRadius: '8px',
                  border: '1px solid #ffc107',
                }}
              >
                <div className="d-flex align-items-start">
                  <AlertTriangle size={16} className="me-2 mt-1" style={{ color: '#856404' }} />
                  <small style={{ color: '#856404' }}>
                    <strong>Note:</strong> This user does not have an approval limit set.
                    Consider setting their approval limit for the approval path to work correctly.
                  </small>
                </div>
              </div>
            )}

            {selectedApproverToAdd && (
              <div
                className="p-3 mt-3"
                style={{
                  backgroundColor: '#d4edda',
                  borderRadius: '8px',
                  border: '1px solid #28a745',
                }}
              >
                <small style={{ color: '#155724' }}>
                  <strong>Selected:</strong> {selectedApproverToAdd.firstName} {selectedApproverToAdd.lastName} ({selectedApproverToAdd.email})
                </small>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="secondary"
            outline
            onClick={() => {
              setShowAddApproverModal(false);
              setSelectedApproverToAdd(null);
              setApproverSearchTerm('');
              setApproverSearchPage(0);
            }}
            disabled={isAddingApprover}
          >
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={handleAddApprover}
            disabled={!selectedApproverToAdd || isAddingApprover}
          >
            {isAddingApprover ? (
              <>
                <Spinner size="sm" className="me-1" /> Adding...
              </>
            ) : (
              <>
                <Plus size={14} className="me-1" /> Add Approver
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Approver Limit Modal */}
      <Modal isOpen={showEditApproverLimitModal} toggle={() => setShowEditApproverLimitModal(false)} size="md">
        <ModalHeader toggle={() => setShowEditApproverLimitModal(false)}>
          <DollarSign size={20} className="me-2" />
          {editingApprover?.approvalLimit ? 'Edit' : 'Set'} Approval Limit
        </ModalHeader>
        <ModalBody>
          <div className="mb-3">
            {editingApprover && (
              <div
                className="p-3 mb-3"
                style={{
                  backgroundColor: '#f8f9fc',
                  borderRadius: '8px',
                }}
              >
                <p className="mb-1">
                  <strong>Approver:</strong> {editingApprover.approverUser?.firstName} {editingApprover.approverUser?.lastName}
                </p>
                <p className="mb-0 text-muted small">{editingApprover.approverUser?.email}</p>
              </div>
            )}

            <FormGroup>
              <Label for="approverLimitInput">
                <strong>Approval Limit</strong>
              </Label>
              <InputGroup>
                <InputGroupText>{getCurrencySymbol(getCompanyCurrency())}</InputGroupText>
                <Input
                  type="number"
                  id="approverLimitInput"
                  placeholder="Enter approval limit"
                  value={editApproverLimit}
                  onChange={(e) => setEditApproverLimit(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </InputGroup>
              <small className="text-muted mt-1 d-block">
                This approver can approve orders up to this amount.
              </small>
            </FormGroup>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="secondary"
            outline
            onClick={() => {
              setShowEditApproverLimitModal(false);
              setEditingApprover(null);
              setEditApproverLimit('');
            }}
            disabled={isUpdatingApproverLimit}
          >
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={handleUpdateApproverLimit}
            disabled={!editApproverLimit || isUpdatingApproverLimit}
          >
            {isUpdatingApproverLimit ? (
              <>
                <Spinner size="sm" className="me-1" /> Saving...
              </>
            ) : (
              <>
                <DollarSign size={14} className="me-1" /> Save Limit
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>

      <style>{`
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
        }

        .info-label {
          font-size: 12px;
          color: #888;
          margin-bottom: 4px;
        }

        .info-value {
          font-size: 14px;
          color: #333;
          font-weight: 500;
        }

        .nav-link.active {
          background-color: #009efb !important;
          color: white !important;
        }

        .nav-link:hover:not(.active) {
          background-color: #f8f9fc;
        }

        .nav-tabs .nav-link.active {
          background-color: white !important;
          color: #009efb !important;
          border-color: #dee2e6 #dee2e6 #fff;
        }

        .nav-tabs .nav-link {
          color: #495057;
        }

        @media (max-width: 768px) {
          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default UserDetails;
