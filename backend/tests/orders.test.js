const { app, request, startDb, stopDb, clearDb, loginAs, createProduct, orderPayload } = require('./helpers');
const Product = require('../models/Product');
const Order = require('../models/Order');
const InventoryMovement = require('../models/InventoryMovement');
const CompanySettings = require('../models/CompanySettings');

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const post = (payload) => request(app).post('/api/orders').send(payload);
const stockOf = async (p) => (await Product.findById(p._id)).stock;

describe('Abuurista dalabka', () => {
  test('wadarta waxaa xisaabiya server-ka, kaydkana waa la dhimaa', async () => {
    const a = await createProduct({ price: 7.5, stock: 50 });
    const b = await createProduct({ price: 0.25, stock: 1000 });
    const res = await post(orderPayload([{ productId: a.id, quantity: 4 }, { productId: b.id, quantity: 300 }]));

    expect(res.status).toBe(201);
    expect(res.body.data.orderNumber).toMatch(/^TWK-\d{6}-\d{4}$/);
    expect(res.body.data.subtotal).toBe(105); // 4*7.5 + 300*0.25
    expect(res.body.data.deliveryFee).toBe(0);
    expect(res.body.data.total).toBe(105);
    expect(res.body.data.paymentStatus).toBe('unpaid');
    expect(await stockOf(a)).toBe(46);
    expect(await stockOf(b)).toBe(700);

    const moves = await InventoryMovement.find({ type: 'sale' }).sort({ quantityChange: 1 });
    expect(moves).toHaveLength(2);
    expect(moves[0].toObject()).toMatchObject({ quantityChange: -300, stockBefore: 1000, stockAfter: 700, refLabel: res.body.data.orderNumber });
    expect(JSON.stringify(res.body)).not.toMatch(/costPrice/);
  });

  test('qiimaha ama wadarta macmiilku soo diro waa la diidaa', async () => {
    const p = await createProduct({ price: 10 });
    const withPrice = await post(orderPayload([{ productId: p.id, quantity: 1, price: 0.01 }]));
    expect(withPrice.status).toBe(400);
    const withTotal = await post({ ...orderPayload([{ productId: p.id, quantity: 1 }]), total: 0.01 });
    expect(withTotal.status).toBe(400);
    expect(await Order.countDocuments()).toBe(0);
  });

  test('kharashka gaarsiinta iyo xadka gaarsiinta bilaashka ah', async () => {
    await CompanySettings.getSingleton();
    await CompanySettings.updateOne({ key: 'main' }, { deliveryFee: 5, freeDeliveryThreshold: 100 });
    const p = await createProduct({ price: 10, stock: 100 });
    const delivery = { fulfillmentMethod: 'delivery', paymentMethod: 'cash_on_delivery', deliveryAddress: { address: 'Wadada Maka', district: 'Hodan' } };

    const small = await post(orderPayload([{ productId: p.id, quantity: 2 }], delivery));
    expect(small.body.data).toMatchObject({ subtotal: 20, deliveryFee: 5, total: 25 });

    const big = await post(orderPayload([{ productId: p.id, quantity: 10 }], delivery));
    expect(big.body.data).toMatchObject({ subtotal: 100, deliveryFee: 0, total: 100 });

    const pickup = await post(orderPayload([{ productId: p.id, quantity: 2 }]));
    expect(pickup.body.data.deliveryFee).toBe(0);

    const noAddress = await post(orderPayload([{ productId: p.id, quantity: 1 }], { fulfillmentMethod: 'delivery' }));
    expect(noAddress.status).toBe(400);
  });

  test('tiro aan sax ahayn waa la diidaa', async () => {
    const p = await createProduct();
    for (const quantity of [0, -2, 'laba', null]) {
      expect((await post(orderPayload([{ productId: p.id, quantity }]))).status).toBe(400);
    }
    // jajab alaab aan loo oggolayn
    expect((await post(orderPayload([{ productId: p.id, quantity: 1.5 }]))).status).toBe(400);
    // jajab waa la oggol yahay marka alaabta loo dejiyey
    const cable = await createProduct({ unit: 'meter', allowDecimal: true, price: 2, stock: 10 });
    const ok = await post(orderPayload([{ productId: cable.id, quantity: 2.5 }]));
    expect(ok.status).toBe(201);
    expect(ok.body.data.subtotal).toBe(5);
    expect(await stockOf(cable)).toBe(7.5);
    expect(await stockOf(p)).toBe(100);
  });

  test('kayd aan ku filnayn: dalabka oo dhan waa la diidaa, waxba lama dhimo', async () => {
    const a = await createProduct({ stock: 50 });
    const b = await createProduct({ stock: 3 });
    const res = await post(orderPayload([{ productId: a.id, quantity: 10 }, { productId: b.id, quantity: 4 }]));
    expect(res.status).toBe(409);
    expect(res.body.errors[0]).toMatchObject({ code: 'insufficient_stock', available: 3 });
    expect(await stockOf(a)).toBe(50);
    expect(await stockOf(b)).toBe(3);
    expect(await Order.countDocuments()).toBe(0);
    expect(await InventoryMovement.countDocuments()).toBe(0);
  });

  test('alaab aan firfircoonayn, la kaydiyey, ama aan jirin = 409', async () => {
    const inactive = await createProduct({ isActive: false });
    const archived = await createProduct({ isArchived: true });
    expect((await post(orderPayload([{ productId: inactive.id, quantity: 1 }]))).status).toBe(409);
    expect((await post(orderPayload([{ productId: archived.id, quantity: 1 }]))).status).toBe(409);
    expect((await post(orderPayload([{ productId: 'a'.repeat(24), quantity: 1 }]))).status).toBe(409);
    expect((await post(orderPayload([{ productId: 'xyz', quantity: 1 }]))).status).toBe(400);
  });

  test('hab lacag bixin oo la damiyey waa la diidaa', async () => {
    const p = await createProduct();
    expect((await post(orderPayload([{ productId: p.id, quantity: 1 }], { paymentMethod: 'card_online' }))).status).toBe(400);
  });

  test('isla codsiga oo laba jeer la diro: hal dalab, hal dhimis', async () => {
    const p = await createProduct({ stock: 10 });
    const payload = orderPayload([{ productId: p.id, quantity: 3 }]);
    const first = await post(payload);
    const second = await post(payload);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.data.orderNumber).toBe(first.body.data.orderNumber);
    expect(await Order.countDocuments()).toBe(1);
    expect(await stockOf(p)).toBe(7);
  });

  test('isla codsiga oo isku mar la diro (race): hal dalab, hal dhimis', async () => {
    const p = await createProduct({ stock: 10 });
    const payload = orderPayload([{ productId: p.id, quantity: 3 }]);
    const results = await Promise.all([post(payload), post(payload), post(payload)]);
    results.forEach((r) => expect([200, 201]).toContain(r.status));
    expect(await Order.countDocuments()).toBe(1);
    expect(await stockOf(p)).toBe(7);
  });

  test('dalabyo isku mar ah kama badin karaan kaydka (overselling)', async () => {
    const p = await createProduct({ stock: 5 });
    const results = await Promise.all(
      Array.from({ length: 12 }, () => post(orderPayload([{ productId: p.id, quantity: 1 }])))
    );
    const created = results.filter((r) => r.status === 201);
    const rejected = results.filter((r) => r.status === 409);
    expect(created).toHaveLength(5);
    expect(rejected).toHaveLength(7);
    expect(await stockOf(p)).toBe(0);
    expect(await Order.countDocuments()).toBe(5);
    expect(await InventoryMovement.countDocuments({ type: 'sale' })).toBe(5);
    expect(new Set(created.map((r) => r.body.data.orderNumber)).size).toBe(5);
  });
});

