import React from 'react';
import { NavItem, NavLink } from 'reactstrap';
import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import { getEffectivePath } from '../../../utils/pathUtils';

const NavSubItem = ({ to, icon, title, items, suffix, activeBck, suffixColor, ddType }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);
  const hoverTimeoutRef = React.useRef(null);
  const leaveTimeoutRef = React.useRef(null);

  const isParentActive = items.some((item) => getEffectivePath(location.pathname) === item.href);

  // Handle mouse enter with delay
  const handleMouseEnter = () => {
    // Clear any existing leave timeout
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    
    // Set a small delay before opening to prevent accidental triggers
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 100);
  };

  // Handle mouse leave with delay
  const handleMouseLeave = () => {
    // Clear any existing enter timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    // Add delay before closing to allow cursor to reach submenu
    leaveTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  // Handle submenu mouse enter - keep dropdown open
  const handleSubmenuEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  // Handle submenu mouse leave - close dropdown
  const handleSubmenuLeave = () => {
    leaveTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  // Mobile click handler for touch devices
  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  // Clean up timeouts on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  return (
    <NavItem 
      className={`elegant-nav-dropdown ${isParentActive ? 'activeParent' : ''} ${ddType}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <NavLink 
        to={to} 
        className="gap-2 cursor-pointer elegant-nav-link d-flex align-items-center" 
        onClick={handleClick}
        style={{
          borderRadius: '6px',
          transition: 'all 0.3s ease',
          padding: '8px 12px',
          margin: '0 2px',
          position: 'relative',
          overflow: 'hidden',
          background: isParentActive ? 'linear-gradient(135deg, rgba(0, 158, 251, 0.15) 0%, rgba(102, 126, 234, 0.12) 100%)' : 'transparent',
          borderLeft: isParentActive ? '3px solid #009efb' : '3px solid transparent',
          boxShadow: isParentActive ? '0 2px 8px rgba(0, 158, 251, 0.1)' : 'none'
        }}
        onMouseEnter={(e) => {
          if (!isParentActive) {
            e.target.style.background = 'linear-gradient(135deg, rgba(0, 158, 251, 0.1) 0%, rgba(102, 126, 234, 0.08) 100%)';
          }
          e.target.style.transform = 'translateY(-1px)';
          e.target.style.boxShadow = '0 4px 12px rgba(0, 158, 251, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = isParentActive ? 'linear-gradient(135deg, rgba(0, 158, 251, 0.15) 0%, rgba(102, 126, 234, 0.12) 100%)' : 'transparent';
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = isParentActive ? '0 2px 8px rgba(0, 158, 251, 0.1)' : 'none';
        }}
      >
        <span className="sidebarIcon me-2" style={{ 
          fontSize: '16px', 
          opacity: isParentActive ? 1 : 0.8,
          color: isParentActive ? '#009efb' : 'inherit'
        }}>{icon}</span>
        <div className="d-flex flex-grow-1 align-items-center justify-content-between">
          <span className="nav-title" style={{
            fontSize: "14px", 
            fontWeight: isParentActive ? '600' : '500',
            color: isParentActive ? '#009efb' : 'inherit',
            transition: 'color 0.3s ease'
          }}>{title}</span>
          <div className="d-flex align-items-center gap-2">
            {suffix ? <span className={`badge ${suffixColor} elegant-badge`} style={{
              borderRadius: '12px',
              fontSize: '10px',
              padding: '3px 8px',
              fontWeight: '600'
            }}>{suffix}</span> : ''}
            <i className="bi bi-chevron-down elegant-chevron" style={{
              fontSize: '12px',
              transition: 'transform 0.3s ease, color 0.3s ease',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              opacity: 0.7
            }} />
          </div>
        </div>
      </NavLink>
      <div 
        className={`firstDD elegant-dropdown bg-${activeBck} ${isOpen ? 'showfirstDD' : ''}`} 
        style={{
          borderRadius: '8px',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          backdropFilter: 'blur(10px)',
          padding: '8px 0',
          marginTop: '8px'
        }}
        onMouseEnter={handleSubmenuEnter}
        onMouseLeave={handleSubmenuLeave}
      >
        {items.map((item) => {
          const isActiveChild = getEffectivePath(location.pathname) === item.href;
          return (
            <div
              key={item.title}
              className={`elegant-dropdown-item ${isActiveChild ? 'activeLink' : ''}`}
            >
              <Link 
                to={item.href} 
                className="d-flex align-items-center gap-3 elegant-sub-link nav-link"
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  margin: '1px 6px',
                  transition: 'all 0.3s ease',
                  backgroundColor: isActiveChild ? 'rgba(0, 158, 251, 0.1)' : 'transparent',
                  borderLeft: isActiveChild ? '3px solid #009efb' : '3px solid transparent',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActiveChild) {
                    e.target.style.backgroundColor = 'rgba(0, 158, 251, 0.05)';
                    e.target.style.borderLeft = '3px solid rgba(0, 158, 251, 0.3)';
                    e.target.style.transform = 'translateX(3px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveChild) {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.borderLeft = '3px solid transparent';
                    e.target.style.transform = 'translateX(0)';
                  }
                }}
              >
                <span className="sidebarIcon" style={{ fontSize: '14px', opacity: 0.7 }}>{item.icon}</span>
                <span className="nav-sub-title" style={{
                  fontSize: "13px",
                  fontWeight: isActiveChild ? '600' : '500',
                  color: isActiveChild ? '#009efb' : 'inherit'
                }}>{item.title}</span>
              </Link>
            </div>
          );
        })}
      </div>
    </NavItem>
  );
};

NavSubItem.propTypes = {
  title: PropTypes.string,
  to: PropTypes.string,
  icon: PropTypes.node,
  items: PropTypes.array,
  suffix: PropTypes.any,
  activeBck: PropTypes.string,
  suffixColor: PropTypes.string,
  ddType: PropTypes.string,
};
export default NavSubItem;
