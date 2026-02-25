import apiClient from '../api/apiClient';

const ShipmentService = {
  handleCreateShipment(requestBody, supplierId) {
    return apiClient.post(`ep/v1/supplier/${supplierId}/shipment`, requestBody);
  },

  handleUpdateShipment(requestBody, supplierId, shipmentId) {
    return apiClient.put(`ep/v1/supplier/${supplierId}/shipment/${shipmentId}`, requestBody);
  },

  deleteShipment(supplierId, shipmentId) {
    return apiClient.delete(`ep/v1/supplier/${supplierId}/shipment/${shipmentId}`);
  },

  getAllShipmentsByShipmentId(supplierId, shipmentId) {
    return apiClient.get(`ep/v1/supplier/${supplierId}/shipment?shipmentId=${shipmentId}`);
  },

  getAllShipments(supplierId) {
    return apiClient.get(`ep/v1/supplier/${supplierId}/shipment`);
  },

  getShipmentsBySearch(searchTerm, supplierId) {
    return apiClient.get(`ep/v1/supplier/${supplierId}/shipment?shipmentId=${searchTerm}`);
  },
};

export default ShipmentService;
