import { formatMoney } from '../../utils/format';

// Koobitaanka wadarta (qiyaas): wadarta rasmiga ah waxaa xisaabiya server-ka.
export default function OrderTotals({ totals, currency, fulfillmentMethod, settings }) {
  const row = 'flex items-center justify-between text-sm';
  return (
    <dl className="space-y-2.5">
      <div className={row}>
        <dt className="text-slate-600">Wadarta alaabta</dt>
        <dd className="num font-semibold text-navy">{formatMoney(totals.subtotal, currency)}</dd>
      </div>
      <div className={row}>
        <dt className="text-slate-600">Gaarsiinta</dt>
        <dd className="num font-semibold text-navy">
          {fulfillmentMethod === 'pickup' ? 'Ka qaado bakhaarka' : totals.deliveryFee > 0 ? formatMoney(totals.deliveryFee, currency) : 'Bilaash'}
        </dd>
      </div>
      {fulfillmentMethod !== 'pickup' && settings?.freeDeliveryThreshold > 0 && totals.deliveryFee > 0 && (
        <p className="text-xs text-slate-500">Gaarsiintu waa bilaash dalabyada ka badan {formatMoney(settings.freeDeliveryThreshold, currency)}.</p>
      )}
      <div className="flex items-center justify-between border-t border-slate-200 pt-3">
        <dt className="text-base font-bold text-navy">Wadarta guud</dt>
        <dd className="num text-2xl font-extrabold text-royal">{formatMoney(totals.total, currency)}</dd>
      </div>
    </dl>
  );
}
