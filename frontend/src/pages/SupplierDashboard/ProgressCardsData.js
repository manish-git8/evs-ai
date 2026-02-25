import React from 'react';
import PropTypes from 'prop-types';
import { Col } from 'reactstrap';

const ProgressCardsData = ({ title, pColor, amount, count }) => {
  return (
    <Col md={6} lg={3}>
      <div
        className="card shadow-sm"
        style={{
          borderRadius: '5px',
          background: 'linear-gradient(145deg, #eaf5ff, #ffffff)',
        }}
      >
        <div className="card-body py-4">
          <h4
            className="card-title text-uppercase fw-bold mb-3"
            style={{ color: '#17a2b8' }}
          >
            {title}
          </h4>
          <div className="text-end">
            <h2 className="fw-light mb-0">
              <a
                href="/purchase-order?status=shipped"
                className="text-decoration-underline text-dark"
              >
                {count}
              </a>
            </h2>
          </div>
          <span
            className={`text-${pColor} fw-bold fs-5`}
          >
            {amount}
          </span>
        </div>
      </div>
    </Col>
  );
};

ProgressCardsData.defaultProps = {
  pColor: 'info',
};

ProgressCardsData.propTypes = {
  pColor: PropTypes.oneOf(['info', 'success', 'warning', 'danger', 'default']),
  title: PropTypes.string,
  count: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  icon: PropTypes.string,
  subtext: PropTypes.string,
  amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default ProgressCardsData;
