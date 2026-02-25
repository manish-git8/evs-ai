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
import { TrendingUp } from 'react-feather';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const RequisitionPipelineChart = (props) => {
  const { requisitionPipeline } = props;

  if (!requisitionPipeline) {
    return null;
  }

  const {
    draft = 0,
    submitted = 0,
    pendingApproval = 0,
    approved = 0,
    rejected = 0,
    poGenerated = 0
  } = requisitionPipeline;

  const total = draft + submitted + pendingApproval + approved + rejected + poGenerated;
  const conversionRate = total > 0 ? (poGenerated / total) * 100 : 0;

  // Pipeline stages in order
  const pipelineStages = [
    { label: 'Draft', value: draft, color: 'rgba(108, 117, 125, 0.8)' },
    { label: 'Submitted', value: submitted, color: 'rgba(0, 123, 255, 0.8)' },
    { label: 'Pending Approval', value: pendingApproval, color: 'rgba(255, 193, 7, 0.8)' },
    { label: 'Approved', value: approved, color: 'rgba(40, 167, 69, 0.8)' },
    { label: 'PO Generated', value: poGenerated, color: 'rgba(23, 162, 184, 0.8)' },
    { label: 'Rejected', value: rejected, color: 'rgba(220, 53, 69, 0.8)' }
  ];

  const data = {
    labels: pipelineStages.map((stage) => stage.label),
    datasets: [
      {
        label: 'Requisitions',
        data: pipelineStages.map((stage) => stage.value),
        backgroundColor: pipelineStages.map((stage) => stage.color),
        borderColor: pipelineStages.map((stage) => stage.color.replace('0.8', '1')),
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y || 0;
            const percentage =
              total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${value} requisitions (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      },
      x: {
        ticks: {
          font: {
            size: 10
          },
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };

  return (
    <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
      <CardBody className="p-3">
        <h6 className="mb-2 fw-bold text-primary" style={{ fontSize: '0.9rem' }}>
          <TrendingUp size={16} className="me-1" />
          Procurement Pipeline
        </h6>

        {/* Summary Section */}
        <div className="text-center mb-3 pb-2 border-bottom">
          <div className="row">
            <div className="col-6">
              <h3 className="mb-0 text-primary" style={{ fontSize: '1.8rem' }}>
                {total}
              </h3>
              <small className="text-muted">Total Requisitions</small>
            </div>
            <div className="col-6">
              <h3 className="mb-0 text-success" style={{ fontSize: '1.8rem' }}>
                {typeof conversionRate === 'number'
                  ? conversionRate.toFixed(0)
                  : '0'}
                %
              </h3>
              <small className="text-muted">Converted to PO</small>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div style={{ height: '200px' }}>
          <Bar data={data} options={options} />
        </div>

        {/* Quick Stats */}
        <div className="mt-2 pt-2 border-top" style={{ fontSize: '0.75rem' }}>
          <div className="d-flex justify-content-between">
            <span className="text-muted">In Progress:</span>
            <strong className="text-info">
              {draft + submitted + pendingApproval}
            </strong>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

RequisitionPipelineChart.propTypes = {
  requisitionPipeline: PropTypes.shape({
    draft: PropTypes.number,
    submitted: PropTypes.number,
    pendingApproval: PropTypes.number,
    approved: PropTypes.number,
    rejected: PropTypes.number,
    poGenerated: PropTypes.number
  })
};

RequisitionPipelineChart.defaultProps = {
  requisitionPipeline: {
    draft: 0,
    submitted: 0,
    pendingApproval: 0,
    approved: 0,
    rejected: 0,
    poGenerated: 0
  }
};

export default RequisitionPipelineChart;
