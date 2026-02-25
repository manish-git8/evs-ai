import apiClient from '../api/apiClient';

const BILLING_PATH = 'api/v1/billing';

const BillingService = {
  // ==================== PLANS ====================
  getAllActivePlans() {
    return apiClient.get(`${BILLING_PATH}/plans`);
  },

  getPlanById(planId) {
    return apiClient.get(`${BILLING_PATH}/plans/${planId}`);
  },

  getPlansByBillingCycle(billingCycle) {
    return apiClient.get(`${BILLING_PATH}/plans/by-cycle?billingCycle=${billingCycle}`);
  },

  createPlan(planData) {
    return apiClient.post(`${BILLING_PATH}/plans`, planData);
  },

  updatePlan(planId, planData) {
    return apiClient.put(`${BILLING_PATH}/plans/${planId}`, planData);
  },

  deactivatePlan(planId) {
    return apiClient.delete(`${BILLING_PATH}/plans/${planId}`);
  },

  // ==================== SUBSCRIPTIONS ====================
  createSubscription(subscriptionData) {
    return apiClient.post(`${BILLING_PATH}/subscriptions`, subscriptionData);
  },

  getActiveSubscription(companyId) {
    return apiClient.get(`${BILLING_PATH}/subscriptions/company/${companyId}/active`);
  },

  getAllSubscriptionsByCompany(companyId) {
    return apiClient.get(`${BILLING_PATH}/subscriptions/company/${companyId}`);
  },

  updateSubscription(subscriptionId, updateData) {
    return apiClient.put(`${BILLING_PATH}/subscriptions/${subscriptionId}`, updateData);
  },

  cancelSubscription(subscriptionId, reason) {
    return apiClient.post(`${BILLING_PATH}/subscriptions/${subscriptionId}/cancel`, { reason });
  },

  // ==================== ADMIN OPERATIONS ====================
  assignPlanToCompany(assignData) {
    return apiClient.post(`${BILLING_PATH}/admin/assign-plan`, assignData);
  },

  upgradePlan(companyId, upgradeData) {
    return apiClient.put(`${BILLING_PATH}/admin/upgrade-plan/${companyId}`, upgradeData);
  },

  terminateSubscription(companyId, terminationData) {
    return apiClient.post(`${BILLING_PATH}/admin/terminate/${companyId}`, terminationData);
  },

  getAllSubscriptions(status) {
    const params = status ? `?status=${status}` : '';
    return apiClient.get(`${BILLING_PATH}/admin/subscriptions${params}`);
  },

  // ==================== BILLING DETAILS ====================
  getBillingDetails(companyId) {
    return apiClient.get(`${BILLING_PATH}/details/${companyId}`);
  },

  // ==================== INVOICES ====================
  getInvoicesByCompany(companyId, page = 0, size = 10) {
    return apiClient.get(`${BILLING_PATH}/invoices/company/${companyId}?page=${page}&size=${size}`);
  },

  getInvoiceById(invoiceId) {
    return apiClient.get(`${BILLING_PATH}/invoices/${invoiceId}`);
  },

  getInvoiceByNumber(invoiceNumber) {
    return apiClient.get(`${BILLING_PATH}/invoices/number/${invoiceNumber}`);
  },

  getLatestInvoice(companyId) {
    return apiClient.get(`${BILLING_PATH}/invoices/company/${companyId}/latest`);
  },

  generateInvoicePdf(invoiceId) {
    return apiClient.post(`${BILLING_PATH}/invoices/${invoiceId}/pdf`, null);
  },

  // ==================== PAYMENTS ====================
  processPayment(invoiceId, paymentMethod = 'STRIPE') {
    return apiClient.post(
      `${BILLING_PATH}/payments/process/${invoiceId}?paymentMethod=${paymentMethod}`,
      null,
    );
  },

  getPaymentById(paymentId) {
    return apiClient.get(`${BILLING_PATH}/payments/${paymentId}`);
  },
};

export default BillingService;
