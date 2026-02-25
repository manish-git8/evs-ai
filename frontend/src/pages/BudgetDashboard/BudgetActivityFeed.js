import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Badge } from 'reactstrap';
import BudgetService from '../../services/BudgetService';
import { getEntityId } from '../localStorageUtil';

const BudgetActivityFeed = ({ maxItems = 10, initialActivities = [], onRefresh }) => {
  const [activities, setActivities] = useState(initialActivities);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const companyId = getEntityId();



  const refreshActivityFeed = async () => {
    if (!onRefresh) return;
    
    try {
      setLoading(true);
      const response = await BudgetService.getBudgetActivityFeed(companyId, { limit: maxItems });
      if (response.data && response.data.activities) {
        setActivities(response.data.activities.slice(0, maxItems));
        if (onRefresh) onRefresh(response.data.activities);
      }
    } catch (err) {
      setError('Failed to refresh activity feed');
      console.error('Error refreshing activity feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActivities(initialActivities.slice(0, maxItems));
  }, [initialActivities, maxItems]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'CART_CREATED':
        return 'fas fa-shopping-cart';
      case 'ORDER_PLACED':
        return 'fas fa-file-invoice';
      case 'BUDGET_ALLOCATED':
        return 'fas fa-hand-holding-usd';
      case 'BUDGET_MODIFIED':
        return 'fas fa-edit';
      case 'BUDGET_EXCEEDED':
        return 'fas fa-exclamation-triangle';
      case 'APPROVAL_REQUESTED':
        return 'fas fa-clock';
      case 'APPROVAL_COMPLETED':
        return 'fas fa-check-circle';
      default:
        return 'fas fa-info-circle';
    }
  };

  const getActivityIconColor = (type) => {
    switch (type) {
      case 'CART_CREATED':
        return '#06b6d4';
      case 'ORDER_PLACED':
        return '#10b981';
      case 'BUDGET_ALLOCATED':
        return '#3b82f6';
      case 'BUDGET_MODIFIED':
        return '#f59e0b';
      case 'BUDGET_EXCEEDED':
        return '#ef4444';
      case 'APPROVAL_REQUESTED':
        return '#f59e0b';
      case 'APPROVAL_COMPLETED':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getActivityBadgeColor = (type) => {
    switch (type) {
      case 'CART_CREATED':
      case 'CART_UPDATED':
        return 'secondary'; // Pending requisitions
      case 'ORDER_PLACED':
        return 'success'; // Actual budget consumption
      case 'BUDGET_ALLOCATED':
        return 'primary';
      case 'BUDGET_MODIFIED':
        return 'warning';
      case 'BUDGET_EXCEEDED':
        return 'danger';
      case 'APPROVAL_REQUESTED':
        return 'warning';
      case 'APPROVAL_COMPLETED':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const getActivityLabel = (type) => {
    switch (type) {
      case 'CART_CREATED':
        return 'Requisition Created';
      case 'CART_UPDATED':
        return 'Requisition Updated';
      case 'ORDER_PLACED':
        return 'Purchase Order';
      case 'BUDGET_ALLOCATED':
        return 'Budget Allocated';
      case 'BUDGET_MODIFIED':
        return 'Budget Modified';
      case 'BUDGET_EXCEEDED':
        return 'Budget Exceeded';
      case 'APPROVAL_REQUESTED':
        return 'Approval Required';
      case 'APPROVAL_COMPLETED':
        return 'Approved';
      default:
        return type?.replace('_', ' ') || 'Activity';
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-3">
        <div className="spinner-border spinner-border-sm text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning mb-0" role="alert">
        {error}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-muted text-center py-3">
        No recent budget activity
      </div>
    );
  }

  return (
    <div className="activity-feed">
      {onRefresh && (
        <div className="d-flex justify-content-end mb-3">
          <button 
            type="button" 
            className="btn btn-sm btn-outline-primary"
            onClick={refreshActivityFeed}
            disabled={loading}
          >
            <i className="fas fa-sync-alt me-1"></i>
            {loading ? 'Refreshing...' : 'Refresh Activity'}
          </button>
        </div>
      )}
      {activities.map((activity, index) => (
        <div key={activity.id || index} className="d-flex align-items-start mb-3 pb-3 border-bottom">
          <div className="flex-shrink-0 me-3">
            <div className="avatar-sm rounded-circle d-flex align-items-center justify-content-center" 
                 style={{ 
                   backgroundColor: `${getActivityIconColor(activity.activityType)}20`, 
                   width: '40px', 
                   height: '40px' 
                 }}>
              <i className={getActivityIcon(activity.activityType)} 
                 style={{ color: getActivityIconColor(activity.activityType) }}></i>
            </div>
          </div>
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h6 className="mb-1 text-dark">{activity.description}</h6>
                <div className="d-flex align-items-center mb-1">
                  <Badge color={getActivityBadgeColor(activity.activityType)} className="me-2">
                    {getActivityLabel(activity.activityType)}
                  </Badge>
                  {activity.purchaseType && (
                    <Badge color="outline-dark" className="me-2" style={{ fontSize: '0.7rem' }}>
                      {activity.purchaseType.toUpperCase()}
                    </Badge>
                  )}
                  {activity.amount && (
                    <span className={`small ${
                      activity.activityType === 'ORDER_PLACED' ? 'text-success fw-bold' : 'text-muted'
                    }`}>
                      {activity.activityType === 'ORDER_PLACED' ? 'Consumed: ' : 'Amount: '}
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(activity.amount)}
                    </span>
                  )}
                </div>
                {activity.projectName && (
                  <p className="text-muted small mb-1">
                    Project: <strong>{activity.projectName}</strong>
                  </p>
                )}
                {activity.userName && (
                  <p className="text-muted small mb-0">
                    By: {activity.userName}
                  </p>
                )}
              </div>
              <div className="text-end">
                <small className="text-muted">
                  {formatDate(activity.timestamp)}
                </small>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

BudgetActivityFeed.propTypes = {
  maxItems: PropTypes.number,
  initialActivities: PropTypes.array,
  onRefresh: PropTypes.func,
};

BudgetActivityFeed.defaultProps = {
  maxItems: 10,
  initialActivities: [],
  onRefresh: null,
};

export default BudgetActivityFeed;