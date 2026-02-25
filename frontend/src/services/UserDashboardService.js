import apiClient from '../api/apiClient';

const UserDashboardService = {
  getUserMetrics: async (companyId, userId) => {
    // No date filtering - returns total counts for all current pending/active items
    return apiClient.get(`ep/v1/user/${companyId}/dashboard-metrics-values`, {
      params: {
        userId,
      },
    });
  },

  getNotifications(userId) {
    return apiClient.get(`ep/v1/user/${userId}/alert`);
  },

  getNotificationCount(userId) {
    return apiClient.get(`ep/v1/user/${userId}/alert/count`);
  },
};

export default UserDashboardService;
