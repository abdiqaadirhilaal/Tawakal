const router = require('express').Router();
const validate = require('../middleware/validate');
const { requireAuth, requireRole, requireCsrfHeader } = require('../middleware/auth');
const { idParams } = require('../validators/common');
const { POS_ROLES, SUPERVISOR_ROLES } = require('../config/constants');
const v = require('../validators/pos');
const pos = require('../controllers/posController');

// POS: waa in la soo galo, doorkuna yahay admin, manager ama cashier. Awood kasta oo
// dheeraad ah (qofka iibka leh, oggolaanshaha) waxaa lagu hubiyaa controller/service-ka.
router.use(requireCsrfHeader, requireAuth, requireRole(...POS_ROLES));
const supervisor = requireRole(...SUPERVISOR_ROLES);
const byId = validate({ params: idParams });

router.get('/config', pos.config);
router.get('/products', validate({ query: v.productList }), pos.listProducts);
router.get('/products/search', validate({ query: v.productSearch }), pos.searchProducts);

router.post('/sales', validate({ body: v.createSale }), pos.createSale);
router.get('/sales', validate({ query: v.saleList }), pos.listSales);
router.get('/sales/:id', byId, pos.getSale);
router.get('/sales/:id/receipt', validate({ params: idParams, query: v.receiptQuery }), pos.getReceipt);
router.post('/sales/:id/refunds', validate({ params: idParams, body: v.createRefund }), pos.createRefund);

router.get('/refunds', validate({ query: v.refundList }), pos.listRefunds);
router.get('/refunds/:id', byId, pos.getRefund);

router.post('/shifts/open', validate({ body: v.openShift }), pos.openShift);
router.get('/shifts/current', pos.currentShift);
router.post('/shifts/close', validate({ body: v.closeShift }), pos.closeShift);
router.get('/shifts/history', validate({ query: v.shiftHistory }), pos.shiftHistory);
router.get('/shifts/:id', byId, pos.getShift);
router.post('/shifts/:id/adjustments', supervisor, validate({ params: idParams, body: v.shiftAdjustment }), pos.addShiftAdjustment);

router.get('/cashiers', supervisor, pos.listCashiers);

module.exports = router;
