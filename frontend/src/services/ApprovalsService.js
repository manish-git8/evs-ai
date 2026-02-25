import apiClient from '../api/apiClient';

const ApprovalsService = {
  handleApproverCartApprove(requestBody, companyId, targetId) {
    return apiClient.post(
      `ep/v1/company/${companyId}/approval/indent/target/${targetId}/approve`,
      requestBody,
    );
  },

  handleApproverCartReject(requestBody, companyId, targetId) {
    return apiClient.post(
      `ep/v1/company/${companyId}/approval/indent/target/${targetId}/approve`,
      requestBody,
    );
  },

  handlePendingPOApprove(requestBody, companyId, targetId) {
    return apiClient.post(
      `ep/v1/company/${companyId}/approval/purchase_order/target/${targetId}/approve`,
      requestBody,
    );
  },

  handleApproverPOReject(requestBody, companyId, targetId) {
    return apiClient.post(
      `ep/v1/company/${companyId}/approval/purchase_order/target/${targetId}/approve`,
      requestBody,
    );
  },
};

export default ApprovalsService;
