'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { productsApi } from '@/lib/api/products';

export interface ProductSearchResult {
  id: string;
  name: string;
  article: string;
  price: number;
}

const PAGE_SIZE = 20;

export function useProductSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic counter — discard responses for stale queries.
  const queryEpochRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    queryEpochRef.current += 1;
    const epoch = queryEpochRef.current;

    if (query.trim().length < 2) {
      setResults([]);
      setTotal(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await productsApi.list({ search: query.trim(), limit: PAGE_SIZE, offset: 0 });
        if (queryEpochRef.current !== epoch) return;
        setResults(data.products);
        setTotal(data.total);
      } catch {
        if (queryEpochRef.current !== epoch) return;
        setResults([]);
        setTotal(0);
      } finally {
        if (queryEpochRef.current === epoch) setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const loadMore = useCallback(async () => {
    if (isLoading) return;
    if (results.length >= total) return;
    const epoch = queryEpochRef.current;
    setIsLoading(true);
    try {
      const data = await productsApi.list({ search: query.trim(), limit: PAGE_SIZE, offset: results.length });
      if (queryEpochRef.current !== epoch) return;
      setResults(prev => [...prev, ...data.products]);
    } catch {
      // ignore — keep what we have
    } finally {
      if (queryEpochRef.current === epoch) setIsLoading(false);
    }
  }, [isLoading, query, results.length, total]);

  const hasMore = results.length < total;

  return { query, setQuery, results, isLoading, loadMore, hasMore };
}
