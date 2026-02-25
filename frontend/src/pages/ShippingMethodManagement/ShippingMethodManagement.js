import React, { useState, useEffect } from 'react';
import { Edit, Trash } from 'react-feather';
import Swal from 'sweetalert2';
import {
  Row,
  Col,
  Card,
  CardBody,
  CardTitle,
  CardSubtitle,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Label,
  Pagination,
  PaginationItem,
  PaginationLink,
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../CompanyManagement/ReactBootstrapTable.scss';
import ComponentCard from '../../components/ComponentCard';
import ShippingMethodService from '../../services/ShippingMethodService';

const ShippingMethodManagement = () => {
  const [shippingMethods, setShippingMethods] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [modal, setModal] = useState(false);
  const [newShippingMethod, setNewShippingMethod] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [editModal, setEditModal] = useState(false);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState(null);
  const [updatedShippingMethodName, setUpdatedShippingMethodName] = useState('');
  const toggleModal = () => setModal(!modal);
  const toggleEditModal = () => setEditModal(!editModal);

  const handleEdit = (shippingMethod) => {
    setSelectedShippingMethod(shippingMethod);
    setUpdatedShippingMethodName(shippingMethod.name);
    toggleEditModal();
  };

  const fetchShippingMethods = async () => {
    try {
      let response;
      if (searchTerm.trim() === '') {
        response = await ShippingMethodService.getAllShippingMethods();
      } else {
        response = await ShippingMethodService.getShippingMethodsBySearch(searchTerm);
      }
      setShippingMethods(response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
      if (error.response && error.response.data && error.response.data.errorMessage) {
        toast.dismiss();
        toast.error(error.response.data.errorMessage);
      } else {
        toast.dismiss();
        toast.error('Not found');
      }
    }
  };

  useEffect(() => {
    fetchShippingMethods();
  }, [debouncedSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleCreateShippingMethod = async () => {
    if (!newShippingMethod.trim()) {
      toast.dismiss();
      toast.error('Shipping method name is required');
      return;
    }
    try {
      await ShippingMethodService.handleCreateShippingMethod({ name: newShippingMethod });
      toast.dismiss();
      toast.success('Shipping method added successfully');
      fetchShippingMethods();
      setNewShippingMethod('');
      toggleModal();
    } catch (error) {
      console.error('Error creating shipping method:', error);
      toast.dismiss();
      toast.error('Failed to add shipping method');
    }
  };

  const handleUpdateShippingMethod = async () => {
    if (!updatedShippingMethodName.trim()) {
      toast.dismiss();
      toast.error('Shipping method name is required');
      return;
    }
    try {
      await ShippingMethodService.handleUpdateShippingMethod(
        { name: updatedShippingMethodName },
        selectedShippingMethod.shippingMethodId,
      );
      toast.dismiss();
      toast.success('Shipping method updated successfully');
      fetchShippingMethods();
      toggleEditModal();
    } catch (error) {
      console.error('Error updating shipping method:', error);
      toast.dismiss();
      toast.error('Failed to update shipping method');
    }
  };

  const handleDeleteShippingMethod = (shippingMethodId) => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Delete',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await ShippingMethodService.deleteShippingMethods(shippingMethodId);
          Swal.fire('Deleted!', 'The shipping method has been deleted.', 'success');
          fetchShippingMethods();
        } catch (error) {
          console.error('Error deleting shipping method:', error);
          toast.dismiss();
          toast.error('Failed to delete shipping method');
        }
      }
    });
  };

  const filteredShippingMethods = shippingMethods.filter((method) =>
    method.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
  );
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredShippingMethods.slice(indexOfFirstItem, indexOfLastItem);

  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(filteredShippingMethods.length / itemsPerPage); i++) {
    pageNumbers.push(i);
  }

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
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
          <ComponentCard title="Shipping Method Management">
            <div className="d-flex justify-content-between align-items-end mb-4">
              <div style={{ maxWidth: '300px' }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchInputChange}
                  placeholder="Search by name..."
                  className="form-control"
                />
              </div>
              <Button color="primary" onClick={toggleModal}>
                Add New
              </Button>
            </div>

            <Row>
              {currentItems.length > 0 ? (
                currentItems.map((method) => (
                  <Col md="4" sm="6" xs="12" key={method.shippingMethodId} className="mb-4">
                    <Card
                      className="shadow-sm h-100"
                      style={{ borderRadius: '10px', overflow: 'hidden' }}
                    >
                      <CardBody className="d-flex flex-column">
                        <CardTitle tag="h5" className="mb-2" style={{ color: '#2c3e50' }}>
                          {method.name}
                        </CardTitle>
                        <CardSubtitle tag="h6" className="mb-3 text-muted">
                          ID: {method.shippingMethodId}
                        </CardSubtitle>
                        <div className="d-flex justify-content-end position-absolute bottom-0 end-0 p-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary me-2 action-button-edit"
                            onClick={() => handleEdit(method)}
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-danger action-button-delete"
                            onClick={() => handleDeleteShippingMethod(method.shippingMethodId)}
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>
                ))
              ) : (
                <Col>
                  <p className="text-center text-muted">No shipping methods found.</p>
                </Col>
              )}
            </Row>

            {/* Pagination */}
            <div className="d-flex justify-content-center mt-4">
              <Pagination size="sm" className="pagination">
                <PaginationItem disabled={currentPage === 1}>
                  <PaginationLink first onClick={() => handlePageChange(1)} href="#" />
                </PaginationItem>
                <PaginationItem disabled={currentPage === 1}>
                  <PaginationLink
                    previous
                    onClick={() => handlePageChange(currentPage - 1)}
                    href="#"
                  />
                </PaginationItem>
                {pageNumbers
                  .slice(
                    Math.max(0, currentPage - 3),
                    Math.min(pageNumbers.length, currentPage + 2),
                  )
                  .map((number) => (
                    <PaginationItem key={number} active={number === currentPage}>
                      <PaginationLink onClick={() => handlePageChange(number)} href="#">
                        {number}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                <PaginationItem disabled={currentPage === pageNumbers.length}>
                  <PaginationLink next onClick={() => handlePageChange(currentPage + 1)} href="#" />
                </PaginationItem>
                <PaginationItem disabled={currentPage === pageNumbers.length}>
                  <PaginationLink
                    last
                    onClick={() => handlePageChange(pageNumbers.length)}
                    href="#"
                  />
                </PaginationItem>
              </Pagination>
            </div>
          </ComponentCard>
        </Col>
      </Row>

      <Modal isOpen={modal} toggle={toggleModal}>
        <ModalHeader toggle={toggleModal}>Add New Shipping Method</ModalHeader>
        <ModalBody>
          <Label for="shippingMethodName">Name</Label>
          <Input
            type="text"
            id="shippingMethodName"
            value={newShippingMethod}
            onChange={(e) => setNewShippingMethod(e.target.value)}
            placeholder="Enter shipping method name"
          />
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleModal}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleCreateShippingMethod}>
            Submit
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={editModal} toggle={toggleEditModal}>
        <ModalHeader toggle={toggleEditModal}>Edit Shipping Method</ModalHeader>
        <ModalBody>
          <Label for="updatedShippingMethodName">Name</Label>
          <Input
            type="text"
            id="updatedShippingMethodName"
            value={updatedShippingMethodName}
            onChange={(e) => setUpdatedShippingMethodName(e.target.value)}
            placeholder="Enter shipping method name"
          />
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleEditModal}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleUpdateShippingMethod}>
            Update
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default ShippingMethodManagement;
