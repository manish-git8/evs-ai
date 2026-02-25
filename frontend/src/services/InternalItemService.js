import apiClient from '../api/apiClient';

/**
 * Service for managing internal items in a company's catalog.
 * Internal items have auto-generated Part IDs and are company-specific.
 */
const InternalItemService = {
  /**
   * Get all internal items for a company with pagination.
   * @param {number} companyId - The company ID
   * @param {Object} options - Pagination and filter options
   * @returns {Promise<Object>} Paginated response with internal items
   */
  getAllInternalItems: async (companyId, { pageSize = 20, pageNumber = 0, status, categoryId } = {}) => {
    try {
      const params = { pageSize, pageNumber };
      if (status) params.status = status;
      if (categoryId) params.categoryId = categoryId;

      const response = await apiClient.get(`ep/v1/company/${companyId}/internal-items`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching internal items:', error);
      throw error;
    }
  },

  /**
   * Get all active internal items for a company (for dropdowns/selection).
   * @param {number} companyId - The company ID
   * @returns {Promise<Array>} List of active internal items
   */
  getAllActiveItems: async (companyId) => {
    try {
      const response = await apiClient.get(`ep/v1/company/${companyId}/internal-items`, {
        params: { status: 'ACTIVE', pageSize: 1000 },
      });
      return response.data?.content || [];
    } catch (error) {
      console.error('Error fetching active internal items:', error);
      throw error;
    }
  },

  /**
   * Search internal items by part ID or description.
   * @param {number} companyId - The company ID
   * @param {string} searchTerm - The search term
   * @param {number} limit - Maximum number of results (default 50)
   * @returns {Promise<Array>} List of matching internal items
   */
  searchInternalItems: async (companyId, searchTerm, limit = 50) => {
    try {
      const response = await apiClient.get(`ep/v1/company/${companyId}/internal-items/search`, {
        params: { q: searchTerm, limit },
      });
      return response.data || [];
    } catch (error) {
      console.error('Error searching internal items:', error);
      throw error;
    }
  },

  /**
   * Get an internal item by ID.
   * @param {number} companyId - The company ID
   * @param {number} internalItemId - The internal item ID
   * @returns {Promise<Object>} The internal item
   */
  getInternalItemById: async (companyId, internalItemId) => {
    try {
      const response = await apiClient.get(
        `ep/v1/company/${companyId}/internal-items/${internalItemId}`,
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching internal item:', error);
      throw error;
    }
  },

  /**
   * Create a new internal item. Part ID is auto-generated.
   * @param {number} companyId - The company ID
   * @param {Object} itemData - The internal item data (description, categoryId, defaultUom, etc.)
   * @returns {Promise<Object>} The created internal item with generated Part ID
   */
  createInternalItem: async (companyId, itemData) => {
    try {
      const response = await apiClient.post(`ep/v1/company/${companyId}/internal-items`, itemData);
      return response.data;
    } catch (error) {
      console.error('Error creating internal item:', error);
      throw error;
    }
  },

  /**
   * Update an existing internal item. Part ID cannot be changed.
   * @param {number} companyId - The company ID
   * @param {number} internalItemId - The internal item ID
   * @param {Object} itemData - The updated item data
   * @returns {Promise<Object>} The updated internal item
   */
  updateInternalItem: async (companyId, internalItemId, itemData) => {
    try {
      const response = await apiClient.put(
        `ep/v1/company/${companyId}/internal-items/${internalItemId}`,
        itemData,
      );
      return response.data;
    } catch (error) {
      console.error('Error updating internal item:', error);
      throw error;
    }
  },

  /**
   * Delete (deactivate) an internal item.
   * @param {number} companyId - The company ID
   * @param {number} internalItemId - The internal item ID
   * @returns {Promise<void>}
   */
  deleteInternalItem: async (companyId, internalItemId) => {
    try {
      await apiClient.delete(`ep/v1/company/${companyId}/internal-items/${internalItemId}`);
    } catch (error) {
      console.error('Error deleting internal item:', error);
      throw error;
    }
  },
};

export default InternalItemService;
