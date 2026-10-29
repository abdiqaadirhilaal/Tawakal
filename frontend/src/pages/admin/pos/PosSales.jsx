import { useEffect, useState } from 'react';
import { AdminPage, DataState, StatCard, TableWrap, Tabs, Toolbar } from '../../../components/admin/AdminUI';
import Button from '../../../components/common/Button';
import Pagination from '../../../components/common/Pagination';
import { Input, Select } from '../../../components/common/Field';
import SaleDetailModal, { SaleStatusBadge } from '../../../components/pos/SaleDetailModal';
import { useAuth } from '../../../context/AuthContext';
import useDebounce from '../../../hooks/useDebounce';
import useFetch from '../../../hooks/useFetch';
import * as posApi from '../../../services/posApi';
import { SALE_STATUS_LABELS, formatDate, formatMoney } from '../../../utils/format';

function SalesTab({ config, cashiers }) {
  const { isSupervisor } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [cashier, setCashier] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [openId, setOpenId] = useState(null);
  const debounced = useDebounce(search.trim());
  const cur = config?.currency || 'USD';

  useEffect(() => setPage(1), [debounced, cashier, paymentMethod, status, from, to]);
  const { data, loading, error, reload } = useFetch(
    () => posApi.listSales({ page, limit: 20, search: debounced, cashier, paymentMethod, status, from, to }),
    [page, debounced, cashier, paymentMethod, status, from, to]
  );
  const rows = data?.data.items || [];
  const totals = data?.data.totals;

  return (
    <>
      {totals && (
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <StatCard label="Iibka (shaandhaynta hadda)" value={formatMoney(totals.gross, cur)} hint={`${data.pagination.total} iib`} />
          <StatCard label="Qiimo-dhimis" value={formatMoney(totals.discount, cur)} />
          <StatCard label="La celiyey" value={formatMoney(totals.refunded, cur)} tone="red" />
        </div>
      )}
      <div className="card">
        <Toolbar>
          <Input label="Raadi" type="search" placeholder="Rasiid, lambarka iibka, kaashiye, macmiil" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-56 flex-1" />
          {isSupervisor && (
            <Select label="Kaashiye" value={cashier} onChange={(e) => setCashier(e.target.value)} className="w-44">
              <option value="">Dhammaan</option>
              {(cashiers || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
          <Select label="Lacag bixin" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-44">
            <option value="">Dhammaan</option>
            {(config?.paymentMethods || []).map((m) => (
              <option key={m.code} value={m.code}>
                {m.label}
              </option>
            ))}
          </Select>
          <Select label="Xaalad" value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
            <option value="all">Dhammaan</option>
            {Object.entries(SALE_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <Input label="Laga bilaabo" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          <Input label="Ilaa" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </Toolbar>

        <DataState loading={loading && !data} error={error} onRetry={reload} empty={rows.length === 0} emptyTitle="Iib lama helin" emptyText={isSupervisor ? 'Ma jiro iib ku habboon shaandhayntan.' : 'Halkan waxaa ka muuqda iibkaaga oo kaliya.'}>
          <div className={loading ? 'opacity-60' : ''}>
            <TableWrap minWidth={1080}>
              <thead className="bg-mist">
                <tr>
                  <th className="th">Rasiid</th>
                  <th className="th">Iib</th>
                  <th className="th">Taariikh</th>
                  <th className="th">Kaashiye</th>
                  <th className="th">Macmiil</th>
                  <th className="th text-right">Alaab</th>
                  <th className="th text-right">Wadar hoose</th>
                  <th className="th text-right">Dhimis</th>
                  <th className="th text-right">Wadar guud</th>
                  <th className="th">Lacag bixin</th>
                  <th className="th">Xaalad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-mist/60">
                    <td className="td">
                      <button type="button" onClick={() => setOpenId(s.id)} className="num font-bold text-royal hover:underline">
                        {s.receiptNumber}
                      </button>
                    </td>
                    <td className="td num text-slate-600">{s.saleNumber}</td>
                    <td className="td num whitespace-nowrap text-slate-600">{formatDate(s.completedAt, true)}</td>
                    <td className="td">{s.cashierName}</td>
                    <td className="td text-slate-600">{s.customerName || s.customerPhone || '—'}</td>
                    <td className="td num text-right">{s.itemCount}</td>
                    <td className="td num text-right">{formatMoney(s.subtotal, s.currency)}</td>
                    <td className="td num text-right text-slate-600">{s.totalDiscount > 0 ? `-${formatMoney(s.totalDiscount, s.currency)}` : '—'}</td>
                    <td className="td num text-right font-bold">{formatMoney(s.grandTotal, s.currency)}</td>
                    <td className="td">{s.paymentMethod.label}</td>
                    <td className="td">
                      <SaleStatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
          <div className="px-4">
            <Pagination pagination={data?.pagination} onPage={setPage} />
          </div>
        </DataState>
      </div>
      <SaleDetailModal saleId={openId} methods={config?.paymentMethods || []} onClose={() => setOpenId(null)} onChanged={reload} />
    </>
  );
}

function RefundsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search.trim());
  useEffect(() => setPage(1), [debounced]);
  const { data, loading, error, reload } = useFetch(() => posApi.listRefunds({ page, limit: 20, search: debounced }), [page, debounced]);
  const rows = data?.data || [];

  return (
    <div className="card">
      <Toolbar>
        <Input label="Raadi" type="search" placeholder="Lambarka celinta ama rasiidka" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-56 flex-1" />
      </Toolbar>
      <DataState loading={loading && !data} error={error} onRetry={reload} empty={rows.length === 0} emptyTitle="Celin lama helin" emptyText="Celin kasta waxay tixraacdaa iib hore, waxaana laga sameeyaa faahfaahinta iibka.">
        <TableWrap minWidth={900}>
          <thead className="bg-mist">
            <tr>
              <th className="th">Celin</th>
              <th className="th">Rasiidka asalka</th>
              <th className="th">Taariikh</th>
              <th className="th">Sabab</th>
              <th className="th">Hab</th>
              <th className="th">Fuliyey / oggolaaday</th>
              <th className="th">Kayd</th>
              <th className="th text-right">Lacag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-mist/60">
                <td className="td num font-bold">{r.refundNumber}</td>
                <td className="td num text-slate-600">{r.receiptNumber}</td>
                <td className="td num whitespace-nowrap text-slate-600">{formatDate(r.createdAt, true)}</td>
                <td className="td max-w-xs text-slate-700">{r.reason}</td>
                <td className="td">{r.method.label}</td>
                <td className="td text-slate-600">
                  {r.processedByName}
                  {r.approvedByName && <span className="block text-xs">Oggolaaday: {r.approvedByName}</span>}
                </td>
                <td className="td text-slate-600">{r.inventoryRestocked ? 'Lagu celiyey' : 'Laguma celin'}</td>
                <td className="td num text-right font-bold text-red-700">-{formatMoney(r.amount, r.currency)}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <div className="px-4">
          <Pagination pagination={data?.pagination} onPage={setPage} />
        </div>
      </DataState>
    </div>
  );
}

export default function PosSales() {
  const { isSupervisor } = useAuth();
  const [tab, setTab] = useState('sales');
  const config = useFetch(posApi.getConfig, []);
  const cashiers = useFetch(() => (isSupervisor ? posApi.listCashiers() : Promise.resolve([])), [isSupervisor]);

  return (
    <AdminPage
      title="Iibka POS"
      text={isSupervisor ? 'Dhammaan iibka kaashka laga sameeyey.' : 'Iibkaaga. Diiwaannada iibka lama tirtiro.'}
      actions={<Button to="/admin/pos">Kaashka (POS)</Button>}
    >
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'sales', label: 'Iibka' },
          { value: 'refunds', label: 'Celinta' },
        ]}
      />
      {tab === 'sales' ? <SalesTab config={config.data} cashiers={cashiers.data} /> : <RefundsTab />}
    </AdminPage>
  );
}
