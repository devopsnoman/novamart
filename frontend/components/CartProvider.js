'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

const EMPTY_CART = { items: [], itemCount: 0, subtotalCents: 0 };
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { token, ready, logout } = useAuth();
  const [cart, setCart] = useState(EMPTY_CART);
  const [loading, setLoading] = useState(false);

  // Run a cart request; an expired token logs the user out.
  const run = useCallback(
    async (path, options) => {
      try {
        const data = await apiFetch(path, { ...options, token });
        setCart(data);
        return data;
      } catch (err) {
        if (err.status === 401) logout();
        throw err;
      }
    },
    [token, logout]
  );

  const refresh = useCallback(async () => {
    if (!token) {
      setCart(EMPTY_CART);
      return;
    }
    setLoading(true);
    try {
      await run('/cart');
    } catch (err) {
      // keep the old cart; pages show errors for their own actions
    } finally {
      setLoading(false);
    }
  }, [token, run]);

  useEffect(() => {
    if (ready) refresh();
  }, [ready, refresh]);

  const addItem = useCallback(
    (productId, quantity = 1) => run('/cart/items', { method: 'POST', body: { productId, quantity } }),
    [run]
  );
  const setQuantity = useCallback(
    (productId, quantity) =>
      run(`/cart/items/${productId}`, { method: 'PATCH', body: { quantity } }),
    [run]
  );
  const removeItem = useCallback(
    (productId) => run(`/cart/items/${productId}`, { method: 'DELETE' }),
    [run]
  );

  const value = useMemo(
    () => ({ cart, loading, refresh, addItem, setQuantity, removeItem }),
    [cart, loading, refresh, addItem, setQuantity, removeItem]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
