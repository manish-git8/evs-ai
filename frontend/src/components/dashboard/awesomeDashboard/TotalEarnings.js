import React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  ListGroup,
  ListGroupItem,
  Input
} from 'reactstrap';
import img1 from '../../../assets/images/users/user1.jpg';
import img2 from '../../../assets/images/users/user2.jpg';
import img3 from '../../../assets/images/users/user3.jpg';
import img4 from '../../../assets/images/users/user4.jpg';
import img5 from '../../../assets/images/users/user5.jpg';

const earningData = [
  {
    title: 'Cras justo odio',
    img: img1,
    earn: '2,000',
    bg: "success",
    id: 1,
  },
  {
    title: 'New user registered.',
    img: img2,
    earn: '4,521',
    bg: "info",
    id: 2,
  },
  {
    title: 'Server #1 overloaded.',
    img: img3,
    earn: '1,500',
    bg: "warning",
    id: 3,
  },
  {
    title: 'New order received.',
    img: img4,
    earn: '6,000',
    bg: "danger",
    id: 4,
  },
  {
    title: 'Cras justo odio',
    img: img5,
    earn: '7,800',
    bg: "primary",
    id: 5,
  },
];

const TotalEarnings = () => {
  return (
    <Card>
      <CardBody>
      <div className="d-md-flex align-items-center">
          <div>
            <CardTitle tag="h4">Total Earning</CardTitle>
            <h3 className="fw-bold mb-0">$586</h3>
          </div>

          <div className="ms-auto">
            <Input type="select" className="form-select">
              <option value="0">March</option>
              <option value="1">April</option>
              <option value="2">May</option>
              <option value="3">June</option>
            </Input>
          </div>
        </div>
      </CardBody>
      <ListGroup flush>
        {earningData.map((earning) => (
          <ListGroupItem
            key={earning.id}
            action
            href="/"
            tag="a"
            className="d-flex align-items-center py-3 border-0"
          >
            <img src={earning.img} alt={earning.img} className="rounded-circle" width="45" />
            <h5 className='ms-3 mb-0'>{earning.title}</h5>
            <div className='ms-auto'>
                <span className={`badge text-dark-white bg-${earning.bg}`}>${earning.earn}</span>
            </div>
          </ListGroupItem>
        ))}
      </ListGroup>
    </Card>
  );
};

export default TotalEarnings;
