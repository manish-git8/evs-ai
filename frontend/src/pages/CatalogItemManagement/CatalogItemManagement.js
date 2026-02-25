import React, { useEffect, useState } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash } from 'react-feather';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { Row, Col, Tooltip } from 'reactstrap';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import '../CompanyManagement/ReactBootstrapTable.scss';
import ComponentCard from '../../components/ComponentCard';
import CatalogItemService from '../../services/CatalogItemService';
import { getEntityId, pageSize } from '../localStorageUtil';

const CatalogItemManagement = () => {
  const navigate = useNavigate();
  const [catalogItems, setCatalogItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const supplierId = getEntityId();
  const [tooltipOpenEdit, setTooltipOpenEdit] = useState(null);
  const [tooltipOpenDelete, setTooltipOpenDelete] = useState(null);
  const [sortBy, setSortBy] = useState('CatalogItemId');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = pageSize || 10;

  const fetchCatalogItems = async (pageNumber = 0) => {
    try {
      setLoading(true);

      const response = await CatalogItemService.getSupplietCatalogItems(supplierId, {
        pageSize: 500,
        pageNumber: 0,
      });

      let filteredData = response || [];

      if (debouncedSearchTerm.trim()) {
        const searchLower = debouncedSearchTerm.trim().toLowerCase();
        filteredData = filteredData.filter((item) =>
          item.Description?.toLowerCase().includes(searchLower),
        );
      }

      filteredData.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];

        if (aVal == null) return 1;
        if (bVal == null) return -1;

        if (typeof aVal === 'boolean') {
          aVal = aVal ? 1 : 0;
          bVal = bVal ? 1 : 0;
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        } else {
          aVal = String(aVal).toLowerCase();
          bVal = String(bVal).toLowerCase();
        }

        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });

      const startIndex = pageNumber * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedData = filteredData.slice(startIndex, endIndex);

      setCatalogItems(paginatedData);
      setTotalElements(filteredData.length);
      setCurrentPage(pageNumber);
    } catch (error) {
      console.error('Error fetching products:', error);
      setCatalogItems([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(0);
    fetchCatalogItems(0);
  }, [debouncedSearchTerm, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 800);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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

  const renderSortIcon = (field) => {
    if (sortBy === field) {
      return sortOrder === 'asc' ? <FaSort /> : <FaSort />;
    }
    return <FaSort />;
  };

  const handleNavigate = () => {
    navigate('/catalog-item');
  };

  const handleEdit = (CatalogItemId) => {
    navigate(`/catalog-item/${CatalogItemId}`);
  };

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
        await CatalogItemService.deleteCatalogItem(row.CatalogItemId);
        Swal.fire('Deleted!', 'Catalog item has been deleted.', 'success');
        fetchCatalogItems(currentPage);
      }
    } catch (error) {
      console.error('Error deleting catalog item:', error);
      Swal.fire('Error!', 'There was an issue deleting the item.', 'error');
    }
  };

  const currencySymbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    JPY: '¥',
    AUD: 'A$',
    CAD: 'C$',
    IND: '₹',
  };

  const options = {
    hideSizePerPage: true,
    paginationPosition: 'bottom',
    page: currentPage + 1,
    sizePerPage: itemsPerPage,
    totalSize: totalElements,
    onPageChange: (page) => {
      const pageIndex = page - 1;
      setCurrentPage(pageIndex);
      fetchCatalogItems(pageIndex);
    },
    paginationShowsTotal: false,
    noDataText: loading ? 'Loading...' : 'No catalog items found',
  };

  const renderActionButtons = (cell, row) => (
    <div className="d-flex justify-content-center">
      <button
        type="button"
        id={`editTooltip-${row.CatalogItemId}`}
        className="btn btn-sm btn-primary me-2 action-button-edit"
        onClick={() => handleEdit(row.CatalogItemId)}
      >
        <Edit size={14} />
      </button>
      <Tooltip
        isOpen={tooltipOpenEdit === row.CatalogItemId}
        toggle={() =>
          setTooltipOpenEdit(tooltipOpenEdit === row.CatalogItemId ? null : row.CatalogItemId)
        }
        target={`editTooltip-${row.CatalogItemId}`}
      >
        Edit
      </Tooltip>
      <button
        type="button"
        id={`deleteTooltip-${row.CatalogItemId}`}
        className="btn btn-sm btn-danger action-button-delete"
        onClick={() => handleDelete(row)}
      >
        <Trash size={14} />
      </button>
      <Tooltip
        isOpen={tooltipOpenDelete === row.CatalogItemId}
        toggle={() =>
          setTooltipOpenDelete(tooltipOpenDelete === row.CatalogItemId ? null : row.CatalogItemId)
        }
        target={`deleteTooltip-${row.CatalogItemId}`}
      >
        Delete
      </Tooltip>
    </div>
  );

  return (
    <div style={{ paddingTop: '24px' }}>
      <Row>
        <Col md="12">
          <ComponentCard title="Catalog Item Management">
            <div className="d-flex justify-content-between align-items-end responsive-container mb-3">
              <div style={{ width: '300px' }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchInputChange}
                  placeholder="Search by description..."
                  className="form-control"
                />
              </div>
              <button className="btn btn-primary" type="button" onClick={handleNavigate}>
                Add New
              </button>
            </div>
            <div className="table-responsive">
              <BootstrapTable
                striped
                hover
                condensed
                data={catalogItems}
                pagination={totalElements > itemsPerPage}
                remote
                fetchInfo={{
                  dataTotalSize: totalElements,
                }}
                options={options}
                tableHeaderClass="mb-0"
              >
                <TableHeaderColumn
                  isKey
                  width="30%"
                  dataField="Description"
                  dataAlign="left"
                  headerAlign="left"
                  thStyle={{ cursor: 'pointer' }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => handleSort('Description')}
                    role="button"
                    tabIndex={0}
                  >
                    Description {renderSortIcon('Description')}
                  </div>
                </TableHeaderColumn>
                <TableHeaderColumn
                  width="20%"
                  dataField="InStock"
                  dataAlign="left"
                  headerAlign="left"
                  dataFormat={(cell) => (
                    <span className={`badge ${cell ? 'bg-success' : 'bg-danger'}`}>
                      {cell ? 'Yes' : 'No'}
                    </span>
                  )}
                  thStyle={{ cursor: 'pointer' }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => handleSort('InStock')}
                    role="button"
                    tabIndex={0}
                  >
                    In Stock {renderSortIcon('InStock')}
                  </div>
                </TableHeaderColumn>
                <TableHeaderColumn
                  width="20%"
                  dataField="QuantityPerUnit"
                  dataAlign="left"
                  headerAlign="left"
                  thStyle={{ cursor: 'pointer' }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => handleSort('QuantityPerUnit')}
                    role="button"
                    tabIndex={0}
                  >
                    Quantity {renderSortIcon('QuantityPerUnit')}
                  </div>
                </TableHeaderColumn>
                <TableHeaderColumn
                  width="20%"
                  dataField="UnitPrice"
                  dataAlign="left"
                  headerAlign="left"
                  dataFormat={(cell, row) => {
                    const symbol = currencySymbols[row.Currency] || row.Currency;
                    return `${symbol}${row.UnitPrice.toFixed(2)}`;
                  }}
                  thStyle={{ cursor: 'pointer' }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => handleSort('UnitPrice')}
                    role="button"
                    tabIndex={0}
                  >
                    Price {renderSortIcon('UnitPrice')}
                  </div>
                </TableHeaderColumn>
                <TableHeaderColumn
                  width="15%"
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

export default CatalogItemManagement;
