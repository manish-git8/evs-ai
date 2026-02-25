import apiClient from '../api/apiClient';

const FeedBackService = {
  handleCreateFeedBack(companyId, requestBody) {
    return apiClient.post(`ep/v1/company/${companyId}/feedback`, requestBody);
  },

  getAllFeedbackForUser(companyId, userId) {
    return apiClient.get(`ep/v1/company/${companyId}/feedback?userId=${userId}`);
  },

  getAllFeedbackForCompany(companyId) {
    return apiClient.get(`ep/v1/company/${companyId}/feedback`);
  },

  getAllFeedbackForSupplier(supplierId) {
    return apiClient.get(`ep/v1/supplier/${supplierId}/feedback`);
  },

  getAllFeedbackForCompanyBySupplier(companyId, supplierId) {
    return apiClient.get(`ep/v1/company/${companyId}/feedback?supplierId=${supplierId}`);
  },

  getAllFeedbackForSupplierByCompany(supplierId, companyId) {
    return apiClient.get(`ep/v1/supplier/${supplierId}/feedback?companyId=${companyId}`);
  },
};

export default FeedBackService;
