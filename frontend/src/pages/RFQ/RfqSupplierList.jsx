import React, { useEffect, useState, useCallback } from 'react';
import { Row, Col, Tooltip, Button, Badge, Spinner } from 'reactstrap';
import { useNavigate } from 'react-router-dom';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { Eye } from 'react-feather';
import { FaSort } from 'react-icons/fa';
import ComponentCard from '../../components/ComponentCard';
import '../CompanyManagement/ReactBootstrapTable.scss';
import CompanyService from '../../services/CompanyService';
import RqfService from '../../services/RfqService';
import { formatDate, getEntityId } from '../localStorageUtil';

const RFQSupplierList = () => {
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tooltipOpenEdit, setTooltipOpenEdit] = useState(null);

  const [tooltipOpenObjective, setTooltipOpenObjective] = useState(null);
  const [companyDetailsMap, setCompanyDetailsMap] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;
  const [totalElements, setTotalElements] = useState(0);
  const supplierId = getEntityId();
  const [sortBy, setSortBy] = useState('createdDate');
  const [sortOrder, setSortOrder] = useState('desc');

  const renderSortIcon = (field) => {
    if (sortBy === field) {
      return sortOrder === 'asc' ? <FaSort /> : <FaSort />;
    }
    return <FaSort />;
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchRfqs = useCallback(
    async (page = 0, search = '') => {
      setLoading(true);
      try {
        const response = await RqfService.getSupplierRfqPaginated(supplierId, {
          pageSize,
          pageNumber: page,
          search,
          sortBy,
          order: sortOrder,
        });

        const data = response?.data;

        if (data?.content) {
          setRfqs(data.content);
          setCurrentPage(data.pageNumber ?? page);
          setTotalElements(data.totalElements ?? 0);
        } else if (Array.isArray(data)) {
          setRfqs(data);
          setCurrentPage(0);
          setTotalElements(data.length);
        } else {
          setRfqs([]);
          setCurrentPage(0);
          setTotalElements(0);
        }

        const companyRes = await CompanyService.getAllCompanies();
        const companyMap = {};
        companyRes.data.content.forEach((company) => {
          companyMap[company.companyId] = company.name;
        });
        setCompanyDetailsMap(companyMap);
      } catch (err) {
        console.error('Error fetching RFQs or suppliers', err);
      } finally {
        setLoading(false);
      }
    },
    [supplierId, pageSize, sortBy, sortOrder],
  );
  const options = {
    paginationShowsTotal: false,
    hideSizePerPage: true,
    paginationPosition: 'bottom',
    page: currentPage + 1,
    sizePerPage: pageSize,
    totalSize: totalElements,
    onPageChange: (page) => {
      const pageIndex = page - 1;
      setCurrentPage(pageIndex);
      fetchRfqs(pageIndex, debouncedSearchTerm);
    },
  };

  useEffect(() => {
    fetchRfqs(0, debouncedSearchTerm);
  }, [fetchRfqs, debouncedSearchTerm, sortBy, sortOrder]);

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const getStatusBadge = (status) => {
    const colors = {
      submitted: 'primary',
      created: 'warning',
      cancelled: 'danger',
      completed: 'success',
      supplier_shortlisted: 'info',
    };
    return (
      <Badge color={colors[status] || 'dark'} pill>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleViewDetails = (companyId, rfqId) => {
    navigate(`/rfqDetails/${companyId}/${rfqId}`);
  };

  const renderActionButtons = (cell, row) => {
    const tooltipIdView = `view-${row.rfqId}`;

    return (
      <div className="d-flex justify-content-center">
        <Button
          id={tooltipIdView}
          className="btn btn-sm btn-primary me-2 action-button-edit"
          onClick={() => handleViewDetails(row.companyId, row.rfqId)}
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
      </div>
    );
  };

  return (
    <>
      <div className="rfq-supplier-list-page">
        <Row>
          <Col md="12">
            <ComponentCard
              title="Request for Quotations"
              action={
                <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    placeholder="Search by supplier name..."
                    className="form-control"
                    style={{ width: '200px' }}
                  />
                </div>
              }
            >
              {loading ? (
                <div className="text-center my-5">
                  <Spinner color="primary" />
                </div>
              ) : (
                <div className="table-responsive" style={{ marginTop: '0px' }}>
                  <BootstrapTable
                    data={rfqs}
                    hover
                    condensed
                    striped
                    pagination={totalElements > pageSize}
                    remote
                    fetchInfo={{ dataTotalSize: totalElements }}
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
                            cursor: 'pointer',
                          }}
                          onClick={() => handleViewDetails(row.companyId, row.rfqId)}
                        >
                          {cell || `RFQ-${row.rfqId}`}
                        </span>
                      )}
                    >
                      RFQ Number
                    </TableHeaderColumn>
                    <TableHeaderColumn dataField="title" width="15%">
                      <div
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        onClick={() => handleSort('rfq.title')}
                      >
                        Title {renderSortIcon('rfq.title')}
                      </div>
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="objective"
                      width="15%"
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
                      dataField="companyId"
                      width="15%"
                      dataFormat={(companyId) => companyDetailsMap[companyId] || 'N/A'}
                    >
                      <div
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        onClick={() => handleSort('rfq.company')}
                      >
                        Company {renderSortIcon('rfq.company')}
                      </div>
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
                      <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        Status
                      </div>
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="createdDate"
                      dataFormat={formatDate}
                      width="10%"
                      headerAlign="left"
                      dataAlign="left"
                    >
                      <div
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        onClick={() => handleSort('createdDate')}
                      >
                        Created {renderSortIcon('createdDate')}
                      </div>
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="requiredAt"
                      dataFormat={formatDate}
                      width="10%"
                      headerAlign="left"
                      dataAlign="left"
                    >
                      <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        Required
                      </div>
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataFormat={renderActionButtons}
                      headerAlign="center"
                      dataAlign="left"
                    >
                      Actions
                    </TableHeaderColumn>
                  </BootstrapTable>
                </div>
              )}
            </ComponentCard>
          </Col>
        </Row>
      </div>

      <style>{`
        .rfq-supplier-list-page {
          margin-top: 2rem;
          padding-top: 1rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          min-height: calc(100vh - 120px);
        }
      `}</style>
    </>
  );
};

export default RFQSupplierList;
