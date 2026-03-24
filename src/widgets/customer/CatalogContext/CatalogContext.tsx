'use client';

import { createContext } from 'react';

export interface CatalogCategory {
  id: string;
  name: string;
  imagePath?: string | null;
  parentId?: string | null;
}

export interface CatalogContextValue {
  rootCategories: CatalogCategory[];
  childrenByParent: Record<string, CatalogCategory[]>;
}

export const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({
  value,
  children,
}: {
  value: CatalogContextValue;
  children: React.ReactNode;
}) {
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
