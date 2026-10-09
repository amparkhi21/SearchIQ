import formatCurrency from '../utils/formatCurrency';
import { SHIPPING_THRESHOLD } from '../utils/constants';

/** Price breakdown shared by Cart, Checkout and Order details. */
export default function OrderSummary({ itemCount, subtotal, savings = 0, shipping = 0, total, showFreeShippingHint = false, children, title = 'Order summary' }) {
  const remaining = SHIPPING_THRESHOLD - subtotal;
  const progress = Math.max(0, Math.min(100, (subtotal / SHIPPING_THRESHOLD) * 100));
  const row = 'flex items-center justify-between text-sm';
  return (
    <div className="card-pad">
      <h2 className="text-base font-semibold">{title}</h2>
      {showFreeShippingHint && subtotal > 0 && (
        <div className="mt-4 rounded-lg bg-brand-50 p-3">
          <p className="text-xs font-medium text-brand-800">
            {remaining > 0 ? <>Add <strong>{formatCurrency(remaining)}</strong> more for free delivery</> : 'You’ve unlocked free delivery 🎉'}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} /></div>
        </div>
      )}
      <dl className="mt-4 space-y-3">
        <div className={row}><dt className="text-ink-600">Subtotal{itemCount != null && <span className="text-ink-400"> ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>}</dt><dd className="font-medium">{formatCurrency(subtotal)}</dd></div>
        {savings > 0 && <div className={row}><dt className="text-emerald-700">You save</dt><dd className="font-medium text-emerald-700">− {formatCurrency(savings)}</dd></div>}
        <div className={row}><dt className="text-ink-600">Delivery</dt><dd className="font-medium">{shipping === 0 ? <span className="text-emerald-700">Free</span> : formatCurrency(shipping)}</dd></div>
        <div className="flex items-center justify-between border-t border-ink-100 pt-3"><dt className="text-base font-semibold">Total</dt><dd className="text-xl font-bold">{formatCurrency(total)}</dd></div>
      </dl>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
