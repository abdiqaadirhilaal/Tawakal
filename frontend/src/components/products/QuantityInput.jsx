import { Minus, Plus } from 'lucide-react';
import { clampQuantity } from '../../utils/cart';

export default function QuantityInput({ value, onChange, stock, allowDecimal = false, disabled = false, label = 'Tirada', size = 'md' }) {
  const step = 1;
  const set = (v) => onChange(clampQuantity(v, { stock, allowDecimal }));
  const h = size === 'sm' ? 'h-9' : 'h-11';
  const btn = `grid ${h} w-10 place-items-center text-navy hover:bg-royal-50 disabled:cursor-not-allowed disabled:opacity-40`;
  return (
    <div className={`inline-flex items-stretch overflow-hidden rounded-lg border border-slate-300 bg-white ${disabled ? 'opacity-60' : ''}`}>
      <button type="button" className={btn} onClick={() => set(value - step)} disabled={disabled || value <= (allowDecimal ? 0.001 : 1)} aria-label="Dhin tirada">
        <Minus className="h-4 w-4" />
      </button>
      <input
        type="number"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        min={allowDecimal ? 0.001 : 1}
        max={stock}
        step={allowDecimal ? 'any' : 1}
        value={value}
        disabled={disabled}
        onChange={(e) => e.target.value !== '' && set(e.target.value)}
        aria-label={label}
        className={`num ${h} w-16 border-x border-slate-300 bg-white text-center text-sm font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-inset focus:ring-royal/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      />
      <button type="button" className={btn} onClick={() => set(value + step)} disabled={disabled || value >= stock} aria-label="Kordhi tirada">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
