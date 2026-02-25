import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Row,
  Col,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Label,
  FormGroup,
  Card,
  CardBody,
  CardHeader,
  Input,
} from 'reactstrap';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import '../CompanyManagement/ReactBootstrapTable.scss';
import CatalogItemService from '../../services/CatalogItemService';
import DepartmentService from '../../services/DepartmentService';
import LocationService from '../../services/LocationService';
import GLAccountService from '../../services/GLaccountService';
import CartService from '../../services/CartService';
import ClassService from '../../services/ClassService';
import ProjectService from '../../services/ProjectService';
import CompanyService from '../../services/CompanyService';

const ProductList = () => {
  const navigate = useNavigate();
  const { companyId, cartId, shipToAddressId } = useParams();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [partId, setPartId] = useState('');
  const [selectedUnitOfMeasure, setSelectedUnitOfMeasure] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [calssList, setClassList] = useState([]);
  const [departmentList, setDepartmentList] = useState([]);
  const [locationList, setLocationList] = useState([]);
  const [glAccountList, setGlAccountList] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [settings, setSettings] = useState({});
  const [addedToCart, setAddedToCart] = useState({});
  const [loading, setLoading] = useState(false);
  const [productDetailsModal, setProductDetailsModal] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [cartDetails, setCartDetails] = useState(null);
  const [cartItems, setCartItems] = useState({}); // Store cart items with quantities

  // Cart account settings for inheritance
  const [cartAccountSettings, setCartAccountSettings] = useState({
    projectId: null,
    departmentId: null,
    glAccountId: null,
    classId: null,
    locationId: null,
  });
  const toggleModal = () => setIsModalOpen(!isModalOpen);
  const toggleProductDetailsModal = () => setProductDetailsModal(!productDetailsModal);

  const fetchCompanySettings = async () => {
    try {
      const response = await CompanyService.getCompanySetting(companyId);
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

  const fetchExistingCartItems = async () => {
    try {
      const cartDetailsResponse = await CartService.getCartDetailById(cartId, companyId);
      if (cartDetailsResponse.data && cartDetailsResponse.data.length > 0) {
        const itemsMap = {};
        cartDetailsResponse.data.forEach((item) => {
          if (item.partId) {
            itemsMap[item.partId] = {
              quantity: item.qty || 0,
              cartDetailId: item.cartDetailId,
            };
          }
        });
        setCartItems(itemsMap);
      }
    } catch (error) {
      console.error('Error fetching existing cart items:', error);
    }
  };

  const fetchCartAccountSettings = async () => {
    try {
      console.log('=== FETCHING CART ACCOUNT SETTINGS FOR INHERITANCE ===');

      // Try to get cart header first
      const cartHeaderResponse = await CartService.getCartsPaginated(
        companyId,
        1,
        0,
        '',
        '',
        cartId,
      );
      // Extract from paginated response structure or legacy structure
      const responseData = cartHeaderResponse.data?.content
        ? cartHeaderResponse.data.content
        : cartHeaderResponse.data || [];
      if (responseData && responseData.length > 0) {
        const cartHeader = responseData[0];
        console.log('Cart header data:', cartHeader);

        // Store cart details for display
        setCartDetails({
          cartNo: cartHeader.cartNo,
          cartName: cartHeader.cartName,
        });

        // Check if cart header has account settings
        if (
          cartHeader.projectId ||
          cartHeader.departmentId ||
          cartHeader.glAccountId ||
          cartHeader.classId ||
          cartHeader.locationId
        ) {
          console.log('Using cart header account settings');
          console.log('=== SPECIFIC GL ACCOUNT DEBUG - CART HEADER ===');
          console.log('cartHeader.glAccountId:', cartHeader.glAccountId);
          console.log('cartHeader.gLAccountId:', cartHeader.gLAccountId);
          console.log('cartHeader.GLAccountId:', cartHeader.GLAccountId);
          console.log('All cart header fields:', Object.keys(cartHeader));

          setCartAccountSettings({
            projectId: cartHeader.projectId,
            departmentId: cartHeader.departmentId,
            glAccountId: cartHeader.glAccountId || cartHeader.gLAccountId || cartHeader.GLAccountId,
            classId: cartHeader.classId,
            locationId: cartHeader.locationId,
          });
          return;
        }
      }

      // If cart header doesn't have values, try to get from first cart item
      const cartDetailsResponse = await CartService.getCartDetailById(cartId, companyId);
      if (cartDetailsResponse.data && cartDetailsResponse.data.length > 0) {
        const firstItem = cartDetailsResponse.data[0];
        console.log('First cart item data:', firstItem);

        console.log('Using first cart item account settings');
        console.log('=== SPECIFIC GL ACCOUNT DEBUG - FIRST CART ITEM ===');
        console.log('firstItem.glAccountId:', firstItem.glAccountId);
        console.log('firstItem.gLAccountId:', firstItem.gLAccountId);
        console.log('firstItem.GLAccountId:', firstItem.GLAccountId);
        console.log('All first item fields:', Object.keys(firstItem));

        setCartAccountSettings({
          projectId: firstItem.projectId,
          departmentId: firstItem.departmentId,
          glAccountId: firstItem.glAccountId || firstItem.gLAccountId || firstItem.GLAccountId,
          classId: firstItem.classId,
          locationId: firstItem.locationId,
        });
      } else {
        console.log('No existing cart items found, using null values');
      }
    } catch (error) {
      console.error('Error fetching cart account settings:', error);
    }
  };

  useEffect(() => {
    fetchCompanySettings();
    fetchCartAccountSettings();
    fetchExistingCartItems();
  }, [companyId, cartId]);

  const navigateToCartDetails = () => {
    navigate(`/cartDetails/${cartId}/${shipToAddressId}?&cartStatusType=DRAFT`);
  };

  const handleModalSubmit = async (values) => {
    if (selectedProduct) {
      const requestBody = {
        cartId,
        supplierId: selectedProduct.Supplier?.supplierId,
        projectId: values.projectId,
        catalogId: selectedProduct.CatalogId,
        catalogItemId: {
          CatalogItemId: selectedProduct.CatalogItemId,
          PartId: partId,
          ProductImageURL: selectedProduct.ProductImageURL,
        },
        partId,
        partDescription: selectedProduct.Description || '',
        departmentId: values.departmentId,
        orderType: 0,
        glAccountId: values.glAccountId,
        isCritical: true,
        isSafetyAppReq: false,
        slimit: 'some limit',
        quantity: selectedQuantity,
        price: selectedProduct.UnitPrice,
        unitOfMeasure: selectedUnitOfMeasure || 'piece',
        currencyCode: selectedProduct.Currency || 'USD',
        internalBuyerQuoteFile: 0,
        priceUpdate: false,
        classId: values.classId,
        locationId: values.locationId,
        productId: selectedProduct.ProductId || 1,
        manufacturerName: selectedProduct.Manufacturer || 'ABC Corp',
        manufacturerPart: selectedProduct.ManufacturerPart || 'MP-12345',
      };

      console.log('Request Body:', requestBody);

      try {
        const response = await CartService.handleCreateCart(requestBody, companyId, cartId);
        if (response.data) {
          toast.dismiss();
          toast.success('Product added to cart successfully!');
          setIsModalOpen(false);
          setAddedToCart((prev) => ({
            ...prev,
            [selectedProduct.CatalogItemId]: true,
          }));
          // Reset quantity for the selected product
          setQuantities((prevQuantities) => ({
            ...prevQuantities,
            [selectedProduct.CatalogItemId]: 1,
          }));
          // Refresh cart items to show updated quantities
          fetchExistingCartItems();
        }
      } catch (error) {
        console.error('Error adding to cart:', error);
        if (error.response && error.response.data && error.response.data.errorMessage) {
          toast.dismiss();
          toast.error(error.response.data.errorMessage);
        } else {
          toast.dismiss();
          toast.error('An unexpected error occurred');
        }
      }
    }
  };

  const updateCartQuantity = async (product, quantity) => {
    console.log('=== UPDATING CART QUANTITY WITH ACCOUNT SETTINGS ===');
    console.log('Cart account settings:', cartAccountSettings);

    const requestBody = {
      cartId,
      supplierId: product.Supplier?.supplierId,
      projectId: cartAccountSettings.projectId || null,
      catalogId: product.CatalogId,
      catalogItemId: {
        CatalogItemId: product.CatalogItemId,
        PartId: product.PartId,
        ProductImageURL: product.ProductImageURL,
      },
      partId: product.PartId,
      partDescription: product.Description || '',
      departmentId: cartAccountSettings.departmentId || null,
      orderType: 0,
      glAccountId: cartAccountSettings.glAccountId || null,
      isCritical: true,
      isSafetyAppReq: false,
      slimit: 'some limit',
      qty: quantity,
      price: product.UnitPrice,
      unitOfMeasure: product.UnitOfMeasurement || 'piece',
      currencyCode: product.Currency || 'USD',
      internalBuyerQuoteFile: 0,
      priceUpdate: false,
      classId: cartAccountSettings.classId || null,
      locationId: cartAccountSettings.locationId || null,
      productId: product.ProductId || 1,
      manufacturerName: product.Manufacturer || 'ABC Corp',
      manufacturerPart: product.ManufacturerPart || 'MP-12345',
    };

    try {
      const response = await CartService.handleCreateCart(requestBody, companyId, cartId);
      if (response.data) {
        toast.dismiss();
        toast.success('Cart quantity updated successfully!');
        // Refresh cart items to show updated quantities
        fetchExistingCartItems();
      }
    } catch (error) {
      console.error('Error updating cart quantity:', error);
      toast.dismiss();
      toast.error(error.response?.data?.errorMessage || 'An unexpected error occurred');
    }
  };

  const handleAddToCartClick = async (product) => {
    const currentQuantity = quantities[product.CatalogItemId] || 1;
    setPartId(product.PartId);
    setSelectedUnitOfMeasure(product.UnitOfMeasurement);
    setSelectedProduct(product);
    setSelectedQuantity(currentQuantity);

    console.log('Product data:', product);
    console.log('Cart ID:', cartId);
    console.log('Company ID:', companyId);

    console.log('=== USING CART ACCOUNT SETTINGS FOR NEW PRODUCT ===');
    console.log('Cart account settings:', cartAccountSettings);

    const requestBody = {
      cartId,
      supplierId: product.Supplier?.supplierId,
      projectId: cartAccountSettings.projectId || null,
      catalogId: product.CatalogId,
      catalogItemId: {
        CatalogItemId: product.CatalogItemId,
        PartId: product.PartId,
        ProductImageURL: product.ProductImageURL,
      },
      partId: product.PartId,
      partDescription: product.Description || '',
      departmentId: cartAccountSettings.departmentId || null,
      orderType: 0,
      glAccountId: cartAccountSettings.glAccountId || null,
      isCritical: true,
      isSafetyAppReq: false,
      slimit: 'some limit',
      qty: currentQuantity,
      price: product.UnitPrice,
      unitOfMeasure: product.UnitOfMeasurement || 'piece',
      currencyCode: product.Currency || 'USD',
      internalBuyerQuoteFile: 0,
      priceUpdate: false,
      classId: cartAccountSettings.classId || null,
      locationId: cartAccountSettings.locationId || null,
      productId: product.ProductId || 1,
      manufacturerName: product.Manufacturer || 'ABC Corp',
      manufacturerPart: product.ManufacturerPart || 'MP-12345',
    };

    console.log('Request body with inherited account settings:', requestBody);

    try {
      const response = await CartService.handleCreateCart(requestBody, companyId, cartId);
      if (response.data) {
        toast.dismiss();
        toast.success('Product added to cart successfully!');
        setAddedToCart((prev) => ({
          ...prev,
          [product.CatalogItemId]: true,
        }));
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      if (error.response?.data?.errorMessage) {
        toast.dismiss();
        toast.error(error.response.data.errorMessage);
      } else {
        toast.dismiss();
        toast.error('An unexpected error occurred');
      }
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let response;
      if (debouncedSearchTerm.trim() !== '') {
        response = await CatalogItemService.getCatalogItemsBySearch(
          100,
          0,
          debouncedSearchTerm,
          companyId,
        );
      } else {
        response = await CatalogItemService.getCatalogItemsWithPagination(companyId);
      }
      setProducts(response);
      setFilteredProducts(response);
    } catch (error) {
      console.error('Error fetching products:', error);
      if (error.response && error.response.data && error.response.data.errorMessage) {
        toast.dismiss();
        toast.error(error.response.data.errorMessage);
      } else {
        toast.dismiss();
        toast.error('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    if (settings.departmentEnabled) {
      const response = await DepartmentService.getAllDepartment(companyId);
      setDepartmentList(response.data || []);
    }
    if (settings.locationEnabled) {
      const response = await LocationService.getAllLocation(companyId);
      setLocationList(response.data || []);
    }
    if (settings.gLAccountEnabled) {
      const response = await GLAccountService.getAllGLAccount(companyId);
      setGlAccountList(response.data || []);
    }
    if (settings.classEnabled) {
      const response = await ClassService.getAllClass(companyId);
      setClassList(response.data || []);
    }
    if (settings.projectEnabled) {
      const response = await ProjectService.getAllProjects(companyId);
      setProjectList(response.data || []);
    }
  };

  useEffect(() => {
    fetchDropdownData();
  }, [settings]);

  const filterProducts = () => {
    // Since backend now handles multi-field search via searchTerm parameter,
    // client-side filtering is kept minimal for immediate UI feedback while typing
    if (!searchTerm) {
      setFilteredProducts(products);
      return;
    }

    const searchLower = searchTerm.toLowerCase().trim();

    const filtered = products.filter((product) => {
      const productPartId = product.PartId ? product.PartId.toLowerCase() : '';
      const description = product.Description ? product.Description.toLowerCase() : '';
      const supplier =
        product.Supplier && product.Supplier.displayName
          ? product.Supplier.displayName.toLowerCase()
          : '';
      const manufacturer = product.Manufacturer ? product.Manufacturer.toLowerCase() : '';

      return (
        productPartId.includes(searchLower) ||
        description.includes(searchLower) ||
        supplier.includes(searchLower) ||
        manufacturer.includes(searchLower)
      );
    });

    setFilteredProducts(filtered);
  };

  useEffect(() => {
    fetchProducts();
  }, [debouncedSearchTerm]);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm]);

  const validationSchema = Yup.object({
    departmentId: settings.departmentEnabled
      ? Yup.string().required('Department is required')
      : Yup.string(),
    locationId: settings.locationEnabled
      ? Yup.string().required('Location is required')
      : Yup.string(),
    glAccountId: settings.gLAccountEnabled
      ? Yup.string().required('GL Account is required')
      : Yup.string(),
    classId: settings.classEnabled ? Yup.string().required('Class is required') : Yup.string(),
    projectId: settings.projectEnabled
      ? Yup.string().required('Project is required')
      : Yup.string(),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const increaseQuantity = (productId) => {
    setQuantities((prevQuantities) => ({
      ...prevQuantities,
      [productId]: (prevQuantities[productId] || 1) + 1,
    }));
  };

  const decreaseQuantity = (productId) => {
    setQuantities((prevQuantities) => ({
      ...prevQuantities,
      [productId]: Math.max((prevQuantities[productId] || 1) - 1, 1),
    }));
  };

  const handleProductDetailsClick = (product) => {
    setSelectedProductDetails(product);
    setProductDetailsModal(true);
  };

  const options = {
    paginationShowsTotal: false,
    sizePerPageList: [],
    onRowClick: (row) => {
      handleProductDetailsClick(row);
    },
  };

  const formatCurrency = (amount, currency = 'USD') => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatStockStatus = (inStock) => {
    return (
      <span
        className={`badge ${inStock ? 'bg-success' : 'bg-danger'}`}
        style={{
          fontSize: '11px',
          padding: '6px 10px',
          borderRadius: '6px',
          fontWeight: '500',
        }}
      >
        {inStock ? 'In Stock' : 'Out of Stock'}
      </span>
    );
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
          <Card className="shadow-sm">
            <CardHeader className="bg-white border-bottom">
              <Row className="align-items-center">
                <Col md="6">
                  <div className="d-flex align-items-center gap-3">
                    <button
                      onClick={() => navigate(`/cartDetails/${cartId}`)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6c757d',
                        fontSize: '20px',
                        padding: '4px 8px',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#009efb'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#6c757d'}
                      title="Back to Cart"
                    >
                      <i className="bi bi-arrow-left-circle"></i>
                    </button>
                    <div>
                      <h4 className="mb-0" style={{ color: '#009efb', fontWeight: '600' }}>
                        <i className="bi bi-box-seam me-2"></i>
                        Product Catalog
                      </h4>
                      <p className="text-muted mb-0 mt-1">
                        {cartDetails ? (
                          <>
                            Adding products to: <strong>{cartDetails.cartNo}</strong>
                            {cartDetails.cartName && <> ({cartDetails.cartName})</>}
                          </>
                        ) : (
                          'Browse and add products to your cart'
                        )}
                      </p>
                    </div>
                  </div>
                </Col>
                <Col md="6" className="text-end">
                  <div className="d-flex align-items-center justify-content-end gap-2">
                    <div className="position-relative" style={{ flex: 1, maxWidth: '300px' }}>
                      <Input
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchInputChange}
                        placeholder="Search products..."
                        className="form-control"
                        style={{
                          paddingLeft: '40px',
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0',
                          fontSize: '14px',
                        }}
                      />
                      <i
                        className="bi bi-search position-absolute"
                        style={{
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#666',
                          fontSize: '14px',
                        }}
                      ></i>
                    </div>
                  </div>
                </Col>
              </Row>
            </CardHeader>
            <CardBody className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 mb-0">Loading products...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <i className="bi bi-box" style={{ fontSize: '48px', color: '#ccc' }}></i>
                  </div>
                  <h5 className="text-muted">No products found</h5>
                  <p className="text-muted mb-0">Try adjusting your search criteria</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <BootstrapTable
                    data={filteredProducts}
                    pagination
                    options={options}
                    tableHeaderClass="table-header"
                    className="modern-table clickable-rows"
                  >
                    <TableHeaderColumn
                      dataField="ProductImageURL"
                      isKey
                      dataFormat={(cell, row) => (
                        <div>
                          <img
                            className="product-image"
                            src={cell}
                            alt={row.Description}
                            style={{
                              width: '50px',
                              height: '50px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '1px solid #e0e0e0',
                            }}
                            onError={(e) => {
                              e.target.src =
                                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yNSAyMEMyNi4zODA3IDIwIDI3LjUgMTguODgwNyAyNy41IDE3LjVDMjcuNSAxNi4xMTkzIDI2LjM4MDcgMTUgMjUgMTVDMjMuNjE5MyAxNSAyMi41IDE2LjExOTMgMjIuNSAxNy41QzIyLjUgMTguODgwNyAyMy42MTkzIDIwIDI1IDIwWiIgZmlsbD0iIzk5OTk5OSIvPgo8cGF0aCBkPSJNMTcuNSAzMkwyMi41IDI3TDI1IDI5LjVMMzAuMDAzIDI0LjVMMzIuNSAzMlYzNUgxNy41VjMyWiIgZmlsbD0iIzk5OTk5OSIvPgo8L3N2Zz4K';
                            }}
                          />
                        </div>
                      )}
                      dataAlign="center"
                      headerAlign="center"
                      width="10%"
                    >
                      Image
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="Description"
                      dataFormat={(cell, row) => (
                        <div>
                          <div
                            style={{
                              fontWeight: '500',
                              color: '#333',
                            }}
                          >
                            {cell || 'N/A'}
                          </div>
                          {row.Manufacturer && (
                            <small className="text-muted">by {row.Manufacturer}</small>
                          )}
                        </div>
                      )}
                      dataAlign="left"
                      headerAlign="left"
                      width="25%"
                    >
                      Product Details
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="Supplier"
                      dataFormat={(cell) => (
                        <div style={{ fontSize: '14px' }}>
                          {cell && cell.displayName ? cell.displayName : 'N/A'}
                        </div>
                      )}
                      dataAlign="left"
                      headerAlign="left"
                      width="15%"
                    >
                      Supplier
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="UnitPrice"
                      dataFormat={(cell) => (
                        <div style={{ fontWeight: '500', color: '#333' }}>
                          {formatCurrency(cell || 0, 'USD')}
                        </div>
                      )}
                      dataAlign="right"
                      headerAlign="right"
                      width="12%"
                    >
                      Price
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="InStock"
                      dataFormat={(cell) => formatStockStatus(cell)}
                      dataAlign="center"
                      headerAlign="center"
                      width="10%"
                    >
                      Stock Status
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="quantity"
                      dataFormat={(cell, row) => {
                        const isAdded = addedToCart[row.CatalogItemId] || false;
                        const inCart = cartItems[row.PartId];
                        return (
                          <div className="d-flex flex-column align-items-center justify-content-center gap-1">
                            {inCart && (
                              <div style={{ fontSize: '11px', color: '#28a745', fontWeight: '600' }}>
                                In cart: {inCart.quantity}
                              </div>
                            )}
                            <div className="d-flex align-items-center justify-content-center gap-1">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const currentQuantity = quantities[row.CatalogItemId] || 1;
                                  const newQuantity = Math.max(currentQuantity - 1, 1);
                                  decreaseQuantity(row.CatalogItemId);
                                  if (isAdded || inCart) {
                                    updateCartQuantity(row, -1);
                                  }
                                }}
                                color="outline-primary"
                                disabled={(quantities[row.CatalogItemId] || 1) === 1}
                                style={{
                                  borderRadius: '6px',
                                  padding: '2px 8px',
                                  fontSize: '12px',
                                  width: '28px',
                                  height: '28px',
                                }}
                              >
                                -
                              </Button>
                              <input
                                type="number"
                                value={quantities[row.CatalogItemId] || 1}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const newQuantity = parseInt(e.target.value, 10);
                                  if (!Number.isNaN(newQuantity) && newQuantity >= 1) {
                                    setQuantities((prevQuantities) => ({
                                      ...prevQuantities,
                                      [row.CatalogItemId]: newQuantity,
                                    }));
                                    if (isAdded || inCart) {
                                      updateCartQuantity(row, newQuantity);
                                    }
                                  }
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                onFocus={(e) => {
                                  e.stopPropagation();
                                }}
                                min="1"
                                className="form-control text-center"
                                style={{
                                  width: '50px',
                                  height: '28px',
                                  fontSize: '12px',
                                  borderRadius: '6px',
                                  border: '1px solid #e0e0e0',
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const currentQuantity = quantities[row.CatalogItemId] || 1;
                                  const newQuantity = currentQuantity + 1;
                                  increaseQuantity(row.CatalogItemId);
                                  if (isAdded || inCart) {
                                    updateCartQuantity(row, +1);
                                  }
                                }}
                                color="outline-primary"
                                style={{
                                  borderRadius: '6px',
                                  padding: '2px 8px',
                                  fontSize: '12px',
                                  width: '28px',
                                  height: '28px',
                                }}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        );
                      }}
                      dataAlign="center"
                      headerAlign="center"
                      width="18%"
                    >
                      Quantity
                    </TableHeaderColumn>

                    <TableHeaderColumn
                      dataField="actions"
                      dataFormat={(cell, row) => {
                        const isAdded = addedToCart[row.CatalogItemId] || false;
                        const inCart = cartItems[row.PartId];
                        return (
                          <Button
                            color={isAdded || inCart ? 'success' : 'primary'}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click event
                              if (isAdded || inCart) {
                                navigateToCartDetails();
                              } else {
                                handleAddToCartClick(row);
                              }
                            }}
                            disabled={!row.InStock}
                            style={{
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}
                          >
                            {!row.InStock ? (
                              <>
                                <i className="bi bi-x-circle me-1"></i>
                                Out of Stock
                              </>
                            ) : (isAdded || inCart) ? (
                              <>
                                <i className="bi bi-cart-check me-1"></i>
                                In Cart
                              </>
                            ) : (
                              <>
                                <i className="bi bi-cart-plus me-1"></i>
                                Add to Cart
                              </>
                            )}
                          </Button>
                        );
                      }}
                      dataAlign="center"
                      headerAlign="center"
                      width="10%"
                    >
                      Action
                    </TableHeaderColumn>
                  </BootstrapTable>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Modal isOpen={isModalOpen} toggle={toggleModal}>
        <ModalHeader toggle={toggleModal}>Add Product to Cart</ModalHeader>
        <Formik
          initialValues={{
            departmentId: '',
            locationId: '',
            glAccountId: '',
            classId: '',
            projectId: '',
          }}
          validationSchema={validationSchema}
          onSubmit={(values) => handleModalSubmit(values)}
        >
          {({ isSubmitting, errors, touched }) => (
            <Form>
              <ModalBody>
                {settings.departmentEnabled && (
                  <FormGroup>
                    <Label for="departmentId">
                      Department<span className="text-danger">*</span>
                    </Label>
                    <Field
                      as="select"
                      name="departmentId"
                      id="departmentId"
                      className={`form-control${touched.departmentId && errors.departmentId ? ' is-invalid' : ''
                        }`}
                    >
                      <option value="">Select Department</option>
                      {departmentList.map((dept) => (
                        <option key={dept.departmentId} value={dept.departmentId}>
                          {dept.name}
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage
                      name="departmentId"
                      component="div"
                      className="invalid-feedback"
                    />
                  </FormGroup>
                )}
                {settings.locationEnabled && (
                  <FormGroup>
                    <Label for="locationId">
                      Location<span className="text-danger">*</span>
                    </Label>
                    <Field
                      as="select"
                      name="locationId"
                      id="locationId"
                      className={`form-control${touched.locationId && errors.locationId ? ' is-invalid' : ''
                        }`}
                    >
                      <option value="">Select Location</option>
                      {locationList.map((loc) => (
                        <option key={loc.locationId} value={loc.locationId}>
                          {loc.name}
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage name="locationId" component="div" className="invalid-feedback" />
                  </FormGroup>
                )}
                {settings.gLAccountEnabled && (
                  <FormGroup>
                    <Label for="glAccountId">
                      GL Account<span className="text-danger">*</span>
                    </Label>
                    <Field
                      as="select"
                      name="glAccountId"
                      id="glAccountId"
                      className={`form-control${touched.glAccountId && errors.glAccountId ? ' is-invalid' : ''
                        }`}
                    >
                      <option value="">Select GL Account</option>
                      {glAccountList.map((gla) => (
                        <option key={gla.glAccountId} value={gla.glAccountId}>
                          {gla.name}
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage name="glAccountId" component="div" className="invalid-feedback" />
                  </FormGroup>
                )}
                {settings.classEnabled && (
                  <FormGroup>
                    <Label for="classId">
                      Class<span className="text-danger">*</span>
                    </Label>
                    <Field
                      as="select"
                      name="classId"
                      id="classId"
                      className={`form-control${touched.classId && errors.classId ? ' is-invalid' : ''
                        }`}
                    >
                      <option value="">Select Class</option>
                      {calssList.map((cla) => (
                        <option key={cla.classId} value={cla.classId}>
                          {cla.name}
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage name="classId" component="div" className="invalid-feedback" />
                  </FormGroup>
                )}
                {settings.projectEnabled && (
                  <FormGroup>
                    <Label for="projectId">
                      Project<span className="text-danger">*</span>
                    </Label>
                    <Field
                      as="select"
                      name="projectId"
                      id="projectId"
                      className={`form-control${touched.projectId && errors.projectId ? ' is-invalid' : ''
                        }`}
                    >
                      <option value="">Select Project</option>
                      {projectList.map((pro) => (
                        <option key={pro.projectId} value={pro.projectId}>
                          {pro.name}
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage name="projectId" component="div" className="invalid-feedback" />
                  </FormGroup>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="secondary" onClick={toggleModal} disabled={isSubmitting}>
                  Back
                </Button>
                <Button color="primary" type="submit" disabled={isSubmitting}>
                  Save Cart
                </Button>
              </ModalFooter>
            </Form>
          )}
        </Formik>
      </Modal>
      {/* Product Details Modal */}
      <Modal
        isOpen={productDetailsModal}
        toggle={toggleProductDetailsModal}
        size="lg"
        centered
        style={{ maxWidth: '900px' }}
      >
        <ModalHeader
          toggle={toggleProductDetailsModal}
          style={{
            background: 'linear-gradient(135deg, #009efb, #0085d1)',
            color: 'white',
            borderBottom: 'none',
          }}
        >
          <div className="d-flex align-items-center">
            <i className="bi bi-box-seam me-2" style={{ fontSize: '20px' }}></i>
            Product Details
          </div>
        </ModalHeader>

        {selectedProductDetails && (
          <ModalBody className="p-0">
            <div style={{ background: 'linear-gradient(135deg, #f8fbff, #ffffff)' }}>
              {/* Product Header Section */}
              <div className="p-4 border-bottom">
                <div className="row align-items-center">
                  <div className="col-md-4">
                    <div className="text-center">
                      <img
                        src={selectedProductDetails.ProductImageURL}
                        alt={selectedProductDetails.Description}
                        style={{
                          width: '180px',
                          height: '180px',
                          objectFit: 'cover',
                          borderRadius: '12px',
                          border: '2px solid #e0e0e0',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                        onError={(e) => {
                          e.target.src =
                            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGNUY1RjUiLz4KICA8Y2lyY2xlIGN4PSIxMDAiIGN5PSI3MCIgcj0iMTUiIGZpbGw9IiNDQ0NDQ0MiLz4KICA8cGF0aCBkPSJNNjAgMTQwTDgwIDEyMEw5NSAxMzVMMTIwIDExMEwxNDAgMTQwVjE2MEg2MFYxNDBaIiBmaWxsPSIjQ0NDQ0NDIi8+CiAgPHRleHQgeD0iMTAwIiB5PSIxODUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2UgTm90IEF2YWlsYWJsZTwvdGV4dD4KPC9zdmc+Cg==';
                        }}
                      />
                    </div>
                  </div>
                  <div className="col-md-8">
                    <h4 className="mb-3" style={{ color: '#009efb', fontWeight: '700' }}>
                      {selectedProductDetails.Description || 'Product Name'}
                    </h4>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="d-flex align-items-center mb-2">
                          <i
                            className="bi bi-tag me-2"
                            style={{ color: '#009efb', fontSize: '16px' }}
                          ></i>
                          <div>
                            <small className="text-muted d-block">Part ID</small>
                            <span style={{ fontWeight: '500', color: '#000' }}>
                              {selectedProductDetails.PartId || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div className="d-flex align-items-center mb-2">
                          <i
                            className="bi bi-building me-2"
                            style={{ color: '#009efb', fontSize: '16px' }}
                          ></i>
                          <div>
                            <small className="text-muted d-block">Manufacturer</small>
                            <span style={{ fontWeight: '500', color: '#000' }}>
                              {selectedProductDetails.ManufacturerName || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div className="d-flex align-items-center">
                          <i
                            className="bi bi-gear me-2"
                            style={{ color: '#009efb', fontSize: '16px' }}
                          ></i>
                          <div>
                            <small className="text-muted d-block">Manufacturer Url</small>
                            {selectedProductDetails.ManufacturerURL ? (
                              <a
                                href={selectedProductDetails.ManufacturerURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontWeight: '500',
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                }}
                              >
                                {selectedProductDetails.ManufacturerURL}
                              </a>
                            ) : (
                              <span style={{ fontWeight: '500', color: '#000' }}>
                                {selectedProductDetails.ManufacturerURL || 'N/A'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="d-flex align-items-center mb-2">
                          <i
                            className="bi bi-currency-dollar me-2"
                            style={{ color: '#009efb', fontSize: '16px' }}
                          ></i>
                          <div>
                            <small className="text-muted d-block">Unit Price</small>
                            <span style={{ fontWeight: '600', color: '#000', fontSize: '18px' }}>
                              {formatCurrency(
                                selectedProductDetails.UnitPrice,
                                selectedProductDetails.Currency,
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="d-flex align-items-center mb-2">
                          <i
                            className="bi bi-rulers me-2"
                            style={{ color: '#009efb', fontSize: '16px' }}
                          ></i>
                          <div>
                            <small className="text-muted d-block">Unit of Measure</small>
                            <span style={{ fontWeight: '500', color: '#000' }}>
                              {selectedProductDetails.UnitOfMeasurement || 'piece'}
                            </span>
                          </div>
                        </div>
                        <div className="d-flex align-items-center">
                          <i
                            className="bi bi-check-circle me-2"
                            style={{
                              color: selectedProductDetails.InStock ? '#28a745' : '#dc3545',
                              fontSize: '16px',
                            }}
                          ></i>
                          <div>
                            <small className="text-muted d-block">Availability</small>
                            {formatStockStatus(selectedProductDetails.InStock)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Supplier Information */}
              <div className="p-4 border-bottom" style={{ backgroundColor: '#f8f9fa' }}>
                <h5 className="mb-3" style={{ color: '#009efb', fontWeight: '600' }}>
                  <i className="bi bi-shop me-2"></i>
                  Supplier Information
                </h5>
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-2">
                      <small className="text-muted">Supplier Name</small>
                      <div style={{ fontWeight: '500', color: '#000' }}>
                        {selectedProductDetails.Supplier?.displayName ||
                          selectedProductDetails.Supplier?.name ||
                          'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="p-4">
                <h5 className="mb-3" style={{ color: '#009efb', fontWeight: '600' }}>
                  <i className="bi bi-info-circle me-2"></i>
                  Additional Information
                </h5>
                <div className="row g-3">
                  <div className="col-md-4">
                    <div
                      className="p-3 rounded text-center"
                      style={{ backgroundColor: '#f8fbff', border: '1px solid #e3f2fd' }}
                    >
                      <div className="mb-2">
                        <small className="text-muted">Currency</small>
                        <div style={{ fontWeight: '500', color: '#000' }}>
                          {selectedProductDetails.Currency || 'USD'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div
                      className="p-3 rounded text-center"
                      style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7' }}
                    >
                      <div className="mb-2">
                        <small className="text-muted">Stock Quantity</small>
                        <div style={{ fontWeight: '500', color: '#000' }}>
                          {selectedProductDetails.QuantityPerUnit || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div
                      className="p-3 rounded text-center"
                      style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}
                    >
                      <div className="mb-2">
                        <small className="text-muted">Category</small>
                        <div style={{ fontWeight: '500', color: '#000' }}>
                          {selectedProductDetails.Category || 'General'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ModalBody>
        )}

        <ModalFooter style={{ backgroundColor: '#f8f9fa', borderTop: '1px solid #dee2e6' }}>
          <Button
            color="secondary"
            onClick={toggleProductDetailsModal}
            style={{ borderRadius: '8px', padding: '8px 20px' }}
          >
            <i className="bi bi-x-lg me-1"></i>
            Close
          </Button>
          <Button
            color="primary"
            onClick={() => {
              handleAddToCartClick(selectedProductDetails);
              toggleProductDetailsModal();
            }}
            disabled={!selectedProductDetails?.InStock}
            style={{ borderRadius: '8px', padding: '8px 20px' }}
          >
            <i className="bi bi-cart-plus me-1"></i>
            {selectedProductDetails?.InStock ? 'Add to Cart' : 'Out of Stock'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default ProductList;
