'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/(customer)/AuthContext';
import { fetchPersonalizedCategories, type Category } from '../api';

export interface UsePersonalizedCategorySortResult {
    sorted: Category[];
    loading: boolean;
    personalized: boolean;
}

export function usePersonalizedCategorySort(
    baseCategories: Category[],
): UsePersonalizedCategorySortResult {
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
                const res = await fetchPersonalizedCategories(50);
                if (cancelled) return;
                if (res.personalized) {
                    setPersonalizedOrder(res.items.map(c => c.id));
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
    }, [userId]);

    const sorted = useMemo<Category[]>(() => {
        if (!personalized || personalizedOrder.length === 0) {
            return baseCategories;
        }

        const baseById = new Map(baseCategories.map(c => [c.id, c]));
        const seen = new Set<string>();
        const result: Category[] = [];

        for (const id of personalizedOrder) {
            const cat = baseById.get(id);
            if (cat && !seen.has(id)) {
                result.push(cat);
                seen.add(id);
            }
        }

        for (const cat of baseCategories) {
            if (!seen.has(cat.id)) {
                result.push(cat);
                seen.add(cat.id);
            }
        }

        return result;
    }, [baseCategories, personalizedOrder, personalized]);

    return { sorted, loading, personalized };
}
