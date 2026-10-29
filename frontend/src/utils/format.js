export const UNIT_LABELS = {
  bag: 'kiish',
  piece: 'xabbo',
  meter: 'mitir',
  bundle: 'xirmo',
  ton: 'tan',
  kg: 'kg',
  liter: 'litir',
  box: 'kartoon',
  roll: 'duub',
  sheet: 'xaashi',
};
export const UNITS = Object.keys(UNIT_LABELS);
export const unitLabel = (unit) => UNIT_LABELS[unit] || unit;

export const ORDER_STATUS_LABELS = {
  pending: 'Sugaya',
  confirmed: 'La xaqiijiyey',
  processing: 'La diyaarinayo',
  ready_for_pickup: 'Diyaar u ah qaadasho',
  out_for_delivery: 'Waddada ku jira',
  delivered: 'La gaarsiiyey',
  cancelled: 'La joojiyey',
};

// Waa in ay la mid ahaataa backend/config/constants.js
export const ORDER_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['ready_for_pickup', 'out_for_delivery', 'cancelled'],
  ready_for_pickup: ['delivered', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function nextStatuses(order) {
  return (ORDER_TRANSITIONS[order.orderStatus] || []).filter((s) => {
    if (s === 'ready_for_pickup') return order.fulfillmentMethod === 'pickup';
    if (s === 'out_for_delivery') return order.fulfillmentMethod === 'delivery';
    return true;
  });
}

export const PAYMENT_STATUS_LABELS = { unpaid: 'Lama bixin', paid: 'La bixiyey', refunded: 'La celiyey' };
export const FULFILLMENT_LABELS = { delivery: 'Gaarsiin', pickup: 'Ka qaado bakhaarka' };
export const MOVEMENT_LABELS = {
  initial: 'Kayd bilow',
  receipt: 'Alaab la helay',
  adjustment: 'Hagaajin',
  sale: 'Dalab online',
  cancellation_restore: 'Dalab la joojiyey',
  pos_sale: 'Iib POS',
  refund_restock: 'Celin (POS)',
};
export const MESSAGE_STATUS_LABELS = { new: 'Cusub', read: 'La akhriyey', resolved: 'La xalliyey' };
export const ROLE_LABELS = { admin: 'Maamule', manager: 'Manager', staff: 'Shaqaale xafiis', cashier: 'Kaashiye' };
export const ROLE_HINTS = {
  admin: 'Awood buuxda',
  manager: 'Xafiiska + kormeerka POS (oggolaansho, celin, shifts, warbixinno)',
  staff: 'Alaab, dalabyo online ah, kayd. POS ma galo',
  cashier: 'POS kaliya: iib, iibkiisa, shift-kiisa',
};
export const SALE_STATUS_LABELS = { completed: 'La dhammeeyey', partially_refunded: 'Qayb la celiyey', refunded: 'La celiyey' };
export const PAYMENT_TYPE_LABELS = { cash: 'Caddaan', mobile_money: 'Mobile Money', bank_transfer: 'Bangi', other: 'Kale' };
export const AUDIT_LABELS = {
  'sale.completed': 'Iib la dhammeeyey',
  'sale.failed': 'Iib fashilmay',
  'sale.discount_approved': 'Qiimo-dhimis la oggolaaday',
  'refund.created': 'Celin',
  'shift.opened': 'Shift la furay',
  'shift.closed': 'Shift la xiray',
  'shift.cash_adjustment': 'Hagaajin lacag',
  'receipt.reprinted': 'Rasiid dib loo daabacay',
};

export function formatMoney(amount, currency = 'USD') {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function formatQty(n) {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? v.toLocaleString('en-US') : v.toLocaleString('en-US', { maximumFractionDigits: 3 });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Lul', 'Ago', 'Seb', 'Okt', 'Nof', 'Dis'];

export function formatDate(value, withTime = false) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  if (!withTime) return date;
  return `${date}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0'));
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10).join('')}`;
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
