import apiClient from '../api/apiClient';

const MasterDataService = {
  getAllCountries() {
    return apiClient.get('ep/v1/countries');
  },

  getStatesByCountryId(countryId) {
    return apiClient.get(`ep/v1/country/${countryId}/states`);
  },

  getCitiesByStateId(stateId) {
    return apiClient.get(`ep/v1/state/${stateId}/cities`);
  },

  getAllCurrencies() {
    return apiClient.get('ep/v1/currencies');
  },
};

export default MasterDataService;
