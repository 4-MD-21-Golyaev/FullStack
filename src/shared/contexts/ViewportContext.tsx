'use client';

import { createContext, useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

export const ViewportContext = createContext<boolean>(false);

/**
 * Seeds initial isMobile from SSR (UA-based detection on the server)
 * so SSR HTML matches the device — no hydration flash. After mount,
 * subscribes to matchMedia to react to live viewport changes (resize,
 * devtools emulation toggling).
 */
export function ViewportProvider({
  initialIsMobile,
  children,
}: {
  initialIsMobile: boolean;
  children: React.ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(initialIsMobile);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);

  return <ViewportContext.Provider value={isMobile}>{children}</ViewportContext.Provider>;
}
