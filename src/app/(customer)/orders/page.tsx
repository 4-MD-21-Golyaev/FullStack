'use client';

import NextLink from 'next/link';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { Button, Container, OrderStatusBadge, Skeleton } from '@/shared/ui';
import { ordersApi } from '@/lib/api/orders';
import { useAuth } from '../AuthContext';
import styles from './orders.module.css';

export default function OrdersPage() {
  const { user, isLoading: authLoading, openAuthModal } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => ordersApi.getMyOrders(),
    enabled: !!user,
  });

  return (
    <Container className={styles.page}>
      <h1 className={styles.title}>Мои заказы</h1>

      {authLoading && <OrdersSkeletonList />}

      {!authLoading && !user && (
        <div className={styles.empty}>
          <p className={styles.emptyText}>Войдите, чтобы увидеть свои заказы</p>
          <Button variant="primary" size="lg" onClick={openAuthModal}>
            Войти
          </Button>
        </div>
      )}

      {!authLoading && user && isLoading && <OrdersSkeletonList />}

      {!authLoading && user && !isLoading && orders?.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyText}>У вас ещё нет заказов</p>
          <NextLink href="/catalog">
            <Button size="lg">Перейти в каталог</Button>
          </NextLink>
        </div>
      )}

      {!authLoading && user && !isLoading && orders && orders.length > 0 && (
        <ul className={styles.list}>
          {orders.map((order) => (
            <li key={order.id}>
              <NextLink href={`/orders/${order.id}`} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.orderId}>#{order.id.slice(0, 8)}</span>
                  <OrderStatusBadge state={order.state} />
                </div>
                <div className={styles.cardBottom}>
                  <span className={styles.date}>
                    {format(new Date(order.createdAt), 'd MMMM yyyy', { locale: ru })}
                  </span>
                  <span className={styles.meta}>
                    {pluralizeItems(order.items.length)} · {order.totalAmount.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </NextLink>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

function OrdersSkeletonList() {
  return (
    <ul className={styles.list}>
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <div className={styles.card}>
            <div className={styles.cardTop}>
              <Skeleton width="120px" height="20px" />
              <Skeleton width="80px" height="24px" borderRadius="var(--ctx-radius-badge)" />
            </div>
            <div className={styles.cardBottom}>
              <Skeleton width="140px" height="16px" />
              <Skeleton width="100px" height="16px" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function pluralizeItems(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} товаров`;
  if (mod10 === 1) return `${n} товар`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} товара`;
  return `${n} товаров`;
}
