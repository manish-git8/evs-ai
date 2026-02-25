import apiClient from '../api/apiClient';

const ApprovalPolicyManagementService = {
  handleCreateApprovalPolicy(requestBody, companyId) {
    return apiClient.post(`ep/v1/company/${companyId}/approval-policy/`, requestBody);
  },

  handleUpdateApprovalPolicy(requestBody, companyId, policyId) {
    return apiClient.put(`ep/v1/company/${companyId}/approval-policy/${policyId}`, requestBody);
  },

  handleUpdateQuery(requestBody, companyId, cartId) {
    return apiClient.put(`ep/v1/company/${companyId}/${cartId}/query`, requestBody);
  },

  getApprovalPolicyByCompanyId(companyId, approvalType) {
    return apiClient.get(`ep/v1/company/${companyId}/approval-policy/?approvalType=${approvalType}`);
  },

  getPreviewApprovalByCompanyId(companyId, approvalType, targetId) {
    return apiClient.get(
      `ep/v1/company/${companyId}/approval/${approvalType}/target/${targetId}/preview`,
    );
  },

  getApprovalFlow(companyId, approvalType, targetId) {
    return apiClient.get(
      `ep/v1/company/${companyId}/approval/${approvalType}/target/${targetId}/get`,
    );
  },

  getApprovalPolicyStatus(companyId) {
    return apiClient.get(`ep/v1/company/${companyId}/approvalStatus`);
  },

  deleteApprovalPolicy(companyId, policyId) {
    return apiClient.delete(`ep/v1/company/${companyId}/approval-policy/${policyId}`);
  },
};

export default ApprovalPolicyManagementService;
