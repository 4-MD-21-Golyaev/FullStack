'use client';

import { useSyncExternalStore } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

/**
 * Reactive mobile-viewport flag. SSR returns `false` (desktop default), then re-syncs
 * on client mount and updates on viewport changes.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(MOBILE_QUERY);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}
