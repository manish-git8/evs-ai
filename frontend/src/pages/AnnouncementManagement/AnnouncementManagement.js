import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CompanyManagement/ReactBootstrapTable.scss';
import Swal from 'sweetalert2';
import { Edit, Trash } from 'react-feather';
import { Row, Col, Tooltip, Card, CardBody } from 'reactstrap';
import { FaSort } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import AnnouncementService from '../../services/AnnouncementService';
import { getEntityId, pageSize } from '../localStorageUtil';

const AnnouncementManagement = () => {
  const navigate = useNavigate();
  const companyId = getEntityId();
  const [announcements, setAnnouncements] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('startDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [editTooltipOpen, setEditTooltipOpen] = useState(false);
  const [deleteTooltipOpen, setDeleteTooltipOpen] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      let response;

      if (searchTerm.trim() === '') {
        response = await AnnouncementService.getAllAnnouncements(
          companyId,
          {
            announcementId: '',
            companyId,
            announcementName: '',
            date: '',
          },
          {
            pageSize: 100,
            pageNumber: 0,
            sortBy,
            order: sortOrder,
          },
        );
      } else {
        response = await AnnouncementService.getAnnouncementsBySearch(
          companyId,
          searchTerm,
          {
            announcementId: '',
            companyId,
            date: '',
          },
          {
            pageSize: 100,
            pageNumber: 0,
            sortBy,
            order: sortOrder,
          },
        );
      }

      setAnnouncements(response.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      if (error.response && error.response.data && error.response.data.errorMessage) {
        toast.dismiss();
        toast.error(error.response.data.errorMessage);
      } else {
        toast.dismiss();
        toast.error('Not found');
      }
    }
  };

  // Sorting is handled by the backend via query params (`sortBy` and `order`).

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

  useEffect(() => {
    fetchAnnouncements();
  }, [debouncedSearchTerm, sortBy, sortOrder]);

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleEdit = (announcementId) => {
    navigate(`/announcement-registration/${announcementId}`);
  };

  const handleDelete = (announcementId) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Delete',
    }).then((result) => {
      if (result.isConfirmed) {
        AnnouncementService.handleDeleteAnnouncement(companyId, announcementId)
          .then(() => {
            Swal.fire('Deleted!', 'Your Announcement has been deleted.', 'success');
            fetchAnnouncements();
          })
          .catch((error) => {
            toast.dismiss();
            toast.error('Failed to delete the announcement. Please try again.');
            console.error('Error deleting announcement:', error);
          });
      }
    });
  };

  const renderActionButtons = (cell, row) => (
    <div className="d-flex justify-content-center">
      <button
        type="button"
        className="btn btn-sm btn-primary me-2 action-button-edit"
        id={`edit-${row.announcementId}`}
        onClick={() => handleEdit(row.announcementId, row.title)}
      >
        <Edit size={14} />
      </button>
      <Tooltip
        placement="top"
        isOpen={editTooltipOpen === row.announcementId}
        target={`edit-${row.announcementId}`}
        toggle={() =>
          setEditTooltipOpen((prev) => (prev === row.announcementId ? false : row.announcementId))
        }
      >
        Edit Announcement
      </Tooltip>
      <button
        type="button"
        className="btn btn-sm btn-danger action-button-delete"
        id={`delete-${row.announcementId}`}
        onClick={() => handleDelete(row.announcementId)}
      >
        <Trash size={14} />
      </button>
      <Tooltip
        placement="top"
        isOpen={deleteTooltipOpen === row.announcementId}
        target={`delete-${row.announcementId}`}
        toggle={() =>
          setDeleteTooltipOpen((prev) => (prev === row.announcementId ? false : row.announcementId))
        }
      >
        Delete Announcement
      </Tooltip>
    </div>
  );

  const handleNavigate = () => {
    navigate('/announcement-registration');
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
                      background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i className="fas fa-bullhorn text-white"></i>
                  </div>
                  <div>
                    <h4 className="mb-1">Announcement Management</h4>
                    <p className="text-muted mb-0 small">
                      Create, manage, and track organizational announcements and communications
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
            <CardBody style={{ padding: '0 24px 24px 24px' }}>
              <div className="d-flex justify-content-between align-items-end mb-3">
                <div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    placeholder="Search by title..."
                    className="form-control"
                    style={{
                      borderRadius: '8px',
                      border: '1px solid #e8ecef',
                      padding: '8px 12px',
                      minWidth: '250px',
                    }}
                  />
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
                  <i className="fas fa-plus me-2"></i>Add New
                </button>
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
                  <i className="fas fa-bullhorn" style={{ color: '#009efb', fontSize: '14px' }}></i>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#495057' }}>
                    Total Announcements:{' '}
                    <span style={{ color: '#009efb' }}>{announcements.length}</span>
                  </span>
                </div>
              </div>

              <div className="table-responsive">
                <BootstrapTable
                  data={announcements}
                  striped
                  hover
                  condensed
                  pagination={announcements.length > pageSize}
                  options={options}
                  tableHeaderClass="mb-0"
                  tableStyle={{ width: '100%', tableLayout: 'fixed' }}
                >
                  <TableHeaderColumn
                    width="18%"
                    isKey
                    dataField="title"
                    dataAlign="left"
                    headerAlign="left"
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word', cursor: 'pointer' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleSort('title')}
                    >
                      Title {renderSortIcon('title')}
                    </div>
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    width="30%"
                    dataField="body"
                    dataAlign="left"
                    headerAlign="left"
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    dataFormat={(cell) => (
                      <span
                        title={cell}
                        style={{
                          display: 'block',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cell && cell.length > 50 ? `${cell.substring(0, 50)}...` : cell}
                      </span>
                    )}
                  >
                    Body
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    width="12%"
                    dataField="startDate"
                    dataAlign="left"
                    headerAlign="left"
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word', cursor: 'pointer' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    dataFormat={(cell) => (
                      <span className="date-value">
                        {cell ? new Date(cell).toLocaleDateString() : '-'}
                      </span>
                    )}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleSort('startDate')}
                    >
                      Start Date {renderSortIcon('startDate')}
                    </div>
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    width="12%"
                    dataField="endDate"
                    dataAlign="left"
                    headerAlign="left"
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word', cursor: 'pointer' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    dataFormat={(cell) => (
                      <span className="date-value">
                        {cell ? new Date(cell).toLocaleDateString() : '-'}
                      </span>
                    )}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleSort('endDate')}
                    >
                      End Date {renderSortIcon('endDate')}
                    </div>
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    width="12%"
                    dataField="createdBy"
                    dataAlign="left"
                    headerAlign="left"
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word', cursor: 'pointer' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    dataFormat={(cell) =>
                      cell ? `${cell.firstName || ''} ${cell.lastName || ''}`.trim() : '-'
                    }
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleSort('createdBy')}
                    >
                      Created By {renderSortIcon('createdBy')}
                    </div>
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    width="8%"
                    dataField="status"
                    dataAlign="center"
                    headerAlign="center"
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word', cursor: 'pointer' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    dataFormat={(cell) => (
                      <span
                        className={`badge ${
                          cell === 'ACTIVE'
                            ? 'bg-success'
                            : cell === 'INACTIVE'
                            ? 'bg-secondary'
                            : 'bg-info'
                        }`}
                      >
                        {cell || 'N/A'}
                      </span>
                    )}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => handleSort('status')}
                    >
                      Status {renderSortIcon('status')}
                    </div>
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    width="8%"
                    dataField="announcementType"
                    dataAlign="center"
                    headerAlign="center"
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    dataFormat={(cell) => (
                      <span
                        className={`badge ${
                          cell?.toLowerCase().includes('urgent')
                            ? 'bg-danger'
                            : cell?.toLowerCase().includes('important')
                            ? 'bg-warning'
                            : cell?.toLowerCase().includes('general')
                            ? 'bg-info'
                            : 'bg-secondary'
                        }`}
                      >
                        {cell || 'N/A'}
                      </span>
                    )}
                  >
                    Type
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    width="8%"
                    dataField="isReadReceiptRequired"
                    dataAlign="center"
                    headerAlign="center"
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    dataFormat={(cell) => (
                      <span className={`badge ${cell ? 'bg-success' : 'bg-secondary'}`}>
                        {cell ? 'Yes' : 'No'}
                      </span>
                    )}
                  >
                    Receipt
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    width="10%"
                    dataFormat={renderActionButtons}
                    dataAlign="center"
                    headerAlign="center"
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                  >
                    Actions
                  </TableHeaderColumn>
                </BootstrapTable>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AnnouncementManagement;
