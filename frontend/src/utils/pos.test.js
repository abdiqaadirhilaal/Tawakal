import { describe, expect, test } from 'vitest';
import { cashSuggestions, changeDue, clampPosQuantity, discountState, posTotals, refundEstimate } from './pos.js';

const items = [{ price: 7.5, quantity: 20 }, { price: 0.25, quantity: 300 }]; // 150 + 75
const policy = { discountsEnabled: true, cashierMaxDiscountPercent: 5, maxDiscountPercent: 20 };

describe('xisaabinta kaashka', () => {
  test('wadarta iyo qiimo-dhimista', () => {
    expect(posTotals(items, null)).toEqual({ subtotal: 225, discountAmount: 0, percent: 0, grandTotal: 225 });
    expect(posTotals(items, { kind: 'percent', value: '10' })).toEqual({ subtotal: 225, discountAmount: 22.5, percent: 10, grandTotal: 202.5 });
    expect(posTotals(items, { kind: 'amount', value: 25 }).grandTotal).toBe(200);
  });

  test('qiimo-dhimistu wadarta kama badnaan karto (wadar taban ma jirto)', () => {
    expect(posTotals(items, { kind: 'amount', value: 9999 })).toEqual({ subtotal: 225, discountAmount: 225, percent: 100, grandTotal: 0 });
    expect(posTotals(items, { kind: 'percent', value: -5 }).discountAmount).toBe(0);
    expect(posTotals(items, { kind: 'percent', value: 'abc' }).discountAmount).toBe(0);
  });

  test('siyaasadda qiimo-dhimista', () => {
    expect(discountState(0, policy, false)).toBe('none');
    expect(discountState(5, policy, false)).toBe('ok');
    expect(discountState(15, policy, false)).toBe('approval');
    expect(discountState(15, policy, true)).toBe('ok');
    expect(discountState(25, policy, true)).toBe('blocked');
    expect(discountState(1, { ...policy, discountsEnabled: false }, true)).toBe('blocked');
  });

  test('lacagta la helay iyo baaqiga', () => {
    expect(changeDue(225, 250)).toEqual({ sufficient: true, change: 25 });
    expect(changeDue(20, '20')).toEqual({ sufficient: true, change: 0 });
    expect(changeDue(20, 19.99)).toEqual({ sufficient: false, change: 0 });
    expect(changeDue(20, 'x').sufficient).toBe(false);
    expect(cashSuggestions(37.5)).toEqual([37.5, 38, 40, 50, 100]);
  });

  test('tirada: tiro dhan ama jajab sida alaabta loo dejiyey', () => {
    expect(clampPosQuantity(2.7, { allowDecimal: false })).toBe(2);
    expect(clampPosQuantity(0, { allowDecimal: false })).toBe(1);
    expect(clampPosQuantity(2.5, { allowDecimal: true })).toBe(2.5);
  });

  test('qiyaasta celinta waxay isticmaashaa qiimaha saafiga ah', () => {
    const item = { quantity: 10, refundedQuantity: 0, netTotal: 90, refundedAmount: 0 };
    expect(refundEstimate(item, 4)).toBe(36);
    expect(refundEstimate({ ...item, refundedQuantity: 7, refundedAmount: 63 }, 3)).toBe(27);
    expect(refundEstimate(item, 0)).toBe(0);
  });
});
