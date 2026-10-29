import { Clock, Phone } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

export default function AnnouncementBar() {
  const { settings } = useSettings();
  const { announcement, phone, businessHours } = settings;
  if (!announcement && !phone && !businessHours) return null;
  return (
    <div className="no-print bg-navy text-white">
      <div className="container-page flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2 text-xs">
        <p className="font-medium text-gold-300">{announcement}</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-white/85">
          {businessHours && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {businessHours}
            </span>
          )}
          {phone && (
            <a href={`tel:${phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 font-semibold hover:text-gold">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              {phone}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
