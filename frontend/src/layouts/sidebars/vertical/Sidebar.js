import React from 'react';
import { Button, Nav } from 'reactstrap';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import SimpleBar from 'simplebar-react';
import SidebarData from '../sidebardata/SidebarData';
import Logo from '../../logo/Logo';
import { ToggleMobileSidebar } from '../../../store/customizer/CustomizerSlice';
import NavItemContainer from './NavItemContainer';
import NavSubMenu from './NavSubMenu';
import { getEntityType, getUserRole } from '../../../pages/localStorageUtil';

const Sidebar = () => {
  const location = useLocation();
  const currentURL = location.pathname.split('/').slice(0, -1).join('/');

  // Get user entity and roles
  const userEntity = getEntityType();
  const userRoles = getUserRole();

  // Helper function to check if user has access to a menu item
  const hasAccess = (item) => {
    // Check if user's role is excluded
    if (item.excludeRoles && item.excludeRoles.length > 0) {
      const isExcluded = userRoles.some((role) => item.excludeRoles.includes(role));
      if (isExcluded) {
        return false;
      }
    }

    if (!item.allowedEntities && !item.allowedRoles) {
      return true; // No restrictions, show to everyone
    }

    let hasEntityAccess = true;
    let hasRoleAccess = true;

    if (item.allowedEntities && item.allowedEntities.length > 0) {
      hasEntityAccess = item.allowedEntities.includes(userEntity);
    }

    if (item.allowedRoles && item.allowedRoles.length > 0) {
      hasRoleAccess = userRoles.some((role) => item.allowedRoles.includes(role));
    }

    return hasEntityAccess && hasRoleAccess;
  };

  // Filter menu items based on user access
  const filterMenuItems = (items) => {
    return items
      .map((item) => {
        if (item.caption) {
          return item; // Captions are always shown
        }

        if (!hasAccess(item)) {
          return null; // User doesn't have access
        }

        // If item has children, filter them too
        if (item.children) {
          const filteredChildren = item.children.filter((child) => hasAccess(child));
          if (filteredChildren.length === 0) {
            return null; // No accessible children, hide parent
          }
          return { ...item, children: filteredChildren };
        }

        return item;
      })
      .filter((item) => item !== null);
  };

  const filteredSidebarData = filterMenuItems(SidebarData);

  //const [collapsed, setCollapsed] = useState(null);
  // const toggle = (index) => {
  //   setCollapsed(collapsed === index ? null : index);
  // };

  const activeBg = useSelector((state) => state.customizer.sidebarBg);
  const isFixed = useSelector((state) => state.customizer.isSidebarFixed);
  const dispatch = useDispatch();

  return (
    <div className={`sidebarBox shadow bg-${activeBg} ${isFixed ? 'fixedSidebar' : ''}`}>
      <SimpleBar style={{ height: '100%' }}>
        {/********Logo*******/}
        <div className="d-flex p-3 align-items-center">
          <Logo />
          <span className='d-sm-block d-lg-none'>
          <Button
            close
            size="sm"
            className="ms-auto "
            onClick={() => dispatch(ToggleMobileSidebar())}
          />
          </span>
        </div>
        {/********Sidebar Content*******/}
        <div className="p-3 pt-1 mt-2">
          <Nav vertical className={activeBg === 'white' ? '' : 'lightText'}>
            {filteredSidebarData.map((navi) => {
              if (navi.caption) {
                return (
                  <div className="navCaption text-uppercase mt-4" key={navi.caption}>
                    {navi.caption}
                  </div>
                );
              }
              if (navi.children) {
                return (
                  <NavSubMenu
                    key={navi.id}
                    icon={navi.icon}
                    title={navi.title}
                    items={navi.children}
                    suffix={navi.suffix}
                    suffixColor={navi.suffixColor}
                    // toggle={() => toggle(navi.id)}
                    // collapsed={collapsed === navi.id}
                    isUrl={currentURL === navi.href}
                  />
                );
              }
              return (
                <NavItemContainer
                  key={navi.id}
                  //toggle={() => toggle(navi.id)}
                  className={location.pathname === navi.href ? 'activeLink' : ''}
                  to={navi.href}
                  title={navi.title}
                  suffix={navi.suffix}
                  suffixColor={navi.suffixColor}
                  icon={navi.icon}
                />
              );
            })}
          </Nav>
        </div>
      </SimpleBar>
    </div>
  );
};

export default Sidebar;
