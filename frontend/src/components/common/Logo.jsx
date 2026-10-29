import { useSettings } from '../../context/SettingsContext';
import { imageUrl } from '../../utils/image';

// Astaanta: saqaf iyo dhismayaal, TAWAKAL oo ah qoraalka weyn.
export function LogoMark({ className = 'h-10 w-10' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Astaanta TAWAKAL">
      <rect width="64" height="64" rx="14" fill="#0B1F3A" />
      <rect x="15" y="20" width="9" height="16" rx="1" fill="#123B7A" />
      <rect x="27.5" y="13" width="9" height="20" rx="1" fill="#1B56B0" />
      <rect x="40" y="20" width="9" height="16" rx="1" fill="#123B7A" />
      <path d="M9 37 32 19l23 18" fill="none" stroke="#D4AF37" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 37v14h30V37L32 25.5Z" fill="#fff" />
      <path d="M28 51V41h8v10" fill="#123B7A" />
    </svg>
  );
}

export default function Logo({ light = false, compact = false }) {
  const { settings } = useSettings();
  return (
    <span className="flex items-center gap-3">
      {settings.logoUrl ? (
        <img src={imageUrl(settings.logoUrl)} alt="" className="h-10 w-10 rounded-lg object-contain" />
      ) : (
        <LogoMark />
      )}
      <span className="flex flex-col leading-none">
        <span className={`font-display text-xl font-extrabold tracking-[0.08em] ${light ? 'text-white' : 'text-navy'}`}>{settings.companyName}</span>
        {!compact && settings.tagline && (
          <span className={`mt-1 text-[9px] font-bold uppercase tracking-[0.2em] ${light ? 'text-gold' : 'text-gold-700'}`}>{settings.tagline}</span>
        )}
      </span>
    </span>
  );
}
