'use client';

import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, CardImage, OrderStatusBadge, Price } from '@/shared/ui';
import { getCustomerOrderStatusConfig } from '@/lib/order-status-config';
import { pluralizeItems } from '@/lib/pluralize';
import type { OrderState } from '@/domain/order/OrderState';
import styles from './OrderCard.module.css';

export interface OrderCardProps {
  orderId: string;
  date: string;             // pre-formatted: "Заказ от 20 июля"
  state: OrderState;
  items: Array<{
    productId: string;
    imageSrc?: string | null;
  }>;
  itemCount: number;        // total items count for "N товаров"
  totalAmount: number;
  detailsHref: string;      // route to order detail page — used by overlay link + "Детали" button
  onCancel?: () => void;    // if undefined — no "Отменить" button
  onPay?: () => void;       // shown when provided — primary CTA for PAYMENT state
  onRepeat?: () => void;    // shown when provided — primary CTA for non-PAYMENT states
  size?: 'M' | 'S';        // default 'M'
  className?: string;
}

export function OrderCard({
  orderId,
  date,
  state,
  items,
  itemCount,
  totalAmount,
  detailsHref,
  onCancel,
  onPay,
  onRepeat,
  size = 'M',
  className,
}: OrderCardProps) {
  const router = useRouter();
  const statusConfig = getCustomerOrderStatusConfig(state);
  const rootClass = [
    styles.root,
    size === 'S' ? styles.sizeS : undefined,
    className,
  ].filter(Boolean).join(' ');

  return (
    <article className={rootClass}>
      {/* Overlay link — covers the whole card behind the content; lets background clicks navigate to details */}
      <NextLink href={detailsHref} className={styles.overlayLink} aria-label={`${date} — подробнее`} />

      {/* Row 1: date + badge | price */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.date}>{date}</span>
          <OrderStatusBadge
            label={statusConfig.label}
            bgColor={statusConfig.bgColor}
            color="var(--ctx-color-text-inverse)"
          />
        </div>
        <Price value={totalAmount} />
      </div>

      {/* Row 2: order number · item count */}
      <div className={styles.meta}>
        <span>№ {orderId}</span>
        <span>·</span>
        <span>{pluralizeItems(itemCount)}</span>
      </div>

      {/* Row 3: images | buttons */}
      <div className={styles.row}>
        <div className={styles.images}>
          {items.slice(0, 6).map((item) => (
            <CardImage key={item.productId} src={item.imageSrc} size="M" />
          ))}
        </div>
        <div className={styles.buttons}>
          <Button variant="secondary" size="md" onClick={() => router.push(detailsHref)}>
            {size === 'S' ? 'Детали' : 'Посмотреть детали'}
          </Button>
          {onCancel && (
            <Button variant="danger" size="md" onClick={onCancel}>
              Отменить
            </Button>
          )}
          {onPay && (
            <Button variant="primary" size="md" onClick={onPay}>
              Оплатить
            </Button>
          )}
          {onRepeat && (
            <Button variant="primary" size="md" onClick={onRepeat}>
              Повторить
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
