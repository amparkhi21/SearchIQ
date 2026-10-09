export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <div className="skeleton aspect-[4/3] rounded-none" />
      <div className="space-y-2.5 p-4">
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton mt-3 h-5 w-24" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8, className }) {
  return (
    <div className={className || 'grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4'}>
      {Array.from({ length: count }, (_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}

export function RowSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton h-20 w-full rounded-xl" />)}
    </div>
  );
}
