import { useEffect, useRef, useState } from 'react';
import { Banknote, Building2, Smartphone, Wallet } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Alert } from '../common/Feedback';
import { Input } from '../common/Field';
import ApprovalFields, { approvalReady } from './ApprovalFields';
import { createSale } from '../../services/posApi';
import { formatMoney, uuid } from '../../utils/format';
import { cashSuggestions, changeDue } from '../../utils/pos';

const ICONS = { cash: Banknote, mobile_money: Smartphone, bank_transfer: Building2, other: Wallet };

/**
 * Guddiga lacag bixinta. Wuxuu u diraa server-ka kaliya aqoonsiga alaabta iyo tirada;
 * qiimaha iyo wadarta server-ka ayaa xisaabiya.
 */
export default function PaymentModal({ open, onClose, onCompleted, cart, totals, config, customer, discount, needsApproval }) {
  const methods = config?.paymentMethods || [];
  const cur = config?.currency || 'USD';
  const [methodCode, setMethodCode] = useState('');
  const [received, setReceived] = useState('');
  const [reference, setReference] = useState('');
  const [approval, setApproval] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // Hal fure isku day kasta: haddii codsiga la soo celiyo, hal iib uun baa la abuurayaa.
  const key = useRef(uuid());

  useEffect(() => {
    if (!open) return;
    key.current = uuid();
    setMethodCode(methods[0]?.code || '');
    setReceived('');
    setReference('');
    setApproval({ email: '', password: '' });
    setError(null);
  }, [open]);

  const method = methods.find((m) => m.code === methodCode);
  const isCash = method?.type === 'cash';
  const { sufficient, change } = changeDue(totals.grandTotal, received === '' ? NaN : received);
  const canSubmit = Boolean(method) && (!isCash || sufficient) && (!needsApproval || approvalReady(approval)) && !busy;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        idempotencyKey: key.current,
        items: cart.map((i) => ({ productId: i.id, quantity: i.quantity })),
        customerName: customer.name.trim(),
        customerPhone: customer.phone.trim(),
        payment: { method: method.code, reference: isCash ? '' : reference.trim() },
      };
      if (isCash) payload.payment.amountReceived = Number(received);
      if (totals.discountAmount > 0) payload.discount = { kind: discount.kind, value: Number(discount.value) };
      if (needsApproval) payload.approval = { email: approval.email.trim(), password: approval.password };
      onCompleted(await createSale(payload));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title="Lacag bixinta"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Ka noqo
          </Button>
          <Button type="submit" form="pos-payment" variant="gold" size="lg" loading={busy} disabled={!canSubmit}>
            Dhammaystir iibka
          </Button>
        </>
      }
    >
      <form id="pos-payment" onSubmit={submit} noValidate className="space-y-5">
        <div className="rounded-xl bg-navy px-5 py-4 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Wadarta la rabo</p>
          <p className="num text-4xl font-extrabold">{formatMoney(totals.grandTotal, cur)}</p>
          {totals.discountAmount > 0 && <p className="num text-sm text-white/70">Qiimo-dhimis: -{formatMoney(totals.discountAmount, cur)}</p>}
        </div>

        {error && (
          <Alert>
            <p className="font-bold">{error.message}</p>
            {error.errors?.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {error.errors.map((e, i) => (
                  <li key={i}>{e.message}</li>
                ))}
              </ul>
            )}
          </Alert>
        )}

        <div>
          <p className="label">Habka lacag bixinta</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Habka lacag bixinta">
            {methods.map((m) => {
              const Icon = ICONS[m.type] || Wallet;
              const active = m.code === methodCode;
              return (
                <button
                  key={m.code}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMethodCode(m.code)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-sm font-bold transition-colors ${
                    active ? 'border-royal bg-royal-50 text-royal' : 'border-slate-200 text-navy hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {isCash && (
          <div>
            <Input
              label="Lacagta la helay"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              required
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              error={received !== '' && !sufficient ? `Way ka yar tahay wadarta (${formatMoney(totals.grandTotal, cur)})` : undefined}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {cashSuggestions(totals.grandTotal).map((v, i) => (
                <button key={v} type="button" onClick={() => setReceived(String(v))} className="num rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-navy hover:border-royal hover:text-royal">
                  {i === 0 ? 'Sax' : formatMoney(v, cur)}
                </button>
              ))}
            </div>
            <div className={`mt-3 flex items-center justify-between rounded-xl px-4 py-3 ${sufficient ? 'bg-emerald-50 text-emerald-900' : 'bg-mist text-slate-600'}`} aria-live="polite">
              <span className="text-sm font-bold">Baaqiga la celinayo</span>
              <span className="num text-2xl font-extrabold">{formatMoney(sufficient ? change : 0, cur)}</span>
            </div>
          </div>
        )}

        {method && !isCash && (
          <div className="space-y-3">
            <Input label="Tixraaca lacag bixinta (ikhtiyaari)" placeholder="Tusaale: lambarka xawaaladda" maxLength={80} value={reference} onChange={(e) => setReference(e.target.value)} />
            <Alert type="warn">Nidaamku si toos ah uma xaqiijiyo lacagtan. Hubi in lacagtu ku soo dhacday ka hor inta aadan dhammaystirin iibka.</Alert>
          </div>
        )}

        {needsApproval && <ApprovalFields value={approval} onChange={setApproval} title="Qiimo-dhimistan waxay u baahan tahay oggolaansho maamule" />}
      </form>
    </Modal>
  );
}