describe('Raadraaca dalabka (xogta gaarka ah)', () => {
  test('wuxuu u baahan yahay taleefanka saxda ah, wuxuuna soo celiyaa xog kooban', async () => {
    const p = await createProduct();
    const created = await post(
      orderPayload([{ productId: p.id, quantity: 1 }], {
        customer: { name: 'Axmed Cali', phone: '+252 61 555 1234', email: 'axmed@example.com' },
        fulfillmentMethod: 'delivery',
        paymentMethod: 'cash_on_delivery',
        deliveryAddress: { address: 'Guri 12, Wadada Maka', district: 'Hodan' },
      })
    );
    const { orderNumber } = created.body.data;

    const wrong = await request(app).get('/api/orders/track').query({ orderNumber, phone: '0615559999' });
    expect(wrong.status).toBe(404);
    const missing = await request(app).get('/api/orders/track').query({ orderNumber: 'TWK-000101-9999', phone: '0615551234' });
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe(wrong.body.message);

    const okRes = await request(app).get('/api/orders/track').query({ orderNumber: orderNumber.toLowerCase(), phone: '0615551234' });
    expect(okRes.status).toBe(200);
    expect(okRes.body.data.orderStatus).toBe('pending');
    const json = JSON.stringify(okRes.body);
    expect(json).not.toMatch(/Wadada Maka/);
    expect(json).not.toMatch(/axmed@example.com/);
    expect(json).not.toMatch(/555 1234/);
    expect(json).not.toMatch(/Cali/);
    expect(json).not.toMatch(/internalNotes|costPrice|idempotencyKey/);

    expect((await request(app).get('/api/orders/track').query({ orderNumber })).status).toBe(400);
  });

  test('liiska dalabyada dadweynaha uma furna', async () => {
    expect((await request(app).get('/api/orders')).status).toBe(404);
    expect((await request(app).get('/api/admin/orders')).status).toBe(401);
  });
});

