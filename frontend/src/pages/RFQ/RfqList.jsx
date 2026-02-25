import { useEffect, useState } from 'react';
import { Row, Col, Tooltip, Button, Badge } from 'reactstrap';
import { useNavigate } from 'react-router-dom';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { Edit, Eye } from 'react-feather';
import '../CompanyManagement/ReactBootstrapTable.scss';
import RqfService from '../../services/RfqService';
import { formatDate, getEntityId } from '../localStorageUtil';
import SupplierService from '../../services/SupplierService';

const RFQList = () => {
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tooltipOpenEdit, setTooltipOpenEdit] = useState(null);
  const [supplierDetailsMap, setSupplierDetailsMap] = useState({});
  const [tooltipOpenObjective, setTooltipOpenObjective] = useState(null);
  const companyId = getEntityId();
  const options = {
    paginationShowsTotal: false,
    hideSizePerPage: true,
    paginationPosition: 'bottom',
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchRfqsAndSuppliers = async () => {
    try {
      let response;
      if (searchTerm.trim() === '') {
        response = await RqfService.getRfq(companyId);
      } else {
        response = await RqfService.getRfqBySupplierSearch(companyId, searchTerm);
      }

      // Handle paginated response - data can be in .content or directly in .data
      const rfqList = response.data?.content || response.data || [];

      const allSupplierIds = new Set();
      rfqList.forEach((rfq) =>
        rfq.suppliers?.forEach((s) => {
          if (s.supplierId) allSupplierIds.add(s.supplierId);
        }),
      );

      const supplierMap = {};

      await Promise.all(
        Array.from(allSupplierIds).map(async (supplierId) => {
          try {
            const res = await SupplierService.getSupplierById(supplierId);
            supplierMap[supplierId] = {
              name: res.data[0].name,
              email: res.data[0].email,
            };
          } catch (err) {
            console.warn(`Supplier ${supplierId} not found`);
          }
        }),
      );

      setSupplierDetailsMap(supplierMap);
      setRfqs(rfqList);
    } catch (err) {
      console.error('Error fetching RFQs or suppliers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRfqsAndSuppliers();
  }, [debouncedSearchTerm]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      created: { label: 'Draft', color: 'warning' },
      submitted: { label: 'Submitted', color: 'primary' },
      cancelled: { label: 'Cancelled', color: 'danger' },
      completed: { label: 'Completed', color: 'success' },
      supplier_shortlisted: { label: 'Supplier Shortlisted', color: 'info' },
      closed: { label: 'Closed', color: 'danger' },
    };

    const config = statusConfig[status] || { label: status || 'Unknown', color: 'dark' };

    return (
      <Badge
        color={config.color}
        pill
        style={{
          fontSize: '12px',
          fontWeight: '500',
          padding: '6px 12px',
        }}
      >
        {config.label}
      </Badge>
    );
  };

  const handleEdit = (rfqId) => {
    navigate(`/CreateRfq/${rfqId}`);
  };

  const handleViewDetails = (rfqId) => {
    navigate(`/rfqDetails/${rfqId}`);
  };

  const renderActionButtons = (_, row) => {
    const tooltipIdEdit = `edit-${row.rfqId}`;
    const tooltipIdView = `view-${row.rfqId}`;
    const isEditable = row.rfqStatus === 'created';

    return (
      <div className="d-flex justify-content-center">
        <Button
          id={tooltipIdView}
          className="btn btn-sm btn-primary me-2 action-button-edit"
          onClick={() => handleViewDetails(row.rfqId)}
        >
          <Eye size={14} />
        </Button>
        <Tooltip
          isOpen={tooltipOpenEdit === tooltipIdView}
          toggle={() =>
            setTooltipOpenEdit(tooltipOpenEdit === tooltipIdView ? null : tooltipIdView)
          }
          target={tooltipIdView}
        >
          View Details
        </Tooltip>

        <Button
          id={tooltipIdEdit}
          className="btn btn-sm btn-primary me-2 action-button-edit"
          onClick={() => isEditable && handleEdit(row.rfqId)}
          disabled={!isEditable}
          style={
            !isEditable
              ? {
                  cursor: 'not-allowed',
                  opacity: 0.5,
                  backgroundColor: 'transparent',
                  borderColor: 'darkgrey',
                  color: 'darkgrey',
                }
              : {}
          }
        >
          <Edit size={14} />
        </Button>
        <Tooltip
          isOpen={tooltipOpenEdit === tooltipIdEdit}
          toggle={() =>
            setTooltipOpenEdit(tooltipOpenEdit === tooltipIdEdit ? null : tooltipIdEdit)
          }
          target={tooltipIdEdit}
        >
          {isEditable ? 'Edit' : 'Editing disabled (status is not "created")'}
        </Tooltip>
      </div>
    );
  };

  return (
    <>
      <div className="rfq-list-page">
        <Row>
        <Col md="12">
          <div className="card h-100 shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
            <div className="card-body" style={{ padding: '24px' }}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div className="icon-wrapper" style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#009efb',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className="fas fa-file-contract text-white" style={{ fontSize: '20px' }}></i>
                  </div>
                  <div>
                    <h4 className="mb-0" style={{ color: '#009efb', fontWeight: '600' }}>
                      Request for Quotations
                    </h4>
                    <p className="text-muted mb-0 small">Manage and track all RFQ requests</p>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    placeholder="Search by supplier name..."
                    className="form-control form-control-sm"
                    style={{ 
                      width: '250px',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6'
                    }}
                  />
                  <Button
                    className="btn btn-gradient-primary"
                    onClick={() => navigate('/CreateRfq')}
                    style={{ 
                      whiteSpace: 'nowrap',
                      borderRadius: '8px',
                      boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                      background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                      border: 'none',
                      color: 'white'
                    }}
                  >
                    <i className="fas fa-plus me-2"></i>Add New RFQ
                  </Button>
                </div>
              </div>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3 text-muted">Loading RFQ data...</p>
                </div>
              ) : (
                <div className="table-responsive">
                <BootstrapTable
                  data={rfqs}
                  hover
                  condensed
                  striped
                  pagination={rfqs.length > 10}
                  options={options}
                  tableHeaderClass="mb-0"
                >
                  <TableHeaderColumn isKey dataField="rfqId" hidden>
                    RFQ ID
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="rfqNumber"
                    width="12%"
                    dataFormat={(cell, row) => (
                      <span
                        style={{
                          fontWeight: '600',
                          color: '#009efb',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleViewDetails(row.rfqId)}
                      >
                        {cell || `RFQ-${row.rfqId}`}
                      </span>
                    )}
                  >
                    RFQ Number
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="title"
                    width="18%"
                    dataFormat={(cell) => {
                      if (!cell) return 'N/A';
                      const truncated = cell.length > 25 ? `${cell.substring(0, 25)}...` : cell;
                      return <span title={cell}>{truncated}</span>;
                    }}
                  >
                    Title
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="objective"
                    width="20%"
                    dataFormat={(cell, row) => {
                      const truncated = cell
                        ? cell.split(' ').slice(0, 4).join(' ') +
                          (cell.split(' ').length > 4 ? '...' : '')
                        : 'N/A';
                      const tooltipId = `objective-tooltip-${row.rfqId}`;

                      return (
                        <div>
                          <span id={tooltipId}>{truncated}</span>
                          {cell && cell.split(' ').length > 4 && (
                            <Tooltip
                              placement="top"
                              isOpen={tooltipOpenObjective === tooltipId}
                              target={tooltipId}
                              toggle={() =>
                                setTooltipOpenObjective(
                                  tooltipOpenObjective === tooltipId ? null : tooltipId,
                                )
                              }
                            >
                              {cell}
                            </Tooltip>
                          )}
                        </div>
                      );
                    }}
                  >
                    Objective
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="suppliers"
                    dataFormat={(suppliers, row) => {
                      if (!suppliers || suppliers.length === 0) return 'No Suppliers';
                      const tooltipId = `suppliers-tooltip-${row.rfqId}`;

                      return (
                        <div>
                          <span
                            id={tooltipId}
                            style={{
                              textDecoration: 'underline',
                              color: '#007bff',
                              cursor: 'pointer',
                            }}
                          >
                            {suppliers.length}
                          </span>
                          <Tooltip
                            placement="top"
                            isOpen={tooltipOpenObjective === tooltipId}
                            target={tooltipId}
                            toggle={() =>
                              setTooltipOpenObjective(
                                tooltipOpenObjective === tooltipId ? null : tooltipId,
                              )
                            }
                          >
                            <div>
                              <strong>Suppliers:</strong>
                              <ul style={{ paddingLeft: '15px', marginBottom: 0 }}>
                                {suppliers.map((supplier) => (
                                  <li key={supplier.rfqSupplierId || supplier.supplierId}>
                                    {supplierDetailsMap[supplier.supplierId]?.name ||
                                      'Unknown Supplier'}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </Tooltip>
                        </div>
                      );
                    }}
                    width="10%"
                    headerAlign="left"
                    dataAlign="left"
                  >
                    Supplier Count
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    dataField="rfqItems"
                    dataFormat={(items, row) => {
                      if (!items || items.length === 0) return 'No Items';
                      const tooltipId = `items-tooltip-${row.rfqId}`;

                      return (
                        <div>
                          <span
                            id={tooltipId}
                            style={{
                              textDecoration: 'underline',
                              color: '#007bff',
                              cursor: 'pointer',
                            }}
                          >
                            {items.length}
                          </span>
                          <Tooltip
                            placement="top"
                            isOpen={tooltipOpenObjective === tooltipId}
                            target={tooltipId}
                            toggle={() =>
                              setTooltipOpenObjective(
                                tooltipOpenObjective === tooltipId ? null : tooltipId,
                              )
                            }
                          >
                            <div>
                              <strong>Line Items:</strong>
                              <ul style={{ paddingLeft: '15px', marginBottom: 0 }}>
                                {items.map((item) => (
                                  <li key={`item-${item.rfqItemId}`}>
                                    {item.partId}: {item.description} (Qty: {item.quantity}{' '}
                                    {item.uom})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </Tooltip>
                        </div>
                      );
                    }}
                    width="10%"
                    headerAlign="left"
                    dataAlign="left"
                  >
                    Line Item
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="rfqStatus"
                    dataFormat={(cell) => getStatusBadge(cell)}
                    width="10%"
                    headerAlign="left"
                    dataAlign="left"
                  >
                    Status
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="createdDate"
                    dataFormat={formatDate}
                    width="10%"
                    headerAlign="left"
                    dataAlign="left"
                  >
                    Created
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="requiredAt"
                    dataFormat={formatDate}
                    width="10%"
                    headerAlign="left"
                    dataAlign="left"
                  >
                    Required
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataFormat={renderActionButtons}
                    width="10%"
                    headerAlign="center"
                    dataAlign="left"
                  >
                    Actions
                  </TableHeaderColumn>
                </BootstrapTable>
              </div>
              )}
            </div>
          </div>
        </Col>
        </Row>
      </div>
      
      <style>{`
        .rfq-list-page {
          margin-top: 2rem;
          padding-top: 1rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          min-height: calc(100vh - 120px);
        }
      `}</style>
    </>
  );
};

export default RFQList;
