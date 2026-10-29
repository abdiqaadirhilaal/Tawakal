const { app, request, startDb, stopDb, clearDb, loginAs, createProduct, orderPayload, uuid, PASSWORD } = require('./helpers');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Refund = require('../models/Refund');
const CashierShift = require('../models/CashierShift');
const InventoryMovement = require('../models/InventoryMovement');
const AuditLog = require('../models/AuditLog');

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const stockOf = async (p) => (await Product.findById(p._id)).stock;

const salePayload = (items, extra = {}) => ({
  idempotencyKey: uuid(),
  items,
  payment: { method: 'cash', amountReceived: 1000 },
  ...extra,
});

// Kaashiye soo galay oo shift furan leh
async function cashierWithShift(email, openingCash = 100) {
  const ctx = await loginAs('cashier', email);
  const res = await ctx.agent.post('/api/pos/shifts/open').send({ openingCash });
  if (res.status !== 201) throw new Error(`shift open failed ${res.status}`);
  return { ...ctx, shiftId: res.body.data.id };
}

describe('Helitaanka POS', () => {
  test('waa in la soo galo; staff-ku ma galo POS; kaashiyuhu ma galo maamulka', async () => {
    expect((await request(app).get('/api/pos/products')).status).toBe(401);
    const { agent: staff } = await loginAs('staff');
    expect((await staff.get('/api/pos/products')).status).toBe(403);
    expect((await staff.post('/api/pos/sales').send({})).status).toBe(403);

    const { agent: cashier } = await loginAs('cashier');
    expect((await cashier.get('/api/pos/products')).status).toBe(200);
    expect((await cashier.get('/api/admin/products')).status).toBe(403);
    expect((await cashier.get('/api/admin/dashboard/stats')).status).toBe(403);
    expect((await cashier.get('/api/admin/reports/pos-sales')).status).toBe(403);
    expect((await cashier.get('/api/pos/cashiers')).status).toBe(403);
  });

  test('alaabta POS: firfircoon oo kaliya, cost-ku kuma jiro; raadin magac, SKU iyo barcode', async () => {
    const { agent } = await loginAs('cashier');
    await createProduct({ name: 'Sibidh 50kg', sku: 'CEM-001', barcode: '6001234567890', costPrice: 6 });
    await createProduct({ name: 'Baliig 12mm', sku: 'STL-012' });
    await createProduct({ name: 'Qarsoon', isActive: false });
    await createProduct({ name: 'La kaydiyey', isArchived: true });

    const list = await agent.get('/api/pos/products');
    expect(list.body.data).toHaveLength(2);
    expect(JSON.stringify(list.body)).not.toMatch(/costPrice|lowStockThreshold/);

    expect((await agent.get('/api/pos/products?search=bali')).body.data).toHaveLength(1);
    const byBarcode = await agent.get('/api/pos/products/search?q=6001234567890');
    expect(byBarcode.body.data).toMatchObject({ exact: true });
    expect(byBarcode.body.data.items[0].sku).toBe('CEM-001');
    const bySku = await agent.get('/api/pos/products/search?q=stl-012');
    expect(bySku.body.data.exact).toBe(true);
    const byName = await agent.get('/api/pos/products/search?q=sib');
    expect(byName.body.data).toMatchObject({ exact: false });
    expect(byName.body.data.items).toHaveLength(1);
    expect((await agent.get('/api/pos/products/search')).status).toBe(400);
  });
});

