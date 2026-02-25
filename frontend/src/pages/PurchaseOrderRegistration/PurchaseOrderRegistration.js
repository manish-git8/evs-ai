import React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Row,
  Col,
  Form,
  FormGroup,
  Label,
  Input,
  Button,
} from 'reactstrap';

const PurchaseOrderRegistration = () => {
  return (
    <div style={{ paddingTop: '24px' }}>
      <Row>
        <Col md="12">
          <Card>
            <CardBody className="bg-light">
              <CardTitle tag="h4" className="mb-0">
                Purchase Order Details
              </CardTitle>
            </CardBody>
            <CardBody>
              <Form>
                <Row>
                  <Col md="4">
                    <FormGroup>
                      <Label>Order No</Label>
                      <Input type="text" name="orderNo" placeholder="Enter Order No" />
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <Label>Company Name</Label>
                      <Input type="text" name="companyName" placeholder="Enter Company Name" />
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <Label>Billing Address</Label>
                      <Input
                        type="text"
                        name="billingAddress"
                        placeholder="Enter Billing Address"
                      />
                    </FormGroup>
                  </Col>
                </Row>

                <Row>
                  <Col md="4">
                    <FormGroup>
                      <Label>Shipping Address</Label>
                      <Input
                        type="text"
                        name="shippingAddress"
                        placeholder="Enter Shipping Address"
                      />
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <Label>Primary Contact</Label>
                      <Input
                        type="text"
                        name="primaryContact"
                        placeholder="Enter Primary Contact"
                      />
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <Label>Phone Number</Label>
                      <Input type="text" name="phone" placeholder="Enter Phone Number" />
                    </FormGroup>
                  </Col>
                </Row>

                <Row>
                  <Col md="4">
                    <FormGroup>
                      <Label>Email</Label>
                      <Input type="email" name="email" placeholder="Enter Email" />
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <Label>Order Amount</Label>
                      <Input type="number" name="orderAmount" placeholder="Enter Order Amount" />
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <Label>Order Status</Label>
                      <Input type="text" name="orderStatus" placeholder="Enter Order Status" />
                    </FormGroup>
                  </Col>
                </Row>

                <Row>
                  <Col md="4">
                    <FormGroup>
                      <Label>Delivery Date</Label>
                      <Input type="date" name="deliveryDate" />
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <Label>Notes</Label>
                      <Input type="text" name="notes" placeholder="Enter Notes" />
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <Label>Shipping Method</Label>
                      <Input
                        type="text"
                        name="shippingMethod"
                        placeholder="Enter Shipping Method"
                      />
                    </FormGroup>
                  </Col>
                </Row>

                <Row>
                  <Col md="4">
                    <FormGroup>
                      <Label>Payment Terms</Label>
                      <Input type="text" name="paymentTerms" placeholder="Enter Payment Terms" />
                    </FormGroup>
                  </Col>
                </Row>

                
                <Row>
                  <Col md="4">
                    <FormGroup>
                      <Label>Cost Center</Label>
                      <Input type="text" name="costCenter" placeholder="Enter Cost Center" />
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <Label>Order Total</Label>
                      <Input type="number" name="orderTotal" placeholder="Enter Order Total" />
                    </FormGroup>
                  </Col>
                  <Col md="4">
                    <FormGroup>
                      <Label>Project Name</Label>
                      <Input type="text" name="projectName" placeholder="Enter Project Name" />
                    </FormGroup>
                  </Col>
                </Row>

                <Row>
                  <Col md="12" className="text-center">
                    <Button color="primary" type="submit">
                      Submit
                    </Button>
                  </Col>
                </Row>
              </Form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PurchaseOrderRegistration;
