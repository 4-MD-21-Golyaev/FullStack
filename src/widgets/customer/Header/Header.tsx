'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Logo, IconButton, CartButton, Button } from '@/shared/ui';
import { SearchBar } from '@/features/product-search';
import { useCart } from '@/app/(customer)/CartContext';
import { useAuth } from '@/app/(customer)/AuthContext';
import styles from './Header.module.css';

export function Header() {
  const { totalItems } = useCart();
  const { user, openAuthModal } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isCheckout = pathname?.startsWith('/checkout') ?? false;
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return (
    <header className={[styles.root, isCheckout ? styles.checkout : ''].filter(Boolean).join(' ')}>
      <div className={styles.checkoutBar}>
        <IconButton
          icon="arrow_left"
          size="lg"
          variant="white"
          aria-label="Назад в корзину"
          onClick={() => router.push('/cart')}
        />
      </div>
      {/* Top bar — phone numbers */}
      <div className={styles.topBar}>
        <div className={styles.container}>
          <div className={styles.phones}>
            <div className={styles.phoneItem}>
              <span className={styles.phoneNumber}>+7 (999) 999-99-99</span>
              <span className={styles.phoneLabel}>Горячая линия</span>
            </div>
            <div className={styles.phoneItem}>
              <span className={styles.phoneNumber}>+7 (999) 999-99-99</span>
              <span className={styles.phoneLabel}>Отдел качества</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main bar — logo, search, actions */}
      <div className={styles.mainBar}>
        <div className={styles.container}>
          <Logo variant="default" className={styles.logoDesktop} />
          <Logo variant="favicon" className={styles.logoMobile} />

          <div className={styles.searchWrap}>
            <SearchBar
              placeholder="Поиск"
              className={styles.search}
              onSelect={(product) => router.push(`/catalog/product/${product.id}`)}
            />
          </div>

          <div className={styles.actions}>
            <Link href="/catalog" className={styles.catalogBtnLink}>
              <Button variant="primary" size="lg" className={styles.catalogBtn}>
                Каталог
              </Button>
            </Link>
            <IconButton
              icon="account"
              size="lg"
              variant="white"
              aria-label="Профиль"
              onClick={user ? () => router.push('/orders') : () => openAuthModal()}
            />
          <IconButton
            icon="like"
            size="lg"
            variant="white"
            aria-label="Избранное"
            onClick={() => {
              if (user) {
                router.push('/favorites');
              } else {
                openAuthModal('/favorites');
              }
            }}
          />
            <Link href="/cart" aria-label="Корзина">
              <CartButton count={mounted ? totalItems : 0} />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
