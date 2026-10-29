import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, ShoppingCart, X } from 'lucide-react';
import Logo from '../common/Logo';
import { useCart } from '../../context/CartContext';

const LINKS = [
  { to: '/', label: 'Bogga Hore', end: true },
  { to: '/alaabta', label: 'Alaabta' },
  { to: '/nagu-saabsan', label: 'Nagu Saabsan' },
  { to: '/raadraac', label: 'Raadraac Dalabka' },
  { to: '/xiriir', label: 'Nala Soo Xiriir' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  const linkCls = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${isActive ? 'bg-royal-50 text-royal' : 'text-navy hover:bg-slate-100'}`;

  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-navy focus:px-4 focus:py-2 focus:text-white">
        U bood nuxurka
      </a>
      <div className="container-page flex h-[72px] items-center justify-between gap-4">
        <Link to="/" aria-label="TAWAKAL, bogga hore">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation-ka guud">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/dambiisha"
            className="relative inline-flex h-11 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-semibold text-white hover:bg-royal"
            aria-label={`Dambiisha, ${count} alaab`}
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Dambiisha</span>
            {count > 0 && <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-xs font-extrabold text-navy">{count}</span>}
          </Link>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-lg border border-slate-300 text-navy lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Xir menu-ga' : 'Fur menu-ga'}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" className="animate-fade-up border-t border-slate-200 bg-white lg:hidden" aria-label="Navigation-ka mobile-ka">
          <div className="container-page flex flex-col gap-1 py-3">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>
                {l.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
