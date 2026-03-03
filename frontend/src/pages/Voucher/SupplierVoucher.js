import React, { useEffect, useState } from 'react';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { Row, Col, Badge } from 'reactstrap';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaSort } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { formatDate, getEntityId, getCompanyCurrency } from '../localStorageUtil';
import { formatCurrency, formatDualCurrency, getExchangeRate, getUserType } from '../../utils/currencyUtils';
import VoucherService from '../../services/VoucherService';
import { getBadgeColor, getStatusLabel } from '../../constant/VoucherConstant';

const SupplierVoucher = () => {
  const supplierId = getEntityId();
  const userType = getUserType();
  const [voucherData, setVoucherData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [exchangeRates, setExchangeRates] = useState({});
  const navigate = useNavigate();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;
  const [sortBy, setSortBy] = useState('createdDate');
  const [sortOrder, setSortOrder] = useState('desc');
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

  const fetchAllVoucher = async (pageNumber = 0) => {
    try {
      setLoading(true);
      const response = await VoucherService.getSupplierVouchersPaginated(
        supplierId,
        pageSize,
        pageNumber,
        debouncedSearchTerm,
        ['CREATED', 'CLOSED', 'APPROVED', 'ON_HOLD'],
        '',
        sortBy,
        sortOrder,
      );

      const responseData = response.data?.content ? response.data.content : response.data || [];
      const totalCount = response.data?.totalElements || responseData.length;

      setVoucherData(responseData);
      setTotalElements(totalCount);
      setCurrentPage(pageNumber);
    } catch (error) {
      console.error('Error fetching Vouchers:', error);
      toast.dismiss();
      toast.error(error.response?.data?.errorMessage || 'Not found');
      setVoucherData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(0);
    fetchAllVoucher(0);
  }, [sortBy, sortOrder, debouncedSearchTerm]);

  useEffect(() => {}, [supplierId]);

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch exchange rates for company currencies
  useEffect(() => {
    const fetchRates = async () => {
      const currencyPairs = new Map();
      voucherData.forEach((v) => {
        const supplierCurrency = v.supplier?.currency;
        const companyCurrency = v.company?.currency;
        if (supplierCurrency && companyCurrency && supplierCurrency !== companyCurrency) {
          currencyPairs.set(`${supplierCurrency}-${companyCurrency}`, { from: supplierCurrency, to: companyCurrency });
        }
      });

      const newRates = { ...exchangeRates };
      for (const [key, { from, to }] of currencyPairs) {
        if (!newRates[key]) {
          try {
            const rate = await getExchangeRate(from, to);
            newRates[key] = rate;
          } catch (error) {
            console.error(`Error fetching rate for ${key}:`, error);
            newRates[key] = 1;
          }
        }
      }
      setExchangeRates(newRates);
    };
    if (voucherData.length > 0) {
      fetchRates();
    }
  }, [voucherData]);

  // Format amount with dual currency display (supplier sees their currency first)
  const formatVoucherAmount = (amount, supplierCurrency, companyCurrency) => {
    if (!supplierCurrency || supplierCurrency === companyCurrency || !amount) {
      return formatCurrency(amount, supplierCurrency || companyCurrency);
    }
    const rateKey = `${supplierCurrency}-${companyCurrency}`;
    const rate = exchangeRates[rateKey] || 1;
    const convertedAmount = amount * rate;
    return formatDualCurrency({
      originalPrice: amount,
      originalCurrency: supplierCurrency,
      convertedPrice: convertedAmount,
      convertedCurrency: companyCurrency,
    }, userType);
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
      fetchAllVoucher(pageIndex);
    },
    paginationShowsTotal: (start, to, total) => (
      <span style={{ fontSize: '12px', color: '#6c757d' }}>
        Showing {start} to {to} of {total} vouchers
      </span>
    ),
    onRowClick: (row) => {
      navigate(`/voucher-detail/${row.voucherHeadId}`, {
        state: {
          supplierId,
          fromSupplier: true,
        },
      });
    },
  };

  const renderPurchaseOrderLink = (cell, row) => {
    const orderNumber = row.orderNo;
    const words = orderNumber.split(' ');
    const truncatedOrderNo = words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '');

    return (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation(); // Prevent row click
          navigate(`/supplier-purchase-order-details/${row.purchaseOrderId}`, {
            state: {
              fromPage: '/voucher',
            },
          });
        }}
        style={{
          color: '#009efb',
          textDecoration: 'underline',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'inline-block',
          maxWidth: '100%',
        }}
        title={orderNumber}
      >
        {truncatedOrderNo}
      </a>
    );
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
                    <i className="fas fa-file-invoice text-white" style={{ fontSize: '20px' }}></i>
                  </div>
                  <div>
                    <h4 className="mb-0" style={{ color: '#009efb', fontWeight: '600' }}>
                      Voucher Management
                    </h4>
                    <p className="text-muted mb-0 small">View and track all voucher transactions</p>
                  </div>
                </div>
                <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    placeholder="Search by company, order no, voucher no, or invoice no..."
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
                  Loading vouchers...
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
                    data={voucherData}
                    options={options}
                    trStyle={{ cursor: 'pointer' }}
                  >
                    <TableHeaderColumn
                      dataField="voucherNo"
                      dataAlign="left"
                      headerAlign="left"
                      width="10%"
                      thStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                      tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => handleSort('voucherNo')}
                      >
                        Voucher No {renderSortIcon('voucherNo')}
                      </div>
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      isKey
                      dataField="company"
                      dataAlign="left"
                      headerAlign="left"
                      dataFormat={(cell) => cell?.name || cell?.displayName || '—'}
                      width="12%"
                      thStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                      tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                    >
                      Company
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="orderNo"
                      dataAlign="left"
                      headerAlign="left"
                      dataFormat={renderPurchaseOrderLink}
                      width="12%"
                      thStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                      tdStyle={{
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        padding: '8px',
                        maxWidth: '150px',
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => handleSort('orderNo')}
                      >
                        Order No {renderSortIcon('orderNo')}
                      </div>
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="createdBy"
                      dataAlign="left"
                      headerAlign="left"
                      width="10%"
                      dataFormat={(cell) => {
                        if (!cell || typeof cell !== 'object') return 'N/A';
                        const fullName = `${cell.firstName || ''} ${cell.lastName || ''}`.trim();
                        return fullName || 'N/A';
                      }}
                      thStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                      tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                    >
                      Created By
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="finalAmount"
                      dataAlign="right"
                      headerAlign="right"
                      dataFormat={(cell, row) => {
                        const supplierCurrency = row.supplier?.currency;
                        const companyCurrency = row.company?.currency;
                        return formatVoucherAmount(parseFloat(cell || 0), supplierCurrency, companyCurrency);
                      }}
                      width="11%"
                      thStyle={{
                        textAlign: 'right',
                        whiteSpace: 'normal',
                        padding: '8px 12px 8px 8px',
                        paddingRight: '16px',
                      }}
                      tdStyle={{
                        textAlign: 'right',
                        whiteSpace: 'normal',
                        padding: '8px 12px 8px 8px',
                        fontWeight: '500',
                        paddingRight: '16px',
                      }}
                    >
                      Invoice Amount
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="invoiceNo"
                      dataAlign="left"
                      headerAlign="left"
                      width="13%"
                      thStyle={{
                        textAlign: 'left',
                        whiteSpace: 'normal',
                        padding: '8px 8px 8px 16px',
                        paddingLeft: '16px',
                      }}
                      tdStyle={{
                        textAlign: 'left',
                        whiteSpace: 'normal',
                        padding: '8px 8px 8px 16px',
                        paddingLeft: '16px',
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => handleSort('invoiceNo')}
                      >
                        Invoice No {renderSortIcon('invoiceNo')}
                      </div>
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="invoiceDate"
                      dataAlign="center"
                      headerAlign="center"
                      dataFormat={formatDate}
                      width="10%"
                      thStyle={{ textAlign: 'center', whiteSpace: 'normal', padding: '8px' }}
                      tdStyle={{ textAlign: 'center', whiteSpace: 'normal', padding: '8px' }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => handleSort('invoiceDate')}
                      >
                        Invoice Date {renderSortIcon('invoiceDate')}
                      </div>
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="createdDate"
                      dataAlign="center"
                      headerAlign="center"
                      dataFormat={formatDate}
                      width="10%"
                      thStyle={{ textAlign: 'center', whiteSpace: 'normal', padding: '8px' }}
                      tdStyle={{ textAlign: 'center', whiteSpace: 'normal', padding: '8px' }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => handleSort('createdDate')}
                      >
                        Created Date {renderSortIcon('createdDate')}
                      </div>
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="status"
                      dataAlign="center"
                      headerAlign="center"
                      dataFormat={(cell) => {
                        const status = cell?.status || '';
                        return (
                          <Badge color={getBadgeColor(status)}>{getStatusLabel(status)}</Badge>
                        );
                      }}
                      width="8%"
                      thStyle={{ textAlign: 'center', whiteSpace: 'normal', padding: '8px' }}
                      tdStyle={{ textAlign: 'center', whiteSpace: 'normal', padding: '8px' }}
                    >
                      Status
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

export default SupplierVoucher;
