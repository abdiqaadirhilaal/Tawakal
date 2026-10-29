const router = require('express').Router();
const validate = require('../middleware/validate');
const { requireAuth, requireRole, requireCsrfHeader } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { idParams } = require('../validators/common');
const { BACK_OFFICE_ROLES, SUPERVISOR_ROLES } = require('../config/constants');
const v = {
  auth: require('../validators/auth'),
  product: require('../validators/product'),
  category: require('../validators/category'),
  order: require('../validators/order'),
  inventory: require('../validators/inventory'),
  misc: require('../validators/misc'),
  pos: require('../validators/pos'),
};
const products = require('../controllers/productController');
const categories = require('../controllers/categoryController');
const orders = require('../controllers/orderController');
const inventory = require('../controllers/inventoryController');
const users = require('../controllers/userController');
const misc = require('../controllers/miscController');
const pos = require('../controllers/posController');

// Waddo kasta oo maamul waxay u baahan tahay: header-ka CSRF, soo gelid, iyo door la oggol yahay.
// Kaashiyeyaashu (cashier) ma galaan waddooyinkan; waxay isticmaalaan /api/pos oo kaliya.
router.use(requireCsrfHeader, requireAuth, requireRole(...BACK_OFFICE_ROLES));
const adminOnly = requireRole('admin');
const byId = validate({ params: idParams });

// Alaabta
router.get('/products', validate({ query: v.product.adminList }), products.listAdmin);
router.get('/products/:id', byId, products.getAdmin);
router.post('/products', validate({ body: v.product.create }), products.create);
router.patch('/products/:id', validate({ params: idParams, body: v.product.update }), products.update);
router.delete('/products/:id', byId, products.remove);

// Qaybaha
router.get('/categories', categories.listAdmin);
router.post('/categories', validate({ body: v.category.create }), categories.create);
router.patch('/categories/:id', validate({ params: idParams, body: v.category.update }), categories.update);
router.delete('/categories/:id', byId, categories.remove);

// Dalabyada
router.get('/orders', validate({ query: v.order.adminList }), orders.listAdmin);
router.get('/orders/:id', byId, orders.getAdmin);
router.patch('/orders/:id/status', validate({ params: idParams, body: v.order.status }), orders.updateStatus);
router.patch('/orders/:id/payment-status', adminOnly, validate({ params: idParams, body: v.order.paymentStatus }), orders.updatePaymentStatus);
router.post('/orders/:id/notes', validate({ params: idParams, body: v.order.note }), orders.addNote);

// Kaydka
router.get('/inventory', validate({ query: v.inventory.list }), inventory.list);
router.get('/inventory/movements', validate({ query: v.inventory.movements }), inventory.movements);
router.post('/inventory/adjustments', validate({ body: v.inventory.adjustment }), inventory.adjust);
router.post('/inventory/receipts', adminOnly, validate({ body: v.inventory.receipt }), inventory.receive);

// Dashboard iyo warbixinno
router.get('/dashboard/stats', misc.dashboardStats);
router.get('/dashboard/sales', validate({ query: v.misc.salesChart }), misc.dashboardSales);
router.get('/reports/sales', validate({ query: v.misc.salesReport }), misc.salesReport);
router.get('/reports/inventory', misc.inventoryReport);

// Warbixinnada POS iyo diiwaanka hawlaha
const supervisor = requireRole(...SUPERVISOR_ROLES);
router.get('/reports/pos-sales', supervisor, validate({ query: v.pos.reportRange }), pos.posSalesReport);
router.get('/reports/cashier-performance', supervisor, validate({ query: v.pos.reportRange }), pos.cashierPerformance);
router.get('/reports/payment-methods', supervisor, validate({ query: v.pos.reportRange }), pos.paymentMethodsReport);
router.get('/reports/shifts', supervisor, validate({ query: v.pos.shiftHistory }), pos.shiftsReport);
router.get('/audit-logs', adminOnly, validate({ query: v.pos.auditList }), pos.auditLogs);

// Macaamiisha
router.get('/customers', validate({ query: v.misc.customerList }), misc.listCustomers);
router.get('/customers/:phoneKey/orders', validate({ params: v.misc.customerParams }), misc.customerOrders);

// Farriimaha
router.get('/messages', validate({ query: v.misc.messageList }), misc.listMessages);
router.patch('/messages/:id/status', validate({ params: idParams, body: v.misc.messageStatus }), misc.updateMessageStatus);

// Dejinta (maamule kaliya ayaa beddeli kara)
router.get('/settings', misc.getSettings);
router.patch('/settings', adminOnly, validate({ body: v.misc.settings }), misc.updateSettings);

// Isticmaalayaasha maamulka (maamule kaliya)
router.get('/users', adminOnly, users.list);
router.post('/users', adminOnly, validate({ body: v.auth.createUser }), users.create);
router.patch('/users/:id', adminOnly, validate({ params: idParams, body: v.auth.updateUser }), users.update);

// Sawirrada
router.post('/uploads', upload.single('image'), misc.uploadImage);

module.exports = router;
