const UNITS = ['bag', 'piece', 'meter', 'bundle', 'ton', 'kg', 'liter', 'box', 'roll', 'sheet'];

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

// Siyaasadda u gudubka xaaladaha dalabka.
const ORDER_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['ready_for_pickup', 'out_for_delivery', 'cancelled'],
  ready_for_pickup: ['delivered', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded'];
const FULFILLMENT_METHODS = ['delivery', 'pickup'];
// 'sale' = dalab online ah, 'pos_sale' = iib toos ah oo kaashka laga sameeyey
const MOVEMENT_TYPES = ['initial', 'receipt', 'adjustment', 'sale', 'cancellation_restore', 'pos_sale', 'refund_restock'];
const MESSAGE_STATUSES = ['new', 'read', 'resolved'];
// admin   = awood buuxda
// manager = xafiiska (sida staff) + kormeerka POS: oggolaanshaha qiimo-dhimista, celinta, shifts
// staff   = xafiiska: alaab, dalabyo online ah, kayd (POS ma galo)
// cashier = POS kaliya: iib, iibkiisa, shift-kiisa
const ROLES = ['admin', 'manager', 'staff', 'cashier'];
const BACK_OFFICE_ROLES = ['admin', 'manager', 'staff'];
const POS_ROLES = ['admin', 'manager', 'cashier'];
const SUPERVISOR_ROLES = ['admin', 'manager'];
const POS_PAYMENT_TYPES = ['cash', 'mobile_money', 'bank_transfer', 'other'];
const SALE_STATUSES = ['completed', 'partially_refunded', 'refunded'];

module.exports = {
  UNITS,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  PAYMENT_STATUSES,
  FULFILLMENT_METHODS,
  MOVEMENT_TYPES,
  MESSAGE_STATUSES,
  ROLES,
  BACK_OFFICE_ROLES,
  POS_ROLES,
  SUPERVISOR_ROLES,
  POS_PAYMENT_TYPES,
  SALE_STATUSES,
};
