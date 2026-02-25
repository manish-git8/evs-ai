import apiClient from '../api/apiClient';

const FileUploadService = {
  downloadFile(fileId) {
    return apiClient.get(`ep/v1/file/${fileId}`, {
      responseType: 'blob',
    });
  },

  uploadFile(companyId, file) {
    const formData = new FormData();
    formData.append('fileContent', file, file.name);

    return apiClient.post(`ep/v1/company/${companyId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  uploadSupplierFile(supplierId, file) {
    const formData = new FormData();
    formData.append('fileContent', file, file.name);

    return apiClient.post(`ep/v1/supplier/${supplierId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getFileByFileId(fileId, options = {}) {
    return apiClient.get(`ep/v1/file/${fileId}`, {
      responseType: 'blob',
      suppressErrorToast: options.silent || false,
    });
  },
};

export default FileUploadService;
