import Chart from 'react-apexcharts';
import { Col, Row, Input } from 'reactstrap';
import DashCard from '../dashboardCards/DashCard';
import '../modernDashboard/SalesMonth.scss';

const EarningsMonth = () => {
  const optionsSales = {
    chart: {
      id: 'donut-chart',
      fontFamily: "'Rubik', sans-serif",
    },
    dataLabels: {
      enabled: false,
    },
    grid: {
      borderColor: 'rgba(0,0,0,0.2)',
      padding: {
        left: 0,
        right: 0,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '90px',
        },
      },
    },
    stroke: {
      width: 0,
    },
    legend: {
      show: false,
      labels: {
        colors: 'red',
      },
    },
    colors: ['#edf1f5', '#009efb', '#55ce63', '#745af2'],
    tooltip: {
      fillSeriesColor: false,
    },
  };
  const seriesSales = [45, 15, 27, 18];
  return (
    <DashCard
      title="Earnings of the Month"
      subtitle="January 2022"
      actions={
        <Input type="select" className="form-select">
          <option value="0">January</option>
          <option value="1">February</option>
          <option value="2">March</option>
          <option value="3">April</option>
        </Input>
      }
    >
      <Row className="mt-4">
        <Col md="7">
          <div className="mt-3 position-relative" style={{ height: '250px' }}>
            <Chart options={optionsSales} series={seriesSales} type="donut" height="250" />
            <div className="round-overlap sales">
              <i className="bi bi-cart-fill text-muted"> </i>
            </div>
          </div>
        </Col>
        <Col md="5">
          <h2 className="mb-1 mt-3 fs-1">65 %</h2>
          <span className="text-muted">160 Sales January</span>
          <div className="vstack gap-3 mt-4 pt-1 justify-content-center">
            <div className="d-flex align-items-center">
              <i className="bi bi-circle-fill fs-6 me-2 text-info"></i>Organic Sales
            </div>
            <div className="d-flex align-items-center">
              <i className="bi bi-circle-fill fs-6 me-2 text-success"></i>Search Engine
            </div>
            <div className="d-flex align-items-center">
              <i className="bi bi-circle-fill fs-6 me-2 text-primary"></i>Marketing
            </div>
          </div>
        </Col>
      </Row>
    </DashCard>
  );
};

export default EarningsMonth;
