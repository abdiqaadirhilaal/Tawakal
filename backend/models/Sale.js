const mongoose = require('mongoose');
const { POS_PAYMENT_TYPES, SALE_STATUSES } = require('../config/constants');

const { ObjectId } = mongoose.Schema.Types;

// Sawir (snapshot) alaabta sida ay ahayd waqtiga iibka, si rasiidhadii hore ay sax u ahaadaan.
const saleItemSchema = new mongoose.Schema(
  {
    product: { type: ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    unit: { type: String, required: true },
    categoryName: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    // Qaybta qiimo-dhimista iibka ee safkan ku dhacday, iyo wadarta saafiga ah
    discountShare: { type: Number, default: 0, min: 0 },
    netTotal: { type: Number, required: true, min: 0 },
    refundedQuantity: { type: Number, default: 0, min: 0 },
    refundedAmount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: POS_PAYMENT_TYPES, required: true },
    amount: { type: Number, required: true, min: 0 },
    reference: { type: String, default: '' },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    saleNumber: { type: String, required: true, unique: true },
    receiptNumber: { type: String, required: true, unique: true },
    cashier: { type: ObjectId, ref: 'User', required: true },
    cashierName: { type: String, required: true },
    shift: { type: ObjectId, ref: 'CashierShift', default: null, index: true },
    customerNameSnapshot: { type: String, default: '', trim: true },
    customerPhoneSnapshot: { type: String, default: '', trim: true },
    items: { type: [saleItemSchema], validate: (v) => v.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    totalDiscount: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    discount: {
      kind: { type: String, enum: ['none', 'percent', 'amount'], default: 'none' },
      value: { type: Number, default: 0 },
      percent: { type: Number, default: 0 },
      appliedBy: { type: ObjectId, ref: 'User', default: null },
      approvedBy: { type: ObjectId, ref: 'User', default: null },
      approvedByName: { type: String, default: '' },
    },
    // Hal hab lacag bixin iibkiiba (nooca 1aad). "payments" waa liis si lacag-bixin
    // la kala qaybiyey (split) mustaqbalka loogu dari karo iyada oo aan model-ka la beddelin.
    paymentMethod: {
      code: { type: String, required: true },
      label: { type: String, required: true },
      type: { type: String, enum: POS_PAYMENT_TYPES, required: true },
    },
    payments: { type: [paymentSchema], default: [] },
    paymentStatus: { type: String, enum: ['paid', 'partially_refunded', 'refunded'], default: 'paid' },
    // 'cash' = kaashiyaha ayaa gacanta ku qabtay. 'recorded_unverified' = kaashiyaha ayaa diiwaangeliyey
    // (mobile money / bangi); nidaamku si toos ah uma xaqiijin lacagtaas.
    paymentVerification: { type: String, enum: ['cash', 'recorded_unverified'], required: true },
    amountReceived: { type: Number, required: true, min: 0 },
    changeGiven: { type: Number, default: 0, min: 0 },
    paymentReference: { type: String, default: '', trim: true },
    status: { type: String, enum: SALE_STATUSES, default: 'completed', index: true },
    refundedAmount: { type: Number, default: 0, min: 0 },
    // Waxaa la kordhiyaa celin kasta: laba celin oo isku mar ah midkood uun baa guuleysanaya.
    refundVersion: { type: Number, default: 0 },
    idempotencyKey: { type: String, required: true, unique: true },
    completedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

saleSchema.index({ completedAt: -1 });
saleSchema.index({ cashier: 1, completedAt: -1 });
saleSchema.index({ 'paymentMethod.code': 1, completedAt: -1 });

module.exports = mongoose.model('Sale', saleSchema);
