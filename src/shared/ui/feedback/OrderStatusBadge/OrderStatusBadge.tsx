import { getOrderStatusConfig, getCustomerOrderStatusConfig } from '@/lib/order-status-config';
import type { OrderState } from '@/domain/order/OrderState';
import styles from './OrderStatusBadge.module.css';

interface OrderStatusBadgeProps {
  state: OrderState;
  variant?: 'admin' | 'customer';
}

export function OrderStatusBadge({ state, variant = 'admin' }: OrderStatusBadgeProps) {
  if (variant === 'customer') {
    const config = getCustomerOrderStatusConfig(state);
    return (
      <span
        className={styles.root}
        style={{ color: 'var(--ctx-color-text-inverse)', background: config.bgColor }}
      >
        {config.label}
      </span>
    );
  }

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
