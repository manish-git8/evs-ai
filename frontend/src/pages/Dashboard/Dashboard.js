import { useState, useEffect, useMemo, useRef } from 'react';
import { Row, Col, CardBody, Card, Button } from 'reactstrap';
import {
  Chart,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
} from 'chart.js';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { TfiAnnouncement } from 'react-icons/tfi';
import { Edit, Eye, Trash } from 'react-feather';
import { FaSort, FaRegCommentAlt } from 'react-icons/fa';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import 'chart.js/auto';
import * as bootstrap from 'bootstrap';
import ProgressCards from '../../components/dashboard/modernDashboard/ProgressCards';
import CartService from '../../services/CartService';
import RqfService from '../../services/RfqService';
import AnnouncementService from '../../services/AnnouncementService';
import PurchaseOrderService from '../../services/PurchaseOrderService';
import QueryModal from '../QueryModal/QueryModal';
import ApprovalPolicyManagementService from '../../services/ApprovalPolicyManagementService';
import useTooltipManager from '../../utils/useTooltipManager';
import ChatBot from '../../components/ChatBot/ChatBot';
import {
  formatDate,
  getEntityId,
  getUserName,
  getUserId,
  pageSize,
  parseQueries,
  getUserRole,
} from '../localStorageUtil';

Chart.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
);

