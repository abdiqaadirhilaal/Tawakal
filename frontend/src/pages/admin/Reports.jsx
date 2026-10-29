import { useState } from 'react';
import { Printer } from 'lucide-react';
import { AdminPage, DataState, StatCard, TableWrap, Tabs, Toolbar } from '../../components/admin/AdminUI';
import BarChart from '../../components/admin/BarChart';
import Button from '../../components/common/Button';
import { Input, Select } from '../../components/common/Field';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import useFetch from '../../hooks/useFetch';
import { inventoryReport, salesReport } from '../../services/adminApi';
import PosReports from './PosReports';
import { ORDER_STATUS_LABELS, formatMoney, formatQty, todayISO, unitLabel } from '../../utils/format';

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

const Empty = ({ children = 'Xog ma jirto muddadan.' }) => <p className="px-5 py-8 text-center text-sm text-slate-500">{children}</p>;

function SalesReport() {
  const { settings } = useSettings();
  const cur = settings.currency;
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(todayISO());
  const [groupBy, setGroupBy] = useState('day');
  const { data, loading, error, reload } = useFetch(() => salesReport({ from, to, groupBy }), [from, to, groupBy]);

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
          <strong>Qeexitaan (dalabyada online-ka ah oo kaliya):</strong> “Iib” = wadarta dalabyada aan la joojin (taariikhda dalabka). “Dakhli” = wadarta dalabyada la gaarsiiyey. Dalabyada la joojiyey kuma jiraan midkoodna.
          {data && ` Aagga waqtiga: ${data.timezone}.`}
        </p>
      </div>

      <DataState loading={loading && !data} error={error} onRetry={reload}>
        {data && (
          <div className={loading ? 'opacity-60' : ''}>
            <p className="mt-4 hidden text-sm font-semibold print:block">
              Warbixinta iibka: {data.from || '…'} ilaa {data.to || '…'}
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <StatCard label="Dalabyo" value={data.totals.orders} />
              <StatCard label="Iib" value={formatMoney(data.totals.sales, cur)} />
              <StatCard label="Dakhli (la gaarsiiyey)" value={formatMoney(data.totals.revenue, cur)} />
            </div>

            <Section title="Iibka muddada">
              {data.series.length === 0 ? (
                <Empty />
              ) : (
                <>
                  <div className="no-print p-5">
                    <BarChart data={data.series} describe={(d) => `${d.orders} dalab`} formatValue={(v) => formatMoney(v, cur)} />
                  </div>
                  <TableWrap minWidth={480}>
                    <thead className="bg-mist">
                      <tr>
                        <th className="th">Muddo</th>
                        <th className="th text-right">Dalabyo</th>
                        <th className="th text-right">Iib</th>
                        <th className="th text-right">Dakhli</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.series.map((r) => (
                        <tr key={r.period}>
                          <td className="td num font-semibold">{r.period}</td>
                          <td className="td num text-right">{r.orders}</td>
                          <td className="td num text-right">{formatMoney(r.sales, cur)}</td>
                          <td className="td num text-right">{formatMoney(r.revenue, cur)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </TableWrap>
                </>
              )}
            </Section>

            <div className="grid gap-6 xl:grid-cols-2">
              <Section title="Iibka alaab ahaan">
                {data.byProduct.length === 0 ? (
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
                      {data.byProduct.map((r) => (
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

              <div>
                <Section title="Iibka qayb ahaan">
                  {data.byCategory.length === 0 ? (
                    <Empty />
                  ) : (
                    <TableWrap minWidth={320}>
                      <thead className="bg-mist">
                        <tr>
                          <th className="th">Qayb</th>
                          <th className="th text-right">Iib</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.byCategory.map((r) => (
                          <tr key={r.category}>
                            <td className="td font-semibold">{r.category}</td>
                            <td className="td num text-right font-bold">{formatMoney(r.sales, cur)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </TableWrap>
                  )}
                </Section>

                <Section title="Koobitaanka xaaladaha dalabyada" note="Waxaa ku jira dhammaan dalabyada muddadan, kuwa la joojiyeyna.">
                  {data.statusSummary.length === 0 ? (
                    <Empty />
                  ) : (
                    <TableWrap minWidth={320}>
                      <thead className="bg-mist">
                        <tr>
                          <th className="th">Xaalad</th>
                          <th className="th text-right">Tiro</th>
                          <th className="th text-right">Wadar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.statusSummary.map((r) => (
                          <tr key={r.status}>
                            <td className="td font-semibold">{ORDER_STATUS_LABELS[r.status] || r.status}</td>
                            <td className="td num text-right">{r.count}</td>
                            <td className="td num text-right">{formatMoney(r.total, cur)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </TableWrap>
                  )}
                </Section>
              </div>
            </div>
          </div>
        )}
      </DataState>
    </>
  );
}

function StockList({ rows }) {
  if (rows.length === 0) return <Empty>Ma jirto alaab qaybtan ku jirta.</Empty>;
  return (
    <TableWrap minWidth={420}>
      <thead className="bg-mist">
        <tr>
          <th className="th">Alaab</th>
          <th className="th text-right">Kayd</th>
          <th className="th text-right">Xadka digniinta</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((p) => (
          <tr key={p.id}>
            <td className="td">
              <span className="font-semibold">{p.name}</span>
              <span className="num block text-xs text-slate-500">{p.sku}</span>
            </td>
            <td className="td num text-right font-bold">
              {formatQty(p.stock)} {unitLabel(p.unit)}
            </td>
            <td className="td num text-right text-slate-600">{formatQty(p.lowStockThreshold)}</td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

function InventoryReport() {
  const { settings } = useSettings();
  const { isAdmin } = useAuth();
  const cur = settings.currency;
  const { data, loading, error, reload } = useFetch(inventoryReport, []);

  return (
    <DataState loading={loading && !data} error={error} onRetry={reload}>
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Alaabta" value={data.totals.products} />
            {isAdmin && <StatCard label="Qiimaha kaydka (cost)" value={formatMoney(data.totals.costValue, cur)} hint={data.valuationBasis} />}
            <StatCard label="Qiimaha kaydka (qiimaha iibka)" value={formatMoney(data.totals.retailValue, cur)} />
          </div>

          <Section title="Qiimaha kaydka qayb ahaan">
            {data.byCategory.length === 0 ? (
              <Empty>Alaab ma jirto.</Empty>
            ) : (
              <TableWrap minWidth={480}>
                <thead className="bg-mist">
                  <tr>
                    <th className="th">Qayb</th>
                    <th className="th text-right">Alaab</th>
                    {isAdmin && <th className="th text-right">Qiimaha cost</th>}
                    <th className="th text-right">Qiimaha iibka</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.byCategory.map((r) => (
                    <tr key={r.category}>
                      <td className="td font-semibold">{r.category}</td>
                      <td className="td num text-right">{r.products}</td>
                      {isAdmin && <td className="td num text-right font-bold">{formatMoney(r.costValue, cur)}</td>}
                      <td className="td num text-right">{formatMoney(r.retailValue, cur)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </Section>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title={`Kayd yar (${data.lowStock.length})`}>
              <StockList rows={data.lowStock} />
            </Section>
            <Section title={`Kayd dhammaaday (${data.outOfStock.length})`}>
              <StockList rows={data.outOfStock} />
            </Section>
          </div>
        </>
      )}
    </DataState>
  );
}

export default function Reports() {
  const [tab, setTab] = useState('sales');
  const { isSupervisor } = useAuth();
  return (
    <AdminPage
      title="Warbixinno"
      text="Dhammaan tirooyinka waxaa laga xisaabiyaa diiwaannada dhabta ah ee database-ka."
      actions={
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden="true" /> Daabac
        </Button>
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'sales', label: 'Dalabyada online' },
          ...(isSupervisor ? [{ value: 'pos', label: 'POS (kaashka)' }] : []),
          { value: 'inventory', label: 'Kaydka' },
        ]}
      />
      {tab === 'sales' && <SalesReport />}
      {tab === 'pos' && isSupervisor && <PosReports />}
      {tab === 'inventory' && <InventoryReport />}
    </AdminPage>
  );
}
