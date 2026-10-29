const mongoose = require('mongoose');
const { MESSAGE_STATUSES } = require('../config/constants');

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, default: '', trim: true, maxlength: 30 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 160 },
    subject: { type: String, default: '', trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: MESSAGE_STATUSES, default: 'new', index: true },
  },
  { timestamps: true }
);

contactMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
