'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo, IconButton, CartButton, Button } from '@/shared/ui';
import { SearchBar } from '@/features/product-search';
import { useCart } from '@/app/(customer)/CartContext';
import { useAuth } from '@/app/(customer)/AuthContext';
import styles from './Header.module.css';

export function Header() {
  const { totalItems } = useCart();
  const { user, openAuthModal } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return (
    <header className={styles.root}>
      {/* Top bar — phone numbers */}
      <div className={styles.topBar}>
        <div className={styles.container}>
          <div className={styles.phones}>
            <div className={styles.phoneItem}>
              <span className={styles.phoneNumber}>+7 (914) 542-02-92</span>
              <span className={styles.phoneLabel}>Горячая линия</span>
            </div>
            <div className={styles.phoneItem}>
              <span className={styles.phoneNumber}>+7 (929) 410-12-02</span>
              <span className={styles.phoneLabel}>Отдел качества</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main bar — logo, search, actions */}
      <div className={styles.mainBar}>
        <div className={styles.container}>
          <Logo variant="default" className={styles.logo} />

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
              onClick={user ? undefined : () => openAuthModal()}
            />
            <IconButton
              icon="like"
              size="lg"
              variant="white"
              aria-label="Избранное"
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
