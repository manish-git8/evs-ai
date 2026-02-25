import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  CardBody,
  CardTitle,
  CardHeader,
  ListGroup,
  ListGroupItem,
  Badge,
  Table,
  Input,
  Button,
  Spinner,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from 'reactstrap';
import {
  FaPaperclip,
  FaBuilding,
  FaClipboardList,
  FaCalendarAlt,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaBoxOpen,
  FaHistory,
} from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useParams, useNavigate } from 'react-router-dom';
import ComponentCard from '../../components/ComponentCard';
import RqfService from '../../services/RfqService';
// import SupplierService from '../../services/SupplierService';
import CompanyService from '../../services/CompanyService';
import FileUploadService from '../../services/FileUploadService';
import { formatDate, getEntityId } from '../localStorageUtil';
import '../CompanyManagement/ReactBootstrapTable.scss';
import AttachmentsModal from './AttachmentsModal';
import { RFQ_STATUS } from '../../constant/RfqConstant';

const RFQSupplierDetail = () => {
  const { rfqId } = useParams();
  const queryParams = new URLSearchParams(window.location.search);
  const fromPO = queryParams.get('fromPO');
  const navigate = useNavigate();
  const [rfqData, setRfqData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [responseItems, setResponseItems] = useState([]);
  const [isAnySignoffRequested, setIsAnySignoffRequested] = useState(false);
  const [negotiationDialog, setNegotiationDialog] = useState({
    isOpen: false,
    supplierIndex: null,
    itemIndex: null,
    history: [],
  });
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const currentSupplierId = getEntityId();

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    const { addressLine1, addressLine2, city, state, postalCode, country } = address;
    return [addressLine1, addressLine2, city, state, postalCode, country]
      .filter(Boolean)
      .join(', ');
  };

  useEffect(() => {
    const fetchRfqDetails = async () => {
      try {
        setLoading(true);
        const response = await RqfService.getSupplierRfqById(rfqId, currentSupplierId);
        const rfq = response.data;
        const hasSubmitted = rfq.rfqStatus === RFQ_STATUS.SUBMITTED;
        setIsAnySignoffRequested(hasSubmitted);
        const initialResponses =
          rfq.suppliers?.map((supplier) => ({
            supplierId: supplier.supplierId,
            rfqSupplierId: supplier.rfqSupplierId,
            items: rfq.rfqItems.map((item) => {
              const existingResponse = supplier.responseItems?.find(
                (resItem) => resItem.rfqItemId === item.rfqItemId,
              );

              return {
                rfqItemId: item.rfqItemId,
                quantityAccepted: existingResponse?.quantity || item.quantity,
                unitPrice: existingResponse?.unitPrice || '',
                negotiatedUnitPrice: existingResponse?.negotiatedUnitPrice || '',
                negotiationHistory: existingResponse?.negotiationHistory
                  ? JSON.parse(existingResponse.negotiationHistory)
                  : [],
              };
            }),
          })) || [];

        setRfqData(rfq);
        setResponseItems(initialResponses);

        if (rfq.companyId) {
          const companyResponse = await CompanyService.getCompanyByCompanyId(rfq.companyId);
          // getCompanyByCompanyId transforms response - data is already the array (not data.content)
          setCompanyDetails(companyResponse.data || []);
        }
      } catch (err) {
        console.error('Error fetching RFQ details', err);
        toast.dismiss();
        toast.error('Failed to load RFQ details');
      } finally {
        setLoading(false);
      }
    };

    fetchRfqDetails();
  }, [rfqId, currentSupplierId]);

  const handleUnitPriceChange = (supplierIndex, itemIndex, value) => {
    const updatedResponses = [...responseItems];
    updatedResponses[supplierIndex].items[itemIndex].unitPrice = value;
    setResponseItems(updatedResponses);
  };

  const handleWheel = (e) => {
  e.target.blur(); 
};

  const handleQuantityChange = (supplierIndex, itemIndex, value) => {
    const maxQuantity = rfqData.rfqItems[itemIndex].quantity;
    const newValue = value === '' ? '' : Math.min(Math.max(0, value), maxQuantity);

    const updatedResponses = [...responseItems];
    updatedResponses[supplierIndex].items[itemIndex].quantityAccepted = newValue;
    setResponseItems(updatedResponses);
  };

  const calculateTotal = (unitPrice, quantity) => {
    if (!unitPrice || !quantity) return '-';
    const total = parseFloat(unitPrice) * parseFloat(quantity);
    return Number.isNaN(total) ? '-' : total.toFixed(2);
  };

  const calculateGrandTotal = () => {
    if (supplierIndex === -1 || !responseItems[supplierIndex]) return 0;
    return responseItems[supplierIndex].items.reduce((sum, item) => {
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const quantity = parseFloat(item.quantityAccepted) || 0;
      return sum + unitPrice * quantity;
    }, 0);
  };

  const openNegotiationDialog = (supplierIndex, itemIndex) => {
    setNegotiationDialog({
      isOpen: true,
      supplierIndex,
      itemIndex,
      history: responseItems[supplierIndex]?.items[itemIndex]?.negotiationHistory || [],
    });
  };

  const closeNegotiationDialog = () => {
    setNegotiationDialog({
      isOpen: false,
      supplierIndex: null,
      itemIndex: null,
      history: [],
    });
  };

  const handleSubmitResponse = async () => {
    try {
      const supplierResponse = responseItems.find((r) => r.supplierId === currentSupplierId);

      if (!supplierResponse) {
        toast.error('No response found for current supplier');
        return;
      }
      const hasValidResponse = supplierResponse.items.some(
        (item) => item.unitPrice && item.unitPrice !== '',
      );

      if (!hasValidResponse) {
        toast.error('Please provide unit prices for at least one item');
        return;
      }

      const payload = {
        rfqId,
        supplierId: currentSupplierId,
        supplierStatus: 'negotiation',
        responseItems: supplierResponse.items.map((item) => ({
          rfqItemId: item.rfqItemId,
          quantity: item.quantityAccepted !== '' ? item.quantityAccepted : 0,
          unitPrice: item.unitPrice !== '' ? item.unitPrice : 0,
        })),
      };

      await RqfService.submitSupplierResponse(currentSupplierId, rfqId, payload);
      toast.dismiss();
      toast.success('Response submitted successfully!');
      navigate('/rfq');
    } catch (err) {
      console.error('Error submitting response', err);
      toast.error(err.response?.data?.message || 'Failed to submit response');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      submitted: 'primary',
      created: 'warning',
      cancelled: 'danger',
      completed: 'success',
      supplier_shortlisted: 'info',
    };
    return (
      <Badge color={colors[status.toLowerCase()] || 'dark'} pill>
        {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner color="primary" />
      </div>
    );
  }

  if (!rfqData) {
    return <div>RFQ not found</div>;
  }

  const handleViewPurchaseOrder = () => {
    if (rfqData?.purchaseOrderId) {
      navigate(`/supplier-purchase-order-details/${rfqData.purchaseOrderId}`);
    } else {
      toast.error('Purchase Order not available');
    }
  };

  const supplierIndex = responseItems.findIndex((r) => r.supplierId === currentSupplierId);

  const handleDownload = async (fileId) => {
    try {
      const response = await FileUploadService.getFileByFileId(fileId);
      const contentDisposition = response.headers['content-disposition'];
      let filename = `file_${fileId}`;

      if (contentDisposition) {
        const [, extractedFilename] = contentDisposition.match(/filename="?(.+)"?/) || [];
        if (extractedFilename) {
          filename = extractedFilename;
        }
      }

      const contentType = response.headers['content-type'];
      const [, extension] = contentType?.split('/') || [];
      if (!filename.includes('.') && extension) {
        filename = `${filename}.${extension}`;
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download file');
    }
  };

  return (
    <>
      <div className="rfq-supplier-details-page">
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
            <ComponentCard
              title={
                <div className="d-flex justify-content-between align-items-center w-100">
                  <div className="d-flex align-items-center">
                    <FaClipboardList size={24} className="me-3 text-secondary" />
                    <div>
                      <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }} className="text-muted d-block">
                        Request for Quotation
                      </span>
                      <span style={{ fontSize: '22px', fontWeight: 700 }}>
                        {rfqData.rfqNumber || `RFQ-${rfqData.rfqId}`}
                      </span>
                    </div>
                    {rfqData?.purchaseOrderId && (
                      <Button
                        color="outline-primary"
                        size="sm"
                        className="ms-4"
                        onClick={handleViewPurchaseOrder}
                      >
                        View Purchase Order
                      </Button>
                    )}
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    {rfqData.attachments?.length > 0 && (
                      <Button
                        color="outline-secondary"
                        size="sm"
                        onClick={() => setShowAttachmentsModal(true)}
                      >
                        <FaPaperclip className="me-1" />
                        Attachments ({rfqData.attachments.length})
                      </Button>
                    )}
                    {getStatusBadge(rfqData.rfqStatus)}
                  </div>

                  <AttachmentsModal
                    attachments={rfqData.attachments || []}
                    isOpen={showAttachmentsModal}
                    toggle={() => setShowAttachmentsModal(false)}
                    onDownload={handleDownload}
                  />
                </div>
              }
            >
              <div className="row">
                <div className="col-lg-6">
                  <Card className="mb-3 shadow-sm border-0">
                    <CardHeader className="bg-primary">
                      <CardTitle className="mb-0 d-flex align-items-center text-white">
                        <FaClipboardList className="me-2" />
                        RFQ Information
                      </CardTitle>
                    </CardHeader>
                    <CardBody className="p-0">
                      <ListGroup flush>
                        <ListGroupItem className="py-3">
                          <strong>Title:</strong>
                          <span className="ms-2">{rfqData.title || 'N/A'}</span>
                        </ListGroupItem>
                        <ListGroupItem className="py-3">
                          <strong>Objective:</strong>
                          <p className="mb-0 mt-1 text-muted" style={{ fontSize: '14px' }}>
                            {rfqData.objective || 'N/A'}
                          </p>
                        </ListGroupItem>
                        {rfqData.requirements && (
                          <ListGroupItem className="py-3">
                            <strong>Requirements:</strong>
                            <p className="mb-0 mt-1 text-muted" style={{ fontSize: '14px' }}>
                              {rfqData.requirements}
                            </p>
                          </ListGroupItem>
                        )}
                        <ListGroupItem className="py-3">
                          <div className="d-flex justify-content-between">
                            <div>
                              <FaCalendarAlt className="me-2 text-muted" size={12} />
                              <strong>Created:</strong>
                              <span className="ms-2">{formatDate(rfqData.createdDate)}</span>
                            </div>
                            <div>
                              <FaCalendarAlt className="me-2 text-danger" size={12} />
                              <strong>Required By:</strong>
                              <span className="ms-2 text-danger fw-bold">
                                {formatDate(rfqData.requiredAt)}
                              </span>
                            </div>
                          </div>
                        </ListGroupItem>
                      </ListGroup>
                    </CardBody>
                  </Card>
                </div>
                <div className="col-lg-6">
                  <Card className="mb-3 shadow-sm border-0">
                    <CardHeader className="bg-primary">
                      <CardTitle className="mb-0 d-flex align-items-center text-white">
                        <FaBuilding className="me-2" />
                        Company Information
                      </CardTitle>
                    </CardHeader>
                    <CardBody className="p-0">
                      <ListGroup flush>
                        {companyDetails && companyDetails[0] ? (
                          <>
                            <ListGroupItem className="py-3">
                              <FaBuilding className="me-2 text-muted" size={12} />
                              <strong>Company Name:</strong>
                              <span className="ms-2 fw-bold">
                                {companyDetails[0].name || 'N/A'}
                              </span>
                            </ListGroupItem>
                            <ListGroupItem className="py-3">
                              <FaEnvelope className="me-2 text-muted" size={12} />
                              <strong>Email:</strong>
                              <span className="ms-2">{companyDetails[0].email || 'N/A'}</span>
                            </ListGroupItem>
                            <ListGroupItem className="py-3">
                              <FaPhone className="me-2 text-muted" size={12} />
                              <strong>Phone:</strong>
                              <span className="ms-2">{companyDetails[0].phone || 'N/A'}</span>
                            </ListGroupItem>
                            <ListGroupItem className="py-3">
                              <FaMapMarkerAlt className="me-2 text-muted" size={12} />
                              <strong>Address:</strong>
                              <span className="ms-2">
                                {formatAddress(companyDetails[0].primaryContact?.address)}
                              </span>
                            </ListGroupItem>
                          </>
                        ) : (
                          <ListGroupItem className="py-4 text-center text-muted">
                            Company information not available
                          </ListGroupItem>
                        )}
                      </ListGroup>
                    </CardBody>
                  </Card>
                </div>
              </div>
              <Card className="shadow-sm border-0 mb-3">
                <CardHeader className="bg-primary">
                  <CardTitle className="mb-0 d-flex align-items-center text-white">
                    <FaBoxOpen className="me-2" />
                    Line Items
                    <Badge color="warning" pill className="ms-2">
                      {rfqData.rfqItems?.length || 0}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardBody className="p-0">
              <div className="table-responsive">
                <Table striped bordered className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      <th>Description</th>
                      <th style={{ width: '100px' }}>Qty Required</th>
                      <th style={{ width: '80px' }}>UOM</th>
                      <th style={{ width: '130px' }}>Qty Accepted</th>
                      <th style={{ width: '130px' }}>Unit Price ($)</th>
                      <th style={{ width: '120px' }}>Total ($)</th>
                      <th style={{ width: '100px' }}>History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfqData.rfqItems.map((item, itemIndex) => (
                      <tr key={item.rfqItemId}>
                        <td className="align-middle">{itemIndex + 1}</td>
                        <td className="align-middle">
                          <div>
                            <p className="mb-0">{item.description}</p>
                            {item.notes && <small className="text-muted">{item.notes}</small>}
                          </div>
                        </td>
                        <td className="align-middle">{item.quantity}</td>
                        <td className="align-middle">{item.uom}</td>
                        <td className="align-middle">
                          <Input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={
                              supplierIndex !== -1
                                ? responseItems[supplierIndex]?.items[itemIndex]
                                    ?.quantityAccepted ?? ''
                                : ''
                            }
                            onChange={(e) => {
                              const value =
                                e.target.value === '' ? '' : parseInt(e.target.value, 10);
                              handleQuantityChange(
                                supplierIndex,
                                itemIndex,
                                Number.isNaN(value) ? '' : value,
                              );
                            }}
                            onWheel={handleWheel} 
                            className="form-control form-control-sm"
                            disabled={!isAnySignoffRequested}
                            style={{ width: '100px' }}
                          />
                        </td>
                        <td className="align-middle">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={
                              supplierIndex !== -1
                                ? responseItems[supplierIndex]?.items[itemIndex]?.unitPrice || ''
                                : ''
                            }
                            onChange={(e) =>
                              handleUnitPriceChange(supplierIndex, itemIndex, e.target.value)
                            }
                            onWheel={handleWheel}
                            className="form-control form-control-sm"
                            disabled={!isAnySignoffRequested}
                            style={{ width: '100px' }}
                          />
                        </td>
                        <td className="align-middle">
                          {supplierIndex !== -1 &&
                            calculateTotal(
                              responseItems[supplierIndex]?.items[itemIndex]?.unitPrice || '',
                              responseItems[supplierIndex]?.items[itemIndex]?.quantityAccepted ||
                                '',
                            )}
                        </td>
                        <td className="align-middle text-center">
                          <Button
                            color="outline-secondary"
                            size="sm"
                            onClick={() => openNegotiationDialog(supplierIndex, itemIndex)}
                            title="View negotiation history"
                          >
                            <FaHistory size={12} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-light">
                    <tr>
                      <td colSpan="6" className="text-end fw-bold py-3">
                        Grand Total:
                      </td>
                      <td className="fw-bold text-success py-3" style={{ fontSize: '16px' }}>
                        ${calculateGrandTotal().toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </Table>
              </div>
                </CardBody>
              </Card>

              <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                <Button
                  color="outline-secondary"
                  onClick={() => {
                    if (fromPO) {
                      navigate(`/supplier-purchase-order-details/${fromPO}`);
                    } else {
                      navigate('/rfq');
                    }
                  }}
                >
                  Back to RFQs
                </Button>

                <div className="d-flex align-items-center gap-3">
                  {calculateGrandTotal() > 0 && (
                    <div className="text-end me-3">
                      <small className="text-muted d-block">Your Quote Total</small>
                      <span className="fw-bold text-success" style={{ fontSize: '18px' }}>
                        ${calculateGrandTotal().toFixed(2)}
                      </span>
                    </div>
                  )}
                  <Button
                    color="primary"
                    size="lg"
                    onClick={handleSubmitResponse}
                    disabled={!isAnySignoffRequested}
                  >
                    Submit Response
                  </Button>
                </div>
              </div>
            </ComponentCard>
          </Col>
        </Row>
        <Modal
          isOpen={negotiationDialog.isOpen}
          toggle={closeNegotiationDialog}
          // size="lg"
        >
          <ModalHeader toggle={closeNegotiationDialog}>
            Negotiation History - Item {negotiationDialog.itemIndex + 1}:{' '}
            {negotiationDialog.isOpen && rfqData.rfqItems[negotiationDialog.itemIndex]?.description}
          </ModalHeader>
          <ModalBody style={{ maxHeight: '250px', overflow: 'auto' }}>
            {negotiationDialog.history.length > 0 ? (
              <ul className="list-unstyled">
                {negotiationDialog.history.map((entry) => (
                  <li key={entry.dateTime} className="mb-3 pb-2 border-bottom">
                    <div className="d-flex justify-content-between">
                      <span>
                        <strong>Price:</strong> ${entry.price.toFixed(2)}
                      </span>
                      <span>
                        {entry.createdBy?.firstName} {entry.createdBy?.lastName}
                      </span>
                    </div>
                    <div className="d-flex justify-content-end">
                      <small className="text-muted">
                        {new Date(entry.dateTime).toLocaleString()}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-4">No negotiation history available</div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={closeNegotiationDialog}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      </div>

      <style>{`
              .rfq-supplier-details-page {
                margin-top: 2rem;
                padding-top: 1rem;
                background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
                min-height: calc(100vh - 120px);
              }
            `}</style>
    </>
  );
};

export default RFQSupplierDetail;
