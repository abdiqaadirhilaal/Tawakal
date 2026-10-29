import { useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import Button from '../common/Button';
import { uploadImage } from '../../services/adminApi';
import { useToast } from '../../context/ToastContext';
import { imageUrl } from '../../utils/image';

const MAX_BYTES = 3 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Wuxuu maareeyaa liiska sawirrada (URL-yo). Sawir kasta waxaa loo diraa backend-ka,
// kaas oo hubiya nooca iyo cabbirka ka hor inta uusan kaydin.
export default function ImageUploader({ value = [], onChange, max = 8 }) {
  const input = useRef(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!TYPES.includes(file.type)) return toast.error('Kaliya JPG, PNG ama WEBP ayaa la oggol yahay');
    if (file.size > MAX_BYTES) return toast.error('Sawirku aad ayuu u weyn yahay (ugu badnaan 3MB)');
    setBusy(true);
    try {
      const { url } = await uploadImage(file);
      onChange([...value, url]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <div>
      <p className="label">Sawirrada</p>
      <ul className="flex flex-wrap gap-3">
        {value.map((src, i) => (
          <li key={src} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-300">
            <img src={imageUrl(src)} alt={`Sawirka ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((s) => s !== src))}
              className="absolute right-1 top-1 rounded bg-navy/80 p-1 text-white hover:bg-red-600"
              aria-label={`Ka saar sawirka ${i + 1}`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </li>
        ))}
        {value.length < max && (
          <li>
            <input ref={input} type="file" accept={TYPES.join(',')} className="sr-only" onChange={handleFile} aria-label="Dooro sawir" tabIndex={-1} />
            <Button variant="outline" className="h-20 w-20 flex-col gap-1 text-xs" loading={busy} onClick={() => input.current?.click()}>
              {!busy && <Upload className="h-4 w-4" aria-hidden="true" />}
              Soo deji
            </Button>
          </li>
        )}
      </ul>
      <p className="mt-1.5 text-xs text-slate-500">JPG, PNG ama WEBP, ugu badnaan 3MB. Sawirka koowaad ayaa noqonaya kan ugu weyn.</p>
    </div>
  );
}
