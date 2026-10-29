import { EmptyState, ErrorState, Spinner } from '../common/Feedback';

export function AdminPage({ title, text, actions, children }) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">{title}</h1>
          {text && <p className="mt-1 text-sm text-slate-600">{text}</p>}
        </div>
        {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

// Wuxuu maareeyaa xaaladaha: soo raraya / khalad / madhan / xog.
export function DataState({ loading, error, empty, onRetry, emptyTitle = 'Wax xog ah lama helin', emptyText, emptyAction, children }) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (loading) return <Spinner />;
  if (empty) return <EmptyState title={emptyTitle} text={emptyText} action={emptyAction} />;
  return children;
}

export function TableWrap({ children, minWidth = 720 }) {
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Shax la rogi karo">
      <table className="w-full border-collapse" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Toolbar({ children }) {
  return <div className="no-print flex flex-wrap items-end gap-3 border-b border-slate-200 p-4">{children}</div>;
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'royal' }) {
  const tones = {
    royal: 'bg-royal-50 text-royal',
    gold: 'bg-gold-100 text-gold-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="num mt-2 text-3xl font-extrabold text-navy">{value}</p>
        </div>
        {Icon && (
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
      </div>
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="no-print mb-4 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold ${
            value === t.value ? 'border-gold text-navy' : 'border-transparent text-slate-500 hover:text-navy'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
