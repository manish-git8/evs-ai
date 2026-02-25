import {
  Card,
  CardBody,
  CardSubtitle,
  CardTitle,
  Col,
  Row,
  ListGroup,
  ListGroupItem,
  ListGroupItemHeading,
} from 'reactstrap';
import Chart from 'react-apexcharts';

import user1 from '../../../assets/images/users/user1.jpg';
import user2 from '../../../assets/images/users/user2.jpg';
import user3 from '../../../assets/images/users/user3.jpg';

const msgsData = [
  {
    image: user1,
    name: 'James Anderson',
    comment: 'Lorem Ipsum is simply dummy text of the printing',
    date: '7:05 AM',
  },
  {
    image: user2,
    name: 'Michael Jorden',
    comment: 'Lorem Ipsum is simply dummy text of the printing',
    date: '4:50 AM',
  },
  {
    image: user3,
    name: 'Johnathan Doeting',
    comment: 'Lorem Ipsum is simply dummy text of the printing',
    date: '8:40 PM',
  },
];

const ProductCalculation = () => {
  const optionsRevenue = {
    chart: {
      id: 'basic-bar',
      type: 'area',
      fontFamily: "'Rubik', sans-serif",
      toolbar: {
        show: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: 'smooth',
      width: 1,
    },
    colors: ['#009efb', '#39c449'],
    legend: {
      show: false,
    },
    markers: {
      size: 3,
    },
    xaxis: {
      categories: ['0', '4', '8', '12', '16', '20', '24', '30'],
      labels: {
        show: true,
        style: {
          colors: '#99abb4',
          fontSize: '12px',
        },
      },
    },
    yaxis: {
      labels: {
        show: true,
        style: {
          colors: '#99abb4',
          fontSize: '12px',
        },
      },
    },
    grid: {
      borderColor: 'rgba(0,0,0,0.2)',
      strokeDashArray: 2,
    },
    tooltip: {
      theme: 'dark',
    },
  };
  const seriesRevenue = [
    {
      name: 'Product A',
      data: [0, 2, 3.5, 0, 13, 1, 4, 1],
    },
    {
      name: 'Product B',
      data: [0, 4, 0, 4, 0, 4, 0, 4],
    },
  ];
  return (
    <Card className="overflow-hidden">
      <Row>
        <Col md="5" lg="4" className="border-end">
          <CardBody>
            <CardTitle tag="h4">Welcome Steave</CardTitle>
            <CardSubtitle className="text-muted">you have 3 new messages</CardSubtitle>
            <ListGroup className="mt-4" flush>
              {msgsData.map((icomment) => (
                <ListGroupItem
                  action
                  href="#"
                  tag="a"
                  key={icomment.name}
                  className="d-flex border-0 p-3 rounded"
                >
                  <div className="d-flex align-items-center">
                    <img src={icomment.image} alt="user" width="50" className="rounded-circle" />
                    <div className="ms-3 col-6">
                      <ListGroupItemHeading className="fw-bold mb-0 text-truncate">
                        {icomment.name}
                      </ListGroupItemHeading>
                      <span className="d-block text-truncate text-muted">{icomment.comment}</span>
                      <small className="text-muted">{icomment.date}</small>
                    </div>
                  </div>
                </ListGroupItem>
              ))}
            </ListGroup>
          </CardBody>
        </Col>
        <Col md="7" lg="8">
          <CardBody>
            <div className="d-md-flex align-items-center">
              <div>
                <CardTitle tag="h4">Product Calculation</CardTitle>
                <CardSubtitle className="text-muted">January 2022</CardSubtitle>
              </div>

              <div className="hstack gap-2 ms-auto">
                <div className="d-flex align-items-center">
                  <i className="bi bi-circle-fill fs-6 me-2 text-success"></i>2021
                </div>
                <div className="d-flex align-items-center">
                  <i className="bi bi-circle-fill fs-6 me-2 text-primary"></i>2022
                </div>
              </div>
            </div>
            <div
              style={{
                height: '350px',
              }}
            >
              <Chart options={optionsRevenue} series={seriesRevenue} type="area" height="350" />
            </div>
          </CardBody>
        </Col>
      </Row>
    </Card>
  );
};

export default ProductCalculation;
