import Icon from './Icon';

export default function QuantityStepper({ value, onChange, min = 1, max = 99, disabled = false, size = 'md' }) {
  const h = size === 'sm' ? 'h-8' : 'h-10';
  const btn = `inline-flex ${h} ${size === 'sm' ? 'w-8' : 'w-10'} items-center justify-center text-ink-700 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:text-ink-300 disabled:hover:bg-transparent`;
  return (
    <div className={`inline-flex ${h} items-center overflow-hidden rounded-lg border border-ink-200 bg-white`} role="group" aria-label="Quantity">
      <button type="button" className={btn} disabled={disabled || value <= min} onClick={() => onChange(value - 1)} aria-label="Decrease quantity">
        <Icon name="minus" className="h-4 w-4" />
      </button>
      <span className="min-w-[2.25rem] select-none px-1 text-center text-sm font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className={btn} disabled={disabled || value >= max} onClick={() => onChange(value + 1)} aria-label="Increase quantity">
        <Icon name="plus" className="h-4 w-4" />
      </button>
    </div>
  );
}
