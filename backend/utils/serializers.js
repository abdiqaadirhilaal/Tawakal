const categoryRef = (c) =>
  c && c._id && c.name ? { id: c._id.toString(), name: c.name, slug: c.slug } : c ? { id: c.toString() } : null;

// Xogta alaabta ee dadweynaha: costPrice iyo lowStockThreshold kuma jiraan.
function publicProduct(p) {
  return {
    id: p._id.toString(),
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    category: categoryRef(p.category),
    description: p.description,
    price: p.price,
    unit: p.unit,
    allowDecimal: p.allowDecimal,
    stock: p.stock,
    inStock: p.stock > 0,
    images: p.images,
    isFeatured: p.isFeatured,
  };
}

// Xogta alaabta ee kaashka (POS): qiimaha iibsiga (cost) kuma jiro.
function posProduct(p) {
  return {
    id: p._id.toString(),
    name: p.name,
    sku: p.sku,
    barcode: p.barcode || '',
    category: categoryRef(p.category),
    price: p.price,
    unit: p.unit,
    allowDecimal: p.allowDecimal,
    stock: p.stock,
    image: p.images && p.images[0] ? p.images[0] : '',
  };
}

function adminProduct(p, user) {
  const out = {
    ...publicProduct(p),
    barcode: p.barcode || '',
    lowStockThreshold: p.lowStockThreshold,
    isActive: p.isActive,
    isArchived: p.isArchived,
    isLowStock: p.stock > 0 && p.stock <= p.lowStockThreshold,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
  if (user && user.role === 'admin') out.costPrice = p.costPrice;
  return out;
}

function category(c, extra = {}) {
  return {
    id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    description: c.description,
    image: c.image,
    isActive: c.isActive,
    ...extra,
  };
}

const orderItems = (o, withCost) =>
  o.items.map((i) => {
    const item = {
      productId: i.product.toString(),
      name: i.name,
      sku: i.sku,
      unit: i.unit,
      quantity: i.quantity,
      price: i.price,
      lineTotal: i.lineTotal,
    };
    if (withCost) item.costPrice = i.costPrice;
    return item;
  });

// Waxa macmiilku arko marka dalabkiisa la xaqiijiyo.
function orderConfirmation(o) {
  return {
    orderNumber: o.orderNumber,
    customerName: o.customer.name,
    fulfillmentMethod: o.fulfillmentMethod,
    deliveryAddress: o.deliveryAddress,
    items: orderItems(o, false),
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
    currency: o.currency,
    paymentMethod: o.paymentMethod.label,
    paymentStatus: o.paymentStatus,
    orderStatus: o.orderStatus,
    createdAt: o.createdAt,
  };
}

// Raadraaca dalabka: xog kooban oo ammaan ah (cinwaan, taleefan, email ma jiraan).
function orderTracking(o) {
  return {
    orderNumber: o.orderNumber,
    customerFirstName: o.customer.name.split(/\s+/)[0],
    fulfillmentMethod: o.fulfillmentMethod,
    orderStatus: o.orderStatus,
    paymentStatus: o.paymentStatus,
    statusHistory: o.statusHistory.map((h) => ({ status: h.status, at: h.at })),
    items: o.items.map((i) => ({ name: i.name, unit: i.unit, quantity: i.quantity, lineTotal: i.lineTotal })),
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
    currency: o.currency,
    createdAt: o.createdAt,
  };
}

function adminOrderRow(o) {
  return {
    id: o._id.toString(),
    orderNumber: o.orderNumber,
    customerName: o.customer.name,
    customerPhone: o.customer.phone,
    createdAt: o.createdAt,
    total: o.total,
    currency: o.currency,
    paymentMethod: o.paymentMethod.label,
    paymentStatus: o.paymentStatus,
    orderStatus: o.orderStatus,
    fulfillmentMethod: o.fulfillmentMethod,
    itemCount: o.items.length,
  };
}

function adminOrder(o, user) {
  return {
    ...adminOrderRow(o),
    customer: { name: o.customer.name, phone: o.customer.phone, email: o.customer.email, phoneKey: o.customer.phoneKey },
    deliveryAddress: o.deliveryAddress,
    items: orderItems(o, user && user.role === 'admin'),
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    customerNotes: o.customerNotes,
    internalNotes: o.internalNotes.map((n) => ({ id: n._id.toString(), text: n.text, byName: n.byName, at: n.at })),
    statusHistory: o.statusHistory.map((h) => ({ status: h.status, at: h.at })),
    deliveredAt: o.deliveredAt,
  };
}

function movement(m) {
  const p = m.product;
  const u = m.user;
  return {
    id: m._id.toString(),
    product: p && p.name ? { id: p._id.toString(), name: p.name, sku: p.sku, unit: p.unit } : null,
    type: m.type,
    quantityChange: m.quantityChange,
    stockBefore: m.stockBefore,
    stockAfter: m.stockAfter,
    reason: m.reason,
    unitCost: m.unitCost,
    supplier: m.supplier,
    refLabel: m.refLabel,
    userName: u && u.name ? u.name : null,
    createdAt: m.createdAt,
  };
}

module.exports = { publicProduct, posProduct, adminProduct, category, orderConfirmation, orderTracking, adminOrderRow, adminOrder, movement };
