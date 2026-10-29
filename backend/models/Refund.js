const mongoose = require('mongoose');
const { POS_PAYMENT_TYPES } = require('../config/constants');

const { ObjectId } = mongoose.Schema.Types;

const refundSchema = new mongoose.Schema(
  {
    refundNumber: { type: String, required: true, unique: true },
    sale: { type: ObjectId, ref: 'Sale', required: true, index: true },
    saleNumber: { type: String, required: true },
    receiptNumber: { type: String, required: true },
    items: [
      {
        _id: false,
        product: { type: ObjectId, ref: 'Product', required: true },
        sku: { type: String, required: true },
        name: { type: String, required: true },
        unit: { type: String, required: true },
        quantity: { type: Number, required: true, min: 0 },
        amount: { type: Number, required: true, min: 0 },
        // true = alaabta gacanta ayaa lagu soo celiyey waana la iibin karaa: kaydka ayaa lagu daray
        restocked: { type: Boolean, default: false },
      },
    ],
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    reason: { type: String, required: true, trim: true, maxlength: 300 },
    method: {
      code: { type: String, required: true },
      label: { type: String, required: true },
      type: { type: String, enum: POS_PAYMENT_TYPES, required: true },
    },
    processedBy: { type: ObjectId, ref: 'User', required: true, index: true },
    processedByName: { type: String, required: true },
    approvedBy: { type: ObjectId, ref: 'User', default: null },
    approvedByName: { type: String, default: '' },
    // Shift-ka lacagta caddaanka ah laga bixiyey (celinta cash-ka ah)
    shift: { type: ObjectId, ref: 'CashierShift', default: null, index: true },
    inventoryRestocked: { type: Boolean, default: false },
    status: { type: String, enum: ['completed'], default: 'completed' },
    idempotencyKey: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

refundSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Refund', refundSchema);
