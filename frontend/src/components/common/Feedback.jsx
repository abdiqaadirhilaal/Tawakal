import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import Button from './Button';

export function Spinner({ label = 'Waa la soo rarayaa…', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-12 text-slate-500 ${className}`} role="status">
      <Loader2 className="h-5 w-5 animate-spin text-royal" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-royal-50 text-royal">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="text-lg font-bold text-navy">{title}</h3>
      {text && <p className="mt-1 max-w-md text-sm text-slate-600">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Xogta lama soo rari karin' }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center" role="alert">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="text-lg font-bold text-navy">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-600">{error?.message || 'Khalad aan la garanayn ayaa dhacay.'}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          Isku day mar kale
        </Button>
      )}
    </div>
  );
}

export function Alert({ type = 'error', children, className = '' }) {
  const cls = {
    error: 'border-red-200 bg-red-50 text-red-900',
    info: 'border-royal-200 bg-royal-50 text-navy',
    warn: 'border-amber-300 bg-amber-50 text-amber-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }[type];
  return (
    <div role={type === 'error' ? 'alert' : 'note'} className={`rounded-lg border px-4 py-3 text-sm ${cls} ${className}`}>
      {children}
    </div>
  );
}
