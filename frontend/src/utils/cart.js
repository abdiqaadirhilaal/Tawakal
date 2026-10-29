import { round2 } from './format.js';

// Mantiqa dambiisha (pure functions) si loo tijaabin karo.

export function clampQuantity(quantity, { stock, allowDecimal }) {
  let q = Number(quantity);
  if (!Number.isFinite(q)) q = 1;
  q = allowDecimal ? Math.round(q * 1000) / 1000 : Math.floor(q);
  const min = allowDecimal ? 0.001 : 1;
  if (q < min) q = min;
  if (Number.isFinite(stock) && q > stock) q = stock;
  return q;
}

export function addItem(items, product, quantity = 1) {
  if (!product || product.stock <= 0) return items;
  const existing = items.find((i) => i.productId === product.id);
  const wanted = (existing ? existing.quantity : 0) + quantity;
  const next = {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    unit: product.unit,
    price: product.price,
    image: product.images && product.images[0] ? product.images[0] : '',
    categorySlug: product.category ? product.category.slug : '',
    stock: product.stock,
    allowDecimal: Boolean(product.allowDecimal),
    quantity: clampQuantity(wanted, product),
  };
  return existing ? items.map((i) => (i.productId === product.id ? next : i)) : [...items, next];
}

export function setQuantity(items, productId, quantity) {
  return items.map((i) => (i.productId === productId ? { ...i, quantity: clampQuantity(quantity, i) } : i));
}

export const removeItem = (items, productId) => items.filter((i) => i.productId !== productId);

export const lineTotal = (item) => round2(item.price * item.quantity);

// Qiyaas kaliya: wadarta rasmiga ah waxaa xisaabiya server-ka.
export function estimateTotals(items, settings, fulfillmentMethod = 'pickup') {
  const subtotal = round2(items.reduce((sum, i) => sum + lineTotal(i), 0));
  let deliveryFee = 0;
  if (fulfillmentMethod === 'delivery' && settings) {
    const fee = Number(settings.deliveryFee) || 0;
    const threshold = Number(settings.freeDeliveryThreshold) || 0;
    deliveryFee = threshold > 0 && subtotal >= threshold ? 0 : round2(fee);
  }
  return { subtotal, deliveryFee, total: round2(subtotal + deliveryFee) };
}

export const cartCount = (items) => items.length;