describe('Iibka POS', () => {
  test('shift furan ayaa loo baahan yahay', async () => {
    const { agent } = await loginAs('cashier');
    const p = await createProduct();
    const res = await agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 1 }]));
    expect(res.status).toBe(409);
    expect(res.body.errors[0].code).toBe('no_open_shift');
    expect(await stockOf(p)).toBe(100);
  });

  test('iib caddaan ah: wadarta server-ka, baaqiga, kaydka, dhaqdhaqaaqa, lambarrada', async () => {
    const { agent, user, shiftId } = await cashierWithShift();
    const a = await createProduct({ price: 7.5, stock: 50 });
    const b = await createProduct({ price: 0.25, stock: 1000 });
    const res = await agent.post('/api/pos/sales').send(
      salePayload([{ productId: a.id, quantity: 20 }, { productId: b.id, quantity: 300 }], {
        customerName: 'Xasan',
        customerPhone: '0615000000',
        payment: { method: 'cash', amountReceived: 250 },
      })
    );
    expect(res.status).toBe(201);
    const s = res.body.data;
    expect(s.saleNumber).toMatch(/^S-\d{6}-\d{4}$/);
    expect(s.receiptNumber).toMatch(/^R-\d{6}$/);
    expect(s).toMatchObject({ subtotal: 225, totalDiscount: 0, grandTotal: 225, amountReceived: 250, changeGiven: 25, status: 'completed', paymentStatus: 'paid', cashierName: user.name, shiftId });
    expect(s.items[0]).toMatchObject({ quantity: 20, unitPrice: 7.5, lineTotal: 150, unit: 'piece' });
    expect(JSON.stringify(res.body)).not.toMatch(/costPrice/);
    expect(await stockOf(a)).toBe(30);
    expect(await stockOf(b)).toBe(700);

    const moves = await InventoryMovement.find({ type: 'pos_sale' }).sort({ quantityChange: -1 });
    expect(moves).toHaveLength(2);
    expect(moves[0].toObject()).toMatchObject({ quantityChange: -20, stockBefore: 50, stockAfter: 30, refLabel: s.receiptNumber });
    expect(moves[0].user.toString()).toBe(user.id);
    expect(await AuditLog.countDocuments({ action: 'sale.completed' })).toBe(1);
  });

  test('qiimo ama wadar ka timid browser-ka waa la diidaa', async () => {
    const { agent } = await cashierWithShift();
    const p = await createProduct({ price: 10 });
    expect((await agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 1, unitPrice: 0.01 }]))).status).toBe(400);
    expect((await agent.post('/api/pos/sales').send({ ...salePayload([{ productId: p.id, quantity: 1 }]), grandTotal: 0.01 })).status).toBe(400);
    expect(await Sale.countDocuments()).toBe(0);
  });

  test('lacag caddaan ah oo aan ku filnayn waa la diidaa, kaydkana lama taabto', async () => {
    const { agent } = await cashierWithShift();
    const p = await createProduct({ price: 10, stock: 5 });
    const short = await agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 2 }], { payment: { method: 'cash', amountReceived: 19.99 } }));
    expect(short.status).toBe(400);
    expect(short.body.errors[0].code).toBe('insufficient_payment');
    const missing = await agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 2 }], { payment: { method: 'cash' } }));
    expect(missing.status).toBe(400);
    expect(await stockOf(p)).toBe(5);
    expect(await Sale.countDocuments()).toBe(0);
  });

  test('mobile money: tixraaca waa la kaydiyaa, lama sheego in la xaqiijiyey', async () => {
    const { agent } = await cashierWithShift();
    const p = await createProduct({ price: 10 });
    const res = await agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 3 }], { payment: { method: 'mobile_money', reference: 'TX-99881' } }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ grandTotal: 30, amountReceived: 30, changeGiven: 0, paymentReference: 'TX-99881', paymentVerification: 'recorded_unverified' });
    expect(res.body.data.paymentMethod.type).toBe('mobile_money');
    const bad = await agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 1 }], { payment: { method: 'crypto' } }));
    expect(bad.status).toBe(400);
  });

  test('tirada: tiro dhan alaabta caadiga ah, jajab kaliya alaabta loo oggolaaday', async () => {
    const { agent } = await cashierWithShift();
    const bag = await createProduct({ unit: 'bag' });
    const cable = await createProduct({ unit: 'meter', allowDecimal: true, price: 2, stock: 10 });
    expect((await agent.post('/api/pos/sales').send(salePayload([{ productId: bag.id, quantity: 1.5 }]))).status).toBe(400);
    for (const quantity of [0, -1, '2', null]) {
      expect((await agent.post('/api/pos/sales').send(salePayload([{ productId: bag.id, quantity }]))).status).toBe(400);
    }
    const ok = await agent.post('/api/pos/sales').send(salePayload([{ productId: cable.id, quantity: 2.5 }]));
    expect(ok.status).toBe(201);
    expect(ok.body.data.grandTotal).toBe(5);
    expect(await stockOf(cable)).toBe(7.5);
  });

  test('kayd aan ku filnayn: iibka oo dhan waa la diidaa', async () => {
    const { agent } = await cashierWithShift();
    const a = await createProduct({ stock: 50 });
    const b = await createProduct({ stock: 3 });
    const res = await agent.post('/api/pos/sales').send(salePayload([{ productId: a.id, quantity: 10 }, { productId: b.id, quantity: 4 }]));
    expect(res.status).toBe(409);
    expect(res.body.errors[0]).toMatchObject({ code: 'insufficient_stock', available: 3 });
    expect(await stockOf(a)).toBe(50);
    expect(await Sale.countDocuments()).toBe(0);
    expect(await InventoryMovement.countDocuments()).toBe(0);
    expect(await AuditLog.countDocuments({ action: 'sale.failed' })).toBe(1);
  });

  test('laba kaashiye oo isku mar iibinaya alaabta ugu dambeysa: kama badnaan karto kaydka', async () => {
    const c1 = await cashierWithShift('c1@tawakal.test');
    const c2 = await cashierWithShift('c2@tawakal.test');
    const p = await createProduct({ stock: 5 });
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) => (i % 2 ? c1 : c2).agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 1 }])))
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(5);
    expect(results.filter((r) => r.status === 409)).toHaveLength(7);
    expect(await stockOf(p)).toBe(0);
    expect(await Sale.countDocuments()).toBe(5);
    const receipts = results.filter((r) => r.status === 201).map((r) => r.body.data.receiptNumber);
    expect(new Set(receipts).size).toBe(5);
  });

  test('isla codsiga oo la soo celiyo: hal iib, hal dhimis', async () => {
    const { agent } = await cashierWithShift();
    const p = await createProduct({ stock: 10 });
    const payload = salePayload([{ productId: p.id, quantity: 3 }]);
    const [a, b] = await Promise.all([agent.post('/api/pos/sales').send(payload), agent.post('/api/pos/sales').send(payload)]);
    const c = await agent.post('/api/pos/sales').send(payload);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(c.status).toBe(200);
    expect(c.body.data.receiptNumber).toBe(a.body.data.receiptNumber);
    expect(await Sale.countDocuments()).toBe(1);
    expect(await stockOf(p)).toBe(7);
  });

  test('POS iyo dalabyada online-ka waxay wadaagaan hal kayd', async () => {
    const { agent } = await cashierWithShift();
    const p = await createProduct({ stock: 6 });
    const results = await Promise.all([
      ...Array.from({ length: 5 }, () => agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 1 }]))),
      ...Array.from({ length: 5 }, () => request(app).post('/api/orders').send(orderPayload([{ productId: p.id, quantity: 1 }]))),
    ]);
    expect(results.filter((r) => r.status === 201)).toHaveLength(6);
    expect(await stockOf(p)).toBe(0);
    expect(await InventoryMovement.countDocuments({ type: { $in: ['sale', 'pos_sale'] } })).toBe(6);
  });
});

