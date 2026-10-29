import api from './api';

const data = (r) => r.data;
const clean = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null));

// Xaqiijinta
export const login = (payload) => api.post('/auth/login', payload).then(data);
export const logout = () => api.post('/auth/logout');
export const me = () => api.get('/auth/me').then(data);
export const changePassword = (payload) => api.patch('/auth/change-password', payload);

// Alaabta
export const listProducts = (params) => api.get('/admin/products', { params: clean(params) });
export const createProduct = (payload) => api.post('/admin/products', payload).then(data);
export const updateProduct = (id, payload) => api.patch(`/admin/products/${id}`, payload).then(data);
export const archiveProduct = (id) => api.delete(`/admin/products/${id}`);
export const uploadImage = (file) => {
  const form = new FormData();
  form.append('image', file);
  return api.post('/admin/uploads', form).then(data);
};

// Qaybaha
export const listCategories = () => api.get('/admin/categories').then(data);
export const createCategory = (payload) => api.post('/admin/categories', payload).then(data);
export const updateCategory = (id, payload) => api.patch(`/admin/categories/${id}`, payload).then(data);
export const deleteCategory = (id) => api.delete(`/admin/categories/${id}`);

// Dalabyada
export const listOrders = (params) => api.get('/admin/orders', { params: clean(params) });
export const getOrder = (id) => api.get(`/admin/orders/${id}`).then(data);
export const updateOrderStatus = (id, status) => api.patch(`/admin/orders/${id}/status`, { status }).then(data);
export const updatePaymentStatus = (id, paymentStatus) => api.patch(`/admin/orders/${id}/payment-status`, { paymentStatus }).then(data);
export const addOrderNote = (id, text) => api.post(`/admin/orders/${id}/notes`, { text }).then(data);

// Kaydka
export const listInventory = (params) => api.get('/admin/inventory', { params: clean(params) });
export const listMovements = (params) => api.get('/admin/inventory/movements', { params: clean(params) });
export const adjustStock = (payload) => api.post('/admin/inventory/adjustments', payload).then(data);
export const receiveStock = (payload) => api.post('/admin/inventory/receipts', payload).then(data);

// Dashboard iyo warbixinno
export const dashboardStats = () => api.get('/admin/dashboard/stats').then(data);
export const dashboardSales = (period) => api.get('/admin/dashboard/sales', { params: { period } }).then(data);
export const salesReport = (params) => api.get('/admin/reports/sales', { params: clean(params) }).then(data);
export const inventoryReport = () => api.get('/admin/reports/inventory').then(data);

// Macaamiisha
export const listCustomers = (params) => api.get('/admin/customers', { params: clean(params) });
export const customerOrders = (phoneKey) => api.get(`/admin/customers/${phoneKey}/orders`).then(data);

// Farriimaha
export const listMessages = (params) => api.get('/admin/messages', { params: clean(params) });
export const updateMessageStatus = (id, status) => api.patch(`/admin/messages/${id}/status`, { status }).then(data);

// Dejinta
export const getSettings = () => api.get('/admin/settings').then(data);
export const updateSettings = (payload) => api.patch('/admin/settings', payload).then(data);

// Isticmaalayaasha
export const listUsers = () => api.get('/admin/users').then(data);
export const createUser = (payload) => api.post('/admin/users', payload).then(data);
export const updateUser = (id, payload) => api.patch(`/admin/users/${id}`, payload).then(data);
