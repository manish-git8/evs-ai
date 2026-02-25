import apiClient from '../api/apiClient';

const ShippingMethodService = {
  handleCreateShippingMethod(requestBody) {
    return apiClient.post('ep/v1/shippingMethod', requestBody);
  },

  handleUpdateShippingMethod(requestBody, shippingMethodId) {
    return apiClient.put(`ep/v1/shippingMethod/${shippingMethodId}`, requestBody);
  },

  deleteShippingMethods(shippingMethodId) {
    return apiClient.delete(`ep/v1/shippingMethod/${shippingMethodId}`);
  },

  getAllShippingMethods() {
    return apiClient.get('ep/v1/shippingMethod');
  },

  getShippingMethodsBySearch(searchTerm) {
    return apiClient.get(`ep/v1/shippingMethod?name=${searchTerm}`);
  },
};

export default ShippingMethodService;
