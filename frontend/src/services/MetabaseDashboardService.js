import apiClient from '../api/apiClient';

const MetabaseDashboardService = {
  getMetabaseDashboardReport(companyId) {
    return apiClient.get(`ep/v1/company/${companyId}/metabase-url`);
  },
};

export default MetabaseDashboardService;
