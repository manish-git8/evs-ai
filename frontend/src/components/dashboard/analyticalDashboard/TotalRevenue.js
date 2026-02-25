import Chart from 'react-apexcharts';
import DashCard from '../dashboardCards/DashCard';

const TotalRevenue = () => {
  const options = {
    chart: {
      toolbar: {
        show: false,
      },
      stacked: true,
      fontFamily: "'Rubik', sans-serif",
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 4,
      colors: ['transparent'],
    },
    legend: {
      show: false,
    },
    plotOptions: {
      bar: {
        horizontal: false,
        endingShape: 'flat',
      },
    },
    colors: ['#0f8edd', '#11a0f8', '#51bdff'],
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
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
    },
    tooltip: {
      theme: 'dark',
    },
    responsive: [
      {
        breakpoint: 2500,
        options: {
          plotOptions: {
            bar: {
              columnWidth: '30%',
            },
          },
        },
      },
    ],
  };
  const series = [
    {
      name: '2020',
      data: [800000, 1200000, 1400000, 1300000, 1200000, 1400000, 1300000, 1300000, 1200000],
    },
    {
      name: '2015',
      data: [200000, 400000, 500000, 300000, 400000, 500000, 300000, 300000, 400000],
    },
    {
      name: '2010',
      data: [100000, 200000, 400000, 600000, 200000, 400000, 600000, 600000, 200000],
    },
  ];
  return (
    <DashCard
      title="Total Revenue"
      actions={
        <div className="hstack gap-2">
          <div className="d-flex align-items-center">
            <i className="bi bi-circle-fill fs-6 me-2" style={{ color: '#51bdff' }}></i>2010
          </div>
          <div className="d-flex align-items-center">
            <i className="bi bi-circle-fill fs-6 me-2" style={{ color: '#11a0f8' }}></i>2015
          </div>
          <div className="d-flex align-items-center">
            <i className="bi bi-circle-fill fs-6 me-2 text-primary"></i>2020
          </div>
        </div>
      }
    >
      <div className="total-sales" style={{ height: '335px' }}>
        <Chart options={options} series={series} type="bar" height="335" />
      </div>
    </DashCard>
  );
};

export default TotalRevenue;
