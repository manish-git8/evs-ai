import React, { useEffect, useState } from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Row,
  Col,
  FormGroup,
  Table,
  Label,
  Input,
  Button,
} from 'reactstrap';
import { useNavigate, useParams } from 'react-router-dom';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { Formik, ErrorMessage, Form } from 'formik';
import * as Yup from 'yup';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import InvoiceService from '../../services/InvoiceService';
import DepartmentService from '../../services/DepartmentService';
import LocationService from '../../services/LocationService';
import { getEntityId } from '../localStorageUtil';
import UserService from '../../services/UserService';
import GrnService from '../../services/GrnService';
import CatalogItemService from '../../services/CatalogItemService';

const GrnRegistration = () => {
  const navigate = useNavigate();
  const { invoiceId } = useParams();
  const companyId = getEntityId();
  const [invoiceData, setInvoiceData] = useState(null);
  const [setDepartmentList] = useState([]);
  const [locationList, setLocationList] = useState([]);
  const [employees, setEmployees] = useState([]);

  const initialValues = {
    invoiceId,
    purchaseOrderId: '',
    companyId,
    locationId: '',
    departmentId: '',
    supplierId: '',
    notes: '',
    receivedDateTime: new Date().toISOString().split('T')[0],
    receivedBy: '',
    verifiedDate: '',
    isActive: true,
    documentId: '',
    grnDetails: [],
  };

  const validationSchema = Yup.object().shape({
    receivedDateTime: Yup.date()
      .min(new Date().toISOString().split('T')[0], 'Received Date cannot be before today')
      .required('Received Date is required'),
    verifiedDate: Yup.date()
      .min(new Date().toISOString().split('T')[0], 'Verified Date cannot be before today')
      .required('Verified Date is required'),
    receivedBy: Yup.string().required('Received By is required'),
    verifiedBy: Yup.string().required('Verified By is required'),
  });

  const fetchDepartments = async () => {
    try {
      const response = await DepartmentService.getAllDepartment(companyId);
      if (response && response.data) {
        setDepartmentList(response.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await LocationService.getAllLocation(companyId);
      if (response && response.data) {
        setLocationList(response.data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchCompanyUser = async () => {
    try {
      const response = await UserService.fetchAllUsers(companyId);
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchLocations();
    fetchCompanyUser();
  }, []);

  useEffect(() => {
    const fetchInvoiceDetailsWithParts = async () => {
      try {
        if (invoiceId) {
          const response = await InvoiceService.getInvoicesById(companyId, invoiceId);
          const invoice = response.data[0];
          if (invoice) {
            const enrichedDetails = await Promise.all(
              invoice.invoiceDetails.map(async (detail) => {
                try {
                  const catalogItem = await CatalogItemService.getCatalogItemById(
                    detail.catalogItemId,
                  );
                  return {
                    ...detail,
                    partDescription: catalogItem[0]?.Description || 'Not Available',
                  };
                } catch (error) {
                  console.error(
                    `Error fetching catalog item for ID ${detail.catalogItemId}:`,
                    error,
                  );
                  return {
                    ...detail,
                    partDescription: 'Error fetching description',
                  };
                }
              }),
            );
            setInvoiceData({ ...invoice, invoiceDetails: enrichedDetails });
          }
        }
      } catch (error) {
        console.error('Error fetching invoice:', error);
      }
    };

    fetchInvoiceDetailsWithParts();
  }, [companyId, invoiceId]);

  const handleCancel = () => {
    navigate('/grn-receipt');
  };

  const handleFileUpload = (event, itemId) => {
    const file = event.target.files[0];
    console.log(`File uploaded for item ${itemId}:`, file);
  };

  const handleSubmit = async (values) => {
    const formatDateToISO = (date) => {
      return new Date(date).toISOString();
    };

    try {
      const grnDetailsWithParts = await Promise.all(
        invoiceData.invoiceDetails.map(async (detail) => {
          try {
            const catalogItem = await CatalogItemService.getCatalogItemById(detail.catalogItemId);
            return {
              catalogItemId: detail.catalogItemId,
              partDescription: catalogItem[0]?.Description || '',
              partId: catalogItem[0]?.PartId || '',
              unitPrice:
                values.grnDetails[detail.invoiceItemDetailId]?.unitPrice || detail.unitPrice,
              unitOfMeasurement:
                values.grnDetails[detail.invoiceItemDetailId]?.unitOfMeasurement || '',
              qtyReceived: values.grnDetails[detail.invoiceItemDetailId]?.qtyReceived || 0,
              qtyAccepted: values.grnDetails[detail.invoiceItemDetailId]?.qtyAccepted || 0,
              reason: values.grnDetails[detail.invoiceItemDetailId]?.reason || '',
            };
          } catch (error) {
            console.error(`Error fetching catalog item for ID ${detail.catalogItemId}:`, error);
            return null;
          }
        }),
      );
      const filteredGrnDetails = grnDetailsWithParts.filter((detail) => detail !== null);
      const requestBody = {
        grnId: values.grnId,
        invoiceId: values.invoiceId,
        PurchaseOrderId: values.purchaseOrderId,
        companyId: values.companyId,
        locationId: values.locationId,
        DepartmentId: values.departmentId,
        supplierId: values.supplierId,
        notes: values.notes,
        receivedDateTime: formatDateToISO(values.receivedDateTime),
        receivedBy: values.receivedBy,
        verifiedBy: values.verifiedBy,
        verifiedDate: formatDateToISO(values.verifiedDate),
        isActive: values.isActive,
        documentId: values.documentId,
        grnDetails: filteredGrnDetails,
      };

      const response = await GrnService.handleCreateGRN(values.companyId, requestBody);

      if (response.status === 200 || response.status === 201) {
        toast.dismiss();
        toast.success('GRN created successfully!');
        setTimeout(() => {
          navigate('/grn-receipt');
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating GRN:', error);
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
      <Row>
        <Col md="12">
          <Card>
            <CardBody style={{ backgroundColor: '#009efb', padding: '12px' }}>
              <CardTitle tag="h4" className="mb-0 text-white">
                GRN Registration
              </CardTitle>
            </CardBody>
            <CardBody>
              <Formik
                validationSchema={validationSchema}
                initialValues={{
                  ...initialValues,
                  departmentId: invoiceData?.departmentId || initialValues.departmentId,
                  locationId: invoiceData?.locationId || initialValues.locationId,
                  purchaseOrderId: invoiceData?.purchaseOrderId || initialValues.purchaseOrderId,
                  supplierId: invoiceData?.supplierId || initialValues.supplierId,
                  notes: invoiceData?.notes || initialValues.notes,
                  receivedDateTime:
                    invoiceData?.receivedDateTime?.split('T')[0] ||
                    new Date().toISOString().split('T')[0],
                  verifiedDate: invoiceData?.verifiedDate?.split('T')[0] || '',
                  grnDetails: invoiceData?.invoiceDetails.reduce((acc, detail) => {
                    acc[detail.invoiceItemDetailId] = {
                      itemId: detail.itemId,
                      description: detail.description,
                      unitPrice: detail.unitPrice,
                      qtyReceived: '',
                      qtyAccepted: '',
                      reason: '',
                      document: null,
                    };
                    return acc;
                  }, {}),
                }}
                onSubmit={handleSubmit}
                enableReinitialize
              >
                {({ values, errors, touched, handleChange, handleBlur }) => (
                  <Form>
                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <Label>Invoice ID</Label>
                          <Input
                            type="number"
                            name="invoiceId"
                            value={values.invoiceId}
                            disabled
                            className="form-control"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>Purchase Order</Label>
                          <Input
                            type="number"
                            name="purchaseOrderId"
                            value={values.purchaseOrderId}
                            onChange={handleChange}
                            disabled={Boolean(invoiceData?.purchaseOrderId)}
                            className="form-control"
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <Label>Supplier</Label>
                          <Input
                            type="number"
                            name="supplierId"
                            value={values.supplierId}
                            onChange={handleChange}
                            disabled={Boolean(invoiceData?.supplierId)}
                            className="form-control"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>Status</Label>
                          <Input
                            type="text"
                            name="isActive"
                            value={values.isActive ? 'Active' : 'Inactive'}
                            disabled
                            className="form-control"
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Received Date<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="date"
                            name="receivedDateTime"
                            value={values.receivedDateTime}
                            onChange={handleChange}
                            min={new Date().toISOString().split('T')[0]}
                            className={`form-control${
                              touched.receivedDateTime && errors.receivedDateTime
                                ? ' is-invalid'
                                : ''
                            }`}
                          />
                          <ErrorMessage
                            name="receivedDateTime"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Verified Date <span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="date"
                            name="verifiedDate"
                            value={values.verifiedDate}
                            onChange={handleChange}
                            min={new Date().toISOString().split('T')[0]}
                            className={`form-control${
                              touched.verifiedDate && errors.verifiedDate ? ' is-invalid' : ''
                            }`}
                          />
                          <ErrorMessage
                            name="verifiedDate"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <Label>Notes</Label>
                          <Input
                            type="text"
                            name="notes"
                            value={values.notes}
                            onChange={handleChange}
                            disabled={Boolean(invoiceData?.notes)}
                            className="form-control"
                            maxLength={200}
                          />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>Location</Label>
                          <Input
                            type="text"
                            name="locationId"
                            value={
                              locationList.find(
                                (location) => location.locationId === values.locationId,
                              )?.name || 'Not Available'
                            }
                            disabled
                            className="form-control"
                          />
                        </FormGroup>
                      </Col>
                    </Row>

                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Received By<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="select"
                            name="receivedBy"
                            value={values.receivedBy}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`form-control${
                              touched.receivedBy && errors.receivedBy ? ' is-invalid' : ''
                            }`}
                          >
                            <option value="">Select Employee</option>
                            {employees.map((employee) => (
                              <option key={employee.userId} value={employee.userId}>
                                {employee.firstName} {employee.lastName}
                              </option>
                            ))}
                          </Input>
                          <ErrorMessage
                            name="receivedBy"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Verified By<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="select"
                            name="verifiedBy"
                            value={values.verifiedBy}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`form-control${
                              touched.verifiedBy && errors.verifiedBy ? ' is-invalid' : ''
                            }`}
                          >
                            <option value="">Select Employee</option>
                            {employees.map((employee) => (
                              <option key={employee.userId} value={employee.userId}>
                                {employee.firstName} {employee.lastName}
                              </option>
                            ))}
                          </Input>
                          <ErrorMessage
                            name="verifiedBy"
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
                            Department<span className="text-danger">*</span>{' '}
                          </Label>
                          <Input
                            type="text"
                            name="departmentId"
                            value={values.departmentId || ''}
                            onChange={handleChange}
                            disabled
                            className={`form-control${
                              touched.departmentId && errors.departmentId ? ' is-invalid' : ''
                            }`}
                          ></Input>
                          <ErrorMessage
                            name="departmentId"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row className="mt-4">
                      <Col>
                        <h5>GRN Details</h5>
                        <Table responsive bordered className="table-sm">
                          <thead>
                            <tr>
                              <th>PO ItemDetail ID</th>
                              <th>Part Description</th>
                              <th>Unit Price</th>
                              <th>Quantity Received</th>
                              <th>Quantity Accepted</th>
                              <th>Reason</th>
                              <th>Document</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoiceData?.invoiceDetails?.map((detail) => (
                              <tr key={detail.invoiceItemDetailId}>
                                <td>{detail.catalogItemId}</td>
                                <td>{detail.partDescription}</td>
                                <td>{detail.unitPrice.toFixed(2)}</td>
                                <td>
                                  <Input
                                    type="number"
                                    name={`grnDetails[${detail.invoiceItemDetailId}].qtyReceived`}
                                    onChange={handleChange}
                                    maxLength={15}
                                  />
                                </td>
                                <td>
                                  <Input
                                    type="number"
                                    name={`grnDetails[${detail.invoiceItemDetailId}].qtyAccepted`}
                                    onChange={handleChange}
                                    maxLength={15}
                                  />
                                </td>
                                <td>
                                  <Input
                                    type="text"
                                    name={`grnDetails[${detail.invoiceItemDetailId}].reason`}
                                    onChange={handleChange}
                                    maxLength={15}
                                  />
                                </td>
                                <td>
                                  <Input
                                    type="file"
                                    name={`grnDetails[${detail.invoiceItemDetailId}].document`}
                                    accept=".pdf,.doc,.docx,.png,.jpg"
                                    onChange={(e) =>
                                      handleFileUpload(e, detail.invoiceItemDetailId)
                                    }
                                    maxLength={15}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </Col>
                    </Row>

                    <Row>
                      <Col className="d-flex justify-content-end mt-3">
                        <Button
                          color="secondary"
                          onClick={handleCancel}
                          style={{ marginRight: '10px' }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" color="primary">
                          Submit
                        </Button>
                      </Col>
                    </Row>
                  </Form>
                )}
              </Formik>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default GrnRegistration;
