import { Icon } from '../../icons/Icon/Icon';
import styles from './Rating.module.css';

interface RatingProps {
  value: number;
  count?: number;
  size?: 'S' | 'L';
  className?: string;
}

export function Rating({ value, count, size = 'S', className }: RatingProps) {
  const displayValue = value % 1 === 0 ? value.toFixed(1) : String(value);

  return (
    <div
      className={[styles.root, styles[`size${size}`], className].filter(Boolean).join(' ')}
      aria-label={`Рейтинг ${displayValue}${count !== undefined ? `, ${count} отзывов` : ''}`}
    >
      <Icon
        name="star"
        size={size === 'L' ? 28 : 16}
        color="var(--rating-star-color)"
      />
      <span className={styles.value}>{displayValue}</span>
      {count !== undefined && (
        <span className={styles.count}>{count}</span>
      )}
    </div>
  );
}
