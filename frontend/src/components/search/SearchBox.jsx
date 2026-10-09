import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as searchApi from '../../api/search.api';
import { useAuth } from '../../hooks/useAuth';
import useDebounce from '../../hooks/useDebounce';
import useClickOutside from '../../hooks/useClickOutside';
import { SUGGESTED_SEARCHES } from '../../utils/constants';
import Icon from '../ui/Icon';
import { Spinner } from '../ui/Loader';

const TYPE_META = {
  product: { icon: 'package', label: 'Product' },
  brand: { icon: 'tag', label: 'Brand' },
  category: { icon: 'grid', label: 'Category' },
  recent: { icon: 'clock', label: 'Recent' },
  idea: { icon: 'sparkles', label: 'Try' },
};

/**
 * Header search with live suggestions.
 * The dropdown closes on: submit, selecting an item, route change, outside click, Escape and Tab-away.
 * It re-opens only when the user focuses the field or types.
 */
export default function SearchBox({ autoFocus = false, className = '', size = 'md', onDone }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const listId = useId();
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const urlQuery = location.pathname === '/search' ? new URLSearchParams(location.search).get('q') || '' : '';
  const [value, setValue] = useState(urlQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [remote, setRemote] = useState([]);
  const [recent, setRecent] = useState([]);
  const [fetching, setFetching] = useState(false);
  const debounced = useDebounce(value.trim(), 200);
  const hasText = value.trim().length > 0;

  const close = useCallback(() => { setOpen(false); setActive(-1); }, []);
  useClickOutside(wrapRef, close, open);

  // Keep the box in sync with the URL, and always close when the route changes.
  useEffect(() => { setValue(urlQuery); close(); }, [location.pathname, location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live suggestions (stale responses are ignored; the request is aborted when the text changes).
  useEffect(() => {
    if (!debounced) { setRemote([]); setFetching(false); return undefined; }
    const ctrl = new AbortController();
    setFetching(true);
    searchApi.suggestions({ q: debounced, limit: 8 }, { signal: ctrl.signal })
      .then((d) => setRemote(d.suggestions || []))
      .catch((e) => { if (e?.code !== 'ERR_CANCELED') setRemote([]); })
      .finally(() => { if (!ctrl.signal.aborted) setFetching(false); });
    return () => ctrl.abort();
  }, [debounced]);

  const loadRecent = useCallback(async () => {
    if (!isAuthenticated) return;
    try { setRecent(((await searchApi.recentSearches({ limit: 6 })).searches || []).map((s) => s.query).filter(Boolean)); } catch { /* optional */ }
  }, [isAuthenticated]);

  const items = useMemo(() => {
    if (hasText) {
      return remote.map((s) => ({
        key: `${s.type}-${s.id || s.text}`,
        type: s.type, text: s.text,
        sub: s.type === 'product' ? [s.brand?.name, s.category?.name].filter(Boolean).join(' · ') : '',
        to: s.type === 'product' && (s.slug || s.id) ? `/products/${s.slug || s.id}` : null,
      }));
    }
    const rec = recent.map((t) => ({ key: `r-${t}`, type: 'recent', text: t }));
    const ideas = SUGGESTED_SEARCHES.slice(0, rec.length ? 3 : 5).map((t) => ({ key: `i-${t}`, type: 'idea', text: t }));
    return [...rec, ...ideas];
  }, [hasText, remote, recent]);

  const go = useCallback((item) => {
    close();
    inputRef.current?.blur();
    onDone?.();
    if (item.to) { navigate(item.to); return; }
    setValue(item.text);
    navigate(`/search?q=${encodeURIComponent(item.text)}`);
  }, [close, navigate, onDone]);

  const submit = (e) => {
    e.preventDefault();
    if (active >= 0 && items[active]) { go(items[active]); return; }
    const q = value.trim();
    close();
    inputRef.current?.blur();
    onDone?.();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { if (open) { e.preventDefault(); close(); } return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) setOpen(true); setActive((i) => (items.length ? (i + 1) % items.length : -1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (items.length ? (i <= 0 ? items.length - 1 : i - 1) : -1)); }
    else if (e.key === 'Tab') close();
  };

  const showPanel = open && items.length > 0;
  const h = size === 'lg' ? 'h-14 text-base' : 'h-11 text-sm';

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <form onSubmit={submit} role="search" className="relative">
        <Icon name="search" className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 ${size === 'lg' ? 'h-5 w-5' : 'h-5 w-5'}`} />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          type="search"
          value={value}
          onChange={(e) => { setValue(e.target.value); setActive(-1); setOpen(true); }}
          onFocus={() => { setOpen(true); if (!hasText) loadRecent(); }}
          onKeyDown={onKeyDown}
          placeholder="Search products, brands or describe what you need…"
          aria-label="Search products"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
          className={`w-full rounded-xl border border-ink-200 bg-white pl-11 pr-24 text-ink-900 shadow-sm transition-colors placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 [&::-webkit-search-cancel-button]:hidden ${h}`}
        />
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {fetching && hasText && <Spinner className="h-4 w-4 text-ink-400" />}
          {hasText && (
            <button type="button" aria-label="Clear search" className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              onClick={() => { setValue(''); setRemote([]); setActive(-1); inputRef.current?.focus(); setOpen(true); loadRecent(); }}>
              <Icon name="close" className="h-4 w-4" />
            </button>
          )}
          <button type="submit" className={`inline-flex items-center rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-700 ${size === 'lg' ? 'h-10' : 'h-8'}`}>Search</button>
        </div>
      </form>

      {showPanel && (
        <div className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-pop animate-fade-in">
          <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            {hasText ? 'Suggestions' : recent.length ? 'Recent & ideas' : 'Try searching for'}
          </p>
          <ul id={listId} role="listbox" className="max-h-[22rem] overflow-y-auto pb-2 scrollbar-thin">
            {items.map((item, i) => {
              const meta = TYPE_META[item.type] || TYPE_META.idea;
              return (
                <li key={item.key} role="option" id={`${listId}-${i}`} aria-selected={i === active}>
                  <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(item)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${i === active ? 'bg-brand-50' : 'hover:bg-ink-50'}`}>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500"><Icon name={meta.icon} className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink-900">{item.text}</span>
                      {item.sub && <span className="block truncate text-xs text-ink-500">{item.sub}</span>}
                    </span>
                    <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-ink-400">{meta.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
