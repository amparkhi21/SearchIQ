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
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const item = 'inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors';
  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
      <button type="button" className={`${item} text-ink-700 hover:bg-ink-100 disabled:opacity-40`} disabled={currentPage <= 1} onClick={() => onChange(currentPage - 1)} aria-label="Previous page">
        <Icon name="chevronLeft" className="h-4 w-4" />
      </button>
      {pageList(currentPage, totalPages).map((p) =>
        typeof p === 'string' ? (
          <span key={p} className="px-1 text-ink-400">…</span>
        ) : (
          <button key={p} type="button" onClick={() => onChange(p)} aria-current={p === currentPage ? 'page' : undefined}
            className={`${item} ${p === currentPage ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-ink-100'}`}>
            {p}
          </button>
        ),
      )}
      <span className="px-2 text-sm text-ink-600" aria-live="polite">Page {currentPage} of {totalPages}</span>
      <button type="button" className={`${item} text-ink-700 hover:bg-ink-100 disabled:opacity-40`} disabled={currentPage >= totalPages} onClick={() => onChange(currentPage + 1)} aria-label="Next page">
        <Icon name="chevronRight" className="h-4 w-4" />
      </button>
    </nav>
  );
}
