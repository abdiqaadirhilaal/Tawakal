import { useEffect, useState } from 'react';
import { AdminPage, DataState, TableWrap, Toolbar } from '../../components/admin/AdminUI';
import Pagination from '../../components/common/Pagination';
import { Input, Select } from '../../components/common/Field';
import useFetch from '../../hooks/useFetch';
import { auditLogs } from '../../services/posApi';
import { AUDIT_LABELS, formatDate } from '../../utils/format';

const describe = (meta) =>
  Object.entries(meta || {})
    .filter(([, v]) => v !== null && v !== '' && typeof v !== 'object')
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');

export default function Audit() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  useEffect(() => setPage(1), [action, from, to]);
  const { data, loading, error, reload } = useFetch(() => auditLogs({ page, limit: 30, action, from, to }), [page, action, from, to]);
  const rows = data?.data || [];

  return (
    <AdminPage title="Diiwaanka hawlaha" text="Hawlaha xasaasiga ah ee POS: iib, celin, oggolaansho, shifts. Diiwaankan lama beddeli karo.">
      <div className="card">
        <Toolbar>
          <Select label="Hawsha" value={action} onChange={(e) => setAction(e.target.value)} className="w-60">
            <option value="">Dhammaan</option>
            {Object.entries(AUDIT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <Input label="Laga bilaabo" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          <Input label="Ilaa" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </Toolbar>
        <DataState loading={loading && !data} error={error} onRetry={reload} empty={rows.length === 0} emptyTitle="Diiwaan lama helin">
          <TableWrap minWidth={820}>
            <thead className="bg-mist">
              <tr>
                <th className="th">Waqti</th>
                <th className="th">Qofka</th>
                <th className="th">Hawsha</th>
                <th className="th">Tixraac</th>
                <th className="th">Faahfaahin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((l) => (
                <tr key={l.id} className="hover:bg-mist/60">
                  <td className="td num whitespace-nowrap text-slate-600">{formatDate(l.createdAt, true)}</td>
                  <td className="td font-semibold">{l.userName || '—'}</td>
                  <td className="td">{AUDIT_LABELS[l.action] || l.action}</td>
                  <td className="td num text-slate-600">{l.resourceLabel || '—'}</td>
                  <td className="td max-w-md break-words text-xs text-slate-600">{describe(l.metadata) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <div className="px-4">
            <Pagination pagination={data?.pagination} onPage={setPage} />
          </div>
        </DataState>
      </div>
    </AdminPage>
  );
}
