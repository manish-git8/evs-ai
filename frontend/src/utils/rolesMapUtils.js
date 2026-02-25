import SidebarData from '../layouts/sidebars/sidebardata/HorizontalSidebarData';
import { getEntityType } from '../pages/localStorageUtil';

const filterChildren = (children, excludedTitles = [], userEntity, userRoles) => {
  if (!children) return [];

  return children.filter((child) => {
    // Exclude by title
    if (excludedTitles.includes(child.title)) {
      return false;
    }

    // Check if user's role is excluded
    if (child.excludeRoles && child.excludeRoles.length > 0) {
      const isExcluded = userRoles.some((role) => child.excludeRoles.includes(role));
      if (isExcluded) {
        return false;
      }
    }

    // Check access control if defined
    if (child.allowedEntities || child.allowedRoles) {
      let hasEntityAccess = true;
      let hasRoleAccess = true;

      if (child.allowedEntities && child.allowedEntities.length > 0) {
        hasEntityAccess = child.allowedEntities.includes(userEntity);
      }

      if (child.allowedRoles && child.allowedRoles.length > 0) {
        hasRoleAccess = userRoles.some((role) => child.allowedRoles.includes(role));
      }

      return hasEntityAccess && hasRoleAccess;
    }

    return true;
  });
};

const companyRoleAccessMap = {
  COMPANY_ADMIN: [
    'Dashboard',
    'Approval',
    'GRN Receipt',
    'Accounts Management',
    'Receipt',
    'Buyer',
    'Budget',
    'Templates',
    'Executive Dashboard',
    'Email Provider',
    'Accounts',
    'Internal Catalog',
    'Suppliers',
  ],
  ACCOUNT_PAYABLE: ['Accounts Management', 'Dashboard', 'Accounts'],
  RECEIVER: ['GRN Receipt', 'Dashboard'],
  BUYER: ['Dashboard', 'Buyer', 'Approval', 'RFQ', 'Company Suppliers', 'Internal Catalog', 'Suppliers'],
};

export const filterCompanySidebar = (userRoles) => {
  const userEntity = getEntityType();
  const allowedTitles = new Set();
  userRoles.forEach((role) => {
    const access = companyRoleAccessMap[role];
    if (access) {
      access.forEach((title) => allowedTitles.add(title));
    }
  });

  return SidebarData.filter((item) => {
    // Check if user's role is excluded for this item
    if (item.excludeRoles && item.excludeRoles.length > 0) {
      const isExcluded = userRoles.some((role) => item.excludeRoles.includes(role));
      if (isExcluded) {
        return false;
      }
    }

    return (
      item.caption === 'Home' ||
      (allowedTitles.has(item.title) && item.href !== '/supplier-dashboard')
    );
  }).map((item) => ({
    ...item,
    children: filterChildren(
      item.children,
      ['Company Management', 'Supplier Management'],
      userEntity,
      userRoles,
    ),
  }));
};

export const filterSupplierSidebar = () => {
  const userEntity = getEntityType();
  const userRoles = ['SUPPLIER_ADMIN']; // Suppliers typically have SUPPLIER_ADMIN role

  return SidebarData.filter(
    (item) =>
      item.caption === 'Home' ||
      item.href === '/supplier-dashboard' ||
      item.title === 'Catalog' ||
      item.title === 'Feedback' ||
      item.title === 'RFQ' ||
      item.title === 'Accounts' ||
      item.title === 'Invoices',
  ).map((item) => ({
    ...item,
    children: filterChildren(
      item.children,
      ['Company Management', 'Supplier Management', 'Subscription Management'],
      userEntity,
      userRoles,
    ),
  }));
};

export const filterAdminSidebar = () => {
  const userEntity = getEntityType();
  const userRoles = ['ADMIN'];

  const filteredItems = SidebarData.filter((item) =>
    ['Admin', 'Supplier', 'Buyer'].includes(item.title),
  );

  const flattenedChildren = filteredItems
    .flatMap((item) =>
      filterChildren(item.children, [], userEntity, userRoles).filter((child) =>
        [
          'Company Management',
          'Supplier Management',
          'User Management',
          'Subscription Management',
        ].includes(child.title),
      ),
    )
    .map((child) => ({
      ...child,
      id: child.id || Math.random().toString(36).substr(2, 9),
    }));

  const order = [
    'Company Management',
    'Supplier Management',
    'User Management',
    'Subscription Management',
  ];

  flattenedChildren.sort((a, b) => order.indexOf(a.title) - order.indexOf(b.title));

  return flattenedChildren;
};
