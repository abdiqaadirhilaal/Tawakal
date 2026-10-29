const router = require('express').Router();
const validate = require('../middleware/validate');
const limiters = require('../middleware/rateLimiters');
const { requireAuth, requireCsrfHeader } = require('../middleware/auth');
const v = {
  auth: require('../validators/auth'),
  product: require('../validators/product'),
  order: require('../validators/order'),
  misc: require('../validators/misc'),
};
const auth = require('../controllers/authController');
const products = require('../controllers/productController');
const categories = require('../controllers/categoryController');
const orders = require('../controllers/orderController');
const misc = require('../controllers/miscController');

// Xaqiijinta (authentication)
router.post('/auth/login', limiters.loginLimiter, requireCsrfHeader, validate({ body: v.auth.login }), auth.login);
router.post('/auth/logout', requireCsrfHeader, auth.logout);
router.get('/auth/me', requireAuth, auth.me);
router.patch('/auth/change-password', requireCsrfHeader, requireAuth, validate({ body: v.auth.changePassword }), auth.changePassword);

// Alaabta iyo qaybaha
router.get('/products', validate({ query: v.product.publicList }), products.listPublic);
router.get('/products/:id', validate({ params: v.product.idOrSlug }), products.getPublic);
router.get('/categories', categories.listPublic);

// Dalabyada
router.post('/orders', limiters.orderLimiter, validate({ body: v.order.create }), orders.create);
router.get('/orders/track', limiters.trackLimiter, validate({ query: v.order.track }), orders.track);

// Xiriir iyo dejin
router.post('/contact', limiters.contactLimiter, validate({ body: v.misc.contact }), misc.createContact);
router.get('/settings/public', misc.publicSettings);

module.exports = router;
