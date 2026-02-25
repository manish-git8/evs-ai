// import React, { useEffect, useState } from 'react';
// import {
//   Card,
//   CardBody,
//   CardTitle,
//   Row,
//   Col,
//   FormGroup,
//   Label,
//   Input,
//   Button,
//   Table,
// } from 'reactstrap';
// import { Formik, ErrorMessage, Form } from 'formik';
// import '../CompanyManagement/ReactBootstrapTable.scss';
// import { useParams, useNavigate } from 'react-router-dom';
// import * as Yup from 'yup';
// import Swal from 'sweetalert2';
// import { toast, ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
// import PurchaseOrderService from '../../services/PurchaseOrderService';
// import FileUploadService from '../../services/FileUploadService';
// import InvoiceService from '../../services/InvoiceService';
// import BreadCrumbs from '../../layouts/breadcrumbs/BreadCrumbs';
// import { getEntityId } from '../localStorageUtil';

// const CreateInvoice = () => {
//   const supplierId = getEntityId();
//   const { purchaseOrderId } = useParams();
//   const navigate = useNavigate();
//   const [companyId, setCompanyId] = useState('');
//   const [orderItemDetails, setOrderItemDetails] = useState([]);
//   const [billingAddressId, setBillingAddressId] = useState('');
//   const [shippingAddressId, setShippingAddressId] = useState('');
//   const [initialValues, setInitialValues] = useState({
//     title: '',
//     invoiceNo: '',
//     companyId: '',
//     supplierId: '',
//     purchaseOrderId: '',
//     departmentId: '',
//     dateOfIssue: '',
//     shippingAddress: '',
//     billingAddress: '',
//     supplierAddress: '',
//     locationId: '',
//     projectId: '',
//     notes: '',
//     paymentTerms: '',
//     catalogItemId: '',
//     unitPrice: '',
//     qty: '',
//     partDescription: '',
//     partId: '',
//     quantityConfirmed: '',
//     totalAmountDue: '',
//     invoiceAnnexure: '',
//     paymentDueDate: '',
//     remitTo: ' ',
//     gstNumber: '',
//     taxInfo: '',
//     tinNumber: '',
//     authorizedSignatory: '',
//     warrantyInDays: '',
//     guaranteeInDays: '',
//     subtitle: '',
//     taxes: '',
//     discount: '',
//     termsAndConditions: '',
//   });

//   const invoiceValidationSchema = Yup.object({
//     title: Yup.string().required('Invoice Title is required'),
//     dateOfIssue: Yup.string().required('Date Of Issue is required'),
//     paymentDueDate: Yup.string().required('Payment Due Date is required'),
//     invoiceAnnexure: Yup.number()
//       .typeError('Invoice Annexure must be a number')
//       .positive('Invoice Annexure must be greater than 0')
//       .required('Invoice Annexure is required'),
//     qty: Yup.number().positive('Quantity must be greater than 0').required('Quantity is required'),
//     supplierAddress: Yup.string().required('Supplier Address is required'),
//   });

//   useEffect(() => {
//     const fetchPurchaseOrder = async () => {
//       try {
//         const response = await PurchaseOrderService.getPurchaseOrderById(
//           supplierId,
//           purchaseOrderId,
//         );

//         const data = response.data[0];

//         setInitialValues({
//           title: data?.title || '',
//           invoiceNo: data?.invoiceNo || '',
//           companyId: data?.company?.displayName || '',
//           supplierName: data?.supplier?.displayName || '',
//           purchaseOrderId: data?.PurchaseOrderId || '',
//           departmentId: data?.orderItemDetails?.[0]?.department?.departmentId || '',
//           dateOfIssue: data?.orderDate || '',
//           shippingAddress: data?.shippingToAddress?.addressLine1 || '',
//           billingAddress: data?.billingToAddress?.addressLine1 || '',
//           locationId: data?.location?.locationId || '',
//           projectId: data?.project?.projectId || '',
//           notes: data?.notes || '',
//           paymentTerms: data?.paymentTerms?.paymentTermId || '',
//           catalogItemId: data?.orderItemDetails?.[0]?.cartDetail?.catalogItemId || '',
//           unitPrice: data?.orderItemDetails?.[0]?.unitPrice || '',
//           qty: data?.orderItemDetails?.[0]?.quantityConfirmed || '',
//           partDescription: data?.orderItemDetails?.[0]?.partDescription || '',
//           partId: data?.orderItemDetails?.[0]?.partId || '',
//           quantityConfirmed: data?.orderItemDetails?.[0]?.quantityConfirmed || '',
//           paymentDueDate: '',
//           invoiceAnnexure: '',
//           supplierAddress: '',
//         });
//         setOrderItemDetails(data?.orderItemDetails || []);
//         setCompanyId(data?.company?.companyId || '');
//         setBillingAddressId(data?.billingToAddress?.addressId || '');
//         setShippingAddressId(data?.shippingToAddress?.addressId || '');
//       } catch (error) {
//         console.error('Error fetching purchase order data:', error);
//       }
//     };

