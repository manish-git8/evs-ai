import React, { useEffect, useState } from 'react';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Trash, Edit } from 'react-feather';
import { useNavigate } from 'react-router-dom';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { Row, Col, Tooltip } from 'reactstrap';
import Swal from 'sweetalert2';
import ShipmentService from '../../services/ShipmentService';
import ComponentCard from '../../components/ComponentCard';
import { formatDate, getEntityId, pageSize } from '../localStorageUtil';

const Shipment = () => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState([]);
  const supplierId = getEntityId();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [tooltipOpenEdit, setTooltipOpenEdit] = useState(null);
  const [tooltipOpenDelete, setTooltipOpenDelete] = useState(null);

  const fetchShipments = async () => {
    try {
      let response;
      if (searchTerm.trim() === '') {
        response = await ShipmentService.getAllShipments(supplierId);
      } else {
        response = await ShipmentService.getShipmentsBySearch(searchTerm, supplierId);
      }
      setShipments(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      if (error.response && error.response.data && error.response.data.errorMessage) {
        toast.dismiss();
        toast.error(error.response.data.errorMessage);
      } else {
        toast.dismiss();
        toast.error('An unexpected error occurred');
      }
    }
  };

  const options = {
    paginationShowsTotal: false,
    hideSizePerPage: true,
    paginationPosition: 'bottom',
  };

  useEffect(() => {
    fetchShipments();
  }, [debouncedSearchTerm, supplierId]);

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 2000);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleDeleteShipment = async (shipmentId) => {
    const confirmDelete = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to delete this shipment?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Delete',
    });

    if (confirmDelete.isConfirmed) {
      try {
        await ShipmentService.deleteShipment(supplierId, shipmentId);
        setShipments(shipments.filter((shipment) => shipment.id !== shipmentId));
        Swal.fire('Deleted!', 'The shipment has been deleted.', 'success');
        fetchShipments();
      } catch (error) {
        console.error('Error deleting shipment:', error);
        Swal.fire('Error', 'Failed to delete shipment. Please try again.', 'error');
      }
    }
  };

  const handleEdit = (shipmentId) => {
    navigate(`/shipment-registration/${shipmentId}`);
  };

  const renderActionButtons = (cell, row) => {
    const tooltipIdEdit = `editTooltip-${row.shipmentId}-${row.companyId}`;
    const tooltipIdDelete = `deleteTooltip-${row.shipmentId}-${row.companyId}`;

    return (
      <div className="d-flex justify-content-center">
        <button
          type="button"
          id={tooltipIdEdit}
          className="btn btn-sm btn-primary me-2 action-button-edit"
          onClick={() => handleEdit(row.shipmentId, row.companyId)}
        >
          <Edit size={14} />
        </button>
        <Tooltip
          isOpen={tooltipOpenEdit === tooltipIdEdit}
          toggle={() =>
            setTooltipOpenEdit(tooltipOpenEdit === tooltipIdEdit ? null : tooltipIdEdit)
          }
          target={tooltipIdEdit}
        >
          Edit
        </Tooltip>

        <button
          type="button"
          id={tooltipIdDelete}
          className="btn btn-sm btn-danger action-button-delete"
          onClick={() => handleDeleteShipment(row.shipmentId)}
        >
          <Trash size={14} />
        </button>
        <Tooltip
          isOpen={tooltipOpenDelete === tooltipIdDelete}
          toggle={() =>
            setTooltipOpenDelete(tooltipOpenDelete === tooltipIdDelete ? null : tooltipIdDelete)
          }
          target={tooltipIdDelete}
        >
          Delete
        </Tooltip>
      </div>
    );
  };

  const handleNavigate = () => {
    navigate('/shipment-registration');
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
          <ComponentCard title="Shipment">
            <div className="d-flex justify-content-between align-items-end responsive-container">
              <div>
                <input
                  type="number"
                  value={searchTerm}
                  onChange={handleSearchInputChange}
                  placeholder="Search by shipment id..."
                  className="form-control"
                />
              </div>
              <button className="btn btn-primary" type="button" onClick={handleNavigate}>
                Add New
              </button>
            </div>
            <div className="table-responsive">
              <BootstrapTable
                data={shipments}
                striped
                hover
                condensed
                pagination={shipments.length > pageSize}
                options={options}
                tableHeaderClass="mb-0"
              >
                <TableHeaderColumn
                  isKey
                  dataField="shipFromAddress"
                  dataAlign="left"
                  headerAlign="left"
                  width="25%"
                >
                  Ship From
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataField="shipToAddress"
                  dataAlign="left"
                  headerAlign="left"
                  width="25%"
                >
                  Ship To
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataField="shippingCompany"
                  dataAlign="left"
                  headerAlign="left"
                  width="10%"
                >
                  Carrier
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataField="shipmentDispatchDate"
                  dataAlign="left"
                  headerAlign="left"
                  width="15%"
                  dataFormat={formatDate}
                >
                  Shipment Date
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataField="estimateDeliveryDate"
                  dataAlign="left"
                  headerAlign="left"
                  width="15%"
                  dataFormat={formatDate}
                >
                  Expected Delivery
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataField="trackingNumber"
                  dataAlign="left"
                  headerAlign="left"
                  width="15%"
                >
                  Tracking No.
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataFormat={renderActionButtons}
                  width="5%"
                  dataAlign="left"
                  headerAlign="left"
                >
                  Actions
                </TableHeaderColumn>
              </BootstrapTable>
            </div>
          </ComponentCard>
        </Col>
      </Row>
    </div>
  );
};

export default Shipment;
