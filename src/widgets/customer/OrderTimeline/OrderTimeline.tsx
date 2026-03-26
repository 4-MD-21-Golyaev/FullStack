import { OrderState } from '@/domain/order/OrderState';
import { ORDER_STATE_TIMELINE, getOrderStatusConfig } from '@/lib/order-status-config';
import styles from './OrderTimeline.module.css';

interface OrderTimelineProps {
  state: OrderState;
}

type StepStatus = 'done' | 'active' | 'pending';

export function OrderTimeline({ state }: OrderTimelineProps) {
  const isCancelled = state === OrderState.CANCELLED;
  const currentIndex = isCancelled ? -1 : ORDER_STATE_TIMELINE.indexOf(state);

  function getStepStatus(index: number): StepStatus {
    if (isCancelled) return 'pending';
    if (index < currentIndex) return 'done';
    if (index === currentIndex) return 'active';
    return 'pending';
  }

  return (
    <div className={styles.root}>
      {isCancelled && (
        <div className={styles.cancelledBadge}>Заказ отменён</div>
      )}
      <ol className={styles.steps}>
        {ORDER_STATE_TIMELINE.map((step, index) => {
          const status = getStepStatus(index);
          const isLast = index === ORDER_STATE_TIMELINE.length - 1;
          return (
            <li key={step} className={styles.step}>
              <div className={styles.indicator}>
                <div className={`${styles.dot} ${styles[status]}`}>
                  {status === 'done' && <span className={styles.check}>✓</span>}
                </div>
                {!isLast && <div className={styles.line} />}
              </div>
              <span className={`${styles.label} ${styles[`label_${status}`]}`}>
                {getOrderStatusConfig(step).label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
