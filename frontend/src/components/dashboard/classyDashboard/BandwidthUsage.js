import React from 'react';
import { Row, Col, Card, CardBody } from 'reactstrap';

import Chart from 'react-apexcharts';

const BandwidthUsage = () => {
  const options1 = {
    chart: {
      toolbar: {
        show: false,
      },
      fontFamily: "'Rubik', sans-serif",
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: 'smooth',
    },
    colors: ['#fff'],
    xaxis: {
      categories: ['0', '4', '8', '12', '16', '20', '24', '30'],
      labels: {
        show: false,
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      show: false,
    },
    grid: {
      show: false,
    },
    tooltip: {
      theme: 'dark',
    },
  };

  const series1 = [
    {
      name: 'Bandwidth usage',
      data: [5, 0, 12, 1, 8, 3, 12, 15],
    },
  ];

  return (
    <Card className="bg-info">
      <CardBody>
        <div className="d-flex">
          <div className="me-3 align-self-center">
            <h1 className="text-dark-white">
              <i className="bi bi-pie-chart"></i>
            </h1>
          </div>
          <div>
            <h3 className="text-dark-white">Bandwidth usage</h3>
            <h6 className="text-dark-white">March 2022</h6>
          </div>
        </div>
        <Row>
          <Col xs={5} className="align-self-center">
            <h4 className="display-6 text-dark-white text-truncate">50 GB</h4>
          </Col>
          <Col xs={7} className="align-self-center">
            <div className="usage" style={{ height: '120px' }}>
              <Chart options={options1} series={series1} type="line" height="120" />
            </div>
          </Col>
        </Row>
      </CardBody>
    </Card>
  );
};

export default BandwidthUsage;
