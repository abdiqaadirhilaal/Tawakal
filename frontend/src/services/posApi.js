import api from './api';

const data = (r) => r.data;
const clean = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null && v !== 'all'));

export const getConfig = () => api.get('/pos/config').then(data);
export const listProducts = (params) => api.get('/pos/products', { params: clean(params) });
export const searchProducts = (q) => api.get('/pos/products/search', { params: { q } }).then(data);

export const createSale = (payload) => api.post('/pos/sales', payload).then(data);
export const listSales = (params) => api.get('/pos/sales', { params: clean(params) });
export const getSale = (id) => api.get(`/pos/sales/${id}`).then(data);
export const getReceipt = (id, reprint = false) => api.get(`/pos/sales/${id}/receipt`, { params: reprint ? { reprint: 'true' } : {} }).then(data);
export const createRefund = (saleId, payload) => api.post(`/pos/sales/${saleId}/refunds`, payload).then(data);
export const listRefunds = (params) => api.get('/pos/refunds', { params: clean(params) });

export const openShift = (openingCash) => api.post('/pos/shifts/open', { openingCash }).then(data);
export const currentShift = () => api.get('/pos/shifts/current').then(data);
export const closeShift = (payload) => api.post('/pos/shifts/close', payload).then(data);
export const shiftHistory = (params) => api.get('/pos/shifts/history', { params: clean(params) });
export const addShiftAdjustment = (id, payload) => api.post(`/pos/shifts/${id}/adjustments`, payload).then(data);
export const listCashiers = () => api.get('/pos/cashiers').then(data);

// Warbixinno (maamule / manager)
export const posSalesReport = (params) => api.get('/admin/reports/pos-sales', { params: clean(params) }).then(data);
export const cashierPerformance = (params) => api.get('/admin/reports/cashier-performance', { params: clean(params) }).then(data);
export const paymentMethodsReport = (params) => api.get('/admin/reports/payment-methods', { params: clean(params) }).then(data);
export const shiftsReport = (params) => api.get('/admin/reports/shifts', { params: clean(params) });
export const auditLogs = (params) => api.get('/admin/audit-logs', { params: clean(params) });
