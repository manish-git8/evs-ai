import React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  CardSubtitle,
  Row,
  Col,
  Button,
  ListGroup,
  ListGroupItem,
} from 'reactstrap';

import ReviewsData from './ReviewsData';

import user1 from '../../../assets/images/users/user1.jpg';
import user2 from '../../../assets/images/users/user2.jpg';
import user3 from '../../../assets/images/users/user3.jpg';
import user4 from '../../../assets/images/users/user4.jpg';

const Reviews = () => {
  return (
    /*--------------------------------------------------------------------------------*/
    /* Reviews                                                 */
    /*--------------------------------------------------------------------------------*/
    <Row>
      <Col xs="12">
        <Card>
          <Row>
            <Col lg="4" md="5" className="border-end">
              <CardBody className='p-4'>
                <CardTitle tag="h4">Reviews</CardTitle>
                <CardSubtitle className="text-muted">Overview of Review</CardSubtitle>
                <h2 className="mt-5 mb-0">25426</h2>
                <h6 className="text-muted">This month we got 346 New Reviews</h6>
                <div className="mt-4">
                  <ListGroup horizontal>
                    <ListGroupItem className="border-0 ps-0 pe-2">
                      <img src={user1} alt="avatar" width="45" className="rounded-circle" />
                    </ListGroupItem>
                    <ListGroupItem className="border-0 px-2">
                      <img src={user2} alt="avatar" width="45" className="rounded-circle" />
                    </ListGroupItem>
                    <ListGroupItem className="border-0 px-2">
                      <img src={user3} alt="avatar" width="45" className="rounded-circle" />
                    </ListGroupItem>
                    <ListGroupItem className="border-0 px-2">
                      <img src={user4} alt="avatar" width="45" className="rounded-circle" />
                    </ListGroupItem>
                  </ListGroup>
                </div>
                <Button color="primary" size="lg" className="mt-4 mb-3">
                  Checkout All Reviews
                </Button>
              </CardBody>
            </Col>
            <Col lg="8" md="7">
              <CardBody className='p-4'>
                <ReviewsData
                  icon="emoji-laughing"
                  reviewType="Positive"
                  noofReviews="25547"
                  rColor="success"
                  rPercent="47"
                />
                <ReviewsData
                  icon="emoji-frown"
                  reviewType="Negative"
                  noofReviews="5547"
                  rColor="danger"
                  rPercent="33"
                />
                <ReviewsData
                  icon="emoji-expressionless"
                  reviewType="Neutral"
                  noofReviews="547"
                  rColor="primary"
                  rPercent="20"
                />
              </CardBody>
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  );
};

export default Reviews;
