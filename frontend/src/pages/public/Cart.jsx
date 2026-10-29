import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingCart, Trash2 } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import WhatsAppButton from '../../components/common/WhatsAppButton';
import { Alert, EmptyState } from '../../components/common/Feedback';
import ProductImage from '../../components/products/ProductImage';
import QuantityInput from '../../components/products/QuantityInput';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import useCartSync from '../../hooks/useCartSync';
import usePageMeta from '../../hooks/usePageMeta';
import OrderTotals from '../../components/cart/OrderTotals';
import { estimateTotals, lineTotal } from '../../utils/cart';
import { formatMoney, unitLabel } from '../../utils/format';
import { cartMessage } from '../../utils/whatsapp';

export default function Cart() {
  usePageMeta('Dambiisha');
  const { items, setQuantity, remove, clear } = useCart();
  const { settings } = useSettings();
  const syncing = useCartSync();
  const currency = settings.currency;

  const available = items.filter((i) => !i.unavailable);
  const hasUnavailable = available.length !== items.length;
  const totals = estimateTotals(available, settings, 'delivery');

  if (items.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Dalabkaaga" title="Dambiisha" />
        <div className="container-page py-10">
          <div className="card">
            <EmptyState icon={ShoppingCart} title="Dambiishaadu waa madhan tahay" text="Ku dar alaabta aad u baahan tahay si aad u bilowdo dalabkaaga." action={<Button to="/alaabta">Eeg Alaabta</Button>} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Dalabkaaga" title="Dambiisha" text={`${items.length} nooc oo alaab ah ayaa ku jira dambiishaada.`} />
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_380px]">
        <section aria-label="Alaabta dambiisha ku jirta">
          {hasUnavailable && (
            <Alert type="warn" className="mb-4">
              Alaabta qaar hadda lama heli karo. Fadlan ka saar si aad u sii waddo.
            </Alert>
          )}
          <ul className={`space-y-3 ${syncing ? 'opacity-70' : ''}`} aria-busy={syncing}>
            {items.map((item) => (
              <li key={item.productId} className={`card flex flex-col gap-4 p-4 sm:flex-row sm:items-center ${item.unavailable ? 'border-red-200 bg-red-50/40' : ''}`}>
                <Link to={`/alaabta/${item.slug}`} className="block h-20 w-24 shrink-0 overflow-hidden rounded-lg" tabIndex={-1} aria-hidden="true">
                  <ProductImage src={item.image} alt="" categorySlug={item.categorySlug} categoryName={item.name} className="h-full w-full" iconClass="h-8 w-8" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/alaabta/${item.slug}`} className="font-bold text-navy hover:text-royal">
                    {item.name}
                  </Link>
                  <p className="num text-xs text-slate-500">{item.sku}</p>
                  <p className="num mt-1 text-sm text-slate-700">
                    {formatMoney(item.price, currency)} / {unitLabel(item.unit)}
                  </p>
                  {item.unavailable && <p className="mt-1 text-xs font-bold text-red-700">Hadda lama heli karo</p>}
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <QuantityInput
                    size="sm"
                    value={item.quantity}
                    onChange={(q) => setQuantity(item.productId, q)}
                    stock={item.stock}
                    allowDecimal={item.allowDecimal}
                    disabled={item.unavailable}
                    label={`Tirada ${item.name}`}
                  />
                  <p className="num w-24 text-right text-base font-extrabold text-navy">{formatMoney(lineTotal(item), currency)}</p>
                  <button type="button" onClick={() => remove(item.productId)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700" aria-label={`Ka saar ${item.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap justify-between gap-3">
            <Button to="/alaabta" variant="ghost">
              Sii wad adeegashada
            </Button>
            <Button variant="ghost" className="text-red-700 hover:bg-red-50" onClick={clear}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Faaruqi dambiisha
            </Button>
          </div>
        </section>

        <aside className="card h-fit p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold text-navy">Koobitaanka dalabka</h2>
          <div className="mt-4">
            <OrderTotals totals={totals} currency={currency} fulfillmentMethod="delivery" settings={settings} />
          </div>
          <p className="mt-3 text-xs text-slate-500">Tani waa qiyaas. Wadarta rasmiga ah waxaa la xaqiijiyaa marka dalabka la diro.</p>
          <div className="mt-5 grid gap-3">
            {hasUnavailable || syncing ? (
              <Button size="lg" disabled>
                Dhammaystir dalabka
              </Button>
            ) : (
              <Button to="/dalbo" size="lg">
                Dhammaystir dalabka
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            <WhatsAppButton size="lg" disabled={available.length === 0} message={(s) => cartMessage(available, totals, s)}>
              Ku dir WhatsApp
            </WhatsAppButton>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            <strong>WhatsApp:</strong> badhankani wuxuu kaliya diyaarinayaa farriin. Dalabku nidaamka laguma kaydinayo, lacagna laguma bixinayo, ilaa aad doorato “Dhammaystir dalabka”.
          </p>
        </aside>
      </div>
    </>
  );
}
