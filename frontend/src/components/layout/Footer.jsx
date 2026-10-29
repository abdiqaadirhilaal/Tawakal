import { Link } from 'react-router-dom';
import { Clock, ExternalLink, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import Logo from '../common/Logo';
import { useSettings } from '../../context/SettingsContext';
import { generalMessage, hasWhatsApp, whatsappUrl } from '../../utils/whatsapp';

const NAV = [
  { to: '/', label: 'Bogga Hore' },
  { to: '/alaabta', label: 'Alaabta' },
  { to: '/nagu-saabsan', label: 'Nagu Saabsan' },
  { to: '/raadraac', label: 'Raadraac Dalabka' },
  { to: '/xiriir', label: 'Nala Soo Xiriir' },
];

export default function Footer() {
  const { settings } = useSettings();
  const social = Object.entries(settings.socialLinks || {}).filter(([, url]) => url);
  const item = 'flex items-start gap-2.5 text-sm text-white/80';

  return (
    <footer className="no-print mt-20 bg-navy text-white">
      <div className="h-1 bg-gradient-to-r from-gold-600 via-gold to-gold-600" />
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm text-white/70">Alaabta dhismaha oo dhan hal meel: sibidh, bir, leben, tuubooyin, koronto iyo rinji.</p>
        </div>

        <nav aria-label="Navigation-ka footer-ka">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gold">Bogagga</h2>
          <ul className="mt-4 space-y-2">
            {NAV.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-sm text-white/80 hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gold">Xiriir</h2>
          <ul className="mt-4 space-y-3">
            {settings.phone && (
              <li className={item}>
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                <a href={`tel:${settings.phone.replace(/\s/g, '')}`} className="hover:text-white">{settings.phone}</a>
              </li>
            )}
            {hasWhatsApp(settings) && (
              <li className={item}>
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                <a href={whatsappUrl(settings.whatsappNumber, generalMessage(settings))} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  WhatsApp: +{settings.whatsappNumber}
                </a>
              </li>
            )}
            {settings.email && (
              <li className={item}>
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                <a href={`mailto:${settings.email}`} className="break-all hover:text-white">{settings.email}</a>
              </li>
            )}
            {settings.address && (
              <li className={item}>
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                <span>{settings.address}</span>
              </li>
            )}
            {!settings.phone && !settings.email && !settings.address && !hasWhatsApp(settings) && (
              <li className="text-sm text-white/60">Xogta xiriirka weli lama gelin.</li>
            )}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gold">Saacadaha Shaqada</h2>
          <p className={`mt-4 ${item}`}>
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
            <span>{settings.businessHours || 'Weli lama gelin.'}</span>
          </p>
          {social.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {social.map(([name, url]) => (
                <li key={name}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold capitalize text-white/85 hover:border-gold hover:text-gold">
                    {name}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-wrap items-center justify-between gap-2 py-4 text-xs text-white/60">
          <p>
            © {new Date().getFullYear()} {settings.companyName}. Xuquuqda oo dhan way dhowran tahay.
          </p>
          <Link to="/admin" className="hover:text-white">
            Maamulka
          </Link>
        </div>
      </div>
    </footer>
  );
}
