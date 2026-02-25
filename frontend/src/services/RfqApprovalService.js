import apiClient from '../api/apiClient';

const RfqApprovalService = {
  approveRfqSignoff(companyId, rfqId, signoffId, signoffData) {
    return apiClient.post(
      `ep/v1/company/${companyId}/rfqs/${rfqId}/signoffs/${signoffId}/approve`,
      signoffData,
    );
  },
};

export default RfqApprovalService;
