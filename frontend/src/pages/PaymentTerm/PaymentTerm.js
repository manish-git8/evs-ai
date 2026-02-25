import React, { useEffect, useState } from 'react';
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
  Pagination,
  PaginationItem,
  PaginationLink,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Label,
} from 'reactstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../CompanyManagement/ReactBootstrapTable.scss';
import ComponentCard from '../../components/ComponentCard';
import PaymentTermService from '../../services/PaymentTermService';

const PaymentTerm = () => {
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [newPaymentTerm, setNewPaymentTerm] = useState('');
  const [updatedPaymentTermName, setUpdatedPaymentTermName] = useState('');
  const [selectedPaymentTermId, setSelectedPaymentTermId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const fetchPaymentTerms = async () => {
    try {
      let response;
      if (searchTerm.trim() === '') {
        response = await PaymentTermService.getPaymentTermById();
      } else {
        response = await PaymentTermService.getPaymentTermBySearch(searchTerm);
      }
      setPaymentTerms(response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
      if (error.response && error.response.data && error.response.data.errorMessage) {
        toast.error(error.response.data.errorMessage);
      } else {
        toast.error('Not found');
      }
    }
  };

  useEffect(() => {
    fetchPaymentTerms();
  }, [debouncedSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const toggleModal = () => {
    setModal(!modal);
  };

  const toggleEditModal = () => {
    setEditModal(!editModal);
  };

  const handleCreatePaymentTerm = async () => {
    if (!newPaymentTerm) {
      toast.error('Payment Term name is required');
      return;
    }
    try {
      await PaymentTermService.createPaymentTerm({ name: newPaymentTerm });
      toast.success(`Payment Term "${newPaymentTerm}" added successfully`);
      setNewPaymentTerm('');
      toggleModal();
      fetchPaymentTerms();
    } catch (error) {
      console.error('Error creating payment term:', error);
      toast.error('Failed to add Payment Term');
    }
  };

  const handleEditPaymentTerm = (paymentTerm) => {
    setSelectedPaymentTermId(paymentTerm.paymentTermId);
    setUpdatedPaymentTermName(paymentTerm.name);
    toggleEditModal();
  };

  const handleUpdatePaymentTerm = async () => {
    if (!updatedPaymentTermName.trim()) {
      toast.error('Payment term name is required');
      return;
    }
    try {
      await PaymentTermService.updatePaymentTerm(selectedPaymentTermId, {
        name: updatedPaymentTermName,
      });
      toast.success(`Payment term "${updatedPaymentTermName}" updated successfully`);
      fetchPaymentTerms();
      toggleEditModal();
    } catch (error) {
      console.error('Error updating payment term:', error);
      toast.error('Failed to update payment term');
    }
  };

  const handleDeletePaymentTerm = (paymentTermId) => {
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
          await PaymentTermService.deletePaymentTerm(paymentTermId);
          Swal.fire('Deleted!', 'The payment term has been deleted.', 'success');
          fetchPaymentTerms();
        } catch (error) {
          console.error('Error deleting payment term:', error);
          toast.error('Failed to delete payment term');
        }
      }
    });
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = paymentTerms.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(paymentTerms.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleFirst = () => {
    setCurrentPage(1);
  };

  const handleLast = () => {
    setCurrentPage(totalPages);
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
          <ComponentCard title="Payment Term Management">
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
                currentItems.map((term) => (
                  <Col key={term.id || term.paymentTermId} md="4" sm="6" xs="12" className="mb-4">
                    <Card
                      className="shadow-sm h-100"
                      style={{ borderRadius: '10px', overflow: 'hidden' }}
                    >
                      <CardBody className="d-flex flex-column">
                        <CardTitle tag="h5" className="mb-2" style={{ color: '#2c3e50' }}>
                          {term.name}
                        </CardTitle>
                        <CardSubtitle tag="h6" className="mb-3 text-muted">
                          ID: {term.paymentTermId}
                        </CardSubtitle>
                        <div className="mt-auto d-flex justify-content-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary me-2 action-button-edit"
                            onClick={() => handleEditPaymentTerm(term)}
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-danger action-button-delete"
                            onClick={() => handleDeletePaymentTerm(term.paymentTermId)}
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
                  <p className="text-center text-muted">No payment terms found.</p>
                </Col>
              )}
            </Row>

            {paymentTerms.length > 0 && (
              <div className="d-flex justify-content-center mt-4">
                <Pagination size="sm" className="pagination">
                  <PaginationItem disabled={currentPage === 1}>
                    <PaginationLink first onClick={handleFirst} />
                  </PaginationItem>
                  <PaginationItem disabled={currentPage === 1}>
                    <PaginationLink previous onClick={handlePrevious} />
                  </PaginationItem>

                  {(() => {
                    let startPage = Math.max(1, currentPage - 1);
                    const endPage = Math.min(startPage + 2, totalPages);

                    if (endPage === totalPages) {
                      startPage = Math.max(1, endPage - 2);
                    }

                    return Array.from(
                      { length: Math.min(3, totalPages) },
                      (_, i) => i + startPage,
                    ).map((number) => (
                      <PaginationItem key={number} active={number === currentPage}>
                        <PaginationLink onClick={() => paginate(number)}>{number}</PaginationLink>
                      </PaginationItem>
                    ));
                  })()}

                  <PaginationItem disabled={currentPage === totalPages}>
                    <PaginationLink next onClick={handleNext} />
                  </PaginationItem>
                  <PaginationItem disabled={currentPage === totalPages}>
                    <PaginationLink last onClick={handleLast} />
                  </PaginationItem>
                </Pagination>
              </div>
            )}
          </ComponentCard>
        </Col>
      </Row>

      <Modal isOpen={modal} toggle={toggleModal}>
        <ModalHeader toggle={toggleModal}>Add New Payment Term</ModalHeader>
        <ModalBody>
          <Label for="paymentTermName">Name</Label>
          <Input
            type="text"
            id="paymentTermName"
            value={newPaymentTerm}
            onChange={(e) => setNewPaymentTerm(e.target.value)}
            placeholder="Enter payment term name"
          />
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleModal}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleCreatePaymentTerm}>
            Submit
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={editModal} toggle={toggleEditModal}>
        <ModalHeader toggle={toggleEditModal}>Edit Payment Term</ModalHeader>
        <ModalBody>
          <Label for="updatedPaymentTermName">Name</Label>
          <Input
            type="text"
            id="updatedPaymentTermName"
            value={updatedPaymentTermName}
            onChange={(e) => setUpdatedPaymentTermName(e.target.value)}
            placeholder="Enter payment term name"
          />
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleEditModal}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleUpdatePaymentTerm}>
            Update
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default PaymentTerm;
