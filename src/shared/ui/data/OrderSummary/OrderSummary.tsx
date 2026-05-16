import styles from './OrderSummary.module.css';

export interface OrderSummaryProps {
  itemCount: number;
  totalWeightKg?: number;
  subtotal: number;
  deliveryCost?: number;
  total: number;
  className?: string;
}

function formatPrice(v: number): string {
  return `${v.toLocaleString('ru-RU')} ₽`;
}

function formatWeight(kg: number): string {
  return `${kg.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} кг`;
}

export function OrderSummary({
  itemCount,
  totalWeightKg,
  subtotal,
  deliveryCost,
  total,
  className,
}: OrderSummaryProps) {
  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      <div className={styles.headerRow}>
        <span className={styles.headerLabel}>Итого</span>
        <span className={styles.headerValue}>{formatPrice(total)}</span>
      </div>

      <div className={styles.row}>
        <div className={styles.itemsLeft}>
          <span>{itemCount} товаров</span>
          {totalWeightKg !== undefined && (
            <span className={styles.weight}>{formatWeight(totalWeightKg)}</span>
          )}
        </div>
        <span>{formatPrice(subtotal)}</span>
      </div>

      {deliveryCost !== undefined && deliveryCost > 0 && (
        <div className={styles.row}>
          <span>Доставка</span>
          <span>{formatPrice(deliveryCost)}</span>
        </div>
      )}
    </div>
  );
}
