import { Package, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/shared/ui';
import type { OrderDto } from '@/lib/api/orders';
import styles from './OrderPickCard.module.css';

interface OrderPickCardProps {
  order: OrderDto;
  onClaim: (id: string) => void;
  isClaiming?: boolean;
}

export function OrderPickCard({ order, onClaim, isClaiming = false }: OrderPickCardProps) {
  return (
    <div className={styles.root}>
      <div className={styles.top}>
        <div className={styles.meta}>
          <span className={styles.orderTag}>#{order.id.slice(0, 8)}</span>
          <span className={styles.total}>{order.totalAmount.toLocaleString('ru')} ₽</span>
        </div>
        <div className={styles.itemsCount}>
          <Package size={14} className={styles.packageIcon} />
          <span>{order.items.length} поз.</span>
        </div>
      </div>
      <div className={styles.timeRow}>
        <Clock size={14} className={styles.timeIcon} />
        <span>{formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ru })}</span>
      </div>
      <Button
        variant="primary"
        size="lg"
        loading={isClaiming}
        onClick={() => onClaim(order.id)}
      >
        Взять в работу
      </Button>
    </div>
  );
}
