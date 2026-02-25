import React from 'react';
import Iframe from 'react-iframe';
import { Row, Col, Card, CardBody, CardTitle, CardSubtitle, Button } from 'reactstrap';

import img1 from '../../../assets/images/users/user1.jpg';

const UserProfile = () => {
  return (
    <>
      <Card>
        <CardBody className="p-4">
          <div className="text-center mt-4">
            <img src={img1} className="rounded-circle" width="150" alt="" />
            <CardTitle tag="h4" className="mt-2 mb-0">
              Hanna Gover
            </CardTitle>
            <CardSubtitle className="text-muted">Accounts Manager</CardSubtitle>
            <Row className="text-center justify-content-md-center mt-3">
              <Col xs="4">
                <div className="d-flex align-items-center fw-bold">
                  <i className="fs-4 bi bi-person text-muted"></i>
                  <h6 className="font-medium ms-2 mb-0">254</h6>
                </div>
              </Col>
              <Col xs="4">
                <div className="d-flex align-items-center fw-bold">
                  <i className="fs-4 bi bi-columns text-muted"></i>
                  <h6 className="font-medium ms-2 mb-0">54</h6>
                </div>
              </Col>
            </Row>
          </div>
        </CardBody>
        <CardBody className="border-top p-4">
          <div>
            <CardSubtitle className="text-muted fs-6">Email address</CardSubtitle>
            <CardTitle tag="h5">hannagover@gmail.com</CardTitle>

            <CardSubtitle className="text-muted fs-6 mt-3">Phone</CardSubtitle>
            <CardTitle tag="h5">+91 654 784 547</CardTitle>

            <CardSubtitle className="text-muted fs-6 mt-3">Address</CardSubtitle>
            <CardTitle tag="h5">71 Pilgrim Avenue Chevy Chase, MD 20815</CardTitle>
            <div>
              <Iframe
                className="position-relative"
                url="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d470029.1604841957!2d72.29955005258641!3d23.019996818380896!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e848aba5bd449%3A0x4fcedd11614f6516!2sAhmedabad%2C+Gujarat!5e0!3m2!1sen!2sin!4v1493204785508"
                width="280"
                height="150"
                frameborder="0"
                allowfullscreen
              />
            </div>
            <CardSubtitle className="text-muted fs-6 mt-3 mb-2">Social Profile</CardSubtitle>
            <div className="d-flex align-items-center gap-2">
              <Button className="btn-circle" color="info">
                <i className="bi bi-facebook"></i>
              </Button>
              <Button className="btn-circle" color="primary">
                <i className="bi bi-twitter"></i>
              </Button>
              <Button className="btn-circle" color="danger">
                <i className="bi bi-youtube"></i>
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </>
  );
};

export default UserProfile;
