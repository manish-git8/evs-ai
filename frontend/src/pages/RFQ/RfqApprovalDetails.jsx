import React, { useEffect, useState } from 'react';
import format from 'date-fns/format';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Spinner,
  Table,
  Label,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormGroup,
  Input,
  FormFeedback,
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FaPaperclip,
  FaCheck,
  FaTimes,
  FaArrowLeft,
  FaClock,
  FaComment,
  FaHistory,
} from 'react-icons/fa';
import {
  Users,
  Calendar,
  MapPin,
  Briefcase,
  Layers,
  DollarSign,
  Mail,
  Phone,
  Package,
  CheckCircle,
  XCircle,
  ShoppingBag,
  Clipboard,
  User,
  Target,
  BookOpen,
} from 'react-feather';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import * as Yup from 'yup';
import ComponentCard from '../../components/ComponentCard';
import FileUploadService from '../../services/FileUploadService';
import RqfService from '../../services/RfqService';
import { getEntityId, formatDate, getUserId } from '../localStorageUtil';
import '../CompanyManagement/ReactBootstrapTable.scss';
import SupplierService from '../../services/SupplierService';
import RfqApprovalService from '../../services/RfqApprovalService';
import AddressService from '../../services/AddressService';
import LocationService from '../../services/LocationService';
import DepartmentService from '../../services/DepartmentService';
import ClassService from '../../services/ClassService';
import GLAccountService from '../../services/GLaccountService';
import ProjectService from '../../services/ProjectService';
import RfqSupplierModal from './RfqSupplierModal';
import AttachmentsModal from './AttachmentsModal';
import RfqHistoryTimeline from './components/RfqHistoryTimeline';

