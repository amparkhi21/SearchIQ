import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Logo from '../ui/Logo';
import Icon from '../ui/Icon';

const NAV = [
  ['/admin', 'Dashboard', 'grid', true],
  ['/admin/products', 'Products', 'package', false],
  ['/admin/inventory', 'Inventory', 'layers', false],
  ['/admin/orders', 'Orders', 'box', false],
  ['/admin/analytics', 'Analytics', 'chart', false],
];

function Nav({ onNavigate }) {
  return (
    <nav className="space-y-1" aria-label="Admin">
      {NAV.map(([to, label, icon, end]) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate}
          className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-ink-300 hover:bg-white/5 hover:text-white'}`}>
          <Icon name={icon} className="h-5 w-5" />{label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => { document.title = 'Admin — SearchIQ'; }, []);

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden bg-ink-900 lg:block">
        <div className="sticky top-0 flex h-screen flex-col p-4">
          <div className="mb-8 px-2 pt-2"><Logo light to="/admin" /><span className="mt-2 inline-block rounded bg-brand-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-200">Admin console</span></div>
          <Nav />
          <div className="mt-auto space-y-1 border-t border-white/10 pt-4">
            <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-300 hover:bg-white/5 hover:text-white"><Icon name="external" className="h-5 w-5" />View storefront</Link>
            <p className="truncate px-3 pt-2 text-xs text-ink-400">{user?.email}</p>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink-100 bg-white px-4 lg:hidden">
          <button type="button" className="btn-icon -ml-2" onClick={() => setOpen((o) => !o)} aria-label="Toggle admin menu" aria-expanded={open}><Icon name={open ? 'close' : 'menu'} /></button>
          <Logo to="/admin" /><span className="badge-brand ml-1">Admin</span>
          <Link to="/" className="btn-ghost btn-sm ml-auto">Storefront</Link>
        </header>
        {open && <div className="border-b border-ink-100 bg-ink-900 p-3 lg:hidden"><Nav onNavigate={() => setOpen(false)} /></div>}
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><Outlet /></main>
      </div>
    </div>
  );
}
