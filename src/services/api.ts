import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dashboard APIs
export const dashboardApi = {
  getKPIs: () => api.get('/dashboard/kpis'),
  getUtilizationChart: () => api.get('/dashboard/utilization-chart'),
  getMaintenanceChart: () => api.get('/dashboard/maintenance-chart'),
};

// Equipment APIs
export const equipmentApi = {
  getAll: () => api.get('/equipment'),
  getById: (id: string) => api.get(`/equipment/${id}`),
  getUsage: (id: string) => api.get(`/equipment/${id}/usage`),
  getMaintenance: (id: string) => api.get(`/equipment/${id}/maintenance`),
  create: (data: any) => api.post('/equipment', data),
  update: (id: string, data: any) => api.put(`/equipment/${id}`, data),
  delete: (id: string) => api.delete(`/equipment/${id}`),
};

// Rentals APIs
export const rentalsApi = {
  getAll: (params?: any) => api.get('/rentals', { params }),
  getById: (id: string) => api.get(`/rentals/${id}`),
  create: (data: any) => api.post('/rentals', data),
  update: (id: string, data: any) => api.put(`/rentals/${id}`, data),
  returnRental: (id: string, data: any) => api.put(`/rentals/${id}/return`, data),
  getAnalytics: () => api.get('/rentals/analytics/summary'),
};

// Customers APIs
export const customersApi = {
  getAll: (params?: any) => api.get('/customers', { params }),
  getById: (id: string) => api.get(`/customers/${id}`),
  getRentals: (id: string) => api.get(`/customers/${id}/rentals`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
  getAnalytics: () => api.get('/customers/analytics/summary'),
};

// Sites APIs
export const sitesApi = {
  getAll: () => api.get('/sites'),
  getById: (id: string) => api.get(`/sites/${id}`),
  getEquipment: (id: string) => api.get(`/sites/${id}/equipment`),
  getRentals: (id: string) => api.get(`/sites/${id}/rentals`),
  getEquipmentLocations: () => api.get('/sites/map/equipment-locations'),
  create: (data: any) => api.post('/sites', data),
  update: (id: string, data: any) => api.put(`/sites/${id}`, data),
  delete: (id: string) => api.delete(`/sites/${id}`),
};

// Maintenance APIs
export const maintenanceApi = {
  getAll: (params?: any) => api.get('/maintenance', { params }),
  getById: (id: string) => api.get(`/maintenance/${id}`),
  getUpcoming: (days?: number) => api.get('/maintenance/upcoming/due', { params: { days_ahead: days } }),
  getOverdue: () => api.get('/maintenance/overdue/list'),
  create: (data: any) => api.post('/maintenance', data),
  update: (id: string, data: any) => api.put(`/maintenance/${id}`, data),
  getAnalytics: () => api.get('/maintenance/analytics/summary'),
};

// Alerts APIs
export const alertsApi = {
  getAll: (params?: any) => api.get('/alerts', { params }),
  getById: (id: string) => api.get(`/alerts/${id}`),
  acknowledge: (id: string) => api.put(`/alerts/${id}/acknowledge`),
  resolve: (id: string, data?: any) => api.put(`/alerts/${id}/resolve`, data),
  dismiss: (id: string) => api.put(`/alerts/${id}/dismiss`),
  create: (data: any) => api.post('/alerts', data),
  getAnalytics: () => api.get('/alerts/analytics/stats'),
};

// Anomalies APIs
export const anomaliesApi = {
  getAll: (params?: any) => api.get('/anomalies', { params }),
  getById: (id: string) => api.get(`/anomalies/${id}`),
  updateStatus: (id: string, data: any) => api.put(`/anomalies/${id}/status`, data),
  create: (data: any) => api.post('/anomalies', data),
  getAnalytics: () => api.get('/anomalies/analytics/summary'),
  getPatterns: () => api.get('/anomalies/patterns/analysis'),
};

// Predictions APIs
export const predictionsApi = {
  getDemand: (params?: any) => api.get('/predictions/demand', { params }),
  getMaintenance: () => api.get('/predictions/maintenance'),
  getUtilization: () => api.get('/predictions/utilization'),
  getReturnDates: () => api.get('/predictions/return-dates'),
  getInsights: () => api.get('/predictions/insights'),
};

// Usage APIs
export const usageApi = {
  getByEquipment: (equipmentId: string, params?: any) => api.get(`/usage/${equipmentId}`, { params }),
  getLatestAll: () => api.get('/usage/latest/all'),
  create: (data: any) => api.post('/usage', data),
};

export default api;