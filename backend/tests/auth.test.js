const { app, request, startDb, stopDb, clearDb, createUser, loginAs, PASSWORD } = require('./helpers');

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const xhr = (req) => req.set('X-Requested-With', 'XMLHttpRequest');

describe('Soo gelidda (login)', () => {
  test('waxay diiddaa xog aan sax ahayn (400)', async () => {
    const res = await xhr(request(app).post('/api/auth/login')).send({ email: 'not-an-email', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  test('waxay diiddaa goobo aan la aqoon (mass assignment)', async () => {
    await createUser('admin');
    const res = await xhr(request(app).post('/api/auth/login')).send({ email: 'admin@tawakal.test', password: PASSWORD, role: 'admin' });
    expect(res.status).toBe(400);
  });

  test('furaha khaldan = 401, farriin guud', async () => {
    await createUser('admin');
    const res = await xhr(request(app).post('/api/auth/login')).send({ email: 'admin@tawakal.test', password: 'khalad-khalad' });
    expect(res.status).toBe(401);
    const unknown = await xhr(request(app).post('/api/auth/login')).send({ email: 'nobody@tawakal.test', password: 'khalad-khalad' });
    expect(unknown.status).toBe(401);
    expect(unknown.body.message).toBe(res.body.message);
  });

  test('guul: cookie HttpOnly, passwordHash lama soo celiyo', async () => {
    await createUser('admin');
    const res = await xhr(request(app).post('/api/auth/login')).send({ email: 'admin@tawakal.test', password: PASSWORD });
    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/tawakal_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
    expect(res.body.data.user.role).toBe('admin');
  });

  test('akoonka waa la xiraa 5 isku day oo khaldan kadib', async () => {
    await createUser('admin');
    for (let i = 0; i < 5; i += 1) {
      await xhr(request(app).post('/api/auth/login')).send({ email: 'admin@tawakal.test', password: 'khalad-khalad' });
    }
    const res = await xhr(request(app).post('/api/auth/login')).send({ email: 'admin@tawakal.test', password: PASSWORD });
    expect(res.status).toBe(429);
  });

  test('beddelidda furaha waxay burisaa fadhiyadii hore', async () => {
    const { agent, user } = await loginAs('admin');
    const other = request.agent(app);
    other.set('X-Requested-With', 'XMLHttpRequest');
    await other.post('/api/auth/login').send({ email: user.email, password: PASSWORD });

    const res = await agent.patch('/api/auth/change-password').send({ currentPassword: PASSWORD, newPassword: 'Furaha-Cusub-987' });
    expect(res.status).toBe(200);
    expect((await agent.get('/api/auth/me')).status).toBe(200);
    expect((await other.get('/api/auth/me')).status).toBe(401);
  });
});

describe('Helitaanka maamulka', () => {
  test('la`aanta cookie = 401', async () => {
    const res = await request(app).get('/api/admin/products');
    expect(res.status).toBe(401);
  });

  test('token been ah = 401', async () => {
    const res = await request(app).get('/api/admin/products').set('Cookie', 'tawakal_token=abc.def.ghi');
    expect(res.status).toBe(401);
  });

  test('codsi wax beddelaya oo aan lahayn header-ka CSRF = 403', async () => {
    const { agent } = await loginAs('admin');
    const res = await agent.post('/api/admin/categories').unset('X-Requested-With').send({ name: 'Bir' });
    expect(res.status).toBe(403);
  });

  test('shaqaale (staff) ma beddeli karo dejinta, lacag bixinta, ama isticmaalayaasha', async () => {
    const { agent } = await loginAs('staff');
    expect((await agent.patch('/api/admin/settings').send({ deliveryFee: 1 })).status).toBe(403);
    expect((await agent.get('/api/admin/users')).status).toBe(403);
    expect((await agent.post('/api/admin/users').send({ name: 'X Y', email: 'x@y.test', password: 'Sir-Adag-12345', role: 'admin' })).status).toBe(403);
  });

  test('isticmaale la joojiyey ma geli karo', async () => {
    const { agent, user } = await loginAs('staff');
    user.isActive = false;
    await user.save();
    expect((await agent.get('/api/admin/products')).status).toBe(401);
  });

  test('waddo aan jirin = 404 qaab JSON ah, stack lama muujiyo', async () => {
    const res = await request(app).get('/api/waxaan-jirin');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: expect.any(String), errors: [] });
  });

  test('JSON jaban = 400', async () => {
    const res = await request(app).post('/api/contact').set('Content-Type', 'application/json').send('{"name":');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