describe('Xaaladaha dalabka', () => {
  async function setup(overrides) {
    const { agent } = await loginAs('admin');
    const p = await createProduct({ stock: 20 });
    const created = await post(orderPayload([{ productId: p.id, quantity: 5 }], overrides));
    const order = await Order.findOne({ orderNumber: created.body.data.orderNumber });
    const move = (status) => agent.patch(`/api/admin/orders/${order._id}/status`).send({ status });
    return { agent, p, order, move };
  }

  test('wadada caadiga ah ee qaadashada (pickup)', async () => {
    const { move, order } = await setup();
    for (const s of ['confirmed', 'processing', 'ready_for_pickup', 'delivered']) {
      const res = await move(s);
      expect(res.status).toBe(200);
      expect(res.body.data.orderStatus).toBe(s);
    }
    const doc = await Order.findById(order._id);
    expect(doc.deliveredAt).toBeInstanceOf(Date);
    expect(doc.statusHistory.map((h) => h.status)).toEqual(['pending', 'confirmed', 'processing', 'ready_for_pickup', 'delivered']);
    // xaalad dhammaatay lagama guuri karo
    expect((await move('cancelled')).status).toBe(409);
    expect((await move('pending')).status).toBe(409);
  });

  test('u-gudub aan la oggolayn waa la diidaa', async () => {
    const { move } = await setup();
    expect((await move('delivered')).status).toBe(409);
    expect((await move('processing')).status).toBe(409);
    expect((await move('pending')).status).toBe(409);
    expect((await move('waxaan-jirin')).status).toBe(400);
    await move('confirmed');
    await move('processing');
    // dalab qaadasho ah looma diri karo gaarsiin
    expect((await move('out_for_delivery')).status).toBe(409);
  });

  test('joojintu kaydka hal mar uun bay soo celisaa', async () => {
    const { move, p } = await setup();
    expect(await stockOf(p)).toBe(15);
    const [r1, r2] = await Promise.all([move('cancelled'), move('cancelled')]);
    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
    expect(await stockOf(p)).toBe(20);
    expect(await InventoryMovement.countDocuments({ type: 'cancellation_restore' })).toBe(1);
    const restore = await InventoryMovement.findOne({ type: 'cancellation_restore' });
    expect(restore.toObject()).toMatchObject({ quantityChange: 5, stockBefore: 15, stockAfter: 20 });
    expect(restore.user).toBeTruthy();
  });

  test('lacag bixinta: maamule kaliya; dalab la joojiyey lama calaamadin karo "paid"', async () => {
    const { agent, order, move } = await setup();
    const { agent: staff } = await loginAs('staff');
    expect((await staff.patch(`/api/admin/orders/${order._id}/payment-status`).send({ paymentStatus: 'paid' })).status).toBe(403);
    expect((await agent.patch(`/api/admin/orders/${order._id}/payment-status`).send({ paymentStatus: 'bixiyey' })).status).toBe(400);
    await move('cancelled');
    expect((await agent.patch(`/api/admin/orders/${order._id}/payment-status`).send({ paymentStatus: 'paid' })).status).toBe(409);
  });

  test('dakhliga dashboard-ka: kaliya dalabyada la gaarsiiyey', async () => {
    const { agent, move } = await setup(); // 5 x 10 = 50
    const p2 = await createProduct({ price: 30, stock: 10 });
    const other = await post(orderPayload([{ productId: p2.id, quantity: 1 }]));
    const cancelled = await Order.findOne({ orderNumber: other.body.data.orderNumber });
    await agent.patch(`/api/admin/orders/${cancelled._id}/status`).send({ status: 'cancelled' });

    let stats = await agent.get('/api/admin/dashboard/stats');
    expect(stats.body.data.revenue).toBe(0);
    expect(stats.body.data.orders).toMatchObject({ total: 2, pending: 1, cancelled: 1, completed: 0 });

    for (const s of ['confirmed', 'processing', 'ready_for_pickup', 'delivered']) await move(s);
    stats = await agent.get('/api/admin/dashboard/stats');
    expect(stats.body.data.revenue).toBe(50);
    expect(stats.body.data.bestSellers).toHaveLength(1);

    const report = await agent.get('/api/admin/reports/sales');
    expect(report.status).toBe(200);
    expect(report.body.data.totals).toMatchObject({ orders: 1, sales: 50, revenue: 50 });

    const chart = await agent.get('/api/admin/dashboard/sales?period=7d');
    expect(chart.body.data.series).toHaveLength(7);
    expect(chart.body.data.series[6].sales).toBe(50);
  });
});
