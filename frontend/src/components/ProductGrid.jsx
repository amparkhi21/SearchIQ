import ProductCard from './ProductCard';
import { productId } from '../utils/product';

export default function ProductGrid({ products = [], className }) {
  return (
    <div className={className || 'grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4'}>
      {products.map((p) => <ProductCard key={productId(p)} product={p} />)}
    </div>
  );
}
