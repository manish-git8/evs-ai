import React from "react";
import { Col, Row, Card, CardBody } from "reactstrap";

import Chart from "react-apexcharts";

const PieCards = () => {
  const optionstat1 = {
    labels: ["Increase", "Decrease"],
    dataLabels: {
      enabled: false,
    },
    grid: {
      padding: {
        left: 0,
        right: 0,
      },
    },
    chart: {},
    plotOptions: {
      pie: {
        donut: {
          size: "80px",
        },
      },
    },
    stroke: {
      width: 0,
    },
    legend: {
      show: false,
    },
    colors: ["#2962FF", "#edf1f5"],
    tooltip: {
      enabled: true,
      fillSeriesColor: false,
      theme: "dark",
    },
  };
  const seriesstat1 = [60, 30];
  //   2
  const optionstat2 = {
    labels: ["Increase", "Decrease"],
    dataLabels: {
      enabled: false,
    },
    grid: {
      padding: {
        left: 0,
        right: 0,
      },
    },
    chart: {},
    plotOptions: {
      pie: {
        donut: {
          size: "80px",
        },
      },
    },
    stroke: {
      width: 0,
    },
    legend: {
      show: false,
    },
    colors: ["#f62d51", "#edf1f5"],
    tooltip: {
      enabled: true,
      fillSeriesColor: false,
      theme: "dark",
    },
  };
  const seriesstat2 = [60, 50];
  //   3
  const optionstat3 = {
    labels: ["Increase", "Decrease"],
    dataLabels: {
      enabled: false,
    },
    grid: {
      padding: {
        left: 0,
        right: 0,
      },
    },
    chart: {},
    plotOptions: {
      pie: {
        donut: {
          size: "80px",
        },
      },
    },
    stroke: {
      width: 0,
    },
    legend: {
      show: false,
    },
    colors: ["#ffbc34", "#edf1f5"],
    tooltip: {
      enabled: true,
      fillSeriesColor: false,
      theme: "dark",
    },
  };
  const seriesstat3 = [90, 40];
  //   4
  const optionstat4 = {
    labels: ["Increase", "Decrease"],
    dataLabels: {
      enabled: false,
    },
    grid: {
      padding: {
        left: 0,
        right: 0,
      },
    },
    chart: {},
    plotOptions: {
      pie: {
        donut: {
          size: "80px",
        },
      },
    },
    stroke: {
      width: 0,
    },
    legend: {
      show: false,
    },
    colors: ["#009efb", "#edf1f5"],
    tooltip: {
      enabled: true,
      fillSeriesColor: false,
      theme: "dark",
    },
  };
  const seriesstat4 = [100, 60];
  return (
    <Row>
      <Col sm={6}>
        <Card>
          <CardBody>
              <Row className="py-2 align-items-center">
                <Col className="pe-0">
                <h2 className="fw-light fs-1">86</h2>
                <h6 className="text-muted">New Clients</h6>
                </Col>
                <Col className="text-end align-self-center">
                <div
                  style={{
                    height: "100px",
                    width: "100px",
                  }}
                >
                  <Chart
                    options={optionstat1}
                    series={seriesstat1}
                    type="donut"
                    width="125px"
                  />
                </div>
                </Col>
              </Row>
          </CardBody>
        </Card>
      </Col>
      <Col sm={6}>
        <Card>
          <CardBody>
              <Row className="py-2 align-items-center">
                <Col className="pe-0">
                <h2 className="fw-light fs-1">248</h2>
                <h6 className="text-muted">All Projects</h6>
                </Col>
                <Col className="text-end align-self-center">
                <div
                  style={{
                    height: "100px",
                    width: "100px",
                  }}
                >
                  <Chart
                    options={optionstat2}
                    series={seriesstat2}
                    type="donut"
                    width="125px"
                  />
                </div>
                </Col>
              </Row>
          </CardBody>
        </Card>
      </Col>
      <Col sm={6}>
        <Card>
          <CardBody>
              <Row className="py-2 align-items-center">
                <Col className="pe-0">
                <h2 className="fw-light fs-1">352</h2>
                <h6 className="text-muted">New Items</h6>
                </Col>
                <Col className="text-end align-self-center">
                <div
                  style={{
                    height: "100px",
                    width: "100px",
                  }}
                >
                  <Chart
                    options={optionstat3}
                    series={seriesstat3}
                    type="donut"
                    width="125px"
                  />
                </div>
                </Col>
              </Row>
          </CardBody>
        </Card>
      </Col>
      <Col sm={6}>
        <Card>
          <CardBody>
              <Row className="py-2 align-items-center">
                <Col className="pe-0">
                <h2 className="fw-light fs-1">159</h2>
                <h6 className="text-muted">Invoices</h6>
                </Col>
                <Col className="text-end align-self-center">
                <div
                  style={{
                    height: "100px",
                    width: "100px",
                  }}
                >
                  <Chart
                    options={optionstat4}
                    series={seriesstat4}
                    type="donut"
                    width="125px"
                  />
                </div>
                </Col>
              </Row>
          </CardBody>
        </Card>
      </Col>
    </Row>
  );
};

export default PieCards;
