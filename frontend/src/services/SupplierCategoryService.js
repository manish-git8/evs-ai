import axios from 'axios';
import AuthHeader from './AuthHeader';

const API_URL = process.env.REACT_APP_API_URL;

const SupplierCategoryService = {
  getAllSupplierCategories(companyId = null, params = {}) {
    const queryParams = {
      name: '',
      search: '',
      pageSize: 100,
      pageNumber: 0,
      ...params,
    };

    // Only include companyId if provided
    if (companyId) {
      queryParams.companyId = companyId;
    }

    return axios.get(`${API_URL}api/v1/supplierCategory/getAll`, {
      headers: AuthHeader(),
      params: queryParams,
    });
  },
};

export default SupplierCategoryService;
