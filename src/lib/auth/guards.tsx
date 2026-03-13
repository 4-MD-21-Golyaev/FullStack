'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { authApi } from '@/lib/api/auth';

const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin',
  PICKER: '/picker',
  STAFF: '/picker',
  COURIER: '/courier',
  CUSTOMER: '/',
};

function useMe() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    retry: false,
    staleTime: 60_000,
  });
}

/** Guards a route to require one of the allowed roles.
 *  On 401 / wrong role — redirects appropriately. */
export function useRoleGuard(allowedRoles: string[]) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading, isError } = useMe();

  useEffect(() => {
    if (isLoading) return;

    if (isError || !user) {
      const returnTo = encodeURIComponent(pathname);
      router.replace(`/login?returnTo=${returnTo}`);
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      const home = ROLE_HOME[user.role] ?? '/login';
      router.replace(home);
    }
  }, [isLoading, isError, user, allowedRoles, router, pathname]);

  return { user, isLoading, isError };
}

export { useMe };
