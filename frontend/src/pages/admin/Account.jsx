import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdminPage } from '../../components/admin/AdminUI';
import Button from '../../components/common/Button';
import { Alert } from '../../components/common/Feedback';
import { Input } from '../../components/common/Field';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { changePasswordSchema } from '../../schemas/admin';
import { changePassword } from '../../services/adminApi';
import { applyServerErrors } from '../../utils/formErrors';
import { ROLE_LABELS } from '../../utils/format';

export default function Account() {
  const { user } = useAuth();
  const toast = useToast();
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: '', newPassword: '', confirm: '' } });

  const onSubmit = async ({ currentPassword, newPassword }) => {
    setServerError(null);
    try {
      await changePassword({ currentPassword, newPassword });
      reset();
      toast.success('Furaha sirta ah waa la beddelay. Qalabka kale waa laga saaray.');
    } catch (err) {
      if (!applyServerErrors(err, setError)) setServerError(err);
    }
  };

  return (
    <AdminPage title="Akoonkayga">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-lg font-bold text-navy">Xogtayda</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Magac</dt>
              <dd className="font-semibold text-navy">{user.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Email</dt>
              <dd className="font-semibold text-navy">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Door</dt>
              <dd className="font-semibold text-navy">{ROLE_LABELS[user.role]}</dd>
            </div>
          </dl>
        </section>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-4 p-6">
          <h2 className="text-lg font-bold text-navy">Beddel furaha sirta ah</h2>
          {serverError && <Alert>{serverError.message}</Alert>}
          <Input label="Furaha hadda" type="password" autoComplete="current-password" required error={errors.currentPassword?.message} {...register('currentPassword')} />
          <Input label="Furaha cusub" type="password" autoComplete="new-password" required hint="Ugu yaraan 10 xaraf." error={errors.newPassword?.message} {...register('newPassword')} />
          <Input label="Ku celi furaha cusub" type="password" autoComplete="new-password" required error={errors.confirm?.message} {...register('confirm')} />
          <Button type="submit" loading={isSubmitting}>
            Beddel furaha
          </Button>
        </form>
      </div>
    </AdminPage>
  );
}
