'use client';
import { useState, useEffect, useRef } from 'react';
import { productsApi } from '@/lib/api/products';

export interface ProductSearchResult {
  id: string;
  name: string;
  article: string;
  price: number;
}

export function useProductSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        // productsApi.list always returns ProductsResponse = { products: ProductDto[], total: number }
        const data = await productsApi.list({ search: query.trim(), limit: 10 });
        setResults(data.products);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return { query, setQuery, results, isLoading };
}
