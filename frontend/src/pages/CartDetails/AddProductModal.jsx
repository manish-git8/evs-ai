import React from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  FormGroup,
  Input,
  Label,
  Row,
  Col,
} from 'reactstrap';

const AddProductModal = ({ 
  isOpen, 
  toggle, 
  onAddProduct,
  departments = [],
  glAccounts = [],
  projects = [],
  classes = [],
  locations = [],
  suppliers = [],
  defaultDepartmentId = null,
  defaultGlAccountId = null,
  defaultProjectId = null,
  defaultClassId = null,
  defaultLocationId = null,
  defaultSupplierId = null,
  settings = {}
}) => {
  const [newItem, setNewItem] = React.useState({
    PartId: '',
    Description: '',
    UnitOfMeasurement: '',
    quantity: 1,
    price: 0,
    notes: '',
    // Account settings - ensure they are strings or empty string
    departmentId: defaultDepartmentId ? String(defaultDepartmentId) : '',
    glAccountId: defaultGlAccountId ? String(defaultGlAccountId) : '',
    projectId: defaultProjectId ? String(defaultProjectId) : '',
    classId: defaultClassId ? String(defaultClassId) : '',
    locationId: defaultLocationId ? String(defaultLocationId) : '',
    supplierId: defaultSupplierId ? String(defaultSupplierId) : '',
  });

  // Update defaults when props change
  React.useEffect(() => {  
    setNewItem(prev => {
      const updated = {
        ...prev,
        departmentId: defaultDepartmentId ? String(defaultDepartmentId) : '',
        glAccountId: defaultGlAccountId ? String(defaultGlAccountId) : '',
        projectId: defaultProjectId ? String(defaultProjectId) : '',
        classId: defaultClassId ? String(defaultClassId) : '',
        locationId: defaultLocationId ? String(defaultLocationId) : '',
        supplierId: defaultSupplierId ? String(defaultSupplierId) : '',
      };
      return updated;
    });
  }, [defaultDepartmentId, defaultGlAccountId, defaultProjectId, defaultClassId, defaultLocationId, defaultSupplierId]);
  
  // Reset form when modal opens or default values change
  React.useEffect(() => {
    if (isOpen) {
      setNewItem(prev => ({
        ...prev,
        departmentId: defaultDepartmentId ? String(defaultDepartmentId) : '',
        glAccountId: defaultGlAccountId ? String(defaultGlAccountId) : '',
        projectId: defaultProjectId ? String(defaultProjectId) : '',
        classId: defaultClassId ? String(defaultClassId) : '',
        locationId: defaultLocationId ? String(defaultLocationId) : '',
        supplierId: defaultSupplierId ? String(defaultSupplierId) : '',
      }));
    }
  }, [isOpen, defaultDepartmentId, defaultGlAccountId, defaultProjectId, defaultClassId, defaultLocationId, defaultSupplierId]);


  const handleInputChange = (field, value) => {
    setNewItem((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddNewProduct = () => {
    // Basic product validation
    if (!newItem.PartId || !newItem.Description || !newItem.quantity || !newItem.price) {
      toast.error('Please fill all required fields (Part ID, Description, Quantity, and Price)');
      return;
    }

    // Account settings validation
    const missingFields = [];
    const isDeptEnabled = settings.departmentEnabled === 'true' || settings.departmentEnabled === true;
    const isGLEnabled = settings.gLAccountEnabled === 'true' || settings.gLAccountEnabled === true;
    const isProjectEnabled = settings.projectEnabled === 'true' || settings.projectEnabled === true;
    const isClassEnabled = settings.classEnabled === 'true' || settings.classEnabled === true;
    const isLocationEnabled = settings.locationEnabled === 'true' || settings.locationEnabled === true;
    
    if (isDeptEnabled && !newItem.departmentId) missingFields.push('Department');
    if (isGLEnabled && !newItem.glAccountId) missingFields.push('GL Account');
    if (isProjectEnabled && !newItem.projectId) missingFields.push('Project');
    if (isClassEnabled && !newItem.classId) missingFields.push('Class');
    if (isLocationEnabled && !newItem.locationId) missingFields.push('Location');
    if (!newItem.supplierId) missingFields.push('Supplier');

    if (missingFields.length > 0) {
      toast.error(`Please select the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    onAddProduct(newItem);
    toggle();
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>Add Product</ModalHeader>
      <ModalBody>
        <div className="mt-3">
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="part-id">Part ID *</Label>
                <Input
                  id="part-id"
                  placeholder="Enter part ID"
                  value={newItem.PartId}
                  onChange={(e) => handleInputChange('PartId', e.target.value)}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label for="uom">Unit of Measure</Label>
                <Input
                  id="uom"
                  type="select"
                  value={newItem.UnitOfMeasurement}
                  onChange={(e) => handleInputChange('UnitOfMeasurement', e.target.value)}
                >
                  <option value="">Select UOM</option>
                  <option value="Each">Each</option>
                  <option value="Pack">Pack</option>
                  <option value="Box">Box</option>
                  <option value="Kg">Kilogram</option>
                  <option value="Meter">Meter</option>
                </Input>
              </FormGroup>
            </Col>
          </Row>

          <FormGroup>
            <Label for="description">Description *</Label>
            <Input
              id="description"
              placeholder="Item description"
              value={newItem.Description}
              onChange={(e) => handleInputChange('Description', e.target.value)}
            />
          </FormGroup>

          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Enter quantity"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => handleInputChange('quantity', parseInt(e.target.value, 10))}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label for="price">Unit Price *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="Enter unit price"
                  min="0"
                  step="0.01"
                  value={newItem.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                />
              </FormGroup>
            </Col>
          </Row>

          {/* Account Settings Section */}
          <hr className="my-4" />
          <h6 className="mb-3" style={{ color: '#495057', fontWeight: '600' }}>
            Account Settings
            {(defaultDepartmentId || defaultGlAccountId || defaultProjectId || defaultClassId || defaultLocationId) && (
              <small className="text-muted ms-2">(Inherited from existing cart items)</small>
            )}
          </h6>

          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="supplier">Supplier *</Label>
                <Input
                  id="supplier"
                  type="select"
                  value={newItem.supplierId || ''}
                  onChange={(e) => handleInputChange('supplierId', e.target.value)}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.supplierId} value={supplier.supplierId}>
                      {supplier.name || supplier.displayName}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </Col>
            {(settings.departmentEnabled === 'true' || settings.departmentEnabled === true || true) && (
              <Col md={6}>
                <FormGroup>
                  <Label for="department">Department *</Label>
                  <Input
                    id="department"
                    type="select"
                    value={newItem.departmentId || ''}
                    onChange={(e) => handleInputChange('departmentId', e.target.value)}
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.departmentId} value={dept.departmentId}>
                        {dept.name}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
            )}
          </Row>

          <Row>
            {(settings.gLAccountEnabled === 'true' || settings.gLAccountEnabled === true || true) && (
              <Col md={6}>
                <FormGroup>
                  <Label for="glAccount">GL Account *</Label>
                  <Input
                    id="glAccount"
                    type="select"
                    value={newItem.glAccountId || ''}
                    onChange={(e) => handleInputChange('glAccountId', e.target.value)}
                  >
                    <option value="">Select GL Account</option>
                    {glAccounts.map((account) => (
                      <option key={account.glAccountId} value={account.glAccountId}>
                        {account.name}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
            )}
            {(settings.projectEnabled === 'true' || settings.projectEnabled === true || true) && (
              <Col md={6}>
                <FormGroup>
                  <Label for="project">Project *</Label>
                  <Input
                    id="project"
                    type="select"
                    value={newItem.projectId || ''}
                    onChange={(e) => handleInputChange('projectId', e.target.value)}
                  >
                    <option value="">Select Project</option>
                    {projects.map((project) => (
                      <option key={project.projectId} value={project.projectId}>
                        {project.name}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
            )}
          </Row>

          <Row>
            {(settings.classEnabled === 'true' || settings.classEnabled === true || true) && (
              <Col md={6}>
                <FormGroup>
                  <Label for="class">Class *</Label>
                  <Input
                    id="class"
                    type="select"
                    value={newItem.classId || ''}
                    onChange={(e) => handleInputChange('classId', e.target.value)}
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls) => (
                      <option key={cls.classId} value={cls.classId}>
                        {cls.name}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
            )}
            {(settings.locationEnabled === 'true' || settings.locationEnabled === true || true) && (
              <Col md={6}>
                <FormGroup>
                  <Label for="location">Location *</Label>
                  <Input
                    id="location"
                    type="select"
                    value={newItem.locationId || ''}
                    onChange={(e) => handleInputChange('locationId', e.target.value)}
                  >
                    <option value="">Select Location</option>
                    {locations.map((location) => (
                      <option key={location.locationId} value={location.locationId}>
                        {location.name}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
            )}
          </Row>

          <FormGroup>
            <Label for="notes">Notes</Label>
            <Input
              id="notes"
              type="textarea"
              placeholder="Additional notes"
              value={newItem.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
            />
          </FormGroup>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle}>
          Cancel
        </Button>
        <Button color="primary" onClick={handleAddNewProduct}>
          Add Product
        </Button>
      </ModalFooter>
    </Modal>
  );
};

AddProductModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  onAddProduct: PropTypes.func.isRequired,
  departments: PropTypes.arrayOf(PropTypes.object),
  glAccounts: PropTypes.arrayOf(PropTypes.object),
  projects: PropTypes.arrayOf(PropTypes.object),
  classes: PropTypes.arrayOf(PropTypes.object),
  locations: PropTypes.arrayOf(PropTypes.object),
  suppliers: PropTypes.arrayOf(PropTypes.object),
  defaultDepartmentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultGlAccountId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultProjectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultClassId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultLocationId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultSupplierId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  settings: PropTypes.object,
};

export default AddProductModal;
