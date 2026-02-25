import apiClient from '../api/apiClient';

const extractArray = (responseData) => {
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData?.content)) return responseData.content;
  if (Array.isArray(responseData?.data)) return responseData.data;
  return [];
};

const CatalogItemService = {
  getCatalogItemsWithPagination: async ({ pageSize = 500, pageNumber = 0 } = {}) => {
    try {
      const response = await apiClient.get('ep/v1/catalogItem', {
        params: { pageSize, pageNumber },
      });
      return extractArray(response.data);
    } catch (error) {
      console.error('Error fetching catalog items:', error);
      throw error;
    }
  },

  getSupplietCatalogItems: async (supplierId, { pageSize = 500, pageNumber = 0 } = {}) => {
    try {
      const response = await apiClient.get('ep/v1/catalogItem', {
        params: { SupplierId: supplierId, pageSize, pageNumber },
      });
      return extractArray(response.data);
    } catch (error) {
      console.error('Error fetching catalog items:', error);
      throw error;
    }
  },

  getSupplierCatalogItemsPaginated: async (
    supplierId,
    { pageSize = 10, pageNumber = 0, sortBy = 'catalogItemId', order = 'DESC' } = {},
  ) => {
    try {
      const response = await apiClient.get('ep/v1/catalogItem', {
        params: {
          SupplierId: supplierId,
          pageSize,
          pageNumber,
          sortBy,
          order: order.toUpperCase(),
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching supplier catalog items:', error);
      throw error;
    }
  },

  getCatalogItemsByCatalogId: async (catalogId, { pageSize = 500, pageNumber = 0 } = {}) => {
    try {
      const response = await apiClient.get('ep/v1/catalogItem', {
        params: { CatalogId: catalogId, pageSize, pageNumber },
      });
      return extractArray(response.data);
    } catch (error) {
      console.error('Error fetching catalog items:', error);
      throw error;
    }
  },

  getCatalogItemsBySearch: async (pageSize = 500, pageNumber = 0, searchTerm) => {
    try {
      const params = { pageSize, pageNumber };

      // Use searchTerm parameter for multi-field search on backend
      // Searches across: PartId, Description, Supplier Name, Manufacturer
      if (searchTerm && searchTerm.trim() !== '') {
        params.searchTerm = searchTerm.trim();
      }

      const response = await apiClient.get('ep/v1/catalogItem', {
        params,
      });
      return extractArray(response.data);
    } catch (error) {
      console.error('Error fetching catalog items:', error);
      throw error;
    }
  },

  getCatalogItemsBySupplierSearch: async (pageSize = 500, pageNumber = 0, searchTerm) => {
    try {
      const response = await apiClient.get(
        `ep/v1/catalogItem?Name=${searchTerm}&pageSize=${pageSize}&pageNumber=${pageNumber}`,
      );
      return extractArray(response.data);
    } catch (error) {
      console.error('Error fetching catalog items:', error);
      throw error;
    }
  },

  getCatalogItemBySupplierId: async (supplierId, { pageSize = 500, pageNumber = 0 } = {}) => {
    try {
      const response = await apiClient.get('ep/v1/catalogItem', {
        params: { SupplierId: supplierId, pageSize, pageNumber },
      });
      return extractArray(response.data);
    } catch (error) {
      console.error('Error fetching catalog item by ID:', error);
      throw error;
    }
  },

  // Search catalog items by supplier ID and search term (searches PartId, Description)
  searchCatalogItemsBySupplier: async (
    supplierId,
    searchTerm = '',
    { pageSize = 50, pageNumber = 0 } = {},
  ) => {
    try {
      const params = { SupplierId: supplierId, pageSize, pageNumber };
      if (searchTerm && searchTerm.trim() !== '') {
        params.searchTerm = searchTerm.trim();
      }
      const response = await apiClient.get('ep/v1/catalogItem', {
        params,
      });
      return extractArray(response.data);
    } catch (error) {
      console.error('Error searching catalog items by supplier:', error);
      throw error;
    }
  },

  getCatalogItemById: async (CatalogItemId, { pageSize = 500, pageNumber = 0 } = {}) => {
    try {
      const response = await apiClient.get('ep/v1/catalogItem', {
        params: { CatalogItemId, pageSize, pageNumber },
      });
      return extractArray(response.data);
    } catch (error) {
      console.error('Error fetching catalog item by ID:', error);
      throw error;
    }
  },

  createCatalogItem: async (catalogItem) => {
    try {
      const response = await apiClient.post('ep/v1/catalogItem', catalogItem);
      return response.data;
    } catch (error) {
      console.error('Error creating catalog item:', error);
      throw error;
    }
  },

  updateCatalogItem: async (catalogItemId, updatedCatalogItem) => {
    try {
      const response = await apiClient.put(
        `ep/v1/catalogItem/${catalogItemId}`,
        updatedCatalogItem,
      );
      return response.data;
    } catch (error) {
      console.error('Error updating catalog item:', error);
      throw error;
    }
  },

  deleteCatalogItem: async (catalogItemId) => {
    try {
      const response = await apiClient.delete(`ep/v1/catalogItem/${catalogItemId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting catalog item:', error);
      throw error;
    }
  },
};

export default CatalogItemService;
