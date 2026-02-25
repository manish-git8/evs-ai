import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, CardBody, Badge, Spinner, Button } from 'reactstrap';
import { Mail, Phone, Globe, MapPin, Package, Star, Award, Edit } from 'react-feather';
import { useNavigate } from 'react-router-dom';
import SupplierService from '../../services/SupplierService';
import FeedBackService from '../../services/FeedBackService';
import { getEntityId } from '../localStorageUtil';

const SupplierInfo = () => {
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [overallRating, setOverallRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  const [qualityRating, setQualityRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [pricingRating, setPricingRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);

  const renderStars = (value) => {
    const rating = Number(value) || 0;
    const fullStars = Math.round(rating);
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        size={16}
        className={i < fullStars ? 'text-warning' : 'text-muted'}
        fill={i < fullStars ? '#ffc107' : 'none'}
        style={{ marginRight: 2 }}
      />
    ));
  };

  useEffect(() => {
    const supplierId = localStorage.getItem('entityId');
    const companyId = getEntityId();

    if (!supplierId) {
      setErrorMsg('Supplier (entityId) not found in local storage.');
      setLoading(false);
      return;
    }

    SupplierService.getSupplierById(supplierId)
      .then((res) => {
        const supplierObj = Array.isArray(res.data) ? res.data[0] : res.data;

        if (!supplierObj) {
          setErrorMsg('Supplier not found.');
          return;
        }

        setSupplier(supplierObj);

        FeedBackService.getAllFeedbackForSupplier(supplierId)
          .then((fbRes) => {
            const feedbacks = Array.isArray(fbRes.data) ? fbRes.data : [];

            if (!feedbacks.length) return;

            let qualitySum = 0;
            let deliverySum = 0;
            let pricingSum = 0;
            let communicationSum = 0;
            let overallSum = 0;

            feedbacks.forEach((f) => {
              qualitySum += Number(f.qualityRating || 0);
              deliverySum += Number(f.deliveryPerformanceRating || 0);
              pricingSum += Number(f.pricingCostTransparencyRating || 0);
              communicationSum += Number(f.communicationResponsivenessRating || 0);
              overallSum += Number(f.overallRating || 0);
            });

            const count = feedbacks.length;

            setTotalReviews(count);
            setQualityRating(qualitySum / count);
            setDeliveryRating(deliverySum / count);
            setPricingRating(pricingSum / count);
            setCommunicationRating(communicationSum / count);
            setOverallRating(overallSum / count);
          })
          .catch((err) => {
            console.error('Feedback Rating Error:', err);
          });
      })
      .catch((err) => {
        console.error('Error fetching supplier:', err);
        setErrorMsg('Unable to load supplier information.');
      })
      .finally(() => setLoading(false));
  }, []);

  const address = supplier?.address || {};

  const supplierRatings = {
    overallRating,
    totalReviews,
    qualityRating,
    deliveryPerformanceRating: deliveryRating,
    pricingCostTransparencyRating: pricingRating,
    communicationResponsivenessRating: communicationRating,
  };

  return (
    <Container fluid className="mt-4">
      <Row className="justify-content-center">
        <Col lg="10">
          <Card className="shadow-sm border-0">
            <div
              style={{
                background: 'linear-gradient(135deg, #009efb, #0085d1)',
                color: 'white',
                borderBottom: 'none',
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Package size={20} className="me-2" />
                <span style={{ fontWeight: 600 }}>Company Profile</span>
              </div>
              {!loading && supplier && (
                <Button
                  color="light"
                  size="sm"
                  onClick={() => navigate(`/supplier-registration/${supplier.supplierId}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '13px',
                  }}
                >
                  <Edit size={14} />
                  Edit Profile
                </Button>
              )}
            </div>

            <CardBody style={{ padding: 0 }}>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner color="primary" />
                  <p className="text-muted mt-3 mb-0">Loading supplier details...</p>
                </div>
              ) : errorMsg ? (
                <div className="text-center py-5 text-danger">{errorMsg}</div>
              ) : supplier ? (
                <>
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
                        <h4
                          style={{
                            margin: '0 0 4px 0',
                            color: '#333',
                            fontWeight: '600',
                          }}
                        >
                          {supplier.displayName || supplier.name || 'N/A'}
                        </h4>
                        {supplier.name &&
                          supplier.displayName &&
                          supplier.displayName !== supplier.name && (
                            <p
                              style={{
                                margin: '0 0 8px 0',
                                color: '#666',
                                fontSize: '14px',
                              }}
                            >
                              {supplier.name}
                            </p>
                          )}

                        <div className="d-flex align-items-center mt-2">
                          <div className="d-flex align-items-center me-2">
                            {renderStars(supplierRatings.overallRating || 0)}
                          </div>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#333',
                            }}
                          >
                            {(supplierRatings.overallRating || 0).toFixed(1)}
                          </span>
                          <span
                            style={{
                              fontSize: '12px',
                              color: '#888',
                              marginLeft: '4px',
                            }}
                          >
                            ({supplierRatings.totalReviews || 0} reviews)
                          </span>
                        </div>

                        {supplier.currency && (
                          <Badge
                            color="info"
                            style={{
                              fontSize: '10px',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              marginTop: '8px',
                            }}
                          >
                            Currency: {supplier.currency}
                          </Badge>
                        )}
                      </div>

                      <div className="d-flex flex-column align-items-end gap-2">
                        <Badge
                          color={supplier.isActive !== false ? 'success' : 'secondary'}
                          style={{
                            fontSize: '11px',
                            padding: '6px 12px',
                            borderRadius: '20px',
                          }}
                        >
                          {supplier.supplierStatus ||
                            (supplier.isActive !== false ? 'ACTIVE' : 'INACTIVE')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '24px' }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '20px',
                      }}
                    >
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
                              {supplier.email || 'N/A'}
                            </span>
                          </div>

                          {supplier.salesEmail && (
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
                                {supplier.salesEmail}
                              </span>
                            </div>
                          )}

                          <div className="d-flex align-items-center mb-3">
                            <Phone size={14} className="me-2" style={{ color: '#888' }} />
                            <span style={{ color: '#666' }}>Primary Contact:</span>
                            <span
                              style={{
                                marginLeft: '8px',
                                fontWeight: '500',
                                color: '#333',
                              }}
                            >
                              {supplier.primaryContact || 'N/A'}
                            </span>
                          </div>

                          {supplier.customerServicePhone && (
                            <div className="d-flex align-items-center mb-3">
                              <Phone size={14} className="me-2" style={{ color: '#888' }} />
                              <span style={{ color: '#666' }}>Customer Service:</span>
                              <span
                                style={{
                                  marginLeft: '8px',
                                  fontWeight: '500',
                                  color: '#333',
                                }}
                              >
                                {supplier.customerServicePhone}
                              </span>
                            </div>
                          )}

                          <div className="d-flex align-items-start">
                            <Globe size={14} className="me-2 mt-1" style={{ color: '#888' }} />
                            <span style={{ color: '#666' }}>Website:</span>
                            {supplier.website ? (
                              <a
                                href={supplier.website}
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
                                {supplier.website}
                              </a>
                            ) : (
                              <span
                                style={{
                                  marginLeft: '8px',
                                  fontWeight: '500',
                                  color: '#333',
                                }}
                              >
                                N/A
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

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
                            const addr = supplier.address;
                            const hasAddressObject = addr && typeof addr === 'object';
                            const addressLine1 = hasAddressObject
                              ? addr.addressLine1 || addr.street
                              : supplier.addressLine1 || supplier.street;
                            const addressLine2 = hasAddressObject
                              ? addr.addressLine2
                              : supplier.addressLine2;
                            const city = hasAddressObject ? addr.city : supplier.city;
                            const state = hasAddressObject ? addr.state : supplier.state;
                            const postalCode = hasAddressObject
                              ? addr.postalCode || addr.zipCode
                              : supplier.postalCode || supplier.zipCode;
                            const country = hasAddressObject ? addr.country : supplier.country;

                            if (addressLine1 || city || state || country) {
                              return (
                                <>
                                  {addressLine1 && (
                                    <p
                                      style={{
                                        margin: '0 0 4px 0',
                                        color: '#333',
                                      }}
                                    >
                                      {addressLine1}
                                    </p>
                                  )}
                                  {addressLine2 && (
                                    <p
                                      style={{
                                        margin: '0 0 4px 0',
                                        color: '#333',
                                      }}
                                    >
                                      {addressLine2}
                                    </p>
                                  )}
                                  {(city || state || postalCode) && (
                                    <p
                                      style={{
                                        margin: '0',
                                        color: '#666',
                                      }}
                                    >
                                      {[city, state, postalCode].filter(Boolean).join(', ')}
                                    </p>
                                  )}
                                  {country && (
                                    <p
                                      style={{
                                        margin: '4px 0 0 0',
                                        color: '#666',
                                        fontWeight: '500',
                                      }}
                                    >
                                      {country}
                                    </p>
                                  )}
                                </>
                              );
                            }
                            return (
                              <p style={{ margin: 0, color: '#888' }}>Address not available</p>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {supplier.categories && supplier.categories.length > 0 && (
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
                          <Package size={14} className="me-2" style={{ color: '#009efb' }} />
                          Categories & Subcategories
                        </h6>

                        <div>
                          {supplier.categories
                            .filter(cat => cat.parentId === null)
                            .map((category, index) => (
                              <div
                                key={index}
                                style={{
                                  marginBottom: '16px',
                                  paddingBottom: '16px',
                                  borderBottom:
                                    index < supplier.categories.filter(cat => cat.parentId === null).length - 1
                                      ? '1px solid #e8e8e8'
                                      : 'none',
                                }}
                              >
                                <div style={{ marginBottom: '8px' }}>
                                  <Badge
                                    color="info"
                                    style={{
                                      fontSize: '12px',
                                      padding: '6px 12px',
                                      fontWeight: '600',
                                    }}
                                  >
                                    {category.categoryName}
                                  </Badge>
                                </div>

                                {category.subCategories && category.subCategories.length > 0 && (
                                  <div style={{ marginLeft: '16px', marginTop: '8px' }}>
                                    <div
                                      style={{
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        color: '#6c757d',
                                        marginBottom: '6px',
                                      }}
                                    >
                                      Subcategories:
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                      {category.subCategories.map((subCat, subIndex) => (
                                        <Badge
                                          key={subIndex}
                                          color="secondary"
                                          style={{
                                            fontSize: '11px',
                                            padding: '4px 10px',
                                            fontWeight: '500',
                                          }}
                                        >
                                          {subCat.categoryName}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

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
                            <div
                              style={{
                                fontSize: '12px',
                                color: '#666',
                                marginTop: '4px',
                              }}
                            >
                              Quality
                            </div>
                            <div className="d-flex justify-content-center mt-1">
                              {renderStars(supplierRatings.qualityRating || 0)}
                            </div>
                          </div>

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
                            <div
                              style={{
                                fontSize: '12px',
                                color: '#666',
                                marginTop: '4px',
                              }}
                            >
                              Delivery
                            </div>
                            <div className="d-flex justify-content-center mt-1">
                              {renderStars(supplierRatings.deliveryPerformanceRating || 0)}
                            </div>
                          </div>

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
                            <div
                              style={{
                                fontSize: '12px',
                                color: '#666',
                                marginTop: '4px',
                              }}
                            >
                              Pricing
                            </div>
                            <div className="d-flex justify-content-center mt-1">
                              {renderStars(supplierRatings.pricingCostTransparencyRating || 0)}
                            </div>
                          </div>

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
                            <div
                              style={{
                                fontSize: '12px',
                                color: '#666',
                                marginTop: '4px',
                              }}
                            >
                              Communication
                            </div>
                            <div className="d-flex justify-content-center mt-1">
                              {renderStars(supplierRatings.communicationResponsivenessRating || 0)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-3">
                          <p
                            style={{
                              margin: 0,
                              color: '#888',
                              fontSize: '13px',
                            }}
                          >
                            No ratings available for this supplier yet.
                          </p>
                        </div>
                      )}
                    </div>

                    {(supplier.description || supplier.notes) && (
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
                          {supplier.description || supplier.notes}
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
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SupplierInfo;
