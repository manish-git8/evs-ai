import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Card, CardBody, Badge } from 'reactstrap';
import { AlertCircle, TrendingUp, DollarSign, Package, Truck, FileText } from 'react-feather';
import { Link } from 'react-router-dom';
import { getSeverityColor } from '../utils/formatters';

const AlertCard = (props) => {
  const { alertCategories, title, icon } = props;
  const [activeTab, setActiveTab] = useState(0);

  // Calculate total alerts count
  const totalAlerts = alertCategories.reduce(
    (sum, category) => sum + (Array.isArray(category.alerts) ? category.alerts.length : 0),
    0
  );

  if (!alertCategories || totalAlerts === 0) {
    return null;
  }

  const toggle = (tab) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
    }
  };

  // Get icon for category
  const getCategoryIcon = (categoryName) => {
    const iconMap = {
      'Budget Alerts': <DollarSign size={16} />,
      'Cart Approvals': <Package size={16} />,
      'Purchase Order Approvals': <FileText size={16} />,
      'Payment Alerts': <TrendingUp size={16} />,
      'Delivery Alerts': <Truck size={16} />,
      'Operational Alerts': <AlertCircle size={16} />
    };
    return iconMap[categoryName] || <AlertCircle size={16} />;
  };

  const activeCategory = alertCategories[activeTab];

  return (
    <div className="w-100">
      <h5 className="mb-3 fw-bold d-flex align-items-center" style={{ fontSize: '1.1rem' }}>
        {icon && (
          <span className="me-2" style={{ color: '#dc3545' }}>
            {icon}
          </span>
        )}
        {title}
        <Badge
          color="danger"
          pill
          className="ms-3"
          style={{
            fontSize: '0.75rem',
            padding: '0.35rem 0.65rem',
            fontWeight: '600'
          }}
        >
          {totalAlerts}
        </Badge>
      </h5>
      <Card className="shadow-sm border-0" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <CardBody className="p-0">
          {/* Material Design Tabs */}
          <div
            className="px-3 pt-2"
            style={{ backgroundColor: '#fff', borderBottom: '1px solid #e0e0e0' }}
          >
            <div className="d-flex" style={{ overflowX: 'auto', scrollbarWidth: 'thin' }}>
              {alertCategories.map((category, index) => {
                const alertsCount = Array.isArray(category.alerts) ? category.alerts.length : 0;

                return (
                  <div
                    key={category.categoryName} // no array index in key
                    onClick={() => toggle(index)}
                    className="px-3 py-2 d-flex align-items-center"
                    style={{
                      cursor: 'pointer',
                      borderBottom:
                        activeTab === index ? '3px solid #007bff' : '3px solid transparent',
                      color: activeTab === index ? '#007bff' : '#6c757d',
                      fontWeight: activeTab === index ? '600' : '500',
                      fontSize: '0.875rem',
                      transition: 'all 0.3s ease',
                      whiteSpace: 'nowrap',
                      minWidth: 'fit-content'
                    }}
                  >
                    <span className="me-2">{getCategoryIcon(category.categoryName)}</span>
                    {category.categoryName}
                    <Badge
                      color={activeTab === index ? 'primary' : 'secondary'}
                      pill
                      className="ms-2"
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.25rem 0.5rem',
                        fontWeight: '600'
                      }}
                    >
                      {alertsCount}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tab Content - Horizontal Scrolling Carousel */}
          <div className="p-3">
            <div
              className="d-flex gap-3"
              style={{
                overflowX: 'auto',
                overflowY: 'hidden',
                scrollbarWidth: 'thin',
                paddingBottom: '10px',
                scrollBehavior: 'smooth'
              }}
            >
              {(activeCategory && Array.isArray(activeCategory.alerts)
                ? activeCategory.alerts
                : []
              ).map((alert) => {
                const keyForAlert =
                  alert.id ||
                  alert.title ||
                  `${alert.severity || 'UNKNOWN'}-${alert.targetLink || ''}`;

                const severityStyle = getSeverityColor(alert.severity);

                return (
                  <div
                    key={keyForAlert}
                    className="flex-shrink-0"
                    style={{
                      width: '300px',
                      backgroundColor: '#fff',
                      border: `1px solid ${severityStyle.color}20`,
                      borderTop: `4px solid ${severityStyle.color}`,
                      borderRadius: '8px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                      padding: '12px',
                      height: '180px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.06)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Header - Severity Badge */}
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <Badge
                        color={
                          alert.severity === 'CRITICAL'
                            ? 'danger'
                            : alert.severity === 'HIGH'
                              ? 'warning'
                              : 'info'
                        }
                        style={{
                          fontSize: '0.65rem',
                          padding: '0.25rem 0.5rem',
                          fontWeight: '600',
                          letterSpacing: '0.5px'
                        }}
                      >
                        {alert.severity}
                      </Badge>
                    </div>

                    {/* Title */}
                    <div
                      className="mb-2"
                      style={{ fontSize: '0.9rem', fontWeight: '600', lineHeight: '1.3' }}
                    >
                      {alert.targetLink ? (
                        <Link
                          to={alert.targetLink}
                          style={{
                            color: '#007bff',
                            textDecoration: 'none',
                            display: 'block'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.textDecoration = 'underline';
                            e.target.style.color = '#0056b3';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.textDecoration = 'none';
                            e.target.style.color = '#007bff';
                          }}
                        >
                          {alert.title}
                        </Link>
                      ) : (
                        <span style={{ color: '#212529' }}>{alert.title}</span>
                      )}
                    </div>

                    {/* Subtitle */}
                    {alert.subtitle && (
                      <div
                        className="mb-2"
                        style={{
                          fontSize: '0.75rem',
                          color: '#6c757d',
                          fontWeight: '500',
                          lineHeight: '1.3'
                        }}
                      >
                        {alert.subtitle}
                      </div>
                    )}

                    {/* Message */}
                    <div
                      className="mb-2 flex-grow-1"
                      style={{
                        fontSize: '0.75rem',
                        color: '#495057',
                        lineHeight: '1.4',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {alert.message}
                    </div>

                    {/* Footer - Amount */}
                    {alert.amount && (
                      <div className="mt-auto pt-2 border-top">
                        <div
                          style={{
                            color: severityStyle.color,
                            fontSize: '1rem',
                            fontWeight: '700',
                            letterSpacing: '0.2px'
                          }}
                        >
                          {alert.amount}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

AlertCard.propTypes = {
  alertCategories: PropTypes.arrayOf(
    PropTypes.shape({
      categoryName: PropTypes.string.isRequired,
      alerts: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          title: PropTypes.string,
          subtitle: PropTypes.string,
          message: PropTypes.string,
          severity: PropTypes.string,
          amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          targetLink: PropTypes.string
        })
      ).isRequired
    })
  ).isRequired,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  icon: PropTypes.node
};

AlertCard.defaultProps = {
  title: '',
  icon: null
};

export default AlertCard;
