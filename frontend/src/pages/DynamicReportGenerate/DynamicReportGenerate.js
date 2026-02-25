import { useState, useEffect } from 'react';
import { Row, Col, FormGroup, Label, Input, Card, CardBody, Button, Table } from 'reactstrap';
import { ToastContainer, toast } from 'react-toastify';
import Select from 'react-select';
import 'react-toastify/dist/ReactToastify.css';
import '../CompanyManagement/ReactBootstrapTable.scss';
import ReportService from '../../services/ReportService';
import { getEntityId, getEntityType } from '../localStorageUtil';

const statusOptionsByEntity = {
  RFQ: ['Created', 'Submitted', 'Cancelled', 'Completed', 'Supplier Shortlisted', 'Closed'],
  Cart: [
    { label: 'Draft', value: 'Draft' },
  { label: 'Created', value: 'Created' },
  { label: 'Pending Approval', value: 'Pending_Approval' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Rejected', value: 'Rejected' },
  { label: 'Submitted', value: 'Submitted' },
  { label: 'POGenerated', value: 'POGenerated' },
  ],
  PO: [
    { label: 'Draft', value: 'Draft' },
  { label: 'Created', value: 'Created' },
  { label: 'Pending Approval', value: 'Pending_Approval' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Rejected', value: 'Rejected' },
  { label: 'Submitted', value: 'Submitted' },
  { label: 'Confirmed', value: 'Confirmed' },
  { label: 'Shipped', value: 'Shipped' },
  { label: 'Delivered', value: 'Delivered' },
  { label: 'Returned', value: 'Returned' },
  { label: 'Partially Confirmed', value: 'PARTIALLY_CONFIRMED' },
    'Draft',
    'Created',
    'Pending Approval',
    'Approved',
    'Rejected',
    'Submitted',
    'Confirmed',
    'Shipped',
    'Delivered',
    'Returned',
    'Partially Confirmed',
  ],
  GRN: ['Created', 'Processed', 'In Progress'],
  Voucher: ['Draft', 'Submitted', 'Approved', 'Paid', 'Rejected'],
  User: ['Active', 'Inactive'],
  Supplier: ['Draft', 'Active', 'Inactive'],
};

const triggerTypeOptions = ['Approval Delay', 'Confirmation Delay', 'Rejection Rate'];
const groupByOptions = ['User'];
const validChartTypes = ['BAR', 'LINE', 'PIE'];

const DynamicReportGenerate = () => {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const companyId = getEntityId();
  const entityType = getEntityType();
  const initialReportParams = {
    reportType: 'Status-Based',
    name: '',
    entity: 'RFQ',
    status: '',
    chartType: 'BAR',
    triggerType: '',
    groupBy: '',
    thresholdDays: '',
    xAxis: '',
    yAxis: '',
    numOfRecords: '',
  };

  const [reportParams, setReportParams] = useState(initialReportParams);

  const resetForm = () => {
    setReportParams(initialReportParams);
  };

  const getStatusOptions = () => {
  return statusOptionsByEntity[reportParams.entity] || [];
};


  const handleStatusChange = (selectedOptions) => {
    const statusString = selectedOptions
      ? selectedOptions.map((option) => option.value).join(',')
      : '';
    setReportParams((prev) => ({
      ...prev,
      status: statusString,
    }));
  };

  const getCurrentStatusValues = () => {
  if (!reportParams.status) return [];
  const selectedValues = reportParams.status.split(',');
  const options = getStatusOptions();

  return selectedValues
    .map((val) => options.find((opt) => opt.value === val))
    .filter(Boolean);
};


  const fetchReports = async () => {
    setFetchLoading(true);
    try {
      const response = await ReportService.getAllDynamicReport(companyId, entityType);
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to fetch reports');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReportParams((prev) => {
      const updatedParams = { ...prev, [name]: value };
      if (name === 'entity') {
        updatedParams.status = '';
      }
      return updatedParams;
    });
  };

  const generateReport = async () => {
    if (!reportParams.name) {
      toast.error('Report name is required');
      return;
    }

    if (!validChartTypes.includes(reportParams.chartType)) {
      toast.error('Please select a valid chart type (BAR, LINE, or PIE)');
      return;
    }

    setLoading(true);
    try {
      const reportData = {
        titleName: reportParams.name,
        entityName: reportParams.entity,
        entityType,
        status: reportParams.status,
        chartType: reportParams.chartType,
        reportType: reportParams.reportType,
        xAxis: reportParams.xAxis,
        yAxis: reportParams.yAxis,
        triggerType: reportParams.triggerType,
        groupBy: reportParams.groupBy,
        sort: 'ASC',
        threshold: parseInt(reportParams.thresholdDays, 10) || 0,
        isActive: true,
        numOfRecords: parseInt(reportParams.numOfRecords, 10) || 0,
      };

      const response = await ReportService.handleCreateReport(companyId, entityType, reportData);
      console.log('API Response:', response);

      if (response.status === 200 || response.status === 201) {
        toast.success('Report created successfully');
        resetForm();
        await fetchReports();
      } else {
        toast.error((response.data && response.data.message) || 'Failed to create report');
      }
    } catch (error) {
      console.error('Error creating report:', error);
      toast.error((error.response && error.response.data && error.response.data.message) || 'Error creating report');
    } finally {
      setLoading(false);
    }
  };

  const formFields = [
    {
      label: 'Report Type',
      name: 'reportType',
      type: 'select',
      options: ['Status-Based', 'Behavior-Based'],
    },
    {
      label: 'Name',
      name: 'name',
      type: 'text',
      placeholder: 'Enter report name',
      required: true,
    },
    {
      label: 'Entity',
      name: 'entity',
      type: 'select',
      options: ['RFQ', 'Cart', 'PO'],
    },
    {
      label: 'Chart Type',
      name: 'chartType',
      type: 'select',
      options: validChartTypes,
    },
    {
      label: 'X-Axis',
      name: 'xAxis',
      type: 'text',
      placeholder: 'Enter X-Axis value',
    },
    {
      label: 'Y-Axis',
      name: 'yAxis',
      type: 'text',
      placeholder: 'Enter Y-Axis value',
    },
    {
      label: 'Number of Records',
      name: 'numOfRecords',
      type: 'number',
      placeholder: 'Enter number of records to fetch',
    },
  ];

  const behaviorBasedFields = [
    {
      label: 'Trigger Type',
      name: 'triggerType',
      type: 'select',
      options: triggerTypeOptions,
      hidden: reportParams.reportType !== 'Behavior-Based',
    },
    {
      label: 'Group By',
      name: 'groupBy',
      type: 'select',
      options: groupByOptions,
      hidden: reportParams.reportType !== 'Behavior-Based',
    },
    {
      label: 'Threshold (Days)',
      name: 'thresholdDays',
      type: 'number',
      placeholder: 'Enter number of days (default: 0)',
      hidden: reportParams.reportType !== 'Behavior-Based',
    },
  ];

  return (
    <div style={{ paddingTop: '20px' }}>
      <ToastContainer />
      
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
                    <i className="bi bi-bar-chart me-2"></i>
                    Dynamic Report Builder
                  </h3>
                  <p className="mb-0 opacity-90">
                    Create customizable reports with advanced filtering and visualization options to gain insights into your business data
                  </p>
                </Col>
                <Col md="4" className="text-end d-none d-md-block">
                  <div className="icon-wrapper" style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto'
                  }}>
                    <i className="bi bi-graph-up text-white" style={{ fontSize: '2rem' }}></i>
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
              <div className="d-flex align-items-center gap-3 mb-4">
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
                  <i className="bi bi-gear text-white"></i>
                </div>
                <div>
                  <h4 className="mb-1">Report Configuration</h4>
                  <p className="text-muted mb-0 small">Configure your report parameters and visualization settings</p>
                </div>
              </div>

              <Row className="g-4">
                {formFields.map(
                  (field) =>
                    !field.hidden && (
                      <Col lg={4} md={6} key={field.name}>
                        <FormGroup>
                          <Label for={field.name} className="form-label fw-medium mb-2">
                            <i className={`fas ${
                              field.name === 'reportType' ? 'fa-file-alt' :
                              field.name === 'name' ? 'fa-tag' :
                              field.name === 'entity' ? 'fa-database' :
                              field.name === 'chartType' ? 'fa-chart-pie' :
                              field.name === 'xAxis' ? 'fa-arrows-alt-h' :
                              field.name === 'yAxis' ? 'fa-arrows-alt-v' :
                              field.name === 'numOfRecords' ? 'fa-list-ol' :
                              'fa-cog'
                            } me-2 text-muted`}></i>
                            {field.label}
                            {field.required && <span className="text-danger ms-1">*</span>}
                          </Label>
                          {field.type === 'select' ? (
                            <Input
                              id={field.name}
                              type="select"
                              name={field.name}
                              value={reportParams[field.name]}
                              onChange={handleInputChange}
                              className="form-control"
                              required={field.required}
                              style={{
                                borderRadius: '8px',
                                border: '2px solid #e9ecef',
                                padding: '12px 16px',
                                fontSize: '14px'
                              }}
                            >
                              {field.options ? (
                                <>
                                  <option value="">Select {field.label.toLowerCase()}</option>
                                  {field.options.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </>
                              ) : null}
                            </Input>
                          ) : (
                            <Input
                              id={field.name}
                              type={field.type}
                              name={field.name}
                              value={reportParams[field.name]}
                              onChange={handleInputChange}
                              className="form-control"
                              placeholder={field.placeholder}
                              required={field.required}
                              style={{
                                borderRadius: '8px',
                                border: '2px solid #e9ecef',
                                padding: '12px 16px',
                                fontSize: '14px'
                              }}
                            />
                          )}
                        </FormGroup>
                      </Col>
                    ),
                )}

                {/* Status Multi-Select Dropdown - Hidden for Behavior-Based */}
                {reportParams.reportType !== 'Behavior-Based' && (
                  <Col lg={4} md={6}>
                    <FormGroup>
                      <Label for="status" className="form-label fw-medium mb-2">
                        <i className="fas fa-flag me-2 text-muted"></i>
                        Status
                      </Label>
                      <Select
                        isMulti
                        name="status"
                        options={getStatusOptions()}
                        className="basic-multi-select"
                        classNamePrefix="select"
                        value={getCurrentStatusValues()}
                        onChange={handleStatusChange}
                        placeholder="Select statuses..."
                        isClearable
                        styles={{
                          control: (provided) => ({
                            ...provided,
                            borderRadius: '8px',
                            border: '2px solid #e9ecef',
                            padding: '4px 8px',
                            fontSize: '14px'
                          })
                        }}
                      />
                    </FormGroup>
                  </Col>
                )}

                {behaviorBasedFields.map(
                  (field) =>
                    !field.hidden && (
                      <Col lg={4} md={6} key={field.name}>
                        <FormGroup>
                          <Label for={field.name} className="form-label fw-medium mb-2">
                            <i className={`fas ${
                              field.name === 'triggerType' ? 'fa-bell' :
                              field.name === 'groupBy' ? 'fa-layer-group' :
                              field.name === 'thresholdDays' ? 'fa-calendar' :
                              'fa-cog'
                            } me-2 text-muted`}></i>
                            {field.label}
                          </Label>
                          {field.type === 'select' ? (
                            <Input
                              id={field.name}
                              type="select"
                              name={field.name}
                              value={reportParams[field.name]}
                              onChange={handleInputChange}
                              className="form-control"
                              style={{
                                borderRadius: '8px',
                                border: '2px solid #e9ecef',
                                padding: '12px 16px',
                                fontSize: '14px'
                              }}
                            >
                              <option value="">Select {field.label.toLowerCase()}</option>
                              {field.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </Input>
                          ) : (
                            <Input
                              id={field.name}
                              type={field.type}
                              name={field.name}
                              value={reportParams[field.name]}
                              onChange={handleInputChange}
                              className="form-control"
                              placeholder={field.placeholder}
                              style={{
                                borderRadius: '8px',
                                border: '2px solid #e9ecef',
                                padding: '12px 16px',
                                fontSize: '14px'
                              }}
                            />
                          )}
                        </FormGroup>
                      </Col>
                    ),
                )}

                <Col md={12} className="text-center mt-4 pt-3" style={{
                  borderTop: '1px solid #e9ecef'
                }}>
                  <Button
                    color="primary"
                    onClick={generateReport}
                    className="px-5 py-3"
                    disabled={loading}
                    style={{
                      backgroundColor: '#009efb',
                      borderColor: '#009efb',
                      borderRadius: '10px',
                      fontWeight: '600',
                      fontSize: '16px',
                      boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      if (!loading) {
                        e.target.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!loading) {
                        e.target.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Generating Report...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-rocket me-2"></i>
                        Generate Report
                      </>
                    )}
                  </Button>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
      <Row className="mt-4">
        <Col md="12">
          <Card className="enhanced-card" style={{
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: 'none'
          }}>
            <CardBody>
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="icon-wrapper" style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#28a745',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(40, 167, 69, 0.1)'
                }}>
                  <i className="fas fa-chart-area text-white"></i>
                </div>
                <div>
                  <h4 className="mb-1">Generated Reports</h4>
                  <p className="text-muted mb-0 small">View and manage your created reports</p>
                </div>
              </div>

              {fetchLoading ? (
                <Card className="loading-card" style={{
                  borderRadius: '12px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  border: '1px solid #e9ecef',
                  minHeight: '300px'
                }}>
                  <CardBody className="d-flex align-items-center justify-content-center flex-column">
                    <div className="spinner-border text-primary mb-3" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted mb-0">Loading reports...</p>
                  </CardBody>
                </Card>
              ) : reports.length === 0 ? (
                <Card className="empty-state-card" style={{
                  borderRadius: '12px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  border: '1px solid #e9ecef',
                  minHeight: '300px'
                }}>
                  <CardBody className="d-flex align-items-center justify-content-center flex-column text-center">
                    <div className="icon-wrapper mb-3" style={{
                      width: '60px',
                      height: '60px',
                      backgroundColor: 'rgba(40, 167, 69, 0.1)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <i className="fas fa-chart-bar text-success" style={{ fontSize: '24px' }}></i>
                    </div>
                    <h5 className="text-muted mb-2">No Reports Generated Yet</h5>
                    <p className="text-muted mb-0">Create your first report using the configuration form above</p>
                  </CardBody>
                </Card>
              ) : (
                <div className="table-responsive">
                  <Table className="table-modern" style={{ marginBottom: 0 }}>
                    <thead style={{
                      backgroundColor: '#f8f9fa',
                      borderBottom: '2px solid #e9ecef'
                    }}>
                      <tr>
                        <th style={{ fontWeight: '600', color: '#495057', padding: '16px 12px' }}>
                          <i className="fas fa-hashtag me-2"></i>ID
                        </th>
                        <th style={{ fontWeight: '600', color: '#495057', padding: '16px 12px' }}>
                          <i className="fas fa-file-alt me-2"></i>Title
                        </th>
                        <th style={{ fontWeight: '600', color: '#495057', padding: '16px 12px' }}>
                          <i className="fas fa-database me-2"></i>Entity
                        </th>
                        <th style={{ fontWeight: '600', color: '#495057', padding: '16px 12px' }}>
                          <i className="fas fa-flag me-2"></i>Status
                        </th>
                        <th style={{ fontWeight: '600', color: '#495057', padding: '16px 12px' }}>
                          <i className="fas fa-chart-pie me-2"></i>Chart Type
                        </th>
                        <th style={{ fontWeight: '600', color: '#495057', padding: '16px 12px' }}>
                          <i className="fas fa-file-contract me-2"></i>Report Type
                        </th>
                        <th style={{ fontWeight: '600', color: '#495057', padding: '16px 12px' }}>
                          <i className="fas fa-bell me-2"></i>Trigger Type
                        </th>
                        <th style={{ fontWeight: '600', color: '#495057', padding: '16px 12px' }}>
                          <i className="fas fa-layer-group me-2"></i>Group By
                        </th>
                        <th style={{ fontWeight: '600', color: '#495057', padding: '16px 12px' }}>
                          <i className="fas fa-calendar me-2"></i>Threshold
                        </th>
                        <th style={{ fontWeight: '600', color: '#495057', padding: '16px 12px' }}>
                          <i className="fas fa-list-ol me-2"></i>Records Limit
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report, index) => (
                        <tr key={report.graphConfigId} style={{
                          borderBottom: index === reports.length - 1 ? 'none' : '1px solid #f0f0f0',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          const row = e.target.closest('tr');
                          if (row) {
                            row.style.backgroundColor = '#f8f9fa';
                          }
                        }}
                        onMouseLeave={(e) => {
                          const row = e.target.closest('tr');
                          if (row) {
                            row.style.backgroundColor = 'transparent';
                          }
                        }}>
                          <td style={{ padding: '16px 12px', fontWeight: '500' }}>
                            <span className="badge bg-primary" style={{ fontSize: '11px' }}>
                              {report.graphConfigId}
                            </span>
                          </td>
                          <td style={{ padding: '16px 12px' }}>
                            <div className="fw-medium text-dark">{report.titleName}</div>
                          </td>
                          <td style={{ padding: '16px 12px' }}>
                            <span className={`badge ${
                              report.entityName === 'RFQ' ? 'bg-info' :
                              report.entityName === 'Cart' ? 'bg-warning' :
                              report.entityName === 'PO' ? 'bg-success' :
                              'bg-secondary'
                            }`} style={{ fontSize: '11px' }}>
                              {report.entityName}
                            </span>
                          </td>
                          <td style={{ padding: '16px 12px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {report.status && typeof report.status === 'string'
                                ? report.status.split(',').map((status) => (
                                    <span key={`status-${report.graphConfigId}-${status.trim()}`} className="badge bg-light text-dark border" style={{ fontSize: '10px' }}>
                                      {status.trim()}
                                    </span>
                                  ))
                                : <span className="text-muted">-</span>}
                            </div>
                          </td>
                          <td style={{ padding: '16px 12px' }}>
                            <span className={`badge d-inline-flex align-items-center gap-1 ${
                              report.chartType === 'BAR' ? 'bg-primary' :
                              report.chartType === 'LINE' ? 'bg-success' :
                              report.chartType === 'PIE' ? 'bg-warning' :
                              'bg-secondary'
                            }`} style={{ fontSize: '11px' }}>
                              <i className={`fas ${
                                report.chartType === 'BAR' ? 'fa-chart-bar' :
                                report.chartType === 'LINE' ? 'fa-chart-line' :
                                report.chartType === 'PIE' ? 'fa-chart-pie' :
                                'fa-chart-area'
                              }`}></i>
                              {report.chartType}
                            </span>
                          </td>
                          <td style={{ padding: '16px 12px' }}>
                            <span className={`badge ${
                              report.reportType === 'Status-Based' ? 'bg-info' : 'bg-danger'
                            }`} style={{ fontSize: '11px' }}>
                              {report.reportType}
                            </span>
                          </td>
                          <td style={{ padding: '16px 12px' }}>
                            {report.triggerType ? (
                              <span className="text-dark">{report.triggerType}</span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td style={{ padding: '16px 12px' }}>
                            {report.groupBy ? (
                              <span className="text-dark">{report.groupBy}</span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td style={{ padding: '16px 12px' }}>
                            <span className={`badge ${
                              (report.threshold || 0) > 0 ? 'bg-warning' : 'bg-light text-dark'
                            }`} style={{ fontSize: '11px' }}>
                              {report.threshold || '0'} days
                            </span>
                          </td>
                          <td style={{ padding: '16px 12px' }}>
                            <span className="badge bg-secondary" style={{ fontSize: '11px' }}>
                              {report.numOfRecords || 'All'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DynamicReportGenerate;
