import React from 'react';
import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import getRedirectPathForUser from '../utils/loginHelperUtils';

const isAuthenticated = () => {
  const user = localStorage.getItem('user');
  const userDetails = localStorage.getItem('userDetails');

  try {
    const userData = JSON.parse(user);
    const userDetailsData = JSON.parse(userDetails);

    if (userData && userData.jwtToken && userDetailsData) {
      return {
        entityType: userDetailsData.entityType,
        roles: userDetailsData.ROLE || [],  
      };
    }
  } catch (error) {
    console.error('Error parsing localStorage data:', error);
  }
  return null;
};

const PublicRoute = ({ element }) => {
  const userInfo = isAuthenticated();
  console.log('userInfo:', userInfo);

  if (userInfo) {
    const redirectPath = getRedirectPathForUser(userInfo);
    console.log('Redirecting to:', redirectPath);
    return <Navigate to={redirectPath} replace />;
  }

  return element;
};


PublicRoute.propTypes = {
  element: PropTypes.element.isRequired,
};

export default PublicRoute;
