import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Minus, Plus, Printer, ScanLine, Search, ShoppingCart, Trash2, X } from 'lucide-react';
import Button from '../../../components/common/Button';
import Modal, { ConfirmDialog } from '../../../components/common/Modal';
import { Alert, EmptyState, ErrorState, Skeleton, Spinner } from '../../../components/common/Feedback';
import { Input } from '../../../components/common/Field';
import ProductImage from '../../../components/products/ProductImage';
import PaymentModal from '../../../components/pos/PaymentModal';
import Receipt, { ReceiptPrintPortal, companyFromConfig } from '../../../components/pos/Receipt';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import useDebounce from '../../../hooks/useDebounce';
import useFetch from '../../../hooks/useFetch';
import * as posApi from '../../../services/posApi';
import { formatMoney, formatQty, unitLabel } from '../../../utils/format';
import { clampPosQuantity, discountState, posLineTotal, posTotals } from '../../../utils/pos';

const CART_KEY = 'tawakal_pos_cart_v1';

function loadCart() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((i) => i && typeof i.id === 'string' && Number(i.quantity) > 0) : [];
  } catch {
    return [];
  }
}

function OpenShiftGate({ onOpened }) {
  const toast = useToast();
  const [cash, setCash] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const value = Number(cash);
  const valid = cash !== '' && Number.isFinite(value) && value >= 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      onOpened(await posApi.openShift(value));
      toast.success('Shift-ka waa la furay');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-10">
      <form onSubmit={submit} noValidate className="card space-y-4 p-6">
        <div>
          <p className="eyebrow">Kaashka</p>
          <h1 className="mt-1 text-2xl font-extrabold text-navy">Fur shift-kaaga</h1>
          <p className="mt-1 text-sm text-slate-600">Tiri lacagta caddaanka ah ee khasnadda ku jirta hadda, kadibna geli. Iibku wuxuu bilaabmayaa marka shift-ku furmo.</p>
        </div>
        {error && <Alert>{error.message}</Alert>}
        <Input label="Lacagta furitaanka (caddaan)" type="number" inputMode="decimal" min="0" step="0.01" required value={cash} onChange={(e) => setCash(e.target.value)} />
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!valid}>
          Fur shift-ka
        </Button>
      </form>
    </div>
  );
}

