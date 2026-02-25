import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import SimpleBar from 'simplebar-react';
import {
  Navbar,
  Nav,
  NavItem,
  NavbarBrand,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Button,
  Input,
} from 'reactstrap';
import * as Icon from 'react-feather';
import { ReactComponent as LogoWhite } from '../../assets/images/logos/white-logo-icon.svg';
import MessageDD from './MessageDD';
import NotificationDD from './NotificationDD';
import MegaDD from './MegaDD';
import user1 from '../../assets/images/users/user4.jpg';

import { ToggleMiniSidebar, ToggleMobileSidebar } from '../../store/customizer/CustomizerSlice';
import ProfileDD from './ProfileDD';

const Header = () => {
  const isDarkMode = useSelector((state) => state.customizer.isDark);
  const topbarColor = useSelector((state) => state.customizer.topbarBg);
  const dispatch = useDispatch();
  const [profileImage, setProfileImage] = useState(localStorage.getItem('profileImageBase64') || user1);

  useEffect(() => {
    const handleProfileImageUpdate = () => {
      setProfileImage(localStorage.getItem('profileImageBase64') || user1);
    };

    window.addEventListener('profileImageUpdated', handleProfileImageUpdate);
    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate);
    };
  }, []);

  return (
    <Navbar
      color={topbarColor}
      dark={!isDarkMode}
      light={isDarkMode}
      expand="lg"
      className="topbar bg-gradient"
    >
      {/******************************/}
      {/**********Toggle Buttons**********/}
      {/******************************/}
      <div className="d-flex align-items-center">
        <Button
          color={topbarColor}
          className="d-none d-lg-block mx-1  hov-dd border-0"
          onClick={() => dispatch(ToggleMiniSidebar())}
        >
          <Icon.ArrowLeftCircle size={18} />
        </Button>
        <NavbarBrand href="/" className="d-sm-block d-lg-none">
          <LogoWhite />
        </NavbarBrand>
        <Button
          color={topbarColor}
          className="d-sm-block d-lg-none  hov-dd border-0 mx-1"
          onClick={() => dispatch(ToggleMobileSidebar())}
        >
          <i className="bi bi-list" />
        </Button>
      </div>

      {/******************************/}
      {/**********Left Nav Bar**********/}
      {/******************************/}

      <Nav className="me-auto d-flex flex-row align-items-center" navbar>
        {/******************************/}
        {/**********Notification DD**********/}
        {/******************************/}
        <UncontrolledDropdown className="mx-1 hov-dd">
          <DropdownToggle className="bg-transparent border-0" color={topbarColor}>
            <Icon.MessageSquare size={18} />
          </DropdownToggle>
          <DropdownMenu className="ddWidth">
            <DropdownItem header>
              <span className="mb-0 fs-5">Notifications</span>
            </DropdownItem>
            <DropdownItem divider />
            <SimpleBar style={{ maxHeight: '350px' }}>
              <NotificationDD />
            </SimpleBar>
            <DropdownItem divider />
            <div className="p-2 px-3">
              <Button color="primary" size="sm" block>
                Check All
              </Button>
            </div>
          </DropdownMenu>
        </UncontrolledDropdown>
        {/******************************/}
        {/**********Message DD**********/}
        {/******************************/}
        <UncontrolledDropdown className="mx-1 hov-dd">
          <DropdownToggle className="bg-transparent border-0" color={topbarColor}>
            <Icon.Mail size={18} />
          </DropdownToggle>
          <DropdownMenu className="ddWidth">
            <DropdownItem header>
              <span className="mb-0 fs-5">Messages</span>
            </DropdownItem>
            <DropdownItem divider />
            <SimpleBar style={{ maxHeight: '350px' }}>
              <MessageDD />
            </SimpleBar>
            <DropdownItem divider />
            <div className="p-2 px-3">
              <Button color="primary" size="sm" block>
                Check All
              </Button>
            </div>
          </DropdownMenu>
        </UncontrolledDropdown>
        {/******************************/}
        {/**********Mega DD**********/}
        {/******************************/}
        <UncontrolledDropdown className="mega-dropdown mx-1 hov-dd">
          <DropdownToggle className="bg-transparent border-0" color={topbarColor}>
            <Icon.Grid size={18} />
          </DropdownToggle>
          <DropdownMenu>
            <MegaDD />
          </DropdownMenu>
        </UncontrolledDropdown>
        <NavItem className="d-md-block d-none">
          {/* <Link to="/about" className={`nav-link ${topbarColor === 'white' ? 'text-dark' : ''}`}>
            About
          </Link> */}
        </NavItem>
      </Nav>

      <div className="d-flex">
        {/******************************/}
        {/**********Profile DD**********/}
        {/******************************/}
        <Input
          type="search"
          placeholder="Search"
          className="rounded-pill d-md-block d-none my-1 border-0"
        ></Input>
        <UncontrolledDropdown className=" hov-dd">
          <DropdownToggle color="transparent">
            <img src={profileImage} alt="profile" className="rounded-circle" width="30" style={{ objectFit: 'cover' }} />
          </DropdownToggle>
          <DropdownMenu className="ddWidth profile-dd">
            <ProfileDD />
            <div className="p-2 px-3">
              <Button color="danger" size="sm">
                Logoutttt
              </Button>
            </div>
          </DropdownMenu>
        </UncontrolledDropdown>
      </div>
    </Navbar>
  );
};

export default Header;