describe('Qiimo-dhimista', () => {
  // Default: kaashiye ilaa 5%, guud ahaan ilaa 20%
  test('kaashiyuhu wuxuu bixin karaa ilaa xadkiisa', async () => {
    const { agent } = await cashierWithShift();
    const p = await createProduct({ price: 10 });
    const res = await agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 10 }], { discount: { kind: 'percent', value: 5 } }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ subtotal: 100, totalDiscount: 5, grandTotal: 95 });
    expect(res.body.data.items[0]).toMatchObject({ discountShare: 5, netTotal: 95 });
  });

  test('ka badan xadka: oggolaansho maamule ayaa loo baahan yahay, waana la diiwaangeliyaa', async () => {
    const { agent } = await cashierWithShift();
    const { user: manager } = await loginAs('manager');
    const p = await createProduct({ price: 10, stock: 100 });
    const body = (extra) => salePayload([{ productId: p.id, quantity: 10 }], { discount: { kind: 'percent', value: 15 }, ...extra });

    const none = await agent.post('/api/pos/sales').send(body());
    expect(none.status).toBe(403);
    expect(none.body.errors[0].code).toBe('approval_required');

    const wrong = await agent.post('/api/pos/sales').send(body({ approval: { email: manager.email, password: 'khalad-khalad' } }));
    expect(wrong.status).toBe(401);

    // kaashiye kale ma oggolaan karo
    await loginAs('cashier', 'other@tawakal.test');
    const notSupervisor = await agent.post('/api/pos/sales').send(body({ approval: { email: 'other@tawakal.test', password: PASSWORD } }));
    expect(notSupervisor.status).toBe(403);
    expect(await stockOf(p)).toBe(100);

    const ok = await agent.post('/api/pos/sales').send(body({ approval: { email: manager.email, password: PASSWORD } }));
    expect(ok.status).toBe(201);
    expect(ok.body.data).toMatchObject({ totalDiscount: 15, grandTotal: 85 });
    expect(ok.body.data.discount.approvedByName).toBe(manager.name);
    expect(await AuditLog.countDocuments({ action: 'sale.discount_approved' })).toBe(1);
    expect(JSON.stringify(ok.body)).not.toMatch(/Sir-Adag/);
  });

  test('xadka guud lagama gudbi karo, xitaa maamule; wadartu ma noqon karto taban', async () => {
    const { agent } = await loginAs('admin');
    await agent.post('/api/pos/shifts/open').send({ openingCash: 0 });
    const p = await createProduct({ price: 10 });
    const over = await agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 10 }], { discount: { kind: 'percent', value: 25 } }));
    expect(over.status).toBe(400);
    const huge = await agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 10 }], { discount: { kind: 'amount', value: 5000 } }));
    expect(huge.status).toBe(400);
    expect((await agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 1 }], { discount: { kind: 'amount', value: -5 } }))).status).toBe(400);
    const ok = await agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 10 }], { discount: { kind: 'amount', value: 20 } }));
    expect(ok.status).toBe(201);
    expect(ok.body.data.grandTotal).toBe(80);
    expect(await Sale.countDocuments({ grandTotal: { $lt: 0 } })).toBe(0);
  });
});

