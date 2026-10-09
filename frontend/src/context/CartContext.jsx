import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as cartApi from '../api/cart.api';
import { useAuth } from '../hooks/useAuth';
import { SHIPPING_FEE, SHIPPING_THRESHOLD } from '../utils/constants';

const CartContext = createContext(null);
const EMPTY = { items: [] };

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setCart(EMPTY); return; }
    try {
      setLoading(true);
      const d = await cartApi.getCart();
      setCart(d.cart || EMPTY);
    } catch { /* keep the previous cart; pages surface their own errors */ } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { refresh(); }, [refresh]);

  // Every mutation returns the full cart from the API, so we simply replace local state with it.
  const run = useCallback(async (id, fn) => {
    setPendingId(id ?? 'all');
    try {
      const d = await fn();
      if (d.cart) setCart(d.cart);
      return d.cart;
    } finally {
      setPendingId(null);
    }
  }, []);

  const add = useCallback((id, qty = 1) => run(id, () => cartApi.addToCart(id, qty)), [run]);
  const update = useCallback((id, qty) => run(id, () => cartApi.updateCartItem(id, qty)), [run]);
  const remove = useCallback((id) => run(id, () => cartApi.removeFromCart(id)), [run]);
  const clear = useCallback(() => run('all', () => cartApi.clearCart()), [run]);

  const value = useMemo(() => {
    // A product can be null if it was deleted after being added — ignore such lines.
    const items = (cart.items || []).filter((i) => i?.product);
    const count = items.reduce((s, i) => s + (i.quantity || 0), 0);
    const subtotal = items.reduce((s, i) => s + Number(i.product.finalPrice ?? i.product.price ?? 0) * i.quantity, 0);
    const listTotal = items.reduce((s, i) => s + Number(i.product.price ?? 0) * i.quantity, 0);
    const savings = Math.max(0, listTotal - subtotal);
    const shipping = items.length === 0 || subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    return {
      cart, items, count, subtotal, listTotal, savings, shipping, total: subtotal + shipping,
      loading, pendingId, refresh, add, update, remove, clear,
    };
  }, [cart, loading, pendingId, refresh, add, update, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
};
