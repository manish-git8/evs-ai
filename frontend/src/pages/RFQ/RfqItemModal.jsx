import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
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
  Spinner,
} from 'reactstrap';
import { toast } from 'react-toastify';
import InternalItemService from '../../services/InternalItemService';
import CompanyCategoryService from '../../services/CompanyCategoryService';
import { getEntityId } from '../localStorageUtil';

const UOM_OPTIONS = [
  { value: 'Each', label: 'Each' },
  { value: 'Piece', label: 'Piece' },
  { value: 'Box', label: 'Box' },
  { value: 'Kg', label: 'Kilogram' },
  { value: 'Meter', label: 'Meter' },
  { value: 'Liter', label: 'Liter' },
  { value: 'Set', label: 'Set' },
  { value: 'Pack', label: 'Pack' },
  { value: 'Roll', label: 'Roll' },
  { value: 'Pair', label: 'Pair' },
];

const RfqItemModal = ({
  isOpen,
  toggle,
  existingItems,
  formData,
  addExistingItem,
  refreshItems,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'create'
  const [categories, setCategories] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newItem, setNewItem] = useState({
    description: '',
    categoryId: '',
    defaultUom: '',
    quantityPerUnit: '',
    specifications: '',
    status: 'ACTIVE',
  });
  const [errors, setErrors] = useState({});

  const companyId = getEntityId();

  useEffect(() => {
    if (isOpen && viewMode === 'create') {
      fetchCategories();
    }
  }, [isOpen, viewMode]);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setViewMode('list');
      setSearchTerm('');
      setSearchResults([]);
      resetNewItemForm();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const response = await CompanyCategoryService.getCompanyCategory();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const resetNewItemForm = () => {
    setNewItem({
      description: '',
      categoryId: '',
      defaultUom: '',
      quantityPerUnit: '',
      specifications: '',
      status: 'ACTIVE',
    });
    setErrors({});
  };

  const handleSmartSearch = async (term) => {
    try {
      if (term.trim() === '') {
        setSearchResults([]);
        return;
      }
      const localResults = existingItems.filter(
        (item) =>
          (item.partId && item.partId.toLowerCase().includes(term.toLowerCase())) ||
          (item.description && item.description.toLowerCase().includes(term.toLowerCase())),
      );

      if (localResults.length > 0) {
        setSearchResults(localResults);
      } else {
        const response = await InternalItemService.searchInternalItems(companyId, term, 50);
        setSearchResults(response || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }
  };

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const newTimeout = setTimeout(() => {
      handleSmartSearch(term);
    }, 500);

    setSearchTimeout(newTimeout);
  };

  const handleNewItemChange = (e) => {
    const { name, value } = e.target;
    setNewItem((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!newItem.description.trim()) {
      newErrors.description = 'Description is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateItem = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const itemData = {
        description: newItem.description,
        categoryId: newItem.categoryId ? Number(newItem.categoryId) : null,
        defaultUom: newItem.defaultUom || null,
        quantityPerUnit: newItem.quantityPerUnit ? Number(newItem.quantityPerUnit) : null,
        specifications: newItem.specifications || null,
        status: newItem.status,
      };

      await InternalItemService.createInternalItem(companyId, itemData);
      toast.success('Internal item created successfully');

      // Refresh the items list
      if (refreshItems) {
        await refreshItems();
      }

      // Reset and go back to list view
      resetNewItemForm();
      setViewMode('list');
    } catch (error) {
      console.error('Error creating internal item:', error);
      toast.error(error.response?.data?.errorMessage || 'Failed to create internal item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleView = () => {
    if (viewMode === 'list') {
      setViewMode('create');
      fetchCategories();
    } else {
      setViewMode('list');
      resetNewItemForm();
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>
        {viewMode === 'list' ? 'Add RFQ Item' : 'Create New Internal Item'}
      </ModalHeader>
      <ModalBody>
        {viewMode === 'list' ? (
          // List View
          <FormGroup>
            <Label>Search Internal Items</Label>
            <Input
              type="text"
              placeholder="Search by Part ID or description..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="mb-3"
            />

            <Label>Available Internal Items</Label>
            <div className="border rounded" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {(searchTerm ? searchResults : existingItems).map((item) => (
                <div
                  key={item.partId || item.internalItemId}
                  className="p-3 border-bottom d-flex justify-content-between align-items-center"
                >
                  <div>
                    <div className="fw-bold">{item.partId}</div>
                    <div className="text-muted small">{item.description}</div>
                    <div className="text-muted small">
                      UOM: {item.defaultUom || 'N/A'}
                      {item.quantityPerUnit && ` | Qty/Unit: ${item.quantityPerUnit}`}
                    </div>
                  </div>
                  <Button
                    color="primary"
                    size="sm"
                    onClick={() => addExistingItem(item)}
                    disabled={formData.rfqItems.some((i) => i.partId === item.partId)}
                  >
                    {formData.rfqItems.some((i) => i.partId === item.partId) ? 'Added' : 'Select'}
                  </Button>
                </div>
              ))}

              {searchTerm && searchResults.length === 0 && (
                <div className="p-3 text-center text-muted">No matching items found</div>
              )}
              {!searchTerm && existingItems.length === 0 && (
                <div className="p-4 text-center">
                  <div className="text-muted mb-3">No internal items available in your catalog.</div>
                  <Button color="primary" size="sm" onClick={handleToggleView}>
                    Create New Item
                  </Button>
                </div>
              )}
            </div>
          </FormGroup>
        ) : (
          // Create View
          <div>
            <Row>
              <Col md={12}>
                <FormGroup>
                  <Label for="description">
                    Description <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="textarea"
                    id="description"
                    name="description"
                    value={newItem.description}
                    onChange={handleNewItemChange}
                    invalid={!!errors.description}
                    rows={2}
                    placeholder="Enter item description"
                  />
                  {errors.description && (
                    <div className="text-danger small">{errors.description}</div>
                  )}
                </FormGroup>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label for="categoryId">Category</Label>
                  <Input
                    type="select"
                    id="categoryId"
                    className='form-select-sm'
                    name="categoryId"
                    value={newItem.categoryId}
                    onChange={handleNewItemChange}
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.categoryId} value={cat.categoryId}>
                        {cat.categoryName}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label for="defaultUom">Default Unit of Measure</Label>
                  <Input
                    className='form-select-sm'
                    type="select"
                    id="defaultUom"
                    name="defaultUom"
                    value={newItem.defaultUom}
                    onChange={handleNewItemChange}
                  >
                    <option value="">Select UOM</option>
                    {UOM_OPTIONS.map((uom) => (
                      <option key={uom.value} value={uom.value}>
                        {uom.label}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label for="quantityPerUnit">Quantity Per Unit</Label>
                  <Input
                    type="number"
                    id="quantityPerUnit"
                    name="quantityPerUnit"
                    value={newItem.quantityPerUnit}
                    onChange={handleNewItemChange}
                    min="0"
                    placeholder="e.g., 10"
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label for="specifications">Specifications</Label>
                  <Input
                    type="text"
                    id="specifications"
                    name="specifications"
                    value={newItem.specifications}
                    onChange={handleNewItemChange}
                    placeholder="Enter specifications"
                  />
                </FormGroup>
              </Col>
            </Row>
          </div>
        )}
      </ModalBody>
      <ModalFooter className="d-flex justify-content-between">
        {viewMode === 'list' ? (
          <>
            <Button color="success" onClick={handleToggleView}>
              + Create New Item
            </Button>
            <Button color="secondary" onClick={toggle}>
              Close
            </Button>
          </>
        ) : (
          <>
            <Button color="secondary" onClick={handleToggleView}>
              ← Back to List
            </Button>
            <Button color="primary" onClick={handleCreateItem} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Creating...
                </>
              ) : (
                'Create Item'
              )}
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
};

RfqItemModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  existingItems: PropTypes.arrayOf(
    PropTypes.shape({
      partId: PropTypes.string,
      description: PropTypes.string,
      defaultUom: PropTypes.string,
      internalItemId: PropTypes.number,
    }),
  ).isRequired,
  formData: PropTypes.shape({
    rfqItems: PropTypes.arrayOf(
      PropTypes.shape({
        partId: PropTypes.string,
      }),
    ),
  }).isRequired,
  addExistingItem: PropTypes.func.isRequired,
  refreshItems: PropTypes.func,
};

RfqItemModal.defaultProps = {
  refreshItems: null,
};

export default RfqItemModal;
