import { useEffect, useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import { AdminPage, DataState, Toolbar } from '../../components/admin/AdminUI';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import { Select } from '../../components/common/Field';
import { MessageBadge } from '../../components/common/StatusBadge';
import { useToast } from '../../context/ToastContext';
import useFetch from '../../hooks/useFetch';
import { listMessages, updateMessageStatus } from '../../services/adminApi';
import { MESSAGE_STATUS_LABELS, formatDate } from '../../utils/format';

export default function Messages() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [busyId, setBusyId] = useState(null);
  useEffect(() => setPage(1), [status]);
  const { data, loading, error, reload } = useFetch(() => listMessages({ page, limit: 20, status }), [page, status]);
  const items = data?.data.items || [];

  const setMessageStatus = async (id, next) => {
    setBusyId(id);
    try {
      await updateMessageStatus(id, next);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminPage title="Farriimaha" text={data ? `${data.data.unread} farriin oo cusub` : 'Farriimaha ka yimid foomka xiriirka.'}>
      <div className="card">
        <Toolbar>
          <Select label="Xaalad" value={status} onChange={(e) => setStatus(e.target.value)} className="w-48">
            <option value="all">Dhammaan</option>
            {Object.entries(MESSAGE_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Toolbar>
        <DataState loading={loading && !data} error={error} onRetry={reload} empty={items.length === 0} emptyTitle="Farriimo ma jiraan" emptyText="Farriimaha laga soo diro bogga xiriirka halkan ayay ka soo muuqdaan.">
          <ul className={`divide-y divide-slate-200 ${loading ? 'opacity-60' : ''}`}>
            {items.map((m) => (
              <li key={m.id} className={`p-5 ${m.status === 'new' ? 'bg-gold-100/40' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 font-bold text-navy">
                      {m.name} <MessageBadge status={m.status} />
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                      {m.phone && (
                        <a href={`tel:${m.phone.replace(/\s/g, '')}`} className="num inline-flex items-center gap-1.5 hover:text-royal">
                          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                          {m.phone}
                        </a>
                      )}
                      {m.email && (
                        <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1.5 hover:text-royal">
                          <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                          {m.email}
                        </a>
                      )}
                    </p>
                  </div>
                  <p className="num text-xs text-slate-500">{formatDate(m.createdAt, true)}</p>
                </div>
                {m.subject && <p className="mt-3 text-sm font-bold text-navy">{m.subject}</p>}
                <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-700">{m.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.status !== 'read' && (
                    <Button size="sm" variant="outline" loading={busyId === m.id} onClick={() => setMessageStatus(m.id, 'read')}>
                      Calaamadee: la akhriyey
                    </Button>
                  )}
                  {m.status !== 'resolved' && (
                    <Button size="sm" loading={busyId === m.id} onClick={() => setMessageStatus(m.id, 'resolved')}>
                      Calaamadee: la xalliyey
                    </Button>
                  )}
                  {m.status !== 'new' && (
                    <Button size="sm" variant="ghost" disabled={busyId === m.id} onClick={() => setMessageStatus(m.id, 'new')}>
                      Ku celi cusub
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="px-4">
            <Pagination pagination={data?.pagination} onPage={setPage} />
          </div>
        </DataState>
      </div>
    </AdminPage>
  );
}
