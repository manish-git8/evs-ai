import { Col, Row } from 'reactstrap';
import BreadCrumbs from '../../layouts/breadcrumbs/BreadCrumbs';

import TopCards from '../../components/dashboard/awesomeDashboard/TopCards';
import ProductCalculation from '../../components/dashboard/awesomeDashboard/ProductCalculation';
import MembersActivity from '../../components/dashboard/awesomeDashboard/MembersActivity';
import CustomerSupport from '../../components/dashboard/awesomeDashboard/CustomerSupport';
import TodaySchedule from '../../components/dashboard/awesomeDashboard/TodaySchedule';
import SalesOverview from '../../components/dashboard/awesomeDashboard/SalesOverview';
import TotalEarnings from '../../components/dashboard/awesomeDashboard/TotalEarnings';
import Feeds from '../../components/dashboard/awesomeDashboard/Feeds';

const Crypto = () => {
  return (
    <>
    <BreadCrumbs />
      <TopCards />
      <ProductCalculation />
      <Row>
        <Col lg="6">
          <MembersActivity />
        </Col>
        <Col lg="6">
          <CustomerSupport />
        </Col>
      </Row>
      <Row>
        <Col lg="4">
          <TodaySchedule />
        </Col>
        <Col lg="8">
          <SalesOverview />
        </Col>
      </Row>
      <Row>
        <Col lg="6">
          <TotalEarnings />
        </Col>
        <Col lg="6">
          <Feeds />
        </Col>
      </Row>
    </>
  );
};

export default Crypto;
