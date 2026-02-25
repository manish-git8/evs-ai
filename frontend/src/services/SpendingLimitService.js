import apiClient from '../api/apiClient';

const getSpendingLimitResponse = (companyId, userId, startDate, endDate) => {
  return apiClient.get(`ep/v1/company/${companyId}/spendingLimit`, {
    params: {
      userId,
      companyId,
      startDate,
      endDate,
    },
  });
};

const getAvailableQuarters = (companyId, userId, year) => {
  return apiClient.get(`ep/v1/spendingLimit/${companyId}/availableQuarters`, {
    params: {
      userId,
      year,
    },
  });
};

const getSpendingLimitById = (companyId, spendingLimitId) => {
  return apiClient.get(`ep/v1/spendingLimit?companyId=${companyId}`, {
    params: { spendingLimitId },
  });
};

const getAllSpendingLimits = (companyId) => {
  return apiClient.get(`ep/v1/spendingLimit?companyId=${companyId}`);
};

const deleteSpendingLimit = (spendingLimitId) => {
  return apiClient.delete(`ep/v1/spendingLimit/${spendingLimitId}`);
};

const updateSpendingLimit = (spendingLimitId, data) => {
  return apiClient.put(`ep/v1/spendingLimit/${spendingLimitId}`, data);
};

const createSpendingLimit = (data) => {
  return apiClient.post('ep/v1/spendingLimit', data);
};

export default {
  getSpendingLimitResponse,
  getAvailableQuarters,
  getSpendingLimitById,
  getAllSpendingLimits,
  deleteSpendingLimit,
  updateSpendingLimit,
  createSpendingLimit,
};
