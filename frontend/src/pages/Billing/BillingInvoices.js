import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  CardBody,
  CardTitle,
  Button,
  Spinner,
  Badge,
  Alert,
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import 'react-bootstrap-table/dist/react-bootstrap-table-all.min.css';
import BillingService from '../../services/BillingService';
import { getEntityId, formatDate, getUserRole, getEntityType, getCurrencySymbol } from '../localStorageUtil';
import './Billing.scss';

// Get API base URL for file downloads
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const BillingInvoices = () => {
  const navigate = useNavigate();
  const companyId = getEntityId();
  const userRoles = getUserRole();
  const entityType = getEntityType();

  // Check if user is admin
  const isAdmin = entityType === 'ADMIN' || userRoles.includes('ADMIN');

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalInvoices, setTotalInvoices] = useState(0);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      // Use secure endpoint for company users, admin endpoint for admins
      const response = isAdmin
        ? await BillingService.getInvoicesByCompany(companyId, page, size)
        : await BillingService.getMyInvoices(page, size);

      // Handle paginated response - extract content array
      const data = response.data;
      if (data && data.content) {
        // Paginated response
        setInvoices(data.content);
        setTotalInvoices(data.totalElements || data.content.length);
      } else if (Array.isArray(data)) {
        // Direct array response
        setInvoices(data);
        setTotalInvoices(data.length);
      } else {
        // Fallback
        setInvoices([]);
        setTotalInvoices(0);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch invoices');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

   useEffect(() => {
    fetchInvoices();
  }, [page, size]);

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

  const handleDownloadPdf = async (invoiceId, pdfUrl) => {
    if (pdfUrl) {
      window.open(getPdfDownloadUrl(pdfUrl), '_blank');
    } else {
      try {
        const response = await BillingService.generateInvoicePdf(invoiceId);
        window.open(getPdfDownloadUrl(response.data), '_blank');
        toast.success('Invoice PDF generated successfully');
      } catch (error) {
        toast.error('Failed to generate invoice PDF');
      }
    }
  };

  // Note: Online payment is disabled for enterprise customers
  // Payments are made via bank transfer and recorded by admin

  const statusFormatter = (cell) => {
    const colors = {
      PENDING: 'warning',
      PAID: 'success',
      OVERDUE: 'danger',
      CANCELLED: 'secondary',
    };
    return <Badge color={colors[cell] || 'secondary'}>{cell}</Badge>;
  };

  const dateFormatter = (cell) => {
    return formatDate(cell);
  };

  const amountFormatter = (cell, row) => {
    const symbol = getCurrencySymbol(row?.currency || 'USD');
    return `${symbol}${cell ? parseFloat(cell).toFixed(2) : '0.00'}`;
  };

  const actionsFormatter = (cell, row) => {
    return (
      <div className="d-flex gap-2">
        <Button
          color="primary"
          size="sm"
          outline
          onClick={() => handleDownloadPdf(row.invoiceId, row.pdfUrl)}
          title="Download PDF"
        >
          <i className="bi bi-download" />
        </Button>
        {row.status === 'PENDING' && (
          <Badge color="primary" className="ms-2">
            <i className="bi bi-bank me-1" />
            Bank Transfer
          </Badge>
        )}
      </div>
    );
  };

  const options = {
    page,
    sizePerPage: size,
    onPageChange: () => {
      setPage(page - 1);
    },
    onSizePerPageList: (sizePerPage) => {
      setSize(sizePerPage);
      setPage(0);
    },
    sizePerPageList: [
      { text: '10', value: 10 },
      { text: '25', value: 25 },
      { text: '50', value: 50 },
    ],
    noDataText: loading ? (
      <div className="text-center">
        <Spinner color="primary" />
        <p className="mt-2">Loading invoices...</p>
      </div>
    ) : (
      <div className="text-center py-4">
        <i className="bi bi-inbox fs-1 text-muted mb-3 d-block" />
        <h5 className="text-muted">No invoices found</h5>
        <p className="text-muted">Invoices will appear here once they are generated</p>
      </div>
    ),
  };

  return (
    <div className="billing-invoices-container">
      <ToastContainer position="top-right" autoClose={3000} />

      <Row>
        <Col xs="12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1">Billing Invoices</h2>
              <p className="text-muted">View and manage your invoices</p>
            </div>
            <Button
              color="secondary"
              outline
              onClick={() => navigate('/billing-dashboard')}
            >
              <i className="bi bi-arrow-left me-2" />
              Back to Dashboard
            </Button>
          </div>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col xs="12">
          <Alert color="primary" className="d-flex align-items-center">
            <i className="bi bi-info-circle-fill me-2 fs-5" />
            <div>
              <strong>Enterprise Billing:</strong> Invoices are paid via bank transfer.
              Once payment is received, your admin will record the payment and the invoice status will be updated.
            </div>
          </Alert>
        </Col>
      </Row>

      <Row>
        <Col xs="12">
          <Card>
            <CardBody>
              <CardTitle tag="h5" className="mb-4">
                <i className="bi bi-receipt-cutoff me-2" />
                All Invoices
              </CardTitle>

              {loading ? (
                <div className="text-center py-5">
                  <Spinner color="primary" />
                  <p className="mt-2">Loading invoices...</p>
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-inbox fs-1 text-muted mb-3 d-block" />
                  <h5 className="text-muted">No invoices found</h5>
                  <p className="text-muted">Invoices will appear here once they are generated</p>
                </div>
              ) : (
                <BootstrapTable
                  data={invoices}
                  options={options}
                  pagination
                  striped
                  hover
                  condensed
                  search={false}
                >
                  <TableHeaderColumn
                    dataField="invoiceId"
                    isKey
                    hidden
                  >
                    ID
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    dataField="invoiceNumber"
                    dataSort
                    width="150"
                  >
                    Invoice #
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    dataField="invoiceDate"
                    dataFormat={dateFormatter}
                    dataSort
                    width="120"
                  >
                    Invoice Date
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    dataField="paymentDueDate"
                    dataFormat={dateFormatter}
                    dataSort
                    width="120"
                  >
                    Due Date
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    dataField="baseAmount"
                    dataFormat={amountFormatter}
                    dataAlign="right"
                    width="100"
                  >
                    Amount
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    dataField="taxAmount"
                    dataFormat={amountFormatter}
                    dataAlign="right"
                    width="80"
                  >
                    Tax
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    dataField="totalAmount"
                    dataFormat={amountFormatter}
                    dataAlign="right"
                    dataSort
                    width="120"
                  >
                    Total
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    dataField="status"
                    dataFormat={statusFormatter}
                    dataAlign="center"
                    width="120"
                  >
                    Status
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    dataField="actions"
                    dataFormat={actionsFormatter}
                    dataAlign="center"
                    width="150"
                  >
                    Actions
                  </TableHeaderColumn>
                </BootstrapTable>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default BillingInvoices;
