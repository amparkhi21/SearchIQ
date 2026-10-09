import { useCallback, useState } from 'react';
import { errorMessage } from '../api/axios';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import useRequireAuth from './useRequireAuth';
import { productId } from '../utils/product';

/** Shared add-to-cart / wishlist behaviour (auth gate, toasts, busy flags) for cards and the details page. */
export default function useProductActions(product) {
  const id = productId(product);
  const ensureAuth = useRequireAuth();
  const toast = useToast();
  const cart = useCart();
  const wishlist = useWishlist();
  const [adding, setAdding] = useState(false);
  const [wishing, setWishing] = useState(false);

  const addToCart = useCallback(async (qty = 1) => {
    if (!ensureAuth('Sign in to add items to your cart')) return false;
    setAdding(true);
    try {
      await cart.add(id, qty);
      toast.success(`Added ${qty > 1 ? `${qty} × ` : ''}“${product.name}” to your cart`);
      return true;
    } catch (e) {
      toast.error(errorMessage(e, 'Could not add to cart'));
      return false;
    } finally {
      setAdding(false);
    }
  }, [ensureAuth, cart, id, product?.name, toast]);

  const toggleWishlist = useCallback(async () => {
    if (!ensureAuth('Sign in to save items to your wishlist')) return;
    setWishing(true);
    try {
      const saved = await wishlist.toggle(id);
      toast.success(saved ? 'Saved to your wishlist' : 'Removed from your wishlist');
    } catch (e) {
      toast.error(errorMessage(e, 'Could not update your wishlist'));
    } finally {
      setWishing(false);
    }
  }, [ensureAuth, wishlist, id, toast]);

  return { addToCart, toggleWishlist, adding, wishing, wished: wishlist.has(id) };
}
