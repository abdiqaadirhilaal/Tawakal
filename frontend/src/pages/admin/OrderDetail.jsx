import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { AdminPage, DataState } from '../../components/admin/AdminUI';
import Button from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/Modal';
import { Select, Textarea } from '../../components/common/Field';
import { LogoMark } from '../../components/common/Logo';
import { OrderStatusBadge, PaymentBadge } from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import useFetch from '../../hooks/useFetch';
import { addOrderNote, getOrder, updateOrderStatus, updatePaymentStatus } from '../../services/adminApi';
import { FULFILLMENT_LABELS, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, formatDate, formatMoney, formatQty, nextStatuses, unitLabel } from '../../utils/format';

function Invoice({ order, settings }) {
  const cur = order.currency;
  return (
    <section className="card p-6 sm:p-8" aria-label="Qaansheegta dalabka">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-navy pb-5">
        <div className="flex items-center gap-3">
          <LogoMark className="h-14 w-14" />
          <div>
            <p className="font-display text-2xl font-extrabold tracking-[0.08em] text-navy">{settings.companyName}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-700">{settings.tagline}</p>
            <p className="mt-1 text-xs text-slate-600">{[settings.address, settings.phone, settings.email].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Qaansheeg / Invoice</p>
          <p className="num text-xl font-extrabold text-navy">{order.orderNumber}</p>
          <p className="num text-sm text-slate-600">{formatDate(order.createdAt, true)}</p>
        </div>
      </header>

      <div className="grid gap-6 py-5 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Macmiilka</p>
          <p className="mt-1 font-bold text-navy">{order.customer.name}</p>
          <p className="num text-slate-700">{order.customer.phone}</p>
          {order.customer.email && <p className="break-all text-slate-700">{order.customer.email}</p>}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{FULFILLMENT_LABELS[order.fulfillmentMethod]}</p>
          {order.fulfillmentMethod === 'delivery' ? (
            <p className="mt-1 text-slate-700">
              {order.deliveryAddress.address}
              <br />
              {order.deliveryAddress.district}
            </p>
          ) : (
            <p className="mt-1 text-slate-700">Macmiilka ayaa ka qaadanaya bakhaarka.</p>
          )}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Lacag bixinta</p>
          <p className="mt-1 text-slate-700">{order.paymentMethod}</p>
          <p className="font-bold text-navy">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</p>
          <p className="text-slate-700">Xaalad: {ORDER_STATUS_LABELS[order.orderStatus]}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="bg-navy text-left text-xs uppercase tracking-wider text-white">
              <th className="px-3 py-2 font-bold">Alaab</th>
              <th className="px-3 py-2 font-bold">SKU</th>
              <th className="px-3 py-2 text-right font-bold">Tiro</th>
              <th className="px-3 py-2 text-right font-bold">Qiime</th>
              <th className="px-3 py-2 text-right font-bold">Wadar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {order.items.map((i) => (
              <tr key={i.sku}>
                <td className="px-3 py-2.5 font-semibold text-navy">{i.name}</td>
                <td className="num px-3 py-2.5 text-slate-600">{i.sku}</td>
                <td className="num px-3 py-2.5 text-right">
                  {formatQty(i.quantity)} {unitLabel(i.unit)}
                </td>
                <td className="num px-3 py-2.5 text-right">{formatMoney(i.price, cur)}</td>
                <td className="num px-3 py-2.5 text-right font-bold">{formatMoney(i.lineTotal, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="num ml-auto mt-4 w-full max-w-xs space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-600">Wadarta alaabta</dt>
          <dd className="font-semibold">{formatMoney(order.subtotal, cur)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Gaarsiinta</dt>
          <dd className="font-semibold">{formatMoney(order.deliveryFee, cur)}</dd>
        </div>
        <div className="flex justify-between border-t-2 border-navy pt-2 text-base">
          <dt className="font-extrabold text-navy">Wadarta guud</dt>
          <dd className="font-extrabold text-navy">{formatMoney(order.total, cur)}</dd>
        </div>
      </dl>

      {order.customerNotes && (
        <p className="mt-5 rounded-lg bg-mist px-4 py-3 text-sm text-slate-700">
          <strong className="text-navy">Faallada macmiilka:</strong> {order.customerNotes}
        </p>
      )}
    </section>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();
  const { data: order, loading, error, reload, setData } = useFetch(() => getOrder(id), [id]);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const run = async (fn, successMessage) => {
    setBusy(true);
    try {
      setData(await fn());
      toast.success(successMessage);
    } catch (err) {
      toast.error(err.message);
      if (err.status === 409) reload();
    } finally {
      setBusy(false);
      setPendingStatus(null);
    }
  };

  const submitNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      setData(await addOrderNote(id, note.trim()));
      setNote('');
      toast.success('Qoraalka waa la daray');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingNote(false);
    }
  };

  const options = order ? nextStatuses(order) : [];

  return (
    <AdminPage
      title={order ? `Dalab ${order.orderNumber}` : 'Dalab'}
      actions={
        <>
          <Button to="/admin/dalabyada" variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dalabyada
          </Button>
          {order && (
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden="true" /> Daabac qaansheegta
            </Button>
          )}
        </>
      }
    >
      <DataState loading={loading && !order} error={error} onRetry={reload}>
        {order && (
          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <Invoice order={order} settings={settings} />

            <div className="no-print space-y-6">
              <section className="card p-5">
                <h2 className="text-lg font-bold text-navy">Xaaladda dalabka</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <OrderStatusBadge status={order.orderStatus} />
                  <PaymentBadge status={order.paymentStatus} />
                </div>
                {options.length > 0 ? (
                  <div className="mt-4 grid gap-2">
                    {options.map((s) => (
                      <Button key={s} variant={s === 'cancelled' ? 'outline' : 'primary'} className={s === 'cancelled' ? 'text-red-700 hover:border-red-500 hover:text-red-700' : ''} disabled={busy} onClick={() => setPendingStatus(s)}>
                        {s === 'cancelled' ? 'Jooji dalabka' : `U beddel: ${ORDER_STATUS_LABELS[s]}`}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-600">Dalabkani wuu dhammaaday; xaaladdiisa lama beddeli karo.</p>
                )}

                <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">Taariikhda xaaladaha</h3>
                <ol className="mt-2 space-y-1.5 text-sm">
                  {order.statusHistory.map((h, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span className="font-semibold text-navy">{ORDER_STATUS_LABELS[h.status]}</span>
                      <span className="num text-slate-500">{formatDate(h.at, true)}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="card p-5">
                <h2 className="text-lg font-bold text-navy">Lacag bixinta</h2>
                {isAdmin ? (
                  <Select
                    label="Xaaladda lacag bixinta"
                    className="mt-3"
                    value={order.paymentStatus}
                    disabled={busy}
                    onChange={(e) => run(() => updatePaymentStatus(id, e.target.value), 'Xaaladda lacag bixinta waa la beddelay')}
                    hint="Calaamadee “La bixiyey” kaliya marka lacagta dhab ahaan la helo."
                  >
                    {Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v} disabled={v === 'paid' && order.orderStatus === 'cancelled'}>
                        {l}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">Kaliya maamulaha ayaa beddeli kara xaaladda lacag bixinta.</p>
                )}
              </section>

              <section className="card p-5">
                <h2 className="text-lg font-bold text-navy">Qoraallada gudaha</h2>
                <p className="text-xs text-slate-500">Macmiilku ma arko qoraalladan.</p>
                {order.internalNotes.length > 0 && (
                  <ul className="mt-3 space-y-3">
                    {order.internalNotes.map((n) => (
                      <li key={n.id} className="rounded-lg bg-mist px-3 py-2 text-sm">
                        <p className="whitespace-pre-line text-navy">{n.text}</p>
                        <p className="num mt-1 text-xs text-slate-500">
                          {n.byName} · {formatDate(n.at, true)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <form onSubmit={submitNote} className="mt-3 space-y-2">
                  <Textarea label="Qoraal cusub" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
                  <Button type="submit" variant="outline" size="sm" loading={savingNote} disabled={!note.trim()}>
                    Ku dar qoraal
                  </Button>
                </form>
              </section>

              <p className="text-sm">
                <Link to={`/admin/macaamiisha?phone=${order.customer.phoneKey}`} className="font-bold text-royal hover:underline">
                  Eeg taariikhda macmiilkan
                </Link>
              </p>
            </div>
          </div>
        )}
      </DataState>

      <ConfirmDialog
        open={Boolean(pendingStatus)}
        loading={busy}
        danger={pendingStatus === 'cancelled'}
        title={pendingStatus === 'cancelled' ? 'Jooji dalabka' : 'Beddel xaaladda'}
        message={
          pendingStatus === 'cancelled'
            ? 'Dalabka waa la joojinayaa, alaabtiisana kaydka ayaa lagu soo celinayaa. Tallaabadan dib looma celin karo.'
            : `Xaaladda dalabka waxaa loo beddelayaa “${ORDER_STATUS_LABELS[pendingStatus] || ''}”.`
        }
        confirmLabel={pendingStatus === 'cancelled' ? 'Haa, jooji' : 'Haa, beddel'}
        onConfirm={() => run(() => updateOrderStatus(id, pendingStatus), 'Xaaladda dalabka waa la beddelay')}
        onCancel={() => setPendingStatus(null)}
      />
    </AdminPage>
  );
}
