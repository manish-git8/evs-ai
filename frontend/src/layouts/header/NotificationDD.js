import { useEffect, useState } from 'react';
import { ListGroup, ListGroupItem, Spinner } from 'reactstrap';
import UserDashboardService from '../../services/UserDashboardService';
import { formatDateTime, getUserId } from '../../pages/localStorageUtil';

const NotificationDD = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const response = await UserDashboardService.getNotifications(userId);
        if (response.data && Array.isArray(response.data)) {
          setNotifications(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [userId]);

  const formatMessage = (message) => {
    const parts = message.split(/`([^`]+)`/g);
    return parts.map((part, index) =>
      index % 2 === 1 ? (
        <strong key={index} className="text-bold">
          {part}
        </strong>
      ) : (
        part
      ),
    );
  };

  const getPriorityStyle = (priority) => {
    if (priority === 1) {
      return { backgroundColor: '#ffbc3466' };
    }
    return {};
  };

  return (
    <div>
      <ListGroup flush>
        {loading ? (
          <ListGroupItem className="text-center py-3">
            <Spinner size="sm" color="primary" />
            <div style={{ fontSize: '10px', marginTop: '4px' }}>Loading notifications...</div>
          </ListGroupItem>
        ) : notifications.length === 0 ? (
          <ListGroupItem className="text-muted">No new notifications</ListGroupItem>
        ) : (
          notifications.map((msg) => (
            <ListGroupItem
              action
              key={msg?.alertId}
              tag="a"
              href="/"
              style={getPriorityStyle(msg?.priority)}
            >
              <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                <span style={{ fontSize: '18px', lineHeight: '1', color: '#333' }}>•</span>
                <div className="col-9">
                  <span className="d-block" style={{ color: '#333', fontSize: '10px' }}>
                    {formatMessage(msg?.message)}
                  </span>
                  <span className="text-muted" style={{ fontSize: '8px' }}>
                    {formatDateTime(msg?.createdDate)}
                  </span>
                </div>
              </div>
            </ListGroupItem>
          ))
        )}
      </ListGroup>
    </div>
  );
};

export default NotificationDD;
