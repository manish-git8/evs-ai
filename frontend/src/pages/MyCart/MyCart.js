import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Spinner, Card, CardBody, CardHeader, Input } from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { FaSort } from 'react-icons/fa';
import 'react-toastify/dist/ReactToastify.css';
import '../CompanyManagement/ReactBootstrapTable.scss';
import CartService from '../../services/CartService';
import { getEntityId, getUserId } from '../localStorageUtil';
import ApprovalPolicyManagementService from '../../services/ApprovalPolicyManagementService';

const MyCart = () => {
  const navigate = useNavigate();
  const userId = getUserId();
  const companyId = getEntityId();

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filteredCartItems, setFilteredCartItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdDate');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchCarts = async (pageNumber = 0) => {
    setLoading(true);
    try {
      const response = await CartService.getCartsPaginated(
        companyId,
        pageSize,
        pageNumber,
        debouncedSearchTerm.trim(),
        userId,
        '',
        'DRAFT',
        sortBy,
        sortOrder,
      );

      const responseData = response.data?.content ? response.data.content : response.data || [];
      const totalCount = response.data?.totalElements || responseData.length;

      setTotalElements(totalCount);
      setCurrentPage(pageNumber);

      const cartsWithDetails = responseData.map((cart) => ({
        ...cart,
        hasProducts: (cart.lineItemCount || 0) > 0,
        totalQuantity: cart.totalQuantity || 0,
        supplierId: cart.supplierId || null,
        lineItemCount: cart.lineItemCount || 0,
      }));

      setCartItems(cartsWithDetails);
      setFilteredCartItems(cartsWithDetails);
    } catch (error) {
      console.error('Error fetching carts:', error);
      setCartItems([]);
      setFilteredCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarts(0);
  }, [debouncedSearchTerm, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 1000);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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

  const handleSearchInputChange = (event) => setSearchTerm(event.target.value);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCartItems(cartItems);
    } else {
      const filtered = cartItems.filter(
        (cart) =>
          cart.cartNo && cart.cartNo.toString().toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredCartItems(filtered);
    }
  }, [searchTerm, cartItems]);

  const handleRemove = (cartId) => {
    Swal.fire({
      title: 'Delete Cart',
      text: 'This cart will be permanently deleted.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      buttonsStyling: false,
      customClass: {
        confirmButton: 'btn btn-danger me-2',
        cancelButton: 'btn btn-secondary',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        CartService.deleteCart(cartId, companyId)
          .then(() => {
            Swal.fire({
              title: 'Deleted',
              text: 'Cart has been deleted successfully.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false,
            });
            setCartItems(cartItems.filter((item) => item.cartId !== cartId));
          })
          .catch((error) => {
            console.error('Error deleting cart:', error);
            Swal.fire({
              title: 'Error',
              text: 'Failed to delete cart. Please try again.',
              icon: 'error',
              confirmButtonText: 'OK',
              buttonsStyling: false,
              customClass: {
                confirmButton: 'btn btn-primary',
              },
            });
          });
      }
    });
  };

  const formatStatusWithIcon = (status) => {
    const statusConfig = {
      DRAFT: { text: 'Draft', class: 'bg-secondary text-white' },
      CREATED: { text: 'Created', class: 'bg-info text-white' },
      PENDING_APPROVAL: { text: 'Pending Approval', class: 'bg-warning text-dark' },
      APPROVED: { text: 'Approved', class: 'bg-success text-white' },
      REJECTED: { text: 'Rejected', class: 'bg-danger text-white' },
      SUBMITTED: { text: 'Submitted', class: 'bg-primary text-white' },
      POGENERATED: { text: 'PO Generated', class: 'bg-dark text-white' },
    };

    const config = statusConfig[status] || {
      text: status || 'Unknown',
      class: 'bg-light text-dark',
    };

    return (
      <span
        className={`badge ${config.class}`}
        style={{
          fontSize: '11px',
          padding: '6px 10px',
          borderRadius: '6px',
          fontWeight: '500',
        }}
      >
        {config.text}
      </span>
    );
  };

  const handleCreateCartWithConfirmation = () => {
  Swal.fire({
    title: 'Create New Cart?',
    text: 'Are you sure you want to create a new cart?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, Create Cart',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#009efb',
    cancelButtonColor: '#6c757d',
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.close();
      setTimeout(() => {
        handleDirectCreateCart(); 
      }, 100);
    }
  });
};


  const handleNavigate = (cartId, shipToAddressId, cartStatusType) => {
    const submitted = cartStatusType === 'SUBMITTED';
    navigate(`/cartDetails/${cartId}/?submitted=${submitted}&cartStatusType=${cartStatusType}`);
  };

  const handleAddProduct = (cartId, shipToAddressId, cartStatusType) => {
    if (!shipToAddressId) {
      toast.info('Please complete cart details first before adding products');
      const submitted = cartStatusType === 'SUBMITTED';
      navigate(`/cartDetails/${cartId}/?submitted=${submitted}&cartStatusType=${cartStatusType}`);
      return;
    }

    const submitted = cartStatusType === 'SUBMITTED';
    navigate(
      `/products/${companyId}/${cartId}/${shipToAddressId}?submitted=${submitted}&cartStatusType=${cartStatusType}`,
    );
  };

  const handleDirectCreateCart = async () => {
    try {
      toast.dismiss();
      const approvalRes = await ApprovalPolicyManagementService.getApprovalPolicyStatus(companyId);
      const { cart, purchaseOrder } = approvalRes.data;

      if (!cart || !purchaseOrder) {
        const msg = !cart
          ? 'Cart approval policy is not active, unable to submit cart.'
          : 'Purchase order approval policy is not active, unable to submit cart.';
        toast.error(msg);
        return;
      }

      const requestBody = { companyId };
      const response = await CartService.handleCartCompany(requestBody, companyId);

      const newCart = response.data;
      toast.success('Cart created successfully!');
      window.dispatchEvent(new Event('cartAdded'));
      setCartItems([...cartItems, newCart]);

      setTimeout(() => {
        navigate(`/cartDetails/${newCart.cartId}`);
      }, 1000);
    } catch (error) {
      console.error('Error creating cart:', error);
      if (error.response?.data?.errorMessage) {
        toast.error(error.response.data.errorMessage);
      } else {
        toast.error('Failed to create cart');
      }
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
      setCurrentPage(pageIndex);
      fetchCarts(pageIndex);
    },
    paginationShowsTotal: (start, to, total) => (
      <span style={{ fontSize: '12px', color: '#6c757d' }}>
        Showing {start} to {to} of {total} carts
      </span>
    ),
  };

  return (
    <div style={{ padding: '25px 0' }}>
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
          <Card className="shadow-sm">
            <CardHeader className="bg-white border-bottom">
              <Row className="align-items-center">
                <Col md="6">
                  <div className="d-flex align-items-center gap-3">
                    <button
                      onClick={() => navigate('/dashboard')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6c757d',
                        fontSize: '20px',
                        padding: '4px 8px',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#009efb')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#6c757d')}
                      title="Back to Dashboard"
                    >
                      <i className="bi bi-arrow-left-circle"></i>
                    </button>
                    <div>
                      <h4 className="mb-0" style={{ color: '#009efb', fontWeight: '600' }}>
                        <i className="bi bi-cart-fill me-2"></i>
                        My Carts
                      </h4>
                      <p className="text-muted mb-0 mt-1">Manage your procurement carts</p>
                    </div>
                  </div>
                </Col>
                <Col md="6" className="text-end">
                  <div className="d-flex align-items-center justify-content-end gap-2">
                    <div className="position-relative" style={{ width: '200px' }}>
                      <Input
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchInputChange}
                        placeholder="Search carts..."
                        className="form-control"
                        style={{
                          paddingLeft: '40px',
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0',
                          fontSize: '14px',
                        }}
                      />
                      <i
                        className="bi bi-search position-absolute"
                        style={{
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#666',
                          fontSize: '14px',
                        }}
                      ></i>
                    </div>
                    <Button
                      color="primary"
                      onClick={handleCreateCartWithConfirmation}
                      style={{
                        borderRadius: '8px',
                        padding: '8px 20px',
                        fontWeight: '500',
                        fontSize: '14px',
                      }}
                    >
                      <i className="bi bi-plus-circle me-1"></i>
                      Add New Cart
                    </Button>
                  </div>
                </Col>
              </Row>
            </CardHeader>
            <CardBody className="p-2">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner color="primary" />
                  <p className="mt-2 mb-0">Loading carts...</p>
                </div>
              ) : filteredCartItems.length === 0 ? (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <i className="bi bi-cart-x" style={{ fontSize: '48px', color: '#ccc' }}></i>
                  </div>
                  <h5 className="text-muted">No carts found</h5>
                  <p className="text-muted mb-0">Create your first cart to get started</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <BootstrapTable
                    data={filteredCartItems}
                    pagination={totalElements > pageSize}
                    remote
                    fetchInfo={{
                      dataTotalSize: totalElements,
                    }}
                    options={options}
                    tableHeaderClass="table-header"
                    className="modern-table"
                  >
                    <TableHeaderColumn
                      dataField="cartNo"
                      isKey
                      dataFormat={(cell, row) => (
                        <div
                          style={{
                            fontWeight: '500',
                          }}
                        >
                          {cell || 'Unnamed Cart'}
                        </div>
                      )}
                      dataAlign="left"
                      headerAlign="left"
                      width="12%"
                      thStyle={{ cursor: 'pointer' }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', userSelect: 'none' }}
                        onClick={() => handleSort('cartNo')}
                      >
                        Cart No {renderSortIcon('cartNo')}
                      </div>
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="supplierNames"
                      dataFormat={(cell) => {
                        if (!cell || cell.length === 0) {
                          return <span className="text-muted">No Supplier</span>;
                        }

                        const displayCount = 2;
                        const visibleSuppliers = cell.slice(0, displayCount);
                        const remainingCount = cell.length - displayCount;

                        return (
                          <div
                            className="d-flex align-items-center gap-1"
                            style={{ flexWrap: 'nowrap' }}
                          >
                            {visibleSuppliers.map((supplierName, index) => (
                              <span
                                key={index}
                                className="badge bg-info"
                                style={{
                                  fontSize: '10px',
                                  fontWeight: '500',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '100px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  flexShrink: 0,
                                }}
                                title={supplierName}
                              >
                                {supplierName}
                              </span>
                            ))}
                            {remainingCount > 0 && (
                              <span
                                className="badge bg-secondary"
                                style={{
                                  fontSize: '10px',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                }}
                                title={cell.slice(displayCount).join(', ')}
                              >
                                +{remainingCount} more
                              </span>
                            )}
                          </div>
                        );
                      }}
                      dataAlign="left"
                      headerAlign="left"
                      width="20%"
                    >
                      Suppliers
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="lineItemCount"
                      dataFormat={(cell) => (
                        <span className="badge bg-secondary" style={{ fontSize: '12px' }}>
                          {cell || 0}
                        </span>
                      )}
                      dataAlign="center"
                      headerAlign="center"
                      width="8%"
                      thStyle={{ cursor: 'pointer' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          userSelect: 'none',
                        }}
                      >
                        Items
                      </div>
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="cartAmount"
                      dataFormat={(cell) => {
                        const amount = cell || 0;
                        return <span style={{ fontWeight: '500' }}>${amount.toFixed(2)}</span>;
                      }}
                      dataAlign="right"
                      headerAlign="right"
                      width="12%"
                      thStyle={{ cursor: 'pointer' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          userSelect: 'none',
                        }}
                      >
                        Amount
                      </div>
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="createdDate"
                      dataFormat={(cell) => {
                        if (!cell) return <span className="text-muted">N/A</span>;
                        const date = new Date(cell);
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const year = date.getFullYear();
                        return (
                          <span style={{ fontSize: '12px' }}>{`${month}/${day}/${year}`}</span>
                        );
                      }}
                      dataAlign="center"
                      headerAlign="center"
                      width="14%"
                      thStyle={{ cursor: 'pointer' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          userSelect: 'none',
                        }}
                        onClick={() => handleSort('createdDate')}
                      >
                        Created {renderSortIcon('createdDate')}
                      </div>
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="cartStatusType"
                      dataFormat={(cell) => formatStatusWithIcon(cell)}
                      dataAlign="center"
                      headerAlign="center"
                      width="12%"
                      thStyle={{ cursor: 'pointer' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          userSelect: 'none',
                        }}
                        onClick={() => handleSort('cartStatusType')}
                      >
                        Status {renderSortIcon('cartStatusType')}
                      </div>
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="actions"
                      dataFormat={(cell, row) => (
                        <div className="d-flex gap-1 justify-content-center">
                          {row.cartStatusType !== 'SUBMITTED' &&
                            row.cartStatusType !== 'PENDING_APPROVAL' &&
                            row.cartStatusType !== 'APPROVED' &&
                            row.cartStatusType !== 'POGENERATED' && (
                              <>
                                <Button
                                  color="primary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNavigate(
                                      row.cartId,
                                      row.shipToAddressId,
                                      row.cartStatusType,
                                    );
                                  }}
                                  style={{
                                    borderRadius: '6px',
                                    padding: '6px 10px',
                                    fontSize: '14px',
                                  }}
                                  title="Edit Cart"
                                >
                                  <i className="bi bi-pencil-square"></i>
                                </Button>
                                <Button
                                  color="danger"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemove(row.cartId);
                                  }}
                                  style={{
                                    borderRadius: '6px',
                                    padding: '4px 12px',
                                    fontSize: '12px',
                                  }}
                                >
                                  <i className="bi bi-trash me-1"></i>
                                  Delete
                                </Button>
                              </>
                            )}
                        </div>
                      )}
                      dataAlign="center"
                      headerAlign="center"
                      width="14%"
                    >
                      Actions
                    </TableHeaderColumn>
                  </BootstrapTable>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MyCart;
