import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, PackagePlus, PackageX, SlidersHorizontal } from 'lucide-react';
import { AdminPage, DataState, StatCard, TableWrap, Tabs, Toolbar } from '../../components/admin/AdminUI';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { Alert } from '../../components/common/Feedback';
import { Checkbox, Input, Select, Textarea } from '../../components/common/Field';
import { Badge, StockBadge } from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import useDebounce from '../../hooks/useDebounce';
import useFetch from '../../hooks/useFetch';
import { adjustmentSchema, receiptSchema } from '../../schemas/admin';
import { adjustStock, listInventory, listMovements, receiveStock } from '../../services/adminApi';
import { applyServerErrors } from '../../utils/formErrors';
import { MOVEMENT_LABELS, formatDate, formatMoney, formatQty, unitLabel, uuid } from '../../utils/format';

function AdjustModal({ product, onClose, onDone }) {
  const toast = useToast();
  const key = useRef(uuid());
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(adjustmentSchema), defaultValues: { direction: 'increase', quantity: 1, reason: '' } });

  useEffect(() => {
    if (!product) return;
    key.current = uuid(); // fure cusub isbeddel kasta
    setServerError(null);
    reset({ direction: 'increase', quantity: 1, reason: '' });
  }, [product, reset]);

  const direction = watch('direction');
  const quantity = watch('quantity');
  const delta = (direction === 'decrease' ? -1 : 1) * (Number.isFinite(quantity) ? quantity : 0);
  const after = product ? product.stock + delta : 0;

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const res = await adjustStock({
        idempotencyKey: key.current,
        productId: product.id,
        quantityChange: values.direction === 'decrease' ? -values.quantity : values.quantity,
        reason: values.reason,
      });
      toast.success(res.duplicate ? 'Isbeddelkan hore ayaa loo diiwaangeliyey' : 'Kaydka waa la hagaajiyey');
      onDone();
    } catch (err) {
      applyServerErrors(err, setError, { quantityChange: 'quantity' });
      setServerError(err);
    }
  };

  return (
    <Modal
      open={Boolean(product)}
      onClose={onClose}
      title={`Hagaaji kaydka: ${product?.name || ''}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Ka noqo
          </Button>
          <Button type="submit" form="adjust-form" loading={isSubmitting} disabled={after < 0}>
            Kaydi isbeddelka
          </Button>
        </>
      }
    >
      {product && (
        <form id="adjust-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {serverError && <Alert>{serverError.message}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Nooca isbeddelka" {...register('direction')}>
              <option value="increase">Kordhi (+)</option>
              <option value="decrease">Dhin (−)</option>
            </Select>
            <Input label={`Tirada (${unitLabel(product.unit)})`} required type="number" min="0" step={product.allowDecimal ? 'any' : 1} error={errors.quantity?.message} {...register('quantity', { valueAsNumber: true })} />
          </div>
          <Textarea label="Sababta" required rows={2} placeholder="Tusaale: tirin cusub, alaab jabtay, khalad gelin…" error={errors.reason?.message} {...register('reason')} />
          <p className={`num rounded-lg px-4 py-3 text-sm font-semibold ${after < 0 ? 'bg-red-50 text-red-800' : 'bg-mist text-navy'}`}>
            Kaydka: {formatQty(product.stock)} → {formatQty(after)} {unitLabel(product.unit)}
            {after < 0 && ' (kaydku ma noqon karo wax ka yar 0)'}
          </p>
        </form>
      )}
    </Modal>
  );
}

function ReceiveModal({ product, onClose, onDone }) {
  const toast = useToast();
  const { settings } = useSettings();
  const key = useRef(uuid());
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(receiptSchema), defaultValues: { quantity: 1, unitCost: 0, supplier: '', note: '', updateCostPrice: true } });

  useEffect(() => {
    if (!product) return;
    key.current = uuid();
    setServerError(null);
    reset({ quantity: 1, unitCost: product.costPrice ?? 0, supplier: '', note: '', updateCostPrice: true });
  }, [product, reset]);

  const quantity = watch('quantity');
  const unitCost = watch('unitCost');
  const total = (Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(unitCost) ? unitCost : 0);

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const res = await receiveStock({ idempotencyKey: key.current, productId: product.id, ...values });
      toast.success(res.duplicate ? 'Rasiidkan hore ayaa loo diiwaangeliyey' : 'Alaabta la helay waa la diiwaangeliyey');
      onDone();
    } catch (err) {
      applyServerErrors(err, setError);
      setServerError(err);
    }
  };

  return (
    <Modal
      open={Boolean(product)}
      onClose={onClose}
      title={`Hel alaab: ${product?.name || ''}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Ka noqo
          </Button>
          <Button type="submit" form="receive-form" loading={isSubmitting}>
            Diiwaangeli
          </Button>
        </>
      }
    >
      {product && (
        <form id="receive-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {serverError && <Alert>{serverError.message}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={`Tirada la helay (${unitLabel(product.unit)})`} required type="number" min="0" step={product.allowDecimal ? 'any' : 1} error={errors.quantity?.message} {...register('quantity', { valueAsNumber: true })} />
            <Input label={`Qiimaha iibsiga halkii ${unitLabel(product.unit)}`} required type="number" min="0" step="0.01" error={errors.unitCost?.message} {...register('unitCost', { valueAsNumber: true })} />
          </div>
          <Input label="Alaab-qeybiyaha (supplier)" error={errors.supplier?.message} {...register('supplier')} />
          <Input label="Faallo" error={errors.note?.message} {...register('note')} />
          <Checkbox label="Ku cusboonaysii qiimaha iibsiga ee alaabta" hint="Qiimaha cost-ka alaabta wuxuu noqonayaa qiimahan." {...register('updateCostPrice')} />
          <p className="num rounded-lg bg-mist px-4 py-3 text-sm font-semibold text-navy">Wadarta kharashka: {formatMoney(total, settings.currency)}</p>
        </form>
      )}
    </Modal>
  );
}

