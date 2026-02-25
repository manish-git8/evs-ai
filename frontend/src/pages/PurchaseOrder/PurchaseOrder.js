import React, { useState, useEffect } from 'react';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle } from 'react-feather';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { Row, Col, Tooltip } from 'reactstrap';
import ComponentCard from '../../components/ComponentCard';
import PurchaseOrderService from '../../services/PurchaseOrderService';
import { getEntityId, pageSize, formatStatusText } from '../localStorageUtil';

const PurchaseOrder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const supplierId = getEntityId();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const queryParams = new URLSearchParams(location.search);
  const redirectToDashboard = queryParams.get('dashboard') === 'true';
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [tooltipOpenEdit, setTooltipOpenEdit] = useState(null);

  const options = {
    paginationShowsTotal: false,
    hideSizePerPage: true,
    paginationPosition: 'bottom',
  };

  const handleConfirm = (purchaseOrderId) => {
    navigate(`/supplier-purchase-order-details/${purchaseOrderId}`);
  };

  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      try {
        const response = await PurchaseOrderService.getPurchaseOrders(supplierId);
        // API may return a pagination wrapper { content: [...], ... } or a plain array
        const orders = Array.isArray(response.data)
          ? response.data
          : response.data && Array.isArray(response.data.content)
          ? response.data.content
          : [];
        setPurchaseOrders(orders);
        const statusFilterString = queryParams.get('status');
        const statusFilter = statusFilterString
          ? statusFilterString.split(',').map((s) => s.trim().toLowerCase())
          : null;

        if (statusFilter) {
          setFilteredOrders(
            orders.filter(
              (order) =>
                order.orderStatus && statusFilter.includes(order.orderStatus.toLowerCase()),
            ),
          );
        } else {
          setFilteredOrders(orders);
        }
      } catch (error) {
        if (error.response && error.response.data && error.response.data.errorMessage) {
          toast.dismiss();
          toast.error(error.response.data.errorMessage);
        } else {
          toast.dismiss();
          toast.error('An unexpected error occurred');
        }
      }
    };

    fetchPurchaseOrders();
  }, [supplierId, location.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const fetchPurchaseOrdersBySearch = async () => {
      const statusFilterString = queryParams.get('status');
      const statusFilter = statusFilterString
        ? statusFilterString.split(',').map((s) => s.trim().toLowerCase())
        : null;

      if (debouncedSearchTerm.trim() !== '') {
        try {
          const response = await PurchaseOrderService.getPurchaseOrdersBySearchByOrderNo(
            supplierId,
            debouncedSearchTerm,
          );
          const orders = Array.isArray(response.data)
            ? response.data
            : response.data && Array.isArray(response.data.content)
            ? response.data.content
            : [];
          const filtered = statusFilter
            ? orders.filter(
                (order) =>
                  order.orderStatus && statusFilter.includes(order.orderStatus.toLowerCase()),
              )
            : orders;
          setFilteredOrders(filtered);
        } catch (error) {
          if (error.response && error.response.data && error.response.data.errorMessage) {
            toast.dismiss();
            toast.error(error.response.data.errorMessage);
          } else {
            toast.dismiss();
            toast.error('An unexpected error occurred');
          }
        }
      } else {
        const filtered = statusFilter
          ? purchaseOrders.filter(
              (order) =>
                order.orderStatus && statusFilter.includes(order.orderStatus.toLowerCase()),
            )
          : purchaseOrders;
        setFilteredOrders(filtered);
      }
    };

    fetchPurchaseOrdersBySearch();
  }, [debouncedSearchTerm, purchaseOrders, location.search]);

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const renderActionButtons = (cell, row) => {
    const isConfirmed = row.orderStatus.toLowerCase() === 'confirmed';
    const tooltipId = `editTooltip-${row.PurchaseOrderId}-${row.company.companyId}`;

    return (
      <div className="d-flex justify-content-center">
        <button
          type="button"
          className="btn btn-sm btn-primary me-2 action-button-edit"
          onClick={() => handleConfirm(row.PurchaseOrderId, row.company.companyId)}
          disabled={isConfirmed}
          style={
            isConfirmed
              ? {
                  cursor: 'not-allowed',
                  opacity: 0.5,
                  backgroundColor: 'transparent',
                  borderColor: 'darkgrey',
                  color: 'darkgrey',
                }
              : {}
          }
          id={`actionButton-${row.PurchaseOrderId}-${row.company.companyId}`}
        >
          <CheckCircle size={16} />
        </button>
        <Tooltip
          isOpen={tooltipOpenEdit === tooltipId}
          toggle={() => setTooltipOpenEdit(tooltipOpenEdit === tooltipId ? null : tooltipId)}
          target={`actionButton-${row.PurchaseOrderId}-${row.company.companyId}`}
        >
          Confirm PO
        </Tooltip>
      </div>
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
          <ComponentCard title="Purchase Order">
            <div className="d-flex justify-content-between align-items-end responsive-container">
              <div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchInputChange}
                  placeholder="Search by order number..."
                  className="form-control"
                />
              </div>
            </div>
            <div className="table-responsive">
              <BootstrapTable
                data={filteredOrders}
                striped
                hover
                condensed
                pagination={filteredOrders.length > pageSize}
                options={options}
                tableHeaderClass="mb-0"
              >
                <TableHeaderColumn
                  dataField="company"
                  dataFormat={(cell) => cell.name}
                  dataAlign="left"
                  headerAlign="left"
                  width="20%"
                >
                  Company Name
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataField="orderNo"
                  dataAlign="left"
                  headerAlign="left"
                  width="20%"
                >
                  Order Number
                </TableHeaderColumn>
                <TableHeaderColumn isKey dataField="PurchaseOrderId" hidden>
                  Purchase Order ID
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataField="location"
                  dataFormat={(cell) => cell?.name}
                  dataAlign="left"
                  headerAlign="left"
                  width="20%"
                >
                  Location
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataField="orderStatus"
                  dataFormat={(cell) => (
                    <span
                      className={`badge ${
                        cell === 'APPROVED' || cell === 'CONFIRMED'
                          ? 'bg-success'
                          : cell === 'PARTIALLY_CONFIRMED'
                          ? 'bg-partially-confirmed'
                          : cell === 'REJECTED'
                          ? 'bg-danger'
                          : 'bg-warning'
                      }`}
                    >
                      {formatStatusText(cell)}
                    </span>
                  )}
                  dataAlign="left"
                  headerAlign="left"
                  width="18%"
                >
                  Order Status
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataFormat={renderActionButtons}
                  dataAlign="center"
                  headerAlign="center"
                  width="10%"
                >
                  Actions
                </TableHeaderColumn>
              </BootstrapTable>
              {redirectToDashboard && (
                <div className="mt-3 d-flex justify-content-end">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => navigate('/supplier-dashboard')}
                  >
                    Back
                  </button>
                </div>
              )}
            </div>
          </ComponentCard>
        </Col>
      </Row>
    </div>
  );
};

export default PurchaseOrder;
