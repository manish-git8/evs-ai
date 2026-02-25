import apiClient from '../api/apiClient';

const GrnService = {
  handleCreateGRN(companyId, requestBody) {
    return apiClient.post(`ep/v1/company/${companyId}/grn`, requestBody);
  },

  getAllGRN(companyId) {
    return apiClient.get(`ep/v1/company/${companyId}/grn`);
  },

  getGRNsPaginated(
    companyId,
    pageSize = 10,
    pageNumber = 0,
    searchTerm = '',
    grnId = '',
    supplierId = '',
    sortParams = null,
  ) {
    const params = {
      pageSize,
      pageNumber,
    };

    if (searchTerm && searchTerm.trim() !== '') {
      params.search = searchTerm.trim();
    }

    if (grnId && String(grnId).trim() !== '') {
      params.grnId = String(grnId).trim();
    }

    if (supplierId && String(supplierId).trim() !== '') {
      params.supplierId = String(supplierId).trim();
    }

    if (sortParams && Object.keys(sortParams).length > 0) {
      Object.assign(params, sortParams);
    }

    return apiClient.get(`ep/v1/company/${companyId}/grn`, { params });
  },

  getGRNBySearch(companyId, searchTerm) {
    return apiClient.get(`ep/v1/company/${companyId}/grn?supplierName=${searchTerm}`);
  },

  getGRNById(companyId, grnId, supplierId) {
    return apiClient.get(`ep/v1/company/${companyId}/grn`, {
      params: {
        grnId,
        supplierId,
      },
    });
  },

  deleteGRN(companyId, grnId) {
    return apiClient.delete(`ep/v1/company/${companyId}/grn/${grnId}`);
  },
};

export default GrnService;
