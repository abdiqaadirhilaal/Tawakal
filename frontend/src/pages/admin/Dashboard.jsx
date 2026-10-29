import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Boxes, CheckCircle2, ClipboardList, Clock, DollarSign, Globe, Package, PackageX, Store, Undo2 } from 'lucide-react';
import { AdminPage, DataState, StatCard, TableWrap } from '../../components/admin/AdminUI';
import BarChart from '../../components/admin/BarChart';
import { OrderStatusBadge, PaymentBadge } from '../../components/common/StatusBadge';
import { ErrorState, Spinner } from '../../components/common/Feedback';
import useFetch from '../../hooks/useFetch';
import { dashboardSales, dashboardStats } from '../../services/adminApi';
import { useSettings } from '../../context/SettingsContext';
import { formatDate, formatMoney, formatQty, unitLabel } from '../../utils/format';

const PERIODS = [
  { value: '7d', label: '7 maalmood' },
  { value: '30d', label: '30 maalmood' },
  { value: '12m', label: '12 bilood' },
];

const shortLabel = (period) => (period.length === 7 ? period.slice(2) : period.slice(5));

export default function Dashboard() {
  const { settings } = useSettings();
  const cur = settings.currency;
  const [period, setPeriod] = useState('30d');
  const stats = useFetch(dashboardStats, []);
  const sales = useFetch(() => dashboardSales(period), [period]);
  const s = stats.data;

  return (
    <AdminPage title="Dashboard" text="Dulmar guud oo ku saabsan bakhaarka iyo dalabyada.">
      <DataState loading={stats.loading && !s} error={stats.error} onRetry={stats.reload}>
        {s && (
          <>
            <section aria-label="Dakhliga kanaal kasta" className="mb-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={DollarSign} tone="gold" label="Dakhliga guud" value={formatMoney(s.channels.totalRevenue, cur)} hint="POS saafi + online la gaarsiiyey" />
                <StatCard icon={Store} label="POS (saafi)" value={formatMoney(s.channels.pos.net, cur)} hint={`${s.channels.pos.sales} iib · wadar ${formatMoney(s.channels.pos.gross, cur)}`} />
                <StatCard icon={Globe} tone="green" label="Online (la gaarsiiyey)" value={formatMoney(s.channels.online.revenue, cur)} hint={`${s.channels.online.completedOrders} dalab`} />
                <StatCard icon={Undo2} tone="red" label="Celinta POS" value={formatMoney(s.channels.pos.refunds, cur)} hint={`${s.channels.pos.refundCount} celin`} />
              </div>
              <p className="mt-2 text-xs text-slate-500">{s.channels.definition}</p>
              {(s.channels.byPaymentMethod.length > 0 || s.channels.byCashier.length > 0) && (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="card p-5">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Iibka POS: habka lacag bixinta</h2>
                    <ul className="mt-3 space-y-2 text-sm">
                      {s.channels.byPaymentMethod.map((m) => (
                        <li key={m.code} className="flex justify-between gap-3">
                          <span className="font-semibold text-navy">
                            {m.label} <span className="num font-normal text-slate-500">({m.count})</span>
                          </span>
                          <span className="num font-bold text-navy">{formatMoney(m.gross, cur)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="card p-5">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Iibka POS: kaashiye</h2>
                    <ul className="mt-3 space-y-2 text-sm">
                      {s.channels.byCashier.map((c) => (
                        <li key={c.cashierId} className="flex justify-between gap-3">
                          <span className="font-semibold text-navy">
                            {c.cashierName} <span className="num font-normal text-slate-500">({c.count})</span>
                          </span>
                          <span className="num font-bold text-navy">{formatMoney(c.gross, cur)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </section>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={DollarSign} tone="gold" label="Dakhliga online" value={formatMoney(s.revenue, cur)} hint={s.revenueDefinition} />
              <StatCard icon={ClipboardList} label="Dalabyada online" value={s.orders.total} hint={`${s.orders.cancelled} la joojiyey`} />
              <StatCard icon={Clock} tone="amber" label="Dalabyo sugaya" value={s.orders.pending} />
              <StatCard icon={CheckCircle2} tone="green" label="Dalabyo la dhammeeyey" value={s.orders.completed} />
              <StatCard icon={Package} label="Wadarta alaabta" value={s.products.total} />
              <StatCard icon={Boxes} tone="green" label="Alaab firfircoon" value={s.products.active} />
              <StatCard icon={AlertTriangle} tone="amber" label="Kayd yar" value={s.products.lowStock} />
              <StatCard icon={PackageX} tone="red" label="Kayd dhammaaday" value={s.products.outOfStock} />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <section className="card p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-navy">Iibka labada kanaal</h2>
                    <p className="text-xs text-slate-500">Dalabyada online-ka ah ee aan la joojin + iibka POS oo laga jaray celinta.</p>
                  </div>
                  <div className="flex gap-1 rounded-lg bg-mist p-1" role="group" aria-label="Muddada">
                    {PERIODS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPeriod(p.value)}
                        aria-pressed={period === p.value}
                        className={`rounded-md px-3 py-1.5 text-xs font-bold ${period === p.value ? 'bg-navy text-white' : 'text-slate-600 hover:text-navy'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                {sales.error ? (
                  <ErrorState error={sales.error} onRetry={sales.reload} />
                ) : !sales.data ? (
                  <Spinner />
                ) : (
                  <div className={sales.loading ? 'opacity-60' : ''}>
                    <BarChart data={sales.data.series} valueKey="combined" describe={(d) => `${d.orders} dalab online · ${d.posSales} iib POS`} formatValue={(v) => formatMoney(v, cur)} formatLabel={shortLabel} />
                  </div>
                )}
              </section>

              <section className="card p-5">
                <h2 className="text-lg font-bold text-navy">Alaabta ugu iibka badan (online)</h2>
                <p className="text-xs text-slate-500">Laga soo xigtay dalabyada online-ka ah ee aan la joojin. POS: eeg Warbixinno.</p>
                {s.bestSellers.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">Weli iib lama diiwaangelin.</p>
                ) : (
                  <ol className="mt-4 space-y-3">
                    {s.bestSellers.map((b, i) => (
                      <li key={b.sku} className="flex items-center gap-3">
                        <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-navy text-sm font-extrabold text-gold">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-navy">{b.name}</span>
                          <span className="num text-xs text-slate-500">
                            {formatQty(b.quantity)} {unitLabel(b.unit)}
                          </span>
                        </span>
                        <span className="num text-sm font-extrabold text-royal">{formatMoney(b.sales, cur)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>

            <section className="card mt-6">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-navy">Dalabyadii online-ka ee ugu dambeeyey</h2>
                <Link to="/admin/dalabyada" className="text-sm font-bold text-royal hover:underline">
                  Dhammaan
                </Link>
              </div>
              {s.recentOrders.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">Weli dalab ma jiro.</p>
              ) : (
                <TableWrap minWidth={640}>
                  <thead className="bg-mist">
                    <tr>
                      <th className="th">Dalab</th>
                      <th className="th">Macmiil</th>
                      <th className="th">Taariikh</th>
                      <th className="th">Xaalad</th>
                      <th className="th">Lacag</th>
                      <th className="th text-right">Wadar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {s.recentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-mist/60">
                        <td className="td">
                          <Link to={`/admin/dalabyada/${o.id}`} className="num font-bold text-royal hover:underline">
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className="td">{o.customerName}</td>
                        <td className="td num text-slate-600">{formatDate(o.createdAt, true)}</td>
                        <td className="td">
                          <OrderStatusBadge status={o.orderStatus} />
                        </td>
                        <td className="td">
                          <PaymentBadge status={o.paymentStatus} />
                        </td>
                        <td className="td num text-right font-bold">{formatMoney(o.total, o.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              )}
            </section>
          </>
        )}
      </DataState>
    </AdminPage>
  );
}
