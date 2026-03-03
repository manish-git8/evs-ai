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
} from 'reactstrap';
import { FileText, Download, Trash2 } from 'react-feather';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate, useParams } from 'react-router-dom';
import InvoiceService from '../../services/InvoiceService';
import FileUploadService from '../../services/FileUploadService';
import SupplierService from '../../services/SupplierService';
import CompanyService from '../../services/CompanyService';
import { formatDate, getEntityId, formatCurrency } from '../localStorageUtil';
import { getExchangeRate, formatDualCurrency } from '../../utils/currencyUtils';
import '../CompanyManagement/ReactBootstrapTable.scss';

const SupplierInvoiceDetails = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const supplierId = getEntityId();

  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [supplierCurrencyState, setSupplierCurrencyState] = useState('USD');
  const [companyCurrencyState, setCompanyCurrencyState] = useState('USD');

  const fetchInvoiceDetails = async () => {
    try {
      setIsLoading(true);
      const response = await InvoiceService.getInvoiceByIdForSupplier(supplierId, invoiceId);
      // API returns array, get first element
      const invoiceData = response.data?.content?.[0] || null;
      setInvoice(invoiceData);

      // Fetch file preview if invoiceAnnexure exists
      if (invoiceData?.invoiceAnnexure) {
        try {
          const fileResponse = await FileUploadService.getFileByFileId(invoiceData.invoiceAnnexure);
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
  }, [invoiceId, supplierId]);

  // Fetch supplier and company currencies, then exchange rate
  useEffect(() => {
    const fetchCurrenciesAndRate = async () => {
      if (!invoice) return;

      // Try to get supplier currency from invoice data
      let supplierCurrency = invoice.supplier?.currency || invoice.currency || invoice.currencyCode;

      // Fetch supplier currency from API if not available in invoice
      if (!supplierCurrency) {
        try {
          const supplierResponse = await SupplierService.getSupplierById(supplierId);
          supplierCurrency = supplierResponse?.data?.currency || 'USD';
        } catch (error) {
          console.error('Error fetching supplier currency:', error);
          supplierCurrency = 'USD';
        }
      }
      setSupplierCurrencyState(supplierCurrency);

      // Try to get company currency from invoice data
      let companyCurrency = invoice.company?.currency || invoice.convertedCurrencyCode;

      // Get company ID (companyId is a direct field in InvoiceDto)
      const companyId = invoice.companyId;

      // Fetch company currency from API if not available in invoice
      if (!companyCurrency && companyId) {
        try {
          const companyResponse = await CompanyService.getCompanyByCompanyId(companyId);
          // getCompanyByCompanyId returns an array, so access first element
          const companyData = Array.isArray(companyResponse?.data) ? companyResponse.data[0] : companyResponse?.data;
          companyCurrency = companyData?.currency || 'USD';
        } catch (error) {
          console.error('Error fetching company currency:', error);
          companyCurrency = 'USD';
        }
      } else if (!companyCurrency) {
        companyCurrency = 'USD';
      }
      setCompanyCurrencyState(companyCurrency);

      // Fetch exchange rate if currencies are different
      if (supplierCurrency !== companyCurrency) {
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

    fetchCurrenciesAndRate();
  }, [invoice, supplierId]);

  // Get company currency - use state value which is fetched from API if needed
  const getCompanyCurrency = () => companyCurrencyState;

  // Get supplier currency - use state value which is fetched from API if needed
  const getSupplierCurrency = () => supplierCurrencyState;

  // Format amount with dual currency display (supplier currency primary, company currency secondary)
  const formatDualAmount = (amount, item = null) => {
    const supplierCurrency = getSupplierCurrency();
    const companyCurrency = getCompanyCurrency();

    // Get the original supplier amount
    const originalAmount = amount;

    // Get the converted company amount
    let convertedAmount;
    if (item?.convertedUnitPrice !== undefined && item?.convertedUnitPrice !== null) {
      convertedAmount = item.convertedUnitPrice;
    } else if (item?.convertedSubTotal !== undefined && item?.convertedSubTotal !== null) {
      convertedAmount = item.convertedSubTotal;
    } else {
      convertedAmount = amount * exchangeRate;
    }

    // If same currency, just show single value
    if (supplierCurrency === companyCurrency) {
      return formatCurrency(originalAmount, supplierCurrency);
    }

    // Show dual currency: supplier currency first (for supplier login), company currency in brackets
    return formatDualCurrency({
      originalPrice: originalAmount,
      originalCurrency: supplierCurrency,
      convertedPrice: convertedAmount,
      convertedCurrency: companyCurrency,
    }, 'supplier');
  };

  const toggleDeleteModal = () => {
    setDeleteModalOpen(!deleteModalOpen);
  };

  const handleDeleteInvoice = async () => {
    try {
      setIsDeleting(true);
      await InvoiceService.deleteInvoiceBySupplier(supplierId, invoiceId);
      toast.success('Invoice deleted successfully');
      setDeleteModalOpen(false);
      navigate('/invoices');
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
      navigate(`/supplier-purchase-order-details/${invoice.purchaseOrderId}`, {
        state: {
          from: 'INVOICE_DETAILS',
          invoiceId: invoice.invoiceId,
        },
      });
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

  const canDelete = invoice.status === 'PENDING';

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
                      Voucher: <strong style={{ color: '#28a745' }}>{invoice.voucherNo}</strong>
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
                onClick={() => navigate('/invoices')}
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

          {/* Invoice Content */}
          <Row className="align-items-stretch">
            {/* Left Column - Attached Document */}
            <Col lg="6" md="12" className="mb-4 d-flex">
              <div
                style={{
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid #e9ecef',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <h6
                  className="mb-3"
                  style={{ color: '#6c757d', fontWeight: '600', fontSize: '14px' }}
                >
                  <i className="fas fa-paperclip me-2"></i>Attached Document
                </h6>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {previewFile ? (
                    <>
                      {previewFile.type.includes('pdf') ? (
                        <div style={{ flex: 1, minHeight: '400px', width: '100%' }}>
                          <iframe
                            src={previewFile.url}
                            title="PDF Preview"
                            width="100%"
                            height="100%"
                            style={{
                              border: '1px solid #dee2e6',
                              borderRadius: '6px',
                              minHeight: '100%',
                            }}
                          />
                        </div>
                      ) : previewFile.type.includes('image') ? (
                        <div
                          style={{
                            flex: 1,
                            minHeight: '400px',
                            width: '100%',
                            border: '1px solid #dee2e6',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <img
                            src={previewFile.url}
                            alt="Attached File"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                              objectFit: 'contain',
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            flex: 1,
                            minHeight: '300px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #dee2e6',
                            borderRadius: '6px',
                            backgroundColor: '#fff',
                          }}
                        >
                          <FileText size={48} color="#6c757d" />
                          <p className="mt-2 mb-0 text-muted">
                            File attached - Click download to view
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      style={{
                        flex: 1,
                        minHeight: '300px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px dashed #dee2e6',
                        borderRadius: '6px',
                        backgroundColor: '#fff',
                      }}
                    >
                      <FileText size={48} color="#adb5bd" />
                      <p className="mt-2 mb-0 text-muted">No document attached</p>
                    </div>
                  )}
                </div>
              </div>
            </Col>

            {/* Right Column - Invoice Information & Financial */}
            <Col lg="6" md="12" className="mb-4">
              {/* Invoice Information */}
              <div
                style={{
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid #e9ecef',
                  marginBottom: '16px',
                }}
              >
                <h6
                  className="mb-3"
                  style={{ color: '#009efb', fontWeight: '600', fontSize: '14px' }}
                >
                  <i className="fas fa-info-circle me-2"></i>Invoice Information
                </h6>
                <table
                  style={{
                    fontSize: '0.9rem',
                    backgroundColor: 'transparent',
                    width: '100%',
                    borderCollapse: 'separate',
                    borderSpacing: '0',
                  }}
                >
                  <tbody>
                    <tr>
                      <td style={{ padding: '6px 0', width: '40%', verticalAlign: 'top' }}>
                        <small className="text-muted">Purchase Order:</small>
                      </td>
                      <td style={{ padding: '6px 0', verticalAlign: 'top' }}>
                        {invoice.purchaseOrderId ? (
                          <span
                            onClick={navigateToPurchaseOrder}
                            style={{
                              color: '#009efb',
                              cursor: 'pointer',
                              fontWeight: '600',
                              textDecoration: 'underline',
                            }}
                            title="Click to view Purchase Order details"
                          >
                            {invoice.purchaseOrderNumber || 'N/A'}
                          </span>
                        ) : (
                          <strong style={{ color: '#009efb' }}>
                            {invoice.purchaseOrderNumber || 'N/A'}
                          </strong>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', width: '40%', verticalAlign: 'top' }}>
                        <small className="text-muted">Invoice Date:</small>
                      </td>
                      <td style={{ padding: '6px 0', verticalAlign: 'top' }}>
                        <strong style={{ color: '#212529' }}>
                          {formatDate(invoice.dateOfIssue)}
                        </strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', width: '40%', verticalAlign: 'top' }}>
                        <small className="text-muted">Due Date:</small>
                      </td>
                      <td style={{ padding: '6px 0', verticalAlign: 'top' }}>
                        <strong style={{ color: '#212529' }}>
                          {formatDate(invoice.paymentDueDate)}
                        </strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', width: '40%', verticalAlign: 'top' }}>
                        <small className="text-muted">Created Date:</small>
                      </td>
                      <td style={{ padding: '6px 0', verticalAlign: 'top' }}>
                        <strong style={{ color: '#212529' }}>
                          {formatDate(invoice.createdDate)}
                        </strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', width: '40%', verticalAlign: 'top' }}>
                        <small className="text-muted">Created By:</small>
                      </td>
                      <td style={{ padding: '6px 0', verticalAlign: 'top' }}>
                        <span style={{ color: '#212529' }}>{invoice.createdByName || 'N/A'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', width: '40%', verticalAlign: 'top' }}>
                        <small className="text-muted">Payment Terms:</small>
                      </td>
                      <td style={{ padding: '6px 0', verticalAlign: 'top' }}>
                        <strong style={{ color: '#212529' }}>
                          {invoice.paymentTermsName || 'N/A'}
                        </strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Financial Summary */}
              <div
                style={{
                  backgroundColor: '#e8f5e9',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid #c8e6c9',
                  marginBottom: '16px',
                }}
              >
                <h6
                  className="mb-3"
                  style={{ color: '#2e7d32', fontWeight: '600', fontSize: '14px' }}
                >
                  <i className="fas fa-dollar-sign me-2"></i>Financial Summary
                </h6>
                <table
                  style={{
                    fontSize: '0.9rem',
                    backgroundColor: 'transparent',
                    width: '100%',
                    borderCollapse: 'separate',
                    borderSpacing: '0',
                  }}
                >
                  <tbody>
                    <tr>
                      <td style={{ padding: '6px 0', width: '50%', verticalAlign: 'top' }}>
                        <small className="text-muted">Subtotal:</small>
                      </td>
                      <td style={{ padding: '6px 0', verticalAlign: 'top', textAlign: 'right' }}>
                        <strong style={{ color: '#212529' }}>
                          {formatDualAmount(parseFloat(invoice.subtotal || 0))}
                        </strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', width: '50%', verticalAlign: 'top' }}>
                        <small className="text-muted">Taxes:</small>
                      </td>
                      <td style={{ padding: '6px 0', verticalAlign: 'top', textAlign: 'right' }}>
                        <strong style={{ color: '#212529' }}>
                          {formatDualAmount(parseFloat(invoice.taxes || 0))}
                        </strong>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', width: '50%', verticalAlign: 'top' }}>
                        <small className="text-muted">Discount:</small>
                      </td>
                      <td style={{ padding: '6px 0', verticalAlign: 'top', textAlign: 'right' }}>
                        <strong style={{ color: '#dc3545' }}>
                          -{formatDualAmount(parseFloat(invoice.discount || 0))}
                        </strong>
                      </td>
                    </tr>
                    <tr style={{ borderTop: '2px solid #c8e6c9' }}>
                      <td style={{ padding: '10px 0', width: '50%', verticalAlign: 'top' }}>
                        <strong style={{ color: '#2e7d32', fontSize: '1rem' }}>
                          Total Amount:
                        </strong>
                      </td>
                      <td style={{ padding: '10px 0', verticalAlign: 'top', textAlign: 'right' }}>
                        <strong style={{ color: '#2e7d32', fontSize: '1.25rem' }}>
                          {formatDualAmount(parseFloat(invoice.totalAmountDue || 0))}
                        </strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Approval Notes - Shown if exists */}
              {invoice.approvalNotes && (
                <div
                  style={{
                    backgroundColor: '#e3f2fd',
                    borderRadius: '8px',
                    padding: '16px',
                    border: '1px solid #90caf9',
                    borderLeft: '3px solid #2196f3',
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
            </Col>
          </Row>

          {/* Invoice Items */}
          {invoice.invoiceDetails && invoice.invoiceDetails.length > 0 && (
            <div className="mb-4">
              <h6 style={{ color: '#17a2b8', fontWeight: '600', fontSize: '14px' }}>
                <i className="fas fa-list me-2"></i>
                Invoice Items ({invoice.invoiceDetails.length} items)
              </h6>
              <div className="table-responsive">
                <table className="table table-bordered table-striped">
                  <thead style={{ backgroundColor: '#009efb', color: 'white' }}>
                    <tr>
                      <th style={{ padding: '10px' }}>Part ID</th>
                      <th style={{ padding: '10px' }}>Description</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Quantity</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Unit Price</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.invoiceDetails.map((item) => (
                      <tr key={item.invoiceItemDetailId}>
                        <td style={{ padding: '10px' }}>{item.partId || '-'}</td>
                        <td style={{ padding: '10px' }}>{item.partDescription || '-'}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          {parseFloat(item.qty || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          {formatDualAmount(parseFloat(item.unitPrice || 0), item)}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600' }}>
                          {formatDualAmount(parseFloat(item.subTotal || 0), { convertedSubTotal: item.convertedSubTotal })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Additional Information */}
          <Row className="mb-4">
            <Col md="6">
              {invoice.notes && (
                <div
                  style={{
                    backgroundColor: '#f8fcff',
                    border: '1px solid #e1f5fe',
                    borderLeft: '3px solid #81d4fa',
                    borderRadius: '8px',
                    padding: '16px',
                  }}
                >
                  <h6
                    className="mb-2"
                    style={{ color: '#0288d1', fontWeight: '500', fontSize: '14px' }}
                  >
                    <i className="fas fa-comment-alt me-2"></i>Notes
                  </h6>
                  <p style={{ color: '#546e7a', fontSize: '0.9rem', marginBottom: 0 }}>
                    {invoice.notes}
                  </p>
                </div>
              )}
            </Col>
            <Col md="6">
              {invoice.termsAndConditions && (
                <div
                  style={{
                    backgroundColor: '#fff8e1',
                    border: '1px solid #ffecb3',
                    borderLeft: '3px solid #ffc107',
                    borderRadius: '8px',
                    padding: '16px',
                  }}
                >
                  <h6
                    className="mb-2"
                    style={{ color: '#f57c00', fontWeight: '500', fontSize: '14px' }}
                  >
                    <i className="fas fa-file-contract me-2"></i>Terms & Conditions
                  </h6>
                  <p style={{ color: '#6d4c41', fontSize: '0.9rem', marginBottom: 0 }}>
                    {invoice.termsAndConditions}
                  </p>
                </div>
              )}
            </Col>
          </Row>

          {/* Action Buttons */}
          {canDelete && (
            <div className="d-flex justify-content-end border-top pt-3">
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
            </div>
          )}
        </div>
      </div>

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
              <small className="text-muted">Invoice No:</small> <strong>{invoice.invoiceNo}</strong>
              <br />
              <small className="text-muted">Amount:</small>{' '}
              <strong>{formatDualAmount(parseFloat(invoice.totalAmountDue || 0))}</strong>
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

export default SupplierInvoiceDetails;
