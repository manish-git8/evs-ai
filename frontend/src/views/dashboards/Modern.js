import { Row, Col } from 'reactstrap';
import BreadCrumbs from '../../layouts/breadcrumbs/BreadCrumbs';

import ProgressCards from '../../components/dashboard/modernDashboard/ProgressCards';
import RevenueStatistics from '../../components/dashboard/modernDashboard/RevenueStatistics';
import SalesMonth from '../../components/dashboard/modernDashboard/SalesMonth';
import SalesPrediction from '../../components/dashboard/modernDashboard/SalesPrediction';
import SalesDifference from '../../components/dashboard/modernDashboard/SalesDifference';
import ProfileCard from '../../components/dashboard/modernDashboard/ProfileCard';
import ProjectTable from '../../components/dashboard/modernDashboard/ProjectTable';
import RecentMessages from '../../components/dashboard/modernDashboard/RecentMessages';
import Chat from '../../components/dashboard/modernDashboard/Chat';
import WeatherReport from '../../components/dashboard/modernDashboard/WeatherReport';
import Blogs from '../../components/dashboard/modernDashboard/Blogs';

const Classic = () => {
  return (
    <>
    <BreadCrumbs />
      <ProgressCards />
      <RevenueStatistics />
      <Row>
        <Col lg="4">
          <SalesMonth />
        </Col>
        <Col lg="4">
          <SalesPrediction />
          <SalesDifference />
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
      {/*********************Project Table ************************/}
      <Row>
        <Col lg="8">
          <ProjectTable />
        </Col>
        <Col lg="4">
          <WeatherReport />
        </Col>
      </Row>
      <Blogs />
    </>
  );
};

export default Classic;
