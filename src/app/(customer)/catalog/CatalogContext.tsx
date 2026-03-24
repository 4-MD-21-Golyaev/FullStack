'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { CatalogStructure } from '@/application/catalog/GetCatalogStructureUseCase';
import type { Category } from '@/domain/category/Category';

export function buildCategoryPath(
  categoryId: string,
  rootCategories: Category[],
  childrenByParent: Record<string, Category[]>,
): Category[] {
  const allCategories = [...rootCategories, ...Object.values(childrenByParent).flat()];
  const byId = new Map(allCategories.map(c => [c.id, c]));

  const path: Category[] = [];
  let current = byId.get(categoryId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

interface CatalogContextValue {
  rootCategories: Category[];
  childrenByParent: Record<string, Category[]>;
  expanded: Record<string, boolean>;
  toggleCategory: (id: string) => void;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({
  initialData,
  children,
}: {
  initialData: CatalogStructure;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleCategory = useCallback((id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <CatalogContext.Provider
      value={{
        rootCategories: initialData.rootCategories,
        childrenByParent: initialData.childrenByParent,
        expanded,
        toggleCategory,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider');
  return ctx;
}
