import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as wishlistApi from '../api/wishlist.api';
import { useAuth } from '../hooks/useAuth';
import { productId } from '../utils/product';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setProducts([]); setLoaded(false); return; }
    try {
      setLoading(true);
      const d = await wishlistApi.getWishlist();
      setProducts((d.wishlist?.products || []).filter(Boolean));
      setLoaded(true);
    } catch { /* ignore — heart icons just render as "not saved" */ } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { refresh(); }, [refresh]);

  const ids = useMemo(() => new Set(products.map(productId)), [products]);
  const has = useCallback((id) => ids.has(id), [ids]);

  /** Add or remove depending on current state. Resolves to `true` when the product is now saved. */
  const toggle = useCallback(async (id) => {
    const saved = ids.has(id);
    const d = saved ? await wishlistApi.removeFromWishlist(id) : await wishlistApi.addToWishlist(id);
    setProducts((d.wishlist?.products || []).filter(Boolean));
    return !saved;
  }, [ids]);

  const value = useMemo(() => ({ products, loading, loaded, count: products.length, has, toggle, refresh }), [products, loading, loaded, has, toggle, refresh]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return ctx;
};
