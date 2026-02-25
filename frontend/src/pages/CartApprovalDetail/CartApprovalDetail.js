import { useState, useEffect } from 'react';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Tooltip, Card, CardBody, Pagination, PaginationItem, PaginationLink, Spinner } from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import { FaDownload } from 'react-icons/fa';
import 'react-toastify/dist/ReactToastify.css';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getEntityId,
  getUserId,
  getUserName,
  parseQueries,
  formatDate,
  getExtensionFromContentType,
} from '../localStorageUtil';
import CartService from '../../services/CartService';
import ProjectService from '../../services/ProjectService';
import LocationService from '../../services/LocationService';
import SupplierService from '../../services/SupplierService';
import GLAccountService from '../../services/GLaccountService';
import ClassService from '../../services/ClassService';
import DepartmentService from '../../services/DepartmentService';
import ApprovalsService from '../../services/ApprovalsService';
import ApprovalPolicyManagementService from '../../services/ApprovalPolicyManagementService';
import ApproverService from '../../services/ApproverService';
import CompanyService from '../../services/CompanyService';
import PurchaseOrderService from '../../services/PurchaseOrderService';
import QueryModal from '../QueryModal/QueryModal';
import FileUploadService from '../../services/FileUploadService';
import MarkResolvedModal from '../QueryModal/MarkResolvedModal';

