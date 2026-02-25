import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardBody } from 'reactstrap';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { ShoppingCart } from 'react-feather';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const ProcurementActivityChart = (props) => {
  const { procurementActivity } = props;

  if (!procurementActivity) {
    return null;
  }

  const {
    totalRequisitions = 0,
    requisitionsApproved = 0,
    requisitionsRejected = 0,
    averageItemsPerRequisition = null
  } = procurementActivity;

  const pending = Math.max(
    0,
    totalRequisitions - requisitionsApproved - requisitionsRejected
  );

  const chartData = {
    labels: ['Approved', 'Pending', 'Rejected'],
    datasets: [
      {
        data: [
          requisitionsApproved || 0,
          pending || 0,
          requisitionsRejected || 0
        ],
        backgroundColor: [
          'rgba(40, 167, 69, 0.8)', // Green for approved
          'rgba(255, 193, 7, 0.8)', // Yellow for pending
          'rgba(220, 53, 69, 0.8)' // Red for rejected
        ],
        borderColor: [
          'rgba(40, 167, 69, 1)',
          'rgba(255, 193, 7, 1)',
          'rgba(220, 53, 69, 1)'
        ],
        borderWidth: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 11
          },
          generateLabels: (chart) => {
            // use destructuring & avoid shadowing any outer variable
            const { data: doughnutData } = chart;

            if (
              doughnutData.labels &&
              doughnutData.labels.length &&
              doughnutData.datasets &&
              doughnutData.datasets.length
            ) {
              return doughnutData.labels.map((label, i) => {
                const value = doughnutData.datasets[0].data[i] || 0;
                const percentage =
                  totalRequisitions > 0
                    ? ((value / totalRequisitions) * 100).toFixed(1)
                    : '0.0';

                return {
                  text: `${label}: ${value} (${percentage}%)`,
                  fillStyle: doughnutData.datasets[0].backgroundColor[i],
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed || 0;
            const percentage =
              totalRequisitions > 0
                ? ((value / totalRequisitions) * 100).toFixed(1)
                : '0.0';
            return `${context.label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
      <CardBody className="p-3">
        <h6 className="mb-2 fw-bold text-secondary" style={{ fontSize: '0.9rem' }}>
          <ShoppingCart size={16} className="me-1" />
          Procurement Activity
        </h6>
        <div className="text-center mb-2">
          <h3
            className="mb-0 text-primary"
            style={{ fontSize: '1.5rem' }}
          >
            {totalRequisitions}
          </h3>
          <small className="text-muted">Total Requisitions</small>
        </div>
        <div style={{ height: '200px', position: 'relative' }}>
          <Doughnut data={chartData} options={options} />
        </div>
        {averageItemsPerRequisition != null && (
          <div className="text-center mt-2 pt-2 border-top">
            <small className="text-muted">Avg Items/Req: </small>
            <strong className="text-info">
              {typeof averageItemsPerRequisition === 'number'
                ? averageItemsPerRequisition.toFixed(1)
                : averageItemsPerRequisition}
            </strong>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

ProcurementActivityChart.propTypes = {
  procurementActivity: PropTypes.shape({
    totalRequisitions: PropTypes.number,
    requisitionsApproved: PropTypes.number,
    requisitionsRejected: PropTypes.number,
    averageItemsPerRequisition: PropTypes.number
  })
};

ProcurementActivityChart.defaultProps = {
  procurementActivity: {
    totalRequisitions: 0,
    requisitionsApproved: 0,
    requisitionsRejected: 0,
    averageItemsPerRequisition: null
  }
};

export default ProcurementActivityChart;
