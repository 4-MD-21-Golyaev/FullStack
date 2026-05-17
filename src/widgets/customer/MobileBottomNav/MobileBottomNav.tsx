'use client';

import { useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MobilePanelButton, MobilePanelCartButton } from '@/shared/ui';
import { useCart } from '@/app/(customer)/CartContext';
import { useAuth } from '@/app/(customer)/AuthContext';
import styles from './MobileBottomNav.module.css';

export function MobileBottomNav() {
  const { totalItems } = useCart();
  const { user, openAuthModal } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (pathname === '/checkout' || pathname.startsWith('/checkout/')) {
    return null;
  }

  const isCatalogActive = pathname.startsWith('/catalog');
  const isAccountActive =
    pathname.startsWith('/account') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/profile');
  const isLikeActive = pathname.startsWith('/favorites');
  const isCartActive = pathname.startsWith('/cart');

  return (
    <nav className={styles.root}>
      <MobilePanelButton
        icon="catalog"
        state={isCatalogActive ? 'activated' : 'enabled'}
        aria-label="Каталог"
        onClick={() => router.push('/catalog')}
      />
      <MobilePanelButton
        icon="account"
        state={isAccountActive ? 'activated' : 'enabled'}
        aria-label="Профиль"
        onClick={user ? () => router.push('/account') : () => openAuthModal()}
      />
      <MobilePanelButton
        icon="like"
        state={isLikeActive ? 'activated' : 'enabled'}
        aria-label="Избранное"
        onClick={user ? () => router.push('/favorites') : () => openAuthModal('/favorites')}
      />
      <MobilePanelCartButton
        count={mounted ? totalItems : 0}
        active={isCartActive}
        onClick={() => router.push('/cart')}
      />
    </nav>
  );
}

export default MobileBottomNav;