function StockTab() {
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const debounced = useDebounce(search.trim());
  const [adjusting, setAdjusting] = useState(null);
  const [receiving, setReceiving] = useState(null);

  useEffect(() => setPage(1), [debounced, filter]);
  const { data, loading, error, reload } = useFetch(() => listInventory({ page, limit: 20, search: debounced, filter }), [page, debounced, filter]);
  const items = data?.data.items || [];
  const alerts = data?.data.alerts;

  return (
    <>
      {alerts && (
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <StatCard icon={AlertTriangle} tone="amber" label="Kayd yar" value={alerts.lowStock} hint="Alaabta kaydkeedu gaaray xadka digniinta." />
          <StatCard icon={PackageX} tone="red" label="Kayd dhammaaday" value={alerts.outOfStock} hint="Alaabta aan hadda la iibin karin." />
        </div>
      )}
      <div className="card">
        <Toolbar>
          <Input label="Raadi" type="search" placeholder="Magac ama SKU" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-52 flex-1" />
          <Select label="Muuji" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-48">
            <option value="all">Dhammaan alaabta</option>
            <option value="low">Kayd yar</option>
            <option value="out">Kayd dhammaaday</option>
          </Select>
        </Toolbar>
        <DataState loading={loading && !data} error={error} onRetry={reload} empty={items.length === 0} emptyTitle="Alaab lama helin">
          <div className={loading ? 'opacity-60' : ''}>
            <TableWrap minWidth={820}>
              <thead className="bg-mist">
                <tr>
                  <th className="th">Alaab</th>
                  <th className="th">Qayb</th>
                  <th className="th text-right">Kayd</th>
                  <th className="th text-right">Xadka digniinta</th>
                  <th className="th">Xaalad</th>
                  <th className="th text-right">Hawlo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-mist/60">
                    <td className="td">
                      <p className="font-bold">{p.name}</p>
                      <p className="num text-xs text-slate-500">{p.sku}</p>
                    </td>
                    <td className="td text-slate-600">{p.category?.name || '—'}</td>
                    <td className="td num text-right text-base font-extrabold">
                      {formatQty(p.stock)} <span className="text-xs font-normal text-slate-500">{unitLabel(p.unit)}</span>
                    </td>
                    <td className="td num text-right text-slate-600">{formatQty(p.lowStockThreshold)}</td>
                    <td className="td">
                      <StockBadge product={p} />
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-2">
                        {isAdmin && (
                          <Button size="sm" onClick={() => setReceiving(p)}>
                            <PackagePlus className="h-4 w-4" aria-hidden="true" /> Hel alaab
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setAdjusting(p)}>
                          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Hagaaji
                        </Button>
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

      <AdjustModal
        product={adjusting}
        onClose={() => setAdjusting(null)}
        onDone={() => {
          setAdjusting(null);
          reload();
        }}
      />
      <ReceiveModal
        product={receiving}
        onClose={() => setReceiving(null)}
        onDone={() => {
          setReceiving(null);
          reload();
        }}
      />
    </>
  );
}

const TYPE_CLS = {
  initial: 'bg-slate-200 text-slate-800',
  receipt: 'bg-emerald-100 text-emerald-900',
  adjustment: 'bg-royal-100 text-royal-800',
  sale: 'bg-gold-100 text-gold-700',
  cancellation_restore: 'bg-purple-100 text-purple-900',
  pos_sale: 'bg-cyan-100 text-cyan-900',
  refund_restock: 'bg-red-100 text-red-900',
};

function MovementsTab() {
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const [page, setPage] = useState(1);
  const [type, setType] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => setPage(1), [type, from, to]);
  const { data, loading, error, reload } = useFetch(() => listMovements({ page, limit: 25, type, from, to }), [page, type, from, to]);
  const rows = data?.data || [];

  return (
    <div className="card">
      <Toolbar>
        <Select label="Nooca" value={type} onChange={(e) => setType(e.target.value)} className="w-52">
          <option value="all">Dhammaan</option>
          {Object.entries(MOVEMENT_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Input label="Laga bilaabo" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        <Input label="Ilaa" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="w-40" />
      </Toolbar>
      <DataState loading={loading && !data} error={error} onRetry={reload} empty={rows.length === 0} emptyTitle="Dhaqdhaqaaq lama helin" emptyText="Isbeddel kasta oo kaydka ku dhaca halkan ayaa lagu diiwaangeliyaa.">
        <div className={loading ? 'opacity-60' : ''}>
          <TableWrap minWidth={980}>
            <thead className="bg-mist">
              <tr>
                <th className="th">Taariikh</th>
                <th className="th">Alaab</th>
                <th className="th">Nooc</th>
                <th className="th text-right">Isbeddel</th>
                <th className="th text-right">Ka hor → Kadib</th>
                <th className="th">Sabab / tixraac</th>
                <th className="th">Qofka</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-mist/60">
                  <td className="td num whitespace-nowrap text-slate-600">{formatDate(m.createdAt, true)}</td>
                  <td className="td">
                    <p className="font-bold">{m.product?.name || '—'}</p>
                    <p className="num text-xs text-slate-500">{m.product?.sku}</p>
                  </td>
                  <td className="td">
                    <Badge className={TYPE_CLS[m.type]}>{MOVEMENT_LABELS[m.type] || m.type}</Badge>
                  </td>
                  <td className={`td num text-right font-extrabold ${m.quantityChange < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                    {m.quantityChange > 0 ? '+' : ''}
                    {formatQty(m.quantityChange)}
                  </td>
                  <td className="td num text-right text-slate-600">
                    {formatQty(m.stockBefore)} → <span className="font-bold text-navy">{formatQty(m.stockAfter)}</span>
                  </td>
                  <td className="td max-w-xs text-slate-600">
                    {m.reason || m.refLabel || '—'}
                    {m.supplier && <span className="block text-xs">Alaab-qeybiye: {m.supplier}</span>}
                    {isAdmin && m.unitCost != null && <span className="num block text-xs">Cost: {formatMoney(m.unitCost, settings.currency)}</span>}
                  </td>
                  <td className="td text-slate-600">{m.userName || (m.type === 'sale' ? 'Website-ka' : 'Nidaamka')}</td>
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
  );
}

export default function Inventory() {
  const [tab, setTab] = useState('stock');
  return (
    <AdminPage title="Kaydka" text="Hel alaab, hagaaji kaydka, oo eeg taariikhda dhaqdhaqaaqa.">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'stock', label: 'Kaydka hadda' },
          { value: 'movements', label: 'Taariikhda dhaqdhaqaaqa' },
        ]}
      />
      {tab === 'stock' ? <StockTab /> : <MovementsTab />}
    </AdminPage>
  );
}
