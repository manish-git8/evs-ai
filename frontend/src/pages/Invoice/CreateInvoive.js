import React, { useState } from 'react';
import { Row, Col, Form, FormGroup, Label, Input, Button } from 'reactstrap';
import InvoiceService from '../../services/InvoiceService';


const CreateInvoice = () => {
  const [invoice, setInvoice] = useState({
    title: '',
    invoiceNo: '',
    purchaseOrderId: 0,
    dateOfIssue: '',
    supplierId: 0,
    supplierAddress: '',
    description: '',
    subtotal: 0,
    taxes: 0,
    discount: 0,
    totalAmountDue: 0,
    termsAndConditions: '',
    paymentTerms: 0,
    paymentDueDate: '',
    remitTo: '',
    gstNumber: '',
    taxInfo: '',
    tinNumber: '',
    notes: '',
    authorizedSignatory: '',
    warrantyInDays: 0,
    guaranteeInDays: 0,
  });
  


  const handleChange = (e) => {
    const { name, value } = e.target;
    setInvoice({
      ...invoice,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await InvoiceService.addInvoice(invoice); 
    } catch (error) {
      console.error('Error adding invoice:', error);
    }
  };

  return (
    <div>
      <Row>
        <Col md="12">
          <h3>Add New Invoice</h3>
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label for="title">Title</Label>
              <Input
                type="text"
                name="title"
                id="title"
                value={invoice.title}
                onChange={handleChange}
              />
            </FormGroup>
            <FormGroup>
              <Label for="invoiceNo">Invoice No</Label>
              <Input
                type="text"
                name="invoiceNo"
                id="invoiceNo"
                value={invoice.invoiceNo}
                onChange={handleChange}
              />
            </FormGroup>
            <FormGroup>
              <Label for="supplierId">Supplier ID</Label>
              <Input
                type="number"
                name="supplierId"
                id="supplierId"
                value={invoice.supplierId}
                onChange={handleChange}
              />
            </FormGroup>
            <FormGroup>
              <Label for="dateOfIssue">Date of Issue</Label>
              <Input
                type="date"
                name="dateOfIssue"
                id="dateOfIssue"
                value={invoice.dateOfIssue}
                onChange={handleChange}
              />
            </FormGroup>
            <FormGroup>
              <Label for="totalAmountDue">Total Amount Due</Label>
              <Input
                type="number"
                name="totalAmountDue"
                id="totalAmountDue"
                value={invoice.totalAmountDue}
                onChange={handleChange}
              />
            </FormGroup>
            {/* Add additional fields as necessary */}

            <Button color="primary" type="submit">
              Submit
            </Button>
          </Form>
        </Col>
      </Row>
    </div>
  );
};

export default CreateInvoice;
