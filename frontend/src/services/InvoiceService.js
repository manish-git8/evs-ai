import apiClient from '../api/apiClient';

const InvoiceService = {
  getAllInvoices(companyId, pageSize = 100, pageNumber = 0) {
    return apiClient.get(`ep/v1/company/${companyId}/invoice`, {
      params: { pageSize, pageNumber },
    });
  },

  getInvoicesById(companyId, invoiceId) {
    return apiClient.get(`ep/v1/company/${companyId}/invoice?invoiceId=${invoiceId}`);
  },

  createInvoice(supplierId, payload) {
    return apiClient.post(`ep/v1/supplier/${supplierId}/invoice`, payload);
  },

  getAllInvoicesBySupplier(supplierId, searchFilter = {}, pageDto = {}) {
    const params = {
      pageSize: pageDto?.pageSize ?? 100,
      pageNumber: pageDto?.pageNumber ?? 0,
      sortBy: pageDto?.sortBy,
      order: pageDto?.order,
    };
    if (searchFilter.searchTerm) {
      params.search = searchFilter.searchTerm;
    }

    if (searchFilter.invoiceId) params.invoiceId = searchFilter.invoiceId;
    if (searchFilter.companyId) params.companyId = searchFilter.companyId;
    if (searchFilter.supplierId) params.supplierId = searchFilter.supplierId;
    if (searchFilter.supplierName) params.supplierName = searchFilter.supplierName;
    if (searchFilter.purchaseOrderId) params.purchaseOrderId = searchFilter.purchaseOrderId;
    if (searchFilter.invoiceNumber) params.invoiceNumber = searchFilter.invoiceNumber;
    if (searchFilter.invoiceTitle) params.invoiceTitle = searchFilter.invoiceTitle;

    return apiClient.get(`ep/v1/supplier/${supplierId}/invoice`, { params });
  },

  getInvoiceByIdForSupplier(supplierId, invoiceId) {
    return apiClient.get(`ep/v1/supplier/${supplierId}/invoice?invoiceId=${invoiceId}`);
  },

  deleteInvoiceBySupplier(supplierId, invoiceId) {
    return apiClient.delete(`ep/v1/supplier/${supplierId}/invoice/${invoiceId}`);
  },

  getAllInvoicesForCompany(companyId, pageSize = 100, pageNumber = 0, sortParams) {
    let url = `ep/v1/company/${companyId}/invoice`;
    const params = { pageSize, pageNumber };

    if (sortParams && Object.keys(sortParams).length > 0) {
      Object.assign(params, sortParams);
    }

    return apiClient.get(url, { params });
  },

  getInvoiceByIdForCompany(companyId, invoiceId) {
    return apiClient.get(`ep/v1/company/${companyId}/invoice/${invoiceId}`);
  },

  approveInvoice(companyId, invoiceId, approvalData) {
    return apiClient.post(`ep/v1/company/${companyId}/invoice/${invoiceId}/approve`, approvalData);
  },

  deleteInvoiceByCompany(companyId, invoiceId) {
    return apiClient.delete(`ep/v1/company/${companyId}/invoice/${invoiceId}`);
  },

  // Company-side invoice creation
  createInvoiceByCompany(companyId, payload) {
    return apiClient.post(`ep/v1/company/${companyId}/invoice`, payload);
  },
};

export default InvoiceService;
