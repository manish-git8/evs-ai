import React from 'react';
import { Card, CardBody, Col, Row } from 'reactstrap';

import Chart from 'react-apexcharts';

const ChartCards = () => {
  const series1 = [
    {
      data: [0, 5, 6, 10, 9, 12, 4, 9],
    },
  ];
  const options1 = {
    chart: {
      type: 'bar',
      height: 50,
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      bar: {
        columnWidth: "30%",
      },
    },
    colors: ['#007ec8'],
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
  const options2 = {
    chart: {
      type: 'bar',
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
    colors: ['#39c449'],
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
  const options3 = {
    chart: {
      type: 'bar',
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
    colors: ['#7460ee'],
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
  const options4 = {
    chart: {
      type: 'bar',
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
    colors: ['#f62d51'],
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

  return (
    <Row>
      <Col lg={3} md={6}>
        <Card>
          <CardBody>
            <Row>
              <Col xs="8">
                <span className="fs-1 fw-light">
                  2376 <i className="bi bi-caret-down-fill fs-6 text-danger"></i>
                </span>
                <h6 className="text-muted">Total Visits</h6>
              </Col>
              <Col xs="4" className="d-flex justify-content-end align-items-center ps-0">
                <div className='me-n4'>
                  <Chart options={options1} series={series1} type="bar" height={50} width={80} />
                </div>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Col>
      <Col lg={3} md={6}>
        <Card>
          <CardBody>
            <Row>
              <Col xs="8">
                <span className="fs-1 fw-light">
                  3670 <i className="bi bi-caret-up-fill fs-6 text-success"></i>
                </span>
                <h6 className="text-muted">Page Views</h6>
              </Col>
              <Col xs="4" className="d-flex justify-content-end align-items-center ps-0">
                <div className='me-n4'>
                  <Chart options={options2} series={series1} type="bar"  height={50} width={80}/>
                </div>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Col>
      <Col lg={3} md={6}>
        <Card>
          <CardBody>
            <Row>
              <Col xs="8">
                <span className="fs-1 fw-light">
                  1562 <i className="bi bi-caret-up-fill fs-6 text-success"></i>
                </span>
                <h6 className="text-muted">Unique Visits</h6>
              </Col>
              <Col xs="4" className="d-flex justify-content-end align-items-center ps-0">
                <div className='me-n4'>
                  <Chart options={options3} series={series1} type="bar" height={50} width={80}/>
                </div>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Col>
      <Col lg={3} md={6}>
        <Card>
          <CardBody>
            <Row>
              <Col xs="8">
                <span className="fs-1 fw-light">
                  35% <i className="bi bi-caret-down-fill fs-6 text-danger"></i>
                </span>
                <h6 className="text-muted">Bounce Rate</h6>
              </Col>
              <Col xs="4" className="d-flex justify-content-end align-items-center ps-0">
                <div className='me-n4'>
                  <Chart options={options4} series={series1} type="bar" height={50} width={80}/>
                </div>
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Col>
    </Row>
  );
};

export default ChartCards;
