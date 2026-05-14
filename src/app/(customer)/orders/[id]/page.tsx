'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Grid,
  GridItem,
  AccountTabs,
  OrderStatusBadge,
  ProfileField,
  Button,
  Skeleton,
  WideProductCard,
  OrderSummary,
} from '@/shared/ui';
import { ordersApi } from '@/lib/api/orders';
import { OrderState } from '@/domain/order/OrderState';
import { getCustomerOrderStatusConfig } from '@/lib/order-status-config';
import MobileOrderBar from '@/widgets/customer/MobileOrderBar/MobileOrderBar';
import { useAuth } from '../../AuthContext';
import { useFavorites } from '../../FavoritesContext';
import { useCart } from '../../CartContext';
import styles from './order.module.css';

const CANCELLABLE_STATES = [OrderState.CREATED, OrderState.PICKING];
const PAYABLE_STATES = [OrderState.CREATED, OrderState.PICKING, OrderState.PAYMENT];

const ABSENCE_LABELS: Record<string, string> = {
  CALL_REPLACE: 'Позвонить мне. Заменить, если не отвечу',
  CALL_REMOVE:  'Позвонить мне. Убрать, если не отвечу',
  AUTO_REPLACE: 'Заменить автоматически',
  AUTO_REMOVE:  'Убрать автоматически',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { refresh } = useAuth();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { addItem } = useCart();

  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ['my-orders', id],
    queryFn: () => ordersApi.getOrder(id),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancelOrder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-orders'] }),
  });

  const isCancellable = order ? CANCELLABLE_STATES.includes(order.state) : false;

  function handleRepeat() {
    if (!order) return;
    for (const item of order.items) {
      addItem(
        {
          productId: item.productId,
          name: item.name,
          price: item.price,
          imagePath: item.imageSrc ?? null,
          stock: 9999,
        },
        item.quantity
      );
    }
    router.push('/cart');
  }

  async function handlePay() {
    setIsPaying(true);
    setPayError(null);
    try {
      const { confirmationUrl } = await ordersApi.initiatePayment(id);
      window.location.href = confirmationUrl;
    } catch (e) {
      setPayError(e instanceof Error ? e.message : 'Ошибка оплаты');
    } finally {
      setIsPaying(false);
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    await refresh();
    router.push('/');
  };

  if (isLoading) {
    return (
      <Container>
        <Grid className={styles.page}>
          <GridItem span={3} spanMd={12} className={styles.sidebar}>
            <AccountTabs activeTab="orders" onLogout={handleLogout} />
          </GridItem>
          <GridItem span={9} spanMd={12}>
            <main className={styles.main}>
              <Skeleton width="200px" height="32px" />
              <Skeleton width="100%" height="120px" borderRadius="var(--primitive-radius-200)" />
              <Skeleton width="100%" height="200px" borderRadius="var(--primitive-radius-200)" />
            </main>
          </GridItem>
        </Grid>
      </Container>
    );
  }

  if (!order) {
    return (
      <Container>
        <Grid className={styles.page}>
          <GridItem span={3} spanMd={12} className={styles.sidebar}>
            <AccountTabs activeTab="orders" onLogout={handleLogout} />
          </GridItem>
          <GridItem span={9} spanMd={12}>
            <main className={styles.main}>
              <p className={styles.notFound}>Заказ не найден</p>
            </main>
          </GridItem>
        </Grid>
      </Container>
    );
  }

  const orderStatusConfig = getCustomerOrderStatusConfig(order.state);

  return (
    <Container>
      <Grid className={styles.page}>
        <GridItem span={3} spanMd={12} className={styles.sidebar}>
          <AccountTabs activeTab="orders" onLogout={handleLogout} />
        </GridItem>
        <GridItem span={9} spanMd={12}>
          <main className={styles.main}>
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <h1 className={styles.title}>
                  Заказ от {format(new Date(order.createdAt), 'd MMMM', { locale: ru })}
                </h1>
                <div className={styles.headerMeta}>
                  <span className={styles.orderNumber}>№ {order.id.slice(0, 10)}</span>
                  <OrderStatusBadge
                    label={orderStatusConfig.label}
                    bgColor={orderStatusConfig.bgColor}
                    color="var(--ctx-color-text-inverse)"
                  />
                </div>
              </div>
              <div className={styles.headerButtons}>
                <Button variant="secondary" size="md" onClick={handleRepeat}>
                  Повторить заказ
                </Button>
                {isCancellable && (
                  <Button variant="tertiary" size="md" onClick={() => cancelMutation.mutate()}>
                    Отменить
                  </Button>
                )}
              </div>
            </div>

            {/* Info section — 2 columns */}
            <div className={styles.infoColumns}>
              {/* Left column: delivery details */}
              <div className={styles.infoCol}>
                {order.customerPhone && (
                  <ProfileField label="Получатель" value={order.customerPhone} />
                )}
                <ProfileField label="Адрес доставки" value={order.address || 'Не указан'} />
                {order.scheduledDate && (
                  <ProfileField
                    label="Дата и время"
                    value={[
                      format(new Date(order.scheduledDate), 'd MMMM', { locale: ru }),
                      order.scheduledTimeSlot,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  />
                )}
                <ProfileField
                  label="Если товар закончился"
                  value={ABSENCE_LABELS[order.absenceResolutionStrategy] ?? order.absenceResolutionStrategy}
                />
              </div>
              {/* Right column: summary + payment */}
              <div className={styles.infoCol}>
                <OrderSummary
                  itemCount={order.items.reduce((s, i) => s + i.quantity, 0)}
                  subtotal={order.items.reduce((s, i) => s + i.price * i.quantity, 0)}
                  total={order.totalAmount}
                />
                {order.payment && (
                  <ProfileField label="Способ оплаты" value="Онлайн-оплата" />
                )}
                {PAYABLE_STATES.includes(order.state) && (
                  <div className={styles.payBlock}>
                    {order.state !== OrderState.PAYMENT && (
                      <p className={styles.payNote}>Оплата доступна после сборки</p>
                    )}
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handlePay}
                      disabled={order.state !== OrderState.PAYMENT || isPaying}
                    >
                      Оплатить
                    </Button>
                    {payError && <p className={styles.payError}>{payError}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Product list */}
            <section className={styles.itemsSection}>
              <h2 className={styles.sectionTitle}>Список товаров</h2>
              <div className={styles.itemList}>
                {order.items.map((item) => (
                  <WideProductCard
                    key={item.productId}
                    variant="history"
                    name={item.name}
                    imageSrc={item.imageSrc}
                    pricePerUnit={item.price}
                    price={item.price * item.quantity}
                    quantity={item.quantity}
                    inStock={true}
                    href={`/catalog/product/${item.productId}`}
                    liked={favoriteIds.has(item.productId)}
                    onLike={() => toggleFavorite(item.productId)}
                  />
                ))}
              </div>
            </section>
          </main>
        </GridItem>
      </Grid>
      <MobileOrderBar
        onRepeat={handleRepeat}
        onCancel={isCancellable ? () => cancelMutation.mutate() : undefined}
      />
    </Container>
  );
}
