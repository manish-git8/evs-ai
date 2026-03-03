import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardImg,
  CardText,
  Container,
  Row,
  Col,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormGroup,
  Label,
  Input,
} from 'reactstrap';
import { useParams, useLocation } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthHeader from '../../services/AuthHeader';
import GLAccountService from '../../services/GLaccountService';
import ClassService from '../../services/ClassService';
import DepartmentService from '../../services/DepartmentService';
import LocationService from '../../services/LocationService';
import CartService from '../../services/CartService';
import ProjectService from '../../services/ProjectService';
import CompanyService from '../../services/CompanyService';
import { getCompanyCurrency, formatCurrency } from '../localStorageUtil';

const ProductDetails = () => {
  const useQuery = () => {
    return new URLSearchParams(useLocation().search);
  };

  const query = useQuery();
  const { CatalogItemId } = useParams();
  const cartId = query.get('cartId');
  const companyId = query.get('companyId');
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState(null);
  const API_URL = process.env.REACT_APP_API_URL;
  const supplierIconUrl =
    'https://icons.veryicon.com/png/o/internet--web/commonly-used-in-work-and-social/supplier-19.png';

  const pageSize = 100;
  const pageNumber = 0;
  const [department, setDepartment] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [location, setLocation] = useState('');
  const [glAccountId, setGlAccountId] = useState('');
  const [classId, setClassId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [calssList, setClassList] = useState([]);
  const [departmentList, setDepartmentList] = useState([]);
  const [locationList, setLocationList] = useState([]);
  const [glAccountList, setGlAccountList] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [settings, setSettings] = useState({});
  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const fetchCompanySettings = async () => {
    try {
      const response = await CompanyService.getCompanySetting(companyId);
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching company settings:', error);
      toast.dismiss();
      toast.error('Failed to fetch company settings.');
    }
  };

  useEffect(() => {
    fetchCompanySettings();
  }, [companyId]);

  const increaseQuantity = () => {
    setQuantity((prevQuantity) => prevQuantity + 1);
  };

  const decreaseQuantity = () => {
    setQuantity((prevQuantity) => (prevQuantity > 1 ? prevQuantity - 1 : 1));
  };

  const handleQuantityChange = (e) => {
    const newQuantity = parseInt(e.target.value, 10);
    if (!Number.isNaN(newQuantity) && newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(
          `${API_URL}ep/v1/catalogItem?CatalogItemId=${CatalogItemId}&pageSize=${pageSize}&pageNumber=${pageNumber}`,
          { headers: AuthHeader() },
        );
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setProduct(data[0]);
        } else {
          console.error('Product not found');
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      }
    };

    fetchProduct();
  }, [CatalogItemId]);

  const fetchDepartments = async () => {
    try {
      const response = await DepartmentService.getAllDepartment(companyId);
      if (response && response.data) {
        setDepartmentList(response.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.dismiss();
      toast.error('Failed to fetch departments.');
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await LocationService.getAllLocation(companyId);
      if (response && response.data) {
        setLocationList(response.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.dismiss();
      toast.error('Failed to fetch departments.');
    }
  };

  const fetchGLAccounts = async () => {
    try {
      const response = await GLAccountService.getAllGLAccount(companyId);
      if (response && response.data) {
        setGlAccountList(response.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.dismiss();
      toast.error('Failed to fetch departments.');
    }
  };

  const fetchClass = async () => {
    try {
      const response = await ClassService.getAllClass(companyId);
      if (response && response.data) {
        setClassList(response.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.dismiss();
      toast.error('Failed to fetch departments.');
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await ProjectService.getAllProjects(companyId);
      setProjectList(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.dismiss();
      toast.error('Failed to fetch projects');
    }
  };

  useEffect(() => {
    if (settings.departmentEnabled) fetchDepartments();
    if (settings.locationEnabled) fetchLocations();
    if (settings.gLAccountEnabled) fetchGLAccounts();
    if (settings.classEnabled) fetchClass();
  }, [settings]);

  useEffect(() => {
    if (settings.projectEnabled) fetchProjects();
  }, [settings, companyId]);

  const handleModalSubmit = async () => {
    const requestBody = {
      cartId,
      supplierId: product.Supplier?.supplierId,
      projectId,
      catalogId: product.CatalogId,
      catalogItemId: {
        CatalogItemId: product.CatalogItemId,
        CatalogId: product.CatalogId,
        PartId: product.PartId,
        ProductImageURL: product.ProductImageURL,
      },
      partId: product.PartId,
      partDescription: product.Description || '',
      departmentId: department,
      orderType: 0,
      glAccountId,
      isCritical: true,
      isSafetyAppReq: false,
      slimit: 'some limit',
      qty: quantity,
      price: product.UnitPrice,
      unitOfMeasure: product.UnitOfMeasurement || 'piece',
      currencyCode: product.Currency || getCompanyCurrency(),
      internalBuyerQuoteFile: 0,
      priceUpdate: false,
      classId,
      locationId: location,
      productId: product.ProductId || 1,
      manufacturerName: product.Manufacturer || 'ABC Corp',
      manufacturerPart: product.ManufacturerPart || 'MP-12345',
    };

    console.log('Request Body:', requestBody);

    try {
      const response = await CartService.handleCreateCart(requestBody, companyId, cartId);
      if (response.data) {
        toast.dismiss();
        toast.success('Product added to cart successfully!');
        setDepartment('');
        setLocation('');
        setGlAccountId('');
        setClassId('');
        setQuantity(1);
        toggleModal();
        setProjectId('');
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
  };

  return (
    <>
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
      <Container className="my-5">
        <Card
          className="shadow-lg"
          style={{ backgroundColor: '#fff', borderRadius: '15px', padding: '20px' }}
        >
          <Row>
            <Col md="6">
              <Card className="border-0">
                {product?.ProductImageURL ? (
                  <CardImg
                    top
                    width="100%"
                    src={product?.ProductImageURL}
                    alt={product?.ManufacturerName}
                    style={{ borderRadius: '10px' }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '300px',
                      backgroundColor: '#f0f0f0',
                      borderRadius: '10px',
                    }}
                  >
                    <p>No image available</p>
                  </div>
                )}
              </Card>
            </Col>
            <Col md="6">
              <CardBody>
                <h2 className="text-uppercase" style={{ fontWeight: '400', fontSize: '20px' }}>
                  {product?.ManufacturerName || 'Elegant Leather Jacket'}
                </h2>
                <h6 className="text-muted">
                  <img
                    src={supplierIconUrl}
                    alt="Supplier Icon"
                    style={{ width: '16px', height: '16px', marginRight: '5px' }}
                  />
                  Supplier: Microsoft
                </h6>

                <h6 style={{ color: product?.InStock ? 'limegreen' : 'red', fontWeight: 'bold' }}>
                  {product?.InStock ? 'In Stock' : 'Out of Stock'}
                </h6>

                <CardText className="mt-3" style={{ fontSize: '16px' }}>
                  {product?.Description ||
                    'Experience luxury and style with our Elegant Leather Jacket. Crafted from premium leather, this jacket features a timeless design that combines comfort with sophistication.'}
                </CardText>
                <h4 className="text-muted mt-3">{product?.UnitPrice ? formatCurrency(product.UnitPrice) : 'N/A'}</h4>

                <div className="d-flex align-items-center mb-3">
                  <Button
                    color="primary"
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                    style={{ width: '35px' }}
                  >
                    -
                  </Button>

                  <Input
                    type="number"
                    value={quantity}
                    onChange={handleQuantityChange}
                    min="1"
                    className="mx-2"
                    style={{ width: '80px', textAlign: 'center' }}
                  />

                  <Button color="primary" onClick={increaseQuantity} style={{ width: '35px' }}>
                    +
                  </Button>
                </div>

                <Button
                  color="primary"
                  className="w-100 my-3"
                  disabled={!product?.InStock}
                  onClick={toggleModal}
                >
                  {product?.InStock ? 'Add to Cart' : 'Out of Stock'}
                </Button>

                <CardText>
                  {product?.Specifications && (
                    <div className="mt-3">
                      <strong>Specifications:</strong>
                      <ul style={{ paddingLeft: '20px' }}>
                        {product.Specifications.split('.')
                          .filter((spec) => spec.trim() !== '')
                          .map((spec) => (
                            <li key={Math.random().toString(36).substr(2, 9)}>{spec.trim()}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                </CardText>

                <div className="mt-3">
                  {product?.ManufacturerURL && (
                    <CardText>
                      <strong>Manufacturer URL: </strong>
                      <a
                        href={product.ManufacturerURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-style"
                      >
                        Visit Manufacturer Website
                      </a>
                    </CardText>
                  )}
                  {product?.ProductURL && (
                    <CardText>
                      <strong>Product URL: </strong>
                      <a
                        href={product.ProductURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-style"
                      >
                        View Product Url
                      </a>
                    </CardText>
                  )}
                </div>
              </CardBody>
            </Col>
          </Row>
        </Card>
        <Modal isOpen={isModalOpen} toggle={toggleModal}>
          <ModalHeader toggle={toggleModal}>Add Product to Cart</ModalHeader>
          <ModalBody>
            {settings.departmentEnabled && (
              <FormGroup>
                <Label for="departmentSelect">
                  Department<span className="text-danger">*</span>
                </Label>
                <Input
                  type="select"
                  id="departmentSelect"
                  className="form-control"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="">Select Department</option>
                  {departmentList.map((dept) => (
                    <option key={dept.departmentId} value={dept.departmentId}>
                      {dept.name}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            )}
            {settings.locationEnabled && (
              <FormGroup>
                <Label for="locationSelect">
                  Location<span className="text-danger">*</span>
                </Label>
                <Input
                  type="select"
                  id="locationSelect"
                  className="form-control"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                >
                  <option value="">Select Location</option>
                  {locationList.map((loc) => (
                    <option key={loc.locationId} value={loc.locationId}>
                      {loc.name}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            )}
            {settings.gLAccountEnabled && (
              <FormGroup>
                <Label for="glAccountSelect">
                  GL Account<span className="text-danger">*</span>
                </Label>
                <Input
                  type="select"
                  id="glAccountSelect"
                  className="form-control"
                  value={glAccountId}
                  onChange={(e) => setGlAccountId(e.target.value)}
                >
                  <option value="">Select GL Account</option>
                  {glAccountList.map((gla) => (
                    <option key={gla.glAccountId} value={gla.glAccountId}>
                      {gla.name}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            )}
            {settings.classEnabled && (
              <FormGroup>
                <Label for="classSelect">
                  Class<span className="text-danger">*</span>
                </Label>
                <Input
                  type="select"
                  id="classSelect"
                  className="form-control"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                >
                  <option value="">Select Class</option>
                  {calssList.map((cla) => (
                    <option key={cla.classId} value={cla.classId}>
                      {cla.name}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            )}
            {settings.projectEnabled && (
              <FormGroup>
                <Label for="projectSelect">
                  Project<span className="text-danger">*</span>
                </Label>
                <Input
                  type="select"
                  id="projectSelect"
                  className="form-control"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">Select Project</option>
                  {projectList.map((pro) => (
                    <option key={pro.projectId} value={pro.projectId}>
                      {pro.name}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={toggleModal}>
              Cancel
            </Button>
            <Button color="primary" onClick={handleModalSubmit}>
              Submit Cart
            </Button>
          </ModalFooter>
        </Modal>
      </Container>
    </>
  );
};

export default ProductDetails;
