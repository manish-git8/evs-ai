import Chart from 'react-apexcharts';
import DashCard from '../dashboardCards/DashCard';

const DownloadCount = () => {
  const options = {
    chart: {
      fontFamily: "'Rubik', sans-serif",
      toolbar: {
        show: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 6,
      colors: ['transparent'],
    },
    plotOptions: {
      bar: {
        horizontal: false,
        endingShape: 'flat',
      },
    },
    legend: {
      show: false,
    },
    colors: ['#7460ee', '#009efb'],
    xaxis: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
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
      strokeDashArray: 2,
      borderColor: 'rgba(0,0,0,0.2)',
    },
    responsive: [
      {
        breakpoint: 2500,
        options: {
          plotOptions: {
            bar: {
              columnWidth: '15%',
            },
          },
        },
      },
    ],
    tooltip: {
      theme: 'dark',
    },
  };
  const series = [
    {
      name: 'Free',
      data: [5, 4, 3, 7, 5, 10, 3],
    },
    {
      name: 'Premium',
      data: [3, 2, 9, 5, 4, 6, 4],
    },
  ];
  return (
    <DashCard
      title="Download Count"
      subtitle="you can check the count"
      actions={
        <div className="hstack gap-2">
          <div className="d-flex align-items-center">
            <i className="bi bi-circle-fill fs-6 me-2 text-info"></i>Free
          </div>
          <div className="d-flex align-items-center">
            <i className="bi bi-circle-fill fs-6 me-2 text-primary"></i>Premium
          </div>
        </div>
      }
    >
      <div className="download-state" style={{ height: '300px' }}>
        <Chart options={options} series={series} type="bar" height="300" />
      </div>
    </DashCard>
  );
};

export default DownloadCount;
