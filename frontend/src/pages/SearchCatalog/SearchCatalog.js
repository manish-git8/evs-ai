import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardHeader,
  Row,
  Col,
  Button,
  Badge,
  Spinner,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from 'reactstrap';
import {
  Search,
  Plus,
  Package,
  Briefcase,
  Tag,
  Star,
  Mail,
  Phone,
  MapPin,
  Globe,
  Award,
  ShoppingCart,
} from 'react-feather';
import SimpleBar from 'simplebar-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CatalogItemService from '../../services/CatalogItemService';
import SupplierService from '../../services/SupplierService';
import CartService from '../../services/CartService';
import FeedBackService from '../../services/FeedBackService';
import { getEntityId, getUserId, formatCurrency, getCompanyCurrency } from '../localStorageUtil';

const SearchCatalog = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const companyId = getEntityId();
  const userId = getUserId();

  // Get initial search term from URL query parameter
  const urlSearchParams = new URLSearchParams(location.search);
  const initialSearchTerm = urlSearchParams.get('search') || '';

  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearchTerm);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [supplierModal, setSupplierModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isLoadingSupplier, setIsLoadingSupplier] = useState(false);
  const [supplierRatings, setSupplierRatings] = useState(null);

  const fetchCartCount = useCallback(async () => {
    // Fetch cart count if needed
  }, [companyId, userId]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Update search term when URL changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlSearch = params.get('search') || '';
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
      setDebouncedSearchTerm(urlSearch);
    }
  }, [location.search]);

  // Fetch products when debounced search term changes
  useEffect(() => {
    const fetchProducts = async () => {
      if (debouncedSearchTerm.trim() === '') {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await CatalogItemService.getCatalogItemsBySearch(
          100,
          0,
          debouncedSearchTerm,
        );
        setSearchResults(response || []);
      } catch (error) {
        console.error('Error searching products:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    fetchProducts();
  }, [debouncedSearchTerm]);

  // formatCurrency is imported from localStorageUtil and uses company currency

  const handleAddToCartClick = (product, e) => {
    if (e) e.stopPropagation();
    setSelectedProduct(product);
    setConfirmModal(true);
  };

  const handleConfirmAddToCart = async () => {
    if (!selectedProduct) return;

    setIsAddingToCart(true);
    try {
      const newCartData = {
        companyId,
      };
      const cartResponse = await CartService.handleCartCompany(newCartData, companyId);
      const newCartId = cartResponse.data?.cartId;

      if (!newCartId) {
        console.error('Failed to create cart');
        setIsAddingToCart(false);
        return;
      }
      const requestBody = {
        cartId: newCartId,
        supplierId: selectedProduct.Supplier?.supplierId,
        projectId: null,
        catalogId: selectedProduct.CatalogId,
        catalogItemId: {
          CatalogItemId: selectedProduct.CatalogItemId,
          PartId: selectedProduct.PartId,
          ProductImageURL: selectedProduct.ProductImageURL,
        },
        partId: selectedProduct.PartId,
        partDescription: selectedProduct.Description || '',
        departmentId: null,
        orderType: 0,
        glAccountId: null,
        isCritical: true,
        isSafetyAppReq: false,
        slimit: 'some limit',
        qty: 1,
        price: selectedProduct.UnitPrice || 0,
        unitOfMeasure: selectedProduct.UnitOfMeasurement || 'piece',
        currencyCode: selectedProduct.Currency || getCompanyCurrency(),
        internalBuyerQuoteFile: 0,
        priceUpdate: false,
        classId: null,
        locationId: null,
        productId: selectedProduct.ProductId || 1,
        manufacturerName: selectedProduct.Manufacturer || 'Unknown',
        manufacturerPart: selectedProduct.ManufacturerPart || selectedProduct.PartId,
      };

      await CartService.handleCreateCart(requestBody, companyId, newCartId);
      setConfirmModal(false);
      setSelectedProduct(null);
      toast.success('Product added to cart successfully!');
      fetchCartCount();
      navigate(`/cartDetails/${newCartId}/${''}`);
    } catch (error) {
      console.error('Error creating cart and adding product:', error);
      toast.error('Error adding product to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleCancelAddToCart = () => {
    setConfirmModal(false);
    setSelectedProduct(null);
  };

  const handleSupplierClick = async (supplier, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!supplier?.supplierId) return;

    setIsLoadingSupplier(true);
    setSupplierModal(true);
    setSupplierRatings(null);

    try {
      // Fetch supplier details and ratings in parallel
      const [supplierResponse, ratingsResponse] = await Promise.all([
        SupplierService.getSupplierById(supplier.supplierId),
        FeedBackService.getAllFeedbackForCompanyBySupplier(companyId, supplier.supplierId).catch(() => null),
      ]);

      const supplierData = supplierResponse.data?.[0] || supplierResponse.data || supplier;
      setSelectedSupplier(supplierData);

      // Process ratings - calculate averages from all feedback records
      if (ratingsResponse?.data && ratingsResponse.data.length > 0) {
        const feedbacks = ratingsResponse.data;
        const totalReviews = feedbacks.length;

        // Calculate average ratings across all feedbacks
        const avgDelivery = feedbacks.reduce((sum, f) => sum + (f.deliveryPerformanceRating || 0), 0) / totalReviews;
        const avgQuality = feedbacks.reduce((sum, f) => sum + (f.qualityRating || 0), 0) / totalReviews;
        const avgPricing = feedbacks.reduce((sum, f) => sum + (f.pricingCostTransparencyRating || 0), 0) / totalReviews;
        const avgCommunication = feedbacks.reduce((sum, f) => sum + (f.communicationResponsivenessRating || 0), 0) / totalReviews;
        const avgOverall = feedbacks.reduce((sum, f) => sum + (f.overallRating || 0), 0) / totalReviews;

        setSupplierRatings({
          deliveryPerformanceRating: avgDelivery,
          qualityRating: avgQuality,
          pricingCostTransparencyRating: avgPricing,
          communicationResponsivenessRating: avgCommunication,
          overallRating: avgOverall,
          totalReviews,
        });
      }
    } catch (error) {
      console.error('Error fetching supplier details:', error);
      setSelectedSupplier(supplier);
    } finally {
      setIsLoadingSupplier(false);
    }
  };

  const handleCloseSupplierModal = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setSupplierModal(false);
    setSelectedSupplier(null);
    setSupplierRatings(null);
  };

  const renderStarRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating || 0) % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star
            key={i}
            size={16}
            fill="#ffc107"
            color="#ffc107"
            style={{ marginRight: '2px' }}
          />,
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Star
            key={i}
            size={16}
            fill="#ffc107"
            color="#ffc107"
            style={{ marginRight: '2px', clipPath: 'inset(0 50% 0 0)' }}
          />,
        );
      } else {
        stars.push(
          <Star key={i} size={16} color="#e0e0e0" style={{ marginRight: '2px' }} />,
        );
      }
    }
    return stars;
  };

  return (
    <div style={{ padding: '25px 0' }}>
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
      />

      <Row>
        <Col md="12">
          <Card className="shadow-sm">
            <CardHeader className="bg-white border-bottom">
              <h4 className="mb-0" style={{ color: '#009efb', fontWeight: '600' }}>
                <Search size={20} className="me-2" />
                Search Catalog
              </h4>
              <p className="text-muted mb-0 mt-1">
                Use the search bar in the header to search products by Part ID, Description, Supplier, or Manufacturer
              </p>
            </CardHeader>

            <CardBody style={{ padding: '0', minHeight: '500px' }}>
              {/* Results Header */}
              {searchTerm && (
                <div
                  style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid #e0e0e0',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <small className="text-muted">
                    {isSearching
                      ? 'Searching...'
                      : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${searchTerm}"`}
                  </small>
                </div>
              )}

              {/* Loading State */}
              {isSearching && (
                <div className="text-center py-5">
                  <Spinner color="primary" />
                  <p className="text-muted mt-3 mb-0">Searching products...</p>
                </div>
              )}

              {/* Results */}
              {!isSearching && searchResults.length > 0 && (
                <SimpleBar style={{ maxHeight: 'calc(100vh - 300px)' }}>
                  <div style={{ padding: '16px' }}>
                    {searchResults.map((product) => (
                      <div
                        key={product.CatalogItemId}
                        className="search-result-item"
                        style={{
                          display: 'flex',
                          padding: '16px',
                          marginBottom: '12px',
                          backgroundColor: '#fff',
                          borderRadius: '12px',
                          border: '1px solid #e8e8e8',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#009efb';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 158, 251, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e8e8e8';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {/* Product Image */}
                        <div
                          style={{
                            width: '100px',
                            height: '100px',
                            flexShrink: 0,
                            marginRight: '16px',
                          }}
                        >
                          <img
                            src={
                              product.ProductImageURL ||
                              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNGNUY1RjUiLz48cGF0aCBkPSJNNTAgNDBDNTIuNzYxNCA0MCA1NSAzNy43NjE0IDU1IDM1QzU1IDMyLjIzODYgNTIuNzYxNCAzMCA1MCAzMEM0Ny4yMzg2IDMwIDQ1IDMyLjIzODYgNDUgMzVDNDUgMzcuNzYxNCA0Ny4yMzg2IDQwIDUwIDQwWiIgZmlsbD0iIzk5OTk5OSIvPjxwYXRoIGQ9Ik0zNSA2NUw0NSA1NUw1MCA2MEw2MCA0OEw2NSA2NVY3MEgzNVY2NVoiIGZpbGw9IiM5OTk5OTkiLz48L3N2Zz4='
                            }
                            alt={product.Description}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '1px solid #e0e0e0',
                            }}
                            onError={(e) => {
                              e.target.src =
                                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNGNUY1RjUiLz48cGF0aCBkPSJNNTAgNDBDNTIuNzYxNCA0MCA1NSAzNy43NjE0IDU1IDM1QzU1IDMyLjIzODYgNTIuNzYxNCAzMCA1MCAzMEM0Ny4yMzg2IDMwIDQ1IDMyLjIzODYgNDUgMzVDNDUgMzcuNzYxNCA0Ny4yMzg2IDQwIDUwIDQwWiIgZmlsbD0iIzk5OTk5OSIvPjxwYXRoIGQ9Ik0zNSA2NUw0NSA1NUw1MCA2MEw2MCA0OEw2NSA2NVY3MEgzNVY2NVoiIGZpbGw9IiM5OTk5OTkiLz48L3N2Zz4=';
                            }}
                          />
                        </div>

                        {/* Product Info */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          {/* Row 1: Product Name & Stock Badge */}
                          <div
                            className="d-flex justify-content-between align-items-start"
                            style={{ marginBottom: '8px' }}
                          >
                            <h6
                              style={{
                                margin: 0,
                                fontWeight: '600',
                                color: '#333',
                                fontSize: '15px',
                                lineHeight: '1.3',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                flex: 1,
                                marginRight: '12px',
                              }}
                              title={product.Description}
                            >
                              {product.Description || 'N/A'}
                            </h6>
                            <Badge
                              color={product.InStock ? 'success' : 'danger'}
                              style={{
                                fontSize: '10px',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontWeight: '500',
                                flexShrink: 0,
                              }}
                            >
                              {product.InStock ? 'In Stock' : 'Out of Stock'}
                            </Badge>
                          </div>

                          {/* Row 2: Product Details Grid */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '6px 16px',
                              fontSize: '12px',
                              color: '#666',
                              marginBottom: '12px',
                            }}
                          >
                            {/* Part ID */}
                            <div className="d-flex align-items-center">
                              <Tag size={11} className="me-1" style={{ color: '#009efb', flexShrink: 0 }} />
                              <span style={{ color: '#888' }}>Part ID:</span>
                              <span
                                style={{
                                  marginLeft: '4px',
                                  fontWeight: '500',
                                  color: '#333',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {product.PartId || 'N/A'}
                              </span>
                            </div>

                            {/* Manufacturer */}
                            <div className="d-flex align-items-center">
                              <Briefcase size={11} className="me-1" style={{ color: '#009efb', flexShrink: 0 }} />
                              <span style={{ color: '#888' }}>Mfr:</span>
                              <span
                                style={{
                                  marginLeft: '4px',
                                  fontWeight: '500',
                                  color: '#333',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {product.ManufacturerName || 'N/A'}
                              </span>
                            </div>

                            {/* Supplier - Clickable */}
                            <div className="d-flex align-items-center">
                              <Package size={11} className="me-1" style={{ color: '#009efb', flexShrink: 0 }} />
                              <span style={{ color: '#888' }}>Supplier:</span>
                              {product.Supplier?.displayName ? (
                                <span
                                  onClick={(e) => handleSupplierClick(product.Supplier, e)}
                                  style={{
                                    marginLeft: '4px',
                                    fontWeight: '500',
                                    color: '#009efb',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    textDecorationStyle: 'dotted',
                                  }}
                                  title="Click to view supplier details"
                                >
                                  {product.Supplier.displayName}
                                </span>
                              ) : (
                                <span style={{ marginLeft: '4px', fontWeight: '500', color: '#333' }}>
                                  N/A
                                </span>
                              )}
                            </div>

                            {/* Qty Per Unit */}
                            <div className="d-flex align-items-center">
                              <Package size={11} className="me-1" style={{ color: '#009efb', flexShrink: 0 }} />
                              <span style={{ color: '#888' }}>Qty/Unit:</span>
                              <span
                                style={{
                                  marginLeft: '4px',
                                  fontWeight: '500',
                                  color: '#333',
                                }}
                              >
                                {product.QuantityPerUnit || 1}
                              </span>
                            </div>
                          </div>

                          {/* Specifications (if available) */}
                          {product.Specifications && (
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#666',
                                marginBottom: '10px',
                                padding: '6px 8px',
                                backgroundColor: '#f8fafc',
                                borderRadius: '4px',
                                border: '1px solid #e8e8e8',
                              }}
                            >
                              <span style={{ color: '#888', fontWeight: '500' }}>Specs: </span>
                              <span
                                style={{
                                  color: '#555',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical',
                                }}
                                title={product.Specifications}
                              >
                                {product.Specifications}
                              </span>
                            </div>
                          )}

                          {/* Safety & Availability Badges */}
                          <div
                            style={{
                              display: 'flex',
                              gap: '6px',
                              marginBottom: '10px',
                              flexWrap: 'wrap',
                            }}
                          >
                            {product.isSafetyAppReq && (
                              <Badge
                                color="warning"
                                style={{
                                  fontSize: '9px',
                                  padding: '3px 6px',
                                  borderRadius: '10px',
                                  fontWeight: '500',
                                }}
                              >
                                Safety App Required
                              </Badge>
                            )}
                            {product.IsAvailable === false && (
                              <Badge
                                color="secondary"
                                style={{
                                  fontSize: '9px',
                                  padding: '3px 6px',
                                  borderRadius: '10px',
                                  fontWeight: '500',
                                }}
                              >
                                Not Available for Order
                              </Badge>
                            )}
                            {product.ProductURL && (
                              <a
                                href={product.ProductURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  fontSize: '9px',
                                  padding: '3px 6px',
                                  borderRadius: '10px',
                                  backgroundColor: '#e3f2fd',
                                  color: '#009efb',
                                  textDecoration: 'none',
                                  fontWeight: '500',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <Globe size={9} />
                                Product Page
                              </a>
                            )}
                          </div>

                          {/* Price & Add to Cart */}
                          <div
                            className="d-flex justify-content-between align-items-center"
                            style={{ marginTop: 'auto' }}
                          >
                            <div>
                              <span
                                style={{
                                  fontSize: '18px',
                                  fontWeight: '700',
                                  color: '#009efb',
                                }}
                              >
                                {formatCurrency(product.UnitPrice, product.Currency)}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  color: '#888',
                                  marginLeft: '4px',
                                }}
                              >
                                / {product.UnitOfMeasurement || 'unit'}
                              </span>
                            </div>
                            <Button
                              color="primary"
                              size="sm"
                              disabled={!product.InStock}
                              onClick={(e) => handleAddToCartClick(product, e)}
                              style={{
                                borderRadius: '6px',
                                padding: '6px 14px',
                                fontWeight: '500',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <Plus size={14} />
                              Add to Cart
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </SimpleBar>
              )}

              {/* No Results */}
              {!isSearching && searchResults.length === 0 && searchTerm && (
                <div className="text-center py-5">
                  <Package size={48} style={{ color: '#ccc' }} />
                  <h6 className="text-muted mt-3">No products found</h6>
                  <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                    Try adjusting your search terms
                  </p>
                </div>
              )}

              {/* Initial State */}
              {!isSearching && !searchTerm && (
                <div className="text-center py-5">
                  <Search size={48} style={{ color: '#ccc' }} />
                  <h6 className="text-muted mt-3">Start typing to search</h6>
                  <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                    Search by Cart No, Part ID, Description, Supplier, or Manufacturer
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Confirmation Modal for Add to Cart */}
      <Modal isOpen={confirmModal} toggle={handleCancelAddToCart} centered>
        <ModalHeader
          toggle={handleCancelAddToCart}
          style={{
            background: 'linear-gradient(135deg, #009efb, #0085d1)',
            color: 'white',
            borderBottom: 'none',
          }}
        >
          <ShoppingCart size={20} className="me-2" />
          Confirm Add to Cart
        </ModalHeader>
        <ModalBody style={{ padding: '24px' }}>
          {selectedProduct && (
            <>
              <div
                className="d-flex align-items-center p-3 mb-4"
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e8e8e8',
                }}
              >
                <img
                  src={
                    selectedProduct.ProductImageURL ||
                    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0zMCAyNEMzMS42NTY5IDI0IDMzIDIyLjY1NjkgMzMgMjFDMzMgMTkuMzQzMSAzMS42NTY5IDE4IDMwIDE4QzI4LjM0MzEgMTggMjcgMTkuMzQzMSAyNyAyMUMyNyAyMi42NTY5IDI4LjM0MzEgMjQgMzAgMjRaIiBmaWxsPSIjOTk5OTk5Ii8+CjxwYXRoIGQ9Ik0yMSAzOUwyNyAzM0wzMCAzNkwzNiAyOUwzOSAzOVY0MkgyMVYzOVoiIGZpbGw9IiM5OTk5OTkiLz4KPC9zdmc+Cg=='
                  }
                  alt={selectedProduct.Description}
                  style={{
                    width: '60px',
                    height: '60px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    marginRight: '16px',
                  }}
                  onError={(e) => {
                    e.target.src =
                      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0zMCAyNEMzMS42NTY5IDI0IDMzIDIyLjY1NjkgMzMgMjFDMzMgMTkuMzQzMSAzMS42NTY5IDE4IDMwIDE4QzI4LjM0MzEgMTggMjcgMTkuMzQzMSAyNyAyMUMyNyAyMi42NTY5IDI4LjM0MzEgMjQgMzAgMjRaIiBmaWxsPSIjOTk5OTk5Ii8+CjxwYXRoIGQ9Ik0yMSAzOUwyNyAzM0wzMCAzNkwzNiAyOUwzOSAzOVY0MkgyMVYzOVoiIGZpbGw9IiM5OTk5OTkiLz4KPC9zdmc+Cg==';
                  }}
                />
                <div>
                  <h6 style={{ margin: 0, fontWeight: '600', color: '#333' }}>
                    {selectedProduct.Description || 'N/A'}
                  </h6>
                  <small className="text-muted">
                    {selectedProduct.PartId && `Part ID: ${selectedProduct.PartId}`}
                  </small>
                  <div style={{ marginTop: '4px' }}>
                    <span style={{ fontWeight: '600', color: '#009efb' }}>
                      {formatCurrency(selectedProduct.UnitPrice, selectedProduct.Currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="p-3"
                style={{
                  backgroundColor: '#fff8e6',
                  borderRadius: '8px',
                  border: '1px solid #ffd666',
                }}
              >
                <div className="d-flex align-items-start">
                  <i
                    className="bi bi-info-circle-fill me-2"
                    style={{ color: '#faad14', fontSize: '18px' }}
                  ></i>
                  <div>
                    <strong style={{ color: '#8c6d1f' }}>New Cart Will Be Created</strong>
                    <p
                      className="mb-0 mt-1"
                      style={{ fontSize: '13px', color: '#8c6d1f', lineHeight: '1.5' }}
                    >
                      A new cart will be created with this product. You can add more items to this
                      cart afterwards.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter style={{ borderTop: '1px solid #e8e8e8', padding: '16px 24px' }}>
          <Button
            color="secondary"
            outline
            onClick={handleCancelAddToCart}
            disabled={isAddingToCart}
            style={{ borderRadius: '6px', padding: '8px 20px' }}
          >
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={handleConfirmAddToCart}
            disabled={isAddingToCart}
            style={{
              borderRadius: '6px',
              padding: '8px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {isAddingToCart ? (
              <>
                <Spinner size="sm" />
                Creating Cart...
              </>
            ) : (
              <>
                <ShoppingCart size={16} />
                Create Cart & Add Item
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Supplier Details Modal */}
      <Modal
        isOpen={supplierModal}
        toggle={handleCloseSupplierModal}
        centered
        size="lg"
        backdrop="static"
      >
        <ModalHeader
          toggle={handleCloseSupplierModal}
          style={{
            background: 'linear-gradient(135deg, #009efb, #0085d1)',
            color: 'white',
            borderBottom: 'none',
          }}
        >
          <Package size={20} className="me-2" />
          Supplier Details
        </ModalHeader>
        <ModalBody style={{ padding: '0' }}>
          {isLoadingSupplier ? (
            <div className="text-center py-5">
              <Spinner color="primary" />
              <p className="text-muted mt-3 mb-0">Loading supplier details...</p>
            </div>
          ) : selectedSupplier ? (
            <>
              {/* Supplier Header */}
              <div
                style={{
                  padding: '24px',
                  background: 'linear-gradient(135deg, #f8fafc, #eef2f7)',
                  borderBottom: '1px solid #e8e8e8',
                }}
              >
                <div className="d-flex align-items-start">
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '12px',
                      backgroundColor: '#009efb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '20px',
                      boxShadow: '0 4px 12px rgba(0, 158, 251, 0.3)',
                    }}
                  >
                    <Package size={36} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', color: '#333', fontWeight: '600' }}>
                      {selectedSupplier.displayName || selectedSupplier.name || 'N/A'}
                    </h4>
                    {selectedSupplier.name && selectedSupplier.displayName !== selectedSupplier.name && (
                      <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
                        {selectedSupplier.name}
                      </p>
                    )}
                    {/* Rating */}
                    <div className="d-flex align-items-center mt-2">
                      <div className="d-flex align-items-center me-2">
                        {renderStarRating(supplierRatings?.overallRating || 0)}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                        {(supplierRatings?.overallRating || 0).toFixed(1)}
                      </span>
                      <span style={{ fontSize: '12px', color: '#888', marginLeft: '4px' }}>
                        ({supplierRatings?.totalReviews || 0} reviews)
                      </span>
                    </div>
                    {/* Currency Badge */}
                    {selectedSupplier.currency && (
                      <Badge
                        color="info"
                        style={{
                          fontSize: '10px',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          marginTop: '8px',
                        }}
                      >
                        Currency: {selectedSupplier.currency}
                      </Badge>
                    )}
                  </div>
                  {/* Status Badge */}
                  <div className="d-flex flex-column align-items-end gap-2">
                    <Badge
                      color={selectedSupplier.isActive !== false ? 'success' : 'secondary'}
                      style={{
                        fontSize: '11px',
                        padding: '6px 12px',
                        borderRadius: '20px',
                      }}
                    >
                      {selectedSupplier.supplierStatus || (selectedSupplier.isActive !== false ? 'ACTIVE' : 'INACTIVE')}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Supplier Details */}
              <div style={{ padding: '24px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px',
                  }}
                >
                  {/* Contact Information */}
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '10px',
                      padding: '16px',
                      border: '1px solid #e8e8e8',
                    }}
                  >
                    <h6
                      style={{
                        margin: '0 0 16px 0',
                        color: '#333',
                        fontWeight: '600',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Mail size={14} className="me-2" style={{ color: '#009efb' }} />
                      Contact Information
                    </h6>

                    <div style={{ fontSize: '13px' }}>
                      {/* Support Email */}
                      <div className="d-flex align-items-center mb-3">
                        <Mail size={14} className="me-2" style={{ color: '#888' }} />
                        <span style={{ color: '#666' }}>Support Email:</span>
                        <span
                          style={{
                            marginLeft: '8px',
                            fontWeight: '500',
                            color: '#009efb',
                          }}
                        >
                          {selectedSupplier.email || 'N/A'}
                        </span>
                      </div>

                      {/* Sales Email */}
                      {selectedSupplier.salesEmail && (
                        <div className="d-flex align-items-center mb-3">
                          <Mail size={14} className="me-2" style={{ color: '#888' }} />
                          <span style={{ color: '#666' }}>Sales Email:</span>
                          <span
                            style={{
                              marginLeft: '8px',
                              fontWeight: '500',
                              color: '#009efb',
                            }}
                          >
                            {selectedSupplier.salesEmail}
                          </span>
                        </div>
                      )}

                      {/* Primary Contact */}
                      <div className="d-flex align-items-center mb-3">
                        <Phone size={14} className="me-2" style={{ color: '#888' }} />
                        <span style={{ color: '#666' }}>Primary Contact:</span>
                        <span style={{ marginLeft: '8px', fontWeight: '500', color: '#333' }}>
                          {selectedSupplier.primaryContact || 'N/A'}
                        </span>
                      </div>

                      {/* Customer Service Phone */}
                      {selectedSupplier.customerServicePhone && (
                        <div className="d-flex align-items-center mb-3">
                          <Phone size={14} className="me-2" style={{ color: '#888' }} />
                          <span style={{ color: '#666' }}>Customer Service:</span>
                          <span style={{ marginLeft: '8px', fontWeight: '500', color: '#333' }}>
                            {selectedSupplier.customerServicePhone}
                          </span>
                        </div>
                      )}

                      {/* Website */}
                      <div className="d-flex align-items-start">
                        <Globe size={14} className="me-2 mt-1" style={{ color: '#888' }} />
                        <span style={{ color: '#666' }}>Website:</span>
                        {selectedSupplier.website ? (
                          <a
                            href={selectedSupplier.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              marginLeft: '8px',
                              fontWeight: '500',
                              color: '#009efb',
                              textDecoration: 'none',
                              wordBreak: 'break-all',
                            }}
                          >
                            {selectedSupplier.website}
                          </a>
                        ) : (
                          <span style={{ marginLeft: '8px', fontWeight: '500', color: '#333' }}>
                            N/A
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '10px',
                      padding: '16px',
                      border: '1px solid #e8e8e8',
                    }}
                  >
                    <h6
                      style={{
                        margin: '0 0 16px 0',
                        color: '#333',
                        fontWeight: '600',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <MapPin size={14} className="me-2" style={{ color: '#009efb' }} />
                      Address
                    </h6>

                    <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                      {(() => {
                        const addr = selectedSupplier.address;
                        const hasAddressObject = addr && typeof addr === 'object';
                        const addressLine1 = hasAddressObject
                          ? addr.addressLine1 || addr.street
                          : selectedSupplier.addressLine1 || selectedSupplier.street;
                        const addressLine2 = hasAddressObject
                          ? addr.addressLine2
                          : selectedSupplier.addressLine2;
                        const city = hasAddressObject ? addr.city : selectedSupplier.city;
                        const state = hasAddressObject ? addr.state : selectedSupplier.state;
                        const postalCode = hasAddressObject
                          ? addr.postalCode || addr.zipCode
                          : selectedSupplier.postalCode || selectedSupplier.zipCode;
                        const country = hasAddressObject ? addr.country : selectedSupplier.country;

                        if (addressLine1 || city || state || country) {
                          return (
                            <>
                              {addressLine1 && (
                                <p style={{ margin: '0 0 4px 0', color: '#333' }}>{addressLine1}</p>
                              )}
                              {addressLine2 && (
                                <p style={{ margin: '0 0 4px 0', color: '#333' }}>{addressLine2}</p>
                              )}
                              {(city || state || postalCode) && (
                                <p style={{ margin: '0', color: '#666' }}>
                                  {[city, state, postalCode].filter(Boolean).join(', ')}
                                </p>
                              )}
                              {country && (
                                <p style={{ margin: '4px 0 0 0', color: '#666', fontWeight: '500' }}>
                                  {country}
                                </p>
                              )}
                            </>
                          );
                        }
                        return <p style={{ margin: 0, color: '#888' }}>Address not available</p>;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Rating Breakdown */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    padding: '16px',
                    border: '1px solid #e8e8e8',
                    marginTop: '20px',
                  }}
                >
                  <h6
                    style={{
                      margin: '0 0 16px 0',
                      color: '#333',
                      fontWeight: '600',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Award size={14} className="me-2" style={{ color: '#009efb' }} />
                    Performance Ratings
                  </h6>

                  {supplierRatings ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '16px',
                      }}
                    >
                      {/* Quality Rating */}
                      <div className="text-center">
                        <div
                          style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: '#28a745',
                          }}
                        >
                          {(supplierRatings.qualityRating || 0).toFixed(1)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          Quality
                        </div>
                        <div className="d-flex justify-content-center mt-1">
                          {renderStarRating(supplierRatings.qualityRating || 0)}
                        </div>
                      </div>

                      {/* Delivery Rating */}
                      <div className="text-center">
                        <div
                          style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: '#009efb',
                          }}
                        >
                          {(supplierRatings.deliveryPerformanceRating || 0).toFixed(1)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          Delivery
                        </div>
                        <div className="d-flex justify-content-center mt-1">
                          {renderStarRating(supplierRatings.deliveryPerformanceRating || 0)}
                        </div>
                      </div>

                      {/* Pricing Rating */}
                      <div className="text-center">
                        <div
                          style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: '#ffc107',
                          }}
                        >
                          {(supplierRatings.pricingCostTransparencyRating || 0).toFixed(1)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          Pricing
                        </div>
                        <div className="d-flex justify-content-center mt-1">
                          {renderStarRating(supplierRatings.pricingCostTransparencyRating || 0)}
                        </div>
                      </div>

                      {/* Communication Rating */}
                      <div className="text-center">
                        <div
                          style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: '#17a2b8',
                          }}
                        >
                          {(supplierRatings.communicationResponsivenessRating || 0).toFixed(1)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          Communication
                        </div>
                        <div className="d-flex justify-content-center mt-1">
                          {renderStarRating(supplierRatings.communicationResponsivenessRating || 0)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <p style={{ margin: 0, color: '#888', fontSize: '13px' }}>
                        No ratings available for this supplier yet.
                      </p>
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                {(selectedSupplier.description || selectedSupplier.notes) && (
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '10px',
                      padding: '16px',
                      border: '1px solid #e8e8e8',
                      marginTop: '20px',
                    }}
                  >
                    <h6
                      style={{
                        margin: '0 0 12px 0',
                        color: '#333',
                        fontWeight: '600',
                        fontSize: '14px',
                      }}
                    >
                      About
                    </h6>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        color: '#666',
                        lineHeight: '1.6',
                      }}
                    >
                      {selectedSupplier.description || selectedSupplier.notes}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-5">
              <Package size={48} style={{ color: '#ccc' }} />
              <p className="text-muted mt-3 mb-0">Supplier details not available</p>
            </div>
          )}
        </ModalBody>
        <ModalFooter style={{ borderTop: '1px solid #e8e8e8', padding: '12px 24px' }}>
          <Button
            color="secondary"
            outline
            onClick={handleCloseSupplierModal}
            style={{ borderRadius: '6px', padding: '8px 20px' }}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default SearchCatalog;
