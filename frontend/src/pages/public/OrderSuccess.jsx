import { Navigate, useLocation } from 'react-router-dom';
import { CheckCircle2, Printer } from 'lucide-react';
import Button from '../../components/common/Button';
import WhatsAppButton from '../../components/common/WhatsAppButton';
import { LAST_ORDER_KEY } from './Checkout';
import usePageMeta from '../../hooks/usePageMeta';
import { FULFILLMENT_LABELS, formatDate, formatMoney, formatQty, unitLabel } from '../../utils/format';
import { orderMessage } from '../../utils/whatsapp';

function loadOrder(state) {
  if (state?.order) return state.order;
  try {
    return JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) || 'null');
  } catch {
    return null;
  }
}

export default function OrderSuccess() {
  usePageMeta('Dalabka waa la helay');
  const { state } = useLocation();
  const order = loadOrder(state);
  if (!order) return <Navigate to="/" replace />;
  const cur = order.currency;

  return (
    <div className="container-page max-w-3xl py-12">
      <div className="card overflow-hidden">
        <div className="bg-navy px-6 py-8 text-center text-white">
          <CheckCircle2 className="mx-auto h-14 w-14 text-gold" aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-extrabold">Dalabkaaga waa la helay</h1>
          <p className="mt-2 text-white/75">Mahadsanid {order.customerName}. Dalabkaaga waa lagu kaydiyey nidaamka.</p>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-gold">Lambarka dalabka</p>
          <p className="num mt-1 select-all text-3xl font-extrabold tracking-wider">{order.orderNumber}</p>
        </div>

        <div className="p-6">
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Xaaladda: Sugaya xaqiijin.</strong> Lacag weli lama bixin. Kooxdayada ayaa kula soo xiriiri doonta si ay u xaqiijiso dalabka. Kaydso lambarka dalabka: adiga iyo taleefankaaga ayaa lagu raadraacaa.
          </div>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Taariikhda</dt>
              <dd className="mt-0.5 font-semibold text-navy">{formatDate(order.createdAt, true)}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Habka helitaanka</dt>
              <dd className="mt-0.5 font-semibold text-navy">{FULFILLMENT_LABELS[order.fulfillmentMethod]}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Lacag bixinta</dt>
              <dd className="mt-0.5 font-semibold text-navy">{order.paymentMethod}</dd>
            </div>
          </dl>

          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2 font-bold">Alaabta</th>
                <th className="py-2 text-right font-bold">Tirada</th>
                <th className="py-2 text-right font-bold">Wadarta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((i) => (
                <tr key={i.sku}>
                  <td className="py-2.5 font-semibold text-navy">{i.name}</td>
                  <td className="num py-2.5 text-right text-slate-700">
                    {formatQty(i.quantity)} {unitLabel(i.unit)} x {formatMoney(i.price, cur)}
                  </td>
                  <td className="num py-2.5 text-right font-bold text-navy">{formatMoney(i.lineTotal, cur)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="num">
              <tr className="border-t border-slate-200">
                <td colSpan={2} className="pt-3 text-right text-slate-600">Wadarta alaabta</td>
                <td className="pt-3 text-right font-semibold">{formatMoney(order.subtotal, cur)}</td>
              </tr>
              <tr>
                <td colSpan={2} className="py-1 text-right text-slate-600">Gaarsiinta</td>
                <td className="py-1 text-right font-semibold">{formatMoney(order.deliveryFee, cur)}</td>
              </tr>
              <tr>
                <td colSpan={2} className="text-right text-base font-bold text-navy">Wadarta guud</td>
                <td className="text-right text-xl font-extrabold text-royal">{formatMoney(order.total, cur)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="no-print mt-8 flex flex-wrap gap-3">
            <Button to="/raadraac" state={{ orderNumber: order.orderNumber }}>
              Raadraac dalabka
            </Button>
            <WhatsAppButton message={(s) => orderMessage(order, s)}>U dir lambarka dalabka WhatsApp</WhatsAppButton>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden="true" /> Daabac
            </Button>
            <Button to="/alaabta" variant="ghost">
              Sii wad adeegashada
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
