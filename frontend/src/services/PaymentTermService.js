import apiClient from '../api/apiClient';

const PaymentTermService = {
  getAllPaymentTerms() {
    return apiClient.get('ep/v1/paymentTerm');
  },

  getPaymentTermById(paymentTermId) {
    return apiClient.get(`ep/v1/paymentTerm?id=${paymentTermId}`);
  },

  getPaymentTermBySearch(searchTerm) {
    return apiClient.get(`ep/v1/paymentTerm?name=${searchTerm}`);
  },

  createPaymentTerm(paymentTermData) {
    return apiClient.post('ep/v1/paymentTerm', paymentTermData);
  },

  deletePaymentTerm(paymentTermId) {
    return apiClient.delete(`ep/v1/paymentTerm/${paymentTermId}`);
  },

  updatePaymentTerm(paymentTermId, paymentTermData) {
    return apiClient.put(`ep/v1/paymentTerm/${paymentTermId}`, paymentTermData);
  },
};

export default PaymentTermService;
