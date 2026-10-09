import Icon from '../ui/Icon';

export function Kpi({ label, value, hint, icon, tone = 'brand' }) {
  const tones = { brand: 'bg-brand-50 text-brand-600', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600', sky: 'bg-sky-50 text-sky-600' };
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}><Icon name={icon} className="h-5 w-5" /></span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

export function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`card min-w-0 ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>{action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function AdminHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>{subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Horizontal bar list: items = [{ label, value, sub? }] */
export function BarList({ items, color = 'bg-brand-600', empty = 'No data yet' }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-ink-400">{empty}</p>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm"><span className="min-w-0 truncate font-medium text-ink-800">{i.label}</span><span className="shrink-0 tabular-nums text-ink-500">{i.display ?? i.value}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-100"><div className={`h-full rounded-full ${i.color || color}`} style={{ width: `${(i.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

/** Two-series SVG area/line chart for daily counts. data = [{ date, a, b }] */
export function TrendChart({ data, aLabel = 'Searches', bLabel = 'Zero results' }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-ink-400">No activity in this period</p>;
  const W = 640, H = 220, P = { l: 36, r: 26, t: 12, b: 28 };
  const max = Math.max(1, ...data.map((d) => d.a));
  const x = (i) => P.l + (data.length === 1 ? (W - P.l - P.r) / 2 : (i / (data.length - 1)) * (W - P.l - P.r));
  const y = (v) => P.t + (1 - v / max) * (H - P.t - P.b);
  const line = (k) => data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join(' ');
  const area = `${line('a')} L${x(data.length - 1).toFixed(1)},${H - P.b} L${x(0).toFixed(1)},${H - P.b} Z`;
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));
  const step = Math.ceil(data.length / 6);
  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-600" />{aLabel}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />{bLabel}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${aLabel} per day`}>
        {ticks.map((t) => (<g key={t}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#e9ecf3" /><text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#7a88a6">{t}</text></g>))}
        <path d={area} fill="#6366f1" opacity="0.10" />
        <path d={line('a')} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <path d={line('b')} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (<g key={d.date}><circle cx={x(i)} cy={y(d.a)} r="3" fill="#4f46e5"><title>{`${d.date}: ${d.a} ${aLabel.toLowerCase()}, ${d.b} ${bLabel.toLowerCase()}`}</title></circle>{i % step === 0 && <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#7a88a6">{d.date.slice(5)}</text>}</g>))}
      </svg>
    </div>
  );
}
