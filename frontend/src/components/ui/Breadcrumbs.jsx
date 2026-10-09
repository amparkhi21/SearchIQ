import { Link } from 'react-router-dom';
import Icon from './Icon';

export default function Breadcrumbs({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-ink-500">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="inline-flex items-center gap-1">
          {i > 0 && <Icon name="chevronRight" className="h-3.5 w-3.5 text-ink-300" />}
          {item.to ? <Link to={item.to} className="hover:text-brand-600">{item.label}</Link> : <span className="max-w-[16rem] truncate font-medium text-ink-800" aria-current="page">{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}
