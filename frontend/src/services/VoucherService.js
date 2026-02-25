import qs from 'qs';
import apiClient from '../api/apiClient';

const VoucherService = {
  handleCreateVoucher(companyId, requestBody) {
    return apiClient.post(`ep/v1/company/${companyId}/voucher`, requestBody);
  },

  handleChangeStatus(companyId, voucherHeadId, requestBody) {
    return apiClient.patch(
      `ep/v1/company/${companyId}/voucherStatus/${voucherHeadId}`,
      requestBody,
    );
  },

  getAllVoucher(companyId) {
    return apiClient.get(`ep/v1/company/${companyId}/voucher`, {
      params: { status: ['CREATED', 'ON_HOLD', 'CLOSED'] },
      paramsSerializer: (p) => qs.stringify(p, { arrayFormat: 'repeat' }),
    });
  },

  getVouchersPaginated(
    companyId,
    pageSize = 10,
    pageNumber = 0,
    searchTerm = '',
    status = ['CREATED', 'ON_HOLD', 'CLOSED'],
    voucherId = '',
    sortBy = 'createdDate',
    order = 'desc',
  ) {
    const params = {
      pageSize,
      pageNumber,
      status,
      sortBy,
      order,
    };

    if (searchTerm && searchTerm.trim() !== '') {
      params.search = searchTerm.trim();
    }

    if (voucherId && String(voucherId).trim() !== '') {
      params.voucherId = String(voucherId).trim();
    }

    return apiClient.get(`ep/v1/company/${companyId}/voucher`, {
      params,
      paramsSerializer: (p) => qs.stringify(p, { arrayFormat: 'repeat' }),
    });
  },
  getAllSupplierVoucher(supplierId) {
    return apiClient.get(`ep/v1/supplier/${supplierId}/voucher`);
  },

  // Paginated method for supplier voucher table
  getSupplierVouchersPaginated(
    supplierId,
    pageSize = 10,
    pageNumber = 0,
    searchTerm = '',
    status = ['CREATED', 'CLOSED', 'APPROVED'],
    voucherId = '',
    sortBy = '',
    order = 'asc',
  ) {
    const params = {
      pageSize,
      pageNumber,
      status,
      sortBy,
      order,
    };

    if (searchTerm && searchTerm.trim() !== '') {
      params.search = searchTerm.trim();
    }

    if (voucherId && String(voucherId).trim() !== '') {
      params.voucherId = String(voucherId).trim();
    }

    return apiClient.get(`ep/v1/supplier/${supplierId}/voucher`, {
      params,
      paramsSerializer: (p) => qs.stringify(p, { arrayFormat: 'repeat' }),
    });
  },

  getAllVoucherStatus(companyId, voucherHeadId) {
    return apiClient.get(`ep/v1/company/${companyId}/voucherStatus/${voucherHeadId}`);
  },

  getGRNBySearch(companyId, searchTerm) {
    return apiClient.get(`ep/v1/company/${companyId}/grn?supplierName=${searchTerm}`);
  },

  getVoucherBySupplierSearch(companyId, searchTerm) {
    return apiClient.get(`ep/v1/company/${companyId}/voucher?supplierName=${searchTerm}`);
  },

  getVoucherByCompanySearch(supplierId, searchTerm) {
    return apiClient.get(`ep/v1/supplier/${supplierId}/voucher?companyName=${searchTerm}`);
  },

  getBillByCompanySearch(companyId, searchTerm, status) {
    return apiClient.get(
      `ep/v1/company/${companyId}/voucher?supplierName=${searchTerm}&status=${status}`,
    );
  },

  getVoucherById(companyId, voucherId) {
    return apiClient.get(`ep/v1/company/${companyId}/voucher`, {
      params: {
        voucherId,
      },
    });
  },

  getGrnByPoOrderNumber(companyId, purchaseOrderId) {
    return apiClient.get(`ep/v1/company/${companyId}/grn`, {
      params: {
        purchaseOrderId,
      },
    });
  },

  // Paginated method for GRN by PO order number
  getGrnByPoOrderNumberPaginated(companyId, purchaseOrderId, pageSize = 10, pageNumber = 0) {
    const params = {
      pageSize,
      pageNumber,
      purchaseOrderId: String(purchaseOrderId).trim(),
    };

    return apiClient.get(`ep/v1/company/${companyId}/grn`, {
      params,
      paramsSerializer: (p) => qs.stringify(p, { arrayFormat: 'repeat' }),
    });
  },

  deleteVoucher(companyId, voucherHeadId) {
    return apiClient.delete(`ep/v1/company/${companyId}/voucher/${voucherHeadId}`);
  },

  // Download voucher PDF - returns JSON with fileId
  downloadVoucherPdf(companyId, voucherHeadId) {
    return apiClient.post(`ep/v1/company/${companyId}/voucherPdf/${voucherHeadId}`, '');
  },
};

export default VoucherService;
