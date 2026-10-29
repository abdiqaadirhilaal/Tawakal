import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import ProductImage from './ProductImage';
import Button from '../common/Button';
import WhatsAppButton from '../common/WhatsAppButton';
import { Skeleton } from '../common/Feedback';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { formatMoney, formatQty, unitLabel } from '../../utils/format';
import { productMessage } from '../../utils/whatsapp';

export default function ProductCard({ product }) {
  const { add } = useCart();
  const { settings } = useSettings();
  const toast = useToast();
  const out = product.stock <= 0;
  const href = `/alaabta/${product.slug}`;

  const handleAdd = () => {
    add(product, 1);
    toast.success(`"${product.name}" waa lagu daray dambiisha`);
  };

  return (
    <article className="card group flex flex-col overflow-hidden transition-shadow duration-200 hover:shadow-lift">
      <Link to={href} className="relative block aspect-[4/3] overflow-hidden" tabIndex={-1} aria-hidden="true">
        <ProductImage
          src={product.images?.[0]}
          alt={product.name}
          categorySlug={product.category?.slug}
          categoryName={product.category?.name}
          className={`h-full w-full transition-transform duration-300 group-hover:scale-[1.03] ${out ? 'grayscale' : ''}`}
        />
        {out && <span className="absolute left-3 top-3 rounded-full bg-navy px-3 py-1 text-xs font-bold text-white">Waa dhammaaday</span>}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-bold uppercase tracking-wider text-gold-700">{product.category?.name}</span>
          <span className="num text-slate-500">{product.sku}</span>
        </div>
        <h3 className="mt-1.5 text-base font-bold leading-snug text-navy">
          <Link to={href} className="hover:text-royal">
            {product.name}
          </Link>
        </h3>
        {product.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{product.description}</p>}
        <div className="mt-3 flex items-end justify-between gap-2">
          <p className="num text-xl font-extrabold text-royal">
            {formatMoney(product.price, settings.currency)}
            <span className="ml-1 text-xs font-semibold text-slate-500">/ {unitLabel(product.unit)}</span>
          </p>
          <p className={`text-xs font-semibold ${out ? 'text-red-700' : 'text-emerald-700'}`}>
            {out ? 'Kaydka ma jiro' : `${formatQty(product.stock)} ${unitLabel(product.unit)} ayaa jira`}
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={handleAdd} disabled={out} size="sm" className="col-span-2 py-2.5">
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            Ku dar dambiisha
          </Button>
          <Button to={href} variant="outline" size="sm">
            Faahfaahin
          </Button>
          <WhatsAppButton size="sm" message={(s) => productMessage(product, 1, s)}>
            WhatsApp
          </WhatsAppButton>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}

export function ProductGrid({ children }) {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>;
}
