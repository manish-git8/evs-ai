import React, { useState, useEffect, useMemo } from 'react';
import { FaSort } from 'react-icons/fa';
import '../CompanyManagement/ReactBootstrapTable.scss';
import Swal from 'sweetalert2';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, CardBody } from 'reactstrap';
import { Trash, Edit } from 'react-feather';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AddressService from '../../services/AddressService';
import { getEntityId } from '../localStorageUtil';

const AddressManagement = () => {
  const navigate = useNavigate();
  const companyId = getEntityId();
  const [shippingAddresses, setShippingAddresses] = useState([]);
  const [billingAddresses, setBillingAddresses] = useState([]);
  const [sortBy, setSortBy] = useState('addressLine1');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchBillingAddresses = () => {
    const pageDto = {
      pageSize: 100,
      pageNumber: 0,
    };

    AddressService.getAllAddress(companyId, 'BILLING', pageDto)
      .then((response) => setBillingAddresses(response.data))
      .catch(() => toast.error('Failed to fetch billing addresses'));
  };

  const fetchShippingAddresses = () => {
    const pageDto = {
      pageSize: 100,
      pageNumber: 0,
      sortBy: sortBy,
      order: sortOrder.toUpperCase(),
    };

    AddressService.getAllAddress(companyId, 'SHIPPING', pageDto)
      .then((response) => setShippingAddresses(response.data))
      .catch(() => toast.error('Failed to fetch shipping addresses'));
  };

  useEffect(() => {
    fetchBillingAddresses();
    fetchShippingAddresses();
  }, []);

  useEffect(() => {
    fetchShippingAddresses();
  }, [sortBy, sortOrder]);

  const getValueByField = (item, field) => {
    if (!item) return '';
    if (!field) return item;
    const parts = field.split('.');
    let val = item;
    for (let p of parts) {
      if (val == null) break;
      val = val[p];
    }
    if (Array.isArray(val)) return val.length;
    if (val && typeof val === 'object') {
      if (val.firstName || val.lastName)
        return `${val.firstName || ''} ${val.lastName || ''}`.trim();
      if (val.displayName) return val.displayName;
      return JSON.stringify(val);
    }
    const maybeDate = Date.parse(val);
    if (!Number.isNaN(maybeDate)) return maybeDate;
    if (!Number.isNaN(Number(val))) return Number(val);
    return (val || '').toString().toLowerCase();
  };

  const sortData = (arr, field, order = 'asc') => {
    if (!Array.isArray(arr)) return arr;
    const copy = [...arr];
    copy.sort((a, b) => {
      const va = getValueByField(a, field);
      const vb = getValueByField(b, field);
      if (va === vb) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number')
        return order === 'asc' ? va - vb : vb - va;
      const sa = String(va);
      const sb = String(vb);
      return order === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return copy;
  };

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy === field) return sortOrder === 'asc' ? <FaSort /> : <FaSort />;
    return <FaSort />;
  };

  const sortedShippingAddresses = useMemo(
    () => sortData(shippingAddresses || [], sortBy, sortOrder),
    [shippingAddresses, sortBy, sortOrder],
  );

  const handleDeleteAddress = async (addressId) => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to delete this address?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Delete',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await AddressService.handleDeleteAddress(companyId, addressId);
          Swal.fire('Deleted!', 'The Address has been deleted.', 'success');
          fetchAddresses();
        } catch (error) {
          console.error('Error deleting Address:', error);
          toast.dismiss();
          toast.error('Failed to delete Address');
        }
      }
    });
  };

  const handleEditAddress = (addressId, addressType) => {
    AddressService.getAddressById(companyId, addressId)
      .then((response) => {
        const addressData = response.data;
        localStorage.setItem(
          'editAddressData',
          JSON.stringify({
            ...addressData,
            addressType,
          }),
        );
        navigate(`/address-registration/${addressId}`);
      })
      .catch((error) => {
        toast.dismiss();
        toast.error('Failed to fetch address details');
        console.error(error);
      });
  };

  const renderEditButton = (cell, row) => (
    <div className="d-flex justify-content-center">
      <button
        type="button"
        className="btn btn-sm btn-primary action-button-edit"
        onClick={() => handleEditAddress(row.addressId, 'BILLING')}
      >
        <Edit size={14} />
      </button>
    </div>
  );

  const handleNavigate = () => {
    localStorage.removeItem('editAddressData');
    navigate('/address-registration');
  };

  const options = {
    paginationShowsTotal: false,
    hideSizePerPage: true,
    paginationPosition: 'bottom',
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
          <Card
            className="enhanced-card"
            style={{
              borderRadius: '15px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: 'none',
            }}
          >
            <CardBody style={{ padding: '24px 24px 0 24px' }}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="icon-wrapper"
                    style={{
                      width: '40px',
                      height: '40px',
                      background: '#009efb',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i className="fas fa-map-marker-alt text-white"></i>
                  </div>
                  <div>
                    <h4 className="mb-1">Address Management</h4>
                    <p className="text-muted mb-0 small">
                      Manage billing and shipping addresses for your organization
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
            <CardBody style={{ padding: '0 24px 24px 24px' }}>
              {/* Billing Addresses Section */}
              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="mb-0" style={{ fontWeight: '600', color: '#212529' }}>
                    Billing Addresses
                  </h5>
                  <span className="badge bg-primary">
                    {billingAddresses.length} Address{billingAddresses.length !== 1 ? 'es' : ''}
                  </span>
                </div>
                <div className="table-responsive">
                  <BootstrapTable
                    data={billingAddresses}
                    options={options}
                    striped
                    hover
                    condensed
                    tableHeaderClass="mb-0"
                    tableStyle={{ width: '100%', tableLayout: 'fixed' }}
                  >
                    <TableHeaderColumn
                      isKey
                      dataField="addressId"
                      dataAlign="left"
                      headerAlign="left"
                      hidden
                    >
                      ID
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="addressLine1"
                      dataAlign="left"
                      headerAlign="left"
                      width="18%"
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Address Line 1
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="addressLine2"
                      dataAlign="left"
                      headerAlign="left"
                      width="18%"
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Address Line 2
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="street"
                      dataAlign="left"
                      headerAlign="left"
                      width="15%"
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Street
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="city"
                      dataAlign="left"
                      headerAlign="left"
                      width="12%"
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      City
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="state"
                      dataAlign="left"
                      headerAlign="left"
                      width="12%"
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      State
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="postalCode"
                      dataAlign="left"
                      headerAlign="left"
                      width="10%"
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Postal Code
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="country"
                      dataAlign="left"
                      headerAlign="left"
                      width="10%"
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Country
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="actions"
                      dataFormat={(cell, row) => renderEditButton(cell, row, 'BILLING')}
                      dataAlign="center"
                      headerAlign="center"
                      width="5%"
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Actions
                    </TableHeaderColumn>
                  </BootstrapTable>
                </div>
              </div>

              {/* Shipping Addresses Section */}
              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="mb-0" style={{ fontWeight: '600', color: '#212529' }}>
                    Shipping Addresses
                  </h5>
                  <div className="d-flex align-items-center gap-3">
                    <span className="badge bg-primary">
                      {shippingAddresses.length} Address{shippingAddresses.length !== 1 ? 'es' : ''}
                    </span>
                    <button
                      className="btn btn-sm px-3 py-1"
                      type="button"
                      onClick={handleNavigate}
                      style={{
                        background: '#009efb',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '12px',
                      }}
                    >
                      <i className="fas fa-plus me-1" style={{ fontSize: '10px' }}></i>Add Shipping
                      Address
                    </button>
                  </div>
                </div>
                <div className="table-responsive">
                  <BootstrapTable
                    data={shippingAddresses}
                    options={options}
                    striped
                    hover
                    condensed
                    tableHeaderClass="mb-0"
                    tableStyle={{ width: '100%', tableLayout: 'fixed' }}
                  >
                    <TableHeaderColumn
                      isKey
                      dataField="addressId"
                      dataAlign="left"
                      headerAlign="left"
                      hidden
                    >
                      ID
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="addressLine1"
                      dataAlign="left"
                      headerAlign="left"
                      width="18%"
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word', cursor: 'pointer' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center' }}
                        onClick={() => handleSort('addressLine1')}
                      >
                        Address Line 1 {renderSortIcon('addressLine1')}
                      </div>
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="addressLine2"
                      dataAlign="left"
                      headerAlign="left"
                      width="18%"
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word', cursor: 'pointer' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center' }}
                        onClick={() => handleSort('addressLine2')}
                      >
                        Address Line 2 {renderSortIcon('addressLine2')}
                      </div>
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="street"
                      dataAlign="left"
                      headerAlign="left"
                      width="15%"
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word', cursor: 'pointer' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center' }}
                        onClick={() => handleSort('street')}
                      >
                        Street {renderSortIcon('street')}
                      </div>
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="city"
                      dataAlign="left"
                      headerAlign="left"
                      width="12%"
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word', cursor: 'pointer' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center' }}
                        onClick={() => handleSort('city')}
                      >
                        City {renderSortIcon('city')}
                      </div>
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="state"
                      dataAlign="left"
                      headerAlign="left"
                      width="12%"
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word', cursor: 'pointer' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center' }}
                        onClick={() => handleSort('state')}
                      >
                        State {renderSortIcon('state')}
                      </div>
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="postalCode"
                      dataAlign="left"
                      headerAlign="left"
                      width="10%"
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word', cursor: 'pointer' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center' }}
                        onClick={() => handleSort('postalCode')}
                      >
                        Postal Code {renderSortIcon('postalCode')}
                      </div>
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="country"
                      dataAlign="left"
                      headerAlign="left"
                      width="10%"
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word', cursor: 'pointer' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center' }}
                        onClick={() => handleSort('country')}
                      >
                        Country {renderSortIcon('country')}
                      </div>
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="actions"
                      dataFormat={(cell, row) => (
                        <div className="d-flex justify-content-center gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary action-button-edit"
                            onClick={() => handleEditAddress(row.addressId, 'SHIPPING')}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger action-button-delete"
                            onClick={() => handleDeleteAddress(row.addressId)}
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      )}
                      dataAlign="center"
                      headerAlign="center"
                      width="5%"
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Actions
                    </TableHeaderColumn>
                  </BootstrapTable>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AddressManagement;
