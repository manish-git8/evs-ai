import React, { useEffect, useState, useRef } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Button,
  Input,
  Label,
  FormGroup,
  Spinner,
} from 'reactstrap';
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMobile,
  FaMapMarkerAlt,
  FaEdit,
  FaSave,
  FaTimes,
  FaCamera,
  FaIdBadge,
} from 'react-icons/fa';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UserService from '../../services/UserService';
import FileUploadService from '../../services/FileUploadService';
import { getEntityType, getEntityId } from '../localStorageUtil';

const MyProfile = () => {
  const entityType = getEntityType();
  const entityId = getEntityId();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [profileImage, setProfileImage] = useState(localStorage.getItem('profileImageBase64'));
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDetails = JSON.parse(localStorage.getItem('userDetails'));
        const { userId } = userDetails;
        const storedEntityId = localStorage.getItem('entityId');

        if (!userId || !storedEntityId) {
          throw new Error('User information not found in localStorage');
        }

        const data = await UserService.fetchByUserId(storedEntityId, userId, entityType);
        setUserData(data);
        setEditedData({
          title: data.title || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          mobile: data.mobile || '',
          phone: data.phone || '',
          ext: data.ext || '',
          address: {
            addressLine1: data.address?.addressLine1 || '',
            addressLine2: data.address?.addressLine2 || '',
            city: data.address?.city || '',
            state: data.address?.state || '',
            postalCode: data.address?.postalCode || '',
            country: data.address?.country || '',
            addressType: data.address?.addressType || 'PRIMARY',
            isoCountryCode: data.address?.isoCountryCode || 'US',
          },
        });

        // If user has a profile image ID, try to load it
        if (data.profileImageId) {
          try {
            const imageResponse = await FileUploadService.getFileByFileId(data.profileImageId, { silent: true });
            const blob = new Blob([imageResponse.data]);
            const imageUrl = URL.createObjectURL(blob);
            setProfileImage(imageUrl);
          } catch (imgError) {
            console.warn('Could not load profile image:', imgError);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load profile data');
        setLoading(false);
      }
    };

    fetchUserData();
  }, [entityType]);

  const handleInputChange = (field, value) => {
    setEditedData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddressChange = (field, value) => {
    setEditedData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const userDetails = JSON.parse(localStorage.getItem('userDetails'));
      const { userId } = userDetails;

      const updatePayload = {
        ...userData,
        title: editedData.title,
        firstName: editedData.firstName,
        lastName: editedData.lastName,
        mobile: editedData.mobile,
        phone: editedData.phone,
        ext: editedData.ext,
        address: editedData.address,
      };

      await UserService.handleEditUser(updatePayload, entityId, userId, entityType);

      // Update local state
      setUserData((prev) => ({
        ...prev,
        ...editedData,
      }));

      // Update localStorage userDetails
      const updatedUserDetails = {
        ...userDetails,
        firstName: editedData.firstName,
        lastName: editedData.lastName,
      };
      localStorage.setItem('userDetails', JSON.stringify(updatedUserDetails));

      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedData({
      title: userData.title || '',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      mobile: userData.mobile || '',
      phone: userData.phone || '',
      ext: userData.ext || '',
      address: {
        addressLine1: userData.address?.addressLine1 || '',
        addressLine2: userData.address?.addressLine2 || '',
        city: userData.address?.city || '',
        state: userData.address?.state || '',
        postalCode: userData.address?.postalCode || '',
        country: userData.address?.country || '',
        addressType: userData.address?.addressType || 'PRIMARY',
        isoCountryCode: userData.address?.isoCountryCode || 'US',
      },
    });
    setIsEditing(false);
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);

      // Upload the file to backend
      const uploadResponse = entityType === 'supplier'
        ? await FileUploadService.uploadSupplierFile(entityId, file)
        : await FileUploadService.uploadFile(entityId, file);

      const fileId = uploadResponse.data?.fileId;

      if (fileId) {
        // Update user profile with new image ID
        const userDetails = JSON.parse(localStorage.getItem('userDetails'));
        const { userId } = userDetails;

        const updatePayload = {
          ...userData,
          profileImageId: fileId,
          address: userData.address ? {
            ...userData.address,
            addressType: userData.address.addressType || 'PRIMARY',
            isoCountryCode: userData.address.isoCountryCode || 'US',
          } : {
            addressType: 'PRIMARY',
            isoCountryCode: 'US',
          },
        };

        await UserService.handleEditUser(updatePayload, entityId, userId, entityType);

        // Update local state
        setUserData((prev) => ({
          ...prev,
          profileImageId: fileId,
        }));

        // Create preview URL
        const imageUrl = URL.createObjectURL(file);
        setProfileImage(imageUrl);

        // Also store in localStorage for header display
        const reader = new FileReader();
        reader.onload = (e) => {
          localStorage.setItem('profileImageBase64', e.target.result);
          // Dispatch event to notify header components
          window.dispatchEvent(new Event('profileImageUpdated'));
        };
        reader.readAsDataURL(file);

        toast.success('Profile image updated!');
      } else {
        throw new Error('Failed to get file ID from upload');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="user-profile-page">
        <div className="text-center py-5">
          <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="user-profile-page">
        <div className="text-center py-5">
          <FaUser size={48} className="text-muted" />
          <p className="mt-3 text-muted">No profile data available</p>
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
      <div className="user-profile-page">
        <Container className="py-4">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h4 className="mb-1">My Profile</h4>
              <small className="text-muted">Manage your personal information</small>
            </div>
            {!isEditing ? (
              <Button color="primary" onClick={() => setIsEditing(true)}>
                <FaEdit className="me-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="d-flex gap-2">
                <Button color="secondary" onClick={handleCancel} disabled={saving}>
                  <FaTimes className="me-2" />
                  Cancel
                </Button>
                <Button color="success" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Spinner size="sm" className="me-2" />
                  ) : (
                    <FaSave className="me-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </div>

          <Row>
            {/* Profile Card - Left Column */}
            <Col lg={4} className="mb-4">
              <Card className="profile-card h-100">
                <CardBody className="text-center py-4">
                  {/* Profile Image */}
                  <div className="position-relative d-inline-block mb-4">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="rounded-circle profile-image"
                        style={{
                          width: '150px',
                          height: '150px',
                          objectFit: 'cover',
                          border: '4px solid #fff',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        }}
                      />
                    ) : (
                      <div
                        className="rounded-circle d-inline-flex align-items-center justify-content-center"
                        style={{
                          width: '150px',
                          height: '150px',
                          background: 'linear-gradient(135deg, #009efb, #00b4db)',
                          border: '4px solid #fff',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        }}
                      >
                        <span className="text-white display-4 fw-bold">
                          {userData.firstName?.charAt(0)}
                          {userData.lastName?.charAt(0)}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary btn-sm rounded-circle position-absolute"
                      style={{
                        bottom: '5px',
                        right: '5px',
                        width: '36px',
                        height: '36px',
                        padding: 0,
                      }}
                      onClick={handleImageClick}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <Spinner size="sm" />
                      ) : (
                        <FaCamera size={14} />
                      )}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                  </div>

                  {/* Name */}
                  <h4 className="mb-1">
                    {userData.title} {userData.firstName} {userData.lastName}
                  </h4>
                  <p className="text-muted mb-3">@{userData.userName}</p>

                  {/* Roles */}
                  <div className="mb-3">
                    {userData.role?.map((role) => (
                      <Badge
                        key={role.name}
                        color="primary"
                        className="me-1 mb-1"
                        pill
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        {role.name.replace('ROLE_', '')}
                      </Badge>
                    ))}
                  </div>

                  {/* Quick Stats */}
                  <div className="border-top pt-3 mt-3">
                    <Row>
                      <Col xs={6} className="border-end">
                        <small className="text-muted d-block">Status</small>
                        <Badge color={userData.isActive ? 'success' : 'danger'} pill>
                          {userData.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </Col>
                      <Col xs={6}>
                        <small className="text-muted d-block">Member Since</small>
                        <small className="fw-bold">
                          {formatDate(userData.createdDate)}
                        </small>
                      </Col>
                    </Row>
                  </div>
                </CardBody>
              </Card>
            </Col>

            {/* Details Cards - Right Column */}
            <Col lg={8}>
              {/* Personal Information */}
              <Card className="mb-4">
                <CardHeader className="bg-primary text-white">
                  <FaUser className="me-2" />
                  Personal Information
                </CardHeader>
                <CardBody>
                  <Row>
                    <Col md={4}>
                      <FormGroup>
                        <Label className="text-muted small">Title</Label>
                        {isEditing ? (
                          <Input
                            type="select"
                            value={editedData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                          >
                            <option value="">Select</option>
                            <option value="Mr">Mr</option>
                            <option value="Mrs">Mrs</option>
                            <option value="Ms">Ms</option>
                            <option value="Dr">Dr</option>
                          </Input>
                        ) : (
                          <p className="mb-0 fw-bold">{userData.title || 'N/A'}</p>
                        )}
                      </FormGroup>
                    </Col>
                    <Col md={4}>
                      <FormGroup>
                        <Label className="text-muted small">First Name</Label>
                        {isEditing ? (
                          <Input
                            type="text"
                            value={editedData.firstName}
                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                            placeholder="First Name"
                          />
                        ) : (
                          <p className="mb-0 fw-bold">{userData.firstName || 'N/A'}</p>
                        )}
                      </FormGroup>
                    </Col>
                    <Col md={4}>
                      <FormGroup>
                        <Label className="text-muted small">Last Name</Label>
                        {isEditing ? (
                          <Input
                            type="text"
                            value={editedData.lastName}
                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                            placeholder="Last Name"
                          />
                        ) : (
                          <p className="mb-0 fw-bold">{userData.lastName || 'N/A'}</p>
                        )}
                      </FormGroup>
                    </Col>
                  </Row>
                  <Row className="mt-3">
                    <Col md={6}>
                      <FormGroup>
                        <Label className="text-muted small">
                          <FaIdBadge className="me-1" />
                          Username
                        </Label>
                        <p className="mb-0 fw-bold">{userData.userName || 'N/A'}</p>
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup>
                        <Label className="text-muted small">
                          <FaEnvelope className="me-1" />
                          Email Address
                          {isEditing && (
                            <Badge color="secondary" className="ms-2" style={{ fontSize: '10px' }}>
                              Cannot be changed
                            </Badge>
                          )}
                        </Label>
                        <p className="mb-0 fw-bold">{userData.email || 'N/A'}</p>
                      </FormGroup>
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              {/* Contact Information */}
              <Card className="mb-4">
                <CardHeader className="bg-primary text-white">
                  <FaPhone className="me-2" />
                  Contact Information
                </CardHeader>
                <CardBody>
                  <Row>
                    <Col md={4}>
                      <FormGroup>
                        <Label className="text-muted small">
                          <FaMobile className="me-1" />
                          Mobile Number
                        </Label>
                        {isEditing ? (
                          <Input
                            type="tel"
                            value={editedData.mobile}
                            onChange={(e) => handleInputChange('mobile', e.target.value)}
                            placeholder="Mobile Number"
                          />
                        ) : (
                          <p className="mb-0 fw-bold">{userData.mobile || 'Not provided'}</p>
                        )}
                      </FormGroup>
                    </Col>
                    <Col md={4}>
                      <FormGroup>
                        <Label className="text-muted small">
                          <FaPhone className="me-1" />
                          Phone Number
                        </Label>
                        {isEditing ? (
                          <Input
                            type="tel"
                            value={editedData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            placeholder="Phone Number"
                          />
                        ) : (
                          <p className="mb-0 fw-bold">{userData.phone || 'Not provided'}</p>
                        )}
                      </FormGroup>
                    </Col>
                    <Col md={4}>
                      <FormGroup>
                        <Label className="text-muted small">Extension</Label>
                        {isEditing ? (
                          <Input
                            type="text"
                            value={editedData.ext}
                            onChange={(e) => handleInputChange('ext', e.target.value)}
                            placeholder="Ext"
                          />
                        ) : (
                          <p className="mb-0 fw-bold">{userData.ext || 'Not provided'}</p>
                        )}
                      </FormGroup>
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              {/* Address Information */}
              <Card className="mb-4">
                <CardHeader className="bg-primary text-white">
                  <FaMapMarkerAlt className="me-2" />
                  Address Information
                </CardHeader>
                <CardBody>
                  {isEditing ? (
                    <>
                      <Row>
                        <Col md={6}>
                          <FormGroup>
                            <Label className="text-muted small">Address Line 1</Label>
                            <Input
                              type="text"
                              value={editedData.address?.addressLine1 || ''}
                              onChange={(e) => handleAddressChange('addressLine1', e.target.value)}
                              placeholder="Address Line 1"
                            />
                          </FormGroup>
                        </Col>
                        <Col md={6}>
                          <FormGroup>
                            <Label className="text-muted small">Address Line 2</Label>
                            <Input
                              type="text"
                              value={editedData.address?.addressLine2 || ''}
                              onChange={(e) => handleAddressChange('addressLine2', e.target.value)}
                              placeholder="Address Line 2"
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                      <Row className="mt-2">
                        <Col md={3}>
                          <FormGroup>
                            <Label className="text-muted small">City</Label>
                            <Input
                              type="text"
                              value={editedData.address?.city || ''}
                              onChange={(e) => handleAddressChange('city', e.target.value)}
                              placeholder="City"
                            />
                          </FormGroup>
                        </Col>
                        <Col md={3}>
                          <FormGroup>
                            <Label className="text-muted small">State</Label>
                            <Input
                              type="text"
                              value={editedData.address?.state || ''}
                              onChange={(e) => handleAddressChange('state', e.target.value)}
                              placeholder="State"
                            />
                          </FormGroup>
                        </Col>
                        <Col md={3}>
                          <FormGroup>
                            <Label className="text-muted small">Postal Code</Label>
                            <Input
                              type="text"
                              value={editedData.address?.postalCode || ''}
                              onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                              placeholder="Postal Code"
                            />
                          </FormGroup>
                        </Col>
                        <Col md={3}>
                          <FormGroup>
                            <Label className="text-muted small">Country</Label>
                            <Input
                              type="text"
                              value={editedData.address?.country || ''}
                              onChange={(e) => handleAddressChange('country', e.target.value)}
                              placeholder="Country"
                            />
                          </FormGroup>
                        </Col>
                      </Row>
                    </>
                  ) : (
                    <Row>
                      <Col md={12}>
                        <FormGroup>
                          <Label className="text-muted small">Full Address</Label>
                          <p className="mb-0 fw-bold">{formatAddress(userData.address)}</p>
                        </FormGroup>
                      </Col>
                    </Row>
                  )}
                </CardBody>
              </Card>

            </Col>
          </Row>
        </Container>
      </div>

      <style>{`
        .user-profile-page {
          margin-top: 1rem;
          padding-top: 0.5rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          min-height: calc(100vh - 120px);
        }

        .user-profile-page .container {
          max-width: 1100px;
        }

        .user-profile-page .card {
          border: none;
          border-radius: 8px;
          box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }

        .user-profile-page .card-header {
          border-bottom: none;
          padding: 0.6rem 1rem;
          font-weight: 600;
          font-size: 14px;
        }

        .user-profile-page .card-body {
          padding: 0.75rem 1rem;
        }

        .user-profile-page .form-group {
          margin-bottom: 0.5rem;
        }

        .user-profile-page .form-group label {
          font-size: 11px;
          margin-bottom: 2px;
        }

        .user-profile-page .form-group p {
          font-size: 13px;
        }

        .user-profile-page .profile-card {
          background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
        }

        .user-profile-page .form-control {
          border-radius: 6px;
          border: 1px solid #e0e0e0;
          padding: 0.35rem 0.6rem;
          font-size: 13px;
        }

        .user-profile-page .form-control:focus {
          border-color: #009efb;
          box-shadow: 0 0 0 0.15rem rgba(0, 158, 251, 0.15);
        }

        .user-profile-page .btn {
          border-radius: 6px;
          padding: 0.4rem 0.8rem;
          font-weight: 500;
          font-size: 13px;
        }

        .user-profile-page .badge {
          font-weight: 500;
          font-size: 11px;
        }

        .user-profile-page .row {
          margin-bottom: 0;
        }

        .user-profile-page h4 {
          font-size: 18px;
        }

        @media (max-width: 768px) {
          .user-profile-page {
            margin-top: 0.5rem;
            padding-top: 0.25rem;
          }

          .user-profile-page .container {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }
        }
      `}</style>
    </>
  );
};

export default MyProfile;
