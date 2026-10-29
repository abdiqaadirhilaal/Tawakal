import { useEffect, useState } from 'react';
import { AdminPage, DataState, TableWrap, Toolbar } from '../../../components/admin/AdminUI';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import Pagination from '../../../components/common/Pagination';
import { Alert, Spinner } from '../../../components/common/Feedback';
import { Input, Select, Textarea } from '../../../components/common/Field';
import { Badge } from '../../../components/common/StatusBadge';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import useFetch from '../../../hooks/useFetch';
import * as posApi from '../../../services/posApi';
import { formatDate, formatMoney, round2 } from '../../../utils/format';

const money = (v, cur) => (v === null || v === undefined ? '—' : formatMoney(v, cur));

export function VarianceBadge({ value, currency }) {
  if (value === null || value === undefined) return <span className="text-slate-400">—</span>;
  if (value === 0) return <Badge className="bg-emerald-100 text-emerald-900">Sax</Badge>;
  return <Badge className={value < 0 ? 'bg-red-100 text-red-900' : 'bg-amber-100 text-amber-900'}>{value > 0 ? '+' : ''}{formatMoney(value, currency)}</Badge>;
}

function SummaryGrid({ summary, currency }) {
  const rows = [
    ['Tirada iibka', summary.salesCount],
    ['Wadarta iibka', formatMoney(summary.salesTotal, currency)],
    ['Iibka caddaanka ah', formatMoney(summary.cashSales, currency)],
    ['Mobile Money', formatMoney(summary.mobileMoneySales, currency)],
    ['Xawaalad bangi', formatMoney(summary.bankTransferSales, currency)],
    ['Habab kale', formatMoney(summary.otherSales, currency)],
    [`Celinta (${summary.refundsCount})`, formatMoney(summary.refundsTotal, currency)],
    ['Celinta caddaanka ah', formatMoney(summary.cashRefunds, currency)],
    ['Hagaajinta lacagta', formatMoney(summary.adjustmentsTotal, currency)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-slate-200 sm:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="bg-white px-4 py-3">
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</dt>
          <dd className="num mt-0.5 text-lg font-extrabold text-navy">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CloseShiftForm({ shift, currency, onClosed, onCancel }) {
  const toast = useToast();
  const [actual, setActual] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const expected = shift.summary.expectedClosingCash;
  const value = Number(actual);
  const valid = actual !== '' && Number.isFinite(value) && value >= 0;
  const variance = valid ? round2(value - expected) : null;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const closed = await posApi.closeShift({ actualClosingCash: value, closingNotes: notes.trim(), shiftId: shift.id });
      toast.success('Shift-ka waa la xiray');
      onClosed(closed);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {error && <Alert>{error.message}</Alert>}
      <div className="rounded-xl bg-navy px-5 py-4 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Lacagta caddaanka ah ee la filayo</p>
        <p className="num text-3xl font-extrabold">{formatMoney(expected, currency)}</p>
        <p className="num mt-1 text-xs text-white/70">
          Furitaan {formatMoney(shift.openingCash, currency)} + iib caddaan {formatMoney(shift.summary.cashSales, currency)} − celin caddaan {formatMoney(shift.summary.cashRefunds, currency)} + hagaajin {formatMoney(shift.summary.adjustmentsTotal, currency)}
        </p>
      </div>
      <Input label="Lacagta caddaanka ah ee aad tirisay" type="number" inputMode="decimal" min="0" step="0.01" required value={actual} onChange={(e) => setActual(e.target.value)} hint="Tiri lacagta dhabta ah ee khasnadda ku jirta. Mobile money iyo bangi kuma jiraan." />
      {variance !== null && (
        <p className={`num rounded-lg px-4 py-3 text-sm font-bold ${variance === 0 ? 'bg-emerald-50 text-emerald-900' : variance < 0 ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}`} aria-live="polite">
          Farqiga: {variance > 0 ? '+' : ''}{formatMoney(variance, currency)} {variance === 0 ? '(sax)' : variance < 0 ? '(lacag ayaa maqan)' : '(lacag dheeraad ah)'}
        </p>
      )}
      <Textarea label="Faallo" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={variance ? 'Sharax farqiga haddii aad garanayso sababta' : ''} />
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Ka noqo
          </Button>
        )}
        <Button type="submit" variant="danger" loading={busy} disabled={!valid}>
          Xir shift-ka
        </Button>
      </div>
    </form>
  );
}

