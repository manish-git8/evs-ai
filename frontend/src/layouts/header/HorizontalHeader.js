import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import {
  Navbar,
  Nav,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  Button,
  Container,
  Badge,
  Input,
  Spinner,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from 'reactstrap';
import {
  ShoppingCart,
  Bell,
  Search,
  X,
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
} from 'react-feather';
import SimpleBar from 'simplebar-react';
import { useSelector, useDispatch } from 'react-redux';
import user1 from '../../assets/images/users/user4.jpg';
import ProfileDD from './ProfileDD';
import HorizontalLogo from '../logo/HorizontalLogo';
import { ToggleMobileSidebar } from '../../store/customizer/CustomizerSlice';
import UserService from '../../services/UserService';
import FileUploadService from '../../services/FileUploadService';
import CartService from '../../services/CartService';
import ApprovalPolicyManagementService from '../../services/ApprovalPolicyManagementService';
import CatalogItemService from '../../services/CatalogItemService';
import SupplierService from '../../services/SupplierService';
import { getEntityType, getEntityId, getUserId, getUserRole, getCompanyName, setCompanyName } from '../../pages/localStorageUtil';
import { CartConstant } from '../../constant/CartConstant';
import NotificationDD from './NotificationDD';
import UserDashboardService from '../../services/UserDashboardService';
import FeedBackService from '../../services/FeedBackService';
import CompanyService from '../../services/CompanyService';

const HorizontalHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const entityType = getEntityType();

  // Check if we're on the search-catalog page
  const isOnSearchCatalogPage = location.pathname === '/search-catalog';
  const isDarkMode = useSelector((state) => state.customizer.isDark);
  const topbarColor = useSelector((state) => state.customizer.topbarBg);
  const isMobileSidebar = useSelector((state) => state.customizer.isMobileSidebar);
  const [profileImage, setProfileImage] = useState(localStorage.getItem('profileImageBase64') || '');
  const [companyName, setCompanyNameState] = useState(getCompanyName() || '');
  const [cartCount, setCartCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const storedUserDetail = JSON.parse(localStorage.getItem('userDetails'));
  const isCompany = storedUserDetail?.entityType === 'COMPANY';
  const companyId = getEntityId();
  const userId = getUserId();
  const userRoles = getUserRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [, setShowSearchResults] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [supplierModal, setSupplierModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isLoadingSupplier, setIsLoadingSupplier] = useState(false);
  const [supplierRatings, setSupplierRatings] = useState(null);

  const fetchCartCount = useCallback(async () => {
    try {
      // Use pageSize 1 since we only need totalElements for the count
      const response = await CartService.getCartsPaginated(
        companyId,
        1,
        0,
        '',
        userId,
        '',
        CartConstant.DRAFT,
      );

      // Use totalElements from paginated response for accurate count
      if (response.data?.totalElements !== undefined) {
        setCartCount(response.data.totalElements);
      } else {
        const responseData = response.data?.content ? response.data.content : response.data || [];
        setCartCount(Array.isArray(responseData) ? responseData.length : 0);
      }
    } catch (error) {
      console.error('Error fetching cart count:', error);
      setCartCount(0);
    }
  }, [companyId, userId]);

  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const response = await UserDashboardService.getNotificationCount(userId);
        if (response.data !== null && response.data !== undefined) {
          setNotificationCount(response.data);
        }
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    fetchNotificationCount();
    const intervalId = setInterval(fetchNotificationCount, 120000);

    return () => clearInterval(intervalId);
  }, [userId]);

  // Sync search term from URL when on search-catalog page
  useEffect(() => {
    if (isOnSearchCatalogPage) {
      const params = new URLSearchParams(location.search);
      const urlSearch = params.get('search') || '';
      if (urlSearch !== searchTerm) {
        setSearchTerm(urlSearch);
      }
    }
  }, [location.search, isOnSearchCatalogPage]);

  const fetchProfileImage = (fileId) => {
    const cachedImage = localStorage.getItem('profileImageBase64');
    if (cachedImage) {
      setProfileImage(cachedImage);
      return;
    }

    FileUploadService.getFileByFileId(fileId, { silent: true })
      .then((response) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result;
          localStorage.setItem('profileImageBase64', base64data);
          setProfileImage(base64data);
        };
        reader.readAsDataURL(response.data);
      })
      .catch((error) => console.warn('Could not fetch profile image:', error));
  };

  useEffect(() => {
    const storedUserDetails = JSON.parse(localStorage.getItem('userDetails'));

    if (storedUserDetails) {
      const { entityId } = storedUserDetails;

      UserService.fetchByUserId(entityId, userId, entityType)
        .then((data) => {
          const profileImageId = data?.profileImageId || data?.content?.profileImageId;
          if (profileImageId) {
            localStorage.setItem('profileImageId', profileImageId);
            fetchProfileImage(profileImageId);
          }
        })
        .catch((error) => console.error('Error fetching user data:', error));
    }

    if (isCompany) {
      fetchCartCount();
    }
  }, [fetchCartCount, entityType, isCompany, userId]);

  useEffect(() => {
    const handleCartUpdated = () => {
      fetchCartCount();
    };
    

    window.addEventListener('cartAdded', handleCartUpdated);
    window.addEventListener('cartDeleted', handleCartUpdated);
    const intervalId = setInterval(() => {
      if (isCompany) {
        fetchCartCount();
      }
    }, 30000);
    return () => {
      window.removeEventListener('cartAdded', handleCartUpdated);
      window.removeEventListener('cartDeleted', handleCartUpdated);
      clearInterval(intervalId);
    };
  }, [fetchCartCount, isCompany]);

  


  // Listen for profile image updates from UserProfile page
  useEffect(() => {
    const handleProfileImageUpdate = () => {
      const updatedImage = localStorage.getItem('profileImageBase64');
      if (updatedImage) {
        setProfileImage(updatedImage);
      }
    };

    window.addEventListener('profileImageUpdated', handleProfileImageUpdate);
    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate);
    };
  }, []);

  // Fetch and cache company name
  useEffect(() => {
    const fetchCompanyName = async () => {
      if (isCompany && companyId && !companyName) {
        try {
          const response = await CompanyService.getCompanyByCompanyId(companyId);
          const company = response.data?.[0] || response.data;
          if (company?.displayName || company?.name) {
            const name = company.displayName || company.name;
            setCompanyNameState(name);
            setCompanyName(name); // Store in localStorage
          }
        } catch (error) {
          console.error('Error fetching company name:', error);
        }
      }
    };

    fetchCompanyName();
  }, [isCompany, companyId, companyName]);

  const formatCurrency = (amount, currency = 'USD') => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleSearch = async () => {
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await CatalogItemService.getCatalogItemsBySearch(
        100,
        0,
        searchTerm,
        companyId,
      );
      setSearchResults(response || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching products:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim() !== '') {
        handleSearch();
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const removeContentBlur = () => {
    const contentArea = document.querySelector('.boxContainer');
    if (contentArea) {
      contentArea.style.filter = 'none';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !event.target.closest('.header-search-container') &&
        !event.target.closest('.search-overlay') &&
        !event.target.closest('.search-results-panel')
      ) {
        setShowSearchResults(false);
        setIsSearchFocused(false);
        removeContentBlur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup blur on unmount
  useEffect(() => {
    return () => {
      removeContentBlur();
    };
  }, []);

  const handleSearchFocus = () => {
    // On search-catalog page, don't show overlay/blur - just focus on the input
    if (isOnSearchCatalogPage) {
      setIsSearchFocused(true);
      return;
    }

    setIsSearchFocused(true);
    if (searchResults.length > 0) {
      setShowSearchResults(true);
    }
    // Add blur class to page content
    const contentArea = document.querySelector('.boxContainer');
    if (contentArea) {
      contentArea.style.filter = 'blur(4px)';
      contentArea.style.transition = 'filter 0.2s ease-out';
    }
  };

  const handleCloseSearch = () => {
    // On search-catalog page, don't clear search - it's managed by the page
    if (isOnSearchCatalogPage) {
      setIsSearchFocused(false);
      return;
    }

    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
    setIsSearchFocused(false);
    removeContentBlur();
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const { value } = e.target;
    setSearchTerm(value);
  };

  // Debounced URL update when on search-catalog page
  useEffect(() => {
    let timer;

    if (isOnSearchCatalogPage) {
      timer = setTimeout(() => {
        const newUrl = searchTerm.trim()
          ? `/search-catalog?search=${encodeURIComponent(searchTerm.trim())}`
          : '/search-catalog';
        navigate(newUrl, { replace: true });
      }, 300);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [searchTerm, isOnSearchCatalogPage, navigate]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchTerm.trim() !== '') {
      e.preventDefault();

      if (isOnSearchCatalogPage) {
        // Already on search-catalog page, just update URL (already done in handleSearchChange)
        // Trigger a re-render by navigating with replace
        navigate(`/search-catalog?search=${encodeURIComponent(searchTerm.trim())}`, {
          replace: true,
        });
        return;
      }

      // Close the search overlay
      handleCloseSearch();
      // Navigate to search catalog page with search term as query parameter
      navigate(`/search-catalog?search=${encodeURIComponent(searchTerm.trim())}`);
    }
    if (e.key === 'Escape') {
      handleCloseSearch();
    }
  };

  const handleAddToCartClick = (product, e) => {
    e.stopPropagation();
    setSelectedProduct(product);
    setConfirmModal(true);
  };

  const handleConfirmAddToCart = async () => {
    if (!selectedProduct) return;

    try {
      setIsAddingToCart(true);
      toast.dismiss();

      const approvalRes = await ApprovalPolicyManagementService.getApprovalPolicyStatus(companyId);
      const policyData = approvalRes.data || approvalRes;

      const isCartPolicyActive = policyData?.cart === true;
      const isPOPolicyActive = policyData?.purchaseOrder === true;

      if (!isCartPolicyActive || !isPOPolicyActive) {
        const msg = !isCartPolicyActive
          ? 'Cart approval policy is not active, unable to create cart.'
          : 'Purchase order approval policy is not active, unable to create cart.';
        toast.error(msg);
        setIsAddingToCart(false);
        setConfirmModal(false);
        return;
      }
      const newCartData = { companyId };
      const cartResponse = await CartService.handleCartCompany(newCartData, companyId);
      const newCartId = cartResponse.data?.cartId;

      if (!newCartId) {
        toast.error('Failed to create cart');
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
        currencyCode: selectedProduct.Currency || 'USD',
        internalBuyerQuoteFile: 0,
        priceUpdate: false,
        classId: null,
        locationId: null,
        productId: selectedProduct.ProductId || selectedProduct.productId || 1,
        manufacturerName:
          selectedProduct.Manufacturer || selectedProduct.ManufacturerName || 'Unknown',
        manufacturerPart: selectedProduct.ManufacturerPart || selectedProduct.PartId,
      };

      await CartService.handleCreateCart(requestBody, companyId, newCartId);

      toast.success('Cart created and product added successfully!');
      setConfirmModal(false);
      setSelectedProduct(null);
      setSearchTerm('');
      setShowSearchResults(false);
      setIsSearchFocused(false);
      removeContentBlur();

      window.dispatchEvent(new Event('cartAdded'));
      fetchCartCount();

      navigate(`/cartDetails/${newCartId}`);
    } catch (error) {
      console.error('Error creating cart and adding product:', error);
      if (error.response?.data?.errorMessage) {
        toast.error(error.response.data.errorMessage);
      } else {
        toast.error('Failed to create cart');
      }
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleCancelAddToCart = () => {
    setConfirmModal(false);
    setSelectedProduct(null);
  };

  const handleSupplierClick = async (supplier, e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!supplier?.supplierId) return;

    setIsLoadingSupplier(true);
    setSupplierModal(true);
    setSupplierRatings(null);

    try {
      // Fetch supplier details and ratings in parallel
      const [supplierResponse, ratingsResponse] = await Promise.all([
        SupplierService.getSupplierById(supplier.supplierId),
        FeedBackService.getAllFeedbackForCompanyBySupplier(companyId, supplier.supplierId).catch(
          () => null,
        ),
      ]);

      const supplierData = supplierResponse.data?.[0] || supplierResponse.data || supplier;
      setSelectedSupplier(supplierData);

      // Process ratings - calculate averages from all feedback records
      if (ratingsResponse?.data && ratingsResponse.data.length > 0) {
        const feedbacks = ratingsResponse.data;
        const totalReviews = feedbacks.length;

        // Calculate average ratings across all feedbacks
        const avgDelivery =
          feedbacks.reduce((sum, f) => sum + (f.deliveryPerformanceRating || 0), 0) / totalReviews;
        const avgQuality =
          feedbacks.reduce((sum, f) => sum + (f.qualityRating || 0), 0) / totalReviews;
        const avgPricing =
          feedbacks.reduce((sum, f) => sum + (f.pricingCostTransparencyRating || 0), 0) /
          totalReviews;
        const avgCommunication =
          feedbacks.reduce((sum, f) => sum + (f.communicationResponsivenessRating || 0), 0) /
          totalReviews;
        const avgOverall =
          feedbacks.reduce((sum, f) => sum + (f.overallRating || 0), 0) / totalReviews;

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
          <Star key={i} size={16} fill="#ffc107" color="#ffc107" style={{ marginRight: '2px' }} />,
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
        stars.push(<Star key={i} size={16} color="#e0e0e0" style={{ marginRight: '2px' }} />);
      }
    }
    return stars;
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <Navbar
      color={topbarColor}
      dark={!isDarkMode}
      light={isDarkMode}
      expand="lg"
      className="shadow HorizontalTopbar elegant-topbar p-1"
      style={{
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        transition: 'all 0.3s ease',
      }}
    >
      <Container
        className="d-flex align-items-center justify-content-between"
        style={{ '--bs-gutter-x': '-0.15rem' }}
      >
        {/* Left Section - Logo and Menu */}
        <div className="d-flex align-items-center">
          <div className="pe-4 py-3">
            <HorizontalLogo />
          </div>
          {isCompany && companyName && (
            <div
              className="d-none d-md-flex align-items-center me-3"
              style={{
                borderLeft: '1px solid rgba(255,255,255,0.3)',
                paddingLeft: '16px',
                marginLeft: '8px',
              }}
            >
              <Briefcase size={16} className="text-white-50 me-2" />
              <span
                style={{
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '14px',
                  maxWidth: '200px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={companyName}
              >
                {companyName}
              </span>
            </div>
          )}
          <Nav className="flex-row" navbar>
            <Button
              color={topbarColor}
              className="d-sm-block d-lg-none"
              onClick={() => dispatch(ToggleMobileSidebar())}
            >
              <i className={`bi ${isMobileSidebar ? 'bi-x' : 'bi-list'}`} />
            </Button>
          </Nav>
        </div>

        {/* Center Section - Search Bar */}
        {isCompany && (userRoles.includes('BUYER') || userRoles.includes('COMPANY_ADMIN')) && (
          <div
            className="header-search-container position-relative"
            style={{
              flex: '0 0 500px',
              maxWidth: '500px',
              position: 'absolute',
              left: '20%',
              transform: 'translateX(-50%)',
              zIndex: isSearchFocused ? 1060 : 1,
            }}
          >
            <div className="position-relative">
              <Input
                type="text"
                placeholder="Search by Part ID, Description, Supplier..."
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                className="form-control"
                style={{
                  paddingLeft: '40px',
                  paddingRight: searchTerm ? '40px' : '15px',
                  borderRadius: '8px',
                  border: isSearchFocused ? '2px solid #009efb' : '1px solid #e0e0e0',
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                  boxShadow: isSearchFocused ? '0 0 0 3px rgba(0, 158, 251, 0.1)' : 'none',
                }}
                onFocus={handleSearchFocus}
              />
              <Search
                size={16}
                className="position-absolute"
                style={{
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: isSearchFocused ? '#009efb' : '#666',
                }}
              />
              {searchTerm && (
                <Button
                  color="link"
                  size="sm"
                  className="position-absolute p-0"
                  style={{
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#666',
                  }}
                  onClick={handleCloseSearch}
                >
                  <X size={16} />
                </Button>
              )}
              {isSearching && (
                <Spinner
                  size="sm"
                  className="position-absolute"
                  style={{
                    right: searchTerm ? '35px' : '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#009efb',
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Search Overlay with Results - Don't show when on search-catalog page */}
        {isCompany && isSearchFocused && !isOnSearchCatalogPage && (
          <>
            {/* Translucent Overlay - Only covers content below header */}
            <div
              className="search-overlay"
              onClick={handleCloseSearch}
              style={{
                position: 'fixed',
                top: '60px',
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                zIndex: 1055,
                animation: 'fadeIn 0.2s ease-out',
              }}
            />

            {/* Search Results Panel */}
            <div
              className="search-results-panel"
              style={{
                position: 'fixed',
                top: '70px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '90%',
                maxWidth: '800px',
                maxHeight: 'calc(100vh - 120px)',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                zIndex: 1060,
                overflow: 'hidden',
                animation: 'slideDown 0.3s ease-out',
              }}
            >
              {/* Results Header */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e0e0e0',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h5 style={{ margin: 0, color: '#333', fontWeight: '600' }}>
                    <Search size={18} className="me-2" style={{ color: '#009efb' }} />
                    Search Products
                  </h5>
                  {searchTerm && (
                    <small className="text-muted">
                      {isSearching
                        ? 'Searching...'
                        : `${searchResults.length} result${
                            searchResults.length !== 1 ? 's' : ''
                          } for "${searchTerm}"`}
                    </small>
                  )}
                </div>
                <Button
                  color="link"
                  className="p-1"
                  onClick={handleCloseSearch}
                  style={{ color: '#666' }}
                >
                  <X size={20} />
                </Button>
              </div>

              {/* Results Content */}
              <SimpleBar style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {isSearching && (
                  <div className="text-center py-5">
                    <Spinner color="primary" />
                    <p className="text-muted mt-3 mb-0">Searching products...</p>
                  </div>
                )}

                {!isSearching && searchResults.length > 0 && (
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
                        {/* Product Image - Fixed Width */}
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

                        {/* Product Info - Fixed Layout */}
                        <div
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
                        >
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
                              <Tag
                                size={11}
                                className="me-1"
                                style={{ color: '#009efb', flexShrink: 0 }}
                              />
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
                              <Briefcase
                                size={11}
                                className="me-1"
                                style={{ color: '#009efb', flexShrink: 0 }}
                              />
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
                              <Package
                                size={11}
                                className="me-1"
                                style={{ color: '#009efb', flexShrink: 0 }}
                              />
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
                                <span
                                  style={{ marginLeft: '4px', fontWeight: '500', color: '#333' }}
                                >
                                  N/A
                                </span>
                              )}
                            </div>

                            {/* Qty Per Unit */}
                            <div className="d-flex align-items-center">
                              <Package
                                size={11}
                                className="me-1"
                                style={{ color: '#009efb', flexShrink: 0 }}
                              />
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

                          {/* Row 2.5: Specifications (if available) */}
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
                              <span style={{ color: '#888', fontWeight: '500' }}>
                                Specifications:{' '}
                              </span>
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

                          {/* Row 2.6: Safety & Availability Badges */}
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

                          {/* Row 3: Price & Add to Cart */}
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
                )}

                {!isSearching && searchResults.length === 0 && searchTerm && (
                  <div className="text-center py-5">
                    <Package size={48} style={{ color: '#ccc' }} />
                    <h6 className="text-muted mt-3">No products found</h6>
                    <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                      Try adjusting your search terms
                    </p>
                  </div>
                )}

                {!isSearching && !searchTerm && (
                  <div className="text-center py-5">
                    <Search size={48} style={{ color: '#ccc' }} />
                    <h6 className="text-muted mt-3">Start typing to search</h6>
                    <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                      Search by Cart No, Part ID, Description, Supplier, or Manufacturer
                    </p>
                  </div>
                )}
              </SimpleBar>
            </div>

            {/* CSS Animation Styles */}
            <style>
              {`
                @keyframes fadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                @keyframes slideDown {
                  from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-20px);
                  }
                  to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                  }
                }
              `}
            </style>
          </>
        )}

        {/* Right Section - Icons and Profile */}
        <div className="d-flex align-items-center">
          <UncontrolledDropdown>
            <DropdownToggle
              className="hov-dd border-0 elegant-icon-button"
              color={topbarColor}
              style={{
                borderRadius: '6px',
                padding: '6px 10px',
                transition: 'all 0.3s ease',
                position: 'relative',
                minWidth: '38px',
                minHeight: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.target.style.background =
                  'linear-gradient(135deg, rgba(0, 158, 251, 0.1) 0%, rgba(102, 126, 234, 0.08) 100%)';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 158, 251, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <Bell size={16} />
              {notificationCount > 0 && (
                <Badge
                  color="danger"
                  pill
                  className="position-absolute elegant-notification-badge"
                  style={{
                    top: '-4px',
                    right: '-4px',
                    fontSize: '0.55rem',
                    background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                    border: '1px solid white',
                    boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)',
                    minWidth: '16px',
                    height: '16px',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '5px',
                  }}
                >
                  {notificationCount}
                </Badge>
              )}
            </DropdownToggle>
            <DropdownMenu className="ddWidth" end>
              <SimpleBar style={{ maxHeight: '350px' }}>
                <NotificationDD />
              </SimpleBar>
            </DropdownMenu>
          </UncontrolledDropdown>
          {isCompany && (userRoles.includes('BUYER') || userRoles.includes('COMPANY_ADMIN')) && (
            <Button
              color={topbarColor}
              className="hov-dd border-0 position-relative mx-2 elegant-cart-button"
              onClick={() => navigate('/MyCart')}
              style={{
                borderRadius: '6px',
                padding: '6px 10px',
                transition: 'all 0.3s ease',
                minWidth: '38px',
                minHeight: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.target.style.background =
                  'linear-gradient(135deg, rgba(0, 158, 251, 0.1) 0%, rgba(102, 126, 234, 0.08) 100%)';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 158, 251, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <ShoppingCart size={16} />
              {cartCount > 0 && (
                <Badge
                  color="danger"
                  pill
                  className="position-absolute elegant-cart-badge"
                  style={{
                    top: '-4px',
                    right: '-4px',
                    fontSize: '0.55rem',
                    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                    border: '1px solid white',
                    boxShadow: '0 2px 8px rgba(40, 167, 69, 0.3)',
                    minWidth: '16px',
                    height: '16px',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '5px',
                  }}
                >
                  {cartCount}
                </Badge>
              )}
            </Button>
          )}

          <UncontrolledDropdown>
            <DropdownToggle
              tag="span"
              className="p-2 cursor-pointer elegant-profile-toggle"
              style={{
                borderRadius: '50%',
                transition: 'all 0.3s ease',
                display: 'inline-block',
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)';
                e.target.style.boxShadow = '0 4px 20px rgba(0, 158, 251, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <img
                src={profileImage || user1}
                alt="profile"
                className="rounded-circle border border-light shadow-sm elegant-profile-image"
                width="40"
                height="40"
                style={{
                  objectFit: 'cover',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '3px solid rgba(0, 158, 251, 0.2)',
                  transition: 'all 0.3s ease',
                }}
              />
            </DropdownToggle>
            <DropdownMenu className="ddWidth">
              <ProfileDD />
              <div className="p-2 px-3">
                <Button color="danger" size="sm" onClick={handleLogout}>
                  <Link to="/" className={`nav-link ${topbarColor === 'white' ? 'text-dark' : ''}`}>
                    Logout
                  </Link>
                </Button>
              </div>
            </DropdownMenu>
          </UncontrolledDropdown>
        </div>
      </Container>

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
  onClick={() => {
    Swal.fire({
      title: 'Confirm Action',
      text: 'Are you sure you want to create cart and add this item?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Proceed',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#009efb',
      cancelButtonColor: '#6c757d',
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.close();
        setTimeout(() => {
          handleConfirmAddToCart(); 
        }, 100);
      }
    });
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
        onClosed={() => {
          // Ensure search modal stays open
        }}
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
                    {selectedSupplier.name &&
                      selectedSupplier.displayName !== selectedSupplier.name && (
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
                      {selectedSupplier.supplierStatus ||
                        (selectedSupplier.isActive !== false ? 'ACTIVE' : 'INACTIVE')}
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
                        // Handle address as object or string
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
                                <p
                                  style={{ margin: '4px 0 0 0', color: '#666', fontWeight: '500' }}
                                >
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
    </Navbar>
  );
};

export default HorizontalHeader;
