import { Row, Col } from 'reactstrap';
import Chart from 'react-apexcharts';
import DashCard from '../dashboardCards/DashCard';

const revenueData = [
  {
    title: '54,578',
    subtitle: 'Total Revenue',
  },
  {
    title: '43,451',
    subtitle: 'Online Revenue',
  },
  {
    title: '44,578',
    subtitle: 'Product A',
  },
  {
    title: '12,578',
    subtitle: 'Product B',
  },
];

const RevenueStatistics = () => {
  const optionsRevenue = {
    chart: {
      id: 'basic-bar',
      fontFamily: "'Rubik', sans-serif",
      type: 'area',
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
    <DashCard
      title="Revenue Statistics"
      subtitle="January 2022"
      actions={
        <div className="hstack gap-2">
          <div className="d-flex align-items-center">
            <i className="bi bi-circle-fill fs-6 me-2 text-success"></i>Product A
          </div>
          <div className="d-flex align-items-center">
            <i className="bi bi-circle-fill fs-6 me-2 text-primary"></i>Product B
          </div>
        </div>
      }
    >
      <div className="revenue" style={{ height: '350px' }}>
        <Chart options={optionsRevenue} series={seriesRevenue} type="area" height="350" />
      </div>
      <Row className="mt-4">
        {revenueData.map((rdata) => (
          <Col md="3" className="text-center mt-2 mt-md-0" key={rdata.title}>
            <h2 className="mb-0">${rdata.title}</h2>
            <span className="text-muted">{rdata.subtitle}</span>
          </Col>
        ))}
      </Row>
    </DashCard>
  );
};

export default RevenueStatistics;
