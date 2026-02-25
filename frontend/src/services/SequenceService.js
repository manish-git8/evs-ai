import apiClient from '../api/apiClient';

const SequenceService = {
  saveSequence(sequenceData) {
    return apiClient.post(`ep/v1/company/${sequenceData.companyId}/sequence`, sequenceData);
  },

  getAllSequences(companyId, sequenceFilter, pageDto) {
    return apiClient.get(`ep/v1/company/${companyId}/sequence`, {
      params: {
        sequenceId: sequenceFilter?.sequenceId,
        pageSize: pageDto?.pageSize,
        pageNumber: pageDto?.pageNumber,
        sortBy: pageDto?.sortBy,
        order: pageDto?.order,
      },
    });
  },

  getSequenceById(companyId, sequenceId) {
    return apiClient.get(`ep/v1/company/${companyId}/sequence?sequenceId=${sequenceId}`);
  },

  updateSequence(companyId, sequenceId, sequenceData) {
    return apiClient.put(`ep/v1/company/${companyId}/sequence/${sequenceId}`, sequenceData);
  },
};

export default SequenceService;
