/*
 * Xog TUSAALE ah (demo) oo loogu talagalay tijaabinta maxalliga ah.
 *   npm run seed
 *
 * Ammaanka:
 *  - Wuxuu diidaa in uu ku shaqeeyo NODE_ENV=production haddii aan la raacin --force.
 *  - Weligiis ma tirtiro mana beddelo xog jirta: wuxuu kaliya ku daraa qaybaha iyo
 *    alaabta aan weli jirin (SKU-yada tusaalaha ah waxay ku bilaabmaan "DEMO-").
 *  - Qiimayaashu waa tusaale, ma aha qiimaha dhabta ah ee TAWAKAL.
 *  - Ma abuuro dalabyo, macaamiil, ama markhaatiyaal been ah.
 */
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const Category = require('../models/Category');
const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');
const CompanySettings = require('../models/CompanySettings');
const { slugify } = require('../utils/helpers');

const NOTE = 'Xog tusaale ah: beddel sharraxaadda, qiimaha iyo kaydka.';

const CATEGORIES = [
  { name: 'Sibidh', slug: 'sibidh', description: 'Sibidh iyo alaabta la xiriirta (Cement)' },
  { name: 'Bir', slug: 'bir', description: 'Baliig iyo biraha dhismaha (Steel)' },
  { name: 'Tuubooyin', slug: 'tuubooyin', description: 'Tuubooyinka PVC iyo alaabta biyaha (Plumbing)' },
  { name: 'Leben iyo Bulukeeti', slug: 'leben-iyo-bulukeeti', description: 'Leben iyo bulukeeti (Bricks & Blocks)' },
  { name: 'Koronto', slug: 'koronto', description: 'Alaabta korontada (Electrical)' },
  { name: 'Rinji', slug: 'rinji', description: 'Rinji iyo alaabta dhammaystirka (Paints)' },
];

const PRODUCTS = [
  { sku: 'DEMO-CEM-001', name: 'Sibidh 50kg', cat: 'sibidh', unit: 'bag', price: 7.5, cost: 6.4, stock: 400, low: 50, featured: true },
  { sku: 'DEMO-CEM-002', name: 'Sibidh Cad 25kg', cat: 'sibidh', unit: 'bag', price: 9, cost: 7.5, stock: 60, low: 15 },
  { sku: 'DEMO-STL-010', name: 'Baliig 10mm (12m)', cat: 'bir', unit: 'piece', price: 6.2, cost: 5.3, stock: 800, low: 100, featured: true },
  { sku: 'DEMO-STL-012', name: 'Baliig 12mm (12m)', cat: 'bir', unit: 'piece', price: 8.9, cost: 7.6, stock: 650, low: 100, featured: true },
  { sku: 'DEMO-STL-016', name: 'Baliig 16mm (12m)', cat: 'bir', unit: 'piece', price: 15.5, cost: 13.4, stock: 8, low: 40 },
  { sku: 'DEMO-STL-W01', name: 'Silig Xirxir 1kg', cat: 'bir', unit: 'kg', price: 1.8, cost: 1.3, stock: 120, low: 20, decimal: true },
  { sku: 'DEMO-PVC-050', name: 'Tuubo PVC 2 inji (6m)', cat: 'tuubooyin', unit: 'piece', price: 5.5, cost: 4.2, stock: 150, low: 25, featured: true },
  { sku: 'DEMO-PVC-110', name: 'Tuubo PVC 4 inji (6m)', cat: 'tuubooyin', unit: 'piece', price: 12, cost: 9.8, stock: 90, low: 20 },
  { sku: 'DEMO-PVC-E50', name: 'Xagal PVC 2 inji', cat: 'tuubooyin', unit: 'piece', price: 0.8, cost: 0.5, stock: 0, low: 30 },
  { sku: 'DEMO-BRK-001', name: 'Leben Cas', cat: 'leben-iyo-bulukeeti', unit: 'piece', price: 0.25, cost: 0.17, stock: 12000, low: 2000, featured: true },
  { sku: 'DEMO-BLK-006', name: 'Bulukeeti 6 inji', cat: 'leben-iyo-bulukeeti', unit: 'piece', price: 0.65, cost: 0.48, stock: 5000, low: 800 },
  { sku: 'DEMO-ELC-C25', name: 'Xarig Koronto 2.5mm', cat: 'koronto', unit: 'meter', price: 0.6, cost: 0.42, stock: 2000, low: 300, decimal: true },
  { sku: 'DEMO-ELC-S01', name: 'Furaha Nalka (Switch)', cat: 'koronto', unit: 'piece', price: 1.5, cost: 0.95, stock: 220, low: 40 },
  { sku: 'DEMO-PNT-W20', name: 'Rinji Cad 20L', cat: 'rinji', unit: 'piece', price: 38, cost: 31, stock: 45, low: 10, featured: true },
  { sku: 'DEMO-PNT-B04', name: 'Burush Rinji 4 inji', cat: 'rinji', unit: 'piece', price: 2.2, cost: 1.4, stock: 75, low: 15 },
];

async function main() {
  if (env.isProd && !process.argv.includes('--force')) {
    console.error('Seed-ka waxaa loo diiday production. Haddii aad hubto, raaci --force.');
    process.exit(1);
  }
  await connectDB();
  try {
    await CompanySettings.getSingleton();

    const catIds = {};
    let newCats = 0;
    for (const c of CATEGORIES) {
      let doc = await Category.findOne({ $or: [{ slug: c.slug }, { name: c.name }] }).collation({ locale: 'en', strength: 2 });
      if (!doc) {
        doc = await Category.create(c);
        newCats += 1;
      }
      catIds[c.cat || c.slug] = doc._id;
    }

    let newProducts = 0;
    for (const p of PRODUCTS) {
      if (await Product.exists({ sku: p.sku })) continue;
      let slug = slugify(p.name);
      if (await Product.exists({ slug })) slug = `${slug}-${p.sku.toLowerCase()}`;
      const doc = await Product.create({
        name: p.name,
        slug,
        sku: p.sku,
        category: catIds[p.cat],
        description: NOTE,
        price: p.price,
        costPrice: p.cost,
        unit: p.unit,
        allowDecimal: Boolean(p.decimal),
        stock: p.stock,
        lowStockThreshold: p.low,
        isFeatured: Boolean(p.featured),
      });
      if (p.stock > 0) {
        await InventoryMovement.create({
          product: doc._id,
          type: 'initial',
          quantityChange: p.stock,
          stockBefore: 0,
          stockAfter: p.stock,
          reason: 'Kaydka bilowga ah (xog tusaale ah)',
          refType: 'manual',
        });
      }
      newProducts += 1;
    }

    console.log(`Seed waa dhammaaday: ${newCats} qayb cusub, ${newProducts} alaab cusub. Xog jirta lama taaban.`);
  } finally {
    await disconnectDB();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
