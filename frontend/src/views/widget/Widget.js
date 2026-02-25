import React from 'react';
import { Row, Col } from 'reactstrap';
import BreadCrumbs from '../../layouts/breadcrumbs/BreadCrumbs';

import Chat from '../../components/dashboard/modernDashboard/Chat';
import Feeds from '../../components/dashboard/awesomeDashboard/Feeds';
import Profile from '../../components/widgets/Profile';
import ProfileCard from '../../components/dashboard/modernDashboard/ProfileCard';
import WeatherReport from '../../components/dashboard/modernDashboard/WeatherReport';
import CustomerSupport from '../../components/dashboard/awesomeDashboard/CustomerSupport';
import TaskList from '../../components/dashboard/minimalDashboard/TaskList';
import BrowseStats from '../../components/dashboard/analyticalDashboard/BrowseStats';
import Notifications from '../../components/dashboard/classyDashboard/Notifications';

const Widgets = () => {
  return (
    <>
      <BreadCrumbs />
      <Row>
        <Col xs="12" lg="4">
          <BrowseStats />
          <ProfileCard />
          <TaskList />
        </Col>
        <Col xs="12" lg="4">
          <Chat />
          <CustomerSupport />
          <Profile />
        </Col>
        <Col xs="12" lg="4">
          <Notifications />
          <WeatherReport />
          <Feeds />
        </Col>
      </Row>
    </>
  );
};

export default Widgets;
