import { Card, CardBody, CardTitle, CardSubtitle } from 'reactstrap';
import PropTypes from 'prop-types';

const ComponentCard = ({ children, title, subtitle, action }) => {
  return (
    <Card>
      <CardTitle tag="h4" style={{ fontSize: "16px" }} className="d-flex justify-content-between align-items-center border-bottom px-4 py-3 mb-0">
        {title}
        {action}
      </CardTitle>
      <CardBody className="px-3 py-3" style={{ marginTop: -20 }} >
        <CardSubtitle className="text-muted mb-3">{subtitle || ''}</CardSubtitle>
        <div>{children}</div>
      </CardBody>
    </Card>
  );
};

ComponentCard.propTypes = {
  children: PropTypes.node,
  title: PropTypes.node,
  subtitle: PropTypes.node,
  action: PropTypes.node
};

export default ComponentCard;
