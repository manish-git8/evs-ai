import React from 'react';
import PropTypes from 'prop-types';

import { ListGroup, ListGroupItem, Progress } from 'reactstrap';

const ReviewsData = ({ reviewType, icon, noofReviews, rColor, rPercent  }) => {
  return (
    <>
      <ListGroup>
        <ListGroupItem className="p-0 my-3 py-2 border-0">
          <div className="d-flex align-items-center">
            <i className={`bi bi-${icon} display-6 text-muted`} />
            <div className="ms-3 w-100">
              <h5 className="mb-0">{reviewType} Reviews</h5>
              <span className="text-muted">{noofReviews} Reviews</span>
              <Progress color={rColor} value={rPercent} className="mt-2" />
            </div>
          </div>
        </ListGroupItem>
      </ListGroup>
    </>
  );
};

ReviewsData.defaultProps = {
  rColor: 'default',
};

ReviewsData.propTypes = {
  rColor: PropTypes.oneOf([
    'primary',
    'success',
    'danger',
    'default',
  ]),
  icon: PropTypes.string,
  reviewType: PropTypes.node,
  noofReviews: PropTypes.node,
  rPercent: PropTypes.node,
};

export default ReviewsData;
