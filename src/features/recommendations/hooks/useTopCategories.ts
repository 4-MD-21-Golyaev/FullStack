'use client';

import { useEffect, useState } from 'react';
import { fetchTopCategories, type Category } from '../api';

export interface UseTopCategoriesResult {
    data: Category[];
    loading: boolean;
    fallbackUsed: boolean;
}

export function useTopCategories(limit: number): UseTopCategoriesResult {
    const [data, setData] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [fallbackUsed, setFallbackUsed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        (async () => {
            try {
                const res = await fetchTopCategories(limit);
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
    }, [limit]);

    return { data, loading, fallbackUsed };
}
