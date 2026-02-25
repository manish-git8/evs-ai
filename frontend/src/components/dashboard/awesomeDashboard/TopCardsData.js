import { Card, CardBody, CardSubtitle, CardTitle } from 'reactstrap';
import PropTypes from 'prop-types';

const TopCardsData = ({ bg, title, subtitle }) => {
  return (
    <Card className={`bg-${bg}`}>
      <CardBody className="text-center">
        <CardTitle className="fs-1 mb-0 fw-light text-dark-white">{title}</CardTitle>
        <CardSubtitle className="fs-6 text-dark-white">{subtitle}</CardSubtitle>
      </CardBody>
    </Card>
  );
};

TopCardsData.propTypes = {
  bg: PropTypes.string,
  title: PropTypes.string,
  subtitle: PropTypes.string,
};
export default TopCardsData;
