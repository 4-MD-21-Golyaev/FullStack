'use client';

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
  CardImage,
  Price,
} from '@/shared/ui';
import { OrderTimeline } from '@/widgets/customer/OrderTimeline/OrderTimeline';
import { ordersApi } from '@/lib/api/orders';
import { OrderState } from '@/domain/order/OrderState';
import { getCustomerOrderStatusConfig } from '@/lib/order-status-config';
import { pluralizeItems } from '@/lib/pluralize';
import { useAuth } from '../../AuthContext';
import styles from './order.module.css';

const CANCELLABLE_STATES = [OrderState.CREATED, OrderState.PICKING];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { refresh } = useAuth();

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
              <Skeleton width="100%" height="120px" borderRadius="var(--ctx-radius-card)" />
              <Skeleton width="100%" height="200px" borderRadius="var(--ctx-radius-card)" />
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
                  Заказ от {format(new Date(order.createdAt), 'd MMMM yyyy', { locale: ru })}
                </h1>
                <OrderStatusBadge
                  label={orderStatusConfig.label}
                  bgColor={orderStatusConfig.bgColor}
                  color="var(--ctx-color-text-inverse)"
                />
              </div>
              {isCancellable && (
                <Button variant="tertiary" size="md" onClick={() => cancelMutation.mutate()}>
                  Отменить
                </Button>
              )}
            </div>

            {/* Info grid */}
            <div className={styles.infoGrid}>
              <ProfileField label="Статус" value={orderStatusConfig.label} />
              <ProfileField label="Адрес доставки" value={order.address || 'Не указан'} />
              <ProfileField
                label="Дата заказа"
                value={format(new Date(order.createdAt), 'd MMMM yyyy', { locale: ru })}
              />
              <ProfileField label="Номер заказа" value={`#${order.id.slice(0, 8)}`} />
              <ProfileField label="Позиций" value={pluralizeItems(order.items.length)} />
            </div>

            {/* Order timeline */}
            <OrderTimeline state={order.state} />

            {/* Items section */}
            <section className={styles.itemsSection}>
              <h2 className={styles.sectionTitle}>Состав заказа</h2>
              <ul className={styles.itemList}>
                {order.items.map((item) => (
                  <li key={item.productId} className={styles.item}>
                    {item.imageSrc ? (
                      <CardImage
                        src={item.imageSrc}
                        size="M"
                        alt={item.name}
                        className={styles.itemImage}
                      />
                    ) : (
                      <div className={styles.itemImagePlaceholder} aria-hidden="true" />
                    )}
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>{item.name}</span>
                      <span className={styles.itemArticle}>Арт. {item.article}</span>
                    </div>
                    <div className={styles.itemPricing}>
                      <span className={styles.itemQty}>
                        {item.quantity} шт. × <Price value={item.price} />
                      </span>
                      <span className={styles.itemSubtotal}>
                        <Price value={item.price * item.quantity} />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className={styles.total}>
                <span className={styles.totalLabel}>Итого</span>
                <Price value={order.totalAmount} className={styles.totalValue} />
              </div>
            </section>
          </main>
        </GridItem>
      </Grid>
    </Container>
  );
}
