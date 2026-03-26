'use client';

import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { Container, OrderStatusBadge, Skeleton } from '@/shared/ui';
import { ordersApi } from '@/lib/api/orders';
import { OrderTimeline } from '@/widgets/customer/OrderTimeline/OrderTimeline';
import styles from './order.module.css';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ['my-orders', id],
    queryFn: () => ordersApi.getOrder(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Container className={styles.page}>
        <div className={styles.header}>
          <Skeleton width="160px" height="28px" />
          <Skeleton width="90px" height="24px" borderRadius="var(--ctx-radius-badge)" />
        </div>
        <Skeleton width="100%" height="200px" borderRadius="var(--ctx-radius-card)" />
      </Container>
    );
  }

  if (!order) {
    return (
      <Container className={styles.page}>
        <p className={styles.notFound}>Заказ не найден</p>
      </Container>
    );
  }

  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <Container className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.orderId}>#{order.id.slice(0, 8)}</h1>
          <span className={styles.date}>
            {format(new Date(order.createdAt), 'd MMMM yyyy', { locale: ru })}
          </span>
        </div>
        <OrderStatusBadge state={order.state} />
      </div>

      <div className={styles.body}>
        <section className={styles.timelineSection}>
          <h2 className={styles.sectionTitle}>Статус заказа</h2>
          <OrderTimeline state={order.state} />
        </section>

        <section className={styles.itemsSection}>
          <h2 className={styles.sectionTitle}>Состав заказа</h2>
          <ul className={styles.itemList}>
            {order.items.map((item) => (
              <li key={item.productId} className={styles.item}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemArticle}>Арт. {item.article}</span>
                </div>
                <div className={styles.itemPricing}>
                  <span className={styles.itemQty}>{item.quantity} шт.</span>
                  <span className={styles.itemSubtotal}>
                    {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className={styles.totals}>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Сумма товаров</span>
              <span className={styles.totalValue}>{subtotal.toLocaleString('ru-RU')} ₽</span>
            </div>
            <div className={`${styles.totalRow} ${styles.totalRowFinal}`}>
              <span className={styles.totalLabel}>Итого</span>
              <span className={styles.totalValueFinal}>{order.totalAmount.toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>
        </section>

        {order.address && (
          <section className={styles.addressSection}>
            <h2 className={styles.sectionTitle}>Адрес доставки</h2>
            <p className={styles.address}>{order.address}</p>
          </section>
        )}
      </div>
    </Container>
  );
}
