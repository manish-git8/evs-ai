import apiClient from '../api/apiClient';

const BILLING_PATH = 'api/v1/billing';

const BillingService = {
  // ==================== PLANS (Admin Only) ====================
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
  // Admin-only operations
  createSubscription(subscriptionData) {
    return apiClient.post(`${BILLING_PATH}/subscriptions`, subscriptionData);
  },

  updateSubscription(subscriptionId, updateData) {
    return apiClient.put(`${BILLING_PATH}/subscriptions/${subscriptionId}`, updateData);
  },

  cancelSubscription(subscriptionId, reason) {
    return apiClient.post(`${BILLING_PATH}/subscriptions/${subscriptionId}/cancel`, { reason });
  },

  // Company user: Get own subscription (secure endpoint)
  getMyActiveSubscription() {
    return apiClient.get(`${BILLING_PATH}/subscriptions/my-subscription`);
  },

  // Admin: Get subscription for any company
  // Suppress error toast since "no active subscription" is a valid state, not an error
  getActiveSubscription(companyId) {
    return apiClient.get(`${BILLING_PATH}/subscriptions/company/${companyId}/active`, {
      suppressErrorToast: true,
    });
  },

  getAllSubscriptionsByCompany(companyId) {
    return apiClient.get(`${BILLING_PATH}/subscriptions/company/${companyId}`);
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

  // Admin: Suspend a subscription
  suspendSubscription(companyId, reason = '') {
    return apiClient.post(`${BILLING_PATH}/admin/subscriptions/company/${companyId}/suspend`, { reason });
  },

  // Admin: Resume a suspended subscription
  resumeSubscription(companyId) {
    return apiClient.post(`${BILLING_PATH}/admin/subscriptions/company/${companyId}/resume`);
  },

  getAllSubscriptions(status) {
    const params = status ? `?status=${status}` : '';
    return apiClient.get(`${BILLING_PATH}/admin/subscriptions${params}`);
  },

  // Admin: Record manual payment (bank transfer)
  recordManualPayment(invoiceId, transactionId, amount, notes = '') {
    const params = new URLSearchParams({
      transactionId,
      amount: amount.toString(),
    });
    if (notes) {
      params.append('notes', notes);
    }
    return apiClient.post(`${BILLING_PATH}/admin/invoices/${invoiceId}/record-payment?${params}`);
  },

  // ==================== BILLING DETAILS ====================
  // Company user: Get own billing details (secure endpoint)
  getMyBillingDetails() {
    return apiClient.get(`${BILLING_PATH}/my-details`);
  },

  // Admin: Get billing details for any company
  getBillingDetails(companyId) {
    return apiClient.get(`${BILLING_PATH}/details/${companyId}`);
  },

  // ==================== INVOICES ====================
  // Company user: Get own invoices (secure endpoint)
  getMyInvoices(page = 0, size = 10) {
    return apiClient.get(`${BILLING_PATH}/my-invoices?page=${page}&size=${size}`);
  },

  getMyLatestInvoice() {
    return apiClient.get(`${BILLING_PATH}/my-latest-invoice`);
  },

  // Admin: Get invoices for any company
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
  // Company user: Get own payments (secure endpoint)
  getMyPayments() {
    return apiClient.get(`${BILLING_PATH}/my-payments`);
  },

  getPaymentById(paymentId) {
    return apiClient.get(`${BILLING_PATH}/payments/${paymentId}`);
  },

  // Admin: Get payments for a specific invoice
  getPaymentsByInvoiceId(invoiceId) {
    return apiClient.get(`${BILLING_PATH}/invoices/${invoiceId}/payments`);
  },

  // ==================== BILLING DASHBOARD ====================
  getBillingDashboard() {
    return apiClient.get('ep/v1/billing/dashboard');
  },

  // ==================== ADMIN PLAN MANAGEMENT ====================
  getAdminPlans() {
    return apiClient.get('ep/v1/admin/plans');
  },

  getAdminPlan(planId) {
    return apiClient.get(`ep/v1/admin/plans/${planId}`);
  },

  createAdminPlan(planData) {
    return apiClient.post('ep/v1/admin/plans', planData);
  },

  updateAdminPlan(planId, planData) {
    return apiClient.put(`ep/v1/admin/plans/${planId}`, planData);
  },

  deleteAdminPlan(planId) {
    return apiClient.delete(`ep/v1/admin/plans/${planId}`);
  },

  // ==================== ADMIN FEATURES ====================
  getAdminFeatures() {
    return apiClient.get('ep/v1/admin/plans/features');
  },

  createAdminFeature(featureData) {
    return apiClient.post('ep/v1/admin/plans/features', featureData);
  },

  updateAdminFeature(featureId, featureData) {
    return apiClient.put(`ep/v1/admin/plans/features/${featureId}`, featureData);
  },

  // ==================== ADMIN PLAN PRICING ====================
  savePlanPricing(planId, pricingData) {
    return apiClient.post(`ep/v1/admin/plans/${planId}/pricing`, pricingData);
  },

  // ==================== ADMIN PLAN FEATURE CONFIGS ====================
  getPlanFeatureConfigs(planId) {
    return apiClient.get(`ep/v1/admin/plans/${planId}/features`);
  },

  savePlanFeatureConfig(planId, featureConfigData) {
    return apiClient.post(`ep/v1/admin/plans/${planId}/features`, featureConfigData);
  },

  // Get subscriptions (companies) enrolled in a plan
  getPlanSubscriptions(planId) {
    return apiClient.get(`ep/v1/admin/plans/${planId}/subscriptions`);
  },

  // ==================== SUBSCRIPTION OVERRIDES ====================
  getSubscriptionOverrides(subscriptionId) {
    return apiClient.get(`ep/v1/admin/subscriptions/${subscriptionId}/overrides`);
  },

  addSubscriptionOverride(subscriptionId, overrideData) {
    return apiClient.post(`ep/v1/admin/subscriptions/${subscriptionId}/overrides`, overrideData);
  },

  removeSubscriptionOverride(subscriptionId, featureCode) {
    return apiClient.delete(`ep/v1/admin/subscriptions/${subscriptionId}/overrides/${featureCode}`);
  },

  // ==================== ADMIN INVOICE MANAGEMENT ====================
  // Get all invoices with optional status filter
  getAdminInvoices(status = '', page = 0, size = 50) {
    const params = new URLSearchParams({ page, size });
    if (status) params.append('status', status);
    return apiClient.get(`${BILLING_PATH}/admin/invoices?${params}`);
  },

  // Get all subscriptions (for generate invoice dropdown)
  getAdminSubscriptions(status = '') {
    const params = status ? `?status=${status}` : '';
    return apiClient.get(`${BILLING_PATH}/admin/subscriptions${params}`);
  },

  // Preview invoice for a subscription (does not create it)
  previewInvoiceForSubscription(subscriptionId) {
    return apiClient.get(`${BILLING_PATH}/admin/subscriptions/${subscriptionId}/preview-invoice`);
  },

  // Generate invoice for a subscription
  generateInvoiceForSubscription(subscriptionId) {
    return apiClient.post(`${BILLING_PATH}/admin/subscriptions/${subscriptionId}/generate-invoice`);
  },

  // Send invoice to company (mark as sent)
  sendInvoice(invoiceId) {
    return apiClient.post(`${BILLING_PATH}/admin/invoices/${invoiceId}/send`);
  },

  // Void an invoice
  voidInvoice(invoiceId) {
    return apiClient.post(`${BILLING_PATH}/admin/invoices/${invoiceId}/void`);
  },

  // ==================== ADMIN USAGE MANAGEMENT ====================
  // Get usage summary for a company
  // Suppress error toast since usage may not be available without a subscription
  getCompanyUsage(companyId) {
    return apiClient.get(`ep/v1/usage/company/${companyId}`, {
      suppressErrorToast: true,
    });
  },

  // Get usage events for a company (paginated)
  getUsageEvents(companyId, featureCode = '', page = 0, size = 50) {
    const params = new URLSearchParams({ page, size });
    if (featureCode) params.append('featureCode', featureCode);
    return apiClient.get(`ep/v1/usage/company/${companyId}/events?${params}`);
  },

  // Get all companies with their usage summaries (admin overview)
  getAllCompaniesUsage(page = 0, size = 50) {
    return apiClient.get(`ep/v1/usage/admin/all?page=${page}&size=${size}`);
  },

  // Get usage alerts for a company
  getCompanyUsageAlerts(companyId) {
    return apiClient.get(`ep/v1/usage/company/${companyId}/alerts`);
  },

  // ==================== TAX CONFIGURATION ====================
  // Get tax configuration for a company
  getTaxConfig(companyId) {
    return apiClient.get(`${BILLING_PATH}/admin/companies/${companyId}/tax-config`);
  },

  // Update tax configuration for a company
  updateTaxConfig(companyId, taxConfig) {
    return apiClient.put(`${BILLING_PATH}/admin/companies/${companyId}/tax-config`, taxConfig);
  },

  // ==================== BILLING ALERTS ====================
  // Get billing alerts for a company (admin)
  getBillingAlerts(companyId) {
    return apiClient.get(`${BILLING_PATH}/alerts/company/${companyId}`);
  },

  // Get billing alerts for current user's company
  getMyBillingAlerts() {
    return apiClient.get(`${BILLING_PATH}/my-alerts`);
  },

  // ==================== SUBSCRIPTION AUDIT TRAIL ====================
  // Company user: Get audit trail for own company (no performer details)
  getMySubscriptionAuditTrail(page = 0, size = 50) {
    return apiClient.get(`${BILLING_PATH}/my-subscription-audit?page=${page}&size=${size}`);
  },

  // Admin: Get audit trail for a specific subscription (includes performer details)
  getSubscriptionAuditTrail(subscriptionId, page = 0, size = 50) {
    return apiClient.get(`${BILLING_PATH}/admin/subscriptions/${subscriptionId}/audit?page=${page}&size=${size}`);
  },

  // Admin: Get audit trail for a company's subscriptions (includes performer details)
  getCompanySubscriptionAuditTrail(companyId, page = 0, size = 50) {
    return apiClient.get(`${BILLING_PATH}/admin/companies/${companyId}/subscription-audit?page=${page}&size=${size}`);
  },
};

export default BillingService;
