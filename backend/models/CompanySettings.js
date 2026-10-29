const mongoose = require('mongoose');
const { POS_PAYMENT_TYPES } = require('../config/constants');

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    companyName: { type: String, default: 'TAWAKAL', trim: true, maxlength: 80 },
    tagline: { type: String, default: 'BUILDING MATERIALS & SUPPLIES', trim: true, maxlength: 120 },
    logoUrl: { type: String, default: '' },
    announcement: { type: String, default: '', trim: true, maxlength: 200 },
    phone: { type: String, default: '', trim: true, maxlength: 30 },
    // Lambar caalami ah oo aan lahayn "+" ama meelo bannaan, tusaale 25261XXXXXXX
    whatsappNumber: { type: String, default: '', trim: true, maxlength: 20 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 160 },
    address: { type: String, default: '', trim: true, maxlength: 250 },
    businessHours: { type: String, default: '', trim: true, maxlength: 200 },
    mapUrl: { type: String, default: '', trim: true, maxlength: 600 },
    aboutIntro: { type: String, default: '', trim: true, maxlength: 3000 },
    mission: { type: String, default: '', trim: true, maxlength: 1500 },
    vision: { type: String, default: '', trim: true, maxlength: 1500 },
    currency: { type: String, default: 'USD', uppercase: true, trim: true, maxlength: 5 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    // 0 = ma jiro gaarsiin bilaash ah
    freeDeliveryThreshold: { type: Number, default: 0, min: 0 },
    paymentMethods: {
      type: [
        {
          _id: false,
          code: { type: String, required: true },
          label: { type: String, required: true, trim: true, maxlength: 80 },
          enabled: { type: Boolean, default: true },
        },
      ],
      default: () => [
        { code: 'cash_on_delivery', label: 'Lacag caddaan ah marka alaabta la keeno', enabled: true },
        { code: 'pay_at_warehouse', label: 'Ku bixi bakhaarka', enabled: true },
      ],
    },
    lowStockDefault: { type: Number, default: 10, min: 0 },
    // Dejinta kaashka (POS). Hababkan waa kuwo ka duwan hababka dalabka online-ka ah.
    pos: {
      requireOpenShift: { type: Boolean, default: true },
      discountsEnabled: { type: Boolean, default: true },
      // Boqolleyda ugu badan ee kaashiyuhu bixin karo isagoon oggolaansho u baahnayn
      cashierMaxDiscountPercent: { type: Number, default: 5, min: 0, max: 100 },
      // Boqolleyda ugu badan ee guud ahaan la oggol yahay (xitaa marka maamule oggolaado)
      maxDiscountPercent: { type: Number, default: 20, min: 0, max: 100 },
      receiptFooter: { type: String, default: 'Mahadsanid. Soo noqo mar kale.', trim: true, maxlength: 200 },
      paymentMethods: {
        type: [
          {
            _id: false,
            code: { type: String, required: true },
            label: { type: String, required: true, trim: true, maxlength: 60 },
            type: { type: String, enum: POS_PAYMENT_TYPES, required: true },
            enabled: { type: Boolean, default: true },
          },
        ],
        default: () => [
          { code: 'cash', label: 'Lacag caddaan ah', type: 'cash', enabled: true },
          { code: 'mobile_money', label: 'Mobile Money', type: 'mobile_money', enabled: true },
          { code: 'bank_transfer', label: 'Xawaalad bangi', type: 'bank_transfer', enabled: true },
        ],
      },
    },
    socialLinks: {
      facebook: { type: String, default: '', trim: true, maxlength: 300 },
      instagram: { type: String, default: '', trim: true, maxlength: 300 },
      tiktok: { type: String, default: '', trim: true, maxlength: 300 },
    },
  },
  { timestamps: true }
);

settingsSchema.statics.getSingleton = async function getSingleton() {
  const existing = await this.findOne({ key: 'main' });
  if (existing) return existing;
  try {
    return await this.create({ key: 'main' });
  } catch (err) {
    if (err.code === 11000) return this.findOne({ key: 'main' });
    throw err;
  }
};

const PUBLIC_FIELDS = [
  'companyName', 'tagline', 'logoUrl', 'announcement', 'phone', 'whatsappNumber', 'email', 'address',
  'businessHours', 'mapUrl', 'aboutIntro', 'mission', 'vision', 'currency', 'deliveryFee',
  'freeDeliveryThreshold', 'socialLinks',
];

// Dejinta POS ee kaashiyaha loo diro (xog gudaha ah oo dheeraad ah kuma jirto).
settingsSchema.methods.toPosJSON = function toPosJSON() {
  return {
    companyName: this.companyName,
    tagline: this.tagline,
    logoUrl: this.logoUrl,
    phone: this.phone,
    address: this.address,
    currency: this.currency,
    requireOpenShift: this.pos.requireOpenShift,
    discountsEnabled: this.pos.discountsEnabled,
    cashierMaxDiscountPercent: this.pos.cashierMaxDiscountPercent,
    maxDiscountPercent: this.pos.maxDiscountPercent,
    receiptFooter: this.pos.receiptFooter,
    paymentMethods: this.pos.paymentMethods.filter((m) => m.enabled).map((m) => ({ code: m.code, label: m.label, type: m.type })),
  };
};

settingsSchema.methods.toPublicJSON = function toPublicJSON() {
  const out = {};
  PUBLIC_FIELDS.forEach((f) => { out[f] = this[f]; });
  out.paymentMethods = this.paymentMethods.filter((m) => m.enabled).map((m) => ({ code: m.code, label: m.label }));
  return out;
};

module.exports = mongoose.model('CompanySettings', settingsSchema);
