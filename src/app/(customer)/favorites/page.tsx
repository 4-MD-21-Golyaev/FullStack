'use client';

import NextLink from 'next/link';
import { useEffect } from 'react';
import { Button, Container, CardGrid, Spinner } from '@/shared/ui';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import ProductCard from '@/widgets/customer/ProductCard/ProductCard';
import { useAuth } from '../AuthContext';
import { useFavorites } from '../FavoritesContext';
import styles from './favorites.module.css';

export default function FavoritesPage() {
  const { user, isLoading: authLoading, openAuthModal } = useAuth();
  const { favorites, isLoading } = useFavorites();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!authLoading && !user) {
      openAuthModal('/favorites');
    }
  }, [authLoading, user, openAuthModal]);

  if (!user) {
    return <Container className={styles.page}>{null}</Container>;
  }

  return (
    <Container className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Избранное</h1>
      </div>

      {isLoading && (
        <div className={styles.loading}>
          <Spinner />
        </div>
      )}

      {!isLoading && favorites.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyText}>В избранном пока пусто</p>
          <NextLink href="/catalog">
            <Button size="lg">Перейти в каталог</Button>
          </NextLink>
        </div>
      )}

      {!isLoading && favorites.length > 0 && (
        <CardGrid>
          {favorites.map(p => (
            <ProductCard
              key={p.id}
              id={p.id}
              slug={p.id}
              name={p.name}
              image={p.imagePath ?? '/images/placeholder.png'}
              price={p.price}
              stock={p.stock}
              size={isMobile ? 'S' : 'L'}
              fillWidth={isMobile}
            />
          ))}
        </CardGrid>
      )}
    </Container>
  );
}
