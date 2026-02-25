import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import '../CompanyManagement/ReactBootstrapTable.scss';
import 'react-toastify/dist/ReactToastify.css';
import { Card, CardBody, CardTitle, Row, Col, FormGroup, Label, Button, Table } from 'reactstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import CompanyService from '../../services/CompanyService';
import ShipmentService from '../../services/ShipmentService';
import PurchaseOrderService from '../../services/PurchaseOrderService';
import { getEntityId } from '../localStorageUtil';

const ShipmentRegistration = () => {
  const [shipmentData, setShipmentData] = useState({
    companyId: '',
    purchaseOrderId: '',
    orderNo: '',
    shipmentDispatchDate: '',
    estimateDeliveryDate: '',
    shipFromAddress: '',
    shipToAddress: '',
    shippingCompany: '',
    trackingNumber: '',
    trackingUrl: '',
    notes: '',
    shipmentItems: [],
  });

  const [companies, setCompanies] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const navigate = useNavigate();
  const { shipmentId } = useParams();
  const supplierId = getEntityId();

  const getValidationSchema = () => {
    const shipmentItemsSchema = {};

    orderItems.forEach((item, index) => {
      const maxQuantity = item.quantityConfirmed - item.quantityShipped;
      shipmentItemsSchema[`shipmentItems[${index}].shippedQty`] = Yup.number()
        .min('Shipped quantity cannot be negative')
        .max(maxQuantity, `Cannot exceed remaining quantity of ${maxQuantity}`)
        .typeError('Must be a number');
    });

    return Yup.object().shape({
      companyId: Yup.string().required('Company is required'),
      purchaseOrderId: Yup.string().required('Purchase Order is required'),
      shipmentDispatchDate: Yup.date().required('Dispatch Date is required'),
      estimateDeliveryDate: Yup.date()
        .required('Delivery Date is required')
        .min(Yup.ref('shipmentDispatchDate'), 'Delivery Date cannot be before Dispatch Date'),
      shippingCompany: Yup.string().required('Shipping Company is required'),
      trackingNumber: Yup.string().required('Tracking Number is required'),
      trackingUrl: Yup.string().required('Tracking URL is required'),
      notes: Yup.string().max(500, 'Notes cannot exceed 500 characters'),
      ...shipmentItemsSchema,
    });
  };

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await CompanyService.getAllCompanies();
        setCompanies(response.data.content);
      } catch (error) {
        console.error('Error fetching companies:', error);
      }
    };

    const fetchShipmentData = async () => {
      if (shipmentId) {
        try {
          const response = await ShipmentService.getAllShipmentsByShipmentId(
            supplierId,
            shipmentId,
          );
          const shipment = response.data[0];
          setShipmentData({
            companyId: shipment.companyId || '',
            purchaseOrderId: shipment.purchaseOrderId || '',
            orderNo: shipment.orderNo || '',
            shipmentDispatchDate: shipment.shipmentDispatchDate
              ? shipment.shipmentDispatchDate.slice(0, 10)
              : '',
            estimateDeliveryDate: shipment.estimateDeliveryDate
              ? shipment.estimateDeliveryDate.slice(0, 10)
              : '',
            shipFromAddress: shipment.shipFromAddress || '',
            shipToAddress: shipment.shipToAddress || '',
            shippingCompany: shipment.shippingCompany || '',
            trackingNumber: shipment.trackingNumber || '',
            trackingUrl: shipment.trackingURL || '',
            notes: shipment.notes || '',
            shipmentItems: [],
          });

          if (shipment.companyId) {
            const purchaseOrdersResponse = await PurchaseOrderService.getPurchaseOrdersByCompany(
              supplierId,
              shipment.companyId,
            );
            const orders = purchaseOrdersResponse.data || [];
            setPurchaseOrders(orders);

            const matchingOrder = orders.find((order) => order.orderNo === shipment.orderNo);

            if (matchingOrder) {
              setShipmentData((prevData) => ({
                ...prevData,
                purchaseOrderId: matchingOrder.PurchaseOrderId,
              }));
              const purchaseOrderResponse = await PurchaseOrderService.getPurchaseOrderById(
                supplierId,
                matchingOrder.PurchaseOrderId,
              );

              if (purchaseOrderResponse.data && purchaseOrderResponse.data.length > 0) {
                const selectedOrder = purchaseOrderResponse.data[0];
                setOrderItems(selectedOrder.orderItemDetails || []);

                const shipmentItems = (selectedOrder.orderItemDetails || []).map((item) => {
                  const existingShipmentItem = shipment.shipmentItems.find(
                    (si) => si.poDetailId === item.purchaseOrderDetailId,
                  );

                  return {
                    purchaseOrderDetailId: item.purchaseOrderDetailId,
                    partDescription: item.partDescription,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    poShipmentDetailId: existingShipmentItem?.poShipmentDetailId || '',
                    shippedQty: existingShipmentItem?.shippedQty || 0,
                  };
                });

                setShipmentData((prevData) => ({
                  ...prevData,
                  shipmentItems,
                }));
              }
            }
          }
        } catch (error) {
          console.error('Error fetching shipment data:', error);
        }
      }
    };

    fetchCompanies();
    if (shipmentId) {
      fetchShipmentData();
    }
  }, [shipmentId, supplierId]);

  const handleCompanyChange = async (e) => {
    const companyId = e.target.value;
    setShipmentData((prevData) => ({
      ...prevData,
      companyId,
      purchaseOrderId: '',
      shipmentItems: [],
    }));

    if (companyId) {
      try {
        const response = await PurchaseOrderService.getPurchaseOrdersByCompany(
          supplierId,
          companyId,
        );
        setPurchaseOrders(response.data);
        setOrderItems([]);
      } catch (error) {
        console.error('Error fetching purchase orders for company:', error);
        setPurchaseOrders([]);
      }
    } else {
      setPurchaseOrders([]);
      setOrderItems([]);
    }
  };

  const handlePurchaseOrderChange = async (e) => {
    const purchaseOrderId = e.target.value;
    if (!purchaseOrderId) {
      setShipmentData((prevData) => ({
        ...prevData,
        purchaseOrderId: '',
        orderNo: '',
        shipmentItems: [],
      }));
      setOrderItems([]);
      return;
    }

    setShipmentData((prevData) => ({
      ...prevData,
      purchaseOrderId,
      orderNo: '',
      shipmentItems: [],
    }));

    try {
      const response = await PurchaseOrderService.getPurchaseOrderById(supplierId, purchaseOrderId);

      if (!response.data || response.data.length === 0) {
        throw new Error('No purchase order data found');
      }

      const selectedOrder = response.data[0];

      setOrderItems(selectedOrder.orderItemDetails || []);

      const shipmentItems = (selectedOrder.orderItemDetails || []).map((item) => ({
        purchaseOrderDetailId: item.purchaseOrderDetailId,
        partDescription: item.partDescription,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        poShipmentDetailId: item.poShipmentDetailId,
      }));

      setShipmentData((prevData) => ({
        ...prevData,
        shipmentItems,
        orderNo: selectedOrder.orderNo || '',
      }));
    } catch (error) {
      console.error('Error fetching purchase order details:', error);
      setOrderItems([]);
      setShipmentData((prevData) => ({
        ...prevData,
        shipmentItems: [],
        orderNo: '',
      }));
    }
  };

  const handleCancel = () => {
    navigate('/shipment');
  };

  const handleSubmit = async (values) => {
    const requestBody = {
      shipmentId: shipmentId || '',
      companyId: values.companyId,
      orderNo: values.orderNo,
      supplierId,
      purchaseOrderId: values.purchaseOrderId,
      shipmentDispatchDate: `${values.shipmentDispatchDate}T00:00:00.000Z`,
      estimateDeliveryDate: `${values.estimateDeliveryDate}T00:00:00.000Z`,
      shipFromAddress: values.shipFromAddress,
      shipToAddress: values.shipToAddress,
      shippingCompany: values.shippingCompany,
      trackingNumber: values.trackingNumber,
      trackingURL: values.trackingUrl,
      isActive: true,
      notes: values.notes,
      shipmentItems: values.shipmentItems.map((item) => ({
        poDetailId: item.purchaseOrderDetailId,
        shippedQty: Number(item.shippedQty),
        poShipmentDetailId: item.poShipmentDetailId || ' ',
        isActive: true,
      })),
    };

    try {
      let response;
      if (shipmentId) {
        response = await ShipmentService.handleUpdateShipment(requestBody, supplierId, shipmentId);
        toast.dismiss();
        toast.success('Shipment updated successfully');
        console.log('Updated shipment:', response.data);
      } else {
        response = await ShipmentService.handleCreateShipment(requestBody, supplierId);
        toast.dismiss();
        toast.success('Shipment created successfully');
      }
      setTimeout(() => {
        navigate('/shipment');
      }, 1500);
    } catch (error) {
      if (error.response?.data?.errorMessage) {
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
            <CardBody
              style={{ backgroundColor: 'rgb(0, 158, 251)', padding: '12px', color: 'white' }}
            >
              <CardTitle tag="h4" className="mb-0" style={{ fontSize: '14px' }}>
                {shipmentId ? 'Edit Shipment Info' : 'Shipment Info'}
              </CardTitle>
            </CardBody>
            <CardBody>
              <Formik
                initialValues={shipmentData}
                validationSchema={getValidationSchema(orderItems)}
                enableReinitialize
                onSubmit={handleSubmit}
              >
                {({ errors, touched, values, handleChange }) => (
                  <Form>
                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Company<span className="text-danger">*</span>
                          </Label>
                          <Field
                            as="select"
                            name="companyId"
                            className={`form-control${
                              errors.companyId && touched.companyId ? ' is-invalid' : ''
                            }`}
                            onChange={handleCompanyChange}
                          >
                            <option value="">Select Company</option>
                            {companies.map((company) => (
                              <option key={company.companyId} value={company.companyId}>
                                {company.name}
                              </option>
                            ))}
                          </Field>
                          <ErrorMessage
                            name="companyId"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Purchase Order<span className="text-danger">*</span>
                          </Label>

                          <Field
                            as="select"
                            name="purchaseOrderId"
                            className={`form-control${
                              errors.purchaseOrderId && touched.purchaseOrderId ? ' is-invalid' : ''
                            }`}
                            onChange={handlePurchaseOrderChange}
                          >
                            <option value="">Select Purchase Order</option>
                            {purchaseOrders.map((order) => (
                              <option key={order.PurchaseOrderId} value={order.PurchaseOrderId}>
                                {order.orderNo}
                              </option>
                            ))}
                          </Field>
                          <ErrorMessage
                            name="purchaseOrderId"
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
                            Dispatch Date<span className="text-danger">*</span>
                          </Label>
                          <Field
                            type="date"
                            name="shipmentDispatchDate"
                            min={new Date().toISOString().split('T')[0]}
                            className={`form-control${
                              errors.shipmentDispatchDate && touched.shipmentDispatchDate
                                ? ' is-invalid'
                                : ''
                            }`}
                            placeholder="Enter dispatch date"
                          />
                          <ErrorMessage
                            name="shipmentDispatchDate"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Estimate Delivery Date<span className="text-danger">*</span>
                          </Label>
                          <Field
                            type="date"
                            name="estimateDeliveryDate"
                            min={new Date().toISOString().split('T')[0]}
                            className={`form-control${
                              errors.estimateDeliveryDate && touched.estimateDeliveryDate
                                ? ' is-invalid'
                                : ''
                            }`}
                            placeholder="Enter estimate delivery date"
                          />
                          <ErrorMessage
                            name="estimateDeliveryDate"
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
                            Shipping Company<span className="text-danger">*</span>
                          </Label>
                          <Field
                            type="text"
                            name="shippingCompany"
                            className={`form-control${
                              errors.shippingCompany && touched.shippingCompany ? ' is-invalid' : ''
                            }`}
                            placeholder="Enter shipping company"
                            maxLength={200}
                          />
                          <ErrorMessage
                            name="shippingCompany"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Tracking Number<span className="text-danger">*</span>
                          </Label>
                          <Field
                            type="text"
                            name="trackingNumber"
                            className={`form-control${
                              errors.trackingNumber && touched.trackingNumber ? ' is-invalid' : ''
                            }`}
                            placeholder="Enter tracking number"
                            maxLength={200}
                          />
                          <ErrorMessage
                            name="trackingNumber"
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
                            Tracking URL<span className="text-danger">*</span>
                          </Label>
                          <Field
                            type="url"
                            name="trackingUrl"
                            className={`form-control${
                              errors.trackingUrl && touched.trackingUrl ? ' is-invalid' : ''
                            }`}
                            placeholder="https://www.example.com"
                            maxLength={200}
                          />
                          <ErrorMessage
                            name="trackingUrl"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>Notes</Label>
                          <Field
                            as="textarea"
                            name="notes"
                            rows="4"
                            className={`form-control${
                              errors.notes && touched.notes ? ' is-invalid' : ''
                            }`}
                            placeholder="Enter any additional notes here"
                            maxLength={200}
                          />
                          <ErrorMessage name="notes" component="div" className="invalid-feedback" />
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col md="12">
                        <Table bordered responsive size="sm">
                          <thead>
                            <tr>
                              <th>Description</th>
                              <th>Quantity Confirmed</th>
                              <th>Already Shipped</th>
                              <th>Remaining Quantity</th>
                              <th>Price</th>
                              <th>Shipped Quantity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.isArray(orderItems) && orderItems.length > 0 ? (
                              orderItems.map((item, index) => {
                                const alreadyShipped = item.quantityShipped || 0;
                                const remainingQuantity =
                                  (item.quantityConfirmed || 0) - alreadyShipped;
                                return (
                                  <tr key={item.purchaseOrderDetailId}>
                                    <td>{item.partDescription}</td>
                                    <td>{item.quantityConfirmed}</td>
                                    <td>{alreadyShipped}</td>
                                    <td
                                      style={{
                                        color: remainingQuantity > 0 ? 'green' : 'red',
                                        fontWeight: 'bold',
                                      }}
                                    >
                                      {remainingQuantity}
                                    </td>
                                    <td>{item.unitPrice}</td>
                                    <td>
                                      <Field
                                        type="number"
                                        name={`shipmentItems[${index}].shippedQty`}
                                        className={`form-control ${
                                          errors[`shipmentItems[${index}].shippedQty`]
                                            ? 'is-invalid'
                                            : ''
                                        }`}
                                        value={values.shipmentItems[index]?.shippedQty}
                                        onChange={handleChange}
                                        min="0"
                                      />
                                      <ErrorMessage
                                        name={`shipmentItems[${index}].shippedQty`}
                                        component="div"
                                      />
                                      <Field
                                        type="hidden"
                                        name={`shipmentItems[${index}].purchaseOrderDetailId`}
                                        value={item.purchaseOrderDetailId}
                                        maxLength={20}
                                      />
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan="6" className="text-center">
                                  No items found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      </Col>
                    </Row>
                    <Row>
                      <Col md="12" className="text-end">
                        <Button
                          color="secondary"
                          onClick={handleCancel}
                          style={{ marginRight: '10px' }}
                        >
                          Cancel
                        </Button>
                        <Button color="primary" type="submit">
                          {shipmentId ? 'Update Shipment' : 'Register Shipment'}
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

export default ShipmentRegistration;
