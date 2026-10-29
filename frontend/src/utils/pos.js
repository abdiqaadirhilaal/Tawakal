import { round2 } from './format.js';

// Xisaabinta kaashka ee shaashadda (qiyaas). Wadarta rasmiga ah waxaa xisaabiya server-ka.

export const posLineTotal = (item) => round2(item.price * item.quantity);

export function posTotals(items, discount) {
  const subtotal = round2(items.reduce((sum, i) => sum + posLineTotal(i), 0));
  let discountAmount = 0;
  let percent = 0;
  const value = Number(discount?.value);
  if (discount && Number.isFinite(value) && value > 0 && subtotal > 0) {
    discountAmount = discount.kind === 'percent' ? round2((subtotal * value) / 100) : round2(value);
    if (discountAmount > subtotal) discountAmount = subtotal;
    percent = discount.kind === 'percent' ? Math.min(value, 100) : round2((discountAmount / subtotal) * 100);
  }
  return { subtotal, discountAmount, percent, grandTotal: round2(subtotal - discountAmount) };
}

// Xaaladda qiimo-dhimista marka loo eego siyaasadda: 'none' | 'ok' | 'approval' | 'blocked'
export function discountState(percent, config, isSupervisor) {
  if (!percent || percent <= 0) return 'none';
  if (!config?.discountsEnabled) return 'blocked';
  if (percent > config.maxDiscountPercent + 1e-9) return 'blocked';
  if (isSupervisor || percent <= config.cashierMaxDiscountPercent + 1e-9) return 'ok';
  return 'approval';
}

export function changeDue(grandTotal, amountReceived) {
  const received = Number(amountReceived);
  if (!Number.isFinite(received)) return { sufficient: false, change: 0 };
  return { sufficient: received + 1e-9 >= grandTotal, change: Math.max(0, round2(received - grandTotal)) };
}

// Soo jeedinno degdeg ah oo lacagta la helay ah: wadarta saxda ah + lacago wareegsan oo ka sarreeya.
export function cashSuggestions(grandTotal) {
  const out = [grandTotal];
  [1, 5, 10, 20, 50, 100].forEach((step) => {
    const up = Math.ceil(grandTotal / step) * step;
    if (up > grandTotal && !out.includes(up)) out.push(up);
  });
  return out.slice(0, 5);
}

export function clampPosQuantity(quantity, product) {
  let q = Number(quantity);
  if (!Number.isFinite(q)) q = 1;
  q = product.allowDecimal ? Math.round(q * 1000) / 1000 : Math.floor(q);
  const min = product.allowDecimal ? 0.001 : 1;
  if (q < min) q = min;
  return q;
}

// Qiyaasta lacagta la celinayo (isla qaacidada server-ka)
export function refundEstimate(saleItem, quantity) {
  const remaining = Math.round((saleItem.quantity - saleItem.refundedQuantity) * 1000) / 1000;
  if (!quantity || quantity <= 0) return 0;
  if (quantity >= remaining) return round2(saleItem.netTotal - saleItem.refundedAmount);
  return round2((saleItem.netTotal * quantity) / saleItem.quantity);
}
