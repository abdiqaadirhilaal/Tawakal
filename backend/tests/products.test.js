const { app, request, startDb, stopDb, clearDb, loginAs, createCategory, createProduct } = require('./helpers');
const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const body = (category, extra = {}) => ({ name: 'Sibidh 50kg', sku: 'cem-001', category: category._id.toString(), price: 7.5, unit: 'bag', ...extra });

describe('Maamulka alaabta', () => {
  test('abuurid + cusboonaysiin', async () => {
    const { agent } = await loginAs('admin');
    const cat = await createCategory();
    const created = await agent.post('/api/admin/products').send(body(cat, { stock: 20, costPrice: 6 }));
    expect(created.status).toBe(201);
    expect(created.body.data.sku).toBe('CEM-001');
    expect(created.body.data.slug).toBe('sibidh-50kg');
    expect(created.body.data.costPrice).toBe(6);
    // kaydka bilowga ah waa la diiwaangeliyey
    expect(await InventoryMovement.countDocuments({ type: 'initial', quantityChange: 20 })).toBe(1);

    const updated = await agent.patch(`/api/admin/products/${created.body.data.id}`).send({ price: 8, isFeatured: true });
    expect(updated.status).toBe(200);
    expect(updated.body.data.price).toBe(8);
  });

  test('qiimo aan sax ahayn waa la diidaa', async () => {
    const { agent } = await loginAs('admin');
    const cat = await createCategory();
    for (const price of [-1, 'abc', null, Infinity]) {
      const res = await agent.post('/api/admin/products').send(body(cat, { price }));
      expect(res.status).toBe(400);
    }
    expect(await Product.countDocuments()).toBe(0);
  });

  test('magac madhan iyo kayd taban waa la diidaa', async () => {
    const { agent } = await loginAs('admin');
    const cat = await createCategory();
    expect((await agent.post('/api/admin/products').send(body(cat, { name: ' ' }))).status).toBe(400);
    expect((await agent.post('/api/admin/products').send(body(cat, { stock: -5 }))).status).toBe(400);
  });

  test('SKU waa in uu gaar ahaadaa (409)', async () => {
    const { agent } = await loginAs('admin');
    const cat = await createCategory();
    await agent.post('/api/admin/products').send(body(cat));
    const dup = await agent.post('/api/admin/products').send(body(cat, { name: 'Mid kale', sku: 'CEM-001' }));
    expect(dup.status).toBe(409);
  });

  test('kaydka laguma beddeli karo PATCH-ka alaabta; goobo aan la aqoon waa la diidaa', async () => {
    const { agent } = await loginAs('admin');
    const p = await createProduct({ stock: 10 });
    expect((await agent.patch(`/api/admin/products/${p._id}`).send({ stock: 999 })).status).toBe(400);
    expect((await agent.patch(`/api/admin/products/${p._id}`).send({ isArchived: true, slug: 'x' })).status).toBe(400);
    expect((await Product.findById(p._id)).stock).toBe(10);
  });

  test('ID aan sax ahayn = 400', async () => {
    const { agent } = await loginAs('admin');
    expect((await agent.get('/api/admin/products/not-an-id')).status).toBe(400);
  });

  test('shaqaale ma arko mana beddeli karo costPrice', async () => {
    const { agent } = await loginAs('staff');
    const p = await createProduct({ costPrice: 4 });
    const list = await agent.get('/api/admin/products');
    expect(list.body.data[0].costPrice).toBeUndefined();
    expect((await agent.patch(`/api/admin/products/${p._id}`).send({ costPrice: 1 })).status).toBe(403);
  });

  test('tirtiriddu waa kayd-gelin (archive), dadweynuhuna ma arko', async () => {
    const { agent } = await loginAs('admin');
    const p = await createProduct();
    expect((await agent.delete(`/api/admin/products/${p._id}`)).status).toBe(200);
    const doc = await Product.findById(p._id);
    expect(doc.isArchived).toBe(true);
    expect((await request(app).get(`/api/products/${p._id}`)).status).toBe(404);
  });

  test('qayb alaab leh lama tirtiri karo', async () => {
    const { agent } = await loginAs('admin');
    const cat = await createCategory('Bir');
    await createProduct({ category: cat });
    expect((await agent.delete(`/api/admin/categories/${cat._id}`)).status).toBe(409);
  });
});

describe('Alaabta dadweynaha', () => {
  test('raadin, kala-saarid, bog-u-qaybin iyo sirta xogta', async () => {
    const cat = await createCategory('Sibidh');
    const other = await createCategory('Bir');
    for (let i = 1; i <= 15; i += 1) {
      await createProduct({ name: `Sibidh nooc ${String(i).padStart(2, '0')}`, price: i, category: cat });
    }
    await createProduct({ name: 'Baliig 12mm', sku: 'STL-012', category: other });
    await createProduct({ name: 'Qarsoon', isActive: false, category: cat });

    const page1 = await request(app).get('/api/products?limit=10&sort=price_asc');
    expect(page1.status).toBe(200);
    expect(page1.body.data).toHaveLength(10);
    expect(page1.body.pagination).toEqual({ page: 1, limit: 10, total: 16, totalPages: 2 });
    expect(page1.body.data[0].price).toBeLessThanOrEqual(page1.body.data[1].price);

    const page2 = await request(app).get('/api/products?limit=10&page=2&sort=price_asc');
    expect(page2.body.data).toHaveLength(6);

    const bySku = await request(app).get('/api/products?search=stl-012');
    expect(bySku.body.data).toHaveLength(1);
    expect(bySku.body.data[0].name).toBe('Baliig 12mm');

    const byCat = await request(app).get('/api/products?category=bir');
    expect(byCat.body.pagination.total).toBe(1);

    // xogta gudaha lama muujiyo
    const json = JSON.stringify(page1.body);
    expect(json).not.toMatch(/costPrice/);
    expect(json).not.toMatch(/lowStockThreshold/);
  });

  test('query aan sax ahayn waa la diidaa; xarfaha regex-ka waa la nadiifiyaa', async () => {
    await createProduct({ name: 'Tuubo (2 inji)' });
    expect((await request(app).get('/api/products?limit=1000')).status).toBe(400);
    expect((await request(app).get('/api/products?page=0')).status).toBe(400);
    expect((await request(app).get('/api/products?sort=drop')).status).toBe(400);
    expect((await request(app).get('/api/products?search[$ne]=x')).status).toBe(400);
    const res = await request(app).get('/api/products').query({ search: '(2 inji)' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    const wild = await request(app).get('/api/products').query({ search: '.*' });
    expect(wild.body.data).toHaveLength(0);
  });

  test('dejinta dadweynaha kuma jiraan goobo gudaha ah', async () => {
    const res = await request(app).get('/api/settings/public');
    expect(res.status).toBe(200);
    expect(res.body.data.lowStockDefault).toBeUndefined();
    expect(res.body.data.currency).toBe('USD');
    expect(res.body.data.paymentMethods.every((m) => m.enabled === undefined)).toBe(true);
  });
});
