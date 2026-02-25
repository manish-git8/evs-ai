import React from 'react';
import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { getUserRole } from '../pages/localStorageUtil';

const isAuthenticated = () => {
  const user = localStorage.getItem('user');
  try {
    const userData = JSON.parse(user);
    return userData && userData.jwtToken;
  } catch (error) {
    return false;
  }
};

const PrivateRoute = ({ element, allowedRoles = [], allowedEntities = [] }) => {
  const user = isAuthenticated();
  const userDetail = JSON.parse(localStorage.getItem('userDetails'));

  if (!user) {
    return <Navigate to="/login" />;
  }

  const userRole = getUserRole();
  const userEntity = userDetail?.entityType;
  const isRoleAllowed = userRole.some(role => allowedRoles.includes(role));
  const isEntityAllowed = allowedEntities.includes(userEntity);

  if (!isRoleAllowed || !isEntityAllowed) {
    console.log('Access Denied:', {
      userRole,
      userEntity,
      allowedRoles,
      allowedEntities,
    });
    return <Navigate to="/404" />;
  }

  return element;
};

PrivateRoute.propTypes = {
  element: PropTypes.element.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  allowedEntities: PropTypes.arrayOf(PropTypes.string),
};

export default PrivateRoute;
