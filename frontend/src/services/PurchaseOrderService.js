import apiClient from '../api/apiClient';

const PurchaseOrderService = {
  getPurchaseOrders(supplierId) {
    return apiClient.get(`ep/v1/supplier/${supplierId}/purchaseOrder`);
  },

  getSupplierPurchaseOrdersPaginated(supplierId, options = {}) {
    const {
      pageSize = 10,
      pageNumber = 0,
      search = '',
      sortBy = 'PurchaseOrderId',
      order = 'desc',
    } = options;

    const params = { pageSize, pageNumber, sortBy, order };
    if (search && search.trim() !== '') {
      params.search = search.trim();
    }

    return apiClient.get(`ep/v1/supplier/${supplierId}/purchaseOrder`, { params });
  },

  getPurchaseOrdersBySearch(searchTerm, supplierId) {
    return apiClient.get(`ep/v1/supplier/${supplierId}/purchaseOrder?search=${searchTerm}`);
  },

  getPurchaseOrdersBySearchByOrderNo(supplierId, searchTerm) {
    return apiClient.get(
      `ep/v1/supplier/${supplierId}/purchaseOrder?purchaseOrderNo=${searchTerm}`,
    );
  },

  getPurchaseOrderById(supplierId, purchaseOrderId) {
    return apiClient.get(
      `ep/v1/supplier/${supplierId}/purchaseOrder?purchaseOrderId=${purchaseOrderId}`,
    );
  },

  getPurchaseOrderByOrderNo(supplierId, orderNo) {
    return apiClient.get(`ep/v1/supplier/${supplierId}/purchaseOrder?orderNo=${orderNo}`);
  },

  getPurchaseOrdersByCompany(supplierId, companyId) {
    return apiClient.get(`ep/v1/supplier/${supplierId}/purchaseOrder?companyId=${companyId}`);
  },

  getPurchaseOrderByIdCompany(companyId, purchaseOrderId, pageSize = 100, pageNumber = 0) {
    return apiClient.get(`ep/v1/company/${companyId}/purchaseOrder`, {
      params: {
        purchaseOrderId,
        pageSize,
        pageNumber,
      },
    });
  },

  getPoByOrderNumber(companyId, purchaseOrderNo, pageSize = 100, pageNumber = 0) {
    return apiClient.get(`ep/v1/company/${companyId}/purchaseOrder`, {
      params: {
        purchaseOrderNo,
        pageSize,
        pageNumber,
      },
    });
  },

  getPurchaseOrderItemDetails(companyId, purchaseOrderId) {
    return apiClient.get(`ep/v1/company/${companyId}/purchaseOrder/${purchaseOrderId}/itemDetails`);
  },

  confirmPurchaseOrder(supplierId, data, companyId) {
    return apiClient.post(`ep/v1/supplier/${supplierId}/company/${companyId}/confirmation`, data);
  },

  getTopCompanies(supplierId, startDate, endDate, topNumber = 5) {
    return apiClient.get(`ep/v1/supplier/${supplierId}/topCompanies`, {
      params: {
        startDate,
        endDate,
        topNumber,
      },
    });
  },

  allConfirmedOrder(supplierId, confirmationId) {
    return apiClient.get(`ep/v1/supplier/${supplierId}/confirmation/${confirmationId}/company`);
  },

  getOrderDetailsById(supplierId, confirmationId, orderConfirmationId) {
    return apiClient.get(`ep/v1/supplier/${supplierId}/confirmation/${confirmationId}/company`, {
      params: { orderConfirmationId },
    });
  },

  deleteConfirmedOrder(supplierId, orderConfirmationId, companyId) {
    return apiClient.delete(
      `ep/v1/supplier/${supplierId}/confirmation/${companyId}/company/${orderConfirmationId}`,
    );
  },

  updateConfirmQuantity(supplierId, confirmationId, companyId, data) {
    return apiClient.put(
      `ep/v1/supplier/${supplierId}/confirmation/${confirmationId}/company/${companyId}`,
      data,
    );
  },

  getPurchaseOrderDetailsById(companyId, approverId) {
    return apiClient.get(`ep/v1/company/${companyId}/purchaseOrder/${approverId}`);
  },

  getPurchaseOrderDetailsByRaised(
    companyId,
    purchaseOrderId,
    createdBy,
    pageSize = 100,
    pageNumber = 0,
  ) {
    return apiClient.get(`ep/v1/company/${companyId}/purchaseOrder`, {
      params: {
        purchaseOrderId,
        createdBy,
        pageSize,
        pageNumber,
      },
    });
  },

  getPurchaseOrdersPaginated(companyId, options = {}) {
    const {
      pageSize = 10,
      pageNumber = 0,
      searchTerm = null,
      purchaseOrderId = null,
      createdBy = null,
      cartId = null,
      rfqId = null,
      orderNo = null,
      companyName = null,
      sortBy = 'orderPlacedDate',
      order = 'desc',
      ...additionalParams
    } = options;

    const params = {
      pageSize,
      pageNumber,
      sortBy,
      order,
      ...additionalParams,
    };

    if (searchTerm != null && String(searchTerm).trim() !== '') {
      params.search = String(searchTerm).trim();
    }

    if (purchaseOrderId != null && String(purchaseOrderId).trim() !== '') {
      params.purchaseOrderId = String(purchaseOrderId).trim();
    }

    if (createdBy != null && String(createdBy).trim() !== '') {
      params.createdBy = String(createdBy).trim();
    }

    if (cartId != null && String(cartId).trim() !== '') {
      params.cartId = String(cartId).trim();
    }

    if (rfqId != null && String(rfqId).trim() !== '') {
      params.rfqId = String(rfqId).trim();
    }

    if (orderNo != null && String(orderNo).trim() !== '') {
      params.purchaseOrderNo = String(orderNo).trim();
    }

    if (companyName != null && String(companyName).trim() !== '') {
      params.companyName = String(companyName).trim();
    }

    return apiClient.get(`ep/v1/company/${companyId}/purchaseOrder`, { params });
  },

  getPurchaseOrderDetailsByCartId(companyId, cartId, pageSize = 100, pageNumber = 0) {
    return apiClient.get(`ep/v1/company/${companyId}/purchaseOrder`, {
      params: {
        cartId,
        pageSize,
        pageNumber,
      },
    });
  },

  getPurchaseOrderDetailsByRfqId(companyId, rfqId, pageSize = 100, pageNumber = 0) {
    return apiClient.get(`ep/v1/company/${companyId}/purchaseOrder`, {
      params: {
        rfqId,
        pageSize,
        pageNumber,
      },
    });
  },

  createPurchaseOrder(companyId, requestBody) {
    return apiClient.post(`ep/v1/company/${companyId}/purchaseOrder`, requestBody);
  },

  updateOrderItem(companyId, purchaseOrderId, orderItemId, requestBody) {
    return apiClient.patch(
      `ep/v1/company/${companyId}/purchaseOrder/${purchaseOrderId}/itemDetails/${orderItemId}`,
      requestBody,
    );
  },

  // Update PO header (e.g., total amount) - uses PUT as per backend API spec
  updatePurchaseOrder(companyId, purchaseOrderId, requestBody) {
    return apiClient.put(
      `ep/v1/company/${companyId}/purchaseOrder/${purchaseOrderId}`,
      requestBody,
    );
  },

  getPurchaseOrderAudits(companyId, purchaseOrderId, pageNumber = 0, pageSize = 10) {
    return apiClient.get(`ep/v1/companies/${companyId}/purchase-orders/${purchaseOrderId}/audits`, {
      params: { pageNumber, pageSize },
    });
  },

  // Get paginated PO approvals for a user
  getPOApprovalsPaginated(
    companyId,
    approverId,
    status = 'pending',
    pageSize = 10,
    pageNumber = 0,
    sortBy = 'updatedDate',
    order = 'desc',
    search = '',
  ) {
    const params = { status, pageSize, pageNumber, sortBy, order };
    if (search && search.trim() !== '') {
      params.search = search.trim();
    }
    return apiClient.get(`ep/v1/company/${companyId}/purchaseOrder/${approverId}/approvals`, { params });
  },

  // Get paginated POs by order status for a user (dashboard cards)
  getPOsByStatusForUser(
    companyId,
    userId,
    orderStatus,
    pageSize = 10,
    pageNumber = 0,
    sortBy = 'orderPlacedDate',
    order = 'desc',
    search = '',
  ) {
    const params = { orderStatus, pageSize, pageNumber, sortBy, order };
    if (search && search.trim() !== '') {
      params.search = search.trim();
    }
    return apiClient.get(`ep/v1/company/${companyId}/purchaseOrder/${userId}/byStatus`, { params });
  },

  // Get POs by supplier ID for a company
  getPurchaseOrdersBySupplier(
    companyId,
    supplierId,
    pageSize = 10,
    pageNumber = 0,
    searchTerm = '',
    sortBy = 'orderPlacedDate',
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

    return apiClient.get(`ep/v1/company/${companyId}/purchaseOrder`, { params });
  },

  // Reassign purchase orders to a different user
  reassignPurchaseOrders(companyId, itemIds, newUserId) {
    return apiClient.patch(`ep/v1/company/${companyId}/purchaseOrder/reassign`, {
      itemIds,
      newUserId,
    });
  },

  /**
   * Confirm purchase order by company user (for draft/internal suppliers only).
   * This allows company users to mark confirmation for orders that don't have
   * actual external suppliers to confirm.
   * @param {number} companyId - Company ID
   * @param {number} purchaseOrderId - Purchase Order ID
   * @param {object} data - Confirmation data with orderItemDetails
   * @returns {Promise} API response
   */
  confirmPurchaseOrderAsCompany(companyId, purchaseOrderId, data) {
    return apiClient.post(
      `ep/v1/company/${companyId}/purchase-order/${purchaseOrderId}/confirmation`,
      data,
    );
  },
};

export default PurchaseOrderService;