describe('Taariikhda iibka iyo rasiidka', () => {
  test('kaashiyuhu wuxuu arkaa iibkiisa oo kaliya; manager-ku dhammaan; shaandhayn', async () => {
    const c1 = await cashierWithShift('c1@tawakal.test');
    const c2 = await cashierWithShift('c2@tawakal.test');
    const { agent: manager } = await loginAs('manager');
    const p = await createProduct({ price: 10 });
    const s1 = await c1.agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 1 }]));
    await c1.agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 2 }], { payment: { method: 'mobile_money' } }));
    const s3 = await c2.agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 3 }]));

    const mine = await c1.agent.get('/api/pos/sales');
    expect(mine.body.data.items).toHaveLength(2);
    expect(mine.body.pagination.total).toBe(2);
    // kaashiyuhu ma isticmaali karo shaandhada "cashier" si uu u arko kuwa kale
    expect((await c1.agent.get(`/api/pos/sales?cashier=${c2.user.id}`)).body.data.items).toHaveLength(2);
    expect((await c1.agent.get(`/api/pos/sales/${s3.body.data.id}`)).status).toBe(404);
    expect((await c1.agent.get(`/api/pos/sales/${s3.body.data.id}/receipt`)).status).toBe(404);

    const all = await manager.get('/api/pos/sales');
    expect(all.body.data.items).toHaveLength(3);
    expect(all.body.data.totals.gross).toBe(60);
    const onlyC2 = await manager.get(`/api/pos/sales?cashier=${c2.user.id}`);
    expect(onlyC2.body.data.items).toHaveLength(1);
    expect(onlyC2.body.data.totals.gross).toBe(30);
    expect((await manager.get('/api/pos/sales?paymentMethod=mobile_money')).body.data.items).toHaveLength(1);
    expect((await manager.get(`/api/pos/sales?search=${s1.body.data.receiptNumber}`)).body.data.items).toHaveLength(1);
    expect((await manager.get('/api/pos/sales?from=2000-01-01&to=2000-01-02')).body.data.items).toHaveLength(0);
    expect((await manager.get('/api/pos/sales?limit=5000')).status).toBe(400);
  });

  test('rasiidku wuxuu wataa xogta shirkadda; dib-u-daabacaadda waa la diiwaangeliyaa', async () => {
    const { agent } = await cashierWithShift();
    const p = await createProduct({ price: 10 });
    const sale = await agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 2 }], { payment: { method: 'cash', amountReceived: 50 } }));
    const r = await agent.get(`/api/pos/sales/${sale.body.data.id}/receipt?reprint=true`);
    expect(r.status).toBe(200);
    expect(r.body.data.company.name).toBe('TAWAKAL');
    expect(r.body.data.sale).toMatchObject({ grandTotal: 20, amountReceived: 50, changeGiven: 30 });
    expect(await AuditLog.countDocuments({ action: 'receipt.reprinted' })).toBe(1);
  });
});

