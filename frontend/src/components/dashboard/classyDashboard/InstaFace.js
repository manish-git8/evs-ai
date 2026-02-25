import { Row, Col, Card, CardBody, CardTitle, CardSubtitle } from 'reactstrap';
import Chart from 'react-apexcharts';

const InstaFace = () => {
    const options = {
        chart: {
          type: "area",
          fontFamily: "'Rubik', sans-serif",
          toolbar: {
            show: false,
          },
        },
        dataLabels: {
          enabled: false,
        },
        stroke: {
          curve: "smooth",
          width: 2,
        },
        colors: ["rgba(30,172,190, 0.3)", "rgba(38,198,218, 0.7)"],
        legend: {
          show: false,
        },
        markers: {
          size: 3,
        },
        xaxis: {
          categories: [
            "0",
            "4",
            "8",
            "12",
            "16",
            "20",
            "24",
            "30",
            "16",
            "20",
            "24",
            "30",
            "34",
            "38",
            "42",
            "46",
            "50",
            "54",
          ],
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
          borderColor: "rgba(0,0,0,0.2)",
          strokeDashArray: 2,
        },
        fill: {
          type: "solid",
        },
        tooltip: {
          theme: "dark",
        },
      };
      const series = [
        {
          name: "Instagram",
          data: [
            11,
            4,
            3,
            14,
            9,
            10,
            18,
            15,
            24,
            17,
            19,
            26,
            31,
            26,
            37,
            41,
            46,
            51,
          ],
        },
        {
          name: "Facebook",
          data: [
            8,
            1,
            1,
            10,
            11,
            6,
            12,
            14,
            21,
            15,
            21,
            24,
            28,
            23,
            34,
            38,
            41,
            47,
          ],
        },
      ];
  return (
    <Card>
      <Row>
        <Col lg={6} md={4}>
          <CardBody>
            <CardTitle tag="h4">Instagram Vs Facebook</CardTitle>
            <CardSubtitle className="text-muted mb-0">check the difference of social media</CardSubtitle>
          </CardBody>
        </Col>
        <Col lg={3} md={4} className="border-end align-self-center">
          <CardBody>
            <div className="d-flex flex-row">
              <div className="col-8 p-0 align-self-center">
                <h3 className="mb-0">31568</h3>
                <h5 className="text-muted mb-0">Growth</h5>
              </div>
              <div className="col-4 text-end">
                <div className="circle-box md-box text-dark-white d-inline-block text-center align-self-center bg-danger">
                  <i className="bi bi-instagram"></i>
                </div>
              </div>
            </div>
          </CardBody>
        </Col>
        <Col lg={3} md={4} className="align-self-center">
          <CardBody className="card-body">
            <div className="d-flex flex-row">
              <div className="col-8 p-0 align-self-center">
                <h3 className="mb-0">15478</h3>
                <h5 className="text-muted mb-0">Loss</h5>
              </div>
              <div className="col-4 text-right">
                <div className="circle-box md-box text-dark-white d-inline-block text-center align-self-center bg-primary">
                  <i className="bi bi-facebook"></i>
                </div>
              </div>
            </div>
          </CardBody>
        </Col>
      </Row>
      <div className="andvios border-top" style={{ height: "350px" }}>
        <Chart options={options} series={series} type="area" height="350" />
      </div>
    </Card>
  );
};

export default InstaFace;
