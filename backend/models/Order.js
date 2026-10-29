const mongoose = require('mongoose');
const { ORDER_STATUSES, PAYMENT_STATUSES, FULFILLMENT_METHODS } = require('../config/constants');

const { ObjectId } = mongoose.Schema.Types;

// Sawir (snapshot) alaabta sida ay ahayd waqtiga iibka.
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    unit: { type: String, required: true },
    categoryName: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    // Ka hortagga dalab labo-jibbaarma haddii foomka laba jeer la diro.
    idempotencyKey: { type: String, unique: true, sparse: true },
    customer: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      phoneKey: { type: String, required: true, index: true },
      email: { type: String, default: '', trim: true, lowercase: true },
    },
    fulfillmentMethod: { type: String, enum: FULFILLMENT_METHODS, required: true },
    deliveryAddress: {
      address: { type: String, default: '', trim: true },
      district: { type: String, default: '', trim: true },
    },
    items: { type: [orderItemSchema], validate: (v) => v.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    paymentMethod: {
      code: { type: String, required: true },
      label: { type: String, required: true },
    },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid', index: true },
    orderStatus: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    statusHistory: [
      {
        _id: false,
        status: { type: String, enum: ORDER_STATUSES },
        at: { type: Date, default: Date.now },
        by: { type: ObjectId, ref: 'User', default: null },
      },
    ],
    customerNotes: { type: String, default: '', trim: true, maxlength: 1000 },
    internalNotes: [
      {
        text: { type: String, required: true, trim: true, maxlength: 1000 },
        by: { type: ObjectId, ref: 'User' },
        byName: String,
        at: { type: Date, default: Date.now },
      },
    ],
    stockRestored: { type: Boolean, default: false },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
