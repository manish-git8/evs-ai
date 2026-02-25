import apiClient from '../api/apiClient';

const CartService = {
  handleCreateCart(requestBody, companyId, cartId) {
    return apiClient.post(`ep/v1/company/${companyId}/cart/${cartId}/addDetail`, requestBody);
  },

  handleUpdateCart(requestBody, companyId, cartId) {
    return apiClient.put(`ep/v1/company/${companyId}/cart/${cartId}`, requestBody);
  },

  handleUpdateCartDetails(requestBody, companyId, cartDetailId, cartId) {
    return apiClient.put(
      `ep/v1/company/${companyId}/cart/${cartId}/updateDetail/${cartDetailId}`,
      requestBody,
    );
  },

  handleCartSubmit(userId, cartId, companyId) {
    return apiClient.patch(
      `ep/v1/company/${companyId}/cart/${cartId}/status?userId=${userId}&newStatus=submitted`,
      {},
    );
  },

  handleCartCompany(requestBody, companyId) {
    return apiClient.post(`ep/v1/company/${companyId}/cart`, requestBody);
  },

  getAllCart(companyId) {
    return apiClient.get(`ep/v1/company/${companyId}/cart`);
  },

  getCartsPaginated(
    companyId,
    pageSize = 10,
    pageNumber = 0,
    searchTerm = '',
    userId = '',
    cartId = '',
    status = '',
    sortBy = 'createdDate',
    order = 'desc',
  ) {
    const params = {
      pageSize,
      pageNumber,
      sortBy,
      order,
    };

    if (searchTerm && searchTerm.trim() !== '') {
      params.search = searchTerm.trim();
    }

    if (userId && String(userId).trim() !== '') {
      params.userId = String(userId).trim();
    }

    if (cartId && String(cartId).trim() !== '') {
      params.cartId = String(cartId).trim();
    }

    if (status && status.trim() !== '') {
      params.status = status.trim();
    }

    return apiClient.get(`ep/v1/company/${companyId}/cart`, { params });
  },

  getAllUserCart(companyId, userId) {
    return apiClient.get(`ep/v1/company/${companyId}/cart?userId=${userId}`);
  },

  getCartsBySearch(searchTerm, userId, companyId) {
    return apiClient.get(`ep/v1/company/${companyId}/cart?cartName=${searchTerm}&userId=${userId}`);
  },

  getCartDetailById(cartId, companyId) {
    return apiClient.get(`ep/v1/company/${companyId}/cart/cartDetail?cartId=${cartId}`);
  },

  getCartByCartId(cartId, companyId) {
    return apiClient.get(`ep/v1/company/${companyId}/cart?cartId=${cartId}`);
  },

  deleteCart(cartId, companyId) {
    return apiClient.delete(`ep/v1/company/${companyId}/cart/${cartId}`);
  },

  deleteCartDetail(cartId, cartDetailId) {
    return apiClient.delete(`ep/v1/cart/${cartId}/${cartDetailId}`);
  },

  getCartById(companyId, cartId) {
    return apiClient.get(`ep/v1/company/${companyId}/cart/${cartId}`);
  },

  getCartQueries(companyId, cartId) {
    return apiClient.get(`ep/v1/company/${companyId}/${cartId}/query`);
  },

  duplicateCart(companyId, cartId) {
    return apiClient.post(`ep/v1/company/${companyId}/cart/${cartId}/duplicate`, {});
  },

  getCartAudits(companyId, cartId, pageNumber = 0, pageSize = 10) {
    return apiClient.get(`ep/v1/companies/${companyId}/carts/audits`, {
      params: { cartId, pageNumber, pageSize },
    });
  },

  // Get paginated cart approvals for a user
  getCartApprovalsPaginated(
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
    return apiClient.get(`ep/v1/company/${companyId}/cart/${approverId}/approvals`, { params });
  },

  // Get carts by supplier ID - returns carts containing items from this supplier
  getCartsBySupplier(
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

    return apiClient.get(`ep/v1/company/${companyId}/cart`, { params });
  },

  // Reassign carts to a different user
  reassignCarts(companyId, itemIds, newUserId) {
    return apiClient.patch(`ep/v1/company/${companyId}/cart/reassign`, {
      itemIds,
      newUserId,
    });
  },
};

export default CartService;
