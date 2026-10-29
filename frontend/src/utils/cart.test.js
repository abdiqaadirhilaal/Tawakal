import { describe, expect, test } from 'vitest';
import { addItem, clampQuantity, estimateTotals, removeItem, setQuantity } from './cart.js';
import { nextStatuses } from './format.js';
import { cartMessage, hasWhatsApp, productMessage, whatsappUrl } from './whatsapp.js';

const cement = { id: 'p1', slug: 'sibidh', name: 'Sibidh 50kg', sku: 'CEM-001', unit: 'bag', price: 7.5, stock: 10, images: [], category: { slug: 'sibidh' } };
const cable = { id: 'p2', slug: 'xarig', name: 'Xarig', sku: 'ELC-1', unit: 'meter', price: 0.6, stock: 100, allowDecimal: true, images: [] };

describe('dambiisha', () => {
  test('ku darid, isku-darka tirada, iyo xadka kaydka', () => {
    let items = addItem([], cement, 4);
    items = addItem(items, cement, 3);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(7);
    items = addItem(items, cement, 50);
    expect(items[0].quantity).toBe(10); // kama badnaan karto kaydka
  });

  test('alaab dhammaatay laguma dari karo', () => {
    expect(addItem([], { ...cement, stock: 0 }, 1)).toEqual([]);
  });

  test('clampQuantity: tiro dhan iyo jajab', () => {
    expect(clampQuantity(2.7, { stock: 10, allowDecimal: false })).toBe(2);
    expect(clampQuantity(0, { stock: 10, allowDecimal: false })).toBe(1);
    expect(clampQuantity(-5, { stock: 10, allowDecimal: false })).toBe(1);
    expect(clampQuantity('abc', { stock: 10, allowDecimal: false })).toBe(1);
    expect(clampQuantity(2.5, { stock: 10, allowDecimal: true })).toBe(2.5);
    expect(clampQuantity(99, { stock: 10, allowDecimal: true })).toBe(10);
  });

  test('beddelid iyo ka saarid', () => {
    let items = addItem(addItem([], cement, 1), cable, 2.5);
    items = setQuantity(items, 'p1', 3);
    expect(items.find((i) => i.productId === 'p1').quantity).toBe(3);
    expect(removeItem(items, 'p1')).toHaveLength(1);
  });

  test('qiyaasta wadarta iyo kharashka gaarsiinta', () => {
    const items = addItem(addItem([], cement, 4), cable, 2.5); // 30 + 1.5
    const settings = { deliveryFee: 5, freeDeliveryThreshold: 100 };
    expect(estimateTotals(items, settings, 'pickup')).toEqual({ subtotal: 31.5, deliveryFee: 0, total: 31.5 });
    expect(estimateTotals(items, settings, 'delivery')).toEqual({ subtotal: 31.5, deliveryFee: 5, total: 36.5 });
    expect(estimateTotals(items, { deliveryFee: 5, freeDeliveryThreshold: 30 }, 'delivery').deliveryFee).toBe(0);
  });
});

describe('WhatsApp', () => {
  const settings = { companyName: 'TAWAKAL', tagline: '', whatsappNumber: '252615000000', currency: 'USD' };

  test('URL-ka waa la koodheeyaa', () => {
    const url = whatsappUrl('+252 61 500 0000', 'Asc & nabad\nlaba');
    expect(url).toBe('https://wa.me/252615000000?text=Asc%20%26%20nabad%0Alaba');
  });

  test('hasWhatsApp wuxuu u baahan yahay lambar sax ah', () => {
    expect(hasWhatsApp(settings)).toBe(true);
    expect(hasWhatsApp({ whatsappNumber: '' })).toBe(false);
    expect(hasWhatsApp({ whatsappNumber: '+252 61' })).toBe(false);
  });

  test('farriinta alaabta iyo dambiisha waxay wataan magac, tiro iyo qiime', () => {
    const msg = productMessage(cement, 4, settings);
    expect(msg).toContain('Sibidh 50kg (CEM-001)');
    expect(msg).toContain('4 kiish');
    expect(msg).toContain('$30.00');

    const items = addItem([], cement, 4);
    const cartMsg = cartMessage(items, estimateTotals(items, settings), settings, 'Axmed');
    expect(cartMsg).toContain('Axmed');
    expect(cartMsg).toContain('$30.00');
    expect(cartMsg).toContain('weli laguma kaydin nidaamka');
  });
});

describe('xaaladaha dalabka', () => {
  test('tallaabooyinka xiga waxay ku xiran yihiin habka helitaanka', () => {
    expect(nextStatuses({ orderStatus: 'processing', fulfillmentMethod: 'pickup' })).toEqual(['ready_for_pickup', 'cancelled']);
    expect(nextStatuses({ orderStatus: 'processing', fulfillmentMethod: 'delivery' })).toEqual(['out_for_delivery', 'cancelled']);
    expect(nextStatuses({ orderStatus: 'delivered', fulfillmentMethod: 'pickup' })).toEqual([]);
  });
});
