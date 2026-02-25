import { Row, Col } from 'reactstrap';
import BreadCrumbs from '../../layouts/breadcrumbs/BreadCrumbs';

import ChartCards from '../../components/dashboard/analyticalDashboard/ChartCards';
import TotalRevenue from '../../components/dashboard/analyticalDashboard/TotalRevenue';
import BrowseStats from '../../components/dashboard/analyticalDashboard/BrowseStats';
import RecentMessages from '../../components/dashboard/modernDashboard/RecentMessages';
import Chat from '../../components/dashboard/modernDashboard/Chat';
import ProfileCard from '../../components/dashboard/modernDashboard/ProfileCard';
import VisitSource from '../../components/dashboard/classyDashboard/VisitSource';
import SalesPrediction from '../../components/dashboard/modernDashboard/SalesPrediction';
import SalesDifference from '../../components/dashboard/modernDashboard/SalesDifference';
import Experiances from '../../components/dashboard/classyDashboard/Experiances';
import CalendarApp from "../apps/calendar/CalendarApp";

const Analytical = () => {
  return (
    <>
    <BreadCrumbs />
      <ChartCards />
      <Row>
        <Col lg="8">
          <TotalRevenue />
        </Col>
        <Col lg="4">
          <SalesPrediction />
          <SalesDifference />
        </Col>
      </Row>
      <Row>
        <Col lg="6">
          <VisitSource />
        </Col>
        <Col lg="6">
          <BrowseStats />
        </Col>
      </Row>
      <Row>
        <Col lg="8">
          <Experiances />
        </Col>
        <Col lg="4">
          <ProfileCard />
        </Col>
      </Row>
      {/*********************Chat & comment ************************/}
      <Row>
        <Col lg="6" sm="12">
          <Chat />
        </Col>
        <Col lg="6" sm="12">
          <RecentMessages />
        </Col>
      </Row>
      <CalendarApp />
    </>
  );
};

export default Analytical;
