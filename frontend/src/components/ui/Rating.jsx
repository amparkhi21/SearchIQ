import Icon from './Icon';

export default function Rating({ value = 0, count, size = 'sm', showValue = true, className = '' }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  const dim = size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  return (
    <div className={`flex items-center gap-1.5 ${className}`} aria-label={`Rated ${v.toFixed(1)} out of 5`}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="relative inline-flex">
            <Icon name="star" className={`${dim} text-ink-200`} filled strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, v - (i - 1))) * 100}%` }}>
              <Icon name="star" className={`${dim} text-amber-400`} filled strokeWidth={0} />
            </span>
          </span>
        ))}
      </div>
      {showValue && <span className={`${size === 'lg' ? 'text-sm' : 'text-xs'} font-semibold text-ink-800`}>{v.toFixed(1)}</span>}
      {count !== undefined && <span className={`${size === 'lg' ? 'text-sm' : 'text-xs'} text-ink-500`}>({count})</span>}
    </div>
  );
}
