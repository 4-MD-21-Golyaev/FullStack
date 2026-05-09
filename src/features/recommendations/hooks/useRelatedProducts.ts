'use client';

import { useEffect, useState } from 'react';
import { fetchRelatedProducts, type Product } from '../api';

export interface UseRelatedProductsResult {
    data: Product[];
    loading: boolean;
    fallbackUsed: boolean;
}

export function useRelatedProducts(
    productId: string | null | undefined,
    limit: number,
): UseRelatedProductsResult {
    const [data, setData] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [fallbackUsed, setFallbackUsed] = useState(false);

    useEffect(() => {
        if (!productId) {
            setData([]);
            setLoading(false);
            setFallbackUsed(false);
            return;
        }

        let cancelled = false;
        setLoading(true);

        (async () => {
            try {
                const res = await fetchRelatedProducts(productId, limit);
                if (cancelled) return;
                setData(res.items);
                setFallbackUsed(res.fallbackUsed);
            } catch {
                if (cancelled) return;
                setData([]);
                setFallbackUsed(false);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [productId, limit]);

    return { data, loading, fallbackUsed };
}
