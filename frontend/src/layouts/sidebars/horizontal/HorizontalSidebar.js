import { Container, Nav } from 'reactstrap';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import NavSubItem from './NavSubItem';
import NavSingleItem from './NavSingleItem';
import { getUserRole } from '../../../pages/localStorageUtil';
import { getEffectivePath } from '../../../utils/pathUtils';
import { filterCompanySidebar, filterSupplierSidebar, filterAdminSidebar } from '../../../utils/rolesMapUtils';

const filterSidebarData = (entityType, userRoles = []) => {
  switch (entityType) {
    case 'COMPANY':
      return filterCompanySidebar(userRoles);
    case 'SUPPLIER':
      return filterSupplierSidebar();
    case 'ADMIN':
      return filterAdminSidebar();
    default:
      return [];
  }
};

const HorizontalSidebar = () => {
  const {
    sidebarBg: activeBg,
    isSidebarFixed: isFixed,
    isMobileSidebar,
  } = useSelector((state) => state.customizer);
  const { pathname } = useLocation();
  const currentURL = pathname.split('/').slice(0, -1).join('/');
  const userDetails = JSON.parse(localStorage.getItem('userDetails') || '{}');
  const { entityType } = userDetails;
  const userRoles = getUserRole() || [];
  const filteredSidebarData = filterSidebarData(entityType, userRoles);

  return (
    <div
      className={`horizontalNav elegant-horizontal-nav shadow bg-${activeBg}  ${isFixed ? 'fixedSidebar' : ''} ${
        isMobileSidebar ? 'showSidebar' : ''
      }`}
      style={{
        transition: 'all 0.3s ease',
        zIndex: 1000
      }}
    >
      <Container>
        <Nav className={activeBg === 'white' ? '' : 'lightText'}>
          {filteredSidebarData.map((navi) => {
            if (navi.caption) {
              return (
                <div
                  className="navCaption fw-bold mt-4 d-none d-sm-block d-md-none"
                  key={navi.caption}
                >
                  {navi.caption}
                </div>
              );
            }
            if (navi.children && navi.children.length > 0) {
              return (
                <NavSubItem
                  key={navi.id}
                  icon={navi.icon}
                  title={navi.title}
                  items={navi.children}
                  suffix={navi.suffix}
                  ddType={navi.ddType}
                  activeBck={activeBg}
                  suffixColor={navi.suffixColor}
                  isUrl={currentURL === navi.href}
                />
              );
            }
            return (
              <NavSingleItem
                key={navi.id}
                className={pathname === navi.href || getEffectivePath(pathname) === navi.href ? 'activeLink' : ''}
                to={navi.href}
                title={navi.title}
                suffix={navi.suffix}
                suffixColor={navi.suffixColor}
                icon={navi.icon}
              />
            );
          })}
      </Nav>
    </Container>
  </div>
);
};

export default HorizontalSidebar;