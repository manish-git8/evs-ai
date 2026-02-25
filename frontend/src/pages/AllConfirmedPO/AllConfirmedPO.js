import React, { useEffect, useState } from 'react';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import Swal from 'sweetalert2';
import { Row, Col } from 'reactstrap';
import { Edit, Trash } from 'react-feather';
import { useNavigate } from 'react-router-dom';
import ComponentCard from '../../components/ComponentCard';
import PurchaseOrderService from '../../services/PurchaseOrderService';
import { getEntityId } from '../localStorageUtil';

const AllConfirmedPO = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchAllConfirmedOrders = async () => {
    try {
      const supplierId = getEntityId();
      const confirmationId = 143;
      const response = await PurchaseOrderService.allConfirmedOrder(supplierId, confirmationId);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching all confirmed orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllConfirmedOrders();
  }, []);

  const handleDelete = async (row) => {
    try {
      const confirmDelete = await Swal.fire({
        title: 'Are you sure?',
        text: 'This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
      });

      if (confirmDelete.isConfirmed) {
        const supplierId = getEntityId();
        const confirmationId = row.orderId;
        const companyId = 143;

        await PurchaseOrderService.deleteConfirmedOrder(supplierId, confirmationId, companyId);

        setData(data.filter((item) => item.orderId !== row.orderId));

        Swal.fire('Deleted!', 'Order has been deleted successfully.', 'success');
        fetchAllConfirmedOrders();
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      Swal.fire('Error!', 'Failed to delete the order. Please try again.', 'error');
    }
  };

  const handleEdit = (orderId) => {
    navigate(`/allconfirmedpoedit?orderId=${orderId}`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const tableData = data.map((item) => ({
    orderId: item.orderConfirmationId || 'N/A',
    confirmationDate: new Date(item.confirmationDate).toLocaleDateString() || 'N/A',
    supplierName: item.supplier?.name || 'N/A',
    notes: item.notes || 'N/A',
  }));

  const renderActionButtons = (cell, row) => (
    <div className="d-flex justify-content-center">
      <button
        type="button"
        className="btn btn-sm btn-primary me-2 action-button-edit"
        onClick={() => handleEdit(row.orderId)}
      >
        <Edit size={14} />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-danger action-button-delete"
        onClick={() => handleDelete(row)}
      >
        <Trash size={14} />
      </button>
    </div>
  );

  return (
    <div style={{ paddingTop: '24px' }}>
      <Row>
        <Col md="12">
          <ComponentCard title="Confirmed Order List">
            <div className="table-responsive">
              <BootstrapTable
                data={tableData}
                striped
                hover
                condensed
                pagination
                tableHeaderClass="mb-0"
              >
                <TableHeaderColumn
                  isKey
                  dataField="orderId"
                  dataAlign="left"
                  headerAlign="left"
                  width="25%"
                >
                  Order ID
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataField="confirmationDate"
                  dataAlign="left"
                  headerAlign="left"
                  width="25%"
                >
                  Confirmation Date
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataField="supplierName"
                  dataAlign="left"
                  headerAlign="left"
                  width="25%"
                >
                  Supplier Name
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataField="notes"
                  dataAlign="left"
                  headerAlign="left"
                  width="25%"
                >
                  Notes
                </TableHeaderColumn>
                <TableHeaderColumn
                  width="8%"
                  dataFormat={renderActionButtons}
                  dataAlign="center"
                  headerAlign="center"
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

export default AllConfirmedPO;
