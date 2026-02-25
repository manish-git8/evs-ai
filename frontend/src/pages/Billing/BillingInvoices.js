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
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import 'react-bootstrap-table/dist/react-bootstrap-table-all.min.css';
import BillingService from '../../services/BillingService';
import { getEntityId, formatDate } from '../localStorageUtil';
import './Billing.scss';

const BillingInvoices = () => {
  const navigate = useNavigate();
  const companyId = getEntityId();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [setTotalInvoices] = useState(0);

 

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await BillingService.getInvoicesByCompany(companyId, page, size);
      setInvoices(response.data);
      setTotalInvoices(response.data.length);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

   useEffect(() => {
    fetchInvoices();
  }, [page, size]);

  const handleDownloadPdf = async (invoiceId, pdfUrl) => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else {
      try {
        const response = await BillingService.generateInvoicePdf(invoiceId);
        window.open(response.data, '_blank');
        toast.success('Invoice PDF generated successfully');
      } catch (error) {
        toast.error('Failed to generate invoice PDF');
      }
    }
  };

  const handlePayment = async (invoice) => {
    const result = await Swal.fire({
      title: 'Process Payment',
      html: `
        <div class="text-start">
          <p><strong>Invoice:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>Amount:</strong> $${invoice.totalAmount ? invoice.totalAmount.toFixed(2) : '0.00'}</p>
          <p class="text-muted small">Payment will be processed via Stripe</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Process Payment',
      confirmButtonColor: '#0d6efd',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      await BillingService.processPayment(invoice.invoiceId, 'STRIPE');
      toast.success('Payment processed successfully!');
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Payment failed');
    }
  };

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

  const amountFormatter = (cell) => {
    return `$${cell ? parseFloat(cell).toFixed(2) : '0.00'}`;
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
          <Button
            color="success"
            size="sm"
            onClick={() => handlePayment(row)}
            title="Pay Now"
          >
            <i className="bi bi-credit-card me-1" />
            Pay
          </Button>
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

      <Row>
        <Col xs="12">
          <Card>
            <CardBody>
              <CardTitle tag="h5" className="mb-4">
                <i className="bi bi-receipt-cutoff me-2" />
                All Invoices
              </CardTitle>

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
                  dataField="issueDate"
                  dataFormat={dateFormatter}
                  dataSort
                  width="120"
                >
                  Invoice Date
                </TableHeaderColumn>

                <TableHeaderColumn
                  dataField="dueDate"
                  dataFormat={dateFormatter}
                  dataSort
                  width="120"
                >
                  Due Date
                </TableHeaderColumn>

                <TableHeaderColumn
                  dataField="amount"
                  dataFormat={amountFormatter}
                  dataAlign="right"
                  width="100"
                >
                  Amount
                </TableHeaderColumn>

                <TableHeaderColumn
                  dataField="tax"
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
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default BillingInvoices;
