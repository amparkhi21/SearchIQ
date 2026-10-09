import formatCurrency from '../../utils/formatCurrency';
import { currentPrice, hasDiscount } from '../../utils/product';

export default function Price({ product, size = 'md' }) {
  const discounted = hasDiscount(product);
  const main = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-lg';
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={`${main} font-bold text-ink-900`}>{formatCurrency(currentPrice(product))}</span>
      {discounted && (
        <>
          <span className={`${size === 'lg' ? 'text-base' : 'text-xs'} text-ink-400 line-through`}>{formatCurrency(product.price)}</span>
          <span className={`${size === 'lg' ? 'text-sm' : 'text-xs'} font-semibold text-emerald-600`}>{Math.round(product.discountPercent)}% off</span>
        </>
      )}
    </div>
  );
}
