const { app, request, startDb, stopDb, clearDb, loginAs, createProduct, uuid } = require('./helpers');
const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');
const ContactMessage = require('../models/ContactMessage');

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const stockOf = async (p) => (await Product.findById(p._id)).stock;

describe('Hagaajinta kaydka', () => {
  test('kordhin iyo dhimis waa la diiwaangeliyaa (qofka, sababta, ka hor/kadib)', async () => {
    const { agent, user } = await loginAs('admin');
    const p = await createProduct({ stock: 10 });

    const up = await agent.post('/api/admin/inventory/adjustments').send({ idempotencyKey: uuid(), productId: p.id, quantityChange: 15, reason: 'Tirin cusub' });
    expect(up.status).toBe(201);
    expect(up.body.data.movement).toMatchObject({ type: 'adjustment', quantityChange: 15, stockBefore: 10, stockAfter: 25, reason: 'Tirin cusub', userName: user.name });

    const down = await agent.post('/api/admin/inventory/adjustments').send({ idempotencyKey: uuid(), productId: p.id, quantityChange: -5, reason: 'Alaab jabtay' });
    expect(down.status).toBe(201);
    expect(await stockOf(p)).toBe(20);
    expect(await InventoryMovement.countDocuments({ product: p._id })).toBe(2);

    const list = await agent.get(`/api/admin/inventory/movements?product=${p.id}`);
    expect(list.body.data).toHaveLength(2);
    expect(list.body.data[0].quantityChange).toBe(-5);
  });

  test('kaydku ma noqon karo taban', async () => {
    const { agent } = await loginAs('admin');
    const p = await createProduct({ stock: 4 });
    const res = await agent.post('/api/admin/inventory/adjustments').send({ idempotencyKey: uuid(), productId: p.id, quantityChange: -5, reason: 'Khalad tirin' });
    expect(res.status).toBe(409);
    expect(await stockOf(p)).toBe(4);
    expect(await InventoryMovement.countDocuments()).toBe(0);
  });

  test('dhimis isku mar ah kama hoos mari karto 0', async () => {
    const { agent } = await loginAs('admin');
    const p = await createProduct({ stock: 3 });
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        agent.post('/api/admin/inventory/adjustments').send({ idempotencyKey: uuid(), productId: p.id, quantityChange: -1, reason: 'Tijaabo isku mar' })
      )
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(3);
    expect(results.filter((r) => r.status === 409)).toHaveLength(3);
    expect(await stockOf(p)).toBe(0);
  });

  test('isla codsiga oo la soo celiyo kaydka laba jeer ma dhimo', async () => {
    const { agent } = await loginAs('admin');
    const p = await createProduct({ stock: 10 });
    const payload = { idempotencyKey: uuid(), productId: p.id, quantityChange: -4, reason: 'Laba jeer la riixay' };
    const [a, b] = await Promise.all([
      agent.post('/api/admin/inventory/adjustments').send(payload),
      agent.post('/api/admin/inventory/adjustments').send(payload),
    ]);
    const c = await agent.post('/api/admin/inventory/adjustments').send(payload);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(c.status).toBe(200);
    expect(c.body.data.duplicate).toBe(true);
    expect(await stockOf(p)).toBe(6);
    expect(await InventoryMovement.countDocuments()).toBe(1);
  });

  test('xog aan sax ahayn: sabab la`aan, 0, jajab alaab dhan', async () => {
    const { agent } = await loginAs('admin');
    const p = await createProduct();
    const send = (extra) => agent.post('/api/admin/inventory/adjustments').send({ idempotencyKey: uuid(), productId: p.id, quantityChange: 1, reason: 'Sabab sax ah', ...extra });
    expect((await send({ reason: '' })).status).toBe(400);
    expect((await send({ quantityChange: 0 })).status).toBe(400);
    expect((await send({ quantityChange: 1.5 })).status).toBe(400);
    expect((await send({ productId: 'a'.repeat(24) })).status).toBe(404);
    expect((await send({ idempotencyKey: undefined })).status).toBe(400);
  });

  test('helitaanka alaabta alaab-qeybiyaha wuxuu kordhiyaa kaydka, cusboonaysiiyaana qiimaha iibsiga', async () => {
    const { agent } = await loginAs('admin');
    const p = await createProduct({ stock: 10, costPrice: 6 });
    const res = await agent.post('/api/admin/inventory/receipts').send({ idempotencyKey: uuid(), productId: p.id, quantity: 200, unitCost: 5.5, supplier: 'Shirkad Tijaabo' });
    expect(res.status).toBe(201);
    expect(res.body.data.movement).toMatchObject({ type: 'receipt', quantityChange: 200, stockBefore: 10, stockAfter: 210, unitCost: 5.5, supplier: 'Shirkad Tijaabo' });
    const doc = await Product.findById(p._id);
    expect(doc.stock).toBe(210);
    expect(doc.costPrice).toBe(5.5);

    const { agent: staff } = await loginAs('staff');
    expect((await staff.post('/api/admin/inventory/receipts').send({ idempotencyKey: uuid(), productId: p.id, quantity: 1, unitCost: 1 })).status).toBe(403);
  });

  test('digniinaha kaydka yar iyo kan dhammaaday', async () => {
    const { agent } = await loginAs('admin');
    await createProduct({ stock: 100, lowStockThreshold: 10 });
    await createProduct({ stock: 5, lowStockThreshold: 10 });
    await createProduct({ stock: 0, lowStockThreshold: 10 });
    const res = await agent.get('/api/admin/inventory?filter=low');
    expect(res.body.data.alerts).toEqual({ lowStock: 1, outOfStock: 1 });
    expect(res.body.data.items).toHaveLength(1);
    const report = await agent.get('/api/admin/reports/inventory');
    expect(report.body.data.totals.costValue).toBe(630); // (100 + 5) x 6
    expect(report.body.data.outOfStock).toHaveLength(1);
  });
});

describe('Foomka xiriirka', () => {
  const valid = { name: 'Faadumo Xasan', phone: '0615000000', message: 'Waxaan rabaa qiimaha sibidhka.' };

  test('farriin sax ah waa la kaydiyaa, maamuluhuna wuu arki karaa', async () => {
    const res = await request(app).post('/api/contact').send(valid);
    expect(res.status).toBe(201);
    expect(await ContactMessage.countDocuments()).toBe(1);

    expect((await request(app).get('/api/admin/messages')).status).toBe(401);
    const { agent } = await loginAs('staff');
    const list = await agent.get('/api/admin/messages');
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.unread).toBe(1);
    const id = list.body.data.items[0].id;
    const upd = await agent.patch(`/api/admin/messages/${id}/status`).send({ status: 'resolved' });
    expect(upd.body.data.status).toBe('resolved');
  });

  test('xog aan sax ahayn waa la diidaa', async () => {
    const send = (extra) => request(app).post('/api/contact').send({ ...valid, ...extra });
    expect((await send({ name: '' })).status).toBe(400);
    expect((await send({ message: 'hi' })).status).toBe(400);
    expect((await send({ email: 'not-an-email' })).status).toBe(400);
    expect((await send({ phone: 'abc' })).status).toBe(400);
    expect((await send({ phone: '', email: '' })).status).toBe(400);
    expect((await send({ status: 'resolved' })).status).toBe(400);
    expect((await send({ message: 'x'.repeat(2001) })).status).toBe(400);
    expect(await ContactMessage.countDocuments()).toBe(0);
  });
});
