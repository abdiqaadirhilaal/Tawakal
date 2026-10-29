import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminPage, DataState, TableWrap, Toolbar } from '../../components/admin/AdminUI';
import Pagination from '../../components/common/Pagination';
import { Input, Select } from '../../components/common/Field';
import { OrderStatusBadge, PaymentBadge } from '../../components/common/StatusBadge';
import useDebounce from '../../hooks/useDebounce';
import useFetch from '../../hooks/useFetch';
import { listOrders } from '../../services/adminApi';
import { FULFILLMENT_LABELS, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, formatDate, formatMoney } from '../../utils/format';

export default function Orders() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const debounced = useDebounce(search.trim());

  useEffect(() => setPage(1), [debounced, status, paymentStatus, from, to]);

  const { data, loading, error, reload } = useFetch(
    () => listOrders({ page, limit: 20, search: debounced, status, paymentStatus, from, to }),
    [page, debounced, status, paymentStatus, from, to]
  );
  const items = data?.data || [];

  return (
    <AdminPage title="Dalabyada" text="Raadi, shaandhee, oo maamul dalabyada macaamiisha.">
      <div className="card">
        <Toolbar>
          <Input label="Raadi" type="search" placeholder="Lambarka dalabka, magac ama taleefan" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-56 flex-1" />
          <Select label="Xaaladda dalabka" value={status} onChange={(e) => setStatus(e.target.value)} className="w-48">
            <option value="all">Dhammaan</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <Select label="Lacag bixinta" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="w-40">
            <option value="all">Dhammaan</option>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <Input label="Laga bilaabo" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          <Input label="Ilaa" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </Toolbar>

        <DataState loading={loading && !data} error={error} onRetry={reload} empty={items.length === 0} emptyTitle="Dalab lama helin" emptyText="Ma jiraan dalabyo ku habboon shaandhayntan.">
          <div className={loading ? 'opacity-60' : ''}>
            <TableWrap minWidth={980}>
              <thead className="bg-mist">
                <tr>
                  <th className="th">Dalab</th>
                  <th className="th">Macmiil</th>
                  <th className="th">Taleefan</th>
                  <th className="th">Taariikh</th>
                  <th className="th">Hab</th>
                  <th className="th">Lacag bixin</th>
                  <th className="th">Xaalad</th>
                  <th className="th text-right">Wadar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((o) => (
                  <tr key={o.id} className="hover:bg-mist/60">
                    <td className="td">
                      <Link to={`/admin/dalabyada/${o.id}`} className="num font-bold text-royal hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="td font-semibold">{o.customerName}</td>
                    <td className="td num text-slate-600">{o.customerPhone}</td>
                    <td className="td num text-slate-600">{formatDate(o.createdAt, true)}</td>
                    <td className="td text-slate-600">{FULFILLMENT_LABELS[o.fulfillmentMethod]}</td>
                    <td className="td">
                      <span className="block text-xs text-slate-500">{o.paymentMethod}</span>
                      <PaymentBadge status={o.paymentStatus} />
                    </td>
                    <td className="td">
                      <OrderStatusBadge status={o.orderStatus} />
                    </td>
                    <td className="td num text-right font-bold">{formatMoney(o.total, o.currency)}</td>
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
    </AdminPage>
  );
}
