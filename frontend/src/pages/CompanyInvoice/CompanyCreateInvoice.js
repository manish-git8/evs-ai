import React, { useEffect, useState, useRef } from 'react';
import { Row, Col, FormGroup, Label, Input, Button } from 'reactstrap';
import { Formik, ErrorMessage, Form } from 'formik';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import Swal from 'sweetalert2';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import PurchaseOrderService from '../../services/PurchaseOrderService';
import FileUploadService from '../../services/FileUploadService';
import InvoiceService from '../../services/InvoiceService';
import PaymentTermService from '../../services/PaymentTermService';
import { getEntityId } from '../localStorageUtil';

const CompanyCreateInvoice = () => {
  const companyId = getEntityId();
  const navigate = useNavigate();
  const [billingAddressId, setBillingAddressId] = useState('');
  const [shippingAddressId, setShippingAddressId] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const formikRef = useRef(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(true);
  const [poData, setPoData] = useState(null);

  // Supplier ID is now derived from PO data
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  // State for PO lookup
  const [orderNumberInput, setOrderNumberInput] = useState('');
  const [isSearchingPO, setIsSearchingPO] = useState(false);
  const [poSearchError, setPoSearchError] = useState('');
  const [selectedPOId, setSelectedPOId] = useState('');

  // State for payment terms dropdown
  const [paymentTermsList, setPaymentTermsList] = useState([]);

  const formatAddress = (address) => {
    if (!address) return '';
    const { addressLine1, addressLine2, city, state, postalCode, country } = address;
    return [addressLine1, addressLine2, city, state, postalCode, country]
      .filter(Boolean)
      .join(', ');
  };

  const [initialValues, setInitialValues] = useState({
    title: '',
    invoiceNo: '',
    companyId: '',
    supplierId: '',
    purchaseOrderId: '',
    departmentId: '',
    dateOfIssue: '',
    shippingAddress: '',
    billingAddress: '',
    supplierAddress: '',
    locationId: '',
    projectId: '',
    notes: '',
    paymentTerms: '',
    paymentTermsId: '',
    paymentDueDate: '',
    remitTo: ' ',
    gstNumber: '',
    taxInfo: '',
    tinNumber: '',
    authorizedSignatory: '',
    warrantyInDays: '',
    guaranteeInDays: '',
    subtitle: '',
    taxes: '',
    discount: '',
    termsAndConditions: '',
    items: [],
    documentId: '',
  });

  const invoiceValidationSchema = Yup.object({
    invoiceNo: Yup.string().required('Invoice No is required'),
    dateOfIssue: Yup.string().required('Invoice Date is required'),
    paymentTermsId: Yup.string().required('Payment Terms is required'),
    paymentDueDate: Yup.string().required('Payment Due Date is required'),
    items: Yup.array()
      .of(
        Yup.object().shape({
          qty: Yup.number()
            .nullable()
            .transform((value, originalValue) => (originalValue === '' ? null : value))
            .when(['availableQuantity'], {
              is: (availableQuantity) => availableQuantity > 0,
              then: (schema) =>
                schema
                  .min(0, 'Quantity cannot be negative')
                  .max(Yup.ref('availableQuantity'), 'Quantity exceeds available quantity'),
              otherwise: (schema) => schema,
            }),
        }),
      )
      .test(
        'at-least-one-with-qty',
        'At least one item with quantity must be provided',
        (items) => {
          return items && items.some((item) => item.qty > 0 && item.availableQuantity > 0);
        },
      ),
    documentId: Yup.string().required('Invoice annexure file is required'),
  });

  // Fetch payment terms on component mount
  useEffect(() => {
    const fetchPaymentTerms = async () => {
      try {
        const response = await PaymentTermService.getAllPaymentTerms();
        if (response.data && Array.isArray(response.data)) {
          setPaymentTermsList(response.data);
        }
      } catch (error) {
        console.error('Error fetching payment terms:', error);
      }
    };
    fetchPaymentTerms();
  }, []);

  // Function to search PO by order number
  const handleSearchPO = async () => {
    if (!orderNumberInput.trim()) {
      setPoSearchError('Please enter an order number');
      return;
    }

    setIsSearchingPO(true);
    setPoSearchError('');

    try {
      // Search for PO by order number from company perspective
      const response = await PurchaseOrderService.getPoByOrderNumber(
        companyId,
        orderNumberInput.trim(),
      );
      const pos = response.data?.content || response.data || [];

      if (pos.length === 0) {
        setPoSearchError('No purchase order found with this order number');
        return;
      }

      // Get the first matching PO (API searches by exact order number)
      const po = pos[0];

      // Check if PO is confirmed or partially confirmed
      const validStatuses = ['CONFIRMED', 'PARTIALLY_CONFIRMED'];
      const status = po.poStatus || po.orderStatus;
      if (!validStatuses.includes(status)) {
        setPoSearchError(
          'This purchase order is not confirmed yet. Only confirmed or partially confirmed orders can be invoiced.',
        );
        return;
      }

      // Set the selected PO ID to trigger fetching full details
      setSelectedPOId(po.purchaseOrderId || po.PurchaseOrderId);
    } catch (error) {
      console.error('Error searching purchase order:', error);
      setPoSearchError(
        'Failed to find purchase order. Please check the order number and try again.',
      );
    } finally {
      setIsSearchingPO(false);
    }
  };

  useEffect(() => {
    const fetchPurchaseOrder = async () => {
      if (!selectedPOId || selectedPOId === 'undefined') {
        return;
      }

      try {
        const response = await PurchaseOrderService.getPurchaseOrderByIdCompany(
          companyId,
          selectedPOId,
        );

        const data = response.data?.content?.[0] || response.data;
        setPoData(data);

        // Set supplier ID from PO data
        if (data?.supplier?.supplierId) {
          setSelectedSupplierId(data.supplier.supplierId);
        }

        const itemsData =
          data?.orderItemDetails?.map((item, index) => ({
            purchaseOrderDetailId: item.purchaseOrderDetailId,
            partId: item.partId || '',
            partDescription: item.partDescription || '',
            unitPrice: item.unitPrice || '',
            qty: 0,
            quantityInvoiced: item.quantityInvoiced || 0,
            availableQuantity: (item.quantityConfirmed || 0) - (item.quantityInvoiced || 0),
            unitOfMeasurement: item.unitOfMeasurement || '',
            originalIndex: index,
          })) || [];

        setInitialValues({
          title: data?.title || '',
          invoiceNo: '',
          dateOfIssue: '',
          companyId: data?.company?.displayName || '',
          supplierName: data?.supplier?.displayName || data?.supplier?.name || '',
          purchaseOrderId: data?.purchaseOrderId || data?.PurchaseOrderId || '',
          departmentId: data?.orderItemDetails?.[0]?.department?.departmentId ?? null,
          shippingAddress: formatAddress(data?.shippingToAddress),
          billingAddress: formatAddress(data?.billingToAddress),
          projectId: data?.orderItemDetails?.[0]?.project?.projectId || '',
          locationId: data?.orderItemDetails?.[0]?.location?.locationId ?? null,
          notes: data?.notes || '',
          paymentTerms: data?.paymentTerms?.name || '',
          paymentTermsId: '',
          paymentDueDate: '',
          invoiceAnnexure: '',
          supplierAddress: '',
          remitTo: ' ',
          gstNumber: '',
          taxInfo: '',
          tinNumber: '',
          authorizedSignatory: '',
          warrantyInDays: '',
          guaranteeInDays: '',
          subtitle: '',
          taxes: '',
          discount: '',
          termsAndConditions: '',
          items: itemsData,
        });
        setBillingAddressId(data?.billingToAddress?.addressId || '');
        setShippingAddressId(data?.shippingToAddress?.addressId || '');
      } catch (error) {
        console.error('Error fetching purchase order data:', error);
      }
    };

    if (companyId && selectedPOId) {
      fetchPurchaseOrder();
    }
  }, [companyId, selectedPOId]);

  const handleCancel = () => {
    navigate('/company-invoices');
  };

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
      const uploadedFileId = response.data.fileId;
      setDocumentId(uploadedFileId);
      formikRef.current?.setFieldValue('documentId', uploadedFileId);

      const fileBlob = new Blob([file], { type: file.type });
      const fileUrl = URL.createObjectURL(fileBlob);
      setPreviewFile({
        url: fileUrl,
        name: file.name,
        type: file.type,
      });

      setShowUploadSection(false);
      toast.dismiss();
      toast.success('File uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.dismiss();
      toast.error(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    if (previewFile?.url) {
      URL.revokeObjectURL(previewFile.url);
    }
    setSelectedFile(null);
    setPreviewFile(null);
    setDocumentId('');
    setShowUploadSection(true);
    formikRef.current?.setFieldValue('documentId', '');
  };

  const renderFilePreview = (file) => {
    if (!file) return null;

    const isPDF = file.type?.includes('pdf');
    const isImage = file.type?.includes('image');

    return (
      <div className="d-flex flex-column align-items-center">
        <div className="d-flex justify-content-between align-items-center w-100 mb-3">
          <h6 className="m-0" style={{ color: '#009efb', fontWeight: '600' }}>
            File Preview
          </h6>
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
          <div style={{ height: '400px', width: '100%' }}>
            <iframe
              src={file.url}
              title="PDF Preview"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        ) : isImage ? (
          <div style={{ height: '400px', width: '100%' }}>
            <TransformWrapper initialScale={1} minScale={0.5} maxScale={3}>
              <TransformComponent>
                <img
                  src={file.url}
                  alt="Preview"
                  style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
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

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      if (!documentId) {
        toast.dismiss();
        toast.error('Please upload invoice annexure file');
        setSubmitting(false);
        return;
      }

      const itemsWithQuantity = values.items.filter(
        (item) => item.qty > 0 && item.availableQuantity > 0,
      );
      if (itemsWithQuantity.length === 0) {
        toast.dismiss();
        toast.error('Please enter quantity for at least one item');
        setSubmitting(false);
        return;
      }

      if (!billingAddressId) {
        toast.dismiss();
        toast.error('Billing address is required');
        setSubmitting(false);
        return;
      }

      if (!shippingAddressId) {
        toast.dismiss();
        toast.error('Shipping address is required');
        setSubmitting(false);
        return;
      }

      const invoicePayload = {
        title: values.title,
        invoiceNo: values.invoiceNo,
        purchaseOrderId: Number(selectedPOId),
        dateOfIssue: values.dateOfIssue,
        supplier: {
          supplierId: Number(selectedSupplierId),
        },
        supplierAddress: values.supplierAddress,
        companyId: Number(companyId),
        departmentId: values.departmentId ? Number(values.departmentId) : null,
        locationId: values.locationId ? Number(values.locationId) : null,
        projectId: values.projectId ? Number(values.projectId) : null,
        billingAddress: Number(billingAddressId),
        shippingAddress: Number(shippingAddressId),
        description: values.description,
        subtotal: Number(values.subtotal || 0),
        taxes: Number(values.taxes || 0),
        discount: Number(values.discount || 0),
        totalAmountDue: 0,
        termsAndConditions: values.termsAndConditions,
        paymentTerms: values.paymentTermsId ? Number(values.paymentTermsId) : null,
        paymentDueDate: values.paymentDueDate,
        remitTo: values.remitTo,
        gstNumber: values.gstNumber,
        taxInfo: values.taxInfo,
        tinNumber: values.tinNumber,
        isActive: true,
        notes: values.notes,
        authorizedSignatory: values.authorizedSignatory,
        invoiceAnnexure: documentId,
        warrantyInDays: Number(values.warrantyInDays || 0),
        guaranteeInDays: Number(values.guaranteeInDays || 0),
        invoiceDetails: itemsWithQuantity.map((item) => ({
          poDetailId: Number(item.purchaseOrderDetailId),
          isAService: false,
          qty: Number(item.qty),
          unitPrice: Number(item.unitPrice),
          subTotal: Number(item.unitPrice * item.qty),
          partDescription: item.partDescription,
          partId: Number(item.partId),
          unitOfMeasurement: item.unitOfMeasurement,
        })),
      };

      const response = await InvoiceService.createInvoiceByCompany(companyId, invoicePayload);

      if (response.status === 200) {
        const { fileId } = response.data;
        Swal.fire({
          icon: 'success',
          title: 'Invoice Created',
          text: 'The invoice has been created successfully.',
          showCancelButton: true,
          confirmButtonText: 'OK',
          cancelButtonText: 'Download Invoice',
        }).then(async (result) => {
          if (result.isConfirmed) {
            navigate('/company-invoices');
          } else if (result.dismiss === Swal.DismissReason.cancel) {
            try {
              const downloadResponse = await FileUploadService.downloadFile(fileId);
              const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `Invoice_${fileId}.pdf`);
              document.body.appendChild(link);
              link.click();
              link.remove();
              navigate('/company-invoices');
            } catch (downloadError) {
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to download the invoice. Please try again.',
              });
              console.error('Error downloading invoice:', downloadError);
            }
          }
        });
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.errorMessage) {
        toast.dismiss();
        toast.error(error.response.data.errorMessage);
      } else {
        toast.dismiss();
        toast.error('An unexpected error occurred');
      }
      console.error('Error creating invoice:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Function to reset and search a different PO
  const handleChangePO = () => {
    setSelectedPOId('');
    setOrderNumberInput('');
    setPoData(null);
    setPoSearchError('');
    setSelectedSupplierId('');
    setDocumentId('');
    setPreviewFile(null);
    setShowUploadSection(true);
  };

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
                    <i className="fas fa-file-invoice text-white" style={{ fontSize: '20px' }}></i>
                  </div>
                  <div>
                    <h4 className="mb-0" style={{ color: '#212529', fontWeight: '600' }}>
                      Create Invoice
                    </h4>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <Button
                    className="btn btn-gradient-primary"
                    onClick={() => navigate('/company-invoices')}
                    style={{
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                      border: 'none',
                      color: 'white',
                      boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                    }}
                  >
                    <i className="fas fa-arrow-left me-2"></i>Back to Invoices
                  </Button>
                </div>
              </div>

              {/* Order Number Input when no PO is selected */}
              {!selectedPOId && (
                <div
                  style={{
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    padding: '24px',
                    border: '1px solid #e9ecef',
                    marginBottom: '24px',
                  }}
                >
                  <h6
                    className="mb-3"
                    style={{ color: '#009efb', fontWeight: '600', fontSize: '14px' }}
                  >
                    <i className="fas fa-search me-2"></i>Enter Order Number
                  </h6>
                  <p className="text-muted mb-3" style={{ fontSize: '13px' }}>
                    Please enter the purchase order number to create an invoice against.
                  </p>
                  <div className="d-flex align-items-start gap-2" style={{ maxWidth: '500px' }}>
                    <div className="flex-grow-1">
                      <Input
                        type="text"
                        placeholder="Enter Order Number (e.g., PO-1234)"
                        value={orderNumberInput}
                        onChange={(e) => {
                          setOrderNumberInput(e.target.value);
                          setPoSearchError('');
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearchPO();
                          }
                        }}
                        className={poSearchError ? 'is-invalid' : ''}
                      />
                      {poSearchError && (
                        <div className="text-danger mt-1" style={{ fontSize: '12px' }}>
                          {poSearchError}
                        </div>
                      )}
                    </div>
                    <Button
                      color="primary"
                      onClick={handleSearchPO}
                      disabled={isSearchingPO}
                      style={{
                        borderRadius: '8px',
                        minWidth: '120px',
                      }}
                    >
                      {isSearchingPO ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-1"
                            role="status"
                          ></span>
                          Searching...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-search me-1"></i>
                          Find Order
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Show form only when a PO is selected */}
              {selectedPOId && (
                <Row>
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
                          <i className="fas fa-cloud-upload-alt me-2"></i>Upload Invoice Annexure
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

                  <Col md="6">
                    <Formik
                      initialValues={initialValues}
                      enableReinitialize
                      validationSchema={invoiceValidationSchema}
                      onSubmit={handleSubmit}
                      innerRef={formikRef}
                    >
                      {({ values, handleChange, handleBlur, errors, touched, isSubmitting }) => (
                        <Form>
                          <div className="mb-3">
                            <h6
                              style={{
                                color: '#009efb',
                                fontWeight: '600',
                                fontSize: '14px',
                                marginBottom: '16px',
                              }}
                            >
                              <i className="fas fa-info-circle me-2"></i>Invoice Details
                            </h6>

                            <Row>
                              <Col md="6">
                                <FormGroup>
                                  <Label>
                                    Invoice No<span className="text-danger">*</span>
                                  </Label>
                                  <Input
                                    type="text"
                                    name="invoiceNo"
                                    placeholder="Enter Invoice Number"
                                    value={values.invoiceNo}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className={`form-control${
                                      touched.invoiceNo && errors.invoiceNo ? ' is-invalid' : ''
                                    }`}
                                  />
                                  <ErrorMessage
                                    name="invoiceNo"
                                    component="div"
                                    className="invalid-feedback"
                                  />
                                </FormGroup>
                              </Col>
                              <Col md="6">
                                <FormGroup>
                                  <Label>
                                    Invoice Date<span className="text-danger">*</span>
                                  </Label>
                                  <Input
                                    type="date"
                                    name="dateOfIssue"
                                    value={values.dateOfIssue}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className={`form-control${
                                      touched.dateOfIssue && errors.dateOfIssue ? ' is-invalid' : ''
                                    }`}
                                  />
                                  <ErrorMessage
                                    name="dateOfIssue"
                                    component="div"
                                    className="invalid-feedback"
                                  />
                                </FormGroup>
                              </Col>
                            </Row>

                            <Row>
                              <Col md="6">
                                <FormGroup>
                                  <Label>
                                    Payment Terms<span className="text-danger">*</span>
                                  </Label>
                                  <Input
                                    type="select"
                                    name="paymentTermsId"
                                    value={values.paymentTermsId}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className={`form-control${
                                      touched.paymentTermsId && errors.paymentTermsId
                                        ? ' is-invalid'
                                        : ''
                                    }`}
                                  >
                                    <option value="">Select Payment Terms</option>
                                    {paymentTermsList.map((term) => (
                                      <option key={term.paymentTermId} value={term.paymentTermId}>
                                        {term.name}
                                      </option>
                                    ))}
                                  </Input>
                                  <ErrorMessage
                                    name="paymentTermsId"
                                    component="div"
                                    className="invalid-feedback"
                                  />
                                </FormGroup>
                              </Col>
                              <Col md="6">
                                <FormGroup>
                                  <Label>
                                    Payment Due Date<span className="text-danger">*</span>
                                  </Label>
                                  <Input
                                    type="date"
                                    name="paymentDueDate"
                                    value={values.paymentDueDate}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className={`form-control${
                                      touched.paymentDueDate && errors.paymentDueDate
                                        ? ' is-invalid'
                                        : ''
                                    }`}
                                  />
                                  <ErrorMessage
                                    name="paymentDueDate"
                                    component="div"
                                    className="invalid-feedback"
                                  />
                                </FormGroup>
                              </Col>
                            </Row>

                            <Row>
                              <Col md="6">
                                <FormGroup>
                                  <Label>Shipping Address</Label>
                                  <Input
                                    type="text"
                                    name="shippingAddress"
                                    value={values.shippingAddress}
                                    readOnly
                                    className="form-control"
                                    style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                                    rows="3"
                                  />
                                </FormGroup>
                              </Col>
                              <Col md="6">
                                <FormGroup>
                                  <Label>Billing Address</Label>
                                  <Input
                                    type="text"
                                    name="billingAddress"
                                    value={values.billingAddress}
                                    readOnly
                                    className="form-control"
                                    style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                                    rows="3"
                                  />
                                </FormGroup>
                              </Col>
                            </Row>
                          </div>

                          {poData && (
                            <div className="mb-3">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6
                                  style={{
                                    color: '#009efb',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    marginBottom: '0',
                                  }}
                                >
                                  <i className="fas fa-shopping-cart me-2"></i>Purchase Order
                                  Information
                                </h6>
                                <Button
                                  size="sm"
                                  color="link"
                                  onClick={handleChangePO}
                                  style={{ padding: 0, fontSize: '12px' }}
                                >
                                  <i className="fas fa-exchange-alt me-1"></i>Change PO
                                </Button>
                              </div>
                              <div
                                className="border p-3 rounded mb-3"
                                style={{ backgroundColor: '#f8f9fa' }}
                              >
                                <Row>
                                  <Col md="6">
                                    <p>
                                      <strong>Order No:</strong> {poData.orderNo || 'N/A'}
                                    </p>
                                    <p>
                                      <strong>Supplier:</strong>{' '}
                                      {poData.supplier?.displayName ||
                                        poData.supplier?.name ||
                                        'N/A'}
                                    </p>
                                  </Col>
                                  <Col md="6">
                                    <p>
                                      <strong>Payment Terms:</strong>{' '}
                                      {poData.paymentTerms?.name || 'N/A'}
                                    </p>
                                    <p>
                                      <strong>Total Amount:</strong> ${poData.orderAmount || 0}
                                    </p>
                                  </Col>
                                </Row>
                              </div>
                            </div>
                          )}

                          {values.items && values.items.length > 0 && (
                            <div className="mb-3">
                              <h6
                                style={{
                                  color: '#009efb',
                                  fontWeight: '600',
                                  fontSize: '14px',
                                  marginBottom: '16px',
                                }}
                              >
                                <i className="fas fa-list me-2"></i>Invoice Items
                              </h6>
                              <div
                                className="table-responsive"
                                style={{
                                  maxHeight: '350px',
                                  overflowY: 'auto',
                                  border: '1px solid #dee2e6',
                                  borderRadius: '8px',
                                }}
                              >
                                <table
                                  className="table table-bordered table-hover mb-0"
                                  style={{
                                    fontSize: '0.8rem',
                                    width: '100%',
                                  }}
                                >
                                  <thead
                                    className="thead-light"
                                    style={{
                                      position: 'sticky',
                                      top: 0,
                                      zIndex: 1,
                                      backgroundColor: '#f8f9fa',
                                    }}
                                  >
                                    <tr>
                                      <th
                                        style={{
                                          width: '80px',
                                          textAlign: 'center',
                                          padding: '6px',
                                          fontSize: '0.75rem',
                                        }}
                                      >
                                        Part ID
                                      </th>
                                      <th
                                        style={{
                                          width: '120px',
                                          textAlign: 'center',
                                          padding: '6px',
                                          fontSize: '0.75rem',
                                        }}
                                      >
                                        Description
                                      </th>
                                      <th
                                        style={{
                                          width: '80px',
                                          textAlign: 'center',
                                          padding: '6px',
                                          fontSize: '0.75rem',
                                        }}
                                      >
                                        Qty Invoiced
                                      </th>
                                      <th
                                        style={{
                                          width: '80px',
                                          textAlign: 'center',
                                          padding: '6px',
                                          fontSize: '0.75rem',
                                        }}
                                      >
                                        Qty Available
                                      </th>
                                      <th
                                        style={{
                                          width: '90px',
                                          textAlign: 'center',
                                          padding: '6px',
                                          fontSize: '0.75rem',
                                        }}
                                      >
                                        Qty<span className="text-danger">*</span>
                                      </th>
                                      <th
                                        style={{
                                          width: '80px',
                                          textAlign: 'center',
                                          padding: '6px',
                                          fontSize: '0.75rem',
                                        }}
                                      >
                                        Unit Price
                                      </th>
                                      <th
                                        style={{
                                          width: '80px',
                                          textAlign: 'center',
                                          padding: '6px',
                                          fontSize: '0.75rem',
                                        }}
                                      >
                                        Total
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {values.items.map((item, index) => (
                                      <tr key={item.purchaseOrderDetailId || index}>
                                        <td
                                          style={{
                                            width: '80px',
                                            textAlign: 'center',
                                            padding: '6px',
                                            fontSize: '0.75rem',
                                          }}
                                        >
                                          {item.partId || 'N/A'}
                                        </td>
                                        <td
                                          style={{
                                            width: '120px',
                                            padding: '6px',
                                            fontSize: '0.75rem',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            cursor: 'pointer',
                                          }}
                                          title={item.partDescription || 'N/A'}
                                        >
                                          {item.partDescription
                                            ? item.partDescription
                                                .split(' ')
                                                .slice(0, 3)
                                                .join(' ') +
                                              (item.partDescription.split(' ').length > 3
                                                ? '...'
                                                : '')
                                            : 'N/A'}
                                        </td>
                                        <td
                                          style={{
                                            width: '80px',
                                            textAlign: 'center',
                                            padding: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            color: '#dc3545',
                                          }}
                                        >
                                          {item.quantityInvoiced}
                                        </td>
                                        <td
                                          style={{
                                            width: '80px',
                                            textAlign: 'center',
                                            padding: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            color:
                                              item.availableQuantity > 0 ? '#28a745' : '#dc3545',
                                          }}
                                        >
                                          {item.availableQuantity}
                                        </td>
                                        <td style={{ width: '90px', padding: '6px' }}>
                                          <Input
                                            type="number"
                                            name={`items[${index}].qty`}
                                            value={item.qty || ''}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            min="0"
                                            max={item.availableQuantity}
                                            step="1"
                                            className={`form-control${
                                              touched.items?.[index]?.qty &&
                                              errors.items?.[index]?.qty
                                                ? ' is-invalid'
                                                : ''
                                            }`}
                                            style={{
                                              fontSize: '0.75rem',
                                              height: '28px',
                                              backgroundColor:
                                                item.availableQuantity > 0 ? 'white' : '#f8f9fa',
                                              cursor:
                                                item.availableQuantity > 0 ? 'text' : 'not-allowed',
                                              padding: '2px 6px',
                                            }}
                                            disabled={item.availableQuantity <= 0}
                                            placeholder={item.availableQuantity > 0 ? 'Qty' : 'N/A'}
                                          />
                                          <ErrorMessage
                                            name={`items[${index}].qty`}
                                            component="div"
                                            className="invalid-feedback"
                                          />
                                        </td>
                                        <td
                                          style={{
                                            width: '80px',
                                            textAlign: 'center',
                                            padding: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                          }}
                                        >
                                          {item.unitPrice}
                                        </td>
                                        <td
                                          style={{
                                            width: '80px',
                                            fontWeight: '600',
                                            textAlign: 'center',
                                            padding: '6px',
                                            fontSize: '0.75rem',
                                          }}
                                        >
                                          {((item.qty || 0) * (item.unitPrice || 0)).toFixed(2)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr style={{ backgroundColor: '#e9ecef', fontWeight: '600' }}>
                                      <td
                                        colSpan="6"
                                        style={{
                                          textAlign: 'right',
                                          padding: '8px',
                                          fontSize: '0.8rem',
                                        }}
                                      >
                                        Total:
                                      </td>
                                      <td
                                        style={{
                                          textAlign: 'center',
                                          padding: '8px',
                                          fontSize: '0.8rem',
                                          color: '#009efb',
                                        }}
                                      >
                                        {values.items
                                          .filter((item) => item.qty > 0)
                                          .reduce(
                                            (total, item) =>
                                              total + (item.qty || 0) * (item.unitPrice || 0),
                                            0,
                                          )
                                          .toFixed(2)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                              {errors.items && typeof errors.items === 'string' && (
                                <div className="alert alert-danger mt-2">{errors.items}</div>
                              )}
                            </div>
                          )}

                          <div className="d-flex justify-content-end mt-4 gap-2">
                            <Button
                              className="btn btn-secondary"
                              onClick={handleCancel}
                              disabled={isSubmitting}
                              style={{
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)',
                                border: 'none',
                                color: 'white',
                                boxShadow: '0 4px 15px rgba(108, 117, 125, 0.3)',
                              }}
                            >
                              Back
                            </Button>
                            <Button
                              type="submit"
                              className="btn btn-gradient-primary"
                              disabled={isSubmitting || !documentId}
                              style={{
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #009efb 0%, #0084d6 100%)',
                                border: 'none',
                                color: 'white',
                                boxShadow: '0 4px 15px rgba(0, 158, 251, 0.3)',
                              }}
                            >
                              {isSubmitting ? 'Creating Invoice...' : 'Submit'}
                            </Button>
                          </div>
                        </Form>
                      )}
                    </Formik>
                  </Col>
                </Row>
              )}
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default CompanyCreateInvoice;
