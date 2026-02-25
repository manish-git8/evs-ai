import React from 'react';
import PropTypes from 'prop-types';

import { Col, Card, CardBody, CardTitle, Progress } from 'reactstrap';

const ProgressCardsData = ({ title, icon, subtext, pColor, pPercent, income }) => {
  return (
    <>
      <Col lg={3} md={6}>
        <Card>
          <CardBody>
            <CardTitle tag="h4">{title}</CardTitle>
            <div className="text-end">
              <h2 className="fw-light mb-0">
                <i className={`bi bi-${icon} text-${pColor}`}></i> ${income}
              </h2>
              <span className="text-muted fw-light">{subtext}</span>
            </div>
            <span className={`text-${pColor}`}>{pPercent}%</span>
            <Progress color={pColor} value={pPercent} />
          </CardBody>
        </Card>
      </Col>
    </>
  );
};

ProgressCardsData.defaultProps = {
  pColor: 'default',
};

ProgressCardsData.propTypes = {
  pColor: PropTypes.oneOf(['primary', 'info', 'success', 'danger', 'default']),
  title: PropTypes.string,
  income: PropTypes.string,
  icon: PropTypes.string,
  subtext: PropTypes.string,
  pPercent: PropTypes.string,
};

export default ProgressCardsData;
