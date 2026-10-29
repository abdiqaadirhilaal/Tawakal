import { MESSAGE_STATUS_LABELS, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../../utils/format';

const ORDER_CLS = {
  pending: 'bg-amber-100 text-amber-900',
  confirmed: 'bg-royal-100 text-royal-800',
  processing: 'bg-indigo-100 text-indigo-900',
  ready_for_pickup: 'bg-cyan-100 text-cyan-900',
  out_for_delivery: 'bg-sky-100 text-sky-900',
  delivered: 'bg-emerald-100 text-emerald-900',
  cancelled: 'bg-red-100 text-red-900',
};
const PAYMENT_CLS = { unpaid: 'bg-slate-200 text-slate-800', paid: 'bg-emerald-100 text-emerald-900', refunded: 'bg-purple-100 text-purple-900' };
const MESSAGE_CLS = { new: 'bg-gold-100 text-gold-700', read: 'bg-slate-200 text-slate-800', resolved: 'bg-emerald-100 text-emerald-900' };

const base = 'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold';

export function Badge({ className = '', children }) {
  return <span className={`${base} ${className}`}>{children}</span>;
}
export const OrderStatusBadge = ({ status }) => <Badge className={ORDER_CLS[status]}>{ORDER_STATUS_LABELS[status] || status}</Badge>;
export const PaymentBadge = ({ status }) => <Badge className={PAYMENT_CLS[status]}>{PAYMENT_STATUS_LABELS[status] || status}</Badge>;
export const MessageBadge = ({ status }) => <Badge className={MESSAGE_CLS[status]}>{MESSAGE_STATUS_LABELS[status] || status}</Badge>;

export function StockBadge({ product }) {
  if (product.stock <= 0) return <Badge className="bg-red-100 text-red-900">Waa dhammaaday</Badge>;
  if (product.isLowStock) return <Badge className="bg-amber-100 text-amber-900">Kayd yar</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-900">Waa jiraa</Badge>;
}
