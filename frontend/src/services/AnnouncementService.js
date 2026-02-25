import apiClient from '../api/apiClient';

const AnnouncementService = {
  handleCreateAnnouncement(companyId, requestBody) {
    return apiClient.post(`ep/v1/company/${companyId}/announcement`, requestBody);
  },

  handleUpdateAnnouncement(companyId, announcementId, requestBody) {
    return apiClient.put(`ep/v1/company/${companyId}/announcement/${announcementId}`, requestBody);
  },

  handleDeleteAnnouncement(companyId, announcementId) {
    return apiClient.delete(`ep/v1/company/${companyId}/announcement/${announcementId}`);
  },

  getAnnouncementsBySearch(companyId, searchTerm, filterDto, pageDto) {
    return apiClient.get(`ep/v1/company/${companyId}/announcement`, {
      params: {
        announcementName: searchTerm,
        announcementId: filterDto?.announcementId,
        companyId: filterDto?.companyId,
        date: filterDto?.date,
        pageSize: pageDto?.pageSize,
        pageNumber: pageDto?.pageNumber,
        sortBy: pageDto?.sortBy,
        order: pageDto?.order,
      },
    });
  },

  getAllAnnouncements(companyId, filterDto, pageDto) {
    return apiClient.get(`ep/v1/company/${companyId}/announcement`, {
      params: {
        announcementId: filterDto?.announcementId,
        companyId: filterDto?.companyId,
        announcementName: filterDto?.announcementName,
        date: filterDto?.date,
        pageSize: pageDto?.pageSize,
        pageNumber: pageDto?.pageNumber,
        sortBy: pageDto?.sortBy,
        order: pageDto?.order,
      },
    });
  },

  getAllAnnouncementsWithDate(companyId, date) {
    return apiClient.get(`ep/v1/company/${companyId}/announcement?date=${date}`);
  },

  getAnnouncementByAnnouncementId(companyId, announcementId) {
    return apiClient.get(
      `ep/v1/company/${companyId}/announcement?announcementId=${announcementId}`,
    );
  },
};

export default AnnouncementService;
