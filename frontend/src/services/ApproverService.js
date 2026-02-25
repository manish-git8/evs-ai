import apiClient from '../api/apiClient';

const ApproverService = {
  handleApproverCartSubmit(requestBody, companyId, targetId) {
    return apiClient.post(
      `ep/v1/company/${companyId}/approval/indent/target/${targetId}/submit`,
      requestBody,
    );
  },

  handleApproverCartRestart(requestBody, companyId, targetId) {
    return apiClient.post(
      `ep/v1/company/${companyId}/approval/indent/target/${targetId}/restart`,
      requestBody,
    );
  },

  handlePurchaseOrderRestart(requestBody, companyId, targetId) {
    return apiClient.post(
      `ep/v1/company/${companyId}/approval/purchase_order/target/${targetId}/restart`,
      requestBody,
    );
  },
};

export default ApproverService;
