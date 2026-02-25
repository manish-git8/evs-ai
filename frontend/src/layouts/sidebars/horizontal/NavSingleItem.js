import React from "react";
import { NavLink, NavItem } from "reactstrap";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";

const NavSingleItem = ({
  to,
  icon,
  title,
  toggle,
  className,
  suffix,
  suffixColor,
}) => {
  const isActive = className?.includes('activeLink');
  return (
    <NavItem onClick={toggle} className={`elegant-nav-item ${className}`}>
      <NavLink 
        tag={Link} 
        to={to} 
        className="d-flex align-items-center gap-2 elegant-single-link"
        style={{
          borderRadius: '6px',
          transition: 'all 0.3s ease',
          padding: '8px 12px',
          margin: '0 2px',
          position: 'relative',
          overflow: 'hidden',
          textDecoration: 'none',
          background: isActive ? 'linear-gradient(135deg, rgba(0, 158, 251, 0.15) 0%, rgba(102, 126, 234, 0.12) 100%)' : 'transparent',
          borderLeft: isActive ? '3px solid #009efb' : '3px solid transparent',
          boxShadow: isActive ? '0 2px 8px rgba(0, 158, 251, 0.1)' : 'none'
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.target.style.background = 'linear-gradient(135deg, rgba(0, 158, 251, 0.1) 0%, rgba(102, 126, 234, 0.08) 100%)';
          }
          e.target.style.transform = 'translateY(-1px)';
          e.target.style.boxShadow = '0 4px 12px rgba(0, 158, 251, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = isActive ? 'linear-gradient(135deg, rgba(0, 158, 251, 0.15) 0%, rgba(102, 126, 234, 0.12) 100%)' : 'transparent';
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = isActive ? '0 2px 8px rgba(0, 158, 251, 0.1)' : 'none';
        }}
      >
        <span className="sidebarIcon me-2" style={{ fontSize: '16px', opacity: 0.8 }}>{icon}</span>
        <div className="d-flex flex-grow-1 align-items-center justify-content-between">
          <span className="nav-title" style={{
            fontSize: "14px", 
            fontWeight: isActive ? '600' : '500',
            color: isActive ? '#009efb' : 'inherit',
            transition: 'color 0.3s ease'
          }}>{title}</span>
          {suffix ? (
            <span className={`badge elegant-badge ${suffixColor}`} style={{
              borderRadius: '12px',
              fontSize: '10px',
              padding: '3px 8px',
              fontWeight: '600',
              marginLeft: '8px'
            }}>{suffix}</span>
          ) : null}
        </div>
      </NavLink>
    </NavItem>
  );
};
NavSingleItem.propTypes = {
  title: PropTypes.string,
  to: PropTypes.string,
  icon: PropTypes.node,
  toggle: PropTypes.func,
  className: PropTypes.string,
  suffix: PropTypes.any,
  suffixColor: PropTypes.string,
};

export default NavSingleItem;
