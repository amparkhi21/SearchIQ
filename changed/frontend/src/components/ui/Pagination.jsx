import Icon from './Icon';

function pageList(page, total) {
  const pages = new Set([1, total, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap-' + p);
    out.push(p);
  });
  return out;
}

/**
 * Pagination controls driven by the API's `meta` (page, totalPages, total, limit).
 * Shows labelled Previous / Next buttons, numbered pages (from `sm` up) and a "Page X of Y" summary.
 */
export default function Pagination({ page = 1, totalPages = 1, total, limit, disabled = false, onChange }) {
  if (totalPages <= 1) return null;
  const item = 'inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40';
  const nav = 'inline-flex h-10 items-center gap-1 rounded-lg border border-ink-200 bg-white px-3 text-sm font-medium text-ink-800 shadow-card transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40';
  const from = total && limit ? (page - 1) * limit + 1 : null;
  const to = total && limit ? Math.min(page * limit, total) : null;

  return (
    <nav className="mt-8 flex flex-col items-center gap-3 border-t border-ink-100 pt-6" aria-label="Pagination">
      <p className="text-sm text-ink-600" aria-live="polite">
        Page <strong className="text-ink-900">{page}</strong> of <strong className="text-ink-900">{totalPages}</strong>
        {from != null && <span className="ml-2 text-ink-500">· Showing {from}–{to} of {total}</span>}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button type="button" className={nav} disabled={disabled || page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <Icon name="chevronLeft" className="h-4 w-4" />Previous
        </button>
        <div className="hidden items-center gap-1 sm:flex">
          {pageList(page, totalPages).map((p) =>
            typeof p === 'string' ? (
              <span key={p} className="px-1 text-ink-400">…</span>
            ) : (
              <button key={p} type="button" disabled={disabled} onClick={() => p !== page && onChange(p)} aria-current={p === page ? 'page' : undefined} aria-label={`Page ${p}`}
                className={`${item} ${p === page ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-ink-100'}`}>
                {p}
              </button>
            ),
          )}
        </div>
        <button type="button" className={nav} disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Next page">
          Next<Icon name="chevronRight" className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
