import apiClient from '../api/apiClient';

const CompanyCategoryService = {
  getCompanyCategory() {
    return apiClient.get('ep/v1/company-category');
  },

  getCompanySubCategory(categoryId) {
    return apiClient.get(`ep/v1/${categoryId}/company-sub-category`);
  },
};

export default CompanyCategoryService;
