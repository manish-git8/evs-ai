import apiClient from '../api/apiClient';

const CatalogService = {
  getCatalogs() {
    return apiClient.get('ep/v1/catalog');
  },

  getSupplierCatalogs(supplierId, catalogFilter = {}, pageDto = {}) {
    return apiClient.get('ep/v1/catalog', {
      params: {
        supplierId,
        catalogId: catalogFilter?.catalogId,
        catalogName: catalogFilter?.catalogName,

        pageSize: pageDto?.pageSize ?? 10,
        pageNumber: pageDto?.pageNumber ?? 0,
        sortBy: pageDto?.sortBy,
        order: pageDto?.order,
      },
    });
  },
  getCatalogById(catalogId) {
    return apiClient.get('ep/v1/catalog', {
      params: {
        catalogId,
      },
    });
  },

  getCatalogById(catalogId) {
    return apiClient.get('ep/v1/catalog', {
      params: {
        catalogId,
      },
    });
  },

  getCatalogsBySearch(searchTerm, supplierId) {
    return apiClient.get(`ep/v1/catalog?catalogName=${searchTerm}&supplierId=${supplierId}`);
  },

  deleteCatalog(catalogId) {
    return apiClient.delete(`ep/v1/catalog/${catalogId}`);
  },

  createCatalog(catalogData) {
    return apiClient.post('ep/v1/catalog', catalogData);
  },

  updateCatalog(catalogId, catalogData) {
    return apiClient.put(`ep/v1/catalog/${catalogId}`, catalogData);
  },
};

export default CatalogService;