const RfqApprovalDetails = () => {
  const { rfqId } = useParams();
  const userId = getUserId();
  const companyId = getEntityId();
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
  const location = useLocation();
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const navigate = useNavigate();
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [notes, setNotes] = useState('');
  const [notesError, setNotesError] = useState('');
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const commentSchema = Yup.object().shape({
    notes: Yup.string().required('Notes are required'),
  });

  const handleActionClick = (action) => {
    setCurrentAction(action);
    setActionModalOpen(true);
  };

  const handleConfirmAction = async () => {
    try {
      await commentSchema.validate({ notes }, { abortEarly: false });
      setNotesError('');

      // Find the first supplier with a valid signoff request (all suppliers share the same signoff)
      const supplierWithSignoff = suppliersWithDetails.find((supplier) => {
        const signOffRequest = supplier.signOffRequests;
        const signoffUser = signOffRequest?.signoffUsers?.find(
          (u) => u.signoffUserId?.userId === userId
        );
        return signOffRequest && signoffUser;
      });

      if (!supplierWithSignoff) {
        toast.warning('No pending sign-off request found for you.');
        setActionModalOpen(false);
        return;
      }

      const signOffRequest = supplierWithSignoff.signOffRequests;
      const signoffUser = signOffRequest.signoffUsers.find(
        (u) => u.signoffUserId?.userId === userId
      );

      const payload = {
        rfqSignOffUserId: signoffUser.rfqSignOffUserId,
        rfqSignOffId: signOffRequest.rfqSignOffId,
        signoffUserId: {
          userId,
        },
        signoffStatus: currentAction === 'approve' ? 'approved' : 'rejected',
        signedAt: new Date().toISOString(),
        comments: notes,
        isActive: signoffUser.isActive,
        createdDate: signoffUser.createdDate,
        updatedDate: new Date().toISOString(),
        createdBy: signoffUser.createdBy,
        updatedBy: signoffUser.updatedBy,
      };

      const response = await RfqApprovalService.approveRfqSignoff(
        companyId,
        rfqId,
        signOffRequest.rfqSignOffId,
        payload,
      );

      if (response?.status === 200) {
        toast.success(
          `RFQ ${currentAction === 'approve' ? 'approved' : 'rejected'} successfully!`,
        );

        // Refresh data - wrapped in try-catch to not mask success
        try {
          const refreshedRfq = await RqfService.getRfqById(companyId, rfqId);
          setRfqData(refreshedRfq.data);

          const updatedSuppliers = await Promise.all(
            refreshedRfq.data.suppliers.map(async (supplier) => {
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
                  name: detail.data[0].name,
                  email: detail.data[0].email,
                  primaryContact: detail.data[0].primaryContact,
                  address: formattedAddress,
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

          setSuppliersWithDetails(updatedSuppliers);
        } catch (refreshError) {
          console.error('Error refreshing data after approval:', refreshError);
          // Don't show error toast - the approval succeeded
        }
      } else {
        toast.error(`Failed to ${currentAction} sign-off. Please try again.`);
      }

      setActionModalOpen(false);
      setNotes('');
    } catch (validationError) {
      if (validationError.name === 'ValidationError') {
        setNotesError('Notes are required');
        toast.error('Please add notes before submitting');
      } else {
        toast.error(`Failed to ${currentAction} sign-off. Please try again.`);
        console.error('Action error:', validationError);
      }
    }
  };

  const renderActionModal = () => (
    <Modal isOpen={actionModalOpen} toggle={() => setActionModalOpen(false)}>
      <ModalHeader toggle={() => setActionModalOpen(false)}>
        {currentAction === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
      </ModalHeader>
      <ModalBody>
        <div className="mb-3">
          <small className="text-muted">
            Your {currentAction === 'approve' ? 'approval' : 'rejection'} will be recorded for this RFQ.
          </small>
        </div>
        <FormGroup>
          <Label for="actionNotes">
            {currentAction === 'approve' ? 'Approval Notes' : 'Reason for Rejection'}
            <span className="text-danger">*</span>
          </Label>
          <Input
            type="textarea"
            id="actionNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            invalid={!!notesError}
            placeholder={
              currentAction === 'approve'
                ? 'Enter approval notes...'
                : 'Explain why you are rejecting this...'
            }
          />
          {notesError && <FormFeedback>{notesError}</FormFeedback>}
        </FormGroup>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={() => setActionModalOpen(false)}>
          Cancel
        </Button>
        <Button
          color={currentAction === 'approve' ? 'success' : 'danger'}
          onClick={handleConfirmAction}
          disabled={!notes.trim()}
        >
          {currentAction === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
        </Button>
      </ModalFooter>
    </Modal>
  );

  const getCommonApprovalPath = () => {
    if (suppliersWithDetails.length === 0) return null;
    return suppliersWithDetails[0].signOffRequests;
  };

  const fetchAllSuppliers = async () => {
    try {
      const response = await SupplierService.getAllSuppliersPaginated();
      // Handle paginated response - extract content array
      const supplierList = response.data?.content || response.data || [];
      setSuppliers(Array.isArray(supplierList) ? supplierList : []);
    } catch (err) {
      toast.error('Failed to fetch suppliers');
    }
  };

  const addExistingSupplier = async (supplierId) => {
    try {
      await RqfService.inviteSupplier(companyId, rfqId, supplierId.supplierId);
      toast.success('Supplier added successfully');
      const res = await RqfService.getRfqById(companyId, rfqId);
      const rfq = res.data;
      const supplierDetails = await Promise.all(
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
              name: detail.data[0].name,
              email: detail.data[0].email,
              primaryContact: detail.data[0].primaryContact,
              address: formattedAddress,
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
  };

  const addNewSupplier = async () => {
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
  };

  const handleDownload = async (fileId) => {
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

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download file');
    }
  };

  useEffect(() => {
    const fetchRFQDetail = async () => {
      try {
        const response = await RqfService.getRfqById(companyId, rfqId);
        const rfq = response.data;
        setRfqData(rfq);

        if (rfq.shipToAddressId) {
          AddressService.getAddressById(companyId, rfq.shipToAddressId)
            .then((res) => {
              const addr = res.data;
              const formattedAddress = [addr.addressLine1, addr.city, addr.country, addr.postalCode]
                .filter(Boolean)
                .join(', ');
              setShipToAddressName(formattedAddress);
            })
            .catch(() => setShipToAddressName(''));
        }

        if (rfq.locationId) {
          LocationService.getLocationById(companyId, rfq.locationId)
            .then((res) => setLocationName(res.data[0]?.name || ''))
            .catch(() => setLocationName(''));
        }

        if (rfq.departmentId) {
          DepartmentService.getByIdDepartment(companyId, rfq.departmentId)
            .then((res) => setDepartmentName(res.data[0]?.name || ''))
            .catch(() => setDepartmentName(''));
        }

        if (rfq.classId) {
          ClassService.getByIdClass(companyId, rfq.classId)
            .then((res) => setClassName(res.data[0]?.name || ''))
            .catch(() => setClassName(''));
        }

        if (rfq.glAccountId) {
          GLAccountService.getGlAccountById(companyId, rfq.glAccountId)
            .then((res) => setGlAccountName(res.data[0]?.name || ''))
            .catch(() => setGlAccountName(''));
        }

        if (rfq.projectId) {
          ProjectService.getProjectByProjectId(companyId, rfq.projectId)
            .then((res) => setProjectName(res.data[0]?.name || ''))
            .catch(() => setProjectName(''));
        }
      } catch (err) {
        setError('Failed to fetch RFQ details.');
      } finally {
        setLoading(false);
      }
    };
    fetchRFQDetail();
    fetchAllSuppliers();
  }, [rfqId]);

  useEffect(() => {
    const fetchRfqAndSuppliers = async () => {
      try {
        const res = await RqfService.getRfqById(companyId, rfqId);
        const rfq = res.data;
        const supplierDetails = await Promise.all(
          rfq.suppliers
            .map(async (supplier) => {
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
                  name: detail.data[0].name,
                  email: detail.data[0].email,
                  primaryContact: detail.data[0].primaryContact,
                  address: formattedAddress,
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

        setRfqData(rfq);
        setSuppliersWithDetails(supplierDetails);
      } catch (err) {
        setError('Failed to fetch RFQ or suppliers');
      } finally {
        setLoading(false);
      }
    };

    fetchRfqAndSuppliers();
  }, [rfqId]);

  const getStatusBadge = (status) => {
    const colors = {
      draft: 'secondary',
      submitted: 'primary',
      completed: 'success',
      rejected: 'danger',
      negotiation: 'warning',
      signoff_requested: 'info',
      not_selected: 'secondary',
      requested: 'warning',
      approved: 'success',
      pending: 'info',
      finalized: 'success',
    };
    const label = status
      ? status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
      : 'Unknown';
    return (
      <Badge color={colors[status] || 'dark'} pill>
        {label}
      </Badge>
    );
  };

  const getFullName = (user) => {
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
  };

  const getRfqItemById = (rfqItemId) => {
    return rfqData?.rfqItems?.find((item) => item.rfqItemId === rfqItemId);
  };

  // Check if an item is selected/ordered from a supplier
  const isItemSelectedFromSupplier = (supplier, rfqItemId) => {
    const responseItem = (supplier.responseItems || []).find((ri) => ri.rfqItemId === rfqItemId);
    // Use isSelected from response item if available, otherwise fall back to selectedRfqItemIds
    if (responseItem?.isSelected !== undefined && responseItem?.isSelected !== null) {
      return responseItem.isSelected === true;
    }
    // Fallback: check selectedRfqItemIds array
    const selectedIds = supplier.selectedRfqItemIds || [];
    return selectedIds.includes(rfqItemId);
  };

  const getSupplierResponseItems = (supplier) => {
    // Return only items that are selected/ordered from this supplier
    return (supplier.responseItems || []).filter((responseItem) =>
      isItemSelectedFromSupplier(supplier, responseItem.rfqItemId)
    );
  };

  const getSupplierTotal = (supplier) => {
    if (supplier.supplierStatus === 'not_selected') return 0;
    // Only sum items that are selected/ordered from this supplier
    return (supplier.responseItems || []).reduce((sum, item) => {
      if (!isItemSelectedFromSupplier(supplier, item.rfqItemId)) return sum;
      const rfqItem = getRfqItemById(item.rfqItemId);
      const qty = rfqItem?.quantity || 0;
      const price = item.unitPrice || 0;
      return sum + price * qty;
    }, 0);
  };

  const getOverallTotal = () => {
    return suppliersWithDetails.reduce((sum, supplier) => sum + getSupplierTotal(supplier), 0);
  };

  const formatDateTime = (date) => {
    try {
      return format(new Date(date), 'MMM dd, yyyy h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getApprovalStepIcon = (status) => {
    if (status === 'approved') return <FaCheck size={10} color="#fff" />;
    if (status === 'rejected') return <FaTimes size={10} color="#fff" />;
    if (status === 'overridden') return <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>!</span>;
    return <FaClock size={9} color="#fff" />;
  };

  const getApprovalStepColor = (status) => {
    if (status === 'approved') return 'linear-gradient(135deg, #28a745, #20c997)';
    if (status === 'rejected') return 'linear-gradient(135deg, #dc3545, #e74c3c)';
    if (status === 'overridden') return 'linear-gradient(135deg, #17a2b8, #138496)';
    return 'linear-gradient(135deg, #ffc107, #f0ad4e)';
  };

  const getApprovalLineColor = (status) => {
    if (status === 'approved') return '#28a745';
    if (status === 'rejected') return '#dc3545';
    return '#dee2e6';
  };

  // ─── RENDER HELPERS ─────────────────────────────────────────────

  const renderSummaryHeader = () => {
    const totalItems = rfqData?.rfqItems?.length || 0;
    const totalSuppliers = suppliersWithDetails.length;
    const overallTotal = getOverallTotal();

    return (
      <div className="rfq-summary-header">
        {/* Title bar: RFQ number, status, stats, actions */}
        <div className="rfq-title-bar">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h5 className="mb-0 fw-bold" style={{ color: '#2c3e50' }}>
              {rfqData.rfqNumber || `RFQ-${rfqData.rfqId}`}
            </h5>
            {getStatusBadge(rfqData.rfqStatus)}
            <span className="rfq-title-divider" />
            <span className="rfq-inline-stat">
              <Users size={13} /> {totalSuppliers} Suppliers
            </span>
            <span className="rfq-inline-stat">
              <Package size={13} /> {totalItems} Items
            </span>
            <span className="rfq-inline-stat">
              <DollarSign size={13} /> ${overallTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="rfq-inline-stat">
              <Calendar size={13} /> Required By: {formatDate(rfqData.requiredAt)}
            </span>
            {rfqData.attachments?.length > 0 && (
              <Button
                color="link"
                size="sm"
                className="shadow-none p-0"
                onClick={() => setShowAttachmentsModal(true)}
                style={{ cursor: 'pointer', fontSize: '12px' }}
              >
                <FaPaperclip className="me-1" />
                {rfqData.attachments.length} file{rfqData.attachments.length > 1 ? 's' : ''}
              </Button>
            )}
          </div>
          <div className="d-flex gap-2">
            <Button
              outline
              color="info"
              size="sm"
              onClick={() => setShowHistoryModal(true)}
            >
              <FaHistory size={12} className="me-1" /> History
            </Button>
            <Button
              outline
              color="secondary"
              size="sm"
              onClick={() => {
                const isFromDashboard = location.state?.fromDashboard;
                navigate(isFromDashboard ? '/dashboard' : '/rfq');
              }}
            >
              <FaArrowLeft size={12} className="me-1" /> Back
            </Button>
          </div>
        </div>

        {/* Subtitle + metadata */}
        {(rfqData.title || rfqData.objective || rfqData.requirements || rfqData.purchaseType) && (
          <div className="rfq-subtitle-row">
            {rfqData.title && (
              <div style={{ color: '#555', fontSize: '13px', width: '100%' }}>{rfqData.title}</div>
            )}
            {rfqData.purchaseType && (
              <span className="rfq-metadata-inline">
                <ShoppingBag size={12} className="rfq-metadata-icon" />
                <span className="rfq-metadata-label">Type:</span>
                <span className="rfq-metadata-value">{rfqData.purchaseType}</span>
              </span>
            )}
            {rfqData.objective && (
              <div className="rfq-metadata-block">
                <Target size={12} className="rfq-metadata-icon" />
                <span className="rfq-metadata-label">Objective:</span>
                <span className="rfq-metadata-value">{rfqData.objective}</span>
              </div>
            )}
            {rfqData.requirements && (
              <div className="rfq-metadata-block">
                <BookOpen size={12} className="rfq-metadata-icon" />
                <span className="rfq-metadata-label">Requirements:</span>
                <span className="rfq-metadata-value">{rfqData.requirements}</span>
              </div>
            )}
          </div>
        )}

        {/* Dates Row */}
        <div className="rfq-dates-row">
          <div className="rfq-date-item">
            <Calendar size={12} style={{ color: '#6c757d', marginRight: '4px' }} />
            <span className="rfq-date-label">Created:</span>
            <span className="rfq-date-value">
              {formatDateTime(rfqData.createdDate)} by {getFullName(rfqData.createdBy)}
            </span>
          </div>
          {rfqData.rfqStatus === 'submitted' && rfqData.submittedAt && (
            <div className="rfq-date-item">
              <Calendar size={12} style={{ color: '#28a745', marginRight: '4px' }} />
              <span className="rfq-date-label">Submitted:</span>
              <span className="rfq-date-value">{formatDateTime(rfqData.submittedAt)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderOrganizationCard = () => {
    const hasData = shipToAddressName || projectName || locationName || glAccountName || departmentName || className;
    if (!hasData) return null;

    return (
      <Card className="rfq-detail-card mb-3">
        <CardHeader className="rfq-card-header">
          <Briefcase size={16} className="me-2" />
          Organization & Financials
        </CardHeader>
        <CardBody className="p-3">
          <div className="rfq-info-grid">
            {shipToAddressName && (
              <div className="rfq-info-item">
                <MapPin size={14} className="rfq-info-icon" />
                <div>
                  <div className="rfq-info-label">Ship To Address</div>
                  <div className="rfq-info-value">{shipToAddressName}</div>
                </div>
              </div>
            )}
            {projectName && (
              <div className="rfq-info-item">
                <Briefcase size={14} className="rfq-info-icon" />
                <div>
                  <div className="rfq-info-label">Project</div>
                  <div className="rfq-info-value">{projectName}</div>
                </div>
              </div>
            )}
            {locationName && (
              <div className="rfq-info-item">
                <MapPin size={14} className="rfq-info-icon" />
                <div>
                  <div className="rfq-info-label">Location</div>
                  <div className="rfq-info-value">{locationName}</div>
                </div>
              </div>
            )}
            {glAccountName && (
              <div className="rfq-info-item">
                <DollarSign size={14} className="rfq-info-icon" />
                <div>
                  <div className="rfq-info-label">GL Account</div>
                  <div className="rfq-info-value">{glAccountName}</div>
                </div>
              </div>
            )}
            {departmentName && (
              <div className="rfq-info-item">
                <Layers size={14} className="rfq-info-icon" />
                <div>
                  <div className="rfq-info-label">Department</div>
                  <div className="rfq-info-value">{departmentName}</div>
                </div>
              </div>
            )}
            {className && (
              <div className="rfq-info-item">
                <Layers size={14} className="rfq-info-icon" />
                <div>
                  <div className="rfq-info-label">Class</div>
                  <div className="rfq-info-value">{className}</div>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    );
  };

  const renderApprovalTimeline = () => {
    const signOffRequest = getCommonApprovalPath();

    if (
      !signOffRequest ||
      !signOffRequest.signoffUsers ||
      signOffRequest.signoffUsers.length === 0
    ) {
      return null;
    }

    const approvedCount = signOffRequest.signoffUsers.filter(
      (u) => u.signoffStatus === 'approved',
    ).length;
    const totalUsers = signOffRequest.signoffUsers.length;

    return (
      <Card className="rfq-detail-card mb-3">
        <CardHeader className="rfq-card-header">
          <Clipboard size={16} className="me-2" />
          Approval Path
          <Badge
            color="light"
            className="ms-2"
            style={{ color: '#009efb', fontSize: '11px' }}
          >
            {approvedCount}/{totalUsers} Approved
          </Badge>
        </CardHeader>
        <CardBody className="p-3">
          {signOffRequest.requestedBy && (
            <div className="rfq-requested-by mb-3">
              <User size={13} style={{ color: '#6c757d', marginRight: '6px' }} />
              <span style={{ fontSize: '12px', color: '#6c757d' }}>
                Requested by{' '}
                <strong style={{ color: '#333' }}>
                  {getFullName(signOffRequest.requestedBy)}
                </strong>
              </span>
            </div>
          )}

          <div className="approval-timeline-v2">
            {signOffRequest.signoffUsers.map((user, index) => {
              const isLast = index === signOffRequest.signoffUsers.length - 1;
              return (
                <div key={user.rfqSignOffUserId} className="approval-step-v2">
                  {/* Step Circle + Line */}
                  <div className="approval-step-indicator">
                    <div
                      className="approval-step-circle"
                      style={{ background: getApprovalStepColor(user.signoffStatus) }}
                    >
                      {getApprovalStepIcon(user.signoffStatus)}
                    </div>
                    {!isLast && (
                      <div
                        className="approval-step-line"
                        style={{ backgroundColor: getApprovalLineColor(user.signoffStatus) }}
                      />
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="approval-step-content">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="approval-step-name">
                          {user.signoffUserId?.firstName} {user.signoffUserId?.lastName}
                        </div>
                        <div className="approval-step-email">
                          {user.signoffUserId?.email}
                        </div>
                      </div>
                      <Badge
                        color={
                          user.signoffStatus === 'approved'
                            ? 'success'
                            : user.signoffStatus === 'rejected'
                            ? 'danger'
                            : user.signoffStatus === 'overridden'
                            ? 'info'
                            : 'warning'
                        }
                        pill
                        className="text-capitalize"
                        style={{ fontSize: '10px' }}
                      >
                        {user.signoffStatus}
                      </Badge>
                    </div>

                    {/* Timestamp */}
                    {user.updatedDate && user.signoffStatus !== 'requested' && user.signoffStatus !== 'pending' && (
                      <div className="approval-step-time">
                        <FaClock size={10} className="me-1" />
                        {formatDateTime(user.updatedDate)}
                      </div>
                    )}

                    {/* Comments */}
                    {user.comments && (
                      <div className="approval-step-comment">
                        <FaComment size={10} className="me-1" />
                        {user.comments}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    );
  };

  const renderSupplierCard = (supplier, index) => {
    const responseItems = getSupplierResponseItems(supplier);
    const supplierTotal = getSupplierTotal(supplier);
    const orderedCount = responseItems.length;
    const allRfqItems = rfqData?.rfqItems || [];

    // Build a map of response items by rfqItemId for quick lookup
    const responseItemMap = {};
    (supplier.responseItems || []).forEach((ri) => {
      responseItemMap[ri.rfqItemId] = ri;
    });

    // A supplier with status 'not_selected' was not chosen — none of their items are ordered
    const isSupplierSelected = supplier.supplierStatus !== 'not_selected';

    return (
      <Card className="rfq-supplier-card mb-2" key={supplier.supplierId}>
        {/* Supplier Header - compact single row */}
        <div className="rfq-supplier-header-compact">
          <div className="d-flex align-items-center gap-2">
            <div className="rfq-supplier-number-sm">{index + 1}</div>
            <span className="fw-bold" style={{ color: '#2c3e50', fontSize: '13px' }}>
              {supplier.name || `Supplier ${supplier.supplierId}`}
            </span>
            {getStatusBadge(supplier.supplierStatus)}
            {supplier.email && (
              <span className="rfq-contact-item-sm">
                <Mail size={11} /> {supplier.email}
              </span>
            )}
            {supplier.primaryContact && (
              <span className="rfq-contact-item-sm">
                <Phone size={11} /> {supplier.primaryContact}
              </span>
            )}
            {supplier.address && (
              <span className="rfq-contact-item-sm">
                <MapPin size={11} /> {supplier.address}
              </span>
            )}
          </div>
          <div className="rfq-supplier-total-sm">
            ${supplierTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Items Table */}
        <CardBody className="p-0">
          {allRfqItems.length > 0 ? (
            <Table responsive className="rfq-items-table mb-0">
              <thead>
                <tr>
                  <th>Part ID</th>
                  <th>Description</th>
                  <th className="text-center">Qty</th>
                  <th className="text-center">UOM</th>
                  <th className="text-end">Unit Price</th>
                  <th className="text-end">Total</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {allRfqItems.map((rfqItem) => {
                  const responseItem = responseItemMap[rfqItem.rfqItemId];
                  // Item is ordered if supplier is selected AND this specific item is selected from this supplier
                  const isOrdered = isSupplierSelected && isItemSelectedFromSupplier(supplier, rfqItem.rfqItemId);
                  const unitPrice = responseItem?.unitPrice;
                  const totalPrice = unitPrice != null && rfqItem.quantity
                    ? (unitPrice * rfqItem.quantity).toFixed(2)
                    : null;

                  return (
                    <tr
                      key={rfqItem.rfqItemId}
                      className={!isOrdered ? 'rfq-item-not-ordered' : ''}
                    >
                      <td className="fw-semibold" style={{ color: isOrdered ? '#009efb' : '#adb5bd' }}>
                        {rfqItem.partId || 'N/A'}
                      </td>
                      <td>{rfqItem.description || 'N/A'}</td>
                      <td className="text-center">{rfqItem.quantity || 'N/A'}</td>
                      <td className="text-center">{rfqItem.uom || 'N/A'}</td>
                      <td className="text-end">
                        {unitPrice != null ? `$${unitPrice.toFixed(2)}` : '\u2014'}
                      </td>
                      <td className="text-end fw-semibold">
                        {isOrdered && totalPrice != null ? `$${totalPrice}` : '\u2014'}
                      </td>
                      <td className="text-center">
                        {isOrdered ? (
                          <Badge color="success" pill style={{ fontSize: '10px' }}>
                            Ordered
                          </Badge>
                        ) : (
                          <Badge color="light" pill style={{ fontSize: '10px', color: '#dc3545', border: '1px solid #f5c6cb' }}>
                            Not Ordered
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="rfq-table-total-row">
                  <td colSpan={5}></td>
                  <td className="text-end fw-bold" style={{ fontSize: '13px' }}>
                    Subtotal ({orderedCount} item{orderedCount !== 1 ? 's' : ''}):
                  </td>
                  <td className="text-center fw-bold" style={{ fontSize: '14px', color: '#009efb' }}>
                    ${supplierTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </Table>
          ) : (
            <div className="text-muted text-center py-3" style={{ fontSize: '13px' }}>
              No items available for this RFQ
            </div>
          )}
        </CardBody>
      </Card>
    );
  };

  const renderActionButtons = () => {
    if (suppliersWithDetails.length === 0) return null;

    const isTerminalStatus = ['rejected', 'completed', 'cancelled'].includes(rfqData?.rfqStatus);
    const commonSignOffRequest = getCommonApprovalPath();
    const userSignoff = commonSignOffRequest?.signoffUsers?.find(
      (user) => user.signoffUserId?.userId === userId,
    );
    const alreadyActed = userSignoff && (userSignoff.signoffStatus === 'approved' || userSignoff.signoffStatus === 'rejected');
    const shouldDisable = isTerminalStatus || (userSignoff && userSignoff.signoffStatus !== 'requested');

    return (
      <div className="rfq-action-footer">
        {isTerminalStatus && (
          <span style={{ fontSize: '13px', color: '#6c757d', marginRight: 'auto' }}>
            This RFQ has been {rfqData.rfqStatus}.
          </span>
        )}
        {!isTerminalStatus && alreadyActed && (
          <span style={{ fontSize: '13px', color: '#6c757d', marginRight: 'auto' }}>
            You have already {userSignoff.signoffStatus} this RFQ.
          </span>
        )}
        <div className="d-flex gap-2 ms-auto">
          <Button
            outline
            color="secondary"
            onClick={() => {
              const isFromDashboard = location.state?.fromDashboard;
              navigate(isFromDashboard ? '/dashboard' : '/rfq');
            }}
          >
            <FaArrowLeft size={12} className="me-1" /> Back
          </Button>
          <Button
            color="danger"
            onClick={() => handleActionClick('reject')}
            disabled={shouldDisable}
          >
            <XCircle size={14} className="me-1" /> Reject
          </Button>
          <Button
            color="success"
            onClick={() => handleActionClick('approve')}
            disabled={shouldDisable}
          >
            <CheckCircle size={14} className="me-1" /> Approve
          </Button>
        </div>
      </div>
    );
  };

  // ─── LOADING / ERROR / EMPTY ────────────────────────────────────

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <div className="text-danger text-center py-5">{error}</div>;
  }

  if (!rfqData) {
    return <div className="text-center py-5">No RFQ found.</div>;
  }

  // ─── MAIN RENDER ────────────────────────────────────────────────

  return (
    <>
      <div className="rfq-approval-details-page">
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

        {/* Summary Header */}
        {renderSummaryHeader()}

        {/* Organization & Financials */}
        <div className="mt-3">
          {renderOrganizationCard()}
        </div>

        {/* Approval Path */}
        {suppliersWithDetails.length > 0 && renderApprovalTimeline()}

        {/* Suppliers Section */}
        {suppliersWithDetails.length > 0 ? (
          <div className="mt-2">
            <div className="d-flex align-items-center gap-2 mb-3">
              <Users size={18} style={{ color: '#009efb' }} />
              <h5 className="mb-0 fw-bold" style={{ color: '#2c3e50' }}>
                Suppliers ({suppliersWithDetails.length})
              </h5>
            </div>
            {suppliersWithDetails.map((supplier, index) =>
              renderSupplierCard(supplier, index),
            )}
          </div>
        ) : (
          <Card className="mb-3">
            <CardBody className="text-center text-muted py-4">
              No suppliers currently require sign-off
            </CardBody>
          </Card>
        )}

        {/* Action Buttons */}
        {renderActionButtons()}

        {renderActionModal()}

        <AttachmentsModal
          attachments={rfqData.attachments || []}
          isOpen={showAttachmentsModal}
          toggle={() => setShowAttachmentsModal(false)}
          onDownload={handleDownload}
        />

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

        <RfqHistoryTimeline
          companyId={companyId}
          rfqId={rfqId}
          isOpen={showHistoryModal}
          toggle={() => setShowHistoryModal(false)}
        />
      </div>

      <style>{`
        .rfq-approval-details-page {
          padding: 20px;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          min-height: calc(100vh - 120px);
        }

        /* Summary Header */
        .rfq-summary-header {
          background: #fff;
          border-radius: 8px;
          padding: 14px 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          border: 1px solid #e9ecef;
        }
        .rfq-title-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .rfq-title-divider {
          width: 1px;
          height: 16px;
          background: #dee2e6;
          margin: 0 4px;
        }
        .rfq-inline-stat {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #4a5568;
          background: #f1f5f9;
          padding: 2px 8px;
          border-radius: 4px;
          white-space: nowrap;
        }
        .rfq-inline-stat svg {
          color: #009efb;
        }
        .rfq-subtitle-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid #f0f0f0;
        }
        .rfq-metadata-inline {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
        }
        .rfq-metadata-block {
          display: flex;
          align-items: flex-start;
          gap: 4px;
          font-size: 12px;
          width: 100%;
          line-height: 1.5;
        }
        .rfq-metadata-block .rfq-metadata-value {
          word-break: break-word;
          white-space: pre-wrap;
        }
        .rfq-metadata-icon {
          color: #009efb;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .rfq-metadata-label {
          color: #6c757d;
          font-weight: 500;
          white-space: nowrap;
        }
        .rfq-metadata-value {
          color: #333;
          font-weight: 500;
        }

        /* Card Headers */
        .rfq-card-header {
          background: linear-gradient(135deg, #009efb 0%, #0084d6 100%) !important;
          color: #fff !important;
          font-weight: 600;
          font-size: 14px;
          padding: 10px 16px !important;
          display: flex;
          align-items: center;
          border-radius: 6px 6px 0 0 !important;
        }
        .rfq-detail-card {
          border: 1px solid #e9ecef;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        /* Info Grid */
        .rfq-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 992px) {
          .rfq-info-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 576px) {
          .rfq-info-grid {
            grid-template-columns: 1fr;
          }
        }
        .rfq-info-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .rfq-info-icon {
          color: #009efb;
          margin-top: 2px;
          flex-shrink: 0;
        }
        .rfq-info-label {
          font-size: 11px;
          color: #6c757d;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .rfq-info-value {
          font-size: 13px;
          color: #2c3e50;
          font-weight: 500;
        }

        /* Dates Row */
        .rfq-dates-row {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          padding-top: 6px;
          margin-top: 6px;
          border-top: 1px solid #f0f0f0;
        }
        .rfq-date-item {
          display: flex;
          align-items: center;
          font-size: 12px;
        }
        .rfq-date-label {
          color: #6c757d;
          margin-right: 4px;
        }
        .rfq-date-value {
          color: #333;
          font-weight: 500;
        }

        /* Approval Timeline V2 */
        .approval-timeline-v2 {
          position: relative;
        }
        .approval-step-v2 {
          display: flex;
          gap: 12px;
          position: relative;
        }
        .approval-step-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }
        .approval-step-circle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
          z-index: 1;
        }
        .approval-step-line {
          width: 2px;
          flex: 1;
          min-height: 20px;
          margin: 2px 0;
        }
        .approval-step-content {
          flex: 1;
          background: #fafbfc;
          border: 1px solid #e9ecef;
          border-radius: 6px;
          padding: 10px 14px;
          margin-bottom: 8px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .approval-step-name {
          font-size: 13px;
          font-weight: 600;
          color: #333;
        }
        .approval-step-email {
          font-size: 11px;
          color: #6c757d;
        }
        .approval-step-time {
          font-size: 11px;
          color: #888;
          margin-top: 4px;
          display: flex;
          align-items: center;
        }
        .approval-step-comment {
          font-size: 12px;
          color: #555;
          margin-top: 6px;
          background: #fff;
          padding: 6px 10px;
          border-radius: 4px;
          border-left: 3px solid #009efb;
          display: flex;
          align-items: flex-start;
          gap: 4px;
        }
        .rfq-requested-by {
          display: flex;
          align-items: center;
          padding-bottom: 8px;
          border-bottom: 1px solid #f0f0f0;
        }

        /* Supplier Card - Compact */
        .rfq-supplier-card {
          border: 1px solid #e9ecef;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .rfq-supplier-header-compact {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          background: #f8f9fa;
          padding: 8px 14px;
          border-bottom: 1px solid #e9ecef;
        }
        .rfq-supplier-number-sm {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: linear-gradient(135deg, #009efb, #0084d6);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .rfq-supplier-total-sm {
          font-size: 14px;
          font-weight: 700;
          color: #009efb;
          white-space: nowrap;
        }
        .rfq-contact-item-sm {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 11px;
          color: #6c757d;
          margin-left: 4px;
        }

        /* Items Table - Compact */
        .rfq-items-table {
          font-size: 12px;
          margin-bottom: 0;
        }
        .rfq-items-table thead th {
          background: #f1f5f9;
          color: #4a5568;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          padding: 6px 10px;
          border-bottom: 2px solid #e2e8f0;
          white-space: nowrap;
        }
        .rfq-items-table tbody td {
          padding: 5px 10px;
          vertical-align: middle;
          border-bottom: 1px solid #f0f0f0;
        }
        .rfq-items-table tbody tr:hover {
          background-color: #f8fafc;
        }
        .rfq-item-not-ordered {
          background-color: #fff5f5 !important;
          color: #adb5bd;
        }
        .rfq-item-not-ordered td {
          color: #adb5bd !important;
        }
        .rfq-item-not-ordered:hover {
          background-color: #fee !important;
        }
        .rfq-table-total-row {
          background: #f8f9fa;
        }
        .rfq-table-total-row td {
          padding: 6px 10px !important;
          border-top: 2px solid #e2e8f0 !important;
        }

        /* Action Footer */
        .rfq-action-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 20px;
          padding: 16px 20px;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          border: 1px solid #e9ecef;
        }
      `}</style>
    </>
  );
};

export default RfqApprovalDetails;
