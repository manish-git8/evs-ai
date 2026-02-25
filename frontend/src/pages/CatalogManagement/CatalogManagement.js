import React, { useState, useEffect } from 'react';
import '../CompanyManagement/ReactBootstrapTable.scss';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import { FaSort } from 'react-icons/fa';
import { Row, Col, Tooltip } from 'reactstrap';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { Edit, Trash } from 'react-feather';
import Swal from 'sweetalert2';
import ComponentCard from '../../components/ComponentCard';
import CatalogService from '../../services/CatalogService';
import { getEntityId } from '../localStorageUtil';

const CatalogManagement = () => {
  const [catalogs, setCatalogs] = useState([]);
  const supplierId = getEntityId();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [tooltipOpenEdit, setTooltipOpenEdit] = useState(null);
  const [tooltipOpenDelete, setTooltipOpenDelete] = useState(null);
  const [pageSize, setPageSize] = useState(10);
  const [pageNumber, setPageNumber] = useState(0);
  const [totalCatalogs, setTotalCatalogs] = useState(0);
  const [sortBy, setSortBy] = useState('catalogId');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchCatalogs = async (page = pageNumber, size = pageSize, search = '') => {
    try {
      const pageDto = {
        pageSize: size,
        pageNumber: page,
        sortBy,
        order: sortOrder,
      };

      const filter = {
        catalogName: search || undefined,
      };

      const response = await CatalogService.getSupplierCatalogs(supplierId, filter, pageDto);

      const resData = response.data;
      setCatalogs(resData?.content || []);
      setTotalCatalogs(resData?.totalElements || 0);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchCatalogs(pageNumber, pageSize, debouncedSearchTerm);
  }, [debouncedSearchTerm, pageNumber, pageSize, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleTableChange = (type, { page, sizePerPage }) => {
    if (type === 'pagination') {
      const pageIndex = page - 1;
      setPageNumber(pageIndex);
      setPageSize(sizePerPage);
    }
  };

  const options = {
    hideSizePerPage: true,
    paginationPosition: 'bottom',
    page: pageNumber + 1,
    sizePerPage: pageSize,
    totalSize: totalCatalogs,
    paginationShowsTotal: false,
    onPageChange: (page) => {
      const pageIndex = page - 1;
      setPageNumber(pageIndex);
      fetchCatalogs(pageIndex, pageSize, debouncedSearchTerm);
    },
  };

  const handleDelete = async (catalogId) => {
    const confirmDelete = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Delete',
    });

    if (confirmDelete.isConfirmed) {
      CatalogService.deleteCatalog(catalogId)
        .then(() => {
          fetchCatalogs(pageNumber, pageSize, debouncedSearchTerm);
          Swal.fire('Deleted!', 'The catalog has been deleted.', 'success');
        })
        .catch((error) => {
          Swal.fire('Error!', 'There was an error deleting the catalog.', 'error');
          console.error('Error deleting catalog:', error);
        });
    }
  };

  const handleNavigate = () => {
    navigate('/catalog-registration');
  };

  const handleEdit = (catalogId) => {
    navigate(`/catalog-registration/${catalogId}`);
  };

  const actionsFormatter = (cell, row) => (
    <div className="d-flex justify-content-center">
      <button
        type="button"
        className="btn btn-sm btn-primary me-2 action-button-edit"
        id={`editTooltip-${row.catalogId}`}
        onClick={() => handleEdit(row.catalogId)}
      >
        <Edit size={14} />
      </button>
      <Tooltip
        isOpen={tooltipOpenEdit === row.catalogId}
        toggle={() => setTooltipOpenEdit(tooltipOpenEdit === row.catalogId ? null : row.catalogId)}
        target={`editTooltip-${row.catalogId}`}
      >
        Edit
      </Tooltip>

      <button
        type="button"
        className="btn btn-sm btn-danger action-button-delete"
        id={`deleteTooltip-${row.catalogId}`}
        onClick={() => handleDelete(row.catalogId)}
      >
        <Trash size={14} />
      </button>
      <Tooltip
        isOpen={tooltipOpenDelete === row.catalogId}
        toggle={() =>
          setTooltipOpenDelete(tooltipOpenDelete === row.catalogId ? null : row.catalogId)
        }
        target={`deleteTooltip-${row.catalogId}`}
      >
        Delete
      </Tooltip>
    </div>
  );

  return (
    <div style={{ paddingTop: '24px' }}>
      <Row>
        <Col md="12">
          <ComponentCard title="Catalog Management">
            <div className="d-flex justify-content-between align-items-end responsive-container">
              <div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchInputChange}
                  placeholder="Search by catalog name..."
                  className="form-control"
                />
              </div>
              <button className="btn btn-primary" type="button" onClick={handleNavigate}>
                Add New
              </button>
            </div>
            <div className="table-responsive">
              <BootstrapTable
                remote
                striped
                hover
                condensed
                data={catalogs}
                pagination={totalCatalogs > pageSize}
                options={options}
                fetchInfo={{ dataTotalSize: totalCatalogs }}
                tableHeaderClass="mb-0"
                onTableChange={handleTableChange}
              >
                <TableHeaderColumn
                  isKey
                  dataField="name"
                  dataAlign="left"
                  headerAlign="left"
                  width="30%"
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => handleSort('name')}
                  >
                    Name <FaSort />
                  </div>
                </TableHeaderColumn>

                <TableHeaderColumn
                  dataField="notes"
                  dataAlign="left"
                  headerAlign="left"
                  width="40%"
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => handleSort('notes')}
                  >
                    Notes <FaSort />
                  </div>
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataField="actions"
                  dataFormat={actionsFormatter}
                  dataAlign="center"
                  headerAlign="center"
                  width="10%"
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

export default CatalogManagement;
