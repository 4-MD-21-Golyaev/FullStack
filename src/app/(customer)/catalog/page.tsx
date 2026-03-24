'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Category } from '@/shared/ui';
import CatalogSidebar from '@/widgets/customer/CatalogSidebar/CatalogSidebar';
import styles from './catalog.module.css';

interface ApiCategory {
  id: string;
  name: string;
  imagePath: string | null;
  parentId: string | null;
}

type ChildrenMap = Record<string, ApiCategory[]>;

export default function CatalogPage() {
  const [rootCategories, setRootCategories] = useState<ApiCategory[]>([]);
  const [childrenByParent, setChildrenByParent] = useState<ChildrenMap>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loadingRoot, setLoadingRoot] = useState(true);

  const fetchCategories = useCallback(async (parentId?: string | null) => {
    const url = parentId
      ? `/api/categories?parentId=${encodeURIComponent(parentId)}`
      : '/api/categories';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load categories');
    return (await res.json()) as ApiCategory[];
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingRoot(true);
    fetchCategories(null)
      .then(data => {
        if (!active) return;
        setRootCategories(data);
      })
      .catch(() => {
        if (!active) return;
        setRootCategories([]);
      })
      .finally(() => {
        if (!active) return;
        setLoadingRoot(false);
      });
    return () => {
      active = false;
    };
  }, [fetchCategories]);

  const toggleCategory = useCallback(
    async (categoryId: string) => {
      setExpanded(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
      if (childrenByParent[categoryId]) return;
      try {
        const children = await fetchCategories(categoryId);
        setChildrenByParent(prev => ({ ...prev, [categoryId]: children }));
      } catch {
        setChildrenByParent(prev => ({ ...prev, [categoryId]: [] }));
      }
    },
    [childrenByParent, fetchCategories],
  );

  const gridCategories = useMemo(
    () => rootCategories,
    [rootCategories],
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Каталог</h1>

        <div className={styles.layout}>
          <CatalogSidebar
            className={styles.sidebar}
            categories={rootCategories}
            childrenByParent={childrenByParent}
            expanded={expanded}
            loading={loadingRoot}
            onToggle={toggleCategory}
          />

          <section className={styles.grid}>
            {gridCategories.map(cat => (
              <Category
                key={cat.id}
                label={cat.name}
                href={`/catalog/${cat.id}`}
                imageSrc={cat.imagePath ?? undefined}
                imageAlt={cat.name}
                size="L"
              />
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
