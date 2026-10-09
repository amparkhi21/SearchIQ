import Icon from './ui/Icon';
import { ORDER_FLOW } from '../utils/constants';
import { formatDateTime } from '../utils/format';

const LABELS = { placed: 'Order placed', confirmed: 'Confirmed', shipped: 'Shipped', 'out-for-delivery': 'Out for delivery', delivered: 'Delivered' };

/** Horizontal (≥ sm) / vertical (mobile) progress tracker. The API only stores placed/cancelled timestamps. */
export default function OrderTimeline({ order }) {
  if (order.status === 'cancelled') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50/60 p-4">
        <Icon name="close" className="mt-0.5 h-5 w-5 text-red-500" />
        <div>
          <p className="text-sm font-semibold text-red-800">Order cancelled</p>
          {order.cancelledAt && <p className="text-xs text-red-700">{formatDateTime(order.cancelledAt)}</p>}
          {order.cancelReason && <p className="mt-1 text-sm text-red-700">Reason: {order.cancelReason}</p>}
        </div>
      </div>
    );
  }
  const current = Math.max(0, ORDER_FLOW.indexOf(order.status));
  return (
    <ol className="grid gap-4 sm:grid-cols-5 sm:gap-2" aria-label="Order progress">
      {ORDER_FLOW.map((s, i) => {
        const done = i < current || order.status === 'delivered';
        const active = i === current && order.status !== 'delivered';
        return (
          <li key={s} className="relative flex items-center gap-3 sm:flex-col sm:gap-2 sm:text-center">
            {i > 0 && <span aria-hidden="true" className={`absolute left-4 top-[-1.1rem] h-4 w-0.5 sm:left-[-50%] sm:right-1/2 sm:top-4 sm:h-0.5 sm:w-full ${i <= current ? 'bg-brand-600' : 'bg-ink-200'}`} />}
            <span className={`relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-brand-600 text-white' : active ? 'bg-white text-brand-700 ring-2 ring-brand-600' : 'bg-ink-100 text-ink-400'}`}>
              {done ? <Icon name="check" className="h-4 w-4" strokeWidth={3} /> : i + 1}
            </span>
            <span>
              <span className={`block text-sm font-medium ${done || active ? 'text-ink-900' : 'text-ink-400'}`}>{LABELS[s]}</span>
              {i === 0 && <span className="block text-xs text-ink-500">{formatDateTime(order.createdAt)}</span>}
              {active && i > 0 && <span className="block text-xs font-medium text-brand-700">Current status</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

