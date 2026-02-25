import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardTitle, Row, Col, Button, Label } from 'reactstrap';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { Formik, Form, ErrorMessage, Field } from 'formik';
import * as Yup from 'yup';
import 'react-toastify/dist/ReactToastify.css';
import CatalogItemService from '../../services/CatalogItemService';
import '../CompanyManagement/ReactBootstrapTable.scss';
import CatalogService from '../../services/CatalogService';
import { getEntityId } from '../localStorageUtil';
import MasterDataService from '../../services/MasterDataService';

const CatalogItem = () => {
  const [catalogOptions, setCatalogOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);
  const supplierId = getEntityId();
  const [catalogItemData, setCatalogItemData] = useState({
    CatalogItemId: 0,
    CatalogId: '',
    PartId: '',
    UnitPrice: '',
    Currency: '',
    Description: '',
    Specifications: '',
    ManufacturerName: '',
    ManufacturerURL: '',
    ProductURL: '',
    QuantityPerUnit: '',
    ImageId: '',
    ProductImageURL: '',
    UnitOfMeasurement: '',
    InStock: '',
    IsAvailable: true,
    Supplier: {
    supplierId: supplierId
  }
  });
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const redirectToDashboard = queryParams.get('dashboard') === 'true';

  const navigate = useNavigate();
  const { CatalogItemId } = useParams();

  const fetchCatalogs = async () => {
    try {
      const response = await CatalogService.getSupplierCatalogs(supplierId);
      const data = response?.data;
      const normalized = Array.isArray(data)
        ? data
        : Array.isArray(data?.content)
        ? data.content
        : Array.isArray(data?.data)
        ? data.data
        : [];
      setCatalogOptions(normalized);
    } catch (error) {
      console.error('Error fetching catalogs:', error);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const response = await MasterDataService.getAllCurrencies();
      const formattedCurrencies = response.data.map((currency) => ({
        code: currency.currencyCode,
        symbol: currency.symbol,
        display: `${currency.currencyCode} - ${currency.symbol}`,
      }));
      setCurrencyOptions(formattedCurrencies);
      setLoadingCurrencies(false);
    } catch (error) {
      console.error('Error fetching currencies:', error);
      setLoadingCurrencies(false);
    }
  };

  useEffect(() => {
    fetchCatalogs();
    fetchCurrencies();
  }, []);

  useEffect(() => {
    const fetchCatalogItem = async () => {
      if (CatalogItemId) {
        try {
          const catalogItems = await CatalogItemService.getCatalogItemById(CatalogItemId);
          if (catalogItems && catalogItems.length > 0) {
            setCatalogItemData(catalogItems[0]);
          }
        } catch (error) {
          console.error('Error fetching catalog item:', error);
        }
      }
    };

    fetchCatalogItem();
  }, [CatalogItemId]);

  const handleSubmit = async (values) => {
    try {
      const catalogItemToSubmit = {
        ...values,
        InStock: values.InStock,
        IsAvailable: true,
        UnitOfMeasurement: values.UnitOfMeasurement,
        UnitPrice: values.UnitPrice || 0,
        QuantityPerUnit: values.QuantityPerUnit || 1,
        ImageId: values.ImageId || 0,
      };

      if (CatalogItemId) {
        const response = await CatalogItemService.updateCatalogItem(
          CatalogItemId,
          catalogItemToSubmit,
        );
        console.log('Catalog item updated successfully:', response.data);
        toast.dismiss();
        toast.success('Catalog item updated successfully!');
      } else {
        const response = await CatalogItemService.createCatalogItem(catalogItemToSubmit);
        console.log('Catalog item created successfully:', response.data);
        toast.dismiss();
        toast.success('Catalog item created successfully!');
      }

      setTimeout(() => {
        if (redirectToDashboard) {
          navigate('/supplier-dashboard');
        } else {
          navigate('/catalog-item-management');
        }
      }, 1000);
    } catch (error) {
      if (error.response && error.response.data && error.response.data.errorMessage) {
        toast.dismiss();
        toast.error(error.response.data.errorMessage);
      } else {
        toast.dismiss();
        toast.error('An unexpected error occurred');
      }
    }
  };

  const handleCancel = () => {
    if (redirectToDashboard) {
      navigate('/supplier-dashboard');
    } else {
      navigate('/catalog-item-management');
    }
  };

  const validationSchema = Yup.object().shape({
    CatalogId: Yup.string().required('Catalog ID is required'),
    PartId: Yup.string().required('Part ID is required'),
    UnitPrice: Yup.number().required('Unit Price is required').min(0, 'Price must be positive'),
    Currency: Yup.string().required('Currency is required'),
    Description: Yup.string().required('Description is required'),
    Specifications: Yup.string().required('Specifications is required'),
    ManufacturerName: Yup.string().required('Manufacturer Name is required'),
    ProductURL: Yup.string().required('Product URL is required'),
    ProductImageURL: Yup.string().required('Product Image URL is required'),
    InStock: Yup.string().required('In Stock is required'),
    QuantityPerUnit: Yup.number()
      .required('Quantity Per Unit is required')
      .min(1, 'Must be at least 1'),
    UnitOfMeasurement: Yup.string().required('Unit of Measurement is required'),
    ManufacturerURL: Yup.string().required('Manufacturer URL is required'),
  });

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
                {CatalogItemId ? 'Edit Catalog Item' : 'Create Catalog Item'}
              </CardTitle>
            </CardBody>
            <CardBody>
              <Formik
                initialValues={catalogItemData}
                enableReinitialize
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
              >
                {({ errors, touched, setFieldTouched, handleChange }) => (
                  <Form>
                    <Row>
                      <Col md="4">
                        <div className="form-group mb-3">
                          <Label htmlFor="CatalogId">
                            Catalog<span className="text-danger">*</span>
                          </Label>
                          <Field
                            as="select"
                            id="CatalogId"
                            name="CatalogId"
                            className={`form-control${
                              touched.CatalogId && errors.CatalogId ? ' is-invalid' : ''
                            }`}
                          >
                            <option value="">Select Catalog</option>
                            {(catalogOptions || []).map((catalog) => (
                              <option key={catalog.catalogId} value={catalog.catalogId}>
                                {catalog.name}
                              </option>
                            ))}
                          </Field>
                          <ErrorMessage
                            name="CatalogId"
                            component="div"
                            className="invalid-feedback"
                          />
                        </div>
                      </Col>

                      <Col md="4">
                        <div className="form-group mb-3">
                          <Label htmlFor="PartId">
                            Part ID<span className="text-danger">*</span>
                          </Label>
                          <Field
                            type="text"
                            id="PartId"
                            name="PartId"
                            placeholder="Enter Part ID"
                            className={`form-control${
                              touched.PartId && errors.PartId ? ' is-invalid' : ''
                            }`}
                            onChange={(e) => {
                              handleChange(e);
                              setFieldTouched('PartId', false);
                            }}
                            onBlur={() => setFieldTouched('PartId', true)}
                            maxLength={200}
                          />
                          <ErrorMessage
                            name="PartId"
                            component="div"
                            className="invalid-feedback"
                          />
                        </div>
                      </Col>
                      <Col md="4">
                        <div className="form-group mb-3">
                          <Label htmlFor="UnitPrice">
                            Unit Price<span className="text-danger">*</span>
                          </Label>
                          <Field
                            type="text"
                            id="UnitPrice"
                            name="UnitPrice"
                            placeholder="Enter Unit Price"
                            className={`form-control${
                              touched.UnitPrice && errors.UnitPrice ? ' is-invalid' : ''
                            }`}
                            onChange={(e) => {
                              const { value } = e.target;
                              const sanitizedValue = value
                                .replace(/[^0-9.]/g, '')
                                .replace(/(\..*?)\./g, '$1');
                              if (sanitizedValue.length <= 10) {
                                handleChange({
                                  target: {
                                    name: 'UnitPrice',
                                    value: sanitizedValue,
                                  },
                                });
                              }
                            }}
                            onBlur={(e) => {
                              let { value } = e.target;
                              if (value && !Number.isNaN(parseFloat(value))) {
                                value = parseFloat(value).toFixed(2);
                                handleChange({
                                  target: {
                                    name: 'UnitPrice',
                                    value,
                                  },
                                });
                              }
                              setFieldTouched('UnitPrice', true);
                            }}
                          />
                          <ErrorMessage
                            name="UnitPrice"
                            component="div"
                            className="invalid-feedback"
                          />
                        </div>
                      </Col>

                      <Col md="4">
                        <div className="form-group mb-3">
                          <Label htmlFor="Currency">
                            Currency<span className="text-danger">*</span>
                          </Label>
                          {loadingCurrencies ? (
                            <div className="text-muted">Loading currencies...</div>
                          ) : (
                            <>
                              <Field
                                as="select"
                                name="Currency"
                                id="Currency"
                                className={`form-control${
                                  touched.Currency && errors.Currency ? ' is-invalid' : ''
                                }`}
                                onChange={(e) => {
                                  handleChange(e);
                                  setFieldTouched('Currency', false);
                                }}
                                onBlur={() => setFieldTouched('Currency', true)}
                              >
                                <option value="">Select Currency</option>
                                {currencyOptions.map((currency) => (
                                  <option key={currency.code} value={currency.code}>
                                    {currency.display}
                                  </option>
                                ))}
                              </Field>
                              <ErrorMessage
                                name="Currency"
                                component="div"
                                className="invalid-feedback"
                              />
                            </>
                          )}
                        </div>
                      </Col>
                      <Col md="4">
                        <div className="form-group mb-3">
                          <Label htmlFor="Description">
                            Description<span className="text-danger">*</span>
                          </Label>
                          <Field
                            type="text"
                            id="Description"
                            name="Description"
                            placeholder="Enter Description"
                            className={`form-control${
                              touched.Description && errors.Description ? ' is-invalid' : ''
                            }`}
                            onChange={handleChange}
                            maxLength={200}
                          />
                          <ErrorMessage
                            name="Description"
                            component="div"
                            className="invalid-feedback"
                          />
                        </div>
                      </Col>
                      <Col md="4">
                        <div className="form-group mb-3">
                          <Label htmlFor="Specifications">
                            Specifications<span className="text-danger">*</span>
                          </Label>
                          <Field
                            type="text"
                            id="Specifications"
                            name="Specifications"
                            placeholder="Enter Specifications"
                            className={`form-control${
                              touched.Specifications && errors.Specifications ? ' is-invalid' : ''
                            }`}
                            onChange={handleChange}
                            maxLength={200}
                          />
                          <ErrorMessage
                            name="Specifications"
                            component="div"
                            className="invalid-feedback"
                          />
                        </div>
                      </Col>
                      <Col md="4">
                        <div className="form-group mb-3">
                          <Label htmlFor="ManufacturerName">
                            Manufacturer Name<span className="text-danger">*</span>
                          </Label>
                          <Field
                            type="text"
                            id="ManufacturerName"
                            name="ManufacturerName"
                            placeholder="Enter Manufacturer Name"
                            className={`form-control${
                              touched.ManufacturerName && errors.ManufacturerName
                                ? ' is-invalid'
                                : ''
                            }`}
                            onChange={handleChange}
                            maxLength={200}
                          />
                          <ErrorMessage
                            name="ManufacturerName"
                            component="div"
                            className="invalid-feedback"
                          />
                        </div>
                      </Col>
                      <Col md="4">
                        <div className="form-group mb-3">
                          <Label htmlFor="ManufacturerURL">
                            Manufacturer URL<span className="text-danger">*</span>
                          </Label>
                          <Field
                            type="text"
                            id="ManufacturerURL"
                            name="ManufacturerURL"
                            placeholder="Enter Manufacturer URL"
                            className={`form-control${
                              touched.ManufacturerURL && errors.ManufacturerURL ? ' is-invalid' : ''
                            }`}
                            onChange={(e) => {
                              handleChange(e);
                              setFieldTouched('ManufacturerURL', false);
                            }}
                            onBlur={() => setFieldTouched('ManufacturerURL', true)}
                            maxLength={200}
                          />
                          <ErrorMessage
                            name="ManufacturerURL"
                            component="div"
                            className="invalid-feedback"
                          />
                        </div>
                      </Col>
                      <Col md="4">
                        <div className="form-group mb-3">
                          <Label htmlFor="ProductURL">
                            Product URL<span className="text-danger">*</span>
                          </Label>
                          <Field
                            type="text"
                            id="ProductURL"
                            name="ProductURL"
                            placeholder="Enter Product URL"
                            className={`form-control${
                              touched.ProductURL && errors.ProductURL ? ' is-invalid' : ''
                            }`}
                            onChange={handleChange}
                            maxLength={200}
                          />
                          <ErrorMessage
                            name="ProductURL"
                            component="div"
                            className="invalid-feedback"
                          />
                        </div>
                      </Col>
                      <Col md="4">
                        <div className="form-group mb-3">
                          <Label htmlFor="UnitOfMeasurement">
                            Unit of Measurement<span className="text-danger">*</span>
                          </Label>
                          <Field
                            as="select"
                            id="UnitOfMeasurement"
                            name="UnitOfMeasurement"
                            className={`form-control${
                              touched.UnitOfMeasurement && errors.UnitOfMeasurement
                                ? ' is-invalid'
                                : ''
                            }`}
                            onChange={handleChange}
                          >
                            <option value="">Select Unit of Measurement</option>
                            <option value="Kilogram">Kilogram</option>
                            <option value="Gram">Gram</option>
                            <option value="Pound">Pound</option>
                            <option value="Liter">Liter</option>
                            <option value="Milliliter">Milliliter</option>
                            <option value="Piece">Piece</option>
                          </Field>
                          <ErrorMessage
                            name="UnitOfMeasurement"
                            component="div"
                            className="invalid-feedback"
                          />
                        </div>
                      </Col>
                      <Col md="4">
                        <div className="form-group mb-3">
                          <Label htmlFor="QuantityPerUnit">
                            Quantity Per Unit<span className="text-danger">*</span>
                          </Label>
                          <Field
                            type="number"
                            id="QuantityPerUnit"
                            name="QuantityPerUnit"
                            placeholder="Enter Quantity Per Unit"
                            className={`form-control${
                              touched.QuantityPerUnit && errors.QuantityPerUnit ? ' is-invalid' : ''
                            }`}
                            min="1"
                            onChange={handleChange}
                          />
                          <ErrorMessage
                            name="QuantityPerUnit"
                            component="div"
                            className="invalid-feedback"
                          />
                        </div>
                      </Col>
                      <Col md="4">
                        <div className="form-group mb-3">
                          <Label htmlFor="ProductImageURL">
                            Product Image URL<span className="text-danger">*</span>
                          </Label>
                          <Field
                            type="text"
                            id="ProductImageURL"
                            name="ProductImageURL"
                            placeholder="Enter Product Image URL"
                            className={`form-control${
                              touched.ProductImageURL && errors.ProductImageURL ? ' is-invalid' : ''
                            }`}
                            onChange={handleChange}
                            maxLength={200}
                          />
                          <ErrorMessage
                            name="ProductImageURL"
                            component="div"
                            className="invalid-feedback"
                          />
                        </div>
                      </Col>

                      <Col md="4">
                        <div className="form-group mb-3">
                          <Label htmlFor="InStock">
                            In Stock<span className="text-danger">*</span>
                          </Label>
                          <Field
                            as="select"
                            id="InStock"
                            name="InStock"
                            className={`form-control${
                              touched.InStock && errors.InStock ? ' is-invalid' : ''
                            }`}
                            onChange={(e) => {
                              handleChange(e);
                              setFieldTouched('InStock', false);
                            }}
                            onBlur={() => setFieldTouched('InStock', true)}
                          >
                            <option value="">Select</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </Field>
                          <ErrorMessage
                            name="InStock"
                            component="div"
                            className="invalid-feedback"
                          />
                        </div>
                      </Col>
                    </Row>

                    <Row>
                      <Col className="text-end">
                        <Button
                          color="secondary"
                          onClick={handleCancel}
                          className="button-spacing"
                          style={{ marginRight: '10px' }}
                        >
                          Back
                        </Button>
                        <Button color="primary" type="submit">
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

export default CatalogItem;
