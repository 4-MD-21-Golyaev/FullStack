'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { VIEWED_PRODUCTS_STORAGE_KEY, getViewedProductIds } from './storage';

export interface ViewedProduct {
  id: string;
  name: string;
  price: number;
  imagePath: string | null;
  stock?: number;
}

interface ApiProduct {
  id: string;
  name: string;
  price: number;
  imagePath: string | null;
  stock?: number;
}

interface UseViewedProductsResult {
  data: ViewedProduct[];
  loading: boolean;
}

function subscribeToStorage(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === null || e.key === VIEWED_PRODUCTS_STORAGE_KEY) callback();
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

function readIdsSnapshot(): string {
  return getViewedProductIds().join(',');
}

function readIdsServerSnapshot(): string {
  return '';
}

/**
 * Reads the viewed-products list from localStorage (re-syncs on storage events),
 * fetches product details, and excludes ids in `excludeIds`.
 */
export function useViewedProducts(limit: number, excludeIds: string[] = []): UseViewedProductsResult {
  // Sync ids from localStorage via external store — no setState-in-effect needed.
  const idsKey = useSyncExternalStore(subscribeToStorage, readIdsSnapshot, readIdsServerSnapshot);
  const ids = useMemo(() => (idsKey ? idsKey.split(',').filter(Boolean) : []), [idsKey]);

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const excludeKey = useMemo(() => excludeIds.join(','), [excludeIds]);

  // Fetch product details when ids list changes.
  useEffect(() => {
    if (ids.length === 0) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Failed to load products');
        const data = (await res.json()) as { products?: ApiProduct[] } | ApiProduct[];
        if (cancelled) return;
        const all = Array.isArray(data) ? data : data.products ?? [];
        setProducts(all);
      } catch {
        if (cancelled) return;
        setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [idsKey, ids.length]);

  const data = useMemo<ViewedProduct[]>(() => {
    if (products.length === 0 || ids.length === 0) return [];
    const exclude = new Set(excludeKey ? excludeKey.split(',').filter(Boolean) : []);
    const byId = new Map(products.map(p => [p.id, p]));
    const result: ViewedProduct[] = [];
    for (const id of ids) {
      if (exclude.has(id)) continue;
      const p = byId.get(id);
      if (!p) continue;
      result.push({
        id: p.id,
        name: p.name,
        price: p.price,
        imagePath: p.imagePath,
        stock: p.stock,
      });
      if (result.length >= limit) break;
    }
    return result;
  }, [products, ids, excludeKey, limit]);

  return { data, loading };
}
