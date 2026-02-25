import { useEffect, useState } from 'react';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { Row, Col, Button, Badge } from 'reactstrap';
import { Trash } from 'react-feather';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { formatDate, getEntityId } from '../localStorageUtil';
import VoucherService from '../../services/VoucherService';
import useTooltipManager from '../../utils/useTooltipManager';
import { getBadgeColor, getStatusLabel } from '../../constant/VoucherConstant';
import BillService from '../../services/BillService';

const Bills = () => {
  const companyId = getEntityId();
  const [filteredBillsData, setFilteredBillsData] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('unpaid');
  const navigate = useNavigate();
  const { handleTooltip } = useTooltipManager();

  const [currentPage, setCurrentPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;

  

  const fetchAllBills = async (pageNumber = 0) => {
    try {
      setLoading(true);
      let statusFilter;
      switch (activeTab) {
        case 'paid':
          statusFilter = ['PAID'];
          break;
        case 'unpaid':
          statusFilter = ['UNPAID'];
          break;
        default:
          statusFilter = ['UNPAID', 'PAID'];
      }

      const response = await BillService.getBillsPaginated(
        companyId,
        pageSize,
        pageNumber,
        debouncedSearchTerm,
        statusFilter,
      );

      const responseData = response.data?.content ? response.data.content : response.data || [];
      const totalCount = response.data?.totalElements || responseData.length;

      const processedData = responseData.sort((a, b) => b.voucherHeadId - a.voucherHeadId);

      setFilteredBillsData(processedData);
      setTotalElements(totalCount);
      setCurrentPage(pageNumber);
    } catch (error) {
      console.error('Error fetching Bills:', error);
      toast.dismiss();
      toast.error(error.response?.data?.errorMessage || 'Not found');
      setFilteredBillsData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(0);
    fetchAllBills(0);
  }, [activeTab, debouncedSearchTerm]);

  useEffect(() => {
  }, [companyId]);

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
      state: { from: '/bills', companyId },
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
      fetchAllBills(pageIndex);
    },
    paginationShowsTotal: (start, to, total) => (
      <span style={{ fontSize: '12px', color: '#6c757d' }}>
        Showing {start} to {to} of {total} bills
      </span>
    ),
    onRowClick: handleRowClick,
  };

  const renderPurchaseOrderLink = (cell, row) => {
    const orderNumber = cell;
    const words = orderNumber.split(' ');
    const truncatedOrderNo = words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '');
    return (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          navigate(`/purchase-order-detail/${row.purchaseOrderId}`, {
            state: { fromPage: '/bills' },
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
        text: 'Your bill has been deleted.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });
      fetchAllBills();
    } catch (error) {
      console.error('Error deleting bill:', error);
      Swal.fire({
        title: 'Error!',
        text: error.response?.data?.errorMessage || 'Failed to delete bill',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
  };

  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
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
                      Bills Management
                    </h4>
                    <p className="text-muted mb-0 small">
                      Track and manage all billing transactions
                    </p>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    placeholder="Search by supplier, order no, voucher no, or invoice no..."
                    className="form-control form-control-sm"
                    style={{
                      width: '300px',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6',
                    }}
                    title="You can search by supplier name, order number, voucher number, invoice number, or status (PAID/UNPAID)"
                  />
                </div>
              </div>
              <div className="nav nav-tabs mb-3" role="tablist">
                <button
                  className={`nav-link ${activeTab === 'unpaid' ? 'active' : ''}`}
                  onClick={() => handleTabChange(null, 'unpaid')}
                  type="button"
                  style={{
                    border: 'none',
                    backgroundColor: activeTab === 'unpaid' ? '#f8f9fa' : 'transparent',
                    color: activeTab === 'unpaid' ? '#495057' : '#6c757d',
                    borderBottom:
                      activeTab === 'unpaid' ? '2px solid #dc3545' : '2px solid transparent',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontWeight: activeTab === 'unpaid' ? '600' : '400',
                    borderRadius: '8px 8px 0 0',
                  }}
                >
                  <i className="fas fa-exclamation-circle me-2"></i>Unpaid Bills
                </button>
                <button
                  className={`nav-link ${activeTab === 'paid' ? 'active' : ''}`}
                  onClick={() => handleTabChange(null, 'paid')}
                  type="button"
                  style={{
                    border: 'none',
                    backgroundColor: activeTab === 'paid' ? '#f8f9fa' : 'transparent',
                    color: activeTab === 'paid' ? '#495057' : '#6c757d',
                    borderBottom:
                      activeTab === 'paid' ? '2px solid #28a745' : '2px solid transparent',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontWeight: activeTab === 'paid' ? '600' : '400',
                    borderRadius: '8px 8px 0 0',
                  }}
                >
                  <i className="fas fa-check-circle me-2"></i>Paid Bills
                </button>
              </div>
              {loading ? (
                <div className="text-center p-4">
                  <i className="fas fa-spinner fa-spin me-2"></i>
                  Loading bills...
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
                    data={filteredBillsData}
                    options={options}
                    trStyle={{ cursor: 'pointer' }}
                  >
                    <TableHeaderColumn
                      dataField="voucherNo"
                      dataAlign="left"
                      headerAlign="left"
                      width="12%"
                      thStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                      tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                    >
                      Voucher No
                    </TableHeaderColumn>
                    <TableHeaderColumn
  isKey
  dataField="supplier"
  dataAlign="left"
  headerAlign="left"
  dataFormat={(cell) => {
    if (!cell) return 'Unknown Supplier';
    return cell.name || cell.displayName || 'Unknown Supplier';
  }}
  width="15%"
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
                      width="15%"
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
                      Order No
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="createdBy"
                      dataAlign="left"
                      headerAlign="left"
                      width="12%"
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
                    >
                      Created By
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="invoiceNo"
                      dataAlign="left"
                      headerAlign="left"
                      width="12%"
                      thStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                      tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                    >
                      Invoice No
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="invoiceDate"
                      dataAlign="left"
                      headerAlign="left"
                      dataFormat={formatDate}
                      width="12%"
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
                      width="12%"
                    >
                      Created Date
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="status"
                      dataFormat={(cell) => {
                        const status = cell?.status || '';
                        return (
                          <Badge color={getBadgeColor(status)}>{getStatusLabel(status)}</Badge>
                        );
                      }}
                      width="12%"
                    >
                      Status
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
                      width="5%"
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

export default Bills;
