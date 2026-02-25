import { Breadcrumb, BreadcrumbItem } from 'reactstrap';
import { useLocation, Link } from 'react-router-dom';
import SidebarData from '../sidebars/sidebardata/HorizontalSidebarData';
import { getEffectivePath } from '../../utils/pathUtils';
import getRedirectPathForUser from '../../utils/loginHelperUtils';

const BreadCrumbs = () => {
  const location = useLocation();
  const firstUrl = location.pathname.split('/')[1];
  const secondUrl = location.pathname.split('/')[2];
  const userDetails = JSON.parse(localStorage.getItem('userDetails') || '{}');
  const { entityType } = userDetails;
  const roles =  userDetails.ROLE || [];  

  if (entityType === 'ADMIN') {
    return null;
  }

  const formatBreadcrumb = (str) => {
    return str
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const homePage = getRedirectPathForUser({ entityType, roles });
  const isNotNumber = (str) => !str || Number.isNaN(Number(str));

  const findBreadcrumbTrail = (path, data) => {
    let trail = [];
    data.forEach((item) => {
      if (item.caption === '') {
        trail.push({ title: item.caption, isCaption: true });
      }

      if (item.href === path) {
        trail.push({ title: item.title, href: item.href });
      } else if (item.children) {
        const childTrail = findBreadcrumbTrail(path, item.children);
        if (childTrail.length > 0) {
          if (!item.isCaption) {
            trail.push({ title: item.title, href: item.href });
          }
          trail = [...trail, ...childTrail];
        }
      }
    });
    return trail;
  };

  const currentPath = location.pathname;
  const breadcrumbTrail = findBreadcrumbTrail(getEffectivePath(currentPath), SidebarData);

  return (
    <Breadcrumb>
      <BreadcrumbItem to={homePage} tag={Link} className="text-decoration-none">
        Home
      </BreadcrumbItem>
      {breadcrumbTrail.length > 0 ? (
        breadcrumbTrail.map((item) =>
          item.isCaption ? (
            <BreadcrumbItem key={`caption-${item.title}`} active>
              <strong>{item.title}</strong>
            </BreadcrumbItem>
          ) : (
            <BreadcrumbItem
              key={item.href || item.title}
              {...(item.href ? { to: item.href, className: 'text-decoration-none' } : {})}
              active={
                !item.href || breadcrumbTrail[breadcrumbTrail.length - 1].title === item.title
              }
            >
              {item.title}
            </BreadcrumbItem>
          ),
        )
      ) : (
        <>
          {firstUrl && isNotNumber(firstUrl) && (
            <BreadcrumbItem active>{formatBreadcrumb(firstUrl)}</BreadcrumbItem>
          )}
          {secondUrl && isNotNumber(secondUrl) && (
            <BreadcrumbItem active>{formatBreadcrumb(secondUrl)}</BreadcrumbItem>
          )}
        </>
      )}
    </Breadcrumb>
  );
};

export default BreadCrumbs;
