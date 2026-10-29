const mongoose = require('mongoose');
const { MOVEMENT_TYPES } = require('../config/constants');

const { ObjectId } = mongoose.Schema.Types;

const movementSchema = new mongoose.Schema(
  {
    product: { type: ObjectId, ref: 'Product', required: true, index: true },
    type: { type: String, enum: MOVEMENT_TYPES, required: true, index: true },
    quantityChange: { type: Number, required: true },
    stockBefore: { type: Number, required: true },
    stockAfter: { type: Number, required: true, min: 0 },
    reason: { type: String, default: '', trim: true, maxlength: 300 },
    unitCost: { type: Number, default: null, min: 0 },
    supplier: { type: String, default: '', trim: true, maxlength: 120 },
    refType: { type: String, enum: ['order', 'receipt', 'manual', 'sale', 'refund', null], default: null },
    refId: { type: ObjectId, default: null },
    refLabel: { type: String, default: '' },
    user: { type: ObjectId, ref: 'User', default: null },
    // Ka hortagga in isla isbeddelka laba jeer la diiwaangeliyo.
    idempotencyKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

movementSchema.index({ createdAt: -1 });

module.exports = mongoose.model('InventoryMovement', movementSchema);
