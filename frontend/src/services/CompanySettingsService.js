import apiClient from '../api/apiClient';

const CompanySettingsService = {
  handleCreateCompanySettings(companyId, requestBody) {
    return apiClient.post(`ep/v1/company/${companyId}/settings`, requestBody);
  },
};

export default CompanySettingsService;
