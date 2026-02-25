import { Input } from 'reactstrap';
import Chart from 'react-apexcharts';
import DashCard from '../dashboardCards/DashCard';

const VisitSource = () => {
  const options = {
    chart: {
      id: 'donut-chart',
      fontFamily: "'Rubik', sans-serif",
    },
    dataLabels: {
      enabled: false,
    },
    grid: {
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
    },
    colors: ['#f62d51', '#7460ee', '#009efb', '#90a4ae'],
    tooltip: {
      fillSeriesColor: false,
    },
  };

  const series = [45, 15, 27, 18];
  return (
    <DashCard
      title="Visit source"
      actions={
        <Input type="select" className="form-select">
          <option value="0">January</option>
          <option value="1">February</option>
          <option value="2">March</option>
        </Input>
      }
    >
      <div style={{ width: '100%', height: '272px' }}>
        <Chart options={options} series={series} type="donut" height="272" />
      </div>
      <div className="hstack gap-2 mt-2 pt-1 justify-content-center">
        <div className="d-flex align-items-center mx-3">
          <i className="bi bi-circle-fill fs-6 me-2 text-primary"></i>Desktop
        </div>
        <div className="d-flex align-items-center mx-3">
          <i className="bi bi-circle-fill fs-6 me-2 text-danger"></i>Tablet
        </div>
        <div className="d-flex align-items-center mx-3">
          <i className="bi bi-circle-fill fs-6 me-2 text-primary"></i>Mobile
        </div>
        <div className="d-flex align-items-center mx-3">
          <i className="bi bi-circle-fill fs-6 me-2 text-muted"></i>Other
        </div>
      </div>
    </DashCard>
  );
};

export default VisitSource;
