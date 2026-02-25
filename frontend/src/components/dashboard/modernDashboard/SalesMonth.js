import Chart from 'react-apexcharts';
import DashCard from '../dashboardCards/DashCard';
import './SalesMonth.scss';

const SalesMonth = () => {
  const optionsSales = {
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
    <DashCard title="Sales of the Month">
      <div className="mt-3 position-relative" style={{ height: '300px' }}>
        <Chart options={optionsSales} series={seriesSales} type="donut" height="290" />
        <div className="round-overlap sales">
          <i className="bi bi-cart-fill text-muted"> </i>
        </div>
      </div>
      <div className="hstack gap-2 mt-2 pt-1 justify-content-center">
        <div className="d-flex align-items-center">
          <i className="bi bi-circle-fill fs-6 me-2 text-primary"></i>Item A
        </div>
        <div className="d-flex align-items-center">
          <i className="bi bi-circle-fill fs-6 me-2 text-success"></i>Item B
        </div>
        <div className="d-flex align-items-center">
          <i className="bi bi-circle-fill fs-6 me-2 text-info"></i>Item C
        </div>
      </div>
    </DashCard>
  );
};

export default SalesMonth;
