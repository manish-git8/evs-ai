import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Row,
  Col,
  Input,
  Label,
} from 'reactstrap';
// Note: Using Bootstrap row/col classes for main layout to match VoucherDetails
// Row/Col still used in approval modal
import { Check, FileText, Download, Trash2 } from 'react-feather';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate, useParams } from 'react-router-dom';
import InvoiceService from '../../services/InvoiceService';
import FileUploadService from '../../services/FileUploadService';
import VoucherService from '../../services/VoucherService';
import { formatDate, getEntityId, getUserRole, formatCurrency, getCurrencySymbol, getCompanyCurrency } from '../localStorageUtil';
import { formatDualCurrency, getExchangeRate, getUserType } from '../../utils/currencyUtils';
import '../CompanyManagement/ReactBootstrapTable.scss';

const CompanyInvoiceDetails = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const companyId = getEntityId();
  const role = getUserRole();
  const companyCurrency = getCompanyCurrency();
  const userType = getUserType();

  const [invoice, setInvoice] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [grnList, setGrnList] = useState([]);
  const [selectedGrnIds, setSelectedGrnIds] = useState([]);
  const [isLoadingGrns, setIsLoadingGrns] = useState(false);
  const [linkedVoucherDetails, setLinkedVoucherDetails] = useState([]); // GRNs linked to voucher for APPROVED invoices
  const [taxAmount, setTaxAmount] = useState(0);
  const [freightCharges, setFreightCharges] = useState(0);

  // Calculate subtotal from selected GRNs
  const calculateSubtotalFromGrns = () => {
    if (selectedGrnIds.length === 0) return 0;
    return grnList
      .filter(grn => selectedGrnIds.includes(grn.grnId))
      .reduce((total, grn) => {
        const grnTotal = grn.grnDetails?.reduce((sum, detail) => {
          return sum + ((detail.qtyAccepted || 0) * (detail.unitPrice || 0));
        }, 0) || 0;
        return total + grnTotal;
      }, 0);
  };

  // Calculate invoice total
  const calculatedSubtotal = calculateSubtotalFromGrns();
  const calculatedTotal = calculatedSubtotal + parseFloat(taxAmount || 0) + parseFloat(freightCharges || 0);

  const fetchInvoiceDetails = async () => {
  try {
    setIsLoading(true);
    const response = await InvoiceService.getInvoiceByIdForCompany(companyId, invoiceId);
    setInvoice(response.data);

    if (response.data?.supplier) {
      setSupplier(response.data.supplier);
    }

    if (response.data?.invoiceAnnexure) {
      try {
        const fileResponse = await FileUploadService.getFileByFileId(response.data.invoiceAnnexure);
        const fileBlob = new Blob([fileResponse.data], {
          type: fileResponse.headers['content-type'] || 'application/octet-stream',
        });
        const fileUrl = URL.createObjectURL(fileBlob);
        setPreviewFile({
          url: fileUrl,
          name: `Invoice_document`,
          type: fileResponse.headers['content-type'] || 'application/octet-stream',
        });
      } catch (fileError) {
        console.error('Error fetching file:', fileError);
      }
    }
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    toast.error('Failed to load invoice details');
  } finally {
    setIsLoading(false);
  }
};

  useEffect(() => {
    fetchInvoiceDetails();

    return () => {
      if (previewFile?.url) {
        URL.revokeObjectURL(previewFile.url);
      }
    };
  }, [invoiceId, companyId]);

  // Fetch exchange rate when supplier currency is available
  useEffect(() => {
    const fetchRate = async () => {
      const supplierCurrency = supplier?.currency;
      if (supplierCurrency && supplierCurrency !== companyCurrency) {
        try {
          const rate = await getExchangeRate(supplierCurrency, companyCurrency);
          setExchangeRate(rate);
        } catch (error) {
          console.error('Error fetching exchange rate:', error);
          setExchangeRate(1);
        }
      } else {
        setExchangeRate(1);
      }
    };
    if (supplier) {
      fetchRate();
    }
  }, [supplier, companyCurrency]);

  // Get supplier currency (fallback to company currency)
  const getSupplierCurrency = () => supplier?.currency || companyCurrency;

  // Format amount for inline display (used in totals section)
  const formatInvoiceAmount = (amount) => {
    const supplierCurrency = getSupplierCurrency();
    if (supplierCurrency === companyCurrency || !amount) {
      return formatCurrency(amount, companyCurrency);
    }
    const convertedAmount = amount * exchangeRate;
    return formatDualCurrency({
      originalPrice: amount,
      originalCurrency: supplierCurrency,
      convertedPrice: convertedAmount,
      convertedCurrency: companyCurrency,
    }, userType);
  };

  // Format amount for stacked display (used in narrow table columns)
  const formatInvoiceAmountStacked = (amount) => {
    const supplierCurrency = getSupplierCurrency();
    if (supplierCurrency === companyCurrency || !amount) {
      return formatCurrency(amount, supplierCurrency);
    }
    const convertedAmount = amount * exchangeRate;
    const primary = userType === 'company'
      ? formatCurrency(convertedAmount, companyCurrency)
      : formatCurrency(amount, supplierCurrency);
    const secondary = userType === 'company'
      ? formatCurrency(amount, supplierCurrency)
      : formatCurrency(convertedAmount, companyCurrency);
    return (
      <div style={{ lineHeight: '1.2' }}>
        <div>{primary}</div>
        <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>({secondary})</div>
      </div>
    );
  };

  const fetchGrnsForPO = async () => {
    if (!invoice?.purchaseOrderId) return;
    try {
      setIsLoadingGrns(true);

      // For APPROVED invoices with a linked voucher, fetch the voucher details
      // to show only the GRNs that were associated at approval time
      if (invoice.status === 'APPROVED' && invoice.voucherHeadId) {
        try {
          const voucherResponse = await VoucherService.getVouchersPaginated(
            companyId,
            1,
            0,
            '',
            ['CREATED', 'CLOSED', 'APPROVED', 'UNPAID', 'PAID', 'ON_HOLD'],
            invoice.voucherHeadId
          );
          const voucherData = voucherResponse.data?.content?.[0] || voucherResponse.data?.[0];
          if (voucherData?.voucherDetails?.length > 0) {
            // Store the linked voucher details (contains GRN info)
            setLinkedVoucherDetails(voucherData.voucherDetails);
            setGrnList([]); // Clear grnList since we use linkedVoucherDetails for APPROVED
          } else {
            setLinkedVoucherDetails([]);
            setGrnList([]);
          }
        } catch (voucherError) {
          console.error('Error fetching linked voucher:', voucherError);
          setLinkedVoucherDetails([]);
          setGrnList([]);
        }
      } else if (invoice.status === 'PENDING') {
        // For PENDING invoices, fetch all GRNs for the PO
        const response = await VoucherService.getGrnByPoOrderNumberPaginated(
          companyId,
          invoice.purchaseOrderId,
          100,
          0
        );
        const grns = response.data?.content || response.data || [];
        // Show all GRNs, but only 'created' status will be selectable
        setGrnList(grns);
        setLinkedVoucherDetails([]);
      } else {
        // For other statuses (REJECTED, etc.), don't show GRNs
        setGrnList([]);
        setLinkedVoucherDetails([]);
      }
    } catch (error) {
      console.error('Error fetching GRNs:', error);
    } finally {
      setIsLoadingGrns(false);
    }
  };

  // Fetch GRNs when invoice is loaded
  useEffect(() => {
    if (invoice?.purchaseOrderId) {
      fetchGrnsForPO();
    }
  }, [invoice?.purchaseOrderId, invoice?.status, invoice?.voucherHeadId]);

  const handleApproveInvoice = async () => {
    if (selectedGrnIds.length === 0) {
      toast.error('Please select at least one GRN to approve the invoice');
      return;
    }
    try {
      setIsApproving(true);
      const approvalData = {
        approvalNotes: approvalNotes,
        grnIds: selectedGrnIds,
        subtotal: calculatedSubtotal,
        tax: parseFloat(taxAmount || 0),
        freight: parseFloat(freightCharges || 0),
        finalAmount: calculatedTotal,
      };
      await InvoiceService.approveInvoice(companyId, invoiceId, approvalData);
      toast.success('Invoice approved successfully! Voucher has been created.');
      setApprovalNotes('');
      setSelectedGrnIds([]);
      setTaxAmount(0);
      setFreightCharges(0);
      fetchInvoiceDetails();
      setApproveModalOpen(false);
    } catch (error) {
      console.error('Error approving invoice:', error);
      toast.error(error.response?.data?.errorMessage || 'Failed to approve invoice');
    } finally {
      setIsApproving(false);
    }
  };

  const toggleApproveModal = () => {
    const newState = !approveModalOpen;
    setApproveModalOpen(newState);
    if (newState) {
      setApprovalNotes('');
    }
  };

  const handleGrnSelection = (grnId) => {
    setSelectedGrnIds(prev => {
      if (prev.includes(grnId)) {
        return prev.filter(id => id !== grnId);
      } else {
        return [...prev, grnId];
      }
    });
  };

  // Get only GRNs with 'created' status that are eligible for selection
  const eligibleGrns = grnList.filter(grn => grn.status?.toLowerCase() === 'created');

  const handleSelectAllGrns = () => {
    if (selectedGrnIds.length === eligibleGrns.length) {
      setSelectedGrnIds([]);
    } else {
      setSelectedGrnIds(eligibleGrns.map(grn => grn.grnId));
    }
  };

  const toggleDeleteModal = () => {
    setDeleteModalOpen(!deleteModalOpen);
  };

  const handleDeleteInvoice = async () => {
    try {
      setIsDeleting(true);
      await InvoiceService.deleteInvoiceByCompany(companyId, invoiceId);
      toast.success('Invoice deleted successfully');
      setDeleteModalOpen(false);
      navigate('/company-invoices');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error(error.response?.data?.errorMessage || 'Failed to delete invoice');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadFile = async () => {
    if (!invoice?.invoiceAnnexure) return;
    try {
      toast.info('Downloading file...');
      const downloadResponse = await FileUploadService.downloadFile(invoice.invoiceAnnexure);
      const blob = new Blob([downloadResponse.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${invoice.invoiceNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success('File downloaded successfully');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.dismiss();
      toast.error('Failed to download file');
    }
  };

  const navigateToPurchaseOrder = () => {
    if (invoice?.purchaseOrderId) {
      navigate(`/purchase-order-detail/${invoice.purchaseOrderId}`);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'REJECTED':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner color="primary" /> Loading Invoice Details...
      </div>
    );
  }

  if (!invoice) {
    return <div className="alert alert-danger my-5">Invoice not found</div>;
  }

  const canApprove = (role.includes('COMPANY_ADMIN') || role.includes('ACCOUNT_PAYABLE')) && invoice.status === 'PENDING';
  const canDelete = (role.includes('COMPANY_ADMIN') || role.includes('ACCOUNT_PAYABLE')) && invoice.status === 'PENDING';

  return (
    <div style={{ paddingTop: '24px' }}>
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
      />
      <div className="card h-100 shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
        <div className="card-body" style={{ padding: '24px' }}>
          {/* Header */}
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
                    fontSize: '28px',
                    letterSpacing: '0.5px',
                    lineHeight: '1.2',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ color: '#495057', fontWeight: '400', fontSize: '28px' }}>
                    Invoice No.
                  </span>
                  <span
                    style={{
                      color: '#212529',
                      fontWeight: '800',
                      marginLeft: '12px',
                      fontSize: '28px',
                    }}
                  >
                    {invoice.invoiceNo || 'N/A'}
                  </span>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <Badge
                    color={getStatusBadgeColor(invoice.status)}
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
                    {invoice.status}
                  </Badge>
                  {invoice.voucherNo && (
                    <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                      <i className="fas fa-receipt me-1"></i>
                      Voucher:{' '}
                      {invoice.voucherHeadId ? (
                        <strong
                          onClick={() => navigate(`/voucher-detail/${invoice.voucherHeadId}`)}
                          style={{
                            color: '#009efb',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                          title="Click to view Voucher details"
                        >
                          {invoice.voucherNo}
                        </strong>
                      ) : (
                        <strong style={{ color: '#009efb' }}>{invoice.voucherNo}</strong>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="d-flex gap-2">
              {invoice.invoiceAnnexure && (
                <Button
                  className="btn btn-gradient-info"
                  onClick={handleDownloadFile}
                  style={{
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                    border: 'none',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(23, 162, 184, 0.3)',
                  }}
                >
                  <Download size={16} className="me-2" />
                  Download
                </Button>
              )}
              <Button
                className="btn btn-gradient-primary"
                onClick={() => navigate('/company-invoices')}
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

          {/* Main Content - Two Column Layout like VoucherDetails */}
          <div className="row">
            {/* Left Column - Document Preview */}
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

            {/* Right Column - Invoice Information & Supplier */}
            <div className="col-lg-6 col-md-12 mb-3 mb-lg-0">
              <div>
                {/* Invoice Information & Supplier Section - Side by Side */}
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
                        <i className="fas fa-info-circle me-2"></i>Invoice Information
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
                              <small className="text-muted">Purchase Order:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              {invoice.purchaseOrderId ? (
                                <a
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigateToPurchaseOrder();
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
                                >
                                  <i
                                    className="fas fa-external-link-alt me-1"
                                    style={{ fontSize: '0.75rem' }}
                                  ></i>
                                  {invoice.purchaseOrderNumber || 'N/A'}
                                </a>
                              ) : (
                                <span className="text-muted">No associated PO</span>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Invoice Date:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              <strong style={{ color: '#212529' }}>
                                {formatDate(invoice.dateOfIssue)}
                              </strong>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Due Date:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              <strong style={{ color: '#212529' }}>
                                {formatDate(invoice.paymentDueDate)}
                              </strong>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Created Date:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              <strong style={{ color: '#212529' }}>
                                {formatDate(invoice.createdDate)}
                              </strong>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Created By:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              <span style={{ color: '#212529' }}>
                                {invoice.createdByName || 'N/A'}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
                              <small className="text-muted">Payment Terms:</small>
                            </td>
                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                              <strong style={{ color: '#212529' }}>
                                {invoice.paymentTermsName || 'N/A'}
                              </strong>
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
      <strong style={{ color: '#212529' }}>
        {supplier?.name || supplier?.displayName|| 'N/A'}
      </strong>
    </td>
  </tr>
  <tr>
    <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
      <small className="text-muted">Email:</small>
    </td>
    <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
      <span style={{ color: '#495057' }}>{supplier?.email || 'N/A'}</span>
    </td>
  </tr>
  <tr>
    <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
      <small className="text-muted">Phone:</small>
    </td>
    <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
      <span style={{ color: '#495057' }}>
        {supplier?.phone || supplier?.primaryContact|| 'N/A'}
      </span>
    </td>
  </tr>
  {supplier?.supplierAddress && (
    <tr>
      <td style={{ padding: '4px 0', width: '35%', verticalAlign: 'top' }}>
        <small className="text-muted">Address:</small>
      </td>
      <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
        <span style={{ color: '#495057' }}>
          {supplier.supplierAddress}
        </span>
      </td>
    </tr>
  )}
</tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* GRN Details Section - Show for any invoice with a PO */}
                {invoice.purchaseOrderId ? (
                  <div className="mb-3">
                    {/* Header - different for PENDING vs APPROVED */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 style={{ color: '#17a2b8', fontWeight: '600', fontSize: '14px', marginBottom: 0 }}>
                        <i className="fas fa-clipboard-list me-2"></i>
                        GRN Details
                        {invoice.status === 'PENDING' && grnList.length > 0 && ` (${eligibleGrns.length} Eligible of ${grnList.length})`}
                        {invoice.status === 'APPROVED' && linkedVoucherDetails.length > 0 && ` (${linkedVoucherDetails.length} Linked)`}
                        {invoice.status === 'PENDING' && <span className="text-danger">*</span>}
                      </h6>
                      {invoice.status === 'PENDING' && eligibleGrns.length > 0 && (
                        <div className="d-flex align-items-center gap-2">
                          <Badge color={selectedGrnIds.length > 0 ? 'success' : 'warning'}>
                            {selectedGrnIds.length} selected
                          </Badge>
                          <Button
                            size="sm"
                            color="link"
                            onClick={handleSelectAllGrns}
                            style={{ padding: 0 }}
                          >
                            {selectedGrnIds.length === eligibleGrns.length ? 'Deselect All' : 'Select All'}
                          </Button>
                        </div>
                      )}
                    </div>

                    {invoice.status === 'PENDING' && eligibleGrns.length > 0 && (
                      <div className="alert alert-info mb-3" style={{ fontSize: '0.85rem', padding: '8px 12px' }}>
                        <i className="fas fa-info-circle me-2"></i>
                        Select the GRNs to associate with the voucher when approving. Only GRNs with CREATED status can be selected.
                      </div>
                    )}

                    {isLoadingGrns ? (
                      <div className="text-center p-4">
                        <Spinner size="sm" className="me-2" />
                        Loading GRNs...
                      </div>
                    ) : invoice.status === 'APPROVED' ? (
                      // APPROVED invoices - Show linked voucher details (like VoucherDetails.js)
                      linkedVoucherDetails.length > 0 ? (
                        <>
                          {linkedVoucherDetails.map((voucherDetail, index) => (
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
                                    {voucherDetail.grn?.grnNo || 'N/A'}
                                    {linkedVoucherDetails.length > 1 && (
                                      <small
                                        className="text-muted ms-2"
                                        style={{ fontSize: '11px', fontWeight: '400' }}
                                      >
                                        Receipt {index + 1} of {linkedVoucherDetails.length}
                                      </small>
                                    )}
                                  </h6>
                                </div>
                                <Badge
                                  color={voucherDetail.grn?.status?.toLowerCase() === 'processed' ? 'info' : 'success'}
                                  style={{ fontSize: '0.7rem', padding: '4px 8px', textTransform: 'uppercase' }}
                                >
                                  {voucherDetail.grn?.status || 'LINKED'}
                                </Badge>
                              </div>
                              {voucherDetail.grn?.grnDetails && voucherDetail.grn.grnDetails.length > 0 && (
                                <div className="table-responsive">
                                  <table className="table table-sm mb-0" style={{ fontSize: '0.85rem' }}>
                                    <thead style={{ backgroundColor: '#009efb' }}>
                                      <tr>
                                        <th className="text-nowrap" style={{ padding: '8px', fontWeight: '600', color: 'white' }}>Part ID</th>
                                        <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>Description</th>
                                        <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>U/M</th>
                                        <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>Qty Rcd</th>
                                        <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>Qty Acc</th>
                                        <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>Unit Price</th>
                                        <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>Extended</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {voucherDetail.grn.grnDetails.map((grnDetail) => (
                                        <tr key={grnDetail.grnDetailID}>
                                          <td className="text-nowrap" style={{ padding: '6px 8px', color: '#495057' }}>{grnDetail.partId || '-'}</td>
                                          <td style={{ padding: '6px 8px', color: '#495057' }}>{grnDetail.partDescription || '-'}</td>
                                          <td style={{ padding: '6px 8px', color: '#495057' }}>{grnDetail.unitOfMeasurement || '-'}</td>
                                          <td className="text-center" style={{ padding: '6px 8px', color: '#495057' }}>{grnDetail.qtyReceived || '0'}</td>
                                          <td className="text-center" style={{ padding: '6px 8px', color: '#495057' }}>{grnDetail.qtyAccepted || '0'}</td>
                                          <td style={{ padding: '6px 8px', color: '#495057', whiteSpace: 'nowrap' }}>{formatInvoiceAmountStacked(parseFloat(grnDetail.unitPrice || 0))}</td>
                                          <td className="fw-bold" style={{ padding: '6px 8px', color: '#212529', whiteSpace: 'nowrap' }}>{formatInvoiceAmountStacked((grnDetail.qtyAccepted || 0) * (grnDetail.unitPrice || 0))}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="alert alert-secondary" style={{ fontSize: '0.9rem' }}>
                          <i className="fas fa-info-circle me-2"></i>
                          No GRNs were linked when this invoice was approved.
                        </div>
                      )
                    ) : invoice.status === 'PENDING' ? (
                      // PENDING invoices - Show all GRNs, but only allow selection of CREATED status
                      grnList.length === 0 ? (
                        <div className="alert alert-warning" style={{ fontSize: '0.9rem' }}>
                          <i className="fas fa-exclamation-triangle me-2"></i>
                          No GRNs found for this purchase order.
                        </div>
                      ) : (
                        <>
                          {eligibleGrns.length === 0 && (
                            <div className="alert alert-warning mb-3" style={{ fontSize: '0.9rem' }}>
                              <i className="fas fa-exclamation-triangle me-2"></i>
                              No eligible GRNs available for selection. All {grnList.length} GRN(s) have already been processed.
                            </div>
                          )}
                          {grnList.map((grn, index) => {
                            const isEligible = grn.status?.toLowerCase() === 'created';
                            const isSelected = selectedGrnIds.includes(grn.grnId);

                            return (
                              <div
                                key={grn.grnId}
                                className="mb-3"
                                style={{
                                  border: isSelected ? '2px solid #28a745' : '1px solid #e8ecef',
                                  borderRadius: '8px',
                                  backgroundColor: isSelected ? '#f8fff8' : isEligible ? 'white' : '#f5f5f5',
                                  cursor: isEligible ? 'pointer' : 'default',
                                  opacity: isEligible ? 1 : 0.7,
                                }}
                                onClick={() => isEligible && handleGrnSelection(grn.grnId)}
                              >
                                <div
                                  className="d-flex justify-content-between align-items-center"
                                  style={{
                                    backgroundColor: isSelected ? '#e8f5e9' : isEligible ? '#f8f9fa' : '#e9ecef',
                                    borderTopLeftRadius: '8px',
                                    borderTopRightRadius: '8px',
                                    borderBottom: '1px solid #e8ecef',
                                    padding: '12px 16px',
                                  }}
                                >
                                  <div className="d-flex align-items-center gap-3">
                                    {isEligible ? (
                                      <Input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleGrnSelection(grn.grnId)}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ width: '18px', height: '18px' }}
                                      />
                                    ) : (
                                      <div style={{ width: '18px', height: '18px' }} title="Already processed - not eligible for selection" />
                                    )}
                                    <div>
                                      <h6 className="fw-bold mb-0" style={{ color: isEligible ? '#212529' : '#6c757d', fontSize: '13px' }}>
                                        {grn.grnNo}
                                        {grnList.length > 1 && (
                                          <small className="text-muted ms-2" style={{ fontSize: '11px', fontWeight: '400' }}>
                                            Receipt {index + 1} of {grnList.length}
                                          </small>
                                        )}
                                      </h6>
                                    </div>
                                  </div>
                                  <Badge
                                    color={isEligible ? 'success' : 'secondary'}
                                    style={{ fontSize: '0.7rem', padding: '4px 8px', textTransform: 'uppercase' }}
                                  >
                                    {grn.status}
                                  </Badge>
                                </div>
                                {grn.grnDetails && grn.grnDetails.length > 0 && (
                                  <div className="table-responsive">
                                    <table className="table table-sm mb-0" style={{ fontSize: '0.85rem' }}>
                                      <thead style={{ backgroundColor: isEligible ? '#009efb' : '#6c757d' }}>
                                        <tr>
                                          <th className="text-nowrap" style={{ padding: '8px', fontWeight: '600', color: 'white' }}>Part ID</th>
                                          <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>Description</th>
                                          <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>U/M</th>
                                          <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>Qty Rcd</th>
                                          <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>Qty Acc</th>
                                          <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>Unit Price</th>
                                          <th style={{ padding: '8px', fontWeight: '600', color: 'white' }}>Extended</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {grn.grnDetails.map((grnDetail) => (
                                          <tr key={grnDetail.grnDetailID}>
                                            <td className="text-nowrap" style={{ padding: '6px 8px', color: '#495057' }}>{grnDetail.partId || '-'}</td>
                                            <td style={{ padding: '6px 8px', color: '#495057' }}>{grnDetail.partDescription || '-'}</td>
                                            <td style={{ padding: '6px 8px', color: '#495057' }}>{grnDetail.unitOfMeasurement || '-'}</td>
                                            <td className="text-center" style={{ padding: '6px 8px', color: '#495057' }}>{grnDetail.qtyReceived || '0'}</td>
                                            <td className="text-center" style={{ padding: '6px 8px', color: '#495057' }}>{grnDetail.qtyAccepted || '0'}</td>
                                            <td style={{ padding: '6px 8px', color: '#495057', whiteSpace: 'nowrap' }}>{formatInvoiceAmountStacked(parseFloat(grnDetail.unitPrice || 0))}</td>
                                            <td className="fw-bold" style={{ padding: '6px 8px', color: '#212529', whiteSpace: 'nowrap' }}>{formatInvoiceAmountStacked((grnDetail.qtyAccepted || 0) * (grnDetail.unitPrice || 0))}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )
                    ) : (
                      // Other statuses (REJECTED, etc.)
                      <div className="alert alert-secondary" style={{ fontSize: '0.9rem' }}>
                        <i className="fas fa-info-circle me-2"></i>
                        No GRN details available for this invoice status.
                      </div>
                    )}

                    {invoice.status === 'PENDING' && selectedGrnIds.length === 0 && eligibleGrns.length > 0 && (
                      <div className="alert alert-danger" style={{ fontSize: '0.85rem', padding: '8px 12px' }}>
                        <i className="fas fa-exclamation-circle me-2"></i>
                        Please select at least one GRN to approve this invoice.
                      </div>
                    )}

                    {/* Financial Summary - Different for PENDING vs APPROVED */}
                    {invoice.status === 'PENDING' ? (
                      // PENDING: Editable financial summary based on selected GRNs
                      <div
                        style={{
                          backgroundColor: '#f8f9fa',
                          borderRadius: '8px',
                          padding: '16px',
                          border: '1px solid #e9ecef',
                          marginTop: '16px',
                        }}
                      >
                        <h6
                          className="mb-3"
                          style={{ color: '#495057', fontWeight: '600', fontSize: '13px' }}
                        >
                          <i className="fas fa-calculator me-2"></i>Financial Summary
                          {selectedGrnIds.length > 0 && (
                            <small className="text-muted ms-2" style={{ fontWeight: '400' }}>
                              (Based on {selectedGrnIds.length} selected GRN{selectedGrnIds.length !== 1 ? 's' : ''})
                            </small>
                          )}
                        </h6>
                        <table style={{ width: '100%', fontSize: '0.9rem' }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: '8px 0', color: '#6c757d' }}>Sub Total:</td>
                              <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                {formatInvoiceAmount(calculatedSubtotal)}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '8px 0', color: '#6c757d', verticalAlign: 'middle' }}>
                                Tax Total:
                              </td>
                              <td style={{ padding: '8px 0', textAlign: 'right' }}>
                                <div className="d-flex align-items-center justify-content-end gap-2">
                                  <span>{getCurrencySymbol(getSupplierCurrency())}</span>
                                  <Input
                                    type="number"
                                    value={taxAmount}
                                    onChange={(e) => setTaxAmount(e.target.value)}
                                    min="0"
                                    step="0.01"
                                    style={{
                                      width: '120px',
                                      textAlign: 'right',
                                      padding: '4px 8px',
                                      fontSize: '0.9rem',
                                      borderRadius: '4px',
                                    }}
                                    placeholder="0.00"
                                  />
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '8px 0', color: '#6c757d', verticalAlign: 'middle' }}>
                                Freight Charges:
                              </td>
                              <td style={{ padding: '8px 0', textAlign: 'right' }}>
                                <div className="d-flex align-items-center justify-content-end gap-2">
                                  <span>{getCurrencySymbol(getSupplierCurrency())}</span>
                                  <Input
                                    type="number"
                                    value={freightCharges}
                                    onChange={(e) => setFreightCharges(e.target.value)}
                                    min="0"
                                    step="0.01"
                                    style={{
                                      width: '120px',
                                      textAlign: 'right',
                                      padding: '4px 8px',
                                      fontSize: '0.9rem',
                                      borderRadius: '4px',
                                    }}
                                    placeholder="0.00"
                                  />
                                </div>
                              </td>
                            </tr>
                            <tr style={{ borderTop: '2px solid #dee2e6' }}>
                              <td style={{ padding: '12px 0 4px 0', fontWeight: '600', color: '#212529' }}>
                                Invoice Total:
                              </td>
                              <td
                                style={{
                                  padding: '12px 0 4px 0',
                                  textAlign: 'right',
                                  fontWeight: '700',
                                  fontSize: '1.1rem',
                                  color: '#009efb',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {formatInvoiceAmount(calculatedTotal)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      // APPROVED: Read-only financial summary from linked voucher
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
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {formatInvoiceAmount(parseFloat(invoice.subtotal || 0))}
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
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {formatInvoiceAmount(parseFloat(invoice.taxes || 0))}
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
                              Freight Charges:
                            </td>
                            <td
                              style={{
                                border: 'none',
                                padding: '2px 8px',
                                fontSize: '0.85rem',
                                color: '#212529',
                                fontWeight: 'bold',
                                textAlign: 'right',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {formatInvoiceAmount(parseFloat(invoice.freight || 0))}
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
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {formatInvoiceAmount(parseFloat(invoice.totalAmountDue || 0))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                ) : (
                  <div className="alert alert-secondary" style={{ fontSize: '0.9rem' }}>
                    <i className="fas fa-info-circle me-2"></i>
                    No Purchase Order associated with this invoice.
                  </div>
                )}

                {/* Notes Section */}
                {(invoice.notes || invoice.approvalNotes) && (
                  <div className="mb-3">
                    {invoice.notes && (
                      <div
                        style={{
                          backgroundColor: '#f8fcff',
                          border: '1px solid #e1f5fe',
                          borderLeft: '3px solid #81d4fa',
                          borderRadius: '8px',
                          padding: '16px',
                          boxShadow: '0 1px 3px rgba(0, 158, 251, 0.05)',
                          marginBottom: invoice.approvalNotes ? '12px' : '0',
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
                            Supplier Notes
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
                            {invoice.notes}
                          </div>
                        </div>
                      </div>
                    )}

                    {invoice.approvalNotes && (
                      <div
                        style={{
                          backgroundColor: '#e3f2fd',
                          border: '1px solid #90caf9',
                          borderLeft: '3px solid #2196f3',
                          borderRadius: '8px',
                          padding: '16px',
                        }}
                      >
                        <h6
                          className="mb-2"
                          style={{ color: '#1565c0', fontWeight: '600', fontSize: '14px' }}
                        >
                          <i className="fas fa-clipboard-check me-2"></i>Approval Notes
                        </h6>
                        <p style={{ color: '#37474f', fontSize: '0.9rem', marginBottom: 0 }}>
                          {invoice.approvalNotes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="d-flex justify-content-end border-top pt-3">
            <div className="d-flex gap-2">
              {canDelete && (
                <Button
                  className="btn btn-danger gap-2"
                  onClick={toggleDeleteModal}
                  style={{
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(220, 53, 69, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Trash2 size={16} />
                  Delete Invoice
                </Button>
              )}
              {canApprove && (
                <Button
                  className="btn btn-success gap-2"
                  onClick={toggleApproveModal}
                  disabled={selectedGrnIds.length === 0}
                  title={selectedGrnIds.length === 0 ? 'Please select at least one GRN to approve' : 'Approve invoice and create voucher'}
                  style={{
                    borderRadius: '8px',
                    background: selectedGrnIds.length === 0
                      ? 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)'
                      : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                    border: 'none',
                    boxShadow: selectedGrnIds.length === 0
                      ? '0 4px 15px rgba(158, 158, 158, 0.3)'
                      : '0 4px 15px rgba(40, 167, 69, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: selectedGrnIds.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Check size={16} />
                  Approve Invoice ({selectedGrnIds.length} GRN{selectedGrnIds.length !== 1 ? 's' : ''})
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Approve Invoice Modal */}
      <Modal isOpen={approveModalOpen} toggle={toggleApproveModal}>
        <ModalHeader
          toggle={toggleApproveModal}
          style={{
            backgroundColor: '#e8f5e9',
            borderBottom: '2px solid #4caf50',
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <Check size={20} color="#2e7d32" />
            <span style={{ color: '#2e7d32', fontWeight: '600' }}>Confirm Invoice Approval</span>
          </div>
        </ModalHeader>
        <ModalBody>
          {/* Invoice & GRN Summary */}
          <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
            <Row className="mb-2">
              <Col sm="6">
                <small className="text-muted d-block">Invoice No</small>
                <strong style={{ fontSize: '1rem' }}>{invoice?.invoiceNo}</strong>
              </Col>
              <Col sm="6">
                <small className="text-muted d-block">GRNs Selected</small>
                <strong style={{ fontSize: '1rem' }}>
                  {selectedGrnIds.length} GRN{selectedGrnIds.length !== 1 ? 's' : ''}
                </strong>
              </Col>
            </Row>
            {selectedGrnIds.length > 0 && (
              <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                {grnList
                  .filter(grn => selectedGrnIds.includes(grn.grnId))
                  .map(grn => grn.grnNo)
                  .join(', ')}
              </div>
            )}
          </div>

          {/* Financial Summary in Modal */}
          <div style={{ backgroundColor: '#e8f5e9', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
            <div className="d-flex align-items-center gap-2 mb-3">
              <i className="fas fa-calculator" style={{ color: '#28a745' }}></i>
              <strong style={{ color: '#2e7d32' }}>Voucher Financial Summary:</strong>
            </div>
            <table style={{ width: '100%', fontSize: '0.9rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 0', color: '#495057' }}>Sub Total:</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    {formatInvoiceAmount(calculatedSubtotal)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', color: '#495057' }}>Tax Total:</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    {formatInvoiceAmount(parseFloat(taxAmount || 0))}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', color: '#495057' }}>Freight Charges:</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    {formatInvoiceAmount(parseFloat(freightCharges || 0))}
                  </td>
                </tr>
                <tr style={{ borderTop: '1px solid #c8e6c9' }}>
                  <td style={{ padding: '8px 0 0 0', fontWeight: '700', color: '#2e7d32' }}>Invoice Total:</td>
                  <td style={{ padding: '8px 0 0 0', textAlign: 'right', fontWeight: '700', color: '#2e7d32', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                    {formatInvoiceAmount(calculatedTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes Section */}
          <div>
            <Label for="approvalNotes" style={{ fontWeight: '600', color: '#495057' }}>
              <i className="fas fa-sticky-note me-2"></i>
              Approval Notes (Optional)
            </Label>
            <Input
              type="textarea"
              id="approvalNotes"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Enter any notes or comments for this approval..."
              rows={3}
              style={{
                borderRadius: '8px',
                border: '1px solid #ced4da',
                resize: 'vertical',
              }}
            />
            <small className="text-muted">
              These notes will be saved with the invoice and visible only to company users.
            </small>
          </div>
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
            }}
          >
            Cancel
          </Button>
          <Button
            className="btn btn-success"
            onClick={handleApproveInvoice}
            disabled={isApproving}
            style={{
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
              border: 'none',
              boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {isApproving ? (
              <>
                <Spinner size="sm" /> Approving...
              </>
            ) : (
              <>
                <Check size={14} /> Approve & Create Voucher
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Invoice Modal */}
      <Modal isOpen={deleteModalOpen} toggle={toggleDeleteModal}>
        <ModalHeader
          toggle={toggleDeleteModal}
          style={{
            backgroundColor: '#f8d7da',
            borderBottom: '2px solid #dc3545',
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <Trash2 size={20} color="#721c24" />
            <span style={{ color: '#721c24', fontWeight: '600' }}>Delete Invoice</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="alert alert-warning">
            <i className="fas fa-exclamation-triangle me-2"></i>
            Are you sure you want to delete this invoice?
          </div>
          <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px' }}>
            <strong>Invoice Details:</strong>
            <div className="mt-2">
              <small className="text-muted">Invoice No:</small> <strong>{invoice.invoiceNo}</strong><br/>
              <small className="text-muted">Amount:</small> <strong>{formatInvoiceAmount(invoice.totalAmountDue || 0)}</strong>
            </div>
          </div>
          <p className="mt-3 mb-0 text-muted small">
            This action will mark the invoice as deleted. It cannot be undone.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            className="btn btn-secondary"
            onClick={toggleDeleteModal}
            disabled={isDeleting}
            style={{
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)',
              border: 'none',
              color: 'white',
            }}
          >
            Cancel
          </Button>
          <Button
            className="btn btn-danger"
            onClick={handleDeleteInvoice}
            disabled={isDeleting}
            style={{
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {isDeleting ? (
              <>
                <Spinner size="sm" /> Deleting...
              </>
            ) : (
              <>
                <Trash2 size={14} /> Delete Invoice
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default CompanyInvoiceDetails;
