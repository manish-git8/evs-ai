import Chart from 'react-apexcharts';
import DashCard from '../dashboardCards/DashCard';

const IncomeYear = () => {
  const options = {
    chart: {
      toolbar: {
        show: false,
      },
      fontFamily: "'Rubik', sans-serif",
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 0,
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
    colors: ['#39c449', '#009efb'],
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
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
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    grid: {
      strokeDashArray: 2,
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
              columnWidth: '50%',
            },
          },
        },
      },
    ],
  };
  const series = [
    {
      name: 'Net',
      data: [5, 4, 3, 7, 5, 10, 3],
    },
    {
      name: 'Growth',
      data: [3, 2, 9, 5, 4, 6, 4],
    },
  ];
  return (
    <DashCard
      title="Income of the Year"
      subtitle="January 2022"
      actions={
        <div className="hstack gap-2">
          <div className="d-flex align-items-center">
            <i className="bi bi-circle-fill fs-6 me-2 text-success"></i>Net
          </div>
          <div className="d-flex align-items-center">
            <i className="bi bi-circle-fill fs-6 me-2 text-primary"></i>Growth
          </div>
        </div>
      }
    >
      <div className="income-year" style={{ height: '275px' }}>
        <Chart options={options} series={series} type="bar" height="275" />
      </div>
    </DashCard>
  );
};

export default IncomeYear;
