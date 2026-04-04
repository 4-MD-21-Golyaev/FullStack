'use client';

import NextLink from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Container, OrderSummary, WideProductCard } from '@/shared/ui';
import { useCart, type CartItem } from '../CartContext';
import { useAuth } from '../AuthContext';
import { useFavorites } from '../FavoritesContext';
import styles from './cart.module.css';

const DELIVERY_COST = 300;
const DISCOUNT_PERCENT = 15;
const UNDO_TIMEOUT_MS = 10_000;

interface PendingDelete {
  item: CartItem;
  countdown: number;
}

export default function CartPage() {
  const router = useRouter();
  const { user, openAuthModal } = useAuth();
  const { items, addItem, removeItem, updateQuantity, clearCart } = useCart();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [pendingDeletes, setPendingDeletes] = useState<PendingDelete[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick countdown every second
  useEffect(() => {
    if (pendingDeletes.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setPendingDeletes(prev => {
          const next = prev
            .map(p => ({ ...p, countdown: p.countdown - 1 }))
            .filter(p => p.countdown > 0);
          return next;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDeletes.length === 0]);

  const startDelete = (item: CartItem) => {
    removeItem(item.productId);
    setPendingDeletes(prev => {
      if (prev.find(p => p.item.productId === item.productId)) return prev;
      return [...prev, { item, countdown: UNDO_TIMEOUT_MS / 1000 }];
    });
  };

  const undoDelete = (productId: string) => {
    const pending = pendingDeletes.find(p => p.item.productId === productId);
    if (pending) {
      const { item } = pending;
      addItem(
        { productId: item.productId, name: item.name, price: item.price, imagePath: item.imagePath, stock: item.stock },
        item.quantity
      );
    }
    setPendingDeletes(prev => prev.filter(p => p.item.productId !== productId));
  };

  const pendingIds = new Set(pendingDeletes.map(p => p.item.productId));

  const inStockItems = items.filter(i => i.stock > 0 && !pendingIds.has(i.productId));
  const outOfStockItems = items.filter(i => i.stock === 0 && !pendingIds.has(i.productId));

  const subtotal = inStockItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = Math.round(subtotal * DISCOUNT_PERCENT / 100);
  const total = subtotal + DELIVERY_COST - discount;
  const totalInStockQty = inStockItems.reduce((sum, i) => sum + i.quantity, 0);

  const isEmpty = items.length === 0;

  return (
    <Container className={styles.page}>
        {isEmpty ? (
          <div className={styles.empty}>
            <h1 className={styles.title}>Корзина</h1>
            <p className={styles.emptyText}>Ваша корзина пуста</p>
            <NextLink href="/catalog">
              <Button size="lg">Перейти в каталог</Button>
            </NextLink>
          </div>
        ) : (
          <>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Корзина</h1>
              <Button variant="ghost" size="md" className={styles.clearBtn} onClick={clearCart}>
                Очистить корзину
              </Button>
            </div>

            <div className={styles.content}>
              <div className={styles.list}>
                {/* В наличии */}
                {(inStockItems.length > 0 || pendingDeletes.length > 0) && (
                  <section className={styles.section}>
                    <div className={styles.sectionTitle}>
                      <span className={styles.sectionLabel}>В наличии</span>
                      <span className={styles.sectionCount}>
                        {inStockItems.length + pendingDeletes.length} {pluralizeItems(inStockItems.length + pendingDeletes.length)}
                      </span>
                    </div>

                    {inStockItems.map(item => (
                      <WideProductCard
                        key={item.productId}
                        name={item.name}
                        imageSrc={item.imagePath}
                        pricePerUnit={item.price}
                        price={item.price * item.quantity}
                        quantity={item.quantity}
                        inStock
                        liked={favoriteIds.has(item.productId)}
                        onLike={() => toggleFavorite(item.productId)}
                        onQuantityChange={qty => updateQuantity(item.productId, qty)}
                        onRemove={() => startDelete(item)}
                      />
                    ))}

                    {pendingDeletes.map(pending => (
                      <div key={pending.item.productId} className={styles.pendingRow}>
                        <div className={styles.pendingInfo}>
                          <span className={styles.name}>{pending.item.name}</span>
                        </div>
                        <div className={styles.pendingActions}>
                          <div className={styles.countdown}>{pending.countdown}</div>
                          <Button variant="secondary" size="md" onClick={() => undoDelete(pending.item.productId)}>
                            Вернуть
                          </Button>
                        </div>
                      </div>
                    ))}
                  </section>
                )}

                {/* Нет в наличии */}
                {outOfStockItems.length > 0 && (
                  <section className={styles.section}>
                    <div className={styles.sectionTitle}>
                      <span className={styles.sectionLabel}>Нет в наличии</span>
                      <span className={styles.sectionCount}>
                        {outOfStockItems.length} {pluralizeItems(outOfStockItems.length)}
                      </span>
                    </div>

                    {outOfStockItems.map(item => (
                      <WideProductCard
                        key={item.productId}
                        name={item.name}
                        imageSrc={item.imagePath}
                        pricePerUnit={item.price}
                        price={item.price}
                        quantity={item.quantity}
                        inStock={false}
                        liked={favoriteIds.has(item.productId)}
                        onLike={() => toggleFavorite(item.productId)}
                        onRemove={() => startDelete(item)}
                      />
                    ))}
                  </section>
                )}
              </div>

              <aside className={styles.sidebar}>
                <Button
                  size="lg"
                  className={styles.checkoutBtn}
                  onClick={() => {
                    if (!user) { openAuthModal('/checkout'); } else { router.push('/checkout'); }
                  }}
                >
                  Перейти к оформлению
                </Button>
                {totalInStockQty > 0 && (
                  <OrderSummary
                    itemCount={totalInStockQty}
                    subtotal={subtotal}
                    deliveryCost={DELIVERY_COST}
                    discount={discount}
                    discountPercent={DISCOUNT_PERCENT}
                    total={total}
                  />
                )}
              </aside>
            </div>
          </>
        )}
      </Container>
  );
}

function pluralizeItems(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'товаров';
  if (mod10 === 1) return 'товар';
  if (mod10 >= 2 && mod10 <= 4) return 'товара';
  return 'товаров';
}
