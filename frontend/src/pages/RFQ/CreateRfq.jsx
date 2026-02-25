import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Label,
  Button,
  FormGroup,
  Input,
  Table,
  Card,
  CardHeader,
  CardBody,
  Row,
  Col,
} from 'reactstrap';
import { Formik, Form as FormikForm, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { FaTrash, FaPaperclip } from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { debounce } from 'lodash';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CompanyService from '../../services/CompanyService';
import ClassService from '../../services/ClassService';
import LocationService from '../../services/LocationService';
import DepartmentService from '../../services/DepartmentService';
import GLAccountService from '../../services/GLaccountService';
import ProjectService from '../../services/ProjectService';
import { getEntityId } from '../localStorageUtil';
import FileUploadService from '../../services/FileUploadService';
import AddressService from '../../services/AddressService';
import RfqItemModal from './RfqItemModal';
import SupplierDialog from './RfqSupplierModal';
import InternalItemService from '../../services/InternalItemService';
import SupplierService from '../../services/SupplierService';
import RqfService from '../../services/RfqService';
import { computeDefaultsMap } from '../../utils/autoDefaults';

const CreateRFQ = () => {
  const { rfqId } = useParams();
  const [isEditMode, setIsEditMode] = useState(false);
  const [initialData, setInitialData] = useState(null);
  const formikRef = useRef();
  const navigate = useNavigate();
  const companyId = getEntityId();
  const initialValues = {
    title: '',
    objective: '',
    requirements: '',
    shipToAddressId: '',
    classId: '',
    locationId: '',
    departmentId: '',
    glAccountId: '',
    projectId: '',
    purchaseType: '',
    requiredAt: undefined,
  };

  const [formData, setFormData] = useState({
    rfqItems: [],
    suppliers: [],
    attachments: [],
  });

  const [classes, setClasses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [glAccounts, setGlAccounts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [filteredGlAccounts, setFilteredGlAccounts] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedGlAccountId, setSelectedGlAccountId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState('');

  const [companySettings, setCompanySettings] = useState({
    classEnabled: false,
    locationEnabled: false,
    departmentEnabled: false,
    gLAccountEnabled: false,
    projectEnabled: false,
  });

  const [loading, setLoading] = useState({
    classes: true,
    locations: true,
    departments: true,
    glAccounts: true,
    projects: true,
    addresses: true,
  });

  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [newSupplier, setNewSupplier] = useState({});
  const [titleAvailability, setTitleAvailability] = useState({
    isChecking: false,
    isAvailable: null,
    message: '',
  });
  const isDisabled = isEditMode && initialData?.rfqStatus !== 'created';

  const defaultsAppliedRef = useRef(false);

  const validationSchema = Yup.object({
    title: Yup.string().required('RFQ Title is required'),
    objective: Yup.string().required('Objective is required'),
    requirements: Yup.string().required('Justification are required'),
    shipToAddressId: Yup.string().required('Ship To Address is required'),
    requiredAt: Yup.date().required('Required Date is required').nullable(),
    purchaseType: Yup.string().required('Purchase Type is required'),
    classId: companySettings.classEnabled
      ? Yup.string().required('Class is required')
      : Yup.string(),
    locationId: companySettings.locationEnabled
      ? Yup.string().required('Location is required')
      : Yup.string(),
    departmentId: companySettings.departmentEnabled
      ? Yup.string().required('Department is required')
      : Yup.string(),
    glAccountId: companySettings.gLAccountEnabled
      ? Yup.string().required('GL Account is required')
      : Yup.string(),
    projectId: companySettings.projectEnabled
      ? Yup.string().required('Project is required')
      : Yup.string(),
  });

  const addExistingItem = (item) => {
    if (!item?.partId) {
      toast.dismiss();
      toast.error('Invalid item selected');
      return;
    }

    const existingItem = {
      rfqItemId: Date.now(),
      partId: item.partId,
      description: item.description,
      quantity: 1,
      uom: item.defaultUom || 'Each',
      notes: '',
      internalItemId: item.internalItemId,
    };

    setFormData((prev) => ({
      ...prev,
      rfqItems: [...prev.rfqItems, existingItem],
    }));
  };

  const checkTitleAvailability = useCallback(
    debounce(async (title) => {
      if (!title || title.trim().length < 3) {
        setTitleAvailability({
          isChecking: false,
          isAvailable: null,
          message: '',
        });
        return;
      }

      setTitleAvailability((prev) => ({
        ...prev,
        isChecking: true,
        message: 'Checking availability...',
      }));

      try {
        const response = await RqfService.checkTitleAvailability(companyId, title.trim());
        const { available } = response.data;

        setTitleAvailability({
          isChecking: false,
          isAvailable: available,
          message: available ? '✓ Title is available' : '✗ Title is already taken',
        });
      } catch (error) {
        setTitleAvailability({
          isChecking: false,
          isAvailable: null,
          message: 'Error checking availability',
        });
      }
    }, 1000),
    [companyId],
  );

  const handleBack = () => {
    navigate('/dashboard', {
      state: { activeMainTab: 'rfqs' }
    });
  };

  // Set selected IDs when initialData is loaded
  useEffect(() => {
    if (initialData) {
      setSelectedDepartmentId(initialData.departmentId || '');
      setSelectedGlAccountId(initialData.glAccountId || '');
    }
  }, [initialData]);

  const fetchRfqDetails = async (id, setValues) => {
    try {
      const response = await RqfService.getRfqById(companyId, id);
      const { data } = response;
      setInitialData(data);

      const suppliersWithDetails = await Promise.all(
        (data.suppliers || []).map(async (supplier) => {
          try {
            const supplierResponse = await SupplierService.getSupplierById(supplier.supplierId);
            const mappedAttachments = (supplier.attachments || []).map((att) => ({
              fileId: att.fileId,
              fileName: att.fileName || `Attachment ${att.fileId}`,
              attachmentId: att.attachmentId,
              rfqSupplierAttachmentId: att.rfqSupplierAttachmentId,
              linkedEntityId: att.linkedEntityId,
            }));

            return {
              ...supplier,
              name: supplierResponse.data[0]?.name || '',
              email: supplierResponse.data[0]?.email || '',
              primaryContact: supplierResponse.data[0]?.primaryContact || '',
              attachments: mappedAttachments,
            };
          } catch (error) {
            console.error('Error fetching supplier details:', error);
            const fallbackAttachments = (supplier.attachments || []).map((att) => ({
              fileId: att.fileId,
              fileName: att.fileName || `Attachment ${att.fileId}`,
              attachmentId: att.attachmentId,
              linkedEntityId: att.linkedEntityId,
            }));

            return {
              ...supplier,
              name: 'Unknown Supplier',
              email: '',
              primaryContact: '',
              attachments: fallbackAttachments,
            };
          }
        }),
      );

      setFormData({
        rfqItems: (data.rfqItems || []).map((item) => ({
          ...item,
          attachments: (item.attachments || []).map((att) => ({
            fileId: att.fileId || att.attachmentId,
            fileName: att.fileName || `Attachment ${att.fileId || att.attachmentId}`,
          })),
        })),
        suppliers: suppliersWithDetails,
        attachments: (data.attachments || []).map((att) => ({
          fileId: att.fileId || att.attachmentId,
          fileName: att.fileName || `Attachment ${att.fileId || att.attachmentId}`,
        })),
      });

      if (data) {
        setValues({
          title: data.title || '',
          objective: data.objective || '',
          requirements: data.requirements || '',
          shipToAddressId: data.shipToAddressId || '',
          classId: data.classId || '',
          locationId: data.locationId || '',
          departmentId: data.departmentId || '',
          glAccountId: data.glAccountId || '',
          projectId: data.projectId || '',
          requiredAt: data.requiredAt ? new Date(data.requiredAt) : undefined,
          purchaseType: data.purchaseType || '',
        });
      }
    } catch (error) {
      console.error('Error fetching RFQ details:', error);
      toast.dismiss();
      toast.error('Failed to load RFQ details');
    }
  };

  useEffect(() => {
    if (rfqId && formikRef.current) {
      setIsEditMode(true);
      fetchRfqDetails(rfqId, formikRef.current.setValues);
    }
  }, [rfqId]);

  useEffect(() => {
    if (rfqId) {
      setIsEditMode(true);
    }
  }, [rfqId]);

  useEffect(() => {
    if (!companyId) return;

    const fetchAllData = async () => {
      try {
        const [
          classesRes,
          locationsRes,
          departmentsRes,
          glAccountsRes,
          projectsRes,
          addressesRes,
          settingsRes,
        ] = await Promise.all([
          ClassService.getAllClass(companyId),
          LocationService.getAllLocation(companyId),
          DepartmentService.getAllDepartment(companyId),
          GLAccountService.getAllGLAccount(companyId),
          ProjectService.getAllProjects(companyId),
          AddressService.getAllAddressByCompany(companyId, 'SHIPPING'),
          CompanyService.getCompanySetting(companyId),
        ]);

        setClasses(classesRes.data || []);
        setLocations(locationsRes.data || []);
        setDepartments(departmentsRes.data || []);
        setGlAccounts(glAccountsRes.data || []);
        setProjects(projectsRes.data || []);
        setAddresses(addressesRes.data || []);
        setCompanySettings(settingsRes.data || {});

        setLoading({
          classes: false,
          locations: false,
          departments: false,
          glAccounts: false,
          projects: false,
          addresses: false,
        });

        if (!rfqId && formikRef.current && !defaultsAppliedRef.current) {
          try {
            const defaults = computeDefaultsMap({
              departmentId: departmentsRes.data || [],
              projectId: projectsRes.data || [],
              glAccountId: glAccountsRes.data || [],
              classId: classesRes.data || [],
              locationId: locationsRes.data || [],
              shipToAddressId: addressesRes.data || [],
            });

            const settings = settingsRes.data || {};

            if (defaults.departmentId && settings.departmentEnabled) {
              formikRef.current.setFieldValue('departmentId', String(defaults.departmentId));
              setSelectedDepartmentId(String(defaults.departmentId));
            }

            if (defaults.glAccountId && settings.gLAccountEnabled) {
              formikRef.current.setFieldValue('glAccountId', String(defaults.glAccountId));
              setSelectedGlAccountId(String(defaults.glAccountId));
            }

            if (defaults.classId && settings.classEnabled) {
              formikRef.current.setFieldValue('classId', String(defaults.classId));
              setSelectedClassId(String(defaults.classId));
            }

            if (defaults.locationId && settings.locationEnabled) {
              formikRef.current.setFieldValue('locationId', String(defaults.locationId));
              setSelectedLocationId(String(defaults.locationId));
            }

            if (defaults.projectId && settings.projectEnabled) {
              formikRef.current.setFieldValue('projectId', String(defaults.projectId));
              setSelectedProjectId(String(defaults.projectId));
            }

            // Always allow shipToAddressId defaulting when available
            if (defaults.shipToAddressId) {
              formikRef.current.setFieldValue('shipToAddressId', String(defaults.shipToAddressId));
              setSelectedAddressId(String(defaults.shipToAddressId));
            }

            defaultsAppliedRef.current = true;
          } catch (err) {
            console.error('Error applying RFQ defaults:', err);
          }
        }
      } catch (error) {
        console.error('Error fetching dropdown data:', error);
      }
    };

    fetchAllData();
  }, [companyId]);

  const fetchProducts = async () => {
    try {
      const response = await InternalItemService.getAllActiveItems(companyId);
      setProducts(response || []);
    } catch (error) {
      console.error('Error fetching internal items:', error);
      toast.dismiss();
      toast.error(error?.response?.data?.errorMessage || 'Failed to fetch internal items');
    }
  };

  const handleSubmit = async (values) => {
    if (isDisabled) {
      toast.dismiss();
      toast.error('RFQ cannot be modified in its current status');
      return;
    }

    if (formData.suppliers.length < 3) {
      toast.dismiss();
      toast.error('At least 3 suppliers are required');
      return;
    }

    if (
      !values.title ||
      !values.requiredAt ||
      formData.rfqItems.length === 0 ||
      formData.suppliers.length === 0
    ) {
      toast.dismiss();
      toast.error('Please fill in all required fields and add at least one item and one supplier.');
      return;
    }

    const requestBody = {
      title: values.title,
      objective: values.objective,
      requirements: values.requirements,
      purchaseType: values.purchaseType,
      shipToAddressId: Number(values.shipToAddressId),
      classId: companySettings.classEnabled ? Number(values.classId) : null,
      locationId: companySettings.locationEnabled ? Number(values.locationId) : null,
      departmentId: companySettings.departmentEnabled ? Number(values.departmentId) : null,
      glAccountId: companySettings.gLAccountEnabled ? Number(values.glAccountId) : null,
      projectId: companySettings.projectEnabled ? Number(values.projectId) : null,
      requiredAt: values.requiredAt,
      attachments: formData.attachments.map((att) => ({
        fileId: att.fileId,
      })),
      rfqItems: formData.rfqItems.map((item) => ({
        partId: item.partId,
        description: item.description,
        quantity: Number(item.quantity),
        uom: item.uom,
        notes: item.notes,
        attachments: (item.attachments || []).map((att) => ({
          fileId: att.fileId,
        })),
      })),
      suppliers: formData.suppliers.map((supplier) => ({
        supplierId: supplier.supplierId,
        rfqSupplierId: isEditMode ? supplier.rfqSupplierId : undefined,
        email: supplier.email,
        attachments: (supplier.attachments || []).map((attachment) => ({
          fileId: attachment.fileId,
          attachmentId: isEditMode ? attachment.attachmentId : undefined,
          rfqSupplierAttachmentId: isEditMode ? attachment.rfqSupplierAttachmentId : undefined,
        })),
      })),
    };

    try {
      let response;
      if (isEditMode) {
        response = await RqfService.updateRfq(companyId, rfqId, requestBody);
      } else {
        response = await RqfService.createRfq(companyId, requestBody);
      }

      if (response.status === 200) {
        toast.dismiss();
        toast.success(`RFQ ${isEditMode ? 'updated' : 'created'} successfully!`);
        setTimeout(() => {
          navigate('/dashboard', {
            state: { activeMainTab: 'rfqs' }
          });
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating RFQ:', error);
      toast.dismiss();
      toast.error(error?.response?.data?.errorMessage || 'Failed to create RFQ.');
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchProducts();
    }
  }, [companyId]);

  useEffect(() => {
    return () => {
      checkTitleAvailability.cancel();
    };
  }, [checkTitleAvailability]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await SupplierService.getAllSuppliersPaginated({ pageSize: 1000 });
        setSuppliers(response.data?.content || response.data || []);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        toast.dismiss();
        toast.error('Failed to fetch suppliers');
      }
    };

    fetchSuppliers();
  }, []);

  // Filter GL Accounts when Department is selected
  useEffect(() => {
    if (companySettings.departmentEnabled && selectedDepartmentId) {
      DepartmentService.getgLAccountForDepartment(companyId, selectedDepartmentId)
        .then((response) => {
          setFilteredGlAccounts(response.data || []);
        })
        .catch((error) => {
          console.error('Error fetching GL accounts:', error);
          setFilteredGlAccounts(glAccounts);
        });
    }
  }, [selectedDepartmentId, companySettings.departmentEnabled, companyId, glAccounts]);

  // Filter Departments when GL Account is selected
  useEffect(() => {
    if (companySettings.gLAccountEnabled && selectedGlAccountId) {
      GLAccountService.getDepartmentForgLAccount(companyId, selectedGlAccountId)
        .then((response) => {
          setFilteredDepartments(response.data || []);
        })
        .catch((error) => {
          console.error('Error fetching departments:', error);
          setFilteredDepartments(departments);
        });
    }
  }, [selectedGlAccountId, companySettings.gLAccountEnabled, companyId, departments]);

  const addExistingSupplier = (supplier) => {
    if (!supplier?.supplierId) {
      toast.dismiss();
      toast.error('Invalid supplier selected');
      return;
    }

    const existingSuppliers = {
      rfqSupplierId: Date.now(),
      supplierId: supplier.supplierId,
      name: supplier.name,
      email: supplier.email,
      primaryContact: supplier.primaryContact,
    };

    setFormData((prev) => ({
      ...prev,
      suppliers: [...prev.suppliers, existingSuppliers],
    }));
  };

  const removeItem = (id) => {
    setFormData((prev) => ({
      ...prev,
      rfqItems: prev.rfqItems.filter((item) => item.rfqItemId !== id),
    }));
  };

  const removeSupplier = (id) => {
    if (isDisabled) return;

    setFormData((prev) => ({
      ...prev,
      suppliers: prev.suppliers.filter(
        (supplier) => supplier.rfqSupplierId !== id
      ),
    }));
  };


  const renderDropdown = (options, isLoading, placeholder = 'Select', name, disabled = false) => {
    if (isLoading) {
      return (
        <Input type="select" disabled>
          <option>Loading...</option>
        </Input>
      );
    }

    return (
      <Field as={Input} type="select" className="form-select-sm" name={name} disabled={disabled}>
        <option value="">{placeholder}</option>
        {options.map((option, index) => (
          <option key={option.addressId || option[name] || index} value={option.addressId || option[name]}>
            {option.name || `${option.addressLine1}, ${option.city} ${option.postalCode}`.trim()}
          </option>
        ))}
      </Field>
    );
  };

  return (
    <>
      <div className="create-rfq-page">
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
        <Formik
          innerRef={formikRef}
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ errors, touched }) => (
            <FormikForm>
              <Card className="mb-4">
                <CardHeader
                  style={{ backgroundColor: 'rgb(0, 158, 251)', padding: '12px', color: 'white' }}
                >
                  <div className="d-flex align-items-center">
                    <h5 className="mb-0">{isEditMode ? 'Edit RFQ' : 'Create New RFQ'}</h5>
                  </div>
                </CardHeader>
                <CardBody>
                  <Row>
                    <Col md="3">
                      <FormGroup>
                        <Label for="title">
                          RFQ Title <span style={{ color: 'red' }}>*</span>
                        </Label>
                        <Field
                          id="title"
                          name="title"
                          as={Input}
                          type="text"
                          placeholder="Enter title"
                          className={`form-control form-control-sm ${errors.title && touched.title ? 'is-invalid' : ''
                            }`}
                          disabled={isDisabled}
                          onChange={(e) => {
                            const { value } = e.target;
                            formikRef.current.setFieldValue('title', value);
                            if (!isEditMode) {
                              checkTitleAvailability(value);
                            }
                          }}
                        />
                        <ErrorMessage name="title" component="div" className="invalid-feedback" />
                        {!isEditMode && titleAvailability.message && (
                          <div
                            className={`mt-1 text-sm ${titleAvailability.isChecking
                              ? 'text-info'
                              : titleAvailability.isAvailable === true
                                ? 'text-success'
                                : titleAvailability.isAvailable === false
                                  ? 'text-danger'
                                  : 'text-warning'
                              }`}
                            style={{ fontSize: '12px' }}
                          >
                            {titleAvailability.isChecking && (
                              <i className="fas fa-spinner fa-spin mr-1"></i>
                            )}
                            {titleAvailability.message}
                          </div>
                        )}
                      </FormGroup>
                    </Col>
                    <Col md="3">
                      <FormGroup>
                        <Label for="requiredAt">
                          Required Date <span style={{ color: 'red' }}>*</span>
                        </Label>
                        <Field name="requiredAt">
                          {({ field, form: { setFieldValue } }) => (
                            <Input
                              {...field}
                              type="date"
                              id="requiredAt"
                              disabled={isDisabled}
                              className={
                                errors.requiredAt && touched.requiredAt ? 'is-invalid' : ''
                              }
                              value={
                                field.value
                                  ? new Date(field.value).toISOString().split('T')[0]
                                  : initialData?.requiredAt
                                    ? new Date(initialData.requiredAt).toISOString().split('T')[0]
                                    : ''
                              }
                              onChange={(e) => {
                                const date = e.target.value ? new Date(e.target.value) : null;
                                setFieldValue('requiredAt', date);
                              }}
                            />
                          )}
                        </Field>
                        <ErrorMessage
                          name="requiredAt"
                          component="div"
                          className="invalid-feedback"
                        />
                      </FormGroup>
                    </Col>
                    <Col md="2">
                      <FormGroup>
                        <Label for="purchaseType">
                          Purchase Type <span className="text-danger">*</span>
                        </Label>
                        <Field
                          as="select"
                          name="purchaseType"
                          id="purchaseType"
                          className={`form-control form-control-sm ${touched.purchaseType && errors.purchaseType ? 'is-invalid' : ''
                            }`}
                        >
                          <option value="">Select</option>
                          <option value="OPEX">OPEX</option>
                          <option value="CAPEX">CAPEX</option>
                        </Field>
                        <ErrorMessage
                          name="purchaseType"
                          component="div"
                          className="invalid-feedback"
                        />
                      </FormGroup>
                    </Col>
                    <Col md="4">
                      <FormGroup>
                        <Label for="attachment">Attachment</Label>
                        <Input
                          id="attachment"
                          type="file"
                          className="form-control form-control-sm"
                          disabled={isDisabled}
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              try {
                                const response = await FileUploadService.uploadFile(
                                  companyId,
                                  file,
                                );
                                setFormData((prev) => ({
                                  ...prev,
                                  attachments: [
                                    ...prev.attachments,
                                    {
                                      fileId: response.data.fileId,
                                      fileName: file.name,
                                    },
                                  ],
                                }));
                              } catch (error) {
                                console.error('Error uploading file:', error);
                              }
                            }
                          }}
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                        {formData.attachments && formData.attachments.length > 0 && (
                          <div style={{ marginTop: '4px', fontSize: '11px' }}>
                            {formData.attachments.map((attachment, index) => (
                              <div
                                key={attachment.fileId || index}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <span>{attachment.fileName}</span>
                                <Button
                                  size="sm"
                                  color="link"
                                  className="text-danger p-0 ml-1"
                                  disabled={isDisabled}
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      attachments: prev.attachments.filter(
                                        (att) => att.fileId !== attachment.fileId,
                                      ),
                                    }));
                                  }}
                                >
                                  ×
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </FormGroup>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="objective">
                          Objective <span style={{ color: 'red' }}>*</span>
                        </Label>
                        <Field
                          id="objective"
                          name="objective"
                          disabled={isDisabled}
                          as={Input}
                          type="textarea"
                          placeholder="Describe the objective of this RFQ"
                          rows={4}
                          className={errors.objective && touched.objective ? 'is-invalid' : ''}
                        />
                        <ErrorMessage
                          name="objective"
                          component="div"
                          className="invalid-feedback"
                        />
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="requirements">
                          Justification <span style={{ color: 'red' }}>*</span>
                        </Label>
                        <Field
                          id="requirements"
                          name="requirements"
                          disabled={isDisabled}
                          as={Input}
                          type="textarea"
                          placeholder="Detailed requirements and specifications"
                          rows={4}
                          className={
                            errors.requirements && touched.requirements ? 'is-invalid' : ''
                          }
                        />
                        <ErrorMessage
                          name="requirements"
                          component="div"
                          className="invalid-feedback"
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={2}>
                      <FormGroup>
                        <Label
                          for="shipToAddressId"
                          className={
                            errors.shipToAddressId && touched.shipToAddressId ? 'is-invalid' : ''
                          }
                        >
                          Ship To Address <span style={{ color: 'red' }}>*</span>
                        </Label>
                        {renderDropdown(
                          addresses,
                          loading.addresses,
                          'Select address',
                          'shipToAddressId',
                          isDisabled,
                        )}
                        <ErrorMessage
                          name="shipToAddressId"
                          component="div"
                          className="invalid-feedback"
                        />
                      </FormGroup>
                    </Col>
                    {companySettings.departmentEnabled && (
                      <Col md={2}>
                        <FormGroup>
                          <Label
                            for="departmentId"
                            className={
                              errors.departmentId && touched.departmentId ? 'is-invalid' : ''
                            }
                          >
                            Department <span className="text-danger">*</span>
                          </Label>
                          <Field
                            as={Input}
                            type="select"
                            className={`form-control form-control-sm ${errors.departmentId && touched.departmentId ? 'is-invalid' : ''
                              }`}
                            name="departmentId"
                            disabled={isDisabled}
                            onChange={({ target: { value } }) => {
                              formikRef.current.setFieldValue('departmentId', value);
                              setSelectedDepartmentId(value);
                            }}
                          >
                            <option value="">Select</option>
                            {(filteredDepartments.length > 0
                              ? filteredDepartments
                              : departments
                            ).map((d) => (
                              <option key={d.departmentId} value={d.departmentId}>
                                {d.name}
                              </option>
                            ))}
                          </Field>
                          <ErrorMessage
                            name="departmentId"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                    )}

                    {companySettings.gLAccountEnabled && (
                      <Col md={2}>
                        <FormGroup>
                          <Label
                            for="glAccountId"
                            className={errors.glAccountId && touched.glAccountId ? 'is-invalid' : ''}
                          >
                            GL Account <span className="text-danger">*</span>
                          </Label>
                          <Field
                            as={Input}
                            type="select"
                            className={`form-control form-control-sm ${errors.glAccountId && touched.glAccountId ? 'is-invalid' : ''
                              }`}
                            name="glAccountId"
                            disabled={isDisabled || !selectedDepartmentId}
                            onChange={({ target: { value } }) => {
                              formikRef.current.setFieldValue('glAccountId', value);
                              setSelectedGlAccountId(value);
                            }}
                          >
                            <option value="">
                              {!selectedDepartmentId ? 'Select department first' : 'Select'}
                            </option>
                            {(filteredGlAccounts.length > 0 ? filteredGlAccounts : glAccounts).map((g) => (
                              <option key={g.glAccountId} value={g.glAccountId}>
                                {g.name}
                              </option>
                            ))}
                          </Field>
                          <ErrorMessage
                            name="glAccountId"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                    )}


                    {companySettings.classEnabled && (
                      <Col md={2}>
                        <FormGroup>
                          <Label
                            for="classId"
                            className={errors.classId && touched.classId ? 'is-invalid' : ''}
                          >
                            Class <span style={{ color: 'red' }}>*</span>
                          </Label>
                          {renderDropdown(
                            classes,
                            loading.classes,
                            'Select class',
                            'classId',
                            isDisabled,
                          )}
                          <ErrorMessage
                            name="classId"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                    )}

                    {companySettings.locationEnabled && (
                      <Col md={2}>
                        <FormGroup>
                          <Label
                            for="locationId"
                            className={errors.locationId && touched.locationId ? 'is-invalid' : ''}
                          >
                            Location <span style={{ color: 'red' }}>*</span>
                          </Label>
                          {renderDropdown(
                            locations,
                            loading.locations,
                            'Select location',
                            'locationId',
                            isDisabled,
                          )}
                          <ErrorMessage
                            name="locationId"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                    )}

                    {companySettings.projectEnabled && (
                      <Col md={2}>
                        <FormGroup>
                          <Label
                            for="projectId"
                            className={errors.projectId && touched.projectId ? 'is-invalid' : ''}
                          >
                            Project <span style={{ color: 'red' }}>*</span>
                          </Label>
                          {renderDropdown(
                            projects,
                            loading.projects,
                            'Select project',
                            'projectId',
                            isDisabled,
                          )}
                          <ErrorMessage
                            name="projectId"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                    )}
                  </Row>
                </CardBody>
              </Card>
              <Card className="mb-4">
                <CardHeader>
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-boxes mr-2"></i>
                      <div>
                        <h5 className="mb-0">RFQ Items ({formData.rfqItems.length})</h5>
                        <p className="text-muted mb-0">Add items for quotation requests</p>
                      </div>
                    </div>
                    <Button
                      color="primary"
                      onClick={() => setShowItemDialog(true)}
                      disabled={isDisabled}
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  {formData.rfqItems.length === 0 ? (
                    <div className="text-center py-5 border-2 border-dashed rounded">
                      <i className="fas fa-box-open fa-3x text-muted mb-3"></i>
                      <h5 className="mb-2">No items added yet</h5>
                      <p className="text-muted">Click Add Item to get started with your RFQ</p>
                    </div>
                  ) : (
                    <div>
                      <Table responsive>
                        <thead>
                          <tr>
                            <th>Part ID</th>
                            <th>Description</th>
                            <th style={{ textAlign: 'left', paddingLeft: '3%' }}>Quantity</th>
                            <th>UOM</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.rfqItems.map((item) => (
                            <tr key={item.rfqItemId}>
                              <td>{item.partId}</td>
                              <td>{item.description}</td>
                              <td>
                                <div className="d-flex align-items justify-content">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (item.quantity > 1) {
                                        setFormData((prev) => ({
                                          ...prev,
                                          rfqItems: prev.rfqItems.map((i) =>
                                            i.rfqItemId === item.rfqItemId
                                              ? { ...i, quantity: i.quantity - 1 }
                                              : i,
                                          ),
                                        }));
                                      }
                                    }}
                                    color="primary"
                                    disabled={item.quantity === 1 || isDisabled}
                                  >
                                    -
                                  </Button>
                                  <Input
                                    type="number"
                                    min="1"
                                    className="form-control mx-2"
                                    style={{ width: '60px', textAlign: 'center' }}
                                    value={item.quantity}
                                    onChange={(e) => {
                                      if (!isDisabled) {
                                        const newValue = parseInt(e.target.value, 10) || 1;
                                        setFormData((prev) => ({
                                          ...prev,
                                          rfqItems: prev.rfqItems.map((i) =>
                                            i.rfqItemId === item.rfqItemId
                                              ? { ...i, quantity: newValue }
                                              : i,
                                          ),
                                        }));
                                      }
                                    }}
                                    disabled={isDisabled}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (!isDisabled) {
                                        setFormData((prev) => ({
                                          ...prev,
                                          rfqItems: prev.rfqItems.map((i) =>
                                            i.rfqItemId === item.rfqItemId
                                              ? { ...i, quantity: i.quantity + 1 }
                                              : i,
                                          ),
                                        }));
                                      }
                                    }}
                                    color="primary"
                                  >
                                    +
                                  </Button>
                                </div>
                              </td>
                              <td>{item.uom}</td>
                              <td>
                                <Button
                                  color="link"
                                  className="text-danger"
                                  disabled={isDisabled}
                                  onClick={() => removeItem(item.rfqItemId)}
                                >
                                  <FaTrash />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </CardBody>
              </Card>

              <RfqItemModal
                isOpen={showItemDialog}
                toggle={() => setShowItemDialog(false)}
                existingItems={products}
                formData={formData}
                addExistingItem={addExistingItem}
                refreshItems={fetchProducts}
              />
              <Card className="mb-4">
                <CardHeader>
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-users mr-2"></i>
                      <div>
                        <h5 className="mb-0">Suppliers ({formData.suppliers.length})</h5>
                        <p className="text-muted mb-0">Select suppliers to send this RFQ</p>
                      </div>
                    </div>
                    <Button
                      color="primary"
                      onClick={() => setShowSupplierDialog(true)}
                      disabled={isDisabled}
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Add Supplier
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  {formData.suppliers.length < 3 && (
                    <div className="text-danger mb-2">
                      <small>Minimum 3 suppliers are required</small>
                    </div>
                  )}

                  {formData.suppliers.length === 0 ? (
                    <div className="text-center py-5 border-2 border-dashed rounded">
                      <i className="fas fa-user-friends fa-3x text-muted mb-3"></i>
                      <h5 className="mb-2">No suppliers selected yet</h5>
                      <p className="text-muted">
                        Click Add Supplier to invite suppliers to your RFQ
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Table responsive>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Attachments</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.suppliers.map((supplier) => (
                            <tr key={supplier.rfqSupplierId}>
                              <td>{supplier.name}</td>
                              <td>{supplier.email}</td>
                              <td>{supplier.primaryContact}</td>
                              <td>
                                <label
                                  htmlFor={`supplier-file-upload-${supplier.rfqSupplierId}`}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <FaPaperclip size={16} />
                                  <input
                                    id={`supplier-file-upload-${supplier.rfqSupplierId}`}
                                    type="file"
                                    disabled={isDisabled}
                                    style={{ display: 'none' }}
                                    onChange={async (e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        try {
                                          const response = await FileUploadService.uploadFile(
                                            companyId,
                                            file,
                                          );
                                          setFormData((prev) => ({
                                            ...prev,
                                            suppliers: prev.suppliers.map((s) =>
                                              s.rfqSupplierId === supplier.rfqSupplierId
                                                ? {
                                                  ...s,
                                                  attachments: [
                                                    ...(s.attachments || []),
                                                    {
                                                      fileId: response.data.fileId,
                                                      fileName: file.name,
                                                    },
                                                  ],
                                                }
                                                : s,
                                            ),
                                          }));
                                          toast.dismiss();
                                          toast.success('File uploaded successfully');
                                        } catch (error) {
                                          console.error('Error uploading file:', error);
                                          toast.dismiss();
                                          toast.error('Failed to upload file');
                                        }
                                      }
                                    }}
                                  />
                                </label>
                                {supplier.attachments && supplier.attachments.length > 0 && (
                                  <div style={{ marginTop: '5px' }}>
                                    {supplier.attachments.map((att, index) => (
                                      <div key={att.fileId || index} style={{ fontSize: '12px' }}>
                                        <small>{att.fileName}</small>
                                        <Button
                                          size="sm"
                                          disabled={isDisabled}
                                          color="link"
                                          className="text-danger p-0 ml-1"
                                          onClick={() => {
                                            setFormData((prev) => ({
                                              ...prev,
                                              suppliers: prev.suppliers.map((s) =>
                                                s.rfqSupplierId === supplier.rfqSupplierId
                                                  ? {
                                                    ...s,
                                                    attachments: s.attachments.filter(
                                                      (a) => a.fileId !== att.fileId,
                                                    ),
                                                  }
                                                  : s,
                                              ),
                                            }));
                                          }}
                                        >
                                          ×
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td>
                                <Button
                                  color="link"
                                  className="text-danger"
                                  disabled={isDisabled}
                                  onClick={() => removeSupplier(supplier.rfqSupplierId)}
                                >
                                  <FaTrash />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </CardBody>
              </Card>

              <SupplierDialog
                isOpen={showSupplierDialog}
                toggle={() => setShowSupplierDialog(false)}
                existingSuppliers={suppliers}
                formData={formData}
                newSupplier={newSupplier}
                setNewSupplier={setNewSupplier}
                addExistingSupplier={addExistingSupplier}
                onAddNewSupplier=""
                isEditMode={isEditMode}
              />

              <Row>
                <Col className="d-flex justify-content-end">
                  <Button
                    color="secondary"
                    onClick={handleBack}
                    className="button-spacing"
                    style={{ marginRight: '10px' }}
                  >
                    Back
                  </Button>
                  <Button
                    color="primary"
                    type="submit"
                    style={{ marginRight: '10px' }}
                    disabled={isDisabled}
                  >
                    {isEditMode ? 'Update' : 'Create'}
                  </Button>
                </Col>
              </Row>
            </FormikForm>
          )}
        </Formik>
      </div>

      <style>{`
        .create-rfq-page {
          margin-top: 2rem;
          padding-top: 1rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          min-height: calc(100vh - 120px);
        }
      `}</style>
    </>
  );
};

export default CreateRFQ;
