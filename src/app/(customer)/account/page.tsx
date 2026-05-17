'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AccountTabs, Container } from '@/shared/ui';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useAuth } from '../AuthContext';
import styles from './account.module.css';

/**
 * Mobile-only "account hub" — lists all account sections (orders, profile,
 * discounts, etc.) using the same AccountTabs component the desktop sidebar
 * uses. Desktop users are redirected straight to /orders, where the sidebar
 * already provides this navigation.
 */
export default function AccountMenuPage() {
  const router = useRouter();
  const { user, isLoading, openAuthModal, refresh } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      openAuthModal('/account');
      router.replace('/');
      return;
    }
    if (!isMobile) {
      router.replace('/orders');
    }
  }, [isLoading, user, isMobile, openAuthModal, router]);

  if (isLoading || !user || !isMobile) return null;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    await refresh();
    router.push('/');
  };

  return (
    <Container className={styles.page}>
      <AccountTabs onLogout={handleLogout} />
    </Container>
  );
}
