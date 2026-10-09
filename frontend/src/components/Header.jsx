import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import * as notificationApi from '../api/notification.api';
import useClickOutside from '../hooks/useClickOutside';
import Logo from './ui/Logo';
import Icon from './ui/Icon';
import Drawer from './ui/Drawer';
import SearchBox from './search/SearchBox';

function CountBadge({ n }) {
  if (!n) return null;
  return (
    <span className="absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
      {n > 99 ? '99+' : n}
    </span>
  );
}

function IconLink({ to, icon, label, count, end }) {
  return (
    <NavLink to={to} end={end} aria-label={label} title={label}
      className={({ isActive }) => `relative inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-100'}`}>
      <Icon name={icon} className="h-5 w-5" />
      <CountBadge n={count} />
    </NavLink>
  );
}

function AccountMenu({ user, isAdmin, unread, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const initial = (user?.name || user?.email || '?').trim()[0]?.toUpperCase();
  const row = 'flex items-center gap-3 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50';
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-lg pl-1 pr-2 transition-colors hover:bg-ink-100">
        <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-sm font-semibold text-white">
          {initial}
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-white" />}
        </span>
        <Icon name="chevronDown" className="hidden h-4 w-4 text-ink-400 xl:block" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-64 animate-fade-in overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-pop">
          <div className="border-b border-ink-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink-900">{user?.name}</p>
            <p className="truncate text-xs text-ink-500">{user?.email}</p>
          </div>
          <Link role="menuitem" to="/profile" className={row}><Icon name="user" className="h-4 w-4" />Profile & addresses</Link>
          <Link role="menuitem" to="/orders" className={row}><Icon name="box" className="h-4 w-4" />My orders</Link>
          <Link role="menuitem" to="/wishlist" className={row}><Icon name="heart" className="h-4 w-4" />Wishlist</Link>
          <Link role="menuitem" to="/notifications" className={row}><Icon name="bell" className="h-4 w-4" />Notifications{unread > 0 && <span className="badge-brand ml-auto">{unread}</span>}</Link>
          {isAdmin && <Link role="menuitem" to="/admin" className={`${row} border-t border-ink-100 font-medium text-brand-700`}><Icon name="layers" className="h-4 w-4" />Admin dashboard</Link>}
          <button role="menuitem" type="button" onClick={onLogout} className={`${row} w-full border-t border-ink-100 text-left`}><Icon name="logout" className="h-4 w-4" />Sign out</button>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { count: cartCount } = useCart();
  const { count: wishCount } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const isHome = location.pathname === '/'; // the hero already has a large search box

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Unread notification badge — refreshed on navigation.
  useEffect(() => {
    if (!isAuthenticated) { setUnread(0); return undefined; }
    let cancelled = false;
    notificationApi.listNotifications({ limit: 1, unreadOnly: true })
      .then((d) => { if (!cancelled) setUnread(d.unreadCount || 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isAuthenticated, location.pathname]);

  const signOut = async () => { setMenuOpen(false); await logout(); navigate('/'); };
  const drawerLink = 'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-ink-800 hover:bg-ink-50';

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container-page">
        <div className="flex h-16 items-center gap-3 lg:gap-6">
          <button type="button" className="btn-icon -ml-2 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <Logo />

          {!isHome && <SearchBox className="hidden min-w-0 flex-1 lg:block lg:max-w-2xl xl:max-w-3xl" />}

          <nav className="ml-auto flex items-center gap-1" aria-label="Primary">
            {isAuthenticated && <span className="hidden lg:inline-flex"><IconLink to="/wishlist" icon="heart" label="Wishlist" count={wishCount} /></span>}
            {isAuthenticated && <span className="hidden lg:inline-flex"><IconLink to="/orders" icon="box" label="Orders" /></span>}
            {isAuthenticated && <span className="hidden sm:inline-flex"><IconLink to="/notifications" icon="bell" label="Notifications" count={unread} /></span>}
            <IconLink to="/cart" icon="cart" label="Cart" count={cartCount} />
            {isAdmin && <Link to="/admin" className="btn-secondary btn-sm ml-1 hidden xl:inline-flex"><Icon name="layers" className="h-4 w-4" />Admin</Link>}
            {isAuthenticated ? (
              <span className="ml-1 hidden lg:block"><AccountMenu user={user} isAdmin={isAdmin} unread={unread} onLogout={signOut} /></span>
            ) : (
              <span className="ml-1 hidden items-center gap-2 sm:flex">
                <Link to="/login" className="btn-ghost btn-sm">Sign in</Link>
                <Link to="/register" className="btn-primary btn-sm">Create account</Link>
              </span>
            )}
          </nav>
        </div>
        {/* Mobile / tablet search */}
        {!isHome && <div className="pb-3 lg:hidden"><SearchBox /></div>}
      </div>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" side="left">
        {isAuthenticated ? (
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-ink-50 p-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink-900 font-semibold text-white">{(user?.name || '?')[0]?.toUpperCase()}</span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.name}</p><p className="truncate text-xs text-ink-500">{user?.email}</p></div>
          </div>
        ) : (
          <div className="mb-4 grid grid-cols-2 gap-2">
            <Link to="/login" className="btn-secondary">Sign in</Link>
            <Link to="/register" className="btn-primary">Register</Link>
          </div>
        )}
        <nav className="space-y-0.5" aria-label="Mobile">
          <Link to="/" className={drawerLink}><Icon name="home" className="h-5 w-5 text-ink-500" />Home</Link>
          <Link to="/search" className={drawerLink}><Icon name="grid" className="h-5 w-5 text-ink-500" />Browse all products</Link>
          <Link to="/cart" className={drawerLink}><Icon name="cart" className="h-5 w-5 text-ink-500" />Cart{cartCount > 0 && <span className="badge-brand ml-auto">{cartCount}</span>}</Link>
          {isAuthenticated && (
            <>
              <Link to="/wishlist" className={drawerLink}><Icon name="heart" className="h-5 w-5 text-ink-500" />Wishlist{wishCount > 0 && <span className="badge-neutral ml-auto">{wishCount}</span>}</Link>
              <Link to="/orders" className={drawerLink}><Icon name="box" className="h-5 w-5 text-ink-500" />My orders</Link>
              <Link to="/notifications" className={drawerLink}><Icon name="bell" className="h-5 w-5 text-ink-500" />Notifications{unread > 0 && <span className="badge-brand ml-auto">{unread}</span>}</Link>
              <Link to="/profile" className={drawerLink}><Icon name="user" className="h-5 w-5 text-ink-500" />Profile & addresses</Link>
              {isAdmin && <Link to="/admin" className={`${drawerLink} text-brand-700`}><Icon name="layers" className="h-5 w-5" />Admin dashboard</Link>}
              <button type="button" onClick={signOut} className={`${drawerLink} w-full`}><Icon name="logout" className="h-5 w-5 text-ink-500" />Sign out</button>
            </>
          )}
        </nav>
      </Drawer>
    </header>
  );
}
