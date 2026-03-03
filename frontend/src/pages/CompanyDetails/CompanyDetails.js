import React, { useEffect, useState, useRef } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Spinner,
} from 'reactstrap';
import {
  FaBuilding,
  FaEnvelope,
  FaPhone,
  FaFax,
  FaGlobe,
  FaMapMarkerAlt,
  FaUser,
  FaTags,
  FaCamera,
  FaMoneyBillWave,
} from 'react-icons/fa';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CompanyService from '../../services/CompanyService';
import CompanyCategoryService from '../../services/CompanyCategoryService';
import FileUploadService from '../../services/FileUploadService';
import { getEntityId, getUserRole, getCurrencySymbol } from '../localStorageUtil';

const CompanyDetails = () => {
  const companyId = getEntityId();
  const userRoles = getUserRole() || [];
  const isCompanyAdmin = userRoles.includes('COMPANY_ADMIN');
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');
  const [subCategoryName, setSubCategoryName] = useState('');
  const [logoImage, setLogoImage] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);

  const formatAddress = (address) => {
    if (!address) return 'Not provided';
    const parts = [
      address?.addressLine1,
      address?.addressLine2,
      address?.city,
      address?.state,
      address?.postalCode,
      address?.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Not provided';
  };

  const fetchLogoImage = async (logoId) => {
    if (!logoId) return;
    try {
      const response = await FileUploadService.downloadFile(logoId);
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const imageUrl = URL.createObjectURL(blob);
      setLogoImage(imageUrl);
    } catch (error) {
      console.error('Error fetching logo:', error);
    }
  };

  const handleLogoClick = () => {
    if (isCompanyAdmin && logoInputRef.current) {
      logoInputRef.current.click();
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploadingLogo(true);
    try {
      // Upload the file
      const uploadResponse = await FileUploadService.uploadFile(companyId, file);
      const fileId = uploadResponse.data?.fileId;

      if (fileId) {
        // Helper function to ensure address has required fields
        const ensureAddressFields = (address) => {
          if (!address) return { addressType: 'PRIMARY', isoCountryCode: 'US' };
          return {
            ...address,
            addressType: address.addressType || 'PRIMARY',
            isoCountryCode: address.isoCountryCode || 'US',
          };
        };

        // Helper function to ensure contact has proper address
        const ensureContactAddress = (contact) => {
          if (!contact) return null;
          return {
            ...contact,
            address: ensureAddressFields(contact.address),
          };
        };

        // Update company with new logo ID
        const updatePayload = {
          ...companyData,
          companyLogoId: fileId,
          billingAddress: ensureAddressFields(companyData.billingAddress),
          shippingAddresses: companyData.shippingAddresses?.map(addr => ensureAddressFields(addr)) || [],
          primaryContact: ensureContactAddress(companyData.primaryContact),
          secondaryContact: ensureContactAddress(companyData.secondaryContact),
        };

        await CompanyService.handleUpdateCompany(updatePayload, companyId);

        // Update local state
        setCompanyData({ ...companyData, companyLogoId: fileId });

        // Fetch and display the new logo
        await fetchLogoImage(fileId);

        toast.success('Company logo updated successfully');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to update company logo');
    } finally {
      setUploadingLogo(false);
      // Reset file input
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const response = await CompanyService.getCompanyByCompanyId(companyId);
        const company = response.data?.[0] || response.data;

        if (company) {
          setCompanyData(company);

          // Fetch logo if exists
          if (company.companyLogoId) {
            fetchLogoImage(company.companyLogoId);
          }

          // Fetch category name
          if (company.categoryId) {
            try {
              const catResponse = await CompanyCategoryService.getCompanyCategory();
              const category = catResponse.data?.find(c => c.categoryId === company.categoryId);
              if (category) {
                setCategoryName(category.categoryName);

                // Fetch subcategory name
                if (company.subCategoryId) {
                  const subCatResponse = await CompanyCategoryService.getCompanySubCategory(company.categoryId);
                  const subCategory = subCatResponse.data?.find(sc => sc.subCategoryId === company.subCategoryId);
                  if (subCategory) {
                    setSubCategoryName(subCategory.subCategoryName);
                  }
                }
              }
            } catch (catError) {
              console.error('Error fetching categories:', catError);
            }
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching company data:', error);
        toast.error('Failed to load company data');
        setLoading(false);
      }
    };

    if (companyId) {
      fetchCompanyData();
    }
  }, [companyId]);

  if (loading) {
    return (
      <div className="company-details-page">
        <div className="text-center py-5">
          <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted">Loading company details...</p>
        </div>
      </div>
    );
  }

  if (!companyData) {
    return (
      <div className="company-details-page">
        <div className="text-center py-5">
          <FaBuilding size={48} className="text-muted" />
          <p className="mt-3 text-muted">No company data available</p>
        </div>
      </div>
    );
  }

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
      />
      <div className="company-details-page">
        <Container className="py-4">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h4 className="mb-1">Company Details</h4>
              <small className="text-muted">View your organization information</small>
            </div>
          </div>

          <Row>
            {/* Company Card - Left Column */}
            <Col lg={4} className="mb-4">
              <Card className="company-card h-100">
                <CardBody className="text-center py-4">
                  {/* Company Logo */}
                  <div className="d-inline-block mb-4 position-relative">
                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                    <div
                      className={`rounded-circle d-inline-flex align-items-center justify-content-center ${isCompanyAdmin ? 'logo-container' : ''}`}
                      style={{
                        width: '120px',
                        height: '120px',
                        background: logoImage ? 'transparent' : 'linear-gradient(135deg, #009efb, #00b4db)',
                        border: '4px solid #fff',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        cursor: isCompanyAdmin ? 'pointer' : 'default',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                      onClick={handleLogoClick}
                      title={isCompanyAdmin ? 'Click to update company logo' : ''}
                    >
                      {uploadingLogo ? (
                        <Spinner color="primary" />
                      ) : logoImage ? (
                        <img
                          src={logoImage}
                          alt="Company Logo"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <FaBuilding size={50} className="text-white" />
                      )}
                      {isCompanyAdmin && !uploadingLogo && (
                        <div className="logo-overlay">
                          <FaCamera size={24} className="text-white" />
                        </div>
                      )}
                    </div>
                    {isCompanyAdmin && (
                      <small className="text-muted d-block mt-2" style={{ fontSize: '10px' }}>
                        Click to change logo
                      </small>
                    )}
                  </div>

                  {/* Company Name */}
                  <h4 className="mb-1">{companyData.displayName || companyData.name}</h4>
                  {companyData.displayName && companyData.name !== companyData.displayName && (
                    <p className="text-muted mb-3">{companyData.name}</p>
                  )}

                  {/* Category Badge */}
                  {categoryName && (
                    <div className="mb-3">
                      <Badge
                        color="primary"
                        className="me-1 mb-1"
                        pill
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        {categoryName}
                      </Badge>
                      {subCategoryName && (
                        <Badge
                          color="info"
                          className="mb-1"
                          pill
                          style={{ fontSize: '11px', padding: '5px 10px' }}
                        >
                          {subCategoryName}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="border-top pt-3 mt-3 text-center">
                    <small className="text-muted d-block">Status</small>
                    <Badge color={companyData.isActive !== false ? 'success' : 'danger'} pill>
                      {companyData.isActive !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardBody>
              </Card>
            </Col>

            {/* Details Cards - Right Column */}
            <Col lg={8}>
              {/* Basic Information */}
              <Card className="mb-4">
                <CardHeader className="bg-primary text-white py-2">
                  <FaBuilding className="me-2" />
                  Basic Information
                </CardHeader>
                <CardBody className="py-3">
                  <Row>
                    <Col md={6}>
                      <div className="mb-3">
                        <label className="text-muted small d-block">Company Name</label>
                        <p className="mb-0 fw-bold">{companyData.name || 'N/A'}</p>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="mb-3">
                        <label className="text-muted small d-block">Display Name</label>
                        <p className="mb-0 fw-bold">{companyData.displayName || 'N/A'}</p>
                      </div>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <div className="mb-3">
                        <label className="text-muted small d-block">
                          <FaTags className="me-1" />
                          Category
                        </label>
                        <p className="mb-0 fw-bold">{categoryName || 'N/A'}</p>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="mb-3">
                        <label className="text-muted small d-block">Sub Category</label>
                        <p className="mb-0 fw-bold">{subCategoryName || 'N/A'}</p>
                      </div>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <div className="mb-3">
                        <label className="text-muted small d-block">
                          <FaMoneyBillWave className="me-1" />
                          Currency
                        </label>
                        <p className="mb-0 fw-bold">
                          {companyData.currency || 'INR'} ({getCurrencySymbol(companyData.currency || 'INR')})
                        </p>
                      </div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              {/* Contact Information */}
              <Card className="mb-4">
                <CardHeader className="bg-primary text-white py-2">
                  <FaPhone className="me-2" />
                  Contact Information
                </CardHeader>
                <CardBody className="py-3">
                  <Row>
                    <Col md={6}>
                      <div className="mb-3">
                        <label className="text-muted small d-block">
                          <FaEnvelope className="me-1" />
                          Email
                        </label>
                        <p className="mb-0 fw-bold">{companyData.email || 'N/A'}</p>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="mb-3">
                        <label className="text-muted small d-block">
                          <FaPhone className="me-1" />
                          Phone
                        </label>
                        <p className="mb-0 fw-bold">{companyData.phone || 'N/A'}</p>
                      </div>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <div className="mb-3">
                        <label className="text-muted small d-block">
                          <FaFax className="me-1" />
                          Fax
                        </label>
                        <p className="mb-0 fw-bold">{companyData.fax || 'N/A'}</p>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="mb-3">
                        <label className="text-muted small d-block">
                          <FaGlobe className="me-1" />
                          Website
                        </label>
                        {companyData.website ? (
                          <a
                            href={companyData.website.startsWith('http') ? companyData.website : `https://${companyData.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="fw-bold text-primary"
                          >
                            {companyData.website}
                          </a>
                        ) : (
                          <p className="mb-0 fw-bold">N/A</p>
                        )}
                      </div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              {/* Billing Address */}
              <Card className="mb-4">
                <CardHeader className="bg-primary text-white py-2">
                  <FaMapMarkerAlt className="me-2" />
                  Billing Address
                </CardHeader>
                <CardBody className="py-3">
                  <p className="mb-0 fw-bold">{formatAddress(companyData.billingAddress)}</p>
                </CardBody>
              </Card>

              {/* Shipping Addresses */}
              {companyData.shippingAddresses && companyData.shippingAddresses.length > 0 && (
                <Card className="mb-4">
                  <CardHeader className="bg-primary text-white py-2">
                    <FaMapMarkerAlt className="me-2" />
                    Shipping Addresses
                    <Badge color="light" className="ms-2 text-dark">
                      {companyData.shippingAddresses.length}
                    </Badge>
                  </CardHeader>
                  <CardBody className="py-3">
                    {companyData.shippingAddresses.map((address, index) => (
                      <div
                        key={index}
                        className={`${index > 0 ? 'border-top pt-3 mt-3' : ''}`}
                      >
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <small className="text-muted">Address {index + 1}</small>
                            <p className="mb-0 fw-bold">{formatAddress(address)}</p>
                          </div>
                          {address.isDefault && (
                            <Badge color="success" pill>Default</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardBody>
                </Card>
              )}

              {/* Primary Contact */}
              {companyData.primaryContact && Object.keys(companyData.primaryContact).length > 0 && (
                <Card className="mb-4">
                  <CardHeader className="bg-primary text-white py-2">
                    <FaUser className="me-2" />
                    Primary Contact
                  </CardHeader>
                  <CardBody className="py-3">
                    <Row>
                      <Col md={6}>
                        <div className="mb-3">
                          <label className="text-muted small d-block">Name</label>
                          <p className="mb-0 fw-bold">
                            {companyData.primaryContact.title} {companyData.primaryContact.firstName} {companyData.primaryContact.lastName || 'N/A'}
                          </p>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-3">
                          <label className="text-muted small d-block">Email</label>
                          <p className="mb-0 fw-bold">{companyData.primaryContact.email || 'N/A'}</p>
                        </div>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <div className="mb-0">
                          <label className="text-muted small d-block">Phone</label>
                          <p className="mb-0 fw-bold">{companyData.primaryContact.phone || 'N/A'}</p>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-0">
                          <label className="text-muted small d-block">Mobile</label>
                          <p className="mb-0 fw-bold">{companyData.primaryContact.mobile || 'N/A'}</p>
                        </div>
                      </Col>
                    </Row>
                  </CardBody>
                </Card>
              )}

              {/* Secondary Contact */}
              {companyData.secondaryContact && Object.keys(companyData.secondaryContact).length > 0 && (
                companyData.secondaryContact.firstName || companyData.secondaryContact.email) && (
                <Card className="mb-4">
                  <CardHeader className="bg-primary text-white py-2">
                    <FaUser className="me-2" />
                    Secondary Contact
                  </CardHeader>
                  <CardBody className="py-3">
                    <Row>
                      <Col md={6}>
                        <div className="mb-3">
                          <label className="text-muted small d-block">Name</label>
                          <p className="mb-0 fw-bold">
                            {companyData.secondaryContact.title} {companyData.secondaryContact.firstName} {companyData.secondaryContact.lastName || 'N/A'}
                          </p>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-3">
                          <label className="text-muted small d-block">Email</label>
                          <p className="mb-0 fw-bold">{companyData.secondaryContact.email || 'N/A'}</p>
                        </div>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <div className="mb-0">
                          <label className="text-muted small d-block">Phone</label>
                          <p className="mb-0 fw-bold">{companyData.secondaryContact.phone || 'N/A'}</p>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-0">
                          <label className="text-muted small d-block">Mobile</label>
                          <p className="mb-0 fw-bold">{companyData.secondaryContact.mobile || 'N/A'}</p>
                        </div>
                      </Col>
                    </Row>
                  </CardBody>
                </Card>
              )}
            </Col>
          </Row>
        </Container>
      </div>

      <style>{`
        .company-details-page {
          margin-top: 1rem;
          padding-top: 0.5rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          min-height: calc(100vh - 120px);
        }

        .company-details-page .container {
          max-width: 1100px;
        }

        .company-details-page .card {
          border: none;
          border-radius: 8px;
          box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }

        .company-details-page .card-header {
          border-bottom: none;
          padding: 0.6rem 1rem;
          font-weight: 600;
          font-size: 14px;
        }

        .company-details-page .card-body {
          padding: 0.75rem 1rem;
        }

        .company-details-page .company-card {
          background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
        }

        .company-details-page label {
          font-size: 11px;
          margin-bottom: 2px;
        }

        .company-details-page p {
          font-size: 13px;
        }

        .company-details-page .badge {
          font-weight: 500;
          font-size: 11px;
        }

        .company-details-page h4 {
          font-size: 18px;
        }

        .logo-container {
          transition: all 0.3s ease;
        }

        .logo-container:hover {
          transform: scale(1.02);
        }

        .logo-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
          border-radius: 50%;
        }

        .logo-container:hover .logo-overlay {
          opacity: 1;
        }

        @media (max-width: 768px) {
          .company-details-page {
            margin-top: 0.5rem;
            padding-top: 0.25rem;
          }

          .company-details-page .container {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }
        }
      `}</style>
    </>
  );
};

export default CompanyDetails;
