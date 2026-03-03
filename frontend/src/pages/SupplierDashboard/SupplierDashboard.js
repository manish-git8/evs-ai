import { Row, Col, CardBody, Card } from 'reactstrap';
import React, { useEffect, useState, useMemo } from 'react';
import {
  Chart,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
} from 'chart.js';
import Swal from 'sweetalert2';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { FaSort } from 'react-icons/fa';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import * as bootstrap from 'bootstrap';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { Edit, Trash, FileText } from 'react-feather';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import ProgressCards from './ProgressCards';
import PurchaseOrderService from '../../services/PurchaseOrderService';
import CatalogService from '../../services/CatalogService';
import SupplierService from '../../services/SupplierService';
import CatalogItemService from '../../services/CatalogItemService';
import {
  formatCurrency,
  formatDate,
  getEntityId,
  pageSize,
  formatStatusText,
} from '../localStorageUtil';
import { formatDualCurrency } from '../../utils/currencyUtils';

Chart.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
);

const SupplierDashboard = () => {
  const navigate = useNavigate();
  const supplierId = getEntityId();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [purchaseOrdersCurrentPage, setPurchaseOrdersCurrentPage] = useState(0);
  const [purchaseOrdersPageSize] = useState(pageSize || 10);
  const [purchaseOrdersTotalElements, setPurchaseOrdersTotalElements] = useState(0);
  const [catalogs, setCatalogs] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogItemsCurrentPage, setCatalogItemsCurrentPage] = useState(0);
  const [catalogItemsPageSize] = useState(pageSize || 10);
  const [catalogItemsTotalElements, setCatalogItemsTotalElements] = useState(0);
  const [orderId] = useState(null);
  const [setOrderDetails] = useState(null);
  const [selectedCatalog, setSelectedCatalog] = useState(null);
  const [selectedCatalogId, setSelectedCatalogId] = useState(null);
  const [catalogNames, setCatalogNames] = useState({});
  const [sortBy, setSortBy] = useState('purchaseOrderId');
  const [sortOrder, setSortOrder] = useState('desc');
  const [catalogSortBy, setCatalogSortBy] = useState('catalogItemId');
  const [catalogSortOrder, setCatalogSortOrder] = useState('desc');
  const [topCompanies, setTopCompanies] = useState({
    labels: [],
    data: [],
  });
  const [bestSellingProductsData, setBestSellingProductsData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Units Sold',
        backgroundColor: '#2962ff',
        borderColor: '#2962ff',
        data: [],
      },
      {
        label: 'Revenue ($)',
        backgroundColor: '#4fc3f7',
        borderColor: '#4fc3f7',
        data: [],
      },
    ],
  });
  // const [rfqs, setRfqs] = useState([]);
  // const [selectedRfq, setSelectedRfq] = useState(null);
  // const [rfqModal, setRfqModal] = useState(false);
  // const [rfqDetails, setRfqDetails] = useState(null);
  // const [loadingRfqs, setLoadingRfqs] = useState(false);
  // const [loadingDetails, setLoadingDetails] = useState(false);

  // Format catalog item price with item's own currency
  const formatCatalogPrice = (cell, row) => {
    return formatCurrency(cell || 0, row?.Currency || 'USD');
  };

  const handleCatalogSort = (field) => {
    const newOrder = catalogSortBy === field && catalogSortOrder === 'asc' ? 'desc' : 'asc';
    setCatalogSortBy(field);
    setCatalogSortOrder(newOrder);
  };

  const renderCatalogSortIcon = (field) => {
    if (catalogSortBy === field) {
      return catalogSortOrder === 'asc' ? <FaSort /> : <FaSort />;
    }
    return <FaSort />;
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
      if (val.name) return val.name;
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
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(field);
    setSortOrder(newOrder);
  };

  const renderSortIcon = (field) => {
    if (sortBy === field) return sortOrder === 'asc' ? <FaSort /> : <FaSort />;
    return <FaSort />;
  };

  const fetchCatalogItems = async (pageNumber = 0) => {
    try {
      let data;
      if (selectedCatalogId) {
        data = await CatalogItemService.getCatalogItemsByCatalogId(selectedCatalogId, {
          pageSize: catalogItemsPageSize,
          pageNumber,
          sortBy: catalogSortBy,
          order: catalogSortOrder.toUpperCase(),
        });
      } else {
        data = await CatalogItemService.getSupplierCatalogItemsPaginated(supplierId, {
          pageSize: catalogItemsPageSize,
          pageNumber,
          sortBy: catalogSortBy,
          order: catalogSortOrder.toUpperCase(),
        });
      }
      if (data && data.content) {
        setCatalogItems(data.content);
        setCatalogItemsCurrentPage(data.pageNumber || pageNumber);
        setCatalogItemsTotalElements(data.totalElements || 0);
      } else if (Array.isArray(data)) {
        setCatalogItems(data);
        setCatalogItemsCurrentPage(0);
        setCatalogItemsTotalElements(data.length);
      } else {
        setCatalogItems([]);
        setCatalogItemsCurrentPage(0);
        setCatalogItemsTotalElements(0);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchCatalogItems();
  }, []);

  const handleEditCatalogItem = (CatalogItemId) => {
    navigate(`/catalog-item/${CatalogItemId}?dashboard=true`);
  };

  const handleCatalogItemDelete = async (row) => {
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
        await CatalogItemService.deleteCatalogItem(row.CatalogItemId);
        Swal.fire('Deleted!', 'Catalog item has been deleted.', 'success');
        fetchCatalogItems();
      }
    } catch (error) {
      console.error('Error deleting catalog item:', error);
      Swal.fire('Error!', 'There was an issue deleting the item.', 'error');
    }
  };

  useEffect(() => {
    const fetchCatalogNames = async () => {
      try {
        const response = await CatalogService.getSupplierCatalogs(supplierId);
        const list = Array.isArray(response?.data?.content) ? response.data.content : [];
        const catalogMap = {};
        list.forEach((catalog) => {
          catalogMap[catalog.catalogId] = catalog.name;
        });
        setCatalogNames(catalogMap);
        setCatalogs(list);
      } catch (error) {
        console.error('Error fetching catalog names:', error);
        setCatalogs([]);
      }
    };
    fetchCatalogNames();
  }, [supplierId]);

  const handleCatalogSearchChange = (selectedOption) => {
    setSelectedCatalog(selectedOption);
    setSelectedCatalogId(selectedOption?.value || null);
  };

  useEffect(() => {
    fetchCatalogItems(0);
  }, [selectedCatalogId, catalogSortBy, catalogSortOrder]);

  // const fetchRfqs = async () => {
  //   try {
  //     const response = await RqfService.getSupplierRfq(supplierId);
  //     setRfqs(response.data);
  //   } catch (error) {
  //     console.error('Error fetching RFQs:', error);
  //     toast.error('Failed to load RFQs');
  //   } finally {
  //     // setLoadingRfqs(false);
  //   }
  // };

  // useEffect(() => {
  //   fetchRfqs()
  // }, []);

  const fetchBestSellingProducts = async () => {
    try {
      const currentMonth = new Date().getMonth();
      const startDate = new Date();
      const endDate = new Date();
      if (currentMonth >= 0 && currentMonth <= 3) {
        startDate.setMonth(0, 1);
        endDate.setMonth(3, 30);
      } else if (currentMonth >= 4 && currentMonth <= 7) {
        startDate.setMonth(4, 1);
        endDate.setMonth(7, 31);
      } else if (currentMonth >= 8 && currentMonth <= 11) {
        startDate.setMonth(8, 1);
        endDate.setMonth(11, 31);
      }
      const formattedStartDate = startDate.toISOString();
      const formattedEndDate = endDate.toISOString();
      const topNumber = 5;
      const response = await SupplierService.getTopProducts(
        supplierId,
        formattedStartDate,
        formattedEndDate,
        topNumber,
      );

      if (response && response.data) {
        const { data } = response;
        setBestSellingProductsData({
          labels: data.map((item) => item.description),
          datasets: [
            {
              label: 'Units Sold',
              backgroundColor: '#2962ff',
              borderColor: '#2962ff',
              data: data.map((item) => item.totalUnits),
            },
            {
              label: 'Revenue ($)',
              backgroundColor: '#4fc3f7',
              borderColor: '#4fc3f7',
              data: data.map((item) => item.totalRevenue),
            },
          ],
        });
      }
    } catch (error) {
      console.error('Error fetching best-selling products:', error);
    }
  };

  useEffect(() => {
    fetchBestSellingProducts();
  }, [supplierId]);

  const fetchPurchaseOrders = async (pageNumber = 0, search = '') => {
    try {
      const response = await PurchaseOrderService.getSupplierPurchaseOrdersPaginated(supplierId, {
        pageSize: purchaseOrdersPageSize,
        pageNumber,
        search,
        sortBy,
        order: sortOrder,
      });
      if (response.data && response.data.content) {
        setPurchaseOrders(response.data.content);
        setPurchaseOrdersCurrentPage(response.data.pageNumber || pageNumber);
        setPurchaseOrdersTotalElements(response.data.totalElements || 0);
      } else if (response.data && Array.isArray(response.data)) {
        setPurchaseOrders(response.data);
        setPurchaseOrdersCurrentPage(0);
        setPurchaseOrdersTotalElements(response.data.length);
      } else {
        setPurchaseOrders([]);
        setPurchaseOrdersCurrentPage(0);
        setPurchaseOrdersTotalElements(0);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders(0, debouncedSearchTerm);
  }, [debouncedSearchTerm, supplierId, sortBy, sortOrder]);

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // removed duplicate catalogs fetch; handled in catalog names fetch above

  const handleAddNew = () => {
    navigate('/catalog-item?dashboard=true');
  };

  useEffect(() => {
    const fetchTopCompanies = async () => {
      try {
        const currentMonth = new Date().getMonth();
        const startDate = new Date();
        const endDate = new Date();
        if (currentMonth >= 0 && currentMonth <= 2) {
          startDate.setMonth(0, 1);
          endDate.setMonth(2, 31);
        } else if (currentMonth >= 3 && currentMonth <= 5) {
          startDate.setMonth(3, 1);
          endDate.setMonth(5, 30);
        } else if (currentMonth >= 6 && currentMonth <= 8) {
          startDate.setMonth(6, 1);
          endDate.setMonth(8, 30);
        } else if (currentMonth >= 9 && currentMonth <= 11) {
          startDate.setMonth(9, 1);
          endDate.setMonth(11, 31);
        }
        const formattedStartDate = startDate.toISOString();
        const formattedEndDate = endDate.toISOString();
        const response = await PurchaseOrderService.getTopCompanies(
          supplierId,
          formattedStartDate,
          formattedEndDate,
        );

        if (response.data) {
          const companies = response.data;
          setTopCompanies({
            labels: companies.map((company) => company.companyName),
            data: companies.map((company) => company.totalAmount),
          });
        }
      } catch (error) {
        console.error('Error fetching top companies:', error);
      }
    };
    fetchTopCompanies();
  }, [supplierId]);

  const horizontalBarData = {
    labels: topCompanies.labels,
    datasets: [
      {
        label: 'Purchase Order Revenue',
        backgroundColor: ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#4bc0c0'],
        borderColor: '#ffffff',
        borderWidth: 1,
        data: topCompanies.data,
      },
    ],
  };

  const handleInvoiceOK = (purchaseOrderId) => {
    navigate(`/invoice/${purchaseOrderId}`);
  };

  const renderPOActionButtons = (cell, row) => {
    const hasConfirmedQuantity = row.orderItemDetails?.some((item) => item.quantityConfirmed > 0);

    return (
      <div className="d-flex justify-content-center">
        <button
          type="button"
          className="btn btn-sm btn-primary me-2 action-button-edit"
          onClick={(e) => {
            e.stopPropagation();
            handleInvoiceOK(row.PurchaseOrderId);
          }}
          data-bs-toggle="tooltip"
          data-bs-placement="top"
          title="Create Invoice"
          disabled={!hasConfirmedQuantity}
          style={
            !hasConfirmedQuantity
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
          <FileText size={15} />
        </button>
      </div>
    );
  };

  const renderCatalogActionButtons = (cell, row) => (
    <div className="d-flex justify-content-center">
      <button
        type="button"
        className="btn btn-sm btn-primary me-2 action-button-edit"
        onClick={() => handleEditCatalogItem(row.CatalogItemId)}
        data-bs-toggle="tooltip"
        data-bs-placement="top"
        title="Edit Catalog Item"
      >
        <Edit size={14} />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-danger action-button-delete"
        onClick={() => handleCatalogItemDelete(row)}
        data-bs-toggle="tooltip"
        data-bs-placement="top"
        title="Delete Catalog Item"
      >
        <Trash size={14} />
      </button>
    </div>
  );
  function handleRowClick(row) {
    navigate(`/supplier-purchase-order-details/${row.PurchaseOrderId}`);
  }

  const poOptions = {
    hideSizePerPage: true,
    paginationPosition: 'bottom',
    page: purchaseOrdersCurrentPage + 1,
    sizePerPage: purchaseOrdersPageSize,
    totalSize: purchaseOrdersTotalElements,
    onPageChange: (page) => {
      const pageIndex = page - 1;
      setPurchaseOrdersCurrentPage(pageIndex);
      fetchPurchaseOrders(pageIndex, debouncedSearchTerm);
    },
    onRowClick: handleRowClick,
    paginationShowsTotal: false,
  };

  const catalogItemOptions = {
    hideSizePerPage: true,
    paginationPosition: 'bottom',
    page: catalogItemsCurrentPage + 1,
    sizePerPage: catalogItemsPageSize,
    totalSize: catalogItemsTotalElements,
    paginationShowsTotal: false,
    onPageChange: (page) => {
      const pageIndex = page - 1;
      setCatalogItemsCurrentPage(pageIndex);
      fetchCatalogItems(pageIndex);
    },
  };

  const catalogOptions = Array.isArray(catalogs)
    ? catalogs.map((catalog) => ({ value: catalog.catalogId, label: catalog.name }))
    : [];

  // duplicate catalogs fetch removed; handled earlier where names are loaded

  const fetchOrderDetails = async (id) => {
    try {
      const response = await PurchaseOrderService.getPurchaseOrderById(supplierId, id);
      setOrderDetails(response.data[0]);
    } catch (error) {
      console.error('Error fetching order details:', error);
      setOrderDetails(null);
    }
  };

  const formatAmount = (value) => {
    if (value >= 1e7) {
      return `${(value / 1e7).toFixed(1)}Cr`;
    }
    if (value >= 1e5) {
      return `${(value / 1e5).toFixed(1)}L`;
    }
    if (value >= 1e3) {
      return `${(value / 1e3).toFixed(1)}K`;
    }
    return value.toString();
  };

  // Format dual currency for purchase order row (supplier currency first, company currency in brackets)
  const formatPOAmount = (row) => {
    const supplierCurrency = row.originalCurrencyCode || row.supplier?.currency || row.currencyCode || 'USD';
    const companyCurrency = row.convertedCurrencyCode || row.company?.currency || 'USD';
    const originalAmount = row.originalOrderAmount !== undefined && row.originalOrderAmount !== null
      ? row.originalOrderAmount
      : row.orderTotal || 0;
    const convertedAmount = row.convertedOrderAmount !== undefined && row.convertedOrderAmount !== null
      ? row.convertedOrderAmount
      : row.orderTotal || 0;

    // If same currency or no conversion data, show single currency
    if (supplierCurrency === companyCurrency || row.convertedOrderAmount === undefined) {
      return formatCurrency(originalAmount, supplierCurrency);
    }

    // Show dual currency
    return formatDualCurrency({
      originalPrice: originalAmount,
      originalCurrency: supplierCurrency,
      convertedPrice: convertedAmount,
      convertedCurrency: companyCurrency,
    }, 'supplier');
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails(orderId);
    }
  }, [orderId]);

  useEffect(() => {
    fetchPurchaseOrders(0, '');
    fetchCatalogItems(0);
  }, []);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails(orderId);
    }
  }, [orderId]);

  useEffect(() => {
    const tooltipTriggerList = [...document.querySelectorAll('[data-bs-toggle="tooltip"]')];
    tooltipTriggerList.forEach((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl));

    return () => {
      tooltipTriggerList.forEach((tooltipTriggerEl) => {
        const tooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
        if (tooltip) {
          tooltip.dispose();
        }
      });
    };
  }, []);

  return (
    <div style={{ paddingTop: '40px' }}>
      {/* Enhanced Welcome Section */}
      <Row className="mb-3">
        <Col lg="12">
          <Card
            className="welcome-card"
            style={{
              backgroundColor: '#009efb',
              color: 'white',
              border: 'none',
              borderRadius: '15px',
              boxShadow: '0 4px 20px rgba(0, 158, 251, 0.15)',
            }}
          >
            <CardBody className="py-3">
              <Row className="align-items-center">
                <Col md="8">
                  <h3 className="mb-2 fw-bold">Welcome to Dashboard! 👋</h3>
                  <p className="mb-0 opacity-90">
                    Manage your purchase orders, catalogs, and track your business performance.
                  </p>
                </Col>
                <Col md="4" className="text-end d-none d-md-block">
                  <div className="welcome-stats">
                    <div className="d-flex gap-3 justify-content-end">
                      <div className="text-center">
                        <div className="h4 mb-1 fw-bold text-white">{purchaseOrders.length}</div>
                        <small className="text-white opacity-75">Active POs</small>
                      </div>
                      <div className="text-center">
                        <div className="h4 mb-1 fw-bold text-white">{catalogItems.length}</div>
                        <small className="text-white opacity-75">Catalog Items</small>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>

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

      <div className="mb-3">
        <ProgressCards />
      </div>

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
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
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
                    <i
                      className="bi bi-file-earmark-text text-white"
                      style={{ fontSize: '18px' }}
                    ></i>
                  </div>
                  <div>
                    <h4 className="mb-0" style={{ fontWeight: '600', color: '#2c3e50' }}>
                      Purchase Orders
                    </h4>
                    <small className="text-muted">Manage and track all purchase orders</small>
                  </div>
                </div>
                <div style={{ minWidth: '250px' }}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    placeholder="Search by company..."
                    className="form-control"
                    style={{ borderRadius: '8px' }}
                  />
                </div>
              </div>
              <div className="table-responsive">
                <BootstrapTable
                  data={purchaseOrders}
                  striped
                  hover
                  condensed
                  pagination={purchaseOrdersTotalElements > purchaseOrdersPageSize}
                  remote
                  fetchInfo={{
                    dataTotalSize: purchaseOrdersTotalElements,
                  }}
                  options={poOptions}
                  tableHeaderClass="mb-0"
                >
                  <TableHeaderColumn
                    dataField="company"
                    dataFormat={(cell) => cell?.name || 'N/A'}
                    dataAlign="left"
                    headerAlign="left"
                    width="20%"
                    thStyle={{ cursor: 'pointer' }}
                    isKey
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>Company</div>
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="orderNo"
                    dataAlign="left"
                    headerAlign="left"
                    width="15%"
                    thStyle={{ cursor: 'pointer' }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleSort('orderNo')}
                    >
                      Order No {renderSortIcon('orderNo')}
                    </div>
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="orderStatus"
                    dataFormat={(cell) => (
                      <span
                        className={`badge ${
                          cell === 'APPROVED' || cell === 'CONFIRMED'
                            ? 'bg-success'
                            : cell === 'PARTIALLY_CONFIRMED'
                            ? 'bg-partially-confirmed'
                            : cell === 'REJECTED'
                            ? 'bg-danger'
                            : 'bg-warning'
                        }`}
                      >
                        {formatStatusText(cell)}
                      </span>
                    )}
                    dataAlign="left"
                    headerAlign="left"
                    width="15%"
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleSort('orderStatus')}
                    >
                      Order Status {renderSortIcon('orderStatus')}
                    </div>
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="deliveryDate"
                    dataFormat={formatDate}
                    dataAlign="left"
                    headerAlign="left"
                    width="15%"
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleSort('deliveryDate')}
                    >
                      Needed By {renderSortIcon('deliveryDate')}
                    </div>
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="orderTotal"
                    dataFormat={(cell, row) => formatPOAmount(row)}
                    dataAlign="left"
                    headerAlign="left"
                    width="15%"
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleSort('orderTotal')}
                    >
                      Total Amount {renderSortIcon('orderTotal')}
                    </div>
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="orderPlacedDate"
                    dataFormat={formatDate}
                    dataAlign="left"
                    headerAlign="left"
                    width="12%"
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleSort('orderPlacedDate')}
                    >
                      Order Date {renderSortIcon('orderPlacedDate')}
                    </div>
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataFormat={renderPOActionButtons}
                    dataAlign="left"
                    headerAlign="center"
                    width="11%"
                  >
                    Actions
                  </TableHeaderColumn>
                </BootstrapTable>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col md="12">
          <Card
            className="enhanced-card"
            style={{
              borderRadius: '15px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: 'none',
            }}
          >
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="icon-wrapper"
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#28a745',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid rgba(40, 167, 69, 0.1)',
                    }}
                  >
                    <i className="bi bi-grid text-white" style={{ fontSize: '18px' }}></i>
                  </div>
                  <div>
                    <h4 className="mb-0" style={{ fontWeight: '600', color: '#2c3e50' }}>
                      My Catalog
                    </h4>
                    <small className="text-muted">Browse and manage your product catalog</small>
                  </div>
                </div>
                <div className="d-flex align-items-center" style={{ gap: '12px' }}>
                  <div style={{ minWidth: '220px' }}>
                    <Select
                      options={catalogOptions}
                      value={selectedCatalog}
                      onChange={handleCatalogSearchChange}
                      isClearable
                      placeholder="Search by Catalog Name..."
                      className="w-100"
                      styles={{
                        control: (base) => ({
                          ...base,
                          border: '1px solid #ced4da',
                          borderRadius: '8px',
                          '&:hover': { borderColor: '#80bdff' },
                          height: '38px',
                          minHeight: '38px',
                        }),
                        menu: (base) => ({
                          ...base,
                          zIndex: 1050,
                        }),
                      }}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={handleAddNew}
                    style={{
                      borderRadius: '8px',
                      padding: '8px 20px',
                      boxShadow: '0 2px 8px rgba(0, 158, 251, 0.3)',
                    }}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Add New
                  </button>
                </div>
              </div>
              <div className="table-responsive">
                <BootstrapTable
                  striped
                  hover
                  condensed
                  data={catalogItems}
                  pagination={catalogItemsTotalElements > catalogItemsPageSize}
                  remote
                  fetchInfo={{
                    dataTotalSize: catalogItemsTotalElements,
                  }}
                  options={catalogItemOptions}
                  tableHeaderClass="mb-0"
                >
                  <TableHeaderColumn
                    isKey
                    width="10%"
                    dataField="PartId"
                    dataAlign="left"
                    headerAlign="left"
                    thStyle={{ cursor: 'pointer' }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleCatalogSort('partId')}
                    >
                      Part Id {renderCatalogSortIcon('partId')}
                    </div>
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    width="13%"
                    dataField="CatalogId"
                    dataAlign="left"
                    headerAlign="left"
                    dataFormat={(cell) => catalogNames[cell] || 'N/A'}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleCatalogSort('catalog')}
                    >
                      Catalog Name {renderCatalogSortIcon('catalog')}
                    </div>
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    width="18%"
                    dataField="Description"
                    dataAlign="left"
                    headerAlign="left"
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleCatalogSort('description')}
                    >
                      Description {renderCatalogSortIcon('description')}
                    </div>
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    width="15%"
                    dataField="UnitOfMeasurement"
                    dataAlign="left"
                    headerAlign="left"
                    dataFormat={(cell) => cell || 'N/A'}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleCatalogSort('unitOfMeasurement')}
                    >
                      Unit of Measurement {renderCatalogSortIcon('unitOfMeasurement')}
                    </div>
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    width="13%"
                    dataField="QuantityPerUnit"
                    dataAlign="left"
                    headerAlign="left"
                    dataFormat={(cell) => cell || 'N/A'}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleCatalogSort('quantityPerUnit')}
                    >
                      Quantity Per Unit {renderCatalogSortIcon('quantityPerUnit')}
                    </div>
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    width="10%"
                    dataField="InStock"
                    dataAlign="left"
                    headerAlign="left"
                    dataFormat={(cell) => (
                      <span className={`badge ${cell ? 'bg-success' : 'bg-danger'}`}>
                        {cell ? 'Yes' : 'No'}
                      </span>
                    )}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleCatalogSort('inStock')}
                    >
                      In Stock {renderCatalogSortIcon('inStock')}
                    </div>
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    width="11%"
                    dataField="UnitPrice"
                    dataAlign="right"
                    headerAlign="right"
                    dataFormat={formatCatalogPrice}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}
                      onClick={() => handleCatalogSort('unitPrice')}
                    >
                      Unit Price {renderCatalogSortIcon('unitPrice')}
                    </div>
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    dataFormat={renderCatalogActionButtons}
                    dataAlign="center"
                    headerAlign="center"
                    width="10%"
                  >
                    Actions
                  </TableHeaderColumn>
                </BootstrapTable>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
      <Row>
        {/* <Col md="4">
          <ComponentCard title="Quarterly Revenue">
            <div className="chart-wrapper" style={{ width: '100%', margin: '0 auto', height: 250 }}>
              <Bar
                data={barData}
                options={{
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  scales: {
                    x: {
                      ticks: {
                        fontFamily: 'Nunito Sans, sans-serif',
                        fontColor: '#8898aa',
                        beginAtZero: true,
                      },
                      grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                      },
                    },
                    y: {
                      ticks: {
                        fontFamily: 'Nunito Sans, sans-serif',
                        fontColor: '#8898aa',
                      },
                      grid: {
                        display: false,
                      },
                    },
                  },
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                }}
              />
            </div>
          </ComponentCard>
        </Col> */}
        {bestSellingProductsData?.labels?.length > 2 && (
          <Col md="4">
            <Card
              className="enhanced-card"
              style={{
                borderRadius: '15px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: 'none',
              }}
            >
              <CardBody>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#17a2b8',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i className="bi bi-bar-chart text-white" style={{ fontSize: '16px' }}></i>
                  </div>
                  <h5 className="mb-0" style={{ fontWeight: '600', color: '#2c3e50' }}>
                    Best Selling Products
                  </h5>
                </div>
                <div
                  className="chart-wrapper"
                  style={{ width: '100%', margin: '0 auto', height: 250 }}
                >
                  <Bar
                    data={bestSellingProductsData}
                    options={{
                      maintainAspectRatio: false,
                      legend: {
                        display: true,
                        labels: {
                          fontFamily: 'Nunito Sans, sans-serif',
                          fontColor: '#8898aa',
                        },
                      },
                      scales: {
                        y: {
                          grid: { display: false },
                          ticks: {
                            fontFamily: 'Nunito Sans, sans-serif',
                            fontColor: '#8898aa',
                            callback: (value) => formatAmount(value),
                          },
                        },
                        x: {
                          grid: { display: false },
                          ticks: {
                            fontFamily: 'Nunito Sans, sans-serif',
                            fontColor: '#8898aa',
                            callback: (value) => {
                              const label = bestSellingProductsData.labels[value];
                              return label.length > 10 ? `${label.substring(0, 10)}...` : label;
                            },
                          },
                        },
                      },
                      tooltips: {
                        callbacks: {
                          title: ([tooltipItem]) => {
                            const { index } = tooltipItem;
                            return bestSellingProductsData.labels[index];
                          },
                          label: (context) => `Units Sold: ${formatAmount(context.raw)}`,
                        },
                      },
                    }}
                  />
                </div>
              </CardBody>
            </Card>
          </Col>
        )}
        {horizontalBarData?.labels?.length > 2 && (
          <Col md="4">
            <Card
              className="enhanced-card"
              style={{
                borderRadius: '15px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: 'none',
              }}
            >
              <CardBody>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#6610f2',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i className="bi bi-building text-white" style={{ fontSize: '16px' }}></i>
                  </div>
                  <h5 className="mb-0" style={{ fontWeight: '600', color: '#2c3e50' }}>
                    Top 5 Companies
                  </h5>
                </div>
                <div
                  className="chart-wrapper"
                  style={{ width: '100%', margin: '0 auto', height: 250 }}
                >
                  <Bar
                    data={horizontalBarData}
                    options={{
                      indexAxis: 'y',
                      maintainAspectRatio: false,
                      legend: {
                        display: false,
                      },
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const value = context.raw;
                              return `Total Revenue: ${formatAmount(value)}`;
                            },
                          },
                        },
                      },
                      scales: {
                        x: {
                          title: {
                            display: true,
                            text: 'Total Company Revenue',
                            font: {
                              family: 'Nunito Sans, sans-serif',
                              size: 14,
                            },
                            color: '#8898aa',
                          },
                          ticks: {
                            fontFamily: 'Nunito Sans, sans-serif',
                            fontColor: '#8898aa',
                            callback: (value) => formatAmount(value),
                          },
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'Companies',
                            font: {
                              family: 'Nunito Sans, sans-serif',
                              size: 14,
                            },
                            color: '#8898aa',
                          },
                          ticks: {
                            fontFamily: 'Nunito Sans, sans-serif',
                            fontColor: '#8898aa',
                            callback: (value) => {
                              const label = horizontalBarData.labels[value];
                              return label.length > 10 ? `${label.substring(0, 10)}...` : label;
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
              </CardBody>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default SupplierDashboard;
