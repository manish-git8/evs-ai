import apiClient from '../api/apiClient';

const CostCenterService = {
  getCostCenter() {
    return apiClient.get('ep/v1/company/dummy-ids');
  },
};

export default CostCenterService;
