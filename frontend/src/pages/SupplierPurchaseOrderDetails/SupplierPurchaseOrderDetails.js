import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Row, Col, CardBody, Card, Label, Button, Input } from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import PurchaseOrderService from '../../services/PurchaseOrderService';
import { getEntityId } from '../localStorageUtil';

const SupplierPurchaseOrderDetails = () => {
  const { purchaseOrderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const supplierId = getEntityId();
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmQuantities, setConfirmQuantities] = useState({});

  const queryParams = new URLSearchParams(location.search);
  const redirectToDashboard = queryParams.get('dashboard') === 'true';
  const fromInvoice = location.state?.from === 'INVOICE_DETAILS';
  const fromInvoiceId = location.state?.invoiceId;

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const response = await PurchaseOrderService.getPurchaseOrderById(
          supplierId,
          purchaseOrderId,
        );
        const respData = response?.data;
        let orderData = null;

        if (Array.isArray(respData)) {
          [orderData] = respData;
          orderData = orderData || null;
        } else if (respData && Array.isArray(respData.content)) {
          [orderData] = respData.content;
          orderData = orderData || null;
        } else {
          orderData = respData || null;
        }
        setPurchaseOrder(orderData);
        const initialQuantities = {};
        orderData?.orderItemDetails?.forEach((item) => {
          const remaining = Math.max(0, item.quantity - (item.quantityConfirmed || 0));
          initialQuantities[item.purchaseOrderDetailId] = remaining;
        });
        setConfirmQuantities(initialQuantities);
      } catch (error) {
        console.error('Error fetching order details:', error);
        toast.error('Failed to load purchase order details');
        setPurchaseOrder(null);
      } finally {
        setLoading(false);
      }
    };

    if (purchaseOrderId) {
      fetchOrderDetails();
    }
  }, [purchaseOrderId, supplierId]);

  const formatCurrency = (amount, currency = 'USD') => {
    if (amount == null || Number.isNaN(Number(amount))) {
      return currency === 'USD' ? '$0.00' : `${currency} 0.00`;
    }

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(Number(amount));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
      case 'CONFIRMED':
        return '#28a745';
      case 'PARTIALLY_CONFIRMED':
        return '#17a2b8';
      case 'PENDING_APPROVAL':
      case 'SUBMITTED':
        return '#ffc107';
      case 'REJECTED':
        return '#dc3545';
      case 'DRAFT':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  const handleConfirmQuantityChange = (e, itemId, maxRemaining) => {
    const { value } = e.target;
    const inputQty = parseInt(value, 10) || 0;

    const validatedValue = Math.min(Math.max(0, inputQty), maxRemaining);

    setConfirmQuantities((prev) => ({
      ...prev,
      [itemId]: validatedValue,
    }));
  };

  const handleViewRFQDetails = () => {
    const rfqId = purchaseOrder?.rfq;
    const companyId = purchaseOrder?.company?.companyId;

    if (rfqId && companyId) {
      navigate(`/rfqDetails/${companyId}/${rfqId}?fromPO=${purchaseOrderId}`);
    } else {
      toast.error('RFQ information not available');
    }
  };

  const handleConfirmOrder = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You are about to confirm this purchase order. This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
      try {
        const filteredOrderItems = purchaseOrder.orderItemDetails.filter((item) => {
          const confirmQty = confirmQuantities[item.purchaseOrderDetailId] || 0;
          return confirmQty > 0 && item.quantityConfirmed !== item.quantity;
        });

        if (filteredOrderItems.length === 0) {
          Swal.fire({
            title: 'No Items to Confirm!',
            text: 'All items have either 0 quantity, are already confirmed, or match the original order quantity.',
            icon: 'warning',
            confirmButtonText: 'OK',
          });
          return;
        }

        const dataToSend = {
          confirmationDate: new Date().toISOString(),
          estimatedDate: new Date().toISOString(),
          company: {
            companyId: purchaseOrder.company?.companyId,
            name: purchaseOrder.company?.name || 'N/A',
            displayName: purchaseOrder.company?.displayName || 'N/A',
            email: purchaseOrder.company?.email || 'N/A',
            website: purchaseOrder.company?.website || 'N/A',
            phone: purchaseOrder.company?.phone || 'N/A',
          },
          purchaseOrder: {
            PurchaseOrderId: purchaseOrder.PurchaseOrderId,
            orderNo: purchaseOrder.orderNo || 'N/A',
            company: {
              companyId: purchaseOrder.company?.companyId,
              name: purchaseOrder.company?.name || 'N/A',
              displayName: purchaseOrder.company?.displayName || 'N/A',
              email: purchaseOrder.company?.email || 'N/A',
              website: purchaseOrder.company?.website || 'N/A',
              phone: purchaseOrder.company?.phone || 'N/A',
            },
          },
          supplier: {
            supplierId: purchaseOrder.supplier?.supplierId || supplierId,
            name: purchaseOrder.supplier?.name || 'N/A',
            displayName: purchaseOrder.supplier?.displayName || 'N/A',
          },
          notes: purchaseOrder.notes || null,
          isActive: purchaseOrder.isActive !== undefined ? purchaseOrder.isActive : true,
          orderItemDetails: filteredOrderItems.map((item) => ({
            orderConfirmationDetailId: 0,
            orderConfirmation: null,
            purchaseOrderDetail: {
              purchaseOrderDetailId: item.purchaseOrderDetailId || 0,
              purchaseOrder: {
                PurchaseOrderId: purchaseOrder.PurchaseOrderId,
                orderNo: purchaseOrder.orderNo || 'N/A',
                company: {
                  companyId: purchaseOrder.company?.companyId,
                  name: purchaseOrder.company?.name || 'N/A',
                  displayName: purchaseOrder.company?.displayName || 'N/A',
                  email: purchaseOrder.company?.email || 'N/A',
                  website: purchaseOrder.company?.website || 'N/A',
                  phone: purchaseOrder.company?.phone || 'N/A',
                },
              },
              partId: item.partId || 'N/A',
              partDescription: item.partDescription || 'N/A',
            },
            qtyConfirmed: confirmQuantities[item.purchaseOrderDetailId] || 0,
            isActive: item.isActive !== undefined ? item.isActive : true,
          })),
        };

        const response = await PurchaseOrderService.confirmPurchaseOrder(
          supplierId,
          dataToSend,
          purchaseOrder.company?.companyId,
        );

        if (response.status === 201) {
          toast.success('The order has been successfully confirmed.', {
            onClose: () => {
              if (redirectToDashboard) {
                navigate('/supplier-dashboard');
              } else {
                navigate('/purchase-order');
              }
            },
          });
        }
      } catch (error) {
        if (error.response && error.response.data && error.response.data.errorMessage) {
          Swal.fire({
            title: 'Error!',
            text: error.response.data.errorMessage,
            icon: 'error',
            confirmButtonText: 'OK',
          });
        } else {
          Swal.fire({
            title: 'Error!',
            text: 'An unexpected error occurred',
            icon: 'error',
            confirmButtonText: 'OK',
          });
        }
      }
    }
  };

  const hasItemsToConfirm = () => {
    return purchaseOrder?.orderItemDetails?.some((item) => {
      const remaining = Math.max(0, item.quantity - (item.quantityConfirmed || 0));
      return remaining > 0;
    });
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: '400px' }}
      >
        <div
          className="spinner-border text-primary"
          role="status"
          style={{ width: '3rem', height: '3rem' }}
        >
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div style={{ paddingTop: '24px' }}>
        <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
          <div className="card-body text-center" style={{ padding: '60px' }}>
            <i
              className="bi bi-exclamation-circle text-muted"
              style={{ fontSize: '64px', opacity: 0.3 }}
            ></i>
            <h5 className="mt-3 text-muted">No purchase order details available</h5>
            <p className="text-muted">The requested purchase order could not be found or loaded.</p>
            <Button
              color="primary"
              onClick={() => {
                if (fromInvoice && fromInvoiceId) {
                  navigate(`/supplier-invoice-details/${fromInvoiceId}`);
                } else {
                  navigate('/supplier-dashboard');
                }
              }}
              style={{ borderRadius: '8px', marginTop: '16px' }}
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '24px' }}>
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

      {/* Main Header Card */}
      <div
        className="d-flex align-items-center justify-content-between mb-3"
        style={{ marginTop: '10px' }}
      >
        <div className="d-flex align-items-baseline gap-3">
          <h4 className="mb-0" style={{ color: '#009efb', fontWeight: '600' }}>
            Purchase Order Details
          </h4>
        </div>
        <button
          type="button"
          className="btn btn-gradient-primary"
          onClick={() => {
            if (fromInvoice && fromInvoiceId) {
              navigate(`/supplier-invoice-details/${fromInvoiceId}`);
            } else {
              navigate('/supplier-dashboard');
            }
          }}
          style={{
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
            border: 'none',
            color: 'white',
            boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
          }}
        >
          <i className="fas fa-arrow-left me-2"></i>Back
        </button>
      </div>

      {/* Enhanced Order Information Card */}
      <div className="card shadow-sm mb-2" style={{ borderRadius: '12px', border: 'none' }}>
        <div className="card-body" style={{ padding: '24px' }}>
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div className="d-flex align-items-center gap-3">
              <div
                className="icon-wrapper"
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#009efb',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="bi bi-file-text text-white" style={{ fontSize: '18px' }}></i>
              </div>
              <div>
                <h4
                  className="mb-1"
                  style={{ color: '#009efb', fontWeight: '700', fontSize: '22px' }}
                >
                  {purchaseOrder.orderNo || 'N/A'}
                </h4>
                <div className="d-flex align-items-center gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <small className="text-muted" style={{ fontSize: '14px' }}>
                      Purchase Order
                    </small>
                    {purchaseOrder.rfq && (
                      <>
                        <span className="text-muted" style={{ fontSize: '14px' }}>
                          •
                        </span>
                        <button
                          type="button"
                          className="btn btn-link p-0"
                          onClick={handleViewRFQDetails}
                          style={{
                            fontSize: '14px',
                            color: '#009efb',
                            textDecoration: 'none',
                            fontWeight: '500',
                          }}
                        >
                          View RFQ Details
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <span
                className="badge"
                style={{
                  backgroundColor: getStatusColor(purchaseOrder.orderStatus),
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                {(purchaseOrder.orderStatus && purchaseOrder.orderStatus.replace(/_/g, ' ')) ||
                  'DRAFT'}
              </span>
            </div>
          </div>

          {/* Order Details Grid */}
          <div className="row g-4">
            {/* Left Column */}
            <div className="col-md-6">
              <div className="row g-3">
                <div className="col-sm-6">
                  <div className="info-item">
                    <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>
                      Buyer
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#212529' }}>
                      {purchaseOrder.buyerUser
                        ? `${purchaseOrder.buyerUser.firstName} ${purchaseOrder.buyerUser.lastName}`
                        : 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="info-item">
                    <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>
                      Created Date
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#212529' }}>
                      {purchaseOrder.orderPlacedDate
                        ? new Date(purchaseOrder.orderPlacedDate).toLocaleDateString()
                        : 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="info-item">
                    <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>
                      Order Amount
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#28a745' }}>
                      {formatCurrency(purchaseOrder.orderAmount || purchaseOrder.orderTotal)}
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="info-item">
                    <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>
                      Delivery Date
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#212529' }}>
                      {purchaseOrder.deliveryDate
                        ? new Date(purchaseOrder.deliveryDate).toLocaleDateString()
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Addresses */}
            <div className="col-md-6">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="info-item">
                    <div className="text-muted" style={{ fontSize: '12px', marginBottom: '6px' }}>
                      <i className="bi bi-truck me-1"></i>Shipping Address
                    </div>
                    <div style={{ fontSize: '12px', color: '#212529', lineHeight: '1.3' }}>
                      {purchaseOrder.shippingToAddress ? (
                        <>
                          {purchaseOrder.shippingToAddress.addressLine1 && (
                            <div>{purchaseOrder.shippingToAddress.addressLine1}</div>
                          )}
                          {purchaseOrder.shippingToAddress.addressLine2 && (
                            <div>{purchaseOrder.shippingToAddress.addressLine2}</div>
                          )}
                          {(purchaseOrder.shippingToAddress.city ||
                            purchaseOrder.shippingToAddress.state ||
                            purchaseOrder.shippingToAddress.postalCode) && (
                            <div>
                              {purchaseOrder.shippingToAddress.city &&
                                `${purchaseOrder.shippingToAddress.city}, `}
                              {purchaseOrder.shippingToAddress.state &&
                                `${purchaseOrder.shippingToAddress.state} `}
                              {purchaseOrder.shippingToAddress.postalCode}
                            </div>
                          )}
                          {purchaseOrder.shippingToAddress.country && (
                            <div>{purchaseOrder.shippingToAddress.country}</div>
                          )}
                        </>
                      ) : (
                        'N/A'
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="info-item">
                    <div className="text-muted" style={{ fontSize: '12px', marginBottom: '6px' }}>
                      <i className="bi bi-credit-card me-1"></i>Billing Address
                    </div>
                    <div style={{ fontSize: '12px', color: '#212529', lineHeight: '1.3' }}>
                      {purchaseOrder.billingToAddress ? (
                        <>
                          {purchaseOrder.billingToAddress.addressLine1 && (
                            <div>{purchaseOrder.billingToAddress.addressLine1}</div>
                          )}
                          {purchaseOrder.billingToAddress.addressLine2 && (
                            <div>{purchaseOrder.billingToAddress.addressLine2}</div>
                          )}
                          {(purchaseOrder.billingToAddress.city ||
                            purchaseOrder.billingToAddress.state ||
                            purchaseOrder.billingToAddress.postalCode) && (
                            <div>
                              {purchaseOrder.billingToAddress.city &&
                                `${purchaseOrder.billingToAddress.city}, `}
                              {purchaseOrder.billingToAddress.state &&
                                `${purchaseOrder.billingToAddress.state} `}
                              {purchaseOrder.billingToAddress.postalCode}
                            </div>
                          )}
                          {purchaseOrder.billingToAddress.country && (
                            <div>{purchaseOrder.billingToAddress.country}</div>
                          )}
                        </>
                      ) : (
                        'N/A'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div
        className="card shadow-sm mb-2 mt-0"
        style={{
          borderRadius: '12px',
          border: 'none',
        }}
      >
        <div className="card-body" style={{ padding: '8px 24px' }}>
          <div className="d-flex align-items-center justify-content-center">
            <div
              className="d-flex gap-2 flex-wrap justify-content-center"
              style={{ maxWidth: '100%' }}
            >
              {hasItemsToConfirm() && (
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  style={{
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '500',
                    minWidth: '120px',
                  }}
                  onClick={handleConfirmOrder}
                >
                  <i className="bi bi-check-circle me-1"></i>
                  Confirm Order
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '500',
                  minWidth: '120px',
                }}
                onClick={() => navigate(`/invoice/${purchaseOrderId}`)}
                disabled={
                  !purchaseOrder?.orderItemDetails?.some((item) => item.quantityConfirmed > 0)
                }
              >
                <i className="bi bi-file-text me-1"></i>
                Create Invoice
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '500',
                  minWidth: '120px',
                }}
                onClick={() => window.print()}
              >
                <i className="bi bi-printer me-1"></i>
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Order Items Section */}
        <div style={{ width: '100%' }}>
          <Card className="mb-4 shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
            <CardBody className="p-4">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <div className="d-flex align-items-center">
                  <i
                    className="bi bi-building me-2"
                    style={{ color: '#009efb', fontSize: '18px' }}
                  ></i>
                  <h6 className="mb-0" style={{ color: '#009efb', fontWeight: '600' }}>
                    {purchaseOrder.supplier?.displayName ||
                      purchaseOrder.supplier?.name ||
                      'Supplier'}
                  </h6>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted" style={{ fontSize: '13px' }}>
                      Items:
                    </span>
                    <span className="fw-semibold" style={{ color: '#495057', fontSize: '13px' }}>
                      {purchaseOrder.orderItemDetails?.length || 0}
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted" style={{ fontSize: '13px' }}>
                      Value:
                    </span>
                    <span className="fw-bold" style={{ color: '#198754', fontSize: '14px' }}>
                      {formatCurrency(
                        purchaseOrder.orderItemDetails?.reduce(
                          (sum, item) =>
                            sum +
                            (item.quantity && item.unitPrice ? item.quantity * item.unitPrice : 0),
                          0,
                        ) || 0,
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <Row>
                {purchaseOrder.orderItemDetails?.map((item) => {
                  const remainingQty = Math.max(0, item.quantity - (item.quantityConfirmed || 0));
                  const isFullyConfirmed = item.quantityConfirmed === item.quantity;

                  return (
                    <Col key={item.purchaseOrderDetailId} md="12" className="mb-3">
                      <div
                        className="border rounded p-3"
                        style={{
                          borderRadius: '8px',
                          backgroundColor: '#fafafa',
                          border: '1px solid #e0e0e0',
                          position: 'relative',
                        }}
                      >
                        <Row className="align-items-start">
                          <Col
                            md="2"
                            xs="4"
                            className="d-flex flex-column align-items-center justify-content-center"
                          >
                            <div style={{ width: '80px', height: '80px' }}>
                              <img
                                src={
                                  (item && item.catalogItem && item.catalogItem.ProductImageURL) ||
                                  'https://st3.depositphotos.com/23594922/31822/v/450/depositphotos_318221368-stock-illustration-missing-picture-page-for-website.jpg'
                                }
                                alt="Product"
                                className="img-fluid"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  borderRadius: '8px',
                                  border: '1px solid #e0e0e0',
                                }}
                              />
                            </div>
                          </Col>
                          <Col md="4" xs="9" className="justify-content-start">
                            <div className="mb-3">
                              <h6
                                className="mb-1"
                                style={{
                                  color: '#000',
                                  fontWeight: '600',
                                  lineHeight: '1.4',
                                  fontSize: '16px',
                                }}
                              >
                                {item.partDescription ||
                                  item.catalogItem?.Description ||
                                  'Product Description'}
                              </h6>
                            </div>
                            <div className="d-flex flex-column gap-1 mt-2">
                              <div className="d-flex align-items-center">
                                <span
                                  className="text-muted me-2"
                                  style={{ fontSize: '13px', minWidth: '80px' }}
                                >
                                  Part ID:
                                </span>
                                <span style={{ fontSize: '13px', color: '#000' }}>
                                  {item.partId || item.catalogItem?.PartId || 'N/A'}
                                </span>
                              </div>
                              <div className="d-flex align-items-center">
                                <span
                                  className="text-muted me-2"
                                  style={{ fontSize: '13px', minWidth: '80px' }}
                                >
                                  Unit Price:
                                </span>
                                <span
                                  style={{ fontSize: '13px', fontWeight: '500', color: '#000' }}
                                >
                                  {formatCurrency(item.unitPrice)}
                                </span>
                              </div>
                              <div className="d-flex align-items-center">
                                <span
                                  className="text-muted me-2"
                                  style={{ fontSize: '13px', minWidth: '80px' }}
                                >
                                  Total:
                                </span>
                                <span
                                  style={{ fontSize: '14px', fontWeight: '600', color: '#000' }}
                                >
                                  {formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}
                                </span>
                              </div>
                            </div>

                            {/* Quantity Fields */}
                            <div className="mt-3">
                              <div
                                className="d-flex align-items-center justify-content-start"
                                style={{
                                  gap: '6px',
                                  flexWrap: 'wrap',
                                  minWidth: '300px',
                                }}
                              >
                                <div
                                  className="quantity-item"
                                  style={{
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '4px',
                                    padding: '3px 4px',
                                    textAlign: 'center',
                                    minWidth: '50px',
                                    maxWidth: '62px',
                                    border: '1px solid #e9ecef',
                                    flexShrink: 0,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      color: '#009efb',
                                    }}
                                  >
                                    {item.quantity || '0'}
                                  </div>
                                  <small
                                    className="text-muted"
                                    style={{ fontSize: '9px', whiteSpace: 'nowrap' }}
                                  >
                                    Ordered
                                  </small>
                                </div>

                                {/* Confirm Qty - Editable Input */}
                                <div
                                  className="quantity-item"
                                  style={{
                                    backgroundColor: isFullyConfirmed ? '#f8f9fa' : '#fff',
                                    borderRadius: '4px',
                                    padding: '3px 4px',
                                    textAlign: 'center',
                                    minWidth: '58px',
                                    maxWidth: '70px',
                                    border: isFullyConfirmed
                                      ? '1px solid #e9ecef'
                                      : '2px solid #ffc107',
                                    flexShrink: 0,
                                  }}
                                >
                                  {isFullyConfirmed ? (
                                    <>
                                      <div
                                        style={{
                                          fontSize: '11px',
                                          fontWeight: '600',
                                          color: '#6c757d',
                                        }}
                                      >
                                        -
                                      </div>
                                      <small
                                        className="text-muted"
                                        style={{ fontSize: '8px', whiteSpace: 'nowrap' }}
                                      >
                                        Confirm
                                      </small>
                                    </>
                                  ) : (
                                    <>
                                      <Input
                                        type="number"
                                        min="0"
                                        max={remainingQty}
                                        value={confirmQuantities[item.purchaseOrderDetailId] || 0}
                                        onChange={(e) =>
                                          handleConfirmQuantityChange(
                                            e,
                                            item.purchaseOrderDetailId,
                                            remainingQty,
                                          )
                                        }
                                        style={{
                                          width: '45px',
                                          height: '22px',
                                          fontSize: '11px',
                                          textAlign: 'center',
                                          fontWeight: '600',
                                          color: '#ffc107',
                                          padding: '2px 4px',
                                          margin: '0 auto',
                                          border: 'none',
                                          backgroundColor: 'transparent',
                                        }}
                                      />
                                      <small
                                        className="text-muted"
                                        style={{ fontSize: '8px', whiteSpace: 'nowrap' }}
                                      >
                                        Confirm
                                      </small>
                                    </>
                                  )}
                                </div>

                                <div
                                  className="quantity-item"
                                  style={{
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '4px',
                                    padding: '3px 4px',
                                    textAlign: 'center',
                                    minWidth: '50px',
                                    maxWidth: '62px',
                                    border: '1px solid #e9ecef',
                                    flexShrink: 0,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      color: '#28a745',
                                    }}
                                  >
                                    {item.quantityConfirmed || '0'}
                                  </div>
                                  <small
                                    className="text-muted"
                                    style={{ fontSize: '8px', whiteSpace: 'nowrap' }}
                                  >
                                    Confirmed
                                  </small>
                                </div>
                                <div
                                  className="quantity-item"
                                  style={{
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '4px',
                                    padding: '3px 4px',
                                    textAlign: 'center',
                                    minWidth: '50px',
                                    maxWidth: '62px',
                                    border: '1px solid #e9ecef',
                                    flexShrink: 0,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      color: '#17a2b8',
                                    }}
                                  >
                                    {item.quantityReceived || '0'}
                                  </div>
                                  <small
                                    className="text-muted"
                                    style={{ fontSize: '8px', whiteSpace: 'nowrap' }}
                                  >
                                    Received
                                  </small>
                                </div>
                                <div
                                  className="quantity-item"
                                  style={{
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '4px',
                                    padding: '3px 4px',
                                    textAlign: 'center',
                                    minWidth: '50px',
                                    maxWidth: '62px',
                                    border: '1px solid #e9ecef',
                                    flexShrink: 0,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      color: '#ffc107',
                                    }}
                                  >
                                    {item.quantityInvoiced || '0'}
                                  </div>
                                  <small
                                    className="text-muted"
                                    style={{ fontSize: '8px', whiteSpace: 'nowrap' }}
                                  >
                                    Invoiced
                                  </small>
                                </div>
                              </div>
                            </div>
                          </Col>
                          <Col md="6" xs="12">
                            {/* Additional fields */}
                            {item.department && (
                              <Row className="align-items-center mb-2">
                                <Col xs="4" className="text-end">
                                  <Label className="mb-0 text-muted" style={{ fontSize: '12px' }}>
                                    Department
                                  </Label>
                                </Col>
                                <Col xs="8">
                                  <span style={{ fontSize: '12px', color: '#000' }}>
                                    {item.department?.name || 'N/A'}
                                  </span>
                                </Col>
                              </Row>
                            )}
                            {item.location && (
                              <Row className="align-items-center mb-2">
                                <Col xs="4" className="text-end">
                                  <Label className="mb-0 text-muted" style={{ fontSize: '12px' }}>
                                    Location
                                  </Label>
                                </Col>
                                <Col xs="8">
                                  <span style={{ fontSize: '12px', color: '#000' }}>
                                    {item.location?.name || 'N/A'}
                                  </span>
                                </Col>
                              </Row>
                            )}
                            {item.classId && (
                              <Row className="align-items-center mb-2">
                                <Col xs="4" className="text-end">
                                  <Label className="mb-0 text-muted" style={{ fontSize: '12px' }}>
                                    Class
                                  </Label>
                                </Col>
                                <Col xs="8">
                                  <span style={{ fontSize: '12px', color: '#000' }}>
                                    {item.classId?.name || 'N/A'}
                                  </span>
                                </Col>
                              </Row>
                            )}
                            {item.glAccount && (
                              <Row className="align-items-center mb-2">
                                <Col xs="4" className="text-end">
                                  <Label className="mb-0 text-muted" style={{ fontSize: '12px' }}>
                                    GL Account
                                  </Label>
                                </Col>
                                <Col xs="8">
                                  <span style={{ fontSize: '12px', color: '#000' }}>
                                    {item.glAccount?.name || 'N/A'}
                                  </span>
                                </Col>
                              </Row>
                            )}
                            {item.project && (
                              <Row className="align-items-center mb-2">
                                <Col xs="4" className="text-end">
                                  <Label className="mb-0 text-muted" style={{ fontSize: '12px' }}>
                                    Project
                                  </Label>
                                </Col>
                                <Col xs="8">
                                  <span style={{ fontSize: '12px', color: '#000' }}>
                                    {item.project?.name || 'N/A'}
                                  </span>
                                </Col>
                              </Row>
                            )}
                          </Col>
                        </Row>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SupplierPurchaseOrderDetails;
