import { useEffect, useRef, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Alert } from '../common/Feedback';
import { Select, Textarea } from '../common/Field';
import ApprovalFields, { approvalReady } from './ApprovalFields';
import { useAuth } from '../../context/AuthContext';
import { createRefund } from '../../services/posApi';
import { formatMoney, formatQty, unitLabel, uuid } from '../../utils/format';
import { refundEstimate } from '../../utils/pos';

export default function RefundModal({ sale, methods, onClose, onDone }) {
  const { isSupervisor } = useAuth();
  const [rows, setRows] = useState({});
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState('');
  const [approval, setApproval] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const key = useRef(uuid());

  useEffect(() => {
    if (!sale) return;
    key.current = uuid();
    setRows({});
    setReason('');
    setMethod(methods.some((m) => m.code === sale.paymentMethod.code) ? sale.paymentMethod.code : methods[0]?.code || '');
    setApproval({ email: '', password: '' });
    setError(null);
  }, [sale]);

  if (!sale) return <Modal open={false} onClose={onClose} title="" />;

  const cur = sale.currency;
  const remainingOf = (i) => Math.round((i.quantity - i.refundedQuantity) * 1000) / 1000;
  const setRow = (id, patch) => setRows((r) => ({ ...r, [id]: { quantity: '', restock: true, ...r[id], ...patch } }));

  const selected = sale.items
    .map((i) => ({ item: i, quantity: Number(rows[i.productId]?.quantity), restock: rows[i.productId]?.restock ?? true }))
    .filter((r) => Number.isFinite(r.quantity) && r.quantity > 0);
  const invalid = selected.some((r) => r.quantity > remainingOf(r.item) || (Number.isInteger(r.item.quantity) && !Number.isInteger(r.quantity)));
  const total = selected.reduce((sum, r) => sum + refundEstimate(r.item, r.quantity), 0);
  const canSubmit = selected.length > 0 && !invalid && reason.trim().length >= 3 && method && (isSupervisor || approvalReady(approval)) && !busy;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        idempotencyKey: key.current,
        reason: reason.trim(),
        method,
        items: selected.map((r) => ({ productId: r.item.productId, quantity: r.quantity, restock: r.restock })),
      };
      if (!isSupervisor) payload.approval = { email: approval.email.trim(), password: approval.password };
      onDone(await createRefund(sale.id, payload));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? () => {} : onClose}
      size="lg"
      title={`Celin: ${sale.receiptNumber}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Ka noqo
          </Button>
          <Button type="submit" form="pos-refund" variant="danger" loading={busy} disabled={!canSubmit}>
            Celi {formatMoney(total, cur)}
          </Button>
        </>
      }
    >
      <form id="pos-refund" onSubmit={submit} noValidate className="space-y-5">
        {error && (
          <Alert>
            <p className="font-bold">{error.message}</p>
            {error.errors?.map((e, i) => (
              <p key={i}>{e.message}</p>
            ))}
          </Alert>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2 font-bold">Alaab</th>
                <th className="py-2 text-right font-bold">La celin karo</th>
                <th className="py-2 font-bold">Tirada la celinayo</th>
                <th className="py-2 font-bold">Kaydka ku celi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items.map((i) => {
                const remaining = remainingOf(i);
                const row = rows[i.productId] || {};
                const q = Number(row.quantity);
                const bad = Number.isFinite(q) && q > 0 && (q > remaining || (Number.isInteger(i.quantity) && !Number.isInteger(q)));
                return (
                  <tr key={i.productId}>
                    <td className="py-2.5">
                      <p className="font-bold text-navy">{i.name}</p>
                      <p className="num text-xs text-slate-500">
                        {i.sku} · la iibiyey {formatQty(i.quantity)} {unitLabel(i.unit)} · saafi {formatMoney(i.netTotal, cur)}
                      </p>
                    </td>
                    <td className="num py-2.5 text-right font-semibold">
                      {formatQty(remaining)} {unitLabel(i.unit)}
                    </td>
                    <td className="py-2.5">
                      <input
                        type="number"
                        min="0"
                        max={remaining}
                        step={Number.isInteger(i.quantity) ? 1 : 'any'}
                        disabled={remaining <= 0}
                        value={row.quantity ?? ''}
                        onChange={(e) => setRow(i.productId, { quantity: e.target.value })}
                        aria-label={`Tirada la celinayo ee ${i.name}`}
                        aria-invalid={bad || undefined}
                        className={`input num w-28 ${bad ? 'input-error' : ''}`}
                      />
                    </td>
                    <td className="py-2.5">
                      <label className="flex items-center gap-2 text-sm text-navy">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#123B7A]"
                          disabled={remaining <= 0}
                          checked={row.restock ?? true}
                          onChange={(e) => setRow(i.productId, { restock: e.target.checked })}
                        />
                        Haa
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-600">
          Calaamadee “Kaydka ku celi” <strong>kaliya</strong> marka alaabta gacanta lagu soo celiyey oo ay tahay mid la iibin karo. Alaab dhaawacan ha calaamadin.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Textarea label="Sababta celinta" required rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
          <Select label="Habka lacagta loo celinayo" value={method} onChange={(e) => setMethod(e.target.value)} hint="Celinta caddaanka ah waxay ka baxdaa shift-kaaga furan.">
            {methods.map((m) => (
              <option key={m.code} value={m.code}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>

        {!isSupervisor && <ApprovalFields value={approval} onChange={setApproval} title="Celintu waxay u baahan tahay oggolaansho maamule" />}

        <div className="flex items-center justify-between rounded-xl bg-mist px-4 py-3">
          <span className="text-sm font-bold text-navy">Lacagta la celinayo (qiyaas)</span>
          <span className="num text-2xl font-extrabold text-red-700">{formatMoney(total, cur)}</span>
        </div>
      </form>
    </Modal>
  );
}
