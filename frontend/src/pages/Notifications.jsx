import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api/notification.api';
import { errorMessage } from '../api/axios';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Pagination from '../components/ui/Pagination';
import Icon from '../components/ui/Icon';
import { RowSkeleton } from '../components/ui/Skeletons';
import { formatDateTime, timeAgo } from '../utils/format';

const ICONS = { order: 'box', review: 'star', promotion: 'tag', system: 'bell' };

export default function Notifications() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [state, setState] = useState({ loading: true, error: '', items: [], unread: 0, meta: {} });

  const load = useCallback(async () => {
    try {
      const d = await api.listNotifications({ page, limit: 20, ...(unreadOnly ? { unreadOnly: true } : {}) });
      setState({ loading: false, error: '', items: d.notifications || [], unread: d.unreadCount || 0, meta: d.meta || {} });
    } catch (e) { setState((s) => ({ ...s, loading: false, error: errorMessage(e, 'Could not load notifications') })); }
  }, [page, unreadOnly]);
  useEffect(() => { setState((s) => ({ ...s, loading: true })); load(); }, [load]);
  useEffect(() => { document.title = 'Notifications — SearchIQ'; }, []);

  const read = async (n) => {
    if (n.isRead) return;
    setState((s) => ({ ...s, items: s.items.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)), unread: Math.max(0, s.unread - 1) }));
    try { await api.markRead(n.id); } catch (e) { toast.error(errorMessage(e, 'Could not mark as read')); load(); }
  };
  const readAll = async () => {
    try { await api.markAllRead(); toast.success('All notifications marked as read'); load(); } catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <div className="page max-w-3xl">
      <PageHeader eyebrow="Account" title="Notifications" subtitle={state.unread > 0 ? `${state.unread} unread` : 'You’re all caught up'}
        actions={<button type="button" className="btn-secondary btn-sm" onClick={readAll} disabled={state.unread === 0}><Icon name="check" className="h-4 w-4" />Mark all read</button>} />
      <div className="mb-4 flex gap-2" role="tablist">
        {[[false, 'All'], [true, 'Unread']].map(([v, l]) => (
          <button key={l} type="button" role="tab" aria-selected={unreadOnly === v} onClick={() => { setUnreadOnly(v); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${unreadOnly === v ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50'}`}>{l}</button>
        ))}
      </div>
      {state.loading ? <RowSkeleton rows={4} /> : state.error ? <ErrorState message={state.error} onRetry={load} />
        : state.items.length === 0 ? <EmptyState icon="bell" title={unreadOnly ? 'No unread notifications' : 'No notifications yet'} text="Order updates and account alerts will appear here." />
        : (
          <>
            <ul className="card divide-y divide-ink-100 overflow-hidden">
              {state.items.map((n) => {
                const orderId = n.data?.orderId;
                return (
                  <li key={n.id} className={`flex gap-4 px-4 py-4 sm:px-5 ${n.isRead ? '' : 'bg-brand-50/40'}`}>
                    <span className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${n.isRead ? 'bg-ink-100 text-ink-500' : 'bg-brand-100 text-brand-700'}`}><Icon name={ICONS[n.type] || 'bell'} className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className={`text-sm ${n.isRead ? 'font-medium text-ink-700' : 'font-semibold text-ink-900'}`}>{n.title}</p>
                        {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
                      </div>
                      <p className="mt-0.5 text-sm text-ink-600">{n.message}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
                        <time dateTime={n.createdAt} title={formatDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</time>
                        {orderId && <Link to={`/orders/${orderId}`} className="link">View order</Link>}
                        {!n.isRead && <button type="button" onClick={() => read(n)} className="font-medium text-brand-600 hover:text-brand-700">Mark as read</button>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pagination page={state.meta.page || page} totalPages={state.meta.totalPages || 1} onChange={setPage} />
          </>
        )}
    </div>
  );
}
