import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { Row, Col, Tooltip, Card, CardBody } from 'reactstrap';
import { Edit, Trash } from 'react-feather';
import Swal from 'sweetalert2';
import '../CompanyManagement/ReactBootstrapTable.scss';
import SpendingLimitService from '../../services/SpendingLimitService';
import UserService from '../../services/UserService';
import { formatDate, getEntityId, pageSize } from '../localStorageUtil';

const SpendingLimit = () => {
  const navigate = useNavigate();
  const [spendingLimits, setSpendingLimits] = useState([]);
  const [users, setUsers] = useState([]); 
  const companyId = getEntityId();
    const [tooltipEditOpen, setTooltipEditOpen] = useState(false);
    const [tooltipDeleteOpen, setTooltipDeleteOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const spendingLimitsResponse = await SpendingLimitService.getAllSpendingLimits(companyId);
        setSpendingLimits(spendingLimitsResponse.data);

        const usersResponse = await UserService.fetchAllUsers(companyId);
        if (Array.isArray(usersResponse.data.content)) {
          setUsers(usersResponse.data.content);
        } else {
          setUsers([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setUsers([]); 
      }
    };

    fetchData();
  }, [companyId]);

  const getUserName = (userId) => {
    if (!Array.isArray(users) || !userId) return '';
    const user = users.find((u) => u.userId === userId);
    return  user ? [user.firstName, user.lastName, `(${user.email})`]
    .filter(Boolean).join(' ') : 'Unknown User';
  };

  const handleEdit = (spendingLimitId) => {
    navigate(`/spendinglimitregistration/${spendingLimitId}`);
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
        await SpendingLimitService.deleteSpendingLimit(row.spendingLimitId);
        Swal.fire('Deleted!', 'Spending limit has been deleted.', 'success');

        setSpendingLimits((prevLimits) =>
          prevLimits.filter((limit) => limit.spendingLimitId !== row.spendingLimitId),
        );
      }
    } catch (error) {
      console.error('Error deleting spending limit:', error);
      Swal.fire('Error!', 'There was an issue deleting the spending limit.', 'error');
    }
  };

  const options = {
    paginationShowsTotal: false,
    hideSizePerPage: true,
    paginationPosition: 'bottom',
  };

  const handleNavigate = () => {
    navigate('/spendinglimitregistration');
  };

  const renderActionButtons = (cell, row) => (
    <div className="d-flex justify-content-center">
      <button
        id={`edit-tooltip-${row.spendingLimitId}`}
        type="button"
        className="btn btn-sm btn-primary me-2 action-button-edit"
        onClick={() => handleEdit(row.spendingLimitId)}
      >
        <Edit size={14} />
      </button>
      <Tooltip
        isOpen={tooltipEditOpen === row.spendingLimitId}
        target={`edit-tooltip-${row.spendingLimitId}`}
        toggle={() =>
          setTooltipEditOpen((prev) => (prev === row.spendingLimitId ? false : row.spendingLimitId))
        }
      >
        Edit Spending Limit
      </Tooltip>
  
      {/* Delete Button */}
      <button
        id={`delete-tooltip-${row.spendingLimitId}`}
        type="button"
        className="btn btn-sm btn-danger action-button-delete"
        onClick={() => handleDelete(row)}
      >
        <Trash size={14} />
      </button>
      <Tooltip
        isOpen={tooltipDeleteOpen === row.spendingLimitId}
        target={`delete-tooltip-${row.spendingLimitId}`}
        toggle={() =>
          setTooltipDeleteOpen((prev) => (prev === row.spendingLimitId ? false : row.spendingLimitId))
        }
      >
        Delete Spending Limit
      </Tooltip>
    </div>
  );
  

  return (
    <div style={{ paddingTop: '24px' }}>
      <Row>
        <Col md="12">
          <Card className="enhanced-card" style={{
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: 'none'
          }}>
            <CardBody style={{ padding: '24px 24px 0 24px' }}>
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
                    <i className="fas fa-dollar-sign text-white"></i>
                  </div>
                  <div>
                    <h4 className="mb-1">Spending Limit Management</h4>
                    <p className="text-muted mb-0 small">Manage and control user spending limits and budgets</p>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="stats-info d-flex align-items-center gap-2">
                    <i className="fas fa-list-ul" style={{ color: '#009efb', fontSize: '14px' }}></i>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#495057' }}>
                      Total: <span style={{ color: '#009efb' }}>{spendingLimits.length}</span>
                    </span>
                  </div>
                  <button className="btn btn-primary px-4 py-2" type="button" onClick={handleNavigate} style={{
                    backgroundColor: '#009efb',
                    border: '1px solid #009efb',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0, 158, 251, 0.2)',
                    transition: 'all 0.2s ease',
                    color: 'white'
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
                    <i className="fas fa-plus me-2"></i>Add New
                  </button>
                </div>
              </div>
            </CardBody>
            <CardBody style={{ padding: '0 24px 24px 24px' }}>

            <div className="table-responsive">
              <BootstrapTable
                striped
                hover
                condensed
                options={options}
                pagination={spendingLimits.length > pageSize}
                tableHeaderClass="mb-0"
                data={spendingLimits}
              >
                <TableHeaderColumn
                  isKey
                  dataField="userId"
                  dataAlign="left"
                  headerAlign="left"
                  width="30%"
                  dataFormat={getUserName}
                >
                  User Name
                </TableHeaderColumn>

                <TableHeaderColumn
                  dataField="spendingLimit"
                  dataAlign="left"
                  headerAlign="left"
                  width="18%"
                >
                  Spending Limit
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataField="approvalLimit"
                  dataAlign="left"
                  headerAlign="left"
                  width="18%"
                >
                  Approval Limit
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataField="periodStartDate"
                  dataAlign="left"
                  headerAlign="left"
                  width="18%"
                  dataFormat={formatDate}
                >
                  Start Date
                </TableHeaderColumn>
                <TableHeaderColumn
                  dataField="periodEndDate"
                  dataAlign="left"
                  headerAlign="left"
                  width="18%"
                  dataFormat={formatDate}
                >
                  End Date
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
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SpendingLimit;