import apiClient from '../api/apiClient';

const SupplierService = {
  handleCreateSupplier(requestBody) {
    return apiClient.post('ep/v1/supplier', requestBody);
  },

  getAllSupplierSorting(pageDto) {
    return apiClient.get('ep/v1/supplier', {
      params: {
        pageSize: pageDto.pageSize,
        pageNumber: pageDto.pageNumber,
        sortBy: pageDto.sortBy,
        order: pageDto.order,
      },
    });
  },

  getSupplierBySearchSorting(searchTerm, pageDto) {
    return apiClient.get('ep/v1/supplier', {
      params: {
        name: searchTerm,
        pageSize: pageDto.pageSize,
        pageNumber: pageDto.pageNumber,
        sortBy: pageDto.sortBy,
        order: pageDto.order,
      },
    });
  },

  /**
   * Get all suppliers with pagination and filtering
   * @param {Object} options - Query options
   * @param {number} options.pageSize - Number of items per page (default: 20)
   * @param {number} options.pageNumber - Page number (0-indexed, default: 0)
   * @param {string} options.name - Filter by supplier name
   * @param {number} options.categoryId - Filter by category ID
   * @param {number} options.id - Filter by supplier ID
   * @returns {Promise} - API response with list of suppliers
   */
  getAllSuppliersPaginated({
    pageSize = 20,
    pageNumber = 0,
    name = '',
    categoryId = null,
    id = null,
  } = {}) {
    const params = {
      pageSize,
      pageNumber,
    };

    if (name) {
      params.name = name;
    }
    if (categoryId) {
      params.categoryId = categoryId;
    }
    if (id) {
      params.id = id;
    }

    return apiClient.get('ep/v1/supplier', { params });
  },

  getSupplierBySearch(searchTerm) {
    return apiClient.get('ep/v1/supplier', {
      params: { name: searchTerm },
    });
  },

  deleteSupplier(supplierId) {
    return apiClient.delete(`ep/v1/supplier/${supplierId}`);
  },

  getSupplierById(supplierId) {
    return apiClient
      .get('ep/v1/supplier', {
        params: { id: supplierId },
      })
      .then((res) => {
        const data = res.data;
        if (data && data.content) {
          return { ...res, data: data.content };
        }
        if (data && !Array.isArray(data)) {
          return { ...res, data: [data] };
        }
        return res;
      });
  },

  updateSupplier(supplierId, requestBody) {
    return apiClient.put(`ep/v1/supplier/${supplierId}`, requestBody);
  },

  getTopProducts(supplierId, startDate, endDate, topNumber) {
    return apiClient.get(`ep/v1/supplier/${supplierId}/topProduct`, {
      params: { startDate, endDate, topNumber },
    });
  },

  handleCreateDraftSupplierFromCart(requestBody, companyId) {
    return apiClient.post(`ep/v1/company/${companyId}/supplier/create-draft-supplier`, requestBody);
  },

  getConnectedSuppliers(companyId, includeAllSuppliers = true) {
    return apiClient.get(`ep/v1/company/${companyId}/supplierConnected`, {
      params: { includeAllSuppliers },
    });
  },

  getConnectedSuppliersForBuyer(companyId) {
    return apiClient.get(`ep/v1/company/${companyId}/supplierConnected`);
  },
};

export default SupplierService;
