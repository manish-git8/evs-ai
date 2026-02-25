import apiClient from '../api/apiClient';

const TemplateService = {
  saveTemplate(companyId, templateData) {
    return apiClient.post(`ep/v1/company/${companyId}/companyTemplate`, templateData);
  },

  createEmailProvider(companyId, payload) {
    return apiClient.post(`ep/v1/company/${companyId}/emailProvider`, payload);
  },

  getAllEmailProviders(companyId) {
    return apiClient.get(`ep/v1/company/${companyId}/emailProvider`);
  },

  deleteEmailProvider(companyId, emailProviderId) {
    return apiClient.delete(`ep/v1/company/${companyId}/emailProvider/${emailProviderId}`);
  },

  getAllEmailEventTypes() {
    return apiClient.get('ep/v1/emailEventTypes', {
      headers: {
        accept: 'application/json',
      },
    });
  },

  getTemplateByCompanyAndEventName(companyId, eventName) {
    return apiClient.get(`ep/v1/company/${companyId}/eventName/${eventName}/companyTemplate`);
  },
};

export default TemplateService;
