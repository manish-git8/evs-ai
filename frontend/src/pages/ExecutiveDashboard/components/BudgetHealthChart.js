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
import { getBudgetHealthColor } from '../utils/formatters';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const BudgetHealthChart = (props) => {
  const { budgetMetrics } = props;

  if (!budgetMetrics) return null;

  const {
    healthyBudgets = 0,
    warningBudgets = 0,
    criticalBudgets = 0,
    exceededBudgets = 0,
    utilizationPercentage = 0
  } = budgetMetrics;

  const totalBudgets =
    healthyBudgets + warningBudgets + criticalBudgets + exceededBudgets;

  const data = {
    labels: ['Healthy', 'Warning', 'Critical', 'Exceeded'],
    datasets: [
      {
        data: [
          healthyBudgets,
          warningBudgets,
          criticalBudgets,
          exceededBudgets
        ],
        backgroundColor: [
          getBudgetHealthColor('healthy'),
          getBudgetHealthColor('warning'),
          getBudgetHealthColor('critical'),
          getBudgetHealthColor('exceeded')
        ],
        borderWidth: 0
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '8px' }}>
      <CardBody className="p-3">
        <h6 className="mb-3 fw-bold text-success">
          Budget Health Distribution
        </h6>
        <div style={{ height: '160px' }}>
          <Doughnut data={data} options={options} />
        </div>
        <div className="mt-2" style={{ fontSize: '0.85rem' }}>
          <div className="d-flex justify-content-between mb-1">
            <span className="text-muted">Total Budgets:</span>
            <strong>{totalBudgets}</strong>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted">Utilization:</span>
            <strong className="text-primary">
              {typeof utilizationPercentage === 'number'
                ? utilizationPercentage.toFixed(1)
                : '0.0'}
              %
            </strong>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

BudgetHealthChart.propTypes = {
  budgetMetrics: PropTypes.shape({
    healthyBudgets: PropTypes.number,
    warningBudgets: PropTypes.number,
    criticalBudgets: PropTypes.number,
    exceededBudgets: PropTypes.number,
    utilizationPercentage: PropTypes.number
  })
};

BudgetHealthChart.defaultProps = {
  budgetMetrics: {
    healthyBudgets: 0,
    warningBudgets: 0,
    criticalBudgets: 0,
    exceededBudgets: 0,
    utilizationPercentage: 0
  }
};

export default BudgetHealthChart;
