import apiClient from '../api/apiClient';

const ProjectService = {
  handleCreateProject(requestBody, companyId) {
    return apiClient.post(`ep/v1/company/${companyId}/project`, requestBody);
  },

  handleDeleteProject(companyId, projectId) {
    return apiClient.delete(`ep/v1/company/${companyId}/project/${projectId}`);
  },

  handleEditProject(companyId, projectId, requestBody) {
    return apiClient.put(`ep/v1/company/${projectId}/project/${companyId}`, requestBody);
  },

  getProjectByProjectId(companyId, projectId) {
    return apiClient.get(`ep/v1/company/${companyId}/project?id=${projectId}`);
  },

  getProjectsBySearch(companyId, searchTerm) {
    return apiClient.get(`ep/v1/company/${companyId}/project?name=${searchTerm}`);
  },

  getAllProjects(companyId, searchFilter, pageDto) {
    return apiClient.get(`ep/v1/company/${companyId}/project`, {
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

  getAllProjectsByUser(companyId, userId, pageDto) {
    return apiClient.get(`ep/v1/company/${companyId}/project`, {
      params: {
        userId: userId,
        pageSize: pageDto?.pageSize,
        pageNumber: pageDto?.pageNumber,
        sortBy: pageDto?.sortBy,
        order: pageDto?.order,
      },
    });
  },

  addUserToProject(companyId, projectId, requestBody) {
    return apiClient.post(`ep/v1/company/${companyId}/project/${projectId}/user`, requestBody);
  },

  getUsersByProject(companyId, projectId) {
    return apiClient.get(`ep/v1/company/${companyId}/project/${projectId}/user`);
  },
};

export default ProjectService;
