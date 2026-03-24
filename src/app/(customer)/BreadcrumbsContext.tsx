'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { BreadcrumbItem } from '@/shared/ui';

interface BreadcrumbsContextValue {
  customCrumbs: BreadcrumbItem[] | null;
  setCustomCrumbs: (crumbs: BreadcrumbItem[] | null) => void;
}

const BreadcrumbsContext = createContext<BreadcrumbsContextValue | null>(null);

export function BreadcrumbsProvider({ children }: { children: React.ReactNode }) {
  const [customCrumbs, setCustomCrumbs] = useState<BreadcrumbItem[] | null>(null);

  const handleSet = useCallback((crumbs: BreadcrumbItem[] | null) => {
    setCustomCrumbs(crumbs);
  }, []);

  return (
    <BreadcrumbsContext.Provider value={{ customCrumbs, setCustomCrumbs: handleSet }}>
      {children}
    </BreadcrumbsContext.Provider>
  );
}

export function useBreadcrumbs(): BreadcrumbsContextValue {
  const ctx = useContext(BreadcrumbsContext);
  if (!ctx) throw new Error('useBreadcrumbs must be used within BreadcrumbsProvider');
  return ctx;
}
