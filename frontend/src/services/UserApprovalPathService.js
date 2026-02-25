import apiClient from '../api/apiClient';

const UserApprovalPathService = {
  /**
   * Get user's private approval path
   */
  getUserApprovalPath: async (companyId, userId) => {
    const response = await apiClient.get(
      `ep/v1/company/${companyId}/user/${userId}/approval-path`
    );
    return response.data;
  },

  /**
   * Add approver to user's private approval path
   */
  addApproverToPath: async (companyId, userId, approverUserId, orderOfApproval = null) => {
    const response = await apiClient.post(
      `ep/v1/company/${companyId}/user/${userId}/approval-path`,
      {
        approverUserId,
        orderOfApproval,
      }
    );
    return response.data;
  },

  /**
   * Remove approver from user's private approval path
   */
  removeApproverFromPath: async (companyId, userId, approverUserId) => {
    await apiClient.delete(
      `ep/v1/company/${companyId}/user/${userId}/approval-path/${approverUserId}`
    );
  },

  /**
   * Reorder approvers in user's private approval path
   */
  reorderApprovers: async (companyId, userId, approverUserIds) => {
    const response = await apiClient.put(
      `ep/v1/company/${companyId}/user/${userId}/approval-path/reorder`,
      { approverUserIds }
    );
    return response.data;
  },

  /**
   * Validate user's approval path and check for gaps
   */
  validateApprovalPath: async (companyId, userId) => {
    const response = await apiClient.get(
      `ep/v1/company/${companyId}/user/${userId}/approval-path/validate`
    );
    return response.data;
  },

  /**
   * Get users eligible to be approvers
   */
  getEligibleApprovers: async (companyId, userId) => {
    const response = await apiClient.get(
      `ep/v1/company/${companyId}/user/${userId}/approval-path/eligible-approvers`
    );
    return response.data;
  },

  /**
   * Get user's approval limit
   */
  getApprovalLimit: async (companyId, userId) => {
    const response = await apiClient.get(
      `ep/v1/company/${companyId}/user/${userId}/approval-limit`
    );
    return response.data;
  },

  /**
   * Update user's approval limit
   */
  updateApprovalLimit: async (companyId, userId, approvalLimit) => {
    await apiClient.put(
      `ep/v1/company/${companyId}/user/${userId}/approval-limit`,
      { approvalLimit }
    );
  },
};

export default UserApprovalPathService;
