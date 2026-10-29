import { formatMoney, formatQty, unitLabel } from './format.js';

export const hasWhatsApp = (settings) => Boolean(settings && /^\d{8,15}$/.test(settings.whatsappNumber || ''));

export function whatsappUrl(number, message) {
  const digits = String(number || '').replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

const company = (s) => [s?.companyName || 'TAWAKAL', s?.tagline].filter(Boolean).join(' ');

export function productMessage(product, quantity, settings) {
  const cur = settings?.currency || 'USD';
  const qty = quantity || 1;
  return [
    `Asc ${company(settings)},`,
    'Waxaan rabaa in aan dalbado:',
    `• ${product.name} (${product.sku})`,
    `  Tirada: ${formatQty(qty)} ${unitLabel(product.unit)}`,
    `  Qiimaha la muujiyey: ${formatMoney(product.price, cur)} / ${unitLabel(product.unit)}`,
    `Qiyaasta wadarta: ${formatMoney(product.price * qty, cur)}`,
    '',
    'Fadlan ii xaqiiji helitaanka iyo qiimaha.',
  ].join('\n');
}

export function cartMessage(items, totals, settings, customerName) {
  const cur = settings?.currency || 'USD';
  const lines = items.map(
    (i) => `• ${i.name} (${i.sku}): ${formatQty(i.quantity)} ${unitLabel(i.unit)} x ${formatMoney(i.price, cur)} = ${formatMoney(i.price * i.quantity, cur)}`
  );
  return [
    `Asc ${company(settings)},`,
    customerName ? `Magacaygu waa ${customerName}.` : null,
    'Waxaan rabaa in aan dalbado alaabtan:',
    ...lines,
    `Qiyaasta wadarta alaabta: ${formatMoney(totals.subtotal, cur)}`,
    '',
    'Fiiro: farriintani waa codsi, dalabkan weli laguma kaydin nidaamka. Fadlan ii xaqiiji helitaanka iyo qiimaha.',
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export function orderMessage(order, settings) {
  const cur = order.currency || settings?.currency || 'USD';
  const lines = order.items.map((i) => `• ${i.name}: ${formatQty(i.quantity)} ${unitLabel(i.unit)} = ${formatMoney(i.lineTotal, cur)}`);
  return [
    `Asc ${company(settings)},`,
    `Waxaan website-ka ka sameeyey dalab lambarkiisu yahay ${order.orderNumber}.`,
    `Magaca: ${order.customerName}`,
    ...lines,
    `Wadarta: ${formatMoney(order.total, cur)}`,
    '',
    'Fadlan ii xaqiiji dalabka.',
  ].join('\n');
}

export const generalMessage = (settings) => `Asc ${company(settings)}, waxaan rabaa in aan wax idin weydiiyo.`;
