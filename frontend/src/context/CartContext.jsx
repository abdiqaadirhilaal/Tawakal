import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as cart from '../utils/cart';

const STORAGE_KEY = 'tawakal_cart_v1';
const CartContext = createContext(null);

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((i) => i && typeof i.productId === 'string' && Number(i.quantity) > 0) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* kaydinta maxalliga ah lama heli karo: dambiishu waxay ku sii jiraysaa xusuusta */
    }
  }, [items]);

  // Isku-waafajinta tab-yada kale
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setItems(load());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((product, quantity = 1) => setItems((list) => cart.addItem(list, product, quantity)), []);
  const setQuantity = useCallback((productId, quantity) => setItems((list) => cart.setQuantity(list, productId, quantity)), []);
  const remove = useCallback((productId) => setItems((list) => cart.removeItem(list, productId)), []);
  const clear = useCallback(() => setItems([]), []);

  // Ku cusboonaysii qiimaha/kaydka xogta cusub ee server-ka (eeg useCartSync)
  const sync = useCallback((fresh) => {
    setItems((list) =>
      list.map((i) => {
        const p = fresh[i.productId];
        if (p === undefined) return i;
        if (p === null) return { ...i, unavailable: true };
        return {
          ...i,
          unavailable: p.stock <= 0,
          name: p.name,
          sku: p.sku,
          slug: p.slug,
          unit: p.unit,
          price: p.price,
          stock: p.stock,
          allowDecimal: p.allowDecimal,
          image: p.images?.[0] || '',
          quantity: p.stock > 0 ? cart.clampQuantity(i.quantity, p) : i.quantity,
        };
      })
    );
  }, []);

  const value = useMemo(
    () => ({ items, count: cart.cartCount(items), add, setQuantity, remove, clear, sync }),
    [items, add, setQuantity, remove, clear, sync]
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart waa in lagu dhex isticmaalaa CartProvider');
  return ctx;
}
