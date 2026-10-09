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

export default function Pagination({ page = 1, totalPages = 1, onChange }) {
  if (totalPages <= 1) return null;
  const item = 'inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors';
  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      <button type="button" className={`${item} text-ink-700 hover:bg-ink-100 disabled:opacity-40`} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <Icon name="chevronLeft" className="h-4 w-4" />
      </button>
      {pageList(page, totalPages).map((p) =>
        typeof p === 'string' ? (
          <span key={p} className="px-1 text-ink-400">…</span>
        ) : (
          <button key={p} type="button" onClick={() => onChange(p)} aria-current={p === page ? 'page' : undefined}
            className={`${item} ${p === page ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-ink-100'}`}>
            {p}
          </button>
        ),
      )}
      <button type="button" className={`${item} text-ink-700 hover:bg-ink-100 disabled:opacity-40`} disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <Icon name="chevronRight" className="h-4 w-4" />
      </button>
    </nav>
  );
}
