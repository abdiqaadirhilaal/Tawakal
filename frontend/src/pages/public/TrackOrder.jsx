import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, PackageSearch, X } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import { Alert } from '../../components/common/Feedback';
import { Input } from '../../components/common/Field';
import { OrderStatusBadge, PaymentBadge } from '../../components/common/StatusBadge';
import usePageMeta from '../../hooks/usePageMeta';
import { trackSchema } from '../../schemas/public';
import { trackOrder } from '../../services/publicApi';
import { FULFILLMENT_LABELS, ORDER_STATUS_LABELS, formatDate, formatMoney, formatQty, unitLabel } from '../../utils/format';

const FLOW = {
  delivery: ['pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered'],
  pickup: ['pending', 'confirmed', 'processing', 'ready_for_pickup', 'delivered'],
};

function Timeline({ order }) {
  const steps = FLOW[order.fulfillmentMethod] || FLOW.pickup;
  const times = Object.fromEntries(order.statusHistory.map((h) => [h.status, h.at]));
  const cancelled = order.orderStatus === 'cancelled';
  const currentIndex = steps.indexOf(order.orderStatus);

  return (
    <ol className="mt-6">
      {steps.map((status, i) => {
        const reached = times[status] !== undefined && (cancelled || i <= currentIndex);
        const current = !cancelled && i === currentIndex;
        const last = i === steps.length - 1 && !cancelled;
        return (
          <li key={status} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && <span className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${reached && !current ? 'bg-royal' : 'bg-slate-200'}`} aria-hidden="true" />}
            <span
              className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 ${
                reached ? 'border-royal bg-royal text-white' : 'border-slate-300 bg-white text-slate-400'
              } ${current ? 'ring-4 ring-gold/40' : ''}`}
            >
              {reached ? <Check className="h-4 w-4" aria-hidden="true" /> : <span className="num text-xs font-bold">{i + 1}</span>}
            </span>
            <div className="pt-1">
              <p className={`font-bold ${reached ? 'text-navy' : 'text-slate-500'}`}>
                {ORDER_STATUS_LABELS[status]}
                {current && <span className="ml-2 text-xs font-bold uppercase tracking-wider text-gold-700">Hadda</span>}
              </p>
              {reached && <p className="num text-xs text-slate-500">{formatDate(times[status], true)}</p>}
            </div>
          </li>
        );
      })}
      {cancelled && (
        <li className="relative flex gap-4">
          <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-red-600 bg-red-600 text-white">
            <X className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="pt-1">
            <p className="font-bold text-red-800">{ORDER_STATUS_LABELS.cancelled}</p>
            <p className="num text-xs text-slate-500">{formatDate(times.cancelled, true)}</p>
          </div>
        </li>
      )}
    </ol>
  );
}

export default function TrackOrder() {
  usePageMeta('Raadraac Dalabka', 'Ku raadraac dalabkaaga lambarka dalabka iyo taleefankaaga.');
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(trackSchema),
    defaultValues: { orderNumber: location.state?.orderNumber || '', phone: '' },
  });

  const onSubmit = async (values) => {
    setError(null);
    setOrder(null);
    try {
      setOrder(await trackOrder(values));
    } catch (err) {
      setError(err);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Dalabkaaga" title="Raadraac Dalabka" text="Geli lambarka dalabka iyo taleefankii aad ku dalbatay." />
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[380px_1fr]">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="card h-fit space-y-4 p-6">
          <Input label="Lambarka dalabka" required placeholder="TWK-261010-0001" autoCapitalize="characters" error={errors.orderNumber?.message} {...register('orderNumber')} />
          <Input label="Lambarka taleefanka" required type="tel" inputMode="tel" placeholder="+252 61 XXXXXXX" error={errors.phone?.message} {...register('phone')} />
          <Button type="submit" className="w-full" loading={isSubmitting}>
            <PackageSearch className="h-4 w-4" aria-hidden="true" />
            Raadi dalabka
          </Button>
          <p className="text-xs text-slate-500">Si loo ilaaliyo xogta macaamiisha, labada goobood waa in ay is waafaqaan.</p>
        </form>

        <section aria-live="polite">
          {error && <Alert>{error.message}</Alert>}
          {!order && !error && (
            <div className="grid h-full min-h-48 place-items-center rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Natiijada raadinta halkan ayay ka soo muuqan doontaa.
            </div>
          )}
          {order && (
            <div className="card animate-fade-up p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Dalab</p>
                  <h2 className="num text-2xl font-extrabold text-navy">{order.orderNumber}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {order.customerFirstName} · {formatDate(order.createdAt, true)} · {FULFILLMENT_LABELS[order.fulfillmentMethod]}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <OrderStatusBadge status={order.orderStatus} />
                  <PaymentBadge status={order.paymentStatus} />
                </div>
              </div>

              <Timeline order={order} />

              <h3 className="mt-8 text-sm font-bold uppercase tracking-wider text-slate-500">Alaabta</h3>
              <ul className="mt-2 divide-y divide-slate-100">
                {order.items.map((i, idx) => (
                  <li key={idx} className="flex justify-between gap-3 py-2 text-sm">
                    <span className="text-navy">
                      {i.name} <span className="num text-slate-500">x {formatQty(i.quantity)} {unitLabel(i.unit)}</span>
                    </span>
                    <span className="num font-semibold text-navy">{formatMoney(i.lineTotal, order.currency)}</span>
                  </li>
                ))}
              </ul>
              <dl className="num mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-600">Gaarsiinta</dt>
                  <dd className="font-semibold">{formatMoney(order.deliveryFee, order.currency)}</dd>
                </div>
                <div className="flex justify-between text-base">
                  <dt className="font-bold text-navy">Wadarta guud</dt>
                  <dd className="font-extrabold text-royal">{formatMoney(order.total, order.currency)}</dd>
                </div>
              </dl>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
