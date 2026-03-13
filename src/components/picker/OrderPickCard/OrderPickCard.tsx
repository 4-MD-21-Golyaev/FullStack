import { Button } from '@/components/ui';
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
      <div className={styles.info}>
        <span className={styles.id}>#{order.id.slice(0, 8)}</span>
        <span className={styles.items}>{order.items.length} позиц.</span>
        <span className={styles.total}>{order.totalAmount.toLocaleString('ru')} ₽</span>
      </div>
      <p className={styles.address}>{order.address}</p>
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