const Classic = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const userId = getUserId();
  const [announcements, setAnnouncements] = useState([]);
  const [cartData, setCartData] = useState([]);
  const companyId = getEntityId();

  const formatStatusWithIcon = (status) => {
    const statusConfig = {
      APPROVED: {
        icon: 'bi bi-check-circle-fill',
        text: 'Approved',
        class: 'bg-success text-white',
      },
      REJECTED: {
        icon: 'bi bi-x-circle-fill',
        text: 'Rejected',
        class: 'bg-danger text-white',
      },
      PENDING: {
        icon: 'bi bi-clock-fill',
        text: 'Pending Review',
        class: 'bg-warning text-dark',
      },
      PENDING_APPROVAL: {
        icon: 'bi bi-hourglass-split',
        text: 'Pending Approval',
        class: 'bg-warning text-dark',
      },
      CONFIRMED: {
        icon: 'bi bi-check-circle-fill',
        text: 'Confirmed',
        class: 'bg-success text-white',
      },
      PARTIALLY_CONFIRMED: {
        icon: 'bi bi-exclamation-triangle-fill',
        text: 'Partially Confirmed',
        class: 'bg-secondary text-white',
      },
      SUBMITTED: {
        icon: 'bi bi-send-fill',
        text: 'Submitted',
        class: 'bg-primary text-white',
      },
      DRAFT: {
        icon: 'bi bi-file-earmark-text',
        text: 'Draft',
        class: 'bg-light text-dark border',
      },
      CREATED: {
        icon: 'bi bi-plus-circle-fill',
        text: 'Draft',
        class: 'bg-warning text-dark',
      },
      SUPPLIER_SHORTLISTED: {
        icon: 'bi bi-people-fill',
        text: 'Supplier Shortlisted',
        class: 'bg-info text-white',
      },
      COMPLETED: {
        icon: 'bi bi-check-circle-fill',
        text: 'Completed',
        class: 'bg-success text-white',
      },
      CANCELLED: {
        icon: 'bi bi-x-circle-fill',
        text: 'Cancelled',
        class: 'bg-danger text-white',
      },
      CLOSED: {
        icon: 'bi bi-lock-fill',
        text: 'Closed',
        class: 'bg-danger text-white',
      },
      POGENERATED: {
        icon: 'bi bi-file-earmark-check-fill',
        text: 'PO Generated',
        class: 'bg-success text-white',
      },
      SHIPPED: {
        icon: 'bi bi-truck',
        text: 'Shipped',
        class: 'bg-info text-white',
      },
      DELIVERED: {
        icon: 'bi bi-box-seam',
        text: 'Delivered',
        class: 'bg-success text-white',
      },
      RETURNED: {
        icon: 'bi bi-arrow-return-left',
        text: 'Returned',
        class: 'bg-warning text-dark',
      },
    };

    const config = statusConfig[status && status.toUpperCase()] || {
      icon: 'bi bi-question-circle',
      text: status || 'Unknown',
      class: 'bg-secondary text-white',
    };

    return (
      <span
        className={`badge ${config.class}`}
        style={{
          fontSize: '11px',
          padding: '6px 10px',
          borderRadius: '6px',
          fontWeight: '500',
        }}
      >
        {config.text}
      </span>
    );
  };

  const [approvalCart, setApprovalCart] = useState([]);
  const [cartSearchTerm, setCartSearchTerm] = useState('');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');

  // Server-side pagination state for Approved Carts
  const [approvalCartCurrentPage, setApprovalCartCurrentPage] = useState(0);
  const [approvalCartTotalElements, setApprovalCartTotalElements] = useState(0);
  const [approvalCartTotalPages, setApprovalCartTotalPages] = useState(0);
  const [approvalCartLoading, setApprovalCartLoading] = useState(false);
  const approvalCartPageSize = 10;

  const [approvedPOs, setApprovedPOs] = useState([]);

  // Initialize tab states from URL params for persistence across navigation
  const [activeTab2, setActiveTab2] = useState(() => {
    const tab = searchParams.get('tab2');
    return ['approvedRequisitions', 'awardedQuotes', 'completedOrders'].includes(tab) ? tab : 'approvedRequisitions';
  });
  const [activeMainTab, setActiveMainTab] = useState(() => {
    const tab = searchParams.get('mainTab');
    return ['carts', 'purchaseOrders', 'rfqs'].includes(tab) ? tab : 'carts';
  });
  const [activeDashboardSection, setActiveDashboardSection] = useState(() => {
    const section = searchParams.get('section');
    // 'pending' is no longer valid - redirect to 'procurement'
    if (section === 'pending') return 'procurement';
    return ['procurement', 'completed'].includes(section) ? section : 'procurement';
  });

  // Update URL params when tabs/pages change (without adding to history)
  const updateUrlParam = (param, value) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set(param, value);
    setSearchParams(newParams, { replace: true });
  };

  // Change section and reset URL to only include relevant params
  const changeSectionWithCleanUrl = (section) => {
    const newParams = new URLSearchParams();
    newParams.set('section', section);
    // Set default sub-tab for the section
    if (section === 'completed') {
      newParams.set('tab2', 'approvedRequisitions');
    } else if (section === 'procurement') {
      newParams.set('mainTab', 'carts');
    }
    setSearchParams(newParams, { replace: true });
  };

  // Change sub-tab and clear page params (keep section)
  const changeSubTabWithCleanUrl = (tabParam, tabValue) => {
    const newParams = new URLSearchParams();
    newParams.set('section', activeDashboardSection);
    newParams.set(tabParam, tabValue);
    setSearchParams(newParams, { replace: true });
  };

  // Alias for backward compatibility
  const updateTabInUrl = updateUrlParam;

  // Helper to get page number from URL params
  const getPageFromUrl = (paramName) => {
    const page = parseInt(searchParams.get(paramName), 10);
    return isNaN(page) || page < 0 ? 0 : page;
  };

  // Refs to track initial load for page restoration
  const isInitialCartsLoad = useRef(true);
  const isInitialRfqLoad = useRef(true);
  const isInitialPoLoad = useRef(true);
  const [purchaseOrdersRaise, setPurchaseOrdersRaise] = useState([]);
  const [purchaseOrdersCurrentPage, setPurchaseOrdersCurrentPage] = useState(0);
  const [purchaseOrdersTotalElements, setPurchaseOrdersTotalElements] = useState(0);
  const [purchaseOrdersLoading, setPurchaseOrdersLoading] = useState(false);
  const purchaseOrdersPageSize = 10;
  const [cartsCurrentPage, setCartsCurrentPage] = useState(0);
  const [cartsTotalElements, setCartsTotalElements] = useState(0);
  const [cartsLoading, setCartsLoading] = useState(false);
  const cartsPageSize = 10;
  const approverId = getUserId();
  const [cartItems, setCartItems] = useState([]);
  const [previousQueries, setPreviousQueries] = useState([]);
  const [queryModalOpen, setQueryModalOpen] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [selectedCartId, setSelectedCartId] = useState(null);
  const [uploadedFileId, setUploadedFileId] = useState(null);
  const { handleTooltip } = useTooltipManager();
  const userName = getUserName();
  const [finalizedRfq, setFinalizedRfq] = useState([]);
  const [showAnnouncements, setShowAnnouncements] = useState(false);

  // Server-side pagination state for Completed RFQ Approvals
  const [completedRfqCurrentPage, setCompletedRfqCurrentPage] = useState(0);
  const [completedRfqTotalElements, setCompletedRfqTotalElements] = useState(0);
  const [completedRfqTotalPages, setCompletedRfqTotalPages] = useState(0);
  const [completedRfqLoading, setCompletedRfqLoading] = useState(false);
  const completedRfqPageSize = 10;

  // Server-side pagination state for Completed PO Approvals
  const [completedPOCurrentPage, setCompletedPOCurrentPage] = useState(0);
  const [completedPOTotalElements, setCompletedPOTotalElements] = useState(0);
  const [completedPOTotalPages, setCompletedPOTotalPages] = useState(0);
  const [completedPOLoading, setCompletedPOLoading] = useState(false);
  const completedPOPageSize = 10;
  const [unreadCount, setUnreadCount] = useState(0);
  const [viewedAnnouncementIds, setViewedAnnouncementIds] = useState([]);
  const role = getUserRole();
  const [rfqData, setRfqData] = useState([]);
  const [rfqCurrentPage, setRfqCurrentPage] = useState(0);
  const [rfqTotalElements, setRfqTotalElements] = useState(0);
  const [rfqLoading, setRfqLoading] = useState(false);
  const rfqPageSize = 10;
  const [rfqSearchTerm, setRfqSearchTerm] = useState('');
  const [cartSortBy, setCartSortBy] = useState('createdDate');
  const [cartSortOrder, setCartSortOrder] = useState('desc');
  const [completedSortBy, setCompletedSortBy] = useState('orderPlacedDate');
  const [completedSortOrder, setCompletedSortOrder] = useState('desc');
  const [approvedReqSortBy, setApprovedReqSortBy] = useState('createdDate');
  const [approvedReqSortOrder, setApprovedReqSortOrder] = useState('desc');
  // Roles that should not see Procurement Management section (but can see progress cards and processed items)
  const hideProcurementFor = ['RECEIVER', 'ACCOUNT_PAYABLE'];
  const shouldHideProcurement = Array.isArray(role) && role.every((r) => hideProcurementFor.includes(r));

  // Redirect account payable users to 'completed' section if they land on 'procurement'
  useEffect(() => {
    if (shouldHideProcurement && activeDashboardSection === 'procurement') {
      setActiveDashboardSection('completed');
      changeSectionWithCleanUrl('completed');
    }
  }, [shouldHideProcurement]);

  const [poSortBy, setPoSortBy] = useState('orderPlacedDate');
  const [poSortOrder, setPoSortOrder] = useState('desc');
  const [rfqSortBy, setRfqSortBy] = useState('createdDate');
  const [rfqSortOrder, setRfqSortOrder] = useState('desc');

  const handleRfqSort = (field) => {
    if (rfqSortBy === field) {
      setRfqSortOrder(rfqSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setRfqSortBy(field);
      setRfqSortOrder('asc');
    }
  };

  const renderRfqSortIcon = (field) => {
    if (rfqSortBy === field) {
      return rfqSortOrder === 'asc' ? <FaSort /> : <FaSort />;
    }
    return <FaSort />;
  };
  const handlePoSort = (field) => {
    if (poSortBy === field) {
      setPoSortOrder(poSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setPoSortBy(field);
      setPoSortOrder('asc');
    }
  };

  const renderPoSortIcon = (field) => {
    if (poSortBy === field) {
      return poSortOrder === 'asc' ? <FaSort /> : <FaSort />;
    }
    return <FaSort />;
  };

  useEffect(() => {
    const storedViewedIds = localStorage.getItem(`viewedAnnouncements_${userId}`);
    if (storedViewedIds) {
      setViewedAnnouncementIds(JSON.parse(storedViewedIds));
    }
  }, [userId]);

  useEffect(() => {
    if (announcements.length > 0) {
      const unviewedCount = announcements.filter(
        (announcement) => !viewedAnnouncementIds.includes(announcement.announcementId),
      ).length;
      setUnreadCount(unviewedCount);
    }
  }, [announcements, viewedAnnouncementIds]);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.activeMainTab) {
      setActiveMainTab(location.state.activeMainTab);
      changeSubTabWithCleanUrl('mainTab', location.state.activeMainTab);
    }
  }, [location.state]);

  const handleFileUploadSuccess = (fileId) => {
    setUploadedFileId(fileId);
  };

  const fetchPaginatedRfqs = async (pageNumber = 0, searchTerm = '') => {
    try {
      setRfqLoading(true);
      let response;
      if (searchTerm.trim() === '') {
        response = await RqfService.getRfq(companyId, {
          pageSize: rfqPageSize,
          pageNumber,
          sortBy: rfqSortBy,
          order: rfqSortOrder,
        });
      } else {
        response = await RqfService.getRfqBySupplierSearch(companyId, searchTerm, {
          pageSize: rfqPageSize,
          pageNumber,
          sortBy: rfqSortBy,
          order: rfqSortOrder,
        });
      }
      const rfqList = response.data?.content || response.data || [];
      const totalCount = response.data?.totalElements || rfqList.length;

      setRfqData(rfqList);
      setRfqTotalElements(totalCount);
      setRfqCurrentPage(pageNumber);
    } catch (error) {
      console.error('Error fetching RFQs:', error);
      setRfqData([]);
      setRfqTotalElements(0);
    } finally {
      setRfqLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Use URL page only on initial load, reset to 0 on search/sort changes
      const pageToUse = isInitialRfqLoad.current ? getPageFromUrl('rfqPage') : 0;
      isInitialRfqLoad.current = false;
      setRfqCurrentPage(pageToUse);
      fetchPaginatedRfqs(pageToUse, rfqSearchTerm);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [rfqSearchTerm, rfqSortBy, rfqSortOrder]);


  const handleCreateCartWithConfirmation = () => {
    Swal.fire({
      title: 'Create New Cart?',
      text: 'Do you really want to create a new procurement cart?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Create Cart',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#009efb',
      cancelButtonColor: '#6c757d',
    }).then((result) => {
      if (result.isConfirmed) {
        handleDirectCreateCart();
      }
    });
  };


  const rfqOptions = {
    hideSizePerPage: true,
    paginationPosition: 'bottom',
    page: rfqCurrentPage + 1,
    sizePerPage: rfqPageSize,
    totalSize: rfqTotalElements,
    onPageChange: (page) => {
      const pageIndex = page - 1;
      setRfqCurrentPage(pageIndex);
      fetchPaginatedRfqs(pageIndex, rfqSearchTerm);
      updateUrlParam('rfqPage', pageIndex);
    },
    onRowClick: (row) => {
      navigate(`/rfqDetails/${row.rfqId}`);
    },
    trStyle: {
      cursor: 'pointer',
    },
    paginationShowsTotal: (start, to, total) => (
      <span style={{ fontSize: '12px', color: '#6c757d' }}>
        Showing {start} to {to} of {total} RFQs
      </span>
    ),
  };

  const handleNavigate = (cartId, shipToAddressId, cartStatusType) => {
    const submitted = cartStatusType === 'SUBMITTED';
    const addressPart = shipToAddressId ? `/${shipToAddressId}` : '';
    navigate(
      `/cartDetails/${cartId}${addressPart}?submitted=${submitted}&cartStatusType=${cartStatusType}`,
    );
  };

  const formatUserFullNameWithEmail = (user) => {
    if (!user) return '--';
    const firstName = user.firstName && user.firstName.trim();
    const lastName = user.lastName && user.lastName.trim();
    const email = user.email && user.email.trim();
    const hasName = firstName || lastName;
    const hasEmail = !!email;

    if (!hasName && !hasEmail) {
      return '--';
    }

    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    return hasEmail ? `${fullName} (${email})`.trim() : fullName || '--';
  };

  const handleCartSort = (field) => {
    if (cartSortBy === field) {
      setCartSortOrder(cartSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setCartSortBy(field);
      setCartSortOrder('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (cartSortBy === field) {
      return cartSortOrder === 'asc' ? <FaSort /> : <FaSort />;
    }
    return <FaSort />;
  };

  const getValueByField = (item, field) => {
    if (!item) return '';
    if (!field) return item;
    const parts = field.split('.');
    let val = item;
    for (let p of parts) {
      if (val == null) break;
      val = val[p];
    }
    if (Array.isArray(val)) return val.length;
    if (val && typeof val === 'object') {
      if (val.firstName || val.lastName)
        return `${val.firstName || ''} ${val.lastName || ''}`.trim();
      if (val.displayName) return val.displayName;
      return JSON.stringify(val);
    }
    const maybeDate = Date.parse(val);
    if (!Number.isNaN(maybeDate)) return maybeDate;
    if (!Number.isNaN(Number(val))) return Number(val);
    return (val || '').toString().toLowerCase();
  };

  const sortData = (arr, field, order = 'asc') => {
    if (!Array.isArray(arr)) return arr;
    const copy = [...arr];
    copy.sort((a, b) => {
      const va = getValueByField(a, field);
      const vb = getValueByField(b, field);

      if (va === vb) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;

      if (typeof va === 'number' && typeof vb === 'number') {
        return order === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va);
      const sb = String(vb);
      return order === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return copy;
  };

  const handleCompletedSort = (field) => {
    if (completedSortBy === field) {
      setCompletedSortOrder(completedSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setCompletedSortBy(field);
      setCompletedSortOrder('asc');
    }
  };

  const renderCompletedSortIcon = (field) => {
    if (completedSortBy === field) return completedSortOrder === 'asc' ? <FaSort /> : <FaSort />;
    return <FaSort />;
  };

  const handleApprovedReqSort = (field) => {
    if (approvedReqSortBy === field) {
      setApprovedReqSortOrder(approvedReqSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setApprovedReqSortBy(field);
      setApprovedReqSortOrder('asc');
    }
  };

  const renderApprovedReqSortIcon = (field) => {
    if (approvedReqSortBy === field)
      return approvedReqSortOrder === 'asc' ? <FaSort /> : <FaSort />;
    return <FaSort />;
  };

  const sortedApprovedPOs = useMemo(
    () => sortData(approvedPOs || [], completedSortBy, completedSortOrder),
    [approvedPOs, completedSortBy, completedSortOrder],
  );
  const sortedApprovalCart = useMemo(
    () => sortData(approvalCart || [], approvedReqSortBy, approvedReqSortOrder),
    [approvalCart, approvedReqSortBy, approvedReqSortOrder],
  );

  const fetchCarts = async (pageNumber = 0) => {
    try {
      setCartsLoading(true);
      const response = await CartService.getCartsPaginated(
        companyId,
        cartsPageSize,
        pageNumber,
        cartSearchTerm,
        '',
        '',
        '',
        cartSortBy,
        cartSortOrder,
      );

      const carts = response.data?.content || [];
      setCartsTotalElements(response.data?.totalElements || 0);

      const fetchUserCarts = carts.map((cart) => ({
        ...cart,
        lineItemCount: cart.lineItemCount || 0,
        createdByName: formatUserFullNameWithEmail(cart && cart.createdBy) || '--',
      }));

      setCartData(fetchUserCarts);
      setCartsCurrentPage(pageNumber);
    } catch (error) {
      console.error('There was an error fetching the cart data!', error);
      setCartData([]);
    } finally {
      setCartsLoading(false);
    }
  };

  const cartOptions = {
    hideSizePerPage: true,
    paginationPosition: 'bottom',
    page: cartsCurrentPage + 1,
    sizePerPage: cartsPageSize,
    totalSize: cartsTotalElements,
    onPageChange: (page) => {
      const pageIndex = page - 1;
      setCartsCurrentPage(pageIndex);
      fetchCarts(pageIndex);
      updateUrlParam('cartsPage', pageIndex);
    },
    onRowClick: (row) => {
      handleNavigate(row.cartId, row.shipToAddressId, row.cartStatusType);
    },
    trStyle: {
      cursor: 'pointer',
    },
    paginationShowsTotal: (start, to, total) => (
      <span style={{ fontSize: '12px', color: '#6c757d' }}>
        Showing {start} to {to} of {total} carts
      </span>
    ),
  };

  useEffect(() => {
    if (!companyId) return;

    const timeoutId = setTimeout(() => {
      // Use URL page only on initial load, reset to 0 on search/sort changes
      const pageToUse = isInitialCartsLoad.current ? getPageFromUrl('cartsPage') : 0;
      isInitialCartsLoad.current = false;
      setCartsCurrentPage(pageToUse);
      fetchCarts(pageToUse);
    }, cartSearchTerm ? 500 : 0); // Debounce only for search

    return () => clearTimeout(timeoutId);
  }, [companyId, cartSearchTerm, cartSortBy, cartSortOrder]);

  const POAwaitingOption = {
    sizePerPage: 10,
    hideSizePerPage: true,
    hidePageListOnlyOnePage: true,
  };

  // Pagination options for Approved Cart Approvals
  const approvalCartOptions = {
    hideSizePerPage: true,
    paginationPosition: 'bottom',
    page: approvalCartCurrentPage + 1,
    sizePerPage: approvalCartPageSize,
    totalSize: approvalCartTotalElements,
    onPageChange: (page) => {
      handleApprovalCartPageChange(page - 1);
    },
    paginationShowsTotal: (start, to, total) => (
      <span style={{ fontSize: '12px', color: '#6c757d' }}>
        Showing {start} to {to} of {total} items
      </span>
    ),
    onRowClick: (row) => handleNavigateCartApprovalDetails(row.cartId),
  };

  // Pagination options for Completed RFQ Approvals
  const completedRfqOptions = {
    hideSizePerPage: true,
    paginationPosition: 'bottom',
    page: completedRfqCurrentPage + 1,
    sizePerPage: completedRfqPageSize,
    totalSize: completedRfqTotalElements,
    onPageChange: (page) => {
      handleCompletedRfqPageChange(page - 1);
    },
    paginationShowsTotal: (start, to, total) => (
      <span style={{ fontSize: '12px', color: '#6c757d' }}>
        Showing {start} to {to} of {total} items
      </span>
    ),
    onRowClick: (row) => navigate(`/RfqApprovalDetails/${row.rfqId}`, { state: { fromDashboard: true } }),
  };

  // Pagination options for Completed PO Approvals
  const completedPOOptions = {
    hideSizePerPage: true,
    paginationPosition: 'bottom',
    page: completedPOCurrentPage + 1,
    sizePerPage: completedPOPageSize,
    totalSize: completedPOTotalElements,
    onPageChange: (page) => {
      handleCompletedPOPageChange(page - 1);
    },
    paginationShowsTotal: (start, to, total) => (
      <span style={{ fontSize: '12px', color: '#6c757d' }}>
        Showing {start} to {to} of {total} items
      </span>
    ),
    onRowClick: (row) => viewOrderDetails(row.purchaseOrderId, true),
  };

  const fetchPaginatedPurchaseOrders = async (pageNumber = 0, searchTerm = '') => {
    try {
      setPurchaseOrdersLoading(true);
      const response = await PurchaseOrderService.getPurchaseOrdersPaginated(companyId, {
        pageSize: purchaseOrdersPageSize,
        pageNumber,
        searchTerm,
        sortBy: poSortBy,
        order: poSortOrder,
      });
      if (response.data && response.data.content) {
        setPurchaseOrdersRaise(response.data.content);
        setPurchaseOrdersCurrentPage(response.data.pageNumber || 0);
        setPurchaseOrdersTotalElements(response.data.totalElements || 0);
      } else {
        setPurchaseOrdersRaise(response.data || []);
        setPurchaseOrdersCurrentPage(0);
        setPurchaseOrdersTotalElements(response.data ? response.data.length : 0);
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      setPurchaseOrdersRaise([]);
      setPurchaseOrdersCurrentPage(0);
      setPurchaseOrdersTotalElements(0);
    } finally {
      setPurchaseOrdersLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Use URL page only on initial load, reset to 0 on search/sort changes
      const pageToUse = isInitialPoLoad.current ? getPageFromUrl('poPage') : 0;
      isInitialPoLoad.current = false;
      setPurchaseOrdersCurrentPage(pageToUse);
      fetchPaginatedPurchaseOrders(pageToUse, orderSearchTerm);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [orderSearchTerm, poSortBy, poSortOrder]);

  useEffect(() => {
    // Initial load uses URL page (handled by the first useEffect)
    // This is just a fallback for companyId changes
    if (!isInitialPoLoad.current) {
      fetchPaginatedPurchaseOrders(0, orderSearchTerm);
    }
  }, [companyId]);

  const viewOrderDetails = (PurchaseOrderId, fromAwaitingApproval = false) => {
    navigate(`/purchase-order-detail/${PurchaseOrderId}`, {
      state: { fromAwaitingApproval },
    });
  };
  const poOptions = {
    hideSizePerPage: true,
    paginationPosition: 'bottom',
    page: purchaseOrdersCurrentPage + 1,
    sizePerPage: purchaseOrdersPageSize,
    totalSize: purchaseOrdersTotalElements,
    onPageChange: (page) => {
      const pageIndex = page - 1;
      setPurchaseOrdersCurrentPage(pageIndex);
      fetchPaginatedPurchaseOrders(pageIndex, orderSearchTerm);
      updateUrlParam('poPage', pageIndex);
    },
    onRowClick: (row) => {
      viewOrderDetails(row.PurchaseOrderId, false);
    },
    trStyle: {
      cursor: 'pointer',
    },
    paginationShowsTotal: (start, to, total) => (
      <span style={{ fontSize: '12px', color: '#6c757d' }}>
        Showing {start} to {to} of {total} purchase orders
      </span>
    ),
  };

  // Fetch Completed RFQ approvals with server-side pagination
  const fetchCompletedRfqApprovals = async (page = 0) => {
    try {
      setCompletedRfqLoading(true);
      const response = await RqfService.getRfqApprovalsPaginated(
        companyId,
        userId,
        'approved',
        completedRfqPageSize,
        page,
      );
      const data = response.data || {};
      setFinalizedRfq(data.content || []);
      setCompletedRfqTotalElements(data.totalElements || 0);
      setCompletedRfqTotalPages(data.totalPages || 0);
      setCompletedRfqCurrentPage(page);
    } catch (error) {
      console.error('Error fetching completed RFQ approvals:', error);
    } finally {
      setCompletedRfqLoading(false);
    }
  };

  // Handle pagination for completed RFQs
  const handleCompletedRfqPageChange = (newPage) => {
    fetchCompletedRfqApprovals(newPage);
    updateUrlParam('completedRfqPage', newPage);
  };

  useEffect(() => {
    if (companyId && userId) {
      fetchCompletedRfqApprovals(getPageFromUrl('completedRfqPage'));
    }
  }, [companyId, userId]);

  // Format PO order data
  const formatPOOrder = (order) => {
    return {
      purchaseOrderId: order.purchaseOrderId || order.PurchaseOrderId,
      approvalDecision: order.approvalDecision,
      orderOfApproval: order.orderOfApproval,
      previousApprovalDecision: order.previousApprovalDecision,
      cartName: order?.cart?.cartName,
      createdByName: formatUserFullNameWithEmail(order?.buyerUser),
      orderNo: order.orderNo || order.purchaseOrderNumber || order.purchaseOrderNo,
      supplierName: order?.supplier?.displayName || order?.supplier?.name || order?.supplierName || '-',
      totalAmount: order?.orderTotal || order?.orderAmount || 0,
      orderPlacedDate: order?.orderPlacedDate || order?.purchaseOrderCreatedDate,
    };
  };

  // Fetch Completed PO approvals with server-side pagination
  const fetchCompletedPOApprovals = async (page = 0) => {
    try {
      setCompletedPOLoading(true);
      const response = await PurchaseOrderService.getPOApprovalsPaginated(
        companyId,
        userId,
        'completed',
        completedPOPageSize,
        page,
      );
      const data = response.data || {};
      const completedOrders = (data.content || []).map(formatPOOrder);
      setApprovedPOs(completedOrders);
      setCompletedPOTotalElements(data.totalElements || 0);
      setCompletedPOTotalPages(data.totalPages || 0);
      setCompletedPOCurrentPage(page);
    } catch (error) {
      console.error('Error fetching completed PO approvals:', error);
    } finally {
      setCompletedPOLoading(false);
    }
  };

  // Handle pagination for completed POs
  const handleCompletedPOPageChange = (newPage) => {
    fetchCompletedPOApprovals(newPage);
    updateUrlParam('completedPOPage', newPage);
  };

  useEffect(() => {
    if (companyId && userId) {
      fetchCompletedPOApprovals(getPageFromUrl('completedPOPage'));
    }
  }, [companyId, userId]);

  // Fetch Approved/Completed Cart approvals with server-side pagination
  const fetchApprovedCartApprovals = async (page = 0) => {
    try {
      setApprovalCartLoading(true);
      const response = await CartService.getCartApprovalsPaginated(
        companyId,
        userId,
        'completed',
        approvalCartPageSize,
        page,
      );
      const data = response.data || {};
      setApprovalCart(data.content || []);
      setApprovalCartTotalElements(data.totalElements || 0);
      setApprovalCartTotalPages(data.totalPages || 0);
      setApprovalCartCurrentPage(page);
    } catch (error) {
      console.error('Error fetching approved cart approvals:', error);
    } finally {
      setApprovalCartLoading(false);
    }
  };

  // Handle pagination for approved carts
  const handleApprovalCartPageChange = (newPage) => {
    fetchApprovedCartApprovals(newPage);
    updateUrlParam('approvalCartPage', newPage);
  };

  useEffect(() => {
    if (companyId && userId) {
      fetchApprovedCartApprovals(getPageFromUrl('approvalCartPage'));
    }
  }, [companyId, userId]);

  const fetchAnnouncements = () => {
    const currentDate = new Date().toISOString();
    AnnouncementService.getAllAnnouncementsWithDate(companyId, currentDate)
      .then((response) => {
        setAnnouncements(response.data);
        setUnreadCount(response.data.length);
      })
      .catch((error) => {
        console.error('Error fetching announcements:', error);
      });
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // ── Real-time sync: Listen for chatbot actions to auto-refresh ──
  useEffect(() => {
    const handleChatbotUpdate = () => {
      // Re-fetch all relevant dashboard data after a chatbot action
      if (companyId) {
        fetchCarts(cartsCurrentPage);
        fetchPaginatedPurchaseOrders(purchaseOrdersCurrentPage, orderSearchTerm);
        fetchPaginatedRfqs(rfqCurrentPage, rfqSearchTerm);
      }
      if (companyId && userId) {
        fetchApprovedCartApprovals(approvalCartCurrentPage);
        fetchCompletedPOApprovals(completedPOCurrentPage);
        fetchCompletedRfqApprovals(completedRfqCurrentPage);
      }
    };
    window.addEventListener('evs-cart-update', handleChatbotUpdate);
    return () => window.removeEventListener('evs-cart-update', handleChatbotUpdate);
  }, [companyId, userId, cartsCurrentPage, purchaseOrdersCurrentPage, rfqCurrentPage,
    orderSearchTerm, rfqSearchTerm, approvalCartCurrentPage,
    completedPOCurrentPage, completedRfqCurrentPage]);

  const handleToggleAnnouncements = () => {
    const newShowState = !showAnnouncements;
    setShowAnnouncements(newShowState);
    if (newShowState && announcements.length > 0) {
      const allAnnouncementIds = announcements.map((a) => a.announcementId);
      setViewedAnnouncementIds(allAnnouncementIds);
      localStorage.setItem(`viewedAnnouncements_${userId}`, JSON.stringify(allAnnouncementIds));
      setUnreadCount(0);
    }
  };

  const handleDirectCreateCart = async () => {
    try {
      toast.dismiss();
      const approvalRes = await ApprovalPolicyManagementService.getApprovalPolicyStatus(companyId);
      const { cart, purchaseOrder } = approvalRes.data;

      if (!cart || !purchaseOrder) {
        const msg = !cart
          ? 'Cart approval policy is not active, unable to create cart.'
          : 'Purchase order approval policy is not active, unable to create cart.';
        toast.error(msg);
        return;
      }

      const requestBody = { companyId };
      const response = await CartService.handleCartCompany(requestBody, companyId);

      const newCart = response.data;
      toast.success('Cart created successfully!');
      window.dispatchEvent(new Event('cartAdded'));
      setCartItems([...cartItems, newCart]);
      setTimeout(() => {
        navigate(`/cartDetails/${newCart.cartId}`);
      }, 1000);
    } catch (error) {
      console.error('Error creating cart:', error);
      if (error.response?.data?.errorMessage) {
        toast.error(error.response.data.errorMessage);
      } else {
        console.error('Failed to create cart');
      }
    }
  };

  const fetchCartQueries = async (cartId) => {
    try {
      const response = await CartService.getCartQueries(companyId, cartId);
      const responsecartbyId = response.data;
      if (responsecartbyId.queries) {
        const parsedQueries = parseQueries(responsecartbyId.queries);
        setPreviousQueries(parsedQueries);
      } else {
        setPreviousQueries([]);
      }
    } catch (error) {
      console.error('Error fetching cart details:', error);
      toast.dismiss();
      toast.error('Failed to load cart details');
    }
  };

  const openQueryModal = async (cartId) => {
    setSelectedCartId(cartId);
    await fetchCartQueries(cartId);
    setQueryModalOpen(true);
  };

  const closeQueryModal = () => {
    setQueryModalOpen(false);
    setQueryInput('');
  };

  const rfqTableOptions = {
    sizePerPage: 10,
    hideSizePerPage: true,
    hidePageListOnlyOnePage: true,
  };

  const handleSubmitQuery = async () => {
    if (!queryInput.trim()) {
      toast.dismiss();
      toast.error('Please enter a query before submitting');
      return;
    }

    try {
      const formattedQuery = `${queryInput} ${uploadedFileId ? `[FileId: ${uploadedFileId}]` : ''}`;
      const user = {
        userId: approverId,
        firstName: userName,
      };

      const requestBody = {
        isQueryRaised: true,
        user,
        queries: formattedQuery,
      };

      const response = await ApprovalPolicyManagementService.handleUpdateQuery(
        requestBody,
        companyId,
        selectedCartId,
      );

      if (response.status === 200) {
        toast.dismiss();
        toast.success('Query submitted successfully!');
        await fetchCartQueries(selectedCartId);
        setQueryInput('');
        setUploadedFileId('');
        closeQueryModal();
      } else {
        toast.dismiss();
        toast.error('Failed to submit query. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting query:', error);
      toast.dismiss();
      toast.error('Failed to submit query. Please try again.');
    }
  };


  const handleCartDetailNavigate = (cartId, shipToAddressId, cartStatusType) => {
    const submitted = cartStatusType === 'SUBMITTED';
    const addressPart = shipToAddressId ? `/${shipToAddressId}` : '';
    navigate(
      `/cartDetails/${cartId}${addressPart}?submitted=${submitted}&cartStatusType=${cartStatusType}&dashboard=true`,
    );
  };

  const handleDelete = (row) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Delete ',
    }).then((result) => {
      if (result.isConfirmed) {
        CartService.deleteCart(row.cartId, companyId)
          .then(() => {
            Swal.fire('Deleted!', 'Your cart item has been deleted.', 'success');
            setCartData((prevData) => prevData.filter((item) => item.cartId !== row.cartId));
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
    });
  };

  const renderActionRFQButtons = (cell, row) => {
    const isEditable = row.rfqStatus === 'created';

    return (
      <div className="d-flex justify-content-center">
        <button
          type="button"
          className="btn btn-sm btn-primary me-2 action-button-edit"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/rfqDetails/${row.rfqId}`);
          }}
          data-bs-toggle="tooltip"
          data-bs-placement="top"
          title="View RFQ Details"
        >
          <Eye size={14} />
        </button>
        <button
          type="button"
          className="btn btn-sm btn-primary action-button-edit"
          onClick={(e) => {
            e.stopPropagation();
            if (isEditable) {
              navigate(`/CreateRfq/${row.rfqId}`);
            }
          }}
          disabled={!isEditable}
          style={
            !isEditable
              ? {
                cursor: 'not-allowed',
                opacity: 0.5,
                backgroundColor: 'transparent',
                borderColor: 'darkgrey',
                color: 'darkgrey',
              }
              : {}
          }
          data-bs-toggle="tooltip"
          data-bs-placement="top"
          title={isEditable ? 'Edit RFQ' : 'Editing disabled (status is not "created")'}
        >
          <Edit size={14} />
        </button>
      </div>
    );
  };

  const actionsFormatter = (cell, row) => {
    const isActionDisabled =
      row.cartStatusType === 'PENDING_APPROVAL' ||
      row.cartStatusType === 'SUBMITTED' ||
      row.cartStatusType === 'APPROVED' ||
      row.cartStatusType === 'POGENERATED';

    const isQueryDisabled =
      row.cartStatusType === 'SUBMITTED' ||
      row.cartStatusType === 'APPROVED' ||
      row.cartStatusType === 'POGENERATED' ||
      row.cartStatusType === 'DRAFT';

    const buttonStyle = isActionDisabled
      ? {
        cursor: 'not-allowed',
        opacity: 0.5,
        backgroundColor: 'transparent',
        borderColor: 'darkgrey',
        color: 'darkgrey',
      }
      : {};

    const querybuttonStyle = isQueryDisabled
      ? {
        cursor: 'not-allowed',
        opacity: 0.5,
        backgroundColor: 'transparent',
        borderColor: 'darkgrey',
        color: 'darkgrey',
      }
      : {};

    const hasQuery = row.queryDto && row.queryDto.isQueryRaised;

    return (
      <div className="d-flex justify-content-center">
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            type="button"
            className="btn btn-sm btn-warning me-2 action-button-query"
            onClick={() => openQueryModal(row.cartId)}
            style={{
              ...querybuttonStyle,
              position: 'relative',
              transition: 'none',
            }}
            disabled={isQueryDisabled}
            data-bs-toggle="tooltip"
            data-bs-placement="top"
            title="View Queries"
          >
            <FaRegCommentAlt size={14} />
            {hasQuery && (
              <div
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '5px',
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#dc3545',
                  borderRadius: '50%',
                  border: '1px solid white',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              />
            )}
          </button>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-danger action-button-delete"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(row);
          }}
          disabled={isActionDisabled}
          style={buttonStyle}
          data-bs-toggle="tooltip"
          data-bs-placement="top"
          title="Delete Cart"
        >
          <Trash size={14} />
        </button>
      </div>
    );
  };

  useEffect(() => {
    let tooltipInstances = [];
    const rafId = requestAnimationFrame(() => {
      const tooltipTriggerList = [...document.querySelectorAll('[data-bs-toggle="tooltip"]')];
      tooltipTriggerList.forEach((el) => {
        try {
          tooltipInstances.push(new bootstrap.Tooltip(el));
        } catch (e) {
          // Ignore elements that aren't ready yet
        }
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
      tooltipInstances.forEach((tip) => {
        try { tip.dispose(); } catch (e) { }
      });
    };
  }, []);

  const handleNavigateToRfq = (rfqId) => {
    navigate(`/rfqDetails/${rfqId}?dashboard=true`);
  };

  const handleNavigateCartApprovalDetails = (cartId) => {
    navigate(`/cart-approval-details/${cartId}`);
  };

  const renderActionPOButtons = (cell, row) => (
    <div className="d-flex justify-content-center">
      <button
        type="button"
        className="btn btn-sm btn-primary me-2 action-button-edit"
        onClick={() => viewOrderDetails(row.PurchaseOrderId, false)}
        title="View Purchase Order"
      >
        <Eye size={14} />
      </button>
    </div>
  );

  return (
    <div style={{ paddingTop: '10px' }}>
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
      <div className="mb-3">
        <Card
          style={{
            border: 'none',
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Blue Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ color: 'white' }}>
              <h5 className="mb-0 fw-bold" style={{ fontSize: '1rem' }}>
                Welcome back, {userName}! 👋
              </h5>
              <p className="mb-0 opacity-90" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                Your procurement dashboard overview with real-time insights and pending actions.
              </p>
            </div>
            <div className="d-flex gap-4">
              <div className="text-center">
                <div className="fw-bold text-white" style={{ fontSize: '1.25rem', lineHeight: '1' }}>{cartsTotalElements}</div>
                <small className="text-white opacity-75" style={{ fontSize: '0.65rem' }}>Carts</small>
              </div>
              <div className="text-center">
                <div className="fw-bold text-white" style={{ fontSize: '1.25rem', lineHeight: '1' }}>{rfqTotalElements}</div>
                <small className="text-white opacity-75" style={{ fontSize: '0.65rem' }}>RFQs</small>
              </div>
              <div className="text-center">
                <div className="fw-bold text-white" style={{ fontSize: '1.25rem', lineHeight: '1' }}>{purchaseOrdersTotalElements}</div>
                <small className="text-white opacity-75" style={{ fontSize: '0.65rem' }}>POs</small>
              </div>
            </div>
          </div>
          {/* Progress Tiles Row */}
          <CardBody style={{ padding: '12px 16px' }}>
            <ProgressCards />
          </CardBody>
        </Card>
      </div>
      <Card
        className="enhanced-card"
        style={{
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: 'none',
        }}
      >
        <div style={{ borderBottom: '1px solid #e5e7eb', padding: '0 20px' }}>
          <div className="d-flex gap-1">
            {!shouldHideProcurement && (
              <button
                onClick={() => { setActiveDashboardSection('procurement'); changeSectionWithCleanUrl('procurement'); }}
                style={{
                  padding: '14px 20px',
                  fontWeight: activeDashboardSection === 'procurement' ? '600' : '500',
                  fontSize: '13px',
                  border: 'none',
                  borderBottom: activeDashboardSection === 'procurement' ? '2px solid #1a56db' : '2px solid transparent',
                  backgroundColor: 'transparent',
                  color: activeDashboardSection === 'procurement' ? '#1a56db' : '#6b7280',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '-1px',
                }}
                onMouseOver={(e) => {
                  if (activeDashboardSection !== 'procurement') {
                    e.currentTarget.style.color = '#374151';
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }
                }}
                onMouseOut={(e) => {
                  if (activeDashboardSection !== 'procurement') {
                    e.currentTarget.style.color = '#6b7280';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <i className="bi bi-grid-3x3-gap" style={{ fontSize: '14px' }}></i>
                <span>Procurement Management</span>
                <span style={{
                  backgroundColor: activeDashboardSection === 'procurement' ? '#dbeafe' : '#f3f4f6',
                  color: activeDashboardSection === 'procurement' ? '#1a56db' : '#6b7280',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '600',
                  minWidth: '24px',
                  textAlign: 'center',
                }}>{cartsTotalElements + rfqTotalElements + purchaseOrdersTotalElements}</span>
              </button>
            )}
            <button
              onClick={() => { setActiveDashboardSection('completed'); changeSectionWithCleanUrl('completed'); }}
              style={{
                padding: '14px 20px',
                fontWeight: activeDashboardSection === 'completed' ? '600' : '500',
                fontSize: '13px',
                border: 'none',
                borderBottom: activeDashboardSection === 'completed' ? '2px solid #059669' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: activeDashboardSection === 'completed' ? '#059669' : '#6b7280',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '-1px',
              }}
              onMouseOver={(e) => {
                if (activeDashboardSection !== 'completed') {
                  e.currentTarget.style.color = '#374151';
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }
              }}
              onMouseOut={(e) => {
                if (activeDashboardSection !== 'completed') {
                  e.currentTarget.style.color = '#6b7280';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <i className="bi bi-check-circle" style={{ fontSize: '14px' }}></i>
              <span>Your Processed Items</span>
              <span style={{
                backgroundColor: activeDashboardSection === 'completed' ? '#d1fae5' : '#f3f4f6',
                color: activeDashboardSection === 'completed' ? '#059669' : '#6b7280',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: '600',
                minWidth: '24px',
                textAlign: 'center',
              }}>{approvalCartTotalElements + completedRfqTotalElements + completedPOTotalElements}</span>
            </button>
          </div>
        </div>
        <CardBody>
          {!shouldHideProcurement && activeDashboardSection === 'procurement' && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
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
                    <i className="fas fa-tasks text-white"></i>
                  </div>
                  <div>
                    <h4 className="mb-1">Procurement Management</h4>
                    <p className="text-muted mb-0 small">
                      Manage your procurement requests, requisitions, and purchase orders
                    </p>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="search-wrapper" style={{ minWidth: '280px' }}>
                    <div className="position-relative">
                      <input
                        type="text"
                        className="form-control"
                        placeholder={
                          activeMainTab === 'carts'
                            ? 'Search carts...'
                            : activeMainTab === 'purchaseOrders'
                              ? 'Search orders...'
                              : 'Search RFQs...'
                        }
                        value={
                          activeMainTab === 'carts'
                            ? cartSearchTerm
                            : activeMainTab === 'purchaseOrders'
                              ? orderSearchTerm
                              : rfqSearchTerm
                        }
                        onChange={(e) => {
                          if (activeMainTab === 'carts') {
                            setCartSearchTerm(e.target.value);
                          } else if (activeMainTab === 'purchaseOrders') {
                            setOrderSearchTerm(e.target.value);
                          } else if (activeMainTab === 'rfqs') {
                            setRfqSearchTerm(e.target.value);
                          }
                        }}
                        style={{
                          paddingLeft: '40px',
                          paddingRight: (
                            activeMainTab === 'carts' ? cartSearchTerm : orderSearchTerm
                          )
                            ? '40px'
                            : '12px',
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px',
                          fontSize: '14px',
                          height: '40px',
                          boxShadow: 'none',
                          transition: 'border-color 0.2s ease',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#757575';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e0e0e0';
                        }}
                      />
                      <i
                        className="bi bi-search position-absolute text-muted"
                        style={{
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '16px',
                          pointerEvents: 'none',
                        }}
                      ></i>
                      {(activeMainTab === 'carts' ? cartSearchTerm : orderSearchTerm) && (
                        <button
                          className="btn p-0 position-absolute"
                          type="button"
                          onClick={() => {
                            if (activeMainTab === 'carts') {
                              setCartSearchTerm('');
                            } else {
                              setOrderSearchTerm('');
                            }
                          }}
                          style={{
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '24px',
                            height: '24px',
                            border: 'none',
                            background: 'none',
                            color: '#757575',
                          }}
                        >
                          <i className="bi bi-x" style={{ fontSize: '16px' }}></i>
                        </button>
                      )}
                    </div>
                  </div>
                  {activeMainTab === 'carts' && (
                    <button
                      className="btn btn-primary px-4 py-2"
                      type="button"
                      onClick={handleCreateCartWithConfirmation}
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
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(0, 158, 251, 0.3)';
                      }}
                      onBlur={(e) => {
                        e.target.style.backgroundColor = '#009efb';
                        e.target.style.transform = 'translateY(0px)';
                        e.target.style.boxShadow = '0 2px 8px rgba(0, 158, 251, 0.2)';
                      }}
                    >
                      <i className="fas fa-plus me-2"></i>Add New Cart
                    </button>
                  )}
                  {activeMainTab === 'rfqs' && (
                    <button
                      className="btn btn-primary px-4 py-2"
                      type="button"
                      onClick={() => navigate('/CreateRfq')}
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
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(0, 158, 251, 0.3)';
                      }}
                      onBlur={(e) => {
                        e.target.style.backgroundColor = '#009efb';
                        e.target.style.transform = 'translateY(0px)';
                        e.target.style.boxShadow = '0 2px 8px rgba(0, 158, 251, 0.2)';
                      }}
                    >
                      <i className="fas fa-plus me-2"></i>Add New RFQ
                    </button>
                  )}
                </div>
              </div>
              <div className="nav nav-tabs mb-3" role="tablist">
                <button
                  className={`nav-link ${activeMainTab === 'carts' ? 'active' : ''}`}
                  onClick={() => { setActiveMainTab('carts'); changeSubTabWithCleanUrl('mainTab', 'carts'); }}
                  type="button"
                  style={{
                    border: 'none',
                    backgroundColor: activeMainTab === 'carts' ? '#f8f9fa' : 'transparent',
                    color: activeMainTab === 'carts' ? '#495057' : '#6c757d',
                    borderBottom:
                      activeMainTab === 'carts' ? '2px solid #009efb' : '2px solid transparent',
                    padding: '12px 24px',
                    cursor: 'pointer',
                    fontWeight: activeMainTab === 'carts' ? '600' : '400',
                    borderRadius: '8px 8px 0 0',
                  }}
                >
                  <i className="fas fa-shopping-cart me-2"></i>Procurement Carts (
                  {cartsTotalElements})
                </button>
                <button
                  className={`nav-link ${activeMainTab === 'rfqs' ? 'active' : ''}`}
                  onClick={() => { setActiveMainTab('rfqs'); changeSubTabWithCleanUrl('mainTab', 'rfqs'); }}
                  type="button"
                  style={{
                    border: 'none',
                    backgroundColor: activeMainTab === 'rfqs' ? '#f8f9fa' : 'transparent',
                    color: activeMainTab === 'rfqs' ? '#495057' : '#6c757d',
                    borderBottom:
                      activeMainTab === 'rfqs' ? '2px solid #00c292' : '2px solid transparent',
                    padding: '12px 24px',
                    cursor: 'pointer',
                    fontWeight: activeMainTab === 'rfqs' ? '600' : '400',
                    borderRadius: '8px 8px 0 0',
                  }}
                >
                  <i className="fas fa-file-contract me-2"></i>Request for Quotations (
                  {rfqTotalElements})
                </button>
                <button
                  className={`nav-link ${activeMainTab === 'purchaseOrders' ? 'active' : ''}`}
                  onClick={() => { setActiveMainTab('purchaseOrders'); changeSubTabWithCleanUrl('mainTab', 'purchaseOrders'); }}
                  type="button"
                  style={{
                    border: 'none',
                    backgroundColor:
                      activeMainTab === 'purchaseOrders' ? '#f8f9fa' : 'transparent',
                    color: activeMainTab === 'purchaseOrders' ? '#495057' : '#6c757d',
                    borderBottom:
                      activeMainTab === 'purchaseOrders'
                        ? '2px solid #4facfe'
                        : '2px solid transparent',
                    padding: '12px 24px',
                    cursor: 'pointer',
                    fontWeight: activeMainTab === 'purchaseOrders' ? '600' : '400',
                    borderRadius: '8px 8px 0 0',
                  }}
                >
                  <i className="fas fa-file-invoice me-2"></i>Purchase Orders (
                  {purchaseOrdersTotalElements})
                </button>
              </div>
              <div className="tab-content">
                {activeMainTab === 'carts' && (
                  <div className="tab-pane fade show active">
                    {cartsLoading ? (
                      <div className="text-center p-4">
                        <i className="fas fa-spinner fa-spin me-2"></i>
                        Loading carts...
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <BootstrapTable
                          data={cartData}
                          striped
                          hover
                          condensed
                          pagination={cartsTotalElements > cartsPageSize}
                          remote
                          fetchInfo={{
                            dataTotalSize: cartsTotalElements,
                          }}
                          options={cartOptions}
                          tableHeaderClass="mb-0"
                        >
                          <TableHeaderColumn
                            width="10%"
                            dataField="cartNo"
                            dataFormat={(cell, row) => (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNavigate(
                                    row.cartId,
                                    row.shipToAddressId,
                                    row.cartStatusType,
                                  );
                                }}
                                style={{
                                  color: '#009efb',
                                  cursor: 'pointer',
                                  textDecoration: 'none',
                                }}
                                onMouseOver={(e) => {
                                  e.target.style.textDecoration = 'underline';
                                }}
                                onMouseOut={(e) => {
                                  e.target.style.textDecoration = 'none';
                                }}
                                onFocus={(e) => {
                                  e.target.style.textDecoration = 'underline';
                                }}
                                onBlur={(e) => {
                                  e.target.style.textDecoration = 'none';
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.stopPropagation();
                                    handleNavigate(
                                      row.cartId,
                                      row.shipToAddressId,
                                      row.cartStatusType,
                                    );
                                  }
                                }}
                              >
                                {cell || '-'}
                              </span>
                            )}
                            dataAlign="center"
                            headerAlign="center"
                            isKey
                            thStyle={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              textAlign: 'center',
                            }}
                            columnClassName="sortable-column"
                            tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                          >
                            <div
                              onClick={() => handleCartSort('cartNo')}
                              style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <i className="bi bi-cart me-1 text-primary"></i>Cart No.{' '}
                              {renderSortIcon('cartNo')}
                            </div>
                          </TableHeaderColumn>

                          <TableHeaderColumn
                            width="16%"
                            dataField="supplierNames"
                            dataFormat={(cell) => {
                              if (!cell) return <span className="text-muted">-</span>;
                              const supplierText = typeof cell === 'string' ? cell : String(cell);
                              const supplierName =
                                supplierText.length > 25
                                  ? `${supplierText.substring(0, 25)}...`
                                  : supplierText;
                              return (
                                <span
                                  style={{ cursor: 'default' }}
                                  title={supplierText
                                    .split(',')
                                    .map((supplier) => `• ${supplier.trim()}`)
                                    .join('\n')}
                                >
                                  {supplierName || 'N/A'}
                                </span>
                              );
                            }}
                            dataAlign="center"
                            headerAlign="center"
                            thStyle={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              textAlign: 'center',
                            }}
                            columnClassName="sortable-column"
                            tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                          >
                            <div
                              style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <i className="bi bi-building me-1 text-primary"></i>Supplier{' '}
                            </div>
                          </TableHeaderColumn>

                          <TableHeaderColumn
                            dataField="lineItemCount"
                            dataAlign="center"
                            headerAlign="center"
                            width="7%"
                            dataFormat={(cell) => (
                              <span style={{ fontSize: '13px' }}>{cell || 'N/A'}</span>
                            )}
                            thStyle={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              textAlign: 'center',
                            }}
                            columnClassName="sortable-column"
                            tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                          >
                            <div
                              style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <i className="bi bi-list-ol me-1 text-primary"></i>Items
                            </div>
                          </TableHeaderColumn>

                          <TableHeaderColumn
                            dataField="cartStatusType"
                            dataFormat={(cell) => formatStatusWithIcon(cell)}
                            dataAlign="center"
                            headerAlign="center"
                            width="15%"
                            thStyle={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              textAlign: 'center',
                            }}
                            columnClassName="sortable-column"
                            tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                          >
                            <div
                              onClick={() => handleCartSort('cartStatusType')}
                              style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <i className="bi bi-flag me-1 text-primary"></i>Status{' '}
                              {renderSortIcon('cartStatusType')}
                            </div>
                          </TableHeaderColumn>

                          <TableHeaderColumn
                            dataField="neededBy"
                            dataAlign="center"
                            headerAlign="center"
                            dataFormat={(cell) => (
                              <span className="date-value" style={{ fontSize: '13px' }}>
                                {formatDate(cell)}
                              </span>
                            )}
                            width="10%"
                            thStyle={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              textAlign: 'center',
                            }}
                            columnClassName="sortable-column"
                            tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                          >
                            <div
                              onClick={() => handleCartSort('neededBy')}
                              style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <i className="bi bi-calendar-event me-1 text-primary"></i>Needed By{' '}
                              {renderSortIcon('neededBy')}
                            </div>
                          </TableHeaderColumn>

                          <TableHeaderColumn
                            dataField="createdBy"
                            width="12%"
                            dataAlign="center"
                            headerAlign="center"
                            dataFormat={(cell) => {
                              if (!cell) return <span className="text-muted">-</span>;

                              const fullText =
                                `${cell.firstName} ${cell.lastName} (${cell.email})`.trim();
                              const displayText =
                                fullText.length > 25
                                  ? `${fullText.substring(0, 25)}...`
                                  : fullText;
                              return (
                                <span
                                  style={{ cursor: 'default', fontSize: '13px' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTooltip(e, fullText);
                                  }}
                                >
                                  {displayText}
                                </span>
                              );
                            }}
                            thStyle={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              textAlign: 'center',
                            }}
                            columnClassName="sortable-column"
                            tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                          >
                            <div
                              onClick={() => handleCartSort('createdBy')}
                              style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <i className="bi bi-person me-1 text-primary"></i>Created By{' '}
                              {renderSortIcon('createdBy')}
                            </div>
                          </TableHeaderColumn>

                          <TableHeaderColumn
                            dataField="createdDate"
                            dataAlign="center"
                            headerAlign="center"
                            width="9%"
                            dataFormat={(cell) => (
                              <span className="date-value" style={{ fontSize: '13px' }}>
                                {formatDate(cell)}
                              </span>
                            )}
                            thStyle={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              textAlign: 'center',
                            }}
                            columnClassName="sortable-column"
                            tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                          >
                            <div
                              onClick={() => handleCartSort('createdDate')}
                              style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <i className="bi bi-calendar-plus me-1 text-primary"></i>Created{' '}
                              {renderSortIcon('createdDate')}
                            </div>
                          </TableHeaderColumn>

                          <TableHeaderColumn
                            dataField="cartAmount"
                            dataAlign="center"
                            headerAlign="center"
                            width="10%"
                            dataFormat={(cell) => (
                              <span className="currency-value">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }).format(cell || 0)}
                              </span>
                            )}
                            thStyle={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              textAlign: 'center',
                            }}
                            columnClassName="sortable-column"
                            tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                          >
                            <div
                              style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <i className="bi bi-currency-dollar me-1 text-primary"></i>Amount
                            </div>
                          </TableHeaderColumn>

                          <TableHeaderColumn
                            dataField="actions"
                            dataFormat={actionsFormatter}
                            dataAlign="center"
                            headerAlign="center"
                            width="12%"
                          >
                            <i className="bi bi-gear me-1 text-primary"></i>Actions
                          </TableHeaderColumn>
                        </BootstrapTable>
                      </div>
                    )}
                  </div>
                )}

                {activeMainTab === 'purchaseOrders' && (
                  <div className="tab-pane fade show active">
                    {purchaseOrdersLoading && (
                      <div className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2 text-muted">Loading purchase orders...</p>
                      </div>
                    )}
                    <div className="table-responsive">
                      <BootstrapTable
                        data={purchaseOrdersRaise}
                        striped
                        hover
                        condensed
                        pagination={purchaseOrdersTotalElements > purchaseOrdersPageSize}
                        remote
                        fetchInfo={{
                          dataTotalSize: purchaseOrdersTotalElements,
                        }}
                        options={poOptions}
                        tableHeaderClass="mb-0"
                      >
                        <TableHeaderColumn
                          dataField="orderNo"
                          dataAlign="center"
                          headerAlign="center"
                          width="10%"
                          dataFormat={(cell) => (
                            <span style={{ fontSize: '13px', color: '#495057' }}>
                              {cell || '-'}
                            </span>
                          )}
                          thStyle={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                          columnClassName="sortable-column"
                          tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                        >
                          <div
                            onClick={() => handlePoSort('orderNo')}
                            style={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <i className="bi bi-receipt me-1 text-primary"></i>Order No.{' '}
                            {renderPoSortIcon('orderNo')}
                          </div>
                        </TableHeaderColumn>

                        <TableHeaderColumn
                          dataField="cart"
                          dataAlign="center"
                          headerAlign="center"
                          width="13%"
                          dataFormat={(cell, row) => {
                            if (row.cart) {
                              return (
                                <span
                                  style={{
                                    cursor: 'pointer',
                                    color: '#009efb',
                                    fontSize: '13px',
                                    textDecoration: 'none',
                                  }}
                                  onMouseOver={(e) => {
                                    e.target.style.textDecoration = 'underline';
                                  }}
                                  onMouseOut={(e) => {
                                    e.target.style.textDecoration = 'none';
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.textDecoration = 'underline';
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.textDecoration = 'none';
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNavigate(
                                      row.cart.cartId,
                                      row.shippingToAddress && row.shippingToAddress.addressId,
                                      row.orderStatus,
                                    );
                                  }}
                                  role="button"
                                  tabIndex={0}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.stopPropagation();
                                      handleNavigate(
                                        row.cart.cartId,
                                        row.shippingToAddress && row.shippingToAddress.addressId,
                                        row.orderStatus,
                                      );
                                    }
                                  }}
                                >
                                  CART - {cell.cartNo}
                                </span>
                              );
                            }
                            if (row.rfq) {
                              return (
                                <span
                                  style={{
                                    cursor: 'pointer',
                                    color: '#009efb',
                                    fontSize: '13px',
                                    textDecoration: 'none',
                                  }}
                                  onMouseOver={(e) => {
                                    e.target.style.textDecoration = 'underline';
                                  }}
                                  onMouseOut={(e) => {
                                    e.target.style.textDecoration = 'none';
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.textDecoration = 'underline';
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.textDecoration = 'none';
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNavigateToRfq(row.rfq);
                                  }}
                                  role="button"
                                  tabIndex={0}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.stopPropagation();
                                      handleNavigateToRfq(row.rfq);
                                    }
                                  }}
                                >
                                  RFQ - {cell?.rfqNumber}
                                </span>
                              );
                            }
                            return <span className="text-muted">-</span>;
                          }}
                          thStyle={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                          columnClassName="sortable-column"
                          tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                        >
                          <div
                            onClick={() => handlePoSort('cart')}
                            style={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <i className="bi bi-diagram-3 me-1 text-primary"></i>Source{' '}
                            {renderPoSortIcon('cart')}
                          </div>
                        </TableHeaderColumn>

                        <TableHeaderColumn
                          dataField="supplier"
                          dataAlign="center"
                          headerAlign="center"
                          width="12%"
                          dataFormat={(cell) => {
                            const supplierName = cell?.displayName || cell?.name;
                            if (!supplierName)
                              return <span className="text-muted">-</span>;
                            const displayText = supplierName.length > 15 ? `${supplierName.substring(0, 15)}...` : supplierName;
                            return (
                              <span title={supplierName} style={{ fontSize: '13px' }}>
                                {displayText}
                              </span>
                            );
                          }}
                          thStyle={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                          columnClassName="sortable-column"
                          tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                        >
                          <div
                            onClick={() => handlePoSort('supplier')}
                            style={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <i className="bi bi-building me-1 text-primary"></i>Supplier{' '}
                            {renderPoSortIcon('supplier')}
                          </div>
                        </TableHeaderColumn>

                        <TableHeaderColumn
                          dataField="orderStatus"
                          dataFormat={(cell) => formatStatusWithIcon(cell)}
                          isKey
                          dataAlign="center"
                          headerAlign="center"
                          width="15%"
                          thStyle={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                          columnClassName="sortable-column"
                          tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                        >
                          <div
                            onClick={() => handlePoSort('orderStatus')}
                            style={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <i className="bi bi-flag me-1 text-primary"></i>Order Status{' '}
                            {renderPoSortIcon('orderStatus')}
                          </div>
                        </TableHeaderColumn>

                        <TableHeaderColumn
                          dataField="deliveryDate"
                          dataAlign="center"
                          headerAlign="center"
                          dataFormat={(cell) => (
                            <span className="date-value" style={{ fontSize: '13px' }}>
                              {formatDate(cell)}
                            </span>
                          )}
                          width="11%"
                          thStyle={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                          columnClassName="sortable-column"
                          tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                        >
                          <div
                            onClick={() => handlePoSort('deliveryDate')}
                            style={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <i className="bi bi-truck me-1 text-primary"></i>Delivery{' '}
                            {renderPoSortIcon('deliveryDate')}
                          </div>
                        </TableHeaderColumn>

                        <TableHeaderColumn
                          dataField="buyerUser"
                          dataAlign="center"
                          headerAlign="center"
                          width="12%"
                          dataFormat={(cell) => {
                            if (!cell) return <span className="text-muted">-</span>;

                            const fullText =
                              `${cell.firstName} ${cell.lastName} (${cell.email})`.trim();
                            const displayText =
                              fullText.length > 25 ? `${fullText.substring(0, 25)}...` : fullText;
                            return (
                              <span
                                style={{ cursor: 'default', fontSize: '13px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTooltip(e, fullText);
                                }}
                              >
                                {displayText}
                              </span>
                            );
                          }}
                          thStyle={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                          columnClassName="sortable-column"
                          tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                        >
                          <div
                            onClick={() => handlePoSort('buyerUser')}
                            style={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <i className="bi bi-person me-1 text-primary"></i>Created By{' '}
                            {renderPoSortIcon('buyerUser')}
                          </div>
                        </TableHeaderColumn>

                        <TableHeaderColumn
                          dataField="orderPlacedDate"
                          dataAlign="center"
                          headerAlign="center"
                          width="10%"
                          dataFormat={(cell) => (
                            <span className="date-value" style={{ fontSize: '13px' }}>
                              {formatDate(cell)}
                            </span>
                          )}
                          thStyle={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                          columnClassName="sortable-column"
                          tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                        >
                          <div
                            onClick={() => handlePoSort('orderPlacedDate')}
                            style={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <i className="bi bi-calendar-plus me-1 text-primary"></i>Created{' '}
                            {renderPoSortIcon('orderPlacedDate')}
                          </div>
                        </TableHeaderColumn>

                        <TableHeaderColumn
                          dataField="orderAmount"
                          dataAlign="center"
                          headerAlign="center"
                          width="10%"
                          dataFormat={(cell) => (
                            <span className="currency-value">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }).format(cell || 0)}
                            </span>
                          )}
                          thStyle={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                          columnClassName="sortable-column"
                          tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                        >
                          <div
                            onClick={() => handlePoSort('orderAmount')}
                            style={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <i className="bi bi-currency-dollar me-1 text-primary"></i>Amount{' '}
                            {renderPoSortIcon('orderAmount')}
                          </div>
                        </TableHeaderColumn>

                        <TableHeaderColumn
                          width="10%"
                          dataFormat={renderActionPOButtons}
                          dataAlign="center"
                          headerAlign="center"
                          thStyle={{ textAlign: 'center' }}
                          tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <i className="bi bi-gear me-1 text-primary"></i>Actions
                          </div>
                        </TableHeaderColumn>
                      </BootstrapTable>
                    </div>
                  </div>
                )}
                {activeMainTab === 'rfqs' && (
                  <div className="tab-pane fade show active">
                    {rfqLoading ? (
                      <div className="text-center p-4">
                        <i className="fas fa-spinner fa-spin me-2"></i>
                        Loading RFQs...
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <BootstrapTable
                          data={rfqData}
                          striped
                          hover
                          condensed
                          pagination={rfqTotalElements > rfqPageSize}
                          remote
                          fetchInfo={{
                            dataTotalSize: rfqTotalElements,
                          }}
                          options={rfqOptions}
                          tableHeaderClass="mb-0"
                        >
                          <TableHeaderColumn dataField="rfqId" isKey hidden>
                            RFQ ID
                          </TableHeaderColumn>

                          <TableHeaderColumn
                            dataField="rfqNumber"
                            dataAlign="center"
                            headerAlign="center"
                            width="10%"
                            dataFormat={(cell, row) => (
                              <span
                                style={{
                                  fontWeight: '600',
                                  color: '#009efb',
                                  cursor: 'pointer',
                                }}
                                onClick={() => navigate(`/rfqDetails/${row.rfqId}`)}
                              >
                                {cell || `RFQ-${row.rfqId}`}
                              </span>
                            )}
                            thStyle={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              textAlign: 'center',
                            }}
                            columnClassName="sortable-column"
                            tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                          >
                            <div
                              onClick={() => handleRfqSort('rfqNumber')}
                              style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <i className="bi bi-hash me-1 text-primary"></i>RFQ #{' '}
                              {renderRfqSortIcon('rfqNumber')}
                            </div>
                          </TableHeaderColumn>

                          <TableHeaderColumn
                            dataField="title"
                            dataAlign="center"
                            headerAlign="center"
                            width="15%"
                            dataFormat={(cell) => {
                              if (!cell) return <span className="text-muted">-</span>;
                              const truncated =
                                cell.length > 20 ? `${cell.substring(0, 20)}...` : cell;
                              return <span title={cell}>{truncated}</span>;
                            }}
                            thStyle={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              textAlign: 'center',
                            }}
                            columnClassName="sortable-column"
                            tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                          >
                            <div
                              onClick={() => handleRfqSort('title')}
                              style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <i className="bi bi-file-text me-1 text-primary"></i>Title{' '}
                              {renderRfqSortIcon('title')}
                            </div>
                          </TableHeaderColumn>

                          <TableHeaderColumn
                            dataField="objective"
                            dataAlign="center"
                            headerAlign="center"
                            width="20%"
                            dataFormat={(cell) => {
                              if (!cell) return <span className="text-muted">-</span>;
                              const truncated =
                                cell.length > 30 ? `${cell.substring(0, 30)}...` : cell;
                              return <span title={cell}>{truncated}</span>;
                            }}
                            thStyle={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              textAlign: 'center',
                            }}
                            columnClassName="sortable-column"
                            tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                          >
                            <div
                              onClick={() => handleRfqSort('objective')}
                              style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <i className="bi bi-bullseye me-1 text-primary"></i>Objective{' '}
                              {renderRfqSortIcon('objective')}
                            </div>
                          </TableHeaderColumn>

                          <TableHeaderColumn
                            dataField="suppliers"
                            dataAlign="center"
                            headerAlign="center"
                            width="10%"
                            dataFormat={(cell) => (
                              <span style={{ fontSize: '13px' }}>{cell ? cell.length : 0}</span>
                            )}
                            thStyle={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              textAlign: 'center',
                            }}
                            columnClassName="sortable-column"
                            tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                          >
                            <div
                              style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <i className="bi bi-building me-1 text-primary"></i>Suppliers
                            </div>
                          </TableHeaderColumn>

                          <TableHeaderColumn
                            dataField="rfqItems"
                            dataAlign="center"
                            headerAlign="center"
                            width="10%"
                            dataFormat={(cell) => (
                              <span style={{ fontSize: '13px' }}>{cell ? cell.length : 0}</span>
                            )}
                            thStyle={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              textAlign: 'center',
                            }}
                            columnClassName="sortable-column"
                            tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                          >
                            <div
                              style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <i className="bi bi-list-ol me-1 text-primary"></i>Items{' '}
                            </div>
                          </TableHeaderColumn>

                          <TableHeaderColumn
                            dataField="rfqStatus"
                            dataAlign="center"
                            headerAlign="center"
                            width="15%"
                            dataFormat={(cell) => formatStatusWithIcon(cell)}
                            thStyle={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              textAlign: 'center',
                            }}
                            columnClassName="sortable-column"
                            tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                          >
                            <div
                              style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <i className="bi bi-flag me-1 text-primary"></i>Status{' '}
                            </div>
                          </TableHeaderColumn>

                          <TableHeaderColumn
                            dataField="createdDate"
                            dataAlign="center"
                            headerAlign="center"
                            width="10%"
                            dataFormat={(cell) => (
                              <span className="date-value" style={{ fontSize: '13px' }}>
                                {formatDate(cell)}
                              </span>
                            )}
                            thStyle={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              textAlign: 'center',
                            }}
                            columnClassName="sortable-column"
                            tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                          >
                            <div
                              onClick={() => handleRfqSort('createdDate')}
                              style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <i className="bi bi-calendar-plus me-1 text-primary"></i>Created{' '}
                              {renderRfqSortIcon('createdDate')}
                            </div>
                          </TableHeaderColumn>

                          <TableHeaderColumn
                            dataField="requiredAt"
                            dataAlign="center"
                            headerAlign="center"
                            width="10%"
                            dataFormat={(cell) => (
                              <span className="date-value" style={{ fontSize: '13px' }}>
                                {formatDate(cell)}
                              </span>
                            )}
                            thStyle={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              textAlign: 'center',
                            }}
                            columnClassName="sortable-column"
                            tdStyle={{ textAlign: 'center', verticalAlign: 'middle' }}
                          >
                            <div
                              onClick={() => handleRfqSort('requiredAt')}
                              style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <i className="bi bi-calendar-event me-1 text-primary"></i>Required{' '}
                              {renderRfqSortIcon('requiredAt')}
                            </div>
                          </TableHeaderColumn>

                          <TableHeaderColumn
                            dataFormat={renderActionRFQButtons}
                            dataAlign="center"
                            headerAlign="center"
                            width="10%"
                          >
                            <i className="bi bi-gear me-1 text-primary"></i>Actions
                          </TableHeaderColumn>
                        </BootstrapTable>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <QueryModal
                isOpen={queryModalOpen}
                onClose={closeQueryModal}
                onSubmit={handleSubmitQuery}
                previousQueries={previousQueries}
                queryInput={queryInput}
                setQueryInput={setQueryInput}
                onFileUploadSuccess={handleFileUploadSuccess}
              />
            </>
          )}
          {activeDashboardSection === 'completed' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
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
                    <i className="fas fa-check-circle text-white"></i>
                  </div>
                  <div>
                    <h4 className="mb-1">Your Processed Items</h4>
                    <p className="text-muted mb-0 small">Items you have reviewed and processed</p>
                  </div>
                </div>
              </div>
              <div className="nav nav-tabs mb-3" role="tablist">
                <button
                  className={`nav-link ${activeTab2 === 'approvedRequisitions' ? 'active' : ''}`}
                  onClick={() => { setActiveTab2('approvedRequisitions'); changeSubTabWithCleanUrl('tab2', 'approvedRequisitions'); }}
                  type="button"
                  style={{
                    border: 'none',
                    backgroundColor:
                      activeTab2 === 'approvedRequisitions' ? '#f8f9fa' : 'transparent',
                    color: activeTab2 === 'approvedRequisitions' ? '#495057' : '#6c757d',
                    borderBottom:
                      activeTab2 === 'approvedRequisitions'
                        ? '2px solid #4facfe'
                        : '2px solid transparent',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontWeight: activeTab2 === 'approvedRequisitions' ? '600' : '400',
                    borderRadius: '8px 8px 0 0',
                  }}
                >
                  <i className="fas fa-clipboard-check me-2"></i>
                  Approved Carts ({approvalCartTotalElements})
                </button>

                <button
                  className={`nav-link ${activeTab2 === 'awardedQuotes' ? 'active' : ''}`}
                  onClick={() => { setActiveTab2('awardedQuotes'); changeSubTabWithCleanUrl('tab2', 'awardedQuotes'); }}
                  type="button"
                  style={{
                    border: 'none',
                    backgroundColor: activeTab2 === 'awardedQuotes' ? '#f8f9fa' : 'transparent',
                    color: activeTab2 === 'awardedQuotes' ? '#495057' : '#6c757d',
                    borderBottom:
                      activeTab2 === 'awardedQuotes'
                        ? '2px solid #4facfe'
                        : '2px solid transparent',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontWeight: activeTab2 === 'awardedQuotes' ? '600' : '400',
                    borderRadius: '8px 8px 0 0',
                  }}
                >
                  <i className="fas fa-handshake me-2"></i>
                  RFQ Quotes ({completedRfqTotalElements})
                </button>
                <button
                  className={`nav-link ${activeTab2 === 'completedOrders' ? 'active' : ''}`}
                  onClick={() => { setActiveTab2('completedOrders'); changeSubTabWithCleanUrl('tab2', 'completedOrders'); }}
                  type="button"
                  style={{
                    border: 'none',
                    backgroundColor: activeTab2 === 'completedOrders' ? '#f8f9fa' : 'transparent',
                    color: activeTab2 === 'completedOrders' ? '#495057' : '#6c757d',
                    borderBottom:
                      activeTab2 === 'completedOrders'
                        ? '2px solid #4facfe'
                        : '2px solid transparent',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontWeight: activeTab2 === 'completedOrders' ? '600' : '400',
                    borderRadius: '8px 8px 0 0',
                  }}
                >
                  <i className="fas fa-check-circle me-2"></i>
                  Completed PO ({completedPOTotalElements})
                </button>
              </div>
              <div className="tab-content">
                {activeTab2 === 'completedOrders' && (
                  <div className="tab-pane fade show active">
                    <div className="table-responsive">
                      {completedPOLoading ? (
                        <div className="text-center py-4">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        </div>
                      ) : approvedPOs.length > 0 ? (
                        <>
                          <BootstrapTable
                            data={sortedApprovedPOs}
                            striped
                            hover
                            condensed
                            tableHeaderClass="mb-0"
                            containerClass="clickable-rows"
                            pagination={completedPOTotalElements > completedPOPageSize}
                            remote
                            fetchInfo={{ dataTotalSize: completedPOTotalElements }}
                            options={completedPOOptions}
                          >
                            <TableHeaderColumn
                              isKey
                              dataField="orderNo"
                              dataAlign="center"
                              headerAlign="center"
                              width="10%"
                              dataFormat={(cell, row) => {
                                const orderNumber =
                                  cell || row.purchaseOrderNo || row.orderNumber || 'N/A';
                                return (
                                  <span
                                    style={{ cursor: 'pointer', color: 'rgb(0, 158, 251)' }}
                                    onClick={() => viewOrderDetails(row.purchaseOrderId, true)}
                                  >
                                    {orderNumber}
                                  </span>
                                );
                              }}
                              thStyle={{ cursor: 'pointer', userSelect: 'none' }}
                            >
                              <div
                                onClick={() => handleCompletedSort('orderNo')}
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <i className="bi bi-receipt me-1 text-primary"></i>Order No.
                                {renderCompletedSortIcon('orderNo')}
                              </div>
                            </TableHeaderColumn>

                            <TableHeaderColumn
                              dataField="approvalDecision"
                              dataAlign="center"
                              headerAlign="center"
                              dataFormat={(cell) => formatStatusWithIcon(cell)}
                              width="12%"
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bi bi-clipboard-check me-1 text-primary"></i>Status
                              </div>
                            </TableHeaderColumn>

                            <TableHeaderColumn
                              dataField="supplierName"
                              dataAlign="center"
                              headerAlign="center"
                              width="20%"
                              dataFormat={(cell) => {
                                if (!cell) return <span className="text-muted">-</span>;
                                const displayText = cell.length > 25 ? `${cell.substring(0, 25)}...` : cell;
                                return <span title={cell} style={{ fontSize: '13px' }}>{displayText}</span>;
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bi bi-building me-1 text-primary"></i>Supplier
                              </div>
                            </TableHeaderColumn>

                            <TableHeaderColumn
                              dataField="totalAmount"
                              dataAlign="center"
                              headerAlign="center"
                              width="12%"
                              dataFormat={(cell) => (
                                <span className="currency-value">
                                  {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }).format(cell || 0)}
                                </span>
                              )}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bi bi-currency-dollar me-1 text-primary"></i>Amount
                              </div>
                            </TableHeaderColumn>

                            <TableHeaderColumn
                              dataField="orderPlacedDate"
                              dataAlign="center"
                              headerAlign="center"
                              width="12%"
                              dataFormat={(cell) => (
                                <span style={{ fontSize: '13px' }}>
                                  {cell ? formatDate(cell) : '-'}
                                </span>
                              )}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bi bi-calendar-plus me-1 text-primary"></i>Created
                              </div>
                            </TableHeaderColumn>

                            <TableHeaderColumn
                              dataField="createdByName"
                              dataAlign="center"
                              headerAlign="center"
                              width="20%"
                              dataFormat={(cell) => {
                                if (!cell) return '-';
                                const creatorText = typeof cell === 'string' ? cell : String(cell);
                                const displayName =
                                  creatorText.length > 25
                                    ? `${creatorText.substring(0, 25)}...`
                                    : creatorText;

                                return (
                                  <span
                                    style={{ cursor: 'pointer', fontSize: '13px' }}
                                    onClick={(e) => handleTooltip(e, creatorText)}
                                  >
                                    {displayName}
                                  </span>
                                );
                              }}
                              thStyle={{ cursor: 'pointer', userSelect: 'none' }}
                            >
                              <div
                                onClick={() => handleCompletedSort('createdByName')}
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <i className="bi bi-person me-1 text-primary"></i>Created By {renderCompletedSortIcon('createdByName')}
                              </div>
                            </TableHeaderColumn>
                          </BootstrapTable>
                        </>
                      ) : (
                        <table className="table table-bordered mb-0">
                          <thead>
                            <tr>
                              <th>Order No.</th>
                              <th>Status</th>
                              <th>Supplier</th>
                              <th>Amount</th>
                              <th>Created</th>
                              <th>Created By</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td colSpan="6" className="text-center py-3">
                                There is no data to display
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
                {activeTab2 === 'awardedQuotes' && (
                  <div className="tab-pane fade show active">
                    <div className="table-responsive">
                      {completedRfqLoading ? (
                        <div className="text-center py-4">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        </div>
                      ) : finalizedRfq.length > 0 ? (
                        <>
                          <BootstrapTable
                            data={finalizedRfq}
                            striped
                            hover
                            condensed
                            tableHeaderClass="mb-0"
                            containerClass="clickable-rows"
                            pagination={completedRfqTotalElements > completedRfqPageSize}
                            remote
                            fetchInfo={{ dataTotalSize: completedRfqTotalElements }}
                            options={completedRfqOptions}
                          >
                            <TableHeaderColumn
                              isKey
                              dataField="rfqNumber"
                              dataAlign="center"
                              headerAlign="center"
                              width="12%"
                              dataFormat={(cell, row) => (
                                <span
                                  style={{
                                    cursor: 'pointer',
                                    color: 'rgb(0, 158, 251)',
                                    fontWeight: '600',
                                  }}
                                  onClick={() =>
                                    navigate(`/RfqApprovalDetails/${row.rfqId}`, {
                                      state: { fromDashboard: true },
                                    })
                                  }
                                >
                                  {cell || `RFQ-${row.rfqId}`}
                                </span>
                              )}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bi bi-hash me-1 text-primary"></i>RFQ #
                              </div>
                            </TableHeaderColumn>
                            <TableHeaderColumn
                              dataField="title"
                              dataAlign="center"
                              headerAlign="center"
                              width="20%"
                              dataFormat={(cell) => {
                                if (!cell) return <span className="text-muted">-</span>;
                                const truncated =
                                  cell.length > 20 ? `${cell.substring(0, 20)}...` : cell;
                                return <span title={cell} style={{ fontSize: '13px' }}>{truncated}</span>;
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bi bi-file-text me-1 text-primary"></i>Title
                              </div>
                            </TableHeaderColumn>
                            <TableHeaderColumn
                              dataField="createdBy"
                              dataAlign="center"
                              headerAlign="center"
                              width="18%"
                              dataFormat={(cell) => {
                                const fullName = cell
                                  ? `${cell.firstName || ''} ${cell.lastName || ''}`.trim()
                                  : 'Unknown';
                                const email = (cell && cell.email) || '';
                                const displayText = email ? `${fullName} (${email})` : fullName;
                                const truncatedText =
                                  displayText.length > 18
                                    ? `${displayText.substring(0, 18)}...`
                                    : displayText;

                                return (
                                  <span
                                    style={{ cursor: 'pointer', fontSize: '13px' }}
                                    onClick={(e) => handleTooltip(e, displayText)}
                                  >
                                    {truncatedText}
                                  </span>
                                );
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bi bi-person me-1 text-primary"></i>Created By
                              </div>
                            </TableHeaderColumn>
                            <TableHeaderColumn
                              dataField="submittedAt"
                              dataAlign="center"
                              headerAlign="center"
                              width="15%"
                              dataFormat={(cell) => (
                                <span style={{ fontSize: '13px' }}>{cell ? formatDate(cell) : '-'}</span>
                              )}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bi bi-calendar-check me-1 text-primary"></i>Submitted
                              </div>
                            </TableHeaderColumn>
                            <TableHeaderColumn
                              dataField="rfqStatus"
                              dataAlign="center"
                              headerAlign="center"
                              width="15%"
                              dataFormat={(cell) => {
                                const statusColors = {
                                  submitted: 'primary',
                                  created: 'warning',
                                  cancelled: 'danger',
                                  completed: 'success',
                                  supplier_shortlisted: 'info',
                                };
                                const color = statusColors[cell] || 'dark';
                                const displayText = cell
                                  ? cell.charAt(0).toUpperCase() + cell.slice(1)
                                  : 'Unknown';

                                return (
                                  <span
                                    className={`badge bg-${color}`}
                                    style={{
                                      fontSize: '11px',
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                      fontWeight: '500',
                                    }}
                                  >
                                    {displayText}
                                  </span>
                                );
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bi bi-flag me-1 text-primary"></i>Status
                              </div>
                            </TableHeaderColumn>
                          </BootstrapTable>
                        </>
                      ) : (
                        <table className="table table-bordered mb-0">
                          <thead>
                            <tr>
                              <th>RFQ #</th>
                              <th>Title</th>
                              <th>Created By</th>
                              <th>Submitted At</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td colSpan="5" className="text-center py-3">
                                There is no data to display
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
                {activeTab2 === 'approvedRequisitions' && (
                  <div className="tab-pane fade show active">
                    <div className="table-responsive">
                      {approvalCartLoading ? (
                        <div className="text-center py-4">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        </div>
                      ) : approvalCart.length > 0 ? (
                        <>
                          <BootstrapTable
                            data={sortedApprovalCart}
                            striped
                            hover
                            condensed
                            tableHeaderClass="mb-0"
                            containerClass="clickable-rows"
                            pagination={approvalCartTotalElements > approvalCartPageSize}
                            remote
                            fetchInfo={{ dataTotalSize: approvalCartTotalElements }}
                            options={approvalCartOptions}
                          >
                            <TableHeaderColumn
                              isKey
                              dataField="cartNo"
                              dataAlign="center"
                              headerAlign="center"
                              width="12%"
                              dataFormat={(cell, row) => {
                                const displayText = cell
                                  ? `${cell}`
                                  : row.rfq && row.rfq.title
                                    ? `${row.rfq.title}`
                                    : 'RFQ';

                                return (
                                  <span
                                    style={{ cursor: 'pointer', color: 'rgb(0, 158, 251)' }}
                                    data-field="cartId"
                                    onClick={() => handleNavigateCartApprovalDetails(row.cartId)}
                                  >
                                    {displayText}
                                  </span>
                                );
                              }}
                              thStyle={{ cursor: 'pointer', userSelect: 'none' }}
                            >
                              <div
                                onClick={() => handleApprovedReqSort('cartNo')}
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <i className="bi bi-cart me-1 text-primary"></i> Cart No
                                {renderApprovedReqSortIcon('cartNo')}
                              </div>
                            </TableHeaderColumn>
                            <TableHeaderColumn
                              dataField="approvalDecision"
                              dataFormat={(cell) => formatStatusWithIcon(cell)}
                              dataAlign="center"
                              headerAlign="center"
                              width="15%"
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bi bi-clipboard-check me-1 text-primary"></i>Status
                              </div>
                            </TableHeaderColumn>
                            <TableHeaderColumn
                              dataField="cartAmount"
                              dataAlign="center"
                              headerAlign="center"
                              width="12%"
                              dataFormat={(cell) => (
                                <span className="currency-value">
                                  {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }).format(cell || 0)}
                                </span>
                              )}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bi bi-currency-dollar me-1 text-primary"></i>Amount
                              </div>
                            </TableHeaderColumn>
                            <TableHeaderColumn
                              dataField="neededBy"
                              dataAlign="center"
                              headerAlign="center"
                              width="12%"
                              dataFormat={(cell) => (
                                <span style={{ fontSize: '13px' }}>
                                  {cell ? formatDate(cell) : '-'}
                                </span>
                              )}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bi bi-calendar-event me-1 text-primary"></i>Needed By
                              </div>
                            </TableHeaderColumn>
                            <TableHeaderColumn
                              dataField="createdDate"
                              dataAlign="center"
                              headerAlign="center"
                              width="12%"
                              dataFormat={(cell) => (
                                <span style={{ fontSize: '13px' }}>
                                  {cell ? formatDate(cell) : '-'}
                                </span>
                              )}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bi bi-calendar-plus me-1 text-primary"></i>Created
                              </div>
                            </TableHeaderColumn>
                            <TableHeaderColumn
                              dataField="createdBy"
                              dataAlign="center"
                              headerAlign="center"
                              width="15%"
                              dataFormat={(cell) => {
                                const formattedUser = formatUserFullNameWithEmail(cell) || '--';
                                const displayText =
                                  formattedUser.length > 15
                                    ? `${formattedUser.substring(0, 15)}...`
                                    : formattedUser;

                                return (
                                  <span
                                    style={{ cursor: 'pointer', fontSize: '13px' }}
                                    onClick={(e) => handleTooltip(e, formattedUser)}
                                  >
                                    {displayText}
                                  </span>
                                );
                              }}
                              thStyle={{ cursor: 'pointer', userSelect: 'none' }}
                            >
                              <div
                                onClick={() => handleApprovedReqSort('createdBy')}
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <i className="bi bi-person me-1 text-primary"></i>Created By {renderApprovedReqSortIcon('createdBy')}
                              </div>
                            </TableHeaderColumn>
                          </BootstrapTable>
                        </>
                      ) : (
                        <table className="table table-bordered mb-0">
                          <thead>
                            <tr>
                              <th>Cart No</th>
                              <th>Status</th>
                              <th>Amount</th>
                              <th>Needed By</th>
                              <th>Created</th>
                              <th>Created By</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td colSpan="6" className="text-center py-3">
                                There is no data to display
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
      {announcements.length > 0 && (
        <div className={`announcement-panel ${showAnnouncements ? 'show' : ''}`}>
          <div
            style={{
              padding: '10px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8f9fa',
            }}
          >
            <h6 style={{ margin: 0, fontSize: '12px' }}>Announcements ({announcements.length})</h6>
            <Button
              onClick={() => setShowAnnouncements(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                color: '#6c757d',
              }}
            >
              ×
            </Button>
          </div>
          <div style={{ padding: '10px', maxHeight: '270px' }}>
            {announcements.map((announcement) => (
              <div
                key={announcement.announcementId}
                style={{
                  marginBottom: '8px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #eee',
                }}
              >
                <h6 className="announcement-head">{announcement.title}</h6>
                <p className="announcement-paragraph">{announcement.body}</p>
                {announcement.date && (
                  <small className="text-muted" style={{ fontSize: '12px' }}>
                    {new Date(announcement.date).toLocaleString()}
                  </small>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {announcements.length > 0 && (
        <div
          className="floating-toggle-button"
          onClick={handleToggleAnnouncements}
          title={showAnnouncements ? 'Hide announcements' : 'Show announcements'}
        >
          <TfiAnnouncement size={18} />
          {unreadCount > 0 && <span className="announcemnt-badge">{unreadCount}</span>}
        </div>
      )}
      {/* ChatBot Component - Only visible on Dashboard */}
      <ChatBot />
    </div>
  );
};

export default Classic;
