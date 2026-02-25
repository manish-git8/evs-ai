import apiClient from '../api/apiClient';

const AddressService = {
  handleCreateAddress(companyId, requestBody) {
    return apiClient.post(`ep/v1/company/${companyId}/address`, requestBody);
  },

  handleDeleteAddress(companyId, addressId) {
    return apiClient.delete(`ep/v1/company/${companyId}/address/${addressId}`);
  },

  getAllAddressByCompany(companyId, addressType) {
    return apiClient.get(`ep/v1/company/${companyId}/address?addressType=${addressType}`);
  },

  getAllAddress(companyId, addressType, pageDto) {
    return apiClient.get(`ep/v1/company/${companyId}/address`, {
      params: {
        addressType: addressType,
        pageSize: pageDto.pageSize,
        pageNumber: pageDto.pageNumber,
        sortBy: pageDto.sortBy,
        order: pageDto.order,
      },
    });
  },

  getAddressById(companyId, addressId) {
    return apiClient.get(`ep/v1/company/${companyId}/address/${addressId}`);
  },

  updateAddress(companyId, addressId, requestBody) {
    return apiClient.put(`ep/v1/company/${companyId}/address/${addressId}`, requestBody);
  },
};

export default AddressService;
