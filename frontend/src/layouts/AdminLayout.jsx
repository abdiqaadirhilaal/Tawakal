import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Boxes, Calculator, ClipboardList, Clock, ExternalLink, History, KeyRound, LayoutDashboard, LogOut, Menu, MessageSquare, Package, Receipt, Settings, Tags, UserCog, Users, X } from 'lucide-react';
import { LogoMark } from '../components/common/Logo';
import { Spinner } from '../components/common/Feedback';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../utils/format';
import { ADMIN_ONLY, BACK_OFFICE_ROLES, POS_ROLES, hasRole, homeFor } from '../utils/roles';

// "roles" wuxuu go'aamiyaa waxa menu-ga lagu muujiyo. Awoodda dhabta ah server-ka ayaa hubiya.
const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: BACK_OFFICE_ROLES },
  { heading: 'Kaashka', roles: POS_ROLES },
  { to: '/admin/pos', label: 'Kaashka (POS)', icon: Calculator, end: true, roles: POS_ROLES },
  { to: '/admin/pos/sales', label: 'Iibka POS', icon: Receipt, roles: POS_ROLES },
  { to: '/admin/pos/shifts', label: 'Shifts', icon: Clock, roles: POS_ROLES },
  { heading: 'Xafiiska', roles: BACK_OFFICE_ROLES },
  { to: '/admin/dalabyada', label: 'Dalabyada online', icon: ClipboardList, roles: BACK_OFFICE_ROLES },
  { to: '/admin/alaabta', label: 'Alaabta', icon: Package, roles: BACK_OFFICE_ROLES },
  { to: '/admin/qaybaha', label: 'Qaybaha', icon: Tags, roles: BACK_OFFICE_ROLES },
  { to: '/admin/kaydka', label: 'Kaydka', icon: Boxes, roles: BACK_OFFICE_ROLES },
  { to: '/admin/macaamiisha', label: 'Macaamiisha', icon: Users, roles: BACK_OFFICE_ROLES },
  { to: '/admin/warbixinno', label: 'Warbixinno', icon: BarChart3, roles: BACK_OFFICE_ROLES },
  { to: '/admin/farriimaha', label: 'Farriimaha', icon: MessageSquare, roles: BACK_OFFICE_ROLES },
  { heading: 'Nidaamka', roles: [...BACK_OFFICE_ROLES, ...POS_ROLES] },
  { to: '/admin/dejinta', label: 'Dejinta', icon: Settings, roles: BACK_OFFICE_ROLES },
  { to: '/admin/isticmaalayaasha', label: 'Isticmaalayaasha', icon: UserCog, roles: ADMIN_ONLY },
  { to: '/admin/diiwaanka', label: 'Diiwaanka hawlaha', icon: History, roles: ADMIN_ONLY },
  { to: '/admin/akoonka', label: 'Akoonkayga', icon: KeyRound, roles: [...BACK_OFFICE_ROLES, ...POS_ROLES] },
];

function Sidebar({ user, onLogout, onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-navy text-white">
      <Link to={homeFor(user)} className="flex items-center gap-3 border-b border-white/10 px-5 py-5" onClick={onNavigate}>
        <LogoMark className="h-9 w-9" />
        <span className="leading-none">
          <span className="block font-display text-lg font-extrabold tracking-[0.08em]">TAWAKAL</span>
          <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-gold">Maamulka</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Navigation-ka maamulka">
        {NAV.filter((n) => hasRole(user, n.roles)).map(({ to, label, icon: Icon, end, heading }) =>
          heading ? (
            <p key={heading} className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
              {heading}
            </p>
          ) : (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-gold text-navy' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          )
        )}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-bold">{user.name}</p>
        <p className="truncate text-xs text-white/60">
          {ROLE_LABELS[user.role]} · {user.email}
        </p>
        <div className="mt-3 flex gap-2">
          <Link to="/" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/20 px-2 py-2 text-xs font-semibold hover:bg-white/10">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Website-ka
          </Link>
          <button type="button" onClick={onLogout} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/20 px-2 py-2 text-xs font-semibold hover:bg-red-600">
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Ka bax
          </button>
        </div>
      </div>
    </div>
  );
}

// Ilaaliyaha doorka: haddii isticmaaluhu uusan lahayn doorka loo baahan yahay, wuxuu u wareegayaa bogiisa.
export function RequireRole({ roles, children }) {
  const { user } = useAuth();
  if (!hasRole(user, roles)) return <Navigate to={homeFor(user)} replace />;
  return children;
}

export default function AdminLayout() {
  const { user, checking, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.title = 'Maamulka | TAWAKAL';
  }, []);
  useEffect(() => setOpen(false), [location.pathname]);

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Waa la hubinayaa fadhiga…" />
      </div>
    );
  }
  // Ilaalinta waddada: qof aan soo gelin wuxuu u wareegayaa bogga soo gelidda.
  if (!user) return <Navigate to="/admin/soo-gal" replace state={{ from: location.pathname }} />;

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <Sidebar user={user} onLogout={logout} />
      </aside>

      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <span className="flex items-center gap-2 font-display font-extrabold tracking-[0.08em] text-navy">
          <LogoMark className="h-8 w-8" /> TAWAKAL
        </span>
        <button type="button" onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300" aria-label="Fur menu-ga" aria-expanded={open}>
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy/60" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-fade-up">
            <Sidebar user={user} onLogout={logout} onNavigate={() => setOpen(false)} />
            <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-lg p-1.5 text-white hover:bg-white/10" aria-label="Xir menu-ga">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <main id="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
