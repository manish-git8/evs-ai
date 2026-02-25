import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Form,
  FormGroup,
  Label,
  Input,
} from 'reactstrap';
import { Download, FileText, Check, Play, RotateCcw } from 'react-feather';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import VoucherService from '../../services/VoucherService';
import FileUploadService from '../../services/FileUploadService';
import { formatCurrencies, getEntityId, getUserRole } from '../localStorageUtil';
import { getBadgeColor, getStatusLabel } from '../../constant/VoucherConstant';
import '../CompanyManagement/ReactBootstrapTable.scss';

const VoucherDetails = () => {
  const { voucherHeadId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const companyId = location.state?.companyId || getEntityId();
  const supplierId = location.state?.supplierId;
  const fromSupplier = location.state?.fromSupplier;
  const role = getUserRole();

  const [voucher, setVoucher] = useState(null);
  const [orderNo, setOrderNo] = useState('N/A');
  const [previewFile, setPreviewFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [unholdModalOpen, setUnholdModalOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [holdNotes, setHoldNotes] = useState('');
  const [unholdNotes, setUnholdNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isUnholding, setIsUnholding] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [unpayModalOpen, setUnpayModalOpen] = useState(false);
  const [revertModalOpen, setRevertModalOpen] = useState(false);
  const [payNotes, setPayNotes] = useState('');
  const [unpayNotes, setUnpayNotes] = useState('');
  const [revertNotes, setRevertNotes] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [isUnpaying, setIsUnpaying] = useState(false);
  const [isReverting, setIsReverting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      let voucherResponse;
      if (fromSupplier && supplierId) {
        // Call supplier API if coming from supplier side
        voucherResponse = await VoucherService.getSupplierVouchersPaginated(
          supplierId,
          1,
          0,
          '',
          ['CREATED', 'CLOSED', 'APPROVED'],
          voucherHeadId,
        );
      } else {
        // Call company API if coming from company side
        voucherResponse = await VoucherService.getVouchersPaginated(
          companyId,
          1,
          0,
          '',
          ['CREATED', 'CLOSED', 'APPROVED'],
          voucherHeadId,
        );
      }
      // Extract from paginated response structure or legacy structure
      const responseData = voucherResponse.data?.content
        ? voucherResponse.data.content
        : voucherResponse.data || [];
      const voucherData = responseData[0];
      setVoucher(voucherData);

      // Use orderNo directly from voucher response
      setOrderNo(voucherData.orderNo || 'N/A');

      if (voucherData.fileId) {
        try {
          const fileResponse = await FileUploadService.getFileByFileId(voucherData.fileId);
          const fileBlob = new Blob([fileResponse.data], {
            type: fileResponse.headers['content-type'] || 'application/octet-stream',
          });
          const fileUrl = URL.createObjectURL(fileBlob);
          setPreviewFile({
            url: fileUrl,
            name: `Voucher_document`,
            type: fileResponse.headers['content-type'] || 'application/octet-stream',
          });
        } catch (fileError) {
          console.error('Error fetching file:', fileError);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.dismiss();
      toast.error('Failed to load voucher details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    return () => {
      if (previewFile?.url) {
        URL.revokeObjectURL(previewFile.url);
      }
    };
  }, [voucherHeadId, companyId]);

  const handleDownloadVoucher = async () => {
    try {
      // Get the voucher PDF metadata (contains fileId)
      const voucherPdfResponse = await VoucherService.downloadVoucherPdf(companyId, voucherHeadId);
      const { fileId, fileName, contentType } = voucherPdfResponse.data;

      // Download the actual file using the fileId
      const downloadResponse = await FileUploadService.downloadFile(fileId);

      // Create blob and download
      const blob = new Blob([downloadResponse.data], { type: contentType || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || `Voucher_${voucherHeadId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Dismiss any existing toasts and show success immediately
      toast.dismiss();
      toast.success('Voucher downloaded successfully');
    } catch (error) {
      console.error('Error downloading voucher:', error);
      toast.dismiss();
      toast.error('Failed to download voucher PDF');
    }
  };

  const handleApproveVoucher = async () => {
    if (!notes.trim()) {
      toast.dismiss();
      toast.error('Please enter notes before approving');
      return;
    }

    try {
      setIsApproving(true);
      const approvalData = {
        status: 'unpaid',
        notes: notes.trim(),
      };

      await VoucherService.handleChangeStatus(companyId, voucherHeadId, approvalData);

      setApproveModalOpen(false);
      setNotes('');

      setTimeout(() => {
        toast.dismiss();
        toast.success('Voucher approved successfully');
      }, 100);

      fetchData();
    } catch (error) {
      console.error('Error approving voucher:', error);
      toast.dismiss();
      toast.error(error.response?.data?.errorMessage || 'Failed to approve voucher');
    } finally {
      setIsApproving(false);
    }
  };

  const handlePayVoucher = async () => {
    if (!payNotes.trim()) {
      toast.dismiss();
      toast.error('Please enter payment notes');
      return;
    }

    try {
      setIsPaying(true);
      const paymentData = {
        status: 'paid',
        notes: payNotes.trim(),
      };

      await VoucherService.handleChangeStatus(companyId, voucherHeadId, paymentData);

      setPayModalOpen(false);
      setPayNotes('');

      setTimeout(() => {
        toast.dismiss();
        toast.success('Voucher marked as paid successfully');
      }, 100);

      fetchData();
    } catch (error) {
      console.error('Error paying voucher:', error);
      toast.dismiss();
      toast.error(error.response?.data?.errorMessage || 'Failed to mark voucher as paid');
    } finally {
      setIsPaying(false);
    }
  };

  const handleUnpayVoucher = async () => {
    if (!unpayNotes.trim()) {
      toast.dismiss();
      toast.error('Please enter notes for reverting payment');
      return;
    }

    try {
      setIsUnpaying(true);
      const unpayData = {
        status: 'unpaid',
        notes: unpayNotes.trim(),
      };

      await VoucherService.handleChangeStatus(companyId, voucherHeadId, unpayData);

      setUnpayModalOpen(false);
      setUnpayNotes('');

      setTimeout(() => {
        toast.dismiss();
        toast.success('Voucher payment reverted successfully');
      }, 100);

      fetchData();
    } catch (error) {
      console.error('Error reverting voucher payment:', error);
      toast.dismiss();
      toast.error(error.response?.data?.errorMessage || 'Failed to revert voucher payment');
    } finally {
      setIsUnpaying(false);
    }
  };

  const handleRevertVoucher = async () => {
    if (!revertNotes.trim()) {
      toast.dismiss();
      toast.error('Please enter reason for reverting the voucher');
      return;
    }

    try {
      setIsReverting(true);
      const revertData = {
        status: 'created',
        notes: revertNotes.trim(),
      };

      await VoucherService.handleChangeStatus(companyId, voucherHeadId, revertData);

      setRevertModalOpen(false);
      setRevertNotes('');

      setTimeout(() => {
        toast.dismiss();
        toast.success('Voucher reverted to created status successfully');
      }, 100);

      fetchData();
    } catch (error) {
      console.error('Error reverting voucher:', error);
      toast.dismiss();
      toast.error(error.response?.data?.errorMessage || 'Failed to revert voucher');
    } finally {
      setIsReverting(false);
    }
  };

  const handleHoldVoucher = async () => {
    if (!holdNotes.trim()) {
      toast.dismiss();
      toast.error('Please enter notes for holding the voucher');
      return;
    }

    try {
      setIsHolding(true);
      const holdData = {
        status: 'on_hold',
        notes: holdNotes.trim(),
      };

      await VoucherService.handleChangeStatus(companyId, voucherHeadId, holdData);
      setHoldModalOpen(false);
      setHoldNotes('');

      setTimeout(() => {
        toast.dismiss();
        toast.success('Voucher put on hold successfully');
      }, 100);

      fetchData();
    } catch (error) {
      console.error('Error holding voucher:', error);
      toast.dismiss();
      toast.error(error.response?.data?.errorMessage || 'Failed to hold voucher');
    } finally {
      setIsHolding(false);
    }
  };

  const handleUnholdVoucher = async () => {
    if (!unholdNotes.trim()) {
      toast.dismiss();
      toast.error('Please enter notes for unholding the voucher');
      return;
    }

    try {
      setIsUnholding(true);
      const unholdData = {
        status: 'created',
        notes: unholdNotes.trim(),
      };

      await VoucherService.handleChangeStatus(companyId, voucherHeadId, unholdData);

      // PEHLE modal close karo
      setUnholdModalOpen(false);
      setUnholdNotes('');

      // THODA WAIT karo, PHIR toast dikhao
      setTimeout(() => {
        toast.dismiss();
        toast.success('Voucher unhold successfully');
      }, 100);

      fetchData();
    } catch (error) {
      console.error('Error unholding voucher:', error);
      toast.dismiss();
      toast.error(error.response?.data?.errorMessage || 'Failed to unhold voucher');
    } finally {
      setIsUnholding(false);
    }
  };
  const getSupplierDetails = () => {
    return voucher?.supplier || {};
  };

  const getCompanyName = () => {
    return voucher?.company?.name || voucher?.company?.displayName || '—';
  };

  const toggleModal = () => {
    setModalOpen(!modalOpen);
  };

  const toggleApproveModal = () => {
    setApproveModalOpen(!approveModalOpen);
  };

  const toggleHoldModal = () => {
    setHoldModalOpen(!holdModalOpen);
  };

  const toggleUnholdModal = () => {
    setUnholdModalOpen(!unholdModalOpen);
  };
  const togglePayModal = () => {
    setPayModalOpen(!payModalOpen);
  };

  const toggleUnpayModal = () => {
    setUnpayModalOpen(!unpayModalOpen);
  };

  const toggleRevertModal = () => {
    setRevertModalOpen(!revertModalOpen);
  };

  if (isLoading) {
    return (
      <div className="text-center py-3">
        <Spinner color="primary" /> Loading Voucher Details
      </div>
    );
  }

  if (!voucher) {
    return <div className="alert alert-danger my-5">Voucher not found</div>;
  }

  const supplier = getSupplierDetails();
  const companyName = getCompanyName();
  const voucherStatus = voucher.status.status.toLowerCase();

  return (
    <div style={{ paddingTop: '24px' }}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover={false}
        limit={1}
        style={{ top: '12px', right: '12px', zIndex: 9999 }}
        toastStyle={{
          marginBottom: '0',
          position: 'absolute',
          top: 0,
          right: 0,
        }}
      />
      <div className="card h-100 shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
        <div className="card-body" style={{ padding: '24px' }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-3">
              <div
                className="icon-wrapper"
                style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#009efb',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="fas fa-file-invoice text-white" style={{ fontSize: '20px' }}></i>
              </div>
              <div>
                <div
                  className="mb-1"
                  style={{
                    fontSize: '32px',
                    letterSpacing: '0.5px',
                    lineHeight: '1.2',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ color: '#495057', fontWeight: '400', fontSize: '32px' }}>
                    Voucher No.
                  </span>
                  <span
                    style={{
                      color: '#212529',
                      fontWeight: '800',
                      marginLeft: '12px',
                      fontSize: '32px',
                    }}
                  >
                    {voucher.voucherNo || 'N/A'}
                  </span>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <Badge
                    color={getBadgeColor(voucher.status.status)}
                    style={{
                      fontSize: '0.75rem',
                      padding: '6px 12px',
                      fontWeight: '500',
                      letterSpacing: '0.3px',
                      textTransform: 'uppercase',
                      borderRadius: '6px',
                      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
                    }}
                  >
                    {getStatusLabel(voucher.status.status)}
                  </Badge>
                  {voucher.statusHistory?.length > 0 && (
                    <Button
                      className="btn"
                      onClick={toggleModal}
                      style={{
                        backgroundColor: '#f8f9fa',
                        color: '#009efb',
                        border: '1px solid #009efb',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        padding: '6px 12px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(0, 158, 251, 0.1)',
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = '#009efb';
                        e.target.style.color = 'white';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = '#f8f9fa';
                        e.target.style.color = '#009efb';
                      }}
                      onFocus={(e) => {
                        e.target.style.backgroundColor = '#009efb';
                        e.target.style.color = 'white';
                      }}
                      onBlur={(e) => {
                        e.target.style.backgroundColor = '#f8f9fa';
                        e.target.style.color = '#009efb';
                      }}
                    >
                      <i className="fas fa-history me-2"></i>Status History
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="d-flex gap-2">
              <Button
                className="btn btn-gradient-primary"
                onClick={() => {
                  const from = location.state?.from;
                  if (from) navigate(from);
                  else if (window.history.length > 1) navigate(-1);
                  else navigate('/bills');
                }}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                  border: 'none',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                }}
              >
                <i className="fas fa-arrow-left me-2"></i>Back
              </Button>
            </div>
          </div>

          {/* Rest of your existing JSX remains the same until the modal sections */}
          <div className="row">
            <div className="col-lg-6 col-md-12">
              <div className="border-start ps-3">
                {previewFile ? (
                  <>
                    {previewFile.type.includes('pdf') ? (
                      <div style={{ height: '500px', width: '100%' }}>
                        <iframe
                          src={previewFile.url}
                          title="PDF Preview"
                          width="100%"
                          height="100%"
                          style={{ border: '1px solid #dee2e6', borderRadius: '6px' }}
                        />
                      </div>
                    ) : previewFile.type.includes('image') ? (
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: '500px',
                          border: '1px solid #dee2e6',
                          borderRadius: '6px',
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={previewFile.url}
                          alt="Attached File"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className="text-center"
                        style={{
                          height: '500px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          border: '1px solid #dee2e6',
                          borderRadius: '6px',
                          backgroundColor: '#f8f9fa',
                        }}
                      >
                        <FileText size={48} color="#6c757d" />
                        <p className="mt-2 mb-3" style={{ color: '#6c757d', fontSize: '14px' }}>
                          {previewFile.name}
                        </p>
                        <Button
                          className="btn btn-gradient-primary"
                          size="sm"
                          onClick={() => window.open(previewFile.url, '_blank')}
                          style={{
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                            border: 'none',
                            color: 'white',
                            fontSize: '12px',
                            padding: '6px 12px',
                          }}
                        >
                          Download to View
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    className="text-center"
                    style={{
                      height: '500px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      border: '1px solid #dee2e6',
                      borderRadius: '6px',
                      backgroundColor: '#f8f9fa',
                    }}
                  >
                    <FileText size={48} color="#6c757d" />
                    <p style={{ color: '#6c757d', fontSize: '14px', marginTop: '12px' }}>
                      No file available for preview
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="col-lg-6 col-md-12 mb-3 mb-lg-0">
              <div>
                {/* Voucher Information Section */}
                <div className="row mb-3">
                  <div className="col-md-6 mb-3 mb-md-0">
                    <div
                      style={{
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        padding: '12px',
                        border: '1px solid #e9ecef',
                        height: '100%',
                      }}
                    >
                      <h6
                        className="mb-3"
                        style={{ color: '#009efb', fontWeight: '600', fontSize: '13px' }}
                      >
                        <i className="fas fa-info-circle me-2"></i>Voucher Information
                      </h6>
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
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Company:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              <strong style={{ color: '#212529' }}>{companyName}</strong>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Purchase Order:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              {voucher.purchaseOrderId ? (
                                <a
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate(`/purchase-order-detail/${voucher.purchaseOrderId}`, {
                                      state: {
                                        fromVoucherDetail: true,
                                        voucherHeadId,
                                      },
                                    });
                                  }}
                                  style={{
                                    color: '#009efb',
                                    textDecoration: 'none',
                                    cursor: 'pointer',
                                    fontWeight: '600',
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
                                >
                                  <i
                                    className="fas fa-external-link-alt me-1"
                                    style={{ fontSize: '0.75rem' }}
                                  ></i>
                                  {orderNo}
                                </a>
                              ) : (
                                <span className="text-muted">No associated PO</span>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Invoice No:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              <strong style={{ color: '#212529' }}>
                                {voucher.invoiceNo || 'N/A'}
                              </strong>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Invoice Date:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              <strong style={{ color: '#212529' }}>
                                {voucher.invoiceDate
                                  ? new Date(voucher.invoiceDate).toLocaleDateString()
                                  : 'N/A'}
                              </strong>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Created Date:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              <strong style={{ color: '#212529' }}>
                                {voucher.createdDate
                                  ? new Date(voucher.createdDate).toLocaleDateString()
                                  : 'N/A'}
                              </strong>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Created By:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              <span style={{ color: '#212529' }}>
                                {voucher.createdBy
                                  ? `${voucher.createdBy.firstName || ''} ${voucher.createdBy.lastName || ''
                                    }`.trim() || 'N/A'
                                  : 'N/A'}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div
                      style={{
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        padding: '12px',
                        border: '1px solid #e9ecef',
                        height: '100%',
                      }}
                    >
                      <h6
                        className="mb-3"
                        style={{ color: '#28a745', fontWeight: '600', fontSize: '13px' }}
                      >
                        <i className="fas fa-building me-2"></i>Supplier Information
                      </h6>
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
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Name:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              <strong style={{ color: '#212529' }}>{supplier.name || 'N/A'}</strong>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Email:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              <span style={{ color: '#495057' }}>{supplier.email || 'N/A'}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Phone:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              <span style={{ color: '#495057' }}>
                                {supplier.primaryContact || 'N/A'}
                              </span>
                            </td>
                          </tr>
                          {supplier.address && (
                            <tr>
                              <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                                <small className="text-muted">Address:</small>
                              </td>
                              <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                                <span style={{ color: '#495057' }}>
                                  {typeof supplier.address === 'string'
                                    ? supplier.address
                                    : [
                                      supplier.address.addressLine1,
                                      supplier.address.addressLine2,
                                      supplier.address.street,
                                      `${supplier.address.city || ''}${supplier.address.city && supplier.address.state
                                        ? ', '
                                        : ''
                                      }${supplier.address.state || ''}`,
                                      supplier.address.postalCode,
                                      supplier.address.country,
                                    ]
                                      .filter(Boolean)
                                      .join(', ')}
                                </span>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* GRN Details Section - Rest remains the same */}
                {voucher.voucherDetails?.length > 0 ? (
                  <div className="mb-3">
                    <div className="mb-3">
                      <h6 style={{ color: '#17a2b8', fontWeight: '600', fontSize: '14px' }}>
                        <i className="fas fa-clipboard-list me-2"></i>
                        GRN Details ({voucher.voucherDetails.length} Receipt
                        {voucher.voucherDetails.length !== 1 ? 's' : ''})
                      </h6>
                    </div>
                    {voucher.voucherDetails.map((voucherDetail, index) => (
                      <div
                        key={`grn-${voucherDetail.voucherDetailId}`}
                        className="mb-3"
                        style={{
                          border: '1px solid #e8ecef',
                          borderRadius: '8px',
                          backgroundColor: 'white',
                        }}
                      >
                        <div
                          className="d-flex justify-content-between align-items-center"
                          style={{
                            backgroundColor: '#f8f9fa',
                            borderTopLeftRadius: '8px',
                            borderTopRightRadius: '8px',
                            borderBottom: '1px solid #e8ecef',
                            padding: '12px 16px',
                          }}
                        >
                          <div>
                            <h6
                              className="fw-bold mb-0"
                              style={{ color: '#212529', fontSize: '13px' }}
                            >
                              {voucherDetail.grn.grnNo}
                              {voucher.voucherDetails.length > 1 && (
                                <small
                                  className="text-muted ms-2"
                                  style={{ fontSize: '11px', fontWeight: '400' }}
                                >
                                  Receipt {index + 1} of {voucher.voucherDetails.length}
                                </small>
                              )}
                            </h6>
                          </div>
                          <Badge
                            color={getBadgeColor(voucherDetail.grn.status)}
                            style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                          >
                            {getStatusLabel(voucherDetail.grn.status)}
                          </Badge>
                        </div>
                        <div className="table-responsive">
                          <table className="table table-sm mb-0" style={{ fontSize: '0.85rem' }}>
                            <thead style={{ backgroundColor: '#009efb' }}>
                              <tr>
                                <th
                                  className="text-nowrap"
                                  style={{ padding: '8px', fontWeight: '600', color: 'white' }}
                                >
                                  Part ID
                                </th>
                                <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>
                                  Description
                                </th>
                                <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>
                                  U/M
                                </th>
                                <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>
                                  Qty Rcd
                                </th>
                                <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>
                                  Qty Acc
                                </th>
                                <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>
                                  Unit Price
                                </th>
                                <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>
                                  Extended
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {voucherDetail.grn.grnDetails.map((grnDetail) => (
                                <tr key={grnDetail.grnDetailID}>
                                  <td
                                    className="text-nowrap"
                                    style={{ padding: '6px 8px', color: '#495057' }}
                                  >
                                    {grnDetail.partId || '-'}
                                  </td>
                                  <td style={{ padding: '6px 8px', color: '#495057' }}>
                                    {grnDetail.partDescription || '-'}
                                  </td>
                                  <td style={{ padding: '6px 8px', color: '#495057' }}>
                                    {grnDetail.unitOfMeasurement || '-'}
                                  </td>
                                  <td
                                    className="text-center"
                                    style={{ padding: '6px 8px', color: '#495057' }}
                                  >
                                    {grnDetail.qtyReceived || '0'}
                                  </td>
                                  <td
                                    className="text-center"
                                    style={{ padding: '6px 8px', color: '#495057' }}
                                  >
                                    {grnDetail.qtyAccepted || '0'}
                                  </td>
                                  <td style={{ padding: '6px 8px', color: '#495057' }}>
                                    {grnDetail.unitPrice != null
                                      ? formatCurrencies(grnDetail.unitPrice)
                                      : '-'}
                                  </td>
                                  <td
                                    className="fw-bold"
                                    style={{ padding: '6px 8px', color: '#212529' }}
                                  >
                                    {grnDetail.unitPrice && grnDetail.qtyAccepted
                                      ? formatCurrencies(
                                        grnDetail.unitPrice * grnDetail.qtyAccepted,
                                      )
                                      : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}

                    {/* Financial Summary */}
                    <table
                      className="table table-sm mb-2"
                      style={{ width: 'auto', marginLeft: 'auto' }}
                    >
                      <tbody>
                        <tr>
                          <td
                            style={{
                              border: 'none',
                              padding: '2px 8px',
                              fontSize: '0.85rem',
                              color: '#6c757d',
                              textAlign: 'right',
                            }}
                          >
                            Sub Total:
                          </td>
                          <td
                            style={{
                              border: 'none',
                              padding: '2px 8px',
                              fontSize: '0.85rem',
                              color: '#212529',
                              fontWeight: 'bold',
                              textAlign: 'right',
                            }}
                          >
                            {formatCurrencies(
                              voucher.voucherDetails.reduce((total, detail) => {
                                const detailTotal = detail.grn.grnDetails.reduce((sum, item) => {
                                  return sum + item.unitPrice * item.qtyAccepted;
                                }, 0);
                                return total + detailTotal;
                              }, 0),
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td
                            style={{
                              border: 'none',
                              padding: '2px 8px',
                              fontSize: '0.85rem',
                              color: '#6c757d',
                              textAlign: 'right',
                            }}
                          >
                            Tax Total:
                          </td>
                          <td
                            style={{
                              border: 'none',
                              padding: '2px 8px',
                              fontSize: '0.85rem',
                              color: '#212529',
                              fontWeight: 'bold',
                              textAlign: 'right',
                            }}
                          >
                            {formatCurrencies(voucher.tax || 0)}
                          </td>
                        </tr>
                        <tr>
                          <td
                            style={{
                              border: 'none',
                              padding: '2px 8px',
                              fontSize: '0.85rem',
                              color: '#6c757d',
                              textAlign: 'right',
                            }}
                          >
                            Shipping Total:
                          </td>
                          <td
                            style={{
                              border: 'none',
                              padding: '2px 8px',
                              fontSize: '0.85rem',
                              color: '#212529',
                              fontWeight: 'bold',
                              textAlign: 'right',
                            }}
                          >
                            {formatCurrencies(voucher.freight || 0)}
                          </td>
                        </tr>
                        <tr style={{ borderTop: '1px solid #dee2e6' }}>
                          <td
                            style={{
                              border: 'none',
                              padding: '6px 8px 2px 8px',
                              fontSize: '0.9rem',
                              color: '#212529',
                              fontWeight: 'bold',
                              textAlign: 'right',
                            }}
                          >
                            Invoice Total:
                          </td>
                          <td
                            style={{
                              border: 'none',
                              padding: '6px 8px 2px 8px',
                              fontSize: '1rem',
                              color: '#009efb',
                              fontWeight: 'bold',
                              textAlign: 'right',
                            }}
                          >
                            {formatCurrencies(voucher.finalAmount || 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="alert alert-info" style={{ fontSize: '0.9rem' }}>
                    No GRN details available
                  </div>
                )}

                {/* Notes Section */}
                {voucher.notes && (
                  <div className="mb-3">
                    <div
                      style={{
                        backgroundColor: '#f8fcff',
                        border: '1px solid #e1f5fe',
                        borderLeft: '3px solid #81d4fa',
                        borderRadius: '8px',
                        padding: '16px',
                        boxShadow: '0 1px 3px rgba(0, 158, 251, 0.05)',
                      }}
                    >
                      <div>
                        <h6
                          className="mb-2"
                          style={{
                            color: '#0288d1',
                            fontWeight: '500',
                            fontSize: '14px',
                            margin: '0 0 8px 0',
                          }}
                        >
                          <i className="fas fa-comment-alt me-2" style={{ fontSize: '12px' }}></i>
                          Notes & Comments
                        </h6>
                        <div
                          style={{
                            color: '#546e7a',
                            fontSize: '0.9rem',
                            lineHeight: '1.5',
                            fontWeight: '400',
                            wordBreak: 'break-word',
                          }}
                        >
                          {voucher.notes}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pay Voucher Modal */}
          <Modal isOpen={payModalOpen} toggle={togglePayModal}>
            <ModalHeader
              toggle={togglePayModal}
              style={{
                backgroundColor: '#e8f5e9',
                borderBottom: '2px solid #4caf50',
              }}
            >
              <div className="d-flex align-items-center gap-2">
                {/* <DollarSign size={20} color="#2e7d32" /> */}
                <span style={{ color: '#2e7d32', fontWeight: '600' }}>Mark Voucher as Paid</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="alert alert-success">
                <i className="fas fa-check-circle me-2"></i>
                This will mark the voucher as paid and complete the payment process.
              </div>
              <Form>
                <FormGroup>
                  <Label for="payNotes">
                    Payment Details <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="textarea"
                    id="payNotes"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="Enter payment details (reference number, method, etc.)..."
                    required
                    rows={3}
                  />
                </FormGroup>
              </Form>
            </ModalBody>
            <ModalFooter>
              <Button
                className="btn btn-secondary"
                onClick={togglePayModal}
                disabled={isPaying}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)',
                  border: 'none',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(108, 117, 125, 0.3)',
                }}
              >
                Cancel
              </Button>
              <Button
                className="btn btn-success"
                onClick={handlePayVoucher}
                disabled={isPaying || !payNotes.trim()}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                  border: 'none',
                  color: 'white',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                }}
              >
                {isPaying ? (
                  <>
                    <Spinner size="sm" /> Processing...
                  </>
                ) : (
                  <>Mark as Paid</>
                )}
              </Button>
            </ModalFooter>
          </Modal>

          {/* Unpay Voucher Modal */}
          <Modal isOpen={unpayModalOpen} toggle={toggleUnpayModal}>
            <ModalHeader
              toggle={toggleUnpayModal}
              style={{
                backgroundColor: '#ffebee',
                borderBottom: '2px solid #f44336',
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <RotateCcw size={20} color="#c62828" />
                <span style={{ color: '#c62828', fontWeight: '600' }}>Revert Payment Status</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="alert alert-danger">
                <i className="fas fa-exclamation-triangle me-2"></i>
                This will revert the voucher payment status back to unpaid.
              </div>
              <Form>
                <FormGroup>
                  <Label for="unpayNotes">
                    Reason for Reverting <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="textarea"
                    id="unpayNotes"
                    value={unpayNotes}
                    onChange={(e) => setUnpayNotes(e.target.value)}
                    placeholder="Enter reason for reverting payment status..."
                    required
                    rows={3}
                  />
                </FormGroup>
              </Form>
            </ModalBody>
            <ModalFooter>
              <Button
                className="btn btn-secondary"
                onClick={toggleUnpayModal}
                disabled={isUnpaying}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)',
                  border: 'none',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(108, 117, 125, 0.3)',
                }}
              >
                Cancel
              </Button>
              <Button
                className="btn btn-danger"
                onClick={handleUnpayVoucher}
                disabled={isUnpaying || !unpayNotes.trim()}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #f44336 0%, #c62828 100%)',
                  border: 'none',
                  color: 'white',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(244, 67, 54, 0.3)',
                }}
              >
                {isUnpaying ? (
                  <>
                    <Spinner size="sm" /> Reverting...
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} className="me-1" /> Revert to Unpaid
                  </>
                )}
              </Button>
            </ModalFooter>
          </Modal>

          {/* Revert Voucher Modal */}
          <Modal isOpen={revertModalOpen} toggle={toggleRevertModal}>
            <ModalHeader
              toggle={toggleRevertModal}
              style={{
                backgroundColor: '#fff8e1',
                borderBottom: '2px solid #ffa000',
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <RotateCcw size={20} color="#ff8f00" />
                <span style={{ color: '#ff8f00', fontWeight: '600' }}>Revert Voucher Status</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="alert alert-warning">
                <i className="fas fa-exclamation-triangle me-2"></i>
                This will revert the voucher status back to Created for further review.
              </div>
              <Form>
                <FormGroup>
                  <Label for="revertNotes">
                    Reason for Reverting <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="textarea"
                    id="revertNotes"
                    value={revertNotes}
                    onChange={(e) => setRevertNotes(e.target.value)}
                    placeholder="Enter reason for reverting the voucher..."
                    required
                    rows={3}
                  />
                </FormGroup>
              </Form>
            </ModalBody>
            <ModalFooter>
              <Button
                className="btn btn-secondary"
                onClick={toggleRevertModal}
                disabled={isReverting}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)',
                  border: 'none',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(108, 117, 125, 0.3)',
                }}
              >
                Cancel
              </Button>
              <Button
                className="btn btn-warning"
                onClick={handleRevertVoucher}
                disabled={isReverting || !revertNotes.trim()}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #ffa000 0%, #ff8f00 100%)',
                  border: 'none',
                  color: 'white',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(255, 160, 0, 0.3)',
                }}
              >
                {isReverting ? (
                  <>
                    <Spinner size="sm" /> Reverting...
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} className="me-1" /> Revert to Created
                  </>
                )}
              </Button>
            </ModalFooter>
          </Modal>

          {/* Status History Modal */}
          <Modal isOpen={modalOpen} toggle={toggleModal} size="lg">
            <ModalHeader
              toggle={toggleModal}
              style={{
                backgroundColor: '#f8f9fa',
                borderBottom: '2px solid #009efb',
                padding: '20px 24px',
              }}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#009efb',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i className="fas fa-history text-white"></i>
                </div>
                <div>
                  <h5 className="mb-0" style={{ fontWeight: '600', color: '#212529' }}>
                    Status History - {voucher.voucherNo}
                  </h5>
                  <small className="text-muted">Track all status changes and approvals</small>
                </div>
              </div>
            </ModalHeader>
            <ModalBody style={{ padding: '24px', maxHeight: '300px', overflow: 'auto' }}>
              {voucher.statusHistory?.length > 0 ? (
                <div className="timeline" style={{ position: 'relative' }}>
                  {/* Timeline line */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '16px',
                      top: '0',
                      bottom: '0',
                      width: '2px',
                      backgroundColor: '#e9ecef',
                    }}
                  ></div>

                  {[...voucher.statusHistory].reverse().map((entry, index) => (
                    <div
                      key={`status-${entry.status}-${entry.createdDate}-${entry.createdBy?.email || 'unknown'
                        }`}
                      className="timeline-item"
                      style={{
                        position: 'relative',
                        paddingLeft: '48px',
                        marginBottom:
                          index === [...voucher.statusHistory].reverse().length - 1 ? '0' : '20px',
                      }}
                    >
                      {/* Timeline dot */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '8px',
                          top: '2px',
                          width: '16px',
                          height: '16px',
                          backgroundColor: index === 0 ? '#009efb' : '#28a745',
                          borderRadius: '50%',
                          border: '3px solid white',
                          boxShadow: '0 0 0 2px #e9ecef',
                          zIndex: 1,
                        }}
                      ></div>

                      <div
                        className="timeline-content"
                        style={{
                          backgroundColor: 'white',
                          border: '1px solid #e9ecef',
                          borderRadius: '8px',
                          padding: '12px',
                          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <Badge
                              color={getBadgeColor(entry.status)}
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                padding: '3px 8px',
                                borderRadius: '4px',
                              }}
                            >
                              {getStatusLabel(entry.status)}
                            </Badge>
                            {index === 0 && (
                              <span
                                className="badge bg-success"
                                style={{ fontSize: '0.65rem', padding: '2px 6px' }}
                              >
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-end">
                            <div
                              style={{ fontSize: '0.8rem', fontWeight: '600', color: '#212529' }}
                            >
                              {new Date(entry.createdDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                            <div
                              style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: '500' }}
                            >
                              {new Date(entry.createdDate).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="d-flex align-items-center gap-2 mb-1">
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <i
                              className="fas fa-user"
                              style={{ fontSize: '8px', color: '#6c757d' }}
                            ></i>
                          </div>
                          <div>
                            <div
                              style={{ fontSize: '0.8rem', fontWeight: '500', color: '#212529' }}
                            >
                              {entry.createdBy?.firstName} {entry.createdBy?.lastName}{' '}
                              <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                ({entry.createdBy?.email})
                              </small>
                            </div>
                          </div>
                        </div>

                        {entry.notes && (
                          <div
                            style={{
                              backgroundColor: '#f8f9fa',
                              borderRadius: '6px',
                              padding: '8px',
                              marginTop: '8px',
                              border: '1px solid #e9ecef',
                            }}
                          >
                            <div className="d-flex align-items-start gap-2">
                              <i
                                className="fas fa-comment-alt"
                                style={{
                                  fontSize: '10px',
                                  color: '#6c757d',
                                  marginTop: '2px',
                                }}
                              ></i>
                              <div>
                                <small
                                  className="text-muted d-block mb-1"
                                  style={{ fontWeight: '500', fontSize: '0.7rem' }}
                                >
                                  Notes:
                                </small>
                                <div
                                  style={{
                                    fontSize: '0.75rem',
                                    color: '#495057',
                                    lineHeight: '1.3',
                                  }}
                                >
                                  {entry.notes}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5">
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}
                  >
                    <i
                      className="fas fa-history"
                      style={{ fontSize: '24px', color: '#6c757d' }}
                    ></i>
                  </div>
                  <h6 className="mb-2">No Status History Available</h6>
                  <p className="text-muted mb-0">
                    This voucher doesn&apos;t have any recorded status changes yet.
                  </p>
                </div>
              )}
            </ModalBody>
            <ModalFooter style={{ backgroundColor: '#f8f9fa', borderTop: '1px solid #e9ecef' }}>
              <Button
                className="btn btn-gradient-primary"
                onClick={toggleModal}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                  border: 'none',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                  padding: '10px 24px',
                }}
              >
                <i className="fas fa-times me-2"></i>Close
              </Button>
            </ModalFooter>
          </Modal>

          {/* Approve Voucher Modal */}
          <Modal isOpen={approveModalOpen} toggle={toggleApproveModal}>
            <ModalHeader toggle={toggleApproveModal}>Approve Voucher</ModalHeader>
            <ModalBody>
              <Form>
                <FormGroup>
                  <Label for="approvalNotes">
                    Notes <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="textarea"
                    id="approvalNotes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter approval notes..."
                    required
                  />
                </FormGroup>
              </Form>
            </ModalBody>
            <ModalFooter>
              <Button
                className="btn btn-secondary"
                onClick={toggleApproveModal}
                disabled={isApproving}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)',
                  border: 'none',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(108, 117, 125, 0.3)',
                }}
              >
                Cancel
              </Button>
              <Button
                className="btn btn-success"
                onClick={handleApproveVoucher}
                disabled={isApproving || !notes.trim()}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)',
                }}
              >
                {isApproving ? (
                  <>
                    <Spinner size="sm" /> Marking Ready to pay...
                  </>
                ) : (
                  <>
                    <Check size={14} className="me-1" /> Ready to pay
                  </>
                )}
              </Button>
            </ModalFooter>
          </Modal>

          {/* Hold Voucher Modal */}
          <Modal isOpen={holdModalOpen} toggle={toggleHoldModal}>
            <ModalHeader
              toggle={toggleHoldModal}
              style={{
                backgroundColor: '#fff3cd',
                borderBottom: '2px solid #ffc107',
              }}
            >
              <div className="d-flex align-items-center gap-2">
                {/* <Pause size={20} color="#856404" /> */}
                <span style={{ color: '#856404', fontWeight: '600' }}>Hold Voucher</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="alert alert-warning">
                <i className="fas fa-exclamation-triangle me-2"></i>
                This voucher will be put on hold and cannot be approved until its unhold.
              </div>
              <Form>
                <FormGroup>
                  <Label for="holdNotes">
                    Reason for Hold <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="textarea"
                    id="holdNotes"
                    value={holdNotes}
                    onChange={(e) => setHoldNotes(e.target.value)}
                    placeholder="Enter reason for holding the voucher..."
                    required
                    rows={3}
                  />
                </FormGroup>
              </Form>
            </ModalBody>
            <ModalFooter>
              <Button
                className="btn btn-secondary"
                onClick={toggleHoldModal}
                disabled={isHolding}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)',
                  border: 'none',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(108, 117, 125, 0.3)',
                }}
              >
                Cancel
              </Button>
              <Button
                className="btn btn-warning"
                onClick={handleHoldVoucher}
                disabled={isHolding || !holdNotes.trim()}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)',
                  border: 'none',
                  color: 'white',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(255, 193, 7, 0.3)',
                }}
              >
                {isHolding ? (
                  <>
                    <Spinner size="sm" color="dark" /> Holding...
                  </>
                ) : (
                  <>Hold Voucher</>
                )}
              </Button>
            </ModalFooter>
          </Modal>

          {/* Unhold Voucher Modal */}
          <Modal isOpen={unholdModalOpen} toggle={toggleUnholdModal}>
            <ModalHeader
              toggle={toggleUnholdModal}
              style={{
                backgroundColor: '#d1ecf1',
                borderBottom: '2px solid #17a2b8',
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <Play size={20} color="#0c5460" />
                <span style={{ color: '#0c5460', fontWeight: '600' }}>Unhold Voucher</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <div
                style={{
                  backgroundColor: '#d1ecf1',
                  borderBottom: '2px solid #17a2b8',
                  padding: '15px',
                  marginBottom: '1rem',
                }}
              >
                <i className="fas fa-info-circle"></i>
                This voucher will be removed from hold status and can be processed for approval.
              </div>
              <Form>
                <FormGroup>
                  <Label for="unholdNotes">
                    Reason for Unhold <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="textarea"
                    id="unholdNotes"
                    value={unholdNotes}
                    onChange={(e) => setUnholdNotes(e.target.value)}
                    placeholder="Enter reason for unholding the voucher..."
                    required
                    rows={3}
                  />
                </FormGroup>
              </Form>
            </ModalBody>
            <ModalFooter>
              <Button
                className="btn btn-secondary"
                onClick={toggleUnholdModal}
                disabled={isUnholding}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)',
                  border: 'none',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(108, 117, 125, 0.3)',
                }}
              >
                Cancel
              </Button>
              <Button
                className="btn btn-info"
                onClick={handleUnholdVoucher}
                disabled={isUnholding || !unholdNotes.trim()}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                  border: 'none',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(23, 162, 184, 0.3)',
                }}
              >
                {isUnholding ? (
                  <>
                    <Spinner size="sm" /> Unholding...
                  </>
                ) : (
                  <>
                    <Play size={14} className="me-1" /> Unhold Voucher
                  </>
                )}
              </Button>
            </ModalFooter>
          </Modal>

          {/* Action Buttons */}
          <div className="d-flex justify-content-end border-top pt-3">
            <div className="d-flex gap-2">
              {/* Hold/Unhold buttons for Account Payable and Company Admin roles */}
              {(role.includes('ACCOUNT_PAYABLE') || role.includes('COMPANY_ADMIN')) && (
                <>
                  {voucherStatus === 'on_hold' ? (
                    <Button
                      className="btn btn-info gap-2"
                      onClick={toggleUnholdModal}
                      style={{
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                        border: 'none',
                        boxShadow: '0 4px 15px rgba(23, 162, 184, 0.3)',
                      }}
                    >
                      <Play size={14} /> Unhold Voucher
                    </Button>
                  ) : (
                    voucherStatus === 'created' && (
                      <Button
                        className="btn btn-warning gap-2"
                        onClick={toggleHoldModal}
                        style={{
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)',
                          border: 'none',
                          color: 'white',
                          fontWeight: '600',
                          boxShadow: '0 4px 15px rgba(255, 193, 7, 0.3)',
                        }}
                      >
                        Hold Voucher
                      </Button>
                    )
                  )}
                </>
              )}

              {/* Buttons for UNPAID status */}
              {voucherStatus === 'unpaid' &&
                (role.includes('ACCOUNT_PAYABLE') || role.includes('COMPANY_ADMIN')) && (
                  <>
                    {/* Mark as Paid button */}
                    <Button
                      className="btn btn-success gap-2"
                      onClick={togglePayModal}
                      style={{
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                        border: 'none',
                        boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                      }}
                    >
                      Mark as Paid
                    </Button>

                    {/* Revert to Created button */}
                    <Button
                      className="btn btn-warning gap-2"
                      onClick={toggleRevertModal}
                      style={{
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #ffa000 0%, #ff8f00 100%)',
                        border: 'none',
                        color: 'white',
                        fontWeight: '600',
                        boxShadow: '0 4px 15px rgba(255, 160, 0, 0.3)',
                      }}
                    >
                      <RotateCcw size={14} /> Revert to Created
                    </Button>
                  </>
                )}

              {/* Revert to Unpaid button for PAID status */}
              {voucherStatus === 'paid' &&
                (role.includes('ACCOUNT_PAYABLE') || role.includes('COMPANY_ADMIN')) && (
                  <Button
                    className="btn btn-danger gap-2"
                    onClick={toggleUnpayModal}
                    style={{
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #f44336 0%, #c62828 100%)',
                      border: 'none',
                      boxShadow: '0 4px 15px rgba(244, 67, 54, 0.3)',
                    }}
                  >
                    <RotateCcw size={14} /> Revert to Unpaid
                  </Button>
                )}

              {/* Approve button for CREATED status */}
              {voucherStatus === 'created' &&
                (role.includes('ACCOUNT_PAYABLE') || role.includes('COMPANY_ADMIN')) && (
                  <Button
                    className="btn btn-success gap-2"
                    onClick={toggleApproveModal}
                    style={{
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                      border: 'none',
                      boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)',
                    }}
                  >
                    <Check size={14} /> Ready to pay
                  </Button>
                )}

              {/* Download Voucher button - always visible */}
              <Button
                className="btn btn-gradient-primary gap-2"
                onClick={handleDownloadVoucher}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                  border: 'none',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                }}
              >
                <Download size={14} /> Download Voucher
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoucherDetails;
