import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Archive, Pencil, Plus, Star } from 'lucide-react';
import { AdminPage, DataState, TableWrap, Toolbar } from '../../components/admin/AdminUI';
import ImageUploader from '../../components/admin/ImageUploader';
import Button from '../../components/common/Button';
import Modal, { ConfirmDialog } from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { Alert } from '../../components/common/Feedback';
import { Checkbox, Input, Select, Textarea } from '../../components/common/Field';
import { Badge, StockBadge } from '../../components/common/StatusBadge';
import ProductImage from '../../components/products/ProductImage';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import useDebounce from '../../hooks/useDebounce';
import useFetch from '../../hooks/useFetch';
import { productSchema } from '../../schemas/admin';
import { archiveProduct, createProduct, listCategories, listProducts, updateProduct } from '../../services/adminApi';
import { applyServerErrors } from '../../utils/formErrors';
import { UNITS, formatMoney, formatQty, unitLabel } from '../../utils/format';

const STATUSES = [
  { value: 'all', label: 'Dhammaan' },
  { value: 'active', label: 'Firfircoon' },
  { value: 'inactive', label: 'Dansan' },
  { value: 'low', label: 'Kayd yar' },
  { value: 'out', label: 'Kayd dhammaaday' },
  { value: 'archived', label: 'La kaydiyey (archived)' },
];

const EMPTY = {
  name: '', sku: '', barcode: '', category: '', description: '', price: 0, costPrice: 0, unit: 'piece', allowDecimal: false,
  stock: 0, lowStockThreshold: 10, isActive: true, isFeatured: false,
};

function ProductForm({ product, categories, onClose, onSaved }) {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const isEdit = Boolean(product?.id);
  const [images, setImages] = useState([]);
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(productSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!product) return;
    setServerError(null);
    setImages(product.images || []);
    reset(
      isEdit
        ? {
            name: product.name,
            sku: product.sku,
            barcode: product.barcode || '',
            category: product.category?.id || '',
            description: product.description || '',
            price: product.price,
            costPrice: product.costPrice ?? 0,
            unit: product.unit,
            allowDecimal: product.allowDecimal,
            stock: product.stock,
            lowStockThreshold: product.lowStockThreshold,
            isActive: product.isActive,
            isFeatured: product.isFeatured,
          }
        : EMPTY
    );
  }, [product, isEdit, reset]);

  const onSubmit = async (values) => {
    setServerError(null);
    // Kaydka waxaa la geliyaa kaliya marka alaabta la abuurayo; kadib waxaa lagu beddelaa bogga Kaydka.
    const { stock, costPrice, ...rest } = values;
    const payload = { ...rest, images };
    if (isAdmin) payload.costPrice = costPrice;
    try {
      if (isEdit) await updateProduct(product.id, payload);
      else await createProduct({ ...payload, stock });
      toast.success(isEdit ? 'Alaabta waa la cusboonaysiiyey' : 'Alaabta waa la abuuray');
      onSaved();
    } catch (err) {
      applyServerErrors(err, setError);
      setServerError(err);
    }
  };

  const numberField = { valueAsNumber: true };

  return (
    <Modal
      open={Boolean(product)}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Wax ka beddel alaabta' : 'Alaab cusub'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Ka noqo
          </Button>
          <Button type="submit" form="product-form" loading={isSubmitting}>
            Kaydi
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        {serverError && <Alert className="sm:col-span-2">{serverError.message}</Alert>}
        <Input label="Magaca alaabta" required error={errors.name?.message} {...register('name')} className="sm:col-span-2" />
        <Input label="SKU (koodhka alaabta)" required error={errors.sku?.message} hint="Waa in uu gaar ahaadaa. Tusaale: CEM-001" {...register('sku')} />
        <Input label="Barcode (ikhtiyaari)" error={errors.barcode?.message} hint="Scanner-ka kaashka ayaa ku raadiya. Ka tag madhan haddii aysan lahayn." {...register('barcode')} />
        <Select label="Qaybta" required error={errors.category?.message} {...register('category')}>
          <option value="">Dooro qayb…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input label="Qiimaha iibka" required type="number" step="0.01" min="0" error={errors.price?.message} {...register('price', numberField)} />
        {isAdmin ? (
          <Input label="Qiimaha iibsiga (cost)" type="number" step="0.01" min="0" error={errors.costPrice?.message} hint="Xog gudaha ah; dadweynaha lama tuso." {...register('costPrice', numberField)} />
        ) : (
          <div />
        )}
        <Select label="Halbeegga" required error={errors.unit?.message} {...register('unit')}>
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {unitLabel(u)} ({u})
            </option>
          ))}
        </Select>
        <Input label="Xadka kaydka yar" type="number" step="any" min="0" error={errors.lowStockThreshold?.message} hint="Digniin ayaa la bixiyaa marka kaydku halkan gaaro." {...register('lowStockThreshold', numberField)} />
        <Input
          label={isEdit ? 'Kaydka hadda' : 'Kaydka bilowga ah'}
          type="number"
          step="any"
          min="0"
          readOnly={isEdit}
          error={errors.stock?.message}
          hint={isEdit ? 'Kaydka waxaa lagu beddelaa bogga “Kaydka” si isbeddel kasta loo diiwaangeliyo.' : undefined}
          {...register('stock', numberField)}
        />
        <div className="space-y-3 self-end pb-1">
          <Checkbox label="Waxaa lagu iibin karaa tiro jajab ah" hint="Tusaale 2.5 mitir." {...register('allowDecimal')} />
        </div>
        <Textarea label="Sharraxaad" rows={4} error={errors.description?.message} {...register('description')} className="sm:col-span-2" />
        <div className="sm:col-span-2">
          <ImageUploader value={images} onChange={setImages} />
        </div>
        <Checkbox label="Firfircoon" hint="Dadweynuhu way arki karaan wayna dalban karaan." {...register('isActive')} />
        <Checkbox label="La xushay" hint="Waxaa lagu muujiyaa bogga hore." {...register('isFeatured')} />
      </form>
    </Modal>
  );
}

