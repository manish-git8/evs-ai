import apiClient from '../api/apiClient';

const BudgetService = {
  handleCreateBudget(companyId, requestBody) {
    return apiClient.post(`ep/v1/company/${companyId}/budget`, requestBody);
  },

  handleGetAllBudgets(companyId) {
    return apiClient.get(`ep/v1/company/${companyId}/budget`);
  },

  handleGetBudgetById(companyId, budgetId) {
    return apiClient.get(`ep/v1/company/${companyId}/budget?projectId=${budgetId}`);
  },

  handleDeleteBudgetById(companyId, budgetId) {
    return apiClient.delete(`ep/v1/company/${companyId}/budget/${budgetId}`);
  },

  handleUpdateBudgetById(companyId, budgetId, requestBody) {
    return apiClient.put(`ep/v1/company/${companyId}/budget/${budgetId}`, requestBody);
  },

  handleAiRecommendation(companyId, projectId) {
    return apiClient.post(`ep/v1/company/${companyId}/budget-forecast?projectId=${projectId}`, {});
  },

  getBudgetDashboard(companyId, params = {}) {
    const queryParams = new URLSearchParams();
    if (params.purchaseType) queryParams.append('purchaseType', params.purchaseType);
    if (params.period) queryParams.append('period', params.period);

    const url = queryParams.toString()
      ? `ep/v1/company/${companyId}/budget/dashboard?${queryParams.toString()}`
      : `ep/v1/company/${companyId}/budget/dashboard`;

    return apiClient.get(url);
  },

  getBudgetActivityFeed(companyId, params = {}) {
    const queryParams = new URLSearchParams();
    if (params.projectId) queryParams.append('projectId', params.projectId);
    if (params.activityType) queryParams.append('activityType', params.activityType);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    const url = queryParams.toString()
      ? `ep/v1/company/${companyId}/budget/activity?${queryParams.toString()}`
      : `ep/v1/company/${companyId}/budget/activity`;

    return apiClient.get(url);
  },

  getBudgetUtilization(companyId, params = {}) {
    const queryParams = new URLSearchParams();
    if (params.purchaseType) queryParams.append('purchaseType', params.purchaseType);
    if (params.status) queryParams.append('status', params.status);
    if (params.projectId) queryParams.append('projectId', params.projectId);
    if (params.budgetId) queryParams.append('budgetId', params.budgetId);

    const url = queryParams.toString()
      ? `ep/v1/company/${companyId}/budget/utilization?${queryParams.toString()}`
      : `ep/v1/company/${companyId}/budget/utilization`;

    return apiClient.get(url);
  },

  getBudgetValidationStatus(companyId) {
    return apiClient.get(`ep/v1/company/${companyId}/budget/validation/status`);
  },

  previewBudgetValidation(companyId, validationRequest) {
    return apiClient.post(`ep/v1/company/${companyId}/budget/validation/preview`, validationRequest);
  },

  previewMultiProjectBudgetValidation(companyId, validationRequest) {
    return apiClient.post(`ep/v1/company/${companyId}/budget/validation/preview`, validationRequest);
  },

  validateBudget(companyId, validationRequest) {
    return apiClient.post(`ep/v1/company/${companyId}/budget/validate`, validationRequest);
  },
};

export default BudgetService;
