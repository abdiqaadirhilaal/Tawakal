import { forwardRef, useId } from 'react';

function Wrapper({ id, label, error, hint, required, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

const aria = (id, error, hint) => ({
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
});

export const Input = forwardRef(function Input({ label, error, hint, required, className, id: idProp, ...rest }, ref) {
  const auto = useId();
  const id = idProp || auto;
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <input ref={ref} id={id} className={`input ${error ? 'input-error' : ''}`} {...aria(id, error, hint)} {...rest} />
    </Wrapper>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, hint, required, className, id: idProp, rows = 4, ...rest }, ref) {
  const auto = useId();
  const id = idProp || auto;
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <textarea ref={ref} id={id} rows={rows} className={`input ${error ? 'input-error' : ''}`} {...aria(id, error, hint)} {...rest} />
    </Wrapper>
  );
});

export const Select = forwardRef(function Select({ label, error, hint, required, className, id: idProp, children, ...rest }, ref) {
  const auto = useId();
  const id = idProp || auto;
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <select ref={ref} id={id} className={`input ${error ? 'input-error' : ''}`} {...aria(id, error, hint)} {...rest}>
        {children}
      </select>
    </Wrapper>
  );
});

export const Checkbox = forwardRef(function Checkbox({ label, hint, className = '', id: idProp, ...rest }, ref) {
  const auto = useId();
  const id = idProp || auto;
  return (
    <div className={`flex items-start gap-2.5 ${className}`}>
      <input ref={ref} id={id} type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-royal accent-[#123B7A]" {...rest} />
      <label htmlFor={id} className="text-sm text-navy">
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </label>
    </div>
  );
});