export default function Products() {
  const toast = useToast();
  const { settings } = useSettings();
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('all');
  const debounced = useDebounce(search.trim());
  const [editing, setEditing] = useState(null);
  const [archiving, setArchiving] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setPage(1), [debounced, category, status]);

  const categories = useFetch(listCategories, []);
  const { data, loading, error, reload } = useFetch(
    () => listProducts({ page, limit: 20, search: debounced, category, status }),
    [page, debounced, category, status]
  );
  const items = data?.data || [];

  const confirmArchive = async () => {
    setBusy(true);
    try {
      await archiveProduct(archiving.id);
      toast.success('Alaabta waa la kaydiyey (archived)');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setArchiving(null);
    }
  };

  const restore = async (p) => {
    try {
      await updateProduct(p.id, { isActive: true });
      toast.success('Alaabta waa la soo celiyey');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <AdminPage
      title="Alaabta"
      text="Ku dar, wax ka beddel, ama kaydi alaabta bakhaarka."
      actions={
        <Button onClick={() => setEditing({})} disabled={!categories.data?.length} title={categories.data?.length ? undefined : 'Marka hore abuur qayb'}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Alaab cusub
        </Button>
      }
    >
      <div className="card">
        <Toolbar>
          <Input label="Raadi" type="search" placeholder="Magac ama SKU" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-52 flex-1" />
          <Select label="Qaybta" value={category} onChange={(e) => setCategory(e.target.value)} className="w-48">
            <option value="">Dhammaan</option>
            {(categories.data || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select label="Xaalad" value={status} onChange={(e) => setStatus(e.target.value)} className="w-52">
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Toolbar>

        <DataState loading={loading && !data} error={error} onRetry={reload} empty={items.length === 0} emptyTitle="Alaab lama helin" emptyText="Beddel shaandhaynta ama ku dar alaab cusub.">
          <div className={loading ? 'opacity-60' : ''}>
            <TableWrap minWidth={900}>
              <thead className="bg-mist">
                <tr>
                  <th className="th">Alaab</th>
                  <th className="th">Qayb</th>
                  <th className="th text-right">Qiime</th>
                  {isAdmin && <th className="th text-right">Cost</th>}
                  <th className="th text-right">Kayd</th>
                  <th className="th">Xaalad</th>
                  <th className="th text-right">Hawlo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-mist/60">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <ProductImage src={p.images[0]} alt="" categorySlug={p.category?.slug} categoryName={p.category?.name} className="h-11 w-11 shrink-0 rounded-lg" iconClass="h-5 w-5" />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-bold">
                            <span className="truncate">{p.name}</span>
                            {p.isFeatured && <Star className="h-3.5 w-3.5 shrink-0 fill-gold text-gold" aria-label="La xushay" />}
                          </p>
                          <p className="num text-xs text-slate-500">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td text-slate-600">{p.category?.name || '—'}</td>
                    <td className="td num text-right font-semibold">
                      {formatMoney(p.price, settings.currency)}
                      <span className="block text-xs font-normal text-slate-500">/ {unitLabel(p.unit)}</span>
                    </td>
                    {isAdmin && <td className="td num text-right text-slate-600">{formatMoney(p.costPrice, settings.currency)}</td>}
                    <td className="td num text-right font-semibold">{formatQty(p.stock)}</td>
                    <td className="td">
                      <div className="flex flex-wrap gap-1">
                        {p.isArchived ? (
                          <Badge className="bg-slate-200 text-slate-800">Archived</Badge>
                        ) : (
                          <>
                            <StockBadge product={p} />
                            {!p.isActive && <Badge className="bg-slate-200 text-slate-800">Dansan</Badge>}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        {p.isArchived ? (
                          <Button variant="outline" size="sm" onClick={() => restore(p)}>
                            Soo celi
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => setEditing(p)} aria-label={`Wax ka beddel ${p.name}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-700 hover:bg-red-50" onClick={() => setArchiving(p)} aria-label={`Kaydi ${p.name}`}>
                              <Archive className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
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

      <ProductForm
        product={editing}
        categories={categories.data || []}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
      <ConfirmDialog
        open={Boolean(archiving)}
        danger
        loading={busy}
        title="Kaydi alaabta (archive)"
        message={`"${archiving?.name}" waa laga qarinayaa website-ka. Diiwaanka dalabyada iyo kaydku way sii jirayaan, mar dambena waad soo celin kartaa.`}
        confirmLabel="Kaydi"
        onConfirm={confirmArchive}
        onCancel={() => setArchiving(null)}
      />
    </AdminPage>
  );
}
