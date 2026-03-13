import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import styles from './PaymentStatusBadge.module.css';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

const CONFIG: Record<PaymentStatus, { label: string; className: string }> = {
  [PaymentStatus.PENDING]: { label: 'Ожидание', className: 'pending' },
  [PaymentStatus.SUCCESS]: { label: 'Оплачен', className: 'success' },
  [PaymentStatus.FAILED]: { label: 'Ошибка', className: 'failed' },
};

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const config = CONFIG[status] ?? CONFIG[PaymentStatus.PENDING];
  return (
    <span className={`${styles.root} ${styles[config.className]}`}>
      {config.label}
    </span>
  );
}
