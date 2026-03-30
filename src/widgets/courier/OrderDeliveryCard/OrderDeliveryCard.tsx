import { MapPin } from 'lucide-react';
import { Button } from '@/shared/ui';
import type { OrderDto } from '@/lib/api/orders';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import styles from './OrderDeliveryCard.module.css';

interface OrderDeliveryCardProps {
  order: OrderDto;
  onClaim: (id: string) => void;
  isClaiming?: boolean;
}

export function OrderDeliveryCard({ order, onClaim, isClaiming = false }: OrderDeliveryCardProps) {
  const assignedAgo = order.deliveryClaimedAt
    ? formatDistanceToNow(new Date(order.deliveryClaimedAt), { locale: ru, addSuffix: true })
    : formatDistanceToNow(new Date(order.updatedAt), { locale: ru, addSuffix: true });

  return (
    <div className={styles.root}>
      <div className={styles.top}>
        <div className={styles.meta}>
          <span className={styles.orderTag}>#{order.id.slice(0, 8)}</span>
          <span className={styles.total}>{order.totalAmount.toLocaleString('ru')} ₽</span>
        </div>
        <div className={styles.itemsCount}>
          <MapPin size={14} className={styles.mapPinIcon} />
          <span>{assignedAgo}</span>
        </div>
      </div>
      <p className={styles.address}>{order.address}</p>
      <Button
        variant="primary"
        size="lg"
        loading={isClaiming}
        onClick={() => onClaim(order.id)}
      >
        Взять доставку
      </Button>
    </div>
  );
}
