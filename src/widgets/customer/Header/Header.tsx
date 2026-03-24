'use client';

import Link from 'next/link';
import { Logo, Search, IconButton, CartButton, Button } from '@/shared/ui';
import styles from './Header.module.css';

interface HeaderProps {
  cartCount?: number;
  onCartClick?: () => void;
  onProfileClick?: () => void;
}

export function Header({ cartCount = 0, onCartClick, onProfileClick }: HeaderProps) {
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
            <Search size="lg" placeholder="Поиск" className={styles.search} />
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
              onClick={onProfileClick}
            />
            <IconButton
              icon="like"
              size="lg"
              variant="white"
              aria-label="Избранное"
            />
            <CartButton
              count={cartCount}
              onClick={onCartClick}
              aria-label="Корзина"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
