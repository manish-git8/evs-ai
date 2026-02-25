import React, { useEffect, useState, useMemo } from 'react';
import { FaSort } from 'react-icons/fa';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { Row, Col, Button } from 'reactstrap';
import { Edit } from 'react-feather';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { getEntityId } from '../localStorageUtil';
import SequenceService from '../../services/SequenceService';

const SequenceManagement = () => {
  const companyId = getEntityId();
  const [sequenceData, setSequenceData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('desc');
  const navigate = useNavigate();

  const formatSequenceName = (name) => {
    const nameMap = {
      purchase_order: 'Purchase Order',
      Voucher: 'Voucher',
      grn: 'GRN',
    };
    return nameMap[name] || name;
  };

const fetchAllSequences = async () => {
  try {
    const dto = {
      pageSize: 100,
      pageNumber: 0,
      sortBy: sortBy,
      order: sortOrder,
    };

    const response = await SequenceService.getAllSequences(companyId, { sequenceId: '' }, dto);

    let processedData = response.data || [];

    if (searchTerm.trim() !== '') {
      const searchTermLower = searchTerm.toLowerCase();
      const filteredData = processedData.filter((sequence) => {
        const sequenceName = formatSequenceName(sequence.sequenceName || '').toLowerCase();
        const prefix = (sequence.prefix || '').toLowerCase();
        const suffix = (sequence.suffix || '').toLowerCase();
        const sequenceValue = (sequence.sequenceValue || '').toString().toLowerCase();

        return (
          sequenceName.includes(searchTermLower) ||
          prefix.includes(searchTermLower) ||
          suffix.includes(searchTermLower) ||
          sequenceValue.includes(searchTermLower)
        );
      });
      setSequenceData(filteredData);
    } else {
      setSequenceData(processedData);
    }
  } catch (error) {
    console.error('Error fetching Sequences:', error);
    toast.dismiss();
    toast.error(error.response?.data?.errorMessage || 'Failed to fetch sequences');
  }
};


  const getValueByField = (item, field) => {
    if (!item) return '';
    if (!field) return item;
    const parts = field.split('.');
    let val = item;
    for (let p of parts) {
      if (val == null) break;
      val = val[p];
    }
    if (Array.isArray(val)) return val.length;
    if (val && typeof val === 'object') {
      if (val.firstName || val.lastName)
        return `${val.firstName || ''} ${val.lastName || ''}`.trim();
      if (val.displayName) return val.displayName;
      return JSON.stringify(val);
    }
    const maybeDate = Date.parse(val);
    if (!Number.isNaN(maybeDate)) return maybeDate;
    if (!Number.isNaN(Number(val))) return Number(val);
    return (val || '').toString().toLowerCase();
  };

  const sortData = (arr, field, order = 'asc') => {
    if (!Array.isArray(arr)) return arr;
    const copy = [...arr];
    copy.sort((a, b) => {
      const va = getValueByField(a, field);
      const vb = getValueByField(b, field);
      if (va === vb) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number')
        return order === 'asc' ? va - vb : vb - va;
      const sa = String(va);
      const sb = String(vb);
      return order === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return copy;
  };

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

  const sortedSequenceData = useMemo(
    () => sortData(sequenceData || [], sortBy, sortOrder),
    [sequenceData, sortBy, sortOrder],
  );

  useEffect(() => {
    fetchAllSequences();
  }, [debouncedSearchTerm, sortBy, sortOrder]);

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const options = {
    paginationShowsTotal: false,
    hideSizePerPage: true,
    paginationPosition: 'bottom',
  };

  const handleEditSequence = (sequenceId) => {
    navigate(`/edit-sequence/${sequenceId}`, {
      state: {
        fromPage: '/sequence-management',
      },
    });
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
          <div className="card h-100 shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
            <div className="card-body" style={{ padding: '24px' }}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="icon-wrapper"
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: '#009efb',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i className="fas fa-list-ol text-white" style={{ fontSize: '20px' }}></i>
                  </div>
                  <div>
                    <h4 className="mb-0" style={{ color: '#009efb', fontWeight: '600' }}>
                      Sequence Management
                    </h4>
                    <p className="text-muted mb-0 small">
                      Manage and configure sequence numbers for documents
                    </p>
                  </div>
                </div>
                <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    placeholder="Search by sequence name, prefix, suffix, or value..."
                    className="form-control"
                    style={{
                      width: '300px',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6',
                    }}
                  />
                  <Button
                    className="btn btn-gradient-primary"
                    onClick={() => navigate('/sequence')}
                    style={{
                      whiteSpace: 'nowrap',
                      borderRadius: '8px',
                      boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                      background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                      border: 'none',
                      color: 'white',
                    }}
                  >
                    <i className="fas fa-plus me-2"></i>Add New
                  </Button>
                </div>
              </div>
              <div className="table-responsive">
                <BootstrapTable
                  striped
                  hover
                  condensed
                  pagination={sequenceData.length > 10}
                  tableHeaderClass="mb-0"
                  data={sortedSequenceData}
                  options={options}
                >
                  <TableHeaderColumn isKey dataField="id" hidden>
                    ID
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="sequenceName"
                    dataAlign="left"
                    headerAlign="left"
                    dataFormat={(cell) => formatSequenceName(cell)}
                    width="18%"
                    thStyle={{
                      textAlign: 'left',
                      whiteSpace: 'normal',
                      padding: '8px',
                      cursor: 'pointer',
                    }}
                    tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleSort('sequenceName')}
                    >
                      Document Type {renderSortIcon('sequenceName')}
                    </div>
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="sequenceValue"
                    dataAlign="left"
                    headerAlign="left"
                    width="12%"
                    thStyle={{
                      textAlign: 'left',
                      whiteSpace: 'normal',
                      padding: '8px',
                      cursor: 'pointer',
                    }}
                    tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleSort('sequenceValue')}
                    >
                      Current Value {renderSortIcon('sequenceValue')}
                    </div>
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="prefix"
                    dataAlign="left"
                    headerAlign="left"
                    width="12%"
                    dataFormat={(cell) => cell || '-'}
                    thStyle={{
                      textAlign: 'left',
                      whiteSpace: 'normal',
                      padding: '8px',
                      cursor: 'pointer',
                    }}
                    tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleSort('prefix')}
                    >
                      Prefix {renderSortIcon('prefix')}
                    </div>
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="suffix"
                    dataAlign="left"
                    headerAlign="left"
                    width="12%"
                    dataFormat={(cell) => cell || '-'}
                    thStyle={{
                      textAlign: 'left',
                      whiteSpace: 'normal',
                      padding: '8px',
                      cursor: 'pointer',
                    }}
                    tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleSort('suffix')}
                    >
                      Suffix {renderSortIcon('suffix')}
                    </div>
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    dataField="actions"
                    dataAlign="center"
                    headerAlign="center"
                    dataFormat={(_, row) => (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <Button
                          className="btn btn-sm btn-primary me-2 action-button-edit"
                          size="sm"
                          onClick={() => handleEditSequence(row.id)}
                          title="Edit"
                        >
                          <Edit size={14} />
                        </Button>
                      </div>
                    )}
                    width="11%"
                  >
                    Actions
                  </TableHeaderColumn>
                </BootstrapTable>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default SequenceManagement;
