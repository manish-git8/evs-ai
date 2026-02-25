import React, { useEffect, useState } from 'react';
import {
  Spinner,
  Row,
  Col,
  Card,
  CardBody,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
} from 'reactstrap';
import { toast } from 'react-toastify';
import {
  FaStar,
  FaRegStar,
  FaStarHalfAlt,
  FaTruck,
  FaBoxOpen,
  FaMoneyBillWave,
  FaComments,
  FaSearch,
} from 'react-icons/fa';
import {
  getEntityId,
  getUserId,
  getEntityType,
  getExtensionFromContentType,
} from '../localStorageUtil';
import '../CompanyManagement/ReactBootstrapTable.scss';
import FeedBackService from '../../services/FeedBackService';
import FileUploadService from '../../services/FileUploadService';
import { EntityConstant } from '../../constant/EntityConstant';

const FeedbackManagement = () => {
  const [feedbackList, setFeedbackList] = useState([]);
  const [filteredFeedbackList, setFilteredFeedbackList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const entityId = getEntityId();
  const userId = getUserId();
  const entityType = getEntityType();
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [reviewsModal, setReviewsModal] = useState(false);
  const [selectedFeedbackReviews, setSelectedFeedbackReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [selectedSupplierName, setSelectedSupplierName] = useState('');

  const filterFeedback = (feedbacks, term) => {
    if (!term.trim()) return feedbacks;

    const searchLower = term.toLowerCase();
    return feedbacks.filter((feedback) => {
      if (entityType === EntityConstant.SUPPLIER) {
        return feedback.name && feedback.name.toLowerCase().includes(searchLower);
      }
      return feedback.name && feedback.name.toLowerCase().includes(searchLower);
    });
  };

  const getSuggestions = (term) => {
    if (!term.trim()) return [];
    const searchLower = term.toLowerCase();
    return feedbackList
      .filter((feedback) => {
        const name =
          entityType === EntityConstant.SUPPLIER
            ? feedback.name && feedback.name.toLowerCase()
            : feedback.name && feedback.name.toLowerCase();
        return name && name.startsWith(searchLower);
      })
      .map((feedback) => (entityType === EntityConstant.SUPPLIER ? feedback.name : feedback.name))
      .filter((value, index, self) => self.indexOf(value) === index)
      .slice(0, 5);
  };

  useEffect(() => {
    const suggestions = getSuggestions(searchTerm);
    setSearchSuggestions(suggestions);
    setShowSuggestions(!!searchTerm && suggestions.length > 0);
    const filtered = filterFeedback(feedbackList, searchTerm);
    setFilteredFeedbackList(filtered);
  }, [searchTerm, feedbackList]);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      let feedbackResponse;

      if (entityType === EntityConstant.SUPPLIER) {
        feedbackResponse = await FeedBackService.getAllFeedbackForSupplier(entityId);
        const feedbacks = feedbackResponse.data || [];

        setFeedbackList(feedbacks);
        setFilteredFeedbackList(feedbacks);
      } else {
        feedbackResponse = await FeedBackService.getAllFeedbackForUser(entityId, userId);
        const feedbacks = feedbackResponse.data || [];

        setFeedbackList(feedbacks);
        setFilteredFeedbackList(feedbacks);
      }
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
      toast.error(
        (error.response && error.response.data && error.response.data.message) ||
          'Failed to load feedback',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileId) => {
    try {
      const downloadResponse = await FileUploadService.downloadFile(fileId);
      const contentType = downloadResponse.headers['content-type'];
      const contentDisposition = downloadResponse.headers['content-disposition'];
      let filename = `Document_${fileId}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/);
        if (match) [filename] = match;
      } else {
        const extension = getExtensionFromContentType(contentType) || 'pdf';
        filename = `${filename}.${extension}`;
      }

      const url = window.URL.createObjectURL(
        new Blob([downloadResponse.data], { type: contentType }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('Document downloaded successfully');
    } catch (downloadError) {
      console.error('Error downloading document:', downloadError);
      toast.dismiss();
      toast.error('Failed to download document');
    }
  };

  const handleFeedbackCardClick = async (feedback) => {
    if (entityType === EntityConstant.SUPPLIER) return;
    setIsLoadingReviews(true);
    setReviewsModal(true);
    setSelectedFeedbackReviews([]);
    setSelectedSupplierName(feedback.name || 'Unknown');

    try {
      let reviewsResponse;

      if (entityType === EntityConstant.SUPPLIER) {
        reviewsResponse = await FeedBackService.getAllFeedbackForSupplier(entityId);
      } else {
        reviewsResponse = await FeedBackService.getAllFeedbackForCompanyBySupplier(
          entityId,
          feedback.supplierId,
        );
      }

      if (reviewsResponse?.data) {
        setSelectedFeedbackReviews(reviewsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setIsLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  useEffect(() => {
    const filtered = filterFeedback(feedbackList, searchTerm);
    setFilteredFeedbackList(filtered);
  }, [searchTerm, feedbackList]);

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5 && rating % 1 < 1;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<FaStar key={i} className="text-warning fs-4" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<FaStarHalfAlt key={i} className="text-warning fs-4" />);
      } else {
        stars.push(<FaRegStar key={i} className="text-warning fs-4" />);
      }
    }
    return stars;
  };

  return (
    <div style={{ paddingTop: '20px' }}>
      <Row className="mb-4">
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
            <CardBody className="py-4">
              <Row className="align-items-center">
                <Col md="8">
                  <h3 className="mb-2 fw-bold">
                    <i className="fas fa-star me-2"></i>
                    {entityType === EntityConstant.SUPPLIER
                      ? 'Feedback Overview'
                      : 'Supplier Performance Insights'}
                  </h3>
                  <p className="mb-0 opacity-90">
                    {entityType === EntityConstant.SUPPLIER
                      ? 'View and analyze feedback received from your customers across different performance metrics'
                      : 'Monitor and evaluate supplier performance based on comprehensive feedback ratings'}
                  </p>
                </Col>
                <Col md="4" className="text-end d-none d-md-block">
                  <div className="welcome-stats">
                    <div className="text-center">
                      <div className="h2 mb-1 fw-bold text-white">{feedbackList.length}</div>
                      <small className="text-white opacity-75">Total Reviews</small>
                    </div>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {!loading && feedbackList.length > 0 && (
        <Row className="mb-4">
          <Col lg="6">
            <Card
              className="search-card"
              style={{
                borderRadius: '12px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                border: 'none',
              }}
            >
              <CardBody className="py-3">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="icon-wrapper"
                    style={{
                      width: '35px',
                      height: '35px',
                      backgroundColor: 'rgba(0, 158, 251, 0.1)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FaSearch className="text-primary" />
                  </div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Input
                      type="text"
                      placeholder={
                        entityType === EntityConstant.SUPPLIER
                          ? 'Search by company name...'
                          : 'Search by supplier name...'
                      }
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() =>
                        setShowSuggestions(!!searchTerm && searchSuggestions.length > 0)
                      }
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      style={{
                        border: 'none',
                        boxShadow: 'none',
                        backgroundColor: 'transparent',
                        fontSize: '14px',
                      }}
                    />
                    {showSuggestions && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: 'white',
                          border: '1px solid #ced4da',
                          borderRadius: '8px',
                          zIndex: 1000,
                          maxHeight: '200px',
                          overflowY: 'auto',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          marginTop: '4px',
                        }}
                      >
                        {searchSuggestions.map((suggestion) => (
                          <div
                            key={suggestion}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              borderBottom:
                                searchSuggestions.indexOf(suggestion) < searchSuggestions.length - 1
                                  ? '1px solid #f0f0f0'
                                  : 'none',
                              transition: 'background-color 0.2s ease',
                            }}
                            onClick={() => {
                              setSearchTerm(suggestion);
                              setShowSuggestions(false);
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#f8f9fa';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = 'transparent';
                            }}
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      {loading ? (
        <Card
          className="loading-card"
          style={{
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: 'none',
            minHeight: '400px',
          }}
        >
          <CardBody className="d-flex align-items-center justify-content-center flex-column">
            <Spinner color="primary" size="lg" />
            <p className="mt-3 text-muted">Loading feedback insights...</p>
          </CardBody>
        </Card>
      ) : filteredFeedbackList.length === 0 && searchTerm ? (
        <Card
          className="empty-state-card"
          style={{
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: 'none',
            minHeight: '400px',
          }}
        >
          <CardBody className="d-flex align-items-center justify-content-center flex-column text-center">
            <div
              className="icon-wrapper mb-4"
              style={{
                width: '80px',
                height: '80px',
                backgroundColor: 'rgba(0, 158, 251, 0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FaSearch size={35} className="text-primary" />
            </div>
            <h4 className="text-muted mb-3">No results found</h4>
            <p className="text-muted">Try adjusting your search terms or browse all feedback</p>
          </CardBody>
        </Card>
      ) : feedbackList.length === 0 ? (
        <Card
          className="empty-state-card"
          style={{
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: 'none',
            minHeight: '400px',
          }}
        >
          <CardBody className="d-flex align-items-center justify-content-center flex-column text-center">
            <div
              className="icon-wrapper mb-4"
              style={{
                width: '100px',
                height: '100px',
                backgroundColor: 'rgba(0, 158, 251, 0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FaComments size={45} className="text-primary" />
            </div>
            <h4 className="text-muted mb-3">No feedback available</h4>
            <p className="text-muted">Feedback reviews will appear here once they are submitted</p>
          </CardBody>
        </Card>
      ) : (
        <Row>
          {filteredFeedbackList.map((feedback, index) => (
            <Col md={6} lg={4} key={feedback.id || index} className="mb-4">
              <Card
                className="feedback-card h-100"
                style={{
                  borderRadius: '15px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: 'none',
                  transition: 'all 0.3s ease',
                  cursor: entityType === EntityConstant.SUPPLIER ? 'default' : 'pointer',
                }}
                onClick={
                  entityType === EntityConstant.SUPPLIER
                    ? undefined
                    : () => handleFeedbackCardClick(feedback)
                }
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
                }}
              >
                <CardBody className="p-4">
                  <div className="d-flex justify-content-between align-items-start mb-4">
                    <div>
                      <h5 className="mb-1 fw-bold text-dark">
                        {entityType === 'SUPPLIER'
                          ? feedback.name || 'Unknown Company'
                          : feedback.name || 'Anonymous'}
                      </h5>
                      <small className="text-muted">
                        {entityType === 'SUPPLIER' ? 'Customer Review' : 'Supplier Review'}
                      </small>
                    </div>
                    <div
                      className="overall-rating-badge"
                      style={{
                        backgroundColor:
                          feedback.overallRating >= 4
                            ? '#28a745'
                            : feedback.overallRating >= 3
                            ? '#ffc107'
                            : '#dc3545',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      {feedback.overallRating && feedback.overallRating.toFixed(1)} ⭐
                    </div>
                  </div>

                  <div className="rating-categories mb-4">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center">
                        <FaTruck className="me-2" style={{ color: '#17a2b8' }} />
                        <span className="rating-label">Delivery</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <div className="rating-stars me-2">
                          {renderStars(feedback.deliveryPerformanceRating)}
                        </div>
                        <span className="rating-value fw-bold text-dark">
                          {feedback.deliveryPerformanceRating &&
                            feedback.deliveryPerformanceRating.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center">
                        <FaBoxOpen className="me-2" style={{ color: '#28a745' }} />
                        <span className="rating-label">Quality</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <div className="rating-stars me-2">
                          {renderStars(feedback.qualityRating)}
                        </div>
                        <span className="rating-value fw-bold text-dark">
                          {feedback.qualityRating && feedback.qualityRating.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center">
                        <FaMoneyBillWave className="me-2" style={{ color: '#dc3545' }} />
                        <span className="rating-label">Pricing</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <div className="rating-stars me-2">
                          {renderStars(feedback.pricingCostTransparencyRating)}
                        </div>
                        <span className="rating-value fw-bold text-dark">
                          {feedback.pricingCostTransparencyRating &&
                            feedback.pricingCostTransparencyRating.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div className="d-flex align-items-center">
                        <FaComments className="me-2" style={{ color: '#007bff' }} />
                        <span className="rating-label">Communication</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <div className="rating-stars me-2">
                          {renderStars(feedback.communicationResponsivenessRating)}
                        </div>
                        <span className="rating-value fw-bold text-dark">
                          {feedback.communicationResponsivenessRating &&
                            feedback.communicationResponsivenessRating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <hr className="my-3" style={{ borderColor: '#e9ecef' }} />
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div className="d-flex align-items-center">
                        <FaStar className="me-2" style={{ color: '#ffc107' }} />
                        <span className="rating-label fw-bold">Overall Rating</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <div className="rating-stars me-2">
                          {renderStars(feedback.overallRating)}
                        </div>
                        <span
                          className="rating-value fw-bold"
                          style={{ color: '#ffc107', fontSize: '16px' }}
                        >
                          {feedback.overallRating && feedback.overallRating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {feedback.notes && (
                    <div
                      className="notes-section"
                      style={{
                        backgroundColor: '#f8f9fa',
                        borderLeft: '4px solid #009efb',
                        padding: '12px 16px',
                        borderRadius: '0 8px 8px 0',
                        marginBottom: '16px',
                      }}
                    >
                      <h6 className="mb-2 text-primary" style={{ fontSize: '14px' }}>
                        <i className="fas fa-sticky-note me-1"></i>
                        Feedback Notes
                      </h6>
                      <p
                        className="mb-0 text-muted"
                        style={{ fontSize: '13px', lineHeight: '1.4' }}
                      >
                        {feedback.notes}
                      </p>
                    </div>
                  )}

                  {feedback.documentId && (
                    <div className="document-section mt-3">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm w-100"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDownload(feedback.documentId);
                        }}
                        style={{
                          borderRadius: '8px',
                          borderColor: '#009efb',
                          color: '#009efb',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#009efb';
                          e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                          e.target.style.color = '#009efb';
                        }}
                      >
                        <i className="fas fa-download me-2"></i>
                        Download Attachment
                      </button>
                    </div>
                  )}
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal isOpen={reviewsModal} toggle={() => setReviewsModal(false)} centered size="lg">
        <ModalHeader
          toggle={() => setReviewsModal(false)}
          style={{
            background: 'linear-gradient(135deg, #009efb, #0085d1)',
            color: 'white',
            borderBottom: 'none',
          }}
        >
          <FaStar className="me-2" />
          Reviews for {selectedSupplierName}
        </ModalHeader>
        <ModalBody style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
          {isLoadingReviews ? (
            <div className="text-center py-5">
              <Spinner color="primary" />
              <p className="text-muted mt-3 mb-0">Loading reviews...</p>
            </div>
          ) : selectedFeedbackReviews.length === 0 ? (
            <div className="text-center py-5">
              <FaComments size={48} style={{ color: '#ccc' }} />
              <p className="text-muted mt-3 mb-0">No reviews found</p>
            </div>
          ) : (
            <>
              <div
                className="mb-4 p-3"
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e8e8e8',
                }}
              >
                <h5 className="mb-0">
                  Total Reviews:{' '}
                  <span className="text-primary">{selectedFeedbackReviews.length}</span>
                </h5>
              </div>

              {selectedFeedbackReviews.map((review, index) => (
                <Card
                  key={index}
                  className="mb-3"
                  style={{
                    borderRadius: '10px',
                    border: '1px solid #e8e8e8',
                  }}
                >
                  <CardBody className="p-3">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h6 className="mb-1 fw-bold">
                          {entityType === EntityConstant.SUPPLIER
                            ? review.companyName || review.name || 'Anonymous'
                            : review.supplierName || review.name || 'Anonymous'}
                        </h6>
                        <small className="text-muted">
                          {review.createdAt
                            ? new Date(review.createdAt).toLocaleDateString()
                            : 'Date not available'}
                        </small>
                      </div>
                      <div
                        style={{
                          backgroundColor:
                            review.overallRating >= 4
                              ? '#28a745'
                              : review.overallRating >= 3
                              ? '#ffc107'
                              : '#dc3545',
                          color: 'white',
                          padding: '4px 10px',
                          borderRadius: '15px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        {review.overallRating?.toFixed(1)} ⭐
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        fontSize: '13px',
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <span>
                          <FaTruck className="me-1" style={{ color: '#17a2b8' }} /> Delivery
                        </span>
                        <span className="fw-bold">
                          {review.deliveryPerformanceRating?.toFixed(1)}
                        </span>
                      </div>
                      <div className="d-flex align-items-center justify-content-between">
                        <span>
                          <FaBoxOpen className="me-1" style={{ color: '#28a745' }} /> Quality
                        </span>
                        <span className="fw-bold">{review.qualityRating?.toFixed(1)}</span>
                      </div>
                      <div className="d-flex align-items-center justify-content-between">
                        <span>
                          <FaMoneyBillWave className="me-1" style={{ color: '#dc3545' }} /> Pricing
                        </span>
                        <span className="fw-bold">
                          {review.pricingCostTransparencyRating?.toFixed(1)}
                        </span>
                      </div>
                      <div className="d-flex align-items-center justify-content-between">
                        <span>
                          <FaComments className="me-1" style={{ color: '#007bff' }} /> Communication
                        </span>
                        <span className="fw-bold">
                          {review.communicationResponsivenessRating?.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {review.notes && (
                      <div
                        className="mt-3 p-2"
                        style={{
                          backgroundColor: '#f8f9fa',
                          borderLeft: '3px solid #009efb',
                          borderRadius: '4px',
                        }}
                      >
                        <small className="text-muted d-block mb-1">Notes:</small>
                        <small>{review.notes}</small>
                      </div>
                    )}
                  </CardBody>
                </Card>
              ))}
            </>
          )}
        </ModalBody>
      </Modal>
    </div>
  );
};

export default FeedbackManagement;
