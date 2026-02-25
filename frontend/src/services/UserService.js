import apiClient from '../api/apiClient';

const UserService = {
  handleCreateUser: async (requestBody, entityId) => {
    try {
      const response = await apiClient.post(`ep/v1/${entityId}/company/user`, requestBody);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  fetchAllUsers(companyId, pageDto) {
    return apiClient.get(`ep/v1/${companyId}/company/user`, {
      params: {
        pageSize: pageDto.pageSize || 100,
        pageNumber: pageDto.pageNumber,
        sortBy: pageDto.sortBy,
        order: pageDto.order,
      },
    });
  },

  getUsersBySearch(searchTerm, companyId, pageDto) {
    return apiClient.get(`ep/v1/${companyId}/company/user`, {
      params: {
        search: searchTerm,
        pageSize: pageDto.pageSize,
        pageNumber: pageDto.pageNumber,
        sortBy: pageDto.sortBy,
        order: pageDto.order,
      },
    });
  },

  fetchAllCompanyUsers(companyId, pageDto) {
    return apiClient.get(`ep/v1/${companyId}/company/user`, {
      params: {
        companyId: companyId,
        pageSize: pageDto.pageSize,
        pageNumber: pageDto.pageNumber,
        sortBy: pageDto.sortBy,
        order: pageDto.order,
      },
    });
  },

  deleteUserById: async (entityId, userId, entityType) => {
    try {
      const response = await apiClient.delete(`ep/v1/${entityId}/${entityType}/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting user with ID ${userId}:`, error);
      throw error;
    }
  },

  handleEditUser: async (requestBody, entityId, userId, entityType) => {
    try {
      const response = await apiClient.put(
        `ep/v1/${entityId}/${entityType}/user/${userId}`,
        requestBody,
      );
      return response.data;
    } catch (error) {
      console.error(`Error editing user with ID ${userId}:`, error);
      throw error;
    }
  },

  fetchByUserId: async (entityId, userId, entityType) => {
    try {
      const response = await apiClient.get(`ep/v1/${entityId}/${entityType}/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching user with ID ${userId}:`, error);
      throw error;
    }
  },

  // Fetch all users for a company (for reassignment dropdown)
  fetchCompanyUsers: async (companyId, entityType = 'company') => {
    try {
      const response = await apiClient.get(`ep/v1/${companyId}/${entityType}/user`, {
        params: {
          pageSize: 500,
          pageNumber: 0,
        },
      });
      // Handle paginated response
      if (response.data && response.data.content) {
        return { data: response.data.content };
      }
      return response;
    } catch (error) {
      console.error('Error fetching company users:', error);
      throw error;
    }
  },

  // Admin: Unlock user account
  unlockUserAccount: async (userId) => {
    const response = await apiClient.post(`ep/v1/admin/users/${userId}/unlock`);
    return response.data;
  },

  // Admin: Reset failed login attempts
  resetFailedLoginAttempts: async (userId) => {
    const response = await apiClient.post(`ep/v1/admin/users/${userId}/reset-failed-attempts`);
    return response.data;
  },

  // Admin: Resend verification email
  resendVerificationEmail: async (userId) => {
    const response = await apiClient.post(`ep/v1/admin/users/${userId}/resend-verification`);
    return response.data;
  },

  // Admin: Force password reset
  forcePasswordReset: async (userId) => {
    const response = await apiClient.post(`ep/v1/admin/users/${userId}/force-password-reset`);
    return response.data;
  },

  // Admin: Manually verify email
  manuallyVerifyEmail: async (userId) => {
    const response = await apiClient.post(`ep/v1/admin/users/${userId}/verify-email`);
    return response.data;
  },
};

export default UserService;
