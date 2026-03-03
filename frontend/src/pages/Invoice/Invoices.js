import React, { useEffect, useState } from 'react';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { Row, Col, Button } from 'reactstrap';
import { Trash2 } from 'react-feather';
import { useNavigate } from 'react-router-dom';
import { FaSort } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { formatDate, getEntityId, formatCurrency } from '../localStorageUtil';
import { formatDualCurrency, getExchangeRate } from '../../utils/currencyUtils';
import InvoiceService from '../../services/InvoiceService';
import SupplierService from '../../services/SupplierService';
import CompanyService from '../../services/CompanyService';

const Invoices = () => {
  const companyId = getEntityId();
  const [invoiceData, setInvoiceData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const supplierId = getEntityId();
  const [currentPage, setCurrentPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('createdDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [supplierCurrency, setSupplierCurrency] = useState('USD');
  const [exchangeRates, setExchangeRates] = useState({});
  const [companyCurrencies, setCompanyCurrencies] = useState({});

  const pageSize = 10;

  // Fetch supplier info to get currency
  useEffect(() => {
    const fetchSupplierCurrency = async () => {
      try {
        const response = await SupplierService.getSupplierById(supplierId);
        if (response?.data?.currency) {
          setSupplierCurrency(response.data.currency);
        }
      } catch (error) {
        console.error('Error fetching supplier currency:', error);
      }
    };
    fetchSupplierCurrency();
  }, [supplierId]);

  const fetchAllInvoices = async (pageNumber = 0) => {
    try {
      setLoading(true);
      const pageDto = {
        pageSize,
        pageNumber,
        sortBy,
        order: sortOrder,
      };

      // Map search term to appropriate search fields
      const searchFilter = {};
      if (debouncedSearchTerm && debouncedSearchTerm.trim() !== '') {
        const trimmedSearch = debouncedSearchTerm.trim();

        // Only add purchaseOrderId if the search term is numeric
        const isNumeric = /^\d+$/.test(trimmedSearch);

        if (isNumeric) {
          searchFilter.purchaseOrderId = parseInt(trimmedSearch, 10);
        }

        // Always search by text fields
        searchFilter.supplierName = trimmedSearch;
        searchFilter.invoiceNumber = trimmedSearch;
      }

      const response = await InvoiceService.getAllInvoicesBySupplier(
        supplierId,
        searchFilter,
        pageDto,
      );

      const invoiceList = response?.data?.content || response?.data || [];

      // Debug: Log first invoice to see available fields
      if (invoiceList.length > 0) {
        console.log('First invoice data:', JSON.stringify(invoiceList[0], null, 2));
        console.log('companyId:', invoiceList[0]?.companyId);
        console.log('supplier:', invoiceList[0]?.supplier);
      }

      if (Array.isArray(invoiceList) && invoiceList.length > 0) {
        const mappedData = invoiceList.map((invoice) => ({
          invoiceId: invoice.invoiceId,
          voucherNo: invoice.voucherNo || '-',
          orderNumber:
            invoice.purchaseOrderNumber ||
            (invoice.purchaseOrderId ? `PO-${invoice.purchaseOrderId}` : '-'),
          purchaseOrderId: invoice.purchaseOrderId,
          createdBy: invoice.createdByName || '-',
          invoiceAmount: invoice.totalAmountDue || 0,
          invoiceNumber: invoice.invoiceNo || '-',
          invoiceDate: invoice.dateOfIssue,
          createdDate: invoice.createdDate,
          status: invoice.status || 'PENDING',
          // Currency fields for dual currency display
          supplierCurrency: invoice.supplier?.currency || invoice.currency || invoice.currencyCode || 'USD',
          companyCurrency: invoice.company?.currency || invoice.convertedCurrencyCode || 'USD',
          convertedAmount: invoice.convertedTotalAmountDue,
          fullInvoiceData: invoice,
        }));

        setInvoiceData(mappedData);
        setTotalElements(response?.data?.totalElements || mappedData.length);
      } else {
        setInvoiceData([]);
        setTotalElements(0);
      }

      setCurrentPage(pageNumber);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.dismiss();
      toast.error(error.response?.data?.errorMessage || 'Failed to fetch invoices');
      setInvoiceData([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(0);
    fetchAllInvoices(0);
  }, [debouncedSearchTerm]);

  // Fetch company currencies and exchange rates
  useEffect(() => {
    const fetchCompanyCurrenciesAndRates = async () => {
      if (invoiceData.length === 0 || !supplierCurrency) return;

      // Get unique company IDs from invoices (companyId is a direct field in InvoiceDto)
      const uniqueCompanyIds = [...new Set(
        invoiceData
          .map(inv => inv.fullInvoiceData?.companyId)
          .filter(Boolean)
      )];

      console.log('Supplier currency:', supplierCurrency);
      console.log('Unique company IDs:', uniqueCompanyIds);

      // Fetch company currencies for unique company IDs that we haven't fetched yet
      const currencies = { ...companyCurrencies };
      let hasNewCurrencies = false;
      for (const companyId of uniqueCompanyIds) {
        if (!currencies[companyId]) {
          try {
            const response = await CompanyService.getCompanyByCompanyId(companyId);
            // getCompanyByCompanyId returns an array, so access first element
            const companyData = Array.isArray(response?.data) ? response.data[0] : response?.data;
            currencies[companyId] = companyData?.currency || 'USD';
            console.log('Fetched company currency:', companyId, companyData?.currency);
            hasNewCurrencies = true;
          } catch (error) {
            console.error(`Error fetching currency for company ${companyId}:`, error);
            currencies[companyId] = 'USD';
          }
        }
      }
      if (hasNewCurrencies) {
        setCompanyCurrencies(currencies);
      }

      // Get all unique company currencies that are different from supplier currency
      const allCompanyCurrencies = [...new Set(Object.values(currencies))]
        .filter(currency => currency && currency !== supplierCurrency);

      // Fetch exchange rates for each unique company currency
      // Clear rates and refetch when supplier currency changes (rates depend on source currency)
      const rates = {};
      for (const companyCurrency of allCompanyCurrencies) {
        try {
          const rate = await getExchangeRate(supplierCurrency, companyCurrency);
          rates[companyCurrency] = rate;
        } catch (error) {
          console.error(`Error fetching rate for ${companyCurrency}:`, error);
          rates[companyCurrency] = 1;
        }
      }
      setExchangeRates(rates);
    };

    fetchCompanyCurrenciesAndRates();
  }, [invoiceData, supplierCurrency]);

  // Helper function to format invoice amount with dual currency
  const formatInvoiceAmount = (row) => {
    const amount = parseFloat(row.invoiceAmount || 0);
    const rowSupplierCurrency = supplierCurrency || 'USD';

    // Get company currency from fetched currencies map (companyId is a direct field in InvoiceDto)
    const companyId = row.fullInvoiceData?.companyId;
    const rowCompanyCurrency = companyId && companyCurrencies[companyId]
      ? companyCurrencies[companyId]
      : 'USD';

    // If same currency, show single currency
    if (rowSupplierCurrency === rowCompanyCurrency) {
      return formatCurrency(amount, rowSupplierCurrency);
    }

    // Get exchange rate for this company currency
    const rate = exchangeRates[rowCompanyCurrency] || 1;
    const convertedAmount = row.convertedAmount !== undefined && row.convertedAmount !== null
      ? row.convertedAmount
      : amount * rate;

    // Show dual currency: supplier currency first, company currency in brackets
    return formatDualCurrency({
      originalPrice: amount,
      originalCurrency: rowSupplierCurrency,
      convertedPrice: convertedAmount,
      convertedCurrency: rowCompanyCurrency,
    }, 'supplier');
  };

  useEffect(() => {}, [companyId]);

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  useEffect(() => {
    fetchAllInvoices(currentPage);
  }, [sortBy, sortOrder]);

  const handleAddNewInvoice = () => {
    navigate('/invoice');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleDeleteInvoice = async (invoiceId) => {
    if (!supplierId || !invoiceId) {
      toast.error('Invalid invoice ID or supplier ID');
      return;
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        confirmButton: 'btn btn-danger',
        cancelButton: 'btn btn-secondary',
      },
    });

    if (!result.isConfirmed) return;

    try {
      await InvoiceService.deleteInvoiceBySupplier(supplierId, invoiceId);
      Swal.fire({
        title: 'Deleted!',
        text: 'Your invoice has been deleted.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });

      fetchAllInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      Swal.fire({
        title: 'Error!',
        text: error.response?.data?.errorMessage || 'Failed to delete invoice',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
  };

  const handleViewInvoice = (invoiceId) => {
    navigate(`/supplier-invoice-details/${invoiceId}`);
  };

  const options = {
    hideSizePerPage: true,
    paginationPosition: 'bottom',
    page: currentPage + 1,
    sizePerPage: pageSize,
    totalSize: totalElements,
    onPageChange: (page) => {
      const pageIndex = page - 1;
      setCurrentPage(pageIndex);
      fetchAllInvoices(pageIndex);
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
        toastStyle={{
          marginBottom: '0',
          position: 'absolute',
          top: 0,
          right: 0,
        }}
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
                      Invoice Management
                    </h4>
                    <p className="text-muted mb-0 small">
                      Manage and track all invoice transactions
                    </p>
                  </div>
                </div>
                <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    placeholder="Search by supplier, invoice no, or PO no..."
                    className="form-control"
                    style={{
                      width: '300px',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6',
                    }}
                  />
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
                    data={invoiceData}
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
                      width="10%"
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => handleSort('voucherNo')}
                      >
                        Voucher No <FaSort />
                      </div>
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="orderNumber"
                      dataAlign="left"
                      headerAlign="left"
                      dataFormat={(cell, row) =>
                        row.purchaseOrderId ? (
                          <span
                            onClick={() =>
                              navigate(`/supplier-purchase-order-details/${row.purchaseOrderId}`)
                            }
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
                      thStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                      tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        Order No
                      </div>
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="createdBy"
                      dataAlign="left"
                      headerAlign="left"
                      width="12%"
                      thStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                      tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                    >
                      Created By
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="invoiceAmount"
                      dataAlign="right"
                      headerAlign="right"
                      dataFormat={(cell, row) => formatInvoiceAmount(row)}
                      width="15%"
                      thStyle={{ textAlign: 'right', whiteSpace: 'normal', padding: '8px' }}
                      tdStyle={{
                        textAlign: 'right',
                        whiteSpace: 'normal',
                        padding: '8px',
                        fontWeight: '600',
                      }}
                    >
                      Invoice Amount
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="invoiceNumber"
                      dataAlign="left"
                      headerAlign="left"
                      width="10%"
                      thStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                      tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => handleSort('invoiceNo')}
                      >
                        Invoice No <FaSort />
                      </div>
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="invoiceDate"
                      dataAlign="left"
                      headerAlign="left"
                      dataFormat={formatDate}
                      width="10%"
                      thStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                      tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                    >
                      Invoice Date
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="createdDate"
                      dataAlign="left"
                      headerAlign="left"
                      dataFormat={formatDate}
                      width="10%"
                      thStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                      tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => handleSort('createdDate')}
                      >
                        Created Date <FaSort />
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
                          PAID: { bg: '#cce5ff', color: '#004085', border: '#007bff' },
                          SUBMITTED: { bg: '#e7f1ff', color: '#004085', border: '#007bff' },
                          DRAFT: { bg: '#e9ecef', color: '#495057', border: '#6c757d' },
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
                      width="10%"
                      thStyle={{ textAlign: 'center', whiteSpace: 'normal', padding: '8px' }}
                      tdStyle={{ textAlign: 'center', whiteSpace: 'normal', padding: '8px' }}
                    >
                      Status
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="actions"
                      dataAlign="center"
                      headerAlign="center"
                      dataFormat={(_, row) =>
                        row.status === 'PENDING' ? (
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <Button
                              className="btn btn-danger"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteInvoice(row.invoiceId);
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
    </div>
  );
};

export default Invoices;
