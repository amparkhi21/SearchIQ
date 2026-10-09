import Icon from './Icon';

export default function EmptyState({ icon = 'sparkles', title = 'Nothing here yet', text, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center ${className}`}>
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      {text && <p className="mt-1.5 max-w-sm text-sm text-ink-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
