import { MessageCircle } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { generalMessage, hasWhatsApp, whatsappUrl } from '../../utils/whatsapp';

export default function FloatingWhatsApp() {
  const { settings } = useSettings();
  if (!hasWhatsApp(settings)) return null;
  return (
    <a
      href={whatsappUrl(settings.whatsappNumber, generalMessage(settings))}
      target="_blank"
      rel="noopener noreferrer"
      className="no-print fixed bottom-5 right-5 z-30 inline-flex h-14 items-center gap-2 rounded-full bg-[#128C4B] px-4 text-sm font-bold text-white shadow-lift transition-transform hover:scale-105"
      aria-label="Nagala soo xiriir WhatsApp"
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
