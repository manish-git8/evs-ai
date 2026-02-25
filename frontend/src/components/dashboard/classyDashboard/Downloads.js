import React from 'react';
import { Row, Col, Card, CardBody } from 'reactstrap';

import Chart from 'react-apexcharts';

const Downloads = () => {
  const options2 = {
    chart: {
      type: 'bar',
      width: 60,
      height: 50,
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      bar: {
        columnWidth: '30%',
      },
    },
    colors: ['rgba(255,255,255,0.3)'],
    labels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    xaxis: {
      crosshairs: {
        width: 1,
      },
    },
    tooltip: {
      theme: 'dark',
      fixed: {
        enabled: false,
      },
      x: {
        show: false,
      },
      y: {},
      marker: {
        show: false,
      },
    },
  };

  const series2 = [
    {
      name: 'Count',
      data: [4, 5, 9, 10, 9, 12, 4, 9, 4, 5, 3, 10],
    },
  ];
  return (
    <Card className="bg-danger">
      <CardBody>
        <div className="d-flex">
          <div className="me-3 align-self-center">
            <h1 className="text-dark-white">
              <i className="bi bi-cloud-download"></i>
            </h1>
          </div>
          <div>
            <h3 className="text-dark-white">Downloads</h3>
            <h6 className="text-dark-white">March 2022</h6>
          </div>
        </div>
        <Row>
          <Col xs={5} className="align-self-center">
            <h4 className="display-6 text-dark-white text-truncate">35487</h4>
          </Col>
          <Col xs={7} className="d-flex justify-content-end">
            <div style={{ height: '120px', width: '100px' }}>
              <Chart options={options2} series={series2} type="bar" height="120" />
            </div>
          </Col>
        </Row>
      </CardBody>
    </Card>
  );
};

export default Downloads;
