import { Row, Col } from 'reactstrap';

import TopCardsData from './TopCardsData';

const TopCards = () => {
  return (
    <Row>
      <Col sm="6" lg="3">
        <TopCardsData
          bg="primary"
          title="2,064"
          subtitle="Sessions"
        />
      </Col>
      <Col sm="6" lg="3">
        <TopCardsData
          bg="info"
          title="1,738"
          subtitle="Users"
        />
      </Col>
      <Col sm="6" lg="3">
        <TopCardsData
          bg="success"
          title="5,963"
          subtitle="Page Views"
        />
      </Col>      
      <Col sm="6" lg="3">
        <TopCardsData
          bg="warning"
          title="4,464"
          subtitle="Bounce Rate"
        />
      </Col>
    </Row>
  );
};

export default TopCards;
