const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const shiftSchema = new mongoose.Schema(
  {
    cashier: { type: ObjectId, ref: 'User', required: true },
    cashierName: { type: String, required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
    openedAt: { type: Date, required: true },
    closedAt: { type: Date, default: null },
    openingCash: { type: Number, required: true, min: 0 },
    expectedClosingCash: { type: Number, default: null },
    actualClosingCash: { type: Number, default: null, min: 0 },
    cashVariance: { type: Number, default: null },
    closingNotes: { type: String, default: '', trim: true, maxlength: 500 },
    closedBy: { type: ObjectId, ref: 'User', default: null },
    closedByName: { type: String, default: '' },
    // Hagaajinta lacagta caddaanka ah (maamule/manager kaliya). Mid kasta waa diiwaan joogto ah.
    adjustments: [
      {
        amount: { type: Number, required: true },
        reason: { type: String, required: true, trim: true, maxlength: 300 },
        by: { type: ObjectId, ref: 'User', required: true },
        byName: { type: String, required: true },
        at: { type: Date, default: Date.now },
      },
    ],
    // Koobitaanka la xisaabiyey markii shift-ka la xiray (sawir joogto ah)
    totals: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

// Kaashiye kasta wuxuu yeelan karaa hal shift oo furan oo kaliya.
shiftSchema.index({ cashier: 1 }, { unique: true, partialFilterExpression: { status: 'open' } });
shiftSchema.index({ cashier: 1, openedAt: -1 });
shiftSchema.index({ openedAt: -1 });

module.exports = mongoose.model('CashierShift', shiftSchema);
