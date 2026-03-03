import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  CardBody,
  Badge,
  Button,
  Spinner,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  Table,
  Pagination,
  PaginationItem,
  PaginationLink,
  Modal,
  ModalHeader,
  ModalBody,
} from 'reactstrap';
import {
  Mail,
  Phone,
  MapPin,
  Star,
  Globe,
  Truck,
  Award,
  ArrowLeft,
  Edit2,
  ShoppingCart,
  FileText,
  Package,
  Search,
  X,
  User,
  Image,
  ExternalLink,
} from 'react-feather';
import SupplierService from '../../services/SupplierService';
import FeedBackService from '../../services/FeedBackService';
import CartService from '../../services/CartService';
import RfqService from '../../services/RfqService';
import PurchaseOrderService from '../../services/PurchaseOrderService';
import FileUploadService from '../../services/FileUploadService';
import { getEntityId, formatCurrency } from '../localStorageUtil';

const PAGE_SIZE = 10;

const SupplierDetail = () => {
  const { supplierId } = useParams();
  const navigate = useNavigate();
  const companyId = getEntityId();

  const [supplier, setSupplier] = useState(null);
  const [supplierRatings, setSupplierRatings] = useState(null);
  const [allFeedbacks, setAllFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [ratingsModalOpen, setRatingsModalOpen] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState({});
  const [attachmentLoading, setAttachmentLoading] = useState({});

  // Tab state
  const [activeTab, setActiveTab] = useState('carts');

  // Carts state
  const [carts, setCarts] = useState([]);
  const [cartsLoading, setCartsLoading] = useState(false);
  const [cartsPage, setCartsPage] = useState(0);
  const [cartsTotalPages, setCartsTotalPages] = useState(0);
  const [cartsTotalElements, setCartsTotalElements] = useState(0);

  // RFQs state
  const [rfqs, setRfqs] = useState([]);
  const [rfqsLoading, setRfqsLoading] = useState(false);
  const [rfqsPage, setRfqsPage] = useState(0);
  const [rfqsTotalPages, setRfqsTotalPages] = useState(0);
  const [rfqsTotalElements, setRfqsTotalElements] = useState(0);

  // Purchase Orders state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(0);
  const [ordersTotalPages, setOrdersTotalPages] = useState(0);
  const [ordersTotalElements, setOrdersTotalElements] = useState(0);

  // Search state for all tabs
  const [cartsSearchTerm, setCartsSearchTerm] = useState('');
  const [rfqsSearchTerm, setRfqsSearchTerm] = useState('');
  const [ordersSearchTerm, setOrdersSearchTerm] = useState('');

  useEffect(() => {
    const fetchSupplierDetails = async () => {
      if (!supplierId || !companyId) return;

      setLoading(true);
      try {
        const response = await SupplierService.getSupplierById(supplierId);
        const supplierData = response.data?.[0] || response.data;
        setSupplier(supplierData);

        // Fetch ratings - use companyId to get individual feedbacks with notes
        setRatingsLoading(true);
        try {
          const ratingsResponse = await FeedBackService.getAllFeedbackForSupplierByCompany(supplierId, companyId);
          const feedbacks = ratingsResponse.data || [];
          setAllFeedbacks(feedbacks);
          if (feedbacks.length > 0) {
            const avgRatings = {
              overallRating: 0,
              deliveryPerformanceRating: 0,
              qualityRating: 0,
              pricingCostTransparencyRating: 0,
              communicationResponsivenessRating: 0,
              totalReviews: feedbacks.length,
            };
            feedbacks.forEach((fb) => {
              avgRatings.overallRating += fb.overallRating || 0;
              avgRatings.deliveryPerformanceRating += fb.deliveryPerformanceRating || 0;
              avgRatings.qualityRating += fb.qualityRating || 0;
              avgRatings.pricingCostTransparencyRating += fb.pricingCostTransparencyRating || 0;
              avgRatings.communicationResponsivenessRating += fb.communicationResponsivenessRating || 0;
            });
            avgRatings.overallRating = (avgRatings.overallRating / feedbacks.length).toFixed(1);
            avgRatings.deliveryPerformanceRating = (avgRatings.deliveryPerformanceRating / feedbacks.length).toFixed(1);
            avgRatings.qualityRating = (avgRatings.qualityRating / feedbacks.length).toFixed(1);
            avgRatings.pricingCostTransparencyRating = (avgRatings.pricingCostTransparencyRating / feedbacks.length).toFixed(1);
            avgRatings.communicationResponsivenessRating = (avgRatings.communicationResponsivenessRating / feedbacks.length).toFixed(1);
            setSupplierRatings(avgRatings);
          }
        } catch (error) {
          console.error('Error fetching ratings:', error);
        } finally {
          setRatingsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching supplier:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSupplierDetails();
  }, [supplierId, companyId]);

  // Fetch all tabs data on initial page load to get counts
  useEffect(() => {
    if (supplierId && companyId) {
      fetchCarts(0, '');
      fetchRfqs(0, '');
      fetchOrders(0, '');
    }
  }, [supplierId, companyId]);

  // Fetch carts when page changes or search changes (after initial load)
  useEffect(() => {
    if (activeTab === 'carts' && supplierId && companyId) {
      const timeoutId = setTimeout(() => {
        fetchCarts(cartsPage, cartsSearchTerm);
      }, cartsSearchTerm ? 500 : 0);
      return () => clearTimeout(timeoutId);
    }
  }, [activeTab, cartsPage, cartsSearchTerm]);

  // Fetch RFQs when page changes or search changes (after initial load)
  useEffect(() => {
    if (activeTab === 'rfqs' && supplierId && companyId) {
      const timeoutId = setTimeout(() => {
        fetchRfqs(rfqsPage, rfqsSearchTerm);
      }, rfqsSearchTerm ? 500 : 0);
      return () => clearTimeout(timeoutId);
    }
  }, [activeTab, rfqsPage, rfqsSearchTerm]);

  // Fetch Orders when page changes or search changes (after initial load)
  useEffect(() => {
    if (activeTab === 'orders' && supplierId && companyId) {
      const timeoutId = setTimeout(() => {
        fetchOrders(ordersPage, ordersSearchTerm);
      }, ordersSearchTerm ? 500 : 0);
      return () => clearTimeout(timeoutId);
    }
  }, [activeTab, ordersPage, ordersSearchTerm]);

  // Load attachment thumbnails when ratings modal opens
  useEffect(() => {
    if (ratingsModalOpen && allFeedbacks.length > 0) {
      const feedbacksWithDocs = allFeedbacks.filter(fb => fb.documentId);
      feedbacksWithDocs.forEach(async (feedback) => {
        const docId = feedback.documentId;
        // Skip if already loaded or loading
        if (attachmentUrls[docId] || attachmentLoading[docId]) return;

        setAttachmentLoading(prev => ({ ...prev, [docId]: true }));
        try {
          const response = await FileUploadService.getFileByFileId(docId, { silent: true });
          const blob = response.data;
          const url = URL.createObjectURL(blob);
          setAttachmentUrls(prev => ({ ...prev, [docId]: { url, type: blob.type } }));
        } catch (error) {
          console.error('Error loading attachment:', error);
        } finally {
          setAttachmentLoading(prev => ({ ...prev, [docId]: false }));
        }
      });
    }
  }, [ratingsModalOpen, allFeedbacks]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(attachmentUrls).forEach(attachment => {
        if (attachment?.url) {
          URL.revokeObjectURL(attachment.url);
        }
      });
    };
  }, []);

  const fetchCarts = async (page, searchTerm = '') => {
    setCartsLoading(true);
    try {
      const response = await CartService.getCartsBySupplier(companyId, supplierId, PAGE_SIZE, page, searchTerm);
      setCarts(response.data?.content || []);
      setCartsTotalPages(response.data?.totalPages || 0);
      setCartsTotalElements(response.data?.totalElements || 0);
    } catch (error) {
      console.error('Error fetching carts:', error);
      setCarts([]);
    } finally {
      setCartsLoading(false);
    }
  };

  const fetchRfqs = async (page, searchTerm = '') => {
    setRfqsLoading(true);
    try {
      const response = await RfqService.getRfqsBySupplier(companyId, supplierId, PAGE_SIZE, page, searchTerm);
      setRfqs(response.data?.content || []);
      setRfqsTotalPages(response.data?.totalPages || 0);
      setRfqsTotalElements(response.data?.totalElements || 0);
    } catch (error) {
      console.error('Error fetching RFQs:', error);
      setRfqs([]);
    } finally {
      setRfqsLoading(false);
    }
  };

  const fetchOrders = async (page, searchTerm = '') => {
    setOrdersLoading(true);
    try {
      const response = await PurchaseOrderService.getPurchaseOrdersBySupplier(companyId, supplierId, PAGE_SIZE, page, searchTerm);
      setOrders(response.data?.content || []);
      setOrdersTotalPages(response.data?.totalPages || 0);
      setOrdersTotalElements(response.data?.totalElements || 0);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Handle search change and reset page
  const handleCartsSearchChange = (e) => {
    setCartsSearchTerm(e.target.value);
    setCartsPage(0);
  };

  const handleRfqsSearchChange = (e) => {
    setRfqsSearchTerm(e.target.value);
    setRfqsPage(0);
  };

  const handleOrdersSearchChange = (e) => {
    setOrdersSearchTerm(e.target.value);
    setOrdersPage(0);
  };

  // Open attachment in new tab
  const handleOpenAttachment = (documentId) => {
    const attachment = attachmentUrls[documentId];
    if (attachment?.url) {
      window.open(attachment.url, '_blank');
    }
  };

  // Check if attachment is an image type
  const isImageType = (type) => {
    return type && type.startsWith('image/');
  };

  const renderStars = (rating) => {
    const stars = [];
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalfStar = numRating % 1 >= 0.5;
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} size={16} fill="#ffc107" color="#ffc107" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} size={16} fill="#ffc107" color="#ffc107" style={{ clipPath: 'inset(0 50% 0 0)' }} />);
      } else {
        stars.push(<Star key={i} size={16} color="#e0e0e0" />);
      }
    }
    return stars;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };


  const getStatusBadgeColor = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('completed') || statusLower.includes('approved') || statusLower.includes('delivered')) return 'success';
    if (statusLower.includes('pending') || statusLower.includes('draft') || statusLower.includes('created')) return 'warning';
    if (statusLower.includes('rejected') || statusLower.includes('cancelled')) return 'danger';
    if (statusLower.includes('submitted') || statusLower.includes('processing')) return 'info';
    return 'secondary';
  };

  const handleBack = () => {
    navigate('/suppliers');
  };

  const handleEdit = () => {
    navigate('/suppliers', { state: { editSupplierId: supplierId } });
  };

  const toggleTab = (tab) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
    }
  };

  const renderPagination = (currentPage, totalPages, onPageChange) => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(0, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <Pagination className="justify-content-center mt-3" size="sm">
        <PaginationItem disabled={currentPage === 0}>
          <PaginationLink first onClick={() => onPageChange(0)} />
        </PaginationItem>
        <PaginationItem disabled={currentPage === 0}>
          <PaginationLink previous onClick={() => onPageChange(currentPage - 1)} />
        </PaginationItem>
        {pages.map((page) => (
          <PaginationItem key={page} active={page === currentPage}>
            <PaginationLink onClick={() => onPageChange(page)}>{page + 1}</PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem disabled={currentPage >= totalPages - 1}>
          <PaginationLink next onClick={() => onPageChange(currentPage + 1)} />
        </PaginationItem>
        <PaginationItem disabled={currentPage >= totalPages - 1}>
          <PaginationLink last onClick={() => onPageChange(totalPages - 1)} />
        </PaginationItem>
      </Pagination>
    );
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner color="primary" />
        <span className="ms-2">Loading supplier details...</span>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="text-center py-5">
        <Truck size={48} className="text-muted mb-3" />
        <h5 className="text-muted">Supplier not found</h5>
        <Button color="primary" onClick={handleBack} className="mt-3">
          <ArrowLeft size={16} className="me-2" />
          Back to Suppliers
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header Card with Supplier Info, Contact & Address */}
      <Card className="mb-4" style={{ border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        {/* Title Bar */}
        <CardBody
          style={{
            background: 'linear-gradient(135deg, #009efb, #0085d1)',
            borderRadius: '8px 8px 0 0',
            padding: '20px 24px',
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <Button
                color="light"
                size="sm"
                onClick={handleBack}
                style={{ marginRight: '16px', borderRadius: '8px' }}
              >
                <ArrowLeft size={18} />
              </Button>
              <div>
                <h4 className="mb-0 text-white d-flex align-items-center">
                  <Truck size={24} className="me-2" />
                  Supplier Details
                </h4>
              </div>
            </div>
            {supplier.isInternal && (
              <Button
                color="light"
                size="sm"
                onClick={handleEdit}
                style={{ borderRadius: '8px' }}
              >
                <Edit2 size={16} className="me-1" />
                Edit
              </Button>
            )}
          </div>
        </CardBody>

        {/* Supplier Info Section */}
        <CardBody
          style={{
            padding: '24px',
            background: 'linear-gradient(135deg, #f8fafc, #eef2f7)',
          }}
        >
          <Row>
            {/* Left - Supplier Name & Basic Info */}
            <Col lg={4}>
              <div className="d-flex align-items-start">
                <div
                  style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '12px',
                    backgroundColor: '#009efb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px',
                    boxShadow: '0 4px 12px rgba(0, 158, 251, 0.3)',
                    flexShrink: 0,
                  }}
                >
                  <Truck size={32} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px 0', color: '#333', fontWeight: '600', fontSize: '18px' }}>
                    {supplier.displayName || supplier.name || 'N/A'}
                  </h4>
                  {supplier.name && supplier.displayName !== supplier.name && (
                    <p style={{ margin: '0 0 6px 0', color: '#666', fontSize: '13px' }}>
                      {supplier.name}
                    </p>
                  )}
                  {/* Rating - Clickable to open modal */}
                  <div
                    className="d-flex align-items-center mt-1"
                    onClick={() => supplierRatings?.totalReviews > 0 && setRatingsModalOpen(true)}
                    style={{ cursor: supplierRatings?.totalReviews > 0 ? 'pointer' : 'default' }}
                  >
                    <div className="d-flex align-items-center me-2">
                      {renderStars(supplierRatings?.overallRating || 0)}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>
                      {supplierRatings?.overallRating || '0.0'}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: supplierRatings?.totalReviews > 0 ? '#009efb' : '#888',
                        marginLeft: '4px',
                        textDecoration: supplierRatings?.totalReviews > 0 ? 'underline' : 'none',
                      }}
                    >
                      ({supplierRatings?.totalReviews || 0} reviews)
                    </span>
                  </div>
                  {/* Badges */}
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {supplier.isInternal && (
                      <Badge
                        style={{
                          backgroundColor: '#0891b2',
                          fontSize: '10px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                        }}
                      >
                        Internal
                      </Badge>
                    )}
                    <Badge
                      color={supplier.isActive !== false ? 'success' : 'secondary'}
                      style={{
                        fontSize: '10px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                      }}
                    >
                      {supplier.supplierStatus || (supplier.isActive !== false ? 'ACTIVE' : 'INACTIVE')}
                    </Badge>
                    {supplier.currency && (
                      <Badge
                        color="info"
                        style={{
                          fontSize: '10px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                        }}
                      >
                        {supplier.currency}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Col>

            {/* Middle - Contact Information */}
            <Col lg={4}>
              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: '10px',
                  padding: '16px',
                  height: '100%',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}
              >
                <h6
                  style={{
                    margin: '0 0 12px 0',
                    color: '#333',
                    fontWeight: '600',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Mail size={14} className="me-2" style={{ color: '#009efb' }} />
                  Contact Information
                </h6>
                <div style={{ fontSize: '12px' }}>
                  <div className="d-flex align-items-center mb-2">
                    <Mail size={12} className="me-2" style={{ color: '#888' }} />
                    <span style={{ fontWeight: '500', color: '#009efb' }}>
                      {supplier.email || 'N/A'}
                    </span>
                  </div>
                  {supplier.salesEmail && (
                    <div className="d-flex align-items-center mb-2">
                      <Mail size={12} className="me-2" style={{ color: '#888' }} />
                      <span style={{ fontWeight: '500', color: '#009efb' }}>
                        {supplier.salesEmail}
                      </span>
                    </div>
                  )}
                  <div className="d-flex align-items-center mb-2">
                    <Phone size={12} className="me-2" style={{ color: '#888' }} />
                    <span style={{ fontWeight: '500', color: '#333' }}>
                      {supplier.primaryContact || 'N/A'}
                    </span>
                  </div>
                  {supplier.customerServicePhone && (
                    <div className="d-flex align-items-center mb-2">
                      <Phone size={12} className="me-2" style={{ color: '#888' }} />
                      <span style={{ fontWeight: '500', color: '#333' }}>
                        {supplier.customerServicePhone}
                      </span>
                    </div>
                  )}
                  <div className="d-flex align-items-center">
                    <Globe size={12} className="me-2" style={{ color: '#888' }} />
                    {supplier.website ? (
                      <a
                        href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontWeight: '500',
                          color: '#009efb',
                          textDecoration: 'none',
                          wordBreak: 'break-all',
                        }}
                      >
                        {supplier.website}
                      </a>
                    ) : (
                      <span style={{ fontWeight: '500', color: '#888' }}>N/A</span>
                    )}
                  </div>
                </div>
              </div>
            </Col>

            {/* Right - Address */}
            <Col lg={4}>
              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: '10px',
                  padding: '16px',
                  height: '100%',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}
              >
                <h6
                  style={{
                    margin: '0 0 12px 0',
                    color: '#333',
                    fontWeight: '600',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <MapPin size={14} className="me-2" style={{ color: '#009efb' }} />
                  Address
                </h6>
                <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                  {supplier.address && (supplier.address.addressLine1 || supplier.address.city || supplier.address.country) ? (
                    <>
                      {supplier.address.addressLine1 && (
                        <p style={{ margin: '0 0 2px 0', color: '#333' }}>{supplier.address.addressLine1}</p>
                      )}
                      {supplier.address.addressLine2 && (
                        <p style={{ margin: '0 0 2px 0', color: '#333' }}>{supplier.address.addressLine2}</p>
                      )}
                      {(supplier.address.city || supplier.address.state || supplier.address.postalCode) && (
                        <p style={{ margin: '0', color: '#666' }}>
                          {[supplier.address.city, supplier.address.state, supplier.address.postalCode].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {supplier.address.country && (
                        <p style={{ margin: '4px 0 0 0', color: '#333', fontWeight: '600' }}>
                          {supplier.address.country}
                          {supplier.address.isoCountryCode && ` (${supplier.address.isoCountryCode})`}
                        </p>
                      )}
                    </>
                  ) : (
                    <p style={{ margin: 0, color: '#888' }}>Address not available</p>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Tabs for Carts, RFQs, Orders */}
      <Card style={{ border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <CardBody style={{ padding: '0' }}>
          <Nav tabs style={{ borderBottom: '2px solid #e8e8e8', padding: '0 20px' }}>
            <NavItem>
              <NavLink
                className={activeTab === 'carts' ? 'active' : ''}
                onClick={() => toggleTab('carts')}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  borderBottom: activeTab === 'carts' ? '3px solid #009efb' : '3px solid transparent',
                  color: activeTab === 'carts' ? '#009efb' : '#666',
                  fontWeight: activeTab === 'carts' ? '600' : '500',
                  padding: '16px 24px',
                  marginBottom: '-2px',
                  backgroundColor: 'transparent',
                }}
              >
                <ShoppingCart size={16} className="me-2" />
                Carts ({cartsTotalElements})
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === 'rfqs' ? 'active' : ''}
                onClick={() => toggleTab('rfqs')}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  borderBottom: activeTab === 'rfqs' ? '3px solid #009efb' : '3px solid transparent',
                  color: activeTab === 'rfqs' ? '#009efb' : '#666',
                  fontWeight: activeTab === 'rfqs' ? '600' : '500',
                  padding: '16px 24px',
                  marginBottom: '-2px',
                  backgroundColor: 'transparent',
                }}
              >
                <FileText size={16} className="me-2" />
                RFQs ({rfqsTotalElements})
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === 'orders' ? 'active' : ''}
                onClick={() => toggleTab('orders')}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  borderBottom: activeTab === 'orders' ? '3px solid #009efb' : '3px solid transparent',
                  color: activeTab === 'orders' ? '#009efb' : '#666',
                  fontWeight: activeTab === 'orders' ? '600' : '500',
                  padding: '16px 24px',
                  marginBottom: '-2px',
                  backgroundColor: 'transparent',
                }}
              >
                <Package size={16} className="me-2" />
                Purchase Orders ({ordersTotalElements})
              </NavLink>
            </NavItem>
          </Nav>

          <TabContent activeTab={activeTab} style={{ padding: '20px' }}>
            {/* Carts Tab */}
            <TabPane tabId="carts">
              {/* Search Input for Carts */}
              <div className="mb-3">
                <div className="position-relative" style={{ maxWidth: '300px' }}>
                  <Search
                    size={16}
                    className="position-absolute text-muted"
                    style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search carts..."
                    value={cartsSearchTerm}
                    onChange={handleCartsSearchChange}
                    style={{
                      paddingLeft: '38px',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>
              {cartsLoading ? (
                <div className="text-center py-5">
                  <Spinner size="sm" color="primary" />
                  <p className="text-muted mt-2 mb-0">Loading carts...</p>
                </div>
              ) : carts.length === 0 ? (
                <div className="text-center py-5">
                  <ShoppingCart size={40} className="text-muted mb-3" />
                  <p className="text-muted mb-0">
                    {cartsSearchTerm ? 'No carts found matching your search.' : 'No carts found with items from this supplier.'}
                  </p>
                </div>
              ) : (
                <>
                  <Table responsive hover style={{ fontSize: '13px' }}>
                    <thead style={{ backgroundColor: '#f8fafc' }}>
                      <tr>
                        <th>Cart #</th>
                        <th>Cart Name</th>
                        <th>Created By</th>
                        <th>Status</th>
                        <th>Created Date</th>
                        <th>Purchase Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carts.map((cart) => (
                        <tr
                          key={cart.cartId}
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/cartDetails/${cart.cartId}`)}
                        >
                          <td style={{ fontWeight: '500', color: '#009efb' }}>{cart.cartNo || cart.cartId}</td>
                          <td>{cart.cartName || 'N/A'}</td>
                          <td>
                            <div style={{ fontSize: '13px', fontWeight: '500' }}>
                              {cart.createdBy?.firstName || cart.createdBy?.lastName
                                ? `${cart.createdBy?.firstName || ''} ${cart.createdBy?.lastName || ''}`.trim()
                                : 'N/A'}
                            </div>
                            {cart.createdBy?.email && (
                              <div style={{ fontSize: '11px', color: '#666' }}>{cart.createdBy.email}</div>
                            )}
                          </td>
                          <td>
                            <Badge color={getStatusBadgeColor(cart.cartStatusType)} style={{ fontSize: '11px' }}>
                              {cart.cartStatusType || 'N/A'}
                            </Badge>
                          </td>
                          <td>{formatDate(cart.createdDate)}</td>
                          <td>{cart.purchaseType || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  {renderPagination(cartsPage, cartsTotalPages, setCartsPage)}
                </>
              )}
            </TabPane>

            {/* RFQs Tab */}
            <TabPane tabId="rfqs">
              {/* Search Input for RFQs */}
              <div className="mb-3">
                <div className="position-relative" style={{ maxWidth: '300px' }}>
                  <Search
                    size={16}
                    className="position-absolute text-muted"
                    style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search RFQs..."
                    value={rfqsSearchTerm}
                    onChange={handleRfqsSearchChange}
                    style={{
                      paddingLeft: '38px',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>
              {rfqsLoading ? (
                <div className="text-center py-5">
                  <Spinner size="sm" color="primary" />
                  <p className="text-muted mt-2 mb-0">Loading RFQs...</p>
                </div>
              ) : rfqs.length === 0 ? (
                <div className="text-center py-5">
                  <FileText size={40} className="text-muted mb-3" />
                  <p className="text-muted mb-0">
                    {rfqsSearchTerm ? 'No RFQs found matching your search.' : 'No RFQs found with this supplier.'}
                  </p>
                </div>
              ) : (
                <>
                  <Table responsive hover style={{ fontSize: '13px' }}>
                    <thead style={{ backgroundColor: '#f8fafc' }}>
                      <tr>
                        <th>RFQ #</th>
                        <th>Title</th>
                        <th>Created By</th>
                        <th>Status</th>
                        <th>Created Date</th>
                        <th>Required Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rfqs.map((rfq) => (
                        <tr
                          key={rfq.rfqId}
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/rfqDetails/${rfq.rfqId}`)}
                        >
                          <td style={{ fontWeight: '500', color: '#009efb' }}>{rfq.rfqNumber || rfq.rfqId}</td>
                          <td>{rfq.title || 'N/A'}</td>
                          <td>
                            <div style={{ fontSize: '13px', fontWeight: '500' }}>
                              {rfq.createdBy?.firstName || rfq.createdBy?.lastName
                                ? `${rfq.createdBy?.firstName || ''} ${rfq.createdBy?.lastName || ''}`.trim()
                                : 'N/A'}
                            </div>
                            {rfq.createdBy?.email && (
                              <div style={{ fontSize: '11px', color: '#666' }}>{rfq.createdBy.email}</div>
                            )}
                          </td>
                          <td>
                            <Badge color={getStatusBadgeColor(rfq.rfqStatus || rfq.status)} style={{ fontSize: '11px' }}>
                              {rfq.rfqStatus || rfq.status || 'N/A'}
                            </Badge>
                          </td>
                          <td>{formatDate(rfq.createdDate)}</td>
                          <td>{formatDate(rfq.requiredAt || rfq.dueDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  {renderPagination(rfqsPage, rfqsTotalPages, setRfqsPage)}
                </>
              )}
            </TabPane>

            {/* Purchase Orders Tab */}
            <TabPane tabId="orders">
              {/* Search Input for Orders */}
              <div className="mb-3">
                <div className="position-relative" style={{ maxWidth: '300px' }}>
                  <Search
                    size={16}
                    className="position-absolute text-muted"
                    style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search purchase orders..."
                    value={ordersSearchTerm}
                    onChange={handleOrdersSearchChange}
                    style={{
                      paddingLeft: '38px',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>
              {ordersLoading ? (
                <div className="text-center py-5">
                  <Spinner size="sm" color="primary" />
                  <p className="text-muted mt-2 mb-0">Loading purchase orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-5">
                  <Package size={40} className="text-muted mb-3" />
                  <p className="text-muted mb-0">
                    {ordersSearchTerm ? 'No purchase orders found matching your search.' : 'No purchase orders found for this supplier.'}
                  </p>
                </div>
              ) : (
                <>
                  <Table responsive hover style={{ fontSize: '13px' }}>
                    <thead style={{ backgroundColor: '#f8fafc' }}>
                      <tr>
                        <th>PO #</th>
                        <th>Created By</th>
                        <th>Status</th>
                        <th>Order Date</th>
                        <th>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const poId = order.purchaseOrderId || order.PurchaseOrderId;
                        return (
                        <tr
                          key={poId}
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/purchase-order-detail/${poId}`)}
                        >
                          <td style={{ fontWeight: '500', color: '#009efb' }}>{order.orderNo || order.purchaseOrderNo || poId}</td>
                          <td>
                            <div style={{ fontSize: '13px', fontWeight: '500' }}>
                              {order.buyerUser?.firstName || order.buyerUser?.lastName
                                ? `${order.buyerUser?.firstName || ''} ${order.buyerUser?.lastName || ''}`.trim()
                                : 'N/A'}
                            </div>
                            {order.buyerUser?.email && (
                              <div style={{ fontSize: '11px', color: '#666' }}>{order.buyerUser.email}</div>
                            )}
                          </td>
                          <td>
                            <Badge color={getStatusBadgeColor(order.orderStatus)} style={{ fontSize: '11px' }}>
                              {order.orderStatus || 'N/A'}
                            </Badge>
                          </td>
                          <td>{formatDate(order.orderPlacedDate)}</td>
                          <td>{formatCurrency(order.orderAmount || order.totalAmount, order.currency)}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                  {renderPagination(ordersPage, ordersTotalPages, setOrdersPage)}
                </>
              )}
            </TabPane>
          </TabContent>
        </CardBody>
      </Card>

      {/* Categories Section */}
      {supplier.categories && supplier.categories.length > 0 && (
        <Card className="mt-4" style={{ border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <CardBody style={{ padding: '20px' }}>
            <h6
              style={{
                margin: '0 0 16px 0',
                color: '#333',
                fontWeight: '600',
                fontSize: '14px',
              }}
            >
              Categories & Subcategories
            </h6>
            {supplier.categories
              .filter((cat) => !cat.parentId)
              .map((parentCat) => (
                <div key={parentCat.categoryId} style={{ marginBottom: '12px' }}>
                  <div className="d-flex align-items-center mb-2">
                    <Badge
                      style={{
                        backgroundColor: '#009efb',
                        fontSize: '12px',
                        padding: '6px 12px',
                        fontWeight: '600',
                      }}
                    >
                      {parentCat.categoryName}
                    </Badge>
                  </div>
                  {(() => {
                    const nestedSubCats = parentCat.subCategories || [];
                    const flatSubCats = supplier.categories.filter(
                      (cat) => cat.parentId === parentCat.categoryId
                    );
                    const allSubCats = [...nestedSubCats];
                    flatSubCats.forEach((flatCat) => {
                      if (!allSubCats.find((s) => s.categoryId === flatCat.categoryId)) {
                        allSubCats.push(flatCat);
                      }
                    });

                    if (allSubCats.length > 0) {
                      return (
                        <div className="d-flex flex-wrap gap-2" style={{ paddingLeft: '16px' }}>
                          {allSubCats.map((subCat) => (
                            <Badge
                              key={subCat.categoryId}
                              style={{
                                backgroundColor: '#0891b2',
                                color: '#ffffff',
                                fontSize: '11px',
                                padding: '4px 10px',
                                fontWeight: '500',
                              }}
                            >
                              {subCat.categoryName}
                            </Badge>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ))}
          </CardBody>
        </Card>
      )}

      {/* Performance Ratings Modal */}
      <Modal
        isOpen={ratingsModalOpen}
        toggle={() => setRatingsModalOpen(false)}
        size="xl"
        centered
        style={{ maxWidth: '900px' }}
      >
        <ModalHeader
          toggle={() => setRatingsModalOpen(false)}
          style={{
            borderBottom: 'none',
            padding: '20px 24px 0',
            background: 'linear-gradient(135deg, #009efb 0%, #0085d1 100%)',
            borderRadius: '8px 8px 0 0',
          }}
          close={
            <button
              className="btn btn-link p-0"
              onClick={() => setRatingsModalOpen(false)}
              style={{ color: 'white' }}
            >
              <X size={24} />
            </button>
          }
        >
          <div className="d-flex align-items-center text-white pb-3">
            <Award size={24} className="me-2" />
            <div>
              <h5 className="mb-0" style={{ fontWeight: '600' }}>Performance Ratings</h5>
              <small style={{ opacity: 0.9 }}>{supplier?.displayName || supplier?.name}</small>
            </div>
          </div>
        </ModalHeader>
        <ModalBody style={{ padding: '0' }}>
          <Row className="g-0">
            {/* Left Side - Average Ratings Summary */}
            <Col md={4} style={{ backgroundColor: '#f8fafc', padding: '24px', borderRight: '1px solid #e8e8e8' }}>
              {supplierRatings && (
                <>
                  {/* Overall Rating Circle */}
                  <div className="text-center mb-4">
                    <div
                      style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #009efb 0%, #0085d1 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        boxShadow: '0 8px 24px rgba(0, 158, 251, 0.3)',
                      }}
                    >
                      <div style={{ fontSize: '36px', fontWeight: '700', color: 'white', lineHeight: 1 }}>
                        {supplierRatings.overallRating}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)' }}>out of 5</div>
                    </div>
                    <div className="d-flex justify-content-center mt-3">
                      {renderStars(supplierRatings.overallRating)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>
                      Based on {supplierRatings.totalReviews} review{supplierRatings.totalReviews !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Rating Bars */}
                  <div style={{ marginTop: '24px' }}>
                    {[
                      { label: 'Quality', value: supplierRatings.qualityRating, color: '#28a745' },
                      { label: 'Delivery', value: supplierRatings.deliveryPerformanceRating, color: '#009efb' },
                      { label: 'Pricing', value: supplierRatings.pricingCostTransparencyRating, color: '#ffc107' },
                      { label: 'Communication', value: supplierRatings.communicationResponsivenessRating, color: '#17a2b8' },
                    ].map((item) => (
                      <div key={item.label} style={{ marginBottom: '16px' }}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span style={{ fontSize: '13px', color: '#555', fontWeight: '500' }}>{item.label}</span>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>{parseFloat(item.value).toFixed(1)}</span>
                        </div>
                        <div
                          style={{
                            height: '8px',
                            backgroundColor: '#e9ecef',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${(parseFloat(item.value) / 5) * 100}%`,
                              height: '100%',
                              backgroundColor: item.color,
                              borderRadius: '4px',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Col>

            {/* Right Side - Individual Reviews */}
            <Col md={8} style={{ padding: '24px' }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 style={{ fontWeight: '600', color: '#333', margin: 0 }}>
                  All Reviews ({allFeedbacks.length})
                </h6>
              </div>

              {allFeedbacks.length === 0 ? (
                <div className="text-center py-5">
                  <Star size={48} className="text-muted mb-3" />
                  <p style={{ color: '#888', margin: 0, fontSize: '14px' }}>No reviews available yet</p>
                </div>
              ) : (
                <div style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '8px' }}>
                  {allFeedbacks.map((feedback, index) => (
                    <div
                      key={feedback.feedbackId || index}
                      style={{
                        backgroundColor: '#fff',
                        border: '1px solid #e8e8e8',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '16px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      {/* Review Header */}
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div className="d-flex align-items-center">
                          <div
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #e8f4fd 0%, #d0e8f9 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '14px',
                            }}
                          >
                            <User size={22} color="#009efb" />
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '15px', color: '#333' }}>
                              {feedback.user?.firstName || feedback.user?.lastName
                                ? `${feedback.user?.firstName || ''} ${feedback.user?.lastName || ''}`.trim()
                                : feedback.reviewerFirstName || feedback.reviewerLastName
                                  ? `${feedback.reviewerFirstName || ''} ${feedback.reviewerLastName || ''}`.trim()
                                  : feedback.name || 'Anonymous Reviewer'}
                            </div>
                            {(feedback.company?.displayName || feedback.company?.name) && (
                              <div style={{ fontSize: '12px', color: '#009efb', fontWeight: '500' }}>
                                {feedback.company?.displayName || feedback.company?.name}
                              </div>
                            )}
                            <div style={{ fontSize: '11px', color: '#888' }}>
                              {feedback.createdDate ? formatDate(feedback.createdDate) : 'N/A'}
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            backgroundColor: '#fff8e6',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Star size={16} fill="#ffc107" color="#ffc107" />
                          <span style={{ fontWeight: '700', fontSize: '15px', marginLeft: '6px', color: '#333' }}>
                            {feedback.overallRating || 0}
                          </span>
                        </div>
                      </div>

                      {/* Rating Pills */}
                      <div className="d-flex flex-wrap gap-2 mb-3">
                        {[
                          { label: 'Quality', value: feedback.qualityRating, color: '#28a745' },
                          { label: 'Delivery', value: feedback.deliveryPerformanceRating, color: '#009efb' },
                          { label: 'Pricing', value: feedback.pricingCostTransparencyRating, color: '#ffc107' },
                          { label: 'Communication', value: feedback.communicationResponsivenessRating, color: '#17a2b8' },
                        ].map((item) => (
                          <div
                            key={item.label}
                            style={{
                              backgroundColor: '#f8f9fa',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span style={{ color: '#666' }}>{item.label}:</span>
                            <span style={{ fontWeight: '600', color: item.color }}>{item.value ? parseFloat(item.value).toFixed(1) : '0.0'}</span>
                          </div>
                        ))}
                      </div>

                      {/* Comments/Notes */}
                      {(feedback.notes || feedback.comments) && (
                        <div
                          style={{
                            backgroundColor: '#f8fafc',
                            borderLeft: '3px solid #009efb',
                            borderRadius: '0 8px 8px 0',
                            padding: '14px 16px',
                            fontSize: '14px',
                            color: '#555',
                            lineHeight: '1.6',
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {feedback.notes || feedback.comments}
                        </div>
                      )}

                      {/* Attachment Thumbnail */}
                      {feedback.documentId && (
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>
                            Attachment
                          </div>
                          {attachmentLoading[feedback.documentId] ? (
                            <div
                              style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '8px',
                                backgroundColor: '#f0f0f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Spinner size="sm" color="primary" />
                            </div>
                          ) : attachmentUrls[feedback.documentId] ? (
                            <div
                              onClick={() => handleOpenAttachment(feedback.documentId)}
                              style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                border: '2px solid #e8e8e8',
                                position: 'relative',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#009efb';
                                e.currentTarget.style.transform = 'scale(1.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#e8e8e8';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              title="Click to open attachment"
                            >
                              {isImageType(attachmentUrls[feedback.documentId].type) ? (
                                <img
                                  src={attachmentUrls[feedback.documentId].url}
                                  alt="Attachment"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: '#f8fafc',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <FileText size={24} color="#666" />
                                  <span style={{ fontSize: '9px', color: '#888', marginTop: '4px' }}>
                                    Document
                                  </span>
                                </div>
                              )}
                              {/* Open icon overlay */}
                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: '4px',
                                  right: '4px',
                                  backgroundColor: 'rgba(0, 158, 251, 0.9)',
                                  borderRadius: '4px',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <ExternalLink size={12} color="white" />
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '8px',
                                backgroundColor: '#f8fafc',
                                border: '1px dashed #ccc',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Image size={20} color="#999" />
                              <span style={{ fontSize: '9px', color: '#999', marginTop: '4px' }}>
                                Not available
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Col>
          </Row>
        </ModalBody>
      </Modal>
    </div>
  );
};

export default SupplierDetail;
