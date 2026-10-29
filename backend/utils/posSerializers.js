const id = (v) => (v ? v.toString() : null);

function saleRow(s) {
  return {
    id: s._id.toString(),
    saleNumber: s.saleNumber,
    receiptNumber: s.receiptNumber,
    completedAt: s.completedAt,
    cashierId: id(s.cashier),
    cashierName: s.cashierName,
    customerName: s.customerNameSnapshot,
    customerPhone: s.customerPhoneSnapshot,
    itemCount: s.items.length,
    subtotal: s.subtotal,
    totalDiscount: s.totalDiscount,
    grandTotal: s.grandTotal,
    refundedAmount: s.refundedAmount,
    currency: s.currency,
    paymentMethod: { code: s.paymentMethod.code, label: s.paymentMethod.label, type: s.paymentMethod.type },
    paymentStatus: s.paymentStatus,
    status: s.status,
  };
}

// Faahfaahinta iibka. costPrice weligeed kuma jiro (kaashiyeyaashu ma arkaan qiimaha iibsiga).
function sale(s) {
  return {
    ...saleRow(s),
    shiftId: id(s.shift),
    items: s.items.map((i) => ({
      productId: i.product.toString(),
      sku: i.sku,
      name: i.name,
      unit: i.unit,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
      discountShare: i.discountShare,
      netTotal: i.netTotal,
      refundedQuantity: i.refundedQuantity,
      refundedAmount: i.refundedAmount,
    })),
    discount: {
      kind: s.discount.kind,
      value: s.discount.value,
      percent: s.discount.percent,
      approvedByName: s.discount.approvedByName,
    },
    paymentVerification: s.paymentVerification,
    amountReceived: s.amountReceived,
    changeGiven: s.changeGiven,
    paymentReference: s.paymentReference,
  };
}

function refund(r) {
  return {
    id: r._id.toString(),
    refundNumber: r.refundNumber,
    saleId: r.sale.toString(),
    saleNumber: r.saleNumber,
    receiptNumber: r.receiptNumber,
    items: r.items.map((i) => ({ productId: i.product.toString(), sku: i.sku, name: i.name, unit: i.unit, quantity: i.quantity, amount: i.amount, restocked: i.restocked })),
    amount: r.amount,
    currency: r.currency,
    reason: r.reason,
    method: { code: r.method.code, label: r.method.label, type: r.method.type },
    processedByName: r.processedByName,
    approvedByName: r.approvedByName,
    inventoryRestocked: r.inventoryRestocked,
    status: r.status,
    createdAt: r.createdAt,
  };
}

function shift(s, summary) {
  return {
    id: s._id.toString(),
    cashierId: s.cashier.toString(),
    cashierName: s.cashierName,
    status: s.status,
    openedAt: s.openedAt,
    closedAt: s.closedAt,
    openingCash: s.openingCash,
    expectedClosingCash: s.expectedClosingCash,
    actualClosingCash: s.actualClosingCash,
    cashVariance: s.cashVariance,
    closingNotes: s.closingNotes,
    closedByName: s.closedByName,
    adjustments: s.adjustments.map((a) => ({ id: a._id.toString(), amount: a.amount, reason: a.reason, byName: a.byName, at: a.at })),
    // Shift furan: koobitaan hadda la xisaabiyey. Shift xiran: sawirkii la kaydiyey markii la xiray.
    summary: summary || s.totals || null,
  };
}

module.exports = { saleRow, sale, refund, shift };
