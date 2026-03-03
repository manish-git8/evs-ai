import React, { useState, useEffect, useCallback } from 'react';
import {
  Row,
  Col,
  Card,
  CardBody,
  Button,
  Spinner,
  Badge,
  Table,
  Input,
  InputGroup,
  InputGroupText,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormGroup,
  Label,
  Alert,
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import BillingService from '../../services/BillingService';
import { formatDate, formatCurrency, getCurrencySymbol } from '../localStorageUtil';
import './Billing.scss';

// Get API base URL for file downloads
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const AdminInvoiceManagement = () => {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [size] = useState(20);

  // Record Payment Modal
  const [paymentModal, setPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentData, setPaymentData] = useState({
    transactionId: '',
    amount: '',
    notes: '',
  });
  const [processingPayment, setProcessingPayment] = useState(false);

  // Generate Invoice Modal
  const [generateModal, setGenerateModal] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedSubscription, setSelectedSubscription] = useState('');
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  // Invoice Preview
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewStep, setPreviewStep] = useState('select'); // 'select' or 'preview'

  // Payment History Modal
  const [paymentsModal, setPaymentsModal] = useState(false);
  const [paymentsInvoice, setPaymentsInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await BillingService.getAdminInvoices(statusFilter, page, size);
      setInvoices(response.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch invoices');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, size]);

  const fetchActiveSubscriptions = useCallback(async () => {
    try {
      // Fetch all subscriptions and filter for ACTIVE and TRIAL (both are billable)
      const response = await BillingService.getAdminSubscriptions('');
      const activeSubscriptions = (response.data || []).filter(
        (sub) => sub.status === 'ACTIVE' || sub.status === 'TRIAL'
      );
      setSubscriptions(activeSubscriptions);
    } catch (error) {
      console.error('Failed to fetch subscriptions', error);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: 'secondary',
      PENDING: 'warning',
      SENT: 'primary',
      PAID: 'success',
      PARTIALLY_PAID: 'primary',
      OVERDUE: 'danger',
      VOIDED: 'dark',
      CANCELLED: 'secondary',
      PAYMENT_FAILED: 'danger',
    };
    return colors[status] || 'secondary';
  };

  // Filter invoices based on search
  const filteredInvoices = invoices.filter((inv) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      inv.invoiceNumber?.toLowerCase().includes(search) ||
      inv.companyName?.toLowerCase().includes(search)
    );
  });

  // Stats
  const stats = {
    total: invoices.length,
    pending: invoices.filter((i) => i.status === 'PENDING' || i.status === 'SENT').length,
    overdue: invoices.filter((i) => i.status === 'OVERDUE').length,
    paid: invoices.filter((i) => i.status === 'PAID').length,
    totalAmount: invoices
      .filter((i) => i.status !== 'VOIDED' && i.status !== 'CANCELLED')
      .reduce((sum, i) => sum + (i.totalAmount || 0), 0),
    amountDue: invoices
      .filter((i) => ['PENDING', 'SENT', 'OVERDUE', 'PARTIALLY_PAID'].includes(i.status))
      .reduce((sum, i) => sum + (i.amountDue || 0), 0),
  };

  // Open payment modal
  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      transactionId: '',
      amount: invoice.amountDue?.toString() || '',
      notes: '',
    });
    setPaymentModal(true);
  };

  // Handle record payment
  const handleRecordPayment = async () => {
    if (!paymentData.transactionId.trim()) {
      toast.error('Transaction ID is required');
      return;
    }
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error('Valid amount is required');
      return;
    }

    try {
      setProcessingPayment(true);
      await BillingService.recordManualPayment(
        selectedInvoice.invoiceId,
        paymentData.transactionId,
        parseFloat(paymentData.amount),
        paymentData.notes
      );
      toast.success('Payment recorded successfully');
      setPaymentModal(false);
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Open generate invoice modal
  const openGenerateModal = async () => {
    await fetchActiveSubscriptions();
    setSelectedSubscription('');
    setInvoicePreview(null);
    setPreviewStep('select');
    setGenerateModal(true);
  };

  // Fetch invoice preview
  const fetchInvoicePreview = async () => {
    if (!selectedSubscription) {
      toast.error('Please select a subscription');
      return;
    }

    try {
      setLoadingPreview(true);
      const response = await BillingService.previewInvoiceForSubscription(selectedSubscription);
      setInvoicePreview(response.data);
      setPreviewStep('preview');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load invoice preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Handle generate invoice (after preview confirmation)
  const handleGenerateInvoice = async () => {
    if (!selectedSubscription) {
      toast.error('Please select a subscription');
      return;
    }

    try {
      setGeneratingInvoice(true);
      await BillingService.generateInvoiceForSubscription(selectedSubscription);
      toast.success('Invoice generated successfully');
      setGenerateModal(false);
      setInvoicePreview(null);
      setPreviewStep('select');
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  // Go back to subscription selection
  const goBackToSelect = () => {
    setPreviewStep('select');
    setInvoicePreview(null);
  };

  // Handle void invoice
  const handleVoidInvoice = async (invoice) => {
    const result = await Swal.fire({
      title: 'Void Invoice?',
      html: `Are you sure you want to void invoice <strong>${invoice.invoiceNumber}</strong>?<br/>This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Yes, Void It',
    });

    if (!result.isConfirmed) return;

    try {
      await BillingService.voidInvoice(invoice.invoiceId);
      toast.success('Invoice voided successfully');
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to void invoice');
    }
  };

  // Handle send invoice
  const handleSendInvoice = async (invoice) => {
    try {
      await BillingService.sendInvoice(invoice.invoiceId);
      toast.success('Invoice sent to company');
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send invoice');
    }
  };

  // Helper to construct full PDF URL
  const getPdfDownloadUrl = (pdfUrl) => {
    if (!pdfUrl) return null;
    // If already absolute URL, use as-is
    if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) {
      return pdfUrl;
    }
    // Prepend API base URL for relative paths, avoiding double slashes
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const path = pdfUrl.startsWith('/') ? pdfUrl : `/${pdfUrl}`;
    return `${baseUrl}${path}`;
  };

  // Open payments history modal
  const openPaymentsModal = async (invoice) => {
    setPaymentsInvoice(invoice);
    setPaymentsModal(true);
    setLoadingPayments(true);
    try {
      const response = await BillingService.getPaymentsByInvoiceId(invoice.invoiceId);
      setPayments(response.data || []);
    } catch (error) {
      toast.error('Failed to fetch payment history');
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Handle download PDF
  const handleDownloadPdf = async (invoice) => {
    try {
      if (invoice.pdfUrl) {
        window.open(getPdfDownloadUrl(invoice.pdfUrl), '_blank');
      } else {
        const response = await BillingService.generateInvoicePdf(invoice.invoiceId);
        window.open(getPdfDownloadUrl(response.data), '_blank');
      }
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner color="primary" />
      </div>
    );
  }

  return (
    <div className="invoice-mgmt-container">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0 fw-semibold">Invoice Management</h4>
          <small className="text-muted">Manage billing invoices and record payments</small>
        </div>
        <div className="d-flex gap-2">
          <Button color="outline-secondary" size="sm" onClick={() => navigate('/subscription-management')}>
            <i className="bi bi-arrow-left me-1" />Subscriptions
          </Button>
          <Button color="primary" size="sm" onClick={openGenerateModal}>
            <i className="bi bi-plus-lg me-1" />Generate Invoice
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <Row className="g-2 mb-3">
        <Col xs="6" md="2">
          <Card className="border-0 shadow-sm h-100">
            <CardBody className="p-2 text-center">
              <div className="fs-5 fw-bold text-primary">{stats.total}</div>
              <small className="text-muted">Total</small>
            </CardBody>
          </Card>
        </Col>
        <Col xs="6" md="2">
          <Card className="border-0 shadow-sm h-100">
            <CardBody className="p-2 text-center">
              <div className="fs-5 fw-bold text-warning">{stats.pending}</div>
              <small className="text-muted">Pending</small>
            </CardBody>
          </Card>
        </Col>
        <Col xs="6" md="2">
          <Card className="border-0 shadow-sm h-100">
            <CardBody className="p-2 text-center">
              <div className="fs-5 fw-bold text-danger">{stats.overdue}</div>
              <small className="text-muted">Overdue</small>
            </CardBody>
          </Card>
        </Col>
        <Col xs="6" md="2">
          <Card className="border-0 shadow-sm h-100">
            <CardBody className="p-2 text-center">
              <div className="fs-5 fw-bold text-success">{stats.paid}</div>
              <small className="text-muted">Paid</small>
            </CardBody>
          </Card>
        </Col>
        <Col xs="6" md="2">
          <Card className="border-0 shadow-sm h-100">
            <CardBody className="p-2 text-center">
              <div className="fs-6 fw-bold text-info">{formatCurrency(stats.totalAmount)}</div>
              <small className="text-muted">Total Billed</small>
            </CardBody>
          </Card>
        </Col>
        <Col xs="6" md="2">
          <Card className="border-0 shadow-sm h-100">
            <CardBody className="p-2 text-center">
              <div className="fs-6 fw-bold text-danger">{formatCurrency(stats.amountDue)}</div>
              <small className="text-muted">Amount Due</small>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-3">
        <CardBody className="p-2">
          <Row className="g-2 align-items-center">
            <Col md="4">
              <InputGroup size="sm">
                <InputGroupText><i className="bi bi-search" /></InputGroupText>
                <Input
                  placeholder="Search invoice # or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md="3">
              <Input
                type="select"
                bsSize="sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING">Pending</option>
                <option value="SENT">Sent</option>
                <option value="OVERDUE">Overdue</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid</option>
                <option value="VOIDED">Voided</option>
              </Input>
            </Col>
            <Col md="2">
              <Button color="link" size="sm" onClick={fetchInvoices}>
                <i className="bi bi-arrow-clockwise me-1" />Refresh
              </Button>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Invoices Table */}
      <Card className="border-0 shadow-sm">
        <CardBody className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0 invoice-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Company</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th className="text-end">Amount</th>
                  <th className="text-end">Paid</th>
                  <th className="text-end">Due</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4">
                      <i className="bi bi-inbox fs-3 text-muted d-block mb-2" />
                      <span className="text-muted">No invoices found</span>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <tr key={invoice.invoiceId}>
                      <td>
                        <span className="fw-medium">{invoice.invoiceNumber}</span>
                      </td>
                      <td>
                        <span className="small fw-medium">{invoice.companyName || 'N/A'}</span>
                      </td>
                      <td className="small">{formatDate(invoice.invoiceDate)}</td>
                      <td className="small">
                        {formatDate(invoice.dueDate)}
                        {invoice.status === 'OVERDUE' && (
                          <Badge color="danger" pill className="ms-1" style={{ fontSize: '0.6rem' }}>
                            Overdue
                          </Badge>
                        )}
                      </td>
                      <td className="text-end small">{formatCurrency(invoice.totalAmount, invoice.currency)}</td>
                      <td className="text-end small text-success">{formatCurrency(invoice.amountPaid, invoice.currency)}</td>
                      <td className="text-end small fw-medium text-danger">
                        {formatCurrency(invoice.amountDue, invoice.currency)}
                      </td>
                      <td className="text-center">
                        <Badge color={getStatusColor(invoice.status)} pill>
                          {invoice.status?.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-1">
                          <Button
                            color="link"
                            size="sm"
                            className="p-1"
                            title="Download PDF"
                            onClick={() => handleDownloadPdf(invoice)}
                          >
                            <i className="bi bi-file-pdf text-danger" />
                          </Button>
                          <Button
                            color="link"
                            size="sm"
                            className="p-1"
                            title="View Payments"
                            onClick={() => openPaymentsModal(invoice)}
                          >
                            <i className="bi bi-credit-card text-info" />
                          </Button>
                          {['PENDING', 'SENT', 'OVERDUE', 'PARTIALLY_PAID'].includes(invoice.status) && (
                            <Button
                              color="link"
                              size="sm"
                              className="p-1"
                              title="Record Payment"
                              onClick={() => openPaymentModal(invoice)}
                            >
                              <i className="bi bi-cash-coin text-success" />
                            </Button>
                          )}
                          {invoice.status === 'DRAFT' && (
                            <Button
                              color="link"
                              size="sm"
                              className="p-1"
                              title="Send Invoice"
                              onClick={() => handleSendInvoice(invoice)}
                            >
                              <i className="bi bi-send text-primary" />
                            </Button>
                          )}
                          {!['PAID', 'VOIDED', 'CANCELLED'].includes(invoice.status) && (
                            <Button
                              color="link"
                              size="sm"
                              className="p-1"
                              title="Void Invoice"
                              onClick={() => handleVoidInvoice(invoice)}
                            >
                              <i className="bi bi-x-circle text-secondary" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>

      {/* Record Payment Modal */}
      <Modal isOpen={paymentModal} toggle={() => setPaymentModal(false)} size="md">
        <ModalHeader toggle={() => setPaymentModal(false)}>
          <i className="bi bi-cash-coin me-2" />Record Payment
        </ModalHeader>
        <ModalBody>
          {selectedInvoice && (
            <>
              <Alert color="primary" className="py-2 mb-3">
                <div className="d-flex justify-content-between">
                  <span><strong>Invoice:</strong> {selectedInvoice.invoiceNumber}</span>
                  <span><strong>Company:</strong> {selectedInvoice.companyName}</span>
                </div>
                <div className="d-flex justify-content-between mt-1">
                  <span><strong>Total:</strong> {formatCurrency(selectedInvoice.totalAmount, selectedInvoice.currency)}</span>
                  <span><strong>Due:</strong> {formatCurrency(selectedInvoice.amountDue, selectedInvoice.currency)}</span>
                </div>
              </Alert>

              <FormGroup>
                <Label className="small fw-semibold">Transaction ID / Reference *</Label>
                <Input
                  bsSize="sm"
                  placeholder="Bank reference number"
                  value={paymentData.transactionId}
                  onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label className="small fw-semibold">Amount Received *</Label>
                <InputGroup size="sm">
                  <InputGroupText>{getCurrencySymbol(selectedInvoice.currency)}</InputGroupText>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  />
                </InputGroup>
                <small className="text-muted">
                  Full amount due: {formatCurrency(selectedInvoice.amountDue, selectedInvoice.currency)}
                </small>
              </FormGroup>

              <FormGroup>
                <Label className="small fw-semibold">Notes (Optional)</Label>
                <Input
                  type="textarea"
                  bsSize="sm"
                  rows="2"
                  placeholder="Payment notes..."
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                />
              </FormGroup>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="outline-secondary" size="sm" onClick={() => setPaymentModal(false)}>
            Cancel
          </Button>
          <Button color="success" size="sm" onClick={handleRecordPayment} disabled={processingPayment}>
            {processingPayment ? <Spinner size="sm" /> : <i className="bi bi-check-lg me-1" />}
            Record Payment
          </Button>
        </ModalFooter>
      </Modal>

      {/* Generate Invoice Modal with Preview */}
      <Modal isOpen={generateModal} toggle={() => setGenerateModal(false)} size="lg">
        <ModalHeader toggle={() => setGenerateModal(false)}>
          <i className="bi bi-plus-circle me-2" />
          {previewStep === 'select' ? 'Generate Invoice' : 'Invoice Preview'}
        </ModalHeader>
        <ModalBody>
          {previewStep === 'select' ? (
            <>
              <FormGroup>
                <Label className="small fw-semibold">Select Active Subscription</Label>
                <Input
                  type="select"
                  bsSize="sm"
                  value={selectedSubscription}
                  onChange={(e) => setSelectedSubscription(e.target.value)}
                >
                  <option value="">-- Select Subscription --</option>
                  {subscriptions.map((sub) => (
                    <option key={sub.subscriptionId} value={sub.subscriptionId}>
                      {sub.companyName} - {sub.planName} ({sub.billingCycle})
                    </option>
                  ))}
                </Input>
              </FormGroup>

              <Alert color="primary" className="py-2 mt-3">
                <small>
                  <i className="bi bi-info-circle me-1" />
                  Select a subscription to preview the invoice details before generating.
                </small>
              </Alert>
            </>
          ) : (
            <>
              {loadingPreview ? (
                <div className="text-center py-4">
                  <Spinner color="primary" />
                  <p className="mt-2 text-muted">Loading invoice preview...</p>
                </div>
              ) : invoicePreview ? (
                <div className="invoice-preview">
                  {/* Company & Plan Info */}
                  <div className="border rounded p-3 mb-3">
                    <Row>
                      <Col md="6">
                        <small className="text-muted d-block">Company</small>
                        <span className="fw-bold">{invoicePreview.companyName}</span>
                      </Col>
                      <Col md="6">
                        <small className="text-muted d-block">Plan</small>
                        <span className="fw-bold">{invoicePreview.planName}</span>
                        <Badge color="primary" className="ms-2">{invoicePreview.billingCycle}</Badge>
                      </Col>
                    </Row>
                    <hr className="my-2" />
                    <Row>
                      <Col md="4">
                        <small className="text-muted d-block">Invoice Date</small>
                        <span>{formatDate(invoicePreview.invoiceDate)}</span>
                      </Col>
                      <Col md="4">
                        <small className="text-muted d-block">Due Date</small>
                        <span>{formatDate(invoicePreview.dueDate)}</span>
                      </Col>
                      <Col md="4">
                        <small className="text-muted d-block">Billing Period</small>
                        <span>{formatDate(invoicePreview.periodStart)} - {formatDate(invoicePreview.periodEnd)}</span>
                      </Col>
                    </Row>
                  </div>

                  {/* User Summary */}
                  <div className="border rounded p-3 mb-3 bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <i className="bi bi-people me-2 text-primary" />
                        <span className="fw-semibold">Users</span>
                      </div>
                      <div className="text-end">
                        <span className="fw-bold">{invoicePreview.activeUsers}</span> active
                        {invoicePreview.includedUsers > 0 && (
                          <span className="text-muted"> / {invoicePreview.includedUsers} included</span>
                        )}
                        {invoicePreview.extraUsers > 0 && (
                          <Badge color="warning" className="ms-2">+{invoicePreview.extraUsers} extra</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Line Items */}
                  <Table size="sm" className="mb-3">
                    <thead className="table-light">
                      <tr>
                        <th>Description</th>
                        <th className="text-center">Qty</th>
                        <th className="text-end">Unit Price</th>
                        <th className="text-end">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoicePreview.lineItems?.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <span className="fw-medium">{item.description}</span>
                            {item.featureCode && (
                              <Badge color="secondary" pill className="ms-2" style={{ fontSize: '0.65rem' }}>
                                {item.featureCode}
                              </Badge>
                            )}
                          </td>
                          <td className="text-center">{parseFloat(item.quantity).toFixed(0)}</td>
                          <td className="text-end">{formatCurrency(item.unitPrice, invoicePreview.currency)}</td>
                          <td className="text-end fw-medium">{formatCurrency(item.amount, invoicePreview.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="table-light">
                        <td colSpan="3" className="text-end fw-semibold">Subtotal</td>
                        <td className="text-end fw-bold">{formatCurrency(invoicePreview.subtotal, invoicePreview.currency)}</td>
                      </tr>
                      <tr>
                        <td colSpan="3" className="text-end">
                          Tax ({parseFloat(invoicePreview.taxPercent || 0).toFixed(1)}%)
                        </td>
                        <td className="text-end">{formatCurrency(invoicePreview.taxAmount, invoicePreview.currency)}</td>
                      </tr>
                      <tr className="table-primary">
                        <td colSpan="3" className="text-end fw-bold">Total</td>
                        <td className="text-end fw-bold fs-5">{formatCurrency(invoicePreview.totalAmount, invoicePreview.currency)}</td>
                      </tr>
                    </tfoot>
                  </Table>

                  <Alert color="warning" className="py-2">
                    <small>
                      <i className="bi bi-exclamation-triangle me-1" />
                      Please review the details above. Clicking "Generate Invoice" will create this invoice.
                    </small>
                  </Alert>
                </div>
              ) : null}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          {previewStep === 'select' ? (
            <>
              <Button color="outline-secondary" size="sm" onClick={() => setGenerateModal(false)}>
                Cancel
              </Button>
              <Button color="primary" size="sm" onClick={fetchInvoicePreview} disabled={!selectedSubscription || loadingPreview}>
                {loadingPreview ? <Spinner size="sm" /> : <i className="bi bi-eye me-1" />}
                Preview Invoice
              </Button>
            </>
          ) : (
            <>
              <Button color="outline-secondary" size="sm" onClick={goBackToSelect}>
                <i className="bi bi-arrow-left me-1" />Back
              </Button>
              <Button color="success" size="sm" onClick={handleGenerateInvoice} disabled={generatingInvoice}>
                {generatingInvoice ? <Spinner size="sm" /> : <i className="bi bi-check-lg me-1" />}
                Generate Invoice
              </Button>
            </>
          )}
        </ModalFooter>
      </Modal>

      {/* Payment History Modal */}
      <Modal isOpen={paymentsModal} toggle={() => setPaymentsModal(false)} size="lg">
        <ModalHeader toggle={() => setPaymentsModal(false)}>
          <i className="bi bi-credit-card me-2" />Payment History
        </ModalHeader>
        <ModalBody>
          {paymentsInvoice && (
            <>
              <Alert color="primary" className="py-2 mb-3">
                <div className="d-flex justify-content-between">
                  <span><strong>Invoice:</strong> {paymentsInvoice.invoiceNumber}</span>
                  <span><strong>Company:</strong> {paymentsInvoice.companyName}</span>
                </div>
                <div className="d-flex justify-content-between mt-1">
                  <span><strong>Total:</strong> {formatCurrency(paymentsInvoice.totalAmount, paymentsInvoice.currency)}</span>
                  <span><strong>Paid:</strong> {formatCurrency(paymentsInvoice.amountPaid, paymentsInvoice.currency)}</span>
                  <span><strong>Due:</strong> {formatCurrency(paymentsInvoice.amountDue, paymentsInvoice.currency)}</span>
                </div>
              </Alert>

              {loadingPayments ? (
                <div className="text-center py-4">
                  <Spinner color="primary" />
                  <p className="mt-2 text-muted">Loading payments...</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-inbox fs-1 text-muted d-block mb-2" />
                  <p className="text-muted">No payments recorded for this invoice</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Transaction ID</th>
                        <th>Method</th>
                        <th className="text-end">Amount</th>
                        <th className="text-center">Status</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.paymentId}>
                          <td className="small">{formatDate(payment.paymentDate)}</td>
                          <td className="small">
                            <code>{payment.transactionId}</code>
                          </td>
                          <td className="small">
                            <Badge color="secondary" pill>
                              {payment.paymentMethod?.replace('_', ' ') || 'N/A'}
                            </Badge>
                          </td>
                          <td className="text-end small fw-medium text-success">
                            {formatCurrency(payment.amount, payment.currency || paymentsInvoice.currency)}
                          </td>
                          <td className="text-center">
                            <Badge
                              color={payment.status === 'COMPLETED' ? 'success' :
                                     payment.status === 'FAILED' ? 'danger' :
                                     payment.status === 'REFUNDED' ? 'warning' : 'secondary'}
                              pill
                            >
                              {payment.status}
                            </Badge>
                          </td>
                          <td className="small text-muted" style={{ maxWidth: '150px' }}>
                            {payment.notes ? (
                              <span title={payment.notes}>
                                {payment.notes.length > 30
                                  ? payment.notes.substring(0, 30) + '...'
                                  : payment.notes}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="table-light">
                        <td colSpan="3" className="text-end fw-semibold">Total Received:</td>
                        <td className="text-end fw-bold text-success">
                          {formatCurrency(
                            payments
                              .filter(p => p.status === 'COMPLETED')
                              .reduce((sum, p) => sum + (p.amount || 0), 0),
                            paymentsInvoice.currency
                          )}
                        </td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  </Table>
                </div>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="outline-secondary" size="sm" onClick={() => setPaymentsModal(false)}>
            Close
          </Button>
          {paymentsInvoice && ['PENDING', 'SENT', 'OVERDUE', 'PARTIALLY_PAID'].includes(paymentsInvoice.status) && (
            <Button
              color="success"
              size="sm"
              onClick={() => {
                setPaymentsModal(false);
                openPaymentModal(paymentsInvoice);
              }}
            >
              <i className="bi bi-plus-lg me-1" />Record New Payment
            </Button>
          )}
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default AdminInvoiceManagement;
