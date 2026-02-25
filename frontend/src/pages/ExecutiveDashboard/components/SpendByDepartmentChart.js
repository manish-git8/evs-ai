import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardBody } from 'reactstrap';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { formatCurrency } from '../utils/formatters';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const SpendByDepartmentChart = (props) => {
  const { spendByDepartment } = props;

  if (!spendByDepartment || spendByDepartment.length === 0) {
    return null;
  }

  // Sort by total spend descending
  const sortedData = [...spendByDepartment]
    .sort((a, b) => (b.totalSpend || 0) - (a.totalSpend || 0))
    .slice(0, 10);

  const data = {
    labels: sortedData.map((dept) => dept.departmentName),
    datasets: [
      {
        label: 'Total Spend',
        data: sortedData.map((dept) => dept.totalSpend || 0),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const dept = sortedData[context.dataIndex];
            return [
              `Spend: ${formatCurrency(context.parsed.x)}`,
              `Transactions: ${dept.transactionCount || 0}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatCurrency(value)
        }
      }
    }
  };

  return (
    <Card className="mb-3">
      <CardBody>
        <h5 className="mb-3">Top Departments by Spend</h5>
        <div style={{ height: '400px' }}>
          <Bar data={data} options={options} />
        </div>
      </CardBody>
    </Card>
  );
};

SpendByDepartmentChart.propTypes = {
  spendByDepartment: PropTypes.arrayOf(
    PropTypes.shape({
      departmentName: PropTypes.string.isRequired,
      totalSpend: PropTypes.number.isRequired,
      transactionCount: PropTypes.number
    })
  )
};

SpendByDepartmentChart.defaultProps = {
  spendByDepartment: []
};

export default SpendByDepartmentChart;
