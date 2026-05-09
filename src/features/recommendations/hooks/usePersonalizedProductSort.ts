'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/(customer)/AuthContext';
import { fetchPersonalizedProducts, type Product } from '../api';

export interface UsePersonalizedProductSortResult {
    sorted: Product[];
    loading: boolean;
    personalized: boolean;
}

export function usePersonalizedProductSort(
    baseProducts: Product[],
    categoryId: string | null,
): UsePersonalizedProductSortResult {
    const { user } = useAuth();
    const userId = user?.userId;

    const [personalizedOrder, setPersonalizedOrder] = useState<string[]>([]);
    const [personalized, setPersonalized] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!userId) {
            setPersonalizedOrder([]);
            setPersonalized(false);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);

        (async () => {
            try {
                const res = await fetchPersonalizedProducts({ categoryId, limit: 50 });
                if (cancelled) return;
                if (res.personalized) {
                    setPersonalizedOrder(res.items.map(p => p.id));
                    setPersonalized(true);
                } else {
                    setPersonalizedOrder([]);
                    setPersonalized(false);
                }
            } catch {
                if (cancelled) return;
                setPersonalizedOrder([]);
                setPersonalized(false);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [userId, categoryId]);

    const sorted = useMemo<Product[]>(() => {
        if (!personalized || personalizedOrder.length === 0) {
            return baseProducts;
        }

        const baseById = new Map(baseProducts.map(p => [p.id, p]));
        const seen = new Set<string>();
        const result: Product[] = [];

        for (const id of personalizedOrder) {
            const product = baseById.get(id);
            if (product && !seen.has(id)) {
                result.push(product);
                seen.add(id);
            }
        }

        for (const product of baseProducts) {
            if (!seen.has(product.id)) {
                result.push(product);
                seen.add(product.id);
            }
        }

        return result;
    }, [baseProducts, personalizedOrder, personalized]);

    return { sorted, loading, personalized };
}
