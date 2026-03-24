import { IconButton } from '../../buttons/IconButton/IconButton';
import { NumInput } from '../NumInput/NumInput';
import styles from './Counter.module.css';

export interface CounterProps {
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  type?: 'amount' | 'weight';
  size?: 'lg' | 'sm';
  className?: string;
}

export function Counter({
  value,
  onChange,
  min,
  max,
  type = 'amount',
  size = 'lg',
  className,
}: CounterProps) {
  const isAtMin = min !== undefined && value <= min;
  const isAtMax = max !== undefined && value >= max;

  /* IconButton size: lg Counter uses md (44px), sm Counter uses sm (36px) */
  const btnSize = size === 'lg' ? 'md' : 'sm';
  const inputState = 'enabled';

  return (
    <span className={[styles.root, styles[size], className ?? ''].join(' ').trim()}>
      <IconButton
        icon="minus"
        size={btnSize}
        variant="gray"
        disabled={isAtMin}
        onClick={() => onChange?.(value - 1)}
        aria-label="Уменьшить"
        className={styles.btnMinus}
      />
      <NumInput
        value={value}
        onChange={onChange}
        type={type}
        state={inputState}
        className={styles.numInput}
      />
      <IconButton
        icon="plus"
        size={btnSize}
        variant="gray"
        disabled={isAtMax}
        onClick={() => onChange?.(value + 1)}
        aria-label="Увеличить"
        className={styles.btnPlus}
      />
    </span>
  );
}
