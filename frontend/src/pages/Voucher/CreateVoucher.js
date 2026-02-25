import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Row, Col, Button, FormGroup, Label, Input, Badge } from 'reactstrap';
import { Formik, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { formatCurrencies, getEntityId } from '../localStorageUtil';
import { getBadgeColor, getStatusLabel } from '../../constant/VoucherConstant';
import VoucherService from '../../services/VoucherService';
import PurchaseOrderService from '../../services/PurchaseOrderService';
import FileUploadService from '../../services/FileUploadService';
// import SupplierService from '../../services/SupplierService';
import '../CompanyManagement/ReactBootstrapTable.scss';

const VoucherCreate = () => {
  const companyId = getEntityId();
  const navigate = useNavigate();
  const location = useLocation();
  const debounceTimerRef = useRef(null);

  // State management
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [grnDetails, setGrnDetails] = useState(null);
  const [poDetails, setPoDetails] = useState(null);
  const [checkingPo, setCheckingPo] = useState(false);
  const [uploadedFileId, setUploadedFileId] = useState(null);
  // const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [selectedVouchers, setSelectedVouchers] = useState([]);
  // const [suppliers, setSuppliers] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(true);
  const [collapsedProcessedGrns, setCollapsedProcessedGrns] = useState([]);
  const formRef = useRef();

  // // Fetch suppliers on component mount
  // useEffect(() => {
  //     const fetchSuppliers = async () => {
  //         try {
  //             const supplierResponse = await SupplierService.getAllSupplier();
  //             setSuppliers(supplierResponse.data);
  //         } catch (error) {
  //             console.error('Error fetching suppliers:', error);
  //         }
  //     };

  //     fetchSuppliers();
  // }, []);

  // Handle file upload
  const handleFileChange = async (event) => {
    if (selectedFile) {
      URL.revokeObjectURL(selectedFile);
    }
    if (previewFile?.url) {
      URL.revokeObjectURL(previewFile.url);
    }

    const file = event.target.files[0];
    if (!file) {
      setSelectedFile(null);
      setPreviewFile(null);
      return;
    }

    setSelectedFile(file);
    setIsUploading(true);

    try {
      const response = await FileUploadService.uploadFile(companyId, file);
      const { fileId } = response.data;
      setUploadedFileId(fileId);

      const fileBlob = new Blob([file], { type: file.type });
      const fileUrl = URL.createObjectURL(fileBlob);
      setPreviewFile({
        url: fileUrl,
        name: file.name,
        type: file.type,
      });

      setShowUploadSection(false);
      toast.dismiss();
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error.response?.data?.errorMessage || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file removal
  const handleRemoveFile = () => {
    if (previewFile?.url) {
      URL.revokeObjectURL(previewFile.url);
    }
    setSelectedFile(null);
    setPreviewFile(null);
    setUploadedFileId(null);
    setShowUploadSection(true);
  };

  // Check PO ID and fetch GRN details
  const checkPoId = async (purchaseOrderNo) => {
    if (!purchaseOrderNo) {
      setGrnDetails(null);
      return null;
    }

    setCheckingPo(true);
    try {
      const poResponse = await PurchaseOrderService.getPurchaseOrdersPaginated(companyId, {
        pageSize: 100,
        pageNumber: 0,
        orderNo: purchaseOrderNo,
      });

      const responseData =
        poResponse.data && poResponse.data.content
          ? poResponse.data.content
          : poResponse.data || [];
      if (responseData?.length > 0) {
        const poData = responseData[0];
        setPoDetails(poData);
        const pOrderId = poData.PurchaseOrderId;
        const grnResponse = await VoucherService.getGrnByPoOrderNumberPaginated(
          companyId,
          pOrderId,
          10,
          0,
        );
        // Handle both paginated response structure and legacy structure
        const grnData = grnResponse.data?.content
          ? grnResponse.data.content
          : grnResponse.data || [];
        setGrnDetails(grnData);
        return poData;
      }
      setGrnDetails(null);
      return null;
    } catch (error) {
      console.error('Error fetching Purchase Order:', error);
      setGrnDetails(null);
      return null;
    } finally {
      setCheckingPo(false);
    }
  };

  // Auto-trigger API call if PO number is pre-filled
  useEffect(() => {
    const preFillPoNumber = location.state?.purchaseOrderNo;
    if (preFillPoNumber) {
      checkPoId(preFillPoNumber);
    }
  }, [location.state?.purchaseOrderNo]);

  // Handle GRN selection
  const handleGrnSelection = (grn, isChecked) => {
    setSelectedVouchers((prev) =>
      isChecked ? [...prev, grn] : prev.filter((item) => item.grnId !== grn.grnId),
    );
  };

  // Update the handleQtyInvChange function
  const handleQtyInvChange = (grnId, detailIndex, value) => {
    setGrnDetails((prev) =>
      prev.map((grn) => {
        if (grn.grnId === grnId) {
          const updatedDetails = [...grn.grnDetails];
          const qtyReceived = parseFloat(updatedDetails[detailIndex].qtyReceived) || 0;
          let qtyInv = parseFloat(value) || 0;

          if (qtyInv > qtyReceived) {
            qtyInv = qtyReceived;
            toast.dismiss();
            toast.warning(`Quantity invoiced cannot exceed quantity received (${qtyReceived})`);
          } else if (qtyInv < 0) {
            qtyInv = 0;
          }
          const unitPrice = parseFloat(
            updatedDetails[detailIndex].price || updatedDetails[detailIndex].unitPrice || 0,
          );

          // Calculate extended price
          const extendedPrice = qtyInv * unitPrice;

          updatedDetails[detailIndex] = {
            ...updatedDetails[detailIndex],
            qtyInvoiced: qtyInv,
            qtyRemaining: qtyReceived - qtyInv,
            extendedPrice,
          };

          return { ...grn, grnDetails: updatedDetails };
        }
        return grn;
      }),
    );
  };

  const getInitialValues = () => ({
    purchaseOrderNo: location.state?.purchaseOrderNo || '',
    purchaseOrderId: location.state?.purchaseOrderId || '',
    invoiceNo: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    notes: '',
    tax: 0,
    freight: 0,
  });

  const validationSchema = Yup.object().shape({
    purchaseOrderNo: Yup.string()
      .required('Purchase Order Number is required')
      .test('po-exists', 'No PO found with this order number', () => poDetails !== null),
    invoiceNo: Yup.string().required('Invoice Number is required'),
    invoiceDate: Yup.string()
      .required('Invoice Date is required')
      .test(
        'is-valid-date',
        'Invalid date format',
        (value) => !Number.isNaN(new Date(value).getTime()),
      )
      .test(
        'not-future',
        'Invoice date cannot be in the future',
        (value) => new Date(value) <= new Date(),
      ),
    notes: Yup.string(),
    tax: Yup.number().min(0, 'Tax cannot be negative').nullable(),
    freight: Yup.number().min(0, 'Shipping cannot be negative').nullable(),
  });

  const handleCreateVoucher = async (values, { setSubmitting }) => {
    try {
      if (!uploadedFileId) {
        toast.dismiss();
        toast.error('Please upload a voucher document');
        setSubmitting(false);
        return;
      }
      if (selectedVouchers.length === 0) {
        toast.dismiss();
        toast.error('Please select at least one GRN');
        setSubmitting(false);
        return;
      }

      const voucherDetailData = {
        ...values,
        invoiceDate: new Date(values.invoiceDate).toISOString(),
        voucherDetails: selectedVouchers.map((grn) => ({
          grn: {
            grnId: grn.grnId,
            PurchaseOrderId: grn.PurchaseOrderId || 0,
            receivedBy: grn.receivedBy || 0,
            verifiedBy: grn.verifiedBy || 0,
            verifiedDate: new Date().toISOString(),
            receivedDateTime: new Date().toISOString(),
            supplierId: grn.supplierId || 0,
            isActive: true,
            grnDetails: (grn.grnDetails || []).map((detail) => ({
              poDetailId: detail.poDetailId || 0,
            })),
          },
        })),
        fileId: uploadedFileId,
        companyId,
      };

      await VoucherService.handleCreateVoucher(companyId, voucherDetailData);
      toast.dismiss();
      toast.success('Voucher created successfully');
      navigate('/voucher');
    } catch (error) {
      console.error('Error creating voucher:', error);
      toast.error(error.response?.data?.errorMessage || 'Failed to create voucher');
    } finally {
      setSubmitting(false);
    }
  };

  // Render file preview
  const renderFilePreview = (file) => {
    if (!file) return null;

    const isPDF = file.type?.includes('pdf');
    const isImage = file.type?.includes('image');

    return (
      <div className="d-flex flex-column align-items-center">
        <div className="d-flex justify-content-between align-items-center w-100 mb-3">
          <h5 className="m-0">File Preview</h5>
          <Button
            onClick={handleRemoveFile}
            className="btn btn-danger"
            size="sm"
            style={{
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
              border: 'none',
              boxShadow: '0 4px 15px rgba(220, 53, 69, 0.3)',
            }}
          >
            Remove File
          </Button>
        </div>

        {isPDF ? (
          <div style={{ height: '500px', width: '100%' }}>
            <iframe
              src={file.url}
              title="PDF Preview"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        ) : isImage ? (
          <div style={{ height: '500px', width: '100%' }}>
            <TransformWrapper initialScale={1} minScale={0.5} maxScale={3}>
              <TransformComponent>
                <img
                  src={file.url}
                  alt="Preview"
                  style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
                />
              </TransformComponent>
            </TransformWrapper>
          </div>
        ) : (
          <div className="text-center p-4">
            <div style={{ fontSize: '48px' }}>📄</div>
            <p>Preview not available</p>
            <small className="text-muted">{file.name}</small>
          </div>
        )}
      </div>
    );
  };

  const toggleCollapseGrn = (grnId) => {
    setCollapsedProcessedGrns((prev) =>
      prev.includes(grnId) ? prev.filter((id) => id !== grnId) : [...prev, grnId],
    );
  };

  const isGrnCollapsed = (grnId) => collapsedProcessedGrns.includes(grnId);

  return (
    <div style={{ paddingTop: '24px' }}>
      <ToastContainer position="top-right" autoClose={3000} />

      <Row>
        <Col md="12">
          <div className="card h-100 shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
            <div className="card-body" style={{ padding: '24px' }}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="icon-wrapper"
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: '#009efb',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i className="fas fa-plus text-white" style={{ fontSize: '20px' }}></i>
                  </div>
                  <div>
                    <h4 className="mb-0" style={{ color: '#212529', fontWeight: '600' }}>
                      Create New Voucher
                    </h4>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <Button
                    className="btn btn-gradient-primary"
                    onClick={() => navigate('/voucher')}
                    style={{
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                      border: 'none',
                      color: 'white',
                      boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                    }}
                  >
                    <i className="fas fa-arrow-left me-2"></i>Back to List
                  </Button>
                </div>
              </div>
              <Row>
                {/* File Upload/Preview Section */}
                <Col md="6">
                  {showUploadSection ? (
                    <div
                      style={{
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        padding: '16px',
                        border: '1px solid #e9ecef',
                        marginBottom: '16px',
                      }}
                    >
                      <h6
                        className="mb-3"
                        style={{ color: '#009efb', fontWeight: '600', fontSize: '14px' }}
                      >
                        <i className="fas fa-cloud-upload-alt me-2"></i>Upload Invoice
                      </h6>
                      <div
                        className={`dropzone ${dragActive ? 'drag-active' : ''}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragActive(true);
                        }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragActive(false);
                          if (e.dataTransfer.files[0]) {
                            handleFileChange({ target: { files: [e.dataTransfer.files[0]] } });
                          }
                        }}
                        onClick={() => document.getElementById('file-upload-input').click()}
                        style={{
                          border: '2px dashed #ccc',
                          borderRadius: '5px',
                          padding: '2rem',
                          textAlign: 'center',
                          backgroundColor: dragActive ? '#f8f9fa' : 'white',
                          cursor: 'pointer',
                        }}
                      >
                        <Input
                          id="file-upload-input"
                          type="file"
                          onChange={handleFileChange}
                          accept=".pdf,.jpg,.jpeg,.png"
                          disabled={isUploading}
                          style={{ display: 'none' }}
                        />
                        <div className="d-flex flex-column align-items-center">
                          {isUploading ? (
                            <div className="spinner-border text-primary" role="status">
                              <span className="sr-only">Loading...</span>
                            </div>
                          ) : (
                            <>
                              <i className="fas fa-cloud-upload-alt fa-3x mb-3 text-muted"></i>
                              <h5>Drag & Drop your file here</h5>
                              <p className="text-muted">or click to browse files</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        padding: '16px',
                        border: '1px solid #e9ecef',
                      }}
                    >
                      {renderFilePreview(previewFile)}
                    </div>
                  )}
                </Col>

                {/* Form Section */}
                <Col md="6">
                  <Formik
                    innerRef={formRef}
                    initialValues={getInitialValues()}
                    validationSchema={validationSchema}
                    onSubmit={handleCreateVoucher}
                  >
                    {({
                      values,
                      errors,
                      touched,
                      handleChange,
                      handleBlur,
                      setFieldValue,
                      isSubmitting,
                    }) => (
                      <Form>
                        {/* Order Information - Full Width at Top */}
                        {poDetails && (
                          <Row className="mb-3">
                            <Col md="12">
                              <div
                                className="card"
                                style={{ border: '1px solid #e3e6f0', borderRadius: '8px' }}
                              >
                                <div
                                  className="card-header"
                                  style={{
                                    backgroundColor: '#f8f9fc',
                                    borderBottom: '1px solid #e3e6f0',
                                    padding: '8px 16px',
                                  }}
                                >
                                  <h6
                                    className="mb-0"
                                    style={{
                                      color: '#5a5c69',
                                      fontWeight: '600',
                                      fontSize: '0.9rem',
                                    }}
                                  >
                                    Order Information
                                  </h6>
                                </div>
                                <div className="card-body" style={{ padding: '12px 16px' }}>
                                  <Row>
                                    <Col md="4">
                                      <div className="info-item">
                                        <strong style={{ color: '#009efb', fontSize: '0.8rem' }}>
                                          Buyer:
                                        </strong>
                                        <div style={{ color: '#212529', fontSize: '0.85rem' }}>
                                          {poDetails.buyerUser
                                            ? `${poDetails.buyerUser.firstName} ${poDetails.buyerUser.lastName}`
                                            : 'N/A'}
                                        </div>
                                      </div>
                                    </Col>
                                    <Col md="4">
                                      <div className="info-item">
                                        <strong style={{ color: '#009efb', fontSize: '0.8rem' }}>
                                          Supplier:
                                        </strong>
                                        <div style={{ color: '#212529', fontSize: '0.85rem' }}>
                                          {poDetails.supplier?.name || 'N/A'}
                                        </div>
                                      </div>
                                    </Col>
                                    <Col md="4">
                                      <div className="info-item">
                                        <strong style={{ color: '#009efb', fontSize: '0.8rem' }}>
                                          Order Amount:
                                        </strong>
                                        <div style={{ color: '#212529', fontSize: '0.85rem' }}>
                                          {formatCurrencies(poDetails.orderAmount || 0)}
                                        </div>
                                      </div>
                                    </Col>
                                    <Col md="12" className="mt-2">
                                      <div className="info-item">
                                        <strong style={{ color: '#009efb', fontSize: '0.8rem' }}>
                                          Shipping Address:
                                        </strong>
                                        <div
                                          style={{
                                            color: '#212529',
                                            fontSize: '0.85rem',
                                            lineHeight: '1.3',
                                          }}
                                        >
                                          {poDetails.shippingToAddress
                                            ? [
                                                poDetails.shippingToAddress.addressLine1,
                                                poDetails.shippingToAddress.addressLine2,
                                                poDetails.shippingToAddress.city,
                                                poDetails.shippingToAddress.state,
                                                poDetails.shippingToAddress.country,
                                                poDetails.shippingToAddress.postalCode,
                                              ]
                                                .filter(Boolean)
                                                .join(', ')
                                            : 'N/A'}
                                        </div>
                                      </div>
                                    </Col>
                                  </Row>
                                </div>
                              </div>
                            </Col>
                          </Row>
                        )}

                        {/* Form Fields Row */}
                        <Row>
                          <Col md="4">
                            <FormGroup>
                              <Label>
                                Purchase Order No<span className="text-danger">*</span>
                              </Label>
                              <Input
                                type="text"
                                name="purchaseOrderNo"
                                value={values.purchaseOrderNo}
                                onChange={async (e) => {
                                  const newValue = e.target.value;
                                  setFieldValue('purchaseOrderNo', newValue);
                                  formRef.current.setFieldTouched('purchaseOrderNo', true);

                                  if (debounceTimerRef.current) {
                                    clearTimeout(debounceTimerRef.current);
                                  }

                                  debounceTimerRef.current = setTimeout(async () => {
                                    if (!newValue.trim()) {
                                      setPoDetails(null);
                                      setGrnDetails(null);
                                      return;
                                    }

                                    setCheckingPo(true);
                                    try {
                                      const poData = await checkPoId(newValue);
                                      setPoDetails(poData);
                                      if (poData) {
                                        setFieldValue('purchaseOrderId', poData.PurchaseOrderId);
                                        formRef.current.setFieldError('purchaseOrderNo', undefined);
                                      } else {
                                        formRef.current.setFieldError(
                                          'purchaseOrderNo',
                                          'No PO found with this order number',
                                        );
                                      }
                                    } catch (error) {
                                      setPoDetails(null);
                                      formRef.current.setFieldError(
                                        'purchaseOrderNo',
                                        'Error searching for PO',
                                      );
                                    } finally {
                                      setCheckingPo(false);
                                    }
                                  }, 500);
                                }}
                                onBlur={handleBlur}
                                invalid={touched.purchaseOrderNo && !!errors.purchaseOrderNo}
                                disabled={isSubmitting}
                              />
                              <ErrorMessage
                                name="purchaseOrderNo"
                                component="div"
                                className="invalid-feedback"
                              />
                              {checkingPo && (
                                <small className="text-muted">
                                  <i className="fas fa-spinner fa-spin mr-1"></i> Searching...
                                </small>
                              )}
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <FormGroup>
                              <Label>
                                Invoice Number<span className="text-danger">*</span>
                              </Label>
                              <Input
                                type="text"
                                name="invoiceNo"
                                value={values.invoiceNo}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                invalid={touched.invoiceNo && !!errors.invoiceNo}
                                disabled={isSubmitting}
                              />
                              <ErrorMessage
                                name="invoiceNo"
                                component="div"
                                className="invalid-feedback"
                              />
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <FormGroup>
                              <Label>
                                Invoice Date<span className="text-danger">*</span>
                              </Label>
                              <Input
                                type="date"
                                name="invoiceDate"
                                value={
                                  values.invoiceDate
                                    ? new Date(values.invoiceDate).toISOString().split('T')[0]
                                    : ''
                                }
                                onChange={(e) => {
                                  const date = e.target.value
                                    ? new Date(e.target.value).toISOString()
                                    : '';
                                  setFieldValue('invoiceDate', date);
                                }}
                                onBlur={handleBlur}
                                max={new Date().toISOString().split('T')[0]}
                                invalid={touched.invoiceDate && !!errors.invoiceDate}
                                disabled={isSubmitting}
                              />
                              <ErrorMessage
                                name="invoiceDate"
                                component="div"
                                className="invalid-feedback"
                              />
                            </FormGroup>
                          </Col>
                        </Row>

                        {/* Notes Row */}
                        <Row>
                          <Col md="12">
                            <FormGroup>
                              <Label>Notes</Label>
                              <Input
                                type="textarea"
                                name="notes"
                                value={values.notes}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                rows="3"
                                disabled={isSubmitting}
                              />
                            </FormGroup>
                          </Col>
                        </Row>

                        {/* GRN Selection */}
                        {Array.isArray(grnDetails) && grnDetails.length > 0 && (
                          <div className="mt-2">
                            {grnDetails
                              .sort((a, b) => {
                                // Sort by status: created first, processed last
                                if (a.status === 'created' && b.status !== 'created') return -1;
                                if (a.status !== 'created' && b.status === 'created') return 1;
                                if (a.status !== 'created' && b.status !== 'created') {
                                  // Both are processed/other statuses, sort by grnNo ascending
                                  const aGrnNo = parseInt(a.grnNo, 10) || 0;
                                  const bGrnNo = parseInt(b.grnNo, 10) || 0;
                                  return aGrnNo - bGrnNo;
                                }
                                // Both are created, sort by grnNo ascending
                                const aGrnNo = parseInt(a.grnNo, 10) || 0;
                                const bGrnNo = parseInt(b.grnNo, 10) || 0;
                                return aGrnNo - bGrnNo;
                              })
                              .map((grn) => (
                                <div key={grn.grnId} className="mb-2 border rounded">
                                  <div className="d-flex justify-content-between align-items-center p-2">
                                    <div
                                      className="d-flex align-items-center"
                                      style={{ gap: '10px' }}
                                    >
                                      {grn.status === 'created' ? (
                                        <Input
                                          type="checkbox"
                                          id={`select-grn-${grn.grnId}`}
                                          checked={selectedVouchers.some(
                                            (v) => v.grnId === grn.grnId,
                                          )}
                                          onChange={(e) =>
                                            handleGrnSelection(grn, e.target.checked)
                                          }
                                          disabled={isSubmitting}
                                        />
                                      ) : (
                                        <Button
                                          color="link"
                                          size="sm"
                                          onClick={() => toggleCollapseGrn(grn.grnId)}
                                          className="p-0"
                                        >
                                          <i
                                            className={`fas fa-chevron-${
                                              isGrnCollapsed(grn.grnId) ? 'right' : 'down'
                                            }`}
                                          />
                                        </Button>
                                      )}
                                      <strong>{grn.grnNo || 'N/A'}</strong>
                                    </div>
                                    <Badge color={getBadgeColor(grn.status)}>
                                      {getStatusLabel(grn.status)}
                                    </Badge>
                                  </div>

                                  {!isGrnCollapsed(grn.grnId) && (
                                    <div className="table-responsive">
                                      <table
                                        className="table table-sm mb-0"
                                        style={{ fontSize: '0.85rem' }}
                                      >
                                        <thead style={{ backgroundColor: '#009efb' }}>
                                          <tr>
                                            <th
                                              style={{
                                                padding: '8px',
                                                fontWeight: '600',
                                                color: 'white',
                                              }}
                                            >
                                              Item Description
                                            </th>
                                            <th
                                              className="text-center"
                                              style={{
                                                padding: '8px',
                                                fontWeight: '600',
                                                color: 'white',
                                              }}
                                            >
                                              Qty Rcd
                                            </th>
                                            <th
                                              className="text-center"
                                              style={{
                                                padding: '8px',
                                                fontWeight: '600',
                                                color: 'white',
                                              }}
                                            >
                                              Qty Inv
                                            </th>
                                            <th
                                              className="text-center"
                                              style={{
                                                padding: '8px',
                                                fontWeight: '600',
                                                color: 'white',
                                              }}
                                            >
                                              U/M
                                            </th>
                                            <th
                                              className="text-right"
                                              style={{
                                                padding: '8px',
                                                fontWeight: '600',
                                                color: 'white',
                                              }}
                                            >
                                              Price
                                            </th>
                                            <th
                                              className="text-right"
                                              style={{
                                                padding: '8px',
                                                fontWeight: '600',
                                                color: 'white',
                                              }}
                                            >
                                              Extended
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {grn.grnDetails?.map((detail, index) => (
                                            <tr key={`${grn.grnId}-${detail.poDetailId || index}`}>
                                              <td>
                                                {detail.itemDescription ||
                                                  detail.partDescription ||
                                                  'N/A'}
                                                {detail.partId && (
                                                  <div className="text-muted small">
                                                    {detail.partId}
                                                  </div>
                                                )}
                                              </td>
                                              <td className="text-center">
                                                {detail.qtyReceived?.toFixed(2) || '0.00'}
                                              </td>
                                              <td className="text-center">
                                                <Input
                                                  type="number"
                                                  min={detail.qtyReceived}
                                                  max={detail.qtyReceived}
                                                  value={detail.qtyReceived?.toFixed(2) || '0.00'}
                                                  onChange={(e) =>
                                                    handleQtyInvChange(
                                                      grn.grnId,
                                                      index,
                                                      e.target.value,
                                                    )
                                                  }
                                                  style={{ width: '60px', textAlign: 'center' }}
                                                  disabled
                                                />
                                              </td>
                                              <td className="text-center">
                                                {detail.unitOfMeasure ||
                                                  detail.unitOfMeasurement ||
                                                  'EA'}
                                              </td>
                                              <td className="text-right">
                                                {formatCurrencies(
                                                  detail.price ?? detail.unitPrice ?? 0,
                                                )}
                                              </td>

                                              <td className="text-right">
                                                {formatCurrencies(
                                                  detail.extendedPrice !== undefined &&
                                                    !Number.isNaN(detail.extendedPrice)
                                                    ? detail.extendedPrice
                                                    : parseFloat(detail.qtyReceived || 0) *
                                                        parseFloat(
                                                          detail.price ?? detail.unitPrice ?? 0,
                                                        ),
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        )}

                        {Array.isArray(grnDetails) && grnDetails.length > 0 && (
                          <table
                            className="table table-sm mb-2"
                            style={{ width: 'auto', marginLeft: 'auto' }}
                          >
                            <tbody>
                              <tr>
                                <td
                                  style={{
                                    border: 'none',
                                    padding: '2px 8px',
                                    fontSize: '0.85rem',
                                    color: '#6c757d',
                                    textAlign: 'right',
                                  }}
                                >
                                  Sub Total:
                                </td>
                                <td
                                  style={{
                                    border: 'none',
                                    padding: '2px 8px',
                                    fontSize: '0.85rem',
                                    color: '#212529',
                                    fontWeight: 'bold',
                                    textAlign: 'right',
                                  }}
                                >
                                  {formatCurrencies(
                                    selectedVouchers.reduce((total, grn) => {
                                      const grnTotal =
                                        grn.grnDetails?.reduce((sum, detail) => {
                                          return (
                                            sum +
                                            (detail.extendedPrice ??
                                              parseFloat(detail.qtyReceived || 0) *
                                                parseFloat(detail.price ?? detail.unitPrice ?? 0))
                                          );
                                        }, 0) || 0;
                                      return total + grnTotal;
                                    }, 0),
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    border: 'none',
                                    padding: '2px 8px',
                                    fontSize: '0.85rem',
                                    color: '#6c757d',
                                    textAlign: 'right',
                                  }}
                                >
                                  Tax Total:
                                </td>
                                <td
                                  style={{ border: 'none', padding: '2px 8px', textAlign: 'right' }}
                                >
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="form-control form-control-sm text-end"
                                    style={{ width: '120px', fontSize: '0.85rem' }}
                                    value={values.tax || ''}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      setFieldValue('tax', value);
                                    }}
                                    onBlur={handleBlur}
                                    name="tax"
                                  />
                                </td>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    border: 'none',
                                    padding: '2px 8px',
                                    fontSize: '0.85rem',
                                    color: '#6c757d',
                                    textAlign: 'right',
                                  }}
                                >
                                  Shipping Total:
                                </td>
                                <td
                                  style={{ border: 'none', padding: '2px 8px', textAlign: 'right' }}
                                >
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="form-control form-control-sm text-end"
                                    style={{ width: '120px', fontSize: '0.85rem' }}
                                    value={values.freight || ''}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      setFieldValue('freight', value);
                                    }}
                                    onBlur={handleBlur}
                                    name="freight"
                                  />
                                </td>
                              </tr>
                              <tr style={{ borderTop: '1px solid #dee2e6' }}>
                                <td
                                  style={{
                                    border: 'none',
                                    padding: '6px 8px 2px 8px',
                                    fontSize: '0.9rem',
                                    color: '#212529',
                                    fontWeight: 'bold',
                                    textAlign: 'right',
                                  }}
                                >
                                  Invoice Total:
                                </td>
                                <td
                                  style={{
                                    border: 'none',
                                    padding: '6px 8px 2px 8px',
                                    fontSize: '1rem',
                                    color: '#009efb',
                                    fontWeight: 'bold',
                                    textAlign: 'right',
                                  }}
                                >
                                  {formatCurrencies(
                                    selectedVouchers.reduce((total, grn) => {
                                      const grnTotal =
                                        grn.grnDetails?.reduce((sum, detail) => {
                                          return (
                                            sum +
                                            (detail.extendedPrice ??
                                              parseFloat(detail.qtyReceived || 0) *
                                                parseFloat(detail.price ?? detail.unitPrice ?? 0))
                                          );
                                        }, 0) || 0;
                                      return total + grnTotal;
                                    }, 0) +
                                      parseFloat(values.tax || 0) +
                                      parseFloat(values.freight || 0),
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        )}

                        <div className="d-flex justify-content-end mt-4 gap-2">
                          <Button
                            className="btn btn-secondary"
                            onClick={() => navigate('/voucher')}
                            disabled={isSubmitting}
                            style={{
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)',
                              border: 'none',
                              color: 'white',
                              boxShadow: '0 4px 15px rgba(108, 117, 125, 0.3)',
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="btn btn-gradient-primary"
                            disabled={
                              isSubmitting || !uploadedFileId || selectedVouchers.length === 0
                            }
                            style={{
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                              border: 'none',
                              color: 'white',
                              boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                            }}
                          >
                            {isSubmitting ? 'Creating...' : 'Create Voucher'}
                          </Button>
                        </div>
                      </Form>
                    )}
                  </Formik>
                </Col>
              </Row>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default VoucherCreate;
