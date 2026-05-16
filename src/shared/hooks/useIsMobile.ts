'use client';

import { useContext } from 'react';
import { ViewportContext } from '@/shared/contexts/ViewportContext';

/**
 * Reactive mobile-viewport flag. Reads from ViewportContext which is
 * seeded by UA-based detection on the server (avoiding hydration flash)
 * and kept in sync with matchMedia after mount.
 */
export function useIsMobile(): boolean {
  return useContext(ViewportContext);
}