describe('Shifts iyo isku-dheellitirka lacagta', () => {
  test('hal shift oo furan kaashiyihiiba', async () => {
    const { agent } = await cashierWithShift();
    expect((await agent.post('/api/pos/shifts/open').send({ openingCash: 10 })).status).toBe(409);
    expect((await agent.post('/api/pos/shifts/open').send({ openingCash: -1 })).status).toBe(400);
    expect(await CashierShift.countDocuments()).toBe(1);
  });

  test('lacagta la filayo iyo farqiga: mobile money kuma jiro lacagta caddaanka ah', async () => {
    const { agent, shiftId } = await cashierWithShift(undefined, 100);
    const { agent: manager } = await loginAs('manager');
    const p = await createProduct({ price: 10, stock: 100 });

    await agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 5 }], { payment: { method: 'cash', amountReceived: 100 } })); // cash 50
    await agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 3 }], { payment: { method: 'cash', amountReceived: 30 } })); // cash 30
    await agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 4 }], { payment: { method: 'mobile_money', reference: 'A1' } })); // 40
    await agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 2 }], { payment: { method: 'bank_transfer' } })); // 20

    // hagaajin: kaashiyuhu ma samayn karo, manager-ku wuu samayn karaa
    expect((await agent.post(`/api/pos/shifts/${shiftId}/adjustments`).send({ amount: -10, reason: 'Lacag la saaray' })).status).toBe(403);
    expect((await manager.post(`/api/pos/shifts/${shiftId}/adjustments`).send({ amount: -10, reason: 'Lacag bangiga la geeyey' })).status).toBe(201);

    const current = await agent.get('/api/pos/shifts/current');
    expect(current.body.data.summary).toMatchObject({
      salesCount: 4, salesTotal: 140, cashSales: 80, mobileMoneySales: 40, bankTransferSales: 20,
      cashRefunds: 0, adjustmentsTotal: -10, expectedClosingCash: 170, // 100 + 80 - 0 - 10
    });

    expect((await agent.post('/api/pos/shifts/close').send({})).status).toBe(400);
    const closed = await agent.post('/api/pos/shifts/close').send({ actualClosingCash: 165, closingNotes: 'Shan dollar ayaa maqan' });
    expect(closed.status).toBe(200);
    expect(closed.body.data).toMatchObject({ status: 'closed', expectedClosingCash: 170, actualClosingCash: 165, cashVariance: -5, closingNotes: 'Shan dollar ayaa maqan' });
    expect(closed.body.data.closedByName).toBeTruthy();

    // shift xiran: iib ma dhici karo, mar labaadna lama xiri karo, lamana hagaajin karo
    expect((await agent.post('/api/pos/shifts/close').send({ actualClosingCash: 170 })).status).toBe(409);
    expect((await agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 1 }]))).status).toBe(409);
    expect((await manager.post(`/api/pos/shifts/${shiftId}/adjustments`).send({ amount: 5, reason: 'Isku day dambe' })).status).toBe(409);
    expect((await agent.get('/api/pos/shifts/current')).body.data).toBeNull();

    const history = await agent.get('/api/pos/shifts/history');
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0].summary.expectedClosingCash).toBe(170);
    const report = await manager.get('/api/admin/reports/shifts');
    expect(report.body.data.totals).toMatchObject({ closed: 1, variance: -5, withVariance: 1 });
  });

  test('kaashiyuhu ma arko mana xiri karo shift qof kale; manager-ku wuu xiri karaa', async () => {
    const c1 = await cashierWithShift('c1@tawakal.test');
    const c2 = await cashierWithShift('c2@tawakal.test');
    const { agent: manager, user } = await loginAs('manager');
    expect((await c1.agent.get(`/api/pos/shifts/${c2.shiftId}`)).status).toBe(404);
    expect((await c1.agent.post('/api/pos/shifts/close').send({ actualClosingCash: 100, shiftId: c2.shiftId })).status).toBe(404);
    expect((await c1.agent.get('/api/pos/shifts/history')).body.data).toHaveLength(1);
    const closed = await manager.post('/api/pos/shifts/close').send({ actualClosingCash: 100, shiftId: c2.shiftId });
    expect(closed.status).toBe(200);
    expect(closed.body.data.closedByName).toBe(user.name);
    expect((await manager.get('/api/pos/shifts/history')).body.data).toHaveLength(2);
  });
});

