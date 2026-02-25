import apiClient from '../api/apiClient';

const GLAccountService = {
  handleCreateGLAccount(companyId, requestBody) {
    return apiClient.post(`ep/v1/company/${companyId}/glaccount`, requestBody);
  },

  handleUpdateGLAccount(companyId, glAccountId, requestBody) {
    return apiClient.put(`ep/v1/company/${companyId}/glaccount/${glAccountId}`, requestBody);
  },

  handleDeleteGLAccount(companyId, glAccountId) {
    return apiClient.delete(`ep/v1/company/${companyId}/glaccount/${glAccountId}`);
  },

  handleAddUserToGLAccount(companyId, requestBody, glAccountId) {
    return apiClient.post(`ep/v1/company/${companyId}/glaccount/${glAccountId}/user`, requestBody);
  },

  handleAddDeparmentToGLAccount(companyId, requestBody, glAccountId) {
    return apiClient.post(
      `ep/v1/company/${companyId}/glaccount/${glAccountId}/department`,
      requestBody,
    );
  },

  getUsersForGLAccount(companyId, glAccountId) {
    return apiClient.get(`ep/v1/company/${companyId}/glaccount/${glAccountId}/user`);
  },

  getAllGLAccount(companyId) {
    return apiClient.get(`ep/v1/company/${companyId}/glaccount`);
  },

  getAllGLAccountByUser(companyId, userId) {
    let url = `ep/v1/company/${companyId}/glaccount`;
    if (userId) {
      url += `?userId=${userId}`;
    }
    return apiClient.get(url);
  },

  getDepartmentForgLAccount(companyId, glAccountId) {
    return apiClient.get(`ep/v1/company/${companyId}/department?glAccountId=${glAccountId}`);
  },

  getgLAccountForDepartment(companyId, departmentId) {
    return apiClient.get(`ep/v1/company/${companyId}/glaccount?departmentId=${departmentId}`);
  },

  getGLAccountBySearch(searchTerm, companyId, pageDto) {
    return apiClient.get(`ep/v1/company/${companyId}/glaccount`, {
      params: {
        name: searchTerm,
        pageSize: pageDto?.pageSize,
        pageNumber: pageDto?.pageNumber,
        sortBy: pageDto?.sortBy,
        order: pageDto?.order,
      },
    });
  },

  getAllGLAccount(companyId, searchFilter, pageDto) {
    return apiClient.get(`ep/v1/company/${companyId}/glaccount`, {
      params: {
        id: searchFilter?.id,
        name: searchFilter?.name,
        search: searchFilter?.search,
        userId: searchFilter?.userId,
        departmentId: searchFilter?.departmentId,
        pageSize: pageDto?.pageSize,
        pageNumber: pageDto?.pageNumber,
        sortBy: pageDto?.sortBy,
        order: pageDto?.order,
      },
    });
  },

  getGlAccountById(companyId, glAccountId) {
    return apiClient.get(`ep/v1/company/${companyId}/glaccount?id=${glAccountId}`);
  },
};

export default GLAccountService;
