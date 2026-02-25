import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash } from 'react-feather';
import Swal from 'sweetalert2';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { Row, Col, Tooltip, Card, CardBody } from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import TemplateService from '../../services/TemplateService';
import { getEntityId, pageSize } from '../localStorageUtil';

const EmailProviderManagement = () => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const companyId = getEntityId();
  const [searchTerm, setSearchTerm] = useState('');
  const [tooltipEditOpen, setTooltipEditOpen] = useState(false);
  const [tooltipDeleteOpen, setTooltipDeleteOpen] = useState(false);

  const fetchProviders = async () => {
    try {
      const response = await TemplateService.getAllEmailProviders(companyId);
      setProviders(response.data);
    } catch (error) {
      console.error('Error fetching email providers:', error);
      toast.error('Failed to fetch email providers');
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleEdit = (emailProviderId) => {
    navigate(`/email-provider/${emailProviderId}`);
  };

  const handleDelete = async (emailProviderId) => {
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
          await TemplateService.deleteEmailProvider(companyId, emailProviderId);
          Swal.fire('Deleted!', 'The email provider has been deleted.', 'success');
          fetchProviders();
        } catch (error) {
          console.error('Error deleting email provider:', error);
          toast.error('Failed to delete email provider');
        }
      }
    });
  };

  const renderActionButtons = (cell, row) => (
    <div className="d-flex justify-content-center">
      <button
        id={`edit-tooltip-${row.id}`}
        type="button"
        className="btn btn-sm btn-primary me-2 action-button-edit"
        onClick={() => handleEdit(row.id)}
      >
        <Edit size={14} />
      </button>
      <Tooltip
        isOpen={tooltipEditOpen === row.id}
        target={`edit-tooltip-${row.id}`}
        toggle={() => setTooltipEditOpen((prev) => (prev === row.id ? false : row.id))}
      >
        Edit Provider
      </Tooltip>
      <button
        id={`delete-tooltip-${row.id}`}
        type="button"
        className="btn btn-sm btn-danger action-button-delete"
        onClick={() => handleDelete(row.id)}
      >
        <Trash size={14} />
      </button>
      <Tooltip
        isOpen={tooltipDeleteOpen === row.id}
        target={`delete-tooltip-${row.id}`}
        toggle={() => setTooltipDeleteOpen((prev) => (prev === row.id ? false : row.id))}
      >
        Delete Provider
      </Tooltip>
    </div>
  );

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleNavigate = () => {
    navigate('/email-provider');
  };

  const options = {
    paginationShowsTotal: false,
    hideSizePerPage: true,
    paginationPosition: 'bottom',
  };

  return (
    <div style={{ paddingTop: '20px' }}>
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
      
      {/* Enhanced Header Section */}
      <Row className="mb-4">
        <Col lg="12">
          <Card className="welcome-card" style={{
            backgroundColor: '#009efb',
            color: 'white',
            border: 'none',
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0, 158, 251, 0.15)'
          }}>
            <CardBody className="py-4">
              <Row className="align-items-center">
                <Col md="8">
                  <h3 className="mb-2 fw-bold">
                    <i className="bi bi-gear me-2"></i>
                    Email Provider Management
                  </h3>
                  <p className="mb-0 opacity-90">
                    Configure and manage your SMTP email providers for reliable email delivery across your system
                  </p>
                </Col>
                <Col md="4" className="text-end d-none d-md-block">
                  <div className="welcome-stats">
                    <div className="text-center">
                      <div className="h2 mb-1 fw-bold text-white">{providers.length}</div>
                      <small className="text-white opacity-75">Active Providers</small>
                    </div>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md="12">
          <Card className="enhanced-card" style={{
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: 'none'
          }}>
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div className="icon-wrapper" style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#009efb',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid rgba(0, 158, 251, 0.1)'
                  }}>
                    <i className="bi bi-list text-white"></i>
                  </div>
                  <div>
                    <h4 className="mb-1">Provider Directory</h4>
                    <p className="text-muted mb-0 small">Manage your SMTP configurations and settings</p>
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
                    fontWeight: '500'
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
                  <i className="bi bi-plus-lg me-2"></i>Add New Provider
                </button>
              </div>

              {/* Search Section */}
              <Row className="mb-4">
                <Col lg="6">
                  <Card className="search-card" style={{
                    borderRadius: '12px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    border: '1px solid #e9ecef'
                  }}>
                    <CardBody className="py-3">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchInputChange}
                        placeholder="Search by host name..."
                        className="form-control"
                        style={{
                          border: '2px solid #e9ecef',
                          borderRadius: '8px',
                          padding: '12px 16px',
                          fontSize: '14px'
                        }}
                      />
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              <div className="table-responsive">
                <BootstrapTable
                  data={providers}
                  striped
                  hover
                  condensed
                  pagination={providers.length > pageSize}
                  options={options}
                  tableHeaderClass="mb-0"
                  tableStyle={{ borderRadius: '8px', overflow: 'hidden' }}
                >
                  <TableHeaderColumn
                    width="25%"
                    isKey
                    dataField="host"
                    dataAlign="left"
                    headerAlign="left"
                    dataFormat={(cell) => (
                      <div className="d-flex align-items-center">
                        <div className="icon-wrapper me-2" style={{
                          width: '32px',
                          height: '32px',
                          backgroundColor: 'rgba(0, 158, 251, 0.1)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <i className="bi bi-hdd-network text-primary" style={{ fontSize: '14px' }}></i>
                        </div>
                        <div>
                          <div className="fw-medium text-dark">{cell}</div>
                          <small className="text-muted">SMTP Host</small>
                        </div>
                      </div>
                    )}
                  >
                    <i className="bi bi-hdd-network me-1"></i>Host
                  </TableHeaderColumn>
                  <TableHeaderColumn 
                    width="15%" 
                    dataField="port" 
                    dataAlign="left" 
                    headerAlign="left"
                    dataFormat={(cell) => (
                      <span className="badge bg-secondary text-white" style={{ fontSize: '12px' }}>
                        {cell}
                      </span>
                    )}
                  >
                    <i className="bi bi-outlet me-1"></i>Port
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    width="15%"
                    dataField="userName"
                    dataAlign="left"
                    headerAlign="left"
                    dataFormat={(cell) => (
                      <div className="text-truncate" style={{ maxWidth: '120px' }}>
                        <i className="bi bi-person me-1 text-muted"></i>
                        {cell}
                      </div>
                    )}
                  >
                    <i className="bi bi-person me-1"></i>Username
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    width="15%"
                    dataField="encryptionType"
                    dataAlign="left"
                    headerAlign="left"
                    dataFormat={(cell) => (
                      <span className={`badge ${
                        cell === 'TLS' ? 'bg-success' : 
                        cell === 'SSL' ? 'bg-primary' : 
                        cell === 'STARTTLS' ? 'bg-info' : 'bg-secondary'
                      }`} style={{ fontSize: '11px' }}>
                        <i className="bi bi-shield-lock me-1"></i>
                        {cell}
                      </span>
                    )}
                  >
                    <i className="bi bi-shield-lock me-1"></i>Encryption
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    width="10%"
                    dataField="priority"
                    dataAlign="left"
                    headerAlign="left"
                    dataFormat={(cell) => (
                      <span className={`badge ${
                        cell === 1 ? 'bg-danger' : 
                        cell <= 3 ? 'bg-warning' : 
                        'bg-secondary'
                      }`} style={{ fontSize: '11px' }}>
                        {cell}
                      </span>
                    )}
                  >
                    <i className="bi bi-sort-numeric-up me-1"></i>Priority
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    width="10%"
                    dataField="isActive"
                    dataAlign="left"
                    headerAlign="left"
                    dataFormat={(cell) => (
                      <span className={`badge d-inline-flex align-items-center gap-1 ${
                        cell ? 'bg-success' : 'bg-danger'
                      }`} style={{ fontSize: '11px' }}>
                        <i className={`bi ${cell ? 'bi-check-circle' : 'bi-x-circle'}`}></i>
                        {cell ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  >
                    <i className="bi bi-toggle-on me-1"></i>Status
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    width="10%"
                    dataFormat={renderActionButtons}
                    dataAlign="center"
                    headerAlign="center"
                  >
                    <i className="bi bi-gear me-1"></i>Actions
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

export default EmailProviderManagement;
