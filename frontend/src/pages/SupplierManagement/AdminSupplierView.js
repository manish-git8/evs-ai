import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  CardBody,
  Button,
  Spinner,
  Badge,
  Table,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import {
  FaBuilding,
  FaEnvelope,
  FaPhone,
  FaGlobe,
  FaMapMarkerAlt,
  FaUsers,
  FaShoppingCart,
  FaFileInvoice,
  FaClipboardList,
  FaBox,
  FaEdit,
  FaArrowLeft,
  FaCheckCircle,
} from 'react-icons/fa';
import 'react-toastify/dist/ReactToastify.css';
import SupplierService from '../../services/SupplierService';
import CatalogItemService from '../../services/CatalogItemService';
import { formatCurrency, getCompanyCurrency } from '../localStorageUtil';
import '../CompanyManagement/AdminCompanyView.scss';

const AdminSupplierView = () => {
  const { supplierId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState(null);
  const [metrics, setMetrics] = useState({
    companies: 0,
    orders: 0,
    rfqs: 0,
    catalogs: 0,
  });
  const [companyTransactions, setCompanyTransactions] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [transactionsPage, setTransactionsPage] = useState(0);
  const [transactionsTotalPages, setTransactionsTotalPages] = useState(0);
  const [catalogsPage, setCatalogsPage] = useState(0);
  const [catalogsTotalPages, setCatalogsTotalPages] = useState(0);

  // Helper to safely fetch data and return null on error
  const safeFetch = async (fetchFn) => {
    try {
      return await fetchFn();
    } catch (error) {
      console.debug('SafeFetch caught error:', error?.message || error);
      return null;
    }
  };

  const fetchSupplierData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch supplier details
      const supplierResponse = await SupplierService.getSupplierById(supplierId);
      const supplierData = Array.isArray(supplierResponse.data)
        ? supplierResponse.data[0]
        : supplierResponse.data;
      setSupplier(supplierData);

      // Fetch metrics
      const metricsRes = await safeFetch(() => SupplierService.getSupplierMetrics(supplierId));

      if (metricsRes?.data) {
        setMetrics({
          companies: metricsRes.data.companiesCount || 0,
          orders: metricsRes.data.ordersCount || 0,
          rfqs: metricsRes.data.rfqsCount || 0,
          catalogs: metricsRes.data.catalogsCount || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching supplier data:', error);
      toast.error('Failed to load supplier details');
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  const fetchCompanyTransactions = useCallback(async (page = 0) => {
    try {
      const response = await SupplierService.getSupplierCompanyTransactions(supplierId, page, 10);
      if (response?.data) {
        setCompanyTransactions(response.data.content || []);
        setTransactionsTotalPages(response.data.totalPages || 0);
        setTransactionsPage(page);
      }
    } catch (error) {
      console.error('Error fetching company transactions:', error);
    }
  }, [supplierId]);

  const fetchCatalogItems = useCallback(async (page = 0) => {
    try {
      const response = await CatalogItemService.getSupplierCatalogItemsPaginated(supplierId, {
        pageSize: 10,
        pageNumber: page,
      });
      if (response) {
        setCatalogItems(response.content || []);
        setCatalogsTotalPages(response.totalPages || 0);
        setCatalogsPage(page);
      }
    } catch (error) {
      console.error('Error fetching catalog items:', error);
    }
  }, [supplierId]);

  useEffect(() => {
    if (supplierId) {
      fetchSupplierData();
    }
  }, [supplierId, fetchSupplierData]);

  useEffect(() => {
    if (activeTab === 'transactions' && companyTransactions.length === 0) {
      fetchCompanyTransactions(0);
    }
  }, [activeTab, companyTransactions.length, fetchCompanyTransactions]);

  useEffect(() => {
    if (activeTab === 'catalogs' && catalogItems.length === 0) {
      fetchCatalogItems(0);
    }
  }, [activeTab, catalogItems.length, fetchCatalogItems]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };


  const getStatusBadge = (status) => {
    const statusConfig = {
      ACTIVE: { color: 'success', icon: FaCheckCircle, label: 'Active' },
      DRAFT: { color: 'warning', label: 'Draft (Internal)' },
      INACTIVE: { color: 'secondary', label: 'Inactive' },
    };
    const config = statusConfig[status] || { color: 'secondary', label: status || 'Unknown' };
    const Icon = config.icon;
    return (
      <Badge color={config.color} className="d-inline-flex align-items-center gap-1 px-2 py-1">
        {Icon && <Icon size={12} />}
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner color="primary" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="text-center py-5">
        <FaBuilding size={48} className="text-muted mb-3" />
        <h5>Supplier not found</h5>
        <Button color="primary" size="sm" onClick={() => navigate('/supplier-management')}>
          Back to Suppliers
        </Button>
      </div>
    );
  }

  return (
    <div className="admin-company-view">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="company-header mb-4">
        <div className="d-flex justify-content-between align-items-start">
          <div className="d-flex align-items-center">
            <Button
              color="link"
              className="p-0 me-3 text-muted back-btn"
              onClick={() => navigate('/supplier-management')}
            >
              <FaArrowLeft size={20} />
            </Button>
            <div className="company-logo-wrapper me-3">
              <div className="company-logo-placeholder">
                <FaBox size={32} />
              </div>
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <h4 className="mb-0 fw-semibold">{supplier.name}</h4>
                {getStatusBadge(supplier.supplierStatus)}
              </div>
              <div className="text-muted">
                {supplier.displayName && <span className="me-3">{supplier.displayName}</span>}
                <span className="me-3">
                  <FaEnvelope className="me-1" size={12} />
                  {supplier.email}
                </span>
                {supplier.primaryContact && (
                  <span>
                    <FaPhone className="me-1" size={12} />
                    {supplier.primaryContact}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button
              color="outline-primary"
              size="sm"
              onClick={() => navigate(`/supplier-registration/${supplierId}`)}
            >
              <FaEdit className="me-1" /> Edit Supplier
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <Row className="g-3 mb-4">
        <Col xs="6" md="3">
          <Card className="stat-card h-100 border-0 shadow-sm">
            <CardBody className="d-flex align-items-center">
              <div className="stat-icon bg-primary-light text-primary me-3">
                <FaBuilding size={20} />
              </div>
              <div>
                <div className="stat-value">{metrics.companies}</div>
                <div className="stat-label">Companies</div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xs="6" md="3">
          <Card className="stat-card h-100 border-0 shadow-sm">
            <CardBody className="d-flex align-items-center">
              <div className="stat-icon bg-success-light text-success me-3">
                <FaFileInvoice size={20} />
              </div>
              <div>
                <div className="stat-value">{metrics.orders}</div>
                <div className="stat-label">Orders</div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xs="6" md="3">
          <Card className="stat-card h-100 border-0 shadow-sm">
            <CardBody className="d-flex align-items-center">
              <div className="stat-icon bg-info-light text-info me-3">
                <FaClipboardList size={20} />
              </div>
              <div>
                <div className="stat-value">{metrics.rfqs}</div>
                <div className="stat-label">RFQs</div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xs="6" md="3">
          <Card className="stat-card h-100 border-0 shadow-sm">
            <CardBody className="d-flex align-items-center">
              <div className="stat-icon bg-warning-light text-warning me-3">
                <FaShoppingCart size={20} />
              </div>
              <div>
                <div className="stat-value">{metrics.catalogs}</div>
                <div className="stat-label">Catalog Items</div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Main Content Tabs */}
      <Card className="border-0 shadow-sm">
        <CardBody className="p-0">
          <Nav tabs className="nav-tabs-custom px-3 pt-2">
            <NavItem>
              <NavLink
                className={activeTab === 'overview' ? 'active' : ''}
                onClick={() => setActiveTab('overview')}
              >
                <FaBox className="me-2" size={14} />
                Overview
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === 'transactions' ? 'active' : ''}
                onClick={() => setActiveTab('transactions')}
              >
                <FaBuilding className="me-2" size={14} />
                Company Transactions
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === 'catalogs' ? 'active' : ''}
                onClick={() => setActiveTab('catalogs')}
              >
                <FaShoppingCart className="me-2" size={14} />
                Catalogs
              </NavLink>
            </NavItem>
          </Nav>

          <div className="p-4">
            <TabContent activeTab={activeTab}>
              {/* Overview Tab */}
              <TabPane tabId="overview">
                <Row className="g-4">
                  <Col lg="6">
                    <div className="info-section">
                      <h6 className="section-title">
                        <FaBox className="me-2" />
                        Supplier Information
                      </h6>
                      <Table borderless size="sm" className="info-table">
                        <tbody>
                          <tr>
                            <td className="label-cell">Supplier Name</td>
                            <td className="value-cell">{supplier.name}</td>
                          </tr>
                          <tr>
                            <td className="label-cell">Display Name</td>
                            <td className="value-cell">{supplier.displayName || '-'}</td>
                          </tr>
                          <tr>
                            <td className="label-cell">Currency</td>
                            <td className="value-cell">{supplier.currency || getCompanyCurrency()}</td>
                          </tr>
                          <tr>
                            <td className="label-cell">Status</td>
                            <td className="value-cell">{getStatusBadge(supplier.supplierStatus)}</td>
                          </tr>
                          <tr>
                            <td className="label-cell">Created</td>
                            <td className="value-cell">{formatDate(supplier.createdDate)}</td>
                          </tr>
                        </tbody>
                      </Table>
                    </div>

                    <div className="info-section mt-4">
                      <h6 className="section-title">
                        <FaEnvelope className="me-2" />
                        Contact Information
                      </h6>
                      <Table borderless size="sm" className="info-table">
                        <tbody>
                          <tr>
                            <td className="label-cell">Email</td>
                            <td className="value-cell">
                              <a href={`mailto:${supplier.email}`}>{supplier.email}</a>
                            </td>
                          </tr>
                          <tr>
                            <td className="label-cell">Sales Email</td>
                            <td className="value-cell">
                              {supplier.salesEmail ? (
                                <a href={`mailto:${supplier.salesEmail}`}>{supplier.salesEmail}</a>
                              ) : '-'}
                            </td>
                          </tr>
                          <tr>
                            <td className="label-cell">Phone</td>
                            <td className="value-cell">{supplier.primaryContact || '-'}</td>
                          </tr>
                          <tr>
                            <td className="label-cell">Customer Service</td>
                            <td className="value-cell">{supplier.customerServicePhone || '-'}</td>
                          </tr>
                          <tr>
                            <td className="label-cell">Website</td>
                            <td className="value-cell">
                              {supplier.website ? (
                                <a href={supplier.website} target="_blank" rel="noopener noreferrer">
                                  <FaGlobe className="me-1" size={12} />
                                  {supplier.website}
                                </a>
                              ) : '-'}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </div>
                  </Col>

                  <Col lg="6">
                    <div className="info-section">
                      <h6 className="section-title">
                        <FaMapMarkerAlt className="me-2" />
                        Address
                      </h6>
                      {supplier.addressLine1 ? (
                        <div className="address-block">
                          <p className="mb-1">{supplier.addressLine1}</p>
                          {supplier.addressLine2 && (
                            <p className="mb-1">{supplier.addressLine2}</p>
                          )}
                          <p className="mb-1">
                            {[supplier.city, supplier.state, supplier.postalCode]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                          <p className="mb-0">{supplier.country}</p>
                        </div>
                      ) : (
                        <p className="text-muted">No address provided</p>
                      )}
                    </div>

                    {/* Categories */}
                    {supplier.categories && supplier.categories.length > 0 && (
                      <div className="info-section mt-4">
                        <h6 className="section-title">
                          <FaUsers className="me-2" />
                          Categories
                        </h6>
                        <div>
                          {supplier.categories
                            .filter((cat) => cat.parentId === null)
                            .map((cat, index) => (
                              <div key={index} className="mb-2">
                                <Badge color="info" className="me-2">
                                  {cat.categoryName}
                                </Badge>
                                {cat.subCategories && cat.subCategories.length > 0 && (
                                  <div className="ms-3 mt-1">
                                    {cat.subCategories.map((sub, subIndex) => (
                                      <Badge key={subIndex} color="secondary" className="me-1 mb-1">
                                        {sub.categoryName}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </Col>
                </Row>
              </TabPane>

              {/* Company Transactions Tab */}
              <TabPane tabId="transactions">
                {companyTransactions && companyTransactions.length > 0 ? (
                  <div className="table-responsive">
                    <Table hover className="invoice-table">
                      <thead>
                        <tr>
                          <th>Company</th>
                          <th className="text-center">Orders</th>
                          <th className="text-center">RFQs</th>
                          <th className="text-end">Total Order Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companyTransactions.map((transaction, index) => (
                          <tr key={index}>
                            <td className="fw-medium">{transaction.companyName}</td>
                            <td className="text-center">
                              <span className="badge bg-light text-dark border">
                                {transaction.ordersCount || 0}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="badge bg-light text-dark border">
                                {transaction.rfqsCount || 0}
                              </span>
                            </td>
                            <td className="text-end fw-semibold">
                              {formatCurrency(transaction.totalOrderValue, supplier.currency || getCompanyCurrency())}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    {transactionsTotalPages > 1 && (
                      <div className="d-flex justify-content-center mt-3">
                        <ul className="pagination pagination-sm mb-0">
                          <li className={`page-item ${transactionsPage === 0 ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => fetchCompanyTransactions(transactionsPage - 1)}
                            >
                              &lt;
                            </button>
                          </li>
                          {[...Array(transactionsTotalPages)].map((_, index) => (
                            <li
                              key={index}
                              className={`page-item ${index === transactionsPage ? 'active' : ''}`}
                            >
                              <button
                                className="page-link"
                                onClick={() => fetchCompanyTransactions(index)}
                              >
                                {index + 1}
                              </button>
                            </li>
                          ))}
                          <li
                            className={`page-item ${
                              transactionsPage === transactionsTotalPages - 1 ? 'disabled' : ''
                            }`}
                          >
                            <button
                              className="page-link"
                              onClick={() => fetchCompanyTransactions(transactionsPage + 1)}
                            >
                              &gt;
                            </button>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <FaBuilding size={48} className="text-muted mb-3" />
                    <h5 className="text-muted">No Company Transactions</h5>
                    <p className="text-muted">No companies have transactions with this supplier yet.</p>
                  </div>
                )}
              </TabPane>

              {/* Catalogs Tab */}
              <TabPane tabId="catalogs">
                {catalogItems && catalogItems.length > 0 ? (
                  <div className="table-responsive">
                    <Table hover className="invoice-table">
                      <thead>
                        <tr>
                          <th>Part ID</th>
                          <th>Description</th>
                          <th>Manufacturer</th>
                          <th className="text-end">Price</th>
                          <th>UOM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catalogItems.map((item, index) => (
                          <tr key={index}>
                            <td className="fw-medium">{item.partId || item.PartId || '-'}</td>
                            <td>{item.description || item.Description || '-'}</td>
                            <td>{item.manufacturerName || item.ManufacturerName || '-'}</td>
                            <td className="text-end fw-semibold">
                              {formatCurrency(item.unitPrice || item.UnitPrice, item.currency || item.Currency || getCompanyCurrency())}
                            </td>
                            <td>{item.unitOfMeasurement || item.UnitOfMeasurement || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    {catalogsTotalPages > 1 && (
                      <div className="d-flex justify-content-center mt-3">
                        <ul className="pagination pagination-sm mb-0">
                          <li className={`page-item ${catalogsPage === 0 ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => fetchCatalogItems(catalogsPage - 1)}
                            >
                              &lt;
                            </button>
                          </li>
                          {[...Array(catalogsTotalPages)].map((_, index) => (
                            <li
                              key={index}
                              className={`page-item ${index === catalogsPage ? 'active' : ''}`}
                            >
                              <button className="page-link" onClick={() => fetchCatalogItems(index)}>
                                {index + 1}
                              </button>
                            </li>
                          ))}
                          <li
                            className={`page-item ${
                              catalogsPage === catalogsTotalPages - 1 ? 'disabled' : ''
                            }`}
                          >
                            <button
                              className="page-link"
                              onClick={() => fetchCatalogItems(catalogsPage + 1)}
                            >
                              &gt;
                            </button>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <FaShoppingCart size={48} className="text-muted mb-3" />
                    <h5 className="text-muted">No Catalog Items</h5>
                    <p className="text-muted">This supplier has no catalog items.</p>
                  </div>
                )}
              </TabPane>
            </TabContent>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default AdminSupplierView;
