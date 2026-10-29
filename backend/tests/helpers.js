const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../app');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');

let mongod;

async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('tawakal_test'));
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}

async function stopDb() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

async function clearDb() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

const PASSWORD = 'Sir-Adag-12345';

async function createUser(role = 'admin', email = `${role}@tawakal.test`) {
  return User.create({ name: `Test ${role}`, email, role, passwordHash: await bcrypt.hash(PASSWORD, 4) });
}

// Agent soo galay oo wata cookie-ga iyo header-ka CSRF.
async function loginAs(role = 'admin', email) {
  const user = await createUser(role, email);
  const agent = request.agent(app);
  agent.set('X-Requested-With', 'XMLHttpRequest');
  const res = await agent.post('/api/auth/login').send({ email: user.email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user };
}

async function createCategory(name = 'Sibidh') {
  return Category.create({ name, slug: name.toLowerCase().replace(/\s+/g, '-') });
}

let skuCounter = 0;
async function createProduct(overrides = {}) {
  skuCounter += 1;
  const category = overrides.category || (await Category.findOne()) || (await createCategory());
  return Product.create({
    name: `Alaab ${skuCounter}`,
    slug: `alaab-${skuCounter}-${crypto.randomBytes(3).toString('hex')}`,
    sku: `TST-${String(skuCounter).padStart(4, '0')}`,
    price: 10,
    costPrice: 6,
    unit: 'piece',
    stock: 100,
    lowStockThreshold: 10,
    ...overrides,
    category: category._id || category,
  });
}

function orderPayload(items, overrides = {}) {
  return {
    idempotencyKey: crypto.randomUUID(),
    customer: { name: 'Macmiil Tijaabo', phone: '+252 61 500 0000' },
    fulfillmentMethod: 'pickup',
    paymentMethod: 'pay_at_warehouse',
    items,
    ...overrides,
  };
}

const uuid = () => crypto.randomUUID();

module.exports = { app, request, startDb, stopDb, clearDb, createUser, loginAs, createCategory, createProduct, orderPayload, uuid, PASSWORD };
