import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash } from 'react-feather';
import { Row, Col, Label } from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import Swal from 'sweetalert2';
import UserService from '../../services/UserService';
import FileUploadService from '../../services/FileUploadService';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { FaSort } from 'react-icons/fa';
import CompanyService from '../../services/CompanyService';
import { getUserRole, getEntityId, formatDate } from '../localStorageUtil';

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [profileImages, setProfileImages] = useState({});
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
    return localStorage.getItem('lastSelectedCompanyId') || null;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortField, setSortField] = useState('createdDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const userRoles = getUserRole() || [];
  const isAdmin = userRoles.includes('ADMIN');
  const isCompanyManager = userRoles.includes('COMPANY_ADMIN');
  const companyIdForManager = getEntityId();

  const onSortChange = (sortName, sortOrder) => {
    setSortField(sortName);
    setSortOrder(sortOrder);
    setPageNumber(0);
  };

  const fetchUsers = async (companyId) => {
    try {
      let response;

      const pageDto = {
        pageSize: pageSize,
        pageNumber: pageNumber,
        sortBy: sortField || 'createdDate',
        order: sortOrder.toUpperCase(),
      };

      const effectiveCompanyId = companyId || selectedCompanyId || companyIdForManager;

      if (debouncedSearchTerm.trim() === '') {
        if (isAdmin) {
          response = await UserService.fetchAllUsers(effectiveCompanyId, pageDto);
        } else if (isCompanyManager) {
          response = await UserService.fetchAllCompanyUsers(companyIdForManager, pageDto);
        }
      } else {
        response = await UserService.getUsersBySearch(
          debouncedSearchTerm,
          effectiveCompanyId,
          pageDto,
        );
      }

      const data = response.data || {};
      const content = data.content ?? data;
      setUsers(Array.isArray(content) ? content : []);
      setTotalPages(data.totalPages ?? 1);
      setTotalElements(data.totalElements ?? (Array.isArray(content) ? content.length : 0));
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      setTotalPages(1);
      setTotalElements(0);
      if (error.response && error.response.data && error.response.data.errorMessage) {
        toast.dismiss();
        toast.error(error.response.data.errorMessage);
      } else {
        toast.dismiss();
        toast.error('Not found');
      }
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchCompanies();
    } else if (isCompanyManager) {
      setSelectedCompanyId(companyIdForManager);
      fetchUsers(companyIdForManager);
    }
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await CompanyService.getAllCompanies();
      const data = response.data?.content ?? response.data ?? [];

      setCompanies(Array.isArray(data) ? data : []);

      if (!selectedCompanyId && data?.length > 0) {
        const firstCompanyId = data[0].companyId;
        setSelectedCompanyId(firstCompanyId);
        localStorage.setItem('lastSelectedCompanyId', firstCompanyId);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to load companies');
    }
  };

  useEffect(() => {
    if (selectedCompanyId) {
      fetchUsers(selectedCompanyId);
    }
  }, [selectedCompanyId, debouncedSearchTerm, sortField, sortOrder, pageNumber, pageSize]);

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPageNumber(0);
  }, [debouncedSearchTerm]);

  // Fetch profile images for users who have profileImageId
  useEffect(() => {
    const fetchProfileImages = async () => {
      const usersWithImages = users.filter(
        (user) => user.profileImageId && !profileImages[user.userId]
      );

      for (const user of usersWithImages) {
        try {
          const response = await FileUploadService.getFileByFileId(user.profileImageId, { silent: true });
          const reader = new FileReader();
          reader.onloadend = () => {
            setProfileImages((prev) => ({
              ...prev,
              [user.userId]: reader.result,
            }));
          };
          reader.readAsDataURL(response.data);
        } catch (error) {
          // Silently log - don't show toast for profile image fetch failures
          console.warn(`Could not fetch profile image for user ${user.userId}`);
        }
      }
    };

    if (users.length > 0) {
      fetchProfileImages();
    }
  }, [users]);

  const handleCompanyChange = (event) => {
    const newCompanyId = event.target.value;
    setSelectedCompanyId(newCompanyId);
    localStorage.setItem('lastSelectedCompanyId', newCompanyId);
    setPageNumber(0);
  };

  const handleNavigate = () => {
    navigate(`/user-registration/${selectedCompanyId}`);
  };

  const handleEdit = (row) => {
    navigate(`/user-registration/${row.userId}/${selectedCompanyId}/${row.entityType}`);
  };

  const handleRowClick = (row) => {
    navigate(`/user-details/${row.userId}/${selectedCompanyId}/${row.entityType}`);
  };

  const options = {
    paginationShowsTotal: false,
    hideSizePerPage: true,
    sizePerPage: pageSize,
    page: pageNumber + 1,
    onPageChange: (page, sizePerPage) => {
      setPageNumber(page - 1);
    },
    paginationPosition: 'bottom',
    onRowClick: handleRowClick,
    onSortChange: onSortChange,
  };

  const rowStyle = {
    cursor: 'pointer',
  };

  const handleDelete = async (row) => {
    const confirmDelete = await Swal.fire({
      title: 'Are you sure?',
      text: `You want to delete ${row.firstName} ${row.lastName}!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Delete',
    });

    if (confirmDelete.isConfirmed) {
      try {
        await UserService.deleteUserById(selectedCompanyId, row.userId, row.entityType);
        fetchUsers(selectedCompanyId);
        Swal.fire('Deleted!', 'The user has been deleted.', 'success');
      } catch (error) {
        if (error.response && error.response.data && error.response.data.errorMessage) {
          toast.dismiss();
          toast.error(error.response.data.errorMessage);
        } else {
          toast.dismiss();
          toast.error('An unexpected error occurred');
        }
      }
    }
  };

  const renderActionButtons = (cell, row) => (
    <div className="d-flex justify-content-center">
      <button
        type="button"
        className="btn btn-sm btn-primary me-2 action-button-edit"
        onClick={(e) => {
          e.stopPropagation();
          handleEdit(row);
        }}
      >
        <Edit size={14} />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-danger action-button-delete"
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(row);
        }}
      >
        <Trash size={14} />
      </button>
    </div>
  );

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setPageNumber(newPage);
    }
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    let startPage = Math.max(0, pageNumber - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(0, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <li key={i} className={`page-item ${i === pageNumber ? 'active' : ''}`}>
          <button className="page-link" onClick={() => handlePageChange(i)}>
            {i + 1}
          </button>
        </li>,
      );
    }

    return buttons;
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
        <Col md="12" style={{ marginBottom: -25 }}>
          <div
            className="enhanced-card"
            style={{
              borderRadius: '15px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: 'none',
              background: 'white',
              padding: '0',
            }}
          >
            <div style={{ padding: '24px 24px 0 24px' }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="icon-wrapper"
                    style={{
                      width: '40px',
                      height: '40px',
                      background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i className="fas fa-users text-white"></i>
                  </div>
                  <div>
                    <h4 className="mb-1">User Management</h4>
                    <p className="text-muted mb-0 small">
                      Manage user accounts, roles, and permissions across different user types
                    </p>
                  </div>
                </div>
                <button
                  className="btn btn-gradient-primary px-4 py-2"
                  type="button"
                  onClick={handleNavigate}
                  style={{
                    background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                    transition: 'transform 0.2s ease',
                    color: 'white',
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0px)';
                  }}
                  onFocus={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onBlur={(e) => {
                    e.target.style.transform = 'translateY(0px)';
                  }}
                >
                  <i className="fas fa-plus me-2"></i>Add New User
                </button>
              </div>
              <div className="d-flex justify-content-between align-items-end mb-3">
                <div className="d-flex align-items-center gap-3">
                  <div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={handleSearchInputChange}
                      placeholder="Search by name or email..."
                      className="form-control"
                      style={{
                        borderRadius: '8px',
                        border: '1px solid #e8ecef',
                        padding: '8px 12px',
                        minWidth: '250px',
                      }}
                    />
                  </div>
                  {isAdmin && (
                    <div className="d-flex align-items-center gap-2">
                      <Label
                        className="mb-0 text-muted"
                        style={{ fontSize: '14px', fontWeight: '500' }}
                      >
                        Company:
                      </Label>
                      <select
                        className="form-control"
                        value={selectedCompanyId || ''}
                        onChange={handleCompanyChange}
                        style={{
                          borderRadius: '8px',
                          border: '1px solid #e8ecef',
                          padding: '8px 12px',
                          minWidth: '200px',
                        }}
                      >
                        {companies.map((company) => (
                          <option key={company.companyId} value={company.companyId}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div
                className="d-flex align-items-center mb-3 px-3 py-2"
                style={{
                  background: 'linear-gradient(135deg, #f8f9fc 0%, #e9ecf1 100%)',
                  borderRadius: '8px',
                  border: '1px solid #e8ecef',
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <i className="fas fa-users" style={{ color: '#009efb', fontSize: '14px' }}></i>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#495057' }}>
                    Total Users: <span style={{ color: '#009efb' }}>{totalElements}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="tab-content" style={{ padding: '0 24px 24px 24px' }}>
              <div className="tab-pane fade show active">
                <div className="table-responsive">
                  <BootstrapTable
                    striped
                    hover
                    condensed
                    data={users}
                    pagination={false}
                    options={options}
                    tableHeaderClass="mb-0"
                    tableStyle={{ width: '100%', tableLayout: 'fixed' }}
                    trStyle={rowStyle}
                  >
                    <TableHeaderColumn
                      isKey
                      width="20%"
                      dataField="firstName"
                      dataAlign="left"
                      headerAlign="left"
                      dataSort
                      dataFormat={(cell, row) => (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {profileImages[row.userId] ? (
                            <img
                              src={profileImages[row.userId]}
                              alt=""
                              style={{
                                width: '32px',
                                height: '32px',
                                minWidth: '32px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                marginRight: '10px',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                minWidth: '32px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '10px',
                              }}
                            >
                              <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
                                {row.firstName?.charAt(0) || ''}{row.lastName?.charAt(0) || ''}
                              </span>
                            </div>
                          )}
                          <span style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row.title ? `${row.title} ` : ''}{row.firstName || ''} {row.lastName || ''}
                          </span>
                        </div>
                      )}
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', overflow: 'visible', maxWidth: 'none' }}
                    >
                      Name <FaSort />
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      width="18%"
                      dataField="email"
                      dataAlign="left"
                      headerAlign="left"
                      dataSort
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Email <FaSort />
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      width="12%"
                      dataField="mobile"
                      dataAlign="left"
                      headerAlign="left"
                      dataSort
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Phone <FaSort />
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      width="12%"
                      dataField="createdDate"
                      dataAlign="left"
                      headerAlign="left"
                      dataSort
                      dataFormat={(cell) => <span className="date-value">{formatDate(cell)}</span>}
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Created Date <FaSort />
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      width="10%"
                      dataField="userContactType"
                      dataAlign="center"
                      headerAlign="center"
                      dataSort
                      dataFormat={(cell) => (
                        <span
                          className={`badge ${
                            cell?.toLowerCase().includes('buyer')
                              ? 'bg-success'
                              : cell?.toLowerCase().includes('supplier')
                              ? 'bg-warning'
                              : cell?.toLowerCase().includes('admin')
                              ? 'bg-danger'
                              : cell?.toLowerCase().includes('manager')
                              ? 'bg-primary'
                              : 'bg-secondary'
                          }`}
                        >
                          {cell || 'N/A'}
                        </span>
                      )}
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      User Type <FaSort />
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      width="14%"
                      dataField="role"
                      dataAlign="left"
                      headerAlign="left"
                      dataFormat={(cell) => {
                        if (!cell || cell.length === 0)
                          return <span className="text-muted">No roles</span>;
                        return (
                          <div className="d-flex flex-wrap gap-1" style={{ minHeight: '24px' }}>
                            {cell.map((roleObj, idx) => (
                              <span
                                key={roleObj.roleId || roleObj.id || roleObj.name || idx}
                                className="badge bg-info text-white"
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.25rem 0.5rem',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {roleObj.name}
                              </span>
                            ))}
                          </div>
                        );
                      }}
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{
                        whiteSpace: 'normal',
                        wordWrap: 'break-word',
                        overflow: 'visible',
                      }}
                    >
                      Roles
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      width="10%"
                      dataFormat={renderActionButtons}
                      dataAlign="center"
                      headerAlign="center"
                      dataSort={false}
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Actions
                    </TableHeaderColumn>
                  </BootstrapTable>
                </div>
                {users.length > 0 && totalPages > 0 && (
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <small className="text-muted ms-2">
                      Showing {pageNumber * pageSize + 1} to{' '}
                      {Math.min((pageNumber + 1) * pageSize, totalElements)} of {totalElements}{' '}
                      Users
                    </small>

                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${pageNumber === 0 ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(0)}
                          disabled={pageNumber === 0}
                        >
                          &laquo;
                        </button>
                      </li>

                      <li className={`page-item ${pageNumber === 0 ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(pageNumber - 1)}
                          disabled={pageNumber === 0}
                        >
                          &lt;
                        </button>
                      </li>

                      {renderPaginationButtons()}

                      <li
                        className={`page-item ${pageNumber === totalPages - 1 ? 'disabled' : ''}`}
                      >
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(pageNumber + 1)}
                          disabled={pageNumber === totalPages - 1}
                        >
                          &gt;
                        </button>
                      </li>
                      <li
                        className={`page-item ${pageNumber === totalPages - 1 ? 'disabled' : ''}`}
                      >
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(totalPages - 1)}
                          disabled={pageNumber === totalPages - 1}
                        >
                          &raquo;
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default UserManagement;
