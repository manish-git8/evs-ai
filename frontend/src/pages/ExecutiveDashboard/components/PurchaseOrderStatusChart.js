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
import { ShoppingCart } from 'react-feather';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const PurchaseOrderStatusChart = (props) => {
  const { purchaseOrderStats } = props;

  if (!purchaseOrderStats) {
    return null;
  }

  const statusData = [
    { label: 'Draft', value: purchaseOrderStats.posDraft || 0, color: 'rgba(108, 117, 125, 0.8)' },
    { label: 'Pending Approval', value: purchaseOrderStats.posPendingApproval || 0, color: 'rgba(255, 193, 7, 0.8)' },
    { label: 'Rejected', value: purchaseOrderStats.posRejected || 0, color: 'rgba(220, 53, 69, 0.8)' },
    { label: 'Submitted', value: purchaseOrderStats.posSubmitted || 0, color: 'rgba(0, 123, 255, 0.8)' },
    { label: 'Confirmed', value: purchaseOrderStats.posConfirmed || 0, color: 'rgba(40, 167, 69, 0.8)' },
    { label: 'Partially Confirmed', value: purchaseOrderStats.posPartiallyConfirmed || 0, color: 'rgba(23, 162, 184, 0.8)' },
    { label: 'Shipped', value: purchaseOrderStats.posShipped || 0, color: 'rgba(255, 152, 0, 0.8)' },
    { label: 'Delivered', value: purchaseOrderStats.posDelivered || 0, color: 'rgba(76, 175, 80, 0.8)' }
  ];

  const data = {
    labels: statusData.map((item) => item.label),
    datasets: [
      {
        label: 'Purchase Orders',
        data: statusData.map((item) => item.value),
        backgroundColor: statusData.map((item) => item.color),
        borderColor: statusData.map((item) => item.color.replace('0.8', '1')),
        borderWidth: 1
      }
    ]
  };

  const totalPOs = purchaseOrderStats.totalPOs || 0;

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
            const value = context.parsed.x || 0;
            const percentage =
              totalPOs > 0 ? ((value / totalPOs) * 100).toFixed(1) : '0.0';
            return `${value} POs (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      },
      y: {
        ticks: {
          font: {
            size: 10
          }
        }
      }
    }
  };

  return (
    <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
      <CardBody className="p-3">
        <h6 className="mb-2 fw-bold text-info" style={{ fontSize: '0.9rem' }}>
          <ShoppingCart size={16} className="me-1" />
          Purchase Order Status
        </h6>
        <div className="text-center mb-2">
          <h3 className="mb-0 text-primary" style={{ fontSize: '1.5rem' }}>
            {totalPOs}
          </h3>
          <small className="text-muted">Total Purchase Orders</small>
        </div>
        <div style={{ height: '280px' }}>
          <Bar data={data} options={options} />
        </div>
      </CardBody>
    </Card>
  );
};

PurchaseOrderStatusChart.propTypes = {
  purchaseOrderStats: PropTypes.shape({
    posDraft: PropTypes.number,
    posPendingApproval: PropTypes.number,
    posRejected: PropTypes.number,
    posSubmitted: PropTypes.number,
    posConfirmed: PropTypes.number,
    posPartiallyConfirmed: PropTypes.number,
    posShipped: PropTypes.number,
    posDelivered: PropTypes.number,
    totalPOs: PropTypes.number
  })
};

PurchaseOrderStatusChart.defaultProps = {
  purchaseOrderStats: {
    posDraft: 0,
    posPendingApproval: 0,
    posRejected: 0,
    posSubmitted: 0,
    posConfirmed: 0,
    posPartiallyConfirmed: 0,
    posShipped: 0,
    posDelivered: 0,
    totalPOs: 0
  }
};

export default PurchaseOrderStatusChart;
