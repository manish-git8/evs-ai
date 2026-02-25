import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardBody } from 'reactstrap';
import { formatCurrency, formatNumber, formatPercentage } from '../utils/formatters';

const MetricCard = (props) => {
  const {
    title,
    value,
    format,
    icon,
    trend,
    subtitle,
    color
  } = props;

  const formatValue = () => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return formatPercentage(value);
      case 'number':
      default:
        return formatNumber(value);
    }
  };

  return (
    <Card className="mb-3">
      <CardBody>
        <div className="d-flex align-items-center">
          <div className="flex-grow-1">
            <h6 className="text-muted mb-1">{title}</h6>
            <h3 className={`mb-0 text-${color}`}>{formatValue()}</h3>
            {subtitle && <small className="text-muted">{subtitle}</small>}
          </div>
          {icon && (
            <div className={`ms-3 text-${color}`} style={{ fontSize: '2rem' }}>
              {icon}
            </div>
          )}
        </div>
        {trend && (
          <div className="mt-2">
            <small className={`text-${trend.color}`}>
              {trend.icon} {trend.text}
            </small>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

MetricCard.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  format: PropTypes.oneOf(['number', 'currency', 'percentage']),
  icon: PropTypes.node,
  trend: PropTypes.shape({
    color: PropTypes.string,
    icon: PropTypes.node,
    text: PropTypes.string
  }),
  subtitle: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  color: PropTypes.string
};

MetricCard.defaultProps = {
  title: '',
  value: 0,
  format: 'number',
  icon: null,
  trend: null,
  subtitle: '',
  color: 'primary'
};

export default MetricCard;