const CartApprovalDetail = () => {
  const { cartId } = useParams();
  const approverId = getUserId();
  const companyId = getEntityId();
  const userName = getUserName();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [cartDetails, setCartDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [locations, setLocations] = useState([]);
  const [suppliers, setSuppliers] = useState({});
  const [glAccounts, setGlAccounts] = useState([]);
  const [department, setDepartment] = useState([]);
  const [classes, setClasses] = useState([]);
  const [settings, setSettings] = useState({
    gLAccountEnabled: '',
    departmentEnabled: '',
    projectEnabled: '',
    locationEnabled: '',
    classEnabled: '',
  });

  const [previousQueries, setPreviousQueries] = useState([]);
  const [queryModalOpen, setQueryModalOpen] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [uploadedFileId, setUploadedFileId] = useState(null);
  const [isQueryRaised, setIsQueryRaised] = useState(false);
  const [isResolvedModalOpen, setResolvedModalOpen] = useState(false);
  const [openTooltipId, setOpenTooltipId] = useState(null);

  // PO Details Modal state
  const [showPOModal, setShowPOModal] = useState(false);
  const [poCurrentPage, setPoCurrentPage] = useState(0);
  const [poTotalElements, setPoTotalElements] = useState(0);
  const [poLoading, setPoLoading] = useState(false);
  const [modalPurchaseOrders, setModalPurchaseOrders] = useState([]);
  const poPageSize = 10; // Orders per page

  // Shipping Address state
  const [shippingAddress, setShippingAddress] = useState(null);

  const toggle = (id) => {
    setOpenTooltipId((currentId) => (currentId === id ? null : id));
  };

  const toggleResolvedModal = () => setResolvedModalOpen(!isResolvedModalOpen);


  const closeQueryModal = () => {
    setQueryModalOpen(false);
    setQueryInput('');
  };
  const [approvalNotes, setApprovalNotes] = useState('');

  const [documentId, setDocumentId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [showRestartConfirmModal, setShowRestartConfirmModal] = useState(false);

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

  const fetchCartDetails = async () => {
    try {
      setLoading(true);

      // Fetch cart header information using paginated API
      const cartHeaderResponse = await CartService.getCartsPaginated(companyId, 1, 0, '', '', cartId);
      // Extract from paginated response structure or legacy structure
      const responseData = cartHeaderResponse.data && cartHeaderResponse.data.content ? cartHeaderResponse.data.content : (cartHeaderResponse.data || []);
      const cartHeaderData = responseData && responseData.length > 0 ? responseData[0] : null;
      setCart(cartHeaderData);

      // Fetch cart details (items) using getCartDetailById
      const cartDetailsResponse = await CartService.getCartDetailById(cartId, companyId);
      const details = cartDetailsResponse.data || [];
      setCartDetails(details);

      // Fetch shipping address if cart has shipToAddressId
      if (cartHeaderData && cartHeaderData.shipToAddressId) {
        try {
          const addressResponse = await CompanyService.getAddressCompanyByAddressId(companyId, cartHeaderData.shipToAddressId);
          setShippingAddress(addressResponse.data);
        } catch (error) {
          console.error('Error fetching shipping address:', error);
        }
      }

      const supplierPromises = details.map(async (item) => {
        if (item.supplierId) {
          try {
            const supplierResponse = await SupplierService.getSupplierById(item.supplierId);
            const supplierData = Array.isArray(supplierResponse.data)
              ? supplierResponse.data[0]
              : supplierResponse.data;
            return { supplierId: item.supplierId, name: supplierData && supplierData.name ? supplierData.name : 'N/A' };
          } catch (error) {
            console.error(`Error fetching supplier ${item.supplierId}:`, error);
            return { supplierId: item.supplierId, name: 'N/A' };
          }
        }
        return { supplierId: item.supplierId, name: 'N/A' };
      });

      const supplierResults = await Promise.all(supplierPromises);
      const supplierMap = supplierResults.reduce((acc, { supplierId, name }) => {
        acc[supplierId] = name;
        return acc;
      }, {});
      setSuppliers(supplierMap);
    } catch (error) {
      console.error('Error fetching cart details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await ProjectService.getAllProjects(companyId);
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await LocationService.getAllLocation(companyId);
      setLocations(response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchGLAccounts = async () => {
    try {
      const response = await GLAccountService.getAllGLAccount(companyId);
      setGlAccounts(response.data);
    } catch (error) {
      console.error('Error fetching GL accounts:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await ClassService.getAllClass(companyId);
      setClasses(response.data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await DepartmentService.getAllDepartment(companyId);
      if (response && response.data) {
        setDepartment(response.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchApprovals = async () => {
    try {
      const response = await ApprovalPolicyManagementService.getApprovalFlow(
        companyId,
        'indent',
        cartId,
      );
      const approvalsData = response.data || [];
      setApprovals(approvalsData);
    } catch (error) {
      console.error('Error fetching approvals:', error);
      toast.dismiss();
      toast.error('Failed to load approval details');
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
        console.log(parsedQueries);
      } else {
        setPreviousQueries([]);
      }
    } catch (error) {
      console.error('Error fetching cart details:', error);
      toast.dismiss();
      toast.error('Failed to load cart details');
    }
  };

  useEffect(() => {
    fetchCartDetails();
    fetchProjects();
    fetchLocations();
    fetchGLAccounts();
    fetchDepartments();
    fetchClasses();
    fetchApprovals();
    fetchCartQueries();
  }, [cartId]);

  const getProjectName = (projectId) => {
    const project = projects.find((proj) => proj.projectId === projectId);
    return project && project.name ? project.name : 'N/A';
  };
  const getLocationName = (locationId) => {
    const location = locations.find((loc) => loc.locationId === locationId);
    return location && location.name ? location.name : 'N/A';
  };
  const getGLAccountName = (glAccountId) => {
    const glAccount = glAccounts.find((gl) => gl.glAccountId === glAccountId);
    return glAccount && glAccount.name ? glAccount.name : 'N/A';
  };
  const getClassName = (classId) => {
    const classItem = classes.find((cls) => cls.classId === classId);
    return classItem && classItem.name ? classItem.name : 'N/A';
  };
  const getDepartmentName = (departmentId) => {
    const dept = department.find((cls) => cls.departmentId === departmentId);
    return dept && dept.name ? dept.name : 'N/A';
  };

  const handleApprove = () => {
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

      const FileId = response.data.fileId;
      setDocumentId(FileId);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.dismiss();
      toast.error((error.response && error.response.data && error.response.data.message) || 'Failed to upload file');
    }
  };

  const handleBack = () => navigate('/dashboard');

  const getCurrentUserApproval = () =>
    approvals.find(
      (approval) => approval.approvalDecision === 'pending' && approval.user.userId === approverId,
    );

  const handleSubmitQuery = async () => {
    if (!queryInput.trim()) {
      toast.dismiss();
      toast.error('Please enter a query before submitting');
      return;
    }

    try {
      const currentApproval = getCurrentUserApproval();
      if (!currentApproval) {
        toast.dismiss();
        toast.error('No pending approval found for your user');
        return;
      }
      const formattedQuery = `${queryInput} ${uploadedFileId ? `[FileId: ${uploadedFileId}]` : ''}`;
      const user = {
        userId: approverId,
        firstName: userName,
      };

      const requestBody = {
        isQueryRaised: true,
        queries: formattedQuery,
        user,
      };

      const response = await ApprovalPolicyManagementService.handleUpdateQuery(
        requestBody,
        companyId,
        cartId,
      );

      if (response.status === 200) {
        toast.dismiss();
        setIsQueryRaised(true);
        toast.success('Query submitted successfully!');
        await fetchCartQueries();
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

  const handleMarkAsResolved = async (note) => {
    const user = {
      userId: approverId,
      firstName: userName,
    };

    const formattedQuery = note ? `${note} - Resolved by ${userName}` : `Resolved by ${userName}`;

    const requestBody = {
      isQueryRaised: false,
      queries: formattedQuery,
      user,
      queryResolverId: approverId,
    };

    try {
      const response = await ApprovalPolicyManagementService.handleUpdateQuery(
        requestBody,
        companyId,
        cartId,
      );

      if (response.status === 200) {
        setIsQueryRaised(false);
        await fetchCartQueries();
        toast.success('Query marked as resolved!');
        closeQueryModal();
        fetchApprovals();
      } else {
        toast.error('Failed to mark query as resolved.');
      }
    } catch (error) {
      console.error('Failed to mark query as resolved:', error);
      toast.error('Failed to resolve query');
    }
  };

  const hasPendingPreviousApprovals = () => {
    const currentApproval = getCurrentUserApproval();
    if (!currentApproval) return false;
    const currentOrderIndex = approvals.findIndex(
      (approval) => approval.orderOfApproval === currentApproval.orderOfApproval,
    );

    for (let i = 0; i < currentOrderIndex; i++) {
      if (approvals[i].approvalDecision === 'pending' || approvals[i].approvalDecision === 'rejected') {
        return true;
      }
    }
    return false;
  };

  const currentApproval = getCurrentUserApproval();
  const isPending = !!currentApproval;
  const hasPreviousPending = hasPendingPreviousApprovals();
  const isApproveEnabled = isPending && !hasPreviousPending && !isQueryRaised;
  const isRejectEnabled = isPending && !hasPreviousPending && !isQueryRaised;
  const disableResolveBtn = !isQueryRaised || (cart && cart.cartStatusType === 'DRAFT');

  const approveButtonStyle = isApproveEnabled
    ? {}
    : {
      cursor: 'not-allowed',
      opacity: 0.5,
      backgroundColor: 'transparent',
      borderColor: 'darkgrey',
      color: 'darkgrey',
    };
  const rejectButtonStyle = isRejectEnabled
    ? {}
    : {
      cursor: 'not-allowed',
      opacity: 0.5,
      backgroundColor: 'transparent',
      borderColor: 'darkgrey',
      color: 'darkgrey',
    };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="text-center">
          <div className="spinner-border" role="status" style={{ width: '3rem', height: '3rem', color: '#009efb' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading cart approval details...</p>
        </div>
      </div>
    );
  }

  if (!cart) {
    return (
      <Card className="shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
        <CardBody className="text-center py-5">
          <i className="bi bi-exclamation-triangle" style={{ fontSize: '48px', color: '#ffc107' }}></i>
          <h5 className="mt-3 mb-2">Cart Not Found</h5>
          <p className="text-muted mb-3">The requested cart approval details could not be found.</p>
          <Button
            className="btn-gradient-primary"
            onClick={handleBack}
            style={{
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
              border: 'none',
              color: 'white',
              boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
              padding: '10px 20px',
              fontWeight: '500'
            }}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Go Back
          </Button>
        </CardBody>
      </Card>
    );
  }

  const handleFileUploadSuccess = (fileId) => {
    setUploadedFileId(fileId);
  };

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
          firstName: getUserName(),
        },
        documentId,
      };
      const response = await ApprovalsService.handleApproverCartApprove(
        requestBody,
        companyId,
        cartId,
      );
      if (response.status === 200) {
        toast.success(`${actionType === 'approve' ? 'Approval' : 'Rejection'} Successful`);
        fetchCartDetails();
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (error) {
      console.error(`Error ${actionType === 'approve' ? 'approving' : 'rejecting'} cart:`, error);
      const errorMessage = (error.response && error.response.data && error.response.data.errorMessage) || 'An unexpected error occurred';
      toast.error(errorMessage);
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

  // Fetch paginated purchase orders for the modal
  const fetchPaginatedPurchaseOrders = async (pageNumber = 0) => {
    try {
      setPoLoading(true);
      console.log('Fetching PO with cartId:', cartId, 'pageNumber:', pageNumber);

      const response = await PurchaseOrderService.getPurchaseOrderDetailsByCartId(
        companyId,
        cartId,
        poPageSize,
        pageNumber
      );

      console.log('PO API Response:', response.data);
      console.log('Sample PO object:', response.data.content ? response.data.content[0] : response.data[0]);

      // Handle paginated response structure
      if (response.data && response.data.content && response.data.content.length > 0) {
        setModalPurchaseOrders(response.data.content);
        setPoCurrentPage(response.data.pageNumber || pageNumber);
        setPoTotalElements(response.data.totalElements || response.data.content.length);
      } else if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Fallback for direct array response
        setModalPurchaseOrders(response.data);
        setPoCurrentPage(pageNumber);
        setPoTotalElements(response.data.length);
      } else {
        console.log('No purchase orders found for cartId:', cartId);
        setModalPurchaseOrders([]);
        setPoCurrentPage(0);
        setPoTotalElements(0);
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      console.error('CartId:', cartId, 'CompanyId:', companyId);
      toast.error('Failed to load purchase orders');
      setModalPurchaseOrders([]);
      setPoCurrentPage(0);
      setPoTotalElements(0);
    } finally {
      setPoLoading(false);
    }
  };

  const handleViewPODetails = async () => {
    if (cart && cart.cartStatusType === 'POGENERATED') {
      setShowPOModal(true);
      // Load the first page of paginated purchase orders
      await fetchPaginatedPurchaseOrders(0);
    } else {
      console.log('No purchase orders available or cart not in POGENERATED status');
    }
  };

  const handleRestartApproval = async () => {
    try {
      const requestBody = {};
      await ApproverService.handleApproverCartRestart(requestBody, companyId, cartId);
      toast.success('Cart approval process has been restarted successfully!');

      // Refresh page or navigate away
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error restarting approval:', error);
      if (error.response && error.response.data && error.response.data.errorMessage) {
        toast.error(error.response.data.errorMessage);
      } else {
        toast.error('Failed to restart approval process');
      }
    }
  };


  return (
    <div style={{ padding: '20px 0' }}>
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

      {/* Header Section */}
      <div
        className="d-flex align-items-center justify-content-between mb-3"
        style={{ marginTop: '10px' }}
      >
        <div className="d-flex align-items-baseline gap-3">
          <h4 className="mb-0" style={{ color: '#009efb', fontWeight: '600' }}>
            Cart Approval Details
          </h4>
          <span className="text-muted" style={{ fontSize: '14px', fontWeight: '500' }}>
            ({cartDetails.length} item{cartDetails.length !== 1 ? 's' : ''})
          </span>
          <span className="fw-bold" style={{ color: '#009efb', fontSize: '16px' }}>
            <i className="bi bi-calculator me-1"></i>
            Total: $
            {cartDetails
              .reduce((sum, item) => sum + item.qty * item.price, 0)
              .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="d-flex align-items-center gap-2">
          {cart && cart.cartStatusType === 'POGENERATED' && (
            <Button
              color="outline-primary"
              size="sm"
              style={{ fontSize: '12px', padding: '6px 16px', borderRadius: '6px' }}
              onClick={handleViewPODetails}
            >
              <i className="bi bi-eye me-1"></i>
              View PO Details
            </Button>
          )}

          {cart && cart.cartStatusType === 'REJECTED' && (
            <Button
              color="warning"
              size="sm"
              style={{ fontSize: '12px', padding: '6px 16px', borderRadius: '6px' }}
              onClick={() => setShowRestartConfirmModal(true)}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Restart Approval
            </Button>
          )}

          <Button
            className="me-2 btn-gradient-success"
            onClick={() => setResolvedModalOpen(true)}
            disabled={!isQueryRaised}
            style={{
              fontSize: '13px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
              border: 'none',
              color: 'white',
              boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)',
              padding: '6px 16px',
              fontWeight: '500',
            }}
          >
            <i className="bi bi-check-circle me-1"></i>
            Mark as Resolved
          </Button>
          <Button
            className="me-2 btn-gradient-primary"
            onClick={handleApprove}
            disabled={!isApproveEnabled}
            style={{
              ...approveButtonStyle,
              fontSize: '13px',
              borderRadius: '8px',
              background: isApproveEnabled
                ? 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)'
                : 'transparent',
              border: 'none',
              color: isApproveEnabled ? 'white' : 'darkgrey',
              boxShadow: isApproveEnabled ? '0 4px 15px rgba(0, 158, 251, 0.3)' : 'none',
              padding: '6px 16px',
              fontWeight: '500',
            }}
          >
            <i className="bi bi-check-lg me-1"></i>
            Approve
          </Button>
          <Button
            className="me-2 btn-gradient-danger"
            onClick={handleReject}
            disabled={!isRejectEnabled}
            style={{
              ...rejectButtonStyle,
              fontSize: '13px',
              borderRadius: '8px',
              background: isRejectEnabled
                ? 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)'
                : 'transparent',
              border: 'none',
              color: isRejectEnabled ? 'white' : 'darkgrey',
              boxShadow: isRejectEnabled ? '0 4px 15px rgba(220, 53, 69, 0.3)' : 'none',
              padding: '6px 16px',
              fontWeight: '500',
            }}
          >
            <i className="bi bi-x-circle me-1"></i>
            Reject
          </Button>
          <Button
            className="me-2 btn-gradient-warning"
            onClick={() => setQueryModalOpen(true)}
            disabled={!isPending}
            style={{
              fontSize: '13px',
              borderRadius: '8px',
              background: isPending
                ? 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)'
                : 'transparent',
              border: 'none',
              color: isPending ? 'white' : 'darkgrey',
              boxShadow: isPending ? '0 4px 15px rgba(255, 193, 7, 0.3)' : 'none',
              padding: '6px 16px',
              fontWeight: '500',
              cursor: isPending ? 'pointer' : 'not-allowed',
              opacity: isPending ? 1 : 0.5,
            }}
          >
            <i className="bi bi-question-circle me-1"></i>
            Have a Query?
          </Button>
          <Button
            className="btn-gradient-secondary"
            onClick={handleBack}
            style={{
              fontSize: '13px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)',
              border: 'none',
              color: 'white',
              boxShadow: '0 4px 15px rgba(108, 117, 125, 0.3)',
              padding: '6px 16px',
              fontWeight: '500',
            }}
          >
            <i className="bi bi-arrow-left me-1"></i>
            Back
          </Button>
        </div>
      </div>
      <Card
        className="mb-2 shadow-sm"
        style={{
          borderRadius: '12px',
          border: 'none',
          background: 'linear-gradient(145deg, #ffffff, #f8fbff)',
        }}
      >
        <div className="p-4">
          <div className="row">
            {/* Cart Information - Left Side */}
            <div className="col-lg-3">
              <div className="mb-3">
                <h4
                  className="mb-3 d-flex align-items-center"
                  style={{ color: '#009efb', fontWeight: '700' }}
                >
                  <i className="bi bi-clipboard-check me-2" style={{ fontSize: '24px' }}></i>
                  {cart.cartName || 'Cart Approval'}
                </h4>

                <div className="mb-2">
                  <div className="d-flex align-items-center mb-2">
                    <span
                      className="text-muted me-2"
                      style={{ fontSize: '14px', minWidth: '60px' }}
                    >
                      Cart No.
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>
                      {cart && cart.cartNo ? cart.cartNo : 'N/A'}
                    </span>
                  </div>
                  <div className="d-flex align-items-center mb-2">
                    <span
                      className="text-muted me-2"
                      style={{ fontSize: '14px', minWidth: '60px' }}
                    >
                      Status:
                    </span>
                    <span
                      className="badge bg-warning text-dark"
                      style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '6px' }}
                    >
                      {cart && cart.cartStatusType
                        ? cart.cartStatusType.toUpperCase()
                        : cart && cart.cartStatus
                          ? cart.cartStatus.toUpperCase()
                          : 'PENDING APPROVAL'}
                    </span>
                  </div>

                  <div className="d-flex align-items-center mb-2">
                    <span
                      className="text-muted me-2"
                      style={{ fontSize: '14px', minWidth: '60px' }}
                    >
                      Created By:
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>
                      <i className="bi bi-person-circle me-1" style={{ color: '#009efb' }}></i>
                      {cart && cart.createdBy && cart.createdBy.firstName && cart.createdBy.lastName
                        ? `${cart.createdBy.firstName} ${cart.createdBy.lastName}`
                        : 'N/A'}
                    </span>
                  </div>

                  {cart && cart.createdDate && (
                    <div className="d-flex align-items-center mb-2">
                      <span
                        className="text-muted me-2"
                        style={{ fontSize: '14px', minWidth: '60px' }}
                      >
                        Created:
                      </span>
                      <span style={{ fontSize: '13px', color: '#6c757d' }}>
                        <i className="bi bi-calendar3 me-1" style={{ color: '#009efb' }}></i>
                        {new Date(cart.createdDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(cart.createdDate).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}

                  {cart && cart.submittedBy && (
                    <div className="d-flex align-items-center mb-2">
                      <span
                        className="text-muted me-2"
                        style={{ fontSize: '14px', minWidth: '60px' }}
                      >
                        Submitted By:
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>
                        <i className="bi bi-send-check me-1" style={{ color: '#28a745' }}></i>
                        {cart.submittedBy.firstName && cart.submittedBy.lastName
                          ? `${cart.submittedBy.firstName} ${cart.submittedBy.lastName}`
                          : 'N/A'}
                      </span>
                    </div>
                  )}

                  {cart && cart.submittedDate && (
                    <div className="d-flex align-items-center mb-2">
                      <span
                        className="text-muted me-2"
                        style={{ fontSize: '14px', minWidth: '60px' }}
                      >
                        Submitted:
                      </span>
                      <span style={{ fontSize: '13px', color: '#6c757d' }}>
                        <i className="bi bi-calendar-check me-1" style={{ color: '#28a745' }}></i>
                        {new Date(cart.submittedDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(cart.submittedDate).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}

                  {cart && cart.needBy && (
                    <div className="d-flex align-items-center mb-2">
                      <span
                        className="text-muted me-2"
                        style={{ fontSize: '14px', minWidth: '60px' }}
                      >
                        Needed By:
                      </span>
                      <span style={{ fontSize: '13px', color: '#6c757d' }}>
                        <i className="bi bi-calendar-check me-1" style={{ color: '#009efb' }}></i>
                        {formatDate(cart.needBy)}
                      </span>
                    </div>
                  )}

                  {cart && cart.purchaseType && (
                    <div className="d-flex align-items-center mb-2">
                      <span
                        className="text-muted me-2"
                        style={{ fontSize: '14px', minWidth: '60px' }}
                      >
                        Type:
                      </span>
                      <span
                        className="badge bg-secondary"
                        style={{
                          fontSize: '11px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          color: 'white',
                        }}
                      >
                        {cart.purchaseType}
                      </span>
                    </div>
                  )}

                  {cart && cart.cartAmount && (
                    <div className="d-flex align-items-center mb-2">
                      <span
                        className="text-muted me-2"
                        style={{ fontSize: '14px', minWidth: '60px' }}
                      >
                        Amount:
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#198754' }}>
                        <i className="bi bi-currency-dollar me-1" style={{ color: '#198754' }}></i>
                        {cart.cartAmount.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Information - Center */}
            <div className="col-lg-4 d-flex">
              <div
                style={{
                  background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
                  borderRadius: '10px',
                  padding: '16px',
                  height: '100%',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div className="d-flex align-items-center mb-3">
                  <i
                    className="bi bi-info-circle me-2"
                    style={{ color: '#009efb', fontSize: '16px' }}
                  ></i>
                  <h6
                    className="mb-0"
                    style={{ color: '#009efb', fontWeight: '600', fontSize: '14px' }}
                  >
                    Additional Information
                  </h6>
                </div>
                {settings.classEnabled ||
                  settings.locationEnabled ||
                  settings.projectEnabled ||
                  settings.gLAccountEnabled ||
                  settings.departmentEnabled ? (
                  <table
                    style={{
                      fontSize: '0.85rem',
                      backgroundColor: 'transparent',
                      width: '100%',
                      borderCollapse: 'separate',
                      borderSpacing: '0',
                    }}
                  >
                    <tbody>
                      {settings.departmentEnabled && (
                        <tr>
                          <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                            <small className="text-muted">Department:</small>
                          </td>
                          <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                            <strong style={{ color: '#212529', fontSize: '13px' }}>
                              {getDepartmentName(cart.departmentId)}
                            </strong>
                          </td>
                        </tr>
                      )}

                      {settings.gLAccountEnabled && (
                        <tr>
                          <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                            <small className="text-muted">GL Account:</small>
                          </td>
                          <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                            <strong style={{ color: '#212529', fontSize: '13px' }}>
                              {getGLAccountName(cart.glAccountId)}
                            </strong>
                          </td>
                        </tr>
                      )}

                      {settings.projectEnabled && (
                        <tr>
                          <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                            <small className="text-muted">Project:</small>
                          </td>
                          <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                            <strong style={{ color: '#212529', fontSize: '13px' }}>
                              {getProjectName(cart.projectId)}
                            </strong>
                          </td>
                        </tr>
                      )}

                      {settings.classEnabled && (
                        <tr>
                          <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                            <small className="text-muted">Class:</small>
                          </td>
                          <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                            <strong style={{ color: '#212529', fontSize: '13px' }}>
                              {getClassName(cart.classId)}
                            </strong>
                          </td>
                        </tr>
                      )}

                      {settings.locationEnabled && (
                        <tr>
                          <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                            <small className="text-muted">Location:</small>
                          </td>
                          <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                            <strong style={{ color: '#212529', fontSize: '13px' }}>
                              {getLocationName(cart.locationId)}
                            </strong>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-muted" style={{ fontSize: '13px' }}>
                    No additional information configured
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Address - Right */}
            <div className="col-lg-4 d-flex">
              <div
                className="shipping-section"
                style={{
                  background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
                  borderRadius: '10px',
                  padding: '16px',
                  height: '100%',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div className="d-flex align-items-center mb-3">
                  <i
                    className="bi bi-geo-alt-fill me-2"
                    style={{ color: '#009efb', fontSize: '16px' }}
                  ></i>
                  <h6
                    className="mb-0"
                    style={{ color: '#009efb', fontWeight: '600', fontSize: '14px' }}
                  >
                    Shipping Address
                  </h6>
                </div>
                {shippingAddress ? (
                  <div className="address-content" style={{ lineHeight: '1.5', fontSize: '13px' }}>
                    <div style={{ fontWeight: '500', color: '#2c3e50', marginBottom: '4px' }}>
                      {shippingAddress.addressLine1}
                    </div>
                    {shippingAddress.addressLine2 && (
                      <div style={{ color: '#34495e', marginBottom: '4px' }}>
                        {shippingAddress.addressLine2}
                      </div>
                    )}
                    <div style={{ color: '#34495e', marginBottom: '4px' }}>
                      {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
                    </div>
                    {shippingAddress.country && (
                      <div style={{ color: '#34495e', marginBottom: '8px' }}>
                        {shippingAddress.country}
                      </div>
                    )}
                    {(shippingAddress.phoneNumber || shippingAddress.email) && (
                      <div
                        style={{
                          borderTop: '1px solid #dee2e6',
                          paddingTop: '8px',
                          marginTop: '8px',
                        }}
                      >
                        {shippingAddress.phoneNumber && (
                          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>
                            <i className="bi bi-telephone me-1"></i>
                            {shippingAddress.phoneNumber}
                          </div>
                        )}
                        {shippingAddress.email && (
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>
                            <i className="bi bi-envelope me-1"></i>
                            {shippingAddress.email}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-muted" style={{ fontSize: '13px' }}>
                    No shipping address configured
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Row */}
      <div className="row">
        {/* Cart Items Section - Left Side */}
        <div className="col-lg-8">
          {Object.entries(
            cartDetails.reduce((groups, item) => {
              const supplierId = item.supplierId || 'unknown';
              if (!groups[supplierId]) {
                groups[supplierId] = [];
              }
              groups[supplierId].push(item);
              return groups;
            }, {}),
          ).map(([supplierId, items]) => {
            const supplierName = suppliers[supplierId] || 'Unknown Supplier';
            const orderValue = items.reduce((sum, item) => sum + item.qty * item.price, 0);
            const lineItemCount = items.length;

            return (
              <Card
                key={`supplier-${supplierId}`}
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
                        <span className="fw-bold" style={{ color: '#198754', fontSize: '14px' }}>
                          $
                          {orderValue.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    {items.map((item) => (
                      <div key={`item-${item.cartDetailId}`} className="col-md-12 mb-3">
                        <div
                          className="border rounded p-3"
                          style={{
                            borderRadius: '8px',
                            backgroundColor: '#fafafa',
                            border: '1px solid #e0e0e0',
                            position: 'relative',
                          }}
                        >
                          <div className="row align-items-start">
                            {/* Image Column */}
                            <div
                              className="col-md-2 col-xs-4 d-flex flex-column align-items-center justify-content-between"
                              style={{ height: '100%' }}
                            >
                              <div style={{ width: '80px', height: '80px' }}>
                                <img
                                  src={
                                    (item.catalogItemId && item.catalogItemId.ProductImageURL) ||
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
                                />
                              </div>
                            </div>

                            {/* Product Info Column */}
                            <div className="col-md-4 col-xs-9 justify-content-start">
                              <div className="mb-3">
                                <div className="description-wrapper">
                                  <h6 className="mb-1" style={{ color: '#000', fontWeight: '600' }}>
                                    {item.partDescription || 'Product Description'}
                                  </h6>
                                </div>
                              </div>
                              <div className="d-flex flex-column gap-1 mt-2">
                                <div className="d-flex align-items-center">
                                  <span
                                    className="text-muted me-2"
                                    style={{ fontSize: '13px', minWidth: '80px' }}
                                  >
                                    Part ID:
                                  </span>
                                  <span style={{ fontSize: '13px', color: '#000' }}>
                                    {item.partId}
                                  </span>
                                </div>
                                <div className="d-flex align-items-center">
                                  <span
                                    className="text-muted me-2"
                                    style={{ fontSize: '13px', minWidth: '80px' }}
                                  >
                                    Unit:
                                  </span>
                                  <span style={{ fontSize: '13px', color: '#000' }}>
                                    {item.unitOfMeasurement || 'Piece'}
                                  </span>
                                </div>
                                <div className="d-flex align-items-center">
                                  <span
                                    className="text-muted me-2"
                                    style={{ fontSize: '13px', minWidth: '80px' }}
                                  >
                                    Quantity:
                                  </span>
                                  <span
                                    style={{ fontSize: '13px', fontWeight: '500', color: '#000' }}
                                  >
                                    {item.qty}
                                  </span>
                                </div>
                                <div className="d-flex align-items-center">
                                  <span
                                    className="text-muted me-2"
                                    style={{ fontSize: '13px', minWidth: '80px' }}
                                  >
                                    Unit Price:
                                  </span>
                                  <span
                                    style={{ fontSize: '13px', fontWeight: '500', color: '#000' }}
                                  >
                                    $
                                    {item.price.toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </span>
                                </div>
                                <div className="d-flex align-items-center">
                                  <span
                                    className="text-muted me-2"
                                    style={{ fontSize: '13px', minWidth: '80px' }}
                                  >
                                    Total:
                                  </span>
                                  <span
                                    style={{ fontSize: '14px', fontWeight: '600', color: '#000' }}
                                  >
                                    $
                                    {(item.qty * item.price).toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Account Settings Column */}
                            <div className="col-md-6 col-xs-12">
                              <table
                                style={{
                                  fontSize: '0.85rem',
                                  backgroundColor: 'transparent',
                                  width: '100%',
                                  borderCollapse: 'separate',
                                  borderSpacing: '0',
                                }}
                              >
                                <tbody>
                                  {settings.departmentEnabled && (
                                    <tr>
                                      <td
                                        style={{
                                          padding: '4px 0',
                                          width: '35%',
                                          verticalAlign: 'top',
                                        }}
                                      >
                                        <small className="text-muted">Department:</small>
                                      </td>
                                      <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                                        <strong style={{ color: '#212529', fontSize: '13px' }}>
                                          {getDepartmentName(item.departmentId)}
                                        </strong>
                                      </td>
                                    </tr>
                                  )}

                                  {settings.gLAccountEnabled && (
                                    <tr>
                                      <td
                                        style={{
                                          padding: '4px 0',
                                          width: '35%',
                                          verticalAlign: 'top',
                                        }}
                                      >
                                        <small className="text-muted">GL Account:</small>
                                      </td>
                                      <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                                        <strong style={{ color: '#212529', fontSize: '13px' }}>
                                          {getGLAccountName(item.glAccountId)}
                                        </strong>
                                      </td>
                                    </tr>
                                  )}

                                  {settings.projectEnabled && (
                                    <tr>
                                      <td
                                        style={{
                                          padding: '4px 0',
                                          width: '35%',
                                          verticalAlign: 'top',
                                        }}
                                      >
                                        <small className="text-muted">Project:</small>
                                      </td>
                                      <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                                        <strong style={{ color: '#212529', fontSize: '13px' }}>
                                          {getProjectName(item.projectId)}
                                        </strong>
                                      </td>
                                    </tr>
                                  )}

                                  {settings.classEnabled && (
                                    <tr>
                                      <td
                                        style={{
                                          padding: '4px 0',
                                          width: '35%',
                                          verticalAlign: 'top',
                                        }}
                                      >
                                        <small className="text-muted">Class:</small>
                                      </td>
                                      <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                                        <strong style={{ color: '#212529', fontSize: '13px' }}>
                                          {getClassName(item.classId)}
                                        </strong>
                                      </td>
                                    </tr>
                                  )}

                                  {settings.locationEnabled && (
                                    <tr>
                                      <td
                                        style={{
                                          padding: '4px 0',
                                          width: '35%',
                                          verticalAlign: 'top',
                                        }}
                                      >
                                        <small className="text-muted">Location:</small>
                                      </td>
                                      <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                                        <strong style={{ color: '#212529', fontSize: '13px' }}>
                                          {getLocationName(item.locationId)}
                                        </strong>
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>

        {/* Approval Workflow Section - Right Side */}
        <div className="col-lg-4">
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

                {approvals.map((approval) => (
                  <div key={approval.orderOfApproval} className="d-flex mb-4 position-relative">
                    <div
                      className={`rounded-circle d-flex align-items-center justify-content-center position-relative ${approval.approvalDecision === 'approved'
                        ? 'bg-success text-white'
                        : approval.approvalDecision === 'rejected'
                          ? 'bg-danger text-white'
                          : approval.approvalDecision === 'pending'
                            ? 'bg-warning text-dark'
                            : 'bg-light text-muted'
                        }`}
                      style={{
                        width: '40px',
                        height: '40px',
                        zIndex: 2,
                        border: '3px solid white',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                      }}
                    >
                      {approval.approvalDecision === 'approved' ? (
                        <i className="bi bi-check" style={{ fontSize: '18px' }}></i>
                      ) : approval.approvalDecision === 'rejected' ? (
                        <i className="bi bi-x" style={{ fontSize: '18px' }}></i>
                      ) : (
                        <span style={{ fontSize: '12px', fontWeight: '600' }}>
                          {approval.orderOfApproval}
                        </span>
                      )}
                    </div>
                    <div className="ms-3 flex-grow-1" style={{ paddingTop: '2px' }}>
                      <div className="d-flex align-items-start justify-content-between">
                        <div>
                          <div
                            style={{
                              fontWeight: '600',
                              fontSize: '14px',
                              color: '#212529',
                              marginBottom: '2px',
                            }}
                          >
                            {approval.user.title} {approval.user.firstName} {approval.user.lastName}
                          </div>
                          <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '4px' }}>
                            {approval.user.email}
                          </div>
                          {approval.approvalDecisionDate && (
                            <div style={{ fontSize: '12px', color: '#6c757d' }}>
                              <i className="bi bi-clock me-1" style={{ fontSize: '11px' }}></i>
                              {new Date(approval.approvalDecisionDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          )}
                        </div>

                        {approval.approvalDecision && (
                          <span
                            className={`badge ${approval.approvalDecision === 'approved'
                              ? 'bg-success'
                              : approval.approvalDecision === 'rejected'
                                ? 'bg-danger'
                                : approval.approvalDecision === 'pending'
                                  ? 'bg-warning text-dark'
                                  : 'bg-secondary'
                              }`}
                            style={{ fontSize: '11px', textTransform: 'capitalize' }}
                          >
                            {approval.approvalDecision}
                          </span>
                        )}
                      </div>

                      {approval.notes && (
                        <div
                          className="mt-2 p-2 rounded"
                          style={{
                            backgroundColor: '#f8f9fa',
                            fontSize: '13px',
                            color: '#495057',
                            border: '1px solid #e9ecef',
                          }}
                        >
                          <i
                            className="bi bi-chat-quote me-1"
                            style={{ fontSize: '12px', color: '#6c757d' }}
                          ></i>
                          {approval.notes}
                        </div>
                      )}

                      {(approval.approvalDecision === 'approved' ||
                        approval.approvalDecision === 'rejected') &&
                        approval.approvalDecisionDate && (
                          <p className="mb-1 small text-muted" style={{ fontSize: '10px' }}>
                            {approval.approvalDecision === 'approved'
                              ? 'Approved on: '
                              : 'Rejected on: '}
                            {new Date(approval.approvalDecisionDate).toLocaleString()}
                          </p>
                        )}
                      {approval.rules && approval.rules.length > 0 && (
                        <ul className="list-unstyled small mb-0" style={{ fontSize: '10px' }}>
                          {approval.rules.map((rule) => (
                            <li key={rule.approvalPolicyRuleId} className="text-muted">
                              {rule.name}
                            </li>
                          ))}
                        </ul>
                      )}
                      {approval.documentId && (
                        <div style={{ fontSize: '11px' }}>
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDownload(approval.documentId);
                            }}
                          >
                            Download Document
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Queries Section - Below Approval Workflow */}
          {previousQueries.length > 0 && (
            <Card
              className="shadow-sm mt-3"
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
                      onClick={() => setResolvedModalOpen(true)}
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
                <div className="p-3">
                  <div
                    className="list-group"
                    style={{
                      maxHeight: '250px',
                      overflowY: 'auto',
                    }}
                  >
                    {previousQueries.map((query) => {
                      const { queryText: text, fileId } = query;
                      const resolvedByIndex = query.queryText.indexOf('Resolved by');
                      const dashIndex =
                        resolvedByIndex !== -1
                          ? query.queryText.lastIndexOf('-', resolvedByIndex)
                          : -1;
                      const tooltipId = `query-${query.timestamp.replace(/[:.]/g, '-')}`;
                      const isResolved = resolvedByIndex !== -1;

                      let queryText = text;
                      let resolvedText = '';

                      if (resolvedByIndex !== -1 && dashIndex !== -1) {
                        queryText = query.queryText.slice(0, dashIndex).trim();
                        resolvedText = query.queryText.slice(dashIndex + 1).trim();
                      }
                      const isOpen = openTooltipId === tooltipId;

                      return (
                        <div
                          key={query.timestamp}
                          className="mb-3 p-3 border rounded"
                          style={{
                            fontSize: '12px',
                            backgroundColor: isResolved ? '#f8f9fa' : '#ffffff',
                            borderColor: '#dee2e6',
                          }}
                        >
                          <div className="d-flex align-items-start justify-content-between mb-2">
                            <div className="d-flex align-items-center">
                              <span
                                className="fw-bold me-2"
                                style={{ color: '#495057', fontSize: '12px' }}
                              >
                                {query.userName}
                              </span>
                              <span className="text-muted" style={{ fontSize: '10px' }}>
                                {new Date(query.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {fileId && (
                              <button
                                type="button"
                                className="btn btn-link p-0"
                                style={{ fontSize: '10px', boxShadow: 'none' }}
                                onClick={() => handleFileDownload(fileId)}
                              >
                                <FaDownload className="me-1" />
                                Download
                              </button>
                            )}
                          </div>
                          <div className="mb-2">
                            <span
                              className="description-text"
                              id={tooltipId}
                              style={{ cursor: 'pointer', color: '#495057', fontSize: '12px' }}
                              onClick={() => toggle(tooltipId)}
                            >
                              {queryText}
                            </span>
                            <Tooltip
                              target={tooltipId}
                              isOpen={isOpen}
                              toggle={() => toggle(tooltipId)}
                              placement="top"
                              fade
                              delay={{ show: 250, hide: 250 }}
                              style={{
                                color: 'black',
                                background: 'white',
                                border: '2px solid #ccc',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                fontSize: '10px',
                                cursor: 'pointer',
                              }}
                              className="custom-tooltip"
                            >
                              {queryText}
                            </Tooltip>
                          </div>
                          {isResolved && resolvedText && (
                            <div className="text-muted fw-bold" style={{ fontSize: '10px' }}>
                              {resolvedText}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* PO Details Modal */}
      <Modal isOpen={showPOModal} toggle={() => setShowPOModal(false)} centered size="lg">
        <ModalHeader toggle={() => setShowPOModal(false)}>Purchase Order Details</ModalHeader>
        <ModalBody>
          {poLoading ? (
            <div className="text-center py-4">
              <Spinner color="primary" />
              <p className="mt-2">Loading purchase orders...</p>
            </div>
          ) : modalPurchaseOrders.length > 0 ? (
            <div>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th style={{ fontSize: '0.85rem', fontWeight: '600', width: '15%' }}>
                        Order No
                      </th>
                      <th style={{ fontSize: '0.85rem', fontWeight: '600', width: '20%' }}>
                        Supplier
                      </th>
                      <th style={{ fontSize: '0.85rem', fontWeight: '600', width: '18%' }}>
                        Status
                      </th>
                      <th style={{ fontSize: '0.85rem', fontWeight: '600', width: '15%' }}>
                        Amount
                      </th>
                      <th style={{ fontSize: '0.85rem', fontWeight: '600', width: '15%' }}>
                        Delivery Date
                      </th>
                      <th style={{ fontSize: '0.85rem', fontWeight: '600', width: '17%' }}>
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
                        <tr key={po.PurchaseOrderId || po.purchaseOrderId}>
                          <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                            <a
                              href={`/purchase-order-detail/${po.PurchaseOrderId || po.purchaseOrderId
                                }`}
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(
                                  `/purchase-order-detail/${po.PurchaseOrderId || po.purchaseOrderId
                                  }`,
                                  {
                                    state: {
                                      fromPage: `/cart-approval-detail/${cartId}`,
                                    },
                                  },
                                );
                                setShowPOModal(false);
                              }}
                              style={{
                                textDecoration: 'none',
                                color: '#007bff',
                                fontSize: '0.85rem',
                                fontWeight: '500',
                              }}
                            >
                              {po.orderNo || po.purchaseOrderNumber || '-'}
                            </a>
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
                              className={`badge bg-${getStatusBadge(po.orderStatus || po.status)}`}
                              style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                            >
                              {(po.orderStatus || po.status || 'N/A')?.replace('_', ' ')}
                            </span>
                          </td>
                          <td
                            style={{ padding: '8px', verticalAlign: 'middle', fontWeight: '500' }}
                          >
                            ${(po.orderAmount || po.totalAmount || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                            {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : '-'}
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
                </table>
              </div>

              {poTotalElements > poPageSize && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                    Showing {poCurrentPage * poPageSize + 1} to{' '}
                    {Math.min((poCurrentPage + 1) * poPageSize, poTotalElements)} of{' '}
                    {poTotalElements} purchase orders
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
                          fetchPaginatedPurchaseOrders(Math.ceil(poTotalElements / poPageSize) - 1)
                        }
                      />
                    </PaginationItem>
                  </Pagination>
                </div>
              )}

              <div
                className="row mt-3 text-center"
                style={{ fontSize: '0.8rem', color: '#6c757d' }}
              >
                <div className="col-4">
                  <strong>Total:</strong> {poTotalElements} orders
                </div>
                <div className="col-4">
                  <strong>Page:</strong> {poCurrentPage + 1} of{' '}
                  {Math.ceil(poTotalElements / poPageSize)}
                </div>
                <div className="col-4"></div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <i className="bi bi-inbox" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
              <p className="mt-2 text-muted">No purchase orders found for this cart.</p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowPOModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Approval/Rejection Modal */}
      <Modal isOpen={showModal} toggle={handleModalCancel} centered>
        <ModalHeader toggle={handleModalCancel}>
          {actionType === 'approve' ? 'Approve Cart' : 'Reject Cart'}
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
                  ? 'Enter approval notes (required if no document is attached)...'
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
                ? 'Upload supporting document (required if no notes are provided)'
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
      <QueryModal
        isOpen={queryModalOpen}
        onClose={closeQueryModal}
        onSubmit={handleSubmitQuery}
        previousQueries={previousQueries}
        queryInput={queryInput}
        setQueryInput={setQueryInput}
        onFileUploadSuccess={handleFileUploadSuccess}
      />
      <MarkResolvedModal
        isOpen={isResolvedModalOpen}
        toggle={toggleResolvedModal}
        onSubmit={handleMarkAsResolved}
        currentUser={userName}
      />

      {/* Restart Approval Confirmation Modal */}
      <Modal
        isOpen={showRestartConfirmModal}
        toggle={() => setShowRestartConfirmModal(false)}
        centered
      >
        <ModalHeader toggle={() => setShowRestartConfirmModal(false)}>
          <i className="bi bi-arrow-clockwise me-2 text-warning"></i>
          Restart Approval Process
        </ModalHeader>
        <ModalBody>
          <div className="text-center">
            <div className="mb-3">
              <i
                className="bi bi-exclamation-triangle-fill text-warning"
                style={{ fontSize: '48px' }}
              ></i>
            </div>
            <h5 className="mb-3">Restart Approval Process?</h5>
            <p className="text-muted mb-3">
              This will restart the approval process for this cart. All previous approval decisions
              will be reset and the cart will go through the approval workflow again.
            </p>
            <div className="alert alert-warning py-2" style={{ fontSize: '14px' }}>
              <i className="bi bi-info-circle me-1"></i>
              This action cannot be undone.
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowRestartConfirmModal(false)}>
            <i className="bi bi-x-circle me-1"></i>
            Cancel
          </Button>
          <Button
            color="warning"
            onClick={() => {
              setShowRestartConfirmModal(false);
              handleRestartApproval();
            }}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Restart Approval
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default CartApprovalDetail;