//     fetchPurchaseOrder();
//   }, [supplierId, purchaseOrderId]);
//   const handleCancel = () => {
//     navigate('/supplier-dashboard');
//   };

//   const handleSubmit = async (values, { setSubmitting }) => {
//     try {
//       // Create invoiceDetails dynamically based on the orderItemDetails
//       const invoiceDetails = orderItemDetails.map(item => ({
//         catalogItemId: Number(item.catalogItemId),
//         isAService: false, // or conditionally determine this
//         qty: Number(item.quantityConfirmed), // based on order item details
//         unitPrice: Number(item.unitPrice),
//         subTotal: Number(item.unitPrice * item.quantityConfirmed), // calculate subtotal
//         partDescription: item.partDescription,
//       }));
  
//       const invoicePayload = {
//         title: values.title,
//         invoiceNo: values.invoiceNo,
//         purchaseOrderId: Number(values.purchaseOrderId),
//         dateOfIssue: values.dateOfIssue,
//         supplierId,
//         supplierAddress: values.supplierAddress,
//         companyId,
//         departmentId: Number(values.departmentId),
//         locationId: Number(values.locationId),
//         projectId: Number(values.projectId),
//         billingAddress: billingAddressId,
//         shippingAddress: shippingAddressId,
//         description: values.description,
//         subtotal: Number(values.subtotal || 0),
//         taxes: Number(values.taxes || 0),
//         discount: Number(values.discount || 0),
//         totalAmountDue: 0,
//         termsAndConditions: values.termsAndConditions,
//         paymentTerms: values.paymentTerms,
//         paymentDueDate: values.paymentDueDate,
//         remitTo: values.remitTo,
//         gstNumber: values.gstNumber,
//         taxInfo: values.taxInfo,
//         tinNumber: values.tinNumber,
//         isActive: true,
//         notes: values.notes,
//         authorizedSignatory: values.authorizedSignatory,
//         invoiceAnnexure: values.invoiceAnnexure,
//         warrantyInDays: Number(values.warrantyInDays || 0),
//         guaranteeInDays: Number(values.guaranteeInDays || 0),
//         invoiceDetails, // Pass the dynamically generated invoiceDetails
//       };
  
//       const response = await InvoiceService.createInvoice(supplierId, invoicePayload);
  
//       if (response.status === 200) {
//         const { fileId } = response.data;
//         Swal.fire({
//           icon: 'success',
//           title: 'Invoice Created',
//           text: 'The invoice has been created successfully.',
//           showCancelButton: true,
//           confirmButtonText: 'OK',
//           cancelButtonText: 'Download Invoice',
//         }).then(async (result) => {
//           if (result.isConfirmed) {
//             navigate('/supplier-dashboard');
//           } else if (result.dismiss === Swal.DismissReason.cancel) {
//             try {
//               const downloadResponse = await FileUploadService.downloadInvoice(fileId);
//               const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
//               const link = document.createElement('a');
//               link.href = url;
//               link.setAttribute('download', `Invoice_${fileId}.pdf`);
//               document.body.appendChild(link);
//               link.click();
//               link.remove();
//               navigate('/supplier-dashboard');
//             } catch (downloadError) {
//               Swal.fire({
//                 icon: 'error',
//                 title: 'Error',
//                 text: 'Failed to download the invoice. Please try again.',
//               });
//               console.error('Error downloading invoice:', downloadError);
//             }
//           }
//         });
//       }
//     } catch (error) {
//       if (error.response && error.response.data && error.response.data.errorMessage) {
//         toast.error(error.response.data.errorMessage);
//       } else {
//         toast.error('An unexpected error occurred');
//       }
//       console.error('Error creating invoice:', error);
//     } finally {
//       setSubmitting(false);
//     }
//   };
  

//   const handleQuantityChange = (index, value) => {
//     const updatedItems = [...orderItemDetails];
//     updatedItems[index].quantityConfirmed = value;
//     setOrderItemDetails(updatedItems);
//   };

//   return (
//     <div>
//       <BreadCrumbs />
//       <ToastContainer />
//       <Row>
//         <Col md="12">
//           <Card>
//             <CardBody style={{ backgroundColor: '#009efb', padding: '12px', color: 'white' }}>
//               <CardTitle tag="h4" className="mb-0" style={{ fontWeight: '500', fontSize: '14px' }}>
//                 Create Invoice
//               </CardTitle>
//             </CardBody>
//             <CardBody>
//               <Formik
//                 initialValues={initialValues}
//                 enableReinitialize
//                 validationSchema={invoiceValidationSchema}
//                 onSubmit={handleSubmit}
//               >
//                 {({ values, handleChange, handleBlur, errors, touched, isSubmitting }) => (
//                   <Form>
//                     <Row>
//                       <Col md="6">
//                         <FormGroup>
//                           <Label>Discount</Label>
//                           <Input
//                             type="number"
//                             name="discount"
//                             value={values.discount}
//                             onChange={handleChange}
//                             onBlur={handleBlur}
//                             placeholder="Enter Discount"
//                             className="form-control"
//                             maxLength={20}
//                           />
//                         </FormGroup>
//                       </Col>
//                       <Col md="6">
//                         <FormGroup>
//                           <Label>Tax Info</Label>
//                           <Input
//                             type="text"
//                             name="taxInfo"
//                             value={values.taxInfo}
//                             onChange={handleChange}
//                             onBlur={handleBlur}
//                             placeholder="Enter Tax Info"
//                             className="form-control"
//                             maxLength={200}
//                           />
//                         </FormGroup>
//                       </Col>
//                     </Row>

