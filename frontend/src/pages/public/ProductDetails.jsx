import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, PackageSearch, ShoppingCart } from 'lucide-react';
import Button from '../../components/common/Button';
import WhatsAppButton from '../../components/common/WhatsAppButton';
import { EmptyState, ErrorState, Skeleton } from '../../components/common/Feedback';
import ProductImage from '../../components/products/ProductImage';
import ProductCard, { ProductGrid } from '../../components/products/ProductCard';
import QuantityInput from '../../components/products/QuantityInput';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import useFetch from '../../hooks/useFetch';
import usePageMeta from '../../hooks/usePageMeta';
import { getProduct } from '../../services/publicApi';
import { formatMoney, formatQty, unitLabel } from '../../utils/format';
import { productMessage } from '../../utils/whatsapp';

export default function ProductDetails() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useFetch(() => getProduct(slug), [slug]);
  const { items, add } = useCart();
  const { settings } = useSettings();
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);
  const [active, setActive] = useState(0);

  const product = data?.product;
  usePageMeta(product ? product.name : 'Alaab', product?.description?.slice(0, 150));

  useEffect(() => {
    setQuantity(1);
    setActive(0);
  }, [slug]);

  if (loading) {
    return (
      <div className="container-page grid gap-10 py-10 lg:grid-cols-2">
        <Skeleton className="aspect-[4/3] w-full" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-2/3" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-10">
        <div className="card">
          {error.status === 404 ? (
            <EmptyState icon={PackageSearch} title="Alaabtan lama helin" text="Waxaa laga yaabaa in la saaray ama link-gu khaldan yahay." action={<Button to="/alaabta">Ku noqo alaabta</Button>} />
          ) : (
            <ErrorState error={error} onRetry={reload} />
          )}
        </div>
      </div>
    );
  }

  const out = product.stock <= 0;
  const inCart = items.find((i) => i.productId === product.id)?.quantity || 0;
  const remaining = Math.max(0, product.stock - inCart);
  const canAdd = !out && remaining > 0;
  const qty = Math.min(quantity, Math.max(remaining, product.allowDecimal ? 0.001 : 1));

  const handleAdd = () => {
    add(product, qty);
    toast.success(`${formatQty(qty)} ${unitLabel(product.unit)} "${product.name}" waa lagu daray dambiisha`);
    setQuantity(1);
  };

  return (
    <div className="container-page py-8">
      <nav aria-label="Jidka bogga" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-slate-600">
        <Link to="/" className="hover:text-royal">Bogga Hore</Link>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
        <Link to="/alaabta" className="hover:text-royal">Alaabta</Link>
        {product.category && (
          <>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <Link to={`/alaabta?qayb=${product.category.slug}`} className="hover:text-royal">{product.category.name}</Link>
          </>
        )}
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
        <span className="font-semibold text-navy" aria-current="page">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="card overflow-hidden">
            <ProductImage
              src={product.images[active]}
              alt={product.name}
              categorySlug={product.category?.slug}
              categoryName={product.category?.name}
              className="aspect-[4/3] w-full"
              iconClass="h-24 w-24"
              eager
            />
          </div>
          {product.images.length > 1 && (
            <ul className="mt-3 grid grid-cols-5 gap-2">
              {product.images.map((src, i) => (
                <li key={src}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Sawirka ${i + 1}`}
                    aria-pressed={active === i}
                    className={`block w-full overflow-hidden rounded-lg border-2 ${active === i ? 'border-gold' : 'border-transparent hover:border-slate-300'}`}
                  >
                    <ProductImage src={src} alt="" className="aspect-square w-full" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="eyebrow">{product.category?.name}</p>
          <h1 className="mt-2 text-3xl font-extrabold text-navy sm:text-4xl">{product.name}</h1>
          <p className="num mt-2 text-sm text-slate-500">SKU: {product.sku}</p>

          <p className="num mt-5 text-4xl font-extrabold text-royal">
            {formatMoney(product.price, settings.currency)}
            <span className="ml-2 text-base font-semibold text-slate-500">/ {unitLabel(product.unit)}</span>
          </p>

          <p className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${out ? 'bg-red-100 text-red-900' : 'bg-emerald-100 text-emerald-900'}`}>
            <span className={`h-2 w-2 rounded-full ${out ? 'bg-red-600' : 'bg-emerald-600'}`} aria-hidden="true" />
            {out ? 'Waa dhammaaday' : `Waa la heli karaa: ${formatQty(product.stock)} ${unitLabel(product.unit)}`}
          </p>

          {product.description && <p className="mt-6 whitespace-pre-line text-slate-700">{product.description}</p>}

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <p className="label">Tirada ({unitLabel(product.unit)})</p>
                <QuantityInput value={qty} onChange={setQuantity} stock={Math.max(remaining, 1)} allowDecimal={product.allowDecimal} disabled={!canAdd} />
              </div>
              <p className="num pb-2 text-sm text-slate-600">
                Qiyaasta: <span className="text-lg font-extrabold text-navy">{formatMoney(product.price * qty, settings.currency)}</span>
              </p>
            </div>
            {inCart > 0 && (
              <p className="mt-3 text-xs text-slate-600">
                Dambiishaada waxaa hore ugu jira {formatQty(inCart)} {unitLabel(product.unit)}.{remaining <= 0 && ' Kaydka oo dhan ayaad dambiisha gelisay.'}
              </p>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button size="lg" onClick={handleAdd} disabled={!canAdd}>
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                Ku dar dambiisha
              </Button>
              <WhatsAppButton size="lg" message={(s) => productMessage(product, qty, s)} />
            </div>
          </div>
        </div>
      </div>

      {data.related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-extrabold text-navy">Alaab la xiriirta</h2>
          <ProductGrid>
            {data.related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ProductGrid>
        </section>
      )}
    </div>
  );
}
