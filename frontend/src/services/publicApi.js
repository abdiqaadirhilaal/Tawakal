import api from './api';

export const getPublicSettings = () => api.get('/settings/public').then((r) => r.data);
export const getCategories = () => api.get('/categories').then((r) => r.data);
export const getProducts = (params) => api.get('/products', { params }); // { data, pagination }
export const getProduct = (idOrSlug) => api.get(`/products/${idOrSlug}`).then((r) => r.data);
export const createOrder = (payload) => api.post('/orders', payload).then((r) => r.data);
export const trackOrder = (params) => api.get('/orders/track', { params }).then((r) => r.data);
export const sendContact = (payload) => api.post('/contact', payload);
