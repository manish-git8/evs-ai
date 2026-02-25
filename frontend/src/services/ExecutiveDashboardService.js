import apiClient from '../api/apiClient';

const ExecutiveDashboardService = {
  // Financial Metrics API
  getFinancialMetrics: async (companyId, params = {}) => {
    return apiClient.get(`ep/v1/company/${companyId}/executive-dashboard/financial-metrics`, {
      params,
    });
  },

  // Operational Metrics API
  getOperationalMetrics: async (companyId, params = {}) => {
    return apiClient.get(`ep/v1/company/${companyId}/executive-dashboard/operational-metrics`, {
      params,
    });
  },

  // Procurement Pipeline API
  getProcurementPipeline: async (companyId, params = {}) => {
    return apiClient.get(`ep/v1/company/${companyId}/executive-dashboard/procurement-pipeline`, {
      params,
    });
  },

  // Supplier Performance API
  getSupplierPerformance: async (companyId, params = {}) => {
    return apiClient.get(`ep/v1/company/${companyId}/executive-dashboard/supplier-performance`, {
      params,
    });
  },

  // Alerts & Actions API
  getAlertsActions: async (companyId, params = {}) => {
    return apiClient.get(`ep/v1/company/${companyId}/executive-dashboard/alerts-actions`, {
      params,
    });
  },

  // Fetch all dashboard data in parallel
  getAllDashboardData: async (companyId, params = {}) => {
    try {
      console.log('Fetching all dashboard data for company:', companyId);
      console.log('Params:', params);

      const results = await Promise.allSettled([
        ExecutiveDashboardService.getFinancialMetrics(companyId, params),
        ExecutiveDashboardService.getOperationalMetrics(companyId, params),
        ExecutiveDashboardService.getProcurementPipeline(companyId, {
          ...params,
          includeItems: false,
        }),
        ExecutiveDashboardService.getSupplierPerformance(companyId, params),
        ExecutiveDashboardService.getAlertsActions(companyId),
      ]);

      // Log results for debugging
      results.forEach((result, index) => {
        const apiNames = ['Financial', 'Operational', 'Pipeline', 'Supplier', 'Alerts'];
        if (result.status === 'rejected') {
          console.error(
            `${apiNames[index]} API failed:`,
            result.reason?.response?.data || result.reason?.message,
          );
        } else {
          console.log(`${apiNames[index]} API succeeded`);
        }
      });

      return {
        financial: results[0].status === 'fulfilled' ? results[0].value.data : null,
        operational: results[1].status === 'fulfilled' ? results[1].value.data : null,
        pipeline: results[2].status === 'fulfilled' ? results[2].value.data : null,
        supplier: results[3].status === 'fulfilled' ? results[3].value.data : null,
        alerts: results[4].status === 'fulfilled' ? results[4].value.data : null,
      };
    } catch (error) {
      console.error('Unexpected error in getAllDashboardData:', error);
      throw error;
    }
  },
};

export default ExecutiveDashboardService;
