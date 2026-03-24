import { getOrderStatusConfig } from '@/lib/order-status-config';
import type { OrderState } from '@/domain/order/OrderState';
import styles from './OrderStatusBadge.module.css';

interface OrderStatusBadgeProps {
  state: OrderState;
}

export function OrderStatusBadge({ state }: OrderStatusBadgeProps) {
  const config = getOrderStatusConfig(state);
  return (
    <span
      className={styles.root}
      style={{ color: config.color, background: config.bgColor }}
    >
      {config.label}
    </span>
  );
}
