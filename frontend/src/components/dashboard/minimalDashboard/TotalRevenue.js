import Chart from 'react-apexcharts';
import DashCard from '../dashboardCards/DashCard';

const TotalRevenue = () => {
  const options = {
    chart: {
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
      width: 2,
    },
    colors: ['#009efb', '#39c449'],
    legend: {
      show: false,
    },
    markers: {
      size: 3,
    },
    xaxis: {
      categories: ['0', '4', '8', '12', '16', '20'],
      labels: {
        show: true,
        style: {
          colors: '#99abb4',
          fontSize: '12px',
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      show: true,
      labels: {
        show: true,
        style: {
          colors: '#99abb4',
          fontSize: '12px',
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    grid: {
      borderColor: 'rgba(0,0,0,0.2)',
      strokeDashArray: 2,
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    tooltip: {
      theme: 'dark',
    },
  };
  const series = [
    {
      name: '2021',
      data: [4, 2, 3.5, 1.5, 4, 3],
    },
    {
      name: '2022',
      data: [2, 4, 2, 4, 2, 4],
    },
  ];

  return (
    <DashCard
      title="Total Revenue"
      subtitle="January 2022"
      actions={
        <div className="hstack gap-2">
          <div className="d-flex align-items-center">
            <i className="bi bi-circle-fill fs-6 me-2 text-success"></i>2021
          </div>
          <div className="d-flex align-items-center">
            <i className="bi bi-circle-fill fs-6 me-2 text-primary"></i>2022
          </div>
        </div>
      }
    >
      <div style={{ height: '240px' }}>
        <Chart options={options} series={series} type="line" height="250" />
      </div>
    </DashCard>
  );
};

export default TotalRevenue;