function AdjustmentForm({ shift, onDone, onCancel }) {
  const toast = useToast();
  const [direction, setDirection] = useState('out');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const value = Number(amount);
  const valid = amount !== '' && Number.isFinite(value) && value > 0 && reason.trim().length >= 3;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      onDone(await posApi.addShiftAdjustment(shift.id, { amount: direction === 'out' ? -value : value, reason: reason.trim() }));
      toast.success('Hagaajinta waa la diiwaangeliyey');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {error && <Alert>{error.message}</Alert>}
      <Alert type="info">Hagaajintu waa diiwaan joogto ah oo magacaaga wata. Loogama talagelin in lagu qariyo farqi lacageed.</Alert>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Nooca" value={direction} onChange={(e) => setDirection(e.target.value)}>
          <option value="out">Lacag laga saaray khasnadda (−)</option>
          <option value="in">Lacag lagu daray khasnadda (+)</option>
        </Select>
        <Input label="Qaddarka" type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <Textarea label="Sababta" required rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tusaale: lacag bangiga la geeyey" />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Ka noqo
        </Button>
        <Button type="submit" loading={busy} disabled={!valid}>
          Diiwaangeli
        </Button>
      </div>
    </form>
  );
}

export default function Shifts() {
  const { isSupervisor } = useAuth();
  const toast = useToast();
  const config = useFetch(posApi.getConfig, []);
  const current = useFetch(posApi.currentShift, []);
  const cashiers = useFetch(() => (isSupervisor ? posApi.listCashiers() : Promise.resolve([])), [isSupervisor]);
  const cur = config.data?.currency || 'USD';

  const [openingCash, setOpeningCash] = useState('');
  const [opening, setOpening] = useState(false);
  const [page, setPage] = useState(1);
  const [cashier, setCashier] = useState('');
  const [status, setStatus] = useState('all');
  const [action, setAction] = useState(null); // { type: 'close' | 'adjust' | 'view', shift }

  useEffect(() => setPage(1), [cashier, status]);
  const history = useFetch(() => posApi.shiftHistory({ page, limit: 20, cashier, status }), [page, cashier, status]);
  const rows = history.data?.data || [];

  const refresh = () => {
    current.reload();
    history.reload();
  };

  const open = async (e) => {
    e.preventDefault();
    const value = Number(openingCash);
    if (openingCash === '' || !Number.isFinite(value) || value < 0) return;
    setOpening(true);
    try {
      current.setData(await posApi.openShift(value));
      setOpeningCash('');
      history.reload();
      toast.success('Shift-ka waa la furay');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOpening(false);
    }
  };

  const mine = current.data;

  return (
    <AdminPage title="Shifts" text="Furitaanka iyo xiritaanka shift-ka, iyo isku-dheellitirka lacagta caddaanka ah." actions={<Button to="/admin/pos">Kaashka (POS)</Button>}>
      <section className="card p-6">
        <h2 className="text-lg font-bold text-navy">Shift-kayga</h2>
        {current.loading && !current.data ? (
          <Spinner />
        ) : current.error ? (
          <Alert className="mt-3">{current.error.message}</Alert>
        ) : mine ? (
          <div className="mt-4 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="mb-3 text-sm text-slate-600">
                La furay {formatDate(mine.openedAt, true)} · lacagta furitaanka <strong className="num text-navy">{formatMoney(mine.openingCash, cur)}</strong>
              </p>
              <SummaryGrid summary={mine.summary} currency={cur} />
              {mine.adjustments.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {mine.adjustments.map((a) => (
                    <li key={a.id} className="flex justify-between gap-3 rounded-lg bg-mist px-3 py-2">
                      <span className="text-slate-700">
                        {a.reason} <span className="text-xs text-slate-500">· {a.byName}</span>
                      </span>
                      <span className="num font-bold text-navy">{a.amount > 0 ? '+' : ''}{formatMoney(a.amount, cur)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <CloseShiftForm shift={mine} currency={cur} onClosed={() => { current.setData(null); history.reload(); }} />
          </div>
        ) : (
          <form onSubmit={open} noValidate className="mt-3 flex flex-wrap items-end gap-3">
            <p className="w-full text-sm text-slate-600">Shift furan ma lihid. Tiri lacagta khasnadda ku jirta, kadibna fur.</p>
            <Input label="Lacagta furitaanka (caddaan)" type="number" inputMode="decimal" min="0" step="0.01" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} className="w-56" />
            <Button type="submit" loading={opening} disabled={openingCash === ''}>
              Fur shift
            </Button>
          </form>
        )}
      </section>

      <section className="card mt-6">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-navy">Taariikhda shifts</h2>
          <p className="text-xs text-slate-500">{isSupervisor ? 'Dhammaan kaashiyeyaasha.' : 'Shifts-kaaga oo kaliya.'}</p>
        </div>
        <Toolbar>
          {isSupervisor && (
            <Select label="Kaashiye" value={cashier} onChange={(e) => setCashier(e.target.value)} className="w-48">
              <option value="">Dhammaan</option>
              {(cashiers.data || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
          <Select label="Xaalad" value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
            <option value="all">Dhammaan</option>
            <option value="open">Furan</option>
            <option value="closed">Xiran</option>
          </Select>
        </Toolbar>
        <DataState loading={history.loading && !history.data} error={history.error} onRetry={history.reload} empty={rows.length === 0} emptyTitle="Shift lama helin">
          <TableWrap minWidth={1040}>
            <thead className="bg-mist">
              <tr>
                <th className="th">Kaashiye</th>
                <th className="th">La furay</th>
                <th className="th">La xiray</th>
                <th className="th text-right">Iib</th>
                <th className="th text-right">Furitaan</th>
                <th className="th text-right">La filayo</th>
                <th className="th text-right">La tiriyey</th>
                <th className="th">Farqi</th>
                <th className="th text-right">Hawlo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-mist/60">
                  <td className="td font-bold">
                    {s.cashierName} {s.status === 'open' && <Badge className="ml-1 bg-emerald-100 text-emerald-900">Furan</Badge>}
                  </td>
                  <td className="td num whitespace-nowrap text-slate-600">{formatDate(s.openedAt, true)}</td>
                  <td className="td num whitespace-nowrap text-slate-600">{formatDate(s.closedAt, true)}</td>
                  <td className="td num text-right">{s.summary ? s.summary.salesCount : '—'}</td>
                  <td className="td num text-right">{formatMoney(s.openingCash, cur)}</td>
                  <td className="td num text-right">{money(s.status === 'open' ? s.summary?.expectedClosingCash : s.expectedClosingCash, cur)}</td>
                  <td className="td num text-right">{money(s.actualClosingCash, cur)}</td>
                  <td className="td">
                    <VarianceBadge value={s.cashVariance} currency={cur} />
                  </td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setAction({ type: 'view', shift: s })}>
                        Faahfaahin
                      </Button>
                      {isSupervisor && s.status === 'open' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setAction({ type: 'adjust', shift: s })}>
                            Hagaaji
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-700" onClick={() => setAction({ type: 'close', shift: s })}>
                            Xir
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <div className="px-4">
            <Pagination pagination={history.data?.pagination} onPage={setPage} />
          </div>
        </DataState>
      </section>

      <Modal
        open={Boolean(action)}
        onClose={() => setAction(null)}
        size={action?.type === 'view' ? 'lg' : 'md'}
        title={action ? `${action.type === 'close' ? 'Xir shift-ka' : action.type === 'adjust' ? 'Hagaajin lacag' : 'Shift'}: ${action.shift.cashierName}` : ''}
      >
        {action?.type === 'close' && <CloseShiftForm shift={action.shift} currency={cur} onCancel={() => setAction(null)} onClosed={() => { setAction(null); refresh(); }} />}
        {action?.type === 'adjust' && <AdjustmentForm shift={action.shift} onCancel={() => setAction(null)} onDone={() => { setAction(null); refresh(); }} />}
        {action?.type === 'view' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {formatDate(action.shift.openedAt, true)} → {action.shift.closedAt ? formatDate(action.shift.closedAt, true) : 'weli furan'}
              {action.shift.closedByName && ` · xiray ${action.shift.closedByName}`}
            </p>
            {action.shift.summary && <SummaryGrid summary={action.shift.summary} currency={cur} />}
            <dl className="num grid gap-3 text-sm sm:grid-cols-4">
              {[
                ['Furitaan', money(action.shift.openingCash, cur)],
                ['La filayo', money(action.shift.status === 'open' ? action.shift.summary?.expectedClosingCash : action.shift.expectedClosingCash, cur)],
                ['La tiriyey', money(action.shift.actualClosingCash, cur)],
              ].map(([l, v]) => (
                <div key={l}>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">{l}</dt>
                  <dd className="text-lg font-extrabold text-navy">{v}</dd>
                </div>
              ))}
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Farqi</dt>
                <dd className="mt-1">
                  <VarianceBadge value={action.shift.cashVariance} currency={cur} />
                </dd>
              </div>
            </dl>
            {action.shift.closingNotes && <p className="rounded-lg bg-mist px-4 py-3 text-sm text-slate-700">{action.shift.closingNotes}</p>}
            {action.shift.adjustments.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Hagaajinta lacagta</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {action.shift.adjustments.map((a) => (
                    <li key={a.id} className="flex justify-between gap-3 rounded-lg bg-mist px-3 py-2">
                      <span>
                        {a.reason} <span className="text-xs text-slate-500">· {a.byName} · {formatDate(a.at, true)}</span>
                      </span>
                      <span className="num font-bold">{a.amount > 0 ? '+' : ''}{formatMoney(a.amount, cur)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AdminPage>
  );
}
