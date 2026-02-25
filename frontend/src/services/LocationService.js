import apiClient from '../api/apiClient';

const LocationService = {
  handleCreateLocation(companyId, requestBody) {
    return apiClient.post(`ep/v1/company/${companyId}/location`, requestBody);
  },

  handleUpdateLocation(companyId, locationId, requestBody) {
    return apiClient.put(`ep/v1/company/${companyId}/location/${locationId}`, requestBody);
  },

  handleDeleteLocation(companyId, locationId) {
    return apiClient.delete(`ep/v1/company/${companyId}/location/${locationId}`);
  },

  getAllLocation(companyId, searchFilter, pageDto) {
    return apiClient.get(`ep/v1/company/${companyId}/location`, {
      params: {
        id: searchFilter?.id,
        name: searchFilter?.name,
        search: searchFilter?.search,
        userId: searchFilter?.userId,
        pageSize: pageDto?.pageSize,
        pageNumber: pageDto?.pageNumber,
        sortBy: pageDto?.sortBy,
        order: pageDto?.order,
      },
    });
  },

  getAllLocationByUser(companyId, userId, pageDto) {
    return apiClient.get(`ep/v1/company/${companyId}/location`, {
      params: {
        userId: userId,
        pageSize: pageDto?.pageSize,
        pageNumber: pageDto?.pageNumber,
        sortBy: pageDto?.sortBy,
        order: pageDto?.order,
      },
    });
  },

  getLocationBySearch(companyId, searchFilter, pageDto) {
    return apiClient.get(`ep/v1/company/${companyId}/location`, {
      params: {
        name: searchFilter?.name,
        search: searchFilter?.search,
        userId: searchFilter?.userId,
        pageSize: pageDto?.pageSize,
        pageNumber: pageDto?.pageNumber,
        sortBy: pageDto?.sortBy,
        order: pageDto?.order,
      },
    });
  },

  getLocationById(companyId, locationId) {
    return apiClient.get(`ep/v1/company/${companyId}/location?id=${locationId}`);
  },

  addUserToLocation(companyId, locationId, requestBody) {
    return apiClient.post(`ep/v1/company/${companyId}/location/${locationId}/user`, requestBody);
  },

  getUsersByLocation(companyId, locationId) {
    return apiClient.get(`ep/v1/company/${companyId}/location/${locationId}/user`);
  },
};

export default LocationService;
