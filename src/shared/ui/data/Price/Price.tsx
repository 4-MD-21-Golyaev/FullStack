import { Badge } from '../../feedback/Badge/Badge';
import styles from './Price.module.css';

interface PriceProps {
  value: number;
  old?: number;
  discount?: string;
  size?: 'M' | 'L';
  className?: string;
}

function formatPrice(value: number): string {
  return `${value.toLocaleString('ru-RU')} ₽`;
}

export function Price({ value, old, discount, size = 'M', className }: PriceProps) {
  const rootClass = [
    styles.root,
    size === 'L' ? styles.sizeL : styles.sizeM,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      <span className={styles.current}>{formatPrice(value)}</span>
      {old !== undefined && (
        <div className={styles.oldRow}>
          <span className={styles.old}>{formatPrice(old)}</span>
          {discount && (
            <Badge variant="discount" size="S">{discount}</Badge>
          )}
        </div>
      )}
    </div>
  );
}