describe('Celinta (refunds)', () => {
  async function setup() {
    const cashier = await cashierWithShift(undefined, 100);
    const manager = await loginAs('manager');
    const a = await createProduct({ price: 10, stock: 50 });
    const b = await createProduct({ price: 4, stock: 50 });
    // 10 x 10 + 5 x 4 = 120, 10% dhimis (oggolaansho) = 108
    const sale = await cashier.agent.post('/api/pos/sales').send(
      salePayload([{ productId: a.id, quantity: 10 }, { productId: b.id, quantity: 5 }], {
        discount: { kind: 'percent', value: 10 },
        approval: { email: manager.user.email, password: PASSWORD },
        payment: { method: 'cash', amountReceived: 108 },
      })
    );
    const refund = (agent, body) => agent.post(`/api/pos/sales/${sale.body.data.id}/refunds`).send({ idempotencyKey: uuid(), reason: 'Alaab khaldan', ...body });
    return { cashier, manager, a, b, sale: sale.body.data, refund };
  }

  test('kaashiyuhu wuxuu u baahan yahay oggolaansho; sabab waa qasab', async () => {
    const { cashier, manager, a, refund } = await setup();
    const items = [{ productId: a.id, quantity: 1, restock: true }];
    const noApproval = await refund(cashier.agent, { items });
    expect(noApproval.status).toBe(403);
    expect(noApproval.body.errors[0].code).toBe('approval_required');
    expect((await refund(cashier.agent, { items, reason: '' })).status).toBe(400);
    expect((await refund(cashier.agent, { items, approval: { email: manager.user.email, password: 'khalad-khalad' } })).status).toBe(401);
    expect(await Refund.countDocuments()).toBe(0);
    expect(await stockOf(a)).toBe(40);

    const ok = await refund(cashier.agent, { items, approval: { email: manager.user.email, password: PASSWORD } });
    expect(ok.status).toBe(201);
    expect(ok.body.data.refund.approvedByName).toBe(manager.user.name);
  });

  test('celin qayb ah: lacagta saafiga ah (dhimista kadib), kaydka kaliya alaabta la soo celiyey', async () => {
    const { manager, a, b, sale, refund } = await setup();
    expect(sale).toMatchObject({ subtotal: 120, totalDiscount: 12, grandTotal: 108 });
    await manager.agent.post('/api/pos/shifts/open').send({ openingCash: 50 });

    // 4 xabbo oo "a" ah (kaydka ku noqda) + 1 "b" (dhaawac: kaydka kuma noqdo)
    const res = await refund(manager.agent, { items: [{ productId: a.id, quantity: 4, restock: true }, { productId: b.id, quantity: 1, restock: false }] });
    expect(res.status).toBe(201);
    expect(res.body.data.refund.refundNumber).toMatch(/^RF-\d{6}-\d{4}$/);
    expect(res.body.data.refund.amount).toBe(39.6); // 4 x 9 + 1 x 3.6
    expect(res.body.data.sale).toMatchObject({ status: 'partially_refunded', refundedAmount: 39.6 });
    expect(await stockOf(a)).toBe(44);
    expect(await stockOf(b)).toBe(45);
    const moves = await InventoryMovement.find({ type: 'refund_restock' });
    expect(moves).toHaveLength(1);
    expect(moves[0].toObject()).toMatchObject({ quantityChange: 4, stockBefore: 40, stockAfter: 44 });

    // celinta caddaanka ah waxay ka go'daa shift-ka qofka fuliyey
    const shift = await manager.agent.get('/api/pos/shifts/current');
    expect(shift.body.data.summary).toMatchObject({ cashRefunds: 39.6, expectedClosingCash: 10.4 });

    // iibka asalka ah wuu sii jiraa
    expect(await Sale.countDocuments()).toBe(1);
    const detail = await manager.agent.get(`/api/pos/sales/${sale.id}`);
    expect(detail.body.data.refunds).toHaveLength(1);
  });

  test('lama celin karo wax ka badan intii la iibiyey; celin buuxda waxay dhammaysaa iibka', async () => {
    const { manager, a, b, sale, refund } = await setup();
    await manager.agent.post('/api/pos/shifts/open').send({ openingCash: 500 });
    expect((await refund(manager.agent, { items: [{ productId: a.id, quantity: 11, restock: true }] })).status).toBe(409);
    expect((await refund(manager.agent, { items: [{ productId: a.id, quantity: 1.5, restock: true }] })).status).toBe(400);
    expect((await refund(manager.agent, { items: [{ productId: 'a'.repeat(24), quantity: 1, restock: true }] })).status).toBe(400);

    await refund(manager.agent, { items: [{ productId: a.id, quantity: 7, restock: true }] });
    expect((await refund(manager.agent, { items: [{ productId: a.id, quantity: 4, restock: true }] })).status).toBe(409); // 3 uun baa haray
    const rest = await refund(manager.agent, { items: [{ productId: a.id, quantity: 3, restock: true }, { productId: b.id, quantity: 5, restock: true }] });
    expect(rest.status).toBe(201);
    expect(rest.body.data.sale).toMatchObject({ status: 'refunded', paymentStatus: 'refunded', refundedAmount: 108 });
    expect((await refund(manager.agent, { items: [{ productId: a.id, quantity: 1, restock: true }] })).status).toBe(409);
    expect(await stockOf(a)).toBe(50);
    expect(await stockOf(b)).toBe(50);
    const total = (await Refund.find()).reduce((s, r) => s + r.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(sale.grandTotal);
  });

  test('celin labo-jibbaarantay ama isku mar ah hal mar uun bay dhacdaa', async () => {
    const { manager, a, sale } = await setup();
    await manager.agent.post('/api/pos/shifts/open').send({ openingCash: 500 });
    const url = `/api/pos/sales/${sale.id}/refunds`;
    const payload = { idempotencyKey: uuid(), reason: 'Laba jeer la riixay', items: [{ productId: a.id, quantity: 10, restock: true }] };
    const [r1, r2] = await Promise.all([manager.agent.post(url).send(payload), manager.agent.post(url).send(payload)]);
    const r3 = await manager.agent.post(url).send(payload);
    expect([r1.status, r2.status].every((s) => [200, 201, 409].includes(s))).toBe(true);
    expect([r1.status, r2.status]).toContain(201);
    expect(r3.status).toBe(200);
    expect(await Refund.countDocuments()).toBe(1);
    expect(await stockOf(a)).toBe(50);

    // laba celin oo kala duwan oo isku mar ah, mid kasta 10-ka oo dhan: mid uun baa guuleysanaya
    const fresh = await setup2(manager);
    const both = await Promise.all([0, 1].map(() => manager.agent.post(`/api/pos/sales/${fresh.sale.id}/refunds`).send({ idempotencyKey: uuid(), reason: 'Isku mar', items: [{ productId: fresh.p.id, quantity: 10, restock: true }] })));
    expect(both.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await stockOf(fresh.p)).toBe(50);
  });

  async function setup2(manager) {
    const p = await createProduct({ price: 10, stock: 50 });
    const sale = await manager.agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 10 }]));
    return { p, sale: sale.body.data };
  }

  test('celin caddaan ah waxay u baahan tahay shift furan; kaashiye ma celin karo iib qof kale', async () => {
    const { manager, cashier, a, sale, refund } = await setup();
    const noShift = await refund(manager.agent, { items: [{ productId: a.id, quantity: 1, restock: true }] });
    expect(noShift.status).toBe(409);
    expect(noShift.body.errors[0].code).toBe('no_open_shift');
    // hab aan caddaan ahayn uma baahna shift
    const viaBank = await refund(manager.agent, { items: [{ productId: a.id, quantity: 1, restock: true }], method: 'bank_transfer' });
    expect(viaBank.status).toBe(201);
    expect(viaBank.body.data.refund.method.type).toBe('bank_transfer');

    const other = await cashierWithShift('other@tawakal.test');
    const res = await other.agent.post(`/api/pos/sales/${sale.id}/refunds`).send({
      idempotencyKey: uuid(), reason: 'Isku day', items: [{ productId: a.id, quantity: 1, restock: true }], approval: { email: manager.user.email, password: PASSWORD },
    });
    expect(res.status).toBe(404);
    expect((await cashier.agent.get('/api/pos/refunds')).body.data).toHaveLength(0);
    expect((await manager.agent.get('/api/pos/refunds')).body.data).toHaveLength(1);
  });
});

