'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button, Container, Grid, GridItem, Skeleton, AccountTabs, Chips } from '@/shared/ui';
import { OrderCard } from '@/widgets/customer/OrderCard/OrderCard';
import { ordersApi } from '@/lib/api/orders';
import { OrderState } from '@/domain/order/OrderState';
import { useAuth } from '../AuthContext';
import styles from './orders.module.css';

type Filter = 'all' | 'active' | 'done';

const ACTIVE_STATES: OrderState[] = [
  OrderState.CREATED,
  OrderState.PICKING,
  OrderState.PAYMENT,
  OrderState.DELIVERY_ASSIGNED,
  OrderState.OUT_FOR_DELIVERY,
];

const DONE_STATES: OrderState[] = [
  OrderState.DELIVERED,
  OrderState.CLOSED,
  OrderState.CANCELLED,
];

const CANCELLABLE_STATES: OrderState[] = [OrderState.CREATED, OrderState.PICKING];

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'done', label: 'Выполненные' },
];

export default function OrdersPage() {
  const { user, isLoading: authLoading, openAuthModal, refresh } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => ordersApi.getMyOrders(),
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => ordersApi.cancelOrder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-orders'] }),
  });

  const filteredOrders =
    orders?.filter((order) => {
      if (filter === 'active') return ACTIVE_STATES.includes(order.state);
      if (filter === 'done') return DONE_STATES.includes(order.state);
      return true;
    }) ?? [];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    await refresh();
    router.push('/');
  };

  return (
    <Container>
      <Grid className={styles.page}>
        <GridItem span={3} spanMd={12} className={styles.sidebar}>
          <AccountTabs activeTab="orders" onLogout={handleLogout} />
        </GridItem>
        <GridItem span={9} spanMd={12}>
        <main className={styles.main}>
          <h1 className={styles.title}>История заказов</h1>

          {/* Auth loading */}
          {authLoading && <OrdersSkeletonList />}

          {/* Not logged in */}
          {!authLoading && !user && (
            <div className={styles.empty}>
              <p className={styles.emptyText}>Войдите, чтобы увидеть свои заказы</p>
              <Button variant="primary" size="lg" onClick={() => openAuthModal()}>
                Войти
              </Button>
            </div>
          )}

          {/* Logged in */}
          {!authLoading && user && (
            <>
              {/* Chips filter — only show if orders exist and loading is done */}
              {!isLoading && orders && orders.length > 0 && (
                <div className={styles.chips}>
                  {FILTER_OPTIONS.map((opt) => (
                    <Chips
                      key={opt.value}
                      selected={filter === opt.value}
                      onClick={() => setFilter(opt.value)}
                    >
                      {opt.label}
                    </Chips>
                  ))}
                </div>
              )}

              {isLoading && <OrdersSkeletonList />}

              {!isLoading &&
                filteredOrders.length === 0 &&
                (orders?.length ?? 0) === 0 && (
                  <div className={styles.empty}>
                    <p className={styles.emptyText}>У вас ещё нет заказов</p>
                    <Button href="/catalog">Перейти в каталог</Button>
                  </div>
                )}

              {!isLoading &&
                filteredOrders.length === 0 &&
                (orders?.length ?? 0) > 0 && (
                  <p className={styles.emptyText}>Нет заказов в этой категории</p>
                )}

              {!isLoading && filteredOrders.length > 0 && (
                <ul className={styles.list}>
                  {filteredOrders.map((order) => (
                    <li key={order.id}>
                      <OrderCard
                        orderId={order.id.slice(0, 8)}
                        date={`Заказ от ${format(new Date(order.createdAt), 'd MMMM', { locale: ru })}`}
                        state={order.state}
                        items={order.items}
                        itemCount={order.items.length}
                        totalAmount={order.totalAmount}
                        onViewDetails={() => router.push(`/orders/${order.id}`)}
                        onCancel={
                          CANCELLABLE_STATES.includes(order.state)
                            ? () => cancelMutation.mutate(order.id)
                            : undefined
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </main>
        </GridItem>
      </Grid>
    </Container>
  );
}

function OrdersSkeletonList() {
  return (
    <ul className={styles.list}>
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <div className={styles.skeletonCard}>
            <div className={styles.skeletonRow}>
              <Skeleton width="160px" height="20px" />
              <Skeleton width="80px" height="24px" borderRadius="var(--ctx-radius-badge)" />
            </div>
            <div className={styles.skeletonRow}>
              <Skeleton width="120px" height="16px" />
              <Skeleton width="80px" height="16px" />
            </div>
            <Skeleton width="100%" height="64px" borderRadius="var(--ctx-radius-card)" />
          </div>
        </li>
      ))}
    </ul>
  );
}
