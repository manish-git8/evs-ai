import apiClient from '../api/apiClient';

const DepartmentService = {
  handleCreateDeparment(companyId, requestBody) {
    return apiClient.post(`ep/v1/company/${companyId}/department`, requestBody);
  },

  handleUpdateDepartment(companyId, departmentId, requestBody) {
    return apiClient.put(`ep/v1/company/${companyId}/department/${departmentId}`, requestBody);
  },

  handleDeleteDepartment(companyId, departmentId) {
    return apiClient.delete(`ep/v1/company/${companyId}/department/${departmentId}`);
  },

  handleAddUserToDeparment(companyId, requestBody, departmentId) {
    return apiClient.post(
      `ep/v1/company/${companyId}/department/${departmentId}/user`,
      requestBody,
    );
  },

  handleAddGLAccountToDeparment(companyId, requestBody, departmentId) {
    return apiClient.post(
      `ep/v1/company/${companyId}/department/${departmentId}/glaccount`,
      requestBody,
    );
  },

  getUsersForDepartment(companyId, departmentId) {
    return apiClient.get(`ep/v1/company/${companyId}/department/${departmentId}/user`);
  },

  getgLAccountForDepartment(companyId, departmentId) {
    return apiClient.get(`ep/v1/company/${companyId}/glaccount?departmentId=${departmentId}`);
  },

  getDepartmentForgLAccount(companyId, glAccountId) {
    return apiClient.get(`ep/v1/company/${companyId}/department?glAccountId=${glAccountId}`);
  },

  getAllDepartment(companyId, searchFilter, pageDto) {
    return apiClient.get(`ep/v1/company/${companyId}/department`, {
      params: {
        id: searchFilter?.id,
        name: searchFilter?.name,
        search: searchFilter?.search,
        userId: searchFilter?.userId,
        glAccountId: searchFilter?.glAccountId,
        pageSize: pageDto?.pageSize,
        pageNumber: pageDto?.pageNumber,
        sortBy: pageDto?.sortBy,
        order: pageDto?.order,
      },
    });
  },

  getDepartmentByUser(companyId, userId, pageDto) {
    return apiClient.get(`ep/v1/company/${companyId}/department`, {
      params: {
        userId: userId,
        pageSize: pageDto?.pageSize,
        pageNumber: pageDto?.pageNumber,
        sortBy: pageDto?.sortBy,
        order: pageDto?.order,
      },
    });
  },

  getDepartmentBySearch(companyId, searchFilter, pageDto) {
    return apiClient.get(`ep/v1/company/${companyId}/department`, {
      params: {
        name: searchFilter?.name,
        search: searchFilter?.search,
        userId: searchFilter?.userId,
        glAccountId: searchFilter?.glAccountId,
        pageSize: pageDto?.pageSize,
        pageNumber: pageDto?.pageNumber,
        sortBy: pageDto?.sortBy,
        order: pageDto?.order,
      },
    });
  },

  getByIdDepartment(companyId, departmentId) {
    return apiClient.get(`ep/v1/company/${companyId}/department?id=${departmentId}`);
  },
};

export default DepartmentService;
