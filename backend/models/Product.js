const mongoose = require('mongoose');
const { UNITS } = require('../config/constants');

const nonNegative = { validator: (v) => Number.isFinite(v) && v >= 0, message: '{PATH} waa in uusan ka yaraan 0' };

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 40 },
    // Barcode ikhtiyaari ah (scanner-ka POS). Madhan = ma laha.
    barcode: { type: String, default: '', trim: true, maxlength: 64 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    description: { type: String, default: '', trim: true, maxlength: 3000 },
    price: { type: Number, required: true, validate: nonNegative },
    // costPrice waa xog gudaha ah; weligeed looma soo celiyo dadweynaha.
    costPrice: { type: Number, default: 0, validate: nonNegative },
    unit: { type: String, enum: UNITS, required: true, default: 'piece' },
    // true = waxaa lagu iibin karaa tiro jajab ah (tusaale 2.5 mitir)
    allowDecimal: { type: Boolean, default: false },
    stock: { type: Number, default: 0, validate: nonNegative },
    lowStockThreshold: { type: Number, default: 10, validate: nonNegative },
    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.index({ isArchived: 1, isActive: 1, category: 1 });
productSchema.index({ name: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isFeatured: 1 });
// Barcode-ku waa in uu gaar ahaadaa, laakiin alaab badan ayaa madhnaan karta.
productSchema.index({ barcode: 1 }, { unique: true, partialFilterExpression: { barcode: { $gt: '' } } });

module.exports = mongoose.model('Product', productSchema);
