import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DataState, StatCard, TableWrap, Toolbar } from '../../components/admin/AdminUI';
import BarChart from '../../components/admin/BarChart';
import { Input, Select } from '../../components/common/Field';
import { VarianceBadge } from './pos/Shifts';
import { useSettings } from '../../context/SettingsContext';
import useFetch from '../../hooks/useFetch';
import { cashierPerformance, paymentMethodsReport, posSalesReport, shiftsReport } from '../../services/posApi';
import { formatDate, formatMoney, formatQty, todayISO, unitLabel } from '../../utils/format';

const GROUPS = [
  { value: 'day', label: 'Maalinle' },
  { value: 'week', label: 'Toddobaadle' },
  { value: 'month', label: 'Bille' },
  { value: 'year', label: 'Sannadle' },
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Section({ title, note, children }) {
  return (
    <section className="card mt-6 break-inside-avoid">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-bold text-navy">{title}</h2>
        {note && <p className="text-xs text-slate-500">{note}</p>}
      </div>
      {children}
    </section>
  );
}
const Empty = () => <p className="px-5 py-8 text-center text-sm text-slate-500">Xog ma jirto muddadan.</p>;

export default function PosReports() {
  const { settings } = useSettings();
  const cur = settings.currency;
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(todayISO());
  const [groupBy, setGroupBy] = useState('day');

  const sales = useFetch(() => posSalesReport({ from, to, groupBy }), [from, to, groupBy]);
  const perf = useFetch(() => cashierPerformance({ from, to }), [from, to]);
  const methods = useFetch(() => paymentMethodsReport({ from, to }), [from, to]);
  const shifts = useFetch(() => shiftsReport({ from, to, limit: 50 }), [from, to]);
  const s = sales.data;

  return (
    <>
      <div className="card">
        <Toolbar>
          <Input label="Laga bilaabo" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="w-44" />
          <Input label="Ilaa" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="w-44" />
          <Select label="U kala qaybi" value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="w-44">
            {GROUPS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </Select>
        </Toolbar>
        <p className="px-5 py-3 text-xs text-slate-600">
          <strong>Qeexitaan:</strong> “Iib” = wadarta guud ee iibka POS ee la dhammaystiray (taariikhda iibka). “Celin” = lacagta la celiyey (taariikhda celinta). “Saafi” = iib − celin. Dalabyada online-ka ah halkan kuma jiraan.
        </p>
      </div>

      <DataState loading={sales.loading && !s} error={sales.error} onRetry={sales.reload}>
        {s && (
          <div className={sales.loading ? 'opacity-60' : ''}>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Tirada iibka" value={s.totals.sales} />
              <StatCard label="Iib" value={formatMoney(s.totals.gross, cur)} hint={`Qiimo-dhimis: ${formatMoney(s.totals.discount, cur)}`} />
              <StatCard label={`Celin (${s.totals.refundCount})`} value={formatMoney(s.totals.refunds, cur)} tone="red" />
              <StatCard label="Dakhliga saafiga ah" value={formatMoney(s.totals.net, cur)} tone="gold" />
            </div>

            <Section title="Iibka POS ee muddada">
              {s.series.length === 0 ? (
                <Empty />
              ) : (
                <>
                  <div className="no-print p-5">
                    <BarChart data={s.series} valueKey="net" describe={(d) => `${d.sales} iib`} formatValue={(v) => formatMoney(v, cur)} />
                  </div>
                  <TableWrap minWidth={520}>
                    <thead className="bg-mist">
                      <tr>
                        <th className="th">Muddo</th>
                        <th className="th text-right">Iib</th>
                        <th className="th text-right">Wadar</th>
                        <th className="th text-right">Celin</th>
                        <th className="th text-right">Saafi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {s.series.map((r) => (
                        <tr key={r.period}>
                          <td className="td num font-semibold">{r.period}</td>
                          <td className="td num text-right">{r.sales}</td>
                          <td className="td num text-right">{formatMoney(r.gross, cur)}</td>
                          <td className="td num text-right text-red-700">{r.refunds ? `-${formatMoney(r.refunds, cur)}` : '—'}</td>
                          <td className="td num text-right font-bold">{formatMoney(r.net, cur)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </TableWrap>
                </>
              )}
            </Section>

            <Section title="Alaabta ugu iibka badan (POS)" note="Qiimaha saafiga ah, qiimo-dhimista kadib.">
              {s.byProduct.length === 0 ? (
                <Empty />
              ) : (
                <TableWrap minWidth={420}>
                  <thead className="bg-mist">
                    <tr>
                      <th className="th">Alaab</th>
                      <th className="th text-right">Tiro</th>
                      <th className="th text-right">Iib</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {s.byProduct.slice(0, 20).map((r) => (
                      <tr key={r.sku}>
                        <td className="td">
                          <span className="font-semibold">{r.name}</span>
                          <span className="num block text-xs text-slate-500">{r.sku}</span>
                        </td>
                        <td className="td num text-right">
                          {formatQty(r.quantity)} {unitLabel(r.unit)}
                        </td>
                        <td className="td num text-right font-bold">{formatMoney(r.sales, cur)}</td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              )}
            </Section>
          </div>
        )}
      </DataState>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Waxqabadka kaashiyeyaasha" note="Celinta waxaa lagu xisaabiyaa kaashiyihii iibka asalka ah sameeyey.">
          <DataState loading={perf.loading && !perf.data} error={perf.error} onRetry={perf.reload} empty={perf.data?.rows.length === 0} emptyTitle="Xog ma jirto">
            <TableWrap minWidth={520}>
              <thead className="bg-mist">
                <tr>
                  <th className="th">Kaashiye</th>
                  <th className="th text-right">Iib</th>
                  <th className="th text-right">Wadar</th>
                  <th className="th text-right">Dhimis</th>
                  <th className="th text-right">Celin</th>
                  <th className="th text-right">Saafi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(perf.data?.rows || []).map((r) => (
                  <tr key={r.cashierId}>
                    <td className="td font-bold">{r.cashierName}</td>
                    <td className="td num text-right">{r.sales}</td>
                    <td className="td num text-right">{formatMoney(r.gross, cur)}</td>
                    <td className="td num text-right text-slate-600">{formatMoney(r.discount, cur)}</td>
                    <td className="td num text-right text-red-700">{formatMoney(r.refunds, cur)}</td>
                    <td className="td num text-right font-bold">{formatMoney(r.net, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </DataState>
        </Section>

        <Section title="Hababka lacag bixinta" note="POS: iib iyo celin hab kasta. Online: dalabyada la gaarsiiyey.">
          <DataState loading={methods.loading && !methods.data} error={methods.error} onRetry={methods.reload} empty={methods.data && methods.data.pos.length === 0 && methods.data.online.length === 0} emptyTitle="Xog ma jirto">
            <TableWrap minWidth={480}>
              <thead className="bg-mist">
                <tr>
                  <th className="th">Hab</th>
                  <th className="th">Kanaal</th>
                  <th className="th text-right">Tiro</th>
                  <th className="th text-right">Wadar</th>
                  <th className="th text-right">Celin</th>
                  <th className="th text-right">Saafi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(methods.data?.pos || []).map((r) => (
                  <tr key={`pos-${r.code}`}>
                    <td className="td font-bold">{r.label}</td>
                    <td className="td text-slate-600">POS</td>
                    <td className="td num text-right">{r.count}</td>
                    <td className="td num text-right">{formatMoney(r.gross, cur)}</td>
                    <td className="td num text-right text-red-700">{formatMoney(r.refunds, cur)}</td>
                    <td className="td num text-right font-bold">{formatMoney(r.net, cur)}</td>
                  </tr>
                ))}
                {(methods.data?.online || []).map((r) => (
                  <tr key={`online-${r.code}`}>
                    <td className="td font-bold">{r.label}</td>
                    <td className="td text-slate-600">Online</td>
                    <td className="td num text-right">{r.count}</td>
                    <td className="td num text-right">{formatMoney(r.total, cur)}</td>
                    <td className="td num text-right text-slate-400">—</td>
                    <td className="td num text-right font-bold">{formatMoney(r.total, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </DataState>
        </Section>
      </div>

      <Section title="Shifts iyo farqiga lacagta" note="Shifts-ka la furay muddadan.">
        <DataState loading={shifts.loading && !shifts.data} error={shifts.error} onRetry={shifts.reload} empty={shifts.data?.data.items.length === 0} emptyTitle="Shift ma jiro muddadan">
          {shifts.data && (
            <>
              <p className="num border-b border-slate-200 px-5 py-3 text-sm text-slate-700">
                Shifts la xiray: <strong>{shifts.data.data.totals.closed}</strong> · farqi leh: <strong>{shifts.data.data.totals.withVariance}</strong> · wadarta farqiga:{' '}
                <strong className={shifts.data.data.totals.variance < 0 ? 'text-red-700' : 'text-navy'}>{formatMoney(shifts.data.data.totals.variance, cur)}</strong> ·{' '}
                <Link to="/admin/pos/shifts" className="no-print font-bold text-royal hover:underline">
                  Maamul shifts
                </Link>
              </p>
              <TableWrap minWidth={760}>
                <thead className="bg-mist">
                  <tr>
                    <th className="th">Kaashiye</th>
                    <th className="th">La furay</th>
                    <th className="th">La xiray</th>
                    <th className="th text-right">La filayo</th>
                    <th className="th text-right">La tiriyey</th>
                    <th className="th">Farqi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shifts.data.data.items.map((sh) => (
                    <tr key={sh.id}>
                      <td className="td font-bold">{sh.cashierName}</td>
                      <td className="td num text-slate-600">{formatDate(sh.openedAt, true)}</td>
                      <td className="td num text-slate-600">{sh.closedAt ? formatDate(sh.closedAt, true) : 'Furan'}</td>
                      <td className="td num text-right">{formatMoney(sh.status === 'open' ? sh.summary?.expectedClosingCash : sh.expectedClosingCash, cur)}</td>
                      <td className="td num text-right">{sh.actualClosingCash === null ? '—' : formatMoney(sh.actualClosingCash, cur)}</td>
                      <td className="td">
                        <VarianceBadge value={sh.cashVariance} currency={cur} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </>
          )}
        </DataState>
      </Section>
    </>
  );
}
