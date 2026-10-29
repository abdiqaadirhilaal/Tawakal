import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { AdminPage, DataState, TableWrap } from '../../components/admin/AdminUI';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { Alert } from '../../components/common/Feedback';
import { Input, Select } from '../../components/common/Field';
import { Badge } from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useFetch from '../../hooks/useFetch';
import { userSchema } from '../../schemas/admin';
import { createUser, listUsers, updateUser } from '../../services/adminApi';
import { applyServerErrors } from '../../utils/formErrors';
import { ROLE_HINTS, ROLE_LABELS, formatDate } from '../../utils/format';

const EMPTY = { name: '', email: '', password: '', role: 'staff' };

function UserForm({ open, onClose, onSaved }) {
  const toast = useToast();
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(userSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (open) {
      reset(EMPTY);
      setServerError(null);
    }
  }, [open, reset]);

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      await createUser(values);
      toast.success('Isticmaalaha waa la abuuray');
      onSaved();
    } catch (err) {
      applyServerErrors(err, setError);
      setServerError(err);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Isticmaale cusub"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Ka noqo
          </Button>
          <Button type="submit" form="user-form" loading={isSubmitting}>
            Abuur
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && <Alert>{serverError.message}</Alert>}
        <Input label="Magaca" required error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" required autoComplete="off" error={errors.email?.message} {...register('email')} />
        <Input label="Furaha sirta ah" type="password" required autoComplete="new-password" hint="Ugu yaraan 10 xaraf. Isticmaaluhu wuu beddeli karaa kadib." error={errors.password?.message} {...register('password')} />
        <Select label="Doorka" error={errors.role?.message} {...register('role')}>
          {Object.entries(ROLE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}: {ROLE_HINTS[v]}
            </option>
          ))}
        </Select>
      </form>
    </Modal>
  );
}

export default function Users() {
  const { user: me, isAdmin } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => (isAdmin ? listUsers() : Promise.resolve([])), [isAdmin]);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  if (!isAdmin) return <Navigate to="/admin" replace />;

  const change = async (u, payload) => {
    setBusyId(u.id);
    try {
      await updateUser(u.id, payload);
      toast.success('Isticmaalaha waa la cusboonaysiiyey');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminPage
      title="Isticmaalayaasha"
      text="Dadka geli kara maamulka. Diiwaangelin dadweyne ma jirto."
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Isticmaale cusub
        </Button>
      }
    >
      <div className="card">
        <DataState loading={loading && !data} error={error} onRetry={reload} empty={data?.length === 0}>
          <TableWrap minWidth={760}>
            <thead className="bg-mist">
              <tr>
                <th className="th">Magac</th>
                <th className="th">Email</th>
                <th className="th">Door</th>
                <th className="th">Xaalad</th>
                <th className="th">Soo gelidii ugu dambeysay</th>
                <th className="th text-right">Hawlo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data || []).map((u) => {
                const self = u.id === me.id;
                return (
                  <tr key={u.id} className="hover:bg-mist/60">
                    <td className="td font-bold">
                      {u.name} {self && <span className="text-xs font-normal text-slate-500">(adiga)</span>}
                    </td>
                    <td className="td text-slate-600">{u.email}</td>
                    <td className="td">
                      <select
                        className="input w-44 py-1.5"
                        value={u.role}
                        disabled={self || busyId === u.id}
                        onChange={(e) => change(u, { role: e.target.value })}
                        aria-label={`Doorka ${u.name}`}
                      >
                        {Object.entries(ROLE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="td">
                      <Badge className={u.isActive ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'}>{u.isActive ? 'Firfircoon' : 'La joojiyey'}</Badge>
                    </td>
                    <td className="td num text-slate-600">{formatDate(u.lastLoginAt, true)}</td>
                    <td className="td text-right">
                      {!self && (
                        <Button size="sm" variant="outline" loading={busyId === u.id} onClick={() => change(u, { isActive: !u.isActive })}>
                          {u.isActive ? 'Jooji' : 'Fur'}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        </DataState>
      </div>
      <UserForm
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false);
          reload();
        }}
      />
    </AdminPage>
  );
}
