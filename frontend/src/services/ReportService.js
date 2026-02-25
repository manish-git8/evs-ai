import apiClient from '../api/apiClient';

const ReportService = {
  handleCreateReport(entityId, entityType, requestBody) {
    return apiClient.post(`ep/v1/${entityId}/${entityType}/graph`, requestBody);
  },

  getAllDynamicReport(entityId, entityType) {
    return apiClient.get(`ep/v1/${entityId}/${entityType}/graph`);
  },

  getAllDefaultReport(entityType, entityId) {
    return apiClient.get(`ep/v1/${entityType}/${entityId}/defaultGraphData`);
  },

  getAllCustomizeReport(entityType, entityId, userId) {
    return apiClient.get(`ep/v1/${entityType}/${entityId}/user/${userId}/graphData`);
  },
};

export default ReportService;
