import React, { useEffect, useState } from 'react';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { Row, Col, Button, Badge } from 'reactstrap';
import { Trash } from 'react-feather';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaSort } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { formatDate, getEntityId } from '../localStorageUtil';
import SupplierService from '../../services/SupplierService';
import VoucherService from '../../services/VoucherService';
import useTooltipManager from '../../utils/useTooltipManager';
import { getBadgeColor, getStatusLabel } from '../../constant/VoucherConstant';

const Voucher = () => {
  const companyId = getEntityId();
  const [voucherData, setVoucherData] = useState([]);
  const [supplierCache, setSupplierCache] = useState(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;
  const [sortBy, setSortBy] = useState('createdDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const { handleTooltip } = useTooltipManager();

  const getSupplierName = (supplierId) => {
  const cachedSupplier = supplierCache.get(supplierId);
  return cachedSupplier ? (cachedSupplier.name || cachedSupplier.displayName) : 'Loading...';
};

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy === field) return sortOrder === 'asc' ? <FaSort /> : <FaSort />;
    return <FaSort />;
  };

  const fetchSupplierById = async (supplierId) => {
    if (supplierCache.has(supplierId)) {
      return supplierCache.get(supplierId);
    }

    try {
      const response = await SupplierService.getSupplierById(supplierId);
      const supplier = response.data?.[0];
      if (supplier) {
        setSupplierCache((prev) => new Map(prev.set(supplierId, supplier)));
        return supplier;
      }
      const unknownSupplier = { supplierId, name: 'Unknown Supplier' };
      setSupplierCache((prev) => new Map(prev.set(supplierId, unknownSupplier)));
      return unknownSupplier;
    } catch (error) {
      console.error(`Error fetching supplier ${supplierId}:`, error);
      const unknownSupplier = { supplierId, name: 'Unknown Supplier' };
      setSupplierCache((prev) => new Map(prev.set(supplierId, unknownSupplier)));
      return unknownSupplier;
    }
  };

  const fetchAllVoucher = async (pageNumber = 0) => {
    try {
      setLoading(true);
      const response = await VoucherService.getVouchersPaginated(
        companyId,
        pageSize,
        pageNumber,
        debouncedSearchTerm,
        ['CREATED', 'CLOSED', 'APPROVED', 'ON_HOLD'],
        '',
        sortBy, // ADD THIS
        sortOrder, // ADD THIS
      );

      const responseData = response.data?.content ? response.data.content : response.data || [];
      const totalCount = response.data?.totalElements || responseData.length;

      // REMOVE THIS LINE - backend handles sorting now:
      // const processedData = responseData.sort((a, b) => b.voucherHeadId - a.voucherHeadId);

      const uniqueSupplierIds = [...new Set(responseData.map((v) => v.supplierId).filter(Boolean))];
      await Promise.all(uniqueSupplierIds.map((supplierId) => fetchSupplierById(supplierId)));

      setVoucherData(responseData); // Changed from processedData
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
  }, [debouncedSearchTerm, sortBy, sortOrder]); // Add sortBy, sortOrder

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1500);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  const handleRowClick = (row) => {
    navigate(`/voucher-detail/${row.voucherHeadId}`, {
      state: { companyId },
    });
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
    onRowClick: handleRowClick,
  };

  const renderPurchaseOrderLink = (_, row) => {
    const orderNumber = row.orderNo;
    const words = orderNumber.split(' ');
    const truncatedOrderNo = words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '');

    return (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          navigate(`/purchase-order-detail/${row.purchaseOrderId}`, {
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

  const handleDeleteVoucher = async (e, voucherHeadId) => {
    e.stopPropagation();

    if (!voucherHeadId) {
      toast.error('Invalid voucher ID');
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
      await VoucherService.deleteVoucher(companyId, voucherHeadId);
      Swal.fire({
        title: 'Deleted!',
        text: 'Your voucher has been deleted.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });

      fetchAllVoucher();
    } catch (error) {
      console.error('Error deleting voucher:', error);
      Swal.fire({
        title: 'Error!',
        text: error.response?.data?.errorMessage || 'Failed to delete voucher',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
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
                    <p className="text-muted mb-0 small">
                      Manage and track all voucher transactions
                    </p>
                  </div>
                </div>
                <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    placeholder="Search by supplier, order no, voucher no, or invoice no..."
                    className="form-control"
                    style={{
                      width: '300px',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6',
                    }}
                  />
                  <Button
                    className="btn btn-gradient-primary"
                    onClick={() => navigate('/create-voucher')}
                    style={{
                      whiteSpace: 'nowrap',
                      borderRadius: '8px',
                      boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                      background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                      border: 'none',
                      color: 'white',
                    }}
                  >
                    <i className="fas fa-plus me-2"></i>Add New
                  </Button>
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
  isKey
  dataField="supplierId"
  dataAlign="left"
  headerAlign="left"
  dataFormat={(cell, row) => {
    if (row.supplier) {
      const supplierName = row.supplier.name || row.supplier.displayName || 'Unknown Supplier';
      return supplierName;
    }
    const supplierName = getSupplierName(cell);
    return supplierName === 'Loading...' ? (
      <span style={{ color: '#6c757d', fontStyle: 'italic' }}>Loading...</span>
    ) : (
      supplierName
    );
  }}
  width="12%"
  thStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
  tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
>
  Supplier
</TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="orderNo"
                      dataAlign="left"
                      headerAlign="left"
                      dataFormat={renderPurchaseOrderLink}
                      width="12%"
                      thStyle={{
                        textAlign: 'left',
                        whiteSpace: 'normal',
                        padding: '8px',
                        cursor: 'pointer',
                      }}
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
                        style={{ display: 'flex', alignItems: 'center' }}
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
                        const displayName =
                          fullName.length > 10 ? `${fullName.substring(0, 25)}...` : fullName;

                        const tooltipText = `${fullName} (${cell.email || 'N/A'})`;

                        return (
                          <span
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => handleTooltip(e, tooltipText)}
                          >
                            {displayName}
                          </span>
                        );
                      }}
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
                        onClick={() => handleSort('createdBy')}
                      >
                        Created By {renderSortIcon('createdBy')}
                      </div>
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="finalAmount"
                      dataAlign="right"
                      headerAlign="right"
                      dataFormat={(cell) => {
                        return cell ? `₹${parseFloat(cell).toFixed(2)}` : '₹0.00';
                      }}
                      width="11%"
                      thStyle={{
                        textAlign: 'right',
                        whiteSpace: 'normal',
                        padding: '8px 12px 8px 8px',
                        paddingRight: '16px',
                        cursor: 'pointer',
                      }}
                      tdStyle={{
                        textAlign: 'right',
                        whiteSpace: 'normal',
                        padding: '8px 12px 8px 8px',
                        fontWeight: '500',
                        paddingRight: '16px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                        }}
                        onClick={() => handleSort('finalAmount')}
                      >
                        Invoice Amount {renderSortIcon('finalAmount')}
                      </div>
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
                        cursor: 'pointer',
                      }}
                      tdStyle={{
                        textAlign: 'left',
                        whiteSpace: 'normal',
                        padding: '8px 8px 8px 16px',
                        paddingLeft: '16px',
                      }}
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
                      dataAlign="center"
                      headerAlign="center"
                      dataFormat={formatDate}
                      width="10%"
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
                      dataField="grnId"
                      dataAlign="center"
                      headerAlign="center"
                      dataFormat={(_, row) => (
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <Button
                            className="btn btn-danger"
                            size="sm"
                            onClick={(e) => handleDeleteVoucher(e, row.voucherHeadId)}
                            style={{
                              borderRadius: '6px',
                              background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                              border: 'none',
                              boxShadow: '0 4px 15px rgba(220, 53, 69, 0.3)',
                            }}
                          >
                            <Trash size={14} />
                          </Button>
                        </div>
                      )}
                      width="6%"
                      thStyle={{ textAlign: 'center', whiteSpace: 'normal', padding: '8px' }}
                      tdStyle={{ textAlign: 'center', whiteSpace: 'normal', padding: '8px' }}
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

export default Voucher;
