import apiClient from '../api/apiClient';

const RqfService = {
  getRfq(
    companyId,
    {
      pageSize = 10,
      pageNumber = 0,
      search = '',
      userId = null,
      createdBy = null,
      sortBy = 'createdDate',
      order = 'desc',
    } = {},
  ) {
    const params = {
      pageSize,
      pageNumber,
      sortBy,
      order,
    };

    if (search && search.trim() !== '') {
      params.search = search.trim();
    }
    if (userId) {
      params.userId = userId;
    }
    if (createdBy) {
      params.createdBy = createdBy;
    }

    return apiClient.get(`ep/v1/company/${companyId}/rfqs`, { params });
  },

  getRfqBySupplierSearch(companyId, searchTerm, { pageSize = 10, pageNumber = 0 } = {}) {
    return apiClient.get(`ep/v1/company/${companyId}/rfqs`, {
      params: { pageSize, pageNumber, search: searchTerm },
    });
  },

  getRfqByCompanySearch(companyId, searchTerm, { pageSize = 10, pageNumber = 0 } = {}) {
    return apiClient.get(`ep/v1/supplier/${companyId}/supplierRfqs`, {
      params: { pageSize, pageNumber, search: searchTerm },
    });
  },

  getSupplierRfq(supplierId, { pageSize = 10, pageNumber = 0, search = '' } = {}) {
    const params = { pageSize, pageNumber };
    if (search && search.trim() !== '') {
      params.search = search.trim();
    }
    return apiClient.get(`ep/v1/supplier/${supplierId}/supplierRfqs`, { params });
  },

  getSupplierRfqPaginated(
    supplierId,
    { pageSize = 10, pageNumber = 0, search = '', sortBy = '', order = 'asc' } = {},
  ) {
    const params = { pageSize, pageNumber, sortBy, order };

    if (search && search.trim() !== '') {
      params.search = search.trim();
    }

    return apiClient.get(`ep/v1/supplier/${supplierId}/supplierRfqs`, { params });
  },

  createRfq(companyId, requestBody) {
    return apiClient.post(`ep/v1/company/${companyId}/rfqs`, requestBody);
  },

  getRfqById(companyId, rfqId) {
    return apiClient.get(`ep/v1/company/${companyId}/rfqs/${rfqId}`);
  },

  getSupplierRfqById(rfqId, supplierId) {
    return apiClient.get(`ep/v1/supplier/${supplierId}/rfqs/${rfqId}`);
  },

  sendRfqToSupplier(companyId, rfqId) {
    return apiClient.post(`ep/v1/company/${companyId}/rfqs/${rfqId}/submit`, null);
  },

  resubmitRfq(companyId, rfqId) {
    return apiClient.post(`ep/v1/company/${companyId}/rfqs/${rfqId}/resubmit`, null);
  },

  saveSupplierResponse(companyId, rfqId, supplierId, requestBody) {
    return apiClient.post(
      `ep/v1/company/${companyId}/rfqs/${rfqId}/suppliers/${supplierId}/response`,
      requestBody,
    );
  },

  submitSupplierResponse(supplierId, rfqId, requestBody) {
    return apiClient.post(`ep/v1/suppliers/${supplierId}/rfqs/${rfqId}/response`, requestBody);
  },

  updateRfq(companyId, rfqId, requestBody) {
    return apiClient.put(`ep/v1/company/${companyId}/rfqs/${rfqId}`, requestBody);
  },

  inviteSupplier(companyId, rfqId, supplierId) {
    return apiClient.post(
      `ep/v1/company/${companyId}/rfqs/${rfqId}/suppliers/${supplierId}/invite`,
      {
        supplierId,
      },
    );
  },

  requsetSignOff(companyId, rfqId, requestBody) {
    return apiClient.post(`ep/v1/company/${companyId}/rfqs/${rfqId}/signoff`, requestBody);
  },

  overrideSignOff(companyId, rfqId, signoffId, requestBody) {
    return apiClient.post(
      `ep/v1/company/${companyId}/rfqs/${rfqId}/signoffs/${signoffId}/override-complete`,
      requestBody,
    );
  },

  getRfqApprovalPath(companyId, userId, { pageSize = 10, pageNumber = 0 } = {}) {
    return apiClient.get(`ep/v1/company/${companyId}/rfqs`, {
      params: {
        pageSize,
        pageNumber,
        userId,
      },
    });
  },

  getSupplierByAIRecommendation(requestBody) {
    return apiClient.post('ep/v1/rfq/supplier-ai-recommendation', requestBody);
  },

  duplicateRfq(companyId, rfqId) {
    return apiClient.post(`ep/v1/company/${companyId}/rfq/${rfqId}/duplicate`, null);
  },

  checkTitleAvailability(companyId, title) {
    return apiClient.get(
      `ep/v1/company/${companyId}/rfqs/title-availability?title=${encodeURIComponent(title)}`,
    );
  },

  getRfqHistory(companyId, rfqId, { pageSize = 10, pageNumber = 0 } = {}) {
    return apiClient.get(`ep/v1/company/${companyId}/rfqs/${rfqId}/history`, {
      params: { pageSize, pageNumber },
    });
  },

  getRfqHistoryTimeline(companyId, rfqId) {
    return apiClient.get(`ep/v1/company/${companyId}/rfqs/${rfqId}/history/timeline`);
  },

  // Get paginated RFQ approvals for a user
  getRfqApprovalsPaginated(
    companyId,
    userId,
    signoffStatus = 'requested',
    pageSize = 10,
    pageNumber = 0,
    sortBy = 'updatedDate',
    order = 'desc',
    search = '',
  ) {
    const params = { signoffStatus, pageSize, pageNumber, sortBy, order };
    if (search && search.trim() !== '') {
      params.search = search.trim();
    }
    return apiClient.get(`ep/v1/company/${companyId}/rfqs/${userId}/approvals`, { params });
  },

  // Get RFQs by supplier ID for a company - returns RFQs that include this supplier
  getRfqsBySupplier(
    companyId,
    supplierId,
    pageSize = 10,
    pageNumber = 0,
    searchTerm = '',
    sortBy = 'updatedDate',
    order = 'desc',
  ) {
    const params = {
      supplierId,
      pageSize,
      pageNumber,
      sortBy,
      order,
    };

    if (searchTerm && searchTerm.trim() !== '') {
      params.search = searchTerm.trim();
    }

    return apiClient.get(`ep/v1/company/${companyId}/rfqs`, { params });
  },

  // Reassign RFQs to a different user
  reassignRfqs(companyId, itemIds, newUserId) {
    return apiClient.patch(`ep/v1/company/${companyId}/rfqs/reassign`, {
      itemIds,
      newUserId,
    });
  },
};

export default RqfService;
