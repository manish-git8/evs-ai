import { Row, Col } from 'reactstrap';
import BreadCrumbs from '../../layouts/breadcrumbs/BreadCrumbs';

import ProjectTable from '../../components/dashboard/modernDashboard/ProjectTable';
import WeatherReport from '../../components/dashboard/modernDashboard/WeatherReport';
import RecentMessages from '../../components/dashboard/modernDashboard/RecentMessages';
import TaskList from '../../components/dashboard/minimalDashboard/TaskList';
import TotalRevenue from '../../components/dashboard/minimalDashboard/TotalRevenue';
import PieCards from '../../components/dashboard/minimalDashboard/PieCards';
import EarningsMonth from '../../components/dashboard/minimalDashboard/EarningsMonth';
import IncomeYear from '../../components/dashboard/minimalDashboard/IncomeYear';

const Minimal = () => {
  return (
    <>
    <BreadCrumbs />
      <Row>
        <Col lg="6">
          <TotalRevenue />
        </Col>
        <Col lg="6">
          <PieCards />
        </Col>
      </Row>
      <Row>
        <Col lg="6">
          <EarningsMonth />
        </Col>
        <Col lg="6">
          <IncomeYear />
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
      <Row>
        <Col lg="6">
          <RecentMessages />
        </Col>
        <Col lg="6">
          <TaskList />
        </Col>
      </Row>
    </>
  );
};

export default Minimal;
