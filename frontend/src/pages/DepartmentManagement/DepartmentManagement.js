import React, { useState, useEffect } from 'react';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash } from 'react-feather';
import Swal from 'sweetalert2';
import { FaSort } from 'react-icons/fa';
import { Row, Col } from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import ComponentCard from '../../components/ComponentCard';
import DepartmentService from '../../services/DepartmentService';
import { getEntityId, pageSize } from '../localStorageUtil';

const DepartmentManagement = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const companyId = getEntityId();
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchDepartments = async () => {
    try {
      let response;
      const pageDto = {
        sortBy,
        order: sortOrder,
      };

      if (debouncedSearchTerm.trim() === '') {
        response = await DepartmentService.getAllDepartment(companyId, {}, pageDto);
      } else {
        response = await DepartmentService.getAllDepartment(
          companyId,
          { search: debouncedSearchTerm },
          pageDto,
        );
      }

      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to fetch departments');
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [debouncedSearchTerm, sortBy, sortOrder]);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleDeleteDepartment = async (departmentId) => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Delete',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await DepartmentService.handleDeleteDepartment(companyId, departmentId);
          Swal.fire('Deleted!', 'The department has been deleted.', 'success');
          fetchDepartments();
        } catch (error) {
          console.error('Error deleting department:', error);
          toast.dismiss();
          toast.error('Failed to delete department');
        }
      }
    });
  };

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleNavigate = () => {
    navigate('/department-registration');
  };

  const handleEdit = (departmentId) => {
    navigate(`/department-registration/${departmentId}`);
  };

  const renderActionButtons = (cell, row) => (
    <div className="d-flex justify-content-center">
      <button
        id={`edit-tooltip-${row.departmentId}`}
        type="button"
        className="btn btn-sm btn-primary me-2 action-button-edit"
        onClick={() => handleEdit(row.departmentId)}
      >
        <Edit size={14} />
      </button>
      <button
        id={`delete-tooltip-${row.departmentId}`}
        type="button"
        className="btn btn-sm btn-danger action-button-delete"
        onClick={() => handleDeleteDepartment(row.departmentId)}
      >
        <Trash size={14} />
      </button>
    </div>
  );

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
                  <i className="fas fa-building text-white"></i>
                </div>
                <div>
                  <h4 className="mb-1">Department Management</h4>
                  <p className="text-muted mb-0 small">
                    Manage and organize your company departments
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
                <div className="search-wrapper" style={{ minWidth: '300px' }}>
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
                      placeholder="Search by department name..."
                      className="form-control"
                      style={{
                        paddingLeft: '40px',
                        borderRadius: '6px',
                        border: '1px solid #dee2e6',
                      }}
                    />
                  </div>
                </div>
                <div className="stats-info d-flex align-items-center gap-2">
                  <i className="fas fa-list-ul" style={{ color: '#009efb', fontSize: '14px' }}></i>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#495057' }}>
                    Total Departments:{' '}
                    <span style={{ color: '#009efb' }}>{departments.length}</span>
                  </span>
                </div>
              </div>
              <button
                className="btn btn-primary px-4 py-2"
                type="button"
                onClick={handleNavigate}
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
                <i className="fas fa-plus me-2"></i>Add New Department
              </button>
            </div>
            <div className="table-responsive">
              <BootstrapTable
                data={departments}
                striped
                hover
                condensed
                pagination={departments.length > pageSize}
                options={options}
                tableHeaderClass="mb-0"
              >
                <TableHeaderColumn
                  width="30%"
                  isKey
                  dataField="name"
                  dataAlign="left"
                  headerAlign="left"
                  thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word', cursor: 'pointer' }}
                  tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', userSelect: 'none' }}
                    onClick={() => handleSort('name')}
                  >
                    Name {renderSortIcon('name')}
                  </div>
                </TableHeaderColumn>
                <TableHeaderColumn
                  width="30%"
                  dataField="description"
                  dataAlign="left"
                  headerAlign="left"
                  thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word', cursor: 'pointer' }}
                  tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', userSelect: 'none' }}
                    onClick={() => handleSort('description')}
                  >
                    Description {renderSortIcon('description')}
                  </div>
                </TableHeaderColumn>
                <TableHeaderColumn
                  width="15%"
                  dataField="notes"
                  dataAlign="left"
                  headerAlign="left"
                  thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word', cursor: 'pointer' }}
                  tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                  dataFormat={(cell) => cell}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', userSelect: 'none' }}
                    onClick={() => handleSort('notes')}
                  >
                    Notes {renderSortIcon('notes')}
                  </div>
                </TableHeaderColumn>
                <TableHeaderColumn
                  width="15%"
                  dataField="isActive"
                  dataAlign="left"
                  headerAlign="left"
                  thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word', cursor: 'pointer' }}
                  tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                  dataFormat={(cell) => (cell ? 'Active' : 'Inactive')}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', userSelect: 'none' }}
                    onClick={() => handleSort('isActive')}
                  >
                    Status {renderSortIcon('isActive')}
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

export default DepartmentManagement;
