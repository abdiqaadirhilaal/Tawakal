import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminPage, DataState, TableWrap, Toolbar } from '../../components/admin/AdminUI';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { ErrorState, Spinner } from '../../components/common/Feedback';
import { Input } from '../../components/common/Field';
import { OrderStatusBadge, PaymentBadge } from '../../components/common/StatusBadge';
import { useSettings } from '../../context/SettingsContext';
import useDebounce from '../../hooks/useDebounce';
import useFetch from '../../hooks/useFetch';
import { customerOrders, listCustomers } from '../../services/adminApi';
import { formatDate, formatMoney } from '../../utils/format';

function HistoryModal({ phoneKey, onClose }) {
  const { data, loading, error, reload } = useFetch(() => (phoneKey ? customerOrders(phoneKey) : Promise.resolve(null)), [phoneKey]);
  return (
    <Modal open={Boolean(phoneKey)} onClose={onClose} size="lg" title={data?.customer ? `Dalabyada: ${data.customer.name}` : 'Taariikhda macmiilka'}>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading || !data ? (
        <Spinner />
      ) : (
        <>
          <p className="num mb-4 text-sm text-slate-600">
            {data.customer.phone}
            {data.customer.email && ` · ${data.customer.email}`}
          </p>
          <TableWrap minWidth={560}>
            <thead className="bg-mist">
              <tr>
                <th className="th">Dalab</th>
                <th className="th">Taariikh</th>
                <th className="th">Xaalad</th>
                <th className="th">Lacag</th>
                <th className="th text-right">Wadar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.orders.map((o) => (
                <tr key={o.id}>
                  <td className="td">
                    <Link to={`/admin/dalabyada/${o.id}`} className="num font-bold text-royal hover:underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="td num text-slate-600">{formatDate(o.createdAt)}</td>
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
        </>
      )}
    </Modal>
  );
}

export default function Customers() {
  const { settings } = useSettings();
  const [params, setParams] = useSearchParams();
  const selected = /^\d{7,15}$/.test(params.get('phone') || '') ? params.get('phone') : null;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search.trim());

  useEffect(() => setPage(1), [debounced]);
  const { data, loading, error, reload } = useFetch(() => listCustomers({ page, limit: 20, search: debounced }), [page, debounced]);
  const rows = data?.data || [];

  return (
    <AdminPage title="Macaamiisha" text="Liiskan waxaa laga soo saaray dalabyada la diiwaangeliyey. Macaamiishu akoon kuma laha website-ka.">
      <div className="card">
        <Toolbar>
          <Input label="Raadi" type="search" placeholder="Magac ama taleefan" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-56 flex-1" />
        </Toolbar>
        <DataState loading={loading && !data} error={error} onRetry={reload} empty={rows.length === 0} emptyTitle="Macaamiil lama helin" emptyText="Macaamiishu waxay soo muuqdaan marka dalabkoodii koowaad la diiwaangeliyo.">
          <div className={loading ? 'opacity-60' : ''}>
            <TableWrap minWidth={720}>
              <thead className="bg-mist">
                <tr>
                  <th className="th">Magac</th>
                  <th className="th">Taleefan</th>
                  <th className="th text-right">Dalabyo</th>
                  <th className="th text-right">Wadarta iibka</th>
                  <th className="th">Dalabkii ugu dambeeyey</th>
                  <th className="th text-right">Hawlo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((c) => (
                  <tr key={c.phoneKey} className="hover:bg-mist/60">
                    <td className="td font-bold">{c.name}</td>
                    <td className="td num text-slate-600">{c.phone}</td>
                    <td className="td num text-right">{c.orderCount}</td>
                    <td className="td num text-right font-bold">{formatMoney(c.totalSpent, settings.currency)}</td>
                    <td className="td num text-slate-600">{formatDate(c.lastOrderAt)}</td>
                    <td className="td text-right">
                      <Button size="sm" variant="outline" onClick={() => setParams({ phone: c.phoneKey })}>
                        Taariikhda
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
          <p className="px-4 pt-3 text-xs text-slate-500">Wadarta iibka kuma jiraan dalabyada la joojiyey.</p>
          <div className="px-4">
            <Pagination pagination={data?.pagination} onPage={setPage} />
          </div>
        </DataState>
      </div>
      <HistoryModal phoneKey={selected} onClose={() => setParams({})} />
    </AdminPage>
  );
}
