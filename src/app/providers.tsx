'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRef } from 'react';
import { ViewportProvider } from '@/shared/contexts/ViewportContext';

export function Providers({
  initialIsMobile,
  children,
}: {
  initialIsMobile: boolean;
  children: React.ReactNode;
}) {
  const queryClientRef = useRef<QueryClient | null>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          retry: 1,
        },
      },
    });
  }

  return (
    <QueryClientProvider client={queryClientRef.current}>
      <ViewportProvider initialIsMobile={initialIsMobile}>
        {children}
      </ViewportProvider>
    </QueryClientProvider>
  );
}
