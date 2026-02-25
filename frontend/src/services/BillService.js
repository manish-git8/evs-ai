import qs from 'qs';
import apiClient from '../api/apiClient';

const BillService = {
  getAllBill(companyId) {
    return apiClient.get(`ep/v1/company/${companyId}/voucher`, {
      params: { status: ['UNPAID', 'PAID'] },
      paramsSerializer: (p) => qs.stringify(p, { arrayFormat: 'repeat' }),
    });
  },

  // Paginated method for bills
  getBillsPaginated(
    companyId,
    pageSize = 10,
    pageNumber = 0,
    searchTerm = '',
    status = ['UNPAID', 'PAID'],
    voucherId = '',
  ) {
    const params = {
      pageSize,
      pageNumber,
      status,
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

  getSupplierBills(
    supplierId,
    pageSize = 10,
    pageNumber = 0,
    searchTerm = '',
    status = ['UNPAID', 'PAID'],
    voucherId = '',
  ) {
    const params = {
      pageSize,
      pageNumber,
      status,
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
  ) {
    const params = {
      pageSize,
      pageNumber,
      status,
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

  getVoucherById(companyId, voucherId) {
    return apiClient.get(`ep/v1/company/${companyId}/voucher`, {
      params: {
        voucherId,
      },
    });
  },

  // Paginated method for voucher by ID (returns single item in paginated format)
  getVoucherByIdPaginated(companyId, voucherId, pageSize = 10, pageNumber = 0) {
    const params = {
      pageSize,
      pageNumber,
      voucherId: String(voucherId).trim(),
    };

    return apiClient.get(`ep/v1/company/${companyId}/voucher`, {
      params,
      paramsSerializer: (p) => qs.stringify(p, { arrayFormat: 'repeat' }),
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
};

export default BillService;