describe('Warbixinnada iyo dashboard-ka isku-dhafan', () => {
  test('dakhliga kanaal kasta: dalab online ah oo sugaya kuma jiro; celintu way ka go\'daa', async () => {
    const cashier = await cashierWithShift();
    const { agent: admin } = await loginAs('admin');
    const { agent: staff } = await loginAs('staff');
    const p = await createProduct({ price: 10, stock: 100 });

    const sale = await cashier.agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 10 }])); // 100
    await cashier.agent.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 5 }], { payment: { method: 'mobile_money' } })); // 50
    await admin.post(`/api/pos/sales/${sale.body.data.id}/refunds`).send({ idempotencyKey: uuid(), reason: 'Celin', method: 'bank_transfer', items: [{ productId: p.id, quantity: 2, restock: true }] }); // -20

    // laba dalab online ah: mid sugaya, mid la gaarsiiyey (30)
    await request(app).post('/api/orders').send(orderPayload([{ productId: p.id, quantity: 7 }]));
    const done = await request(app).post('/api/orders').send(orderPayload([{ productId: p.id, quantity: 3 }]));
    const Order = require('../models/Order');
    const order = await Order.findOne({ orderNumber: done.body.data.orderNumber });
    for (const s of ['confirmed', 'processing', 'ready_for_pickup', 'delivered']) await admin.patch(`/api/admin/orders/${order._id}/status`).send({ status: s });

    const stats = await admin.get('/api/admin/dashboard/stats');
    expect(stats.body.data.channels.pos).toMatchObject({ sales: 2, gross: 150, refunds: 20, net: 130 });
    expect(stats.body.data.channels.online).toMatchObject({ completedOrders: 1, revenue: 30 });
    expect(stats.body.data.channels.totalRevenue).toBe(160);
    expect(stats.body.data.channels.byPaymentMethod).toHaveLength(2);
    expect(stats.body.data.channels.byCashier[0]).toMatchObject({ count: 2, gross: 150 });

    const chart = await admin.get('/api/admin/dashboard/sales?period=7d');
    expect(chart.body.data.series[6]).toMatchObject({ posSales: 2, posGross: 150, posRefunds: 20, posNet: 130, sales: 100, combined: 230 });

    const pos = await admin.get('/api/admin/reports/pos-sales');
    expect(pos.body.data.totals).toMatchObject({ sales: 2, gross: 150, refunds: 20, net: 130 });
    const perf = await admin.get('/api/admin/reports/cashier-performance');
    expect(perf.body.data.rows[0]).toMatchObject({ sales: 2, gross: 150, refunds: 20, net: 130, averageSale: 75 });
    const methods = await admin.get('/api/admin/reports/payment-methods');
    expect(methods.body.data.pos.find((m) => m.code === 'cash')).toMatchObject({ count: 1, gross: 100 });
    expect(methods.body.data.pos.find((m) => m.code === 'bank_transfer')).toMatchObject({ count: 0, refunds: 20, net: -20 });
    expect(methods.body.data.online).toHaveLength(1);

    // staff: dashboard haa, warbixinnada POS iyo diiwaanka hawlaha maya
    expect((await staff.get('/api/admin/dashboard/stats')).status).toBe(200);
    expect((await staff.get('/api/admin/reports/pos-sales')).status).toBe(403);
    expect((await staff.get('/api/admin/audit-logs')).status).toBe(403);
    const logs = await admin.get('/api/admin/audit-logs');
    expect(logs.status).toBe(200);
    expect(logs.body.data.map((l) => l.action)).toEqual(expect.arrayContaining(['shift.opened', 'sale.completed', 'refund.created']));
    expect((await admin.get('/api/admin/reports/pos-sales?from=2026-02-01&to=2026-01-01')).status).toBe(400);
  });

  test('dejinta POS: kaashiyuhu wuxuu helaa xog ammaan ah; maamule kaliya ayaa beddeli kara', async () => {
    const { agent: cashier } = await loginAs('cashier');
    const { agent: manager } = await loginAs('manager');
    const { agent: admin } = await loginAs('admin');
    const cfg = await cashier.get('/api/pos/config');
    expect(cfg.status).toBe(200);
    expect(cfg.body.data.paymentMethods.map((m) => m.code)).toEqual(['cash', 'mobile_money', 'bank_transfer']);
    expect(cfg.body.data).toMatchObject({ cashierMaxDiscountPercent: 5, maxDiscountPercent: 20, requireOpenShift: true });

    const pos = { requireOpenShift: false, discountsEnabled: false, cashierMaxDiscountPercent: 0, maxDiscountPercent: 10, receiptFooter: 'Mahadsanid', paymentMethods: [{ code: 'cash', label: 'Caddaan', type: 'cash', enabled: true }] };
    expect((await manager.patch('/api/admin/settings').send({ pos })).status).toBe(403);
    expect((await admin.patch('/api/admin/settings').send({ pos: { ...pos, cashierMaxDiscountPercent: 50 } })).status).toBe(400);
    expect((await admin.patch('/api/admin/settings').send({ pos })).status).toBe(200);

    // hadda shift looma baahna, qiimo-dhimistuna waa dansan tahay, mobile money-na waa la saaray
    const p = await createProduct({ price: 10 });
    expect((await cashier.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 1 }]))).status).toBe(201);
    expect((await cashier.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 1 }], { discount: { kind: 'percent', value: 1 } }))).status).toBe(403);
    expect((await cashier.post('/api/pos/sales').send(salePayload([{ productId: p.id, quantity: 1 }], { payment: { method: 'mobile_money' } }))).status).toBe(400);
  });
});
