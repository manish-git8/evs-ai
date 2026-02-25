import React, { useEffect, useState } from 'react';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'react-feather';
import { Row, Col, Button, Modal, ModalHeader, ModalBody, ModalFooter, Spinner } from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaSort } from 'react-icons/fa';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import InvoiceService from '../../services/InvoiceService';
import { formatDate, getEntityId } from '../localStorageUtil';

const CompanyInvoice = () => {
  const companyId = getEntityId();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortBy, setSortBy] = useState('createdDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const pageSize = 10;

  const fetchInvoices = async (pageNumber = 0) => {
    try {
      setLoading(true);
      const response = await InvoiceService.getAllInvoicesForCompany(
        companyId,
        pageSize,
        pageNumber,
        { sortBy, order: sortOrder },
      );

      const invoiceList = response?.data?.content || response?.data || [];

      if (invoiceList.length > 0) {
        const mappedData = invoiceList.map((invoice) => ({
          invoiceId: invoice.invoiceId,
          voucherNo: invoice.voucherNo || '-',
          voucherHeadId: invoice.voucherHeadId,
          orderNumber: invoice.purchaseOrderNumber || '-',
          purchaseOrderId: invoice.purchaseOrderId,
          createdBy: invoice.createdByName || '-',
          invoiceAmount: invoice.totalAmountDue || 0,
          invoiceNumber: invoice.invoiceNo || '-',
          invoiceDate: invoice.dateOfIssue,
          createdDate: invoice.createdDate,
          status: invoice.status || 'PENDING',
          supplierId: invoice.supplierId,
          fullInvoiceData: invoice,
        }));
        setInvoices(mappedData);
        setTotalElements(response.data.totalElements || mappedData.length);
        setCurrentPage(pageNumber);
      } else {
        setInvoices([]);
        setTotalElements(0);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error(error.response?.data?.errorMessage || 'Failed to fetch invoices');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(currentPage);
  }, [companyId, sortBy, sortOrder, currentPage, debouncedSearchTerm]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy === field) {
      return sortOrder === 'asc' ? <FaSort /> : <FaSort />;
    }
    return <FaSort />;
  };

  const fetchSuppliers = async () => {
    try {
      const response = await SupplierService.getAllSupplier();
      setSuppliers(response?.data?.content);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [companyId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getSupplierName = (invoice) => {
  if (invoice.fullInvoiceData?.supplier) {
    const supplier = invoice.fullInvoiceData.supplier;
    return supplier.name || supplier.displayName || 'Unknown Supplier';
  }
  const matchedSupplier = suppliers.find((item) => item.supplierId === invoice.supplierId);
  return matchedSupplier ? (matchedSupplier.name || matchedSupplier.displayName) : 'Unknown Supplier';
};

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleViewInvoice = (invoiceId) => {
    navigate(`/company-invoice-details/${invoiceId}`);
  };

  const handleDeleteClick = (invoice) => {
    setInvoiceToDelete(invoice);
    setDeleteModalOpen(true);
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    try {
      setIsDeleting(true);
      await InvoiceService.deleteInvoiceByCompany(companyId, invoiceToDelete.invoiceId);
      toast.success('Invoice deleted successfully');
      setDeleteModalOpen(false);
      setInvoiceToDelete(null);
      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error(error.response?.data?.errorMessage || 'Failed to delete invoice');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleDeleteModal = () => {
    setDeleteModalOpen(!deleteModalOpen);
    if (deleteModalOpen) {
      setInvoiceToDelete(null);
    }
  };

  const options = {
    hideSizePerPage: true,
    paginationPosition: 'bottom',
    page: currentPage + 1,
    sizePerPage: pageSize,
    totalSize: totalElements,
    onPageChange: (page) => {
      const pageIndex = page - 1;
      fetchInvoices(pageIndex);
    },
    paginationShowsTotal: (start, to, total) => (
      <span style={{ fontSize: '12px', color: '#6c757d' }}>
        Showing {start} to {to} of {total} invoices
      </span>
    ),
    onRowClick: (row) => {
      handleViewInvoice(row.invoiceId);
    },
  };
  const filteredInvoices = invoices.filter((invoice) => {
  if (!debouncedSearchTerm) return true;
  const searchLower = debouncedSearchTerm.toLowerCase();
  const supplierName = getSupplierName(invoice).toLowerCase();
  return (
    invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
    invoice.orderNumber?.toLowerCase().includes(searchLower) ||
    supplierName.includes(searchLower) ||
    invoice.status?.toLowerCase().includes(searchLower)
  );
});

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
        style={{ top: '12px', right: '12px' }}
      />
      <Row>
        <Col md="12">
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
                    <i
                      className="fas fa-file-invoice-dollar text-white"
                      style={{ fontSize: '20px' }}
                    ></i>
                  </div>
                  <div>
                    <h4 className="mb-0" style={{ color: '#009efb', fontWeight: '600' }}>
                      Invoices
                    </h4>
                    <p className="text-muted mb-0 small">Review and approve pending invoices</p>
                  </div>
                </div>
                <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    placeholder="Search by supplier, invoice no, or order no..."
                    className="form-control"
                    style={{
                      width: '300px',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6',
                    }}
                  />
                  <Button
                    className="btn"
                    onClick={() => navigate('/company-create-invoice')}
                    style={{
                      background: 'linear-gradient(135deg, #009efb 0%, #0077c2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: '500',
                      boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                    }}
                  >
                    <i className="fas fa-plus"></i>
                    Create Invoice
                  </Button>
                </div>
              </div>
              {loading ? (
                <div className="text-center p-4">
                  <i className="fas fa-spinner fa-spin me-2"></i>
                  Loading invoices...
                </div>
              ) : (
                <div className="table-responsive">
                  <BootstrapTable
                    striped
                    hover
                    condensed
                    pagination
                    remote
                    fetchInfo={{
                      dataTotalSize: totalElements,
                    }}
                    tableHeaderClass="mb-0"
                    data={filteredInvoices}
                    options={options}
                    trClassName="cursor-pointer"
                  >
                    <TableHeaderColumn dataField="invoiceId" isKey hidden>
                      ID
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="voucherNo"
                      dataAlign="left"
                      headerAlign="left"
                      dataFormat={(cell, row) =>
                        row.voucherHeadId ? (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/voucher-detail/${row.voucherHeadId}`);
                            }}
                            style={{
                              color: '#009efb',
                              cursor: 'pointer',
                              fontWeight: '500',
                              textDecoration: 'underline',
                            }}
                            title="Click to view Voucher details"
                          >
                            {cell}
                          </span>
                        ) : (
                          <span style={{ color: '#6c757d' }}>{cell}</span>
                        )
                      }
                      width="10%"
                      thStyle={{
                        textAlign: 'left',
                        whiteSpace: 'normal',
                        padding: '8px',
                        cursor: 'pointer',
                      }}
                      tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center' }}
                        onClick={() => handleSort('voucherNo')}
                      >
                        Voucher No {renderSortIcon('voucherNo')}
                      </div>
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="orderNumber"
                      dataAlign="left"
                      headerAlign="left"
                      dataFormat={(cell, row) =>
                        row.purchaseOrderId ? (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/purchase-order-detail/${row.purchaseOrderId}`);
                            }}
                            style={{
                              color: '#009efb',
                              cursor: 'pointer',
                              fontWeight: '500',
                              textDecoration: 'underline',
                            }}
                            title="Click to view Purchase Order details"
                          >
                            {cell}
                          </span>
                        ) : (
                          <span style={{ color: '#009efb', fontWeight: '500' }}>{cell}</span>
                        )
                      }
                      width="10%"
                      thStyle={{
                        textAlign: 'left',
                        whiteSpace: 'normal',
                        padding: '8px',
                        cursor: 'pointer',
                      }}
                      tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center' }}
                        onClick={() => handleSort('purchaseOrder')}
                      >
                        Order No {renderSortIcon('purchaseOrder')}
                      </div>
                    </TableHeaderColumn>

                    <TableHeaderColumn
  dataField="supplierId"
  dataAlign="left"
  headerAlign="left"
  dataFormat={(cell, row) => getSupplierName(row)}
  width="15%"
  thStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
  tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
>
  Supplier
</TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="createdBy"
                      dataAlign="left"
                      headerAlign="left"
                      width="12%"
                      thStyle={{
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                        padding: '8px',
                        cursor: 'pointer',
                      }}
                      tdStyle={{
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                        padding: '8px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center' }}
                        onClick={() => handleSort('createdBy')}
                      >
                        Created By {renderSortIcon('createdBy')}
                      </div>
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="invoiceAmount"
                      dataAlign="right"
                      headerAlign="right"
                      dataFormat={(cell) => `$${parseFloat(cell || 0).toFixed(2)}`}
                      width="10%"
                      thStyle={{
                        textAlign: 'right',
                        whiteSpace: 'normal',
                        padding: '8px',
                        cursor: 'pointer',
                      }}
                      tdStyle={{
                        textAlign: 'right',
                        whiteSpace: 'normal',
                        padding: '8px',
                        fontWeight: '600',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                        }}
                        onClick={() => handleSort('totalAmountDue')}
                      >
                        Amount {renderSortIcon('totalAmountDue')}
                      </div>
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="invoiceNumber"
                      dataAlign="left"
                      headerAlign="left"
                      width="10%"
                      thStyle={{
                        textAlign: 'left',
                        whiteSpace: 'normal',
                        padding: '8px',
                        cursor: 'pointer',
                      }}
                      tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center' }}
                        onClick={() => handleSort('invoiceNo')}
                      >
                        Invoice No {renderSortIcon('invoiceNo')}
                      </div>
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="invoiceDate"
                      dataAlign="left"
                      headerAlign="left"
                      dataFormat={formatDate}
                      width="10%"
                      thStyle={{
                        textAlign: 'left',
                        whiteSpace: 'normal',
                        padding: '8px',
                        cursor: 'pointer',
                      }}
                      tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center' }}
                        onClick={() => handleSort('dateOfIssue')}
                      >
                        Invoice Date {renderSortIcon('dateOfIssue')}
                      </div>
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="status"
                      dataAlign="center"
                      headerAlign="center"
                      dataFormat={(cell) => {
                        const statusColors = {
                          PENDING: { bg: '#fff3cd', color: '#856404', border: '#ffc107' },
                          APPROVED: { bg: '#d4edda', color: '#155724', border: '#28a745' },
                          REJECTED: { bg: '#f8d7da', color: '#721c24', border: '#dc3545' },
                        };
                        const style = statusColors[cell] || statusColors.PENDING;
                        return (
                          <span
                            style={{
                              backgroundColor: style.bg,
                              color: style.color,
                              border: `1px solid ${style.border}`,
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                            }}
                          >
                            {cell}
                          </span>
                        );
                      }}
                      width="8%"
                      thStyle={{
                        textAlign: 'center',
                        whiteSpace: 'normal',
                        padding: '8px',
                        cursor: 'pointer',
                      }}
                      tdStyle={{ textAlign: 'center', whiteSpace: 'normal', padding: '8px' }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => handleSort('status')}
                      >
                        Status {renderSortIcon('status')}
                      </div>
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="actions"
                      dataAlign="center"
                      headerAlign="center"
                      dataFormat={(_, row) =>
                        row.status === 'PENDING' ? (
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(row);
                              }}
                              style={{
                                padding: '5px 10px',
                                fontSize: '0.85rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                                color: 'white',
                              }}
                              title="Delete Invoice"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        ) : null
                      }
                      width="6%"
                      thStyle={{ textAlign: 'center', padding: '8px' }}
                      tdStyle={{ textAlign: 'center', padding: '8px' }}
                    >
                      Actions
                    </TableHeaderColumn>
                  </BootstrapTable>
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Delete Confirmation Modal */}
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
          {invoiceToDelete && (
            <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px' }}>
              <strong>Invoice Details:</strong>
              <div className="mt-2">
                <small className="text-muted">Invoice No:</small> <strong>{invoiceToDelete.invoiceNumber}</strong><br/>
                <small className="text-muted">Amount:</small> <strong>${parseFloat(invoiceToDelete.invoiceAmount || 0).toFixed(2)}</strong><br/>
                <small className="text-muted">Supplier:</small> <strong>{getSupplierName(invoiceToDelete)}</strong>
              </div>
            </div>
          )}
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

export default CompanyInvoice;
