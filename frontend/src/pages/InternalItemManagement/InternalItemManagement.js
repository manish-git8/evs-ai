import React, { useState, useEffect } from 'react';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { Edit, Trash } from 'react-feather';
import Swal from 'sweetalert2';
import {
  Row,
  Col,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  FormGroup,
  Label,
  Input,
  FormFeedback,
  Badge,
  Pagination,
  PaginationItem,
  PaginationLink,
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import ComponentCard from '../../components/ComponentCard';
import InternalItemService from '../../services/InternalItemService';
import CompanyCategoryService from '../../services/CompanyCategoryService';
import { getEntityId } from '../localStorageUtil';

const PAGE_SIZE = 10;

const InternalItemManagement = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const companyId = getEntityId();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentItem, setCurrentItem] = useState({
    description: '',
    categoryId: '',
    defaultUom: '',
    quantityPerUnit: '',
    specifications: '',
    status: 'ACTIVE',
  });
  const [errors, setErrors] = useState({});

  const UOM_OPTIONS = [
    { value: 'Each', label: 'Each' },
    { value: 'Piece', label: 'Piece' },
    { value: 'Box', label: 'Box' },
    { value: 'Kg', label: 'Kilogram' },
    { value: 'Meter', label: 'Meter' },
    { value: 'Liter', label: 'Liter' },
    { value: 'Set', label: 'Set' },
    { value: 'Pack', label: 'Pack' },
    { value: 'Roll', label: 'Roll' },
    { value: 'Pair', label: 'Pair' },
  ];

  const fetchCategories = async () => {
    try {
      const response = await CompanyCategoryService.getCompanyCategory();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchItems = async (page = 0) => {
    setLoading(true);
    try {
      let response;
      if (debouncedSearchTerm.trim() !== '') {
        response = await InternalItemService.searchInternalItems(companyId, debouncedSearchTerm, 50);
        setItems(response || []);
        setTotalElements(response?.length || 0);
        setTotalPages(1);
        setCurrentPage(0);
      } else {
        response = await InternalItemService.getAllInternalItems(companyId, {
          pageSize: PAGE_SIZE,
          pageNumber: page,
          status: statusFilter || undefined,
        });
        setItems(response?.content || []);
        setTotalElements(response?.totalElements || 0);
        setTotalPages(response?.totalPages || 0);
        setCurrentPage(response?.pageNumber || 0);
      }
    } catch (error) {
      console.error('Error fetching internal items:', error);
      toast.dismiss();
      toast.error('Failed to fetch internal items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    setCurrentPage(0);
    fetchItems(0);
  }, [debouncedSearchTerm, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handlePageChange = (page) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
      fetchItems(page);
    }
  };

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const toggleModal = () => {
    setModalOpen(!modalOpen);
    if (modalOpen) {
      resetForm();
    }
  };

  const resetForm = () => {
    setCurrentItem({
      description: '',
      categoryId: '',
      defaultUom: '',
      quantityPerUnit: '',
      specifications: '',
      status: 'ACTIVE',
    });
    setErrors({});
    setEditMode(false);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!currentItem.description || currentItem.description.trim() === '') {
      newErrors.description = 'Description is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddNew = () => {
    resetForm();
    setEditMode(false);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setCurrentItem({
      internalItemId: item.internalItemId,
      partId: item.partId,
      description: item.description || '',
      categoryId: item.categoryId || '',
      defaultUom: item.defaultUom || '',
      quantityPerUnit: item.quantityPerUnit || '',
      specifications: item.specifications || '',
      status: item.status || 'ACTIVE',
    });
    setEditMode(true);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const itemData = {
        description: currentItem.description,
        categoryId: currentItem.categoryId ? Number(currentItem.categoryId) : null,
        defaultUom: currentItem.defaultUom || null,
        quantityPerUnit: currentItem.quantityPerUnit ? Number(currentItem.quantityPerUnit) : null,
        specifications: currentItem.specifications || null,
        status: currentItem.status,
      };

      if (editMode) {
        await InternalItemService.updateInternalItem(companyId, currentItem.internalItemId, itemData);
        toast.success('Internal item updated successfully');
      } else {
        await InternalItemService.createInternalItem(companyId, itemData);
        toast.success('Internal item created successfully');
      }

      toggleModal();
      fetchItems(currentPage);
    } catch (error) {
      console.error('Error saving internal item:', error);
      toast.dismiss();
      toast.error(error.response?.data?.errorMessage || 'Failed to save internal item');
    }
  };

  const handleDelete = async (internalItemId) => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will deactivate the internal item.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Delete',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await InternalItemService.deleteInternalItem(companyId, internalItemId);
          Swal.fire('Deleted!', 'The internal item has been deactivated.', 'success');
          fetchItems(currentPage);
        } catch (error) {
          console.error('Error deleting internal item:', error);
          toast.dismiss();
          toast.error('Failed to delete internal item');
        }
      }
    });
  };

  const renderStatusBadge = (cell) => {
    const statusColors = {
      ACTIVE: 'success',
      INACTIVE: 'secondary',
    };
    return <Badge color={statusColors[cell] || 'secondary'}>{cell}</Badge>;
  };

  const renderActionButtons = (cell, row) => (
    <div className="d-flex justify-content-center">
      <button
        type="button"
        className="btn btn-sm btn-primary me-2 action-button-edit"
        onClick={() => handleEdit(row)}
        title="Edit"
      >
        <Edit size={14} />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-danger action-button-delete"
        onClick={() => handleDelete(row.internalItemId)}
        title="Delete"
      >
        <Trash size={14} />
      </button>
    </div>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(0, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="d-flex justify-content-between align-items-center mt-3">
        <div className="text-muted small">
          Showing {currentPage * PAGE_SIZE + 1} to {Math.min((currentPage + 1) * PAGE_SIZE, totalElements)} of {totalElements} items
        </div>
        <Pagination>
          <PaginationItem disabled={currentPage === 0}>
            <PaginationLink first onClick={() => handlePageChange(0)} />
          </PaginationItem>
          <PaginationItem disabled={currentPage === 0}>
            <PaginationLink previous onClick={() => handlePageChange(currentPage - 1)} />
          </PaginationItem>
          {startPage > 0 && (
            <PaginationItem disabled>
              <PaginationLink>...</PaginationLink>
            </PaginationItem>
          )}
          {pages.map((page) => (
            <PaginationItem key={page} active={page === currentPage}>
              <PaginationLink onClick={() => handlePageChange(page)}>{page + 1}</PaginationLink>
            </PaginationItem>
          ))}
          {endPage < totalPages - 1 && (
            <PaginationItem disabled>
              <PaginationLink>...</PaginationLink>
            </PaginationItem>
          )}
          <PaginationItem disabled={currentPage === totalPages - 1}>
            <PaginationLink next onClick={() => handlePageChange(currentPage + 1)} />
          </PaginationItem>
          <PaginationItem disabled={currentPage === totalPages - 1}>
            <PaginationLink last onClick={() => handlePageChange(totalPages - 1)} />
          </PaginationItem>
        </Pagination>
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
          <ComponentCard
            title={
              <div className="d-flex align-items-center gap-3">
                <div
                  className="icon-wrapper"
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#009efb',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid rgba(0, 158, 251, 0.1)',
                  }}
                >
                  <i className="fas fa-boxes text-white"></i>
                </div>
                <div>
                  <h4 className="mb-1">Internal Item Catalog</h4>
                  <p className="text-muted mb-0 small">
                    Manage your company&apos;s internal items with auto-generated Part IDs
                  </p>
                </div>
              </div>
            }
          >
            <div
              className="d-flex justify-content-between align-items-center mb-3 responsive-container"
              style={{
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef',
              }}
            >
              <div className="d-flex align-items-center gap-3">
                <div className="search-wrapper" style={{ minWidth: '250px' }}>
                  <div className="position-relative">
                    <i
                      className="fas fa-search position-absolute"
                      style={{
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#6c757d',
                        zIndex: 1,
                      }}
                    ></i>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={handleSearchInputChange}
                      placeholder="Search by Part ID or description..."
                      className="form-control"
                      style={{
                        paddingLeft: '40px',
                        borderRadius: '6px',
                        border: '1px solid #dee2e6',
                      }}
                    />
                  </div>
                </div>
                <div style={{ minWidth: '150px' }}>
                  <select
                    className="form-control"
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
                    style={{ borderRadius: '6px' }}
                  >
                    <option value="">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div className="stats-info d-flex align-items-center gap-2">
                  <i className="fas fa-list-ul" style={{ color: '#009efb', fontSize: '14px' }}></i>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#495057' }}>
                    Total Items: <span style={{ color: '#009efb' }}>{totalElements}</span>
                  </span>
                </div>
              </div>
              <button
                className="btn btn-primary px-4 py-2"
                type="button"
                onClick={handleAddNew}
                style={{
                  backgroundColor: '#009efb',
                  border: '1px solid #009efb',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0, 158, 251, 0.2)',
                  transition: 'all 0.2s ease',
                  color: 'white',
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#0084d6';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 158, 251, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#009efb';
                  e.target.style.transform = 'translateY(0px)';
                  e.target.style.boxShadow = '0 2px 8px rgba(0, 158, 251, 0.2)';
                }}
                onFocus={(e) => {
                  e.target.style.backgroundColor = '#0084d6';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 158, 251, 0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.backgroundColor = '#009efb';
                  e.target.style.transform = 'translateY(0px)';
                  e.target.style.boxShadow = '0 2px 8px rgba(0, 158, 251, 0.2)';
                }}
              >
                <i className="fas fa-plus me-2"></i>Add New Item
              </button>
            </div>
            <div className="table-responsive">
              <BootstrapTable
                data={items}
                striped
                hover
                condensed
                tableHeaderClass="mb-0"
              >
                <TableHeaderColumn
                  width="12%"
                  isKey
                  dataField="partId"
                  dataAlign="left"
                  headerAlign="left"
                >
                  Part ID
                </TableHeaderColumn>
                <TableHeaderColumn
                  width="25%"
                  dataField="description"
                  dataAlign="left"
                  headerAlign="left"
                >
                  Description
                </TableHeaderColumn>
                <TableHeaderColumn
                  width="15%"
                  dataField="categoryName"
                  dataAlign="left"
                  headerAlign="left"
                  dataFormat={(cell) => cell || '-'}
                >
                  Category
                </TableHeaderColumn>
                <TableHeaderColumn
                  width="10%"
                  dataField="defaultUom"
                  dataAlign="center"
                  headerAlign="center"
                  dataFormat={(cell) => cell || '-'}
                >
                  UOM
                </TableHeaderColumn>
                <TableHeaderColumn
                  width="10%"
                  dataField="quantityPerUnit"
                  dataAlign="center"
                  headerAlign="center"
                  dataFormat={(cell) => cell || '-'}
                >
                  Qty/Unit
                </TableHeaderColumn>
                <TableHeaderColumn
                  width="10%"
                  dataField="status"
                  dataAlign="center"
                  headerAlign="center"
                  dataFormat={renderStatusBadge}
                >
                  Status
                </TableHeaderColumn>
                <TableHeaderColumn
                  width="10%"
                  dataFormat={renderActionButtons}
                  dataAlign="center"
                  headerAlign="center"
                >
                  Actions
                </TableHeaderColumn>
              </BootstrapTable>
              {loading && (
                <div className="text-center py-4">
                  <i className="fas fa-spinner fa-spin"></i> Loading...
                </div>
              )}
              {!loading && items.length === 0 && (
                <div className="text-center py-4 text-muted">
                  No internal items found. Click &quot;Add New Item&quot; to create one.
                </div>
              )}
              {renderPagination()}
            </div>
          </ComponentCard>
        </Col>
      </Row>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} toggle={toggleModal} size="lg">
        <ModalHeader toggle={toggleModal}>
          {editMode ? 'Edit Internal Item' : 'Add New Internal Item'}
        </ModalHeader>
        <ModalBody>
          {editMode && currentItem.partId && (
            <div className="alert alert-info mb-3">
              <strong>Part ID:</strong> {currentItem.partId}
              <br />
              <small className="text-muted">Part ID is auto-generated and cannot be changed.</small>
            </div>
          )}
          <Row>
            <Col md={12}>
              <FormGroup>
                <Label for="description">
                  Description <span className="text-danger">*</span>
                </Label>
                <Input
                  type="textarea"
                  id="description"
                  name="description"
                  value={currentItem.description}
                  onChange={handleInputChange}
                  invalid={!!errors.description}
                  rows={2}
                  placeholder="Enter item description"
                />
                <FormFeedback>{errors.description}</FormFeedback>
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="categoryId">Category</Label>
                <Input
                  type="select"
                  id="categoryId"
                  name="categoryId"
                  value={currentItem.categoryId}
                  onChange={handleInputChange}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.categoryId} value={cat.categoryId}>
                      {cat.categoryName}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label for="defaultUom">Default Unit of Measure</Label>
                <Input
                  type="select"
                  id="defaultUom"
                  name="defaultUom"
                  value={currentItem.defaultUom}
                  onChange={handleInputChange}
                >
                  <option value="">Select UOM</option>
                  {UOM_OPTIONS.map((uom) => (
                    <option key={uom.value} value={uom.value}>
                      {uom.label}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="quantityPerUnit">Quantity Per Unit</Label>
                <Input
                  type="number"
                  id="quantityPerUnit"
                  name="quantityPerUnit"
                  value={currentItem.quantityPerUnit}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="e.g., 10"
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label for="status">Status</Label>
                <Input
                  type="select"
                  id="status"
                  name="status"
                  value={currentItem.status}
                  onChange={handleInputChange}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </Input>
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              <FormGroup>
                <Label for="specifications">Specifications</Label>
                <Input
                  type="textarea"
                  id="specifications"
                  name="specifications"
                  value={currentItem.specifications}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Enter technical specifications or additional details"
                />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleModal}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleSave}>
            {editMode ? 'Update' : 'Create'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default InternalItemManagement;
