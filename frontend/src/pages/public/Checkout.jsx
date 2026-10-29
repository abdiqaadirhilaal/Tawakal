import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Store, Truck } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import { Alert } from '../../components/common/Feedback';
import { Input, Textarea } from '../../components/common/Field';
import OrderTotals from '../../components/cart/OrderTotals';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import useCartSync from '../../hooks/useCartSync';
import usePageMeta from '../../hooks/usePageMeta';
import { checkoutSchema } from '../../schemas/public';
import { createOrder } from '../../services/publicApi';
import { estimateTotals, lineTotal } from '../../utils/cart';
import { formatMoney, formatQty, unitLabel, uuid } from '../../utils/format';
import { applyServerErrors } from '../../utils/formErrors';

const FIELD_MAP = {
  'customer.name': 'name',
  'customer.phone': 'phone',
  'customer.email': 'email',
  'deliveryAddress.address': 'address',
  'deliveryAddress.district': 'district',
  paymentMethod: 'paymentMethod',
};

export const LAST_ORDER_KEY = 'tawakal_last_order';

export default function Checkout() {
  usePageMeta('Dhammaystir Dalabka');
  const navigate = useNavigate();
  const toast = useToast();
  const { items, clear } = useCart();
  const { settings, loading: settingsLoading } = useSettings();
  const syncing = useCartSync();
  const [serverError, setServerError] = useState(null);
  const [done, setDone] = useState(false);
  // Hal fure dalabkiiba: haddii foomka laba jeer la diro, server-ku hal dalab uun buu abuurayaa.
  const idempotencyKey = useRef(uuid());

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { name: '', phone: '', email: '', fulfillmentMethod: 'delivery', address: '', district: '', paymentMethod: '', customerNotes: '' },
  });

  const fulfillmentMethod = watch('fulfillmentMethod');
  const paymentMethod = watch('paymentMethod');
  const methods = settings.paymentMethods;

  useEffect(() => {
    if (methods.length && !methods.some((m) => m.code === paymentMethod)) setValue('paymentMethod', methods[0].code);
  }, [methods, paymentMethod, setValue]);

  if (items.length === 0 && !done) return <Navigate to="/dambiisha" replace />;

  const unavailable = items.filter((i) => i.unavailable);
  const totals = estimateTotals(items, settings, fulfillmentMethod);
  const currency = settings.currency;

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const order = await createOrder({
        idempotencyKey: idempotencyKey.current,
        customer: { name: values.name, phone: values.phone, email: values.email },
        fulfillmentMethod: values.fulfillmentMethod,
        deliveryAddress: values.fulfillmentMethod === 'delivery' ? { address: values.address, district: values.district } : { address: '', district: '' },
        paymentMethod: values.paymentMethod,
        customerNotes: values.customerNotes,
        // Kaliya aqoonsiga iyo tirada ayaa la diraa: qiimaha server-ka ayaa go'aamiya.
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
      } catch {
        /* waa la iska dhaafi karaa */
      }
      setDone(true);
      clear();
      navigate('/dalab-guul', { replace: true, state: { order } });
    } catch (err) {
      applyServerErrors(err, setError, FIELD_MAP, { strict: true });
      setServerError(err);
      if (err.status === 409) toast.error('Alaabta qaar kaydkeedu wuu isbeddelay. Fadlan dib u eeg dambiisha.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const radioCard = (active) =>
    `flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${active ? 'border-royal bg-royal-50' : 'border-slate-200 bg-white hover:border-slate-300'}`;

  return (
    <>
      <PageHeader eyebrow="Tallaabada ugu dambeysa" title="Dhammaystir Dalabka" text="Buuxi xogtaada. Kooxdayada ayaa kula soo xiriiri doonta si ay u xaqiijiso dalabka." />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {serverError && (
            <Alert>
              <p className="font-bold">{serverError.message}</p>
              {serverError.errors.filter((e) => e.code).length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {serverError.errors.filter((e) => e.code).map((e, i) => (
                    <li key={i}>{e.message}</li>
                  ))}
                </ul>
              )}
              {serverError.status === 409 && (
                <Button to="/dambiisha" variant="outline" size="sm" className="mt-3">
                  Dib u eeg dambiisha
                </Button>
              )}
            </Alert>
          )}
          {unavailable.length > 0 && <Alert type="warn">Alaabta qaar hadda lama heli karo. Ku noqo dambiisha oo ka saar.</Alert>}

          <fieldset className="card p-6">
            <legend className="float-left mb-4 w-full text-lg font-bold text-navy">1. Xogtaada</legend>
            <div className="clear-both grid gap-4 sm:grid-cols-2">
              <Input label="Magaca oo buuxa" required autoComplete="name" error={errors.name?.message} {...register('name')} className="sm:col-span-2" />
              <Input label="Lambarka taleefanka" required type="tel" inputMode="tel" autoComplete="tel" placeholder="+252 61 XXXXXXX" error={errors.phone?.message} hint="Lambarkan ayaad ku raadraaci doontaa dalabkaaga." {...register('phone')} />
              <Input label="Email (ikhtiyaari)" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
            </div>
          </fieldset>

          <fieldset className="card p-6">
            <legend className="float-left mb-4 w-full text-lg font-bold text-navy">2. Sidee alaabta u helaysaa?</legend>
            <div className="clear-both grid gap-3 sm:grid-cols-2">
              <label className={radioCard(fulfillmentMethod === 'delivery')}>
                <input type="radio" value="delivery" className="mt-1 accent-[#123B7A]" {...register('fulfillmentMethod')} />
                <span>
                  <span className="flex items-center gap-2 font-bold text-navy">
                    <Truck className="h-4 w-4" aria-hidden="true" /> Gaarsiin
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-600">Alaabta waa laguu keenayaa cinwaankaaga.</span>
                </span>
              </label>
              <label className={radioCard(fulfillmentMethod === 'pickup')}>
                <input type="radio" value="pickup" className="mt-1 accent-[#123B7A]" {...register('fulfillmentMethod')} />
                <span>
                  <span className="flex items-center gap-2 font-bold text-navy">
                    <Store className="h-4 w-4" aria-hidden="true" /> Ka qaado bakhaarka
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-600">{settings.address || 'Adiga ayaa ka qaadanaya bakhaarka.'}</span>
                </span>
              </label>
            </div>
            {fulfillmentMethod === 'delivery' && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input label="Cinwaanka gaarsiinta" required autoComplete="street-address" error={errors.address?.message} {...register('address')} className="sm:col-span-2" />
                <Input label="Degmada ama magaalada" required autoComplete="address-level2" error={errors.district?.message} {...register('district')} />
              </div>
            )}
            <Textarea label="Faallo dalabka ku saabsan (ikhtiyaari)" rows={3} error={errors.customerNotes?.message} {...register('customerNotes')} className="mt-4" />
          </fieldset>

          <fieldset className="card p-6">
            <legend className="float-left mb-4 w-full text-lg font-bold text-navy">3. Habka lacag bixinta</legend>
            <div className="clear-both space-y-3">
              {methods.length === 0 && !settingsLoading && <Alert type="warn">Hab lacag bixin hadda lama heli karo. Fadlan nala soo xiriir.</Alert>}
              {methods.map((m) => (
                <label key={m.code} className={radioCard(paymentMethod === m.code)}>
                  <input type="radio" value={m.code} className="mt-1 accent-[#123B7A]" {...register('paymentMethod')} />
                  <span className="font-bold text-navy">{m.label}</span>
                </label>
              ))}
              {errors.paymentMethod && <p className="text-xs font-medium text-red-600">{errors.paymentMethod.message}</p>}
              <p className="text-xs text-slate-500">Website-kan lacag online ah laguma bixiyo. Lacagta waxaa la bixiyaa sida kor ku xusan.</p>
            </div>
          </fieldset>
        </div>

        <aside className="card h-fit p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold text-navy">Dalabkaaga</h2>
          <ul className="mt-4 divide-y divide-slate-200">
            {items.map((i) => (
              <li key={i.productId} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block font-semibold text-navy">{i.name}</span>
                  <span className="num text-xs text-slate-500">
                    {formatQty(i.quantity)} {unitLabel(i.unit)} x {formatMoney(i.price, currency)}
                  </span>
                </span>
                <span className="num font-bold text-navy">{formatMoney(lineTotal(i), currency)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <OrderTotals totals={totals} currency={currency} fulfillmentMethod={fulfillmentMethod} settings={settings} />
          </div>
          <Button type="submit" size="lg" className="mt-6 w-full" loading={isSubmitting} disabled={syncing || unavailable.length > 0 || methods.length === 0}>
            Dir dalabka
          </Button>
          <p className="mt-3 text-xs text-slate-500">Wadarta rasmiga ah waxaa xisaabiya nidaamka bakhaarka marka dalabka la diro, iyadoo la isticmaalayo qiimaha hadda jira.</p>
        </aside>
      </form>
    </>
  );
}
