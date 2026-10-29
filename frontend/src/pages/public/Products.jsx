import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackageSearch, Search, X } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import Button from '../../components/common/Button';
import { EmptyState, ErrorState } from '../../components/common/Feedback';
import ProductCard, { ProductCardSkeleton, ProductGrid } from '../../components/products/ProductCard';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import usePageMeta from '../../hooks/usePageMeta';
import { getCategories, getProducts } from '../../services/publicApi';

const SORTS = [
  { value: 'newest', label: 'Kuwa ugu cusub' },
  { value: 'price_asc', label: 'Qiimaha: hoose ilaa sare' },
  { value: 'price_desc', label: 'Qiimaha: sare ilaa hoose' },
  { value: 'name_asc', label: 'Magaca: A-Z' },
  { value: 'name_desc', label: 'Magaca: Z-A' },
];
const SORT_VALUES = SORTS.map((s) => s.value);

export default function Products() {
  usePageMeta('Alaabta', 'Eeg dhammaan alaabta dhismaha ee TAWAKAL: qiimaha, kaydka iyo faahfaahinta.');
  const [params, setParams] = useSearchParams();

  // Xaaladda shaandhaynta waxay ku kaydsan tahay URL-ka si link-ga loo wadaagi karo.
  const category = params.get('qayb') || '';
  const sort = SORT_VALUES.includes(params.get('kala')) ? params.get('kala') : 'newest';
  const page = Math.max(1, parseInt(params.get('bog'), 10) || 1);
  const urlSearch = params.get('raadi') || '';

  const [searchInput, setSearchInput] = useState(urlSearch);
  const debounced = useDebounce(searchInput.trim());

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('bog' in changes)) next.delete('bog');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (debounced !== urlSearch) update({ raadi: debounced });
  }, [debounced]);

  const categories = useFetch(getCategories, []);
  const products = useFetch(
    () => getProducts({ page, limit: 12, sort, ...(category && { category }), ...(urlSearch && { search: urlSearch }) }),
    [page, sort, category, urlSearch]
  );

  const items = products.data?.data || [];
  const pagination = products.data?.pagination;
  const hasFilters = Boolean(category || urlSearch);
  const chip = (active) =>
    `whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
      active ? 'border-navy bg-navy text-white' : 'border-slate-300 bg-white text-navy hover:border-royal hover:text-royal'
    }`;

  return (
    <>
      <PageHeader eyebrow="Bakhaarka" title="Alaabta Dhismaha" text="Qiimayaasha iyo kaydka waxaa si toos ah looga soo qaadaa nidaamka bakhaarka." />

      <div className="container-page py-8">
        <div className="card p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_260px]">
            <div className="relative">
              <label htmlFor="product-search" className="sr-only">
                Ka raadi magaca ama SKU
              </label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="product-search"
                type="search"
                value={searchInput}
                maxLength={80}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ka raadi magaca alaabta ama SKU…"
                className="input pl-9"
              />
            </div>
            <div>
              <label htmlFor="product-sort" className="sr-only">
                Kala saar
              </label>
              <select id="product-sort" className="input" value={sort} onChange={(e) => update({ kala: e.target.value === 'newest' ? '' : e.target.value })}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Qaybaha">
            <button type="button" className={chip(!category)} onClick={() => update({ qayb: '' })} aria-pressed={!category}>
              Dhammaan
            </button>
            {(categories.data || []).map((c) => (
              <button key={c.id} type="button" className={chip(category === c.slug)} onClick={() => update({ qayb: c.slug })} aria-pressed={category === c.slug}>
                {c.name} <span className="num opacity-60">({c.productCount})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex min-h-6 flex-wrap items-center justify-between gap-2 text-sm text-slate-600" aria-live="polite">
          <p>{!products.loading && pagination ? `${pagination.total} alaab ayaa la helay` : ' '}</p>
          {hasFilters && (
            <button
              type="button"
              className="inline-flex items-center gap-1 font-semibold text-royal hover:underline"
              onClick={() => {
                setSearchInput('');
                setParams({}, { replace: true });
              }}
            >
              <X className="h-4 w-4" aria-hidden="true" /> Ka saar shaandhaynta
            </button>
          )}
        </div>

        <div className="mt-4">
          {products.error ? (
            <div className="card">
              <ErrorState error={products.error} onRetry={products.reload} />
            </div>
          ) : products.loading ? (
            <ProductGrid>
              {Array.from({ length: 8 }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </ProductGrid>
          ) : items.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={PackageSearch}
                title="Alaab lama helin"
                text={hasFilters ? 'Isku day erey kale ama ka saar shaandhaynta.' : 'Alaab weli laguma darin bakhaarka.'}
                action={
                  hasFilters && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchInput('');
                        setParams({}, { replace: true });
                      }}
                    >
                      Muuji dhammaan alaabta
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <>
              <ProductGrid>
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </ProductGrid>
              <Pagination pagination={pagination} onPage={(p) => update({ bog: p > 1 ? String(p) : '' })} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
