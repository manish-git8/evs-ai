import apiClient from '../api/apiClient';

const ReceiptService = {
  handleCreateReceipt(companyId, grnId) {
    return apiClient.post(`ep/v1/company/${companyId}/receipt/${grnId}`, {});
  },

  getApprovalFlow(companyId, approvalType, targetId) {
    return apiClient.get(
      `ep/v1/company/${companyId}/approval/${approvalType}/target/${targetId}/get`,
    );
  },
};

export default ReceiptService;