function ProductTile({ product, inCart, currency, onAdd }) {
  const out = product.stock <= 0;
  const maxed = inCart >= product.stock;
  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      disabled={out || maxed}
      className="card group flex flex-col overflow-hidden text-left transition-shadow hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-55"
      aria-label={`Ku dar ${product.name}, ${formatMoney(product.price, currency)}`}
    >
      <div className="relative">
        <ProductImage src={product.image} alt="" categorySlug={product.category?.slug} categoryName={product.category?.name} className="aspect-[5/3] w-full" iconClass="h-8 w-8" />
        {inCart > 0 && <span className="num absolute right-2 top-2 grid h-7 min-w-7 place-items-center rounded-full bg-gold px-1.5 text-xs font-extrabold text-navy">{formatQty(inCart)}</span>}
        {out && <span className="absolute left-2 top-2 rounded-full bg-navy px-2 py-0.5 text-[11px] font-bold text-white">Dhammaaday</span>}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-bold leading-snug text-navy">{product.name}</p>
        <p className="num text-[11px] text-slate-500">{product.sku}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <p className="num text-base font-extrabold text-royal">
            {formatMoney(product.price, currency)}
            <span className="ml-1 text-[11px] font-semibold text-slate-500">/{unitLabel(product.unit)}</span>
          </p>
          <p className={`num text-[11px] font-bold ${out ? 'text-red-700' : product.stock <= 5 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {formatQty(product.stock)} {unitLabel(product.unit)}
          </p>
        </div>
      </div>
    </button>
  );
}

export default function Pos() {
  const toast = useToast();
  const { isSupervisor } = useAuth();
  const searchRef = useRef(null);

  const config = useFetch(posApi.getConfig, []);
  const shift = useFetch(posApi.currentShift, []);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search.trim(), 250);
  useEffect(() => setPage(1), [debounced, category]);
  const products = useFetch(() => posApi.listProducts({ page, limit: 24, search: debounced, category }), [page, debounced, category]);

  const [cart, setCart] = useState(loadCart);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [discount, setDiscount] = useState({ kind: 'percent', value: '' });
  const [paying, setPaying] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [completed, setCompleted] = useState(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* waa la iska dhaafi karaa */
    }
  }, [cart]);

  // Ku cusboonaysii qiimaha iyo kaydka dambiisha xogta cusub ee liiska alaabta.
  const items = products.data?.data;
  useEffect(() => {
    if (!items) return;
    const fresh = new Map(items.map((p) => [p.id, p]));
    setCart((list) => {
      let changed = false;
      const next = list.map((i) => {
        const p = fresh.get(i.id);
        if (!p || (p.price === i.price && p.stock === i.stock && p.name === i.name)) return i;
        changed = true;
        return { ...i, ...p, quantity: i.quantity };
      });
      return changed ? next : list;
    });
  }, [items]);

  // Nuqul had iyo jeer cusub oo dambiisha ah, si riixitaan degdeg ah ama scanner uusan u isticmaalin xog duugowday.
  const cartRef = useRef(cart);
  cartRef.current = cart;

  const addToCart = useCallback(
    (product, quantity = 1) => {
      if (product.stock <= 0) {
        toast.error(`"${product.name}" kaydkeedu wuu dhammaaday`);
        return;
      }
      const existing = cartRef.current.find((i) => i.id === product.id);
      let wanted = clampPosQuantity((existing ? existing.quantity : 0) + quantity, product);
      if (wanted > product.stock) {
        toast.error(`"${product.name}": kaydka waxaa ku jira ${formatQty(product.stock)} ${unitLabel(product.unit)} oo kaliya`);
        wanted = product.stock;
      }
      const next = { ...product, quantity: wanted };
      cartRef.current = existing ? cartRef.current.map((i) => (i.id === product.id ? next : i)) : [...cartRef.current, next];
      setCart(cartRef.current);
    },
    [toast]
  );

  const setQuantity = (id, value) => setCart((list) => list.map((i) => (i.id === id ? { ...i, quantity: clampPosQuantity(value, i) } : i)));
  const removeItem = (id) => setCart((list) => list.filter((i) => i.id !== id));
  const resetSale = () => {
    setCart([]);
    setCustomer({ name: '', phone: '' });
    setDiscount({ kind: 'percent', value: '' });
  };

  // Scanner-ka barcode-ku wuxuu qoraa koodhka kadibna Enter. Koodh sax ah = si toos ah ugu dar dambiisha.
  const onSearchKeyDown = async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    try {
      const res = await posApi.searchProducts(q);
      if (res.exact || res.items.length === 1) {
        addToCart(res.items[0]);
        setSearch('');
      } else if (res.items.length === 0) {
        toast.error(`Alaab lama helin: "${q}"`);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const cfg = config.data;
  // Kaliya soo-rarka koowaad ayaa shaashadda xira; cusboonaysiinta dambe (iib kadib) ma xirto.
  const shiftLoaded = useRef(false);
  if (!shift.loading) shiftLoaded.current = true;
  const currency = cfg?.currency || 'USD';
  const totals = useMemo(() => posTotals(cart, discount), [cart, discount]);
  const dState = discountState(totals.percent, cfg, isSupervisor);
  const overStock = cart.filter((i) => i.quantity > i.stock);
  const phoneOk = customer.phone.trim() === '' || /^\+?[0-9][0-9\s-]{5,22}$/.test(customer.phone.trim());
  const canPay = cart.length > 0 && overStock.length === 0 && dState !== 'blocked' && phoneOk;

  if (config.error || shift.error) {
    const err = config.error || shift.error;
    return <ErrorState error={err} onRetry={() => { config.reload(); shift.reload(); }} />;
  }
  if (!cfg || !shiftLoaded.current) return <Spinner label="POS waa la diyaarinayaa…" />;
  if (cfg.requireOpenShift && !shift.data) return <OpenShiftGate onOpened={(s) => shift.setData(s)} />;

  const inCartOf = (id) => cart.find((i) => i.id === id)?.quantity || 0;
  const pagination = products.data?.pagination;
  const chip = (active) =>
    `whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
      active ? 'border-navy bg-navy text-white' : 'border-slate-300 bg-white text-navy hover:border-royal hover:text-royal'
    }`;

  return (
    <div className="no-print">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Kaashka (POS)</h1>
          <p className="text-sm text-slate-600">
            {shift.data ? (
              <>
                Shift-ku wuu furan yahay · {shift.data.summary.salesCount} iib ·{' '}
                <Link to="/admin/pos/shifts" className="font-bold text-royal hover:underline">
                  Eeg / xir shift-ka
                </Link>
              </>
            ) : (
              'Shift looma baahna (dejinta).'
            )}
          </p>
        </div>
        <Button to="/admin/pos/sales" variant="outline" size="sm">
          Iibkii hore
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        {/* Alaabta */}
        <section aria-label="Alaabta">
          <div className="card p-4">
            <div className="relative">
              <label htmlFor="pos-search" className="sr-only">
                Raadi magac, SKU ama barcode
              </label>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="pos-search"
                ref={searchRef}
                type="search"
                autoFocus
                autoComplete="off"
                maxLength={80}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Raadi magac, SKU, ama scan-garee barcode…"
                className="block h-14 w-full rounded-xl border-2 border-slate-300 bg-white pl-12 pr-12 text-lg font-semibold text-navy placeholder:font-normal placeholder:text-slate-400 focus:border-royal focus:outline-none focus:ring-4 focus:ring-royal/15"
              />
              <ScanLine className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">Riix Enter si koodh sax ah (barcode ama SKU) si toos ah loogu daro dambiisha.</p>
            <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Qaybaha">
              <button type="button" className={chip(!category)} aria-pressed={!category} onClick={() => setCategory('')}>
                Dhammaan
              </button>
              {cfg.categories.map((c) => (
                <button key={c.id} type="button" className={chip(category === c.id)} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            {products.error ? (
              <div className="card">
                <ErrorState error={products.error} onRetry={products.reload} />
              </div>
            ) : !items ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="h-44 w-full" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="card">
                <EmptyState title="Alaab lama helin" text="Beddel raadinta ama qaybta." />
              </div>
            ) : (
              <>
                <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 ${products.loading ? 'opacity-60' : ''}`}>
                  {items.map((p) => (
                    <ProductTile key={p.id} product={p} inCart={inCartOf(p.id)} currency={currency} onAdd={addToCart} />
                  ))}
                </div>
                {pagination && pagination.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      Hore
                    </Button>
                    <span className="num text-slate-600">
                      Bogga {pagination.page} / {pagination.totalPages} · {pagination.total} alaab
                    </span>
                    <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
                      Xiga
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Dambiisha */}
        <aside id="pos-cart" className="card flex h-fit flex-col xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)]" aria-label="Dambiisha iibka">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-navy">
              <ShoppingCart className="h-5 w-5" aria-hidden="true" /> Dambiisha
              <span className="num rounded-full bg-mist px-2 py-0.5 text-xs">{cart.length}</span>
            </h2>
            <button type="button" onClick={() => setConfirmClear(true)} disabled={cart.length === 0} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-40">
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Faaruqi
            </button>
          </div>

          <div className="min-h-24 flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">Dambiishu waa madhan tahay. Riix alaab si aad ugu darto.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {cart.map((i) => {
                  const over = i.quantity > i.stock;
                  return (
                    <li key={i.id} className={`px-4 py-3 ${over ? 'bg-red-50' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-navy">{i.name}</p>
                          <p className="num text-xs text-slate-500">
                            {i.sku} · {formatMoney(i.price, currency)} / {unitLabel(i.unit)}
                          </p>
                        </div>
                        <button type="button" onClick={() => removeItem(i.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-700" aria-label={`Ka saar ${i.name}`}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="inline-flex items-stretch overflow-hidden rounded-lg border border-slate-300">
                          <button type="button" className="grid h-9 w-9 place-items-center hover:bg-royal-50 disabled:opacity-40" onClick={() => setQuantity(i.id, i.quantity - 1)} disabled={i.quantity <= (i.allowDecimal ? 0.001 : 1)} aria-label="Dhin tirada">
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            type="number"
                            inputMode={i.allowDecimal ? 'decimal' : 'numeric'}
                            min={i.allowDecimal ? 0.001 : 1}
                            step={i.allowDecimal ? 'any' : 1}
                            value={i.quantity}
                            onChange={(e) => e.target.value !== '' && setQuantity(i.id, e.target.value)}
                            aria-label={`Tirada ${i.name}`}
                            className="num h-9 w-16 border-x border-slate-300 text-center text-sm font-bold text-navy focus:outline-none focus:ring-2 focus:ring-inset focus:ring-royal/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button type="button" className="grid h-9 w-9 place-items-center hover:bg-royal-50 disabled:opacity-40" onClick={() => setQuantity(i.id, i.quantity + 1)} disabled={i.quantity >= i.stock} aria-label="Kordhi tirada">
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">{unitLabel(i.unit)}</span>
                        <span className="num ml-auto text-base font-extrabold text-navy">{formatMoney(posLineTotal(i), currency)}</span>
                      </div>
                      {over && (
                        <p className="mt-1.5 text-xs font-bold text-red-700" role="alert">
                          Kaydku kuma filna: waxaa jira {formatQty(i.stock)} {unitLabel(i.unit)} oo kaliya.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-3 border-t border-slate-200 p-4">
            <div className="grid grid-cols-2 gap-2">
              <Input label="Macmiil (ikhtiyaari)" placeholder="Magac" maxLength={80} value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
              <Input label="Taleefan" type="tel" inputMode="tel" placeholder="061…" maxLength={30} value={customer.phone} error={phoneOk ? undefined : 'Sax ma aha'} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
            </div>

            {cfg.discountsEnabled && (
              <div>
                <p className="label">Qiimo-dhimis</p>
                <div className="flex gap-2">
                  <select className="input w-28" value={discount.kind} onChange={(e) => setDiscount({ ...discount, kind: e.target.value })} aria-label="Nooca qiimo-dhimista">
                    <option value="percent">%</option>
                    <option value="amount">{currency}</option>
                  </select>
                  <input className="input num" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0" value={discount.value} onChange={(e) => setDiscount({ ...discount, value: e.target.value })} aria-label="Qiimaha qiimo-dhimista" />
                </div>
                {dState === 'approval' && <p className="mt-1 text-xs font-bold text-amber-700">Ka badan {cfg.cashierMaxDiscountPercent}%: oggolaansho maamule ayaa la weydiin doonaa.</p>}
                {dState === 'blocked' && <p className="mt-1 text-xs font-bold text-red-700" role="alert">Qiimo-dhimistu kama badnaan karto {cfg.maxDiscountPercent}%.</p>}
              </div>
            )}

            <dl className="num space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">Wadarta alaabta</dt>
                <dd className="font-semibold text-navy">{formatMoney(totals.subtotal, currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Qiimo-dhimis{totals.percent > 0 ? ` (${formatQty(totals.percent)}%)` : ''}</dt>
                <dd className="font-semibold text-navy">-{formatMoney(totals.discountAmount, currency)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                <dt className="text-base font-extrabold text-navy">Wadarta guud</dt>
                <dd className="text-3xl font-extrabold text-royal">{formatMoney(totals.grandTotal, currency)}</dd>
              </div>
            </dl>

            <Button variant="gold" size="lg" className="h-14 w-full text-lg" disabled={!canPay} onClick={() => setPaying(true)}>
              Dhammaystir iibka
            </Button>
          </div>
        </aside>
      </div>

      {/* Mobile: koobitaan hoose oo ku xiran dambiisha */}
      {cart.length > 0 && (
        <a href="#pos-cart" className="fixed inset-x-3 bottom-3 z-20 flex items-center justify-between rounded-xl bg-navy px-4 py-3 text-white shadow-lift xl:hidden">
          <span className="text-sm font-bold">{cart.length} alaab dambiisha ku jira</span>
          <span className="num text-lg font-extrabold text-gold">{formatMoney(totals.grandTotal, currency)}</span>
        </a>
      )}

      <PaymentModal
        open={paying}
        onClose={() => setPaying(false)}
        cart={cart}
        totals={totals}
        config={cfg}
        customer={customer}
        discount={discount}
        needsApproval={dState === 'approval'}
        onCompleted={(sale) => {
          // Dambiisha waxaa la faaruqiyaa kaliya marka server-ku xaqiijiyo iibka.
          setPaying(false);
          resetSale();
          setCompleted(sale);
          products.reload();
          shift.reload();
        }}
      />

      <ConfirmDialog
        open={confirmClear}
        danger
        title="Faaruqi dambiisha"
        message="Dhammaan alaabta dambiisha ku jirta waa la saarayaa. Iib lama diiwaangelinayo."
        confirmLabel="Haa, faaruqi"
        onConfirm={() => {
          resetSale();
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />

      <Modal
        open={Boolean(completed)}
        onClose={() => setCompleted(null)}
        title="Iibka waa la dhammaystiray"
        footer={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden="true" /> Daabac rasiidka
            </Button>
            <Button
              variant="gold"
              data-autofocus
              onClick={() => {
                setCompleted(null);
                setTimeout(() => searchRef.current?.focus(), 60);
              }}
            >
              Iibka xiga
            </Button>
          </>
        }
      >
        {completed && (
          <div>
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-900">
              <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-600" aria-hidden="true" />
              <div>
                <p className="font-bold">Rasiid {completed.receiptNumber}</p>
                {completed.paymentMethod.type === 'cash' && (
                  <p className="num text-sm">
                    Baaqiga la celinayo: <strong className="text-lg">{formatMoney(completed.changeGiven, completed.currency)}</strong>
                  </p>
                )}
              </div>
            </div>
            <div className="mx-auto max-w-xs rounded-xl border border-slate-200 p-4">
              <Receipt sale={completed} company={companyFromConfig(cfg)} />
            </div>
          </div>
        )}
      </Modal>
      {completed && <ReceiptPrintPortal sale={completed} company={companyFromConfig(cfg)} />}
    </div>
  );
}
