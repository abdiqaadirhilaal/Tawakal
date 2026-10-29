import { useState } from 'react';
import { Droplets, Hammer, Layers, LayoutGrid, Package, PaintBucket, Wrench, Zap } from 'lucide-react';
import { imageUrl } from '../../utils/image';

// Marka alaabtu aysan lahayn sawir la soo dejiyey, waxaa la muujiyaa sawir-qaybeed.
const ART = [
  { match: /sibidh|cement|shamiinto/, icon: Layers, from: '#5B6B82', to: '#2E3B4E' },
  { match: /bir|steel|baliig/, icon: Hammer, from: '#3D4F6B', to: '#0B1F3A' },
  { match: /tuub|pvc|plumb|biyo/, icon: Droplets, from: '#1B56B0', to: '#123B7A' },
  { match: /leben|bulukeeti|brick|block/, icon: LayoutGrid, from: '#B5553A', to: '#7A2F1C' },
  { match: /koronto|electr/, icon: Zap, from: '#B8932A', to: '#6E5512' },
  { match: /rinji|paint/, icon: PaintBucket, from: '#2F8F83', to: '#145A52' },
  { match: /qalab|tool/, icon: Wrench, from: '#4B5563', to: '#1F2937' },
];
const FALLBACK = { icon: Package, from: '#123B7A', to: '#0B1F3A' };

export const artFor = (key = '') => ART.find((a) => a.match.test(String(key).toLowerCase())) || FALLBACK;

export function CategoryArt({ slug, name, className = '', iconClass = 'h-12 w-12' }) {
  const art = artFor(`${slug} ${name}`);
  const Icon = art.icon;
  return (
    <div
      className={`relative grid place-items-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${art.from}, ${art.to})` }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      <Icon className={`relative text-white/90 ${iconClass}`} strokeWidth={1.5} />
    </div>
  );
}

export default function ProductImage({ src, alt, categorySlug, categoryName, className = '', iconClass, eager = false }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <CategoryArt slug={categorySlug} name={categoryName || alt} className={className} iconClass={iconClass} />;
  return (
    <img
      src={imageUrl(src)}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
