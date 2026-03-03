import apiClient from '../api/apiClient';

const CompanyService = {
  handleCreateCompany(requestBody) {
    return apiClient.post('ep/v1/company', requestBody);
  },

  handleUpdateCompany(requestBody, companyId) {
    return apiClient.put(`ep/v1/company/${companyId}`, requestBody);
  },

  getAllCompanies() {
    return apiClient.get('ep/v1/company');
  },

  getAllCompaniesSorting(pageDto) {
    return apiClient.get('ep/v1/company', {
      params: {
        pageSize: pageDto.pageSize,
        pageNumber: pageDto.pageNumber,
        sortBy: pageDto.sortBy,
        order: pageDto.order,
      },
    });
  },

  getCompanySetting(companyId) {
    return apiClient.get(`ep/v1/company/${companyId}/settings`);
  },

  getAddressCompanyByAddressId: (companyId, shipToAddressId) => {
    return apiClient.get(`ep/v1/company/${companyId}/address/${shipToAddressId}`);
  },

  deleteCompany(companyId) {
    return apiClient.delete(`ep/v1/company/${companyId}`);
  },

  getCompanyByCompanyId(companyId) {
    return apiClient
      .get(`ep/v1/company?companyId=${companyId}&name=string`)
      .then((res) => {
        const data = res.data;
        if (data && data.content) {
          return { ...res, data: data.content };
        }
        if (data && !Array.isArray(data)) {
          return { ...res, data: [data] };
        }
        return res;
      })
      .catch((err) => {
        throw err;
      });
  },

  getCompanyBySearch(searchTerm, pageDto) {
    return apiClient.get(`ep/v1/company`, {
      params: {
        name: searchTerm,
        pageNumber: pageDto.pageNumber,
        pageSize: pageDto.pageSize,
        sortBy: pageDto.sortBy,
        order: pageDto.order,
      },
    });
  },

  getCompanyAudits(companyId, pageNumber = 0, pageSize = 10) {
    return apiClient.get(`ep/v1/companies/${companyId}/audits`, {
      params: { pageNumber, pageSize },
    });
  },

  // Get company by ID (direct endpoint)
  getCompanyById(companyId) {
    return apiClient.get(`ep/v1/company/${companyId}`);
  },

  // Admin: Get company metrics (carts, orders, rfqs, users counts)
  getCompanyMetrics(companyId) {
    return apiClient.get(`ep/v1/admin/company/${companyId}/metrics`);
  },

  // Get company users count
  getCompanyUsersCount(companyId) {
    return apiClient.get(`ep/v1/company/${companyId}/users/count`);
  },

  // Get recent company activity
  getCompanyActivity(companyId, limit = 10) {
    return apiClient.get(`ep/v1/admin/company/${companyId}/activity?limit=${limit}`);
  },

  // Get company currency
  getCompanyCurrency(companyId) {
    return apiClient.get(`ep/v1/company/${companyId}`).then((res) => {
      return res.data?.currency || 'INR';
    });
  },
};

export default CompanyService;
