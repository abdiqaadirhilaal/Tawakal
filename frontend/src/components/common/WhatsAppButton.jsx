import { MessageCircle } from 'lucide-react';
import Button from './Button';
import { useSettings } from '../../context/SettingsContext';
import { hasWhatsApp, whatsappUrl } from '../../utils/whatsapp';

// Badhanka WhatsApp. Haddii lambarka aan weli lagu gelin dejinta maamulka, badhanku wuu damayaa.
export default function WhatsAppButton({ message, children = 'Ka Dalbo WhatsApp', size = 'md', className = '', variant = 'whatsapp', disabled = false }) {
  const { settings } = useSettings();
  const ready = hasWhatsApp(settings);
  if (!ready || disabled) {
    return (
      <Button variant="outline" size={size} className={className} disabled title={ready ? undefined : 'Lambarka WhatsApp weli lama dejin'}>
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {children}
      </Button>
    );
  }
  const text = typeof message === 'function' ? message(settings) : message;
  return (
    <Button variant={variant} size={size} className={className} href={whatsappUrl(settings.whatsappNumber, text)} target="_blank" rel="noopener noreferrer">
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      {children}
    </Button>
  );
}
