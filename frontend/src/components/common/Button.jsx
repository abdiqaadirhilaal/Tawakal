import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-royal text-white hover:bg-royal-700 active:bg-royal-800',
  gold: 'bg-gold text-navy hover:bg-gold-300 active:bg-gold-600',
  outline: 'border border-slate-300 bg-white text-navy hover:border-royal hover:text-royal',
  ghost: 'text-royal hover:bg-royal-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  whatsapp: 'bg-[#128C4B] text-white hover:bg-[#0F7A41]',
  light: 'border border-white/30 bg-white/10 text-white hover:bg-white/20',
};
const SIZES = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, to, href, className = '', children, type = 'button', ...rest },
  ref
) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  const content = (
    <>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </>
  );
  if (to) return <Link ref={ref} to={to} className={cls} {...rest}>{content}</Link>;
  if (href) return <a ref={ref} href={href} className={cls} {...rest}>{content}</a>;
  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
});

export default Button;
