import apiClient from '../api/apiClient';

const ClassService = {
  handleCreateClass(companyId, requestBody) {
    return apiClient.post(`ep/v1/company/${companyId}/class`, requestBody);
  },

  handleUpdateClass(companyId, classId, requestBody) {
    return apiClient.put(`ep/v1/company/${companyId}/class/${classId}`, requestBody);
  },

  handleDeleteClass(companyId, classId) {
    return apiClient.delete(`ep/v1/company/${companyId}/class/${classId}`);
  },

  getClassBySearch(searchTerm, companyId, pageDto) {
    return apiClient.get(`ep/v1/company/${companyId}/class`, {
      params: {
        name: searchTerm,
        pageSize: pageDto?.pageSize,
        pageNumber: pageDto?.pageNumber,
        sortBy: pageDto?.sortBy,
        order: pageDto?.order,
      },
    });
  },

  getAllClass(companyId, searchFilter, pageDto) {
    return apiClient.get(`ep/v1/company/${companyId}/class`, {
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

  getAllClassByUser(companyId, userId) {
    let url = `ep/v1/company/${companyId}/class`;
    if (userId) {
      url += `?userId=${userId}`;
    }
    return apiClient.get(url);
  },

  getByIdClass(companyId, classId) {
    return apiClient.get(`ep/v1/company/${companyId}/class?id=${classId}`);
  },

  addUserToClass(companyId, classId, requestBody) {
    return apiClient.post(`ep/v1/company/${companyId}/class/${classId}/user`, requestBody);
  },

  getUsersByClass(companyId, classId) {
    return apiClient.get(`ep/v1/company/${companyId}/class/${classId}/user`);
  },
};

export default ClassService;
