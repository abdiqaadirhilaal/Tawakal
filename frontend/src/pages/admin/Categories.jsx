import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { AdminPage, DataState, TableWrap } from '../../components/admin/AdminUI';
import Button from '../../components/common/Button';
import Modal, { ConfirmDialog } from '../../components/common/Modal';
import { Alert } from '../../components/common/Feedback';
import { Checkbox, Input, Textarea } from '../../components/common/Field';
import { Badge } from '../../components/common/StatusBadge';
import { useToast } from '../../context/ToastContext';
import useFetch from '../../hooks/useFetch';
import { categorySchema } from '../../schemas/admin';
import { createCategory, deleteCategory, listCategories, updateCategory } from '../../services/adminApi';
import { applyServerErrors } from '../../utils/formErrors';

const EMPTY = { name: '', description: '', isActive: true };

function CategoryForm({ category, onClose, onSaved }) {
  const toast = useToast();
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(categorySchema), defaultValues: EMPTY });

  useEffect(() => {
    reset(category?.id ? { name: category.name, description: category.description || '', isActive: category.isActive } : EMPTY);
    setServerError(null);
  }, [category, reset]);

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      if (category?.id) await updateCategory(category.id, values);
      else await createCategory(values);
      toast.success(category?.id ? 'Qaybta waa la cusboonaysiiyey' : 'Qaybta waa la abuuray');
      onSaved();
    } catch (err) {
      applyServerErrors(err, setError);
      setServerError(err);
    }
  };

  return (
    <Modal
      open={Boolean(category)}
      onClose={onClose}
      title={category?.id ? 'Wax ka beddel qaybta' : 'Qayb cusub'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Ka noqo
          </Button>
          <Button type="submit" form="category-form" loading={isSubmitting}>
            Kaydi
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && <Alert>{serverError.message}</Alert>}
        <Input label="Magaca qaybta" required error={errors.name?.message} {...register('name')} />
        <Textarea label="Sharraxaad" rows={3} error={errors.description?.message} {...register('description')} />
        <Checkbox label="Firfircoon" hint="Qaybaha aan firfircoonayn iyo alaabtooda dadweynaha lama tuso." {...register('isActive')} />
      </form>
    </Modal>
  );
}

export default function Categories() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(listCategories, []);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await deleteCategory(deleting.id);
      toast.success('Qaybta waa la tirtiray');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(err.message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminPage
      title="Qaybaha"
      text="Qaybaha alaabta loo kala saaro."
      actions={
        <Button onClick={() => setEditing({})}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Qayb cusub
        </Button>
      }
    >
      <div className="card">
        <DataState loading={loading && !data} error={error} onRetry={reload} empty={data?.length === 0} emptyTitle="Qaybo weli ma jiraan" emptyText="Ku bilow in aad abuurto qaybta koowaad.">
          <TableWrap minWidth={560}>
            <thead className="bg-mist">
              <tr>
                <th className="th">Magac</th>
                <th className="th">Sharraxaad</th>
                <th className="th text-right">Alaab</th>
                <th className="th">Xaalad</th>
                <th className="th text-right">Hawlo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data || []).map((c) => (
                <tr key={c.id} className="hover:bg-mist/60">
                  <td className="td font-bold">{c.name}</td>
                  <td className="td max-w-xs truncate text-slate-600">{c.description || '—'}</td>
                  <td className="td num text-right">{c.productCount}</td>
                  <td className="td">
                    <Badge className={c.isActive ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-800'}>{c.isActive ? 'Firfircoon' : 'Dansan'}</Badge>
                  </td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(c)} aria-label={`Wax ka beddel ${c.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-700 hover:bg-red-50" onClick={() => setDeleting(c)} aria-label={`Tirtir ${c.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </DataState>
      </div>

      <CategoryForm
        category={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        danger
        loading={busy}
        title="Tirtir qaybta"
        message={
          deleting?.productCount > 0
            ? `"${deleting?.name}" waxaa ku xiran ${deleting?.productCount} alaab. Server-ku wuu diidayaa tirtiridda ilaa alaabta loo wareejiyo qayb kale.`
            : `Ma hubtaa in aad tirtirto "${deleting?.name}"?`
        }
        confirmLabel="Tirtir"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </AdminPage>
  );
}
