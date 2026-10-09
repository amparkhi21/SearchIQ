import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useWishlist } from '../context/WishlistContext';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import ProductGrid from '../components/ProductGrid';
import { ProductGridSkeleton } from '../components/ui/Skeletons';

export default function Wishlist() {
  const { products, loading, loaded, count, refresh } = useWishlist();
  useEffect(() => { document.title = 'Wishlist — SearchIQ'; refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="page">
      <PageHeader eyebrow="Account" title="Your wishlist" subtitle={loaded ? `${count} saved ${count === 1 ? 'item' : 'items'}` : undefined} />
      {!loaded && loading ? <ProductGridSkeleton count={4} className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4" />
        : products.length === 0 ? <EmptyState icon="heart" title="Your wishlist is empty" text="Tap the heart on any product to save it for later." action={<Link to="/search" className="btn-primary">Discover products</Link>} />
        : <ProductGrid products={products} className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4" />}
    </div>
  );
}
