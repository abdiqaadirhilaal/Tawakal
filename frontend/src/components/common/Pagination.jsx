import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total } = pagination;
  const btn = 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-navy hover:border-royal hover:text-royal disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <nav className="no-print flex flex-wrap items-center justify-between gap-3 py-4" aria-label="Bogagga">
      <p className="text-sm text-slate-600">
        Bogga <span className="font-semibold text-navy">{page}</span> ee {totalPages} · wadarta {total}
      </p>
      <div className="flex gap-2">
        <button type="button" className={btn} onClick={() => onPage(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Hore
        </button>
        <button type="button" className={btn} onClick={() => onPage(page + 1)} disabled={page >= totalPages}>
          Xiga <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
