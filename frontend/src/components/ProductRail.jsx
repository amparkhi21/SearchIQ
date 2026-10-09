import { Link } from 'react-router-dom';
import Icon from './ui/Icon';
import ProductGrid from './ProductGrid';
import { ProductGridSkeleton } from './ui/Skeletons';

/** Titled product section used on the home and details pages. */
export default function ProductRail({ eyebrow, title, to, linkLabel = 'View all', products, loading, count = 4, cols }) {
  const grid = cols || 'grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4';
  if (!loading && (!products || products.length === 0)) return null;
  return (
    <section className="mt-12 sm:mt-16">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h2 className="section-title">{title}</h2>
        </div>
        {to && <Link to={to} className="link inline-flex shrink-0 items-center gap-1 text-sm">{linkLabel}<Icon name="arrowRight" className="h-4 w-4" /></Link>}
      </div>
      {loading ? <ProductGridSkeleton count={count} className={grid} /> : <ProductGrid products={products} className={grid} />}
    </section>
  );
}
