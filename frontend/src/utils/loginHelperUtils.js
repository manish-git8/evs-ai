const getRedirectPathForUser = ({ entityType, roles }) => {
  const roleRedirectPriority = {
    COMPANY: [
      { role: 'RECEIVER', path: '/dashboard' },
      { role: 'ACCOUNT_PAYABLE', path: '/dashboard' },
      { role: 'COMPANY_ADMIN', path: '/dashboard' },
      { role: 'BUYER', path: '/dashboard' }
    ],
    SUPPLIER: [
      { role: 'SUPPLIER_ADMIN', path: '/supplier-dashboard' }
    ],
    ADMIN: [
      { role: 'ADMIN', path: '/company-management' }
    ]
  };

  const priorityList = roleRedirectPriority[entityType] || [];
  const match = priorityList.find(({ role }) => roles.includes(role));
  return match ? match.path : '/login';
};

  export default getRedirectPathForUser;
  