//                     <Row>
//                       <Col md="6">
//                         <FormGroup>
//                           <Label>
//                             Invoice Annexure<span className="text-danger">*</span>
//                           </Label>
//                           <Input
//                             type="number"
//                             name="invoiceAnnexure"
//                             value={values.invoiceAnnexure}
//                             onChange={handleChange}
//                             onBlur={handleBlur}
//                             placeholder="Enter Invoice Annexure"
//                             className={`form-control${
//                               touched.invoiceAnnexure && errors.invoiceAnnexure ? ' is-invalid' : ''
//                             }`}
//                           />
//                           <ErrorMessage
//                             name="invoiceAnnexure"
//                             component="div"
//                             className="invalid-feedback"
//                           />
//                         </FormGroup>
//                       </Col>
//                       <Col md="6">
//                         <FormGroup>
//                           <Label>Warranty (in Days)</Label>
//                           <Input
//                             type="number"
//                             name="warrantyInDays"
//                             value={values.warrantyInDays}
//                             onChange={handleChange}
//                             onBlur={handleBlur}
//                             placeholder="Enter Warranty in Days"
//                             className="form-control"
//                             maxLength={5}
//                           />
//                         </FormGroup>
//                       </Col>
//                     </Row>

//                     <Row>
//                       <Col md="6">
//                         <FormGroup>
//                           <Label>GST Number</Label>
//                           <Input
//                             type="text"
//                             name="gstNumber"
//                             value={values.gstNumber}
//                             onChange={handleChange}
//                             onBlur={handleBlur}
//                             placeholder="Enter GST Number"
//                             className="form-control"
//                             maxLength={100}
//                           />
//                         </FormGroup>
//                       </Col>
//                       <Col md="6">
//                         <FormGroup>
//                           <Label>Authorized Signatory</Label>
//                           <Input
//                             type="text"
//                             name="authorizedSignatory"
//                             value={values.authorizedSignatory}
//                             onChange={handleChange}
//                             onBlur={handleBlur}
//                             placeholder="Enter Authorized Signatory"
//                             className="form-control"
//                           />
//                         </FormGroup>
//                       </Col>
//                     </Row>
//                     <Row>
//                       <Col md="6">
//                         <FormGroup>
//                           <Label>Guarantee (in Days)</Label>
//                           <Input
//                             type="number"
//                             name="guaranteeInDays"
//                             value={values.guaranteeInDays}
//                             onChange={handleChange}
//                             onBlur={handleBlur}
//                             placeholder="Enter Guarantee in Days"
//                             className="form-control"
//                             maxLength={10}
//                           />
//                         </FormGroup>
//                       </Col>
//                     </Row>

//                     <h3 className="mb-3">
//                       Invoice Details
//                     </h3>

//                     <Table responsive bordered className="table-striped table-hover">
//                       <thead>
//                         <tr>
//                           <th>Part ID</th>
//                           <th>Description</th>
//                           <th>Unit Price</th>
//                           <th>Quantity Confirmed</th>
//                           <th>Invoice Quantity</th>
//                           <th>Total</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {orderItemDetails.map((item, index) => (
//                           <tr key={item.purchaseOrderDetailId}>
//                             <td>{item.partId}</td>
//                             <td>{item.partDescription}</td>
//                             <td>{item.unitPrice}</td>
//                             <td>{item.quantityConfirmed}</td>
//                             <td>
//                               <Input
//                                 type="number"
//                                 value={item.quantityConfirmed}
//                                 onChange={(e) => handleQuantityChange(index, e.target.value)}
//                                 min="0"
//                               />
//                             </td>
//                             <td>{item.unitPrice * item.quantityConfirmed}</td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </Table>

//                     <Row>
//                       <Col className="d-flex justify-content-end mt-3">
//                         <Button
//                           color="secondary"
//                           style={{ marginRight: '10px' }}
//                           onClick={handleCancel}
//                         >
//                           Back
//                         </Button>
//                         <Button type="submit" color="primary" disabled={isSubmitting}>
//                           {isSubmitting ? 'Creating Invoice...' : 'Submit'}
//                         </Button>
//                       </Col>
//                     </Row>
//                   </Form>
//                 )}
//               </Formik>
//             </CardBody>
//           </Card>
//         </Col>
//       </Row>
//     </div>
//   );
// };

// export default CreateInvoice;
// i want to send mutliple orders in  handleSubmit  invoiceDetails