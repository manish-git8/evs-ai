import { Row, Col } from 'reactstrap';
import BreadCrumbs from '../../layouts/breadcrumbs/BreadCrumbs';

import ProfileCard from '../../components/dashboard/modernDashboard/ProfileCard';
import Timeline from '../../components/dashboard/classyDashboard/Timeline';
import UserProfile from '../../components/dashboard/classyDashboard/UserProfile';
import Reviews from '../../components/dashboard/classyDashboard/Reviews';
import DownloadCount from '../../components/dashboard/classyDashboard/DownloadCount';
import ProductsAvailability from '../../components/dashboard/classyDashboard/ProductsAvailability';
import VisitSource from '../../components/dashboard/classyDashboard/VisitSource';
import Notifications from '../../components/dashboard/classyDashboard/Notifications';
import InstaFace from '../../components/dashboard/classyDashboard/InstaFace';
import BandwidthUsage from '../../components/dashboard/classyDashboard/BandwidthUsage';
import Downloads from '../../components/dashboard/classyDashboard/Downloads';
import Experiances from '../../components/dashboard/classyDashboard/Experiances';

const Classy = () => {
  return (
    <>
    <BreadCrumbs />
      <InstaFace />
      <Row>
        <Col lg="6">
          <BandwidthUsage />
        </Col>
        <Col lg="6">
          <Downloads />
        </Col>
      </Row>
      <Row>
        <Col lg="6">
          <Notifications />
        </Col>
        <Col lg="6">
          <VisitSource />
        </Col>
      </Row>
      <DownloadCount />
      <Reviews />
      <ProductsAvailability />

      <Row>
        <Col lg="4">
          <ProfileCard />
        </Col>
        <Col lg="8">
          <Experiances />
        </Col>
      </Row>

      <Row>
        <Col lg="4">
          <UserProfile />
        </Col>
        <Col lg="8">
          <Timeline />
        </Col>
      </Row>
    </>
  );
};

export default Classy;
