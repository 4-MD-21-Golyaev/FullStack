'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  imagePath: string | null;
  stock: number;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (product: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
}

const STORAGE_KEY = 'nk_cart';

// ── Server API helpers ──────────────────────────────────────────────────────

interface ServerCartItem {
  productId: string;
  name: string;
  price: number;
  imagePath: string | null;
  stock: number;
  quantity: number;
}

async function serverGetCart(): Promise<CartItem[]> {
  const res = await fetch('/api/cart');
  if (!res.ok) return [];
  return res.json() as Promise<CartItem[]>;
}

async function serverAdd(productId: string, quantity: number): Promise<void> {
  await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity }),
  });
}

async function serverUpdate(productId: string, quantity: number): Promise<void> {
  await fetch(`/api/cart/${productId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
}

async function serverRemove(productId: string): Promise<void> {
  await fetch(`/api/cart/${productId}`, { method: 'DELETE' });
}

async function serverSync(localItems: { productId: string; quantity: number }[]): Promise<CartItem[]> {
  const res = await fetch('/api/cart/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: localItems }),
  });
  if (!res.ok) return [];
  return res.json() as Promise<ServerCartItem[]>;
}

// ── Local storage helpers ───────────────────────────────────────────────────

function localRead(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function localWrite(items: CartItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
}

function localClear(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ── Provider ────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => localRead());
  const prevUserIdRef = useRef<string | null>(null);
  const isAuthed = !!user;

  // When auth state resolves:
  // - If just logged in → sync local cart to server, then use server state
  // - If logged out → load from localStorage
  // - If was logged in, still logged in (page refresh) → load from server
  useEffect(() => {
    if (authLoading) return;

    const prevUserId = prevUserIdRef.current;
    const currentUserId = user?.userId ?? null;

    if (currentUserId && !prevUserId) {
      // Just logged in (or first load while authed): sync local → server
      const local = localRead();
      serverSync(local.map(i => ({ productId: i.productId, quantity: i.quantity })))
        .then(serverItems => {
          setItems(serverItems);
          localClear();
        })
        .catch(() => {/* keep local items on error */});
    } else if (!currentUserId && prevUserId) {
      // Just logged out: reset to empty local cart
      localClear();
      void Promise.resolve([] as CartItem[]).then(setItems);
    } else if (currentUserId && prevUserId === currentUserId) {
      // Page refresh while still logged in: load from server
      serverGetCart().then(setItems).catch(() => {/* keep current */});
    }
    // No user, no prev user → already initialized from localStorage in useState

    prevUserIdRef.current = currentUserId;
   
  }, [authLoading, user?.userId]);

  // Persist to localStorage for guests
  useEffect(() => {
    if (!isAuthed) {
      localWrite(items);
    }
  }, [items, isAuthed]);

  const addItem = (product: Omit<CartItem, 'quantity'>, quantity = 1) => {
    if (isAuthed) {
      serverAdd(product.productId, quantity).then(() =>
        serverGetCart().then(setItems)
      ).catch(() => {/* ignore */});
    } else {
      setItems(prev => {
        const existing = prev.find(i => i.productId === product.productId);
        if (existing) {
          return prev.map(i =>
            i.productId === product.productId
              ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock) }
              : i
          );
        }
        return [...prev, { ...product, quantity: Math.min(quantity, product.stock) }];
      });
    }
  };

  const removeItem = (productId: string) => {
    if (isAuthed) {
      serverRemove(productId).then(() =>
        setItems(prev => prev.filter(i => i.productId !== productId))
      ).catch(() => {/* ignore */});
    } else {
      setItems(prev => prev.filter(i => i.productId !== productId));
    }
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeItem(productId);
      return;
    }
    if (isAuthed) {
      serverUpdate(productId, qty).then(() =>
        setItems(prev =>
          prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i)
        )
      ).catch(() => {/* ignore */});
    } else {
      setItems(prev =>
        prev.map(i =>
          i.productId === productId
            ? { ...i, quantity: Math.min(qty, i.stock) }
            : i
        )
      );
    }
  };

  const clearCart = () => {
    if (isAuthed) {
      Promise.all(items.map(i => serverRemove(i.productId)))
        .then(() => setItems([]))
        .catch(() => {/* ignore */});
    } else {
      setItems([]);
    }
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
